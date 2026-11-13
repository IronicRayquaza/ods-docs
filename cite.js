// Which sections of the manual cover each error message ODS prints, worked
// out at build time so the search can cite them next to the error:
//
//   ref    the message, or the lines printed with it, names the doc
//          ("See docs/INSTALL-TROUBLESHOOTING.md#container-build-dns")
//   quote  the section quotes the message word for word
//
// A message with variables in it ("Not enough free space on $drive ...")
// counts as quoted when every fixed part of it is in the section.

const MAX_CITED = 3;

function flat(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// The fixed text of a message, between its shell or PowerShell variables.
function fixedParts(message) {
  return message.split(/\$\{[^}]*\}|\$\([^)]*\)+|\$[A-Za-z_][A-Za-z0-9_.:]*/).map(flat).filter(p => p.length >= 12);
}

function quotes(sectionFlat, parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  return total >= 20 && parts.every(p => sectionFlat.includes(p));
}

// chunks: the search index (doc sections and error messages together).
// Adds `see: [{ i, by }]` to each error that the manual covers, where i is
// the doc section's index in chunks. Returns the refs that name a doc or
// heading the repo doesn't have, so the build can report them.
function citeErrors(chunks) {
  const sections = [];
  chunks.forEach((c, i) => { if (c.kind !== 'error') sections.push({ i: i, c: c, flat: flat(c.heading + ' ' + c.text) }); });
  const byFile = new Map();
  for (const s of sections) {
    if (!byFile.has(s.c.file)) byFile.set(s.c.file, []);
    byFile.get(s.c.file).push(s);
  }

  const dangling = [];
  for (const c of chunks) {
    if (c.kind !== 'error') continue;
    const see = [];
    const add = (i, by) => { if (!see.some(x => x.i === i)) see.push({ i: i, by: by }); };
    for (const ref of c.refs || []) {
      const [file, anchor] = ref.split('#');
      const inDoc = byFile.get(file);
      const hit = inDoc && (anchor ? inDoc.find(s => s.c.anchor === anchor) : inDoc[0]);
      if (hit) add(hit.i, 'ref');
      else dangling.push({ from: c.file + ':' + c.line, ref: ref });
    }
    const parts = fixedParts(c.heading.slice(7));
    for (const s of sections) {
      if (see.length >= MAX_CITED) break;
      // A macOS message quoted in the Windows guide is a different problem.
      if (c.p && s.c.p && c.p !== s.c.p) continue;
      if (quotes(s.flat, parts)) add(s.i, 'quote');
    }
    if (see.length > 0) c.see = see.slice(0, MAX_CITED);
    delete c.refs;
  }
  return dangling;
}

if (typeof module !== 'undefined') module.exports = { citeErrors, fixedParts };
