/* Notes on anything: ⌥N, or Pin note in the menu on a phone, then click a spot or drag an area and
   say what's wrong. Or select some words first, the way a Doc comments (a Comment button comes up by them): the note
   is pinned to those words and they stay marked. The note goes to vault/fixes/ (fixes.js) with what Claude needs to find it again: the element
   (a selector, its words), where in it, the window size and theme. Claude fixes it and answers in the note; the pin
   stays on the page with the answer until it's cleared.
   Served at /notes-layer.js and loaded by /vault.js. Another app can load the same file: set window.NOTES_API,
   NOTES_ABOUT and NOTES_PATH first (NOTES_GLASS for a frosted card, NOTES_NO_WORDS to leave word notes to the app).
   Never in headless shots (webdriver) or with ?nonotes in the address. Colours come from the page's tokens. */
(function () {
  if (window.__fxLayer || navigator.webdriver || /[?&]nonotes\b/.test(location.search) || self !== top) return;
  window.__fxLayer = true;
  var API = window.NOTES_API || '/api/fixes', ABOUT = window.NOTES_ABOUT || '', PATH = window.NOTES_PATH || location.pathname;
  var notes = [], open = null, placing = false;

  var css = '.fx{--fx-ac:var(--accent,var(--c-accent,#0071e3));--fx-on:var(--on-accent,var(--c-on-accent,#fff));--fx-soft:var(--accent-soft,var(--c-accent-soft,rgb(0 113 227/.14)));' +
    '--fx-bg:var(--raised,#1f1f21);--fx-tx:var(--text,var(--c-text,#fff));--fx-t2:var(--text-3,var(--c-text-3,rgb(255 255 255/.64)));--fx-fill:color-mix(in srgb,var(--fx-tx) 9%,transparent);' +
    'position:fixed;inset:0;z-index:2147483000;pointer-events:none;font:420 14px/20px Geist,system-ui,sans-serif;-webkit-font-smoothing:antialiased}' +
    '.fx *{box-sizing:border-box}' +
    '.fx-veil{position:absolute;inset:0;pointer-events:auto;cursor:crosshair;touch-action:none}' +
    '.fx-hi{position:fixed;border-radius:4px;box-shadow:inset 0 0 0 1.5px var(--fx-ac);background:var(--fx-soft);pointer-events:none}' +
    '.fx-tip{position:fixed;top:calc(12px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);padding:6px 12px;border-radius:999px;background:var(--fx-bg);color:var(--fx-tx);font-size:13px;line-height:20px;box-shadow:0 4px 16px rgb(0 0 0/.25);white-space:nowrap}' +
    '.fx-pin{position:fixed;min-width:20px;height:20px;padding:0 5px;border:0;border-radius:999px;background:var(--fx-ac);color:var(--fx-on);font:500 11px/20px Geist,system-ui,sans-serif;font-variant-numeric:tabular-nums;text-align:center;transform:translate(-50%,-50%);box-shadow:0 1px 4px rgb(0 0 0/.3);pointer-events:auto;cursor:pointer}' +
    '.fx-pin.done{background:var(--fx-bg);color:var(--fx-tx)}' +
    '.fx-pin.area{transform:translate(-4px,-4px)}' +
    '.fx-card{position:fixed;width:288px;padding:12px;border-radius:12px;background:var(--fx-bg);color:var(--fx-tx);box-shadow:0 8px 32px rgb(0 0 0/.3);pointer-events:auto;display:grid;gap:8px}' +
    '.fx-what{font-size:12px;line-height:16px;color:var(--fx-t2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.fx-card textarea{width:100%;min-height:60px;padding:0;border:0;background:none;color:inherit;font:inherit;resize:none;outline:none}' +
    '.fx-text{white-space:pre-wrap;overflow-wrap:anywhere}' +
    '.fx-reply{padding:8px;border-radius:8px;background:var(--fx-fill);white-space:pre-wrap;overflow-wrap:anywhere}' +
    '.fx-row{display:flex;gap:8px;justify-content:flex-end;align-items:center}' +
    '.fx-row .fx-st{margin-right:auto;font-size:12px;color:var(--fx-t2)}' +
    '.fx-b{height:28px;padding:0 12px;border:0;border-radius:999px;background:var(--fx-fill);color:inherit;font:500 13px/28px Geist,system-ui,sans-serif;cursor:pointer}' +
    '.fx-b.go{background:var(--fx-ac);color:var(--fx-on)}' +
    // On a busy wallpaper a flat card disappears: glass instead, frost and a hairline edge (window.NOTES_GLASS)
    '.fx-mark,.fx-hi.w{position:fixed;border-radius:2px;background:color-mix(in srgb,var(--fx-ac) 16%,transparent);box-shadow:0 1.5px 0 color-mix(in srgb,var(--fx-ac) 60%,transparent);pointer-events:none}' +
    '.fx-mark.done{background:var(--fx-fill);box-shadow:none}' +
    '.fx-mark.on,.fx-hi.w{background:color-mix(in srgb,var(--fx-ac) 30%,transparent)}' +
    '.fx-sel{position:fixed;display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 6px 0 12px;border:0;border-radius:999px;background:var(--fx-bg);color:var(--fx-tx);font:500 13px/1 Geist,system-ui,sans-serif;box-shadow:0 4px 16px rgb(0 0 0/.25);pointer-events:auto;cursor:pointer}' +
    '.fx-sel kbd{font:inherit;font-size:11px;line-height:16px;padding:0 5px;border-radius:5px;background:var(--fx-fill);color:var(--fx-t2)}' +
    '.fx-quote{padding-left:8px;box-shadow:inset 2px 0 0 var(--fx-ac);font-size:13px;line-height:18px;color:var(--fx-tx);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}' +
    '.fx.fx-g{--fx-bg:rgb(40 40 44/.72)}.fx.fx-g .fx-tip,.fx.fx-g .fx-card{-webkit-backdrop-filter:blur(24px) saturate(1.4);backdrop-filter:blur(24px) saturate(1.4);box-shadow:inset 0 0 0 .5px rgb(255 255 255/.16),0 8px 32px rgb(0 0 0/.3)}' +
    '@media (max-width:560px){.fx-card{left:12px!important;right:12px;width:auto;top:auto!important;bottom:calc(12px + env(safe-area-inset-bottom))}}';

  var root = document.createElement('div');
  root.className = 'fx' + (window.NOTES_GLASS ? ' fx-g' : '');
  function mount() {
    if (root.isConnected) return;
    document.head.appendChild(Object.assign(document.createElement('style'), { textContent: css }));
    document.body.appendChild(root);
  }
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var clamp = function (x, lo, hi) { return Math.max(lo, Math.min(hi, x)); };
  var mine = function (el) { return el && (root.contains(el) || el === document.documentElement || el === document.body); };

  /* ---- what Claude needs to find the spot again ---- */
  function selector(el) {
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.body && parts.length < 8) {
      if (el.id && document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) { parts.unshift('#' + CSS.escape(el.id)); break; }
      var t = el.tagName.toLowerCase(), p = el.parentElement;
      if (p) { var same = [].filter.call(p.children, function (c) { return c.tagName === el.tagName; }); if (same.length > 1) t += ':nth-of-type(' + (same.indexOf(el) + 1) + ')'; }
      parts.unshift(t); el = p;
    }
    return parts.join(' > ');
  }
  function words(el) {
    var t = el.getAttribute('aria-label') || el.getAttribute('title') || el.innerText || el.value || el.alt || '';
    return String(t).replace(/\s+/g, ' ').trim().slice(0, 140);
  }
  function tagOf(el) {
    var c = [].slice.call(el.classList || [], 0, 2).filter(function (x) { return !/^fx/.test(x); });
    return el.tagName.toLowerCase() + (c.length ? '.' + c.join('.') : '');
  }
  function under(x, y) {
    var all = document.elementsFromPoint(x, y);
    for (var i = 0; i < all.length; i++) if (!mine(all[i])) return all[i];
    return null;
  }
  // Where a note sits now: on its element if that's still on the page, else where it was left.
  function spot(n) {
    var rs = wordRects(n);
    if (rs.length) {
      // In the margin beside the words' last line, the way a Doc does, so the pin never covers words.
      var l = rs[rs.length - 1], b = n._r.startContainer.parentElement, br = b ? b.getBoundingClientRect() : l;
      return { x: Math.min(Math.max(br.right, l.right) + 14, innerWidth - 12), y: l.top + l.height / 2, w: 0, h: 0, rects: rs };
    }
    var a = n.kind === 'area' && n.box ? n.box : n.point || { x: 0, y: 0 };
    var el = null;
    try { el = n.el && n.el.sel ? document.querySelector(n.el.sel) : null; } catch (e) {}
    if (el) {
      var r = el.getBoundingClientRect();
      if (!r.width && !r.height) return null;
      return { x: r.left + (n.el.rx || 0) * r.width, y: r.top + (n.el.ry || 0) * r.height, w: a.w, h: a.h };
    }
    return { x: a.x - scrollX, y: a.y - scrollY, w: a.w, h: a.h };
  }

  /* ---- notes on words ---- */
  // Notes on selected words, unless the page that loads this has its own (window.NOTES_NO_WORDS).
  var WORDS = !window.NOTES_NO_WORDS;
  var squash = function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); };
  // The page's words as one string, spaces squashed, with the text node and offset each character came from.
  function pageText() {
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      var p = n.parentElement;
      return !p || root.contains(n) || p.closest('script, style, noscript, .ed') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    } });
    var s = '', map = [], n, sp = true;
    while ((n = w.nextNode())) for (var i = 0; i < n.data.length; i++) {
      var c = n.data[i];
      if (/\s/.test(c)) { if (sp) continue; c = ' '; sp = true; } else sp = false;
      s += c; map.push(n, i);
    }
    return { s: s, map: map };
  }
  var tail = function (a, b) { a = squash(a); b = squash(b); var k = 0; while (k < a.length && k < b.length && a[a.length - 1 - k] === b[b.length - 1 - k]) k++; return k; };
  var head = function (a, b) { a = squash(a); b = squash(b); var k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++; return k; };
  // The words again on the page; when they're there more than once, the one whose neighbours match.
  function findWords(wd) {
    var q = squash(wd.text);
    if (!q) return null;
    var t = pageText(), at = -1, best = -1, i = -1;
    while ((i = t.s.indexOf(q, i + 1)) >= 0) {
      var sc = tail(t.s.slice(Math.max(0, i - 80), i), wd.before) + head(t.s.slice(i + q.length, i + q.length + 80), wd.after);
      if (sc > best) { best = sc; at = i; }
    }
    if (at < 0) return null;
    var r = document.createRange(), e = at + q.length - 1;
    r.setStart(t.map[at * 2], t.map[at * 2 + 1]); r.setEnd(t.map[e * 2], t.map[e * 2 + 1] + 1);
    return r;
  }
  // Pages redraw, so a note's words are looked for again when they've gone (at most once a second).
  function rangeOf(n) {
    var r = n._r;
    if (r && r.startContainer.isConnected && squash(r.toString()) === squash(n.words.text)) return r;
    if (n._t && Date.now() - n._t < 1000) return null;
    n._t = Date.now(); n._r = findWords(n.words);
    return n._r;
  }
  function wordRects(n) {
    var r = n.kind === 'words' && n.words && rangeOf(n);
    return r ? [].filter.call(r.getClientRects(), function (x) { return x.width > 0 && x.height > 0; }) : [];
  }

  /* ---- the pins ---- */
  var marks = document.createElement('div');
  var pins = document.createElement('div');
  root.append(marks, pins);
  function draw() {
    pins.innerHTML = notes.map(function (n, i) {
      return '<button type="button" class="fx-pin' + (n.status === 'done' ? ' done' : '') + (n.kind === 'area' ? ' area' : '') + '" data-id="' + esc(n.id) + '" aria-label="Note ' + (i + 1) + '">' +
        (n.status === 'done' ? '✓' : i + 1) + '</button>';
    }).join('');
    place();
  }
  var raf = 0;
  function place() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () {
      var mk = '';
      notes.forEach(function (n) {
        wordRects(n).forEach(function (r) {
          mk += '<div class="fx-mark' + (n.status === 'done' ? ' done' : '') + (open && open.n === n ? ' on' : '') + '" style="left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px"></div>';
        });
      });
      marks.innerHTML = mk;
      [].forEach.call(pins.children, function (b) {
        var n = byId(b.dataset.id), s = n && spot(n);
        b.hidden = !s || s.x < -20 || s.y < -20 || s.x > innerWidth + 20 || s.y > innerHeight + 20;
        if (s) { b.style.left = s.x + 'px'; b.style.top = s.y + 'px'; }
      });
      if (open && open.n) {
        var s = spot(open.n);
        if (s && hi.isConnected) box(s.x, s.y, s.w || 0, s.h || 0);
      }
    });
  }
  var byId = function (id) { return notes.filter(function (n) { return n.id === id; })[0]; };
  addEventListener('scroll', place, { passive: true, capture: true });
  addEventListener('resize', place);
  setInterval(function () { if (notes.length) place(); }, 1000); // panels that open and close move things without a scroll

  /* ---- the highlight and the card ---- */
  var hi = document.createElement('div'); hi.className = 'fx-hi';
  function box(x, y, w, h) {
    if (!w && !h) { hi.remove(); return; }
    Object.assign(hi.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
    if (!hi.isConnected) root.appendChild(hi);
  }
  var card = document.createElement('div'); card.className = 'fx-card';
  card.addEventListener('keydown', function (e) { e.stopPropagation(); });   // the page's own keys stay out while typing
  card.addEventListener('pointerdown', function (e) { e.stopPropagation(); if (!e.target.closest('button, textarea')) e.preventDefault(); }); // a click on the card's words keeps the caret in the note
  function show(x, y) {
    root.appendChild(card);
    var h = card.offsetHeight;
    card.style.left = clamp(x + 16, 12, innerWidth - 300) + 'px';
    card.style.top = clamp(y - 12, 12, innerHeight - h - 12) + 'px';
  }
  function close() { var was = open; card.remove(); hi.remove(); hi.classList.remove('w'); open = null; if (was && was.n && was.n.kind === 'words') place(); }
  var what = function (n) { return n.words ? '<div class="fx-quote">' + esc(n.words.text) + '</div>' : '<div class="fx-what">' + esc(n.el ? (n.el.text || n.el.tag) : 'This spot') + '</div>'; };

  function compose(draft, x, y) {
    open = { draft: draft };
    card.innerHTML = what(draft) +
      '<textarea rows="3" placeholder="What should change?" aria-label="Note"></textarea>' +
      '<div class="fx-row"><button type="button" class="fx-b" data-x="cancel">Cancel</button><button type="button" class="fx-b go" data-x="save">Save</button></div>';
    show(x, y);
    var ta = card.querySelector('textarea');
    ta.focus(); setTimeout(function () { ta.focus(); }, 0);
    var save = function () {
      var text = ta.value.trim();
      if (!text) { ta.focus(); return; }
      draft.text = text;
      card.querySelector('[data-x="save"]').disabled = true;
      fetch(API, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (n) { notes.push(n); close(); draw(); tip('Saved for Claude', 1800); })
        .catch(function () { card.querySelector('[data-x="save"]').disabled = false; tip('Didn’t save. Try again.', 2500); });
    };
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); save(); }
      if (e.key === 'Escape') close();
    });
    card.querySelector('[data-x="cancel"]').onclick = close;
    card.querySelector('[data-x="save"]').onclick = save;
  }

  function view(n) {
    var s = spot(n) || { x: 40, y: 40 };
    open = { n: n };
    var done = n.status === 'done';
    card.innerHTML = what(n) +
      '<div class="fx-text">' + esc(n.text) + '</div>' +
      (n.reply ? '<div class="fx-reply">' + esc(n.reply) + '</div>' : '') +
      '<div class="fx-row"><span class="fx-st">' + (done ? 'Done' : 'Waiting for Claude') + '</span>' +
      (done ? '<button type="button" class="fx-b" data-x="reopen">Reopen</button><button type="button" class="fx-b go" data-x="clear">Clear</button>'
        : '<button type="button" class="fx-b" data-x="clear">Delete</button>') + '</div>';
    if (n.kind === 'area') box(s.x, s.y, s.w || 0, s.h || 0);
    show(s.x, s.y);
    if (n.kind === 'words') place();
    card.querySelector('[data-x="clear"]').onclick = function () {
      fetch(API + '/' + encodeURIComponent(n.id), { method: 'DELETE', credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error(r.status); notes = notes.filter(function (x) { return x !== n; }); close(); draw(); })
        .catch(function () { tip('Didn’t go through. Try again.', 2500); });
    };
    var re = card.querySelector('[data-x="reopen"]');
    if (re) re.onclick = function () {
      fetch(API + '/' + encodeURIComponent(n.id), { method: 'PATCH', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'open' }) })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (m) { notes[notes.indexOf(n)] = m; close(); draw(); })
        .catch(function () { tip('Didn’t go through. Try again.', 2500); });
    };
  }
  pins.addEventListener('click', function (e) {
    var b = e.target.closest('.fx-pin'); if (!b) return;
    var n = byId(b.dataset.id);
    if (open && open.n === n) close(); else if (n) view(n);
  });
  addEventListener('pointerdown', function (e) { if (open && !root.contains(e.target)) close(); }, true);

  var tipEl = document.createElement('div'); tipEl.className = 'fx-tip';
  var tipT = 0;
  function tip(text, ms) {
    tipEl.textContent = text; root.appendChild(tipEl);
    clearTimeout(tipT); if (ms) tipT = setTimeout(function () { tipEl.remove(); }, ms);
  }

  /* ---- commenting on selected words ---- */
  var pill = document.createElement('button');
  pill.type = 'button'; pill.className = 'fx-sel'; pill.innerHTML = 'Comment<kbd>⌥N</kbd>';
  function chosen() {
    if (!WORDS || placing || window.__edOn) return null;
    var s = getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) return null;
    var r = s.getRangeAt(0), t = squash(s.toString());
    if (t.length < 2 || t.length > 1000) return null;
    var a = r.commonAncestorContainer, el = a.nodeType === 1 ? a : a.parentElement;
    if (!el || root.contains(el) || el.closest('input, textarea, [contenteditable], .ed')) return null;
    return { range: r, text: t, el: el };
  }
  var selT = 0, dragging = false;
  function selCheck() {
    clearTimeout(selT);
    selT = setTimeout(function () {
      var c = !dragging && chosen();
      if (!c) { pill.remove(); return; }
      mount();
      var rs = c.range.getClientRects(), last = rs[rs.length - 1] || c.range.getBoundingClientRect();
      // On a phone the system's own menu sits above the words, so this goes under them.
      pill.style.left = clamp(matchMedia('(pointer: coarse)').matches ? last.left : last.right - 48, 8, innerWidth - 128) + 'px';
      pill.style.top = clamp(last.bottom + 8, 8, innerHeight - 40) + 'px';
      root.appendChild(pill);
    }, 160);
  }
  if (WORDS) {
    document.addEventListener('selectionchange', selCheck);
    addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && !root.contains(e.target)) { dragging = true; pill.remove(); } }, true);
    addEventListener('pointerup', function () { if (dragging) { dragging = false; selCheck(); } }, true);
  }
  pill.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); });   // the words stay selected
  pill.addEventListener('click', function (e) { e.preventDefault(); commentOn(); });
  function commentOn() {
    var c = chosen();
    if (!c) return false;
    mount(); pill.remove(); close();
    var r = c.range, rs = r.getClientRects(), b = r.getBoundingClientRect(), first = rs[0] || b, last = rs[rs.length - 1] || b;
    var pre = document.createRange(), post = document.createRange();
    pre.setStart(document.body, 0); pre.setEnd(r.startContainer, r.startOffset);
    post.setStart(r.endContainer, r.endOffset); post.setEnd(document.body, document.body.childNodes.length);
    var draft = {
      about: ABOUT, path: PATH, url: location.href, title: document.title, kind: 'words',
      words: { text: c.text, before: squash(pre.toString()).slice(-80), after: squash(post.toString()).slice(0, 80) },
      point: { x: first.left + scrollX, y: first.top + scrollY },
      box: { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height },
      view: { w: innerWidth, h: innerHeight, theme: document.documentElement.dataset.mode || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'), sx: scrollX, sy: scrollY },
      el: { sel: selector(c.el), tag: tagOf(c.el), text: words(c.el), rx: 0, ry: 0 },
    };
    getSelection().removeAllRanges();
    hi.classList.add('w');   // see-through, so the words show while you write
    box(b.left - 1, b.top, b.width + 2, b.height);
    compose(draft, last.right, last.top);
    return true;
  }

  /* ---- placing: click a spot, or drag an area ---- */
  var veil = document.createElement('div'); veil.className = 'fx-veil';
  function start() {
    if (!placing && commentOn()) return;
    mount(); close();
    if (placing) return stop();
    placing = true;
    root.appendChild(veil);
    tip(matchMedia('(pointer: coarse)').matches ? 'Tap a spot or drag an area' : 'Click a spot or drag an area · Esc');
  }
  function stop() { placing = false; veil.remove(); hi.remove(); tipEl.remove(); }
  var down = null;
  veil.addEventListener('pointermove', function (e) {
    if (down) {
      var x = Math.min(down.x, e.clientX), y = Math.min(down.y, e.clientY);
      down.moved = down.moved || Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 8;
      if (down.moved) box(x, y, Math.abs(e.clientX - down.x), Math.abs(e.clientY - down.y));
      return;
    }
    var el = under(e.clientX, e.clientY);
    if (el) { var r = el.getBoundingClientRect(); box(r.left, r.top, r.width, r.height); }
  });
  veil.addEventListener('pointerdown', function (e) { e.preventDefault(); veil.setPointerCapture(e.pointerId); down = { x: e.clientX, y: e.clientY }; });
  veil.addEventListener('pointerup', function (e) {
    if (!down) return;
    var d = down; down = null;
    // The click that follows this pointerup would land on whatever is under the veil (it's gone by then): a button,
    // which would also take the focus away from the note. Swallow that one click.
    var swallow = function (ev) { ev.preventDefault(); ev.stopPropagation(); removeEventListener('click', swallow, true); };
    addEventListener('click', swallow, true);
    setTimeout(function () { removeEventListener('click', swallow, true); }, 400);
    var area = d.moved, x = area ? Math.min(d.x, e.clientX) : e.clientX, y = area ? Math.min(d.y, e.clientY) : e.clientY;
    var w = area ? Math.abs(e.clientX - d.x) : 0, h = area ? Math.abs(e.clientY - d.y) : 0;
    var el = under(area ? x + w / 2 : x, area ? y + h / 2 : y);
    stop();
    var draft = {
      about: ABOUT, path: PATH, url: location.href, title: document.title, kind: area ? 'area' : 'pin',
      point: area ? null : { x: x + scrollX, y: y + scrollY },
      box: area ? { x: x + scrollX, y: y + scrollY, w: w, h: h } : null,
      view: { w: innerWidth, h: innerHeight, theme: document.documentElement.dataset.mode || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'), sx: scrollX, sy: scrollY },
    };
    if (el) {
      var r = el.getBoundingClientRect();
      draft.el = { sel: selector(el), tag: tagOf(el), text: words(el), rx: r.width ? (x - r.left) / r.width : 0, ry: r.height ? (y - r.top) / r.height : 0 };
    }
    if (area) box(x, y, w, h);
    compose(draft, area ? x + w : x, y);
  });

  addEventListener('keydown', function (e) {
    if (e.altKey && !e.metaKey && !e.ctrlKey && e.code === 'KeyN') { e.preventDefault(); e.stopPropagation(); start(); return; }
    if (e.key === 'Escape' && placing) { e.preventDefault(); e.stopPropagation(); stop(); }
  }, true);
  // Pin note in the vault's menu (the phone's way in). The menu can sit in a shadow root, so look along the path.
  addEventListener('click', function (e) {
    var path = e.composedPath ? e.composedPath() : [e.target];
    for (var i = 0; i < path.length; i++) if (path[i].dataset && path[i].dataset.fixnote !== undefined) {
      e.preventDefault();
      document.documentElement.classList.remove('vn-open', 'nav-open');
      setTimeout(start, 250); // after the menu slides away, so the first tap lands on the page
      return;
    }
  }, true);

  function load() {
    fetch(API + '?path=' + encodeURIComponent(PATH), { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (list) { notes = list; if (notes.length) { mount(); draw(); } })
      .catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
  window.vaultNotes = { start: start, reload: load, cancel: function () { if (placing) stop(); close(); pill.remove(); } };
})();
