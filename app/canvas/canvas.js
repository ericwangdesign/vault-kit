/* The writing canvas. Claude writes a page as data, this draws it.
   A page is a <script type="application/json" id="canvas"> with a title and a list of blocks,
   followed by <script src="/canvas.js">. The block catalog is in the writing-canvas skill;
   every block here matches one entry there. Runs before DOMContentLoaded on purpose, so
   /vault.js can build the section rail from the h2s this writes. */
(function () {
  var src = document.getElementById('canvas');
  if (!src) return;
  var spec;
  try { spec = JSON.parse(src.textContent); }
  catch (e) { document.body.insertAdjacentHTML('beforeend', '<p class="cv-bad">The page data isn\'t valid JSON: ' + esc(e.message) + '</p>'); return; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // A small, safe slice of markdown: **bold**, *italic*, [links](url) and `names`.
  function md(s) {
    var h = esc(s);
    h = h.replace(/`([^`]+)`/g, '<span class="cv-k">$1</span>');
    h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) { return /^\s*javascript:/i.test(u) ? t : '<a href="' + u + '">' + t + '</a>'; });
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
    return h;
  }
  function spans(list) { return (list || []).map(function (x) { return '<span>' + md(x) + '</span>'; }).join(''); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function cap(b) { return b.caption ? '<div class="cv-cap">' + md(b.caption) + '</div>' : ''; }
  // A picture of a UI that has a light mode takes `srcLight` too; the page shows the one that matches day or night.
  // A src ending in .mp4 or .webm is motion: a silent loop, paused for people who ask for less motion.
  function pic(s, alt, w, h, extra) {
    var c = crop(s, w, h);
    if (c) return '<span class="cv-crop" style="aspect-ratio:' + c.ar + ';--cx:' + c.x + ';--cy:' + c.y + ';--cw:' + c.w + ';--ch:' + c.h + '">' + pic(Object.assign({}, s, { crop: null }), alt, w, h, extra) + '</span>';
    var one = function (src, cls) {
      var size = w ? ' width="' + w + '" height="' + h + '"' : '', c = cls ? ' class="' + cls + '"' : '';
      return isVideo(src)
        ? '<video' + c + ' src="' + esc(src) + '"' + (s.poster ? ' poster="' + esc(s.poster) + '"' : '') + size + ' muted loop playsinline autoplay preload="metadata" aria-label="' + esc(alt) + '"></video>'
        : '<img' + c + ' src="' + esc(src) + '" alt="' + esc(alt) + '"' + size + (extra || '') + '>';
    };
    return s.srcLight ? one(s.src, 'cv-dark') + one(s.srcLight, 'cv-light') : one(s.src);
  }
  // `crop`: { x, y, w, h } in percent of the picture, the part the point is about. Needs the picture's `w` and `h`.
  // Not on a picture with pins: the pins are placed on the whole picture.
  function crop(s, w, h) {
    var c = s && s.crop;
    if (!c || s.pins || !(w = s.w || w) || !(h = s.h || h) || !(c.w > 0 && c.h > 0)) return null;
    return { x: +c.x || 0, y: +c.y || 0, w: +c.w, h: +c.h, ar: (w * c.w / 100).toFixed(1) + ' / ' + (h * c.h / 100).toFixed(1) };
  }
  // The size a picture shows at: its crop when it has one.
  function shown(s, w, h) { var c = crop(s, w, h); return c ? [w * c.w / 100, h * c.h / 100] : [w, h]; }
  function isVideo(src) { return /\.(mp4|webm|mov)(\?|$)/i.test(String(src || '')); }
  // Every shape can carry a title, and the title says what the shape shows: "Stop now says what happened", not "Stop".
  function title(b) { return b.title ? '<div class="cv-s-title">' + md(b.title) + '</div>' : ''; }
  // Numbered pins on a picture, and the notes they point at. Shared by before/after and a figure with pins.
  function pinButtons(pins) {
    return (pins || []).map(function (p, i) {
      return '<button type="button" class="cv-pin" style="--px:' + p.x + '%;--py:' + p.y + '%;--i:' + i + '" data-n="' + (i + 1) + '" aria-label="Note ' + (i + 1) + '">' + (i + 1) + '</button>';
    }).join('');
  }
  function pinNotes(k, label, pins) {
    return '<ol data-side="' + k + '" aria-label="' + esc(label) + '">' + (pins || []).map(function (p, i) {
      return '<li class="cv-note" data-n="' + (i + 1) + '" tabindex="0"><span class="n">' + (i + 1) + '</span><span>' + md(p.text) + '</span></li>';
    }).join('') + '</ol>';
  }
  function bad(msg) { console.warn('[canvas] ' + msg); return '<p class="cv-bad">' + esc(msg) + '</p>'; }

  var uid = 0;
  var BLOCKS = {
    text: function (b) {
      return String(b.md || '').split(/\n\s*\n/).map(function (p) { return '<p class="cv-p">' + md(p.trim()) + '</p>'; }).join('');
    },
    heading: function (b) { return '<h2 class="cv-h2" id="' + slug(b.text) + '">' + esc(b.text) + '</h2>'; },
    list: function (b) { return '<ul class="cv-ul">' + (b.items || []).map(function (i) { return '<li class="cv-li">' + md(i) + '</li>'; }).join('') + '</ul>'; },
    quote: function (b) { return '<blockquote class="cv-quote">' + md(b.md) + (b.cite ? '<cite>' + md(b.cite) + '</cite>' : '') + '</blockquote>'; },
    // An aside is a side note; with a `tone` it's a callout: `good` for what worked, `warn` for what
    // to watch. The tone tints the card and marks the title with a dot, never a coloured edge.
    aside: function (b) {
      var tone = /^(good|warn)$/.test(b.tone) ? ' is-' + b.tone : '';
      return '<div class="cv-aside' + tone + '">' + (b.title ? '<b>' + esc(b.title) + '</b>' : '') + md(b.md) + '</div>';
    },
    // A figure with `pins` is an anatomy: one picture, numbered notes on what it's made of.
    figure: function (b) {
      if (!b.pins || !b.pins.length)
        return '<figure class="cv-block cv-figure cv-bleed' + place(b, true) + '" style="margin-inline:0">' + title(b) + '<div class="cv-fig" data-large>' + pic(b, b.alt, b.w, b.h, ' loading="lazy"') + '</div>' + cap(b) + '</figure>';
      return '<figure class="cv-block cv-pinned cv-ana cv-bleed' + (b.wide === false ? '' : ' cv-wide has-notes') + '" style="margin-inline:0">' + title(b) +
        '<div class="cv-stage is-single"><div class="cv-side one is-on" data-side="one"><div class="cv-lens">' + pic(b, b.alt, b.w, b.h, ' draggable="false"') + '</div>' +
        '<span class="cv-dim"></span>' + pinButtons(b.pins) + '</div></div>' +
        '<div class="cv-notes">' + pinNotes('one', 'Notes', b.pins).replace('<ol ', '<ol class="is-on" ') + '</div>' + cap(b) + '</figure>';
    },

    beforeAfter: function (b) {
      var id = 'ba' + (++uid), sides = ['before', 'after'];
      var blocks = !b.before || !b.before.src;
      var label = function (k) { return (b[k] && b[k].label) || (k === 'before' ? 'Before' : 'After'); };
      var side = function (k) {
        var s = b[k] || {}, pins = s.pins || [];
        var body = s.src
          ? '<div class="cv-lens">' + pic(s, s.alt, b.w, b.h, ' draggable="false"') + '</div>' + (pins.length ? '<span class="cv-dim"></span>' : '')
          : render(s.blocks || [], { inSide: true });
        return '<div class="cv-side ' + k + '" data-side="' + k + '" aria-hidden="true">' + body + pinButtons(pins) + '</div>';
      };
      var notes = function (k) { return pinNotes(k, label(k) + ' notes', b[k] && b[k].pins); };
      var hasNotes = sides.some(function (k) { return b[k] && b[k].pins && b[k].pins.length; });
      var place = b.wide === false ? '' : hasNotes ? ' cv-wide has-notes' : ' cv-wide';
      return '<figure class="cv-block cv-pinned cv-ba' + (blocks ? '' : ' cv-bleed') + place + '" id="' + id + '" data-start="' + (b.start || 'before') + '" style="margin-inline:0">' + title(b) +
        '<div class="cv-ba-bar"><div class="cv-seg" role="group" aria-label="Show">' +
          '<span class="cv-thumb"></span>' +
          sides.map(function (k) { return '<button type="button" data-show="' + k + '" aria-pressed="false">' + esc(label(k)) + '</button>'; }).join('') +
        '</div>' + (blocks ? '' : '<button type="button" class="cv-mode" aria-pressed="false">Slide</button>') + '</div>' +
        '<div class="cv-stage' + (blocks ? ' is-blocks' : '') + '">' + side('before') + side('after') +
          (blocks ? '' : '<span class="cv-tag l">' + esc(label('before')) + '</span><span class="cv-tag r">' + esc(label('after')) + '</span>' +
          '<div class="cv-handle"><div class="cv-grip" tabindex="0" role="slider" aria-label="Before and after split" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 7.5-4.5 4.5 4.5 4.5M14.5 7.5l4.5 4.5-4.5 4.5"/></svg></div></div>') +
        '</div>' +
        (hasNotes ? '<div class="cv-notes">' + notes('before') + notes('after') + '</div>' : '') +
        cap(b) + '</figure>';
    },

    decision: function (b) {
      var col = function (title, items, cls) {
        return items && items.length ? '<div class="' + cls + '"><div class="cv-label">' + esc(title) + '</div><ul>' +
          items.map(function (i) { return '<li>' + md(i) + '</li>'; }).join('') + '</ul></div>' : '';
      };
      // Not made yet: the open question is the headline, and there's no "Still open" box under it.
      var pending = !b.chose;
      return '<section class="cv-block cv-decision' + (pending ? ' is-pending' : '') + '">' +
        '<div class="cv-label">' + esc(b.label || (pending ? 'Not decided yet' : 'Decision')) + '</div>' +
        '<p class="cv-chose">' + md(pending ? b.open : b.chose) + '</p>' +
        ((b.why && b.why.length) || (b.cost && b.cost.length) ? '<div class="cv-why">' + col(b.whyLabel || 'Why', b.why, 'pro') + col(b.costLabel || 'What it costs', b.cost, 'cost') + '</div>' : '') +
        (b.open && !pending ? '<div class="cv-open"><b>Still open.</b> ' + md(b.open) + '</div>' : '') +
        (b.sign ? '<div class="cv-sign">' + spans(b.sign) + '</div>' : '') +
      '</section>';
    },

    timeline: function (b) {
      return '<div class="cv-block">' + title(b) + '<ol class="cv-timeline">' + (b.items || []).map(function (i) {
        return '<li' + (i.key ? ' class="is-key"' : '') + '><time>' + esc(i.when) + '</time><div class="t">' + md(i.title) + '</div>' +
          (i.text ? '<div class="d">' + md(i.text) + '</div>' : '') + '</li>';
      }).join('') + '</ol>' + cap(b) + '</div>';
    },

    tree: function (b, ctx) {
      var MARK = { new: 'New', gone: 'Gone', moved: 'Moved' };
      var node = function (n) {
        return '<li><span class="cv-node' + (n.mark ? ' is-' + n.mark : '') + (n.key ? ' is-key' : '') + '"><span class="t">' + md(n.label) + '</span>' +
          (n.note ? '<span class="note">' + md(n.note) + '</span>' : '') + (n.mark ? '<span class="m">' + (MARK[n.mark] || esc(n.mark)) + '</span>' : '') + '</span>' +
          (n.children && n.children.length ? '<ul>' + n.children.map(node).join('') + '</ul>' : '') + '</li>';
      };
      var roots = b.roots || (b.root ? [b.root] : []), canvas = !(ctx && ctx.inSide);
      return '<div class="cv-block">' + title(b) + '<div class="cv-tree' + (canvas ? ' is-canvas' : '') + '"><div class="cv-pane"><ul>' + roots.map(node).join('') + '</ul></div>' +
        (canvas ? '<div class="cv-zoom"><button type="button" data-z="out" aria-label="Zoom out">−</button><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="fit">Fit</button></div>' : '') +
        '</div>' + cap(b) + '</div>';
    },

    compare: function (b) {
      var opts = b.options || [], rows = b.rows || [], n = opts.length;
      var cell = function (j, cls, html) { return '<div class="' + cls + (j === b.picked ? ' is-picked' : '') + '" data-opt="' + esc(opts[j]) + '">' + html + '</div>'; };
      var html = '<div class="lab head"></div>' + opts.map(function (o, j) {
        return cell(j, 'opt top', md(o) + (j === b.picked && b.pickLabel !== '' ? '<span class="pick">' + esc(b.pickLabel || 'Picked') + '</span>' : ''));
      }).join('');
      rows.forEach(function (r, ri) {
        var last = ri === rows.length - 1;
        html += '<div class="lab">' + md(r.label) + '</div>' + (r.values || []).map(function (v, j) {
          return cell(j, 'val' + (last ? ' end' : ''), md(v));
        }).join('');
      });
      // Two options fit the text column; three or more go wide.
      var wide = b.wide != null ? b.wide : n > 2;
      return '<div class="cv-block' + (wide ? ' cv-wide' : '') + '">' + title(b) + '<div class="cv-compare" style="--cols:' + n + '">' + html + '</div>' + cap(b) + '</div>';
    },

    steps: function (b) {
      return '<div class="cv-block">' + title(b) + '<ol class="cv-steps">' + (b.items || []).map(function (i, k) {
        return '<li' + (i.key ? ' class="is-key"' : '') + '><span class="n">' + (k + 1) + '</span><div class="t">' + md(i.title) + '</div>' +
          (i.text ? '<div class="d">' + md(i.text) + '</div>' : '') + '</li>';
      }).join('') + '</ol>' + cap(b) + '</div>';
    },

    /* ---------- the work itself: variants and flow ---------- */

    // Variants: what was tried, side by side, with the one that won marked. Without a pick it's a set of states.
    variants: function (b) {
      var items = b.items || [], pics = items.some(function (i) { return i.src; });
      // Pictures sit two across at most, on the wide track, so a screen is big enough to read; text cards up to four.
      var cols = Math.max(1, Math.min(pics ? 2 : 4, b.cols || (items.length === 4 ? 2 : Math.min(items.length, 3))));
      var ratio = (b.w && b.h) ? b.w + ' / ' + b.h : '4 / 3';
      return '<figure class="cv-block' + (pics ? ' cv-bleed' : '') + place(b, pics) + '" style="margin-inline:0">' + title(b) +
        '<div class="cv-vars' + (pics ? '' : ' is-text') + '" style="--cols:' + cols + ';--ratio:' + ratio + '">' + items.map(function (i) {
          var label = '<div class="cv-var-label">' + md(i.label || '') + (i.picked && b.pickLabel !== '' ? '<span class="pick">' + esc(b.pickLabel || 'Picked') + '</span>' : '') + '</div>';
          var note = i.note ? '<div class="cv-var-note">' + md(i.note) + '</div>' : '';
          var body = i.src
            ? '<div class="cv-var-pic' + (b.fit === 'contain' ? ' is-contain' : '') + '" data-large>' + pic(i, i.alt || plain(i.label), i.w || b.w, i.h || b.h, ' loading="lazy"') + '</div>' + label + note
            : '<div class="cv-var-card">' + label + (i.md ? '<div class="cv-var-text">' + md(i.md) + '</div>' : '') + note + '</div>';
          return '<div class="cv-var' + (i.picked ? ' is-picked' : '') + (i.mark === 'gone' ? ' is-gone' : '') + '">' + body + '</div>';
        }).join('') + '</div>' + cap(b) + '</figure>';
    },

    // Flow: states or screens joined by arrows, with branches. Columns are drawn here; the arrows are drawn after layout.
    flow: function (b) {
      var nodes = b.nodes || [], edges = b.edges || [];
      if (!nodes.length) return bad('A flow needs nodes.');
      var known = {};
      nodes.forEach(function (n) { known[n.id] = 1; });
      var miss = edges.filter(function (e) { return !known[e.from] || !known[e.to]; })[0];
      if (miss) return bad('A flow edge points at a node that isn\'t there: ' + miss.from + ' → ' + miss.to);
      return '<figure class="cv-block' + (b.wide === false ? '' : ' cv-wide') + '" style="margin-inline:0">' + title(b) +
        '<div class="cv-flow" data-flow="' + esc(JSON.stringify({ nodes: nodes.map(function (n) { return n.id; }), rows: nodes.map(function (n) { return n.row || 0; }), edges: edges.map(function (e) { return [e.from, e.to, !!e.key]; }) })) + '">' +
          '<svg class="cv-f-wires" aria-hidden="true"></svg>' +
          nodes.map(function (n) {
            return '<div class="cv-f-node' + (n.key ? ' is-key' : '') + (n.kind ? ' is-' + esc(n.kind) : '') + '" data-id="' + esc(n.id) + '"><span class="t">' + md(n.label) + '</span>' +
              (n.note ? '<span class="note">' + md(n.note) + '</span>' : '') + '</div>';
          }).join('') +
          edges.map(function (e, i) { return e.label ? '<span class="cv-f-label' + (e.key ? ' is-key' : '') + '" data-e="' + i + '">' + md(e.label) + '</span>' : ''; }).join('') +
        '</div>' + cap(b) + '</figure>';
    },

    // Sequence: one party asking others in turn. The parties head the columns, each with a line down; every message is
    // an arrow from one line to another, in order, top to bottom, its words above it. A reply is dashed.
    sequence: function (b) {
      var ps = b.parties || [], n = ps.length, at = {};
      if (n < 2) return bad('A sequence needs two or more parties.');
      ps.forEach(function (p, i) { at[p.id] = i; });
      var miss = (b.steps || []).filter(function (s) { return at[s.from] == null || at[s.to] == null; })[0];
      if (miss) return bad('A sequence step names a party that isn\'t there: ' + miss.from + ' → ' + miss.to);
      return '<figure class="cv-block" style="margin-inline:0">' + title(b) +
        '<div class="cv-seq" style="--n:' + n + '"><div class="cv-sq-heads">' + ps.map(function (p) {
          return '<div class="cv-sq-p' + (p.key ? ' is-key' : '') + '"><span class="t">' + md(p.label) + '</span>' + (p.note ? '<span class="note">' + md(p.note) + '</span>' : '') + '</div>';
        }).join('') + '</div><ol class="cv-sq-steps">' + ps.map(function (p, i) { return '<span class="cv-sq-life" style="--i:' + i + '" aria-hidden="true"></span>'; }).join('') +
        (b.steps || []).map(function (s) {
          var a = at[s.from], z = at[s.to], self = a === z;
          return '<li class="cv-sq-step' + (s.key ? ' is-key' : '') + (s.reply ? ' is-reply' : '') + (self ? ' is-self' + (a > (n - 1) / 2 ? ' is-back' : '') : z < a ? ' is-left' : '') +
            '" style="--a:' + Math.min(a, z) + ';--b:' + Math.max(a, z) + '"><div class="lab"><span>' + md(s.label) + '</span>' +
            (s.note ? '<i>' + md(s.note) + '</i>' : '') + '</div><div class="arr" aria-hidden="true"></div></li>';
        }).join('') + '</ol></div>' + cap(b) + '</figure>';
    },

    /* ---------- depth and detail: collapsible, tabs, table, checklist, sources ---------- */

    // Collapsible: one line on show, the depth underneath. For the brief, the method, the raw notes: things a
    // careful reader wants and a skimmer doesn't. Two or more in a row read as one stack.
    collapsible: function (b) {
      var id = 'cl' + (++uid);
      return '<div class="cv-block cv-coll' + (b.open ? ' is-open' : '') + '">' +
        '<button type="button" class="cv-coll-head" aria-expanded="' + (b.open ? 'true' : 'false') + '" aria-controls="' + id + '">' +
          '<span class="t">' + md(b.title || 'More') + (b.note ? '<span class="note">' + md(b.note) + '</span>' : '') + '</span>' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>' +
        '<div class="cv-coll-body" id="' + id + '" role="region"><div class="cv-coll-in"><div class="cv-coll-pad">' + render(b.blocks || [], { inSide: true }) + '</div></div></div></div>';
    },

    // Tabs: the same place, two to five views of it. A before/after is the two-tab case with a slide; tabs are for
    // the rest: phone, tablet, desktop; three arcs; three rounds.
    tabs: function (b) {
      var panes = b.tabs || [];
      if (!panes.length) return bad('Tabs need tabs.');
      return '<figure class="cv-block cv-tabs' + place(b, false) + '" style="margin-inline:0">' + title(b) +
        '<div class="cv-ba-bar"><div class="cv-seg" role="tablist"><span class="cv-thumb"></span>' + panes.map(function (p, i) {
          return '<button type="button" role="tab" data-show="t' + i + '" aria-selected="' + (i === (b.start || 0)) + '">' + esc(p.label || 'Tab ' + (i + 1)) + '</button>';
        }).join('') + '</div></div>' +
        '<div class="cv-stage is-blocks is-tabs">' + panes.map(function (p, i) {
          return '<div class="cv-side t' + i + (i === (b.start || 0) ? ' is-on' : '') + '" data-side="t' + i + '" role="tabpanel">' + render(p.blocks || [], { inSide: true }) + '</div>';
        }).join('') + '</div>' + cap(b) + '</figure>';
    },

    // Table: rows of records. Compare is options judged on criteria; a table is a list of things with the same fields.
    table: function (b) {
      var cols = (b.columns || []).map(function (c) { return typeof c === 'string' ? { label: c } : c; });
      var rows = (b.rows || []).map(function (r) { return Array.isArray(r) ? { cells: r } : r; });
      var right = cols.map(function (c, j) { return c.align ? c.align === 'right' : rows.length && rows.every(function (r) { return typeof r.cells[j] === 'number'; }); });
      var cell = function (v, j, tag) { return '<' + tag + (right[j] ? ' class="r"' : '') + '>' + (typeof v === 'number' ? num(v, b) : md(v)) + '</' + tag + '>'; };
      return '<figure class="cv-block' + place(b, false) + '" style="margin-inline:0">' + title(b) + '<div class="cv-table"><table>' +
        '<thead><tr>' + cols.map(function (c, j) { return cell(c.label, j, 'th'); }).join('') + '</tr></thead><tbody>' +
        rows.map(function (r) { return '<tr' + (r.key ? ' class="is-key"' : '') + '>' + r.cells.map(function (v, j) { return cell(v, j, 'td'); }).join('') + '</tr>'; }).join('') +
        '</tbody></table></div>' + cap(b) + '</figure>';
    },

    // Checklist: where a plan stands. Done, doing, open, blocked; the count sits by the title.
    checklist: function (b) {
      var items = b.items || [], done = items.filter(function (i) { return i.state === 'done'; }).length;
      var ICON = {
        done: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" class="f"/><path d="m6.2 10.2 2.5 2.5 5-5.2" class="k"/></svg>',
        doing: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" class="ring"/><path d="M10 2a8 8 0 0 1 0 16" class="half"/></svg>',
        open: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" class="ring"/></svg>',
        blocked: '<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" class="ring dash"/><path d="M6.5 10h7" class="k2"/></svg>'
      };
      var NAME = { done: 'Done', doing: 'Doing', open: 'Open', blocked: 'Blocked' };
      return '<div class="cv-block">' + (b.title ? '<div class="cv-s-title cv-cl-head"><span>' + md(b.title) + '</span><span class="n">' + done + ' of ' + items.length + ' done</span></div>' : '') +
        '<ul class="cv-check">' + items.map(function (i) {
          var s = ICON[i.state] ? i.state : 'open';
          return '<li class="is-' + s + '"><span class="i" role="img" aria-label="' + NAME[s] + '">' + ICON[s] + '</span><div class="t">' + md(i.label) +
            (i.when ? '<span class="when">' + esc(i.when) + '</span>' : '') + '</div>' + (i.note ? '<div class="d">' + md(i.note) + '</div>' : '') + '</li>';
        }).join('') + '</ul>' + cap(b) + '</div>';
    },

    // Sources: where the claims on the page came from. A letter tile stands in for a favicon, so nothing loads from
    // anyone else's server.
    sources: function (b) {
      return '<div class="cv-block">' + title(b) + '<ol class="cv-src">' + (b.items || []).map(function (s, i) {
        var site = s.site || (String(s.url || '').match(/^https?:\/\/(?:www\.)?([^/]+)/) || [])[1] || '';
        return '<li><span class="mark">' + esc(plain(s.title || site || '?').charAt(0).toUpperCase()) + '</span><div>' +
          '<a href="' + esc(s.url) + '" rel="noopener">' + md(s.title) + '</a><span class="site">' + esc(site) + (s.checked ? ' · checked ' + esc(s.checked) : '') + '</span>' +
          (s.note ? '<div class="d">' + md(s.note) + '</div>' : '') + '</div></li>';
      }).join('') + '</ol>' + cap(b) + '</div>';
    },

    // Code: a few lines that carry the point, in Geist Mono (the one place the canvas uses mono). `mark` lights the
    // lines that matter; `diff` reads a leading + or - as added or removed. Colour stays quiet: comments grey, strings
    // and numbers in the accent's ink, keywords a weight heavier, everything else plain.
    // Something to use, not only look at: a piece of the page's own HTML and script (a <template> in the page, named by
    // `template`), or a whole page of its own (`src`) in a frame that grows to fit it. It sits in the column like any
    // shape, under a title that says what trying it shows. The pieces are mounted once the page is drawn (live() below).
    live: function (b) {
      var body = b.src
        ? '<iframe class="cv-live-frame" src="' + esc(b.src) + '" title="' + esc(b.alt || b.title || 'Live piece') + '" loading="lazy"' + (b.h ? ' style="height:' + (+b.h) + 'px"' : '') + '></iframe>'
        : '<div class="cv-live-mount" data-template="' + esc(b.template) + '"></div>';
      return '<figure class="cv-block cv-live' + (b.bare ? ' is-bare' : '') + place(b, false) + '" style="margin-inline:0">' + title(b) +
        '<div class="cv-live-card">' + body + '</div>' + cap(b) + '</figure>';
    },

    // Cards: a handful of things, each worth opening. A name, a kind, a line, somewhere
    // to go, and a picture when there is one: places on a trip, pages, tools, people. Things compared on the same fields
    // are a table.
    cards: function (b) {
      var items = b.items || [], pics = items.some(function (i) { return i.src; });
      var cols = Math.max(1, Math.min(pics ? 2 : 3, b.cols || (items.length > 4 && !pics ? 3 : 2)));
      var ratio = (b.w && b.h) ? b.w + ' / ' + b.h : '3 / 2';
      return '<figure class="cv-block' + place(b, false) + '" style="margin-inline:0">' + title(b) +
        '<div class="cv-cards" style="--cols:' + cols + ';--ratio:' + ratio + '">' + items.map(function (i) {
          var out = /^https?:/.test(i.href || ''), tag = i.href ? 'a' : 'div';
          var go = i.href ? ' href="' + esc(i.href) + '"' + (out ? ' rel="noopener"' : '') : '';
          var foot = [i.kind, i.meta].filter(Boolean);
          return '<' + tag + ' class="cv-card' + (i.key ? ' is-key' : '') + '"' + go + '>' +
            (i.src ? '<div class="cv-card-pic">' + pic(i, i.alt || plain(i.title), i.w || b.w, i.h || b.h, ' loading="lazy"') + '</div>' : '') +
            '<div class="cv-card-body"><div class="cv-card-title">' + md(i.title || '') +
              (out ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 10.5 10.5 5.5M6.5 5.5h4v4"/></svg>' : '') + '</div>' +
              (i.text ? '<div class="cv-card-text">' + md(i.text) + '</div>' : '') +
              (foot.length ? '<div class="cv-card-foot">' + foot.map(function (f, k) { return '<span' + (k === 0 && i.kind ? ' class="kind"' : '') + '>' + md(f) + '</span>'; }).join('') + '</div>' : '') +
            '</div></' + tag + '>';
        }).join('') + '</div>' + cap(b) + '</figure>';
    },

    // Carousel: screens seen one after another, swiped or stepped through: a flow's screens on a phone, a set of pages.
    // Pictures stand at one height, so tall phone screens sit two or three to a view and wide ones one at a time.
    // Side by side to compare is variants. Wired after the page is drawn (carousel() below).
    carousel: function (b) {
      var items = b.items || [];
      if (!items.length) return bad('A carousel needs items.');
      return '<figure class="cv-block cv-car cv-bleed' + place(b, true) + '" style="margin-inline:0">' + title(b) +
        '<div class="cv-car-track" tabindex="0" aria-label="' + esc(plain(b.title || 'Pictures')) + ', ' + items.length + ' in all">' + items.map(function (i, n) {
          var w = i.w || b.w || 4, h = i.h || b.h || 3, sz = shown(i, w, h);
          return '<div class="cv-car-slide" style="--ar:' + w + ' / ' + h + ';--r:' + (sz[0] / sz[1]).toFixed(4) + '" aria-label="' + (n + 1) + ' of ' + items.length + '">' +
            '<div class="cv-car-pic" data-large>' + pic(i, i.alt || plain(i.label || ''), w, h, ' loading="lazy"') + '</div>' +
            (i.label ? '<div class="cv-car-label">' + md(i.label) + '</div>' : '') + (i.note ? '<div class="cv-car-note">' + md(i.note) + '</div>' : '') + '</div>';
        }).join('') + '</div>' +
        '<div class="cv-car-bar"><div class="cv-car-ctl">' +
          '<button type="button" data-go="-1" aria-label="Previous"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg></button>' +
          '<span class="n" aria-live="polite">1 of ' + items.length + '</span>' +
          '<button type="button" data-go="1" aria-label="Next"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg></button>' +
        '</div></div>' + cap(b) + '</figure>';
    },

    // Sheet: a table the owner edits on the page (a booking list, a review, a budget). Each column is text, a number, a
    // tick or a pick; rows can be added and removed; every change saves to the vault under the block's `id`.
    // A table only to read is `table`. Wired after the page is drawn (sheet() below).
    sheet: function (b) {
      var id = b.id || slug(plain(b.title || 'sheet'));
      var cols = (b.columns || []).map(function (c) { return typeof c === 'string' ? { label: c } : c; });
      var sums = cols.some(function (c) { return c.sum; }), add = b.add !== false;
      return '<figure class="cv-block cv-sheet' + place(b, false) + '" data-sheet="' + esc(id) + '" data-cols="' + esc(JSON.stringify(cols)) + '" data-add="' + (add ? 1 : 0) + '" style="margin-inline:0">' + title(b) +
        '<div class="cv-table cv-sheet-box"><table><thead><tr>' + cols.map(function (c) {
          return '<th' + (c.kind === 'number' ? ' class="r"' : '') + '>' + md(c.label || '') + '</th>';
        }).join('') + (add ? '<th class="x"><span class="cv-sr">Remove</span></th>' : '') + '</tr></thead><tbody>' +
        (b.rows || []).map(function (r) { return sheetRow(cols, r, add); }).join('') + '</tbody>' +
        (sums ? '<tfoot><tr>' + cols.map(function (c, j) { return '<td' + (c.kind === 'number' ? ' class="r"' : '') + ' data-sum="' + (c.sum ? j : '') + '">' + (j === 0 ? 'Total' : '') + '</td>'; }).join('') + (add ? '<td></td>' : '') + '</tr></tfoot>' : '') +
        '</table></div>' +
        '<div class="cv-sheet-bar">' + (add ? '<button type="button" class="cv-sheet-add">Add row</button>' : '') + '<span class="cv-ask-status" aria-live="polite"></span></div>' + cap(b) + '</figure>';
    },

    // Gallery: a wall of pictures, any shape, each opening large with its caption; arrows and arrow keys walk the set.
    // For 6 or more pictures with nothing to pick. Options side by side are variants; screens in order, a carousel.
    gallery: function (b) {
      var items = b.items || [];
      if (!items.length) return bad('A gallery needs items.');
      var cols = Math.max(1, Math.min(2, b.cols || 2));
      return '<figure class="cv-block cv-gal cv-bleed' + place(b, true) + '" style="margin-inline:0">' + title(b) +
        '<div class="cv-gal-grid" style="--cols:' + cols + '">' + items.map(function (i, n) {
          return '<button type="button" class="cv-gal-item" data-i="' + n + '" data-label="' + esc(plain(i.label || '')) + '" data-note="' + esc(plain(i.note || '')) + '" aria-label="' + esc(plain(i.label || i.alt || 'Picture ' + (n + 1))) + ', open">' +
            pic(i, i.alt || plain(i.label || ''), i.w, i.h, ' loading="lazy"') + '</button>';
        }).join('') + '</div>' + cap(b) + '</figure>';
    },

    // Map: places on a real map (Esri's grey canvas over OpenStreetMap data, dark by night, light by day), numbered, with the list
    // under it: name, kind, a fact, and a link that opens the place in Google Maps. For trips and anywhere a place's
    // where matters. The map fits every place; drag to look around, − and + to zoom. Wired after the page is drawn.
    map: function (b) {
      var places = b.places || [];
      if (!places.length) return bad('A map needs places.');
      return '<figure class="cv-block cv-map' + place(b, false) + '" data-places="' + esc(JSON.stringify(places.map(function (p) { return [+p.lat, +p.lng, !!p.key]; }))) + '"' + (b.zoom ? ' data-zoom="' + (+b.zoom) + '"' : '') + ' style="margin-inline:0">' + title(b) +
        '<div class="cv-map-box" role="img" aria-label="Map of ' + places.length + ' places"><div class="cv-map-tiles"></div><div class="cv-map-pins"></div></div>' +
        '<div class="cv-map-bar"><span class="cv-map-credit">Esri, HERE, Garmin, © OpenStreetMap</span><div class="cv-zoom"><button type="button" data-z="out" aria-label="Zoom out">−</button><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="fit">Fit</button></div></div>' +
        '<ol class="cv-map-list">' + places.map(function (p, n) {
          var href = p.href || 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(plain(p.query || p.title || (p.lat + ',' + p.lng)));
          var foot = [p.kind, p.meta].filter(Boolean);
          return '<li data-n="' + n + '"' + (p.key ? ' class="is-key"' : '') + '><span class="cv-map-num">' + (n + 1) + '</span><div><a href="' + esc(href) + '" rel="noopener">' + md(p.title || '') + '</a>' +
            (foot.length ? '<div class="d">' + foot.map(function (f, k) { return '<span' + (k === 0 && p.kind ? ' class="kind"' : '') + '>' + md(f) + '</span>'; }).join('') + '</div>' : '') +
            (p.note ? '<div class="note">' + md(p.note) + '</div>' : '') + '</div></li>';
        }).join('') + '</ol>' + cap(b) + '</figure>';
    },

    // Ask: questions the owner answers on the page. A pick, a few picks, a number, a
    // line. Answers save to the vault under the block's `id` (pages/_state/<page>.json) for Claude to read. `rec` marks
    // the option Claude would pick, so it's a recommendation, not a menu. Wired after the page is drawn (ask() below).
    ask: function (b) {
      var id = b.id || slug(plain(b.title || 'answers'));
      return '<figure class="cv-block cv-ask' + place(b, false) + '" data-ask="' + esc(id) + '" style="margin-inline:0">' + title(b) +
        '<div class="cv-ask-card">' + (b.questions || []).map(function (q, n) {
          var qid = esc(q.id || 'q' + (n + 1)), kind = q.kind || 'pick', body;
          if (kind === 'pick' || kind === 'many') {
            body = '<div class="cv-opts" role="group" data-kind="' + kind + '">' + (q.options || []).map(function (o) {
              o = typeof o === 'string' ? { label: o } : o;
              return '<button type="button" class="cv-opt" aria-pressed="false" data-v="' + esc(plain(o.label)) + '">' +
                '<span class="l">' + md(o.label) + (o.rec ? '<span class="rec">Suggested</span>' : '') + '</span>' +
                (o.note ? '<span class="d">' + md(o.note) + '</span>' : '') + '</button>';
            }).join('') + '</div>';
          } else if (kind === 'scale') {
            // The vault's Bar slider (SLIDER in style.js), the number riding inside it.
            var v = q.value != null ? q.value : q.min || 0, lo = +q.min || 0, hi = +q.max || 10, st = +q.step || 1;
            body = '<label class="cv-scale slider"><span class="slider-head"><span></span><output data-unit="' + esc(q.unit || '') + '"></output></span>' +
              '<input type="range" min="' + lo + '" max="' + hi + '" step="' + st + '" value="' + (+v) + '" aria-label="' + esc(plain(q.q)) + '"></label>';
          } else {
            body = '<textarea class="cv-ask-text" rows="2" placeholder="' + esc(q.placeholder || '') + '" aria-label="' + esc(plain(q.q)) + '"></textarea>';
          }
          return '<div class="cv-q" data-q="' + qid + '" data-kind="' + kind + '"><div class="cv-q-label">' + md(q.q || '') + '</div>' +
            (q.note ? '<div class="cv-q-note">' + md(q.note) + '</div>' : '') + body + '</div>';
        }).join('') + '<div class="cv-ask-status" aria-live="polite"></div></div>' + cap(b) + '</figure>';
    },

    code: function (b) {
      var lines = String(b.code || '').replace(/\n$/, '').split('\n'), marks = {};
      (b.mark || []).forEach(function (n) { marks[n] = 1; });
      var body = lines.map(function (l, i) {
        var kind = '', text = l;
        // A diff line starts with +, - or a space (unchanged), then one space, the way a unified diff writes it.
        if (b.diff) { if (/^[+-]/.test(l)) kind = l[0] === '+' ? ' is-add' : ' is-del'; text = l.replace(/^[ +-] ?/, ''); }
        return '<span class="ln' + kind + (marks[i + 1] ? ' is-mark' : '') + '">' + (b.numbers === false ? '' : '<span class="no" aria-hidden="true">' + (i + 1) + '</span>') +
          (b.diff ? '<span class="sg" aria-hidden="true">' + (kind === ' is-add' ? '+' : kind === ' is-del' ? '−' : '') + '</span>' : '') +
          '<span class="tx">' + (hl(text) || ' ') + '</span></span>';
      }).join('');
      return '<figure class="cv-block' + place(b, false) + '" style="margin-inline:0">' + title(b) +
        '<div class="cv-code"><div class="cv-code-bar"><span>' + esc(b.lang || b.file || (b.diff ? 'Diff' : 'Code')) + '</span>' +
        '<button type="button" class="cv-copy" data-copy="' + esc(lines.filter(function (l) { return !b.diff || l[0] !== '-'; }).map(function (l) { return b.diff ? l.replace(/^[ +-] ?/, '') : l; }).join('\n')) + '">Copy</button></div>' +
        '<pre><code>' + body + '</code></pre></div>' + cap(b) + '</figure>';
    },

    /* ---------- numbers and time ----------
       Every chart is drawn here from data, never from code the page brings. Its title is the finding, and sits above the
       card like every other shape's. Labels sit on the marks (a gantt adds a small legend, since its marks can't carry
       one), bars start at zero, everything is grey but the one thing that matters, and nothing draws a gridline. The
       caption sits under the card, as under a figure. */

    stats: function (b) {
      var items = b.items || [];
      return '<div class="cv-block' + place(b, false) + '">' + title(b) + '<dl class="cv-stats" style="--n:' + Math.min(items.length, 4) + '">' + items.map(function (i) {
        return '<div class="cv-stat' + (i.key ? ' is-key' : '') + '"><dt>' + md(i.label) + '</dt><dd class="v">' + (typeof i.value === 'number' ? num(i.value, b) : esc(i.value)) + '</dd>' +
          (i.vs ? '<dd class="vs">' + md(i.vs) + '</dd>' : '') + (i.trend && i.trend.length > 1 ? spark(i.trend) : '') + '</div>';
      }).join('') + '</dl>' + cap(b) + '</div>';
    },

    chart: function (b) {
      var kind = b.kind || 'bar', body = kind === 'line' ? lineChart(b) : kind === 'share' ? shareChart(b) : kind === 'ring' ? ringChart(b) : kind === 'funnel' ? funnelChart(b) : barChart(b);
      return card(b, kind === 'line', body, ' aria-label="' + esc(plain(b.title)) + '"');
    },

    gantt: function (b) {
      var items = b.items || [];
      if (!items.length) return bad('A gantt needs items.');
      var t0 = Infinity, t1 = -Infinity;
      items.forEach(function (i) { t0 = Math.min(t0, day(i.start)); t1 = Math.max(t1, +day(i.end || i.start) + DAY); });
      var span = t1 - t0, at = function (t) { return ((t - t0) / span * 100).toFixed(3) + '%'; };
      // Ticks: Mondays when it's under ten weeks, the first of each month when it's longer.
      var today = b.today ? +day(b.today) : null, ticks = [], d = new Date(t0), weekly = span / DAY <= 70;
      for (; d < t1; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        if (today && Math.abs(d - today) < span * .06 || t1 - d < span * .06) continue; // Today's label takes that spot; the end has no room
        if (weekly ? d.getDay() === 1 : d.getDate() === 1) ticks.push('<span style="left:' + at(+d) + '">' + (weekly ? dfmt(d) : MON[d.getMonth()]) + '</span>');
      }
      var last = null, rows = '';
      items.forEach(function (i) {
        if (i.group && i.group !== last) { rows += '<div class="cv-g-group">' + md(i.group) + '</div>'; last = i.group; }
        var s = +day(i.start), e = i.end ? +day(i.end) + DAY : null, flip = (e || s) - t0 > span * .7;
        var when = !i.end || i.end === i.start ? dfmt(day(i.start)) : dfmt(day(i.start)) + ' – ' + (day(i.end).getMonth() === day(i.start).getMonth() ? day(i.end).getDate() : dfmt(day(i.end)));
        rows += '<div class="cv-g-row' + (i.key ? ' is-key' : '') + '"><div class="cv-g-label">' + md(i.label) + (i.note ? '<span class="note">' + md(i.note) + '</span>' : '') + '</div>' +
          '<div class="cv-g-track">' + (e
            ? '<span class="cv-g-bar" style="left:' + at(s) + ';width:' + ((e - s) / span * 100).toFixed(3) + '%"></span>'
            : '<span class="cv-g-dot" style="left:' + at(s) + '"></span>') +
          '<span class="cv-g-when' + (flip ? ' is-flip' : '') + '" data-s="' + at(s) + '" data-e="' + at(e || s) + '" data-flip="' + (flip ? 1 : 0) + '" style="' + (flip ? 'right:calc(100% - ' + at(s) + ')' : 'left:' + at(e || s)) + '">' + when + '</span></div></div>';
      });
      // The legend names only the marks this gantt uses. `legend` renames them, or `false` drops it.
      var lg = b.legend === false ? null : b.legend || {}, keyItem = items.filter(function (i) { return i.key; })[0], keys = [];
      if (lg) {
        var now = keyItem && today && today >= +day(keyItem.start) && today < +day(keyItem.end || keyItem.start) + DAY;
        if (keyItem) keys.push('<span><i class="bar is-key"></i>' + md(lg.key || (now ? 'Now' : 'The one that matters')) + '</span>');
        if (items.some(function (i) { return !i.key && i.end; })) keys.push('<span><i class="bar"></i>' + md(lg.bar || (keyItem ? 'Other dates' : 'Dates')) + '</span>');
        if (items.some(function (i) { return !i.end; })) keys.push('<span><i class="dot"></i>' + md(lg.dot || 'One day') + '</span>');
      }
      return card(b, true, (keys.length > 1 ? '<div class="cv-g-legend">' + keys.join('') + '</div>' : '') +
        '<div class="cv-gantt"><div class="cv-g-ticks">' + ticks.join('') + '</div>' + rows +
        (today && today >= t0 && today <= t1 ? '<div class="cv-g-today" style="--at:' + ((today - t0) / span).toFixed(4) + '"><span>Today</span></div>' : '') +
        '</div>');
    },

    calendar: function (b) {
      var evs = (b.events || []).map(function (e) { return { s: day(e.start), e: day(e.end || e.start), label: e.label, key: e.key }; });
      var months = b.months || (b.month ? [b.month] : null);
      if (!months) {
        var seen = {};
        months = [];
        evs.forEach(function (e) { for (var d = new Date(e.s.getFullYear(), e.s.getMonth(), 1); d <= e.e; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) { var k = d.getFullYear() + '-' + (d.getMonth() + 1); if (!seen[k]) { seen[k] = 1; months.push(k); } } });
        months.sort(function (a, c) { return day(a) - day(c); });
      }
      var today = b.today ? +day(b.today) : null;
      var month = function (m) {
        var first = day(m), y = first.getFullYear(), mo = first.getMonth(), last = new Date(y, mo + 1, 0), html = '';
        var start = new Date(y, mo, 1 - first.getDay());
        for (var w = start; w.getMonth() === mo || w < first; w = new Date(w.getFullYear(), w.getMonth(), w.getDate() + 7)) {
          var wEnd = new Date(w.getFullYear(), w.getMonth(), w.getDate() + 6), lanes = [], segs = [];
          // Each event that touches this week becomes one piece, in the first lane it fits. The days outside the month
          // have no band, so an event stops at the month's edge.
          var w0 = w < first ? first : w, w1 = wEnd > last ? last : wEnd;
          evs.forEach(function (e) {
            var a = e.s > w0 ? e.s : w0, z = e.e < w1 ? e.e : w1;
            if (a > z) return;
            var c0 = diff(w, a), c1 = diff(w, z), lane = 0;
            while (lanes[lane] != null && lanes[lane] >= c0) lane++;
            lanes[lane] = c1;
            segs.push('<span class="cv-c-ev' + (e.key ? ' is-key' : '') + (+a === +e.s ? ' is-start' : '') + (+z === +e.e ? ' is-end' : '') +
              '" style="grid-column:' + (c0 + 1) + ' / ' + (c1 + 2) + ';grid-row:' + (lane + 2) + '">' + (+a === +e.s || +a === +w0 ? md(e.label) : '') + '</span>');
          });
          var cells = '', L = lanes.length;
          for (var i = 0; i < 7; i++) {
            var d = new Date(w.getFullYear(), w.getMonth(), w.getDate() + i), inMonth = d.getMonth() === mo;
            var inPrev = i > 0 && new Date(w.getFullYear(), w.getMonth(), w.getDate() + i - 1).getMonth() === mo;
            var inNext = i < 6 && new Date(w.getFullYear(), w.getMonth(), w.getDate() + i + 1).getMonth() === mo;
            cells += '<span class="cv-c-day' + (inMonth ? (inPrev ? '' : ' is-first') + (inNext ? '' : ' is-last') : ' is-out') + (+d === today ? ' is-today' : '') + '" style="grid-column:' + (i + 1) + '">' + (inMonth ? '<b>' + d.getDate() + '</b>' : '') + '</span>';
          }
          html += '<div class="cv-c-week" style="grid-template-rows:calc(var(--cv-num) + 2 * var(--s1)) ' + (L ? 'repeat(' + L + ',calc(var(--cv-num) + var(--s0))) ' : '') + 'var(--s1)">' + cells + segs.join('') + '</div>';
        }
        return '<div class="cv-c-month"><div class="cv-c-name">' + MONTHS[mo] + ' ' + y + '</div><div class="cv-c-dow">' +
          ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' + html + '</div>';
      };
      return card(b, true, '<div class="cv-cal">' + months.map(month).join('') + '</div>');
    },

    matrix: function (b) {
      var x = b.x || {}, y = b.y || {}, q = b.quadrants || [];
      return card(b, true, '<div class="cv-matrix"><div class="cv-m-y">' + md(y.label || '') + '</div>' +
        '<div class="cv-m-plot"><div class="cv-m-tiles">' + [0, 1, 2, 3].map(function (k) { return '<span>' + (q[k] ? md(q[k]) : '') + '</span>'; }).join('') + '</div>' +
          '<span class="cv-m-end y-hi">' + md(y.high || '') + '</span><span class="cv-m-end y-lo">' + md(y.low || '') + '</span>' +
          (b.items || []).map(function (i) {
            return '<span class="cv-m-pt' + (i.key ? ' is-key' : '') + (i.x > 50 ? ' is-flip' : '') + '" style="left:' + i.x + '%;bottom:' + i.y + '%"><i></i><span>' + md(i.label) + '</span></span>';
          }).join('') + '</div>' +
        '<div class="cv-m-x"><span>' + md(x.low || '') + '</span><span class="name">' + md(x.label || '') + '</span><span class="hi">' + md(x.high || '') + '</span></div>' +
        '</div>');
    },

    // Heatmap: how much happened on each day, over weeks or months. Weeks run left to right, Monday on top. Four steps
    // of blue over the empty day; the legend says what a step means.
    heatmap: function (b) {
      var days = b.days || {}, keys = Object.keys(days).sort();
      if (!keys.length) return bad('A heatmap needs days.');
      var from = day(b.from || keys[0]), to = day(b.to || b.today || keys[keys.length - 1]), max = 0;
      keys.forEach(function (k) { max = Math.max(max, days[k]); });
      var steps = b.steps || [1, Math.max(2, Math.round(max * .25)), Math.max(3, Math.round(max * .5)), Math.max(4, Math.round(max * .75))];
      var level = function (v) { if (!v) return 0; for (var i = steps.length - 1; i >= 0; i--) if (v >= steps[i]) return i + 1; return 1; };
      var start = new Date(from.getFullYear(), from.getMonth(), from.getDate() - ((from.getDay() + 6) % 7));
      var cols = '', months = '', w = 0, lastMon = -1, total = 0, active = 0, iso = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
      for (var d = start; d <= to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7), w++) {
        var cells = '';
        for (var i = 0; i < 7; i++) {
          var c = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i), k = iso(c), v = days[k] || 0, out = c < from || c > to;
          if (!out) { total += v; if (v) active++; }
          cells += '<i class="' + (out ? 'is-out' : 'l' + level(v)) + (b.today && k === b.today ? ' is-today' : '') + '" title="' + (out ? '' : esc(dfmt(c) + ': ' + v + ' ' + (b.unit || ''))) + '"></i>';
        }
        // A month's name sits over the first week that starts in it (the first week gets the starting month).
        var mon = (w === 0 ? from : d).getMonth();
        if (mon !== lastMon && (w === 0 || d.getDate() <= 7)) { months += '<span style="grid-column:' + (w + 1) + '">' + MON[mon] + '</span>'; lastMon = mon; }
        cols += '<div class="cv-hm-week">' + cells + '</div>';
      }
      var legend = '<div class="cv-hm-legend"><span>' + esc(b.less || 'Less') + '</span>' + [0, 1, 2, 3, 4].map(function (l) { return '<i class="l' + l + '"></i>'; }).join('') + '<span>' + esc(b.more || 'More') + '</span></div>';
      // Few weeks get big squares; a year gets small ones and scrolls sideways on a phone.
      var cell = w <= 10 ? 24 : w <= 20 ? 20 : w <= 30 ? 16 : 12;  // on the 4px grid
      return card(b, true, '<div class="cv-hm" style="--weeks:' + w + ';--cell:' + cell + 'px"><div class="cv-hm-dow"><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span><span></span></div>' +
        '<div class="cv-hm-grid"><div class="cv-hm-months">' + months + '</div><div class="cv-hm-weeks">' + cols + '</div></div></div>' +
        '<div class="cv-hm-foot"><span>' + num(total, {}) + ' ' + esc(b.unit || '') + ' on ' + active + ' days</span>' + legend + '</div>');
    },

    // Treemap: the parts of a whole when there are too many for a share bar, 5 to 15, sized by area. A part with
    // children is split again inside. Laid out after render, to the card's real shape.
    treemap: function (b) {
      var data = (b.data || []).slice().sort(function (p, q) { return q.value - p.value; });
      if (!data.length) return bad('A treemap needs data.');
      return card(b, true, '<div class="cv-tm" data-tm="' + esc(JSON.stringify(data)) + '"></div>');
    }
  };

  /* ---------- chart helpers ---------- */
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAY = 864e5;
  function day(s) { var p = String(s).split('-'); return new Date(+p[0], +(p[1] || 1) - 1, +(p[2] || 1)); }
  function dfmt(d) { return MON[d.getMonth()] + ' ' + d.getDate(); }
  function diff(a, b) { return Math.round((b - a) / DAY); }
  function isDate(v) { return /^\d{4}-\d\d(-\d\d)?$/.test(String(v)); }
  function plain(s) { return String(s || '').replace(/\*|`|\[([^\]]+)\]\([^)]*\)/g, '$1'); }
  // Numbers are formatted here, not in the data: 12,450, 1.2M, one unit stated once by the block.
  function num(v, b) {
    var big = Math.abs(v) >= 1e5, dec = b.decimals != null ? b.decimals : v % 1 ? 1 : 0;
    var s = new Intl.NumberFormat('en-US', big ? { notation: 'compact', maximumFractionDigits: 1 } : { maximumFractionDigits: dec, minimumFractionDigits: dec }).format(v);
    return (b.prefix || '') + s + (b.unit || '');
  }
  // One editable row of a sheet: each cell an input that looks like text until it's touched.
  function sheetRow(cols, r, add) {
    r = Array.isArray(r) ? r : [];
    return '<tr>' + cols.map(function (c, j) {
      var v = r[j], lab = ' aria-label="' + esc(plain(c.label || '')) + '"';
      var cell = c.kind === 'check' ? '<input type="checkbox"' + (v ? ' checked' : '') + lab + '>'
        : c.kind === 'pick' ? '<select' + lab + '><option value=""></option>' + (c.options || []).map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>'
        : '<input type="' + (c.kind === 'number' ? 'number' : 'text') + '" value="' + esc(v == null ? '' : v) + '"' + (c.placeholder ? ' placeholder="' + esc(c.placeholder) + '"' : '') + lab + '>';
      return '<td class="k-' + (c.kind || 'text') + (c.kind === 'number' ? ' r' : '') + '">' + cell + '</td>';
    }).join('') + (add ? '<td class="x"><button type="button" class="cv-sheet-rm" aria-label="Remove row"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 4.5 7 7M11.5 4.5l-7 7"/></svg></button></td>' : '') + '</tr>';
  }
  // A small, honest highlighter: comments, strings, numbers and keywords, one line at a time. Anything it doesn't
  // know stays plain, which is the right failure for a page meant to be read, not edited.
  var KW = /^(const|let|var|function|return|if|else|for|while|import|export|from|default|class|new|async|await|true|false|null|undefined|def|self|None|True|False|in|of|type|interface)$/;
  function hl(line) {
    var out = '', re = /(\/\/.*$|#(?![0-9a-fA-F]{3,8}\b).*$|\/\*.*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)|(\b\d+(?:\.\d+)?(?:px|ms|s|%|em|rem)?\b)|([A-Za-z_$][\w$-]*)/g, last = 0, m;
    while ((m = re.exec(line))) {
      out += esc(line.slice(last, m.index));
      if (m[1]) out += '<span class="c">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="s">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="n">' + esc(m[3]) + '</span>';
      else out += KW.test(m[4]) ? '<span class="k">' + esc(m[4]) + '</span>' : esc(m[4]);
      last = re.lastIndex;
    }
    return out + esc(line.slice(last));
  }
  // A sparkline under a big number: the shape of the trend, no axis, a dot on today.
  function spark(pts) {
    var lo = Math.min.apply(null, pts), hi = Math.max.apply(null, pts), n = pts.length - 1;
    var P = pts.map(function (v, i) { return [(i / n * 100).toFixed(2), (26 - (v - lo) / ((hi - lo) || 1) * 22).toFixed(2)]; });
    return '<dd class="cv-spark"><svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d="M' + P.map(function (p) { return p.join(' '); }).join('L') + '"/></svg>' +
      '<i style="left:100%;top:' + (P[n][1] / 30 * 100).toFixed(1) + '%"></i></dd>';
  }
  function card(b, wide, body, attrs) {
    return '<figure class="cv-block' + place(b, wide) + '" style="margin-inline:0"' + (attrs || '') + '>' + title(b) + '<div class="cv-data">' + body + '</div>' + cap(b) + '</figure>';
  }
  // Charts, gantts, calendars and matrices start wide; a block's own `wide` wins.
  function place(b, wide) { return (b.wide != null ? b.wide : wide) ? ' cv-wide' : ''; }

  function barChart(b) {
    var data = (b.data || []).slice(), max = 0;
    if (b.order !== 'given') data.sort(function (p, q) { return q.value - p.value; });
    data.forEach(function (d) { max = Math.max(max, d.value); });
    if (b.reference) max = Math.max(max, b.reference.value);
    var f = function (v) { return (v / (max || 1)).toFixed(4); };
    return '<div class="cv-bars">' + data.map(function (d) {
      return '<div class="cv-bar-row' + (d.key || d.label === b.highlight ? ' is-key' : '') + '"><div class="l">' + md(d.label) + '</div>' +
        '<div class="cv-bar-track"><span class="cv-bar" style="--f:' + f(d.value) + '"></span><span class="v">' + num(d.value, b) + '</span></div></div>';
    }).join('') + (b.reference ? '<div class="cv-bar-ref" style="--f:' + f(b.reference.value) + '"><span>' + md(b.reference.label) + '</span></div>' : '') + '</div>';
  }

  function shareChart(b) {
    var data = b.data || [], total = 0;
    data.forEach(function (d) { total += d.value; });
    var pct = function (v) { return Math.round(v / (total || 1) * 100) + '%'; };
    return '<div class="cv-share"><div class="cv-share-bar">' + data.map(function (d) {
      return '<span class="' + (d.key || d.label === b.highlight ? 'is-key' : '') + '" style="flex:' + d.value + '"></span>';
    }).join('') + '</div><div class="cv-share-labels">' + data.map(function (d) {
      return '<span class="' + (d.key || d.label === b.highlight ? 'is-key' : '') + '" style="flex:' + d.value + '"><b>' + pct(d.value) + '</b>' + md(d.label) + ' <i>' + num(d.value, b) + '</i></span>';
    }).join('') + '</div></div>';
  }

  // A funnel: how many are left after each step, and what each step lost. Every bar starts at zero; the faint piece
  // after it is what the step lost from the one before, so the eye reads the drop, not just what's left. Never sorted.
  // `key` on a step makes its loss the blue thing: the step where people leave.
  function funnelChart(b) {
    var data = b.data || [], max = 0;
    data.forEach(function (d) { max = Math.max(max, d.value); });
    var f = function (v) { return (v / (max || 1)).toFixed(4); };
    return '<div class="cv-bars is-funnel">' + data.map(function (d, i) {
      var prev = i ? data[i - 1].value : null, lost = prev != null && prev > d.value ? prev - d.value : 0;
      var drop = prev ? Math.round((prev - d.value) / prev * 100) : null;
      return '<div class="cv-bar-row' + (d.key || d.label === b.highlight ? ' is-key' : '') + '"><div class="l">' + md(d.label) + '</div>' +
        '<div class="cv-bar-track"><span class="cv-bar" style="--f:' + f(d.value) + '"></span>' +
        (lost ? '<span class="cv-bar-lost" style="--f:' + f(lost) + '"></span>' : '') +
        '<span class="v">' + num(d.value, b) + (drop ? ' <i>' + (drop > 0 ? '−' : '+') + Math.abs(drop) + '%</i>' : '') + '</span></div></div>';
    }).join('') + '</div>';
  }

  // A ring: one value out of a whole, and nothing else. The arc is the share, the middle says it, the label sits beside.
  // The only round chart the canvas draws: a single percentage reads fine as a circle; two or more don't.
  function ringChart(b) {
    var of = b.of || 100, f = Math.max(0, Math.min(1, (b.value || 0) / of));
    var show = b.show != null ? esc(String(b.show)) : Math.round(f * 100) + '%';
    return '<div class="cv-ring"><div class="cv-ring-dial"><svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle class="t" cx="50" cy="50" r="44"/>' +
      (f > 0 ? '<circle class="v" cx="50" cy="50" r="44" pathLength="100" stroke-dasharray="' + (f * 100).toFixed(2) + ' 100" transform="rotate(-90 50 50)"/>' : '') +
      '</svg><b>' + show + '</b></div><div class="cv-ring-txt">' + md(b.label || '') + (b.note ? '<i>' + md(b.note) + '</i>' : '') + '</div></div>';
  }

  // A line chart: no axes. The first and last value sit on the line's ends, the name sits at its end, and `marks`
  // name the moments that explain a turn.
  function lineChart(b) {
    var series = b.series || (b.points ? [{ name: b.name || '', points: b.points, key: true }] : []);
    if (!series.length) return bad('A line chart needs series.');
    var xs = [], lo = Infinity, hi = -Infinity, dated = isDate(series[0].points[0][0]);
    var xv = function (x) { return dated ? +day(x) : typeof x === 'number' ? x : null; };
    var labels = series[0].points.map(function (p) { return p[0]; });
    series.forEach(function (s) { s.points.forEach(function (p, i) { var v = xv(p[0]); xs.push(v == null ? i : v); if (p[1] != null) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); } }); });
    if (b.zero) lo = Math.min(0, lo);
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), pad = (hi - lo) * .08 || 1;
    var X = function (x, i) { var v = xv(x); return ((v == null ? i : v) - x0) / ((x1 - x0) || 1) * 100; };
    var Y = function (v) { return 100 - (v - (b.zero ? lo : lo - pad)) / ((hi + pad) - (b.zero ? lo : lo - pad)) * 100; };
    var paths = '', ends = '';
    series.forEach(function (s) {
      var key = s.key || s.name === b.highlight, runs = [[]];
      s.points.forEach(function (p, i) {
        if (p[1] == null) { runs.push([]); return; } // a missing value is a gap, never a zero
        runs[runs.length - 1].push([X(p[0], i) * 10, Y(p[1]) * 10]);
      });
      paths += '<path class="' + (key ? 'is-key' : '') + '" d="' + runs.map(rounded).join('') + '"/>';
      var f = s.points[0], l = s.points[s.points.length - 1];
      ends += '<span class="cv-l-start' + (key ? ' is-key' : '') + '" style="top:' + Y(f[1]).toFixed(2) + '%">' + num(f[1], b) + '</span>' +
        '<span class="cv-l-end' + (key ? ' is-key' : '') + '" style="top:' + Y(l[1]).toFixed(2) + '%"><b>' + num(l[1], b) + '</b>' + (s.name ? ' ' + md(s.name) : '') + '</span>' +
        '<span class="cv-l-dot' + (key ? ' is-key' : '') + '" style="left:100%;top:' + Y(l[1]).toFixed(2) + '%"></span>';
    });
    var marks = (b.marks || []).map(function (m, i) {
      var left = X(m.at, labels.indexOf(m.at));
      return '<span class="cv-l-mark' + (left > 60 ? ' is-flip' : '') + '" style="left:' + left.toFixed(2) + '%;--row:' + (i % 2) + '"><span>' + md(m.label) + '</span></span>';
    }).join('');
    var lab = function (x) { return dated ? dfmt(day(x)) : esc(x); };
    return '<div class="cv-line"><div class="cv-l-plot"><svg viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">' + paths + '</svg>' + marks + ends + '</div>' +
      '<div class="cv-l-x"><span>' + lab(labels[0]) + '</span><span>' + lab(labels[labels.length - 1]) + '</span></div></div>';

  }

  // A line through points with each corner eased by a small curve, so a turn reads as one movement, not a kink.
  // The plot is drawn stretched (1000 by 1000, shown far wider than tall), so lengths are measured with y squashed
  // to roughly what it looks like on screen; the curve still passes through every point's neighbourhood, never past it.
  function rounded(pts) {
    var R = 10, SY = .35, f = function (v) { return v.toFixed(1); };
    var len = function (a, c) { return Math.hypot(c[0] - a[0], (c[1] - a[1]) * SY); };
    var toward = function (v, a, t) { return [v[0] + (a[0] - v[0]) * t, v[1] + (a[1] - v[1]) * t]; };
    if (!pts.length) return '';
    var d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    for (var i = 1; i < pts.length - 1; i++) {
      var a = pts[i - 1], v = pts[i], c = pts[i + 1], l1 = len(a, v), l2 = len(v, c), r = Math.min(R, l1 / 2, l2 / 2);
      if (!r) continue;
      var p1 = toward(v, a, r / l1), p2 = toward(v, c, r / l2);
      d += 'L' + f(p1[0]) + ' ' + f(p1[1]) + 'Q' + f(v[0]) + ' ' + f(v[1]) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
    }
    var z = pts[pts.length - 1];
    return d + 'L' + f(z[0]) + ' ' + f(z[1]);
  }

  // A block's own `wide` flag lifts it out of the text column; before/after and compare start wide.
  function render(blocks, ctx) {
    return (blocks || []).map(function (b, i) {
      var f = BLOCKS[b && b.type];
      if (!f) return bad('Unknown block: ' + (b && b.type));
      var html = f(b, ctx);
      // A top-level shape carries its place in the spec, so the layout check can name it the way the checker does.
      if (!ctx) html = html.replace(/class="cv-block/, 'data-b="' + (i + 1) + ' ' + esc(b.type) + '" class="cv-block');
      return b.wide && !/^beforeAfter|compare$/.test(b.type) ? html.replace(/class="cv-block/, 'class="cv-block cv-wide') : html;
    }).join('');
  }

  var ICON_SUN = '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var ICON_MOON = '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  // The reader hands every page the way back to the entry it belongs to (Oct 15), for a spec that names none.
  var back = spec.back || window.VAULT_BACK || { href: '/', label: 'Vault' };

  var main = document.createElement('main');
  main.className = 'frame cv';
  main.setAttribute('data-rail', '');
  main.innerHTML =
    '<a class="up" href="' + esc(back.href) + '">' + esc(back.label) + '</a>' +
    '<button type="button" class="sw" id="themeSw" aria-label="Switch day and night">' + ICON_SUN + ICON_MOON + '</button>' +
    // The head, the way benji.org does it: the title, one grey line under it (the date, then what kind of page), then
    // the dek as the opening paragraph. The author's name and read time stay in the data, not on the page.
    '<header>' +
      '<h1 class="cv-title">' + esc(spec.title) + '</h1>' +
      '<div class="cv-meta">' + spans((spec.meta || []).filter(function (m) { return /\d/.test(m) && !/min read/.test(m); }).concat(spec.kicker ? [].concat(spec.kicker) : [])) + '</div>' +
      (spec.dek ? '<p class="cv-dek">' + md(spec.dek) + '</p>' : '') +
    '</header>' +
    render(spec.blocks) +
    (spec.foot ? '<footer class="cv-foot">' + md(spec.foot) + '</footer>' : '');
  src.parentNode.insertBefore(main, src);
  if (spec.title && !document.title) document.title = spec.title;

  // Mount the live pieces. A script in a template has never run, so its copy runs once, in order, as it lands in the
  // page: inside one, `document.currentScript.closest('.cv-live')` is the piece's own block, so two pieces never collide.
  [].forEach.call(main.querySelectorAll('.cv-live-mount'), function (box) {
    var t = document.getElementById(box.getAttribute('data-template'));
    if (!t || !t.content) { box.innerHTML = bad('No <template id="' + box.getAttribute('data-template') + '"> in the page.'); return; }
    box.appendChild(t.content.cloneNode(true));
  });
  // A framed page is the vault's own, so it can be measured: the frame takes the page's height, and day or night
  // switched out here reaches it too.
  [].forEach.call(main.querySelectorAll('.cv-live-frame'), function (f) {
    var fixed = !!f.style.height;
    function sync() {
      var d; try { d = f.contentDocument; } catch (e) { return; }
      if (!d || !d.documentElement) return;
      d.documentElement.dataset.mode = document.documentElement.dataset.mode;
      if (!fixed) f.style.height = d.documentElement.scrollHeight + 'px';
    }
    f.addEventListener('load', function () {
      sync();
      try { if (!fixed && window.ResizeObserver) new ResizeObserver(sync).observe(f.contentDocument.documentElement); } catch (e) {}
    });
    new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
  });

  // Sheet: read the rows back off the table, save them, keep the totals right; saved rows replace the spec's.
  [].forEach.call(main.querySelectorAll('.cv-sheet'), function (fig) {
    var id = fig.getAttribute('data-sheet'), cols = JSON.parse(fig.getAttribute('data-cols')), add = fig.getAttribute('data-add') === '1';
    var body = fig.querySelector('tbody'), status = fig.querySelector('.cv-ask-status'), store = window.vault && window.vault.state, waiting = false, t = 0;
    function rows() {
      return [].map.call(body.rows, function (tr) {
        return cols.map(function (c, j) {
          var el = tr.cells[j].querySelector('input, select');
          return c.kind === 'check' ? el.checked : c.kind === 'number' ? (el.value === '' ? null : +el.value) : el.value;
        });
      });
    }
    function totals() {
      [].forEach.call(fig.querySelectorAll('[data-sum]'), function (td) {
        var j = td.getAttribute('data-sum'); if (j === '') return;
        var n = rows().reduce(function (a, r) { return a + (+r[j] || 0); }, 0);
        td.textContent = num(n, cols[j]);
      });
    }
    function save(now) {
      totals(); clearTimeout(t);
      if (!store) return;
      t = setTimeout(function () { waiting = true; status.textContent = ''; store.set(id, rows()); }, now ? 0 : 400);
    }
    addEventListener('vault:saved', function (e) { if (!waiting) return; waiting = false; status.textContent = e.detail.ok ? 'Saved' : 'This browser only'; });
    fig.addEventListener('input', function (e) { if (e.target.matches('input[type="text"], input[type="number"]')) save(false); });
    fig.addEventListener('change', function (e) { if (e.target.matches('input[type="checkbox"], select')) save(true); });
    fig.addEventListener('click', function (e) {
      if (e.target.closest('.cv-sheet-add')) { body.insertAdjacentHTML('beforeend', sheetRow(cols, [], add)); body.rows[body.rows.length - 1].querySelector('input, select').focus(); save(true); }
      var rm = e.target.closest('.cv-sheet-rm'); if (rm) { rm.closest('tr').remove(); save(true); }
    });
    totals();
    if (store) store.get(id).then(function (saved) {
      if (!Array.isArray(saved) || fig.contains(document.activeElement)) return;
      body.innerHTML = saved.map(function (r) { return sheetRow(cols, r, add); }).join(''); totals();
    });
  });

  // One lightbox per page, opened on a picture; arrows, arrow keys and Escape. It lives in the page's frame so
  // a picture with a day version follows the theme, and it sits in the top layer so nothing covers it.
  var lb = null;
  function lightbox() {
    if (lb) return lb;
    lb = document.createElement('dialog');
    lb.className = 'cv-lb';
    lb.innerHTML = '<div class="cv-lb-pic"></div><div class="cv-lb-cap"><b></b><span></span></div>' +
      '<div class="cv-lb-bar"><div class="cv-car-ctl"><button type="button" data-go="-1" aria-label="Previous"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3.5 5.5 8l4.5 4.5"/></svg></button>' +
      '<span class="n" aria-live="polite"></span><button type="button" data-go="1" aria-label="Next"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5"/></svg></button></div>' +
      '<button type="button" class="cv-lb-x" aria-label="Close"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 4.5 7 7M11.5 4.5l-7 7"/></svg></button></div>';
    main.appendChild(lb);
    lb.addEventListener('click', function (e) {
      if (e.target === lb || e.target.closest('.cv-lb-x')) return lb.close();
      var g = e.target.closest('[data-go]'); if (g) lb.show_(+g.getAttribute('data-go'));
    });
    lb.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); lb.show_(e.key === 'ArrowRight' ? 1 : -1); } });
    return lb;
  }
  // Any picture opens large. A gallery's pictures, a
  // figure, a carousel's slides and picture variants walk as one set within their shape. The large one is always the
  // whole picture, uncropped, day or night to match the page.
  var OPENS = '.cv-gal-item, [data-large]';
  var labelOf = function (el) {
    if (el.hasAttribute('data-label')) return [el.getAttribute('data-label'), el.getAttribute('data-note')];
    var box = el.parentElement, fig = el.closest('.cv-block');
    var t = function (q, root) { var n = (root || box).querySelector(q); return n ? n.textContent.trim() : ''; };
    if (el.classList.contains('cv-fig')) return [t('.cv-s-title', fig), t('.cv-cap', fig)];
    var lab = box.querySelector('.cv-var-label, .cv-car-label');
    var name = lab ? [].filter.call(lab.childNodes, function (n) { return !(n.classList && n.classList.contains('pick')); }).map(function (n) { return n.textContent; }).join('').trim() : '';
    return [name, t('.cv-var-note, .cv-car-note')];
  };
  [].forEach.call(main.querySelectorAll('[data-large]'), function (el) {
    el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button');
    el.setAttribute('aria-label', (labelOf(el)[0] || 'Picture') + ', open large');
  });
  function openLarge(el) {
    var items = [].slice.call(el.closest('.cv-block').querySelectorAll(OPENS)), cur = items.indexOf(el);
    var box = lightbox();
    box.show_ = function (d) {
      cur = Math.max(0, Math.min(items.length - 1, cur + d));
      var src = items[cur], at = box.querySelector('.cv-lb-pic'), lab = labelOf(src);
      at.innerHTML = '';
      [].forEach.call(src.querySelectorAll('img, video'), function (m) {
        var c = m.cloneNode(true); c.removeAttribute('loading'); c.removeAttribute('style'); at.appendChild(c);
      });
      box.querySelector('.cv-lb-cap b').textContent = lab[0];
      box.querySelector('.cv-lb-cap span').textContent = lab[1];
      box.querySelector('.cv-lb-bar .cv-car-ctl').hidden = items.length < 2;
      box.querySelector('.n').textContent = (cur + 1) + ' of ' + items.length;
      box.querySelector('[data-go="-1"]').disabled = cur === 0;
      box.querySelector('[data-go="1"]').disabled = cur === items.length - 1;
    };
    box.show_(0);
    box.addEventListener('close', function back() { box.removeEventListener('close', back); items[cur].focus({ preventScroll: true }); });
    box.showModal();
  }
  main.addEventListener('click', function (e) {
    var el = e.target.closest(OPENS);
    if (el && main.contains(el) && !e.target.closest('.cv-lb')) openLarge(el);
  });
  main.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-large]')) { e.preventDefault(); openLarge(e.target); }
  });

  // Map: Web Mercator tiles laid out around a centre, the pins on top, refit on resize; drag pans, − and + zoom.
  [].forEach.call(main.querySelectorAll('.cv-map'), function (fig) {
    var pts = JSON.parse(fig.getAttribute('data-places')), box = fig.querySelector('.cv-map-box'), tiles = fig.querySelector('.cv-map-tiles'), pins = fig.querySelector('.cv-map-pins');
    var T = 256, z = 3, cx = 0, cy = 0, kept = {};
    function px(lat, lng, zz) {
      var s = T * Math.pow(2, zz), r = Math.sin(lat * Math.PI / 180);
      return [(lng + 180) / 360 * s, (.5 - Math.log((1 + r) / (1 - r)) / (4 * Math.PI)) * s];
    }
    function fit() {
      var W = box.clientWidth, H = box.clientHeight, pad = 56;
      for (z = Math.min(16, +fig.getAttribute('data-zoom') || 16); z > 1; z--) {
        var xs = pts.map(function (p) { return px(p[0], p[1], z)[0]; }), ys = pts.map(function (p) { return px(p[0], p[1], z)[1]; });
        if (Math.max.apply(0, xs) - Math.min.apply(0, xs) <= W - 2 * pad && Math.max.apply(0, ys) - Math.min.apply(0, ys) <= H - 2 * pad) break;
      }
      var a = pts.map(function (p) { return px(p[0], p[1], z); });
      cx = (Math.min.apply(0, a.map(function (q) { return q[0]; })) + Math.max.apply(0, a.map(function (q) { return q[0]; }))) / 2;
      cy = (Math.min.apply(0, a.map(function (q) { return q[1]; })) + Math.max.apply(0, a.map(function (q) { return q[1]; }))) / 2;
      draw();
    }
    function draw() {
      var W = box.clientWidth, H = box.clientHeight, n = Math.pow(2, z), tone = document.documentElement.dataset.mode === 'light' ? 'Light' : 'Dark', want = {};
      var x0 = Math.floor((cx - W / 2) / T), x1 = Math.floor((cx + W / 2) / T), y0 = Math.max(0, Math.floor((cy - H / 2) / T)), y1 = Math.min(n - 1, Math.floor((cy + H / 2) / T));
      for (var x = x0; x <= x1; x++) for (var y = y0; y <= y1; y++) {
        // the grey ground only: no place names under the pins, the list under the map names every place
        ['Base'].forEach(function (layer) {
          var tx = ((x % n) + n) % n, key = tone + layer + '/' + z + '/' + tx + '/' + y, img = kept[key];
          if (!img) {
            img = document.createElement('img'); img.alt = ''; img.draggable = false;
            img.src = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_' + tone + '_Gray_' + layer + '/MapServer/tile/' + z + '/' + y + '/' + tx;
            kept[key] = img;
          }
          img.style.transform = 'translate(' + Math.round(x * T - cx + W / 2) + 'px,' + Math.round(y * T - cy + H / 2) + 'px)';
          want[key] = 1;
          if (img.parentNode !== tiles) tiles.appendChild(img);
        });
      }
      Object.keys(kept).forEach(function (k) { if (!want[k] && kept[k].parentNode) tiles.removeChild(kept[k]); if (!want[k] && k.split('/')[1] != z) delete kept[k]; });
      // pins closer than one pin apart are eased apart until they just touch, so every number stays readable
      var at = pts.map(function (p) { var q = px(p[0], p[1], z); return [q[0] - cx + W / 2, q[1] - cy + H / 2]; }), gap = 24;
      for (var k = 0; k < 6; k++) for (var a = 0; a < at.length; a++) for (var c = a + 1; c < at.length; c++) {
        var dx = at[c][0] - at[a][0], dy = at[c][1] - at[a][1], d = Math.hypot(dx, dy);
        if (d >= gap) continue;
        if (d < .01) { dx = 1; dy = 0; d = 1; }
        var push = (gap - d) / 2 / d;
        at[a][0] -= dx * push; at[a][1] -= dy * push; at[c][0] += dx * push; at[c][1] += dy * push;
      }
      pins.innerHTML = pts.map(function (p, i) {
        return '<span class="cv-map-pin' + (p[2] ? ' is-key' : '') + '" data-n="' + i + '" style="transform:translate(' + Math.round(at[i][0]) + 'px,' + Math.round(at[i][1]) + 'px)">' + (i + 1) + '</span>';
      }).join('');
    }
    function zoom(d) { var k = Math.pow(2, d); if (z + d < 1 || z + d > 18) return; z += d; cx *= k; cy *= k; draw(); }
    // The tiles come in two greys with a warm cast. A filter takes each pixel's lightness and lays the tile's water and
    // land onto the vault's own tokens (night: water on --surface, land on --raised; day: water on --fill, land on
    // --surface), read live, so the map is a card of the system's greys in both themes. Lines fall where they land.
    var fid = 'cv-map-tone-' + (++uid), svgNS = 'http://www.w3.org/2000/svg';
    var tone = document.createElementNS(svgNS, 'svg'); tone.setAttribute('width', '0'); tone.setAttribute('height', '0'); tone.style.position = 'absolute';
    fig.appendChild(tone);
    var probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    function rgb(token) {
      var el = document.createElement('i'); el.style.color = 'var(' + token + ')'; fig.appendChild(el);
      var c = getComputedStyle(el).color; el.remove();
      probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#000'; probe.fillStyle = c; probe.fillRect(0, 0, 1, 1);
      var d = probe.getImageData(0, 0, 1, 1).data; return [d[0] / 255, d[1] / 255, d[2] / 255];
    }
    function retone() {
      var day = document.documentElement.dataset.mode === 'light';
      // the source's lightness for water and for land, measured off the tiles (night .138 and .248, day .815 and .937)
      var lw = day ? .815 : .138, ll = day ? .937 : .248;
      var water = rgb(day ? '--fill' : '--surface'), land = rgb(day ? '--surface' : '--raised');
      var table = function (ch) {
        var out = [];
        for (var t = 0; t <= 32; t++) out.push(Math.max(0, Math.min(1, water[ch] + (t / 32 - lw) * (land[ch] - water[ch]) / (ll - lw))).toFixed(4));
        return out.join(' ');
      };
      tone.innerHTML = '<filter id="' + fid + '" color-interpolation-filters="sRGB">' +
        '<feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0"/>' +
        '<feComponentTransfer><feFuncR type="table" tableValues="' + table(0) + '"/><feFuncG type="table" tableValues="' + table(1) + '"/><feFuncB type="table" tableValues="' + table(2) + '"/></feComponentTransfer></filter>';
      tiles.style.filter = 'url(#' + fid + ')';
    }
    retone();
    fig.querySelector('.cv-zoom').addEventListener('click', function (e) {
      var b = e.target.closest('[data-z]'); if (!b) return;
      var w = b.getAttribute('data-z'); if (w === 'fit') fit(); else zoom(w === 'in' ? 1 : -1);
    });
    var drag = null;
    box.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY, cx: cx, cy: cy }; box.setPointerCapture(e.pointerId); box.classList.add('is-drag'); });
    box.addEventListener('pointermove', function (e) { if (!drag) return; cx = drag.cx - (e.clientX - drag.x); cy = drag.cy - (e.clientY - drag.y); draw(); });
    ['pointerup', 'pointercancel'].forEach(function (t) { box.addEventListener(t, function () { drag = null; box.classList.remove('is-drag'); }); });
    box.addEventListener('dblclick', function () { zoom(1); });
    // a place in the list and its pin light up together
    function hot(n, on) { [].forEach.call(fig.querySelectorAll('[data-n="' + n + '"]'), function (el) { el.classList.toggle('is-hot', on); }); }
    ['pointerover', 'focusin'].forEach(function (t) { fig.addEventListener(t, function (e) { var el = e.target.closest('[data-n]'); if (el) hot(el.getAttribute('data-n'), true); }); });
    ['pointerout', 'focusout'].forEach(function (t) { fig.addEventListener(t, function (e) { var el = e.target.closest('[data-n]'); if (el) hot(el.getAttribute('data-n'), false); }); });
    new MutationObserver(function () { retone(); draw(); setTimeout(retone, 500); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
    if (window.ResizeObserver) new ResizeObserver(function () { draw(); }).observe(box);
    fit();
  });

  // Carousel: the count follows the scroll; the arrows step one picture and stop at the ends; arrow keys work on the track.
  [].forEach.call(main.querySelectorAll('.cv-car'), function (fig) {
    var track = fig.querySelector('.cv-car-track'), slides = [].slice.call(track.children), n = fig.querySelector('.cv-car-ctl .n');
    var prev = fig.querySelector('[data-go="-1"]'), next = fig.querySelector('[data-go="1"]'), cur = 0, raf = 0;
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function left(i) { return slides[i].offsetLeft - slides[0].offsetLeft; }
    function atEnd() { return track.scrollLeft + track.clientWidth >= track.scrollWidth - 2; }
    // The count names what's in view: "2 of 5" for one picture, "3–5 of 5" when tall ones sit three to a view.
    function sync() {
      raf = 0;
      var x = track.scrollLeft, last = 0;
      cur = 0;
      slides.forEach(function (sl, i) {
        if (Math.abs(left(i) - x) < Math.abs(left(cur) - x)) cur = i;
        if (left(i) + sl.offsetWidth <= x + track.clientWidth + 2) last = i;
      });
      last = Math.max(cur, last);
      n.textContent = (last > cur ? (cur + 1) + '–' + (last + 1) : cur + 1) + ' of ' + slides.length;
      prev.disabled = x <= 2; next.disabled = atEnd();
    }
    function go(d) {
      var i = Math.max(0, Math.min(slides.length - 1, cur + d));
      track.scrollTo({ left: Math.min(left(i), track.scrollWidth - track.clientWidth), behavior: calm ? 'auto' : 'smooth' });
    }
    track.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(sync); }, { passive: true });
    fig.querySelector('.cv-car-ctl').addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) go(+b.getAttribute('data-go')); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); go(e.key === 'ArrowRight' ? 1 : -1); }
    });
    addEventListener('resize', function () { if (!raf) raf = requestAnimationFrame(sync); });
    sync();
  });

  // Ask: put back what was answered, and save each answer as it changes. vault.state keeps it in the vault; a page
  // opened from disk keeps it in this browser.
  [].forEach.call(main.querySelectorAll('.cv-ask'), function (fig) {
    var id = fig.getAttribute('data-ask'), status = fig.querySelector('.cv-ask-status'), answers = {}, store = window.vault && window.vault.state;
    function show(q, v) {
      var kind = q.getAttribute('data-kind');
      if (kind === 'pick' || kind === 'many') [].forEach.call(q.querySelectorAll('.cv-opt'), function (o) {
        var on = kind === 'many' ? [].concat(v || []).indexOf(o.getAttribute('data-v')) > -1 : v === o.getAttribute('data-v');
        o.setAttribute('aria-pressed', String(on));
      });
      else if (kind === 'scale') { var r = q.querySelector('input'); if (v != null) r.value = v; var o = q.querySelector('output'); o.textContent = r.value + (o.getAttribute('data-unit') ? ' ' + o.getAttribute('data-unit') : ''); }
      else if (v != null) q.querySelector('textarea').value = v;
    }
    // A cleared answer leaves the file. "Saved" only once the vault has it; off the vault it says where it went.
    function save(q, v) {
      var k = q.getAttribute('data-q');
      if (v == null || (Array.isArray(v) && !v.length)) delete answers[k]; else answers[k] = v;
      show(q, v);
      if (store) { waiting = true; status.textContent = ''; store.set(id, Object.keys(answers).length ? answers : null); }
    }
    var waiting = false;
    addEventListener('vault:saved', function (e) { if (!waiting) return; waiting = false; status.textContent = e.detail.ok ? 'Saved' : 'This browser only'; });
    [].forEach.call(fig.querySelectorAll('.cv-q'), function (q) {
      var kind = q.getAttribute('data-kind'), key = q.getAttribute('data-q');
      show(q);
      if (kind === 'pick' || kind === 'many') q.addEventListener('click', function (e) {
        var o = e.target.closest('.cv-opt'); if (!o) return;
        var v = o.getAttribute('data-v'), cur = answers[key];
        if (kind === 'many') { cur = [].concat(cur || []); var at = cur.indexOf(v); if (at > -1) cur.splice(at, 1); else cur.push(v); save(q, cur); }
        else save(q, cur === v ? null : v);
      });
      else if (kind === 'scale') q.querySelector('input').addEventListener('input', function (e) { save(q, +e.target.value); });
      else { var t; q.querySelector('textarea').addEventListener('input', function (e) { clearTimeout(t); var v = e.target.value; t = setTimeout(function () { save(q, v); }, 400); }); }
    });
    if (store) store.get(id).then(function (s) {
      // a tap made before the saved answers arrived wins over them
      answers = Object.assign({}, s || {}, answers);
      [].forEach.call(fig.querySelectorAll('.cv-q'), function (q) { if (answers[q.getAttribute('data-q')] != null) show(q, answers[q.getAttribute('data-q')]); });
    });
  });

  // A pin and its note light up together, from either end. Reading a note also zooms the picture in on its pin.
  function wirePins(fig, cur, sliding) {
    var hot = function (n, on, zoom) {
      var k = cur(), slide = sliding();
      [].forEach.call(fig.querySelectorAll('.cv-side.' + k + ' .cv-pin[data-n="' + n + '"], .cv-notes ol[data-side="' + k + '"] .cv-note[data-n="' + n + '"]'),
        function (el) { el.classList.toggle('is-hot', on); });
      var side = fig.querySelector('.cv-side.' + k), pin = side && side.querySelector('.cv-pin[data-n="' + n + '"]');
      if (!zoom || !pin || !side.querySelector('.cv-lens')) return;
      if (on && !slide) { side.style.setProperty('--fx', pin.style.getPropertyValue('--px')); side.style.setProperty('--fy', pin.style.getPropertyValue('--py')); }
      side.classList.toggle('is-focus', on && !slide);
    };
    ['pointerover', 'focusin'].forEach(function (t) {
      fig.addEventListener(t, function (e) { var el = e.target.closest('.cv-pin, .cv-note'); if (el) hot(el.getAttribute('data-n'), true, el.classList.contains('cv-note')); });
    });
    ['pointerout', 'focusout'].forEach(function (t) {
      fig.addEventListener(t, function (e) { var el = e.target.closest('.cv-pin, .cv-note'); if (el) hot(el.getAttribute('data-n'), false, el.classList.contains('cv-note')); });
    });
  }
  [].forEach.call(main.querySelectorAll('.cv-ana'), function (fig) {
    wirePins(fig, function () { return 'one'; }, function () { return false; });
  });

  // Motion: people who ask for less of it get a still frame and the controls to play it themselves.
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)
    [].forEach.call(main.querySelectorAll('video'), function (v) { v.removeAttribute('autoplay'); v.pause(); v.controls = true; });

  /* ---------- flow: rank the nodes into columns, then draw the arrows between the boxes ----------
     A node's column is its longest path from a start, so the main path reads left to right and a branch sits under
     it. Order in the spec decides the row: list the main path first. Narrow, the same ranks stack top to bottom. */
  [].forEach.call(main.querySelectorAll('.cv-flow'), function (box) {
    var g = JSON.parse(box.getAttribute('data-flow')), rank = {}, slot = {}, rows = {}, out = {}, into = {};
    g.nodes.forEach(function (id) { out[id] = []; into[id] = 0; });
    // Arrows that point back to an earlier node (a retry) don't count toward rank, so a loop can't push things right forever.
    var seen = {}, onPath = {}, back = {};
    function walk(id) {
      seen[id] = onPath[id] = 1;
      g.edges.forEach(function (e, i) { if (e[0] !== id) return; if (onPath[e[1]]) back[i] = 1; else if (!seen[e[1]]) walk(e[1]); });
      onPath[id] = 0;
    }
    g.edges.forEach(function (e) { into[e[1]]++; });
    // The walk starts at the first node, the start of the main path, even when something loops back into it.
    if (g.nodes.length) walk(g.nodes[0]);
    g.nodes.forEach(function (id) { if (!into[id] && !seen[id]) walk(id); });
    g.nodes.forEach(function (id) { if (!seen[id]) walk(id); });
    g.edges.forEach(function (e, i) { if (!back[i]) out[e[0]].push(e[1]); });
    var r = function (id, d) { if ((rank[id] || 0) >= d && rank[id] != null) return; rank[id] = d; out[id].forEach(function (t) { r(t, d + 1); }); };
    if (g.nodes.length) r(g.nodes[0], 0);
    g.nodes.forEach(function (id) { var fwdIn = g.edges.some(function (e, i) { return e[1] === id && !back[i]; }); if (!fwdIn && rank[id] == null) r(id, 0); });
    // A node nothing leads to (a timer, a second way in) sits one column before what it leads to, not at the start.
    g.nodes.slice(1).forEach(function (id) {
      var fwdIn = g.edges.some(function (e, i) { return e[1] === id && !back[i]; });
      if (fwdIn || !out[id].length) return;
      rank[id] = Math.max(0, Math.min.apply(null, out[id].map(function (t) { return rank[t] || 0; })) - 1);
    });
    // A node's `row` pins it to a row; the rest take the next free row in their column, in the order they're listed.
    g.nodes.forEach(function (id, i) { var k = rank[id] || 0; slot[id] = g.rows[i] || (rows[k] || 0) + 1; rows[k] = Math.max(rows[k] || 0, slot[id]); });
    // An arrow that skips columns runs straight along its row, so a box in its way moves to the next free row in its
    // column (unless the spec pinned it there). Otherwise the arrow would run through the box.
    for (var moved = true, guard = 0; moved && guard++ < 20;) {
      moved = false;
      g.edges.forEach(function (e, i) {
        var a = rank[e[0]] || 0, z = rank[e[1]] || 0;
        if (back[i] || z - a < 2 || slot[e[0]] !== slot[e[1]]) return;
        g.nodes.forEach(function (id, j) {
          var k = rank[id] || 0;
          if (k <= a || k >= z || slot[id] !== slot[e[0]] || g.rows[j]) return;
          slot[id] = rows[k] = rows[k] + 1; moved = true;
        });
      });
    }
    // The list a phone falls back to: the nodes in an order that keeps each branch together (a node that joins
    // branches waits until the branches are done), and a lane for every arrow that isn't between neighbours.
    var fin = {}, left = {}, order = [], ready;
    g.nodes.forEach(function (id) { fin[id] = 0; });
    g.edges.forEach(function (e, i) { if (!back[i]) fin[e[1]]++; });
    g.nodes.forEach(function (id) { left[id] = fin[id]; });
    ready = g.nodes.filter(function (id) { return !fin[id]; }).reverse();
    while (ready.length) {
      var pick = ready.length - 1;
      if (fin[ready[pick]] > 1) for (var j = ready.length - 2; j >= 0; j--) if (fin[ready[j]] <= 1) { pick = j; break; }
      var cur = ready.splice(pick, 1)[0], nx = out[cur].filter(function (t) { return --left[t] === 0; });
      order.push(cur);
      for (var j2 = nx.length - 1; j2 >= 0; j2--) ready.push(nx[j2]);
    }
    g.nodes.forEach(function (id) { if (order.indexOf(id) < 0) order.push(id); });
    var at = {}, laneOf = {}, taken = [], lanes = 0;
    order.forEach(function (id, k) { at[id] = k; });
    g.edges.map(function (e, i) { return { i: i, lo: Math.min(at[e[0]], at[e[1]]), hi: Math.max(at[e[0]], at[e[1]]), self: e[0] === e[1] }; })
      .filter(function (x) { return !x.self && !(at[g.edges[x.i][1]] === at[g.edges[x.i][0]] + 1); })
      .sort(function (p, q) { return (p.hi - p.lo) - (q.hi - q.lo) || p.lo - q.lo; })
      .forEach(function (x) {
        // Shorter arrows take the inner lanes. Two arrows share a lane only if their spans don't touch.
        var L = 0;
        while ((taken[L] || []).some(function (y) { return x.lo <= y.hi && y.lo <= x.hi; })) L++;
        (taken[L] = taken[L] || []).push(x); laneOf[x.i] = L; lanes = Math.max(lanes, L + 1);
      });
    var LANE = 16, hasSelfLoop = g.edges.some(function (e) { return e[0] === e[1]; });

    var nodes = {};
    [].forEach.call(box.querySelectorAll('.cv-f-node'), function (el) { nodes[el.getAttribute('data-id')] = el; });
    var svg = box.querySelector('.cv-f-wires'), labels = box.querySelectorAll('.cv-f-label');
    var ranks = Math.max.apply(null, g.nodes.map(function (id) { return rank[id] || 0; })) + 1;

    function layout() {
      box.classList.remove('is-down', 'is-list');
      box.style.paddingRight = '';
      var place = function (down) {
        box.style.gridTemplateColumns = down ? 'repeat(' + Math.max.apply(null, Object.keys(rows).map(function (k) { return rows[k]; })) + ', minmax(0, 1fr))' : 'repeat(' + ranks + ', max-content)';
        g.nodes.forEach(function (id) {
          var el = nodes[id];
          el.style.gridColumn = String(down ? slot[id] : (rank[id] || 0) + 1);
          el.style.gridRow = String(down ? (rank[id] || 0) + 1 : slot[id]);
        });
      };
      place(false);
      // Too wide for the card: stack the ranks top to bottom instead.
      if (box.scrollWidth > box.clientWidth + 1) { box.classList.add('is-down'); place(true); }
      // Stacked, branches side by side still too narrow to read (three across a phone): one node a row instead.
      var cols = getComputedStyle(box).gridTemplateColumns.split(' ');
      if (box.classList.contains('is-down') && cols.length > 1 && parseFloat(cols[0]) < 128) {
        box.classList.add('is-list');
        box.style.gridTemplateColumns = '';
        if (lanes || hasSelfLoop) box.style.paddingRight = (24 + Math.max(lanes, 1) * LANE) + 'px';
        g.nodes.forEach(function (id) { nodes[id].style.gridColumn = '1'; nodes[id].style.gridRow = String(at[id] + 1); });
      }
      draw();
    }
    // Connectors are drawn the way a modern canvas draws them: straight runs joined by rounded elbows, an open
    // chevron at the end, and loops that run in a lane of their own, clear of every box. Never a long flat curve.
    function elbow(pts) {
      var R = 8, d = 'M' + pts[0][0] + ' ' + pts[0][1];  // the elbow's radius: --r-sm
      for (var i = 1; i < pts.length - 1; i++) {
        var p = pts[i - 1], v = pts[i], n = pts[i + 1];
        var l1 = Math.hypot(v[0] - p[0], v[1] - p[1]), l2 = Math.hypot(n[0] - v[0], n[1] - v[1]), r = Math.min(R, l1 / 2, l2 / 2);
        if (r < .5) { d += 'L' + v[0] + ' ' + v[1]; continue; }
        var a1 = [v[0] - (v[0] - p[0]) / l1 * r, v[1] - (v[1] - p[1]) / l1 * r], a2 = [v[0] + (n[0] - v[0]) / l2 * r, v[1] + (n[1] - v[1]) / l2 * r];
        d += 'L' + a1[0].toFixed(1) + ' ' + a1[1].toFixed(1) + 'Q' + v[0].toFixed(1) + ' ' + v[1].toFixed(1) + ' ' + a2[0].toFixed(1) + ' ' + a2[1].toFixed(1);
      }
      var z = pts[pts.length - 1];
      return d + 'L' + z[0].toFixed(1) + ' ' + z[1].toFixed(1);
    }
    // The list: neighbours joined straight down the left, every other arrow out of the right side into its lane and
    // back in. Each box's right side has a port per lane arrow, spread down it: arrows to boxes above on top, inner
    // lanes first, so no two lines cross at a box.
    function drawList() {
      var o = box.getBoundingClientRect(), paths = '', GAP = 4, R = {}, ports = {};
      g.nodes.forEach(function (id) { var q = nodes[id].getBoundingClientRect(); R[id] = { l: q.left - o.left, t: q.top - o.top, r: q.right - o.left, b: q.bottom - o.top, cy: (q.top + q.bottom) / 2 - o.top }; ports[id] = []; });
      g.edges.forEach(function (e, i) {
        if (e[0] === e[1]) { ports[e[0]].push({ i: i, end: 'from', rank: -2 }, { i: i, end: 'to', rank: -1 }); return; }
        if (laneOf[i] == null) return;
        ports[e[0]].push({ i: i, end: 'from', up: at[e[1]] < at[e[0]], lane: laneOf[i] });
        ports[e[1]].push({ i: i, end: 'to', up: at[e[0]] < at[e[1]], lane: laneOf[i] });
      });
      var portY = {};
      g.nodes.forEach(function (id) {
        var list = ports[id].sort(function (p, q) {
          var kp = p.rank != null ? p.rank : p.up ? 0 : 1, kq = q.rank != null ? q.rank : q.up ? 0 : 1;
          return kp - kq || (kp === 0 ? p.lane - q.lane : q.lane - p.lane);
        }), r = R[id], n = list.length;
        list.forEach(function (p, k) { portY[p.i + p.end] = n === 1 ? r.cy : r.t + 10 + k * (r.b - r.t - 20) / (n - 1); });
      });
      svg.setAttribute('viewBox', '0 0 ' + o.width + ' ' + o.height);
      g.edges.forEach(function (e, i) {
        var a = R[e[0]], z = R[e[1]], pts, mid;
        if (e[0] === e[1]) {
          var y1 = portY[i + 'from'], y2 = portY[i + 'to'];
          pts = [[a.r, y1], [a.r + 12, y1], [a.r + 12, y2], [a.r + GAP, y2]];
          mid = [a.r, at[e[0]] ? a.t - 16 : a.b + 16, 'end'];
        } else if (laneOf[i] == null) {
          var x0 = a.l + 24;
          pts = [[x0, a.b], [x0, z.t - GAP]];
          mid = [x0 + 10, (a.b + z.t) / 2, 'start'];
        } else {
          var lx = a.r + 24 + laneOf[i] * LANE, ya = portY[i + 'from'], yz = portY[i + 'to'];
          pts = [[a.r, ya], [lx, ya], [lx, yz], [z.r + GAP, yz]];
          mid = [z.r, at[e[1]] ? z.t - 16 : z.b + 16, 'end'];
        }
        paths += line(e, pts);
        var lab = [].filter.call(labels, function (l) { return l.getAttribute('data-e') === String(i); })[0];
        if (lab) { lab.style.left = mid[0] + 'px'; lab.style.top = mid[1] + 'px'; lab.classList.toggle('is-start', mid[2] === 'start'); lab.classList.toggle('is-end', mid[2] === 'end'); }
      });
      return paths;
    }
    function draw() {
      var down = box.classList.contains('is-down'), o = box.getBoundingClientRect(), paths = '', GAP = 4;
      if (box.classList.contains('is-list')) { paths = drawList(); return finish(paths); }
      var rect = function (id) { var q = nodes[id].getBoundingClientRect(); return { l: q.left - o.left, t: q.top - o.top, r: q.right - o.left, b: q.bottom - o.top, cx: (q.left + q.right) / 2 - o.left, cy: (q.top + q.bottom) / 2 - o.top }; };
      var all = g.nodes.map(rect), lowest = Math.max.apply(null, all.map(function (q) { return q.b; })), rightmost = Math.max.apply(null, all.map(function (q) { return q.r; }));
      var lane = 0, loopsInto = {}, hasSelf = {};
      g.edges.forEach(function (e) { if (e[0] === e[1]) hasSelf[e[0]] = 1; });
      svg.setAttribute('viewBox', '0 0 ' + o.width + ' ' + o.height);
      g.edges.forEach(function (e, i) {
        var a = rect(e[0]), z = rect(e[1]), pts, mid, self = e[0] === e[1];
        var fwd = !self && (down ? z.t >= a.b - 1 : z.l >= a.r - 1);
        var gap = (rank[e[1]] || 0) - (rank[e[0]] || 0);
        if (fwd && !down) {
          // Out of the right side, into the left side. A change of row turns once, halfway between the columns, or
          // just before the target when the arrow skips columns, so it never runs along another node's line.
          var mx = gap > 1 ? Math.round(z.l - 16) : Math.round((a.r + z.l) / 2);
          pts = Math.abs(a.cy - z.cy) < 2 ? [[a.r, a.cy], [z.l - GAP, a.cy]] : [[a.r, a.cy], [mx, a.cy], [mx, z.cy], [z.l - GAP, z.cy]];
          mid = [mx, Math.abs(a.cy - z.cy) < 2 ? a.cy : (a.cy + z.cy) / 2];
        } else if (fwd && gap > 1 && (a.cx > z.r + 8 || a.cx < z.l - 8)) {
          // Stacked, an arrow that skips rows comes down its own column and into the target's side, clear of the
          // fan of short arrows between the rows.
          var sx3 = a.cx > z.r ? z.r + GAP : z.l - GAP;
          pts = [[a.cx, a.b], [a.cx, z.cy], [sx3, z.cy]];
          mid = [a.cx, (a.b + z.cy) / 2];
        } else if (fwd) {
          var my = Math.round((a.b + z.t) / 2);
          pts = Math.abs(a.cx - z.cx) < 2 ? [[a.cx, a.b], [a.cx, z.t - GAP]] : [[a.cx, a.b], [a.cx, my], [z.cx, my], [z.cx, z.t - GAP]];
          mid = [(a.cx + z.cx) / 2, my];
        } else if (down && self) {
          // Stacked, a wait that restarts is a small loop off the box's right side, its label just past it.
          var sx2 = a.r + 16;
          pts = [[a.r, a.cy - 8], [sx2, a.cy - 8], [sx2, a.cy + 8], [a.r + GAP, a.cy + 8]];
          mid = [sx2 + 8, a.cy, 'start'];
        } else if (down) {
          // Stacked, a step back runs up its own lane on the right, clear of the boxes. A second loop into the same box
          // enters a little lower, and its label moves to where it leaves, so no two labels share a spot.
          var rx = rightmost + 24 + lane++ * LANE, k = loopsInto[e[1]] = (loopsInto[e[1]] || 0) + 1, zy = z.cy + (k - 1) * 12;
          if (hasSelf[e[1]]) {
            // The target's right side is taken by its own wait loop, so this one comes in over the top corner.
            var ty = z.t - 14, tx = z.r - 16;
            pts = [[a.r, a.cy], [rx, a.cy], [rx, ty], [tx, ty], [tx, z.t - GAP]];
            mid = rx - a.r > 96 ? [(a.r + rx) / 2, a.cy] : [(tx + rx) / 2, ty];
          } else {
            pts = [[a.r, a.cy], [rx, a.cy], [rx, zy], [z.r + GAP, zy]];
            mid = k === 1 ? [(z.r + rx) / 2, zy] : rx - a.r > 96 ? [(a.r + rx) / 2, a.cy] : [rx + 8, (a.cy + zy) / 2, 'start'];
          }
        } else {
          // A step back, or a wait that restarts: down out of the box, along a lane under everything, up into the target.
          var ly = (self ? a.b + 24 : lowest + 24) + (self ? 0 : lane++ * LANE), k2 = self ? 1 : (loopsInto[e[1]] = (loopsInto[e[1]] || 0) + 1);
          var w3 = (a.r - a.l) / 3, sx = self ? a.l + w3 : a.cx, ex = self ? a.r - w3 : z.cx + (k2 - 1) * 12;
          pts = [[sx, a.b], [sx, ly], [ex, ly], [ex, z.b + GAP]];
          mid = [(sx + ex) / 2, ly];
        }
        paths += line(e, pts);
        var lab = [].filter.call(labels, function (l) { return l.getAttribute('data-e') === String(i); })[0];
        if (lab) { lab.style.left = mid[0] + 'px'; lab.style.top = mid[1] + 'px'; lab.classList.toggle('is-start', mid[2] === 'start'); lab.classList.remove('is-end'); }
      });
      finish(paths);
    }
    // Blue arrows wait and are drawn last, so the main path is never under a grey one where they cross.
    var over = '';
    function line(e, pts) {
      var d = '<path class="' + (e[2] ? 'is-key' : '') + '" d="' + elbow(pts) + '" marker-end="url(#cvArrow' + (e[2] ? 'K' : '') + uidF + ')"/>';
      if (!e[2]) return d;
      over += d;
      return '';
    }
    function finish(paths) {
      paths += over;
      over = '';
      // Labels never sit on each other: a later one that would overlap an earlier one steps down until it's clear, or,
      // when it hangs off the right of a box, steps left.
      var placed = [];
      [].forEach.call(labels, function (l) {
        if (!l.style.left) return;
        for (var n = 0; n < 6; n++) {
          var q = l.getBoundingClientRect();
          var hit = placed.filter(function (p) { return q.left < p.right + 4 && q.right > p.left - 4 && q.top < p.bottom + 2 && q.bottom > p.top - 2; })[0];
          if (!hit) break;
          if (l.classList.contains('is-end')) l.style.left = (parseFloat(l.style.left) - (q.right - hit.left) - 8) + 'px';
          else l.style.top = (parseFloat(l.style.top) + (hit.bottom - q.top) + 4) + 'px';
        }
        placed.push(l.getBoundingClientRect());
      });
      // An open chevron, drawn in page pixels so it's the same size on every flow.
      svg.innerHTML = '<defs>' + ['', 'K'].map(function (k) {
        return '<marker id="cvArrow' + k + uidF + '" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="' + (k ? 'is-key' : '') + '" d="M3 1.5 L8.5 5 L3 8.5"/></marker>';
      }).join('') + '</defs>' + paths;
    }
    var uidF = ++uid;
    layout();
    addEventListener('resize', layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  });

  // The rail (built by /vault.js once the page has loaded) shares the left margin with wide figures. While one passes
  // under it, the rail steps aside.
  var railTick = 0;
  function cover() {
    railTick = 0;
    var rail = document.querySelector('.frame.cv .rail');
    if (!rail) return;
    var r = rail.getBoundingClientRect();
    // Too little room on the right (a zoomed or narrow window): the rail would be cut off at the edge, so it hides.
    if (r.right > document.documentElement.clientWidth - 12) { rail.classList.add('is-covered'); return; }
    // A wide picture or diagram passing under it hides it for as long as they overlap.
    rail.classList.toggle('is-covered', [].some.call(main.querySelectorAll('.cv-wide, .cv-xwide'), function (el) {
      var b = el.getBoundingClientRect();
      return b.right > r.left - 16 && b.left < r.right + 16 && b.bottom > r.top - 16 && b.top < r.bottom + 16;
    }));
  }
  var coverSoon = function () { if (!railTick) railTick = requestAnimationFrame(cover); };
  addEventListener('scroll', coverSoon, { passive: true });
  addEventListener('resize', coverSoon);
  addEventListener('load', cover);
  document.addEventListener('DOMContentLoaded', function () { setTimeout(cover, 0); });

  /* ---------- code: copy the lines, say so for a moment ---------- */
  [].forEach.call(main.querySelectorAll('.cv-copy'), function (btn) {
    btn.addEventListener('click', function () {
      var done = function () { btn.textContent = 'Copied'; btn.classList.add('is-done'); setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('is-done'); }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(btn.getAttribute('data-copy')).then(done, function () {});
    });
  });

  /* ---------- collapsible: the head toggles; the body opens by its own height ---------- */
  [].forEach.call(main.querySelectorAll('.cv-coll'), function (c) {
    var head = c.querySelector('.cv-coll-head');
    head.addEventListener('click', function () {
      var open = !c.classList.contains('is-open');
      c.classList.toggle('is-open', open);
      head.setAttribute('aria-expanded', String(open));
      // A tree, flow or tabs inside measured themselves while hidden; let them measure again.
      if (open) setTimeout(function () { dispatchEvent(new Event('resize')); }, 30);
    });
  });

  /* ---------- tabs: the same switch as a before/after, any number of panes ---------- */
  // A gantt's dates stay inside the chart and never touch the Today line. Each date tries its own side of the bar,
  // then the other; it takes the first that fits and clears the line, else the first that fits, else its own side.
  [].forEach.call(main.querySelectorAll('.cv-gantt'), function (g) {
    var line = g.querySelector('.cv-g-today'), whens = g.querySelectorAll('.cv-g-when');
    var put = function (w, flip) {
      w.classList.toggle('is-flip', flip);
      w.style.left = flip ? '' : w.getAttribute('data-e');
      w.style.right = flip ? 'calc(100% - ' + w.getAttribute('data-s') + ')' : '';
    };
    var dodge = function () {
      var x = line ? line.getBoundingClientRect().left + 1 : null;
      [].forEach.call(whens, function (w) {
        var track = w.parentNode.getBoundingClientRect(), f = w.getAttribute('data-flip') === '1';
        var test = function (flip) {
          put(w, flip);
          var r = w.getBoundingClientRect();
          return { flip: flip, fits: r.left >= track.left - 1 && r.right <= track.right + 1, clear: x == null || !(r.left - 6 < x && r.right + 6 > x) };
        };
        var tries = [test(f), test(!f)];
        var best = tries.filter(function (t) { return t.fits && t.clear; })[0] || tries.filter(function (t) { return t.fits; })[0] || tries[0];
        put(w, best.flip);
        w.classList.toggle('is-over', !best.clear);  // no side clears the line: the line passes behind the text
      });
    };
    dodge();
    addEventListener('resize', dodge);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(dodge);
  });

  [].forEach.call(main.querySelectorAll('.cv-tabs'), function (fig) {
    var seg = fig.querySelector('.cv-seg'), thumb = seg.querySelector('.cv-thumb'), stage = fig.querySelector('.cv-stage');
    var own = function (sel) { return stage.querySelectorAll(':scope > ' + sel); };
    var current = (own('.cv-side.is-on')[0] || own('.cv-side')[0]).getAttribute('data-side');
    function place() { var on = seg.querySelector('[data-show="' + current + '"]'); thumb.style.width = on.offsetWidth + 'px'; thumb.style.transform = 'translateX(' + on.offsetLeft + 'px)'; }
    function fit() { var on = own('.cv-side.is-on')[0], cs = getComputedStyle(stage); stage.style.height = (on.offsetHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)) + 'px'; }
    function show(k) {
      current = k;
      [].forEach.call(own('.cv-side'), function (s) { var on = s.getAttribute('data-side') === k; s.classList.toggle('is-on', on); s.setAttribute('aria-hidden', String(!on)); });
      [].forEach.call(seg.querySelectorAll('button'), function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-show') === k)); b.setAttribute('aria-pressed', String(b.getAttribute('data-show') === k)); });
      place(); fit();
      setTimeout(function () { dispatchEvent(new Event('resize')); }, 30);
    }
    seg.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) show(b.getAttribute('data-show')); });
    seg.addEventListener('keydown', function (e) {
      var d = { ArrowRight: 1, ArrowLeft: -1 }[e.key], bs = [].slice.call(seg.querySelectorAll('button'));
      if (!d) return;
      var i = (bs.findIndex(function (b) { return b.getAttribute('data-show') === current; }) + d + bs.length) % bs.length;
      show(bs[i].getAttribute('data-show')); bs[i].focus();
    });
    show(current);
    addEventListener('resize', function () { place(); fit(); });
    [].forEach.call(stage.querySelectorAll('img, video'), function (m) { m.addEventListener(m.tagName === 'VIDEO' ? 'loadedmetadata' : 'load', fit); m.removeAttribute('loading'); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(); fit(); });
  });

  /* ---------- treemap: squarified, so tiles stay close to square and areas are easy to compare ---------- */
  [].forEach.call(main.querySelectorAll('.cv-tm'), function (box) {
    var data = JSON.parse(box.getAttribute('data-tm'));
    function squarify(items, x, y, w, h, out) {
      items = items.filter(function (i) { return i.value > 0; });
      var total = items.reduce(function (n, i) { return n + i.value; }, 0);
      if (!items.length) return;
      var scale = w * h / total, row = [], rest = items.slice();
      var worst = function (r, side) { var s = r.reduce(function (n, i) { return n + i.value * scale; }, 0), mx = 0, mn = Infinity;
        r.forEach(function (i) { mx = Math.max(mx, i.value * scale); mn = Math.min(mn, i.value * scale); });
        return Math.max(side * side * mx / (s * s), s * s / (side * side * mn)); };
      while (rest.length) {
        var side = Math.min(w, h), next = rest[0];
        if (!row.length || worst(row.concat(next), side) <= worst(row, side)) { row.push(rest.shift()); continue; }
        lay(); row = [];
      }
      if (row.length) lay();
      function lay() {
        var s = row.reduce(function (n, i) { return n + i.value * scale; }, 0), horiz = w >= h, thick = s / (horiz ? h : w), at = 0;
        row.forEach(function (i) {
          var len = i.value * scale / thick;
          out.push(horiz ? { i: i, x: x, y: y + at, w: thick, h: len } : { i: i, x: x + at, y: y, w: len, h: thick });
          at += len;
        });
        if (horiz) { x += thick; w -= thick; } else { y += thick; h -= thick; }
      }
    }
    function draw() {
      // One gap everywhere: G between any two tiles, and G from a shelf's edge to the tiles inside it. HEAD is the shelf's label row.
      var W = box.clientWidth, H = Math.round(W * (W < 520 ? 1 : .5)), G = 4, HEAD = 28, tiles = [];  // HEAD: the label's 8 + 18 + 2, so the first row of children sits G under it
      box.style.height = H + 'px';
      squarify(data, 0, 0, W, H, tiles);
      var html = '';
      tiles.forEach(function (t) {
        var kids = t.i.children && t.i.children.length, inner = [];
        // Children fill the shelf below its label. The box handed to squarify reaches G/2 past the shelf's inner edge,
        // because every tile then gives back G/2 a side: so kid-to-kid and kid-to-edge both come out at G.
        if (kids) squarify(t.i.children.slice().sort(function (p, q) { return q.value - p.value; }), t.x + G, t.y + HEAD, t.w - 2 * G, t.h - HEAD - G, inner);
        html += '<div class="cv-tm-t' + (t.i.key ? ' is-key' : '') + (kids ? ' has-kids' : '') + '" style="left:' + (t.x + G / 2) + 'px;top:' + (t.y + G / 2) + 'px;width:' + Math.max(0, t.w - G) + 'px;height:' + Math.max(0, t.h - G) + 'px" title="' + esc(plain(t.i.label) + ': ' + t.i.value) + '">' +
          (t.w > 70 && t.h > 40 ? '<span class="l">' + md(t.i.label) + ' <b>' + num(t.i.value, b0) + '</b></span>' : '') + '</div>';
        inner.forEach(function (c) {
          html += '<div class="cv-tm-t is-kid' + (c.i.key ? ' is-key' : '') + '" style="left:' + (c.x + G / 2) + 'px;top:' + (c.y + G / 2) + 'px;width:' + Math.max(0, c.w - G) + 'px;height:' + Math.max(0, c.h - G) + 'px" title="' + esc(plain(c.i.label) + ': ' + c.i.value) + '">' +
            (c.w > 64 && c.h > 36 ? '<span class="l">' + md(c.i.label) + ' <b>' + num(c.i.value, b0) + '</b></span>' : '') + '</div>';
        });
      });
      box.innerHTML = html;
    }
    var b0 = {};
    draw();
    addEventListener('resize', draw);
  });

  /* ---------- before / after: toggle, slide, pins ---------- */
  [].forEach.call(main.querySelectorAll('.cv-ba'), function (fig) {
    var stage = fig.querySelector('.cv-stage'), seg = fig.querySelector('.cv-seg'), thumb = seg.querySelector('.cv-thumb');
    var modeBtn = fig.querySelector('.cv-mode'), notes = fig.querySelector('.cv-notes'), grip = fig.querySelector('.cv-grip');
    var current = fig.getAttribute('data-start') === 'after' ? 'after' : 'before', slide = false, cut = 50;

    function place() {
      var on = seg.querySelector('[data-show="' + current + '"]');
      thumb.style.width = on.offsetWidth + 'px';
      thumb.style.transform = 'translateX(' + on.offsetLeft + 'px)';
    }
    // A stage made of blocks takes the height of the side on show, so a short side leaves no gap.
    function fit() {
      if (!stage.classList.contains('is-blocks')) return;
      var on = stage.querySelector('.cv-side.is-on'), cs = getComputedStyle(stage);
      stage.style.height = (on.offsetHeight + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)) + 'px';
    }
    function show(k) {
      current = k;
      [].forEach.call(fig.querySelectorAll('.cv-side'), function (s) {
        var on = s.getAttribute('data-side') === k;
        s.classList.toggle('is-on', on);
        s.classList.remove('is-focus');
        s.setAttribute('aria-hidden', on || slide ? 'false' : 'true');
      });
      if (notes) [].forEach.call(notes.querySelectorAll('ol'), function (o) { o.classList.toggle('is-on', o.getAttribute('data-side') === k); });
      [].forEach.call(seg.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(!slide && b.getAttribute('data-show') === k)); });
      place();
      fit();
      if (slide) setSlide(false);
    }
    function setCut(v) {
      cut = Math.max(0, Math.min(100, v));
      stage.style.setProperty('--cut', cut + '%');
      if (grip) grip.setAttribute('aria-valuenow', String(Math.round(cut)));
    }
    function setSlide(on) {
      slide = on;
      stage.classList.toggle('is-slide', on);
      if (modeBtn) modeBtn.setAttribute('aria-pressed', String(on));
      if (notes) notes.classList.toggle('is-hidden', on);
      seg.style.opacity = on ? '.45' : '';
      [].forEach.call(seg.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(!on && b.getAttribute('data-show') === current)); });
      if (on) setCut(50);
    }

    seg.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) show(b.getAttribute('data-show')); });
    if (modeBtn) modeBtn.addEventListener('click', function () { setSlide(!slide); });

    // A tap on the picture flips it; in Slide, pressing and dragging moves the split.
    var dragging = false, moved = false;
    var at = function (e) { var r = stage.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; };
    stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.cv-pin')) return;
      moved = false;
      if (slide) { dragging = true; stage.setPointerCapture(e.pointerId); setCut(at(e)); }
    });
    stage.addEventListener('pointermove', function (e) { if (dragging) { moved = true; setCut(at(e)); } });
    stage.addEventListener('pointerup', function () { dragging = false; });
    stage.addEventListener('pointercancel', function () { dragging = false; });
    stage.addEventListener('click', function (e) {
      if (slide || e.target.closest('.cv-pin, a, button')) return;
      show(current === 'before' ? 'after' : 'before');
    });
    if (grip) grip.addEventListener('keydown', function (e) {
      var d = { ArrowLeft: -5, ArrowRight: 5, Home: -100, End: 100 }[e.key];
      if (d != null) { e.preventDefault(); setCut(cut + d); }
    });

    wirePins(fig, function () { return current; }, function () { return slide; });
    show(current);
    addEventListener('resize', function () { place(); fit(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(); fit(); });
  });

  /* ---------- tree canvas: drag to pan, pinch or ⌘/ctrl-scroll to zoom, Fit to see it all ---------- */
  [].forEach.call(main.querySelectorAll('.cv-tree.is-canvas'), function (box) {
    var pane = box.querySelector('.cv-pane'), k = 1, x = 0, y = 0, MAX_H = 800;
    var pad = function () { return parseFloat(getComputedStyle(box).paddingLeft) || 0; };
    var draw = function () { pane.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + k + ')'; };
    // The window is as tall as the whole graph at fit, up to MAX_H; a bigger graph starts zoomed out to fit.
    function fitAll() {
      pane.style.transform = 'none';
      var p = pad(), cw = pane.scrollWidth, ch = pane.scrollHeight, vw = box.clientWidth - 2 * p;
      var kw = Math.min(1, vw / cw);
      box.style.height = Math.round(Math.min(MAX_H, ch * kw + 2 * p)) + 'px';
      k = Math.min(kw, (box.clientHeight - 2 * p) / ch); x = 0; y = 0; draw();
    }
    function zoomAt(f, cx, cy) {
      var nk = Math.max(0.25, Math.min(3, k * f));
      x = cx - (cx - x) * nk / k; y = cy - (cy - y) * nk / k; k = nk; draw();
    }
    box.querySelector('.cv-zoom').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var p = pad(), cx = box.clientWidth / 2 - p, cy = box.clientHeight / 2 - p;
      if (b.dataset.z === 'fit') fitAll(); else zoomAt(b.dataset.z === 'in' ? 1.25 : 0.8, cx, cy);
    });
    var drag = null;
    box.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.cv-zoom')) return;
      drag = { px: e.clientX, py: e.clientY, x: x, y: y }; box.setPointerCapture(e.pointerId); box.classList.add('is-dragging');
    });
    box.addEventListener('pointermove', function (e) { if (drag) { x = drag.x + e.clientX - drag.px; y = drag.y + e.clientY - drag.py; draw(); } });
    var end = function () { drag = null; box.classList.remove('is-dragging'); };
    box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
    // Plain scrolling still scrolls the page; only a pinch (ctrl-wheel) or ⌘-scroll zooms.
    box.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      var r = box.getBoundingClientRect(), p = pad();
      zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left - p, e.clientY - r.top - p);
    }, { passive: false });
    fitAll();
    addEventListener('resize', fitAll);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  });
})();
