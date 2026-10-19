#!/usr/bin/env node
/* The writing canvas's catalog and its checker. One place that knows every block, what question it answers, what it
   needs, and the rules a page is held to. canvas.js draws; this says whether a page is right before anyone sees it.

   node canvas/check.mjs <page.html|spec.json> ...   check pages; exit 1 if any has an error
                                                     (pages in vault/pages are also drawn at 390 and 1440 wide and
                                                     measured, when the reader is up; --no-layout skips)
   node canvas/check.mjs --catalog                   print the shape table the skill uses
   node canvas/check.mjs --arcs                      print the page arcs
   node canvas/check.mjs --css                       check canvas.css: every size from a token, no token named twice
   node canvas/check.mjs --docs                      print reference.md for the skill: arcs, which shape, every shape's fields

   Errors break the page or the rules. Warnings are the framework: titles that say the point, a shape in every
   section, short text between shapes, the arc's slots in order. */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOCS, fieldsOf } from './shapes.mjs';
import { layout, WIDTHS } from './layout.mjs';

const VAULT = resolve(process.env.VAULT || process.env.VAULT_PATH || join(fileURLToPath(new URL('.', import.meta.url)), '../../starter-vault'));
// Where the running reader serves vault/pages with the live renderer (on localhost it needs no sign-in).
const BASE = process.env.CANVAS_BASE || `http://localhost:${process.env.PORT || 4700}`;

/* ---------- the catalog ----------
   group: what the shape shows. asks: the question it answers. when: the hard trigger. need: required fields.
   titled: true when the shape must carry a title that states its finding. */
export const CATALOG = {
  // Running text. Fills the gaps between shapes, never carries a section alone.
  text:    { group: 'words', need: ['md'] },
  heading: { group: 'words', need: ['text'] },
  list:    { group: 'words', need: ['items'] },
  quote:   { group: 'words', need: ['md'] },
  aside:   { group: 'words', need: ['md'] },
  collapsible: { group: 'words', need: ['title', 'blocks'], asks: "What's underneath?", when: 'Depth a careful reader wants and a skimmer does not: the brief, the method, the raw notes. One line on show.' },
  sources:     { group: 'depth', need: ['items'], asks: 'Where did this come from?', when: 'Claims that rest on outside work. Each source, and what it showed.' },

  // Change and choice.
  beforeAfter: { group: 'change', titled: true, need: ['before', 'after'], asks: 'What changed?', when: 'Any visible change. Real screenshots or clips, same size, same moment. A side can hold blocks instead.' },
  compare:     { group: 'choice', titled: true, need: ['options', 'rows'], asks: 'Why this and not that?', when: '2+ options judged on the same 3+ things.' },
  variants:    { group: 'choice', titled: true, need: ['items'], asks: 'What did we try?', when: '2 to 6 options you can see: explorations, rounds, or every state of one thing.' },
  matrix:      { group: 'choice', titled: true, need: ['x', 'y', 'items'], asks: 'Where does each option sit?', when: '3+ options judged on two things at once.' },
  decision:    { group: 'choice', need: [], asks: 'So what did we pick?', when: 'Every page about a choice ends with one. Not made yet: leave out `chose` and say the question in `open`.' },
  tabs:        { group: 'choice', titled: true, need: ['tabs'], asks: 'How does it look in each case?', when: '2 to 5 views of the same thing: sizes, rounds, arcs. Two with a slide is beforeAfter.' },

  // Structure and how it works.
  tree:   { group: 'structure', titled: true, need: [], asks: 'Where does everything live?', when: 'Any structure 2+ levels deep. `mark` shows what moved.' },
  flow:   { group: 'structure', titled: true, need: ['nodes', 'edges'], asks: 'How does it behave?', when: 'States or screens with a branch, a retry or a failure. A straight line is steps.' },
  figure: { group: 'structure', need: ['src'], asks: 'What is it made of?', when: 'With `pins`: one screen and what its parts are for. Without: a picture the text needs.' },
  sequence: { group: 'structure', titled: true, need: ['parties', 'steps'], asks: 'Who asks whom, in what order?', when: 'One party asking 2+ others in turn, with answers coming back: a lookup, a checkout, an API call. 2 to 5 parties.' },
  steps:  { group: 'structure', titled: true, need: ['items'], asks: 'What happens, in order?', when: 'A process someone goes through, 3 to 6 steps, no branches.' },
  code:   { group: 'structure', titled: true, need: ['code'], asks: 'What does the code say?', when: 'A few lines that carry the point: a config, a spec, a diff. Up to 30 lines; `mark` the ones that matter.' },
  table:  { group: 'structure', titled: true, need: ['columns', 'rows'], asks: 'What are the details of each?', when: 'Rows of things with the same 3+ fields. Options judged on criteria is compare.' },
  cards:  { group: 'structure', titled: true, need: ['items'], asks: 'Which things, and where do I go for each?', when: '3 to 9 things each worth opening: places, pages, tools, people. A name, a kind, a line, a link, a picture if there is one. The same 3+ fields side by side is a table.' },
  carousel: { group: 'structure', titled: true, need: ['items'], asks: 'What does each screen look like, in order?', when: '3 to 10 pictures of one kind seen one after another: a flow\'s screens on a phone, a set of pages. Side by side to compare is variants.' },
  gallery: { group: 'structure', titled: true, need: ['items'], asks: 'What does it all look like?', when: '6 or more pictures with nothing to pick: a set of screens, a trip, a moodboard. Each opens large. Options to pick from is variants; screens in order, a carousel.' },
  map:     { group: 'structure', titled: true, need: ['places'], asks: 'Where is everything?', when: '2 to 12 places whose where matters: a trip, a day out, a neighbourhood. Each with a name, a kind, a fact and lat/lng.' },

  // Time.
  timeline: { group: 'time', titled: true, need: ['items'], asks: 'How did we get here?', when: '3+ dated or ordered events.' },
  gantt:    { group: 'time', titled: true, need: ['items'], asks: 'How long, and what overlaps?', when: '3+ things with start and end dates.' },
  calendar: { group: 'time', titled: true, need: ['events'], asks: "What's on which day?", when: 'Events you look up by date, within one to three months.' },
  heatmap:  { group: 'time', titled: true, need: ['days'], asks: 'When did it happen, and how much?', when: 'An amount per day over 3+ weeks, to show the rhythm and the gaps.' },
  checklist:{ group: 'time', titled: true, need: ['items'], asks: 'Where does it stand?', when: "A plan's items, each done, doing, open or blocked." },

  // Amounts.
  stats: { group: 'amount', need: ['items'], asks: 'How much?', when: '2 to 4 numbers that carry the point, each with what it is compared to.' },
  treemap: { group: 'amount', titled: true, need: ['data'], asks: 'What is it made of, by size?', when: '5 to 15 parts of one whole, or parts with parts. 2 to 4 parts is a share chart.' },
  chart: { group: 'amount', titled: true, need: ['kind'], asks: 'Which is biggest? What share? Up or down?', when: 'bar: 3 to 12 amounts. share: 2 to 4 parts of a whole. ring: one value out of a whole. funnel: 3 to 8 steps people drop out of, in order. line: 5+ points in time.' },

  // Something to use. When trying it says the point better than any picture of it: a slider, a picker, a toy, a tool.
  live: { group: 'use', titled: true, need: [], asks: 'What happens when I try it?', when: 'The point lands by doing: drag, tune, pick, filter, play. A page\'s own <template>, or a page of its own in a frame.' },
  ask: { group: 'use', titled: true, need: ['questions'], asks: 'What do I need from you?', when: '1 to 5 things only the owner can answer: a pick, a few picks, a number, a line. Answers save to the vault for Claude to read. Mark the option you would pick with `rec`.' },
  sheet: { group: 'use', titled: true, need: ['columns'], asks: 'Can I change it as I go?', when: 'A list the owner keeps up himself on the page: bookings, a packing list, a review, a budget. Text, numbers, ticks and picks; rows added and removed; saved to the vault. Only to read is a table.' },
};
const SHAPES = Object.keys(CATALOG).filter((k) => CATALOG[k].group !== 'words');

/* ---------- the arcs ----------
   A page is one of these. Each is an order of slots; a slot is filled by any of its shapes. `end` must close the page. */
export const ARCS = {
  decision:  { say: 'A choice, made or still to make. Why, and what it costs.', slots: [['beforeAfter', 'figure', 'variants', 'compare', 'live'], ['flow', 'sequence', 'tree', 'steps', 'figure', 'beforeAfter'], ['compare', 'variants', 'matrix', 'live'], ['decision']], end: 'decision' },
  shipped:   { say: 'Something changed. What, where, and what is still open.', slots: [['beforeAfter', 'tabs', 'live'], ['tree', 'flow', 'sequence', 'figure', 'steps', 'table'], ['timeline', 'stats', 'checklist']] },
  explainer: { say: 'How something works, for someone new to it.', slots: [['figure', 'tree', 'flow', 'sequence', 'steps', 'tabs', 'live'], ['flow', 'sequence', 'steps', 'figure', 'compare', 'variants', 'chart', 'table', 'treemap', 'live']] },
  plan:      { say: 'What happens next, and when.', slots: [['gantt', 'timeline', 'calendar', 'steps', 'checklist'], ['decision', 'compare', 'stats', 'checklist']] },
  review:    { say: 'A look back at a stretch of my own work.', slots: [['stats', 'chart', 'treemap'], ['timeline', 'gantt', 'calendar', 'heatmap'], ['variants', 'beforeAfter', 'figure', 'tabs']] },
  reference: { say: 'A catalog page: one of each shape, shown on real data. Only for the system\'s own docs.', slots: [] },
};

/* ---------- checking ---------- */
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;
const plain = (s) => String(s || '').replace(/\*|`|\[([^\]]+)\]\([^)]*\)/g, '$1');

function strings(b, out = []) {
  if (typeof b === 'string') out.push(b);
  else if (Array.isArray(b)) b.forEach((x) => strings(x, out));
  else if (b && typeof b === 'object') for (const k of Object.keys(b)) if (!/^(type|src|srcLight|poster|href|id|from|to|start|end|at|today|month|months|kind|mark|alt|crop)$/.test(k)) strings(b[k], out);
  return out;
}

export function check(spec, file = 'page') {
  const out = [], err = (at, msg) => out.push({ level: 'error', at, msg }), warn = (at, msg) => out.push({ level: 'warn', at, msg });
  if (!spec || typeof spec !== 'object') { err('page', 'No spec.'); return out; }
  if (!spec.title) err('page', 'No title.');
  // The page around the spec, so a live block's <template> can be found.
  const html = /\.html$/.test(file) && existsSync(file) ? readFileSync(file, 'utf8') : '';
  if (!spec.dek) warn('page', 'No dek. Two sentences that tell the whole story.');
  else if (words(spec.dek) > 50) warn('page', `Dek is ${words(spec.dek)} words. Two sentences, under 50.`);
  if (spec.arc && !ARCS[spec.arc]) err('page', `Unknown arc "${spec.arc}". One of: ${Object.keys(ARCS).join(', ')}.`);
  if (!spec.arc) warn('page', `No arc. Say which kind of page this is: ${Object.keys(ARCS).join(', ')}.`);
  const blocks = spec.blocks || [];
  if (!blocks.length) err('page', 'No blocks.');

  let quotes = 0;
  const media = (src, at) => {
    if (!src || !String(src).startsWith('/media/')) return;
    const f = join(VAULT, 'projects/_media', decodeURIComponent(String(src).slice(7)));
    if (existsSync(VAULT) && !existsSync(f)) err(at, `Missing file ${src} (looked in projects/_media).`);
  };
  const walk = (list, path) => list.forEach((b, i) => {
    const at = `${path}${i + 1} ${b && b.type}`, c = b && CATALOG[b.type];
    if (!c) { err(at, `Unknown block "${b && b.type}". Blocks: ${Object.keys(CATALOG).join(', ')}.`); return; }
    for (const f of c.need) if (b[f] == null || (Array.isArray(b[f]) && !b[f].length)) err(at, `Needs \`${f}\`.`);
    if (b.wide != null) warn(at, '`wide` does nothing: every shape sits in the one column. Drop it.');
    const fields = fieldsOf(b.type);
    if (fields) for (const k of Object.keys(b)) if (!fields.has(k) && k !== 'wide') warn(at, `\`${k}\` isn't a ${b.type} field, so it does nothing. Fields: ${[...fields].filter((f) => f !== 'type').join(', ')}.`);
    if (c.titled && !b.title && !path.includes('side')) warn(at, 'No title. Give it a sentence that says what it shows.');
    if (c.titled && b.title && words(plain(b.title)) < 4) warn(at, `Title "${plain(b.title)}" names a subject. Say the finding.`);

    // A crop is in percent of the picture, so the picture's own size has to be known.
    if (b) [b].concat(b.items || []).forEach((x) => { if (x && x.crop && !((x.w || b.w) && (x.h || b.h))) warn(at, 'A `crop` needs the picture\'s `w` and `h`.'); });
    switch (b.type) {
      case 'heading': if (b.text && b.text.length > 40) warn(at, `Heading is ${b.text.length} characters. Under 40, and say the point.`); break;
      case 'quote': if (++quotes > 1) warn(at, 'More than one quote. One per page.'); break;
      case 'text': if (words(b.md) > 120) warn(at, `${words(b.md)} words in one text block. Cut, or find the shape in it.`); break;
      case 'steps': { const n = (b.items || []).length; if (n < 3 || n > 6) warn(at, `${n} steps. Steps are 3 to 6.`); break; }
      case 'stats': { const n = (b.items || []).length; if (n < 2 || n > 4) warn(at, `${n} numbers. Stats are 2 to 4.`); (b.items || []).forEach((s, j) => { if (!s.vs) warn(at, `Number ${j + 1} has no \`vs\`. Say what it's compared to.`); }); break; }
      case 'compare': {
        const n = (b.options || []).length;
        if (n < 2) err(at, 'Compare needs 2+ options.');
        if ((b.rows || []).length < 3) warn(at, `${(b.rows || []).length} rows. Compare on 3+ things, or it's a sentence.`);
        (b.rows || []).forEach((r, j) => { if ((r.values || []).length !== n) err(at, `Row ${j + 1} has ${(r.values || []).length} values for ${n} options.`); });
        if (b.picked != null && (b.picked < 0 || b.picked >= n)) err(at, '`picked` is not one of the options.');
        break;
      }
      case 'live':
        if (!b.template === !b.src) err(at, 'A live piece takes one of `template` (the id of a <template> in the page) or `src` (a page of its own).');
        if (b.template && html && !html.includes(`<template id="${b.template}"`)) err(at, `No <template id="${b.template}"> in the page.`);
        if (b.src && !/^\/pages\//.test(b.src)) warn(at, '`src` outside /pages/: a framed page off the vault can\'t be sized or follow day and night.');
        break;
      case 'decision':
        if (!b.chose && !b.open) err(at, 'A decision needs `chose`, or `open` when it isn\'t made yet.');
        if (b.chose && !(b.cost || []).length) warn(at, 'No cost. Every decision says what it cost.');
        if (b.chose && !b.open) warn(at, 'No `open`. Say what is still open.');
        break;
      case 'variants': {
        const items = b.items || [];
        if (items.length < 2 || items.length > 6) warn(at, `${items.length} variants. Show 2 to 6.`);
        if (items.filter((v) => v.picked).length > 1) err(at, 'More than one variant is picked.');
        items.forEach((v, j) => { if (!v.label) err(at, `Variant ${j + 1} has no label.`); media(v.src, at); media(v.srcLight, at); if (v.src && !v.alt) warn(at, `Variant ${j + 1} has no alt.`); });
        if (items.some((v) => v.src) && !(b.w && b.h)) warn(at, 'Give `w` and `h` so every variant crops the same.');
        break;
      }
      case 'flow': {
        const ids = new Set((b.nodes || []).map((n) => n.id));
        if (ids.size !== (b.nodes || []).length) err(at, 'Two nodes share an id.');
        (b.edges || []).forEach((e, j) => { if (!ids.has(e.from) || !ids.has(e.to)) err(at, `Edge ${j + 1} points at a node that isn't there: ${e.from} → ${e.to}.`); });
        if ((b.nodes || []).length > 8) warn(at, `${b.nodes.length} nodes. Keep a flow to 8; split it.`);
        const out = {}; (b.edges || []).forEach((e) => { out[e.from] = (out[e.from] || 0) + 1; });
        if (!Object.values(out).some((n) => n > 1) && !(b.edges || []).some((e) => e.from === e.to)) warn(at, 'No branch or loop. A straight line is `steps`.');
        break;
      }
      case 'sequence': {
        const ids = new Set((b.parties || []).map((p) => p.id)), n = (b.parties || []).length;
        if (ids.size !== n) err(at, 'Two parties share an id.');
        if (n < 2) err(at, 'A sequence needs 2+ parties.');
        if (n > 5) warn(at, `${n} parties. A phone fits 5 across; leave out the ones that only pass things on.`);
        (b.parties || []).forEach((p, j) => { if (words(plain(p.label)) > 2) warn(at, `Party ${j + 1} "${plain(p.label)}" is long. One or two words; the rest goes in its note.`); });
        (b.steps || []).forEach((x, j) => {
          if (!ids.has(x.from) || !ids.has(x.to)) err(at, `Step ${j + 1} names a party that isn't there: ${x.from} → ${x.to}.`);
          // A step to itself has the room beside its loop, so it may run longer.
          if (x.from === x.to ? words(plain(x.label)) > 8 : words(plain(x.label)) > 5 || plain(x.label).length > 32) warn(at, `Step ${j + 1} "${plain(x.label)}" is long. Under 5 words: a phone gives a label only the width between its two parties.`);
        });
        const k = (b.steps || []).length;
        if (k < 3 || k > 12) warn(at, `${k} steps. A sequence is 3 to 12; fewer is a sentence, more is two sequences.`);
        if (!(b.steps || []).some((x) => x.reply)) warn(at, 'No reply. If nothing comes back, it\'s a flow or steps.');
        break;
      }
      case 'figure':
        media(b.src, at); media(b.srcLight, at);
        if (!b.alt) warn(at, 'No alt.');
        if (b.pins) b.pins.forEach((p, j) => { if (!(p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100)) err(at, `Pin ${j + 1} is off the picture (x, y are 0 to 100).`); });
        if (b.pins && b.pins.length > 6) warn(at, `${b.pins.length} pins. Five or fewer.`);
        break;
      case 'beforeAfter':
        for (const k of ['before', 'after']) {
          const s = b[k] || {};
          if (s.src) { media(s.src, at); media(s.srcLight, at); if (!(b.w && b.h)) err(at, 'Pictures need the true `w` and `h`.'); if (!s.alt) warn(at, `${k} has no alt.`); }
          else if (s.blocks) walk(s.blocks, `${at} ${k} side `);
          else err(at, `${k} needs \`src\` or \`blocks\`.`);
          (s.pins || []).forEach((p, j) => { if (!(p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100)) err(at, `${k} pin ${j + 1} is off the picture.`); });
        }
        break;
      case 'tabs': {
        const n = (b.tabs || []).length;
        if (n < 2 || n > 5) warn(at, `${n} tabs. Tabs are 2 to 5; two with a slide is beforeAfter.`);
        (b.tabs || []).forEach((t, j) => { if (!t.label) err(at, `Tab ${j + 1} has no label.`); walk(t.blocks || [], `${at} tab ${j + 1} `); });
        break;
      }
      case 'collapsible': walk(b.blocks || [], `${at} inside `); break;
      case 'table': {
        const n = (b.columns || []).length;
        (b.rows || []).forEach((r, j) => { const c = Array.isArray(r) ? r : r.cells || []; if (c.length !== n) err(at, `Row ${j + 1} has ${c.length} cells for ${n} columns.`); });
        if (n < 2) warn(at, 'A table with one column is a list.');
        if ((b.rows || []).length > 15) warn(at, `${b.rows.length} rows. Keep a table to 15; link the rest.`);
        break;
      }
      case 'checklist':
        if (/\d+\s+(of|out of)\s+\d+/.test(plain(b.title || ''))) warn(at, 'The title repeats the count; the checklist shows "x of y done" itself.');
        (b.items || []).forEach((i, j) => { if (i.state && !/^(done|doing|open|blocked)$/.test(i.state)) err(at, `Item ${j + 1}: state is done, doing, open or blocked.`); });
        break;
      case 'heatmap': {
        const ks = Object.keys(b.days || {});
        if (ks.some((k) => !/^\d{4}-\d\d-\d\d$/.test(k))) err(at, 'Days are YYYY-MM-DD.');
        if (!b.unit) warn(at, 'No `unit`. Say what a day counts.');
        break;
      }
      case 'treemap': {
        const n = (b.data || []).length;
        if (n < 3 || n > 15) warn(at, `${n} parts. A treemap is for 5 to 15; 2 to 4 is a share chart.`);
        break;
      }
      case 'sources':
        (b.items || []).forEach((x, j) => { if (!x.url || !x.title) err(at, `Source ${j + 1} needs a url and a title.`); });
        break;
      case 'code': {
        const n = String(b.code || '').replace(/\n$/, '').split('\n').length;
        if (n > 30) warn(at, `${n} lines. Show the 30 that matter; link the file for the rest.`);
        (b.mark || []).forEach((m) => { if (m < 1 || m > n) err(at, `Marked line ${m} isn't in the code.`); });
        break;
      }
      case 'chart':
        if (!/^(bar|share|ring|funnel|line)$/.test(b.kind || '')) err(at, 'Chart `kind` is bar, share, ring, funnel or line.');
        if (b.kind === 'funnel') {
          const d = b.data || [];
          if (d.length < 3 || d.length > 8) warn(at, `${d.length} steps. A funnel is 3 to 8.`);
          d.forEach((x, j) => { if (j && x.value > d[j - 1].value) warn(at, `Step ${j + 1} has more than the one before. A funnel only narrows; in any order it's a bar chart.`); });
          if (d.filter((x) => x.key).length > 1) warn(at, 'More than one key step. Mark the one place people leave.');
        }
        if (b.kind === 'ring' && typeof b.value !== 'number') err(at, 'A ring needs a number `value` (out of `of`, 100 if left out).');
        if (b.kind === 'ring' && b.value > (b.of || 100)) warn(at, 'The ring\'s `value` is more than its `of`.');
        if (b.kind === 'share' && ((b.data || []).length < 2 || b.data.length > 4)) warn(at, 'Share is 2 to 4 parts.');
        if (b.kind === 'bar' && ((b.data || []).length < 3 || b.data.length > 12)) warn(at, 'Bars are for 3 to 12 amounts.');
        if (b.kind === 'line' && (b.series || []).length > 4) warn(at, 'Up to 4 lines.');
        break;
    }
  });
  walk(blocks, '#');

  /* The rhythm: each section (a heading and what follows) carries a shape, and text between shapes stays short. */
  const sections = [[]];
  blocks.forEach((b) => { if (b.type === 'heading') sections.push([b]); else sections[sections.length - 1].push(b); });
  sections.forEach((sec) => {
    const h = sec[0] && sec[0].type === 'heading' ? `"${sec[0].text}"` : 'The opening';
    const hasShape = sec.some((b) => SHAPES.includes(b.type));
    const body = sec.filter((b) => b.type !== 'heading');
    if (spec.arc !== 'reference' && sec[0] && sec[0].type === 'heading' && !hasShape && body.length) warn('rhythm', `${h} has no shape. Each section is one shape and a couple of sentences.`);
    let run = 0;
    for (const b of sec) {
      if (SHAPES.includes(b.type)) run = 0;
      else if (b.type === 'text' || b.type === 'list') { run += words(b.md || (b.items || []).join(' ')); if (run > 90) { warn('rhythm', `${h}: ${run} words between shapes. Two sentences, then a shape.`); run = -1e9; } }
    }
  });
  const shapeCount = blocks.filter((b) => SHAPES.includes(b.type)).length, textWords = blocks.filter((b) => b.type === 'text').reduce((n, b) => n + words(b.md), 0);
  if (shapeCount && textWords / shapeCount > 70) warn('rhythm', `${textWords} words of text for ${shapeCount} shapes. Aim for under 70 a shape.`);

  /* The arc: its slots appear in order (each slot found after the last), and the closing block is right. */
  const arc = ARCS[spec.arc];
  if (arc) {
    const types = blocks.map((b) => b.type);
    let from = 0;
    arc.slots.forEach((slot, k) => {
      const at = types.findIndex((t, i) => i >= from && slot.includes(t));
      if (at < 0) warn('arc', `${spec.arc}: slot ${k + 1} wants one of ${slot.join(', ')}${from ? ' after the last one' : ''}.`);
      else from = at + 1;
    });
    if (arc.end && types.filter((t) => SHAPES.includes(t)).pop() !== arc.end) warn('arc', `${spec.arc} pages end with a \`${arc.end}\`.`);
  }

  /* The voice. */
  const all = [spec.title, spec.dek, spec.foot].concat(strings(blocks)).filter(Boolean).join('\n');
  // Shouting is all caps in prose: code and `names` don't count, and one short name (IONOS, NASA) isn't shouting.
  const prose = [spec.title, spec.dek, spec.foot].concat(strings(blocks.filter((b) => b.type !== 'code'))).filter(Boolean).join('\n').replace(/`[^`]*`/g, ' ');
  if (/—/.test(all)) warn('voice', 'An em dash. Use a full stop or a comma.');
  if (/\s&\s/.test(all)) warn('voice', 'An ampersand. Write "and".');
  // A run of three caps words, or of ten caps letters, or one word of eight: "DO NOT TOUCH" yes, "AI SDK" no.
  const caps = (plain(prose).match(/\b[A-Z]{2,}(?: [A-Z]{2,})+\b|\b[A-Z]{8,}\b/g) || []).filter((r) => r.split(' ').length >= 3 || r.replace(/ /g, '').length >= 8);
  if (caps.length) warn('voice', `All caps: ${[...new Set(caps)].slice(0, 3).join(', ')}.`);
  const bold = (all.match(/\*\*[^*]+\*\*/g) || []).length;
  if (bold > 1) warn('voice', `${bold} bold lines. One at most.`);
  return out;
}

/* ---------- a page that isn't a canvas ----------
   A tool or toy of its own, written as HTML. The spec rules don't apply; the vault's do: its look comes from the
   reader's own files, never a copied palette, and search can say what it is. */
export function checkFree(html) {
  const out = [], err = (msg) => out.push({ level: 'error', at: 'page', msg }), warn = (msg) => out.push({ level: 'warn', at: 'page', msg });
  if (!/<title>[^<]+<\/title>/i.test(html)) err('No <title>.');
  if (!/<meta\s+name=["']description["']/i.test(html)) warn('No <meta name="description">. Search reads it first, and a page drawn by script has little else.');
  for (const f of ['/vault.css', '/vault.js', '/fonts/geist.css']) if (!html.includes(`"${f}"`)) err(`Doesn't link ${f}. Start from vault/pages/_README.md.`);
  if (!/name=["']viewport["']/.test(html)) err('No viewport meta: it will draw at desktop width on a phone.');
  const styles = (html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const literals = [...new Set(styles.match(/#[0-9a-f]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/gi) || [])];
  if (literals.length) warn(`Colour literals in <style>: ${literals.slice(0, 4).join(', ')}. Take the token (var(--text), var(--text-3), var(--accent), var(--raised)).`);
  if (/font-family\s*:(?![^;]*var\()/i.test(styles) && !/font-family\s*:\s*inherit/i.test(styles)) warn('A font-family in <style>. Geist comes from /vault.css; leave it.');
  return out;
}

function specOf(file) {
  const s = readFileSync(file, 'utf8');
  if (file.endsWith('.json')) return JSON.parse(s);
  const m = s.match(/<script type="application\/json" id="canvas">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('No <script type="application/json" id="canvas"> in the page.');
  return JSON.parse(m[1]);
}

/* ---------- the stylesheet: every size from a token ----------
   Outside the token block, a padding, margin, gap, size, line height, offset, radius or font size may not be a raw px
   value. 1px and 2px are allowed (hairlines, focus rings), and so are a shape's own layout lengths, which are named
   once as a custom property on the shape (--lab, --room, --rail-w). Two tokens may not share a name: a later colour
   with the same name silently wins over a size, which is how the pins once went oval. */
export function checkCss(css) {
  const out = [], start = css.indexOf('.frame.cv > *'), head = css.slice(0, start);
  const from = head.indexOf('.frame.cv {'), block = head.slice(from, head.indexOf('\n}', from));
  const seen = {};
  for (const m of block.matchAll(/(--cv-[\w-]+)\s*:/g)) { if (seen[m[1]]) out.push(`token ${m[1]} is defined twice in the token block`); seen[m[1]] = 1; }
  const PROPS = /^(padding|margin|gap|row-gap|column-gap|width|height|min-height|line-height|top|left|right|bottom|inset|border-radius|font-size)(-[a-z]+)?$/;
  const lines = css.split('\n');
  lines.forEach((l, i) => {
    if (i < head.split('\n').length - 1 || /^\s*(\/\*|\*)/.test(l) || /@media/.test(l) && !/{[^}]*{/.test(l) && false) return;
    const body = l.replace(/@media[^{]*\{/, '');
    for (const m of body.matchAll(/(?:^|[;{\s])([a-z-]+)\s*:\s*([^;{}]*)/g)) {
      const [, prop, val] = m;
      if (!PROPS.test(prop) || /^(max|min)-width$/.test(prop) && /^\d/.test(val)) continue;
      const raw = (val.match(/(?<![\w.-])-?\d*\.?\d+px/g) || []).filter((x) => !/^-?[12]px$/.test(x));
      if (raw.length) out.push(`line ${i + 1}: ${prop}: ${val.trim()}  (raw ${raw.join(', ')}; use a token)`);
    }
  });
  return out;
}

/* ---------- the reference: written from the catalog, the arcs and shapes.mjs, never by hand ---------- */
const GROUPS = [['words', 'Running text'], ['change', 'Change'], ['choice', 'Choice'], ['structure', 'Structure and how it works'], ['time', 'Time'], ['amount', 'Amounts'], ['use', 'Something to use'], ['depth', 'Depth and sources']];
export function docs() {
  const L = [];
  L.push('# Writing canvas: the reference', '',
    'Generated by `node canvas/check.mjs --docs` from the checker\'s catalog, its arcs and `canvas/shapes.mjs`. Never edit this file: change those and regenerate. The checker reads the same examples, so a field that isn\'t listed here does nothing and gets flagged.', '');
  L.push('## Arcs', '', '| Arc | For | Slots, in order |', '|---|---|---|');
  for (const [k, a] of Object.entries(ARCS)) L.push(`| \`${k}\` | ${a.say} | ${a.slots.length ? a.slots.map((sl) => sl.join(', ')).join(' → ') + (a.end && a.slots[a.slots.length - 1].join() !== a.end ? ` → \`${a.end}\` last` : a.end ? ' (last)' : '') : 'no order'} |`);
  L.push('', 'Slots are the minimum, in order. Extra shapes may sit between them.', '');
  L.push('## Which shape', '', '| The question | Shape | Hard trigger |', '|---|---|---|');
  for (const [k, c] of Object.entries(CATALOG)) if (c.asks) L.push(`| ${c.asks} | \`${k}\` | ${c.when} |`);
  L.push('', 'Stay prose when the answer is one or two sentences, or an opinion with no structure. One or two numbers are a sentence, not a chart.', '');
  L.push('## Every block', '', 'Fields marked md take `**bold**`, `*italic*`, `[link](url)` and `` `name` ``, nothing else. Every shape takes `"title"`: the sentence that says what it shows. Any shape takes `"caption"` for what it can\'t say itself (a source, a date that matters).', '');
  for (const [g, name] of GROUPS) {
    const ks = Object.keys(CATALOG).filter((k) => CATALOG[k].group === g);
    if (!ks.length) continue;
    L.push(`### ${name}`, '');
    for (const k of ks) {
      const c = CATALOG[k], d = DOCS[k] || {};
      L.push(`#### \`${k}\`` + (c.asks ? `: ${c.asks}` : ''), '');
      if (c.when) L.push(c.when, '');
      if (d.example) L.push('```json', d.example, '```');
      const extra = (d.also || []).length ? [`Also takes: ${d.also.map((f) => '`' + f + '`').join(', ')}.`] : [];
      const req = c.need.length ? [`Needs: ${c.need.map((f) => '`' + f + '`').join(', ')}.`] : [];
      for (const n of req.concat(d.notes || [], extra)) L.push('- ' + n);
      L.push('');
    }
  }
  return L.join('\n');
}
// The skill's copy, if it's there. A stale copy is named on every check so it gets regenerated.
// The kit's own copy of the skill, next to the reader (not ~/.claude, which may hold someone's personal version).
const REF = join(fileURLToPath(new URL('.', import.meta.url)), '../skills/writing-canvas/reference.md');

/* ---------- the command line ---------- */
if (fileURLToPath(import.meta.url) === resolve(process.argv[1] || '')) {
  const args = process.argv.slice(2);
  if (args[0] === '--catalog') {
    console.log('| The question | Shape | Hard trigger |\n|---|---|---|');
    for (const [k, c] of Object.entries(CATALOG)) if (c.asks) console.log(`| ${c.asks} | \`${k}\` | ${c.when} |`);
    process.exit(0);
  }
  if (args[0] === '--arcs') {
    for (const [k, a] of Object.entries(ARCS)) console.log(`- \`${k}\`: ${a.say} Slots: ${a.slots.map((s) => s.join(' / ')).join(' → ')}${a.end ? `. Ends with \`${a.end}\`.` : '.'}`);
    process.exit(0);
  }
  if (args[0] === '--docs') { process.stdout.write(docs()); process.exit(0); }
  if (args[0] === '--css') {
    const f = args[1] || join(fileURLToPath(new URL('.', import.meta.url)), 'canvas.css');
    const res = checkCss(readFileSync(f, 'utf8'));
    for (const r of res) console.log('  ' + r);
    console.log(`${f}: ${res.length ? res.length + ' raw value' + (res.length > 1 ? 's' : '') : 'every size from a token'}`);
    process.exit(res.length ? 1 : 0);
  }
  const noLayout = args.includes('--no-layout'), files = args.filter((a) => !a.startsWith('--'));
  if (!files.length) { console.error('usage: check.mjs <page.html|spec.json> ... [--no-layout] | --catalog | --arcs | --css | --docs'); process.exit(2); }
  try { if (existsSync(REF) && readFileSync(REF, 'utf8') !== docs()) console.log('note: reference.md is out of date; run node canvas/check.mjs --docs > ' + REF); } catch {}
  // The layout check: pages under vault/pages, drawn by the preview server, measured at each width.
  const PAGES = join(VAULT, 'pages') + '/', urlOf = (f) => resolve(f).startsWith(PAGES) && f.endsWith('.html') ? BASE + '/pages/' + resolve(f).slice(PAGES.length) : null;
  let drawn = {};
  const want = noLayout ? [] : files.map(urlOf).filter(Boolean);
  if (want.length) {
    let up = false;
    try { up = (await fetch(BASE + '/canvas.js', { signal: AbortSignal.timeout(1500) })).ok; } catch {}
    if (!up) console.log(`note: layout not checked; start the reader (${BASE}) or pass --no-layout`);
    else try { drawn = await layout(want); } catch (e) { console.log('note: layout not checked: ' + e.message); }
  }
  let bad = 0;
  for (const f of files) {
    let res;
    const html = f.endsWith('.html') ? readFileSync(f, 'utf8') : '';
    try { res = html && !html.includes('id="canvas"') ? checkFree(html) : check(specOf(f), f); } catch (e) { res = [{ level: 'error', at: 'page', msg: e.message }]; }
    for (const p of drawn[urlOf(f)] || []) res.push({ level: 'error', at: `${p.at} @${p.w}`, msg: p.msg });
    const e = res.filter((r) => r.level === 'error').length, w = res.length - e;
    console.log(`${f}: ${e ? e + ' error' + (e > 1 ? 's' : '') : 'no errors'}, ${w} warning${w === 1 ? '' : 's'}`);
    for (const r of res) console.log(`  ${r.level === 'error' ? 'error' : 'warn '}  ${r.at.padEnd(18)} ${r.msg}`);
    if (e) bad++;
  }
  process.exit(bad ? 1 : 0);
}
