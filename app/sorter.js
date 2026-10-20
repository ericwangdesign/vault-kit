// The inbox sorts itself. Nothing polls a model: a capture arriving is the trigger.
//
// - A capture starts a short quiet timer. More captures restart it, so a burst of five
//   thoughts is one sort, not five.
// - When the timer ends, and only if inbox.md still has lines, one headless Claude run
//   (the cheap model) follows the sort-inbox skill. VAULT_AGENT runs another agent (agents.js).
// - One run at a time. Anything that lands mid-run gets its own run afterwards.
// - A cheap file check every 30 minutes catches anything a failed run left behind.
//   Reading a file costs nothing; the model only runs when there's something to sort.
// - Only one machine sorts: the one started with VAULT_SORTER=1 (the always-on box). Two
//   sorters editing the same inbox is how the sync jams.
// - A run that leaves the inbox exactly as it found it is not tried again until a new
//   capture changes it, so a line that can't be filed doesn't cost a run every two minutes.
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { readInbox } from './api.js';
import { VAULT } from './vault.js';
import { runAgent } from './agents.js';

const QUIET_MS = 2 * 60 * 1000;
const SWEEP_MS = 30 * 60 * 1000;
const MODEL = 'haiku';
const ON = process.env.VAULT_SORTER === '1';
const LOG = process.env.VAULT_SORT_LOG || join(homedir(), 'vault-sort.log');
// The skill travels with the reader, so whichever machine sorts has the same instructions.
const SKILL_DIR = fileURLToPath(new URL('./skills/sort-inbox/', import.meta.url));
const SKILL = join(SKILL_DIR, 'SKILL.md');

const PROMPT = `Read ${SKILL} and follow it to sort ${VAULT}/inbox.md.
The vault on this machine is at ${VAULT}, whatever path the skill names.
If ${VAULT}/work does not exist, this machine has no copy of the private work notes: leave any work capture in inbox.md exactly as it is and sort the rest.
This run is unattended: nobody reads your reply, so skip the "tell the owner" step and never ask a question.
Make the best call on anything unclear; the receipt (sorted.md) is where the owner catches a wrong one.
Never commit anything under work/.`;

let timer = null, running = false, again = false, stuck = null;
const inboxNow = () => readInbox().map((i) => `${i.at} ${i.text}`).join('\n');
const log = (line) => { try { appendFileSync(LOG, `${new Date().toISOString()} ${line}\n`); } catch {} };

function run() {
  timer = null;
  if (!readInbox().length || inboxNow() === stuck) return;
  if (running) { again = true; return; }
  running = true;
  const before = inboxNow();
  log(`sorting ${readInbox().length} capture(s)`);
  const child = runAgent([
    '-p',
    '--model', MODEL,
    '--permission-mode', 'acceptEdits',
    '--add-dir', SKILL_DIR,
    '--allowedTools', 'Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash(git add:*)', 'Bash(git commit:*)', 'Bash(git status:*)', 'Bash(ls:*)', 'Bash(mkdir:*)',
  ], PROMPT, {
    cwd: VAULT,
    env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ''}` },
  });
  let out = '';
  // A hung run would block every sort after it; ten minutes is far past a normal one (~30s).
  const killer = setTimeout(() => { log('run took over 10 minutes, stopping it'); child.kill(); }, 10 * 60 * 1000);
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  child.on('close', (code) => {
    clearTimeout(killer);
    running = false;
    tidyFrontmatter();
    log(`done (exit ${code}) ${out.trim().slice(-400).replace(/\s+/g, ' ')}`);
    // A run that changed nothing couldn't file what's there; wait for the inbox to change before trying again.
    stuck = inboxNow() === before ? before : null;
    if (again || (readInbox().length && !stuck)) { again = false; schedule(QUIET_MS); }
  });
  child.on('error', (e) => { running = false; log(`failed to start: ${e.message}`); });
}

// Safety net for the cheap model: if a run wrapped a frontmatter value in curly quotes, put
// straight ones back so the note still parses. Only touches files the last commit changed.
function tidyFrontmatter() {
  try {
    const files = execFileSync('git', ['diff', '--name-only', 'HEAD~1', 'HEAD'], { cwd: VAULT, encoding: 'utf8' })
      .split('\n').filter((f) => f.endsWith('.md') && !f.startsWith('work/'));
    const fixed = [];
    for (const f of files) {
      const p = join(VAULT, f);
      if (!existsSync(p)) continue;
      const raw = readFileSync(p, 'utf8');
      if (!raw.startsWith('---')) continue;
      const end = raw.indexOf('\n---', 3);
      const head = raw.slice(0, end).replace(/^(\w[\w-]*): “(.*)”$/gm, (_, k, v) => `${k}: "${v.replace(/"/g, '\\"')}"`);
      if (head !== raw.slice(0, end)) { writeFileSync(p, head + raw.slice(end)); fixed.push(f); }
    }
    if (fixed.length) {
      execFileSync('git', ['add', ...fixed], { cwd: VAULT });
      execFileSync('git', ['commit', '-qm', 'Sort: straight quotes back in frontmatter'], { cwd: VAULT });
      log(`tidied frontmatter in ${fixed.join(', ')}`);
    }
  } catch (e) { log(`tidy failed: ${e.message}`); }
}

export function schedule(ms = QUIET_MS) {
  if (!ON) return;
  clearTimeout(timer);
  timer = setTimeout(run, ms);
}

export function startSorter() {
  if (!ON) return;
  if (readInbox().length) schedule(QUIET_MS);
  setInterval(() => { if (!timer && !running && readInbox().length) run(); }, SWEEP_MS);
}
