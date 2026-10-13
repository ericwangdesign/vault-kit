#!/usr/bin/env node
/* The writing canvas as text. The same spec canvas.js draws as a page, written out for places that only take words:
   a chat reply (Markdown) or a Slack message (Slack's mrkdwn). One spec, many outputs.

   node canvas/text.mjs <page.html|spec.json> [--slack] [--link <url of the page>]

   Every shape keeps its title, because the titles carry the story; under it goes the least text that still says what
   the shape shows. Pictures become their alt text and a link, numbers stay numbers, and the one thing that matters
   (the pick, the key row, the blue bar) is marked in words, since text has no blue. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function specOf(file) {
  const src = readFileSync(file, 'utf8');
  if (file.endsWith('.json')) return JSON.parse(src);
  const m = src.match(/<script type="application\/json" id="canvas">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('No canvas spec in ' + file);
  return JSON.parse(m[1]);
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dfmt = (s) => { const m = String(s).match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/); return m ? MON[+m[2] - 1] + (m[3] ? ' ' + +m[3] : ' ' + m[1]) : String(s); };
const range = (a, z) => !z || z === a ? dfmt(a) : dfmt(a) + ' – ' + (String(a).slice(0, 7) === String(z).slice(0, 7) ? +String(z).slice(8, 10) : dfmt(z));
const num = (v, b = {}) => typeof v !== 'number' ? String(v) : (b.prefix || '') + new Intl.NumberFormat('en-US', { maximumFractionDigits: b.decimals ?? (v % 1 ? 1 : 0) }).format(v) + (b.unit || '');

export function toText(spec, opts = {}) {
  const slack = !!opts.slack;
  // Markdown in, the target's dialect out: Slack bolds with one star, italics with underscores, links as <url|text>.
  const md = (s) => {
    s = String(s ?? '');
    if (!slack) return s;
    return s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>').replace(/\*\*([^*]+)\*\*/g, '\u0000$1\u0000').replace(/(^|[^*])\*([^*]+)\*/g, '$1_$2_').replace(/\u0000/g, '*');
  };
  const bold = (s) => slack ? `*${s}*` : `**${s}**`;
  const dot = slack ? '•' : '-';
  const li = (s, d = 0) => '  '.repeat(d) + dot + ' ' + s;
  const pick = (s) => s + ' ✓';
  const out = [];
  const push = (...lines) => out.push(...lines.filter((l) => l != null && l !== false));
  const title = (b) => b.title ? bold(md(b.title)) : null;
  const cap = (b) => b.caption ? (slack ? '_' + md(b.caption) + '_' : '*' + md(b.caption) + '*') : null;
  const pins = (p) => (p || []).map((x, i) => `${i + 1}. ${md(x.text)}`);
  // A picture's path is the vault's; outside the vault it needs the vault's address in front, taken from --link.
  const base = opts.link ? (String(opts.link).match(/^https?:\/\/[^/]+/) || [''])[0] : '';
  const abs = (u) => /^\//.test(u) && base ? base + u : u;
  const link = (src, alt) => src ? (slack ? `<${abs(src)}|${alt || 'picture'}>` : `[${alt || 'picture'}](${abs(src)})`) : md(alt || '');

  const BLOCK = {
    text: (b) => push(md(b.md), ''),
    heading: (b) => push(slack ? bold(b.text) : '## ' + b.text, ''),
    list: (b) => push(...(b.items || []).map((i) => li(md(i))), ''),
    quote: (b) => push('> ' + md(b.md) + (b.cite ? ` (${md(b.cite)})` : ''), ''),
    aside: (b) => push('> ' + (b.title ? bold(b.title) + ' ' : '') + md(b.md), ''),
    figure: (b) => push(title(b), link(b.src, b.alt), ...pins(b.pins), cap(b), ''),
    beforeAfter: (b) => {
      push(title(b));
      for (const k of ['before', 'after']) {
        const s = b[k] || {}, label = s.label || (k === 'before' ? 'Before' : 'After');
        if (s.src) push(`${bold(label)}: ${link(s.src, s.alt)}`, ...pins(s.pins));
        else { push(bold(label)); walk(s.blocks || []); }
      }
      push(cap(b), '');
    },
    decision: (b) => push(
      b.chose ? (b.label || 'Decision') + ': ' + bold(md(b.chose)) : (b.label || 'Not decided yet') + ': ' + bold(md(b.open)),
      ...(b.why || []).length ? [(b.whyLabel || 'Why') + ':', ...b.why.map((i) => li(md(i)))] : [],
      ...(b.cost || []).length ? [(b.costLabel || 'What it costs') + ':', ...b.cost.map((i) => li(md(i)))] : [],
      b.open && b.chose ? bold('Still open.') + ' ' + md(b.open) : null,
      b.sign ? [].concat(b.sign).join(' · ') : null, ''),
    compare: (b) => {
      const o = b.options || [], name = (j) => j === b.picked ? pick(md(o[j])) : md(o[j]);
      push(title(b));
      if (!slack) {
        push('| | ' + o.map((_, j) => name(j)).join(' | ') + ' |', '|---|' + o.map(() => '---|').join(''),
          ...(b.rows || []).map((r) => `| ${md(r.label)} | ${(r.values || []).map(md).join(' | ')} |`));
      } else for (const r of b.rows || []) push(li(md(r.label) + ': ' + (r.values || []).map((v, j) => `${name(j)}: ${md(v)}`).join(' · ')));
      push(cap(b), '');
    },
    steps: (b) => push(title(b), ...(b.items || []).map((i, k) => `${k + 1}. ${i.key ? bold(md(i.title)) : md(i.title)}${i.text ? ': ' + md(i.text) : ''}`), cap(b), ''),
    timeline: (b) => push(title(b), ...(b.items || []).map((i) => li(`${i.when}: ${i.key ? bold(md(i.title)) : md(i.title)}${i.text ? '. ' + md(i.text) : ''}`)), cap(b), ''),
    tree: (b) => {
      push(title(b));
      const MARK = { new: ' (new)', gone: ' (gone)', moved: ' (moved)' };
      const node = (n, d) => { push(li(md(n.label) + (n.note ? ` (${md(n.note)})` : '') + (MARK[n.mark] || ''), d)); (n.children || []).forEach((c) => node(c, d + 1)); };
      (b.roots || (b.root ? [b.root] : [])).forEach((r) => node(r, 0));
      push(cap(b), '');
    },
    flow: (b) => {
      const label = {}; (b.nodes || []).forEach((n) => { label[n.id] = md(n.label); });
      push(title(b), ...(b.edges || []).map((e) => li(e.from === e.to ? `${label[e.from]} repeats${e.label ? ': ' + md(e.label) : ''}` : `${label[e.from]} → ${label[e.to]}${e.label ? ` (${md(e.label)})` : ''}`)), cap(b), '');
    },
    sequence: (b) => {
      const name = {}; (b.parties || []).forEach((p) => { name[p.id] = md(p.label); });
      push(title(b), ...(b.steps || []).map((x, k) => `${k + 1}. ${x.from === x.to ? name[x.from] : name[x.from] + ' → ' + name[x.to]}: ${x.key ? bold(md(x.label)) : md(x.label)}${x.note ? ' (' + md(x.note) + ')' : ''}`), cap(b), '');
    },
    variants: (b) => push(title(b), ...(b.items || []).map((i) => li((i.picked ? pick(bold(md(i.label))) : md(i.label)) + (i.mark === 'gone' ? ' (dropped)' : '') + (i.md ? ': ' + md(i.md) : '') + (i.note ? '. ' + md(i.note) : '') + (i.src ? ' ' + link(i.src, 'see it') : ''))), cap(b), ''),
    tabs: (b) => { push(title(b)); for (const p of b.tabs || []) { push(bold(p.label || 'Tab')); walk(p.blocks || []); } push(cap(b), ''); },
    table: (b) => {
      const cols = (b.columns || []).map((c) => typeof c === 'string' ? c : c.label), rows = (b.rows || []).map((r) => Array.isArray(r) ? { cells: r } : r);
      push(title(b));
      if (!slack) push('| ' + cols.join(' | ') + ' |', '|' + cols.map(() => '---|').join(''), ...rows.map((r) => '| ' + r.cells.map((c, j) => (r.key && j === 0 ? bold(md(num(c, b))) : md(num(c, b)))).join(' | ') + ' |'));
      else for (const r of rows) push(li(r.cells.map((c, j) => (j === 0 ? (r.key ? bold(md(num(c, b))) : md(num(c, b))) : `${cols[j]}: ${md(num(c, b))}`)).join(' · ')));
      push(cap(b), '');
    },
    checklist: (b) => {
      const I = { done: '☑', doing: '◐', open: '☐', blocked: '⊘' }, items = b.items || [];
      push(b.title ? `${bold(md(b.title))} (${items.filter((i) => i.state === 'done').length} of ${items.length} done)` : null,
        ...items.map((i) => `${I[i.state] || I.open} ${md(i.label)}${i.when ? ' · ' + i.when : ''}${i.note ? ': ' + md(i.note) : ''}`), cap(b), '');
    },
    sources: (b) => push(title(b), ...(b.items || []).map((s) => li(link(s.url, md(s.title)) + (s.note ? ': ' + md(s.note) : '') + (s.checked ? ` (checked ${s.checked})` : ''))), cap(b), ''),
    code: (b) => push(title(b), '```' + (slack ? '' : (b.lang || '').toLowerCase()), String(b.code || '').replace(/\n$/, ''), '```', cap(b), ''),
    collapsible: (b) => { push(bold(md(b.title || 'More')) + (b.note ? ' ' + md(b.note) : '')); walk(b.blocks || []); push(''); },
    stats: (b) => push(title(b), ...(b.items || []).map((i) => li(`${i.key ? bold(num(i.value, b)) : num(i.value, b)} ${md(i.label)}${i.vs ? ' (' + md(i.vs) + ')' : ''}`)), cap(b), ''),
    chart: (b) => {
      push(title(b));
      const data = b.data || [], tot = data.reduce((n, d) => n + d.value, 0), key = (d) => d.key || d.label === b.highlight;
      if (b.kind === 'ring') push(`${b.show ?? Math.round((b.value || 0) / (b.of || 100) * 100) + '%'} ${md(b.label || '')}${b.note ? '. ' + md(b.note) : ''}`);
      else if (b.kind === 'share') push(...data.map((d) => li(`${key(d) ? bold(Math.round(d.value / (tot || 1) * 100) + '%') : Math.round(d.value / (tot || 1) * 100) + '%'} ${md(d.label)} (${num(d.value, b)})`)));
      else if (b.kind === 'line') {
        const series = b.series || (b.points ? [{ name: b.name || '', points: b.points }] : []);
        for (const s of series) { const p = s.points || [], a = p[0], z = p[p.length - 1]; if (a && z) push(li(`${s.name ? md(s.name) + ': ' : ''}${num(a[1], b)} → ${bold(num(z[1], b))} (${dfmt(a[0])} to ${dfmt(z[0])})`)); }
        for (const m of b.marks || []) push(li(`${dfmt(m.at ?? m.x ?? '')}: ${md(m.label)}`));
      } else if (b.kind === 'funnel') {
        push(...data.map((d, i) => { const p = i ? data[i - 1].value : 0, drop = p ? Math.round((p - d.value) / p * 100) : 0;
          return li(`${md(d.label)} ${num(d.value, b)}${drop ? ` (${key(d) ? bold('−' + drop + '%') : '−' + drop + '%'})` : ''}`); }));
      } else {
        const d2 = b.order === 'given' ? data : data.slice().sort((p, q) => q.value - p.value);
        push(...d2.map((d) => li(`${key(d) ? bold(md(d.label)) : md(d.label)} ${num(d.value, b)}`)));
      }
      push(cap(b), '');
    },
    gantt: (b) => {
      push(title(b)); let g = null;
      for (const i of b.items || []) { if (i.group && i.group !== g) { push(bold(md(i.group))); g = i.group; } push(li(`${i.key ? bold(md(i.label)) : md(i.label)}: ${range(i.start, i.end)}${i.note ? ' (' + md(i.note) + ')' : ''}`)); }
      push(cap(b), '');
    },
    calendar: (b) => push(title(b), ...(b.events || []).slice().sort((p, q) => String(p.start).localeCompare(q.start)).map((e) => li(`${range(e.start, e.end)}: ${e.key ? bold(md(e.label)) : md(e.label)}`)), cap(b), ''),
    matrix: (b) => {
      const x = b.x || {}, y = b.y || {}, side = (v, a) => v >= 50 ? (a.high || 'high') : (a.low || 'low');
      push(title(b), `${md(x.label || 'x')} across, ${md(y.label || 'y')} up.`, ...(b.items || []).map((i) => li(`${i.key ? bold(md(i.label)) : md(i.label)}: ${md(side(i.x, x))}, ${md(side(i.y, y))}`)), cap(b), '');
    },
    heatmap: (b) => {
      const days = b.days || {}, ks = Object.keys(days).sort(), tot = ks.reduce((n, k) => n + days[k], 0), act = ks.filter((k) => days[k]).length;
      const top = ks.slice().sort((p, q) => days[q] - days[p])[0];
      push(title(b), `${num(tot)} ${b.unit || ''} on ${act} days, ${dfmt(ks[0])} to ${dfmt(ks[ks.length - 1])}.${top ? ` Busiest: ${dfmt(top)}, ${days[top]}.` : ''}`, cap(b), '');
    },
    treemap: (b) => {
      push(title(b));
      const node = (n, d) => { push(li(`${n.key ? bold(md(n.label)) : md(n.label)} ${num(n.value, b)}`, d)); (n.children || []).slice().sort((p, q) => q.value - p.value).forEach((c) => node(c, d + 1)); };
      (b.data || []).slice().sort((p, q) => q.value - p.value).forEach((n) => node(n, 0));
      push(cap(b), '');
    },
  };
  function walk(blocks) { for (const b of blocks) { const f = BLOCK[b && b.type]; if (f) f(b); else push(`(${b && b.type})`, ''); } }

  push(slack ? bold(spec.title) : '# ' + spec.title);
  const meta = (spec.meta || []).filter((m) => /\d/.test(m) && !/min read/.test(m)).concat(spec.kicker ? [].concat(spec.kicker) : []);
  if (meta.length) push(slack ? '_' + meta.join(' · ') + '_' : '*' + meta.join(' · ') + '*');
  push('');
  if (spec.dek) push(md(spec.dek), '');
  walk(spec.blocks || []);
  if (spec.foot) push(md(spec.foot), '');
  if (opts.link) push((slack ? `<${opts.link}|The full page>` : `[The full page](${opts.link})`), '');
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] || '')) {
  const a = process.argv.slice(2), file = a.find((x) => !x.startsWith('--') && a[a.indexOf(x) - 1] !== '--link');
  if (!file) { console.error('usage: text.mjs <page.html|spec.json> [--slack] [--link <url>]'); process.exit(2); }
  const li = a.indexOf('--link');
  process.stdout.write(toText(specOf(file), { slack: a.includes('--slack'), link: li >= 0 ? a[li + 1] : null }));
}
