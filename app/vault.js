// Reads the vault off disk. No caching — every call re-reads, so edits show on refresh.
import { readdirSync, readFileSync, statSync, existsSync, watch } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { homedir } from 'node:os';
import { dirname } from 'node:path';

// true / false, or null when this reader can't see the folder it would sit in (on the VM the reader runs as
// `vault` and can't look inside /root/projects): only say "not found" when we could actually have looked.
function onDisk(path) {
  const full = String(path).split(',')[0].trim().replace(/^~/, homedir());
  if (existsSync(full)) return true;
  return existsSync(dirname(full)) ? false : null;
}

// Local, and a git repo — Drive was doing backup badly, on a university account
// that goes away. GitHub does it properly and keeps the history.
export const VAULT = process.env.VAULT_PATH || join(homedir(), 'Documents/Projects/vault');
// Only a vault with its own .git gets commits. The starter vault sits inside this kit's repo, and git would
// otherwise climb up to it and commit your notes (and anything else changed in the kit) into the kit's history.
export const OWN_REPO = existsSync(join(VAULT, '.git'));

const FOLDER_ORDER = { personal: 0, projects: 1, thinking: 2, resources: 3, pages: 4, cuttings: 5 };

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

// Minimal YAML — flat keys, one level of nesting, [bracket] lists. Enough for our schema.
function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return { data: {}, body: raw };
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: raw };
  const data = {};
  let parent = null;   // key whose nested block we're inside
  let seq = null;      // [container, key] currently collecting "- item" lines
  for (const line of raw.slice(4, end).split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item && seq) { seq[0][seq[1]].push(strip(item[1])); continue; }
    seq = null;

    const nested = /^\s+(\S+):\s*(.*)$/.exec(line);
    if (nested && parent) {
      const [, key, rest] = nested;
      if (rest === '') { data[parent][key] = []; seq = [data[parent], key]; }
      else data[parent][key] = rest.startsWith('[') ? list(rest) : strip(rest);
      continue;
    }

    const m = /^(\S+):\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, key, rest] = m;
    if (rest === '') { parent = key; data[key] = {}; }
    else { parent = null; data[key] = rest.startsWith('[') ? list(rest) : strip(rest); }
  }
  return { data, body: raw.slice(end + 4).replace(/^\n+/, '') };
}

const strip = (v) => v.trim().replace(/^["'](.*)["']$/s, '$1').replace(/\\"/g, '"');
const list = (v) => v.replace(/^\[|\]$/g, '').split(',').map((s) => strip(s)).filter(Boolean);

// Claude's memory system normalizes files in its own directory, pushing unknown keys
// under `metadata:`. Vault notes are symlinked into that directory, so read either shape.
const pick = (d, key) => {
  const v = d[key] ?? d.metadata?.[key];
  return v === '' || v === undefined ? null : v;
};

// Every page used to re-read every note, several times. Now the parsed vault is kept in
// memory and dropped whenever anything under it changes: the folder watch catches edits from
// Claude, the sorter or a text editor, and the server drops it after any write it makes itself.
let cached = null;
export const invalidate = () => { cached = null; };
try { watch(VAULT, { recursive: true }, (_, f) => { if (!f || !String(f).startsWith('.git')) cached = null; }); } catch {}

export function allNotes() {
  if (cached) return cached;
  return (cached = readAll());
}

function readAll() {
  if (!existsSync(VAULT)) return [];
  return walk(VAULT)
    .map((file) => {
      const raw = readFileSync(file, 'utf8');
      const { data, body } = parseFrontmatter(raw);
      const rel = relative(VAULT, file);
      const folder = rel.includes(sep) ? rel.split(sep)[0] : 'root';
      // ideas/toys/sand.md → 'toys'. A folder inside a shelf holds one project or one idea category.
      const group = rel.split(sep).length > 2 ? rel.split(sep)[1] : null;
      const name = pick(data, 'name') || rel.replace(/\.md$/, '').split(sep).pop();
      const path = pick(data, 'path');
      const tags = pick(data, 'tags');
      return {
        name,
        title: pick(data, 'title') || name,
        description: pick(data, 'description') || '',
        type: pick(data, 'type') || 'note',
        status: pick(data, 'status'),
        horizon: pick(data, 'horizon'),
        // One sentence: what's half done, or the next thing to do. Shown under the project on the index.
        next: pick(data, 'next'),
        // Set by the inbox sort when a capture changed this project; the index shows a dot until it's opened.
        nudged: pick(data, 'nudged'),
        // Fixed position on a shelf, for shelves that aren't ordered by date (Resources).
        order: pick(data, 'order'),
        // Which Thinking shelf a thought sits on: craft, career, personal, weeks.
        category: pick(data, 'category'),
        tags: Array.isArray(tags) ? tags : [],
        path,
        // A full page in /pages/ that stands in for this note's body.
        page: /^\/pages\/[\w.-]+$/.test(pick(data, 'page') || '') ? pick(data, 'page') : null,
        // Where the project is shown to other people: any https link.
        // Where the project runs, so its View can show it live in a desktop window and a phone.
        live: /^(https:\/\/[^\s"'<>]+|\/[\w/-]*)$/.test(pick(data, 'live') || '') ? pick(data, 'live') : null,
        // Who a project is for, when it's client work rather than your own.
        client: pick(data, 'client') || null,
        // How far to zoom into its picture, when the picture has empty space around the work (1–2).
        zoom: Math.min(2, Math.max(1, Number(pick(data, 'zoom')) || 1)),
        studio: /^https:\/\//.test(pick(data, 'studio') || '') ? pick(data, 'studio') : null,
        // Favicon: a brush character and an ink, e.g. `纽 brick`. See favicon.js.
        mark: pick(data, 'mark'),
        effort: pick(data, 'effort'),
        repo: pick(data, 'repo'),
        engagement: pick(data, 'engagement'),
        source: pick(data, 'source'),
        site: pick(data, 'site'),
        // A cutting's folder is a frontmatter label; `folder` above is the directory the file sits in.
        cutFolder: pick(data, 'folder'),
        still: pick(data, 'still'),
        viewport: pick(data, 'viewport'),
        clip: pick(data, 'clip'),
        seconds: pick(data, 'seconds'),
        screens: pick(data, 'screens'),
        pathExists: path ? onDisk(path) : null,
        archived: pick(data, 'archived'),
        created: pick(data, 'created'),
        updated: pick(data, 'updated') || statSync(file).mtime.toISOString().slice(0, 10),
        folder,
        group,
        file,
        body,
      };
    })
    .sort((a, b) => {
      const f = (FOLDER_ORDER[a.folder] ?? 9) - (FOLDER_ORDER[b.folder] ?? 9);
      return f || (b.updated || '').localeCompare(a.updated || '');
    });
}

export const byName = (name) => allNotes().find((n) => n.name === name);

// The shelves of the vault. Type decides the shelf; folder is just where the file sits.
export function section(n) {
  if (n.type === 'project') return 'projects';
  if (n.type === 'client') return 'clients';
  if (n.type === 'idea') return 'ideas';
  // The note that heads an ideas folder. Shown as the folder's label, never as a row.
  if (n.type === 'category') return 'category';
  if (n.type === 'resource') return 'resources';
  if (n.type === 'cutting') return 'cuttings';
  // Written by the gallery's Analyze. Reached from its folder in /cuttings, never shelved.
  if (n.type === 'style-guide') return 'guides';
  // The list has its own block at the top of the index, not a shelf.
  if (n.type === 'todo') return 'todo';
  // Raw captures from Intake. Seen through the receipt (⌘⇧I); never shelved.
  if (n.type === 'inbox') return 'inbox';
  if (n.type === 'receipt') return 'inbox';
  if (n.type === 'thought' || n.type === 'decision') return 'thinking';
  // Personal is everything outside work: who I am, trips, people, the rest of life.
  if (n.type === 'user' || n.type === 'feedback' || n.type === 'trip' || n.type === 'personal') return 'personal';
  return 'reference';
}

// "Now" is computed, never hand-picked: active projects touched in the last 30 days.
export function isNow(n, today) {
  if (n.type !== 'project' || n.status !== 'active' || !n.updated) return false;
  const age = (today - new Date(n.updated + 'T12:00:00')) / 86400000;
  return age <= 30;
}

// Notes that link out to a target, so a note page can show who points at it.
export function backlinks(target, notes = allNotes()) {
  const re = new RegExp(`\\[\\[${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\|[^\\]]*)?\\]\\]`);
  return notes.filter(
    (n) => n.name !== target && re.test(n.body)
  );
}

// Code fences and inline code hold example syntax, not real links — don't scan them.
const withoutCode = (body) => body.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');

// [[wikilinks]] that have no note behind them yet — the vault's to-write list.
// [[target|shown text]] is Obsidian's alias form: the note is `target`, the text is display only.
export function danglingLinks(notes = allNotes()) {
  const known = new Set(notes.map((n) => n.name));
  const missing = new Map();
  for (const n of notes) {
    for (const [, raw] of withoutCode(n.body).matchAll(/\[\[([^\]]+)\]\]/g)) {
      const target = raw.split('|')[0].trim();
      if (known.has(target)) continue;
      if (!missing.has(target)) missing.set(target, []);
      missing.get(target).push(n.title);
    }
  }
  return [...missing].map(([target, from]) => ({ target, from }));
}

