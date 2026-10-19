// Notes on anything: what the owner pins on a vault page (⌥N), for Claude to fix. One JSON file per note in
// <VAULT_PATH>/fixes/, so two machines (or two apps) never write the same file and git merges them cleanly. A note is { id, at, about, url, path, title, text, kind: 'pin'|'area'|'words', words: { text, before, after }, point, box, el, view,
// status: 'open'|'done', reply, doneAt }. Claude reads them (a SessionStart hook says how many are open), fixes the
// thing, and sets status 'done' with a one-line reply; the page shows the reply beside the pin until the owner clears it.
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import { VAULT } from './vault.js';
import { commit } from './api.js';
import { pageFile } from './pages.js';

export const FIX_DIR = join(VAULT, 'fixes');
const ID = /^f[\w-]{4,40}$/;
const fileOf = (id) => { if (!ID.test(id)) throw new Error('bad id'); return join(FIX_DIR, id + '.json'); };
const read = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };

export function listFixes({ path = '', open = false } = {}) {
  if (!existsSync(FIX_DIR)) return [];
  return readdirSync(FIX_DIR).filter((f) => f.endsWith('.json')).map((f) => read(join(FIX_DIR, f))).filter(Boolean)
    .filter((n) => (!path || n.path === path) && (!open || n.status !== 'done'))
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

// What a note is about: the page, or the entry a /pages/ page sits in, the note a /n/ page shows, else the vault itself.
function aboutOf(path) {
  const n = /^\/n\/([^/?#]+)/.exec(path);
  if (n) return decodeURIComponent(n[1]);
  if (path.startsWith('/pages/')) {
    try {
      const f = pageFile(path.split(/[?#]/)[0]);
      const rel = f && relative(VAULT, dirname(f));
      // A page straight in pages/ is about itself; one inside an entry's folder is about that entry.
      if (rel === 'pages') return basename(f).replace(/\.html?$/, '');
      if (rel && !rel.startsWith('..')) return basename(rel) || 'vault';
    } catch {}
  }
  return 'vault';
}

const clean = (s, n) => String(s ?? '').slice(0, n);
const num = (v) => (Number.isFinite(+v) ? Math.round(+v) : 0);
const frac = (v) => (Number.isFinite(+v) ? Math.round(+v * 1000) / 1000 : 0);

export function addFix(b, { about = '' } = {}) {
  const text = clean(b.text, 4000).trim();
  if (!text) throw new Error('a note needs words');
  const path = clean(b.path, 600) || '/';
  const id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const n = {
    id, at: new Date().toISOString(), about: clean(about || b.about, 80) || aboutOf(path),
    url: clean(b.url, 800), path, title: clean(b.title, 200), text,
    kind: b.kind === 'area' || b.kind === 'words' ? b.kind : 'pin',
    words: b.words && b.words.text ? { text: clean(b.words.text, 1000), before: clean(b.words.before, 120), after: clean(b.words.after, 120) } : null,
    point: b.point ? { x: num(b.point.x), y: num(b.point.y) } : null,
    box: b.box ? { x: num(b.box.x), y: num(b.box.y), w: num(b.box.w), h: num(b.box.h) } : null,
    el: b.el ? { sel: clean(b.el.sel, 600), tag: clean(b.el.tag, 40), text: clean(b.el.text, 160), rx: frac(b.el.rx), ry: frac(b.el.ry) } : null,
    view: b.view ? { w: num(b.view.w), h: num(b.view.h), theme: clean(b.view.theme, 10), sx: num(b.view.sx), sy: num(b.view.sy) } : null,
    status: 'open', reply: '', doneAt: '',
  };
  mkdirSync(FIX_DIR, { recursive: true });
  writeFileSync(fileOf(id), JSON.stringify(n, null, 2) + '\n');
  commit(`note for Claude: ${n.about}`);
  return n;
}

export function patchFix(id, b) {
  const f = fileOf(id), n = read(f);
  if (!n) throw new Error('no such note');
  if (typeof b.text === 'string' && b.text.trim()) n.text = clean(b.text, 4000).trim();
  if (b.status === 'open' || b.status === 'done') { n.status = b.status; n.doneAt = b.status === 'done' ? new Date().toISOString() : ''; }
  if (typeof b.reply === 'string') n.reply = clean(b.reply, 600);
  writeFileSync(f, JSON.stringify(n, null, 2) + '\n');
  commit(`note for Claude: ${n.about}, ${n.status}`);
  return n;
}

export function removeFix(id) {
  const f = fileOf(id);
  if (existsSync(f)) unlinkSync(f);
  commit('note for Claude cleared');
  return { ok: true };
}
