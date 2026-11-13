// Heading anchors and page names.
// headingId follows GitHub's rule, so "#anchor" links written for GitHub
// also work on this site.

function plainHeading(text) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/`/g, '')
    .replace(/(\*\*|__|~~)(.+?)\1/g, '$2')
    .replace(/(^|\W)[*_](.+?)[*_](?=\W|$)/g, '$1$2')
    .trim();
}

function headingId(text) {
  return plainHeading(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

// Gives each heading a unique id: "setup", "setup-1", "setup-2", ...
function makeSlugger() {
  const seen = new Map();
  return function slug(text) {
    const base = headingId(text) || 'section';
    if (!seen.has(base)) {
      seen.set(base, 0);
      return base;
    }
    let n = seen.get(base) + 1;
    while (seen.has(base + '-' + n)) n++;
    seen.set(base, n);
    seen.set(base + '-' + n, 0);
    return base + '-' + n;
  };
}

// Page name for a doc, from its repo path. Stable as long as the file name is.
function docSlug(rel) {
  if (rel === 'SECURITY.md') return 'security-policy';
  const service = rel.match(/^ods\/extensions\/services\/([^/]+)\/README\.md$/);
  if (service) return 'service-' + service[1].toLowerCase();
  if (rel === 'ods/README.md') return 'overview';
  if (rel === 'ods/extensions/CATALOG.md') return 'extension-catalog';
  if (rel === 'ods/docs/FAQ.md') return 'hardware-faq';
  const base = rel.split('/').pop().replace(/\.md$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (rel.startsWith('ods/docs/pixel/')) return 'pixel-' + base;
  return base;
}

if (typeof module !== 'undefined') module.exports = { plainHeading, headingId, makeSlugger, docSlug };
