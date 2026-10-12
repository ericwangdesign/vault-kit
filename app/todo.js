// A rolling list, kept as plain `- [ ]` lines in one note so it stays readable and
// editable by conversation like everything else. Checking a box rewrites that line
// and nothing else in the file.
import { readFileSync, writeFileSync } from 'node:fs';
import { byName } from './vault.js';

const ITEM = /^(\s*[-*]\s+\[)([ xX])(\]\s+)(.*)$/;

export function readTodos() {
  const n = byName('todo');
  if (!n) return null;
  const items = [];
  n.file && readFileSync(n.file, 'utf8').split('\n').forEach((line, i) => {
    const m = ITEM.exec(line);
    if (m) items.push({ line: i, done: m[2].toLowerCase() === 'x', text: m[4].trim() });
  });
  return { note: n, items };
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

export function addTodo(text) {
  const clean = String(text || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 300);
  if (!clean) throw new Error('empty');
  const n = byName('todo');
  if (!n) throw new Error('no todo note');
  const raw = readFileSync(n.file, 'utf8').replace(/\s*$/, '');
  writeFileSync(n.file, raw + `\n- [ ] ${clean}\n`);
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
