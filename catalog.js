// The manual's table of contents: which ODS docs get a page, the section
// each one sits in, its title and its one-line description.
//
// buildCatalog() is what build.js writes to catalog.json. The same file is
// meant for the ODS dashboard's offline docs page, so both list the same docs.

const { CATEGORIES, PLACED } = require('./categories.js');
const { docSlug, plainHeading } = require('./slug.js');

function isCatalogDoc(rel) {
  if (!rel.endsWith('.md')) return false;
  if (rel === 'SECURITY.md') return true;
  if (/^ods\/[^/]+\.md$/.test(rel)) return true;
  if (/^ods\/docs\/([^/]+\/)?[^/]+\.md$/.test(rel)) return !rel.startsWith('ods/docs/images/');
  if (rel === 'ods/extensions/CATALOG.md') return true;
  return /^ods\/extensions\/services\/[^/]+\/README\.md$/.test(rel);
}

// Where a doc that isn't in PLACED goes. First matching rule wins.
const RULES = [
  [/^ods\/extensions\/services\//, 'services'],
  [/^ods\/docs\/pixel\/|PORTAL|PIXEL|\/portal-/i, 'pixel'],
  [/TROUBLESHOOT|DOCTOR|SUPPORT-BUNDLE|OFFLINE|RECOVERY/i, 'operations'],
  [/WINDOWS|WSL|MACOS|LINUX|INTEL-ARC|DGX|DOCKER-DESKTOP|HARDWARE|GPU/i, 'platform'],
  [/NETWORK|PROXY|TAILSCALE|HERMES|OAUTH|SSO|MDNS|SECURITY|AP-MODE/i, 'networking'],
  [/EXTENSION|CATALOG|MANIFEST/i, 'extensions'],
  [/QUICKSTART|FAQ|SETUP/i, 'getting-started']
];

function categoryFor(rel) {
  for (const [re, id] of RULES) {
    if (re.test(rel)) return id;
  }
  return 'dev';
}

function firstHeading(text) {
  const m = text.match(/^# +(.+)$/m);
  return m ? plainHeading(m[1].replace(/\s+#+\s*$/, '')) : null;
}

// The first plain paragraph of the doc, cleaned of Markdown, cut to a line.
function describe(text) {
  const blocks = text.replace(/\r/g, '').replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, '').split(/\n\s*\n/);
  for (const block of blocks) {
    const b = block.trim();
    if (!b || /^(#|<|\||!\[|\[!\[|>|[-*_]{3}|[-*+] |\d+\. |\[!)/.test(b)) continue;
    let s = b.replace(/\s*\n\s*/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/(\*\*|__)(.+?)\1/g, '$2')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/(^|\W)[*_](.+?)[*_](?=\W|$)/g, '$1$2')
      .trim();
    if (s.length < 25) continue;
    if (s.length > 200) s = s.slice(0, 200).replace(/\s+\S*$/, '') + '…';
    return s;
  }
  return '';
}

function buildCatalog(docs) {
  const placed = new Map(PLACED.map((p, k) => [p[0], { category: p[1], title: p[2], order: k }]));
  const catOrder = new Map(CATEGORIES.map((c, k) => [c.id, k]));
  const seen = new Map();
  const entries = docs.filter(d => isCatalogDoc(d.path)).map(d => {
    const p = placed.get(d.path);
    const slug = docSlug(d.path);
    if (seen.has(slug)) throw new Error('Two docs map to the page name "' + slug + '": ' + seen.get(slug) + ' and ' + d.path);
    seen.set(slug, d.path);
    return {
      slug: slug,
      path: d.path,
      title: p ? p.title : firstHeading(d.text) || d.path.split('/').pop().replace(/\.md$/, ''),
      description: describe(d.text),
      category: p ? p.category : categoryFor(d.path),
      order: p ? p.order : PLACED.length
    };
  });
  entries.sort((a, b) => catOrder.get(a.category) - catOrder.get(b.category) || a.order - b.order || a.title.localeCompare(b.title));
  return entries;
}

function groupByCategory(entries) {
  return CATEGORIES.map(c => ({ ...c, docs: entries.filter(e => e.category === c.id) })).filter(c => c.docs.length > 0);
}

if (typeof module !== 'undefined') module.exports = { isCatalogDoc, categoryFor, describe, firstHeading, buildCatalog, groupByCategory };
