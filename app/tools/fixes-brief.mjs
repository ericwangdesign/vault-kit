// What a coding agent hears when a session starts: the notes the owner pinned on vault pages (⌥N) that nobody has
// fixed yet. Prints nothing when there are none. Wire it into a SessionStart hook (see README.md), or run it by hand:
//   VAULT_PATH=../starter-vault node app/tools/fixes-brief.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = process.env.FIX_DIR || (process.env.VAULT_PATH && join(process.env.VAULT_PATH, 'fixes'));
if (!DIR) { console.error('Set VAULT_PATH (or FIX_DIR) to the vault.'); process.exit(1); }
let open = [];
try {
  open = readdirSync(DIR).filter((f) => f.endsWith('.json'))
    .map((f) => { try { return { file: join(DIR, f), ...JSON.parse(readFileSync(join(DIR, f), 'utf8')) }; } catch { return null; } })
    .filter((n) => n && n.status !== 'done')
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
} catch {}
if (!open.length) process.exit(0);

const by = {};
for (const n of open) (by[n.about || 'vault'] ||= []).push(n);
const clip = (t, n) => (t.length > n ? t.slice(0, n - 1) + '…' : t);
const lines = [`The owner has ${open.length} open note${open.length === 1 ? '' : 's'} for Claude, pinned on the page itself with ⌥N (vault/fixes/):`];
for (const [about, list] of Object.entries(by)) {
  lines.push(`- ${about}:`);
  for (const n of list) lines.push(`  - "${clip(n.text.replace(/\s+/g, ' '), 120)}" on ${n.path}${n.words ? ` on the words "${clip(n.words.text, 80)}"` : n.el?.tag ? ` (${n.el.tag}${n.el.text ? ` "${clip(n.el.text, 40)}"` : ''})` : ''} · ${n.file}`);
}
lines.push('If the work in this session is about one of these, say so and offer to fix it; otherwise leave them.',
  'To find the spot: a note on words quotes them (words.text, with a little before and after); the file also has the selector, the words in the element, where in it, the window size and theme; shot.mjs or the browser can open it there.',
  'When one is fixed, set "status": "done" and a one-line "reply" in its file (the page shows the reply beside the pin). Don\'t delete it: the owner clears it.');
console.log(lines.join('\n'));
