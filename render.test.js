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

test('hitHtml cites the section, the guide it is in, and a plain-text snippet', () => {
  const html = render.hitHtml({ file: 'ods/FAQ.md', heading: 'What is <ODS>?', line: 12, text: 'ODS is a **local** AI stack.', slug: 'faq', anchor: 'what-is-ods' }, ['local'], SHA, { faq: 'Frequently Asked Questions' }, 'Exact match');
  assert.ok(html.includes('href="docs/faq.html#what-is-ods"'));
  assert.ok(html.includes('&lt;ODS&gt;') && !html.includes('<ODS>'));
  assert.ok(html.includes('Frequently Asked Questions'));
  assert.ok(html.includes('ODS is a <mark>local</mark> AI stack.'));
  assert.ok(html.includes('Exact match'));
  assert.ok(!html.includes('github.com'));
});

test('answerHtml shows where ODS prints the error and the sections that cover it', () => {
  const docs = [
    { file: 'ods/docs/TROUBLESHOOTING.md', heading: 'Docker', line: 5, text: 'Start Docker first.', slug: 'troubleshooting', anchor: 'docker' },
    { file: 'ods/installers/phases/05-docker.sh', heading: 'Error: Docker is not running.', line: 3, text: 'Docker is not running.\n\nDocker must be up.\n\nerror "Docker is not running."', kind: 'error', see: [{ i: 0, by: 'quote' }] }
  ];
  const html = render.answerHtml({ message: docs[1].heading, chunks: [docs[1]] }, ['docker'], SHA, docs, { troubleshooting: 'Troubleshooting' });
  assert.ok(html.includes('Printed by the Linux installer, step 05 (docker)'));
  assert.ok(html.includes('05-docker.sh, line 3'));
  assert.ok(html.includes('/blob/201ba0423abc/ods/installers/phases/05-docker.sh#L3'));
  assert.ok(html.includes('What the docs say'));
  assert.ok(html.includes('href="docs/troubleshooting.html#docker"'));
  assert.ok(html.includes('Quotes this message'));
  docs[1].see = undefined;
  assert.ok(render.answerHtml({ message: docs[1].heading, chunks: [docs[1]] }, [], SHA, docs, {}).includes('No ODS guide covers this message by name yet'));
  const mac = { file: 'ods/installers/macos/ods-macos.sh', heading: docs[1].heading, line: 94, text: 'x', kind: 'error', see: [{ i: 0, by: 'ref' }] };
  const both = render.answerHtml({ message: docs[1].heading, chunks: [docs[1], mac] }, [], SHA, docs, { troubleshooting: 'Troubleshooting' });
  assert.ok(both.includes('Printed by the Linux installer, step 05 (docker) and the macOS ods command'));
  assert.ok(both.includes('2 places in the code'));
  assert.strictEqual(both.split('docs/troubleshooting.html#docker').length, 2, 'a section both places cite is listed once');
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
