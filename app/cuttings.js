// A cutting is a fragment of someone else's page plus the reason it was noticed. The extension
// POSTs one here; this writes it into the vault as a markdown note with its pixels beside it.
import { mkdirSync, writeFileSync, readFileSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { VAULT } from './vault.js';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const site = (url) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'page'; } };
// A folder is a label in the frontmatter, not a directory: the files never move, so every path
// already written stays good, and a cutting can change folders without anything being renamed.
export const folderName = (s) => String(s || '').replace(/[\n\r"]/g, '').trim().slice(0, 60);
const q = (s) => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
const file = (dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
// A long-page capture comes back as JPEG, an element as PNG — keep the real extension either way.
const ext = (d) => (/^data:image\/jpe?g/.test(d) ? 'jpg' : /^data:video/.test(d) ? 'webm' : 'png');

export function writeCutting(c) {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const stamp = day + '-' + now.toTimeString().slice(0, 8).replace(/:/g, '');
  const host = site(c.page?.url);
  const name = `${stamp}-${slug(host)}`;
  const dir = join(VAULT, 'cuttings', name);
  mkdirSync(dir, { recursive: true });

  const m = c.measure || {};
  const assets = {};
  if (c.still) { const f = 'still.' + ext(c.still); writeFileSync(join(dir, f), file(c.still)); assets.still = `${name}/${f}`; }
  if (c.viewport) { const f = 'viewport.' + ext(c.viewport); writeFileSync(join(dir, f), file(c.viewport)); assets.viewport = `${name}/${f}`; }
  if (c.clip) { writeFileSync(join(dir, 'clip.webm'), file(c.clip)); assets.clip = `${name}/clip.webm`; }
  const seconds = c.clip ? Math.max(1, Math.round(c.seconds || 0)) : 0;

  const note = (c.note || '').trim();
  const title = note || `${m.element || 'a piece'} on ${host}`;
  const styleLines = Object.entries(m.styles || {}).map(([k, v]) => `- ${k}: \`${v}\``);
  const motionLines = (m.motion || []).flatMap((x) => [
    x.transition ? `- ${x.on} — transition \`${x.transition}\`` : null,
    x.animation ? `- ${x.on} — animation \`${x.animation}\`` : null,
  ].filter(Boolean));

  const body = [
    note ? null : '_Nothing said — the image is the note._\n',
    '## Source',
    `[${(c.page?.title || host).replace(/[\[\]]/g, '')}](${c.page?.url || ''})`,
    m.text ? `> ${m.text}` : null,
    '',
    '## Measured',
    `- element: \`${m.element || '?'}\` · ${Math.round(m.rect?.w || 0)}×${Math.round(m.rect?.h || 0)} in a ${m.viewport?.w}×${m.viewport?.h} viewport`,
    seconds ? `- clip: ${seconds}s, cropped to the element` : null,
    m.full ? `- full height: ${m.full.h}px, stitched from ${m.full.screens} screens` : null,
    m.surface?.kind === 'canvas' ? `- canvas ${m.surface.w}×${m.surface.h} — the type, colour and motion are in the shader, not the CSS. The clip is the only record.` : null,
    m.fonts?.length ? `- type: ${m.fonts.join('; ')}` : null,
    m.palette?.length ? `- palette: ${m.palette.map((p) => `\`${p}\``).join(' ')}` : null,
    ...(motionLines.length ? ['', '### Motion', ...motionLines] : m.surface?.kind === 'canvas' ? [] : ['- motion: none declared in CSS']),
    ...(styleLines.length ? ['', '### Computed', ...styleLines] : []),
    '',
  ]
    .filter((l) => l !== null && l !== undefined)
    // Absent fields leave empty strings behind; collapse runs of them so the note never
    // opens on a blank or shows a gap where a measurement simply wasn't there.
    .reduce((out, l) => (l.trim() === '' && (!out.length || out[out.length - 1] === '') ? out : [...out, l]), [])
    .join('\n')
    .trimEnd() + '\n';

  const fm = [
    '---',
    `name: ${name}`,
    `title: ${q(title)}`,
    `description: ${q(note ? `${host} — ${note}` : `${m.element || 'a piece'} on ${host}`)}`,
    'metadata:',
    '  type: cutting',
    `source: ${q(c.page?.url || '')}`,
    `site: ${host}`,
    folderName(c.folder) ? `folder: ${q(folderName(c.folder))}` : null,
    assets.still ? `still: ${assets.still}` : null,
    assets.viewport ? `viewport: ${assets.viewport}` : null,
    assets.clip ? `clip: ${assets.clip}` : null,
    seconds ? `seconds: ${seconds}` : null,
    m.full?.screens ? `screens: ${m.full.screens}` : null,
    `created: ${day}`,
    `updated: ${day}`,
    `tags: [cutting, ${slug(host)}]`,
    '---',
    '',
  ].filter(Boolean).join('\n');

  writeFileSync(join(VAULT, 'cuttings', name + '.md'), fm + '\n' + body);
  return { name, title, url: `http://localhost:4700/n/${encodeURIComponent(name)}` };
}

// Deleting a cutting moves it to a hidden .trash folder rather than destroying it: the reader
// skips dot-directories, so it disappears from the gallery, and it can always come back. Emptying
// the bin is a deliberate act taken outside this tool.
export function binCutting(name, restore) {
  if (!/^[\w.-]+$/.test(name)) throw new Error('bad name');
  const root = join(VAULT, 'cuttings');
  const bin = join(root, '.trash');
  const from = restore ? bin : root;
  const to = restore ? root : bin;
  mkdirSync(to, { recursive: true });
  let moved = 0;
  for (const leaf of [name + '.md', name]) {
    const src = join(from, leaf);
    if (!existsSync(src)) continue;
    renameSync(src, join(to, leaf));
    moved++;
  }
  if (!moved) throw new Error('no such cutting');
  return { name, moved };
}

export function setCuttingFolder(name, folder) {
  if (!/^[\w.-]+$/.test(name)) throw new Error('bad name');
  const file = join(VAULT, 'cuttings', name + '.md');
  if (!existsSync(file)) throw new Error('no such cutting');
  const raw = readFileSync(file, 'utf8');
  const end = raw.indexOf('\n---', 3);
  const f = folderName(folder);
  let head = raw.slice(0, end).split('\n').filter((l) => !/^folder:/.test(l));
  if (f) head.splice(head.findIndex((l) => /^site:/.test(l)) + 1 || head.length, 0, `folder: ${q(f)}`);
  writeFileSync(file, head.join('\n') + raw.slice(end));
  return { name, folder: f };
}

/* ---------- style guide ---------- */
// A folder of cuttings, read by an agent as one set: what the buildings in them have in common,
// written back as a note. Runs through the agent's CLI (Claude Code, or VAULT_AGENT) so it uses the
// subscription already signed in on this machine — no API key to keep. One run per folder at a time; state lives in memory, because
// a run that dies with the server is simply run again.

const jobs = new Map(); // folder → { state: 'running' | 'done' | 'failed', started, error, guide }
export const guideName = (folder) => 'style-guide-' + slug(folder || 'folder');
export const analysisState = (folder) => jobs.get(folder) || { state: 'idle' };

export function analyzeFolder(folder, cuts, focus) {
  const f = folderName(folder);
  if (!f) throw new Error('no folder');
  if (jobs.get(f)?.state === 'running') return jobs.get(f);
  const root = join(VAULT, 'cuttings');
  // Stills only: a clip's poster is its still, and a whole viewport is mostly not the building.
  const shots = cuts.filter((c) => c.still).slice(0, 40);
  if (!shots.length) throw new Error('nothing in this folder has a picture');
  const subject = (focus || '').trim() || 'the building';

  const prompt = [
    `These ${shots.length} photos are one folder of visual references called "${f}". Read every one with the Read tool, in order, before writing anything.`,
    '',
    ...shots.map((c, i) => `${i + 1}. ${join(root, c.still)}${c.title && !/ on [\w.-]+$/.test(c.title) ? ` — my note: "${c.title}"` : ''}`),
    '',
    `Analyze only ${subject} in each photo. Ignore the sky, people, cars, cropping, captions, website UI and photographic style unless it changes how ${subject} reads.`,
    '',
    'Then write a style guide: the commonalities across the set, so someone could design a new one that belongs in this folder. Rules:',
    '- Lead with what nearly all of them share. Say how many photos show each trait, like (9/12), and cite photo numbers.',
    '- Be concrete and measurable where you can: proportions and ratios, storey counts, window-to-wall, roof pitch, rhythm of bays, material names, colours as approximate hex.',
    '- Sections, in this order: "## The short version" (5 bullets max), "## Massing and proportion", "## Facade and openings", "## Materials and colour", "## Roof and edges", "## Details", "## Ground and setting", "## Where they disagree" (the real splits, and the outliers by number), "## To design one" (a checklist of do / don\'t).',
    '- Skip a section if the photos genuinely say nothing about it. No preamble, no sign-off, no title heading. Plain, casual English, short sentences.',
    '- Output only the markdown of the guide.',
  ].join('\n');

  const job = { state: 'running', started: Date.now(), count: shots.length };
  jobs.set(f, job);
  const child = runAgent(['-p', '--allowedTools', 'Read', '--add-dir', root, '--output-format', 'text'], prompt, {
    cwd: root,
    env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/bin:/bin:${process.env.PATH || ''}` },
  });
  let out = '', err = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (err += d));
  const timer = setTimeout(() => child.kill('SIGTERM'), 15 * 60 * 1000);
  child.on('error', (e) => { clearTimeout(timer); Object.assign(job, { state: 'failed', error: e.message }); });
  child.on('close', (code) => {
    clearTimeout(timer);
    const md = out.trim();
    if (code !== 0 || !md) return Object.assign(job, { state: 'failed', error: (err || out || `the agent exited ${code}`).trim().slice(-400) });
    try { Object.assign(job, { state: 'done', guide: writeGuide(f, shots, subject, md) }); }
    catch (e) { Object.assign(job, { state: 'failed', error: e.message }); }
  });
  return job;
}

function writeGuide(folder, shots, subject, md) {
  const day = new Date().toISOString().slice(0, 10);
  const name = guideName(folder);
  const dir = join(VAULT, 'cuttings', 'guides');
  mkdirSync(dir, { recursive: true });
  const refs = shots.map((c, i) => `${i + 1}. [${String(c.title).replace(/[\[\]]/g, '')}](/n/${encodeURIComponent(c.name)})`).join('\n');
  const text = [
    '---',
    `name: ${name}`,
    `title: ${q(`${folder}, the style guide`)}`,
    `description: ${q(`What the ${shots.length} cuttings in ${folder} have in common — ${subject}`)}`,
    'metadata:',
    '  type: style-guide',
    `folder: ${q(folder)}`,
    `created: ${day}`,
    `updated: ${day}`,
    `tags: [cuttings, style-guide, ${slug(folder)}]`,
    '---',
    '',
    md,
    '',
    '## The photos',
    refs,
    '',
  ].join('\n');
  writeFileSync(join(dir, name + '.md'), text);
  return name;
}
