const test = require('node:test');
const assert = require('node:assert');
const { isCatalogDoc, categoryFor, describe, buildCatalog, groupByCategory } = require('./catalog.js');

test('isCatalogDoc picks the docs that get a page', () => {
  for (const p of ['ods/docs/FAQ.md', 'ods/FAQ.md', 'SECURITY.md', 'ods/docs/pixel/APPROVAL-TERMINAL.md', 'ods/extensions/services/n8n/README.md', 'ods/extensions/CATALOG.md']) {
    assert.strictEqual(isCatalogDoc(p), true, p);
  }
  for (const p of ['README.md', 'ods/docs/images/x.md', 'ods/docs/pixel/upstream/README.md', 'ods/tests/README.md', 'ods/extensions/library/services/aider/README.md', 'ods/docs/FAQ.txt']) {
    assert.strictEqual(isCatalogDoc(p), false, p);
  }
});

test('categoryFor places new docs by name', () => {
  assert.strictEqual(categoryFor('ods/docs/WINDOWS-NEW-THING.md'), 'platform');
  assert.strictEqual(categoryFor('ods/docs/NEW-TROUBLESHOOTING.md'), 'operations');
  assert.strictEqual(categoryFor('ods/docs/pixel/NOTES.md'), 'pixel');
  assert.strictEqual(categoryFor('ods/extensions/services/tts/README.md'), 'services');
  assert.strictEqual(categoryFor('ods/docs/SOMETHING.md'), 'dev');
});

test('describe returns the first plain paragraph, without Markdown', () => {
  const text = '# Title\n\n![badge](x.svg)\n\n> note\n\nThis guide shows **how** to [install ODS](a.md) with `ods`.\n\nMore.';
  assert.strictEqual(describe(text), 'This guide shows how to install ODS with ods.');
  assert.ok(describe('# T\n\n' + 'word '.repeat(80)).endsWith('…'));
});

test('buildCatalog uses curated titles and places, then rules and H1s', () => {
  const docs = [
    { path: 'ods/docs/ZZZ-NEW.md', text: '# A Brand New Guide\n\nIt explains a brand new thing in ODS.' },
    { path: 'ods/QUICKSTART.md', text: '# ODS Quickstart\n\nInstall ODS with one command on your machine.' },
    { path: 'ods/docs/images/x.png', text: '' }
  ];
  const c = buildCatalog(docs);
  assert.deepStrictEqual(c.map(e => [e.slug, e.category, e.title]), [
    ['quickstart', 'getting-started', 'Quickstart Guide'],
    ['zzz-new', 'dev', 'A Brand New Guide']
  ]);
  assert.strictEqual(c[1].description, 'It explains a brand new thing in ODS.');
  assert.deepStrictEqual(groupByCategory(c).map(g => g.id), ['getting-started', 'dev']);
});

test('buildCatalog stops when two docs would share a page', () => {
  assert.throws(() => buildCatalog([{ path: 'ods/docs/A-B.md', text: '' }, { path: 'ods/docs/A_B.md', text: '' }]), /page name "a-b"/);
});
