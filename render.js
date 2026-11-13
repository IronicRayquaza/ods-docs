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

function cardHtml(chunk, terms, sha) {
  const tag = chunk.kind === 'error' ? '<div class="tag">Where this error comes from</div>' : '';
  const source = linkFor(chunk, sha);
  return '<article class="card">' + tag
    + '<a class="title" href="' + pageFor(chunk, sha) + '">' + highlight(escapeHtml(chunk.heading), terms) + '</a>'
    + '<div class="path">' + escapeHtml(chunk.file) + ' · line ' + chunk.line + ' · <a href="' + source + '" target="_blank" rel="noopener">View on GitHub ↗</a></div>'
    + '<p class="snip">' + highlight(escapeHtml(makeSnippet(chunk.text, terms, 220)), terms) + '</p>'
    + '<details><summary>Show the full section</summary><pre>' + escapeHtml(chunk.text) + '</pre></details>'
    + '</article>';
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

if (typeof module !== 'undefined') module.exports = { linkFor, pageFor, cardHtml, emptyHtml, issueLink, helpHtml };
