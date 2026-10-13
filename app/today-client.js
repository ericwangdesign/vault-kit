// Today, in the browser. The server hands over live data (today.js); this draws the blocks and
// does the few writes the page allows: capture, tick a to-do, park or finish a project, let an
// idea go. Each write goes through the reader's own endpoints and each one can be undone.
(function () {
  var D = JSON.parse(document.getElementById('data').textContent || '{}');
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var link = function (n) { return n.page || '/n/' + encodeURIComponent(n.name); };
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var parse = function (s) { var p = String(s).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  var dm = function (s) { var d = parse(s); return MON[d.getMonth()] + ' ' + d.getDate(); };
  var today = parse(D.today);
  var daysAgo = function (s) { return Math.round((today - parse(s)) / 864e5); };
  var age = function (s) { var n = daysAgo(s); return n <= 0 ? 'Today' : n === 1 ? '1d' : n + 'd'; };
  var roughly = function (s) { var n = daysAgo(s); return n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : dm(s); };
  var plural = function (n, one, many) { return n === 1 ? one : many; };
  var CHECK = '<svg class="i" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>';
  var DOTS = '<svg class="i" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>';

  /* ---------- hello ---------- */
  var now = new Date(), h = now.getHours();
  $('date').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  $('greet').textContent = h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  var projects = D.projects || [], todos = D.todos || [], R = D.resurfaced;
  var TM = D.todoMeta || {}, suggest = D.suggest || [];
  var openToday = todos.filter(function (t) { return !t.done; }).length;
  function drawBrief() {
    openToday = todos.filter(function (t) { return !t.done; }).length;
    var line = '<b>' + projects.length + ' ' + plural(projects.length, 'project', 'projects') + '</b> open, ' +
      (openToday ? '<b>' + openToday + ' ' + plural(openToday, 'thing', 'things') + '</b> picked for today.' : 'nothing picked for today yet.');
    if (R && R.created) line += ' One idea from ' + MONTH[parse(R.created).getMonth()] + ' is back for a look.';
    $('brief').innerHTML = line;
  }
  drawBrief();

  /* ---------- writes ---------- */
  function send(url, method, body) {
    return fetch(url, { method: method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r; });
  }
  var setStatus = function (name, status) { return send('/api/notes/' + encodeURIComponent(name), 'PATCH', { frontmatter: { status: status } }); };
  var archive = function (name, on) { return send('/n/' + encodeURIComponent(name) + '/archive', 'POST', { on: on }); };
  // To-dos are addressed by line, and the list may have moved since the page loaded,
  // so find the line again by its text right before writing.
  // To-dos are named by their text; the server finds the line, wherever it has moved to.
  var todoSend = function (body) { return send('/todo/item', 'POST', body); };
  function tick(t, done) { return todoSend({ text: t.raw, done: done }); }
  function pick(t) { return todoSend({ text: t.raw, move: 'today' }); }
  var tid; function say(t) { $('toast').textContent = t; clearTimeout(tid); tid = setTimeout(function () { $('toast').textContent = ''; }, 4000); }
  // Replace a row with one quiet line and an undo. `undo` runs the opposite write.
  function settle(el, said, undo, rewire) {
    var html = el.innerHTML, cls = el.className;
    el.className = cls.replace(/\bopen\b/, '') + ' gone';
    el.innerHTML = '<span>' + esc(said) + '.</span>' + (undo ? '<button type="button">Undo</button>' : '');
    var b = el.querySelector('button');
    if (b) b.onclick = function () {
      undo().then(function () { el.className = cls.replace(/\bopen\b/, ''); el.innerHTML = html; rewire(el); })
        .catch(function () { say('That didn’t go through. Try again.'); });
    };
  }

  /* ---------- to do: only what's picked for today ---------- */
  // The whole list, and the sorting into If there's time and Later, lives on /todo. Here it's
  // just today's few; with nothing picked yet, the next ones in line, one tap each.
  function drawTodo() {
    var stale = todos.length && !TM.fresh && TM.picked;
    openToday = todos.filter(function (t) { return !t.done; }).length;
    var n = todos.length ? (stale ? 'Picked ' + dm(TM.picked) : openToday) : '';
    var rows = '';
    if (todos.length) rows = todos.map(function (t, i) {
      return '<div class="todo clamp' + (t.done ? ' done' : '') + '" data-i="' + i + '" role="checkbox" aria-checked="' + !!t.done + '" tabindex="0"><span class="check">' + CHECK + '</span>' +
        '<span class="tx">' + esc(t.text) + '</span>' + '</div>';
    }).join('');
    // Suggestions stay until picked, so a morning's picking is a few taps in a row.
    if (suggest.length) rows += '<div class="sugg-head">' + (todos.length ? 'Next in line:' : 'Nothing picked yet. Next in line:') + '</div>' + suggest.map(function (t, i) {
      return '<div class="sugg"><span class="tx">' + esc(t.text) + '</span><button class="btn" type="button" data-pick="' + i + '">Today</button></div>';
    }).join('');
    if (!rows) rows = '<div class="empty"><b>Nothing picked for today.</b><span>Pick from <a href="/todo">your list</a>.</span></div>';
    var rest = TM.time ? TM.time + ' more if there’s time' : TM.later ? TM.later + ' kept for later' : '';
    $('todo').innerHTML = '<div class="block-head"><h2><a href="/todo">To do</a></h2>' + (n ? '<span class="n">' + n + '</span>' : '') + '<a class="end" href="/todo">Whole list</a></div><div class="card">' +
      rows + (todos.length && !suggest.length && rest ? '<a class="more" href="/todo">' + rest + '</a>' : '') + '</div>';
    $('todo').querySelectorAll('.todo').forEach(function (el) {
      var t = todos[el.dataset.i], busy = false;
      var flip = function () {
        if (busy) return; busy = true;
        var done = !el.classList.contains('done');
        el.classList.toggle('done', done); el.setAttribute('aria-checked', done);
        tick(t, done).then(function () { t.done = done; drawBrief(); var c = $('todo').querySelector('.block-head .n'); if (c && !(TM.picked && !TM.fresh)) c.textContent = openToday; })
          .catch(function () { el.classList.toggle('done', !done); el.setAttribute('aria-checked', !done); say('Couldn’t tick that one. Refresh and try again.'); })
          .then(function () { busy = false; });
      };
      el.onclick = flip; el.onkeydown = function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } };
    });
    $('todo').querySelectorAll('[data-pick]').forEach(function (b) {
      b.onclick = function () {
        b.disabled = true;
        var t = suggest[b.dataset.pick];
        pick(t).then(function () {
          suggest.splice(suggest.indexOf(t), 1); todos.push(t); if (TM.time) TM.time--;
          drawTodo(); drawBrief();
        })
          .catch(function () { b.disabled = false; say('Couldn’t pick that one. Refresh and try again.'); });
      };
    });
  }
  drawTodo();

  /* ---------- projects: what's open, and its next step ---------- */
  function wireProj(el) {
    var name = el.dataset.name;
    el.querySelector('.menu').onclick = function () { el.classList.toggle('open'); };
    el.querySelectorAll('[data-status]').forEach(function (b) {
      b.onclick = function () {
        var st = b.dataset.status, said = st === 'paused' ? 'parked' : 'marked done';
        setStatus(name, st).then(function () { settle(el, el.querySelector('b').textContent + ' · ' + said, function () { return setStatus(name, 'active'); }, wireProj); })
          .catch(function () { say('That didn’t go through. Try again.'); });
      };
    });
  }
  $('motion').innerHTML = '<div class="block-head"><h2><a href="/projects">Projects</a></h2><span class="n">' + projects.length + '</span><a class="end" href="/projects">All</a></div><div class="card">' +
    (projects.length ? projects.map(function (p) {
      return '<div class="proj" data-name="' + esc(p.name) + '"><span class="t"><b><a href="' + esc(link(p)) + '">' + esc(p.title) + '</a></b><span>' + esc(p.next || p.description) + '</span></span>' +
        '<span class="s">' + age(p.updated) + '<button class="menu" type="button" aria-label="More">' + DOTS + '</button></span>' +
        '<span class="acts"><button class="btn" data-status="shipped">Mark done</button><button class="btn ghost" data-status="paused">Park</button></span></div>';
    }).join('') : '<div class="empty"><b>Nothing in motion.</b><span>Pick something up from Ideas when you’re ready.</span></div>') + '</div>';
  $('motion').querySelectorAll('.proj').forEach(wireProj);

  /* ---------- one idea, back again ---------- */
  if (R) {
    var LATER = 'today.later.' + D.today;
    var group = R.groupTitle || (R.group ? R.group.charAt(0).toUpperCase() + R.group.slice(1) : 'Ideas');
    $('again').innerHTML = '<div class="block-head"><h2>Back again</h2><span class="n">1 of ' + (D.ideaCount || 0) + ' ideas</span><a class="end" href="/ideas">Ideas</a></div>' +
      '<div class="card"><div class="idea"><div>' +
      '<div class="eyebrow">' + esc(group) + (R.created ? ' · from ' + MONTH[parse(R.created).getMonth()] : '') + '</div>' +
      '<h3><a href="' + esc(link(R)) + '">' + esc(R.title) + '</a></h3><p>' + esc(R.description) + '</p>' +
      '<div class="actions"><a class="btn" href="' + esc(link(R)) + '">Open</a><button class="btn ghost" data-act="later">Not now</button><button class="btn ghost" data-act="go">Let go</button></div>' +
      '</div></div></div>';
    var idea = $('again').querySelector('.idea');
    var later = function (on) { try { on ? localStorage.setItem(LATER, '1') : localStorage.removeItem(LATER); } catch (e) {} return Promise.resolve(); };
    var wireIdea = function () {
      idea.querySelector('[data-act="later"]').onclick = function () { later(true); settle(idea, 'It comes back another day', function () { return later(false); }, wireIdea); };
      idea.querySelector('[data-act="go"]').onclick = function () {
        archive(R.name, true).then(function () { settle(idea, R.title + ' · let go', function () { return archive(R.name, false); }, wireIdea); })
          .catch(function () { say('That didn’t go through. Try again.'); });
      };
    };
    wireIdea();
    try { if (localStorage.getItem(LATER)) settle(idea, 'It comes back another day', function () { return later(false); }, wireIdea); } catch (e) {}
  }

  /* ---------- this week: a mirror, not a scoreboard ---------- */
  var A = D.activity || { counts: [], days: [] }, cap = D.captured || {};
  var level = function (n) { return !n ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 12 ? 3 : 4; };
  $('week').innerHTML = '<div class="block-head"><h2>This week</h2></div><div class="card"><div class="stats">' +
    '<div class="stat"><div class="k">Captured</div><div class="v">' + (cap.week || 0) + '</div><div class="d">' + (cap.lastWeek || 0) + ' last week</div></div>' +
    '<div class="stat"><div class="k">Notes touched</div><div class="v">' + (A.week || 0) + '</div><div class="d">' + (A.lastWeek || 0) + ' last week</div></div>' +
    '</div><div class="strip" role="img" aria-label="Notes touched per day, last four weeks">' +
    A.counts.map(function (n, i) { return '<i data-l="' + level(n) + '"' + (i === A.counts.length - 1 ? ' class="today"' : '') + ' title="' + dm(A.days[i]) + ': ' + n + ' ' + plural(n, 'note', 'notes') + '"></i>'; }).join('') +
    '</div><div class="strip-labels"><span>4 weeks ago</span><span>Today</span></div></div>';

  /* ---------- just landed ---------- */
  var fresh = [];
  function drawLanded() {
    var rows = fresh.map(function (t) {
      return '<div class="land fresh"><span class="when">Now</span><div><div class="what">' + esc(t) + '</div><div class="to">Sorting…</div></div></div>';
    }).concat((D.waiting || []).map(function (w) {
      return '<div class="land"><span class="when">' + roughly(w.at) + '</span><div><div class="what">' + esc(w.text) + '</div><div class="to wait">Waiting to be sorted</div></div></div>';
    })).concat((D.landed || []).map(function (c) {
      return '<div class="land"><span class="when">' + roughly(c.date) + '</span><div><div class="what">' + esc(c.text) + '</div>' +
        '<div class="to">' + (c.to ? '<a href="/n/' + encodeURIComponent(c.to) + '">' + esc(c.label) + '</a>' : '<span>' + esc(c.label) + '</span>') + (c.merged ? '<span>· merged</span>' : '') + '</div></div></div>';
    }));
    $('landed').innerHTML = '<div class="block-head"><h2><a href="/inbox">Just landed</a></h2><span class="n">Where your captures went</span><a class="end" href="/inbox">Inbox</a></div>' +
      '<div class="card">' + (rows.join('') || '<div class="empty"><b>Nothing yet.</b><span>Say anything in the box above.</span></div>') + '</div>';
  }
  drawLanded();

  /* ---------- the composer ---------- */
  var form = $('composer'), box = $('say'), QKEY = 'vault.inbox.queue', PH = box.placeholder;
  var chips = projects.slice(0, 3).map(function (p) { return { label: p.title, name: p.name, prefix: p.title + ' — ' }; })
    .concat([{ label: 'Something I noticed', prefix: '', ph: 'What did you notice?' }, { label: 'I wish this existed', prefix: 'Idea: ' }]);
  $('chips').innerHTML = chips.map(function (c, i) { return '<button type="button" class="chip plain" data-i="' + i + '">' + esc(c.label) + '</button>'; }).join('');
  $('chips').querySelectorAll('.chip').forEach(function (b) {
    b.addEventListener('mousedown', function (e) { e.preventDefault(); });
    b.onclick = function () {
      var c = chips[b.dataset.i];
      if (c.prefix && box.value.indexOf(c.prefix) !== 0) box.value = c.prefix + box.value;
      if (c.ph) box.placeholder = c.ph;
      grow(); box.focus(); box.setSelectionRange(box.value.length, box.value.length);
    };
  });
  function grow() { box.style.height = 'auto'; box.style.height = box.scrollHeight + 'px'; form.classList.toggle('has-text', box.value.trim().length > 0); }
  function queue() { try { return JSON.parse(localStorage.getItem(QKEY)) || []; } catch (e) { return []; } }
  box.addEventListener('input', grow);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = box.value.trim();
    if (!text) { box.focus(); return; }
    box.value = ''; box.placeholder = PH; grow();
    fetch('/api/inbox', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: text }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function () { say('Landed. It gets sorted in a couple of minutes.'); fresh.unshift(text); drawLanded(); })
      .catch(function () { var q = queue(); q.push({ text: text, at: Date.now() }); try { localStorage.setItem(QKEY, JSON.stringify(q)); } catch (e) {} say('Kept on this device. It sends when there’s signal.'); });
  });
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  box.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || (fine && !e.shiftKey))) { e.preventDefault(); form.requestSubmit(); }
    if (e.key === 'Escape') box.blur();
  });
  // ⌘I and the sidebar's Capture button come here instead of opening the floating box.
  window.openIntake = function () { box.focus(); };
  addEventListener('keydown', function (e) {
    if (e.key === '/' && document.activeElement === document.body) { e.preventDefault(); box.focus(); }
  });

  // Speak instead of type, where the browser can listen.
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, mic = $('mic');
  if (SR) {
    mic.hidden = false;
    var rec = null;
    mic.onclick = function () {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = true;
      var base = box.value ? box.value.replace(/\s*$/, ' ') : '';
      rec.onresult = function (ev) { var t = ''; for (var i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript; box.value = base + t; grow(); };
      rec.onend = function () { rec = null; mic.classList.remove('listening'); box.focus(); };
      rec.onerror = rec.onend;
      rec.start(); mic.classList.add('listening');
    };
  }

  // On a phone the composer rides on top of the keyboard instead of hiding under it.
  var wrap = $('wrap');
  if (window.visualViewport) {
    var lift = function () {
      if (innerWidth >= 760) { wrap.style.transform = ''; return; }
      var gap = innerHeight - visualViewport.height - visualViewport.offsetTop;
      wrap.style.transform = gap > 1 ? 'translateY(' + -gap + 'px)' : '';
    };
    visualViewport.addEventListener('resize', lift); visualViewport.addEventListener('scroll', lift);
  }
})();
