// Every standalone page in vault/pages/, found on disk. Pages are the main format now (Oct 13), so a
// page never needs a markdown note to exist. It finds its home on its own, in this order:
//   1. a note links it (`page:` or a link in the body), or the page's canvas `back` points at a note
//      → it shows on that note, under Pages;
//   2. the page says its shelf: canvas `"shelf": "projects"` or, for hand-built HTML,
//      <meta name="vault-shelf" content="projects"> → it shows on that shelf like a note;
//   3. neither → it still shows on /pages, the index of every page, under "No shelf yet".
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { VAULT } from './vault.js';

const ROOT = join(VAULT, 'pages');

// The Today prototype grew into the home page; its old address goes there, so it isn't a page any more.
const REPLACED = new Set(['dashboard.html']);

// A shelf a page can name, and the note type that puts it there.
export const SHELF_TYPE = { projects: 'project', personal: 'personal', trips: 'trip', thinking: 'thought', resources: 'resource' };

// Folders starting with _ hold the scripts that build pages, not pages. One level of folders
// below pages/ is read: a folder of pages (canvas-tests/), or one page with its own files
// (<slug>/index.html beside its scripts, data and pictures). Deeper ones are a page's files.
function walk(dir, depth = 0) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    if (d.name.startsWith('.') || d.name.startsWith('_')) return [];
    const p = join(dir, d.name);
    if (d.isDirectory()) return depth < 1 ? walk(p, depth + 1) : [];
    return d.name.endsWith('.html') && !(depth === 0 && REPLACED.has(d.name)) ? [p] : [];
  });
}

const titleOf = (html, fallback) => {
  const m = /<title>([^<]*)<\/title>/i.exec(html);
  return (m && m[1].trim()) || fallback;
};
const metaOf = (html, name) => {
  const m = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`, 'i').exec(html);
  return m ? m[1].trim() : '';
};
const specOf = (html) => {
  const m = /<script\s+type=["']application\/json["']\s+id=["']canvas["']>([\s\S]*?)<\/script>/i.exec(html);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
};
// An interactive page draws most of its words with script, so its own one-line description is what search reads first.
const describe = (html) => metaOf(html, 'description');

// Parsed pages are kept until a page file changes; mtimes are cheap, re-parsing every page per request isn't.
const parsed = new Map();
function read(file) {
  const mtime = statSync(file).mtimeMs;
  const hit = parsed.get(file);
  if (hit && hit.mtime === mtime) return hit;
  const html = readFileSync(file, 'utf8');
  const spec = specOf(html) || {};
  const back = spec.back && /^\/n\/([^/?#]+)$/.exec(spec.back.href || '');
  const out = {
    mtime,
    title: spec.title || titleOf(html, ''),
    dek: typeof spec.dek === 'string' ? spec.dek : describe(html),
    description: describe(html),
    arc: spec.arc || '',
    shelf: String(spec.shelf || metaOf(html, 'vault-shelf') || '').toLowerCase(),
    back: back ? decodeURIComponent(back[1]) : '',
    text: (describe(html) + ' ' + html.replace(/<script(?![^>]*application\/json)[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).slice(0, 4000),
    updated: new Date(mtime).toISOString().slice(0, 10),
  };
  parsed.set(file, out);
  return out;
}

export function allPages(notes = []) {
  const byName = new Map(notes.map((n) => [n.name, n]));
  return walk(ROOT).map((file) => {
    const rel = relative(ROOT, file).split(sep).join('/');
    // A folder's index.html is the folder's own page, at /pages/<slug>/.
    const index = /^[^/]+\/index\.html$/.test(rel);
    const href = '/pages/' + (index ? rel.slice(0, -'index.html'.length) : rel);
    const p = read(file);
    const hrefs = index ? [href, href + 'index.html', href.slice(0, -1)] : [href];
    // Who points at it: a note whose `page:` is it or whose text links it. In a note's text the folder
    // needs its slash, so /pages/trip doesn't count as a link to /pages/trip-2.html…
    const from = notes.filter((n) => hrefs.includes(n.page) || hrefs.slice(0, 2).some((h) => (n.body || '').includes(h)));
    // …and the note it points back at. Either way that note is its home.
    const parent = byName.get(p.back) || from.find((n) => !hrefs.includes(n.page)) || null;
    return {
      name: 'page:' + rel,
      title: p.title || rel.replace(/\.html$/, ''),
      dek: p.dek, arc: p.arc, text: p.text, updated: p.updated,
      shelf: SHELF_TYPE[p.shelf] ? p.shelf : '',
      page: href,
      folder: rel.includes('/') && !index ? rel.split('/')[0] : '',
      description: p.description,
      from,
      parent,
      // A note whose `page:` is this page already stands for it on a shelf.
      fronted: from.some((n) => hrefs.includes(n.page)),
    };
  });
}

// Pages that sit on a shelf themselves: shaped like notes so every shelf, Today and search take
// them as they are. `isPage` keeps them out of anything that writes to a note file (archive).
export function pageNotes(notes) {
  return allPages(notes)
    .filter((p) => !p.folder && p.shelf && !p.parent && !p.fronted)
    .map((p) => ({
      name: p.name, title: p.title, description: p.dek, type: SHELF_TYPE[p.shelf],
      status: p.shelf === 'projects' ? 'active' : null, category: p.shelf === 'thinking' ? 'craft' : null,
      page: p.page, updated: p.updated, created: p.updated, tags: [], zoom: 1,
      folder: 'pages', group: null, body: '', isPage: true,
    }));
}

// /pages/<file>, or a file up to three folders down (a page's own scripts, data and pictures),
// each part cleaned on its own, so a path can never climb out of pages/. _state/ is the pages'
// saved state, read through /api/page-state, never served as a file.
export function pageFile(pathname) {
  const parts = decodeURIComponent(pathname.slice('/pages/'.length)).split('/')
    .map((s) => s.replace(/[^\w.-]/g, '')).filter((s) => s && !s.startsWith('.'));
  if (!parts.length || parts.length > 4 || parts[0] === '_state' || parts[0] === '_comments') return null;
  return join(ROOT, ...parts);
}

// What a page's own files are served as. Anything else isn't a page's file.
export const PAGE_TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
};

// Every page must be reachable without its URL: a fundamental rule. A page is reached when a note links it (it's then
// listed under Pages on that note, wherever in the text the link sits), or when it sits in a folder whose index page
// links it, or its canvas `back` names a note, or it names its own shelf. Anything else is listed on /pages under
// "No shelf yet" (the Inbox block was dropped locally: a page never needs a note).
const linkedFromIndex = (p) => {
  if (!p.folder) return false;
  const index = join(ROOT, p.folder, 'index.html');
  if (!existsSync(index)) return false;
  const html = readFileSync(index, 'utf8'), file = p.page.slice(('/pages/' + p.folder + '/').length);
  return html.includes(p.page) || new RegExp(`href=["'](\\./)?${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'#?]`).test(html);
};
export const homelessPages = (notes) => allPages(notes).filter((p) => !p.from.length && !p.parent && !p.shelf && !linkedFromIndex(p));

// The pages a note links, for the Pages list on that note. Its own `page:` is left out: that one is already its picture
// and its Open button.
export const pagesOf = (n, notes) => allPages(notes).filter((p) => p.page !== n.page && (p.from.some((f) => f.name === n.name) || p.parent?.name === n.name));
