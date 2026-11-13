const STOP = ['how', 'do', 'does', 'i', 'to', 'the', 'a', 'an', 'in', 'on', 'of', 'for', 'with', 'and', 'or', 'is', 'my', 'can', 'what', 'use', 'it', 'ods'];
function tokenize(text) { return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w.length >= 2 && !STOP.includes(w) && !/^\d+$/.test(w)); }
function flat(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function countOf(haystack, word) { return haystack.split(word).length - 1; }
function weights(lows, terms) { const w = {}; for (let t of terms) { let df = 0; for (let s of lows) { if (s.includes(t)) df++; } w[t] = Math.log(1 + lows.length / (1 + df)); }
return w;
}
// The fixed parts of an error message, between its shell or PowerShell variables.
// A message whose fixed text is shorter than 20 characters ("Service
// $service is not running") would match far too much, so it has none.
function messageParts(chunk) {
  const parts = chunk.heading.slice(7).split(/\$\{[^}]*\}|\$\([^)]*\)+|\$[A-Za-z_][A-Za-z0-9_.]*/).map(flat).filter(p => p.length >= 12);
  return parts.reduce((n, p) => n + p.length, 0) >= 20 ? parts : [];
}
// The whole message is in what was pasted, not just the other way round
// ("Docker Desktop is not running." is inside a longer message too).
function wholeMessageIn(chunk, query) {
  const phrase = flat(query);
  const parts = messageParts(chunk);
  return parts.length > 0 && parts.every(p => phrase.includes(p));
}
function exactMatch(chunk, phrase) {
  if (phrase.length <= 15) return false;
  if (flat(chunk.kind === 'error' ? chunk.heading.slice(7) : chunk.text).includes(phrase)) return true;
  if (chunk.kind !== 'error') return false;
  const parts = messageParts(chunk);
  return parts.length > 0 && parts.every(p => phrase.includes(p));
}
function scoreChunk(chunk, low, terms, w) {
  const heading = chunk.heading.toLowerCase(); const file = chunk.file.toLowerCase(); let score = 0; let matched = 0;
  for (let t of terms) { let hit = false; if (heading.includes(t)) { score += 3 * w[t]; hit = true; }
  if (file.includes(t)) { score += w[t]; hit = true; }
  const n = countOf(low, t); if (n > 0) { score += Math.min(n, 3) * w[t]; hit = true; }
  if (hit) matched++;
  }
  if (matched >= 0.8 * terms.length) score = score * 1.5;
  if (score > 0 && (file.includes('faq') || file.includes('quickstart') || file.includes('troubleshooting'))) score = score * 1.2;
  return score;
}
function search(docs, query, limit) {
  const terms = [...new Set(tokenize(query))]; if (terms.length === 0) return [];
  const lows = docs.map(c => (c.heading + ' ' + c.text).toLowerCase());
  const w = weights(lows, terms); const phrase = flat(query);
  return docs.map((c, k) => { const exact = exactMatch(c, phrase); return { chunk: c, score: scoreChunk(c, lows[k], terms, w) + (exact ? 100 : 0), exact: exact }; }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}
// Every error message the query matches exactly, plus the top `limit`
// sections of the docs. An error that only shares words with the query is
// dropped: it would be a guess at where the text came from.
function pickResults(list, limit) {
  const out = [];
  let sections = 0;
  for (const r of list) {
    if (r.chunk.kind === 'error') {
      if (r.exact) out.push(r);
    } else if (sections < limit) {
      out.push(r);
      sections++;
    }
  }
  return out;
}

// The matched error messages, one group per message, in rank order: the
// same message is often printed in several places (the Linux, macOS and
// Windows installers each have a "Docker Desktop is not running.").
function groupErrors(list) {
  const groups = [];
  for (const r of list) {
    if (r.chunk.kind !== 'error') continue;
    let g = groups.find(x => x.message === r.chunk.heading);
    if (!g) groups.push(g = { message: r.chunk.heading, chunks: [] });
    g.chunks.push(r.chunk);
  }
  return groups;
}
if (typeof module !== 'undefined') module.exports = { tokenize, search, pickResults, groupErrors, wholeMessageIn };