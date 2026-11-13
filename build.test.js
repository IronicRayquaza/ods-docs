const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { build, makeResolver } = require('./build.js');

const SHA = 'abc1234def';
const slugs = new Map([['ods/QUICKSTART.md', 'quickstart'], ['ods/docs/FAQ.md', 'hardware-faq']]);

test('makeResolver sends doc links to pages and everything else to the pinned commit', () => {
  const r = makeResolver('ods/docs/README.md', slugs, SHA, '../');
  assert.strictEqual(r('../QUICKSTART.md#install', false), '../docs/quickstart.html#install');
  assert.strictEqual(r('FAQ.md', false), '../docs/hardware-faq.html');
  assert.strictEqual(r('/ods/QUICKSTART.md', false), '../docs/quickstart.html');
  assert.strictEqual(r('../scripts/doctor.sh', false), 'https://github.com/Osmantic/ODS/blob/abc1234def/ods/scripts/doctor.sh');
  assert.strictEqual(r('images/a%20b.png', true), 'https://raw.githubusercontent.com/Osmantic/ODS/abc1234def/ods/docs/images/a b.png');
  assert.strictEqual(r('https://example.com/x', false), 'https://example.com/x');
  assert.strictEqual(r('#local', false), '#local');
  assert.strictEqual(r('javascript:alert(1)', false), '#');
  assert.strictEqual(r('../../../etc/passwd', false), '#');
});

function write(root, rel, text) {
  fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
}

function fixture(recipeFiles) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ods-docs-src-'));
  write(root, 'ods/QUICKSTART.md', '# ODS Quickstart\n\nInstall ODS on your own machine with one command.\n\n## Install\n\nRun the installer and wait for it to finish.\n');
  write(root, 'ods/FAQ.md', '# ODS FAQ\n\nAnswers to the questions people ask most about ODS.\n\n## Where are the logs?\n\nUse `ods logs` to read the logs of every service.\n');
  write(root, 'ods/docs/README.md', '# Index\n\n## Start Here By Job\n\n| I want to... | Read |\n|---|---|\n| Install | [../QUICKSTART.md](../QUICKSTART.md) |\n\n## Other\n');
  write(root, 'ods/docs/WINDOWS-QUICKSTART.md', '# Windows\n\nInstall ODS on Windows from a normal PowerShell window.\n\nSee [the quickstart](../QUICKSTART.md#install).\n');
  write(root, 'ods/installers/phases/05-docker.sh', '#!/bin/bash\n# Docker must be running.\nerror "Docker is not running. Start Docker and re-run."\n');
  for (const f of recipeFiles) if (!fs.existsSync(path.join(root, f))) write(root, f, '# ' + f + '\n\nA placeholder guide used by a recipe in this test.\n');
  const git = (args) => execFileSync('git', ['-C', root].concat(args), { stdio: 'pipe' });
  git(['init', '-q']);
  git(['add', '.']);
  git(['-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '-qm', 'fixture']);
  return root;
}

test('build writes pages, a pinned search index, the catalog and the home page', () => {
  const recipeFiles = [...new Set(require('./recipes.js').RECIPES.flatMap(r => r.files))];
  const root = fixture(recipeFiles);
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ods-docs-out-'));
  const r = build(root, out);
  const sha = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

  assert.strictEqual(r.build.sha, sha);
  assert.ok(fs.existsSync(path.join(out, 'docs', 'quickstart.html')));
  assert.ok(fs.existsSync(path.join(out, 'fonts', 'inter-latin.woff2')));

  const win = fs.readFileSync(path.join(out, 'docs', 'windows-quickstart.html'), 'utf8');
  assert.ok(win.includes('<a href="../docs/quickstart.html#install">the quickstart</a>'));
  assert.ok(win.includes('/blob/' + sha + '/ods/docs/WINDOWS-QUICKSTART.md'));
  assert.ok(win.includes('Osmantic/ODS ' + sha.slice(0, 7)));

  const { DOCS, BUILD } = require(path.join(out, 'data.js'));
  assert.strictEqual(BUILD.sha, sha);
  const logs = DOCS.find(c => c.heading === 'Where are the logs?');
  assert.strictEqual(logs.slug, 'faq');
  assert.strictEqual(logs.anchor, 'where-are-the-logs');
  assert.strictEqual(DOCS.find(c => c.file === 'ods/docs/WINDOWS-QUICKSTART.md').p, 'windows');
  assert.ok(DOCS.some(c => c.kind === 'error' && c.line === 3));

  const catalog = JSON.parse(fs.readFileSync(path.join(out, 'catalog.json'), 'utf8'));
  assert.strictEqual(catalog.source.sha, sha);
  assert.ok(catalog.docs.some(d => d.slug === 'quickstart' && d.category === 'getting-started'));

  const home = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
  assert.ok(home.includes('<a href="docs/quickstart.html">Quickstart Guide</a>'));
});

test('build stops when a recipe points at a doc that is gone', () => {
  const root = fixture([]);
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ods-docs-out-'));
  assert.throws(() => build(root, out), /Fix recipes\.js/);
});
