// A small Markdown renderer for the ODS docs: GitHub-flavoured headings,
// paragraphs, lists (nested, ordered, task), fenced code, tables, block
// quotes (with [!NOTE] callouts), rules, and inline code, emphasis, links
// and images.
//
// Raw HTML is never passed through. A few harmless tags without attributes
// (details, summary, br, b, i, kbd, sup, sub) are kept; other HTML tags are
// dropped and anything else that looks like a tag is shown as text.
//
// renderMarkdown(text, ctx) returns { html, headings }. ctx.resolve(url, isImage)
// turns a link target into the href to use (see build.js).

const { makeSlugger, plainHeading } = require('./slug.js');

const KEEP_TAGS = ['details', 'summary', 'br', 'b', 'i', 'kbd', 'sup', 'sub', 'em', 'strong', 'code'];
const DROP_TAGS = ['a', 'p', 'div', 'span', 'img', 'picture', 'source', 'center', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'hr', 'blockquote', 'pre', 'u', 'small', 'font', 'video', 'iframe', 'script', 'style', 'svg', 'path'];
const CALLOUTS = ['note', 'tip', 'important', 'warning', 'caution'];

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------- inline ----------

function inline(text, ctx) {
  const slots = [];
  const put = (html) => '\u0000' + (slots.push(html) - 1) + '\u0000';

  let s = text;
  // Code spans first, so nothing inside them is touched.
  s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (m, ticks, body) => put('<code>' + esc(body.replace(/^ (.*) $/, '$1')) + '</code>'));
  // Autolinks <https://...>
  s = s.replace(/<(https?:\/\/[^\s>]+)>/g, (m, url) => put('<a href="' + esc(url) + '">' + esc(url) + '</a>'));
  // HTML tags: keep a few, drop the rest; unknown "<tags>" become text below.
  s = s.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)(\s[^<>]*)?\/?>/g, (m, name, attrs) => {
    const tag = name.toLowerCase();
    if (KEEP_TAGS.includes(tag)) return put(m.startsWith('</') ? '</' + tag + '>' : '<' + tag + (tag === 'br' ? '>' : '>'));
    if (DROP_TAGS.includes(tag)) return '';
    return m;
  });
  // Backslash escapes.
  s = s.replace(/\\([\\`*_{}\[\]()#+\-.!|>~<])/g, (m, ch) => put(esc(ch)));
  s = esc(s);
  // Images, then links (a link's text may hold an image).
  s = s.replace(/!\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+&quot;[^)]*&quot;)?\s*\)/g, (m, alt, url) =>
    put('<img src="' + esc(ctx.resolve(unesc(url), true)) + '" alt="' + alt + '" loading="lazy">'));
  s = s.replace(/\[((?:[^\[\]]|\[[^\]]*\])*)\]\(\s*([^\s)]+)(?:\s+&quot;[^)]*&quot;)?\s*\)/g, (m, label, url) => {
    // A link whose text is just its own file name ("../QUICKSTART.md") reads
    // better as the doc's title, when the site has a page for it.
    const title = ctx.titleFor && unesc(label) === unesc(url) ? ctx.titleFor(unesc(url)) : null;
    return put('<a href="' + esc(ctx.resolve(unesc(url), false)) + '">' + (title ? esc(title) : emphasis(label)) + '</a>');
  });
  // Bare URLs.
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<]*[^\s<.,:;)'"!?])/g, (m, pre, url) => pre + put('<a href="' + url + '">' + url + '</a>'));
  s = emphasis(s);
  // Hard line breaks: two trailing spaces or a backslash before a newline.
  s = s.replace(/( {2,}|\\)\n/g, '<br>\n');
  while (/\u0000\d+\u0000/.test(s)) s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => slots[Number(i)]);
  return s;
}

function unesc(s) {
  return s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function emphasis(s) {
  return s
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '<strong>$2</strong>')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>')
    .replace(/(^|[^*\w])\*(?=[^\s*])([^*]*?[^\s*])\*(?![*\w])/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_(?=[^\s_])([^_]*?[^\s_])_(?![_\w])/g, '$1<em>$2</em>');
}

// ---------- blocks ----------

const FENCE = /^(\s*)(`{3,}|~{3,})\s*([^`\s]*)[^`]*$/;
const HEADING = /^ {0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const RULE = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE = /^ {0,3}> ?/;
const ITEM = /^(\s*)([-*+]|\d{1,9}[.)])(\s+|$)/;
const TABLE_SEP = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
const HTML_LINE = /^\s*<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/;

function indentOf(t) {
  return t.match(/^\s*/)[0].replace(/\t/g, '    ').length;
}

function dedent(t, n) {
  let i = 0;
  let col = 0;
  while (i < t.length && col < n && (t[i] === ' ' || t[i] === '\t')) {
    col += t[i] === '\t' ? 4 : 1;
    i++;
  }
  return t.slice(i);
}

function isBlank(line) {
  return line.t.trim() === '';
}

function startsBlock(t) {
  return FENCE.test(t) || HEADING.test(t) || RULE.test(t) || QUOTE.test(t) || ITEM.test(t) || HTML_LINE.test(t);
}

function splitRow(t) {
  let row = t.trim();
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1);
  const cells = [];
  let cur = '';
  let inCode = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '`') inCode = !inCode;
    if (ch === '\\' && row[i + 1] === '|') { cur += '|'; i++; continue; }
    if (ch === '|' && !inCode) { cells.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function renderBlocks(lines, ctx) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.t;
    if (isBlank(line)) { i++; continue; }

    let m = t.match(FENCE);
    if (m) {
      const indent = m[1].length;
      const marker = m[2];
      const lang = m[3];
      const body = [];
      i++;
      while (i < lines.length) {
        const close = lines[i].t.trim();
        if (close.startsWith(marker[0].repeat(marker.length)) && close.replace(new RegExp('^\\' + marker[0] + '+'), '').trim() === '') { i++; break; }
        body.push(dedent(lines[i].t, indent));
        i++;
      }
      const cls = lang ? ' class="language-' + esc(lang.toLowerCase()) + '"' : '';
      out.push('<pre><code' + cls + '>' + esc(body.join('\n')) + '</code></pre>');
      continue;
    }

    m = t.match(HEADING);
    if (m) {
      const level = m[1].length;
      const id = ctx.slug(m[2]);
      ctx.headings.push({ level: level, text: plainHeading(m[2]), id: id, line: line.n });
      out.push('<h' + level + ' id="' + esc(id) + '"><a class="anchor" href="#' + esc(id) + '" aria-hidden="true">#</a>' + inline(m[2], ctx) + '</h' + level + '>');
      i++;
      continue;
    }

    if (RULE.test(t)) { out.push('<hr>'); i++; continue; }

    if (QUOTE.test(t)) {
      const inner = [];
      while (i < lines.length && QUOTE.test(lines[i].t)) {
        inner.push({ t: lines[i].t.replace(QUOTE, ''), n: lines[i].n });
        i++;
      }
      const first = inner[0].t.trim().match(/^\[!([A-Za-z]+)\]\s*$/);
      const kind = first ? first[1].toLowerCase() : null;
      if (kind && CALLOUTS.includes(kind)) {
        const label = kind[0].toUpperCase() + kind.slice(1);
        out.push('<div class="callout callout-' + kind + '"><p class="callout-title">' + label + '</p>' + renderBlocks(inner.slice(1), ctx) + '</div>');
      } else {
        out.push('<blockquote>' + renderBlocks(inner, ctx) + '</blockquote>');
      }
      continue;
    }

    if (t.includes('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1].t) && lines[i + 1].t.includes('-')) {
      const head = splitRow(t);
      const aligns = splitRow(lines[i + 1].t).map(c => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : ''));
      i += 2;
      const rows = [];
      while (i < lines.length && !isBlank(lines[i]) && lines[i].t.includes('|')) {
        rows.push(splitRow(lines[i].t));
        i++;
      }
      const cell = (tag, c, k) => '<' + tag + (aligns[k] ? ' style="text-align:' + aligns[k] + '"' : '') + '>' + inline(c, ctx) + '</' + tag + '>';
      out.push('<div class="table-wrap"><table><thead><tr>' + head.map((c, k) => cell('th', c, k)).join('') + '</tr></thead><tbody>'
        + rows.map(r => '<tr>' + head.map((_, k) => cell('td', r[k] || '', k)).join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }

    m = t.match(ITEM);
    if (m) {
      const res = renderList(lines, i, ctx);
      out.push(res.html);
      i = res.next;
      continue;
    }

    m = t.match(HTML_LINE);
    if (m) {
      const html = inline(t.trim(), ctx);
      if (html.replace(/<[^>]*>/g, '').trim() === '' && !/<\/?(details|summary)>/.test(html)) { i++; continue; }
      if (/^<\/?(details|summary)>/.test(html)) { out.push(html); i++; continue; }
    }

    // Paragraph.
    const para = [t.trim()];
    i++;
    while (i < lines.length && !isBlank(lines[i]) && !startsBlock(lines[i].t)) {
      para.push(lines[i].t.replace(/^\s+/, ''));
      i++;
    }
    out.push('<p>' + inline(para.join('\n'), ctx) + '</p>');
  }
  return out.join('\n');
}

function renderList(lines, start, ctx) {
  const first = lines[start].t.match(ITEM);
  const base = indentOf(lines[start].t);
  const ordered = /\d/.test(first[2]);
  const startNum = ordered ? parseInt(first[2], 10) : 1;
  const items = [];
  let loose = false;
  let i = start;

  while (i < lines.length) {
    const m = lines[i].t.match(ITEM);
    if (!m || indentOf(lines[i].t) > base + 3 || /\d/.test(m[2]) !== ordered) break;
    if (indentOf(lines[i].t) < base) break;
    const contentIndent = m[1].length + m[2].length + Math.min(m[3].length || 1, 4);
    const body = [{ t: lines[i].t.slice(m[0].length), n: lines[i].n }];
    i++;
    let sawBlank = false;
    while (i < lines.length) {
      const l = lines[i];
      if (isBlank(l)) { body.push({ t: '', n: l.n }); sawBlank = true; i++; continue; }
      const ind = indentOf(l.t);
      if (ind >= contentIndent || (ind > base && !ITEM.test(l.t))) {
        body.push({ t: dedent(l.t, Math.min(ind, contentIndent)), n: l.n });
        sawBlank = false;
        i++;
        continue;
      }
      if (ind > base && ITEM.test(l.t)) {
        body.push({ t: dedent(l.t, Math.min(ind, contentIndent)), n: l.n });
        i++;
        continue;
      }
      // Lazy continuation of the item's paragraph.
      if (!sawBlank && !startsBlock(l.t)) { body.push({ t: l.t, n: l.n }); i++; continue; }
      break;
    }
    while (body.length && isBlank(body[body.length - 1])) body.pop();
    const nextItem = i < lines.length ? lines[i].t.match(ITEM) : null;
    if (sawBlank && nextItem && indentOf(lines[i].t) === base && /\d/.test(nextItem[2]) === ordered) loose = true;
    if (body.some((l, k) => k > 0 && isBlank(l))) loose = true;
    items.push(body);
  }

  const html = items.map(body => {
    let check = '';
    const task = body[0].t.match(/^\[([ xX])\]\s+/);
    if (task) {
      check = '<input type="checkbox" disabled' + (task[1] === ' ' ? '' : ' checked') + '> ';
      body[0] = { t: body[0].t.slice(task[0].length), n: body[0].n };
    }
    let inner = renderBlocks(body, ctx);
    if (!loose) inner = inner.replace(/^<p>([\s\S]*?)<\/p>/, '$1');
    return '<li' + (task ? ' class="task"' : '') + '>' + check + inner + '</li>';
  }).join('\n');

  const tag = ordered ? 'ol' : 'ul';
  const startAttr = ordered && startNum !== 1 ? ' start="' + startNum + '"' : '';
  return { html: '<' + tag + startAttr + '>\n' + html + '\n</' + tag + '>', next: i };
}

function renderMarkdown(text, ctx) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map((t, k) => ({ t: t, n: k + 1 }));
  const state = { resolve: ctx.resolve, titleFor: ctx.titleFor, slug: makeSlugger(), headings: [] };
  const html = renderBlocks(lines, state);
  return { html: html, headings: state.headings };
}

if (typeof module !== 'undefined') module.exports = { renderMarkdown, inline, esc };
