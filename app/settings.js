// Typography settings for reading: stored in localStorage, applied as CSS custom properties on :root.

const FONTS = {
  geist:  ['Geist', `"Geist", ui-sans-serif, -apple-system, "Segoe UI", sans-serif`],
  system: ['System', `ui-sans-serif, -apple-system, "SF Pro Text", "Segoe UI", sans-serif`],
  serif:  ['Serif', `"Iowan Old Style", Charter, Palatino, Georgia, serif`],
  mono:   ['Mono', `"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace`],
};

const OPTIONS = {
  font:    { label: 'Typeface', values: Object.entries(FONTS).map(([k, v]) => [k, v[0]]) },
  size:    { label: 'Text size', values: [['14px', '14'], ['15px', '15'], ['16px', '16'], ['17px', '17']] },
  leading: { label: 'Line height', values: [['1.55', 'Tight'], ['1.7', 'Normal'], ['1.85', 'Loose']] },
  measure: { label: 'Column', values: [['580px', 'Narrow'], ['680px', 'Normal'], ['760px', 'Wide']] },
};

// These only touch reading text (.prose); the frame around it stays put.
const DEFAULTS = { font: 'geist', size: '15px', leading: '1.7', measure: '680px' };
const FAMILIES = Object.fromEntries(Object.entries(FONTS).map(([k, v]) => [k, v[1]]));

const APPLY = `
  function applyType(s) {
    var r = document.documentElement;
    r.style.setProperty('--font-body', FONTS[s.font] || FONTS.geist);
    r.style.setProperty('--size', s.size);
    r.style.setProperty('--leading', s.leading);
    r.style.setProperty('--measure', s.measure);
  }`;

// Runs before first paint so a saved preference never flashes the default.
export const BOOT_JS = `
(function () {
  var FONTS = ${JSON.stringify(FAMILIES)};
  var D = ${JSON.stringify(DEFAULTS)};
  var s = D;
  try { s = Object.assign({}, D, JSON.parse(localStorage.getItem('vault.type.v4') || '{}')); } catch (e) {}
  ${APPLY}
  applyType(s);
  window.__type = s;
})();
`;

const seg = (key, o) => `
  <div class="field">
    <label>${o.label}</label>
    <div class="seg" data-key="${key}">
      ${o.values.map(([v, l]) => `<button type="button" data-value="${v}">${l}</button>`).join('')}
    </div>
  </div>`;

export const SETTINGS_PANEL = `
<div class="panel" id="typePanel" role="dialog" aria-label="Typography">
  <h6>Typography</h6>
  ${Object.entries(OPTIONS).map(([k, o]) => seg(k, o)).join('')}
  <button class="reset" id="typeReset">Reset to defaults</button>
</div>`;

export const SETTINGS_JS = `
(function () {
  var FONTS = ${JSON.stringify(FAMILIES)};
  var D = ${JSON.stringify(DEFAULTS)};
  var panel = document.getElementById('typePanel');
  var btn = document.getElementById('openSettings');
  var state = window.__type || D;
  ${APPLY}
  function sync() {
    applyType(state);
    localStorage.setItem('vault.type.v4', JSON.stringify(state));
    panel.querySelectorAll('.seg').forEach(function (s) {
      s.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.value === state[s.dataset.key]));
      });
    });
  }
  panel.querySelectorAll('.seg button').forEach(function (b) {
    b.addEventListener('click', function () { state[b.parentElement.dataset.key] = b.dataset.value; sync(); });
  });
  document.getElementById('typeReset').addEventListener('click', function () { state = Object.assign({}, D); sync(); });
  window.openTypography = function () { setTimeout(function () { panel.classList.add('open'); }); };
  if (btn) btn.addEventListener('click', function (e) { e.stopPropagation(); panel.classList.toggle('open'); });
  document.addEventListener('click', function (e) { if (panel.classList.contains('open') && !panel.contains(e.target)) panel.classList.remove('open'); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') panel.classList.remove('open'); });
  sync();
})();
`;
