// The properties panel. Folded, it is the line under the title that was
// already there: status · horizon · kind · updated. Open, it is the same
// three things as buttons plus tags, and nothing else — every wiki's property
// panel grows into a form nobody reads, so this one has a hard ceiling.
// Changes PATCH the frontmatter; the folded line redraws in place.
import { esc } from './markdown.js';

const STATUS = {
  project: ['active', 'paused', 'shipped', 'dead'],
  client: ['active', 'past'],
  idea: ['active', 'paused', 'dead'],
};
const HORIZON = [['short', 'short-term'], ['long', 'long-term'], ['ongoing', 'ongoing']];

const seg = (key, current, values) => `
  <div class="prop">
    <span class="prop-k">${key}</span>
    <div class="prop-seg" data-key="${key}">
      ${values.map(([v, l]) => `<button type="button" data-value="${v}" aria-pressed="${v === current}">${l}</button>`).join('')}
    </div>
  </div>`;

export function propsPanel(n, sub) {
  const status = STATUS[n.type];
  const rows = [
    status ? seg('status', n.status, status.map((s) => [s, s])) : '',
    n.type === 'project' ? seg('horizon', n.horizon, HORIZON) : '',
    n.type === 'project' ? `
    <div class="prop"><span class="prop-k">studio</span>
      <input class="prop-in" data-key="studio" value="${esc(n.studio || '')}" placeholder="https://…" spellcheck="false"></div>` : '',
    n.type === 'client' ? `
    <div class="prop"><span class="prop-k">engagement</span>
      <input class="prop-in" data-key="engagement" value="${esc(n.engagement || '')}" placeholder="SOW pending, retainer, fixed scope…" spellcheck="false"></div>` : '',
    `<div class="prop"><span class="prop-k">tags</span>
      <input class="prop-in" data-key="tags" value="${esc(n.tags.join(', '))}" placeholder="comma, separated" spellcheck="false"></div>`,
    `<div class="prop prop-ro"><span class="prop-k">created</span><span>${esc(n.created || '—')}</span></div>`,
  ].filter(Boolean).join('');

  return `
  <details class="props" data-note="${esc(n.name)}">
    <summary class="sub" id="propsSub">${sub}</summary>
    <div class="props-body">${rows}</div>
  </details>`;
}

export const PROPS_JS = `
(function () {
  var box = document.querySelector('.props');
  if (!box) return;
  var name = box.dataset.note, sub = document.getElementById('propsSub');
  var LONG = function (d) { return d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; };
  var H = { short: 'short-term', long: 'long-term', ongoing: 'ongoing' };
  function redraw(n) {
    // Mirrors the server's sub line: status · horizon · kind · updated.
    var kind = sub.dataset.kind;
    sub.innerHTML = [n.status ? '<span>' + n.status + '</span>' : '', n.horizon ? '<span>' + (H[n.horizon] || n.horizon) + '</span>' : '',
      '<span>' + kind + '</span>', n.updated ? '<span>Updated ' + LONG(n.updated) + '</span>' : ''].join('');
  }
  function patch(fm) {
    return fetch('/api/notes/' + encodeURIComponent(name), { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ frontmatter: fm }) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(redraw)
      .catch(function () { sub.insertAdjacentHTML('beforeend', '<span class="prop-err">didn\\u2019t save</span>'); });
  }
  box.querySelectorAll('.prop-seg').forEach(function (s) {
    s.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        // Clicking the pressed one clears the key — a project with no status is allowed.
        var on = b.getAttribute('aria-pressed') === 'true';
        s.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        if (!on) b.setAttribute('aria-pressed', 'true');
        var fm = {}; fm[s.dataset.key] = on ? null : b.dataset.value; patch(fm);
      });
    });
  });
  box.querySelectorAll('.prop-in').forEach(function (i) {
    var was = i.value;
    function save() {
      if (i.value === was) return; was = i.value;
      var fm = {};
      fm[i.dataset.key] = i.dataset.key === 'tags' ? i.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean) : (i.value.trim() || null);
      patch(fm);
    }
    i.addEventListener('blur', save);
    i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); i.blur(); } });
  });
})();
`;

// Its styles live with the rest of the system, in style.js (.props, .prop).
export const PROPS_CSS = '';
