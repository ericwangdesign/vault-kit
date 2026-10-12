// Every page the reader builds runs this: search (⌘K), the inbox receipt (⌘⇧I), the phone's
// nav drawer, the to-do list's writes, archiving, and the clock in the sidebar.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var escH = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var post = function (url, body) { return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) }); };
  var root = document.documentElement;

  /* ---------- nav drawer (phone) ---------- */
  var closeNav = function () { root.classList.remove('nav-open'); };
  document.querySelectorAll('[data-nav-open]').forEach(function (b) { b.addEventListener('click', function () { root.classList.add('nav-open'); }); });
  var scrimNav = $('navScrim'); if (scrimNav) scrimNav.addEventListener('click', closeNav);
  addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
  var top = $('top');
  if (top) { var onScroll = function () { top.classList.toggle('scrolled', scrollY > 4); }; addEventListener('scroll', onScroll, { passive: true }); onScroll(); }

  /* ---------- search ---------- */
  // The index is fetched the first time search opens, not inlined: it holds every note's text.
  var NOTES = null;
  var loadNotes = function () { return NOTES ? Promise.resolve(NOTES) : fetch('/search.json').then(function (r) { return r.json(); }).then(function (j) { return (NOTES = j); }).catch(function () { return (NOTES = []); }); };
  var scrim = $('scrim'), sq = $('sq'), sres = $('sresults'), cursor = 0;
  var COMMANDS = [
    { t: 'Today', k: 'page', href: '/' },
    { t: 'Capture', k: '⌘I', run: function () { window.openIntake && window.openIntake(); } },
    { t: 'Inbox', k: '⌘⇧I', run: function () { window.openReceipt(); } },
    { t: 'To do', k: 'page', href: '/todo' },
    { t: 'Typography', k: 'setting', run: function () { window.openTypography && window.openTypography(); } },
  ];
  function draw() {
    var t = sq.value.trim().toLowerCase();
    var cmds = COMMANDS.filter(function (c) { return !t || c.t.toLowerCase().indexOf(t) > -1; });
    var hits = (t ? (NOTES || []).filter(function (n) { return n.s.indexOf(t) > -1; }) : (NOTES || [])).slice(0, 40);
    cursor = 0;
    var rows = cmds.map(function (c) { return '<a class="result" href="' + (c.href || '#') + '" data-cmd="' + COMMANDS.indexOf(c) + '"><span>' + c.t + '</span><span class="kind">' + c.k + '</span></a>'; })
      .concat(hits.map(function (n) { return '<a class="result" href="/n/' + encodeURIComponent(n.n) + '"><span>' + escH(n.t) + (n.d ? '<small>' + escH(n.d) + '</small>' : '') + '</span><span class="kind">' + escH(n.k) + '</span></a>'; }));
    sres.innerHTML = rows.length ? rows.join('') : '<p class="no-hits">No notes match that.</p>';
    var first = sres.querySelector('.result'); if (first) first.classList.add('cursor');
  }
  function choose(a) {
    var c = a.dataset.cmd !== undefined ? COMMANDS[+a.dataset.cmd] : null;
    if (c && c.run) { closeSearch(); c.run(); } else location.href = a.href;
  }
  sres.addEventListener('click', function (e) { var a = e.target.closest('.result'); if (a && a.dataset.cmd !== undefined && COMMANDS[+a.dataset.cmd].run) { e.preventDefault(); choose(a); } });
  function openSearch() { closeNav(); scrim.classList.add('open'); sq.value = ''; draw(); sq.focus(); loadNotes().then(function () { if (scrim.classList.contains('open')) draw(); }); }
  function closeSearch() { scrim.classList.remove('open'); }
  window.openSearch = openSearch;
  document.querySelectorAll('[data-search]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); openSearch(); }); });
  sq.addEventListener('input', draw);
  scrim.addEventListener('click', function (e) { if (e.target === scrim) closeSearch(); });
  addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); return; }
    if (!scrim.classList.contains('open')) return;
    var items = [].slice.call(sres.querySelectorAll('.result'));
    if (e.key === 'Escape') closeSearch();
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!items.length) return;
      items[cursor].classList.remove('cursor');
      cursor = (cursor + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[cursor].classList.add('cursor'); items[cursor].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && items[cursor]) { e.preventDefault(); choose(items[cursor]); }
  });

  /* ---------- capture ---------- */
  document.querySelectorAll('[data-capture]').forEach(function (b) { b.addEventListener('click', function () { closeNav(); window.openIntake && window.openIntake(); }); });

  /* ---------- the receipt (⌘⇧I) ---------- */
  // Fetched fresh each time it opens, and every few seconds while it stays open.
  var rc = $('receipt'), rcTimer = null;
  var rcLoad = function () { return fetch('/receipt', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : null; }).then(function (h) { if (h) rc.querySelector('.rc').innerHTML = h; }).catch(function () {}); };
  window.openReceipt = function () { rc.classList.add('open'); rcLoad(); clearInterval(rcTimer); rcTimer = setInterval(rcLoad, 5000); };
  var rcClose = function () { rc.classList.remove('open'); clearInterval(rcTimer); };
  addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'i') { e.preventDefault(); rc.classList.contains('open') ? rcClose() : window.openReceipt(); }
    else if (e.key === 'Escape') rcClose();
  });
  rc.addEventListener('click', function (e) { if (e.target === rc) rcClose(); });
  addEventListener('intake:sent', function () { if (rc.classList.contains('open')) rcLoad(); });

  /* ---------- to do ---------- */
  // Ticking happens in place: the line numbers only move when an item is added or removed.
  document.querySelectorAll('.todo[data-line]').forEach(function (el) {
    var busy = false;
    var flip = function (e) {
      if (e && e.target.closest('a, .todo-rm')) return;
      if (busy) return; busy = true;
      var done = !el.classList.contains('done');
      el.classList.toggle('done', done); el.setAttribute('aria-checked', done);
      post('/todo/' + el.dataset.line, { done: done }).then(function (r) { if (!r.ok) throw 0; })
        .catch(function () { el.classList.toggle('done', !done); el.setAttribute('aria-checked', !done); })
        .then(function () { busy = false; });
    };
    el.addEventListener('click', flip);
    el.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && e.target === el) { e.preventDefault(); flip(); } });
  });
  document.querySelectorAll('.todo-rm').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation(); b.disabled = true;
      post('/todo/' + b.dataset.line, { remove: true }).then(function (r) { if (r.ok) { sessionStorage.setItem('vault.scroll', String(scrollY)); location.reload(); } else b.disabled = false; });
    });
  });
  var todoAdd = document.querySelector('form.todo-add');
  if (todoAdd) todoAdd.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = todoAdd.querySelector('input'), text = input.value.trim();
    if (!text) return;
    input.disabled = true;
    post('/todo/add', { text: text }).then(function (r) { if (r.ok) location.reload(); else input.disabled = false; });
  });

  /* ---------- archive ---------- */
  // Archiving re-groups the whole shelf, so the honest move is to re-render, keeping the scroll.
  document.querySelectorAll('.arch').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation(); b.disabled = true;
      post('/n/' + encodeURIComponent(b.dataset.name) + '/archive', { on: b.dataset.on === '1' }).then(function (r) {
        if (!r.ok) { b.disabled = false; return; }
        sessionStorage.setItem('vault.scroll', String(scrollY)); location.reload();
      });
    });
  });
  addEventListener('DOMContentLoaded', function () {
    var y = sessionStorage.getItem('vault.scroll');
    if (y !== null) { sessionStorage.removeItem('vault.scroll'); scrollTo(0, +y); }
  });

  /* ---------- project tiles: videos play while they're on screen, live sites load when they're near ---------- */
  var near = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var el = e.target;
      if (el.tagName === 'VIDEO') { if (e.isIntersecting) el.play().catch(function () {}); else el.pause(); return; }
      if (e.isIntersecting) { var f = el.querySelector('iframe'); if (!f.src) f.src = el.dataset.src; near.unobserve(el); }
    });
  }, { rootMargin: '200px' }) : null;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('video[data-autoplay]').forEach(function (v) { if (near && !reduce) near.observe(v); });
  var sites = [].slice.call(document.querySelectorAll('.site[data-src]'));
  var scaleSites = function () { sites.forEach(function (el) { el.style.setProperty('--s', el.clientWidth / 1440); }); };
  sites.forEach(function (el) { if (near) near.observe(el); else el.querySelector('iframe').src = el.dataset.src; });
  if (sites.length) { scaleSites(); addEventListener('resize', scaleSites); }

  /* ---------- the clock: local time, like a signature at the bottom of a letter ---------- */
  var clock = $('clock');
  if (clock) { var tickClock = function () { clock.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', ''); }; tickClock(); setInterval(tickClock, 30000); }

  /* ---------- a project the sort touched shows a dot until you open it ---------- */
  var seen = {}; try { seen = JSON.parse(localStorage.getItem('vault.seen') || '{}'); } catch (e) {}
  var here = document.body.dataset.note;
  if (here) { seen[here] = new Date().toISOString(); try { localStorage.setItem('vault.seen', JSON.stringify(seen)); } catch (e) {} }
  document.querySelectorAll('.dot[data-name]').forEach(function (d) { if (!seen[d.dataset.name] || seen[d.dataset.name] < d.dataset.at) d.hidden = false; });
})();
