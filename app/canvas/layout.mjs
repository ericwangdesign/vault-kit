/* The layout check: what the checker can't see in a spec, measured on the drawn page. Each page opens in headless
   Chrome at a phone's width and a desktop's, and every shape is looked at for the mistakes only a screenshot showed
   before: text running past its card or cut off by it, two labels on top of each other, a chip broken across lines,
   and a page that scrolls sideways. Each one is an error: the page isn't done until it draws clean at both widths. */
import { launch } from './chrome.mjs';

export const WIDTHS = [390, 1440];

// Runs inside the page. Returns [{ at, msg }].
const AUDIT = `(() => {
  const out = [], de = document.documentElement, main = document.querySelector('main.cv');
  if (de.scrollWidth > de.clientWidth + 1) out.push({ at: 'page', msg: 'The page scrolls sideways by ' + (de.scrollWidth - de.clientWidth) + 'px.' });
  // A page that isn't a canvas (a tool of its own) is held to the page-wide rules only.
  if (!main) return document.getElementById('canvas') ? [{ at: 'page', msg: 'The canvas didn\\'t draw.' }] : out;
  const seen = (el) => el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : !!el.offsetParent;
  const short = (s) => { s = s.replace(/\\s+/g, ' ').trim(); return s.length > 40 ? s.slice(0, 38) + '…' : s; };
  const hit = (a, b, t) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > t && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > t;
  // Something that clips on purpose: a scroller, or a box that shows only part of what's in it (a tree canvas).
  const scrolls = (el) => { const s = getComputedStyle(el); return /auto|scroll/.test(s.overflowX + s.overflowY); };
  const clips = (el) => { const s = getComputedStyle(el); return s.overflowX !== 'visible' || s.overflowY !== 'visible'; };
  [...main.querySelectorAll(':scope > .cv-block, :scope > header')].forEach((blk) => {
    const at = blk.getAttribute('data-b') ? '#' + blk.getAttribute('data-b') : 'head';
    const box = blk.getBoundingClientRect(), leaves = [];
    blk.querySelectorAll('*').forEach((el) => {
      if (![...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) return;
      if (el.closest('.cv-pane, .cv-sr') || !seen(el)) return;
      let r;
      if (clips(el)) r = el.getBoundingClientRect();  // it truncates itself (an ellipsis): its box is what shows
      else { const g = document.createRange(); g.selectNodeContents(el); r = g.getBoundingClientRect(); }
      if (!r.width || !r.height) return;
      // Inside a box that clips: wholly outside it is hidden on purpose (a closed section); partly is cut off.
      let hidden = false, cut = null;
      for (let a = el.parentElement; a && a !== blk.parentElement; a = a.parentElement) {
        if (!clips(a)) continue;
        if (scrolls(a)) { hidden = 'scroll'; break; }
        if (getComputedStyle(a).textOverflow === 'ellipsis') { hidden = true; break; }  // cut short on purpose, with an ellipsis
        const q = a.getBoundingClientRect();
        if (!hit(r, q, 0)) { hidden = true; break; }
        if (r.left < q.left - 1 || r.right > q.right + 1 || r.top < q.top - 1 || r.bottom > q.bottom + 1) { cut = q; break; }
      }
      if (hidden === true) return;
      const text = short(el.textContent);
      if (cut) out.push({ at, msg: '"' + text + '" is cut off by its card.' });
      else if (hidden !== 'scroll' && (r.left < box.left - 1 || r.right > box.right + 1)) out.push({ at, msg: '"' + text + '" runs ' + Math.round(Math.max(box.left - r.left, r.right - box.right)) + 'px past the column.' });
      // A chip (a name, a badge, a flow label) reads as one thing; broken over two lines it reads as two.
      if (el.matches('.cv-k, .pick, .cv-f-label, .when, .m') && el.getClientRects().length > 1) out.push({ at, msg: 'The chip "' + text + '" breaks across lines.' });
      // Text broken inside its words: more lines than words means a column too narrow for it.
      // Only the element's own text counts, and rects on the same line (a badge beside it) are one line.
      if (!clips(el)) for (const c of el.childNodes) {
        if (c.nodeType !== 3 || !c.textContent.trim()) continue;
        const g = document.createRange(); g.selectNodeContents(c);
        const mids = [...g.getClientRects()].filter((q) => q.width > 1).map((q) => (q.top + q.bottom) / 2).sort((p, q) => p - q);
        const lines = mids.filter((m, i) => !i || m - mids[i - 1] > 4).length, words = c.textContent.trim().split(/\\s+/).length;
        if (lines > words) { out.push({ at, msg: '"' + text + '" breaks inside its words: its column is too narrow.' }); break; }
      }
      leaves.push({ el, rects: [...(clips(el) ? [r] : (() => { const g = document.createRange(); g.selectNodeContents(el); return g.getClientRects(); })())].filter((q) => q.width && q.height) });
    });
    // Two pieces of text on top of each other.
    for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
      const a = leaves[i], b = leaves[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (a.rects.some((p) => b.rects.some((q) => hit(p, q, 3)))) out.push({ at, msg: '"' + short(a.el.textContent) + '" and "' + short(b.el.textContent) + '" overlap.' });
    }
  });
  return out;
})()`;

// Check pages by URL. Returns { url: [{ w, at, msg }] }.
export async function layout(urls, { widths = WIDTHS } = {}) {
  const chrome = await launch(), res = {};
  try {
    for (const url of urls) {
      res[url] = [];
      for (const w of widths) {
        await chrome.open(url, { w, h: 900, scale: 1, load: true });
        await new Promise((r) => setTimeout(r, 200));
        const found = await chrome.evalJs(AUDIT) || [];
        const seen = new Set();
        for (const p of found) { const k = p.at + p.msg; if (!seen.has(k)) { seen.add(k); res[url].push({ w, ...p }); } }
      }
    }
  } finally { chrome.close(); }
  return res;
}
