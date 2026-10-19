// Words changed on the page itself (⌥E, edit-layer.js), written back into the file the page comes from: a page's
// HTML, or a note's markdown. The page sends each run of text it changed, with a few words from either side of it.
// The file is searched for that run the way it can be written there (an HTML entity, a JSON escape, any whitespace),
// and only those characters are replaced, so the markup, the scripts and the rest of the file stay byte for byte.
// Text a page draws with code isn't in its file as words: that run comes back as missed, and the page puts it back.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { VAULT, byName, invalidate } from './vault.js';
import { commit } from './api.js';
import { pageFile } from './pages.js';

// The file behind an address. The vault's own pages (Today, the shelves) are made by the reader, not a file.
function fileOf(path) {
  const clean = String(path || '').split(/[?#]/)[0];
  const n = /^\/n\/([^/]+)$/.exec(clean);
  if (n) {
    const note = byName(decodeURIComponent(n[1]));
    if (note && note.file) return { file: note.file, md: true };
  }
  if (clean.startsWith('/pages/')) {
    let f = pageFile(clean);
    if (f && existsSync(f) && !f.endsWith('.html')) f = join(f, 'index.html');
    if (f && f.endsWith('.html') && existsSync(f)) return { file: f, md: false };
  }
  throw new Error('This page is made by the vault itself, so its words aren’t in a file');
}

// What kind of text sits at each place in the file: words to edit ('html', 'json', 'md', 'yaml') or code to leave.
function regions(src, md) {
  const out = [];
  if (md) {
    const fm = /^---\n[\s\S]*?\n---\n/.exec(src);
    if (fm) out.push([0, fm[0].length, 'yaml']);
    for (const m of src.matchAll(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm)) out.push([m.index, m.index + m[0].length, 'code']);
    return out;
  }
  const body = src.search(/<body[\s>]/i);
  if (body > 0) out.push([0, body, 'code']);
  for (const m of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const json = /type=["']application\/(ld\+)?json["']/i.test(m[1]);
    out.push([m.index, m.index + m[0].length, 'code']);
    if (json) out.push([m.index + m[0].indexOf('>') + 1, m.index + m[0].length - '</script>'.length, 'json']);
  }
  for (const m of src.matchAll(/<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi)) out.push([m.index, m.index + m[0].length, 'code']);
  return out;
}
function kindAt(src, regs, md, i) {
  const at = regs.filter(([a, b]) => i >= a && i < b).map((r) => r[2]);
  if (at.includes('json')) return 'json';   // a data block sits inside its <script>, which is otherwise code
  if (at.length) return at[0];
  // Inside a tag (an attribute's value) isn't words on the page either.
  if (!md && src.lastIndexOf('<', i) > src.lastIndexOf('>', i - 1)) return 'code';
  return md ? 'md' : 'html';
}

// Every way a character the page shows can be written in the file.
const ENT = { '&': ['&amp;'], '<': ['&lt;'], '>': ['&gt;'], '"': ['&quot;'], "'": ['&#39;', '&apos;'], ' ': ['&nbsp;'],
  '’': ['&rsquo;'], '‘': ['&lsquo;'], '“': ['&ldquo;'], '”': ['&rdquo;'], '—': ['&mdash;'], '–': ['&ndash;'], '…': ['&hellip;'],
  '·': ['&middot;', '&#183;'], '→': ['&rarr;'], '←': ['&larr;'], '×': ['&times;'], '©': ['&copy;'], '°': ['&deg;'] };
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function charPat(c) {
  const code = c.codePointAt(0), hex = code.toString(16), u = '\\u' + hex.padStart(4, '0');
  const alts = [c, `&#${code};`, `&#x${hex};`, `&#x${hex.toUpperCase()};`, ...(ENT[c] || [])];
  if (code < 0x10000) alts.push(u, u.toUpperCase());
  if (c === '"' || c === '\\' || c === '/') alts.push('\\' + c);
  return '(?:' + [...new Set(alts)].map(escRe).join('|') + ')';
}
const SPACE = '(?:\\s|&nbsp;|&#160;|\\\\n|\\\\t|\\\\u00a0)+';
const patternOf = (text) => new RegExp([...text].map((c) => (/\s/.test(c) ? SPACE : charPat(c))).join(''), 'g');

// The new words, written the way that part of the file writes words.
function encode(text, kind) {
  if (kind === 'json') return JSON.stringify(text).slice(1, -1).replace(/<\//g, '<\\/');
  if (kind === 'html') return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (kind === 'yaml' && (/:\s|\s#|^[\s'"[\]{}>|*&!%@`#-]/.test(text))) throw new Error('needs quoting');
  return text;
}

// When the words are in the file more than once, the one whose neighbours match the page's wins.
const wordsOf = (s) => String(s).replace(/<[^>]*>/g, ' ').replace(/"[\w-]+"\s*:/g, ' ').replace(/\\[ntr]/g, ' ').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
function score(src, a, b, before, after) {
  const near = (words, pool) => { const set = new Set(pool); return words.filter((w) => set.has(w)).length; };
  return near(wordsOf(before).slice(-6), wordsOf(src.slice(Math.max(0, a - 800), a)).slice(-40)) +
    near(wordsOf(after).slice(0, 6), wordsOf(src.slice(b, b + 800)).slice(0, 40));
}

function apply(src, md, e) {
  const old = String(e.old || '').replace(/\s+/g, ' ').trim(), next = String(e.new || '').replace(/\s+/g, ' ').trim();
  if (!old) throw new Error('nothing to find');
  if (old === next) return src;
  const regs = regions(src, md);
  const hits = [...src.matchAll(patternOf(old))].map((m) => ({ a: m.index, b: m.index + m[0].length, kind: kindAt(src, regs, md, m.index) }))
    .filter((h) => h.kind !== 'code');
  if (!hits.length) throw new Error('not in the file');
  let best = hits[0];
  if (hits.length > 1) {
    hits.forEach((h) => { h.s = score(src, h.a, h.b, e.before, e.after); });
    hits.sort((x, y) => y.s - x.s);
    if (hits[0].s === hits[1].s) throw new Error('in the file more than once');
    best = hits[0];
  }
  return src.slice(0, best.a) + encode(next, best.kind) + src.slice(best.b);
}

// edits: [{ old, new, before, after }]. Each one lands or is missed on its own; the file is written once.
export function editPage(path, edits) {
  const { file, md } = fileOf(path);
  if (!Array.isArray(edits) || !edits.length || edits.length > 50) throw new Error('no edits');
  let src = readFileSync(file, 'utf8');
  const missed = [];
  edits.forEach((e, i) => {
    try { src = apply(src, md, e); } catch (err) { missed.push({ i, why: err.message }); }
  });
  if (missed.length < edits.length) {
    writeFileSync(file, src);
    if (md) invalidate();
    commit(`edited on the page: ${path}`);
  }
  // A page a script writes (pages/_build/<slug>.py) gets written over on its next build, so the edit belongs there too.
  const built = !md && existsSync(join(VAULT, 'pages', '_build', basename(file, '.html') + '.py'));
  return { saved: edits.length - missed.length, missed, built };
}
