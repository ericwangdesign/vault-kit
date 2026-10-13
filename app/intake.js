// Intake: a box that floats at the bottom of every vault page. ⌘I opens it, ⌘↩ sends,
// Esc puts it away. It replaces the /in page — capture shouldn't mean leaving what you're reading.
//
// Capture has to work every time and the Mac won't always be reachable, so a send that
// fails is kept in the browser and retried the next time a page is open. No error is
// shown for that — the thought is safe either way.

export const INTAKE_HTML = `
<form class="intake" id="intake" hidden>
  <textarea id="intakeText" rows="1" placeholder="What's on your mind?" autocomplete="off" autocapitalize="sentences" spellcheck="false" enterkeyhint="send"></textarea>
  <div class="intake-row">
    <span class="intake-state" id="intakeState"></span>
    <span class="intake-keys"><kbd>esc</kbd></span>
    <button type="submit" class="send" id="intakeSend" aria-label="Send"><svg class="i" viewBox="0 0 24 24"><path d="m5 12 7-7 7 7M12 19V5"/></svg></button>
  </div>
</form>
<button type="button" class="intake-fab" id="intakeFab" aria-label="Capture"><svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>`;

// The same box as the one on Today (ChatGPT's composer), floating over whatever page is open.
export const INTAKE_CSS = `
.intake {
  position: fixed; left: 50%; bottom: 24px; z-index: 45; width: min(600px, calc(100vw - 24px));
  transform: translateX(-50%); padding: 14px 10px 10px 20px; border-radius: 26px;
  background: var(--surface-2); box-shadow: var(--shadow-pop);
  animation: intake-in .2s cubic-bezier(.2,.8,.2,1);
}
.intake[hidden] { display: none; }
@keyframes intake-in { from { opacity: 0; transform: translate(-50%, 8px); } }
.intake textarea {
  display: block; width: 100%; min-height: 26px; max-height: 40vh; resize: none; border: 0; padding: 0 10px 0 0; background: none; outline: 0;
  color: var(--text); font: inherit; font-size: 16px; line-height: 26px; letter-spacing: -0.01em;
}
.intake textarea::placeholder { color: var(--text-3); }
.intake-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
.intake-state { flex: 1; min-width: 0; font-size: 13px; color: var(--text-3); }
.intake-keys kbd { font-size: 13px; }
/* Touch screens have no ⌘I, so they get a round + in the corner instead. */
.intake-fab { display: none; }
@media (hover: none), (max-width: 759px) {
  .intake-fab {
    display: grid; place-items: center; position: fixed; right: 16px; bottom: calc(16px + env(safe-area-inset-bottom)); z-index: 44;
    width: 52px; height: 52px; border-radius: 50%; background: var(--btn); color: var(--btn-text); box-shadow: var(--shadow-pop);
  }
  .intake-fab svg.i { width: 22px; height: 22px; stroke-width: 2; }
  .intake:not([hidden]) ~ .intake-fab { display: none; }
  .intake { bottom: calc(10px + env(safe-area-inset-bottom)); }
  .intake-keys { display: none; }
}
/* On a computer it centres on the page, not on the window behind the sidebar. */
@media (min-width: 1024px) { .intake { left: calc(50% + 120px); width: min(600px, calc(100vw - 296px)); } }
/* Today has the box in the page already. */
.has-composer .intake-fab { display: none !important; }
`;

export const INTAKE_JS = `
(function () {
  var KEY = 'vault.inbox.queue';
  var form = document.getElementById('intake'), box = document.getElementById('intakeText'),
      state = document.getElementById('intakeState'), send = document.getElementById('intakeSend'),
      fab = document.getElementById('intakeFab');
  function queue() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function keep(q) { try { localStorage.setItem(KEY, JSON.stringify(q)); } catch (e) {} }
  function note(t) { state.textContent = t; }
  function post(text) {
    return fetch('/api/inbox', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: text }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  // Anything left over from a time the Mac was unreachable goes first, in order.
  function drain() {
    var q = queue();
    if (!q.length) return Promise.resolve();
    return post(q[0].text).then(function () { keep(q.slice(1)); return drain(); })
      .catch(function () { note('Kept on this device. ' + (q.length === 1 ? 'It sends' : q.length + ' send') + ' when there\\u2019s signal.'); });
  }
  function grow() {
    box.style.height = 'auto'; box.style.height = box.scrollHeight + 'px';
    form.classList.toggle('has-text', box.value.trim().length > 0);
  }
  function open() { form.hidden = false; note(''); grow(); box.focus(); }
  function close() { form.hidden = true; box.blur(); }
  // Today has its own box in the page; it sets window.openIntake to focus that one instead.
  if (!document.getElementById('say')) window.openIntake = open;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  box.addEventListener('input', grow);
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = box.value.trim();
    if (!text) return;
    box.value = ''; grow();
    send.disabled = true;
    post(text).then(function () { dispatchEvent(new Event('intake:sent')); note('Landed. It gets sorted in a couple of minutes.'); setTimeout(function () { if (!box.value) close(); }, 1400); })
      .catch(function () { var q = queue(); q.push({ text: text, at: Date.now() }); keep(q); note('Kept on this device. ' + (q.length === 1 ? 'It sends' : q.length + ' send') + ' when there\\u2019s signal.'); })
      .then(function () { send.disabled = false; });
  });
  box.addEventListener('keydown', function (e) {
    // Return sends on a computer (shift-return for a new line), like the box on Today.
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || (fine && !e.shiftKey))) { e.preventDefault(); form.requestSubmit(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      if (window.openIntake !== open) { window.openIntake && window.openIntake(); return; }
      form.hidden ? open() : close();
    }
  });
  fab.addEventListener('click', function () { form.hidden ? open() : close(); });
  addEventListener('online', drain);
  addEventListener('pageshow', drain);
  drain();
  // The phone's home-screen icon lands on /in, which comes here with the box already open.
  if (/[?&]intake\\b/.test(location.search)) setTimeout(function () { window.openIntake ? window.openIntake() : open(); });
})();
`;
