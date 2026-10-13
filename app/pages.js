// Every standalone page in vault/pages/, found on disk rather than through links. The rule (Eric,
// Oct 12): it's a personal vault, so every page in it can be reached. A page is a format, not a
// topic, so it has no shelf of its own: it lives on the shelf of the note that links it. Search
// lists every page anyway, and one that no note links waits in the Inbox until one does.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { VAULT } from './vault.js';

const ROOT = join(VAULT, 'pages');

// The Today prototype grew into the home page; its old address goes there, so it isn't a page any more.
const REPLACED = new Set(['dashboard.html']);

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
// An interactive page draws most of its words with script, so its own one-line description is what search reads first.
const describe = (html) => {
  const m = /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i.exec(html);
  return m ? m[1].trim() : '';
};

// Who points at a page: a note whose `page:` is it, or whose text links to it.
export function allPages(notes) {
  return walk(ROOT).map((file) => {
    const rel = relative(ROOT, file).split(sep).join('/');
    // A folder's index.html is the folder's own page, at /pages/<slug>/.
    const index = /^[^/]+\/index\.html$/.test(rel);
    const href = '/pages/' + (index ? rel.slice(0, -'index.html'.length) : rel);
    const html = readFileSync(file, 'utf8');
    const hrefs = index ? [href, href + 'index.html', href.slice(0, -1)] : [href];
    // In a note's text the folder needs its slash, so /pages/trip doesn't count as a link to /pages/trip-2.html.
    const from = notes.filter((n) => hrefs.includes(n.page) || hrefs.slice(0, 2).some((h) => (n.body || '').includes(h)));
    return {
      name: 'page:' + rel,
      title: titleOf(html, rel.replace(/\.html$/, '')),
      page: href,
      folder: rel.includes('/') && !index ? rel.split('/')[0] : '',
      description: describe(html),
      updated: statSync(file).mtime.toISOString().slice(0, 10),
      from,
      // The text search reads: the title and whatever the page says, tags stripped.
      text: (describe(html) + ' ' + html.replace(/<script(?![^>]*application\/json)[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).slice(0, 4000),
    };
  });
}

// /pages/<file>, or a file up to three folders down (a page's own scripts, data and pictures),
// each part cleaned on its own, so a path can never climb out of pages/. _state/ is the pages'
// saved state, read through /api/page-state, never served as a file.
export function pageFile(pathname) {
  const parts = decodeURIComponent(pathname.slice('/pages/'.length)).split('/')
    .map((s) => s.replace(/[^\w.-]/g, '')).filter((s) => s && !s.startsWith('.'));
  if (!parts.length || parts.length > 4 || parts[0] === '_state') return null;
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

// Pages no note links to yet. Pages in a folder (canvas-tests/) are reached from that folder's
// index page, so only the top level and folder index pages count.
export const homelessPages = (notes) => allPages(notes).filter((p) => !p.folder && !p.from.length);
