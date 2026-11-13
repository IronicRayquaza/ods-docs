// Builds the whole site from a checkout of Osmantic/ODS:
//
//   node build.js <ods-checkout> <out-dir>
//
// Writes one page per doc (docs/<name>.html), the home page, the search
// index (data.js), catalog.json, and copies the static files next to them.
// Any problem (a recipe pointing at a missing doc, two docs with one page
// name) stops the build, so a broken site is never published.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { splitMarkdown } = require('./chunk.js');
const { shouldInclude, isErrorSource } = require('./include.js');
const { errorChunks } = require('./errors.js');
const { buildCatalog, groupByCategory } = require('./catalog.js');
const { renderMarkdown } = require('./markdown.js');
const { docPage, homePage, checkPage, DISCORD } = require('./pages.js');
const { KINDS, OSES, supportRowFor, isComputed, parseSupportMatrix } = require('./checker.js');
const { askOds } = require('./oracle.js');
const { platformOf } = require('./platform.js');
const { RECIPES } = require('./recipes.js');

const RAW = 'https://raw.githubusercontent.com/Osmantic/ODS/';
const BLOB = 'https://github.com/Osmantic/ODS/blob/';
const STATIC = ['style.css', 'ods-logo.png', '.nojekyll', 'search.js', 'platform.js', 'snippet.js', 'recipes.js', 'render.js', 'logsplit.js', 'app.js', 'check.js'];

function walk(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walk(full));
    else if (entry.isFile()) found.push(full);
  }
  return found;
}

function buildInfo(root) {
  const git = (args) => execFileSync('git', ['-C', root].concat(args), { encoding: 'utf8' }).trim();
  return { sha: git(['rev-parse', 'HEAD']), date: git(['log', '-1', '--format=%cI']) };
}

// Turns a link written in a doc into the href to use on a page.
// prefix is the path from that page back to the site root.
function repoTarget(docPath, url) {
  const hash = url.indexOf('#');
  const rawPath = (hash >= 0 ? url.slice(0, hash) : url).replace(/\?.*$/, '');
  let target;
  try {
    target = decodeURI(rawPath);
  } catch (err) {
    if (!(err instanceof URIError)) throw err;
    target = rawPath;
  }
  target = target.startsWith('/') ? target.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(docPath), target));
  return target.replace(/\/$/, '');
}

function makeResolver(docPath, slugs, sha, prefix) {
  return function resolve(url, isImage) {
    if (/^(https?:|mailto:)/i.test(url)) return url;
    if (url.startsWith('#')) return url;
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return '#';
    const hash = url.indexOf('#');
    const frag = hash >= 0 ? url.slice(hash) : '';
    const target = repoTarget(docPath, url);
    if (target.startsWith('../') || target === '..') return '#';
    if (!isImage && slugs.has(target)) return prefix + 'docs/' + slugs.get(target) + '.html' + frag;
    if (isImage) return RAW + sha + '/' + target;
    return BLOB + sha + '/' + target + frag;
  };
}

// The catalog title for a link that points at a doc with a page, else null.
function makeTitles(docPath, catalog) {
  const byPath = new Map(catalog.map(e => [e.path, e.title]));
  return (url) => (/^[a-z][a-z0-9+.-]*:|^#/i.test(url) ? null : byPath.get(repoTarget(docPath, url)) || null);
}

// The "Start Here By Job" table from ods/docs/README.md, for the home page.
function startSection(text) {
  const m = text.match(/^## Start Here By Job\s*$([\s\S]*?)(?=^## )/m);
  if (!m) throw new Error('ods/docs/README.md has no "## Start Here By Job" section; update startSection() in build.js');
  return m[1];
}

function build(root, out, options = {}) {
  const build = buildInfo(root);
  const files = walk(root).map(f => path.relative(root, f).split(path.sep).join('/')).sort();
  const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

  const catalog = buildCatalog(files.filter(f => f.endsWith('.md')).map(f => ({ path: f, text: read(f) })));
  const groups = groupByCategory(catalog);
  const slugs = new Map(catalog.map(e => [e.path, e.slug]));

  for (const r of RECIPES) {
    for (const f of r.files) {
      if (!slugs.has(f)) throw new Error('Recipe "' + r.title + '" points at ' + f + ', which is not in the ODS repo any more. Fix recipes.js.');
    }
  }

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'docs'), { recursive: true });

  // One page per doc. Keep each doc's heading ids for the search index.
  const anchors = new Map();
  for (const entry of catalog) {
    const text = read(entry.path);
    const r = renderMarkdown(text, { resolve: makeResolver(entry.path, slugs, build.sha, '../'), titleFor: makeTitles(entry.path, catalog) });
    anchors.set(entry.path, new Map(r.headings.map(h => [h.line, h.id])));
    fs.writeFileSync(path.join(out, 'docs', entry.slug + '.html'), docPage({ entry: entry, html: r.html, headings: r.headings, groups: groups, build: build }));
  }

  // Search index.
  const chunks = [];
  let errorCount = 0;
  for (const rel of files) {
    if (shouldInclude(rel)) {
      for (const section of splitMarkdown(rel, read(rel))) {
        if (section.text.length < 40) continue;
        if (slugs.has(rel)) {
          section.slug = slugs.get(rel);
          const id = anchors.get(rel).get(section.line);
          if (id) section.anchor = id;
        }
        const p = platformOf(rel, section.heading);
        if (p) section.p = p;
        chunks.push(section);
      }
    } else if (isErrorSource(rel)) {
      for (const item of errorChunks(rel, read(rel))) {
        const p = platformOf(rel, '');
        if (p) item.p = p;
        chunks.push(item);
        errorCount++;
      }
    }
  }
  fs.writeFileSync(path.join(out, 'data.js'),
    'const DOCS = ' + JSON.stringify(chunks) + ';\nconst BUILD = ' + JSON.stringify(build) + ';\n'
    + 'if (typeof module !== "undefined") { module.exports = { DOCS, BUILD }; }\n');

  fs.writeFileSync(path.join(out, 'catalog.json'), JSON.stringify({ source: { repo: 'Osmantic/ODS', sha: build.sha, date: build.date }, categories: groups.map(g => ({ id: g.id, title: g.title, description: g.description })), docs: catalog }, null, 1) + '\n');

  const checker = options.checker !== false ? writeChecker(root, out, build, groups, slugs, read, catalog) : null;
  const example = checker && checker.results['windows|nvidia|8|16'];

  const startText = startSection(read('ods/docs/README.md'));
  const start = renderMarkdown(startText, { resolve: makeResolver('ods/docs/README.md', slugs, build.sha, ''), titleFor: makeTitles('ods/docs/README.md', catalog) });
  fs.writeFileSync(path.join(out, 'index.html'), homePage({ groups: groups, build: build, startHtml: start.html, count: catalog.length, example: example ? { machine: 'Windows, NVIDIA 8 GB, 16 GB RAM', model: example.model.name, context: example.model.context, sizeMb: example.model.sizeMb } : null }));


  for (const f of STATIC) fs.copyFileSync(path.join(__dirname, f), path.join(out, f));
  fs.cpSync(path.join(__dirname, 'fonts'), path.join(out, 'fonts'), { recursive: true });

  return { pages: catalog.length, sections: chunks.length, errors: errorCount, build: build };
}

// "Will ODS run on my machine?": ODS's own answers for every machine on the
// page (oracle.js), the support-matrix rows that cover them, and the page.
function writeChecker(root, out, build, groups, slugs, read, catalog) {
  const matrixPath = 'ods/docs/SUPPORT-MATRIX.md';
  const rows = parseSupportMatrix(read(matrixPath));
  const support = {};
  const supportRows = {};
  const computed = {};
  for (const k of KINDS) {
    for (const os of k.os) {
      const name = supportRowFor(os, k.id);
      computed[os + '|' + k.id] = isComputed(os, k.id);
      if (!name) continue;
      if (!rows[name]) throw new Error('SUPPORT-MATRIX.md has no "' + name + '" row any more; update supportRowFor() in checker.js');
      supportRows[os + '|' + k.id] = name;
      const details = renderMarkdown(rows[name].details, { resolve: makeResolver(matrixPath, slugs, build.sha, ''), titleFor: makeTitles(matrixPath, catalog) }).html.replace(/^<p>|<\/p>$/g, '');
      support[name] = { status: rows[name].status, detailsHtml: details };
    }
  }
  for (const slug of ['windows-quickstart', 'macos-quickstart', 'quickstart', 'intel-arc-guide', 'support-matrix']) {
    if (![...slugs.values()].includes(slug)) throw new Error('The checker links to docs/' + slug + '.html, which no longer exists; update check.js');
  }
  const data = { build: build, discord: DISCORD, oses: OSES, kinds: KINDS, support: support, supportRows: supportRows, computed: computed, results: askOds(root) };
  fs.writeFileSync(path.join(out, 'checker-data.js'), 'const CHECKER = ' + JSON.stringify(data) + ';\nif (typeof module !== "undefined") { module.exports = { CHECKER }; }\n');
  fs.writeFileSync(path.join(out, 'check.html'), checkPage({ groups: groups, build: build }));
  return data;
}

if (require.main === module) {
  const [root, out] = process.argv.slice(2);
  if (!root || !out) {
    console.error('Usage: node build.js <ods-checkout> <out-dir>');
    process.exit(2);
  }
  const r = build(root, out);
  console.log(r.pages + ' pages and ' + r.sections + ' search sections (' + r.errors + ' error messages) written to ' + out + ' from Osmantic/ODS ' + r.build.sha.slice(0, 7));
}

module.exports = { build, makeResolver, makeTitles, repoTarget, startSection };
