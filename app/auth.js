import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createClerkClient } from '@clerk/backend';

// Sign-in is optional. On localhost the vault opens without it. To put it on the web, set
// CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, VAULT_ALLOWED_EMAILS and VAULT_ORIGIN (see README),
// or keep them in VAULT_SECRETS/clerk.env.
const SECRETS = process.env.VAULT_SECRETS || join(homedir(), '.config', 'vault-reader');
const CLERK_ENV = join(SECRETS, 'clerk.env');
const ACCESS_FILE = join(SECRETS, 'access.json');
const localEnv = existsSync(CLERK_ENV)
  ? Object.fromEntries(readFileSync(CLERK_ENV, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
    const split = line.indexOf('=');
    return [line.slice(0, split), line.slice(split + 1)];
  }))
  : {};
const accessLists = existsSync(ACCESS_FILE) ? JSON.parse(readFileSync(ACCESS_FILE, 'utf8')) : {};

const DIR = join(homedir(), '.config', 'vault-reader');
const FILE = join(DIR, 'token');

export const TOKEN = (() => {
  if (process.env.VAULT_TOKEN) return process.env.VAULT_TOKEN;
  if (existsSync(FILE)) return readFileSync(FILE, 'utf8').trim();
  const token = randomBytes(24).toString('base64url');
  mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, `${token}\n`, { mode: 0o600 });
  return token;
})();

const COOKIE = 'vault';
const PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY || localEnv.CLERK_PUBLISHABLE_KEY || '';
const SECRET_KEY = process.env.CLERK_SECRET_KEY || localEnv.CLERK_SECRET_KEY;
const ALLOWED_PARTIES = (process.env.VAULT_ORIGIN || localEnv.VAULT_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);
const ALLOWED_EMAILS = new Set((process.env.VAULT_ALLOWED_EMAILS || localEnv.VAULT_ALLOWED_EMAILS || accessLists.vault?.join(',') || '')
  .split(',').map((email) => email.trim().toLowerCase()).filter(Boolean));
const clerk = SECRET_KEY
  ? createClerkClient({ secretKey: SECRET_KEY, publishableKey: PUBLISHABLE_KEY })
  : null;
const userCache = new Map();

const isLoopback = (req) => {
  if (req.headers['x-forwarded-for']) return false;
  const host = String(req.headers.host || '').toLowerCase().replace(/:\d+$/, '');
  if (host !== 'localhost' && host !== '127.0.0.1' && host !== '[::1]') return false;
  const address = req.socket.remoteAddress || '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
};

const cookie = (req, name) => {
  const match = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`).exec(req.headers.cookie || '');
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return null; }
};

const webRequest = (req) => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost').split(',')[0].trim();
  return new Request(`${proto}://${host}${req.url}`, { headers });
};

const emailFor = async (userId) => {
  const cached = userCache.get(userId);
  if (cached && cached.expires > Date.now()) return cached.email;
  const user = await clerk.users.getUser(userId);
  const primary = user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId);
  const email = primary?.emailAddress?.toLowerCase() || '';
  userCache.set(userId, { email, expires: Date.now() + 5 * 60 * 1000 });
  return email;
};

// Clerk's session token lives about a minute and nothing on these pages refreshes it, so a
// POST made a while after the page loaded (Intake, a to-do tick) came back 401. After Clerk
// says yes once, the reader keeps its own signed cookie saying who you are. It is checked
// against the allowlist on every request, so taking an address off the list still locks it out.
const SESSION = 'vault_s';
const SESSION_DAYS = 30;
const sign = (v) => createHmac('sha256', TOKEN).update(v).digest('base64url');
const readSession = (req) => {
  const raw = cookie(req, SESSION);
  if (!raw) return null;
  const dot = raw.lastIndexOf('.');
  const body = raw.slice(0, dot), mac = raw.slice(dot + 1);
  const want = sign(body);
  if (mac.length !== want.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  const [email, exp] = Buffer.from(body, 'base64url').toString('utf8').split('|');
  return +exp > Date.now() && ALLOWED_EMAILS.has(email) ? email : null;
};
export const sessionCookie = (req, email) => {
  const body = Buffer.from(`${email}|${Date.now() + SESSION_DAYS * 86400000}`).toString('base64url');
  return `${SESSION}=${body}.${sign(body)}; Path=/; Max-Age=${SESSION_DAYS * 86400}; HttpOnly; SameSite=Lax` +
    (req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '');
};

const isToken = (v) => typeof v === 'string' && v.length === TOKEN.length && timingSafeEqual(Buffer.from(v), Buffer.from(TOKEN));

export async function authorize(req) {
  if (isLoopback(req)) return { ok: true, method: 'loopback' };
  const held = readSession(req);
  if (held) return { ok: true, method: 'session', email: held };
  const bearer = /^Bearer\s+(.+)$/.exec(req.headers.authorization || '');
  if (isToken(bearer && bearer[1]) || isToken(cookie(req, COOKIE))) return { ok: true, method: 'token' };
  if (!clerk) return { ok: false, reason: 'misconfigured' };

  try {
    const state = await clerk.authenticateRequest(webRequest(req), {
      authorizedParties: ALLOWED_PARTIES,
      acceptsToken: 'session_token',
    });
    if (!state.isAuthenticated) return { ok: false, reason: 'unauthenticated' };
    const { userId } = state.toAuth();
    if (!userId) return { ok: false, reason: 'unauthenticated' };
    const email = await emailFor(userId);
    return ALLOWED_EMAILS.has(email)
      ? { ok: true, method: 'clerk', email }
      : { ok: false, reason: 'forbidden', email };
  } catch (error) {
    console.error('Clerk authentication failed:', error.message);
    return { ok: false, reason: 'unauthenticated' };
  }
}

export const setCookie = (req) =>
  `${COOKIE}=${encodeURIComponent(TOKEN)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax` +
  (req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '');
