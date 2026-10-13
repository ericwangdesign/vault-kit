// A project's View: the live thing running in a desktop window and a phone, side by side on a
// wallpaper, with the vault's facts in a glass panel beside them. Borrowed from the studio's
// workspace (studio/public/work/workspace), so a project here looks the way it does there.
// A note gets one when it has `live:` (the address of the running project).
import { TOKENS } from './style.js';

const DESK = { w: 1440, h: 900, bar: 36 };   // the desktop page, and the window's title bar
const PHONE = { w: 402, h: 874 };            // iPhone, status bar and home indicator included

export function viewPage({ n, esc, facts, links, prose, themeJs, favicon }) {
  const host = n.live.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#0f0f0f">
<title>${esc(n.title)} · View</title>
${favicon}
<link rel="stylesheet" href="/fonts/geist.css">
<script>${themeJs}</script>
<style>${TOKENS}${VIEW_CSS}</style>
</head><body>
<div class="shell">
  <main class="canvas" id="canvas">
    <div class="frames" id="frames">
      <div class="fwrap" id="wd">
        <div class="cap">Desktop, ${DESK.w} × ${DESK.h}</div>
        <div class="scaler" id="sd"><div class="frame d" style="width:${DESK.w}px;height:${DESK.h + DESK.bar}px">
          <div class="tbar"><span class="tl3"><i></i><i></i><i></i></span><span class="url">${esc(host)}</span><span class="tl3"></span></div>
          <iframe src="${esc(n.live)}" title="${esc(n.title)} on a computer" loading="lazy"></iframe>
        </div></div>
      </div>
      <div class="fwrap" id="wm">
        <div class="cap">Phone, ${PHONE.w} × ${PHONE.h}</div>
        <div class="scaler" id="sm"><div class="frame m" style="width:${PHONE.w}px;height:${PHONE.h}px">
          <div class="status"><span class="time">9:41</span><i class="island"></i><span class="levels"><i></i></span></div>
          <iframe src="${esc(n.live)}" title="${esc(n.title)} on a phone" loading="lazy"></iframe>
          <div class="home"></div>
        </div></div>
      </div>
    </div>
  </main>

  <aside class="side" aria-label="${esc(n.title)}">
    <div class="sect head">
      <a class="back" href="/n/${encodeURIComponent(n.name)}">← Note</a>
      <h1>${esc(n.title)}</h1>
      ${n.description ? `<p class="desc">${esc(n.description)}</p>` : ''}
    </div>
    <div class="sect" data-fold="project">
      <button class="st" type="button">Project</button>
      <dl class="facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      ${n.next ? `<p class="lbl">Next</p><p class="next">${esc(n.next)}</p>` : ''}
    </div>
    <div class="sect" data-fold="links">
      <button class="st" type="button">Links</button>
      <div class="links">${links.map(([k, href, label]) => `<a href="${esc(href)}" target="_blank" rel="noopener"><span>${esc(k)}</span><span>${esc(label)} ↗</span></a>`).join('')}</div>
      ${n.path ? `<p class="lbl">Folder</p><p class="mono">${esc(n.path)}</p>` : ''}
    </div>
    <div class="sect" data-fold="view">
      <button class="st" type="button">View</button>
      <p class="lbl">Show</p>
      <div class="seg" id="show"><button class="pill" data-v="both" aria-pressed="true">Both</button><button class="pill" data-v="desk" aria-pressed="false">Desktop</button><button class="pill" data-v="phone" aria-pressed="false">Phone</button></div>
      <p class="lbl">Night and day</p>
      <div class="acts"><button class="btn" type="button" data-theme-sw>Switch</button><button class="btn" type="button" id="reload">Reload</button></div>
    </div>
    ${prose ? `<div class="sect folded" data-fold="notes">
      <button class="st" type="button">Notes</button>
      <div class="notes">${prose}</div>
    </div>` : ''}
  </aside>
</div>
<script>${VIEW_JS.replace('%DESK%', JSON.stringify(DESK)).replace('%PHONE%', JSON.stringify(PHONE))}</script>
</body></html>`;
}

const VIEW_CSS = `
html, body { margin: 0; height: 100%; }
body { background: #05070d radial-gradient(120% 90% at 20% 10%, #1d2c55 0%, #05070d 60%) fixed; color: #fff; overflow: hidden; }
:root[data-mode="light"] body { background: #e6e6e6 radial-gradient(120% 90% at 20% 10%, #ffffff 0%, #d9dde6 70%) fixed; }
.shell { display: grid; grid-template-columns: minmax(0, 1fr) 320px; height: 100dvh; }

/* ---------- canvas: one scale for both frames, so they stay comparable ---------- */
.canvas { position: relative; min-width: 0; height: 100dvh; display: grid; place-items: center; padding: 48px 32px 32px; overflow: hidden; }
.frames { display: flex; align-items: flex-end; justify-content: center; gap: 32px; }
.fwrap { flex: none; position: relative; }
.fwrap[hidden] { display: none; }
.cap { position: absolute; left: 0; bottom: 100%; margin-bottom: 8px; font-size: 12px; color: rgb(255 255 255 / .85); text-shadow: 0 1px 3px rgb(0 0 0 / .6); white-space: nowrap; }
.scaler { transform-origin: 0 0; }
.frame { position: relative; overflow: hidden; background: #0c0c0c; display: flex; flex-direction: column;
  box-shadow: 0 0 0 0.5px rgb(0 0 0 / .45), 0 24px 80px rgb(0 0 20 / .45); }
.frame::after { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 2; box-shadow: inset 0 0 0 0.5px rgb(255 255 255 / .16); }
.frame iframe { border: 0; display: block; width: 100%; flex: 1 1 0; min-height: 0; background: #0c0c0c; }
.frame.d { border-radius: 12px; }
.tbar { height: 36px; flex: none; display: flex; align-items: center; gap: 8px; padding: 0 14px; background: #1c1c1c; color: #8a8a8a; font-size: 12px; }
.tbar .tl3 { display: flex; gap: 8px; width: 72px; flex: none; } .tbar .tl3 i { width: 12px; height: 12px; border-radius: 50%; background: #3a3a3a; }
.tbar .url { flex: 1; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.frame.m { border-radius: 48px; }
.status { height: 62px; flex: none; display: grid; grid-template-columns: minmax(0, 1fr) 125px minmax(0, 1fr); align-items: center; padding: 2px 9px 0; color: #f2f2f2; background: #0c0c0c; }
.status .time { display: flex; justify-content: center; padding-right: 6px; font: 590 17px/22px -apple-system, "SF Pro", system-ui, sans-serif; }
.status .island { width: 125px; height: 37px; border-radius: 100px; background: #000; }
.status .levels { display: flex; justify-content: center; }
.status .levels i { width: 85px; height: 13px; background: currentColor; -webkit-mask: url(/look/levels.svg) center / 100% 100% no-repeat; mask: url(/look/levels.svg) center / 100% 100% no-repeat; }
.home { height: 26px; flex: none; display: grid; place-items: center; background: #0c0c0c; }
.home::before { content: ""; width: 136px; height: 5px; border-radius: 999px; background: #f2f2f2; }
:root[data-mode="light"] .frame, :root[data-mode="light"] .frame iframe, :root[data-mode="light"] .status, :root[data-mode="light"] .home { background: #fff; color: #0d0d0d; }
:root[data-mode="light"] .home::before { background: #0d0d0d; }
:root[data-mode="light"] .tbar { background: #f3f3f3; color: #6b6b6b; } :root[data-mode="light"] .tbar .tl3 i { background: #d9d9d9; }

/* ---------- the glass panel ---------- */
.side { position: relative; margin: 16px 16px 16px 0; height: calc(100dvh - 32px); overflow-y: auto; scrollbar-width: none; border-radius: 24px;
  --g-inset: rgb(255 255 255 / .1); --g-line: rgb(255 255 255 / .1); --g-dim: rgb(255 255 255 / .72); --g-faint: rgb(255 255 255 / .5);
  background: rgb(40 40 46 / .38); -webkit-backdrop-filter: blur(40px) saturate(180%); backdrop-filter: blur(40px) saturate(180%);
  box-shadow: inset 0 0 0 0.5px rgb(255 255 255 / .28), inset 0 1px 0 rgb(255 255 255 / .18), 0 16px 48px rgb(0 0 0 / .35);
  font-size: 12px; line-height: 18px; }
.side::-webkit-scrollbar { display: none; }
:root[data-mode="light"] .side { background: rgb(24 24 30 / .62); }
/* One rhythm: 20 above and below each divider, 12 under a section title, 6 from a label to what it labels. */
.sect { padding: 20px 18px; border-bottom: 1px solid var(--g-line); }
.sect:last-child { border-bottom: 0; }
.back { display: inline-block; color: var(--g-faint); margin-bottom: 14px; }
.back:hover { color: #fff; }
.head h1 { margin: 0; font-size: 16px; line-height: 22px; font-weight: 500; letter-spacing: -0.015em; }
.desc { margin: 6px 0 0; color: var(--g-dim); }
.st { display: flex; align-items: center; justify-content: space-between; width: 100%; margin: 0 0 12px; padding: 0; border: 0; background: none; color: #fff; font: inherit; font-size: 14px; line-height: 20px; font-weight: 500; text-align: left; cursor: pointer; }
.st::after { content: ""; width: 6px; height: 6px; border-right: 1.5px solid var(--g-faint); border-bottom: 1.5px solid var(--g-faint); transform: translateY(-2px) rotate(45deg); transition: transform .2s cubic-bezier(.23, 1, .32, 1); }
.sect.folded .st { margin-bottom: 0; } .sect.folded .st::after { transform: rotate(-45deg); }
.sect.folded > :not(.st) { display: none !important; }
.lbl { margin: 12px 0 6px; color: var(--g-faint); }
.facts { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; margin: 0; }
.facts dt { color: var(--g-faint); } .facts dd { margin: 0; color: var(--g-dim); font-variant-numeric: tabular-nums; }
.next { margin: 0; color: var(--g-dim); }
.links { display: flex; flex-direction: column; gap: 2px; }
.links a { display: flex; justify-content: space-between; gap: 12px; padding: 7px 10px; margin: 0 -10px; border-radius: 10px; color: var(--g-dim); }
.links a span:first-child { color: var(--g-faint); }
.links a span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.links a:hover { background: var(--g-inset); color: #fff; }
.mono { margin: 0; font-family: var(--mono); font-size: 12px; color: var(--g-dim); overflow-wrap: anywhere; }
.seg { display: flex; padding: 2px; background: var(--g-inset); border-radius: 999px; }
.pill { flex: 1; height: 26px; padding: 0 8px; border: 0; border-radius: 999px; background: none; color: var(--g-dim); font: inherit; cursor: pointer; }
.pill:hover { color: #fff; }
.pill[aria-pressed="true"] { background: rgb(255 255 255 / .22); color: #fff; }
.acts { display: flex; gap: 8px; }
.btn { flex: 1; height: 30px; border: 0; border-radius: 999px; background: var(--g-inset); color: #fff; font: inherit; cursor: pointer; }
.btn:hover { background: rgb(255 255 255 / .22); }
.notes { color: var(--g-dim); display: flex; flex-direction: column; gap: 10px; }
.notes h1, .notes h2, .notes h3 { margin: 6px 0 0; font-size: 14px; font-weight: 500; color: #fff; }
.notes p, .notes ul, .notes ol { margin: 0; } .notes ul, .notes ol { padding-left: 16px; }
.notes a { color: #fff; text-decoration: underline; text-decoration-color: rgb(255 255 255 / .3); text-underline-offset: 3px; }
.notes code { font-family: var(--mono); font-size: 12px; }
.notes strong { color: #fff; font-weight: 500; }
.notes img { max-width: 100%; border-radius: 8px; }
:focus-visible { outline: 2px solid #fff; outline-offset: 1px; }

/* A phone: the phone frame only, and the panel underneath it. */
@media (max-width: 900px) {
  body { overflow: auto; }
  .shell { grid-template-columns: 1fr; height: auto; }
  .canvas { height: 78dvh; padding: 40px 16px 16px; }
  #wd { display: none !important; }
  .side { margin: 0 12px calc(12px + env(safe-area-inset-bottom)); height: auto; overflow: visible; }
}
`;

const VIEW_JS = `
(function () {
  var DESK = %DESK%, PHONE = %PHONE%;
  var canvas = document.getElementById('canvas'), wd = document.getElementById('wd'), wm = document.getElementById('wm');
  var sd = document.getElementById('sd'), sm = document.getElementById('sm');
  var show = 'both';
  try { show = localStorage.getItem('view.show') || 'both'; } catch (e) {}
  // One scale for both frames, the largest at which everything shown fits the canvas.
  function fit() {
    var phoneOnly = innerWidth <= 900;
    var d = !phoneOnly && show !== 'phone', m = phoneOnly || show !== 'desk';
    wd.hidden = !d; wm.hidden = !m;
    var cs = getComputedStyle(canvas);
    var W = canvas.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var H = canvas.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var dh = DESK.h + DESK.bar;
    var w = (d ? DESK.w : 0) + (m ? PHONE.w : 0), h = Math.max(d ? dh : 0, m ? PHONE.h : 0);
    var s = Math.min((W - (d && m ? 32 : 0)) / w, H / h, 1);
    sd.style.transform = sm.style.transform = 'scale(' + s + ')';
    wd.style.width = DESK.w * s + 'px'; wd.style.height = dh * s + 'px';
    wm.style.width = PHONE.w * s + 'px'; wm.style.height = PHONE.h * s + 'px';
  }
  document.querySelectorAll('#show .pill').forEach(function (b) {
    b.setAttribute('aria-pressed', b.dataset.v === show);
    b.onclick = function () {
      show = b.dataset.v; try { localStorage.setItem('view.show', show); } catch (e) {}
      document.querySelectorAll('#show .pill').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      fit();
    };
  });
  addEventListener('resize', fit); fit();
  // Sections fold from their title.
  document.querySelectorAll('.sect[data-fold] .st').forEach(function (t) { t.onclick = function () { t.parentNode.classList.toggle('folded'); }; });
  // The live page reads the same day/night choice as the vault (same cookie),
  // so after a switch it reloads to pick it up.
  var frames = [].slice.call(document.querySelectorAll('.frame iframe'));
  var reload = function () { frames.forEach(function (f) { f.src = f.src; }); };
  document.getElementById('reload').onclick = reload;
  document.querySelector('[data-theme-sw]').addEventListener('click', function () { setTimeout(reload, 60); });
})();
`;
