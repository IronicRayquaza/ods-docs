const REPO = 'https://github.com/Osmantic/ODS/blob/';

// The exact line on GitHub, pinned to the commit the index was built from,
// so line numbers can't drift after ODS changes.
function linkFor(chunk, sha) {
  return REPO + sha + '/' + chunk.file + (chunk.file.endsWith('.md') ? '?plain=1' : '') + '#L' + chunk.line;
}

// The section's page on this site when it has one, else GitHub.
function pageFor(chunk, sha) {
  if (!chunk.slug) return linkFor(chunk, sha);
  return 'docs/' + chunk.slug + '.html' + (chunk.anchor ? '#' + chunk.anchor : '');
}

// Which part of ODS a script is, in words, for "Printed by ...".
function whereFrom(file) {
  const name = file.split('/').pop();
  const step = name.match(/^(\d+[a-z]?)-(.+)\.(sh|ps1)$/);
  if (/\/installers\/phases\//.test(file) && step) return 'the Linux installer, step ' + step[1] + ' (' + step[2].replace(/-/g, ' ') + ')';
  if (/\/installers\/windows\/phases\//.test(file) && step) return 'the Windows installer, step ' + step[1] + ' (' + step[2].replace(/-/g, ' ') + ')';
  const known = {
    'install.sh': 'the installer',
    'install.ps1': 'the Windows installer',
    'ods/install-core.sh': 'the Linux installer',
    'ods/ods-cli': 'the ods command',
    'ods/installers/windows/ods.ps1': 'the Windows ods command',
    'ods/installers/windows/install-windows.ps1': 'the Windows installer',
    'ods/installers/macos/install-macos.sh': 'the macOS installer',
    'ods/installers/macos/ods-macos.sh': 'the macOS ods command'
  };
  if (known[file]) return known[file];
  if (file.startsWith('ods/installers/windows/')) return 'the Windows installer';
  if (file.startsWith('ods/installers/macos/')) return 'the macOS installer';
  if (file.startsWith('ods/installers/')) return 'the installer';
  if (file.startsWith('ods/scripts/')) return 'the ' + name + ' script';
  return name;
}

// A heading as written in the doc, with `code` shown as code.
function headingHtml(text) {
  return escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>');
}

// A section of the manual, cited the way a manual cites itself:
// the section, the guide it's in, and what it says.
function hitHtml(chunk, terms, sha, titles, note) {
  const guide = (chunk.slug && titles[chunk.slug]) || chunk.file.split('/').pop();
  const heading = chunk.heading === chunk.file ? guide : chunk.heading;
  return '<article class="hit">'
    + '<a class="hit-title" href="' + pageFor(chunk, sha) + '">' + headingHtml(heading) + '</a>'
    + '<p class="hit-guide">' + (heading === guide ? 'Guide' : escapeHtml(guide)) + (note ? '<span class="hit-note">' + escapeHtml(note) + '</span>' : '') + '</p>'
    + '<p class="hit-snip">' + highlight(escapeHtml(makeSnippet(chunk.text, terms, 240)), terms) + '</p>'
    + '</article>';
}

const CITED_BY = { ref: 'The message points here', quote: 'Quotes this message' };

function listing(names) {
  return names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

// One error message ODS prints (group: { message, chunks } from
// groupErrors): which parts of ODS print it, the code, and what the docs
// say about it. docs is the whole index, which chunk.see points into.
function answerHtml(group, terms, sha, docs, titles) {
  const chunks = group.chunks;
  const message = group.message.slice(7);
  const from = listing([...new Set(chunks.map(c => whereFrom(c.file)))]);
  const place = (c) => escapeHtml(c.file.split('/').pop()) + ', line ' + c.line;
  const code = chunks.slice(0, 3).map(c => {
    const parts = c.text.split('\n\n');
    return (chunks.length > 1 ? '<p class="err-place">' + place(c) + '</p>' : '')
      + (parts.length === 3 ? '<p class="err-note">' + escapeHtml(parts[1]) + '</p>' : '')
      + '<pre>' + escapeHtml(parts[parts.length - 1]) + '</pre>'
      + '<a href="' + linkFor(c, sha) + '" target="_blank" rel="noopener">View on GitHub ↗</a>';
  }).join('');
  const see = [];
  for (const c of chunks) for (const s of c.see || []) if (!see.some(x => x.i === s.i)) see.push(s);
  const cited = see.map(s => hitHtml(docs[s.i], terms, sha, titles, CITED_BY[s.by])).join('');
  return '<section class="err" aria-label="Where this error comes from">'
    + '<p class="err-from">Printed by ' + escapeHtml(from) + '</p>'
    + '<p class="err-msg">' + escapeHtml(message) + '</p>'
    + '<details class="err-code"><summary>' + (chunks.length > 1 ? chunks.length + ' places in the code' : place(chunks[0])) + '</summary>' + code + '</details>'
    + (cited
      ? '<h2 class="err-head">What the docs say</h2>' + cited
      : '<p class="err-none">No ODS guide covers this message by name yet. The closest sections are below.</p>')
    + '</section>';
}

function emptyHtml(query) {
  return '<p class="empty">Nothing in the ODS docs matches "' + escapeHtml(query) + '". Try fewer or different words.</p>';
}

const ISSUES = 'https://github.com/Osmantic/ODS/issues/new?template=bug_report.yml';
const DISCORD = 'https://discord.gg/4ntNp9MAwC';

function issueLink(query) {
  const title = query.trim().replace(/\s+/g, ' ').slice(0, 80);
  return ISSUES + '&title=' + encodeURIComponent(title) + '&description=' + encodeURIComponent(query.trim().slice(0, 1500));
}

function helpHtml(query) {
  return '<p class="help">Didn\'t find your fix? '
    + '<a href="' + escapeHtml(issueLink(query)) + '" target="_blank" rel="noopener">Report it on GitHub</a> (what you typed is filled in for you) or '
    + '<a href="' + DISCORD + '" target="_blank" rel="noopener">ask on the ODS Discord</a>.</p>';
}

if (typeof module !== 'undefined') module.exports = { linkFor, pageFor, whereFrom, hitHtml, answerHtml, emptyHtml, issueLink, helpHtml };
