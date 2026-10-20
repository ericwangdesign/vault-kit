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
//
// Since Oct 12, 2026 it wears the writing canvas's look (canvas/canvas.css), so a note, a list and
// a canvas page read as one thing: a white day page with faint grey cards and no outlines or
// divider lines (a card reads by its fill, a row by its hover), the canvas type scale (page title
// 20, section 16, everything else 14, labels 13), radii 4 / 8 / 12, and padding that is the same
// on every side. Grey text is the canvas's mixes, so every level passes AA in both themes.
//
// This block is the one source for the reader and the writing canvas (canvas.css uses these names
// directly, no --cv- copies). Every value is shown, live, at /pages/design-system.html.

export const TOKENS = `
:root {
  /* ---- colour: grounds ---- */
  --panel: #080808;          /* behind everything: the sidebar's ground */
  --bg: #0f0f0f;             /* the page */
  --surface: #161616;        /* cards */
  --surface-2: #1c1c1c;      /* floats: composer, menus, dialogs */

  /* ---- colour: text, one ladder. Each is the ink mixed over the page ---- */
  --text: #f2f2f2;           /* titles, names, anything you act on */
  --text-body: #d7d7d7;      /* running text, 88%: a step under titles */
  --text-2: #bbbbbb;         /* secondary, 76% */
  --text-3: #9c9c9c;         /* labels, dates, meta, 62%. AA on the page and on a card */

  /* ---- colour: fills on a card, solid, from the ink over the card ---- */
  --raised: color-mix(in srgb, var(--text) 6%, var(--surface));   /* something sitting on a card */
  --fill: color-mix(in srgb, var(--text) 12%, var(--surface));    /* chips, number circles, the pressed segment */
  --wire: color-mix(in srgb, var(--text) 20%, var(--surface));    /* connectors: tree lines, arrows */
  --fill-2: color-mix(in srgb, var(--text) 24%, var(--surface));  /* the grey that isn't the point: chart bars, rings */

  /* ---- colour: see-through, for hovers over anything ---- */
  --hover: rgba(255,255,255,.045);
  --hover-2: rgba(255,255,255,.075);
  --line: rgba(255,255,255,.08);   /* only where a line is the thing: the rail's track, a check's ring */
  --line-2: rgba(255,255,255,.15);

  /* ---- colour: the one accent, and status ---- */
  --accent: #4da6ff;
  --accent-soft: oklch(from color-mix(in oklch, var(--accent) 22%, var(--surface)) l calc(c * 1.6) h); /* bluer, not brighter */
  --accent-ink: color-mix(in srgb, var(--accent) 72%, var(--text));  /* blue text on the soft blue */
  --on-accent: var(--bg);    /* text on the solid blue */
  --ok: #5cc98b;
  --bad: #ff7a6b;

  --btn: var(--accent-soft);     /* primaries are the blue tint, never white (Eric, Oct 19) */
  --btn-text: var(--accent-ink);
  --scrim: rgba(0,0,0,.55);
  --shadow: none;
  --shadow-lg: 0 0 0 1px rgba(255,255,255,.02), 0 12px 32px rgba(0,0,0,.35);
  --shadow-pop: 0 0 0 1px rgba(255,255,255,.03), 0 24px 64px rgba(0,0,0,.55);

  /* ---- type: Geist, seven sizes, each with its line ---- */
  --font: "Geist", ui-sans-serif, -apple-system, "Segoe UI", sans-serif;
  --mono: "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace;   /* code only */
  --t-xs: 11px;    --lh-xs: 16px;     /* badges, pin numbers, chart ticks */
  --t-ui: 12px;    --lh-ui: 16px;     /* tool chrome, dense panels; code at 20 */
  --t-sm: 13px;    --lh-sm: 18px;     /* labels, meta, captions */
  --t-md: 14px;    --lh-md: 20px;     /* body, names, shape titles */
  --t-lg: 16px;    --lh-lg: 22px;     /* section headings */
  --t-title: 20px; --lh-title: 26px;  /* the page title */
  --t-2xl: 24px;   --lh-2xl: 28px;    /* big numbers */
  --w-body: 420;   /* running text: a touch under regular, so medium stands off it */
  --w-medium: 500; /* titles, headings, names */
  --w-bold: 500;   /* **bold** in running text: medium, never semibold */
  --tr-tight: -0.02em; --tr-snug: -0.01em; --tr-body: -0.006em;

  /* ---- space: a 4 grid ---- */
  --s0: 2px; --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 24px; --s6: 32px; --s7: 48px; --s8: 64px; --s9: 96px;

  /* ---- radius: on the same grid ---- */
  --r-2xs: 2px;    /* marks: heatmap cells, legend bars */
  --r-xs: 4px;     /* chips, code, small buttons */
  --r-sm: 8px;     /* rows, controls, pictures */
  --r-md: 12px;    /* cards */
  --r-lg: 24px;    /* the composer, floating panels */
  --r-pill: 999px;

  /* Reading size, line and column for notes (.prose). */
  --size: 14px;
  --leading: 1.43;
  --measure: 640px;
  --scheme: dark;
}
:root[data-mode="light"] {
  --panel: #f3f3f3;          /* the sidebar's ground, a step under the white sheet */
  --bg: #ffffff;             /* the page is white: a grey page dulled the blue */
  --surface: #f7f7f7;        /* cards: a faint grey fill, no outline */
  --surface-2: #ffffff;      /* things that float (composer, menus, dialogs) stay white, with a shadow */
  --text: #0f0f0f;
  --text-body: #2c2c2c;
  --text-2: #494949;
  --text-3: #6b6b6b;
  /* Day greys a quarter lighter than night's mixes. Text stays put: it's what
     keeps every level AA. */
  --raised: color-mix(in srgb, var(--text) 3%, var(--surface));
  --fill: color-mix(in srgb, var(--text) 9%, var(--surface));
  --wire: color-mix(in srgb, var(--text) 8%, var(--surface));
  --fill-2: color-mix(in srgb, var(--text) 14%, var(--surface));
  --hover: rgba(0,0,0,.03);
  --hover-2: rgba(0,0,0,.05);
  --line: rgba(0,0,0,.06);
  --line-2: rgba(0,0,0,.09);
  /* Apple's blues (apple.com): #0071e3 for buttons and fills, #0066cc for blue text. The old #0069d1 read dated. */
  --accent: #0071e3;
  /* The tint comes straight off the accent's hue: mixing toward grey made it dusty. */
  --accent-soft: oklch(from var(--accent) .945 .035 h);
  --accent-ink: #0066cc;
  --ok: #15803d;
  --bad: #e5484d;
  --btn: var(--accent-soft);
  --btn-text: var(--accent);
  --scrim: rgba(0,0,0,.18);
  --shadow: none;            /* cards read by their fill alone, day and night */
  --shadow-lg: 0 1px 3px rgba(0,0,0,.05), 0 8px 24px rgba(0,0,0,.07);
  --shadow-pop: 0 1px 2px rgba(0,0,0,.05), 0 24px 64px rgba(0,0,0,.14);
  --scheme: light;
}
/* The crossfade only runs while the switch is being pressed, never on load. */
html.theming, html.theming *, html.theming *::before, html.theming *::after { transition: background-color .45s cubic-bezier(.4,0,.2,1), color .45s cubic-bezier(.4,0,.2,1), border-color .45s cubic-bezier(.4,0,.2,1), box-shadow .45s cubic-bezier(.4,0,.2,1), fill .45s cubic-bezier(.4,0,.2,1), stroke .45s cubic-bezier(.4,0,.2,1) !important; }
html.theming .sw svg { transition: opacity .45s cubic-bezier(.4,0,.2,1), transform .45s cubic-bezier(.4,0,.2,1) !important; }

* { box-sizing: border-box; }
html { background: var(--bg); color: var(--text); color-scheme: var(--scheme); scroll-padding-top: 72px; -webkit-text-size-adjust: 100%; }
/* No scrollbars anywhere in the vault: pages and panels still scroll, the bar just isn't drawn. */
* { scrollbar-width: none; }
*::-webkit-scrollbar { display: none; }
body {
  margin: 0; font: var(--w-body) var(--t-md)/var(--lh-md) var(--font); letter-spacing: var(--tr-body);
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
  font-feature-settings: "ss01" 1, "cv11" 1;
  -webkit-tap-highlight-color: transparent;
}
a { color: inherit; text-decoration: none; }
p { margin: 0; }
h1, h2, h3, h4 { margin: 0; font-size: inherit; font-weight: inherit; line-height: inherit; }
button { font: inherit; letter-spacing: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
::selection { background: var(--accent-soft); }
:focus-visible { outline: 2px solid color-mix(in srgb, var(--accent) 60%, transparent); outline-offset: 2px; border-radius: var(--r-xs); }
/* Text fields show focus with their caret and their own border, not a ring. */
textarea:focus-visible, input:focus-visible { outline: none; }
.mono { font-family: var(--mono); font-size: var(--t-md); }
`;

/* The older names, for the standalone pages in /pages/ written before the tokens above (the trip pages,
   glyph-walker, ten-directions...). Only /vault.css carries them; the reader's own pages don't. Never use
   them in new work: each one points at its new name. */
const LEGACY = `
:root {
  --ink: var(--text); --ink-2: var(--text-body); --soft: #c4c4c4; --muted: var(--text-2); --faint: var(--text-3);
  --hair: var(--line); --hair-2: var(--line-2); --edge: var(--line);
  --card: var(--surface); --card-hover: var(--surface-2); --code-bg: var(--surface-2);
  --wash: var(--hover); --accent-wash: var(--accent-soft);
  --r: var(--r-sm); --r-card: var(--r-md); --font-body: var(--font);
}
:root[data-mode="light"] { --soft: #333333; }
`;

/* Long-form text. Shared by note pages and the standalone pieces. */
const PROSE = `
.prose { font-family: var(--font); font-size: var(--size); line-height: var(--leading); color: var(--text-body); letter-spacing: var(--tr-body); display: flex; flex-direction: column; gap: 16px; max-width: var(--measure); }
.prose h1, .prose h2, .prose h3, .prose h4 { margin-top: 24px; color: var(--text); font-weight: var(--w-medium); letter-spacing: var(--tr-snug); text-wrap: balance; }
.prose h1 { font-size: var(--t-title); line-height: var(--lh-title); }
.prose h2 { font-size: var(--t-lg); line-height: var(--lh-lg); }
.prose h3 { font-size: var(--t-md); line-height: var(--lh-md); }
.prose h4 { font-size: var(--t-md); line-height: var(--lh-md); color: var(--text-2); }
.prose h1 + *, .prose h2 + *, .prose h3 + *, .prose h4 + * { margin-top: -8px; }
.prose > :first-child { margin-top: 0; }
.prose ul, .prose ol { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; }
.prose li::marker { color: var(--text-3); }
.prose strong { font-weight: var(--w-bold); color: var(--text); }
.prose em { font-style: italic; }
.prose a { color: inherit; text-decoration: underline; text-decoration-color: var(--line-2); text-decoration-thickness: 1px; text-underline-offset: 3px; transition: text-decoration-color .15s, color .15s; }
.prose a:hover { text-decoration-color: currentColor; color: var(--text); }
.prose a.dangling { color: var(--text-3); text-decoration-style: dashed; cursor: help; }
.prose code { font-family: var(--mono); font-size: .875em; color: var(--text); background: var(--hover-2); padding: var(--s0) calc(var(--s1) + var(--s0)); border-radius: var(--r-xs); }
.prose pre { margin: 4px 0; padding: 12px; background: var(--surface); border-radius: var(--r-sm); overflow-x: auto; }
.prose pre code { padding: 0; background: none; font-size: var(--t-ui); line-height: var(--lh-md); }
.prose blockquote { margin: 0; padding: 2px 0 2px 16px; border-left: 2px solid var(--line-2); color: var(--text-2); display: flex; flex-direction: column; gap: 8px; }
.prose hr { border: 0; height: 0; margin: 8px 0; width: 100%; }  /* a break is space, never a rule */
/* A table the canvas way: a grey card, cells 8 in, no lines; the header is the grey row of names. */
.prose table { border-collapse: separate; border-spacing: 0; width: 100%; display: block; overflow-x: auto; padding: 4px; border-radius: var(--r-md); background: var(--surface); font-size: var(--t-md); line-height: var(--lh-md); }
.prose th, .prose td { text-align: left; vertical-align: top; padding: 8px; }
.prose th { font-weight: var(--w-medium); font-size: var(--t-sm); line-height: var(--lh-sm); color: var(--text-3); }
.prose img { max-width: 100%; height: auto; border-radius: var(--r-sm); }
`;

/* Two sliders, one markup:
     <label class="slider"><span class="slider-head">Size<output>14</output></span><input type="range" ...></label>
   - Bar (.slider): the bar is the slider. A soft blue fill grows under the name and the value, which ride inside it.
     For an amount on a page: a size, an opacity, a budget. A bare <input type="range"> in a canvas piece draws as one.
   - Field (.slider.field): Figma's. Name, a thin track with a small white thumb, and the number in a box, on one row.
     For a panel of settings, where several sit stacked and a bar each would shout.
   The bar is the input itself: its own background is the fill and the thumb has no width, so pressing anywhere jumps
   there and drags. CSS can't read a range's value, so /vault.js (THEME_JS in server.js) keeps --f (0 to 1) in step. */
const SLIDER = `
.slider { position: relative; display: block; }
:is(.slider, .cv-live, .cv-scale) input[type="range"] {
  -webkit-appearance: none; appearance: none; display: block; width: 100%; height: 36px; margin: 0; padding: 0;
  border: 0; border-radius: var(--r-sm); background: linear-gradient(to right, var(--accent-soft) calc(var(--f, 0) * 100%), var(--fill) 0);
  cursor: pointer; touch-action: pan-y; -webkit-tap-highlight-color: transparent;
}
:is(.slider, .cv-live, .cv-scale) input[type="range"]::-webkit-slider-runnable-track { height: 100%; background: none; }
:is(.slider, .cv-live, .cv-scale) input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 0; height: 100%; border: 0; background: none; box-shadow: none; }
:is(.slider, .cv-live, .cv-scale) input[type="range"]::-moz-range-track { height: 100%; background: none; }
:is(.slider, .cv-live, .cv-scale) input[type="range"]::-moz-range-progress { background: none; }
:is(.slider, .cv-live, .cv-scale) input[type="range"]::-moz-range-thumb { width: 0; height: 100%; border: 0; background: none; opacity: 0; }
:is(.slider, .cv-live, .cv-scale) input[type="range"]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
:is(.slider, .cv-live, .cv-scale) input[type="range"]:disabled { opacity: .4; cursor: default; }
.slider-head { position: absolute; inset: 0; display: flex; align-items: center; justify-content: space-between; gap: var(--s3); padding: 0 var(--s3); font-size: var(--t-md); line-height: var(--lh-md); color: var(--text-2); pointer-events: none; }
.slider-head output { color: var(--text); font-variant-numeric: tabular-nums; }
/* Field: one row of three. The head steps aside (display: contents) so its name and number sit either side of the track. */
.slider.field { display: grid; grid-template-columns: 64px minmax(0, 1fr) 52px; align-items: center; gap: var(--s3); font-size: var(--t-sm); line-height: var(--lh-sm); color: var(--text-2); }
.slider.field .slider-head { display: contents; }
.slider.field input[type="range"] { order: 1; height: 28px; border-radius: 0; background: none; --thumb: 12px; }
.slider.field output { order: 2; display: grid; place-items: center; height: 28px; border-radius: var(--r-sm); background: var(--fill); color: var(--text); }
.slider.field input[type="range"]::-webkit-slider-runnable-track { height: 4px; border-radius: var(--r-pill); background: linear-gradient(to right, var(--accent) calc(var(--thumb) / 2 + (100% - var(--thumb)) * var(--f, 0)), var(--fill) 0); }
.slider.field input[type="range"]::-webkit-slider-thumb { width: var(--thumb); height: var(--thumb); margin-top: -4px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 .5px rgba(0,0,0,.1), 0 1px 3px rgba(0,0,0,.25); transition: transform .15s cubic-bezier(.2,0,0,1); }
.slider.field input[type="range"]::-moz-range-track { height: 4px; border-radius: var(--r-pill); background: var(--fill); }
.slider.field input[type="range"]::-moz-range-progress { height: 4px; border-radius: var(--r-pill); background: var(--accent); }
.slider.field input[type="range"]::-moz-range-thumb { width: var(--thumb); height: var(--thumb); border-radius: 50%; background: #fff; opacity: 1; box-shadow: 0 0 0 .5px rgba(0,0,0,.1), 0 1px 3px rgba(0,0,0,.25); transition: transform .15s cubic-bezier(.2,0,0,1); }
.slider.field input[type="range"]:active::-webkit-slider-thumb { transform: scale(1.25); }
.slider.field input[type="range"]:active::-moz-range-thumb { transform: scale(1.25); }
.slider.field input[type="range"]:focus-visible { outline: none; }
.slider.field input[type="range"]:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 40%, transparent), 0 1px 3px rgba(0,0,0,.25); }
/* A finger needs more to hold: Apple's 44 for the bar, a bigger thumb on the field. */
@media (pointer: coarse) {
  :is(.slider, .cv-live, .cv-scale) input[type="range"] { height: 44px; }
  .slider.field input[type="range"] { height: 44px; --thumb: 20px; }
  .slider.field input[type="range"]::-webkit-slider-thumb { margin-top: -8px; }
}
@media (prefers-reduced-motion: reduce) { .slider.field input[type="range"]::-webkit-slider-thumb { transition: none; } }
`;

/* ---------- the reader's own pages ---------- */

export const CSS = TOKENS + PROSE + SLIDER + `
html { background: var(--panel); }
@media (max-width: 1023px) { html { background: var(--bg); } }  /* no sidebar here: overscroll shows the page, not a grey strip */
svg.i { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; flex: none; }
img.mark { display: block; flex: none; width: 20px; height: 20px; border-radius: var(--r-xs); background: var(--hover-2); object-fit: cover; }
kbd { font: inherit; font-size: var(--t-sm); color: var(--text-3); }

/* ---------- frame ----------
   A phone or a narrow window: one column under a top bar. A computer: the sidebar on the
   panel ground, the page on a sheet beside it (Linear). The page itself scrolls, never the sheet. */
.app { min-height: 100dvh; background: var(--bg); }
.side { display: none; }
.sheet { min-width: 0; background: var(--bg); }
.main { width: 100%; max-width: 688px; margin: 0 auto; padding: 40px 24px 112px; min-width: 0; }  /* a 640 column, the canvas's */
.main.wide { max-width: 1240px; }
@media (min-width: 1024px) {
  .app { display: grid; grid-template-columns: 240px minmax(0, 1fr); background: var(--panel); }
  .side { display: flex; flex-direction: column; position: sticky; top: 0; height: 100dvh; padding: 10px 10px 12px; }
  .sheet { margin: 8px 8px 8px 0; min-height: calc(100dvh - 16px); border-radius: var(--r-md); }
  .main { max-width: 720px; padding: 64px 40px 120px; }
  .top { display: none !important; }
}

/* ---------- sidebar (Linear, ChatGPT) ---------- */
.brand { display: flex; align-items: center; gap: 9px; height: 36px; padding: 0 4px 0 10px; font-weight: var(--w-medium); }
.brand img { width: 20px; height: 20px; border-radius: var(--r-xs); }
.brand .icon-btn:first-of-type { margin-left: auto; }
.icon-btn { width: 28px; height: 28px; display: grid; place-items: center; border-radius: var(--r-sm); color: var(--text-2); flex: none; }
.icon-btn:hover { background: var(--hover); color: var(--text); }
.new {
  display: flex; align-items: center; gap: 8px; width: 100%; height: 32px; margin: 8px 0 14px; padding: 0 10px;
  background: var(--hover-2); border-radius: var(--r-sm);
  font-size: var(--t-md); color: var(--text); text-align: left;
}
.new kbd { margin-left: auto; }
.new + .new { margin-top: -10px; }
.new:hover { background: color-mix(in srgb, var(--text) 11%, transparent); }
.nav { display: flex; flex-direction: column; gap: 1px; }
.nav a { display: flex; align-items: center; gap: 8px; height: 32px; padding: 0 8px; border-radius: var(--r-sm); color: var(--text-2); font-size: var(--t-md); }
.nav a:hover { background: var(--hover); color: var(--text); }
.nav a.on { background: var(--hover-2); color: var(--text); }
.nav .n { margin-left: auto; font-size: var(--t-sm); color: var(--text-3); font-variant-numeric: tabular-nums; }
.nav-label { margin: 16px 8px 4px; font-size: var(--t-sm); line-height: var(--lh-sm); color: var(--text-3); }
.side-foot { margin-top: auto; display: flex; align-items: center; gap: 2px; padding: 4px 0 0 8px; }
.side-foot .clock { flex: 1; min-width: 0; font-size: var(--t-sm); color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
.i-sun, .i-moon { transition: opacity .3s, transform .45s cubic-bezier(.2,.8,.2,1); }
html[data-mode="light"] .i-moon, html:not([data-mode="light"]) .i-sun { display: none; }

/* ---------- top bar (phone, tablet) ---------- */
.top {
  position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 4px;
  height: calc(52px + env(safe-area-inset-top)); padding: env(safe-area-inset-top) 8px 0 8px;
  background: color-mix(in srgb, var(--bg) 84%, transparent);
  backdrop-filter: saturate(1.4) blur(14px); -webkit-backdrop-filter: saturate(1.4) blur(14px);
}
.top .here { display: flex; align-items: center; gap: 9px; min-width: 0; margin: 0 auto 0 6px; font-weight: var(--w-medium); }
.top .here img { width: 20px; height: 20px; border-radius: var(--r-xs); }
.top .here span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.top .icon-btn { width: 36px; height: 36px; border-radius: var(--r-sm); }
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
  .nav a { height: 40px; font-size: var(--t-lg); }
  .side .brand .icon-btn { display: none; }
}
@media (max-width: 759px) {
  .main { padding: 16px 16px calc(112px + env(safe-area-inset-bottom)); }
}

/* ---------- page head (OpenAI's plain type) ---------- */
.page-head { margin-bottom: 8px; }
.crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin-bottom: 12px; font-size: var(--t-sm); line-height: var(--lh-sm); color: var(--text-3); }
.crumbs a:hover { color: var(--text); }
.crumbs .sep { opacity: .6; }
.page-head h1 { font-size: var(--t-title); line-height: var(--lh-title); font-weight: var(--w-medium); letter-spacing: var(--tr-snug); text-wrap: balance; }
.page-head .sub { margin-top: 4px; color: var(--text-3); font-size: var(--t-sm); line-height: var(--lh-sm); }
.page-head .lede { margin-top: 16px; max-width: 640px; font-size: var(--t-md); line-height: var(--lh-md); color: var(--text-body); text-wrap: pretty; }
.page-head .lede b { font-weight: var(--w-bold); color: var(--text); }

/* ---------- blocks, cards, rows ---------- */
.block { margin-top: 40px; }
.block:first-child { margin-top: 0; }
.block-head { display: flex; align-items: baseline; gap: 8px; margin: 0 0 12px; min-height: 22px; }
.block-head h2 { font-size: var(--t-lg); line-height: var(--lh-lg); font-weight: var(--w-medium); color: var(--text); letter-spacing: var(--tr-body); }
.block-head h2 a:hover { text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
.block-head .n { font-size: var(--t-sm); color: var(--text-3); font-variant-numeric: tabular-nums; }
.block-head .end { margin-left: auto; font-size: var(--t-sm); color: var(--text-3); }
.block-head a.end:hover { color: var(--text); }
/* A card is a fill, never an outline. What's in it sits 4px in, each row its own rounded hover with 2px
   between rows (the canvas's table), so no line is ever drawn between two things. */
.card { padding: 4px; background: var(--surface); border-radius: var(--r-md); overflow: hidden; }
.card > * + *, .card > .rows > li + li, .card > .ideas > li + li { margin-top: 2px; }

/* Scratch: a page of bullets for loose thoughts (Thinking › Loose thoughts). The thought is the text. */
.scratch { padding: 12px 16px; }
.scratch ul { list-style: none; margin: 0; padding: 0; }
.scratch li { position: relative; padding-left: 20px; }
.scratch li + li { margin-top: 4px; }
.scratch li::before { content: ''; position: absolute; left: 4px; top: 15px; width: 6px; height: 6px; border-radius: 50%; background: var(--text-3); }
.scratch a { display: block; padding: 6px 0; font-size: var(--t-md); line-height: var(--lh-md); color: var(--text-body); }
.scratch a b { font-weight: var(--w-medium); color: var(--text); margin-right: 4px; }
.scratch a:hover b { text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
@media (max-width: 759px) { .scratch { padding: 8px 12px; } }

/* A row is the vault's one list item: a mark, a title with a line under it, a quiet fact on the right. */
.rows { list-style: none; margin: 0; padding: 0; }
.row { position: relative; display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 12px; border-radius: var(--r-sm); }
.row.no-mark { grid-template-columns: minmax(0, 1fr) auto; }
.row img.mark { margin-top: 0; }
a.row:hover, .row.link:hover { background: var(--hover); }
.row .t { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.row .t b { font-weight: var(--w-medium); color: var(--text); line-height: var(--lh-md); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* One line each, so every row is the same height and the titles carry the list. */
.row .t span { color: var(--text-3); font-size: var(--t-sm); line-height: var(--lh-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 759px) { .row .t span { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; } .row { align-items: start; } .row .m { align-self: start; } }
.row .m { display: flex; align-items: center; gap: 8px; font-size: var(--t-sm); line-height: var(--lh-sm); align-self: center; color: var(--text-3); white-space: nowrap; font-variant-numeric: tabular-nums; }
.row .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
.row .dot[hidden] { display: none; }
/* On a phone the right side keeps only the date; the rest is in the note. */
@media (max-width: 759px) { .row .m .opt, .block-head span.end { display: none; } }
.row.dim .t b { color: var(--text-2); font-weight: var(--w-body); }
/* Archive appears on approach and takes the meta's place, so a list at rest keeps its geometry. */
.rows > li { position: relative; }
.arch { position: absolute; right: 12px; top: 12px; z-index: 1; height: 24px; padding: 0 8px; border-radius: var(--r-pill); font-size: var(--t-sm); color: var(--text-2); background: var(--hover-2); opacity: 0; transition: opacity .14s; }
.rows > li:hover .arch, .arch:focus-visible { opacity: 1; }
.rows > li:hover:has(.arch) .row .m { visibility: hidden; }
/* The button is wider than the date it replaces, so its row keeps that room free. */
.rows > li:has(.arch) .row .m { min-width: 64px; justify-content: flex-end; }
@media (hover: none) { .rows > li:has(.arch) .row .m { min-width: 0; } }
.arch:hover { color: var(--text); }
@media (hover: none) { .arch { display: none; } }
.more { display: flex; align-items: center; gap: 8px; width: 100%; padding: 12px; border-radius: var(--r-sm); font-size: var(--t-sm); line-height: var(--lh-sm); color: var(--text-3); text-align: left; }
.more:hover { color: var(--text); background: var(--hover); }

/* A block that folds: its head is the summary. */
details.block > summary { list-style: none; cursor: pointer; }
details.block > summary::-webkit-details-marker { display: none; }
details.block > summary h2::after { content: ""; display: inline-block; width: 6px; height: 6px; margin: 0 0 2px 8px; border-right: 1.5px solid var(--text-3); border-bottom: 1.5px solid var(--text-3); transform: rotate(-45deg); transition: transform .2s; }
details.block[open] > summary h2::after { transform: rotate(45deg); margin-bottom: 4px; }
details.block > summary:hover h2::after { border-color: var(--text); }

.empty { padding: 12px; color: var(--text-3); display: flex; flex-direction: column; gap: 2px; }
.empty[hidden] { display: none; } /* recount() hides it once a list has rows */
.empty b { font-weight: var(--w-medium); color: var(--text-2); }

/* ---------- pills, tags, buttons ---------- */
.pill, .tag { display: inline-flex; align-items: center; gap: 4px; height: 24px; padding: 0 8px; border-radius: var(--r-pill); font-size: var(--t-sm); white-space: nowrap; background: var(--hover-2); color: var(--text-2); }
.pill.accent { color: var(--accent-ink); background: var(--accent-soft); }
.btn { display: inline-flex; align-items: center; gap: 8px; height: 28px; padding: 0 12px; border: 0; background: var(--hover-2); border-radius: var(--r-pill); font-size: var(--t-md); color: var(--text); white-space: nowrap; transition: background .12s, border-color .12s, opacity .12s; }
.btn:hover { background: color-mix(in srgb, var(--text) 13%, transparent); }
.btn.primary { background: var(--btn); color: var(--btn-text); }
.btn.primary:hover { opacity: .88; }
.btn.ghost { background: transparent; color: var(--text-2); }
.btn.ghost:hover { color: var(--text); background: var(--hover); }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
/* Filters: one row of quiet pills (Linear's view tabs). */
.seg { display: flex; flex-wrap: wrap; gap: 4px; }
.seg button, .seg a { height: 28px; padding: 0 12px; border-radius: var(--r-pill); font-size: var(--t-md); color: var(--text-2); border: 0; background: transparent; display: inline-flex; align-items: center; gap: 6px; }
.seg button:hover, .seg a:hover { color: var(--text); background: var(--hover); }
.seg button.on, .seg a.on { color: var(--text); background: var(--hover-2); }
.seg button[hidden], .seg[hidden] { display: none; }

/* ---------- Today: hello and composer (OpenAI's type, ChatGPT's box) ---------- */
.date { font-size: var(--t-sm); line-height: var(--lh-sm); color: var(--text-3); }
.hello h1 { margin-top: 4px; font-size: var(--t-title); line-height: var(--lh-title); font-weight: var(--w-medium); letter-spacing: var(--tr-snug); }
.brief { margin-top: 16px; max-width: 640px; font-size: var(--t-md); line-height: var(--lh-md); color: var(--text-body); text-wrap: pretty; }
.brief b { font-weight: var(--w-bold); color: var(--text); }
@media (max-width: 759px) { .hello { padding-top: 8px; } }
/* Today's head (Oct 17): the time big, then facts to act on as chips: the next event, what's running, what's open */
.hello .now-time { display: flex; flex-wrap: wrap; align-items: baseline; column-gap: 12px; margin: 0; font-size: 28px; line-height: 34px; font-weight: var(--w-body); letter-spacing: var(--tr-tight); font-variant-numeric: tabular-nums; }
.hello .now-time .day { font-size: var(--t-md); line-height: var(--lh-md); font-weight: var(--w-body); letter-spacing: 0; color: var(--text-3); }
.facts { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 0; }
.facts .f { display: inline-flex; align-items: center; gap: 5px; min-height: 28px; padding: 2px 10px; border-radius: var(--r-pill); background: var(--surface); color: var(--text-2); font-size: var(--t-sm); line-height: var(--lh-sm); }
.facts a.f:hover { background: var(--hover-2); color: var(--text); }
.facts .f b { color: var(--text); font-weight: var(--w-body); }
.facts .ev { color: var(--text); }
.facts .ev i { font-style: normal; color: var(--text-3); }
.facts .ev span { color: var(--text-3); }
.facts .ev.soon { background: var(--accent-soft); }
.facts .ev.soon i, .facts .ev.soon span { color: var(--accent); }
@media (max-width: 759px) {
  .facts .run { display: none; } /* what's running is on the Mac */
  .facts .ev { display: block; border-radius: var(--r-md); padding: 6px 12px; } /* a long event reads as one sentence, not three columns */
  .facts .ev i { margin-right: 6px; } .facts .ev span { margin-left: 6px; }
}
/* Today two steps up (Oct 17): labels 14, body 16, Open's next line 17, card headings 20; cards 32 apart so the type,
   not the gaps, carries the page */
.is-today .main { --t-sm: 14px; --lh-sm: 20px; --t-md: 15px; --lh-md: 21px; --t-lg: 17px; --lh-lg: 24px; font-size: var(--t-md); line-height: var(--lh-md); }
.is-today .block { margin-top: 28px; } /* v10 (Oct 17): body 15, asks 16, labels 14, headings 17, cards 28 apart, nothing bold */
.composer-wrap { margin-top: 24px; display: flex; flex-direction: column; }
.composer-wrap .composer { order: 1; }
.composer-wrap .chips { order: 2; }
.composer-wrap .toast { order: 3; }
.composer {
  background: var(--surface-2); border-radius: var(--r-lg); box-shadow: var(--shadow-lg);
  padding: 12px 8px 8px 16px;
}
.composer textarea {
  display: block; width: 100%; min-height: 26px; max-height: 40vh; resize: none; border: 0; padding: 0 10px 0 0; background: none; outline: 0;
  color: var(--text); font: inherit; font-size: var(--t-lg); line-height: 26px; letter-spacing: var(--tr-snug);
}
@media (min-width: 760px) { .composer textarea { font-size: var(--t-md); line-height: var(--lh-md); min-height: 20px; } }
.composer textarea::placeholder { color: var(--text-3); }
.composer-row { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.composer-row .hint { font-size: var(--t-sm); color: var(--text-3); }
.tool { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; color: var(--text-2); }
.tool:hover { background: var(--hover); color: var(--text); }
.tool.listening { color: var(--accent-ink); background: var(--accent-soft); }
.composer-row .tool { margin-left: auto; }
.composer-row .tool[hidden] + .send, .composer-row .hint + .send { margin-left: auto; }
.composer-row .tool:not([hidden]) + .send { margin-left: 0; }
.send { width: 32px; height: 32px; flex: none; display: grid; place-items: center; border-radius: 50%; background: var(--btn); color: var(--btn-text); opacity: .22; transition: opacity .15s; }
.send svg.i { stroke-width: 2.2; }
.has-text .send { opacity: 1; }
.chips { display: flex; gap: 8px; margin-top: 12px; overflow-x: auto; scrollbar-width: none; }
.chips::-webkit-scrollbar { display: none; }
.chip { flex: none; display: inline-flex; align-items: center; gap: 8px; height: 32px; padding: 0 12px 0 8px; border-radius: var(--r-pill); color: var(--text-2); font-size: var(--t-md); background: var(--hover-2); }
.chip:hover { color: var(--text); background: color-mix(in srgb, var(--text) 12%, transparent); }
.chip img.mark { width: 16px; height: 16px; border-radius: var(--r-xs); }
.chip.plain { padding-left: 12px; }
.toast { min-height: 20px; margin: 12px 4px 0; font-size: var(--t-sm); color: var(--text-3); }
/* Phone: the composer sits at the bottom, under the thumb. */
@media (max-width: 759px) {
  .composer-wrap {
    position: fixed; z-index: 20; left: 0; right: 0; bottom: 0; margin: 0;
    padding: 18px 12px calc(10px + env(safe-area-inset-bottom));
    background: linear-gradient(to bottom, transparent, var(--bg) 22px);
  }
  .composer-wrap .chips { order: 0; }
  .composer { display: flex; align-items: flex-end; gap: 4px; border-radius: var(--r-lg); padding: 8px 8px 8px 16px; }
  .composer textarea { flex: 1; min-width: 0; padding: 4px 0; }
  .composer-row { margin-top: 0; }
  .composer-row .hint { display: none; }
  .chips { display: none; margin: 0 0 10px; }
  .composer-wrap:focus-within .chips { display: flex; }
  .toast { position: absolute; left: 28px; right: 28px; top: -8px; margin: 0; text-align: center; }
}

/* ---------- Today: the blocks ---------- */
.idea { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; padding: 16px; }
.idea img.mark { width: 48px; height: 48px; border-radius: var(--r-md); }
.eyebrow { font-size: var(--t-sm); line-height: var(--lh-sm); color: var(--text-3); }
.idea h3 { margin: 4px 0; font-size: var(--t-lg); line-height: var(--lh-lg); font-weight: var(--w-medium); letter-spacing: var(--tr-body); }
.idea h3 a:hover { text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
.idea p { max-width: 54ch; font-size: var(--t-md); line-height: var(--lh-md); color: var(--text-body); }
.idea .actions { margin-top: 16px; }
@media (max-width: 759px) {
  .idea { grid-template-columns: 1fr; gap: 12px; padding: 12px; }
  .idea img.mark { width: 40px; height: 40px; border-radius: var(--r-sm); }
}
.gone { display: flex; align-items: center; min-height: 44px; padding: 0 12px; color: var(--text-3); font-size: var(--t-sm); }
.gone button { color: var(--text); margin-left: 6px; text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }

/* to-dos: a round check, ticked in place */
.todo { position: relative; display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; align-items: start; column-gap: 12px; padding: 12px; border-radius: var(--r-sm); cursor: pointer; }
.todo:hover { background: var(--hover); }
.check { flex: none; width: 16px; height: 16px; margin-top: 2px; border: 1.5px solid var(--line-2); border-radius: 50%; display: grid; place-items: center; transition: background .15s, border-color .15s; }
.todo:hover .check { border-color: var(--text-3); }
.check svg.i { width: 10px; height: 10px; stroke-width: 3; opacity: 0; color: var(--btn-text); }
.todo.done .check { background: var(--text); border-color: var(--text); }
.todo.done .check svg.i { opacity: 1; }
.todo.done .tx { color: var(--text-3); text-decoration: line-through; text-decoration-color: var(--line-2); }
.todo .tx { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.todo.clamp .tx { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.todo img.mark { width: 16px; height: 16px; border-radius: var(--r-xs); margin-top: 2px; }
.todo .tx a { color: var(--text-2); text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
.todo .tx a:hover { color: var(--text); }
.todo-rm { flex: none; width: 24px; height: 24px; display: grid; place-items: center; border-radius: var(--r-xs); color: var(--text-3); }
.todo-rm:hover { color: var(--text); background: var(--hover-2); }
/* Where it goes next: its own column on a wide screen, shown on hover; its own line under the text on a phone. */
.todo-acts { display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin: -4px -4px -4px 0; }
.todo-acts button[data-move] { font: inherit; font-size: var(--t-sm); height: 28px; padding: 0 12px; border-radius: var(--r-pill); background: var(--hover-2); color: var(--text-2); white-space: nowrap; }
.todo-acts button[data-move]:hover { background: var(--line-2); color: var(--text); }
.todo-acts button.go { background: var(--btn); color: var(--btn-text); }
.todo-acts button.go:hover { background: var(--btn); color: var(--btn-text); opacity: .88; }
.todo-acts .todo-rm:hover { color: var(--bad); }
#todo .todo.leaving { opacity: 0; transition: opacity .25s; }
li.leaving > .todo { opacity: 0; transform: translateX(8px); transition: opacity .18s, transform .18s; }
@media (hover: hover) and (min-width: 700px) {
  .todo-acts { width: 196px; opacity: 0; pointer-events: none; transition: opacity .12s; }
  .todo:hover .todo-acts, .todo:focus-within .todo-acts { opacity: 1; pointer-events: auto; }
}
@media (hover: none), (max-width: 699px) {
  .todo-acts { grid-column: 2 / -1; justify-content: flex-start; margin: 8px 0 0; }
  .todo-acts .todo-rm { margin-left: auto; margin-right: -4px; color: var(--text-3); }
}
.todo-acts.solo { grid-column: auto; width: auto; margin: -4px -4px -4px 0; }
.sugg-head { padding: 12px 12px 4px; font-size: var(--t-sm); line-height: var(--lh-sm); color: var(--text-3); }
.sugg { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 8px 12px; }
.sugg .tx { min-width: 0; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.sugg .btn { height: 28px; font-size: var(--t-sm); background: var(--btn); color: var(--btn-text); }
.sugg:last-child { padding-bottom: 12px; }
.todo-fresh { display: flex; align-items: baseline; gap: 10px; }
.todo-fresh button { font: inherit; color: var(--text); text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
.todo-add { display: flex; align-items: center; gap: 12px; padding: 12px; }
.todo-add .plus { width: 16px; height: 16px; display: grid; place-items: center; color: var(--text-3); }
.todo-add input { flex: 1; min-width: 0; border: 0; background: none; color: var(--text); font: inherit; font-size: max(16px, 14px); line-height: var(--lh-lg); padding: 0; outline: 0; }
@media (min-width: 760px) { .todo-add input { font-size: var(--t-md); } }
.todo-add input::placeholder { color: var(--text-3); }

/* this week (Shopify's metric strip) — a mirror, not a scoreboard */
.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.card > .stats + .strip { margin-top: 0; }
.stat { padding: 12px; }
.stat .k { font-size: var(--t-sm); line-height: var(--lh-sm); color: var(--text-2); white-space: nowrap; }
.stat .v { margin-top: 4px; font-size: var(--t-2xl); line-height: var(--lh-2xl); font-weight: var(--w-medium); letter-spacing: var(--tr-tight); font-variant-numeric: tabular-nums; }
.stat .d { font-size: var(--t-sm); line-height: var(--lh-sm); color: var(--text-3); white-space: nowrap; }
.strip { display: grid; grid-template-columns: repeat(28, minmax(0, 1fr)); gap: 2px; padding: 12px 12px 4px; }
.strip i { aspect-ratio: 1; border-radius: var(--r-2xs); background: var(--hover-2); }
.strip i[data-l="1"] { background: color-mix(in srgb, var(--text) 22%, transparent); }
.strip i[data-l="2"] { background: color-mix(in srgb, var(--text) 42%, transparent); }
.strip i[data-l="3"] { background: color-mix(in srgb, var(--text) 56%, transparent); }
.strip i[data-l="4"] { background: color-mix(in srgb, var(--text) 80%, transparent); }
.strip i.today { box-shadow: 0 0 0 1.5px var(--surface), 0 0 0 2.5px var(--accent); }
.strip-labels { display: flex; justify-content: space-between; padding: 4px 12px 12px; font-size: var(--t-sm); line-height: var(--lh-sm); color: var(--text-3); }

/* projects in motion (Linear's project list) */
.proj { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 8px; padding-left: 12px; border-radius: var(--r-sm); }
.proj .t { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.proj .t b { flex: none; font-weight: var(--w-medium); }
.proj .t b a:hover { text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
.proj .t span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-2); }
.proj .s { display: flex; align-items: center; gap: 8px; font-size: var(--t-sm); color: var(--text-3); font-variant-numeric: tabular-nums; white-space: nowrap; }
.proj .menu { width: 28px; height: 28px; display: grid; place-items: center; border-radius: var(--r-sm); color: var(--text-3); }
.proj .menu:hover, .proj.open .menu { background: var(--hover-2); color: var(--text); }
.proj .acts { grid-column: 1 / -1; display: none; gap: 8px; padding: 2px 0 4px; }
.proj.open .acts { display: flex; }
.proj.gone { display: flex; }
/* Threads on Today (v10, Oct 17): two lines a row, the ask (or where it stands) then the thread small under it.
   The whole row opens where the work lives; Later, Pause and Remove take the link's place on hover. */
.thrs { display: flex; flex-direction: column; gap: 8px; }
.thr { --btn: 32px; display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 12px; row-gap: 2px; padding: 14px 16px; border-radius: var(--r-md); background: var(--surface); color: var(--text); transition: background .15s; }
.thrs .thr:hover { background: var(--hover-2); }
.thr .tx { font-size: 16px; line-height: 22px; overflow-wrap: anywhere; }
.thr .tn { grid-column: 1 / -1; font-size: var(--t-sm); line-height: var(--lh-sm); color: var(--text-3); }
.thr .go { grid-row: 1; grid-column: 2; display: inline-flex; align-items: center; gap: 4px; height: 22px; font-size: var(--t-sm); color: var(--text-3); white-space: nowrap; font-variant-numeric: tabular-nums; }
.thr:hover .go { color: var(--accent); }
.thr .acts { display: none; grid-row: 1; grid-column: 2; margin: calc((22px - var(--btn)) / 2) -6px; }
.ib { display: grid; place-items: center; width: var(--btn, 32px); height: var(--btn, 32px); padding: 0; border: 0; background: none; color: var(--text-3); cursor: pointer; }
.ib:hover { color: var(--text); }
@media (hover: hover) { .thr:hover .acts { display: flex; } .thr:hover .go { visibility: hidden; } }
/* Drag a thread to reorder it or move it between the lists: the row you hold fades, a copy follows the pointer, a
   blue bar marks where it lands, and an empty list lights up */
.thr { -webkit-user-select: none; user-select: none; -webkit-user-drag: none; }
.thr.dragging { opacity: .35; }
.thr.ghost, .thr.quiet.ghost { opacity: .96; background: var(--surface-2); box-shadow: var(--shadow-pop); border-radius: var(--r-md); cursor: grabbing; }
.drop-line { display: none; position: fixed; z-index: 59; height: 2px; border-radius: 1px; background: var(--accent); pointer-events: none; }
/* Moving without me: the same two lines in one card, a step greyer */
.thr.quiet { padding: 10px 12px; border-radius: var(--r-sm); background: none; }
.thr.quiet + .thr.quiet { margin-top: 4px; }
.thr.quiet:hover { background: var(--hover); }
.thr.quiet .tx { color: var(--text-2); }
/* Today on a wide screen: the main column and a rail on the right (today-client.js builds them) */
@media (min-width: 1280px) {
  .main[data-w="split"] { max-width: 1240px; display: grid; grid-template-columns: minmax(0, 1fr) 360px; column-gap: 48px; align-items: start; }
  .main[data-w="split"] .split-rail { position: sticky; top: 64px; }
  .main[data-w="split"] .split-rail > .block:first-child { margin-top: 0; }
  /* Add a note at the top of the rail: one line, the send button inside it, like the phone's; no chips */
  .split-rail .composer-wrap { margin-top: 0; }
  .split-rail .composer { display: flex; align-items: flex-end; gap: 4px; box-shadow: none; background: var(--surface); border-radius: var(--r-md); padding: 6px 6px 6px 14px; }
  .split-rail .composer textarea { flex: 1; min-width: 0; padding: 4px 0; font-size: var(--t-md); line-height: var(--lh-md); }
  .split-rail .composer-row { margin-top: 0; }
  .split-rail .composer-row .hint, .split-rail .chips { display: none !important; }
  .split-rail .composer .tool, .split-rail .composer .send { width: 28px; height: 28px; }
  .split-rail .composer-wrap + .block { margin-top: 28px; }
  .split-rail .toast { min-height: 0; margin-top: 8px; }
  .split-rail .toast:empty { display: none; }
}
.proj .sess { color: var(--text-2); }
.proj .sess:hover { color: var(--text); text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
/* Live on Today: the local servers running on the Mac, each one tap to open */
.live-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border-radius: var(--r-sm); color: var(--text); }
.live-row:hover { background: var(--hover-2); }
.live-row .ln { display: flex; flex-direction: column; min-width: 0; }
.live-row .ln span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.live-row small { font-size: var(--t-sm); line-height: var(--lh-sm); color: var(--text-3); }
.live-row .port { flex: none; font-size: var(--t-sm); color: var(--text-3); font-variant-numeric: tabular-nums; }
.live-row:hover .port { color: var(--accent); }
@media (max-width: 759px) {
  .proj { align-items: start; }
  .proj img.mark { margin-top: 1px; }
  .proj .t { flex-direction: column; gap: 1px; }
  .proj .t span { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .proj.open-row .t { grid-template-columns: minmax(0, 1fr); }
  .proj .sess, #live { display: none; } /* claude:// and localhost links only open on the Mac */
}

/* the receipt: what came in, and where it went */
.land { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 12px; padding: 12px; border-radius: var(--r-sm); }
.land .when { font-size: var(--t-sm); line-height: var(--lh-sm); color: var(--text-3); font-variant-numeric: tabular-nums; padding-top: 1px; }
.land .what { color: var(--text); overflow-wrap: anywhere; }
.land .to { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: var(--t-sm); line-height: var(--lh-sm); color: var(--text-3); }
.land .to img.mark { width: 16px; height: 16px; border-radius: var(--r-xs); }
.land .to a:hover { color: var(--text); }
.land.fresh .to, .land .to.wait { color: var(--accent); }
@media (max-width: 759px) { .land { grid-template-columns: 1fr; gap: 2px; } }

.foot-note { margin-top: 48px; font-size: var(--t-sm); line-height: var(--lh-sm); color: var(--text-3); text-align: center; }

@media (prefers-reduced-motion: no-preference) {
  /* backwards, not both: a transform left on after the rise makes the article the containing block for the fixed rail */
  .main > * { animation: rise .32s cubic-bezier(.2,.8,.2,1) backwards; }
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
.ptile { margin: 0; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.pmedia, .phero { position: relative; display: block; aspect-ratio: 16 / 10; overflow: hidden; border-radius: var(--r-md); background: var(--surface); }
.pmedia video, .pmedia img, .phero video, .phero img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; transform: scale(var(--z, 1)); transition: transform .5s cubic-bezier(.2,.8,.2,1); }
.pmedia:hover video, .pmedia:hover img { transform: scale(calc(var(--z, 1) * 1.015)); }
/* A live site, drawn at a computer's width and scaled to fit the tile. Looked at, never clicked. */
:is(.pmedia, .phero) .site { position: absolute; inset: 0; overflow: hidden; background: var(--surface); }
:is(.pmedia, .phero) .site iframe { position: absolute; left: 0; top: 0; width: 1440px; height: 900px; border: 0; transform-origin: 0 0; transform: scale(var(--s, .3)); pointer-events: none; background: transparent; }
/* No picture yet: the name, set large, so the grid still reads as work. */
:is(.pmedia, .phero) .name { position: absolute; inset: 0; display: flex; align-items: flex-end; padding: 20px; background: linear-gradient(160deg, var(--surface-2), var(--surface)); }
:is(.pmedia, .phero) .name span { font-size: clamp(20px, 2vw, 28px); line-height: 1.1; font-weight: var(--w-medium); letter-spacing: -0.03em; color: var(--text-2); text-wrap: balance; }
.ptile { position: relative; }
.pmedia .name { justify-content: space-between; gap: 16px; transition: background .2s; }
.pmedia .name .pdate { flex: none; font-size: var(--t-sm); line-height: var(--lh-sm); font-weight: var(--w-regular); letter-spacing: 0; color: var(--text-3); font-variant-numeric: tabular-nums; }
.pmedia:hover .name > span:first-child { color: var(--text); }
.pnote { position: absolute; top: 16px; right: 20px; font-size: var(--t-sm); color: var(--text-3); opacity: 0; transition: opacity .14s; }
.ptile:hover .pnote, .pnote:focus-visible { opacity: 1; }
.pnote:hover { color: var(--text); }
.saved-h { margin: 48px 0 12px; font-size: var(--t-sm); line-height: var(--lh-sm); font-weight: var(--w-regular); color: var(--text-3); }
.saved-h:first-of-type { margin-top: 0; }
@media (hover: none) { .pnote { opacity: 1; } }
.pcap { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 0 2px; font-size: var(--t-md); }
.ptitle { font-weight: var(--w-medium); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ptitle .arrow { color: var(--text-3); font-size: var(--t-sm); }
.ptitle:hover .arrow { color: var(--text); }
.pmeta { display: flex; gap: 8px; flex: none; font-size: var(--t-sm); color: var(--text-3); font-variant-numeric: tabular-nums; }
.pmeta a:hover { color: var(--text); }
/* A project note: the work at the top, the writing folded under it. */
.doc-project { max-width: 960px; }
.doc-project .page-head .actions { margin-top: 16px; }
.doc .phero { margin-top: 24px; }
.pinfo { margin-top: 20px; max-width: 640px; }
.pinfo .lede { margin: 0; font-size: var(--t-md); line-height: var(--lh-md); color: var(--text-body); }
.doc-notes { margin-top: 28px; }
.doc-notes + .doc-notes { margin-top: 10px; }
.doc-notes > summary { list-style: none; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; height: 28px; padding: 0 12px; border-radius: var(--r-pill); background: var(--hover-2); font-size: var(--t-md); color: var(--text-2); }
.doc-notes > summary::-webkit-details-marker { display: none; }
.doc-notes > summary:hover { color: var(--text); }
.doc-notes > summary::after { content: ""; width: 5px; height: 5px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: translateY(-1px) rotate(45deg); transition: transform .2s; }
.doc-notes[open] > summary::after { transform: translateY(1px) rotate(-135deg); }
.doc-notes > .prose { margin-top: 20px; }

/* ---------- note page (Linear's document) ---------- */
.doc { max-width: 640px; }
img.doc-mark { width: 40px; height: 40px; border-radius: var(--r-sm); margin-bottom: 16px; }
.doc .prose { margin-top: 24px; }
.doc-links { margin-top: 48px; }
.doc-links.doc-parts { margin: 32px 0 40px; }
.rows li.sub .row { padding-left: 32px; }
.rows li.sub .row .t b { font-weight: var(--w-regular); color: var(--text-2); }
@media (max-width: 599px) { .ptile .pmedia { aspect-ratio: 16 / 7; } }
.paths { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; font-size: var(--t-sm); line-height: var(--lh-sm); color: var(--text-3); }
.paths a:hover { color: var(--text); }
.paths .missing { color: var(--accent); }
/* Properties: a row of quiet chips under the title. Open, it edits them in place. */
.props { margin-top: 12px; }
.props > summary { list-style: none; cursor: pointer; display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.props > summary::-webkit-details-marker { display: none; }
.props > summary > span { display: inline-flex; align-items: center; height: 24px; padding: 0 8px; border-radius: var(--r-pill); font-size: var(--t-sm); color: var(--text-2); background: var(--hover-2); }
.props > summary > span:first-child { color: var(--text); }
.props > summary::after { content: "Edit"; height: 24px; display: inline-flex; align-items: center; padding: 0 8px; font-size: var(--t-sm); color: var(--text-3); opacity: 0; transition: opacity .14s; }
.props > summary:hover::after, .props[open] > summary::after { opacity: 1; }
.props[open] > summary::after { content: "Done"; }
@media (hover: none) { .props > summary::after { opacity: 1; } }
.props-body { display: flex; flex-direction: column; gap: 2px; margin-top: 12px; padding: 4px; background: var(--surface); border-radius: var(--r-md); }
.prop { display: grid; grid-template-columns: 96px 1fr; align-items: center; gap: 0 12px; min-height: 36px; padding: 0 8px; }
.prop-k { color: var(--text-3); font-size: var(--t-sm); }
.prop-ro span:last-child { color: var(--text-2); font-variant-numeric: tabular-nums; }
.prop-seg { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px 0; }
.prop-seg button { height: 24px; padding: 0 8px; border-radius: var(--r-pill); font-size: var(--t-md); color: var(--text-2); }
.prop-seg button:hover { color: var(--text); background: var(--hover); }
.prop-seg button[aria-pressed="true"] { color: var(--text); background: var(--hover-2); }
.prop-in { width: 100%; border: 0; background: none; padding: 0; color: var(--text); font: inherit; font-size: max(16px, 14px); line-height: var(--lh-lg); outline: 0; }
@media (min-width: 760px) { .prop-in { font-size: var(--t-md); } }
.prop-in::placeholder { color: var(--text-3); }
.prop-err { color: var(--accent); }
/* Section rail: "On this page", in the sheet's right margin when there's room. */
.rail { display: none; }
@media (min-width: 1360px) {
  .rail { display: flex; flex-direction: column; gap: 2px; position: fixed; top: 104px; right: 40px; width: 180px; max-height: calc(100dvh - 140px); overflow-y: auto; scrollbar-width: none; font-size: var(--t-md); }
  .rail::-webkit-scrollbar { display: none; }
  .rail.nofit { display: none; }
  .rail .rail-head { margin-bottom: 8px; color: var(--text-3); font-size: var(--t-sm); line-height: var(--lh-sm); }
  .rail a { padding: 4px 0 4px 12px; border-left: 1px solid var(--line); color: var(--text-3); font-size: var(--t-sm); line-height: var(--lh-sm); transition: color .15s, border-color .15s; }
  .rail a:hover { color: var(--text); }
  .rail a.on { color: var(--text); border-left-color: var(--text); }
}
.cut { margin: 24px 0 0; display: flex; flex-direction: column; gap: 10px; }
.cut img, .cut video { display: block; max-width: 100%; height: auto; border-radius: var(--r-md); background: var(--surface); }
.cut .ctx summary { color: var(--text-2); cursor: pointer; list-style: none; font-size: var(--t-md); }
.cut .ctx summary::-webkit-details-marker { display: none; }
.cut .ctx summary::before { content: "+"; display: inline-block; width: 1rem; color: var(--text-3); }
.cut .ctx[open] summary::before { content: "–"; }
.cut .ctx img { margin-top: 8px; }
.guide-strip { margin-top: 24px; display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 6px; }
.guide-strip img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--r-sm); background: var(--surface); }

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
.tile { position: relative; display: block; break-inside: avoid; margin: 0 0 16px; background: var(--surface); border-radius: var(--r-md); overflow: hidden; }
.tile .shot { position: relative; display: grid; align-items: center; min-height: 72px; background: var(--hover); }
.tile img, .tile video, .tile .blank { display: block; width: 100%; height: auto; }
.tile .blank { aspect-ratio: 4 / 3; }
.tile.tall img { max-height: 460px; object-fit: cover; object-position: top; }
.tile.tall .shot::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 56px; background: linear-gradient(to bottom, transparent, var(--surface)); pointer-events: none; }
.tile .cap { padding: 12px; display: flex; flex-direction: column; gap: 2px; }
.tile .line { display: flex; align-items: baseline; gap: 8px; }
.tile .said { color: var(--text); font-weight: var(--w-medium); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tile .rm { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; display: grid; place-items: center; padding: 0; border: 0; border-radius: 50%; color: #fff; background: rgb(0 0 0 / .5); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); opacity: 0; transition: opacity .14s, background .14s; }
.tile .rm svg { width: 12px; height: 12px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; }
.tile:hover .rm, .tile .rm:focus-visible { opacity: 1; }
.tile .rm:hover { background: rgb(0 0 0 / .72); }
.tile .from { display: flex; justify-content: space-between; gap: 8px; font-size: var(--t-sm); color: var(--text-3); }
.tile .from .who { display: flex; min-width: 0; }
.tile .from .site { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; color: var(--text-2); }
.tile .from .mo::before { content: "·"; margin: 0 .35rem; }
.tile .from .mo, .tile .from .when { flex: none; white-space: nowrap; }
.tile .from .fold { flex: none; margin-left: auto; color: var(--text-3); opacity: 0; transition: opacity .14s; white-space: nowrap; max-width: 9rem; overflow: hidden; text-overflow: ellipsis; }
.tile .from .fold.set { opacity: 1; }
.tile:hover .from .fold, .tile .from .fold:focus-visible { opacity: 1; }
.tile .from .fold:hover { color: var(--text); }
.tile .from .fold-in { flex: none; margin-left: auto; width: 8rem; height: 24px; padding: 0 8px; border: 0; border-radius: var(--r-xs); outline: 0; font: inherit; color: var(--text); background: var(--surface-2); }
.tile.leaving { opacity: 0; transform: scale(.97); transition: opacity .18s ease-out, transform .18s ease-out; }
@media (hover: none) { .tile .rm, .tile .from .fold { opacity: 1; } }

/* ---------- dialogs: search (⌘K), the inbox receipt (⌘⇧I), typography ---------- */
.scrim { position: fixed; inset: 0; z-index: 60; display: none; background: var(--scrim); padding: 14vh 16px 0; }
.scrim.open { display: block; animation: fade .14s ease-out; }
@keyframes fade { from { opacity: 0; } }
.palette { width: min(560px, 100%); margin: 0 auto; background: var(--surface-2); border-radius: var(--r-md); box-shadow: var(--shadow-pop); overflow: hidden; }
.palette input { width: 100%; height: 48px; padding: 0 16px; border: 0; font: inherit; font-size: var(--t-lg); color: var(--text); background: transparent; outline: 0; }
.palette input::placeholder { color: var(--text-3); }
.results { max-height: 52vh; overflow-y: auto; padding: 4px; }
.result { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 8px 12px; border-radius: var(--r-sm); line-height: var(--lh-md); }
.result:hover, .result.cursor { background: var(--hover-2); }
.result small { display: block; color: var(--text-3); font-size: var(--t-sm); line-height: var(--lh-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 40ch; }
.result .kind { color: var(--text-3); font-size: var(--t-sm); white-space: nowrap; }
.no-hits { padding: 20px; text-align: center; color: var(--text-3); }
.rc { width: min(640px, 100%); }
.rc-head { display: flex; justify-content: space-between; align-items: baseline; padding: 16px 16px 8px; font-weight: var(--w-medium); }
.rc-head span { color: var(--text-3); font-weight: var(--w-body); font-size: var(--t-sm); }
.rc-head a { color: var(--text-3); font-weight: var(--w-body); font-size: var(--t-sm); }
.rc-head a:hover { color: var(--text); }
.rc .lands { max-height: 60vh; overflow-y: auto; padding: 4px; }

/* Ideas: one line each in the same card as every other list; choices take the group's place on hover. */
.ideas { list-style: none; margin: 0; padding: 0; }
.iline { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 0 12px; border-radius: var(--r-sm); transition: opacity .18s, transform .18s; }
.iline:hover { background: var(--hover); }
.iline.leaving { opacity: 0; transform: translateX(8px); }
.iline-t { display: flex; align-items: baseline; gap: 8px; min-width: 0; padding: 12px 0; }
.iline-t b { flex: none; font-weight: var(--w-medium); font-size: var(--t-md); color: var(--text); }
.iline-t span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--t-sm); color: var(--text-3); }
.iline-end { display: grid; justify-items: end; align-items: center; }
.iline-end > * { grid-area: 1 / 1; }
.iline-g { font-size: var(--t-sm); color: var(--text-3); }
.iline-acts { display: flex; gap: 4px; }
.iline-acts button { font: inherit; font-size: var(--t-sm); height: 28px; padding: 0 12px; border: 0; border-radius: var(--r-pill); background: var(--hover-2); color: var(--text-2); cursor: pointer; }
.iline-acts button:hover { background: var(--line-2); color: var(--text); }
.iline-acts button.go { background: var(--btn); color: var(--btn-text); }
.iline-acts button.go:hover { background: var(--btn); opacity: .88; }
.iline-acts button[data-act="trash"]:hover { color: var(--bad); }
@media (hover: hover) and (min-width: 700px) {
  .iline-acts { opacity: 0; pointer-events: none; transition: opacity .12s; }
  .iline:hover .iline-acts, .iline:focus-within .iline-acts { opacity: 1; pointer-events: auto; }
  .iline:hover .iline-g, .iline:focus-within .iline-g { visibility: hidden; }
}
@media (max-width: 699px) {
  .iline { grid-template-columns: minmax(0, 1fr); gap: 0; padding-bottom: 12px; }
  .iline-t { flex-direction: column; gap: 2px; padding: 12px 0 8px; }
  .iline-t span { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .iline-g { display: none; }
  .iline-end { justify-items: start; }
}
`;

/* ---------- /vault.css, for the standalone pieces in /pages/ ---------- */
// The older furniture, redrawn in the new tokens. The column, the way home, the day/night
// switch, the note head, list rows and the section rail work as they always did.
export const PAGE_CSS = TOKENS + LEGACY + PROSE + SLIDER + `
body { font-size: var(--t-md); line-height: 1.43; }
.frame { position: relative; max-width: 680px; margin: 0 auto; padding: 80px 0 96px; }
.frame > .up { position: absolute; top: 40px; left: 0; display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 11px 0 9px; margin-left: -9px; border-radius: var(--r-pill); color: var(--text-2); font-size: var(--t-md); }
.frame > .up::before { content: "←"; font-size: var(--t-md); }
.frame > .up:hover { color: var(--text); background: var(--hover); }
.frame.wide { max-width: 1180px; padding-left: 24px; padding-right: 24px; }
.frame.wide > .up { left: 24px; }
.frame > .sw { position: absolute; top: 40px; right: 0; width: 28px; height: 28px; border-radius: var(--r-sm); color: var(--text-2); z-index: 2; }
.frame > .sw:hover { color: var(--text); background: var(--hover); }
.sw svg { position: absolute; left: 6px; top: 6px; width: 16px; height: 16px; transition: opacity .45s cubic-bezier(.4,0,.2,1), transform .45s cubic-bezier(.4,0,.2,1); }
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
.head h1, .note-head h1 { font-size: var(--t-title); line-height: var(--lh-title); font-weight: var(--w-medium); letter-spacing: var(--tr-snug); text-wrap: balance; }
.head .sub, .note-head .sub { margin-top: 4px; color: var(--text-3); font-size: var(--t-sm); line-height: var(--lh-sm); }
.note-head .sub span + span::before { content: "·"; margin: 0 .45rem; }
.head .intro { margin-top: 20px; display: flex; flex-direction: column; gap: 8px; }
.note-head .path { margin-top: 4px; color: var(--text-3); }
.prose { margin-top: 24px; }
.section { padding-top: 48px; }
.section-title { color: var(--text); font-weight: var(--w-medium); font-size: var(--t-md); margin-bottom: 10px; }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.group { position: relative; padding: 8px 0; }
.group-label { position: absolute; left: 0; top: 14px; color: var(--text-3); line-height: var(--lh-md); white-space: nowrap; max-width: 6rem; overflow: hidden; text-overflow: ellipsis; }
.group ul { list-style: none; margin: 0; padding: 0; }
.entry { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 6px 0 6px 6.75rem; line-height: var(--lh-md); }
.entry .t { color: var(--text); min-width: 0; }
.entry .m { color: var(--text-3); white-space: nowrap; }
a.entry:hover .t { text-decoration: underline; text-decoration-color: var(--line-2); text-underline-offset: 3px; }
@media (max-width: 520px) { .entry { padding-left: 3rem; } .group-label { max-width: 2.6rem; } }
.rail { position: fixed; top: 86px; left: calc(50% - 340px - 4.5rem - 176px); width: 176px; display: flex; flex-direction: column; gap: 2px; text-align: right; max-height: calc(100vh - 114px); overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none; font-size: var(--t-md); }
.rail::-webkit-scrollbar { display: none; }
.rail a { flex: none; padding: 3px 12px 3px 0; border-right: 1px solid var(--line); color: var(--text-3); line-height: var(--lh-sm); transition: color .15s, border-color .15s; }
.rail a:hover { color: var(--text); }
.rail a.on { color: var(--text); border-right-color: var(--text); }
.rail a.home { border: 0; margin-bottom: 14px; color: var(--text-2); opacity: 0; pointer-events: none; transition: opacity .2s, color .15s; }
.rail a.home::before { content: "← "; }
.rail a.home.show { opacity: 1; pointer-events: auto; }
h2[id] { scroll-margin-top: 32px; }
@media (max-width: 1180px) { .rail { display: none; } }
`;
