const MARKS = /\[ERROR\]|\[XX\]|✗|\berror:|\bfatal:|\bfailed\b/i;

function errorLines(text) {
  const rows = text.split('\n');
  if (rows.length < 2) return [];
  const out = [];
  for (let i = 0; i < rows.length && out.length < 5; i++) {
    const line = rows[i].trim();
    if (line.length >= 15 && MARKS.test(line) && !out.includes(line)) {
      out.push(line);
    }
  }
  return out;
}

function mergeResults(lists, limit) {
  const out = [];
  const seen = new Set();
  for (let i = 0; i < lists.length && out.length < limit; i++) {
    for (const r of lists[i]) {
      const key = r.chunk.file + ':' + r.chunk.line;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(r);
      }
    }
  }
  return out;
}

if (typeof module !== 'undefined') module.exports = { errorLines, mergeResults };