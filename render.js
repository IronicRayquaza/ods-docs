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

function guideOf(chunk, titles) {
  return (chunk.slug && titles[chunk.slug]) || chunk.file.split('/').pop();
}

// A section before a guide's first heading has the file name as its
// heading; show the guide's title instead.
function sectionTitle(chunk, titles) {
  return chunk.heading === chunk.file ? guideOf(chunk, titles) : chunk.heading;
}

// One search result, as How to ODS showed it: the section, where it is in
// the repo, what it says, and the whole section as written. When the guide
// has a page on this site, the result also opens that part of it.
function cardHtml(chunk, terms, sha, titles) {
  const manual = chunk.slug
    ? '<a class="in-manual" href="' + pageFor(chunk, sha) + '">Read it in ' + escapeHtml(guideOf(chunk, titles)) + ' →</a>'
    : '';
  return '<article class="card">'
    + '<a class="title" href="' + pageFor(chunk, sha) + '">' + headingHtml(sectionTitle(chunk, titles)) + '</a>'
    + '<div class="path">' + escapeHtml(chunk.file) + ' · line ' + chunk.line + ' · <a href="' + linkFor(chunk, sha) + '" target="_blank" rel="noopener">View on GitHub ↗</a></div>'
    + '<p class="snip">' + highlight(escapeHtml(makeSnippet(chunk.text, terms, 220)), terms) + '</p>'
    + manual
    + '<details><summary>Show the full section</summary><pre>' + escapeHtml(chunk.text) + '</pre></details>'
    + '</article>';
}

function listing(names) {
  return names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

// An error message ODS prints (group: { message, chunks } from
// groupErrors), with every place that prints it.
function errorCardHtml(group, terms, sha) {
  const first = group.chunks[0];
  const others = group.chunks.slice(1, 4).map(c => '<a href="' + linkFor(c, sha) + '" target="_blank" rel="noopener">' + escapeHtml(c.file.split('/').pop()) + ' line ' + c.line + ' ↗</a>');
  return '<article class="card card-error">'
    + '<div class="tag">Where this error comes from</div>'
    + '<a class="title" href="' + linkFor(first, sha) + '" target="_blank" rel="noopener">' + highlight(escapeHtml(group.message), terms) + '</a>'
    + '<div class="path">' + escapeHtml(first.file) + ' · line ' + first.line + ' · <a href="' + linkFor(first, sha) + '" target="_blank" rel="noopener">View on GitHub ↗</a></div>'
    + '<p class="err-by">Printed by ' + escapeHtml(listing([...new Set(group.chunks.map(c => whereFrom(c.file)))])) + '.'
    + (others.length > 0 ? ' Also at ' + others.join(', ') + '.' : '') + '</p>'
    + '<details><summary>Show the full section</summary><pre>' + escapeHtml(first.text) + '</pre></details>'
    + '</article>';
}

const CITED_BY = { ref: 'The error points here', quote: 'Quotes this error' };

const DOC_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>';
const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

// The guides to read first (topGuides in search.js), each opening at the
// section that matched best: a grouped list, one row per guide.
function guidesHtml(guides, sha, titles) {
  if (guides.length === 0) return '';
  return '<section class="guides" aria-labelledby="guides-head"><h2 id="guides-head">Start with these guides</h2><ol>'
    + guides.map(g => '<li><a href="' + pageFor(g.best, sha) + '">'
      + '<span class="g-icon">' + DOC_ICON + '</span>'
      + '<span class="g-text"><span class="g-title">' + escapeHtml(titles[g.slug] || g.slug) + '</span>'
      + '<span class="g-sec">' + headingHtml(sectionTitle(g.best, titles))
      + (g.cited ? '<span class="g-note"> · ' + CITED_BY[g.cited] + '</span>' : '') + '</span></span>'
      + '<span class="g-chev">' + CHEVRON + '</span></a></li>').join('')
    + '</ol></section>';
}

function emptyHtml(query) {
  return '<p class="empty">Nothing in the ODS repo matches "' + escapeHtml(query) + '". Try fewer or different words.</p>';
}

const ISSUES = 'https://github.com/Osmantic/ODS/issues/new?template=bug_report.yml';
const DISCORD = 'https://discord.gg/4ntNp9MAwC';

function issueLink(query) {
  const title = query.trim().replace(/\s+/g, ' ').slice(0, 80);
  return ISSUES + '&title=' + encodeURIComponent(title) + '&description=' + encodeURIComponent(query.trim().slice(0, 1500));
}

function helpHtml(query) {
  return '<div class="help"><strong>Did not find your fix?</strong> '
    + '<a href="' + escapeHtml(issueLink(query)) + '" target="_blank" rel="noopener">Report it on GitHub</a> (what you typed is filled in for you) or '
    + '<a href="' + DISCORD + '" target="_blank" rel="noopener">ask on the ODS Discord</a>.</div>';
}

if (typeof module !== 'undefined') module.exports = { linkFor, pageFor, whereFrom, cardHtml, errorCardHtml, guidesHtml, emptyHtml, issueLink, helpHtml };
