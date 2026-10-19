/* Edit the words on a vault page where they stand: ⌥E, or Edit page in the menu, then click any words
   and type. Enter or clicking somewhere else saves into the file the page comes from (page-edit.js), Esc puts the
   words back, and ⌥E or Done ends it. Each run of text that changed goes with a few words from either side, so the
   server can tell which one was meant when the same words are in the file twice. Words a page draws with code aren't
   in its file: those go back to how they were, and the tip says to ask Claude with ⌥N instead.
   Only where the words come from a file: a /pages/ page, and a note's body (/n/). Loaded by /vault.js on every page. */
(function () {
  if (window.__edLayer || navigator.webdriver || /[?&]nonotes\b/.test(location.search) || self !== top) return;
  window.__edLayer = true;
  var PATH = location.pathname, NOTE = /^\/n\//.test(PATH), CAN = NOTE || /^\/pages\//.test(PATH);
  var CHROME = 'vault-nav, .vn-menu, .vn-scrim, .vault-back, #side, .side, .fx, .ed, button, input, textarea, select, svg, canvas, video, iframe, script, style, [contenteditable="false"]';
  var on = false, cur = null;

  // The menu's Edit page only shows where there's a file to write to.
  function menuItems() {
    var all = [].slice.call(document.querySelectorAll('[data-editpage]'));
    document.querySelectorAll('vault-nav').forEach(function (h) { if (h.shadowRoot) all = all.concat([].slice.call(h.shadowRoot.querySelectorAll('[data-editpage]'))); });
    return all;
  }
  function hideMenu() { if (!CAN) menuItems().forEach(function (b) { b.hidden = true; }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hideMenu); else hideMenu();
  if (!CAN) return;

  var css = '.ed{--ed-ac:var(--accent,#0071e3);--ed-bg:var(--raised,#1f1f21);--ed-tx:var(--text,#fff);--ed-t2:var(--text-3,rgb(255 255 255/.64));' +
    'position:fixed;inset:0;z-index:2147483001;pointer-events:none;font:420 14px/20px Geist,system-ui,sans-serif;-webkit-font-smoothing:antialiased}' +
    '.ed-bar{position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:4px 4px 4px 14px;border-radius:999px;background:var(--ed-bg);color:var(--ed-tx);font-size:13px;box-shadow:0 4px 16px rgb(0 0 0/.25);pointer-events:auto;white-space:nowrap}' +
    '.ed-bar span{color:var(--ed-t2)}' +
    '.ed-bar button{height:28px;padding:0 12px;border:0;border-radius:999px;background:var(--ed-ac);color:#fff;font:inherit;font-weight:500;cursor:pointer}' +
    '.ed-hi{position:fixed;border-radius:4px;box-shadow:0 0 0 1.5px color-mix(in srgb,var(--ed-ac) 55%,transparent);pointer-events:none}' +
    '.ed-hi.on{box-shadow:0 0 0 2px var(--ed-ac)}' +
    '[data-ed-on]{outline:none;cursor:text}' +
    'html.ed-mode body{cursor:text}';
  var root = document.createElement('div'); root.className = 'ed';
  var bar = document.createElement('div'); bar.className = 'ed-bar';
  var hi = document.createElement('div'); hi.className = 'ed-hi';
  root.append(bar);
  function mount() {
    if (root.isConnected) return;
    document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));
    document.body.appendChild(root);
  }
  var tipT = 0;
  function say(text, ms) {
    bar.innerHTML = '<span></span><button type="button">Done</button>';
    bar.firstChild.textContent = text;
    bar.lastChild.onclick = stop;
    clearTimeout(tipT);
    if (ms) tipT = setTimeout(function () { if (on) say(idle()); }, ms);
  }
  var idle = function () { return matchMedia('(pointer: coarse)').matches ? 'Tap any words to change them' : 'Click any words to change them · Esc'; };

  /* ---- which words: the block of text under the pointer ---- */
  var scope = function () { return NOTE ? document.querySelector('.doc .prose') : document.body; };
  function caretAt(x, y) {
    if (document.caretPositionFromPoint) { var p = document.caretPositionFromPoint(x, y); return p && { node: p.offsetNode, offset: p.offset }; }
    if (document.caretRangeFromPoint) { var r = document.caretRangeFromPoint(x, y); return r && { node: r.startContainer, offset: r.startOffset }; }
    return null;
  }
  // The nearest element that isn't inline: a heading, a paragraph, a list item, a card's line.
  function unitAt(x, y) {
    var c = caretAt(x, y), s = scope();
    if (!c || c.node.nodeType !== 3 || !c.node.data.trim() || !s) return null;
    var el = c.node.parentElement;
    if (!el || !s.contains(el) || el.closest(CHROME)) return null;
    var u = el;
    while (u.parentElement && u !== s && /^inline/.test(getComputedStyle(u).display) && u.parentElement !== s) u = u.parentElement;
    if (u.closest(CHROME) || (u.textContent || '').length > 4000) u = el;
    return { el: u, caret: c };
  }
  function texts(el) {
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), out = [], n;
    while ((n = w.nextNode())) if (!n.parentElement.closest('script, style')) out.push(n);
    return out;
  }
  // A few words on either side of a run, as the page shows them.
  function around(all, i) {
    var b = '', a = '';
    for (var j = i - 1; j >= 0 && b.length < 80; j--) b = all[j].data + ' ' + b;
    for (var k = i + 1; k < all.length && a.length < 80; k++) a += ' ' + all[k].data;
    return { before: b.replace(/\s+/g, ' ').trim().slice(-80), after: a.replace(/\s+/g, ' ').trim().slice(0, 80) };
  }

  /* ---- editing one block ---- */
  function begin(u) {
    var el = u.el, all = texts(scope()), mine = texts(el);
    cur = { el: el, html: el.innerHTML, runs: mine.map(function (n) { var c = around(all, all.indexOf(n)); return { node: n, old: n.data, before: c.before, after: c.after }; }) };
    el.setAttribute('contenteditable', 'true');
    el.setAttribute('data-ed-on', '');
    el.focus({ preventScroll: true });
    try { var r = document.createRange(); r.setStart(u.caret.node, u.caret.offset); r.collapse(true); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {}
    el.addEventListener('keydown', key);
    el.addEventListener('beforeinput', guard);
    el.addEventListener('paste', paste);
    el.addEventListener('drop', drop);
    el.addEventListener('blur', blur);
    frame(el, true);
  }
  function key(e) {
    e.stopPropagation();   // the page's own shortcuts stay out while typing
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); end(true); }
    else if (e.key === 'Escape') { e.preventDefault(); end(false); }
  }
  // Words only: no new paragraphs, no bold, no pasted formatting.
  function guard(e) { if (/^(insertParagraph|insertLineBreak|format)/.test(e.inputType)) e.preventDefault(); }
  function paste(e) { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData.getData('text/plain') || '').replace(/\s+/g, ' ')); }
  function drop(e) { e.preventDefault(); }
  function blur() { setTimeout(function () { if (cur && document.activeElement !== cur.el) end(true); }, 0); }

  function end(save) {
    var c = cur; if (!c) return;
    cur = null;
    var el = c.el;
    ['keydown', 'beforeinput', 'paste', 'drop', 'blur'].forEach(function (t, i) { el.removeEventListener(t, [key, guard, paste, drop, blur][i]); });
    el.removeAttribute('contenteditable'); el.removeAttribute('data-ed-on');
    hi.classList.remove('on'); hi.remove();
    if (!save) { el.innerHTML = c.html; return; }
    var norm = function (s) { return String(s).replace(/\s+/g, ' ').trim(); };
    var changed = c.runs.filter(function (r) { var now = r.node.isConnected && el.contains(r.node) ? r.node.data : ''; r.now = now; return norm(now) !== norm(r.old); });
    if (!changed.length) return;
    say('Saving…');
    fetch('/api/page-edit', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: PATH, edits: changed.map(function (r) { return { old: r.old, new: r.now, before: r.before, after: r.after }; }) }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; }); })
      .then(function (j) {
        if (!j.missed.length) return say(j.built ? 'Saved · a script builds this page, so ask Claude to carry it into the script' : 'Saved', j.built ? 5000 : 1600);
        // What couldn't be found goes back to how it was, so the page never shows words the file doesn't have.
        if (!j.saved) el.innerHTML = c.html;
        else j.missed.forEach(function (m) { var r = changed[m.i]; if (r.node.isConnected) r.node.data = r.old; });
        var why = j.missed[0].why;
        say((j.saved ? 'Saved some. ' : '') + (why === 'in the file more than once' ? 'Those words are in the file twice, so ⌥N to ask Claude'
          : why === 'needs quoting' ? 'That one needs Claude: ⌥N' : 'Those words are drawn by code, so ⌥N to ask Claude'), 4500);
      })
      .catch(function (e) { el.innerHTML = c.html; say(String(e.message || '').indexOf('made by the vault') >= 0 ? e.message : 'Didn’t save. Try again.', 3500); });
  }

  /* ---- the outline that says what a click will edit ---- */
  function frame(el, onNow) {
    var r = el.getBoundingClientRect();
    Object.assign(hi.style, { left: r.left - 4 + 'px', top: r.top - 2 + 'px', width: r.width + 8 + 'px', height: r.height + 4 + 'px' });
    hi.classList.toggle('on', !!onNow);
    if (!hi.isConnected) root.appendChild(hi);
  }
  var raf = 0;
  function move(e) {
    if (e.pointerType === 'touch') return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      if (cur) return frame(cur.el, true);
      var u = unitAt(e.clientX, e.clientY);
      if (u) frame(u.el, false); else hi.remove();
    });
  }
  function scrolled() { if (cur) frame(cur.el, true); else hi.remove(); }

  /* ---- while it's on, a click edits instead of doing what it would ---- */
  // The vault's own menu and the notes still work, so you can leave the page or pin a note mid-edit.
  var NAV = 'vault-nav, #side, .side, .vn-menu, .vn-scrim, .vault-back, .fx';
  var inside = function (t) { return (cur && cur.el.contains(t)) || root.contains(t) || !!(t.closest && t.closest(NAV)); };
  function hold(e) { if (!inside(e.target)) e.stopPropagation(); }
  function click(e) {
    if (root.contains(e.target) || (e.target.closest && e.target.closest(NAV))) return;
    if (cur && cur.el.contains(e.target)) { if (e.target.closest('a')) e.preventDefault(); return; }
    e.preventDefault(); e.stopPropagation();
    if (cur) end(true);
    var u = unitAt(e.clientX, e.clientY);
    if (u) begin(u);
  }

  function start() {
    if (on) return stop();
    if (window.vaultNotes && window.vaultNotes.cancel) window.vaultNotes.cancel();
    mount(); on = true; window.__edOn = true;
    document.documentElement.classList.add('ed-mode');
    say(idle());
    addEventListener('pointermove', move, true);
    addEventListener('scroll', scrolled, { passive: true, capture: true });
    ['pointerdown', 'mousedown', 'touchstart'].forEach(function (t) { addEventListener(t, hold, true); });
    addEventListener('click', click, true);
  }
  function stop() {
    if (cur) end(true);
    on = false; window.__edOn = false;
    document.documentElement.classList.remove('ed-mode');
    removeEventListener('pointermove', move, true);
    removeEventListener('scroll', scrolled, { capture: true });
    ['pointerdown', 'mousedown', 'touchstart'].forEach(function (t) { removeEventListener(t, hold, true); });
    removeEventListener('click', click, true);
    // The last save's answer stays a moment before the bar goes.
    setTimeout(function () { if (!on) root.remove(); }, bar.textContent.indexOf('Sav') === 0 ? 1600 : 0);
    hi.remove();
  }

  addEventListener('keydown', function (e) {
    if (e.altKey && !e.metaKey && !e.ctrlKey && e.code === 'KeyE') { e.preventDefault(); e.stopPropagation(); start(); return; }
    if (e.key === 'Escape' && on && !cur) { e.preventDefault(); stop(); }
  }, true);
  // Edit page in the vault's menu (the phone's way in). The menu can sit in a shadow root, so look along the path.
  addEventListener('click', function (e) {
    var path = e.composedPath ? e.composedPath() : [e.target];
    for (var i = 0; i < path.length; i++) if (path[i].dataset && path[i].dataset.editpage !== undefined) {
      e.preventDefault(); e.stopPropagation();
      document.documentElement.classList.remove('vn-open', 'nav-open');
      setTimeout(start, 250);   // after the menu slides away
      return;
    }
  }, true);
  window.vaultEdit = { start: start, stop: stop };
})();
