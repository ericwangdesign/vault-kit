// The vault's design system. One set of tokens, two stylesheets built from it:
//
// - CSS is what every page the reader builds carries: the tokens, the frame (sidebar on a
//   computer, top bar on a phone), and the furniture every page shares — page heads, blocks,
//   cards, rows, pills, buttons, the composer.
// - PAGE_CSS is what /vault.css serves to the standalone pieces in /pages/. Same tokens, plus
//   the older furniture those pages were written against (.frame, .up, .sw, .note-head, .entry,
//   .rail). It leaves out the new component classes on purpose: names like .card, .tag or .btn
//   would land on top of a hand-built page's own.
//
// Started from the "Today" prototype (pages/dashboard.html, Oct 2026): Linear's sidebar and
// density, Shopify's cards, ChatGPT's composer, OpenAI's plain type. Calm, not pushy: it shows
// what's open and never nags. The accent is blue. Pink was retired in Sep 2026 and must never
// come back.

export const TOKENS = `
:root {
  --panel: #080808;          /* behind everything: the sidebar's ground */
  --bg: #0f0f0f;             /* the page */
  --surface: #161616;        /* cards */
  --surface-2: #1c1c1c;      /* raised: composer, menus, dialogs */
  --hover: rgba(255,255,255,.045);
  --hover-2: rgba(255,255,255,.075);
  --line: rgba(255,255,255,.08);
  --line-2: rgba(255,255,255,.15);
  --text: #f2f2f2;
  --text-2: #a3a3a3;
  --text-3: #6f6f6f;
  --accent: #4da6ff;
  --accent-wash: rgba(77,166,255,.14);
  --ok: #5cc98b;
  --btn: #f2f2f2;
  --btn-text: #0f0f0f;
  --scrim: rgba(0,0,0,.55);
  --shadow: none;
  --shadow-lg: 0 0 0 1px rgba(255,255,255,.02), 0 12px 32px rgba(0,0,0,.35);
  --shadow-pop: 0 0 0 1px rgba(255,255,255,.03), 0 24px 64px rgba(0,0,0,.55);

  --r-sm: 6px; --r: 8px; --r-card: 14px; --r-pill: 999px;

  --font: "Geist", ui-sans-serif, -apple-system, "Segoe UI", sans-serif;
  --font-body: var(--font);
  --mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace;
  /* Reading size, line and column. The typography panel (settings.js) moves these. */
  --size: 15px;
  --leading: 1.7;
  --measure: 680px;
  --weight: 400;

  /* The older names, kept so props.js, intake.js and the standalone pages in /pages/ read the
     same palette without being rewritten. New work uses the names above. */
  --ink: var(--text); --ink-2: #e2e2e2; --soft: #c4c4c4; --muted: var(--text-2); --faint: var(--text-3);
  --hair: var(--line); --hair-2: var(--line-2);
  --card: var(--surface); --card-hover: var(--surface-2); --code-bg: var(--surface-2);
  --underline: rgba(255,255,255,.28); --underline-hover: var(--text);
  --edge: var(--line); --edge-2: var(--line); --edge-3: var(--line-2); --edge-4: rgba(255,255,255,.28);
  --wash: var(--hover); --shade: rgba(0,0,0,.5); --shade-2: rgba(0,0,0,.6);
  --fade-0: rgba(15,15,15,0); --fade-1: rgba(15,15,15,.94);
  --scheme: dark;
}
:root[data-mode="light"] {
  --panel: #ebebeb;
  --bg: #f5f5f5;
  --surface: #ffffff;
  --surface-2: #ffffff;
  --hover: rgba(0,0,0,.04);
  --hover-2: rgba(0,0,0,.07);
  --line: rgba(0,0,0,.08);
  --line-2: rgba(0,0,0,.16);
  --text: #0f0f0f;
  --text-2: #5c5c5c;
  --text-3: #8c8c8c;
  --accent: #0069d1;
  --accent-wash: rgba(0,105,209,.10);
  --ok: #15803d;
  --btn: #0f0f0f;
  --btn-text: #ffffff;
  --scrim: rgba(0,0,0,.18);
  --shadow: 0 1px 3px rgba(0,0,0,.06);
  --shadow-lg: 0 1px 3px rgba(0,0,0,.05), 0 8px 24px rgba(0,0,0,.07);
  --shadow-pop: 0 1px 2px rgba(0,0,0,.05), 0 24px 64px rgba(0,0,0,.14);

  --ink-2: #1f1f1f; --soft: #333333;
  --underline: rgba(0,0,0,.25);
  --edge-4: rgba(0,0,0,.28);
  --shade: rgba(0,0,0,.12); --shade-2: rgba(0,0,0,.18);
  --fade-0: rgba(245,245,245,0); --fade-1: rgba(245,245,245,.94);
  --scheme: light;
}
/* The crossfade only runs while the switch is being pressed, never on load. */
html.theming, html.theming * { transition: background-color .45s cubic-bezier(.4,0,.2,1), color .45s cubic-bezier(.4,0,.2,1), border-color .45s cubic-bezier(.4,0,.2,1) !important; }

* { box-sizing: border-box; }
html { background: var(--bg); color: var(--text); color-scheme: var(--scheme); scroll-padding-top: 72px; -webkit-text-size-adjust: 100%; }
body {
  margin: 0; font: 400 14px/1.45 var(--font); letter-spacing: -0.006em;
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
  font-feature-settings: "ss01" 1, "cv11" 1;
  -webkit-tap-highlight-color: transparent;
}
a { color: inherit; text-decoration: none; }
p { margin: 0; }
h1, h2, h3, h4 { margin: 0; font-size: inherit; font-weight: inherit; line-height: inherit; }
button { font: inherit; letter-spacing: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
::selection { background: var(--accent-wash); }
:focus-visible { outline: 2px solid color-mix(in srgb, var(--accent) 60%, transparent); outline-offset: 2px; border-radius: 4px; }
/* Text fields show focus with their caret and their own border, not a ring. */
textarea:focus-visible, input:focus-visible { outline: none; }
.mono { font-family: var(--mono); font-size: 13px; }
`;

/* Long-form text. Shared by note pages and the standalone pieces. */
const PROSE = `
.prose { font-family: var(--font-body); font-size: var(--size); line-height: var(--leading); color: var(--ink-2); letter-spacing: -0.008em; display: flex; flex-direction: column; gap: 14px; max-width: var(--measure); }
.prose h1, .prose h2, .prose h3, .prose h4 { margin-top: 1.4em; color: var(--text); font-weight: 500; letter-spacing: -0.016em; text-wrap: balance; line-height: 1.35; }
.prose h1 { font-size: 1.35em; }
.prose h2 { font-size: 1.2em; }
.prose h3 { font-size: 1.05em; }
.prose h4 { font-size: 1em; color: var(--text-2); }
.prose h1 + *, .prose h2 + *, .prose h3 + *, .prose h4 + * { margin-top: -4px; }
.prose > :first-child { margin-top: 0; }
.prose ul, .prose ol { margin: 0; padding-left: 1.3rem; display: flex; flex-direction: column; gap: 5px; }
.prose li::marker { color: var(--text-3); }
.prose strong { font-weight: 500; color: var(--text); }
.prose em { font-style: italic; }
.prose a { color: inherit; text-decoration: underline; text-decoration-color: var(--line-2); text-decoration-thickness: 1px; text-underline-offset: 3px; transition: text-decoration-color .15s, color .15s; }
.prose a:hover { text-decoration-color: currentColor; color: var(--text); }
.prose a.dangling { color: var(--text-3); text-decoration-style: dashed; cursor: help; }
.prose code { font-family: var(--mono); font-size: .86em; color: var(--text); background: var(--hover-2); padding: .12em .36em; border-radius: 5px; }
.prose pre { margin: 4px 0; padding: 14px 16px; background: var(--surface); border-radius: 10px; overflow-x: auto; }
.prose pre code { padding: 0; background: none; font-size: 13px; line-height: 20px; }
.prose blockquote { margin: 0; padding: 2px 0 2px 16px; border-left: 2px solid var(--line-2); color: var(--text-2); display: flex; flex-direction: column; gap: 8px; }
.prose hr { border: 0; border-top: 1px solid var(--line); margin: 14px 0; width: 100%; }
.prose table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; font-size: .93em; }
.prose th, .prose td { text-align: left; vertical-align: top; padding: 8px 14px 8px 0; border-bottom: 1px solid var(--line); }
.prose th { font-weight: 500; color: var(--text-2); }
.prose img { max-width: 100%; height: auto; border-radius: 10px; }
`;

/* ---------- the reader's own pages ---------- */

export const CSS = TOKENS + PROSE + `
html { background: var(--panel); }
svg.i { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; flex: none; }
img.mark { display: block; flex: none; width: 20px; height: 20px; border-radius: 5px; background: var(--hover-2); object-fit: cover; }
kbd { font: inherit; font-size: 11.5px; color: var(--text-3); }

/* ---------- frame ----------
   A phone or a narrow window: one column under a top bar. A computer: the sidebar on the
   panel ground, the page on a sheet beside it (Linear). The page itself scrolls, never the sheet. */
.app { min-height: 100dvh; background: var(--bg); }
.side { display: none; }
.sheet { min-width: 0; background: var(--bg); }
.main { width: 100%; max-width: 760px; margin: 0 auto; padding: 40px 24px 112px; min-width: 0; }
.main.wide { max-width: 1240px; }
@media (min-width: 1024px) {
  .app { display: grid; grid-template-columns: 240px minmax(0, 1fr); background: var(--panel); }
  .side { display: flex; flex-direction: column; position: sticky; top: 0; height: 100dvh; padding: 10px 10px 12px; }
  .sheet { margin: 8px 8px 8px 0; min-height: calc(100dvh - 16px); border-radius: 12px; box-shadow: var(--shadow); }
  .main { padding: 56px 40px 120px; }
  .top { display: none !important; }
}

/* ---------- sidebar (Linear, ChatGPT) ---------- */
.brand { display: flex; align-items: center; gap: 9px; height: 36px; padding: 0 4px 0 10px; font-weight: 500; }
.brand img { width: 20px; height: 20px; border-radius: 5px; }
.brand .icon-btn:first-of-type { margin-left: auto; }
.icon-btn { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 7px; color: var(--text-2); flex: none; }
.icon-btn:hover { background: var(--hover); color: var(--text); }
.new {
  display: flex; align-items: center; gap: 8px; width: 100%; height: 32px; margin: 8px 0 14px; padding: 0 10px;
  background: var(--hover-2); border-radius: 8px;
  font-size: 13px; color: var(--text); text-align: left;
}
.new kbd { margin-left: auto; }
.new:hover { background: color-mix(in srgb, var(--text) 11%, transparent); }
.nav { display: flex; flex-direction: column; gap: 1px; }
.nav a { display: flex; align-items: center; gap: 10px; height: 30px; padding: 0 8px; border-radius: 6px; color: var(--text-2); font-size: 13.5px; }
.nav a:hover { background: var(--hover); color: var(--text); }
.nav a.on { background: var(--hover-2); color: var(--text); }
.nav .n { margin-left: auto; font-size: 12px; color: var(--text-3); font-variant-numeric: tabular-nums; }
.nav-label { margin: 18px 8px 6px; font-size: 12px; color: var(--text-3); }
.side-foot { margin-top: auto; display: flex; align-items: center; gap: 2px; padding: 4px 0 0 8px; }
.side-foot .clock { flex: 1; min-width: 0; font-size: 12px; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
.i-sun, .i-moon { transition: opacity .3s, transform .45s cubic-bezier(.2,.8,.2,1); }
html[data-mode="light"] .i-moon, html:not([data-mode="light"]) .i-sun { display: none; }

/* ---------- top bar (phone, tablet) ---------- */
.top {
  position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 4px;
  height: calc(52px + env(safe-area-inset-top)); padding: env(safe-area-inset-top) 8px 0 8px;
  background: color-mix(in srgb, var(--bg) 84%, transparent);
  backdrop-filter: saturate(1.4) blur(14px); -webkit-backdrop-filter: saturate(1.4) blur(14px);
  border-bottom: 1px solid transparent; transition: border-color .2s;
}
.top.scrolled { border-bottom-color: var(--line); }
.top .here { display: flex; align-items: center; gap: 9px; min-width: 0; margin: 0 auto 0 6px; font-weight: 500; }
.top .here img { width: 22px; height: 22px; border-radius: 6px; }
.top .here span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.top .icon-btn { width: 36px; height: 36px; border-radius: 10px; }
/* The sidebar comes in from the left as a drawer (ChatGPT on a phone). */
.nav-scrim { position: fixed; inset: 0; z-index: 49; background: var(--scrim); opacity: 0; pointer-events: none; transition: opacity .2s; }
@media (max-width: 1023px) {
  .side {
    display: flex; flex-direction: column; position: fixed; z-index: 50; top: 0; bottom: 0; left: 0; width: min(300px, 84vw);
    padding: calc(10px + env(safe-area-inset-top)) 12px calc(12px + env(safe-area-inset-bottom));
    background: var(--panel); box-shadow: var(--shadow-pop);
    transform: translateX(-104%); transition: transform .28s cubic-bezier(.2,.8,.2,1); visibility: hidden;
  }
  html.nav-open .side { transform: none; visibility: visible; }
  html.nav-open .nav-scrim { opacity: 1; pointer-events: auto; }
  html.nav-open { overflow: hidden; }
  .nav a { height: 40px; font-size: 15px; }
  .side .brand .icon-btn { display: none; }
}
@media (max-width: 759px) {
  .main { padding: 16px 16px calc(112px + env(safe-area-inset-bottom)); }
}

/* ---------- page head (OpenAI's plain type) ---------- */
.page-head { margin-bottom: 8px; }
.crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 14px; font-size: 13px; color: var(--text-3); }
.crumbs a:hover { color: var(--text); }
.crumbs .sep { opacity: .6; }
.page-head h1 { font-size: 30px; line-height: 36px; font-weight: 500; letter-spacing: -0.026em; text-wrap: balance; }
.page-head .sub { margin-top: 6px; color: var(--text-3); font-size: 13.5px; }
.page-head .lede { margin-top: 10px; max-width: 36em; font-size: 16px; line-height: 25px; color: var(--text-2); letter-spacing: -0.011em; }
.page-head .lede b { font-weight: 500; color: var(--text); }
@media (max-width: 759px) { .page-head h1 { font-size: 26px; line-height: 32px; } }

/* ---------- blocks, cards, rows ---------- */
.block { margin-top: 40px; }
.block:first-child { margin-top: 0; }
.block-head { display: flex; align-items: baseline; gap: 8px; margin: 0 2px 10px; min-height: 20px; }
.block-head h2 { font-size: 13px; font-weight: 500; color: var(--text); letter-spacing: -0.003em; }
.block-head h2 a:hover { text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
.block-head .n { font-size: 12.5px; color: var(--text-3); font-variant-numeric: tabular-nums; }
.block-head .end { margin-left: auto; font-size: 12.5px; color: var(--text-3); }
.block-head a.end:hover { color: var(--text); }
.card { background: var(--surface); border-radius: var(--r-card); box-shadow: var(--shadow); overflow: hidden; }

/* Scratch: a page of bullets for loose thoughts (Thinking › Loose thoughts). The thought is the text. */
.scratch { padding: 18px 28px 20px; }
.scratch ul { list-style: none; margin: 0; padding: 0; }
.scratch li { position: relative; padding-left: 20px; }
.scratch li + li { margin-top: 4px; }
.scratch li::before { content: ''; position: absolute; left: 2px; top: 17px; width: 5px; height: 5px; border-radius: 50%; background: var(--text-3); }
.scratch a { display: block; padding: 7px 0; font-size: 15px; line-height: 24px; color: var(--text-2); }
.scratch a b { font-weight: 500; color: var(--text); margin-right: 4px; }
.scratch a:hover b { text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
@media (max-width: 759px) { .scratch { padding: 12px 18px 14px; } }

/* A row is the vault's one list item: a mark, a title with a line under it, a quiet fact on the right. */
.rows { list-style: none; margin: 0; padding: 0; }
.row { position: relative; display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; align-items: center; gap: 16px; padding: 14px 16px; min-height: 64px; border-top: 1px solid var(--line); }
.rows > li:first-child > .row, .card > .row:first-child { border-top: 0; }
.row.no-mark { grid-template-columns: minmax(0, 1fr) auto; }
.row img.mark { margin-top: 0; }
a.row:hover, .row.link:hover { background: var(--hover); }
.row .t { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.row .t b { font-weight: 500; color: var(--text); line-height: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* One line each, so every row is the same height and the titles carry the list. */
.row .t span { color: var(--text-3); font-size: 13px; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 759px) { .row .t span { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; } .row { align-items: start; } .row .m { align-self: start; } }
.row .m { display: flex; align-items: center; gap: 10px; font-size: 12.5px; line-height: 20px; align-self: center; color: var(--text-3); white-space: nowrap; font-variant-numeric: tabular-nums; }
.row .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
.row .dot[hidden] { display: none; }
/* On a phone the right side keeps only the date; the rest is in the note. */
@media (max-width: 759px) { .row .m .opt, .block-head span.end { display: none; } }
.row.dim .t b { color: var(--text-2); font-weight: 450; }
/* Archive appears on approach and takes the meta's place, so a list at rest keeps its geometry. */
.rows > li { position: relative; }
.arch { position: absolute; right: 10px; top: 9px; z-index: 1; height: 24px; padding: 0 9px; border-radius: var(--r-pill); font-size: 12px; color: var(--text-2); background: var(--hover-2); opacity: 0; transition: opacity .14s; }
.rows > li:hover .arch, .arch:focus-visible { opacity: 1; }
.rows > li:hover:has(.arch) .row .m { visibility: hidden; }
.arch:hover { color: var(--text); }
@media (hover: none) { .arch { display: none; } }
.more { display: flex; align-items: center; gap: 6px; width: 100%; padding: 11px 16px; border-top: 1px solid var(--line); font-size: 13px; color: var(--text-3); text-align: left; }
.more:hover { color: var(--text); background: var(--hover); }

/* A block that folds: its head is the summary. */
details.block > summary { list-style: none; cursor: pointer; }
details.block > summary::-webkit-details-marker { display: none; }
details.block > summary h2::after { content: ""; display: inline-block; width: 6px; height: 6px; margin: 0 0 2px 8px; border-right: 1.5px solid var(--text-3); border-bottom: 1.5px solid var(--text-3); transform: rotate(-45deg); transition: transform .2s; }
details.block[open] > summary h2::after { transform: rotate(45deg); margin-bottom: 4px; }
details.block > summary:hover h2::after { border-color: var(--text); }

.empty { padding: 20px 16px; color: var(--text-3); display: flex; flex-direction: column; gap: 2px; }
.empty b { font-weight: 500; color: var(--text-2); }

/* ---------- pills, tags, buttons ---------- */
.pill, .tag { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 9px; border-radius: var(--r-pill); font-size: 12px; white-space: nowrap; background: var(--hover-2); color: var(--text-2); }
.pill.accent { color: var(--accent); background: var(--accent-wash); }
.btn { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 13px; border: 0; background: var(--hover-2); border-radius: var(--r-pill); font-size: 13px; color: var(--text); white-space: nowrap; transition: background .12s, border-color .12s, opacity .12s; }
.btn:hover { background: color-mix(in srgb, var(--text) 13%, transparent); }
.btn.primary { background: var(--btn); color: var(--btn-text); }
.btn.primary:hover { opacity: .88; }
.btn.ghost { background: transparent; color: var(--text-2); }
.btn.ghost:hover { color: var(--text); background: var(--hover); }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
/* Filters: one row of quiet pills (Linear's view tabs). */
.seg { display: flex; flex-wrap: wrap; gap: 6px; }
.seg button, .seg a { height: 28px; padding: 0 11px; border-radius: var(--r-pill); font-size: 13px; color: var(--text-2); border: 0; background: transparent; display: inline-flex; align-items: center; gap: 6px; }
.seg button:hover, .seg a:hover { color: var(--text); background: var(--hover); }
.seg button.on, .seg a.on { color: var(--text); background: var(--hover-2); }
.seg button[hidden], .seg[hidden] { display: none; }

/* ---------- Today: hello and composer (OpenAI's type, ChatGPT's box) ---------- */
.date { font-size: 13px; color: var(--text-3); }
.hello h1 { margin-top: 6px; font-size: 34px; line-height: 40px; font-weight: 500; letter-spacing: -0.028em; }
.brief { margin-top: 10px; max-width: 34em; font-size: 17px; line-height: 26px; color: var(--text-2); letter-spacing: -0.012em; }
.brief b { font-weight: 500; color: var(--text); }
@media (max-width: 759px) {
  .hello { padding-top: 8px; }
  .hello h1 { font-size: 28px; line-height: 34px; }
  .brief { font-size: 16px; line-height: 24px; }
}
.composer-wrap { margin-top: 28px; display: flex; flex-direction: column; }
.composer-wrap .composer { order: 1; }
.composer-wrap .chips { order: 2; }
.composer-wrap .toast { order: 3; }
.composer {
  background: var(--surface-2); border-radius: 26px; box-shadow: var(--shadow-lg);
  padding: 14px 10px 10px 20px;
}
.composer textarea {
  display: block; width: 100%; min-height: 26px; max-height: 40vh; resize: none; border: 0; padding: 0 10px 0 0; background: none; outline: 0;
  color: var(--text); font: inherit; font-size: 16px; line-height: 26px; letter-spacing: -0.01em;
}
.composer textarea::placeholder { color: var(--text-3); }
.composer-row { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.composer-row .hint { font-size: 12.5px; color: var(--text-3); }
.tool { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; color: var(--text-2); }
.tool:hover { background: var(--hover); color: var(--text); }
.tool.listening { color: var(--accent); background: var(--accent-wash); }
.composer-row .tool { margin-left: auto; }
.composer-row .tool[hidden] + .send, .composer-row .hint + .send { margin-left: auto; }
.composer-row .tool:not([hidden]) + .send { margin-left: 0; }
.send { width: 34px; height: 34px; flex: none; display: grid; place-items: center; border-radius: 50%; background: var(--btn); color: var(--btn-text); opacity: .22; transition: opacity .15s; }
.send svg.i { stroke-width: 2.2; }
.has-text .send { opacity: 1; }
.chips { display: flex; gap: 8px; margin-top: 12px; overflow-x: auto; scrollbar-width: none; }
.chips::-webkit-scrollbar { display: none; }
.chip { flex: none; display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px 0 7px; border-radius: var(--r-pill); color: var(--text-2); font-size: 13px; background: var(--hover-2); }
.chip:hover { color: var(--text); background: color-mix(in srgb, var(--text) 12%, transparent); }
.chip img.mark { width: 18px; height: 18px; border-radius: 5px; }
.chip.plain { padding-left: 12px; }
.toast { min-height: 20px; margin: 10px 4px 0; font-size: 13px; color: var(--text-3); }
/* Phone: the composer sits at the bottom, under the thumb. */
@media (max-width: 759px) {
  .composer-wrap {
    position: fixed; z-index: 20; left: 0; right: 0; bottom: 0; margin: 0;
    padding: 18px 12px calc(10px + env(safe-area-inset-bottom));
    background: linear-gradient(to bottom, transparent, var(--bg) 22px);
  }
  .composer-wrap .chips { order: 0; }
  .composer { display: flex; align-items: flex-end; gap: 4px; border-radius: 24px; padding: 7px 7px 7px 16px; }
  .composer textarea { flex: 1; min-width: 0; padding: 4px 0; }
  .composer-row { margin-top: 0; }
  .composer-row .hint { display: none; }
  .chips { display: none; margin: 0 0 10px; }
  .composer-wrap:focus-within .chips { display: flex; }
  .toast { position: absolute; left: 28px; right: 28px; top: -8px; margin: 0; text-align: center; }
}

/* ---------- Today: the blocks ---------- */
.idea { display: grid; grid-template-columns: minmax(0, 1fr); gap: 18px; padding: 24px 24px 22px; }
.idea img.mark { width: 52px; height: 52px; border-radius: 13px; }
.eyebrow { font-size: 12.5px; color: var(--text-3); }
.idea h3 { margin: 3px 0 6px; font-size: 19px; line-height: 26px; font-weight: 500; letter-spacing: -0.022em; }
.idea h3 a:hover { text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
.idea p { max-width: 54ch; font-size: 15px; line-height: 23px; color: var(--text-2); }
.idea .actions { margin-top: 18px; }
@media (max-width: 759px) {
  .idea { grid-template-columns: 1fr; gap: 14px; padding: 20px; }
  .idea img.mark { width: 44px; height: 44px; border-radius: 11px; }
}
.gone { display: flex; align-items: center; min-height: 52px; padding: 0 16px; color: var(--text-3); font-size: 13px; }
.gone button { color: var(--text); margin-left: 6px; text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }

/* to-dos: a round check, ticked in place */
.todo { position: relative; display: flex; align-items: flex-start; gap: 11px; padding: 11px 16px; border-top: 1px solid var(--line); cursor: pointer; }
.todo:first-child, .rows > li:first-child > .todo { border-top: 0; }
.todo:hover { background: var(--hover); }
.check { flex: none; width: 16px; height: 16px; margin-top: 2px; border: 1.5px solid var(--line-2); border-radius: 50%; display: grid; place-items: center; transition: background .15s, border-color .15s; }
.todo:hover .check { border-color: var(--text-3); }
.check svg.i { width: 10px; height: 10px; stroke-width: 3; opacity: 0; color: var(--btn-text); }
.todo.done .check { background: var(--text); border-color: var(--text); }
.todo.done .check svg.i { opacity: 1; }
.todo.done .tx { color: var(--text-3); text-decoration: line-through; text-decoration-color: var(--line-2); }
.todo .tx { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.todo.clamp .tx { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.todo img.mark { width: 18px; height: 18px; border-radius: 5px; margin-top: 1px; }
.todo .tx a { color: var(--text-2); text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
.todo .tx a:hover { color: var(--text); }
.todo-rm { flex: none; width: 24px; height: 24px; margin: -2px -4px -2px 0; display: grid; place-items: center; border-radius: 6px; color: var(--text-3); opacity: 0; transition: opacity .14s; }
.todo:hover .todo-rm, .todo-rm:focus-visible { opacity: 1; }
.todo-rm:hover { color: var(--text); background: var(--hover-2); }
@media (hover: none) { .todo-rm { opacity: .7; } }
.todo-add { display: flex; align-items: center; gap: 11px; padding: 11px 16px; border-bottom: 1px solid var(--line); }
.todo-add .plus { width: 16px; height: 16px; display: grid; place-items: center; color: var(--text-3); }
.todo-add input { flex: 1; min-width: 0; border: 0; background: none; color: var(--text); font: inherit; font-size: max(16px, 14px); line-height: 22px; padding: 0; outline: 0; }
@media (min-width: 760px) { .todo-add input { font-size: 14px; } }
.todo-add input::placeholder { color: var(--text-3); }

/* this week (Shopify's metric strip) — a mirror, not a scoreboard */
.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.stat { padding: 14px 16px 12px; border-left: 1px solid var(--line); }
.stat:first-child { border-left: 0; }
.stat .k { font-size: 12.5px; color: var(--text-2); white-space: nowrap; }
.stat .v { margin-top: 2px; font-size: 26px; line-height: 32px; font-weight: 500; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.stat .d { font-size: 12px; color: var(--text-3); white-space: nowrap; }
.strip { display: grid; grid-template-columns: repeat(28, minmax(0, 1fr)); gap: 3px; padding: 14px 16px 6px; border-top: 1px solid var(--line); }
.strip i { aspect-ratio: 1; border-radius: 3px; background: var(--hover-2); }
.strip i[data-l="1"] { background: color-mix(in srgb, var(--text) 22%, transparent); }
.strip i[data-l="2"] { background: color-mix(in srgb, var(--text) 42%, transparent); }
.strip i[data-l="3"] { background: color-mix(in srgb, var(--text) 56%, transparent); }
.strip i[data-l="4"] { background: color-mix(in srgb, var(--text) 80%, transparent); }
.strip i.today { box-shadow: 0 0 0 1.5px var(--surface), 0 0 0 2.5px var(--accent); }
.strip-labels { display: flex; justify-content: space-between; padding: 0 16px 12px; font-size: 11.5px; color: var(--text-3); }

/* projects in motion (Linear's project list) */
.proj { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 10px 10px 10px 16px; border-top: 1px solid var(--line); }
.proj:first-child { border-top: 0; }
.proj .t { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.proj .t b { flex: none; font-weight: 500; }
.proj .t b a:hover { text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
.proj .t span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-2); }
.proj .s { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-3); font-variant-numeric: tabular-nums; white-space: nowrap; }
.proj .menu { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 7px; color: var(--text-3); }
.proj .menu:hover, .proj.open .menu { background: var(--hover-2); color: var(--text); }
.proj .acts { grid-column: 1 / -1; display: none; gap: 8px; padding: 2px 0 4px; }
.proj.open .acts { display: flex; }
.proj.gone { display: flex; }
@media (max-width: 759px) {
  .proj { align-items: start; }
  .proj img.mark { margin-top: 1px; }
  .proj .t { flex-direction: column; gap: 1px; }
  .proj .t span { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
}

/* the receipt: what came in, and where it went */
.land { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 12px; padding: 12px 16px; border-top: 1px solid var(--line); }
.land:first-child { border-top: 0; }
.land .when { font-size: 12.5px; color: var(--text-3); font-variant-numeric: tabular-nums; padding-top: 1px; }
.land .what { color: var(--text); overflow-wrap: anywhere; }
.land .to { display: flex; align-items: center; gap: 7px; margin-top: 4px; font-size: 12.5px; color: var(--text-3); }
.land .to img.mark { width: 16px; height: 16px; border-radius: 4px; }
.land .to a:hover { color: var(--text); }
.land.fresh .to, .land .to.wait { color: var(--accent); }
@media (max-width: 759px) { .land { grid-template-columns: 1fr; gap: 2px; } }

.foot-note { margin-top: 56px; font-size: 12.5px; line-height: 19px; color: var(--text-3); text-align: center; }

@media (prefers-reduced-motion: no-preference) {
  .main > * { animation: rise .32s cubic-bezier(.2,.8,.2,1) both; }
  .main > :nth-child(2) { animation-delay: .03s; } .main > :nth-child(3) { animation-delay: .06s; }
  .main > :nth-child(4) { animation-delay: .09s; } .main > :nth-child(n+5) { animation-delay: .12s; }
  @keyframes rise { from { opacity: 0; transform: translateY(4px); } }
}

/* ---------- projects: the work first (the studio's grid) ----------
   Two columns of tiles, each the project's video, picture or live site, with a one-line
   caption under it. Opening a tile opens the thing itself; "Notes" goes to the vault note. */
.main:has(.pgrid) { max-width: 1600px; }
/* Day and night versions of the same picture: only the one that matches shows. */
html[data-mode="light"] .night-only, html:not([data-mode="light"]) .day-only:has(+ .night-only) { display: none !important; }
.pgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px 16px; }
@media (min-width: 1700px) { .pgrid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 1279px) { .pgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 599px) { .pgrid { grid-template-columns: 1fr; gap: 24px; } }
.ptile { margin: 0; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.pmedia, .phero { position: relative; display: block; aspect-ratio: 16 / 10; overflow: hidden; border-radius: var(--r-card); background: var(--surface); box-shadow: var(--shadow); }
.pmedia video, .pmedia img, .phero video, .phero img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; transform: scale(var(--z, 1)); transition: transform .5s cubic-bezier(.2,.8,.2,1); }
.pmedia:hover video, .pmedia:hover img { transform: scale(calc(var(--z, 1) * 1.015)); }
/* A live site, drawn at a computer's width and scaled to fit the tile. Looked at, never clicked. */
.site { position: absolute; inset: 0; overflow: hidden; background: var(--surface); }
.site iframe { position: absolute; left: 0; top: 0; width: 1440px; height: 900px; border: 0; transform-origin: 0 0; transform: scale(var(--s, .3)); pointer-events: none; background: transparent; }
/* No picture yet: the name, set large, so the grid still reads as work. */
.name { position: absolute; inset: 0; display: flex; align-items: flex-end; padding: 22px 24px; background: linear-gradient(160deg, var(--surface-2), var(--surface)); }
.name span { font-size: clamp(20px, 2vw, 28px); line-height: 1.1; font-weight: 500; letter-spacing: -0.03em; color: var(--text-2); text-wrap: balance; }
.pcap { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 0 2px; font-size: 13.5px; }
.ptitle { font-weight: 500; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ptitle .arrow { color: var(--text-3); font-size: 12px; }
.ptitle:hover .arrow { color: var(--text); }
.pmeta { display: flex; gap: 10px; flex: none; font-size: 12px; color: var(--text-3); font-variant-numeric: tabular-nums; }
.pmeta a:hover { color: var(--text); }
/* A project note: the work at the top, the writing folded under it. */
.doc-project { max-width: 960px; }
.doc-project .page-head .actions { margin-top: 16px; }
.doc .phero { margin-top: 24px; }
.pinfo { margin-top: 20px; max-width: 680px; }
.pinfo .lede { margin: 0; font-size: 15px; line-height: 23px; color: var(--text-2); }
.doc-notes { margin-top: 28px; }
.doc-notes > summary { list-style: none; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; height: 30px; padding: 0 13px; border-radius: var(--r-pill); background: var(--hover-2); font-size: 13px; color: var(--text-2); }
.doc-notes > summary::-webkit-details-marker { display: none; }
.doc-notes > summary:hover { color: var(--text); }
.doc-notes > summary::after { content: ""; width: 5px; height: 5px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: translateY(-1px) rotate(45deg); transition: transform .2s; }
.doc-notes[open] > summary::after { transform: translateY(1px) rotate(-135deg); }
.doc-notes > .prose { margin-top: 20px; }

/* ---------- note page (Linear's document) ---------- */
.doc { max-width: 680px; }
img.doc-mark { width: 44px; height: 44px; border-radius: 11px; margin-bottom: 18px; }
.doc .page-head h1 { font-size: 32px; line-height: 38px; }
@media (max-width: 759px) { .doc .page-head h1 { font-size: 26px; line-height: 32px; } img.doc-mark { width: 40px; height: 40px; border-radius: 10px; } }
.doc .prose { margin-top: 28px; }
.doc-links { margin-top: 48px; }
.paths { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; font-size: 13px; color: var(--text-3); }
.paths a:hover { color: var(--text); }
.paths .missing { color: var(--accent); }
/* Properties: a row of quiet chips under the title. Open, it edits them in place. */
.props { margin-top: 14px; }
.props > summary { list-style: none; cursor: pointer; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.props > summary::-webkit-details-marker { display: none; }
.props > summary > span { display: inline-flex; align-items: center; height: 24px; padding: 0 10px; border-radius: var(--r-pill); font-size: 12.5px; color: var(--text-2); background: var(--hover-2); }
.props > summary > span:first-child { color: var(--text); }
.props > summary::after { content: "Edit"; height: 24px; display: inline-flex; align-items: center; padding: 0 6px; font-size: 12.5px; color: var(--text-3); opacity: 0; transition: opacity .14s; }
.props > summary:hover::after, .props[open] > summary::after { opacity: 1; }
.props[open] > summary::after { content: "Done"; }
@media (hover: none) { .props > summary::after { opacity: 1; } }
.props-body { display: flex; flex-direction: column; gap: 2px; margin-top: 12px; padding: 6px 0; background: var(--surface); border-radius: 12px; box-shadow: var(--shadow); }
.prop { display: grid; grid-template-columns: 96px 1fr; align-items: center; gap: 0 12px; min-height: 36px; padding: 0 14px; }
.prop-k { color: var(--text-3); font-size: 13px; }
.prop-ro span:last-child { color: var(--text-2); font-variant-numeric: tabular-nums; }
.prop-seg { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px 0; }
.prop-seg button { height: 26px; padding: 0 10px; border-radius: var(--r-pill); font-size: 13px; color: var(--text-2); }
.prop-seg button:hover { color: var(--text); background: var(--hover); }
.prop-seg button[aria-pressed="true"] { color: var(--text); background: var(--hover-2); }
.prop-in { width: 100%; border: 0; background: none; padding: 0; color: var(--text); font: inherit; font-size: max(16px, 14px); line-height: 22px; outline: 0; }
@media (min-width: 760px) { .prop-in { font-size: 14px; } }
.prop-in::placeholder { color: var(--text-3); }
.prop-err { color: var(--accent); }
/* Section rail: "On this page", in the sheet's right margin when there's room. */
.rail { display: none; }
@media (min-width: 1360px) {
  .rail { display: flex; flex-direction: column; gap: 2px; position: fixed; top: 104px; right: 40px; width: 180px; max-height: calc(100dvh - 140px); overflow-y: auto; scrollbar-width: none; font-size: 13px; }
  .rail::-webkit-scrollbar { display: none; }
  .rail .rail-head { margin-bottom: 6px; color: var(--text-3); font-size: 12px; }
  .rail a { padding: 4px 0 4px 12px; border-left: 1px solid var(--line); color: var(--text-3); line-height: 18px; transition: color .15s, border-color .15s; }
  .rail a:hover { color: var(--text); }
  .rail a.on { color: var(--text); border-left-color: var(--text); }
}
.cut { margin: 24px 0 0; display: flex; flex-direction: column; gap: 10px; }
.cut img, .cut video { display: block; max-width: 100%; height: auto; border-radius: 12px; background: var(--surface); }
.cut .ctx summary { color: var(--text-2); cursor: pointer; list-style: none; font-size: 13px; }
.cut .ctx summary::-webkit-details-marker { display: none; }
.cut .ctx summary::before { content: "+"; display: inline-block; width: 1rem; color: var(--text-3); }
.cut .ctx[open] summary::before { content: "–"; }
.cut .ctx img { margin-top: 8px; }
.guide-strip { margin-top: 24px; display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 6px; }
.guide-strip img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; background: var(--surface); }

/* ---------- cuttings gallery ---------- */
.controls { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; }
.controls-row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px 16px; }
.guide-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 14px; min-height: 30px; }
.guide-bar[hidden] { display: none; }
.guide-bar .gb-count { color: var(--text-3); }
.guide-bar .gb-guide { color: var(--text); text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
.guide-bar .gb-focus { width: 11rem; height: 30px; padding: 0 12px; border-radius: var(--r-pill); border: 0; outline: 0; font: inherit; color: var(--text); background: var(--surface); }

.guide-bar .gb-run:disabled { opacity: .4; cursor: default; }
.guide-bar .gb-state { color: var(--text-2); font-variant-numeric: tabular-nums; }
.guide-bar .gb-state.err { color: var(--accent); }
.gal { margin-top: 28px; column-count: 4; column-gap: 16px; }
@media (max-width: 1280px) { .gal { column-count: 3; } }
@media (max-width: 860px) { .gal { column-count: 2; } }
@media (max-width: 480px) { .gal { column-count: 1; } }
.tile { position: relative; display: block; break-inside: avoid; margin: 0 0 16px; background: var(--surface); border-radius: var(--r-card); overflow: hidden; box-shadow: var(--shadow); transition: box-shadow .15s; }
.tile:hover { box-shadow: var(--shadow-lg); }
.tile .shot { position: relative; display: block; background: var(--hover); }
.tile img, .tile video, .tile .blank { display: block; width: 100%; height: auto; }
.tile .blank { aspect-ratio: 4 / 3; }
.tile.tall img { max-height: 460px; object-fit: cover; object-position: top; }
.tile.tall .shot::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 56px; background: linear-gradient(to bottom, transparent, var(--surface)); pointer-events: none; }
.tile .cap { padding: 10px 12px 11px; display: flex; flex-direction: column; gap: 3px; border-top: 1px solid var(--line); }
.tile .line { display: flex; align-items: baseline; gap: 8px; }
.tile .said { color: var(--text); font-weight: 500; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tile .rm { flex: none; margin-left: auto; width: 22px; height: 22px; border-radius: 6px; color: var(--text-3); font-size: 15px; line-height: 20px; opacity: 0; transition: opacity .14s; }
.tile:hover .rm, .tile .rm:focus-visible { opacity: 1; }
.tile .rm:hover { color: var(--text); background: var(--hover-2); }
.tile .from { display: flex; justify-content: space-between; gap: 10px; font-size: 12.5px; color: var(--text-3); }
.tile .from .who { display: flex; min-width: 0; }
.tile .from .site { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; color: var(--text-2); }
.tile .from .mo::before { content: "·"; margin: 0 .35rem; }
.tile .from .mo, .tile .from .when { flex: none; white-space: nowrap; }
.tile .from .fold { flex: none; margin-left: auto; color: var(--text-3); opacity: 0; transition: opacity .14s; white-space: nowrap; max-width: 9rem; overflow: hidden; text-overflow: ellipsis; }
.tile .from .fold.set { opacity: 1; }
.tile:hover .from .fold, .tile .from .fold:focus-visible { opacity: 1; }
.tile .from .fold:hover { color: var(--text); }
.tile .from .fold-in { flex: none; margin-left: auto; width: 8rem; height: 22px; padding: 0 8px; border: 0; border-radius: 6px; outline: 0; font: inherit; color: var(--text); background: var(--surface-2); }
.tile.leaving { opacity: 0; transform: scale(.97); transition: opacity .18s ease-out, transform .18s ease-out; }
@media (hover: none) { .tile .rm, .tile .from .fold { opacity: 1; } }

/* ---------- dialogs: search (⌘K), the inbox receipt (⌘⇧I), typography ---------- */
.scrim { position: fixed; inset: 0; z-index: 60; display: none; background: var(--scrim); padding: 14vh 16px 0; }
.scrim.open { display: block; animation: fade .14s ease-out; }
@keyframes fade { from { opacity: 0; } }
.palette { width: min(560px, 100%); margin: 0 auto; background: var(--surface-2); border-radius: 14px; box-shadow: var(--shadow-pop); overflow: hidden; }
.palette input { width: 100%; height: 52px; padding: 0 18px; border: 0; border-bottom: 1px solid var(--line); font: inherit; font-size: 16px; color: var(--text); background: transparent; outline: 0; }
.palette input::placeholder { color: var(--text-3); }
.results { max-height: 52vh; overflow-y: auto; padding: 6px; }
.result { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 8px 12px; border-radius: 8px; line-height: 20px; }
.result:hover, .result.cursor { background: var(--hover-2); }
.result small { display: block; color: var(--text-3); font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 40ch; }
.result .kind { color: var(--text-3); font-size: 12.5px; white-space: nowrap; }
.no-hits { padding: 20px; text-align: center; color: var(--text-3); }
.rc { width: min(640px, 100%); }
.rc-head { display: flex; justify-content: space-between; align-items: baseline; padding: 14px 16px 10px; font-weight: 500; }
.rc-head span { color: var(--text-3); font-weight: 400; font-size: 13px; }
.rc-head a { color: var(--text-3); font-weight: 400; font-size: 13px; }
.rc-head a:hover { color: var(--text); }
.rc .lands { max-height: 60vh; overflow-y: auto; border-top: 1px solid var(--line); }
.panel { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 70; width: min(320px, calc(100vw - 32px)); display: none; background: var(--surface-2); border-radius: 14px; box-shadow: var(--shadow-pop); padding: 14px; }
.panel.open { display: block; }
.panel h6 { margin: 0 0 12px; font-size: 13px; font-weight: 500; }
.field { margin-bottom: 10px; }
.field label { display: block; margin-bottom: 5px; color: var(--text-3); font-size: 12.5px; }
.field .seg { flex-wrap: nowrap; gap: 2px; padding: 2px; background: var(--hover); border-radius: 9px; }
.field .seg button { flex: 1; height: 28px; padding: 0 4px; justify-content: center; border: 0; border-radius: 7px; font-size: 12.5px; }
.field .seg button[aria-pressed="true"] { background: var(--surface); color: var(--text); box-shadow: var(--shadow); }
.panel .reset { width: 100%; height: 30px; margin-top: 4px; border-radius: 8px; color: var(--text-2); font-size: 13px; }
.panel .reset:hover { color: var(--text); background: var(--hover); }

/* Ideas: one line each in the same card as every other list; choices take the group's place on hover. */
.ideas { list-style: none; margin: 0; padding: 0; }
.iline { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 16px; min-height: 60px; padding: 0 16px; border-top: 1px solid var(--line); transition: opacity .18s, transform .18s; }
.iline:first-child { border-top: 0; }
.iline:hover { background: var(--hover); }
.iline.leaving { opacity: 0; transform: translateX(8px); }
.iline-t { display: flex; align-items: baseline; gap: 10px; min-width: 0; padding: 18px 0; }
.iline-t b { flex: none; font-weight: 500; font-size: 14px; color: var(--text); }
.iline-t span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; color: var(--text-3); }
.iline-end { display: grid; justify-items: end; align-items: center; }
.iline-end > * { grid-area: 1 / 1; }
.iline-g { font-size: 12.5px; color: var(--text-3); }
.iline-acts { display: flex; gap: 6px; }
.iline-acts button { font: inherit; font-size: 12.5px; height: 28px; padding: 0 12px; border: 0; border-radius: 999px; background: var(--hover-2); color: var(--text-2); cursor: pointer; }
.iline-acts button:hover { background: var(--line-2); color: var(--text); }
.iline-acts button.go { background: var(--btn); color: var(--btn-text); }
.iline-acts button.go:hover { background: var(--btn); opacity: .88; }
.iline-acts button[data-act="trash"]:hover { color: #e5484d; }
@media (hover: hover) and (min-width: 700px) {
  .iline-acts { opacity: 0; pointer-events: none; transition: opacity .12s; }
  .iline:hover .iline-acts, .iline:focus-within .iline-acts { opacity: 1; pointer-events: auto; }
  .iline:hover .iline-g, .iline:focus-within .iline-g { visibility: hidden; }
}
@media (max-width: 699px) {
  .iline { grid-template-columns: minmax(0, 1fr); gap: 0; padding-bottom: 12px; }
  .iline-t { flex-direction: column; gap: 2px; padding: 14px 0 8px; }
  .iline-t span { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .iline-g { display: none; }
  .iline-end { justify-items: start; }
}
`;

/* ---------- /vault.css, for the standalone pieces in /pages/ ---------- */
// The older furniture, redrawn in the new tokens. The column, the way home, the day/night
// switch, the note head, list rows and the section rail work as they always did.
export const PAGE_CSS = TOKENS + PROSE + `
body { font-size: 14px; line-height: 1.43; }
.frame { position: relative; max-width: 680px; margin: 0 auto; padding: 80px 0 96px; }
.frame > .up { position: absolute; top: 40px; left: 0; display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 11px 0 9px; margin-left: -9px; border-radius: var(--r-pill); color: var(--text-2); font-size: 13px; }
.frame > .up::before { content: "←"; font-size: 13px; }
.frame > .up:hover { color: var(--text); background: var(--hover); }
.frame.wide { max-width: 1180px; padding-left: 24px; padding-right: 24px; }
.frame.wide > .up { left: 24px; }
.frame > .sw { position: absolute; top: 40px; right: 0; width: 30px; height: 30px; border-radius: 8px; color: var(--text-2); z-index: 2; }
.frame > .sw:hover { color: var(--text); background: var(--hover); }
.sw svg { position: absolute; left: 7px; top: 7px; width: 16px; height: 16px; transition: opacity .45s cubic-bezier(.4,0,.2,1), transform .45s cubic-bezier(.4,0,.2,1); }
.sw .sun { opacity: 0; transform: rotate(-90deg) scale(.6); }
.sw .moon { opacity: 1; transform: none; }
:root[data-mode="light"] .sw .sun { opacity: 1; transform: none; }
:root[data-mode="light"] .sw .moon { opacity: 0; transform: rotate(90deg) scale(.6); }
@media (max-width: 980px) {
  .frame { max-width: none; padding: 72px 20px 80px; }
  .frame > * { max-width: 680px; }
  .frame > .up { top: 20px; left: 20px; }
  .frame > .sw { top: 20px; right: 20px; }
}
.head h1, .note-head h1 { font-size: 28px; line-height: 34px; font-weight: 500; letter-spacing: -0.026em; text-wrap: balance; }
.head .sub, .note-head .sub { margin-top: 6px; color: var(--text-3); font-size: 13.5px; }
.note-head .sub span + span::before { content: "·"; margin: 0 .45rem; }
.head .intro { margin-top: 20px; display: flex; flex-direction: column; gap: 8px; }
.note-head .path { margin-top: 4px; color: var(--text-3); }
.prose { margin-top: 24px; }
.section { padding-top: 48px; }
.section-title { color: var(--text); font-weight: 500; font-size: 13px; margin-bottom: 10px; }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.group { position: relative; padding: 8px 0; }
.group::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: var(--line); }
.group-label { position: absolute; left: 0; top: 14px; color: var(--text-3); line-height: 20px; white-space: nowrap; max-width: 6rem; overflow: hidden; text-overflow: ellipsis; }
.group ul { list-style: none; margin: 0; padding: 0; }
.entry { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 6px 0 6px 6.75rem; line-height: 20px; }
.entry .t { color: var(--text); min-width: 0; }
.entry .m { color: var(--text-3); white-space: nowrap; }
a.entry:hover .t { text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
@media (max-width: 520px) { .entry { padding-left: 3rem; } .group-label { max-width: 2.6rem; } }
.rail { position: fixed; top: 86px; left: calc(50% - 340px - 4.5rem - 176px); width: 176px; display: flex; flex-direction: column; gap: 2px; text-align: right; max-height: calc(100vh - 114px); overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none; font-size: 13px; }
.rail::-webkit-scrollbar { display: none; }
.rail a { flex: none; padding: 3px 12px 3px 0; border-right: 1px solid var(--line); color: var(--text-3); line-height: 18px; transition: color .15s, border-color .15s; }
.rail a:hover { color: var(--text); }
.rail a.on { color: var(--text); border-right-color: var(--text); }
.rail a.home { border: 0; margin-bottom: 14px; color: var(--text-2); opacity: 0; pointer-events: none; transition: opacity .2s, color .15s; }
.rail a.home::before { content: "← "; }
.rail a.home.show { opacity: 1; pointer-events: auto; }
h2[id] { scroll-margin-top: 32px; }
@media (max-width: 1180px) { .rail { display: none; } }
`;
