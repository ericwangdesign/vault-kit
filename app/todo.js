// A rolling list, kept as plain `- [ ]` lines in one note so it stays readable and
// editable by conversation like everything else. Checking a box rewrites that line
// and nothing else in the file.
import { readFileSync, writeFileSync } from 'node:fs';
import { byName } from './vault.js';

const ITEM = /^(\s*[-*]\s+\[)([ xX])(\]\s+)(.*)$/;
const HEAD = /^##\s+(.*?)\s*$/;
export const TIERS = [['today', 'Today'], ['time', 'If there’s time'], ['later', 'Later'], ['new', 'New']];
const tierOf = (heading) => {
  const h = heading.toLowerCase().replace(/[’']/g, '');
  return h.startsWith('today') ? 'today' : h.startsWith('if there') ? 'time' : h.startsWith('later') ? 'later' : 'new';
};
const p2 = (x) => String(x).padStart(2, '0');
export const localDay = (d = new Date()) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

function note() {
  const n = byName('todo');
  if (!n || !n.file) throw new Error('no todo note');
  return n;
}

export function readTodos() {
  const n = byName('todo');
  if (!n) return null;
  const items = [];
  let cur = 'new';
  const raw = n.file ? readFileSync(n.file, 'utf8') : '';
  raw.split('\n').forEach((line, i) => {
    const h = HEAD.exec(line);
    if (h) { cur = tierOf(h[1]); return; }
    const m = ITEM.exec(line);
    if (m) items.push({ line: i, done: m[2].toLowerCase() === 'x', text: m[4].trim(), tier: cur });
  });
  const pm = /^picked:\s*([^\s\n]+)/m.exec(raw);
  const picked = pm ? pm[1] : (n.picked ? String(n.picked) : '');
  const fresh = picked === localDay();
  return { note: n, items, picked, fresh };
}

// The page names an item by its text, not its line: lines shift with every move, and the
// page doesn't reload between clicks. The first line whose text matches is the one.
export function lineOfText(text) {
  const want = String(text || '').trim();
  const lines = readFileSync(note().file, 'utf8').split('\n');
  let at = lines.findIndex((l) => { const m = ITEM.exec(l); return m && m[4].trim() === want; });
  if (at < 0) {
    const cleanWant = want.replace(/\[\[[^\]]+\]\]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[\s.—-]+$/, '').trim();
    at = lines.findIndex((l) => {
      const m = ITEM.exec(l);
      if (!m) return false;
      const cleanLine = m[4].replace(/\[\[[^\]]+\]\]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[\s.—-]+$/, '').trim();
      return cleanLine === cleanWant;
    });
  }
  if (at < 0) throw new Error('not on the list any more');
  return at;
}

export function updateTodo(text, next) {
  const clean = String(next || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 300);
  const at = lineOfText(text);
  if (!clean) return removeTodo(at);
  const n = note();
  const lines = readFileSync(n.file, 'utf8').split('\n');
  const m = ITEM.exec(lines[at] ?? '');
  if (!m) throw new Error('not a checklist line');
  const oldLink = /\[\[[^\]]+\]\]/.exec(m[4]);
  let fullNext = clean;
  for (const [md, label] of m[4].matchAll(/\[([^\]]+)\]\([^)]+\)/g)) {
    if (!fullNext.includes(md) && fullNext.includes(label)) fullNext = fullNext.replace(label, md);
  }
  if (oldLink && !/\[\[[^\]]+\]\]/.test(clean)) fullNext = clean + ' ' + oldLink[0];
  lines[at] = m[1] + m[2] + m[3] + fullNext;
  save(n, lines);
  return { text: fullNext };
}

export function setTodo(lineNo, done) {
  const n = byName('todo');
  if (!n) throw new Error('no todo note');
  const lines = readFileSync(n.file, 'utf8').split('\n');
  const m = ITEM.exec(lines[lineNo] ?? '');
  if (!m) throw new Error('not a checklist line');
  lines[lineNo] = m[1] + (done ? 'x' : ' ') + m[3] + m[4];
  writeFileSync(n.file, lines.join('\n'));
  return { line: lineNo, done: !!done };
}

export function addTodo(text, tier) {
  const clean = String(text || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 300);
  if (!clean) throw new Error('empty');
  const n = note();
  const lines = readFileSync(n.file, 'utf8').split('\n');
  const t = TIERS.some(([k]) => k === tier) ? tier : 'new';
  if (t === 'today') stampPicked(lines);
  insertInto(lines, t, `- [ ] ${clean}`);
  save(n, lines);
  return { text: clean };
}

export function removeTodo(lineNo) {
  const n = byName('todo');
  if (!n) throw new Error('no todo note');
  const lines = readFileSync(n.file, 'utf8').split('\n');
  if (!ITEM.test(lines[lineNo] ?? '')) throw new Error('not a checklist line');
  lines.splice(lineNo, 1);
  writeFileSync(n.file, lines.join('\n'));
  return { line: lineNo, removed: true };
}

// Move one line under another heading.
export function moveTodo(lineNo, tier, { top = false } = {}) {
  if (!TIERS.some(([k]) => k === tier)) throw new Error('no such list');
  const n = note();
  const lines = readFileSync(n.file, 'utf8').split('\n');
  const line = lines[lineNo] ?? '';
  if (!ITEM.test(line)) throw new Error('not a checklist line');
  lines.splice(lineNo, 1);
  if (tier === 'today') stampPicked(lines);
  insertInto(lines, tier, line, top);
  save(n, lines);
  return { tier };
}

// A new day: the unfinished picks go back to the top of If there's time, the finished ones
// to Later (where Done shows them), and Today is empty again.
export function startFresh() {
  const n = note();
  const lines = readFileSync(n.file, 'utf8').split('\n');
  const { open, done } = sectionItems(lines, 'today');
  const all = new Set([...open, ...done]);
  const back = open.map((i) => lines[i]), filed = done.map((i) => lines[i]);
  const kept = lines.filter((_, i) => !all.has(i));
  insertInto(kept, 'time', back, true);
  insertInto(kept, 'later', filed);
  const pk = kept.findIndex((l) => /^picked:/.test(l));
  if (pk >= 0) kept.splice(pk, 1);
  save(n, kept);
  return { moved: back.length };
}

function sectionItems(lines, tier) {
  let cur = 'new';
  const open = [], done = [];
  lines.forEach((l, i) => {
    const h = HEAD.exec(l);
    if (h) { cur = tierOf(h[1]); return; }
    const m = ITEM.exec(l);
    if (m && cur === tier) (m[2] === ' ' ? open : done).push(i);
  });
  return { open, done };
}

function stampPicked(lines) {
  const end = lines[0] === '---' ? lines.indexOf('---', 1) : -1;
  if (end < 0) return;
  const at = lines.findIndex((l, i) => i < end && /^picked:/.test(l));
  const v = `picked: ${localDay()}`;
  if (at >= 0) lines[at] = v; else lines.splice(end, 0, v);
}

// Put `add` (a line or several) at the end, or the top, of a section, making the heading
// if it isn't there yet. Headings keep the order Today, If there's time, Later, New.
const ORDER = TIERS.map(([k]) => k);
function heads(lines) {
  const out = [];
  lines.forEach((l, i) => { const h = HEAD.exec(l); if (h) out.push({ i, tier: tierOf(h[1]) }); });
  return out;
}
function insertInto(lines, tier, add, top = false) {
  const adds = [].concat(add);
  if (!adds.length) return;
  let hs = heads(lines), h = hs.find((x) => x.tier === tier);
  if (!h) {
    const label = TIERS.find(([k]) => k === tier)[1].replace('’', "'");
    const after = hs.find((x) => ORDER.indexOf(x.tier) > ORDER.indexOf(tier));
    if (after) lines.splice(after.i, 0, `## ${label}`, '');
    else { while (lines.length && lines[lines.length - 1].trim() === '') lines.pop(); lines.push('', `## ${label}`); }
    hs = heads(lines); h = hs.find((x) => x.tier === tier);
  }
  const next = hs.find((x) => x.i > h.i);
  let at = top ? h.i + 1 : next ? next.i : lines.length;
  if (!top) while (at > h.i + 1 && lines[at - 1].trim() === '') at--;
  lines.splice(at, 0, ...adds);
}

// Every write ends the file with exactly one newline, so captures appended later start clean.
function save(n, lines) {
  const out = lines.slice();
  while (out.length && out[out.length - 1].trim() === '') out.pop();
  writeFileSync(n.file, out.join('\n') + '\n');
}
