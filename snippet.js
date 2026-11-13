function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Markdown as a reader sees it: no fences, emphasis marks, table pipes,
// heading hashes or link targets.
function plainText(md) {
  return md
    .replace(/^\s*```.*$/gm, ' ')
    .replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    .replace(/^\s{0,3}(#{1,6}|>)\s?/gm, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s*\||\|\s*$/gm, '')
    .replace(/[ \t]*\|[ \t]*/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makeSnippet(text, terms, size) {
  const flat = plainText(text);
  const lower = flat.toLowerCase();
  let at = -1;
  
  for (const term of terms) {
    const i = lower.indexOf(term);
    if (i >= 0 && (at === -1 || i < at)) {
      at = i;
    }
  }
  
  const start = at > 60 ? at - 60 : 0;
  const end = Math.min(flat.length, start + size);
  
  return (start > 0 ? '…' : '') + flat.slice(start, end) + (end < flat.length ? '…' : '');
}

const UNSAFE = ['lt', 'gt', 'amp', 'quot', 'mark'];

function highlight(html, terms) {
  let out = html;
  for (const term of terms) {
    if (UNSAFE.includes(term)) {
      continue;
    }
    out = out.replace(new RegExp('\\b(' + term + ')' + (term.length < 4 ? '\\b' : ''), 'gi'), '<mark>$1</mark>');
  }
  return out;
}

if (typeof module !== 'undefined') module.exports = { escapeHtml, plainText, makeSnippet, highlight };