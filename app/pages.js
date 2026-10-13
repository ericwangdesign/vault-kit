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
// below pages/ is read (canvas-tests/); deeper ones aren't.
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

// Who points at a page: a note whose `page:` is it, or whose text links to it.
export function allPages(notes) {
  return walk(ROOT).map((file) => {
    const rel = relative(ROOT, file).split(sep).join('/');
    const href = '/pages/' + rel;
    const html = readFileSync(file, 'utf8');
    const from = notes.filter((n) => n.page === href || (n.body || '').includes(href));
    return {
      name: 'page:' + rel,
      title: titleOf(html, rel.replace(/\.html$/, '')),
      page: href,
      folder: rel.includes('/') ? rel.split('/')[0] : '',
      updated: statSync(file).mtime.toISOString().slice(0, 10),
      from,
      // The text search reads: the title and whatever the page says, tags stripped.
      text: html.replace(/<script(?![^>]*application\/json)[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 4000),
    };
  });
}

// /pages/<file> or /pages/<folder>/<file>, each part cleaned on its own, so a path can never
// climb out of pages/.
export function pageFile(pathname) {
  const parts = decodeURIComponent(pathname.slice('/pages/'.length)).split('/')
    .map((s) => s.replace(/[^\w.-]/g, '')).filter((s) => s && !s.startsWith('.'));
  if (!parts.length || parts.length > 2) return null;
  return join(ROOT, ...parts);
}

// Pages no note links to yet. Pages in a folder (canvas-tests/) are reached from that folder's
// index page, so only the top level counts.
export const homelessPages = (notes) => allPages(notes).filter((p) => !p.folder && !p.from.length);
