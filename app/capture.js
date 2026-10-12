import { TOKENS } from './style.js';
// Capture: the phone's home-screen app. One empty page and a keyboard, nothing of the vault
// in sight. The vault is for keeping; this is for the moment a thought shows up.
//
// - It carries its own few styles and no fonts, so the whole page is one request.
// - A small service worker keeps a copy, so the icon opens in a tunnel too.
// - A send that fails joins the same queue Intake uses and goes the next time there's signal.

export function capturePage() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#0f0f0f">
<title>Capture</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/favicon.png">
<link rel="manifest" href="/capture.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Capture">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<script>(function(){var c=(document.cookie.match(/(?:^|; )theme=(light|dark)/)||[])[1];if(!c){try{c=localStorage.getItem('theme')}catch(e){}}if(c==='light'){document.documentElement.dataset.mode='light';document.querySelector('meta[name=theme-color]').content='#f5f5f5'}})();</script>
<style>${TOKENS}
/* The page itself never scrolls: iOS nudges a scrollable page when the keyboard opens and
   leaves a stale copy of the text behind the status bar. */
html,body{position:fixed;inset:0;overflow:hidden;margin:0;background:var(--bg);color:var(--text);overscroll-behavior:none}
form{position:absolute;inset:0;display:flex;flex-direction:column;
  padding:env(safe-area-inset-top) 0 max(10px,env(safe-area-inset-bottom));max-width:680px;margin:0 auto}
.bar{display:flex;align-items:center;gap:9px;height:52px;padding:0 10px 0 16px;flex:none}
.bar img{width:22px;height:22px;border-radius:6px}
.bar b{font-weight:500;margin-right:auto}
.bar a{display:inline-flex;align-items:center;height:32px;padding:0 13px;border-radius:999px;background:var(--hover-2);color:var(--text-2);font-size:13px}
.box{flex:1;min-height:0;display:flex;flex-direction:column;margin:4px 12px 0;padding:16px 16px 10px;background:var(--surface);border-radius:22px;box-shadow:var(--shadow-lg)}
/* 17px: anything under 16 makes iOS zoom the page when the keyboard comes up. */
textarea{flex:1;min-height:0;width:100%;resize:none;border:0;padding:0;background:none;color:var(--text);
  font:inherit;font-size:17px;line-height:26px;letter-spacing:-0.01em;outline:none}
textarea::placeholder{color:var(--text-3)}
.row{display:flex;align-items:center;gap:10px;padding-top:10px;flex:none}
.state{flex:1;min-width:0;font-size:13px;color:var(--text-3)}
button{width:40px;height:40px;flex:none;display:grid;place-items:center;border:0;border-radius:50%;
  background:var(--btn);color:var(--btn-text);opacity:.22;transition:opacity .14s}
button svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.has-text button{opacity:1}
</style>
</head>
<body>
<form id="f">
  <div class="bar"><b>Capture</b><a href="/" id="v">Vault</a></div>
  <div class="box">
    <textarea id="t" placeholder="What's on your mind?" autofocus autocomplete="off" autocapitalize="sentences" enterkeyhint="enter" aria-label="Capture"></textarea>
    <div class="row">
      <span class="state" id="s">Lands in the inbox. Sorted in a couple of minutes.</span>
      <button type="submit" aria-label="Send"><svg viewBox="0 0 24 24"><path d="m5 12 7-7 7 7M12 19V5"/></svg></button>
    </div>
  </div>
</form>
<script>
(function () {
  var KEY = 'vault.inbox.queue', DRAFT = 'vault.capture.draft';
  var form = document.getElementById('f'), box = document.getElementById('t'), state = document.getElementById('s');
  function get(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function note(t) { state.textContent = t; }
  function waiting(n) { note(n + (n === 1 ? ' thought' : ' thoughts') + ' will send when there\\u2019s signal'); }
  function mark() { form.classList.toggle('has-text', box.value.trim().length > 0); }
  function post(text) {
    return fetch('/api/inbox', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: text }) })
      .then(function (r) {
        // Signed out is not "no signal": say so, and keep the thought.
        if (r.status === 401) { note('Signed out. Open the vault once to sign in'); throw new Error('401'); }
        if (!r.ok) throw new Error(r.status);
        return r.json();
      });
  }
  // Anything kept from a time without signal goes first, in order.
  var draining = false;
  function drain() {
    var q = get(KEY, []);
    if (!q.length || draining) return;
    draining = true;
    post(q[0].text).then(function () {
      set(KEY, get(KEY, []).slice(1)); draining = false;
      if (get(KEY, []).length) drain(); else note('Landed');
    }).catch(function (e) { draining = false; if (e.message !== '401') waiting(get(KEY, []).length); });
  }
  // A half-typed thought survives the app being swiped away.
  box.value = get(DRAFT, '');
  box.addEventListener('input', function () { set(DRAFT, box.value); mark(); note(''); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = box.value.trim();
    if (!text) { box.focus(); return; }
    box.value = ''; set(DRAFT, ''); mark(); box.focus();
    post(text).then(function () { note('Landed'); })
      .catch(function (err) {
        var q = get(KEY, []); q.push({ text: text, at: Date.now() }); set(KEY, q);
        if (err.message !== '401') waiting(q.length);
      });
  });
  box.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); form.requestSubmit(); }
  });
  // Follow the keyboard: the form is as tall as what's visible, so the send row sits on top of it.
  if (window.visualViewport) {
    var fit = function () { form.style.height = visualViewport.height + 'px'; scrollTo(0, 0); };
    visualViewport.addEventListener('resize', fit); fit();
  }
  addEventListener('online', drain);
  addEventListener('pageshow', function () { drain(); box.focus(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { drain(); box.focus(); } });
  mark(); drain();
  var left = get(KEY, []).length; if (left) waiting(left);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/capture-sw.js', { scope: '/capture' }).catch(function () {});
})();
</script>
</body>
</html>`;
}

export const CAPTURE_MANIFEST = JSON.stringify({
  name: 'Capture', short_name: 'Capture', start_url: '/capture', scope: '/', display: 'standalone',
  background_color: '#0f0f0f', theme_color: '#0f0f0f', icons: [{ src: '/favicon.png', type: 'image/png' }],
});

// Network first, so the page is always the current one; the kept copy is only for no signal.
// A reply that was redirected is the sign-in page, which must never be kept in its place.
export const CAPTURE_SW = `
var CACHE = 'capture-3';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  var url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.pathname !== '/capture') return;
  e.respondWith(fetch(e.request).then(function (r) {
    if (r.ok && !r.redirected) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put('/capture', copy); }); }
    return r;
  }).catch(function () {
    return caches.match('/capture').then(function (hit) { return hit || Response.error(); });
  }));
});
`;
