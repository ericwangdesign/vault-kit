// The JSON face of the vault. The HTML pages are one client of this; a phone
// or an iOS app is another. Every write lands in a file and then in git, so
// the history of the notebook is the history of the repo — no second store.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { allNotes, byName, VAULT } from './vault.js';

// Local, not UTC: a thought dropped at 8pm belongs to that
// day, and toISOString() would file it under tomorrow.
const p2 = (x) => String(x).padStart(2, '0');
const today = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

/* ---------- git ---------- */

// Fire and forget. A commit that fails (nothing staged, lock held) must never
// fail the write that already happened; it just shows up in the next one.
export function commit(message) {
  execFile('git', ['-C', VAULT, 'add', '-A'], () =>
    execFile('git', ['-C', VAULT, 'commit', '-q', '-m', message], () => {}));
}

/* ---------- frontmatter ---------- */

// Edits the block in place, line by line, so every key it doesn't touch —
// comments, order, quoting, nested metadata — comes out exactly as it went in.
// A generic YAML round-trip would normalise the whole file on every click.
const quote = (v) => (/[:#"'\[\]{}]|^\s|\s$/.test(v) ? JSON.stringify(v) : v);

export function patchFrontmatter(raw, patch) {
  if (!raw.startsWith('---')) raw = '---\n---\n' + raw;
  const end = raw.indexOf('\n---', 3);
  const head = raw.slice(4, end).split('\n');
  const tail = raw.slice(end);
  const seen = new Set();
  const out = head.map((line) => {
    const m = /^(\S+):\s*(.*)$/.exec(line);
    if (!m || !(m[1] in patch)) return line;
    seen.add(m[1]);
    const v = patch[m[1]];
    if (v === null) return null; // null deletes the key
    return `${m[1]}: ${Array.isArray(v) ? '[' + v.join(', ') + ']' : quote(String(v))}`;
  }).filter((l) => l !== null);
  for (const [k, v] of Object.entries(patch)) {
    if (seen.has(k) || v === null) continue;
    out.push(`${k}: ${Array.isArray(v) ? '[' + v.join(', ') + ']' : quote(String(v))}`);
  }
  return '---\n' + out.join('\n') + tail;
}

/* ---------- notes ---------- */

const summary = (n) => ({
  name: n.name, title: n.title, description: n.description, type: n.type,
  status: n.status, horizon: n.horizon, tags: n.tags, folder: n.folder,
  created: n.created, updated: n.updated, archived: !!n.archived,
});

export const listNotes = () => allNotes().map(summary);

export function readNote(name) {
  const n = byName(name);
  if (!n) return null;
  return { ...summary(n), body: n.body, raw: readFileSync(n.file, 'utf8') };
}

export function writeNote(name, raw) {
  const n = byName(name);
  if (!n) throw new Error('no such note');
  const next = patchFrontmatter(String(raw), { updated: today() });
  writeFileSync(n.file, next);
  commit(`${n.title}: edited from the reader`);
  return readNote(name);
}

export function patchNote(name, patch) {
  const n = byName(name);
  if (!n) throw new Error('no such note');
  const clean = {};
  for (const [k, v] of Object.entries(patch || {})) {
    if (!/^[a-z][\w-]*$/i.test(k)) throw new Error(`bad key ${k}`);
    clean[k] = v;
  }
  clean.updated = today();
  writeFileSync(n.file, patchFrontmatter(readFileSync(n.file, 'utf8'), clean));
  const what = Object.keys(patch || {}).map((k) => `${k} → ${patch[k]}`).join(', ');
  commit(`${n.title}: ${what || 'touched'}`);
  return summary(byName(name));
}

/* ---------- inbox ----------
   One file, one line per thought, newest at the bottom. Nothing is sorted or
   titled at capture — receiving a thought has to be free. sorter.js files it
   a couple of minutes later. */

const INBOX = join(VAULT, 'inbox.md');
const INBOX_HEAD = `---
name: inbox
title: Inbox
description: "Raw captures from Intake (⌘I) and the phone, sorted into to-dos, ideas, projects and clients by the sorter"
type: inbox
created: ${today()}
updated: ${today()}
tags: [inbox]
---
`;

const stamp = (d = new Date()) => `${today(d)} ${p2(d.getHours())}:${p2(d.getMinutes())}`;

export function readInbox() {
  if (!existsSync(INBOX)) return [];
  const raw = readFileSync(INBOX, 'utf8');
  const end = raw.startsWith('---') ? raw.indexOf('\n---', 3) + 4 : 0;
  const items = [];
  for (const line of raw.slice(end).split('\n')) {
    const m = /^- \*\*(\d{4}-\d\d-\d\d \d\d:\d\d)\*\*\s+(.*)$/.exec(line);
    if (m) items.push({ at: m[1], text: m[2].replace(/<br>/g, '\n') });
  }
  return items;
}

export function appendInbox(text) {
  const clean = String(text || '').replace(/\r\n?/g, '\n').trim().slice(0, 4000);
  if (!clean) throw new Error('empty');
  const raw = existsSync(INBOX) ? readFileSync(INBOX, 'utf8') : INBOX_HEAD;
  const body = raw.replace(/\s*$/, '');
  // One line per capture keeps the file greppable; a multi-line thought folds
  // its breaks into <br> and unfolds on read.
  // A send that was queued offline and then retried can arrive twice; keep one.
  const last = readInbox().slice(-1)[0];
  if (last && last.text === clean && Date.now() - new Date(last.at.replace(' ', 'T')) < 5 * 60000) return last;
  const line = `- **${stamp()}** ${clean.replace(/\n+/g, '<br>')}`;
  writeFileSync(INBOX, patchFrontmatter(body + '\n' + line + '\n', { updated: today() }));
  commit(`Inbox: ${clean.split('\n')[0].slice(0, 60)}`);
  return { at: stamp(), text: clean };
}

/* ---------- router ---------- */

const json = (res, code, data) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
};

const body = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
    catch (e) { reject(new Error('bad json')); }
  });
});

// server.js plugs the sorter in here, so a capture can start a sort without api.js knowing about it.
export const hooks = { capture: () => {} };

// Returns true when it answered the request, false to let the pages have it.
export async function api(req, res, url) {
  if (!url.pathname.startsWith('/api/')) return false;
  const p = url.pathname.slice(4);
  const m = req.method;
  try {
    if (p === '/notes' && m === 'GET') return json(res, 200, listNotes()), true;
    {
      const r = /^\/notes\/([^/]+)$/.exec(p);
      if (r) {
        const name = decodeURIComponent(r[1]);
        if (m === 'GET') { const n = readNote(name); return json(res, n ? 200 : 404, n || { error: 'no such note' }), true; }
        if (m === 'PUT') { const b = await body(req); return json(res, 200, writeNote(name, b.raw)), true; }
        if (m === 'PATCH') { const b = await body(req); return json(res, 200, patchNote(name, b.frontmatter || b)), true; }
      }
    }
    if (p === '/inbox' && m === 'GET') return json(res, 200, readInbox()), true;
    if (p === '/inbox' && m === 'POST') { const b = await body(req); const out = appendInbox(b.text); hooks.capture(); return json(res, 200, out), true; }
    if (p === '/whoami' && m === 'GET') return json(res, 200, { ok: true }), true;
    return json(res, 404, { error: 'no such route' }), true;
  } catch (e) {
    return json(res, e.message === 'no such note' ? 404 : 400, { error: e.message }), true;
  }
}
