/* The writing canvas's shape reference: one entry per block type, with an example spec and the notes a writer needs.
   This file is the source of the skill's reference. `node canvas/check.mjs --docs` turns it (with the catalog and the
   arcs in check.mjs) into reference.md next to the skill, and the checker reads the same examples to flag a field a
   shape doesn't have. Change a shape here and the docs and the checker change together; they can't drift.

   example: the spec, as JSON text. Its top-level keys are the shape's fields; `also` lists optional fields the
   example leaves out. notes: one line each, plain. */

export const COMMON = ['type', 'title', 'caption'];

export const DOCS = {
  text: {
    example: '{ "type": "text", "md": "Paragraph.\\n\\nAnother paragraph." }',
    notes: ['One or two sentences between shapes. A blank line starts a new paragraph.'],
  },
  heading: {
    example: '{ "type": "heading", "text": "A menu hid the work" }',
    notes: ['Becomes an h2 and a rail entry. Says the point, under 40 characters.'],
  },
  list: { example: '{ "type": "list", "items": ["md", "md"] }', notes: ['Three or more short items. Most lists are a shape.'] },
  quote: { example: '{ "type": "quote", "md": "The one line worth remembering.", "cite": "optional" }', notes: ['One per page at most.'] },
  aside: {
    example: '{ "type": "aside", "title": "optional", "md": "A side note." }',
    also: ['tone'],
    notes: [
      'A side note the main text doesn\'t need. On a page that isn\'t a decision, the honest cost and the open question can live here.',
      'With `"tone": "good"` or `"warn"` it\'s a callout: a tinted card and a dot by the title. Good for what worked, warn for what to watch. One or two a page.',
    ],
  },
  figure: {
    example: '{ "type": "figure", "title": "md: what the screen is, in one line", "src": "/media/x.jpg", "srcLight": "/media/x-light.jpg",\n  "w": 1440, "h": 900, "alt": "...", "pins": [ { "x": 32.2, "y": 27.2, "text": "md: this part, and what it\'s for" } ], "caption": "md" }',
    also: ['poster'],
    notes: [
      'Without `pins`: a picture the text needs, on the wide track (960). A tall one stops at 80% of the screen\'s height; a tap opens all of it, large.',
      '`crop`: `{ "x": 0, "y": 0, "w": 50, "h": 40 }` in percent of the picture shows only the part the point is about (needs `w` and `h`). Crop to the panel you\'re talking about, not the whole screen shrunk down. The tap still opens the whole picture. Not with `pins`.',
      'With `pins` it\'s an anatomy: 3 to 5 numbered notes on what the parts are for, listed under the picture. Put a pin beside its target, never on it.',
      '`src` ending .mp4 or .webm plays as a silent loop; `poster` is its still. Less-motion readers get the still and a play button.',
    ],
  },
  beforeAfter: {
    example: '{ "type": "beforeAfter", "title": "md: what changed",\n  "w": 1700, "h": 1600,\n  "before": { "label": "Before", "src": "/media/x-before.jpg", "srcLight": "/media/x-before-light.jpg", "alt": "...",\n              "pins": [ { "x": 78.8, "y": 8.3, "text": "md: what is wrong here, in one line" } ] },\n  "after":  { "label": "After",  "src": "/media/x-after.jpg", "alt": "...",\n              "pins": [ { "x": 3.8, "y": 65.8, "text": "md: what changed and why" } ] },\n  "caption": "md", "start": "before" }',
    notes: [
      '`x`, `y` are percent of the image. 2 to 4 pins per side, each one line a non-designer understands.',
      'If the UI has a light mode, add `srcLight` to each side, same crop, same moment, so pins land on the same spot in both.',
      'A side may be `{ "label": "...", "blocks": [ ... ] }` instead of a picture (a tree each side, paragraphs vs a decision). Then there\'s no Slide mode, and only one side shows at a time: say the change in the title so the skim path still works.',
      'Two options you haven\'t picked between are a `compare`, not a before/after.',
    ],
  },
  variants: {
    example: '{ "type": "variants", "title": "md: what won, and over what",\n  "cols": 2, "w": 980, "h": 76, "fit": "cover",\n  "items": [ { "label": "md", "note": "md: one line on why it lost or won", "src": "/media/x-1.jpg", "srcLight": "...", "alt": "...", "picked": true },\n             { "label": "md", "md": "a text-only variant, when there\'s no picture", "mark": "gone" } ],\n  "pickLabel": "Picked" }',
    notes: [
      '2 to 6 items. `w` and `h` set one crop for all (`"fit": "contain"` shows the whole picture). Pictures sit 1 or 2 across on the wide track (one on a phone), and each opens large on a tap; text cards go up to 4. A very wide picture (a tab strip) wants `cols: 1`. An item can carry its own `crop`.',
      'At most one `picked`. With none it\'s a set of states. `mark: "gone"` fades a rejected one.',
      '`pickLabel` renames the badge when nothing was chosen: "Shipped", "The main one".',
      'An item with no `src` is a small card: `label`, then `md`, then `note`.',
    ],
  },
  compare: {
    example: '{ "type": "compare", "title": "md", "options": ["Option A", "Option B"], "picked": 0,\n  "rows": [ { "label": "md", "values": ["md", "md"] } ], "caption": "md", "pickLabel": "Picked" }',
    notes: ['3 to 6 rows. Values are short phrases, not sentences.', 'Leave `picked` out when nothing is picked yet: a choice still to make starts here.'],
  },
  matrix: {
    example: '{ "type": "matrix", "title": "md", "x": { "label": "Who decides the look", "low": "The model", "high": "A renderer" },\n  "y": { "label": "What it can draw", "low": "A few shapes", "high": "Anything" },\n  "items": [ { "label": "The canvas", "x": 92, "y": 16, "key": true } ], "quadrants": ["optional", "four", "corner", "names"],\n  "caption": "Placed by judgement, not measured." }',
    notes: ['`x` and `y` are 0 to 100, low to high. A judgement says it is one, in the caption.'],
  },
  decision: {
    example: '{ "type": "decision",\n  "chose": "md: the call, in one or two sentences.",\n  "why":  ["md", "md"],\n  "cost": ["md"],\n  "open": "md: what\'s still undecided, and who it\'s waiting on",\n  "sign": ["Decided Oct 5 in design review", "Built Oct 9"],\n  "label": "Decision", "whyLabel": "Why", "costLabel": "What it costs" }',
    notes: [
      'Always include `cost`. A decision with no cost isn\'t honest.',
      'Not made yet: leave out `chose` and put the question in `open`. It heads the card under "Not decided yet", and `why` and `cost` can hold what pulls each way.',
    ],
  },
  tabs: {
    example: '{ "type": "tabs", "title": "md: what the views show", "start": 0,\n  "tabs": [ { "label": "Phone", "blocks": [ ... ] }, { "label": "Desktop", "blocks": [ ... ] } ] }',
    notes: ['2 to 5 panes of blocks. Two views with a slide is a `beforeAfter`.'],
  },
  tree: {
    example: '{ "type": "tree", "title": "md", "root": { "label": "md", "note": "md", "mark": "new|gone|moved", "key": true, "children": [ ... ] }, "caption": "md" }',
    also: ['roots'],
    notes: [
      '`roots: [...]` for several top-level nodes. Labels are names, 1 to 3 words; explanation goes in `note`.',
      '`key` lights the path that matters (a name\'s route, the file in question) with no badge. `mark` is only for change: new, gone, moved.',
      'On its own a tree is a canvas you can pan and zoom, so a big one is fine. A phone shrinks it to fit: keep notes short.',
    ],
  },
  flow: {
    example: '{ "type": "flow", "title": "md: what the flow guarantees",\n  "nodes": [ { "id": "press", "label": "md", "note": "md" },\n             { "id": "stopped", "label": "Stopped", "kind": "end", "key": true },\n             { "id": "fail", "label": "It won\'t stop", "kind": "fail", "row": 2 } ],\n  "edges": [ { "from": "press", "to": "stopping", "key": true, "label": "md, optional" },\n             { "from": "fail", "to": "stopping", "label": "Try again" } ] }',
    notes: [
      'Columns come from the arrows: each node sits one column right of what leads to it. List the main path first; it\'s row one. `row` puts a branch on its own row.',
      'An arrow back to an earlier node or to itself is drawn as a loop in its own lane. Several loops may come back to the same node.',
      'A node nothing points to (a timer, a second way in) sits one column before what it leads to. `key` makes the main path blue (and wins over `kind`). `kind`: `end` (filled), `fail` (dashed).',
      'Up to 8 nodes, labels 1 to 4 words. The column fits about three across; more stack top to bottom with branches side by side, and a phone turns three branches into one list, every arrow that skips a row in a lane on the right.',
      'One party asking several others in turn, answers coming back (a resolver, a checkout), is a `sequence`, not a flow: a flow says each node hands off to the next.',
    ],
  },
  sequence: {
    example: '{ "type": "sequence", "title": "md: what the exchange shows",\n  "parties": [ { "id": "you", "label": "Your browser" }, { "id": "res", "label": "Resolver", "note": "from your wifi", "key": true }, { "id": "root", "label": "Root" } ],\n  "steps": [ { "from": "you", "to": "res", "label": "Where is the vault?" },\n             { "from": "res", "to": "res", "label": "Not in its memory", "note": "md, optional" },\n             { "from": "res", "to": "root", "label": "Where is it?" },\n             { "from": "root", "to": "res", "label": "Ask com", "reply": true, "key": true } ] }',
    notes: [
      'Parties are the columns, left to right in the order they first come in; 2 to 5, one or two words each, the rest in `note`. Steps run top to bottom, each an arrow with its label above.',
      '`reply: true` dashes an answer coming back. A step from a party to itself (a cache, a check) is a small loop with its label beside it. `key` makes one step, or the party doing the asking, blue.',
      'Step labels under 5 words: a label gets only the width between its two parties, and a phone fits five parties across.',
      'Each box hands off and is done: a `flow`. One party keeps asking and gets answers back: a sequence.',
    ],
  },
  steps: {
    example: '{ "type": "steps", "title": "md", "items": [ { "title": "md", "text": "md", "key": true } ], "caption": "md" }',
    notes: ['A process someone goes through, 3 to 6 steps, no branches. `key` marks the step that matters.'],
  },
  cards: {
    example: '{ "type": "cards", "title": "md: what the set has in common", "cols": 2,\n  "items": [ { "title": "md", "text": "md: one line", "kind": "Bakery", "meta": "7am to 3pm", "href": "https://maps.google.com/?q=...", "src": "/media/x.jpg", "key": true } ] }',
    also: ['w', 'h', 'alt', 'srcLight'],
    notes: [
      'Each card is a thing someone opens: a place, a page, a tool. `href` makes the whole card the link; one off the vault gets an arrow.',
      '`kind` is the label for what it is (Bakery, Museum, Page, Tool); `meta` a fact beside it (hours, a date, a price). Places on a trip always carry both, and a map link.',
      'Pictures are optional, all or none. Two across by default, three for text cards when there are more than four, one on a phone. `key` puts one in blue.',
    ],
  },
  carousel: {
    example: '{ "type": "carousel", "title": "md: what the screens show, in order", "w": 780, "h": 1688,\n  "items": [ { "src": "/media/x.jpg", "srcLight": "/media/x-light.jpg", "alt": "...", "label": "md", "note": "md" } ], "caption": "md" }',
    notes: [
      'On the wide track (960). A picture is never under half the track, so phone screens sit two to a view and a wide one fills it; one at a time on a phone, near its real size. A tall screen stops at 80% of the screen\'s height; a tap opens it whole. Swipe, the arrows, or the arrow keys step one at a time; the count says where you are. An item can carry a `crop`.',
      '`w`/`h` on the block set every picture\'s size; an item can carry its own. Same moment, same size: shoot them with shot.mjs at one width.',
      'For screens in order. To set options side by side and pick one, use variants.',
    ],
  },
  gallery: {
    example: '{ "type": "gallery", "title": "md: what the set shows", "cols": 2,\n  "items": [ { "src": "/media/x.jpg", "srcLight": "/media/x-light.jpg", "w": 1440, "h": 900, "alt": "...", "label": "md", "note": "md" } ] }',
    notes: [
      'A wall in columns on the wide track, any mix of shapes; give every picture its true `w` and `h` so nothing jumps as it loads. Two columns (or one), one on a phone, edge to edge.',
      'A picture opens large with its `label` and `note` under it; arrows, arrow keys and Escape. Nothing sits on the picture.',
    ],
  },
  map: {
    example: '{ "type": "map", "title": "md: what the places add up to", "zoom": 12,\n  "places": [ { "title": "md", "kind": "Bakery", "meta": "7am to 3pm", "lat": 37.7955, "lng": -122.3937, "query": "optional search text", "href": "optional link", "note": "md", "key": true } ] }',
    notes: [
      'Real tiles (Esri\'s grey canvas, OpenStreetMap data), dark by night and light by day, no place names (the list names them); the only shape that loads from outside the vault. The map fits every place; `zoom` caps how close it starts.',
      'Pins are numbered in list order; the list under the map gives each place its name, `kind`, `meta` and a link that opens Google Maps (`query`, then `title`, unless `href` is given). Trip places always carry a kind and a fact.',
      'Get lat/lng from a real source, never from memory for anything smaller than a city.',
    ],
  },
  sheet: {
    example: '{ "type": "sheet", "title": "md: what the list is for", "id": "bookings",\n  "columns": [ { "label": "Item", "kind": "text" }, { "label": "Booked", "kind": "check" }, { "label": "Who", "kind": "pick", "options": ["Me", "Dad"] }, { "label": "Cost", "kind": "number", "sum": true, "prefix": "$" } ],\n  "rows": [ ["Flights", true, "Me", 354] ] }',
    also: ['add'],
    notes: [
      'Every cell is editable: `text`, `number`, `check` or `pick` (with `options`). `sum` totals a number column. `"add": false` fixes the rows.',
      'Saves to `pages/_state/<page>.json` under `id` as rows of values, and what\'s saved replaces `rows` next time. Read that file when the owner says he updated it.',
    ],
  },
  ask: {
    example: '{ "type": "ask", "title": "md: what Claude needs to know", "id": "hotel",\n  "questions": [ { "id": "area", "q": "md", "kind": "pick", "options": [ { "label": "md", "note": "md", "rec": true } ] },\n    { "id": "musts", "q": "md", "kind": "many", "options": ["md", "md"] },\n    { "id": "budget", "q": "md", "kind": "scale", "min": 100, "max": 400, "step": 25, "value": 200, "unit": "a night" },\n    { "id": "else", "q": "md", "kind": "text", "placeholder": "md" } ] }',
    notes: [
      'For what only the owner can answer, on the page, when he has time. Answers save as you go to `pages/_state/<page>.json` under the block\'s `id`; read that file when he says he answered.',
      '`pick` is one option, `many` any number, `scale` a number on the vault\'s Bar slider, `text` a line. Options are cards with an optional `note`.',
      'Have a view: `rec` puts Suggested on the option you\'d pick. One to five questions; more is a form nobody fills.',
    ],
  },
  live: {
    example: '{ "type": "live", "title": "md: what trying it shows", "template": "picker", "caption": "md" }',
    also: ['src', 'h', 'alt', 'bare'],
    notes: [
      'The piece is the page\'s own HTML: `<template id="picker">markup and <script></template>` anywhere in the body, named by `template`. Its scripts run in order once the page is drawn; `document.currentScript.closest(\'.cv-live\')` is its own block, so query inside that, never the whole document.',
      'Write plain elements: `button`, `input`, `select`, `label`, `output` already wear the canvas\'s look, `.row` lays controls in a line. A slider is `<label class="slider"><span class="slider-head">Name<output>40</output></span><input type="range"></label>`, update the `output` on `input` yourself. As is it\'s the Bar: a soft blue fill under the name and value, for an amount you set (size, opacity, budget). Add `field` for a panel of settings stacked together: Figma\'s, name, a thin track with a small thumb and the number in a box on one row. Colours, sizes and space come from the vault\'s tokens (`var(--accent)`, `var(--text-3)`, `var(--raised)`, `var(--s3)`, `var(--t-sm)`), never a literal.',
      'A piece too big for a template is a page of its own: `"src": "/pages/<slug>/"`. The frame grows to the page\'s height (or `h` in px) and follows day and night. `alt` names it for a screen reader.',
      'A piece with its own ground (a canvas, a map) takes `"bare": true`: no card, no padding.',
      'What the reader does on it can stay: `await vault.state.get(key)` and `vault.state.set(key, value)` save to the vault, same on every device, and Claude reads them from `pages/_state/`.',
      'Under 390px wide it still works by touch, with no hover-only controls. It never needs a sign-in, a key or a network call outside the vault.',
    ],
  },
  code: {
    example: '{ "type": "code", "title": "md: what the lines show", "lang": "JSON", "mark": [3, 4], "numbers": true,\n  "code": "line one\\nline two" }',
    also: ['diff', 'file'],
    notes: [
      'The one place the canvas uses mono (Geist Mono). Up to 30 lines. `mark` lights the lines that matter, 1-based.',
      'With `"diff": true`, lines start with `+ `, `- ` or two spaces. Copy copies the result, without the removed lines.',
      'Line numbers start at 1; for an excerpt of a real file, `"numbers": false` and say where it\'s from in the title.',
    ],
  },
  table: {
    example: '{ "type": "table", "title": "md: what the rows add up to",\n  "columns": ["Header", "Max age", { "label": "Use it for", "align": "left" }],\n  "rows": [ ["`Cache-Control`", 3600, "Everything"], { "cells": ["...", "...", "..."], "key": true } ], "unit": "" }',
    also: ['prefix', 'decimals'],
    notes: [
      'Rows of records with the same fields, up to 15. Number columns align right on their own. `key` on one row makes it blue.',
      'A rule table ("if this, use that") is a table with the condition first. Options judged on criteria is `compare`.',
      'Keep `code` chips in cells short; a phone wraps long ones.',
    ],
  },
  timeline: {
    example: '{ "type": "timeline", "title": "md", "items": [ { "when": "Oct 5", "title": "md", "text": "md", "key": true } ], "caption": "md" }',
    notes: ['`key` marks the one or two moments that matter. `when` is 6 characters or fewer ("Oct 5", "Mon 12", "Next").'],
  },
  gantt: {
    example: '{ "type": "gantt", "title": "md", "today": "2026-10-12",\n  "items": [ { "group": "optional heading", "label": "Seattle", "start": "2026-10-08", "end": "2026-10-13", "note": "md", "key": true },\n            { "label": "Fly home", "start": "2026-10-13" } ],\n  "legend": { "key": "Now", "bar": "Other dates", "dot": "One day" } }',
    notes: [
      'An item with no `end` is one day (a dot). Dates are YYYY-MM-DD, ends inclusive.',
      'Notes are 2 or 3 words: a phone\'s label column is narrow. A time of day goes in the note ("9:35pm").',
      'Dates stay inside the chart and step around the Today line on their own.',
      '`legend` renames the marks, or `false` drops it.',
    ],
  },
  calendar: {
    example: '{ "type": "calendar", "title": "md", "month": "2026-10", "today": "2026-10-12",\n  "events": [ { "label": "LA with friends", "start": "2026-10-23", "end": "2026-10-26", "key": true } ] }',
    also: ['months'],
    notes: ['`months: ["2026-10", "2026-11"]` for more than one; with neither it shows every month the events touch.', 'A phone cell fits about four letters. Repeating events are listed one by one.'],
  },
  heatmap: {
    example: '{ "type": "heatmap", "title": "md", "days": { "2026-10-10": 25, "2026-10-12": 49 }, "from": "2026-09-01", "to": "2026-10-12",\n  "today": "2026-10-12", "unit": "saves", "steps": [1, 5, 15, 30] }',
    also: ['less', 'more'],
    notes: ['3+ weeks. One square a day, weeks left to right, Monday on top. One week by day is a bar chart with `"order": "given"`.'],
  },
  checklist: {
    example: '{ "type": "checklist", "title": "md: where it stands",\n  "items": [ { "label": "md", "state": "done|doing|open|blocked", "when": "Oct 12", "note": "md" } ] }',
    notes: ['The count ("3 of 7 done") sits by the title on its own; don\'t repeat it in the title.', 'Waiting on someone else is `blocked`, with who in the note. One `doing` at a time reads best.'],
  },
  stats: {
    example: '{ "type": "stats", "items": [ { "value": 13, "label": "about colour", "vs": "almost half", "key": true, "trend": [4, 6, 9, 13] } ], "unit": "" }',
    also: ['prefix', 'decimals'],
    notes: ['2 or 4 numbers (3 leaves one alone on a phone). `trend` draws a sparkline, 5+ points.', 'Numbers are raw; `unit`, `prefix`, `decimals` format them for the block. A value can be a string when it needs its own format ("3.0", "9:35").'],
  },
  chart: {
    example: '{ "type": "chart", "kind": "bar", "title": "md: the finding", "data": [ { "label": "Colour", "value": 13, "key": true } ],\n  "reference": { "label": "Target", "value": 10 }, "order": "given", "unit": "%" }\n{ "type": "chart", "kind": "share", "title": "md", "data": [ { "label": "Tasks page", "value": 18, "key": true } ] }\n{ "type": "chart", "kind": "funnel", "title": "md: where people leave", "data": [ { "label": "Started", "value": 100 }, { "label": "About you", "value": 74, "key": true }, { "label": "In the app", "value": 41 } ] }\n{ "type": "chart", "kind": "ring", "title": "md", "value": 3, "of": 7, "label": "milestones done", "note": "md", "show": "3 of 7" }\n{ "type": "chart", "kind": "line", "title": "md",\n  "series": [ { "name": "notes", "key": true, "points": [ ["2026-09-01", 32], ["2026-10-12", 97] ] } ],\n  "marks": [ { "at": "2026-09-14", "label": "What changed here" } ], "zero": false }',
    also: ['highlight', 'points', 'name', 'prefix', 'decimals'],
    notes: [
      'The title is the finding. One thing is blue (`key`, or name it in `highlight`); the rest stay grey. Bars start at zero and sort longest first unless `"order": "given"`.',
      'Real data only, sourced in a caption or `foot`. An explainer\'s typical curve says "illustrative, not measured" in its caption.',
      'Ring: one value out of `of` (100 if left out); the middle shows the percent unless `show`. One ring per chart. No pie, donut, gauge, radar or dual axes.',
      'Funnel: steps in the order people go through them, never sorted. Each bar is who\'s left; the faint piece after it is what that step lost, with the drop in percent. `key` on the step where people leave makes its loss the blue thing.',
      'Line: x can be dates or text labels (`marks.at` then names a label). Up to 4 series, 2 marks; a `null` is a gap. Only the ends carry numbers: a peak that matters goes in a mark\'s label.',
    ],
  },
  treemap: {
    example: '{ "type": "treemap", "title": "md", "data": [ { "label": "Ideas", "value": 43, "children": [ { "label": "Toys", "value": 17, "key": true } ] },\n  { "label": "Projects", "value": 23 } ] }',
    notes: ['5 to 15 parts sized by area. A part with `children` splits again inside. Mark the one part that matters, not its parent.'],
  },
  collapsible: {
    example: '{ "type": "collapsible", "title": "md: what\'s inside, as a label", "note": "md: one line under it", "open": false,\n  "blocks": [ ... ] }',
    notes: ['Depth a skimmer can skip. Never hide the point in one. Two in a row stack as one group.'],
  },
  sources: {
    example: '{ "type": "sources", "title": "md, optional",\n  "items": [ { "title": "A2UI", "url": "https://...", "site": "optional", "note": "md: what it showed", "checked": "Oct 12" } ] }',
    notes: ['A letter tile stands in for each favicon, so the page loads nothing from anyone else\'s server. It counts as a section\'s shape.'],
  },
};

// The fields a block may carry: its example's top-level keys, the common ones, and `also`.
export function fieldsOf(type) {
  const d = DOCS[type];
  if (!d) return null;
  const keys = new Set(COMMON.concat(d.also || []));
  for (const m of d.example.matchAll(/(?:^|[{,]\s*)"(\w+)":/g)) keys.add(m[1]);
  // Only top-level keys count, so nested ones (a pin's x and y) may slip in as allowed. That only loosens the check.
  return keys;
}
