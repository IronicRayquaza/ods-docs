const { test } = require('node:test');
const assert = require('node:assert');

Object.assign(globalThis, require('./snippet.js'));
const render = require('./render.js');

const SHA = '201ba0423abc';

test('linkFor pins the GitHub link to the built commit', () => {
  assert.strictEqual(render.linkFor({ file: 'ods/FAQ.md', line: 12 }, SHA), 'https://github.com/Osmantic/ODS/blob/201ba0423abc/ods/FAQ.md?plain=1#L12');
  assert.strictEqual(render.linkFor({ file: 'ods/a.sh', line: 5 }, SHA), 'https://github.com/Osmantic/ODS/blob/201ba0423abc/ods/a.sh#L5');
});

test('pageFor opens the section on this site when it has a page', () => {
  assert.strictEqual(render.pageFor({ file: 'ods/FAQ.md', line: 12, slug: 'faq', anchor: 'what-is-ods' }, SHA), 'docs/faq.html#what-is-ods');
  assert.strictEqual(render.pageFor({ file: 'ods/a.sh', line: 5 }, SHA), render.linkFor({ file: 'ods/a.sh', line: 5 }, SHA));
});

test('cardHtml shows the section as How to ODS did, and opens it in the manual', () => {
  const html = render.cardHtml({ file: 'ods/FAQ.md', heading: 'What is <ODS>?', line: 12, text: 'ODS is a **local** AI stack.', slug: 'faq', anchor: 'what-is-ods' }, ['local'], SHA, { faq: 'Frequently Asked Questions' });
  assert.ok(html.includes('class="title" href="docs/faq.html#what-is-ods"'));
  assert.ok(html.includes('ods/FAQ.md · line 12'));
  assert.ok(html.includes('/blob/201ba0423abc/ods/FAQ.md?plain=1#L12'));
  assert.ok(html.includes('&lt;ODS&gt;') && !html.includes('<ODS>'));
  assert.ok(html.includes('ODS is a <mark>local</mark> AI stack.'));
  assert.ok(html.includes('<pre>ODS is a **local** AI stack.</pre>'), 'the full section is the Markdown as written');
  assert.ok(html.includes('<a class="in-manual" href="docs/faq.html#what-is-ods">Read it in Frequently Asked Questions →</a>'));
  assert.ok(!render.cardHtml({ file: 'ods/x.md', heading: 'X', line: 1, text: 'y' }, [], SHA, {}).includes('in-manual'), 'no manual link without a page');
});

test('errorCardHtml lists every place that prints the message', () => {
  const a = { file: 'ods/installers/windows/ods.ps1', heading: 'Error: Docker Desktop is not running.', line: 91, text: 'Docker Desktop is not running.', kind: 'error' };
  const b = { file: 'ods/installers/macos/ods-macos.sh', heading: a.heading, line: 94, text: 'x', kind: 'error' };
  const html = render.errorCardHtml({ message: a.heading, chunks: [a, b] }, ['docker'], SHA);
  assert.ok(html.includes('Where this error comes from'));
  assert.ok(html.includes('Printed by the Windows ods command and the macOS ods command.'));
  assert.ok(html.includes('Also at <a href="https://github.com/Osmantic/ODS/blob/201ba0423abc/ods/installers/macos/ods-macos.sh#L94"'));
});

test('guidesHtml opens each guide at its best section and says why a guide is first', () => {
  const best = { file: 'ods/docs/TROUBLESHOOTING.md', heading: 'Docker', slug: 'troubleshooting', anchor: 'docker' };
  const html = render.guidesHtml([{ slug: 'troubleshooting', best: best, cited: 'quote' }], SHA, { troubleshooting: 'Troubleshooting Master Guide' });
  assert.ok(html.includes('Start with these guides'));
  assert.ok(html.includes('href="docs/troubleshooting.html#docker"'));
  assert.ok(html.includes('Troubleshooting Master Guide') && html.includes('Quotes this error'));
  assert.strictEqual(render.guidesHtml([], SHA, {}), '');
});

test('whereFrom names the part of ODS a script belongs to', () => {
  assert.strictEqual(render.whereFrom('ods/installers/windows/phases/01-preflight.ps1'), 'the Windows installer, step 01 (preflight)');
  assert.strictEqual(render.whereFrom('ods/installers/macos/install-macos.sh'), 'the macOS installer');
  assert.strictEqual(render.whereFrom('ods/ods-cli'), 'the ods command');
  assert.strictEqual(render.whereFrom('ods/scripts/pre-download.sh'), 'the pre-download.sh script');
});

test('emptyHtml("<x>") contains "&lt;x&gt;"', () => {
  assert.ok(render.emptyHtml('<x>').includes('&lt;x&gt;'));
});
