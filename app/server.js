import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allNotes, byName, backlinks, section, isNow, invalidate, VAULT } from './vault.js';
import { render, headings, esc } from './markdown.js';
import { CSS, PAGE_CSS } from './style.js';
import { SETTINGS_JS, SETTINGS_PANEL, BOOT_JS } from './settings.js';
import { writeCutting, binCutting, setCuttingFolder, analyzeFolder, analysisState } from './cuttings.js';
import { setArchived } from './archive.js';
import { readTodos, setTodo, addTodo, removeTodo, moveTodo, startFresh, lineOfText, splitTodo } from './todo.js';
import { api, readInbox, hooks } from './api.js';
import { dotSvg, FAVICON_LINK } from './favicon.js';
import { schedule as scheduleSort, startSorter } from './sorter.js';
import { authorize, setCookie, TOKEN, sessionCookie } from './auth.js';
import { loginPage } from './login.js';
import { INTAKE_HTML, INTAKE_CSS, INTAKE_JS } from './intake.js';
import { capturePage, CAPTURE_MANIFEST, CAPTURE_SW } from './capture.js';
const FAVICON = readFileSync(new URL('./favicon.png', import.meta.url));
import { propsPanel, PROPS_JS } from './props.js';
import { todayData, readSorted } from './today.js';
import { allPages, homelessPages, pagesOf, pageFile, PAGE_TYPES } from './pages.js';
import { viewPage } from './view.js';
// The browser's side of every page, and of Today. Plain files, so they can be read as code.
const SHELL_JS = readFileSync(new URL('./shell-client.js', import.meta.url), 'utf8');
const TODAY_JS = readFileSync(new URL('./today-client.js', import.meta.url), 'utf8');

const PORT = process.env.PORT || 4700;
// fileURLToPath, not .pathname — this project's path contains a space, which .pathname percent-encodes
const FONT_DIR = fileURLToPath(new URL('./fonts/', import.meta.url));
const CANVAS_DIR = fileURLToPath(new URL('./canvas/', import.meta.url));
const LOOK_DIR = fileURLToPath(new URL('./look/', import.meta.url));

const HORIZON = { short: 'short-term', long: 'long-term', ongoing: 'ongoing' };
const KIND = { project: 'project', client: 'client', idea: 'idea', resource: 'resource', thought: 'thought', decision: 'decision', reference: 'reference', user: 'about me', feedback: 'about me', trip: 'trip', personal: 'personal', cutting: 'cutting', 'style-guide': 'style guide', journal: 'day', category: 'category', part: 'part' };

const long = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
const dm = (d) => d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "Oct 9" this year, "Oct 9, 2025" before it.
const shortDate = (d) => {
  if (!d) return '';
  const [y, m, day] = String(d).slice(0, 10).split('-');
  return `${MON[+m - 1]} ${+day}${y !== String(new Date().getFullYear()) ? ', ' + y : ''}`;
};
const year = (d) => (d || '').slice(0, 4);
const byUpdated = (a, b) => (b.updated || '').localeCompare(a.updated || '');
// A note with `page:` is only the index card for a full page in /pages/ — every link goes to the page.
const href = (n) => n.page || `/n/${encodeURIComponent(n.name)}`;

/* The day/night choice, shared by every page the reader serves and by any standalone piece
   in /pages/ that links /vault.js. One definition, so the two can never drift apart. */
export const THEME_JS = `
// Day or night: whatever was picked last sticks. Stored in localStorage and a cookie.
(function () {
  var root = document.documentElement;
  function saveTheme(m){try{localStorage.setItem('theme',m)}catch(e){}var d='';document.cookie='theme='+m+d+';path=/;max-age=31536000;samesite=lax'}
  var paint = function (mode) {
    root.dataset.mode = mode;
    var m = document.querySelector('meta[name=theme-color]'); if (m) m.content = mode === 'light' ? '#ffffff' : '#0f0f0f';
    var i = document.querySelector('link[rel=icon]'); if (i) i.href = mode === 'light' ? '/favicon-light.svg' : '/favicon.svg';
  };
  var c=(document.cookie.match(/(?:^|; )theme=(light|dark)/)||[])[1];if(!c){try{c=localStorage.getItem('theme')}catch(e){}}
  paint(c === 'light' ? 'light' : 'dark');
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('#themeSw, [data-theme-sw]')) return;
    var next = root.dataset.mode === 'light' ? 'dark' : 'light';
    root.classList.add('theming');
    clearTimeout(window.__theming);
    window.__theming = setTimeout(function () { root.classList.remove('theming'); }, 600);
    paint(next);
    saveTheme(next);
  });
})();

// The section rail. A long page opts in with data-rail on its .frame; the rail is built from the
// page's own h2s, so it can never list a section that isn't there. Styled by .rail in the CSS.
document.addEventListener('DOMContentLoaded', function () {
  // A note page in the reader asks the same way, with data-rail on its .doc; its rail is headed
  // "On this page" and sits in the sheet's right margin.
  var frame = document.querySelector('.frame[data-rail], .doc[data-rail]'); if (!frame) return;
  var isDoc = frame.classList.contains('doc');
  var heads = [].slice.call(frame.querySelectorAll('h2')); if (heads.length < 4) return;
  var nav = document.createElement('nav'); nav.className = 'rail'; nav.setAttribute('aria-label', 'Sections');
  if (isDoc) { var rh = document.createElement('span'); rh.className = 'rail-head'; rh.textContent = 'On this page'; nav.appendChild(rh); }
  var links = heads.map(function (h) {
    if (!h.id) h.id = h.textContent.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    var a = document.createElement('a'); a.href = '#' + h.id; a.textContent = h.textContent.trim(); nav.appendChild(a); return a;
  });
  // The way home scrolls off with the top of the page, and a long page is exactly where it's missed.
  // So the rail carries a copy of the page's own .up link, shown only once the real one is out of view.
  var up = frame.querySelector(':scope > .up'), home = null;
  if (up) { home = document.createElement('a'); home.className = 'home'; home.href = up.getAttribute('href'); home.textContent = up.textContent; nav.insertBefore(home, nav.firstChild); }
  frame.appendChild(nav);
  var mark = function () {
    if (home) home.classList.toggle('show', up.getBoundingClientRect().bottom < 0);
    var line = innerHeight * 0.3, on = 0;
    heads.forEach(function (h, i) { if (h.getBoundingClientRect().top <= line) on = i; });
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) on = heads.length - 1;
    links.forEach(function (a, i) { a.classList.toggle('on', i === on); });
    // If the rail is scrolling inside itself, bring the current section into its window.
    var a = links[on], top = a.offsetTop, room = nav.clientHeight;  // the rail is fixed, so it is its links' offset parent
    if (nav.scrollHeight > room) {
      if (top - 26 < nav.scrollTop) nav.scrollTop = Math.max(0, top - 26);
      else if (top + 46 > nav.scrollTop + room) nav.scrollTop = top + 46 - room;
    }
  };
  // The rail is fixed to the window's right edge, so a narrow window or a wide column puts it on top of
  // the text. It only shows when it clears the column's right edge.
  var col = frame.querySelector('.prose') || frame;
  var fit = function () {
    nav.classList.remove('nofit');
    if (getComputedStyle(nav).display === 'none') return;
    nav.classList.toggle('nofit', nav.getBoundingClientRect().left < col.getBoundingClientRect().right + 32);
  };
  addEventListener('scroll', mark, { passive: true }); addEventListener('resize', function () { fit(); mark(); }); fit(); mark();
  if (document.fonts) document.fonts.ready.then(fit);
  addEventListener('animationend', fit);  // the page's rise moves the rail while it plays
  new MutationObserver(fit).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
});

// What a page remembers. Kept in the vault (pages/_state/<page>.json), so a pick made on the phone is there on the
// desk, and Claude can read it:  var picks = await vault.state.get('picks');  vault.state.set('picks', picks);
// A burst of set()s goes out as one save. Off the vault (a file opened from disk) it keeps to this browser.
(function () {
  var base = '/api/page-state?page=' + encodeURIComponent(location.pathname), key = 'vault.state:' + location.pathname;
  var all = null, pending = {}, timer = 0;
  function local() { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; } }
  function keep(s) { try { localStorage.setItem(key, JSON.stringify(s)); } catch (e) {} }
  function load() {
    return all || (all = fetch(base, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (s) { keep(s); return s; }, local));
  }
  function flush() {
    var p = pending; pending = {}; clearTimeout(timer);
    if (Object.keys(p).length) fetch(base, { method: 'PATCH', keepalive: true, credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(p) }).catch(function () {});
  }
  window.vault = window.vault || {};
  window.vault.state = {
    get: function (k) { return load().then(function (s) { return k == null ? s : s[k]; }); },
    set: function (k, v) {
      return load().then(function (s) {
        if (v == null) delete s[k]; else s[k] = v;
        keep(s); pending[k] = v == null ? null : v;
        clearTimeout(timer); timer = setTimeout(flush, 400);
        return v;
      });
    },
  };
  addEventListener('pagehide', flush);
})();

// Sliders (SLIDER in style.js): the bar fills blue up to the value. CSS can't read a range's value, so --f carries
// it, 0 to 1: set as each slider lands in the page, on every drag, and whenever a script sets .value.
(function () {
  function fill(i) {
    var lo = i.min === '' ? 0 : +i.min, hi = i.max === '' ? 100 : +i.max;
    i.style.setProperty('--f', hi > lo ? Math.min(1, Math.max(0, (+i.value - lo) / (hi - lo))) : 0);
  }
  var d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  Object.defineProperty(HTMLInputElement.prototype, 'value', { configurable: true, enumerable: d.enumerable, get: d.get,
    set: function (v) { d.set.call(this, v); if (this.type === 'range') fill(this); } });
  addEventListener('input', function (e) { if (e.target.type === 'range') fill(e.target); }, true);
  function sweep(n) {
    if (n.type === 'range') fill(n);
    else if (n.querySelectorAll) [].forEach.call(n.querySelectorAll('input[type="range"]'), fill);
  }
  new MutationObserver(function (ms) { ms.forEach(function (m) { [].forEach.call(m.addedNodes, sweep); }); })
    .observe(document.documentElement, { childList: true, subtree: true });
})();

// Notes on anything (⌥N, or Pin note in the menu): notes-layer.js, for Claude to fix. Editing the words in place
// (⌥E, or Edit page in the menu): edit-layer.js. Both loaded on every vault page.
(function () {
  if (navigator.webdriver || self !== top) return;
  ['/notes-layer.js', '/edit-layer.js'].forEach(function (src) {
    var s = document.createElement('script'); s.src = src; s.async = true;
    (document.head || document.documentElement).appendChild(s);
  });
})();
`;

/* ---------- shell ---------- */
// Every page: the sidebar on a computer, the top bar and a drawer on a phone, the page on its sheet.

const ICON = {
  today: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  todo: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  projects: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  ideas: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>',
  thinking: '<path d="M12 20h9"/><path d="M16.4 3.6a2.1 2.1 0 0 1 3 3L7.4 18.6a2 2 0 0 1-.9.5l-2.9.8.8-2.9a2 2 0 0 1 .5-.8z"/>',
  resources: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  clients: '<rect width="20" height="14" x="2" y="6" rx="2"/><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  cuttings: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1 12 12M20 4 8.1 15.9M14.8 14.8 20 20"/>',
  personal: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  menu: '<path d="M4 7h16M4 12h10M4 17h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pin: '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  type: '<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  link: '<path d="M7 17 17 7M8 7h9v9"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
};
const svg = (k, cls = '') => `<svg class="i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
const themeSw = `<button type="button" class="icon-btn" data-theme-sw aria-label="Switch day and night">${svg('sun', 'i-sun')}${svg('moon', 'i-moon')}</button>`;

const NAV = [
  ['today', 'Today', '/'], ['inbox', 'Inbox', '/inbox'], ['todo', 'To do', '/todo'],
  ['projects', 'Projects', '/projects'], ['ideas', 'Ideas', '/ideas'], ['thinking', 'Thinking', '/thinking'],
  ['resources', 'Resources', '/resources'], ['clients', 'Clients', '/clients'], ['cuttings', 'Cuttings', '/cuttings'],
  ['personal', 'Personal', '/personal'],
];
const TITLE = Object.fromEntries(NAV.map(([k, t]) => [k, t]));

// Counts beside the nav: how much is there, never how much is late. The inbox only shows one
// while something is waiting to be sorted.
function navCounts(notes) {
  const live = notes.filter((n) => !n.archived);
  const on = (s) => live.filter((n) => section(n) === s);
  const t = readTodos();
  return {
    inbox: (readInbox().length + homelessPages(notes).length) || '',
    todo: t ? t.items.filter((i) => !i.done && i.tier === 'today').length || '' : '',
    projects: on('projects').filter((n) => n.status === 'active').length,
    ideas: on('ideas').length, thinking: on('thinking').length, resources: on('resources').length,
    clients: on('clients').filter((n) => n.status !== 'past').length, cuttings: on('cuttings').length,
  };
}

function sidebar(notes, here, base) {
  const c = navCounts(notes);
  const item = ([k, label, path]) => `<a href="${k === 'cuttings' ? path : base + path}"${k === here ? ' class="on" aria-current="page"' : ''}>${svg(k)}${label}${c[k] ? `<span class="n">${c[k]}</span>` : ''}</a>`;
  return `
  <aside class="side" id="side" aria-label="Vault">
    <div class="brand">
      Vault
      <button class="icon-btn" type="button" data-search aria-label="Search" title="Search  ⌘K">${svg('search')}</button>
    </div>
    <button class="new" type="button" data-capture>${svg('plus')}Capture<kbd>⌘I</kbd></button>
    <button class="new" type="button" data-fixnote>${svg('pin')}Pin note<kbd>⌥N</kbd></button>
    <button class="new" type="button" data-editpage>${svg('edit')}Edit page<kbd>⌥E</kbd></button>
    <nav class="nav">
      ${NAV.slice(0, 3).map(item).join('')}
      <div class="nav-label">Library</div>
      ${NAV.slice(3).map(item).join('')}
    </nav>
    <div class="side-foot">
      <span class="clock" id="clock"></span>
      <button class="icon-btn" type="button" id="openSettings" aria-label="Typography" title="Typography">${svg('type')}</button>
      ${themeSw}
    </div>
  </aside>`;
}

function shell(title, body, { notes = [], here = '', wide = false, css = '', js = '', note = '', top = '', topMark = '', base = '', bodyClass = '' } = {}) {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#0f0f0f">
<title>${esc(title)}</title>
${FAVICON_LINK}
<link rel="apple-touch-icon" href="/favicon.png">
<link rel="stylesheet" href="/fonts/geist.css">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<script>${THEME_JS}</script>
<style>${CSS}${INTAKE_CSS}${css}</style>
<script>${BOOT_JS}</script>
</head><body${note ? ` data-note="${esc(note)}"` : ''}${bodyClass ? ` class="${bodyClass}"` : ''}>
<div class="app">
  ${sidebar(notes, here, base)}
  <div class="sheet">
    <header class="top" id="top">
      <button class="icon-btn" type="button" data-nav-open aria-label="Menu">${svg('menu')}</button>
      <a class="here" href="${base || '/'}">${topMark}<span>${esc(top || TITLE[here] || 'Vault')}</span></a>
      <button class="icon-btn" type="button" data-search aria-label="Search">${svg('search')}</button>
      ${themeSw}
    </header>
    <main class="main${wide ? ' wide' : ''}">${body}</main>
  </div>
</div>
<div class="nav-scrim" id="navScrim"></div>

<div class="scrim" id="scrim">
  <div class="palette" role="dialog" aria-label="Search notes">
    <input id="sq" type="text" placeholder="Search notes, or jump to…" autocomplete="off" spellcheck="false">
    <div class="results" id="sresults"></div>
  </div>
</div>
<div class="scrim" id="receipt"><div class="palette rc" role="dialog" aria-label="Inbox"></div></div>
${SETTINGS_PANEL}
${INTAKE_HTML}
<script>
${SHELL_JS}
${SETTINGS_JS}
${INTAKE_JS}
${js}
</script>
</body></html>`;
}

/* ---------- pieces ---------- */

const pageHead = ({ crumbs = [], title, sub = '', lede = '' }) => `
  <header class="page-head">
    ${crumbs.length ? `<nav class="crumbs">${crumbs.map(([t, h]) => h ? `<a href="${h}">${esc(t)}</a>` : `<span>${esc(t)}</span>`).join('<span class="sep">/</span>')}</nav>` : ''}
    <h1>${esc(title)}</h1>
    ${sub ? `<p class="sub">${sub}</p>` : ''}
    ${lede ? `<p class="lede">${lede}</p>` : ''}
  </header>`;

const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

// One row: a mark, the title with a line under it, a quiet fact on the right. The archive
// control is a sibling of the link, never inside it: a click on it must not navigate.
const row = (n, { sub = '', meta = '', dim = false, archivable = true } = {}) => `
  <li>
    <a class="row no-mark${dim ? ' dim' : ''}" href="${href(n)}">
      <span class="t"><b>${esc(n.title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</span>
      <span class="m">${n.studio ? '<span class="pill opt">Studio</span>' : ''}${n.nudged && !isNaN(new Date(n.nudged)) ? `<span class="dot" data-name="${esc(n.name)}" data-at="${esc(new Date(n.nudged).toISOString())}" title="Updated from your inbox" hidden></span>` : ''}${meta}</span>
    </a>
    ${archivable ? `<button class="arch" type="button" data-name="${esc(n.name)}" data-on="${n.archived ? '0' : '1'}">${n.archived ? 'Restore' : 'Archive'}</button>` : ''}
  </li>`;

const card = (rows, emptyHtml = '') => `<div class="card">${rows ? `<ul class="rows">${rows}</ul>` : emptyHtml}</div>`;
const blockHead = (title, n = '', end = '') => `<div class="block-head"><h2>${title}</h2>${n !== '' ? `<span class="n">${n}</span>` : ''}${end}</div>`;
const block = (title, items, toRow, { n, end = '', id = '' } = {}) => items.length ? `
  <section class="block"${id ? ` id="${id}"` : ''}>${blockHead(title, n ?? items.length, end)}${card(items.map(toRow).join(''))}</section>` : '';
// A block that starts folded: Shipped, Archive, Past, Done.
const foldBlock = (title, items, toRow) => items.length ? `
  <details class="block"><summary>${blockHead(title, items.length)}</summary>${card(items.map(toRow).join(''))}</details>` : '';
const emptyCard = (what, how) => `<div class="card"><div class="empty"><b>${what}</b><span>${how}</span></div></div>`;
const when = (d) => `<span>${shortDate(d)}</span>`;

/* ---------- Today ---------- */
// The home page. Its data is read live on every load (today.js); the page draws itself from it.

function todayPage(notes) {
  const data = todayData(notes);
  const body = `
  <section class="hello">
    <p class="date" id="date"></p>
    <h1 id="greet">Today</h1>
    <p class="brief" id="brief"></p>
  </section>

  <div class="composer-wrap" id="wrap">
    <p class="toast" id="toast" aria-live="polite"></p>
    <div class="chips" id="chips"></div>
    <form class="composer" id="composer">
      <textarea id="say" rows="1" placeholder="What's on your mind?" autocomplete="off" autocapitalize="sentences" enterkeyhint="send" aria-label="Capture"></textarea>
      <div class="composer-row">
        <span class="hint">Lands in the inbox. Sorted in a couple of minutes.</span>
        <button class="tool" id="mic" type="button" aria-label="Speak" hidden><svg class="i" viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4"/></svg></button>
        <button class="send" type="submit" aria-label="Send"><svg class="i" viewBox="0 0 24 24"><path d="m5 12 7-7 7 7M12 19V5"/></svg></button>
      </div>
    </form>
  </div>

  <section class="block" id="todo"></section>
  <section class="block" id="motion"></section>
  <section class="block" id="again"></section>
  <section class="block" id="week"></section>
  <section class="block" id="landed"></section>
  <p class="foot-note">Ticks, parks and let-gos write to the vault, and each one can be undone.</p>
  <script id="data" type="application/json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
  return shell('Today · Vault', body, { notes, here: 'today', js: TODAY_JS, bodyClass: 'has-composer' });
}

/* ---------- To do ---------- */

const todoText = (raw) => esc(raw.replace(/\s*\[\[[^\]]+\]\]/g, '')).replace(
  /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)/g,
  (_m, label, url, bare) => `<a href="${url || bare}" target="_blank" rel="noopener">${label || bare.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>`);

const todoBody = (raw) => {
  const { title, detail } = splitTodo(raw.replace(/\s*\[\[[^\]]+\]\]/g, '').trim());
  return `<span class="tt">${todoText(title)}</span>${detail ? `<span class="td">${todoText(detail)}</span>` : ''}`;
};

// The list in the order a day uses it: what's picked for today, then what to reach for if
// there's time, then what came in and needs a place, then everything kept for later.
// Every button works in place (TODO_JS): rows move between sections without a reload.
const TIER_ACTS = { today: ['time', 'later'], time: ['today', 'later'], new: ['today', 'time', 'later'], later: ['today', 'time'] };
const TIER_BTN = { today: 'Today', time: 'If time', later: 'Later' };
const todoActs = (tier, done) => `<span class="todo-acts${done ? ' solo' : ''}">${done ? '' : TIER_ACTS[tier].map((k) =>
  `<button type="button" data-move="${k}"${k === 'today' ? ' class="go"' : ''}>${TIER_BTN[k]}</button>`).join('')}<button class="todo-rm" type="button" aria-label="Delete">${svg('x')}</button></span>`;
function todoPage(notes) {
  const t = readTodos();
  const items = t ? t.items : [];
  const fresh = !!t?.fresh;
  const open = items.filter((i) => !i.done);
  const of = (k) => open.filter((i) => i.tier === k);
  const today = of('today');
  // Today keeps what got ticked today, struck through; older ticks go to Done.
  const todayDone = fresh ? items.filter((i) => i.done && i.tier === 'today') : [];
  const done = items.filter((i) => i.done && !todayDone.includes(i));
  const item = (i, tier) => `<li data-text="${esc(i.text)}"><div class="todo${i.done ? ' done' : ''}" role="checkbox" aria-checked="${i.done}" tabindex="0">
      <span class="check">${svg('check')}</span><span class="tx">${todoBody(i.text)}</span>${todoActs(tier, i.done)}
    </div></li>`;
  const list = (arr, tier) => `<ul class="rows">${arr.map((i) => item(i, tier)).join('')}</ul>`;
  const empty = (b, s) => `<div class="empty"><b>${b}</b><span>${s}</span></div>`;
  const stale = !fresh && today.length && t.picked;
  const picked = stale ? new Date(t.picked + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const fold = (tier, label, arr) => `<details class="block" data-tier="${tier}"${arr.length ? '' : ' hidden'}><summary>${blockHead(label, arr.length)}</summary><div class="card">${list(arr, tier)}</div></details>`;
  const body = `
  ${pageHead({ title: 'To do', sub: ' ' })}
  <section class="block" data-tier="today" style="margin-top:28px">
    ${blockHead('Today', today.length, stale ? `<p class="end todo-fresh">Picked ${picked}<button type="button" id="todoFresh">Start fresh</button></p>` : '')}
    <div class="card">
      <form class="todo-add"><span class="plus">${svg('plus')}</span><input type="text" placeholder="Add something for today" autocomplete="off" spellcheck="false" enterkeyhint="done" aria-label="Add a to-do"></form>
      ${list(today.concat(todayDone), 'today')}
      ${empty('Nothing picked yet.', 'Tap Today on anything below. The rest stays where it is.')}
    </div>
  </section>
  <section class="block" data-tier="new"${of('new').length ? '' : ' hidden'}>${blockHead('To sort', of('new').length, '<span class="end">Just came in</span>')}<div class="card">${list(of('new'), 'new')}</div></section>
  <section class="block" data-tier="time">${blockHead('If there’s time', of('time').length)}
    <div class="card">${list(of('time'), 'time')}${empty('Nothing waiting.', 'Send things here when they’re next in line.')}</div>
  </section>
  ${fold('later', 'Later', of('later'))}
  ${fold('done', 'Done', done)}
  <script>${TODO_JS}</script>`;
  return shell('To do · Vault', body, { notes, here: 'todo' });
}
const TODO_JS = `(function () {
  var ACTS = ${JSON.stringify(TIER_ACTS)}, BTN = ${JSON.stringify(TIER_BTN)};
  var X = ${JSON.stringify(svg('x'))}, CHECK = ${JSON.stringify(svg('check'))};
  var send = function (body) { return fetch('/todo/item', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var sec = function (k) { return document.querySelector('[data-tier="' + k + '"]'); };
  var acts = function (tier, done) {
    return '<span class="todo-acts' + (done ? ' solo' : '') + '">' + (done ? '' : ACTS[tier].map(function (k) {
      return '<button type="button" data-move="' + k + '"' + (k === 'today' ? ' class="go"' : '') + '>' + BTN[k] + '</button>'; }).join('')) +
      '<button class="todo-rm" type="button" aria-label="Delete">' + X + '</button></span>';
  };
  // Counts, empty states and the line under the title follow the rows as they move.
  function recount() {
    var n = {};
    ['today', 'new', 'time', 'later', 'done'].forEach(function (k) {
      var s = sec(k), rows = s.querySelectorAll('li'), open = s.querySelectorAll('.todo:not(.done)').length;
      n[k] = k === 'done' ? rows.length : open;
      var c = s.querySelector('.block-head .n'); if (c) c.textContent = n[k];
      var e = s.querySelector('.empty'); if (e) e.hidden = rows.length > 0;
      if (k === 'new' || k === 'later' || k === 'done') s.hidden = !rows.length;
    });
    var parts = [n.today ? n.today + ' for today' : 'Nothing picked for today', n.time && n.time + ' if there’s time', n['new'] && n['new'] + ' to sort', n.later && n.later + ' later'];
    document.querySelector('.page-head .sub').textContent = parts.filter(Boolean).join(' · ');
    var nav = document.querySelector('.side a[href$="/todo"]');
    if (nav) { var b = nav.querySelector('.n'); if (!b && n.today) { b = document.createElement('span'); b.className = 'n'; nav.append(b); } if (b) b.textContent = n.today || ''; }
  }
  // Slide out, move, slide in. The write happens first; if it fails the row stays put.
  function place(li, tier, top) {
    var ul = sec(tier).querySelector('ul');
    li.classList.add('leaving');
    setTimeout(function () {
      var done = li.querySelector('.todo').classList.contains('done');
      li.querySelector('.todo-acts').outerHTML = acts(tier, done);
      top ? ul.prepend(li) : ul.append(li);
      li.classList.remove('leaving');
      recount();
    }, 160);
  }
  var main = document.querySelector('.main') || document;
  main.addEventListener('click', function (e) {
    var li = e.target.closest('li[data-text]'); if (!li) return;
    var row = li.querySelector('.todo'), text = li.dataset.text;
    if (e.target.closest('a')) return;
    var mv = e.target.closest('[data-move]'), rm = e.target.closest('.todo-rm');
    if (li.busy) return;
    if (mv) { li.busy = true; send({ text: text, move: mv.dataset.move }).then(function () { place(li, mv.dataset.move); }).catch(function () {}).then(function () { li.busy = false; }); return; }
    if (rm) { li.busy = true; li.classList.add('leaving'); send({ text: text, remove: true }).then(function () { setTimeout(function () { li.remove(); recount(); }, 160); }).catch(function () { li.classList.remove('leaving'); li.busy = false; }); return; }
    if (e.target.closest('button')) return;
    var done = !row.classList.contains('done');
    li.busy = true; row.classList.toggle('done', done); row.setAttribute('aria-checked', done); recount();
    send({ text: text, done: done }).catch(function () { row.classList.toggle('done', !done); row.setAttribute('aria-checked', !done); recount(); }).then(function () { li.busy = false; });
  });
  main.addEventListener('keydown', function (e) {
    if ((e.key === ' ' || e.key === 'Enter') && e.target.classList && e.target.classList.contains('todo')) { e.preventDefault(); e.target.click(); }
  });
  var form = document.querySelector('form.todo-add');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = form.querySelector('input'), text = input.value.trim();
    if (!text) return;
    input.value = '';
    send({ add: text, move: 'today' }).then(function (r) {
      var li = document.createElement('li'); li.dataset.text = r.text;
      li.innerHTML = '<div class="todo" role="checkbox" aria-checked="false" tabindex="0"><span class="check">' + CHECK + '</span><span class="tx">' + esc(r.text) + '</span>' + acts('today', false) + '</div>';
      sec('today').querySelector('ul').append(li); recount();
    }).catch(function () { input.value = text; });
  });
  var fresh = document.getElementById('todoFresh');
  if (fresh) fresh.addEventListener('click', function () {
    fresh.disabled = true;
    fetch('/todo/fresh', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then(function (r) {
      if (!r.ok) throw 0;
      var rows = [].slice.call(sec('today').querySelectorAll('li'));
      rows.reverse().forEach(function (li) { place(li, li.querySelector('.todo').classList.contains('done') ? 'done' : 'time', true); });
      fresh.closest('.todo-fresh').remove();
    }).catch(function () { fresh.disabled = false; });
  });
  recount();
})();`;

/* ---------- Inbox: the receipt ---------- */
// What came in, and where the sort put it. The sort is meant to be invisible; this is where a
// misfiled capture gets caught. Time is rough on purpose.

const rough = (date) => {
  const days = Math.round((new Date(new Date().toDateString()) - new Date(date.slice(0, 10) + 'T00:00:00')) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return shortDate(date.slice(0, 10));
};
function landRows(notes, { limit = 60 } = {}) {
  const known = new Set(notes.map((n) => n.name));
  const waiting = readInbox().reverse();
  const sorted = readSorted().reverse().slice(0, limit);
  const dest = (c) => {
    if (!c.to) return `<span>${esc(c.label)}</span>`;
    return known.has(c.to) ? `<a href="/n/${encodeURIComponent(c.to)}">${esc(c.label)}</a>` : `<span>${esc(c.label)}</span>`;
  };
  return {
    waiting: waiting.map((i) => `<div class="land"><span class="when">${rough(i.at)}</span><div><div class="what">${esc(i.text)}</div><div class="to wait">Waiting to be sorted</div></div></div>`).join(''),
    sorted: sorted.map((c) => `<div class="land"><span class="when">${rough(c.date)}</span><div><div class="what">${esc(c.text)}</div><div class="to">${dest(c)}${c.merged ? '<span>· merged</span>' : ''}</div></div></div>`).join(''),
    count: waiting.length,
  };
}
function receiptBody(notes) {
  const r = landRows(notes, { limit: 40 });
  return `
    <p class="rc-head">Inbox<span>${r.count ? `${r.count} waiting to be sorted` : 'All sorted'} · <a href="/inbox">Open</a></span></p>
    <div class="lands">${r.waiting + r.sorted || '<div class="empty"><b>Nothing has come in yet.</b><span>⌘I to drop something.</span></div>'}</div>`;
}
function inboxPage(notes) {
  const r = landRows(notes);
  const homeless = homelessPages(notes);
  const body = `
  ${pageHead({ title: 'Inbox', sub: r.count ? `${plural(r.count, 'capture')} waiting to be sorted` : 'All sorted', lede: 'Everything you’ve captured, and where it went.' })}
  <div style="margin-top:28px"></div>
  ${homeless.length ? block('Pages with no note', homeless, (p) => row(p, { sub: 'Link it from the note it belongs to', meta: when(p.updated), archivable: false })) : ''}
  ${r.waiting ? `<section class="block">${blockHead('Waiting', r.count, '<span class="end">Sorted in a couple of minutes</span>')}<div class="card">${r.waiting}</div></section>` : ''}
  <section class="block">${blockHead('Sorted', '', '<span class="end">Newest first</span>')}${r.sorted ? `<div class="card">${r.sorted}</div>` : emptyCard('Nothing has come in yet.', '⌘I, or the + on your phone, and say anything.')}</section>`;
  return shell('Inbox · Vault', body, { notes, here: 'inbox' });
}

/* ---------- the shelves ---------- */

const live = (notes, s) => notes.filter((n) => section(n) === s && !n.archived);

// A project shows the work, not a paragraph about it. Its picture comes from the vault's
// projects/_media folder by name: <name>.mp4 (with <name>-poster.jpg) or <name>.webp/.jpg/.png.
// <name>-night.* is the same thing for night mode, shown instead when the vault is dark.
// No picture: the live site itself, scaled down, if it's public. Neither: its name, set large.
const MEDIA_DIR = join(VAULT, 'projects', '_media');
const MEDIA_TYPES = { '.mp4': 'video/mp4', '.webm': 'video/webm', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif' };
const findMedia = (base) => ['.mp4', '.webm', '.webp', '.jpg', '.jpeg', '.png', '.gif'].map((x) => base + x).find((f) => existsSync(join(MEDIA_DIR, f)));
function oneCover(base) {
  const file = findMedia(base);
  if (!file) return null;
  const poster = findMedia(base + '-poster');
  return { src: `/media/${encodeURIComponent(file)}`, video: /\.(mp4|webm)$/.test(file), poster: poster && `/media/${encodeURIComponent(poster)}` };
}
function coverOf(n) {
  const day = oneCover(n.name);
  return day ? { day, night: oneCover(n.name + '-night') } : null;
}
const mediaTag = (c, cls = '') => c.video
  ? `<video class="${cls}" src="${c.src}"${c.poster ? ` poster="${c.poster}"` : ''} muted loop playsinline preload="metadata" data-autoplay></video>`
  : `<img class="${cls}" src="${c.src}" alt="" loading="lazy">`;
// Where opening a project goes: the thing itself. The note is one small link away.
const openOf = (n) => n.live || n.page || n.studio || href(n);
const outward = (u) => /^https?:/.test(u) ? ' target="_blank" rel="noopener"' : '';
// Private sites ask for a sign-in inside a frame, so only public pages and the vault's own play live.
const previewable = (u) => u && (u.startsWith('/pages/') || (/^https:\/\//.test(u) && !/^https:\/\/(vault|cuttings?|studio)\./.test(u)));
function projectMedia(n) {
  const c = coverOf(n);
  if (c) return c.night ? mediaTag(c.day, 'day-only') + mediaTag(c.night, 'night-only') : mediaTag(c.day);
  const site = n.live || n.page;
  if (previewable(site)) return `<div class="site" data-src="${esc(site)}"><iframe title="${esc(n.title)}" tabindex="-1" aria-hidden="true" scrolling="no"></iframe></div>`;
  return `<div class="name"><span>${esc(n.title)}</span></div>`;
}
const zoomOf = (n) => n.zoom > 1 ? ` style="--z:${n.zoom}"` : '';
const STATUS_WORD = { active: '', paused: 'Parked', shipped: 'Shipped', dead: 'Stopped', idea: 'Idea' };
const projectTile = (n) => {
  const open = openOf(n), note = href(n);
  return `
  <figure class="ptile">
    <a class="pmedia" href="${esc(open)}"${outward(open)}${zoomOf(n)} aria-label="Open ${esc(n.title)}">${projectMedia(n)}</a>
    <figcaption class="pcap">
      <a class="ptitle" href="${esc(open)}"${outward(open)}>${esc(n.title)}${/^https?:/.test(open) ? ' <span class="arrow">↗</span>' : ''}</a>
      <span class="pmeta">${STATUS_WORD[n.status] ? `<span>${STATUS_WORD[n.status]}</span>` : ''}<span>${shortDate(n.updated)}</span>${open !== note ? `<a href="${note}">Notes</a>` : ''}</span>
    </figcaption>
  </figure>`;
};
const grid = (title, items, { fold = false } = {}) => !items.length ? '' : fold
  ? `<details class="block"><summary>${blockHead(title, items.length)}</summary><div class="pgrid">${items.map(projectTile).join('')}</div></details>`
  : `<section class="block">${blockHead(title, items.length)}<div class="pgrid">${items.map(projectTile).join('')}</div></section>`;

function projectsPage(notes) {
  // Your own work comes first; client work gets its own block below it.
  const all = live(notes, 'projects');
  const projects = all.filter((n) => !n.client);
  const clients = all.filter((n) => n.client).sort(byUpdated);
  // The ones with something to look at lead; the rest follow, newest first in each.
  const seen = (n) => coverOf(n) || previewable(n.live || n.page) ? 0 : 1;
  // Always on: the tools my own system runs on (horizon: ongoing). They never finish, so they sit apart from Open.
  const active = projects.filter((n) => n.status === 'active' || !n.status);
  const open = active.filter((n) => n.horizon !== 'ongoing').sort((a, b) => seen(a) - seen(b) || byUpdated(a, b));
  const always = active.filter((n) => n.horizon === 'ongoing').sort((a, b) => seen(a) - seen(b) || byUpdated(a, b));
  const parked = projects.filter((n) => n.status === 'paused' || n.status === 'idea').sort(byUpdated);
  const done = projects.filter((n) => n.status === 'shipped' || n.status === 'dead' || n.status === 'done').sort(byUpdated);
  const filed = notes.filter((n) => n.archived && section(n) === 'projects').sort(byUpdated);
  const body = `
  ${pageHead({ title: 'Projects', sub: `${plural(open.length, 'project')} open${done.length ? ` · ${done.length} shipped` : ''}` })}
  <div style="margin-top:28px"></div>
  ${grid('Open', open)}
  ${grid('Always on', always, { fold: true })}
  ${grid('Shipped', done, { fold: true })}
  ${grid('Client work', clients, { fold: true })}
  ${grid('Parked', parked, { fold: true })}
  ${grid('Archive', filed, { fold: true })}
  ${all.length ? '' : emptyCard('No projects yet.', 'When an idea gets picked up it becomes a project.')}`;
  return shell('Projects · Vault', body, { notes, here: 'projects' });
}

// Ideas live in folders, one note per idea; the folder's head note (type category) names it.
// Ideas are a triage list: one line each, three choices. Do it moves it to Doing, Later parks it,
// Trash archives it (still readable at its own address, just off the list).
const IDEA_BUCKETS = [['new', 'To sort'], ['doing', 'Doing'], ['later', 'Later']];
const ideaBucket = (n) => n.status === 'doing' || n.status === 'later' ? n.status : 'new';
const ideaRow = (n, groupName) => {
  const b = ideaBucket(n);
  const acts = [b !== 'doing' && ['doing', 'Do it'], b !== 'later' && ['later', 'Later'], b !== 'new' && ['new', 'Back'], ['trash', 'Trash']].filter(Boolean);
  return `
  <li class="iline" data-name="${esc(n.name)}">
    <a class="iline-t" href="${href(n)}"><b>${esc(n.title)}</b>${n.description ? `<span>${esc(n.description)}</span>` : ''}</a>
    <span class="iline-end">
      <span class="iline-g">${esc(groupName(n))}</span>
      <span class="iline-acts">${acts.map(([k, l]) => `<button type="button" data-act="${k}"${k === 'doing' ? ' class="go"' : ''}>${l}</button>`).join('')}</span>
    </span>
  </li>`;
};
function ideasPage(notes) {
  const ideas = live(notes, 'ideas').filter((n) => n.status !== 'built').sort((a, b) => (b.created || '').localeCompare(a.created || ''));
  const heads = new Map(notes.filter((x) => x.type === 'category').map((x) => [x.group, x.title]));
  const groupName = (n) => heads.get(n.group) || (n.group ? n.group[0].toUpperCase() + n.group.slice(1) : '');
  const by = Object.fromEntries(IDEA_BUCKETS.map(([k]) => [k, ideas.filter((n) => ideaBucket(n) === k)]));
  const count = IDEA_BUCKETS.filter(([k]) => by[k].length).map(([k, l]) => `${by[k].length} ${k === 'new' ? 'to sort' : l.toLowerCase()}`).join(' · ');
  const body = `
  ${pageHead({ title: 'Ideas', sub: count || 'Nothing here' })}
  <div style="margin-top:28px"></div>
  ${IDEA_BUCKETS.map(([k, label]) => `
  <section class="block" data-bucket="${k}"${by[k].length ? '' : ' hidden'}>${blockHead(label, by[k].length)}
    <div class="card"><ul class="ideas">${by[k].map((n) => ideaRow(n, groupName)).join('')}</ul></div>
  </section>`).join('')}
  ${ideas.length ? '' : emptyCard('No ideas waiting.', 'Say “idea:” and a sentence.')}
  <script>${IDEAS_JS}</script>`;
  return shell('Ideas · Vault', body, { notes, here: 'ideas' });
}
const IDEAS_JS = `(function () {
  var send = function (url, method, body) { return fetch(url, { method: method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { if (!r.ok) throw new Error(r.status); return r; }); };
  var LABEL = { doing: 'Do it', later: 'Later', new: 'Back', trash: 'Trash' };
  var recount = function () {
    document.querySelectorAll('[data-bucket]').forEach(function (s) {
      var n = s.querySelectorAll('li.iline').length; s.hidden = !n;
      var c = s.querySelector('.block-head .n'); if (c) c.textContent = n;
    });
    var parts = [['new', 'to sort'], ['doing', 'doing'], ['later', 'later']].map(function (b) {
      var n = document.querySelectorAll('[data-bucket="' + b[0] + '"] li.iline').length; return n ? n + ' ' + b[1] : '';
    }).filter(Boolean);
    var sub = document.querySelector('.page-head .sub'); if (sub) sub.textContent = parts.join(' · ') || 'Nothing here';
  };
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.iline-acts button'); if (!btn) return;
    var li = btn.closest('li.iline'), name = li.dataset.name, act = btn.dataset.act;
    li.classList.add('leaving');
    var p = act === 'trash'
      ? send('/n/' + encodeURIComponent(name) + '/archive', 'POST', { on: true })
      : send('/api/notes/' + encodeURIComponent(name), 'PATCH', { frontmatter: { status: act === 'new' ? null : act } });
    p.then(function () {
      setTimeout(function () {
        if (act !== 'trash') {
          var acts = li.querySelector('.iline-acts');
          acts.innerHTML = ['doing', 'later', 'new', 'trash'].filter(function (k) { return k !== act && !(k === 'new' && act === 'new'); })
            .map(function (k) { return '<button type="button" data-act="' + k + '"' + (k === 'doing' ? ' class="go"' : '') + '>' + LABEL[k] + '</button>'; }).join('');
          document.querySelector('[data-bucket="' + act + '"] ul').prepend(li);
        } else li.remove();
        li.classList.remove('leaving');
        recount();
      }, 180);
    }).catch(function () { li.classList.remove('leaving'); });
  });
})();`;

// Thinking folds by subject, not by year: each one shows its five newest, the rest a click away.
const THINKING = [['loose', 'Loose thoughts'], ['craft', 'Craft'], ['career', 'Where I’m headed'], ['weeks', 'Weeks']];
const THINK_KEYS = new Set(THINKING.map(([k]) => k));
const thinkingCat = (n) => THINK_KEYS.has(n.category) ? n.category : (n.tags.includes('review') ? 'weeks' : 'loose');
const THINK_PEEK = 5;
const thoughtRow = (n) => row(n, { sub: n.description, meta: when(n.updated) });
// Loose thoughts: a free space for short, unworked ones, so it reads as one page of bullets
// rather than a list of documents. Each bullet is the thought itself; the title leads so it
// still scans. Worked-out design thinking stays in Craft, as rows.
const scratch = (list) => `<div class="card scratch"><ul>${list.map((n) => `
  <li><a href="${href(n)}"><b>${esc(n.title)}</b>${n.description ? ` <span>${esc(n.description)}</span>` : ''}</a></li>`).join('')}</ul></div>`;
function thinkingPage(notes) {
  const all = live(notes, 'thinking').sort(byUpdated);
  const body = `
  ${pageHead({ title: 'Thinking', sub: plural(all.length, 'thought') })}
  <div style="margin-top:28px"></div>
  ${THINKING.map(([key, label]) => {
    const list = all.filter((n) => thinkingCat(n) === key);
    if (!list.length) return '';
    if (key === 'loose') return `<section class="block">${blockHead(label, list.length)}${scratch(list)}</section>`;
    const more = list.length - THINK_PEEK;
    return `<section class="block">${blockHead(`<a href="/thinking/${key}">${label}</a>`, list.length, `<a class="end" href="/thinking/${key}">All</a>`)}
      <div class="card"><ul class="rows">${list.slice(0, THINK_PEEK).map(thoughtRow).join('')}</ul>${more > 0 ? `<a class="more" href="/thinking/${key}">${more} more</a>` : ''}</div></section>`;
  }).join('')}
  ${all.length ? '' : emptyCard('Nothing here yet.', 'Say “thought:” and what you’re noticing. Decisions get their own type so the why survives.')}`;
  return shell('Thinking · Vault', body, { notes, here: 'thinking' });
}
function thinkingCatPage(key, notes) {
  const cat = THINKING.find(([k]) => k === key);
  if (!cat) return null;
  const list = live(notes, 'thinking').filter((n) => thinkingCat(n) === key).sort(byUpdated);
  if (key === 'loose') return shell(`${cat[1]} · Vault`, `
  ${pageHead({ crumbs: [['Thinking', '/thinking']], title: cat[1], sub: plural(list.length, 'thought') })}
  <div style="margin-top:28px"></div>${scratch(list)}`, { notes, here: 'thinking' });
  const years = new Map();
  for (const n of list) { const y = year(n.updated) || '—'; if (!years.has(y)) years.set(y, []); years.get(y).push(n); }
  const body = `
  ${pageHead({ crumbs: [['Thinking', '/thinking']], title: cat[1], sub: plural(list.length, 'thought') })}
  <div style="margin-top:28px"></div>
  ${[...years].map(([y, items]) => block(y, items, thoughtRow)).join('')}`;
  return shell(`${cat[1]} · Vault`, body, { notes, here: 'thinking' });
}

// A resource row points at the thing itself; why it earned a place is one click down, in the note.
function resourcesPage(notes) {
  const shelves = live(notes, 'resources').sort((a, b) => (+a.order || 99) - (+b.order || 99));
  const body = `
  ${pageHead({ title: 'Resources', sub: 'Things worth going back to' })}
  <div style="margin-top:28px"></div>
  ${shelves.map((n) => {
    const links = headings(splitForClaude(n.body)[0]).filter((h) => h.level === 3).map((h) => {
      let where = '';
      try { where = new URL(h.href).hostname.replace(/^www\./, ''); } catch {}
      return { label: h.text, url: h.href || `${href(n)}#${h.id}`, where };
    });
    const rows = links.map((l) => `<li><a class="row no-mark" href="${esc(l.url)}"${/^https?:/.test(l.url) ? ' target="_blank" rel="noopener"' : ''}>
      <span class="t"><b>${esc(l.label)}</b></span><span class="m">${l.where ? `<span>${esc(l.where)}</span>` : ''}${/^https?:/.test(l.url) ? svg('link') : ''}</span></a></li>`).join('');
    return `<section class="block">${blockHead(`<a href="${href(n)}">${esc(n.title)}</a>`, links.length, `<a class="end" href="${href(n)}">Why these</a>`)}${card(rows, '<div class="empty"><span>Nothing kept here yet.</span></div>')}</section>`;
  }).join('')}
  ${shelves.length ? '' : emptyCard('Nothing kept yet.', 'Say “resource:” and a link. Libraries, references, tools someone else built.')}`;
  return shell('Resources · Vault', body, { notes, here: 'resources' });
}

function clientsPage(notes) {
  const clients = live(notes, 'clients');
  const nowC = clients.filter((n) => n.status !== 'past').sort(byUpdated);
  const past = clients.filter((n) => n.status === 'past').sort(byUpdated);
  const r = (n) => row(n, { sub: n.engagement || n.description, meta: when(n.updated), dim: n.status === 'past' });
  const body = `
  ${pageHead({ title: 'Clients', sub: nowC.length ? `Working with ${plural(nowC.length, 'client')}` : 'No one right now' })}
  <div style="margin-top:28px"></div>
  ${block('Working with', nowC, r)}
  ${foldBlock('Past', past, r)}
  ${clients.length ? '' : emptyCard('No clients yet.', 'Say “client:” and who they are. One note each: what they want, what was agreed, who to talk to.')}`;
  return shell('Clients · Vault', body, { notes, here: 'clients' });
}

// Personal: everything outside work. Who I am, trips, people and the rest of life. Every trip
// stays here as the record of where I went, archived or not; a finished one (status: done) greys out.
const PERSONAL = [['user', 'About me'], ['feedback', 'About me'], ['trip', 'Trips'], ['personal', 'Life']];
function personalPage(notes) {
  const mine = notes.filter((n) => section(n) === 'personal');
  const group = (label) => mine.filter((n) => PERSONAL.some(([t, l]) => l === label && t === n.type) && (n.type === 'trip' || !n.archived));
  const about = group('About me').sort((a, b) => (a.created || '').localeCompare(b.created || ''));
  const trips = group('Trips').sort((a, b) => (b.created || '').localeCompare(a.created || ''));
  const life = group('Life').sort(byUpdated);
  const r = (n) => row(n, { sub: n.description, meta: when(n.updated), dim: n.type === 'trip' && n.status === 'done', archivable: false });
  const body = `
  ${pageHead({ title: 'Personal', sub: 'Everything outside work' })}
  <div style="margin-top:28px"></div>
  ${block('About me', about, r)}
  ${block('Trips', trips, r)}
  ${block('Life', life, r)}
  ${mine.length ? '' : emptyCard('Nothing personal yet.', 'Trips, people, the things outside work.')}`;
  return shell('Personal · Vault', body, { notes, here: 'personal' });
}

/* ---------- gallery ---------- */
// Cuttings are the one thing in the vault that are looked at rather than read, so they get their
// own page instead of a shelf on the index: full width, pictures at their own aspect, the sentence
// underneath. Clips play on hover, because a still of a motion cutting says nothing.

function galleryPage(notes, { own = false } = {}) {
  const cuts = notes.filter((n) => section(n) === 'cuttings').sort(byUpdated);
  const src = (p) => '/cuttings/' + p.split('/').map(encodeURIComponent).join('/');
  const sites = [...new Set(cuts.map((c) => c.site).filter(Boolean))];
  const folders = [...new Set(cuts.map((c) => c.cutFolder).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  // The guide for each folder, if one has been written — keyed by folder so the bar can link it.
  const guides = Object.fromEntries(notes.filter((n) => n.type === 'style-guide' && n.cutFolder).map((n) => [n.cutFolder, { href: href(n), updated: n.updated }]));
  const running = Object.fromEntries(folders.map((f) => [f, analysisState(f).state === 'running']));

  // The tile is a div, not one big anchor: a remove control has to sit outside the link, both so a
  // click on it can't navigate and because a <button> inside an <a> is not valid markup.
  const tile = (n) => `
    <div class="tile${+n.screens > 1 ? ' tall' : ''}" data-site="${esc(n.site || '')}"
         data-kind="${n.clip ? 'motion' : +n.screens > 1 ? 'full' : 'still'}"
         data-name="${esc(n.name)}" data-when="${esc(n.updated || '')}" data-folder="${esc(n.cutFolder || '')}">
      <a class="shot" href="${href(n)}" tabindex="-1" aria-hidden="true">
        ${n.clip
          ? `<video src="${src(n.clip)}" muted loop playsinline preload="metadata"${n.still ? ` poster="${src(n.still)}"` : ''}></video>`
          : n.still ? `<img src="${src(n.still)}" alt="" loading="lazy">` : '<div class="blank"></div>'}
      </a>
      <div class="cap">
        <span class="line">
          <a class="said" href="${href(n)}">${esc(n.title)}</a>
          <button class="rm" type="button" title="Remove this cutting" aria-label="Remove this cutting">×</button>
        </span>
        <span class="from">
          <span class="who"><span class="site">${esc(n.site || '')}</span>${
            n.clip ? `<span class="mo">${n.seconds ? esc(n.seconds) + 's' : 'motion'}</span>`
            : +n.screens > 1 ? `<span class="mo">${esc(n.screens)} screens</span>` : ''}</span>
          <button class="fold${n.cutFolder ? ' set' : ''}" type="button" title="Put in a folder">${n.cutFolder ? esc(n.cutFolder) : '+ folder'}</button>
          <span class="when">${shortDate(n.updated)}</span>
        </span>
      </div>
    </div>`;

  const body = `
  <header class="page-head">
    <h1>Cuttings</h1>
    <p class="sub">${cuts.length ? `${cuts.length} taken${sites.length ? ` from ${sites.length} site${sites.length > 1 ? 's' : ''}` : ''}` : 'Nothing yet'}</p>
  </header>
  ${cuts.length ? `
  <div class="controls">
    <div class="seg filters folders" data-group="folder"${folders.length ? '' : ' hidden'}>
      <button class="on" data-folder="">All cuttings</button>
      ${folders.map((x) => `<button data-folder="${esc(x)}">${esc(x)}</button>`).join('')}
    </div>
    <div class="guide-bar" hidden>
      <span class="gb-count"></span>
      <a class="gb-guide" hidden>Style guide</a>
      <input class="gb-focus" type="text" value="the building" spellcheck="false" aria-label="What to analyze" title="What to analyze in each photo">
      <button class="btn gb-run" type="button">Analyze</button>
      <span class="gb-state"></span>
    </div>
    <datalist id="folder-names">${folders.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
    <div class="controls-row">
      <div class="seg filters" data-group="kind">
        <button class="on" data-kind="">Everything</button>
        <button data-kind="motion">Motion</button>
        <button data-kind="still">Stills</button>
        <button data-kind="full">Full pages</button>
      </div>
      <div class="seg filters" data-group="sort">
        <button class="on" data-sort="new">Newest</button>
        <button data-sort="old">Oldest</button>
        <button data-sort="site">By site</button>
      </div>
    </div>
    ${sites.length > 1 ? `<div class="seg filters" data-group="site">
      <button class="on" data-site="">All sites</button>
      ${sites.map((x) => `<button data-site="${esc(x)}">${esc(x)}</button>`).join('')}
    </div>` : ''}
  </div>` : ''}
  ${cuts.length
    ? `<div class="gal">${cuts.map(tile).join('')}</div>`
    : `<div class="card" style="margin-top:28px"><div class="empty"><b>No cuttings yet.</b><span>Press ⌥C on any page, click the thing you noticed, say why. Shift-click records it instead.</span></div></div>`}
  <script>
    // Play a clip while the pointer is on it — a still of a motion cutting says nothing.
    for (const v of document.querySelectorAll('.tile video')) {
      const a = v.closest('.tile');
      a.addEventListener('mouseenter', () => { v.play().catch(() => {}); });
      a.addEventListener('mouseleave', () => { v.pause(); v.currentTime = 0; });
    }

    // A whole-page capture is recognised by its own proportions, so captures taken before the
    // frontmatter recorded a screen count get capped too.
    for (const im of document.querySelectorAll('.tile img')) {
      const mark = () => { if (im.naturalWidth && im.naturalHeight / im.naturalWidth > 2.2) im.closest('.tile').classList.add('tall'); };
      im.complete ? mark() : im.addEventListener('load', mark, { once: true });
    }

    const gal = document.querySelector('.gal');
    const tiles = [...document.querySelectorAll('.tile')];
    const state = { site: '', kind: '', sort: 'new', folder: '' };
    const GUIDES = ${JSON.stringify(guides).replace(/</g, '\\u003c')};
    const RUNNING = ${JSON.stringify(running).replace(/</g, '\\u003c')};

    function apply() {
      for (const t of tiles) {
        const ok = (!state.folder || t.dataset.folder === state.folder)
                && (!state.site || t.dataset.site === state.site)
                && (!state.kind || t.dataset.kind === state.kind);
        t.style.display = ok ? '' : 'none';
      }
      const by = {
        new:  (a, b) => (b.dataset.when || '').localeCompare(a.dataset.when || ''),
        old:  (a, b) => (a.dataset.when || '').localeCompare(b.dataset.when || ''),
        site: (a, b) => (a.dataset.site || '').localeCompare(b.dataset.site || '')
                     || (b.dataset.when || '').localeCompare(a.dataset.when || ''),
      }[state.sort];
      for (const t of [...tiles].filter((x) => x.isConnected).sort(by)) gal.appendChild(t);
      bar();
    }

    for (const group of document.querySelectorAll('.filters')) {
      for (const b of group.querySelectorAll('button')) {
        b.addEventListener('click', () => {
          group.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
          state[group.dataset.group] = b.dataset.site ?? b.dataset.kind ?? b.dataset.sort ?? b.dataset.folder ?? '';
          if (group.dataset.group === 'sort') state.sort = b.dataset.sort;
          apply();
        });
      }
    }

    // Removing: a × beside the sentence on hover. The tile leaves and the grid closes over it —
    // a greyed-out corpse sitting in the run is worse than the thing being gone. Nothing is
    // actually destroyed: the cutting moves to cuttings/.trash/ and can be put back by hand.
    const live = new Set(tiles);
    function recount() {
      const n = live.size;
      const s = new Set([...live].map((t) => t.dataset.site).filter(Boolean));
      const sub = document.querySelector('.page-head .sub');
      // Plain concatenation: this script is itself inside a server-side template literal.
      if (sub) sub.textContent = n
        ? n + ' taken' + (s.size ? ' from ' + s.size + ' site' + (s.size > 1 ? 's' : '') : '')
        : 'Nothing yet';
      // A site with nothing left under it is no longer a filter worth offering.
      for (const b of document.querySelectorAll('.filters[data-group="site"] button[data-site]')) {
        if (b.dataset.site) b.hidden = !s.has(b.dataset.site);
      }
    }
    for (const t of tiles) {
      t.querySelector('.rm').addEventListener('click', async (e) => {
        e.preventDefault(); e.stopPropagation();
        if (!live.has(t)) return;
        live.delete(t);
        const r = await fetch('/cuttings/' + encodeURIComponent(t.dataset.name) + '/trash', { method: 'POST' });
        if (!r.ok) { live.add(t); return; }
        t.classList.add('leaving');
        setTimeout(() => { t.remove(); recount(); }, 180);
      });
    }

    // Folders. The bar only exists inside one: how many pictures, its guide if there is one, and
    // the button that writes (or rewrites) it. Analysis takes a few minutes, so it polls.
    const gb = document.querySelector('.guide-bar');
    const $ = (s) => gb.querySelector(s);
    function bar() {
      if (!gb) return;
      gb.hidden = !state.folder;
      if (!state.folder) return;
      const n = [...live].filter((t) => t.dataset.folder === state.folder && t.querySelector('img, video[poster]')).length;
      $('.gb-count').textContent = n + (n === 1 ? ' picture' : ' pictures');
      const g = GUIDES[state.folder];
      $('.gb-guide').hidden = !g;
      if (g) { $('.gb-guide').href = g.href; $('.gb-guide').textContent = 'Style guide · ' + g.updated; }
      $('.gb-run').textContent = g ? 'Analyze again' : 'Analyze';
      $('.gb-run').disabled = !n || !!RUNNING[state.folder];
      if (RUNNING[state.folder]) poll(state.folder);
      else if (!$('.gb-state').classList.contains('err')) $('.gb-state').textContent = '';
    }
    let polling = null;
    function poll(folder) {
      if (polling === folder) return;
      polling = folder;
      const t0 = Date.now();
      const tick = async () => {
        const r = await fetch('/cuttings-folders/' + encodeURIComponent(folder) + '/analyze').then((x) => x.json()).catch(() => null);
        if (state.folder === folder) {
          $('.gb-state').classList.toggle('err', r?.state === 'failed');
          if (r?.state === 'running') {
            const s = Math.round((Date.now() - (r.started || t0)) / 1000);
            $('.gb-state').textContent = 'Reading ' + r.count + ' pictures… ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
          }
        }
        if (r?.state === 'running') return setTimeout(tick, 2000);
        polling = null; RUNNING[folder] = false;
        if (r?.state === 'done' && r.guide) { location.href = '/n/' + encodeURIComponent(r.guide); return; }
        if (state.folder === folder) {
          $('.gb-state').textContent = r?.state === 'failed' ? 'Failed: ' + (r.error || 'unknown') : '';
          $('.gb-run').disabled = false;
        }
      };
      tick();
    }
    if (gb) $('.gb-run').addEventListener('click', async () => {
      const folder = state.folder;
      $('.gb-run').disabled = true;
      $('.gb-state').classList.remove('err');
      const r = await fetch('/cuttings-folders/' + encodeURIComponent(folder) + '/analyze', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ focus: $('.gb-focus').value }),
      });
      if (!r.ok) { $('.gb-state').classList.add('err'); $('.gb-state').textContent = 'Failed: ' + await r.text(); $('.gb-run').disabled = false; return; }
      RUNNING[folder] = true;
      poll(folder);
    });

    // Putting a cutting in a folder: click its folder label, type, return. Empty takes it out.
    function addFolderChip(name) {
      const group = document.querySelector('.filters.folders');
      if (!name || group.querySelector('[data-folder="' + CSS.escape(name) + '"]')) return;
      group.hidden = false;
      const b = document.createElement('button');
      b.dataset.folder = name; b.textContent = name;
      b.addEventListener('click', () => {
        group.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        state.folder = name; apply();
      });
      group.appendChild(b);
      const o = document.createElement('option'); o.value = name;
      document.getElementById('folder-names').appendChild(o);
    }
    for (const t of tiles) {
      const btn = t.querySelector('.fold');
      btn.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        const input = document.createElement('input');
        input.className = 'fold-in'; input.setAttribute('list', 'folder-names');
        input.value = t.dataset.folder; input.placeholder = 'folder';
        btn.replaceWith(input); input.focus(); input.select();
        let done = false;
        const finish = async (commit) => {
          if (done) return; done = true;
          const name = input.value.trim();
          if (commit && name !== t.dataset.folder) {
            const r = await fetch('/cuttings/' + encodeURIComponent(t.dataset.name) + '/folder', {
              method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ folder: name }),
            });
            if (r.ok) {
              const saved = (await r.json()).folder;
              t.dataset.folder = saved;
              btn.textContent = saved || '+ folder';
              btn.classList.toggle('set', !!saved);
              addFolderChip(saved);
            }
          }
          input.replaceWith(btn);
          apply();
        };
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') finish(true);
          if (e.key === 'Escape') finish(false);
        });
        input.addEventListener('blur', () => finish(true));
      });
    }
  </script>`;

  return shell('Cuttings', body, { notes, here: 'cuttings', wide: true, base: '' });
}

/* ---------- note ---------- */
// A note is written for you. Anything under a trailing "## For Claude" heading is for sessions,
// and the reader folds it away so the page reads as yours, not as a briefing.
function splitForClaude(body) {
  const m = /^## For (Claude|agents|the agent)\s*$/m.exec(body);
  return m ? [body.slice(0, m.index).trimEnd(), body.slice(m.index + m[0].length).trim()] : [body, ''];
}


// A cutting leads with its pixels: the clip if there is one (it contains the still), else the still.
function media(n, notes = []) {
  const src = (p) => '/cuttings/' + p.split('/').map(encodeURIComponent).join('/');
  // A style guide opens on the pictures it was read from, so every claim can be checked by eye.
  if (n.type === 'style-guide') {
    const cuts = notes.filter((c) => c.type === 'cutting' && c.cutFolder === n.cutFolder && c.still);
    return cuts.length ? `<div class="guide-strip">${cuts.map((c) => `<a href="${href(c)}"><img src="${src(c.still)}" alt="" loading="lazy"></a>`).join('')}</div>` : '';
  }
  if (n.type !== 'cutting') return '';
  return `<figure class="cut">
    ${n.clip ? `<video src="${src(n.clip)}" autoplay loop muted playsinline controls></video>` : ''}
    ${n.still ? `<img src="${src(n.still)}" alt="">` : ''}
    ${n.viewport ? `<details class="ctx"><summary>Whole viewport</summary><img src="${src(n.viewport)}" alt="" loading="lazy"></details>` : ''}
  </figure>`;
}

// A note inside a folder (projects/vault/…, ideas/toys/…) shows the rest of its folder:
// the head note lists its parts, a part points back to its head.
function folderLinks(n, notes) {
  if (!n.group || !['projects', 'ideas'].includes(n.folder)) return '';
  const kin = notes.filter((x) => x.folder === n.folder && x.group === n.group && x.name !== n.name);
  if (!kin.length) return '';
  const head = n.name === n.group || n.type === 'category';
  const shown = head ? kin : kin.filter((x) => x.name === x.group || x.type === 'category');
  if (!shown.length) return '';
  return block(head ? 'In this folder' : 'Part of', shown, (b) => row(b, { sub: b.description, meta: when(b.updated), archivable: false }));
}

// Where a note sits, for the crumbs above its title.
const SHELF = { projects: 'projects', clients: 'clients', ideas: 'ideas', category: 'ideas', resources: 'resources', cuttings: 'cuttings', thinking: 'thinking', personal: 'personal', todo: 'todo', inbox: 'inbox' };

function notePage(n, notes) {
  const known = new Set(notes.map((x) => x.name));
  const back = backlinks(n.name, notes);
  // Every page this note links, listed where you can see it: a link in folded writing alone isn't a way in.
  const pages = block('Pages', pagesOf(n, notes), (p) => row(p, { sub: p.description, meta: when(p.updated), archivable: false }));
  const [mine] = splitForClaude(n.body);
  const shelf = SHELF[section(n)];
  const crumbs = [];
  if (shelf) crumbs.push([TITLE[shelf], NAV.find(([k]) => k === shelf)[2]]);
  if (section(n) === 'thinking') { const c = THINKING.find(([k]) => k === thinkingCat(n)); if (c) crumbs.push([c[1], `/thinking/${c[0]}`]); }
  if (n.group && n.type !== 'category' && n.name !== n.group) {
    const head = notes.find((x) => x.folder === n.folder && x.group === n.group && (x.type === 'category' || x.name === x.group));
    if (head) crumbs.push([head.title, href(head)]);
  }

  const sub = [
    n.status ? `<span>${n.status}</span>` : '',
    n.horizon ? `<span>${HORIZON[n.horizon]}</span>` : '',
    `<span>${KIND[n.type] || n.type}</span>`,
    n.updated ? `<span>Updated ${long(n.updated)}</span>` : '',
  ].filter(Boolean).join('');
  const h2s = (mine.match(/^## /gm) || []).length;

  const isProject = section(n) === 'projects';
  const props = propsPanel(n, sub).replace('id="propsSub"', `id="propsSub" data-kind="${esc(KIND[n.type] || n.type)}"`);
  const paths = n.path || n.repo || n.source ? `<div class="paths">
        ${n.path ? `<span class="mono${n.pathExists === false ? ' missing' : ''}">${esc(n.path)}${n.pathExists === false ? ' · not found on disk' : ''}</span>` : ''}
        ${n.repo ? `<a href="${esc(n.repo)}" target="_blank" rel="noopener">${esc(n.repo.replace(/^https?:\/\//, ''))} ↗</a>` : ''}
        ${n.source ? `<a href="${esc(n.source)}" target="_blank" rel="noopener">${esc(n.site || n.source)} ↗</a>` : ''}
      </div>` : '';
  const crumbsHtml = crumbs.length ? `<nav class="crumbs">${crumbs.map(([t, h]) => `<a href="${h}">${esc(t)}</a>`).join('<span class="sep">/</span>')}</nav>` : '';
  const actions = isProject && openOf(n) !== href(n) ? `<div class="actions">
        <a class="btn primary" href="${esc(openOf(n))}"${outward(openOf(n))}>Open${/^https?:/.test(openOf(n)) ? ' ↗' : ''}</a>
        ${n.live ? `<a class="btn" href="/n/${encodeURIComponent(n.name)}/view">Desktop and phone</a>` : ''}
        ${n.studio && n.studio !== openOf(n) ? `<a class="btn ghost" href="${esc(n.studio)}" target="_blank" rel="noopener">Studio ↗</a>` : ''}
      </div>` : '';

  // A project's words, folded. `<!-- fold Manual -->` on its own line starts another fold under that name, so a
  // project can carry its manual on its own page: Notes, then Manual.
  const folds = (md) => md.split(/^<!-- fold (.+?) -->[ \t]*$/m).reduce((out, part, i, all) =>
    i % 2 ? out : (i === 0 ? (part.trim() ? [['Notes', part]] : []) : [...out, [all[i - 1].trim(), part]]), []);
  // A project leads with the work: title, a way in, the thing itself. The words come after, folded.
  const body = isProject ? `
  <article class="doc doc-project">
    <header class="page-head">${crumbsHtml}<h1>${esc(n.title)}</h1>${actions}</header>
    <a class="phero" href="${esc(openOf(n))}"${outward(openOf(n))}${zoomOf(n)} aria-label="Open ${esc(n.title)}">${projectMedia(n)}</a>
    <div class="pinfo">
      ${n.description ? `<p class="lede">${esc(n.description)}</p>` : ''}
      ${props}
      ${paths}
    </div>
    ${folds(mine).map(([name, md]) => `<details class="doc-notes"><summary>${esc(name)}</summary><div class="prose">${render(md, known)}</div></details>`).join('')}
    <div class="doc-links">
      ${pages}
      ${block('Linked from', back, (b) => row(b, { sub: b.description, meta: when(b.updated), archivable: false }))}
      ${folderLinks(n, notes)}
    </div>
  </article>` : `
  <article class="doc"${h2s >= 4 ? ' data-rail' : ''}>
    <header class="page-head">
      ${crumbsHtml}
      <h1>${esc(n.title)}</h1>
      ${n.description ? `<p class="lede">${esc(n.description)}</p>` : ''}
      ${props}
      ${paths}
    </header>
    ${media(n, notes)}
    <div class="prose">${render(mine, known)}</div>
    <div class="doc-links">
      ${pages}
      ${block('Linked from', back, (b) => row(b, { sub: b.description, meta: when(b.updated), archivable: false }))}
      ${folderLinks(n, notes)}
    </div>
  </article>`;

  return shell(n.title, body, { notes, here: shelf || '', js: PROPS_JS, note: n.name, top: n.title });
}

/* ---------- server ---------- */

const MIME = { '.woff2': 'font/woff2', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webm': 'video/webm' };

createServer(async (req, res) => {
  try { await handle(req, res); }
  catch (e) {
    if (e instanceof URIError) { if (!res.headersSent) res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found'); return; }
    console.error(`${req.method} ${req.url}:`, e);
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }).end('Something went wrong');
    else res.destroy();
  }
// HOST pins the listener to one interface. The always-on copy sets 127.0.0.1 so only its tunnel can reach it.
}).listen(PORT, process.env.HOST, () => {
  hooks.capture = () => scheduleSort();
  startSorter();
  console.log(`vault → http://localhost:${PORT}`);
  console.log(`reading ${VAULT}`);
});
process.on('unhandledRejection', (e) => console.error('unhandled:', e));

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  // Nothing here is ever for a search engine. Set once at the top: writeHead merges with
  // headers already on the response, so every route below inherits it without being touched.
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, noimageindex, nosnippet');
  // Crawlers are told to leave before they reach the login redirect, which they can't follow anyway.
  if (url.pathname === '/robots.txt') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    res.end('User-agent: *\nDisallow: /\n');
    return;
  }
  // Any write through the server drops the note cache once it has finished.
  if (req.method !== 'GET' && req.method !== 'HEAD') res.on('finish', invalidate);
  // Writes only come from the vault's own pages or the Cuttings extension. A page on some other
  // site can't POST here, even though localhost skips sign-in.
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers['sec-fetch-site'] === 'cross-site'
    && !String(req.headers.origin || '').startsWith('chrome-extension://')) {
    res.writeHead(403, { 'content-type': 'text/plain' }).end('Cross-site writes are not allowed');
    return;
  }
  if ((req.headers.host || '').startsWith('cutting.')) { res.writeHead(301, { location: '/cuttings' + req.url }).end(); return; }
  const send = (code, html) => {
    res.writeHead(code, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(html);
  };

  // Keep the private token link as a fallback for direct/tailnet access.
  if (url.pathname === '/login') {
    if (url.searchParams.has('t')) {
      if (url.searchParams.get('t') !== TOKEN) { res.writeHead(403).end('no'); return; }
      res.writeHead(302, { 'set-cookie': setCookie(req), location: '/' }).end();
      return;
    }
    return send(200, loginPage({ denied: url.searchParams.get('denied') === '1' }));
  }
  if (url.pathname === '/sso-callback') return send(200, loginPage());
  // The dot. Open, because browsers fetch icons without the page's credentials, and the
  // front door pings /favicon.png to see whether the Mac is awake.
  if (url.pathname === '/favicon.png' || url.pathname === '/favicon.ico') {
    res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'public, max-age=604800' });
    res.end(FAVICON);
    return;
  }
  if (url.pathname === '/favicon.svg' || url.pathname === '/favicon-light.svg') {
    res.writeHead(200, { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=604800' });
    res.end(dotSvg(url.pathname === '/favicon-light.svg' ? 'light' : 'dark'));
    return;
  }
  // Old per-note icons (still linked from a few hand-built pages) are the dot now too.
  if (/^\/favicon\/[\w.-]+\.svg$/.test(url.pathname)) { res.writeHead(301, { location: '/favicon.svg' }).end(); return; }
  // The typeface is open, and the sign-in page needs it before anyone has signed in.
  if (url.pathname.startsWith('/fonts/')) {
    const file = join(FONT_DIR, url.pathname.slice(7).replace(/[^\w.-]/g, ''));
    if (!existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'public, max-age=604800' });
    res.end(readFileSync(file));
    return;
  }
  const access = await authorize(req);
  // Keep (and slide) the reader's own session whenever a signed-in person loads a page.
  if (access.ok && access.email && req.method === 'GET' && !/^\/(api|fonts|receipt|search\.json|cuttings\/|pages\/|favicon)/.test(url.pathname)) res.setHeader('set-cookie', sessionCookie(req, access.email));
  if (!access.ok) {
    if (url.pathname.startsWith('/api/')) { res.writeHead(401, { 'content-type': 'application/json' }).end('{"error":"unauthorized"}'); return; }
    const destination = `${url.pathname}${url.search}`;
    const denied = access.reason === 'forbidden' ? '&denied=1' : '';
    res.writeHead(302, { location: `/login?return_to=${encodeURIComponent(destination)}${denied}`, 'cache-control': 'no-store' }).end();
    return;
  }
  if (url.pathname === '/manifest.webmanifest') {
    res.writeHead(200, { 'content-type': 'application/manifest+json', 'cache-control': 'public, max-age=86400' });
    res.end(JSON.stringify({ name: 'Vault', short_name: 'Vault', start_url: '/?intake', display: 'standalone', background_color: '#0f0f0f', theme_color: '#0f0f0f', icons: [{ src: '/favicon.png', type: 'image/png' }] }));
    return;
  }
  // The phone's capture app: its own page, manifest and offline copy. See capture.js.
  if (url.pathname === '/capture' || url.pathname === '/capture/') return send(200, capturePage());
  if (url.pathname === '/capture.webmanifest') {
    res.writeHead(200, { 'content-type': 'application/manifest+json', 'cache-control': 'no-cache' }).end(CAPTURE_MANIFEST);
    return;
  }
  if (url.pathname === '/capture-sw.js') {
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-cache' }).end(CAPTURE_SW);
    return;
  }
  if (await api(req, res, url)) return;


  // The vault's own stylesheet and theme boot, served so a standalone /pages/ piece can link
  // them instead of hand-copying tokens. A page that links these cannot drift from the reader.
  // Project pictures and videos (projects/_media in the vault). Videos answer byte ranges, which Safari needs.
  {
    const m = /^\/media\/([\w.-]+)$/.exec(url.pathname);
    if (m) {
      const file = join(MEDIA_DIR, m[1]);
      if (!existsSync(file)) { res.writeHead(404).end(); return; }
      const size = statSync(file).size, type = MEDIA_TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
      const r = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
      if (r) {
        const start = r[1] ? +r[1] : Math.max(0, size - +r[2]), end = r[1] && r[2] ? Math.min(+r[2], size - 1) : size - 1;
        res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${start}-${end}/${size}`, 'accept-ranges': 'bytes', 'content-length': end - start + 1, 'cache-control': 'private, max-age=3600' });
        createReadStream(file, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size, 'cache-control': 'private, max-age=3600' });
        createReadStream(file).pipe(res);
      }
      return;
    }
  }
  // The View's wallpapers and status-bar icon.
  if (url.pathname.startsWith('/look/')) {
    const file = join(LOOK_DIR, url.pathname.slice(6).replace(/[^\w.-]/g, ''));
    if (!existsSync(file)) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': { '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' }[extname(file)] || 'application/octet-stream', 'cache-control': 'public, max-age=604800' });
    res.end(readFileSync(file));
    return;
  }
  if (url.pathname === '/vault.css') {
    res.writeHead(200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store' });
    res.end(PAGE_CSS);
    return;
  }
  if (url.pathname === '/notes-layer.js' || url.pathname === '/edit-layer.js') {
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
    res.end(readFileSync(fileURLToPath(new URL('.' + url.pathname, import.meta.url))));
    return;
  }
  if (url.pathname === '/vault.js') {
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
    res.end(THEME_JS);
    return;
  }
  // The writing canvas: a /pages/ piece written as data, drawn by these two files (canvas/).
  if (url.pathname === '/canvas.css' || url.pathname === '/canvas.js') {
    const css = url.pathname.endsWith('.css');
    res.writeHead(200, { 'content-type': css ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8', 'cache-control': 'no-store' });
    res.end(readFileSync(join(CANVAS_DIR, css ? 'canvas.css' : 'canvas.js')));
    return;
  }

  // Standalone HTML pieces (ex claude.ai artifacts) — whole pages, linked from their notes.
  // The Today prototype grew into the home page; its old address goes there.
  if (url.pathname === '/pages/dashboard.html') { res.writeHead(302, { location: '/' }).end(); return; }
  // Pages had a shelf for an evening (Oct 12); About became Personal the same night.
  if (url.pathname === '/pages' || url.pathname === '/pages/') { res.writeHead(302, { location: '/inbox' }).end(); return; }
  if (url.pathname === '/about') { res.writeHead(301, { location: '/personal' }).end(); return; }
  if (url.pathname.startsWith('/pages/')) {
    let file = pageFile(url.pathname);
    // A page with its own files is a folder, served from its index.html. Its address ends in a slash, so the
    // page's relative links (app.js, data.json) land inside the folder.
    if (file && existsSync(file) && statSync(file).isDirectory()) {
      if (!url.pathname.endsWith('/')) { res.writeHead(301, { location: url.pathname + '/' + url.search }).end(); return; }
      file = join(file, 'index.html');
    }
    const type = file && PAGE_TYPES[extname(file).toLowerCase()];
    if (!type || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    res.end(readFileSync(file));
    return;
  }

  {
    const m = /^\/cuttings-folders\/([^/]+)\/analyze$/.exec(url.pathname);
    if (m) {
      const folder = decodeURIComponent(m[1]);
      const json = (code, o) => res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(o));
      const view = (j) => ({ state: j.state, started: j.started, count: j.count, error: j.error, guide: j.guide });
      if (req.method !== 'POST') return json(200, view(analysisState(folder)));
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        try {
          const { focus } = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
          const cuts = allNotes().filter((n) => n.type === 'cutting' && n.cutFolder === folder)
            .sort((a, b) => (a.name).localeCompare(b.name));
          json(200, view(analyzeFolder(folder, cuts, focus)));
        } catch (e) { res.writeHead(400).end(e.message); }
      });
      return;
    }
  }
  {
    const m = /^\/cuttings\/([^/]+)\/folder$/.exec(url.pathname);
    if (m && req.method === 'POST') {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        try {
          const out = setCuttingFolder(decodeURIComponent(m[1]), JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}').folder);
          res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(out));
        } catch (e) { res.writeHead(400).end(e.message); }
      });
      return;
    }
  }
  if (url.pathname.startsWith('/cuttings/') && req.method !== 'POST') {
    const file = join(VAULT, 'cuttings', decodeURIComponent(url.pathname.slice(10)).replace(/\.\./g, ''));
    if (!existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'public, max-age=604800' });
    res.end(readFileSync(file));
    return;
  }
  if (url.pathname === '/cuttings' && req.method === 'POST') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const out = writeCutting(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
        res.end(JSON.stringify(out));
      } catch (e) { res.writeHead(500, { 'access-control-allow-origin': '*' }).end(e.message); }
    });
    return;
  }

  const notes = allNotes();
  {
    const m = /^\/n\/([^/]+)\/archive$/.exec(url.pathname);
    if (m && req.method === 'POST') {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        try {
          const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
          const out = setArchived(decodeURIComponent(m[1]), !!body.on);
          res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(out));
        } catch (e) { res.writeHead(400).end(e.message); }
      });
      return;
    }
  }
  if (url.pathname === '/search.json') {
    const index = notes.map((n) => ({
      n: n.name, t: n.title, d: n.description, k: KIND[n.type] || n.type,
      s: [n.title, n.description, n.tags.join(' '), n.body].join(' ').toLowerCase(),
    })).concat(allPages(notes).map((p) => ({ n: p.name, h: p.page, t: p.title, d: p.from[0] ? p.from[0].title : '', k: 'page', s: [p.title, p.text].join(' ').toLowerCase() })));
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'private, max-age=60' }).end(JSON.stringify(index));
    return;
  }
  if (url.pathname === '/receipt') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(receiptBody(notes)); return; }
  {
    const pages = { '/': todayPage, '/todo': todoPage, '/inbox': inboxPage, '/projects': projectsPage, '/ideas': ideasPage,
      '/thinking': thinkingPage, '/resources': resourcesPage, '/clients': clientsPage, '/personal': personalPage };
    const page = pages[url.pathname.replace(/(.)\/$/, '$1')];
    if (page && !/^cuttings?\./.test(req.headers.host || '')) return send(200, page(notes));
  }
  {
    const m = /^\/todo\/(add|fresh|item|\d+)$/.exec(url.pathname);
    if (m && req.method === 'POST') {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        try {
          const b = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
          const out = m[1] === 'item' ? (b.add ? addTodo(b.add, b.move)
              : b.remove ? removeTodo(lineOfText(b.text))
              : b.move ? moveTodo(lineOfText(b.text), b.move)
              : setTodo(lineOfText(b.text), !!b.done))
            : m[1] === 'add' ? addTodo(b.text, b.tier)
            : m[1] === 'fresh' ? startFresh()
            : b.remove ? removeTodo(+m[1])
            : b.move ? moveTodo(+m[1], b.move, { top: !!b.top })
            : setTodo(+m[1], !!b.done);
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(out));
        } catch (e) { res.writeHead(e.code === 409 ? 409 : 400, { 'content-type': 'text/plain' }); res.end(e.message); }
      });
      return;
    }
  }
  // Intake is a box on every page now; the phone's home-screen icon still lands here.
  if (url.pathname === '/in' || url.pathname === '/in/') { res.writeHead(302, { location: '/?intake' }).end(); return; }
  // Cuttings has its own address. Its home is the gallery; the vault's old /cuttings points there.
  const onCuttings = /^cuttings?\./.test(req.headers.host || '');
  if (onCuttings && url.pathname === '/') return send(200, galleryPage(notes, { own: true }));
  if (url.pathname === '/cuttings' || url.pathname === '/cuttings/') {
    if ((req.headers.host || '').startsWith('vault.')) { res.writeHead(301, { location: '/cuttings' }).end(); return; }
    return send(200, galleryPage(notes));
  }
  {
    const m = /^\/cuttings\/([^/]+)\/(trash|restore)$/.exec(url.pathname);
    if (m && req.method === 'POST') {
      try {
        binCutting(decodeURIComponent(m[1]), m[2] === 'restore');
        res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
      } catch (e) { res.writeHead(400).end(e.message); }
      return;
    }
  }

  {
    const m = /^\/thinking\/([a-z]+)\/?$/.exec(url.pathname);
    if (m) { const page = thinkingCatPage(m[1], notes); if (page) return send(200, page); }
  }
  {
    const m = /^\/n\/([^/]+)\/view\/?$/.exec(url.pathname);
    if (m) {
      const n = byName(decodeURIComponent(m[1]));
      if (!n?.live) { res.writeHead(302, { location: n ? `/n/${encodeURIComponent(n.name)}` : '/' }).end(); return; }
      const [mine] = splitForClaude(n.body);
      const facts = [['Status', n.status], ['Horizon', HORIZON[n.horizon]], ['Kind', KIND[n.type] || n.type], ['Started', n.created && long(n.created)], ['Updated', n.updated && long(n.updated)]].filter(([, v]) => v);
      const host = (u) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
      const links = [['Live', n.live, host(n.live)], n.studio && ['Studio', n.studio, host(n.studio)], n.repo && ['Repo', n.repo, host(n.repo)]].filter(Boolean);
      return send(200, viewPage({ n, esc, facts, links, prose: render(mine, new Set(notes.map((x) => x.name))), themeJs: THEME_JS, favicon: FAVICON_LINK }));
    }
  }
  if (url.pathname.startsWith('/n/')) {
    const n = byName(decodeURIComponent(url.pathname.slice(3)));
    if (n?.page) { res.writeHead(302, { location: n.page }).end(); return; }
    if (n) return send(200, notePage(n, notes));
    return send(404, shell('Not found', pageHead({ title: 'No such note', sub: 'Nothing in the vault uses that name yet.' }), { notes }));
  }

  send(404, shell('Not found', pageHead({ title: 'Nothing here', sub: 'That address isn’t a page in the vault.' }), { notes }));
}
