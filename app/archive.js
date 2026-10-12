// Archiving is a view decision, not a deletion: it sets one key in the note's frontmatter and the
// index stops showing it on a shelf. The file stays exactly where it was, keeps its name, is still
// readable at its own URL, and — for the notes that are symlinked into Claude's memory — is still
// loaded every session. Only the index changes its mind about it.
import { readFileSync, writeFileSync } from 'node:fs';
import { byName } from './vault.js';

const today = () => new Date().toISOString().slice(0, 10);

export function setArchived(name, on) {
  const n = byName(name);
  if (!n) throw new Error('no such note');

  const raw = readFileSync(n.file, 'utf8');
  if (!raw.startsWith('---')) throw new Error('note has no frontmatter');
  const end = raw.indexOf('\n---', 3);
  if (end === -1) throw new Error('note has no frontmatter');

  // Only ever touch top-level lines. A nested block (the memory system pushes unknown keys under
  // `metadata:`) is left completely alone.
  const head = raw.slice(4, end).split('\n').filter((l) => !/^archived:/.test(l));
  if (on) {
    const at = head.findIndex((l) => /^updated:/.test(l));
    const line = `archived: ${today()}`;
    at === -1 ? head.push(line) : head.splice(at + 1, 0, line);
  }
  const next = '---\n' + head.join('\n') + '\n' + raw.slice(end + 1);

  // This edits a file the user wrote by hand. Verify the rewrite still parses as the same note
  // before it lands — a frontmatter block that loses its closing fence takes the whole note with it.
  if (!/^---\n[\s\S]*?\n---(\n|$)/.test(next)) throw new Error('refusing to write malformed frontmatter');
  if (!new RegExp(`^name: ${name}$`, 'm').test(next)) throw new Error('refusing to write: identity changed');

  writeFileSync(n.file, next);
  return { name, archived: !!on };
}
