// Small markdown renderer for the subset the vault actually uses.
// Deliberately not a full CommonMark implementation — no dependency is worth more here.

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function inline(text, known = new Set()) {
  let s = esc(text);
  // Park code spans behind a sentinel byte so no later rule can reach inside them,
  // and so a bare number in prose can't be mistaken for a placeholder.
  const code = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => `\u0000${code.push(`<code>${c}</code>`) - 1}\u0000`);
  // [[note]] or [[note|shown text]] — the alias is display only, the link goes to the note.
  s = s.replace(/\[\[([^\]]+)\]\]/g, (_, raw) => {
    const [t, alias] = raw.split('|').map((x) => x.trim());
    const label = alias || t;
    return known.has(t)
      ? `<a class="wiki" href="/n/${encodeURIComponent(t)}">${label}</a>`
      : `<a class="wiki dangling" title="No note yet">${label}</a>`;
  });
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, t, h) => `<img src="${h}" alt="${t}" loading="lazy">`);
  // Only web, relative and in-page links; a javascript: URL in a note stays as text.
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, h) => /^(https?:|mailto:|\/|#|\.)/i.test(h.trim()) ? `<a href="${h}">${t}</a>` : m);
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, p, u) => `${p}<a href="${u}">${u}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => code[+i]);
}

// A paragraph runs until the next real block start. This must stay in sync with the
// branches below: matching too broadly silently swallows lines (a paragraph opening with
// **bold** is not a list item), matching too narrowly merges blocks into the paragraph.
const isBlockStart = (l) =>
  /^#{1,4}\s/.test(l) ||          // heading
  /^\s*>/.test(l) ||              // blockquote
  /^\s*([-*]|\d+\.)\s+/.test(l) ||// list item
  /^\s*\|/.test(l) ||             // table row
  /^```/.test(l) ||               // fence
  /^\s*(---|\*\*\*)\s*$/.test(l); // rule

// A heading may be a link — "### [Iconsax](https://…)". The id, and any table of contents,
// want the label, not the URL glued to it.
const unlink = (s) => s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

export const slug = (s) =>
  unlink(s).toLowerCase().replace(/<[^>]+>/g, '').replace(/[`*_\[\]]/g, '').replace(/[^a-z0-9一-鿿\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);

// Headings in a markdown body, for a table of contents. Skips anything inside a code fence.
export function headings(md) {
  const out = [];
  let fenced = false;
  for (const line of md.split('\n')) {
    if (line.startsWith('```')) { fenced = !fenced; continue; }
    if (fenced) continue;
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const text = h[2].replace(/[`*_]/g, '');
      const link = /^\s*\[([^\]]+)\]\(([^)]+)\)\s*$/.exec(text);
      out.push({ level: h[1].length, text: link ? link[1] : text, href: link ? link[2] : '', id: slug(h[2]) });
    }
  }
  return out;
}

export function render(md, known = new Set()) {
  const out = [];
  const lines = md.split('\n');
  let i = 0;
  let list = null;

  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { closeList(); i++; continue; }

    if (line.startsWith('```')) {
      closeList();
      const lang = line.slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      out.push(`<pre data-lang="${esc(lang)}"><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }

    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      closeList();
      const lvl = h[1].length;
      out.push(`<h${lvl} id="${slug(h[2])}"><span>${inline(h[2], known)}</span></h${lvl}>`);
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      closeList();
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      out.push(`<blockquote>${render(buf.join('\n'), known)}</blockquote>`);
      continue;
    }

    if (/^\s*\|/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      closeList();
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(
        `<table><thead><tr>${head.map((c) => `<th>${inline(c, known)}</th>`).join('')}</tr></thead><tbody>` +
        rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c, known)}</td>`).join('')}</tr>`).join('') +
        `</tbody></table>`
      );
      continue;
    }

    const li = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(line);
    if (li) {
      const want = /^\d/.test(li[1]) ? 'ol' : 'ul';
      if (list !== want) { closeList(); out.push(`<${want}>`); list = want; }
      out.push(`<li>${inline(li[2], known)}</li>`);
      i++;
      continue;
    }

    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { closeList(); out.push('<hr>'); i++; continue; }

    closeList();
    const para = [lines[i++]]; // always consume at least this line, so nothing is dropped
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) para.push(lines[i++]);
    out.push(`<p>${inline(para.join(' '), known)}</p>`);
  }
  closeList();
  return out.join('\n');
}

export { esc };
