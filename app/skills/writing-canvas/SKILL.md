---
name: writing-canvas
description: A design system for explaining anything as a page of shapes in the vault (before/after, flow, sequence, variants, anatomy, tree, compare, decision, steps, timeline, stats, charts and funnels, gantt, calendar, 2x2, tabs, table, checklist, heatmap, treemap, collapsible, sources, code, motion, and live pieces you can use: sliders, pickers, toys, whole-page tools that save what the owner picks), built as an arc with titles that say the point, instead of paragraphs. Use when the owner asks to explain a design decision, show what changed, review their own work, write something up for someone who isn't a designer, or "make it a canvas / write it up / blog post"; and whenever an answer to them has a clear shape (a change, a choice, a flow, a structure, numbers, a trend, a plan, dates); and when the owner wants something interactive in the vault (a tool, a tracker, a planner, a toy, "let me try it"). Pages land in the vault's pages/ folder and render at <reader>/pages/<slug>.html (http://localhost:4700 by default).
---

# Writing canvas

A design system for explaining anything as a page. An answer usually has a shape: a before and after, a choice, a flow, a structure, a trend. Draw the shape. Words fill the gaps. It is for other people and for the owner seeing their own work.

**A page is something to use, not only to read.** Most pages are HTML, and more and more each one is an interactive interface: a slider that shows the trade-off, a picker that saves the owner's choice, a toy, a whole tool. Ask of every section: would trying it say the point better than a picture of it? If yes, it's a `live` block (below). Reach for it pretty often: most pages should have at least one piece to try, and a page with none needs a reason. Still only where it's the right thing: a slider for a trade-off, a picker for a choice to make, a toggle between states, a filter over real data, never a control added for decoration. The page still reads in the canvas's arc and look, so a page with three shapes and two live pieces is one fluent thing, not a document with an app pasted in.

The frame is **data**: title, arc, shapes and text are a JSON spec. One renderer in the vault reader (`app/canvas/canvas.js` + `canvas.css`, served at `/canvas.js` and `/canvas.css`) draws every block in the vault's look. Its catalog and rules live in `app/canvas/check.mjs`, and **every page goes through the checker before it's done**. If no block can say what you need, write text. A new block type is welcome when a real page needs one: it means a renderer function, an entry in the catalog in `check.mjs`, an entry in `canvas/shapes.mjs`, and regenerating the reference.

**Read `reference.md` (next to this file) before writing.** It has the arcs, which shape answers which question, and every block's fields with an example. It is generated from the checker (`node canvas/check.mjs --docs > skills/writing-canvas/reference.md`, from `app/`), so it always matches the renderer; the checker names it when it's out of date. A field that isn't in it does nothing, and the checker flags it.

The reference page, read it before writing your first: `pages/writing-canvas.html` in the starter vault, the system written in itself.

## Interactive pages

Three ways to make a page you use, from smallest to biggest. Pick the smallest that holds the idea.

1. **A `live` block in a canvas page.** The usual case. The piece is plain HTML and script in a `<template id="...">` in the same page file, named by the block's `template`. It sits in the column under a title like any shape. `button`, `input`, `select`, `label`, `output` already wear the look, `.row` lines up controls; size, space and colour come from the vault's tokens (`var(--s3)`, `var(--t-sm)`, `var(--text-3)`, `var(--accent)`, `var(--raised)`), never a literal. Query inside `document.currentScript.closest('.cv-live')`, never the whole document.
2. **A `live` block framing a page of its own** (`"src": "/pages/<slug>/"`): when the piece needs its own files or is big enough to stand alone. The frame grows to fit and follows day and night.
3. **A whole page that is a tool** (a planner, a map, a dashboard): a folder `<vault>/pages/<slug>/index.html` with its own `app.js`, `data.json`, pictures, served at `/pages/<slug>/`. It links `/fonts/geist.css`, `/vault.css` and `/vault.js` (the reader's own look and day/night switch, never a copied palette), has a `<title>` and a `<meta name="description">` (search reads it first, since script draws the rest), and uses the same tokens.

Rules for anything interactive:
- **It remembers.** What the owner picks, ticks or tunes is saved with `vault.state` (from `/vault.js`, on every vault page): `await vault.state.get(key)`, `vault.state.set(key, value)`. It lands in `<vault>/pages/_state/<slug>.json`, the same on every device that opens the reader. Read that file when the owner says "I picked" or "see what I chose": it's their answer.
- **Data lives beside the page**, not inside the script: a `data.json` in the folder, or the spec. Real data only, as with charts.
- **It works by touch at 390 wide.** No hover-only controls, nothing that needs a keyboard, nothing that scrolls sideways.
- **No sign-in, no keys, no calls off the vault.** Libraries from a CDN are fine when hand-writing it would be worse (three.js, d3); pin the version.
- **Less motion is honoured.** Anything that moves on its own stops for `prefers-reduced-motion`.
- **The skim path still works.** A live block's title says what trying it shows ("Past 16px the cards stop reading as one group"), so a reader who never touches it still gets the point.

## The three levels

A page is built at three levels. Get them in this order.

1. **The arc.** What kind of page is it? Pick one and put it in the spec as `"arc"`. The arc fixes the order of the sections.
2. **The shapes.** For each section, the question it answers picks the shape (the table below).
3. **The titles.** Every shape carries a `title` that says what it shows, as a sentence with a finding in it. Read only the page's title, dek, shape titles and the decision, and you have the whole story. That's the skim path, and it has to work alone.

### Arcs

The arcs and their slots are in `reference.md`. Slots are the minimum, in order; extra shapes may sit between them. In short: `decision` (a choice, made or still to make), `shipped` (something changed), `explainer` (how something works, including a page to come back to), `plan` (what happens next), `review` (a look back at my own work). `reference` is only for the system's own catalog pages.

Something that fits none: use `explainer` and say so in your reply. If the same mismatch comes up twice, propose a new arc.

### Titles

- A title is a sentence with the finding: "Every press of Stop now ends in a state you can see", never "Stop states".
- Headings say the point too, short: "A menu hid the work", not "The problem". Under 40 characters.
- The checker flags a shape with no title, and a title under four words.
- `decision`, `stats` and plain figures don't need one: the decision line and the numbers are the point.

### Rhythm

- Each section is one heading, one or two sentences, one shape. A section with no shape is a warning.
- No more than about 90 words of text between two shapes, and under 70 words of text per shape across the page.
- One quote at most. One bold line at most.

## When to pick which shape

The table of questions and shapes is in `reference.md`. Stay prose when the answer is one or two sentences, or an opinion with no structure. One or two numbers are a sentence, not a chart.

Shapes compose: a `beforeAfter` side can hold blocks instead of an image, tabs hold blocks, a collapsible holds blocks. Any picture can be a clip.

## The page file

Create `<vault>/pages/<slug>.html`. Copy this exactly and only change the title and the JSON:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#0f0f0f">
<title>PAGE TITLE</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/fonts/geist.css">
<link rel="stylesheet" href="/vault.css">
<link rel="stylesheet" href="/canvas.css">
<script src="/vault.js"></script>
</head>
<body>
<script type="application/json" id="canvas">
{ ...spec... }
</script>
<script src="/canvas.js"></script>
</body>
</html>
```

## The spec

```json
{
  "title": "Why the Tasks button is gone",
  "arc": "decision",
  "kicker": ["Decision", "Lapis app"],
  "dek": "One or two sentences that tell the whole story.",
  "meta": ["Oct 12, 2026"],
  "back": { "href": "/n/<note-name>", "label": "Note title" },
  "blocks": [ ... ],
  "foot": "Optional closing line, small."
}
```

The head is the title, then one grey line: the date from `meta`, then the `kicker` (the kind of page, the project). Nothing else shows: no author, no read time. `back` links the note the page belongs to; a one-off page leaves it out and goes back to the vault.

Text fields marked *md* take a small slice of markdown: `**bold**`, `*italic*`, `[link](url)`, `` `name` ``. Nothing else. No HTML.

### Blocks

Every block, its fields and an example are in `reference.md`. The chart rules, which hold for every chart:
- **The title is the finding**, a sentence: "The vault tripled in six weeks", never "Notes over time".
- **One thing is blue**: mark it `key`. Everything else stays grey. If nothing is the point, don't chart it.
- **No gridlines, no axes to read, no legends but the gantt's.** Labels sit on the marks.
- **Real data only.** Say where it came from in `foot` or a caption. A judgement (the matrix) or a typical curve says so.
- No pie, donut, gauge, radar or dual axes. The ring is the one round chart, for a single value.

Two widths: text reads at 640; pictures and diagrams take the wide track, 960, on their own. Never set a width on a shape. Screens must be readable on the page: crop a picture to the part the point is about (`crop`), never more than two pictures across, and every picture opens large on a tap. On a phone pictures run edge to edge. Flows wider than about three columns stack top to bottom, and on a phone three branches become one list with lanes on the right; that's expected. A shape's title always sits above its card, charts included.

## Screenshots and clips

`node canvas/shot.mjs <url> <out.jpg> --w 1440 --h 900 --scale 2 --theme dark|light [--el <selector>] [--nth 0] [--full]` (from `app/`) takes them from headless Chrome and prints the true pixel size for `w` and `h`. `--el` crops to one element: a menu, a card, a tab strip.

1. Same window size, same moment, same data, both versions running side by side. Capture at 2x; the built-in browser pane can't screenshot while hidden.
2. Crop both identically to what matters, keep the full height when the story is "top of the screen vs bottom".
3. Save as JPEG (quality ~84) to `projects/_media/<slug>-before.jpg`, served at `/media/<file>`. The light pair goes next to it as `<slug>-before-light.jpg` (capture with `colorScheme: 'light'`).
4. Put the true pixel size in `w` and `h`.

## Writing

The voice. The reader is someone who isn't a designer.

- Short sentences. Plain words. Say the thing, don't announce it.
- No em dashes, no ampersands, never all caps. One bold line at most per page.
- Lead with what someone sees, then why it matters. Never with how it was built.
- Name real things: the button, the bar, the reply box. Not "the component" or "the surface".
- A decision always says what it cost and what's still open (`cost`, `open`). Other pages say so when there is something: an `aside` or a `checklist` at the end. Don't invent one.
- Captions are rare. Use one only for something the shape can't say and the text doesn't (a source, a date that matters). Never repeat the text, and never explain how to use the page ("tap to flip"): the interface says that.
- Title says the change in plain words. Dek tells the whole story in two sentences, so a reader who stops there still knows.

## The look

All styling lives in `app/canvas/canvas.css`, built on the vault's own tokens in `app/style.js`, one design system for notes and canvas pages. Use the shared names: `--t-*`/`--lh-*` sizes, `--w-*` weights, `--s0`–`--s9` space, `--r-*` radii, `--text`/`--text-body`/`--text-2`/`--text-3`, `--surface`/`--raised`/`--fill`/`--wire`/`--fill-2`, `--accent`/`--accent-soft`/`--accent-ink`/`--on-accent`. Never bring back `--cv-` copies of them; canvas.css's own `--cv-` tokens are only padding, part sizes and the switch. A quiet type scale: page title 20/500, section headings 16/500, shape titles 14/500 in full ink, body 14/420 a step greyer (`--text-body`), labels, meta, captions and the rail 13 grey, 11 for badges, 16 for the decision line and the quote, 24 for big numbers. Each level differs from the next by size or colour, never weight alone; a 640px column, and colours that are solid mixes of the vault's tokens. If a page looks wrong, fix the token or the rule there, never one page. Every size comes from a token: type sizes each with their own px line height, three weights (420 / 500 / 600), 4px space steps with a 2px half step, padding the same on every side (`--cv-pad-card` 20, `--cv-pad-box` 12, `--cv-pad-cell` 8, highlights `--cv-pad-inset` 4 in, 2px between highlighted rows), and part sizes (`--cv-ctl`, `--cv-num`, `--cv-icon`, `--cv-dot*`, `--cv-bar`). Run `node canvas/check.mjs --css` after any CSS change: it fails on a raw px value outside the tokens and on two tokens sharing a name. Nested corners are concentric: anything rounded inside a padded card takes the card's radius minus the gap, never under 4px (`--cv-r-in-card` inside a card's padding, `--cv-r-in-inset` for a highlight 4px in). Flow connectors are straight runs with 10px rounded elbows and an open chevron; loops get their own lane, never a long curve. The section rail sits just left of the text like a note's rail in the reader: "On this page", the sections on a thin track with the current one marked in ink, and the way back above it once the page's own back link scrolls away. Every text colour passes WCAG AA in day and night; re-run a contrast check after any colour change. Never pure black for a surface. Night: cards sit a step above the page. Day: the page is white and cards are a faint grey (#f7f7f7), because a grey page dulled the blue; the whole vault uses the same day colours. Check day mode as carefully as night. No container outlines in either theme: a card reads by its fill alone. Rings only mean something: the picked ring, a moved or gone node.

## Filing

- Every page is reachable. A page has no shelf of its own: link it from the note it belongs to and it lives on that note's shelf. Search finds every page anyway, and one no note links waits in the Inbox.
- A one-off answer (no project behind it) is just the page in `<vault>/pages/`. No note, no `back`.
- A decision page also gets a decision note so it shows on the Thinking shelf: `type: decision`, `page: /pages/<slug>.html`, a one-line description, today's date. Personal ones go in `thinking/`. Client work goes in `work/` with `work: true`, and client specifics never go in a note outside `work/`.
- A page that belongs to a project is linked from its project note.

## Before you call it done

For a live piece, also: use it. Click, drag and type through it at both widths, reload, and check what it saved came back. A whole-page tool goes through the same checker: it holds a page that isn't a canvas to the page-wide rules (links the vault's files, a title and description, no colour literals, no sideways scroll at 390 and 1440).

1. Start the reader (`cd app && VAULT_PATH=<vault> npm run dev`; localhost:4700 serves `/pages/`, `/media/` and the live renderer, no sign-in).
2. `VAULT_PATH=<vault> node canvas/check.mjs <vault>/pages/<slug>.html` (from `app/`). It checks the spec, then draws the page at 390 and 1440 wide and fails it on text past its card or cut off, two labels on top of each other, a chip or word broken across lines, or a page that scrolls sideways. No errors. Every warning either fixed, or named in your reply with why it stays. If it says layout wasn't checked, the server isn't up: start it, don't skip it.
3. `shot.mjs` the page `--full` at 1440 and 390 wide, dark and light. Look at every screen. Flows stack on a phone; check the loops.
4. Flip every before and after. Check pins sit beside their target, not on it.
5. The checker measures, it doesn't judge. Whether a flow reads, a lane is clear or the blue lands on the point: only the screenshots show that.
6. Read only the titles. Is that the story? Then read it as someone who's never opened Figma: could they explain it to someone else after one read? If not, cut words until they could.

## Outside the vault

The same spec also comes out as text: `node canvas/text.mjs <page> [--slack] [--link <page url>]` prints Markdown for a chat reply, or Slack's format with `--slack`. Every shape keeps its title and the least text that says what it shows. When the owner wants an answer in chat or Slack and it has a shape, write the page, then send its text with the link.
