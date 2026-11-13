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

test('cardHtml html contains expected values and exclusions', () => {
  const html = render.cardHtml({ file: 'ods/FAQ.md', heading: 'What is <ODS>?', line: 12, text: 'ODS is a local AI stack.', slug: 'faq', anchor: 'what-is-ods' }, ['local'], SHA);
  assert.ok(html.includes('href="docs/faq.html#what-is-ods"'));
  assert.ok(html.includes('/blob/201ba0423abc/ods/FAQ.md?plain=1#L12'));
  assert.ok(html.includes('&lt;ODS&gt;'));
  assert.ok(html.includes('<mark>local</mark>'));
  assert.ok(!html.includes('<ODS>'));
  assert.ok(!html.includes('Where this error comes from'));
});

test('cardHtml for error kind contains tag', () => {
  const html = render.cardHtml({ file: 'ods/a.sh', heading: 'Error: Docker is not running.', line: 5, text: 'Docker is not running.', kind: 'error' }, ['docker'], SHA);
  assert.ok(html.includes('Where this error comes from'));
});

test('emptyHtml("<x>") contains "&lt;x&gt;"', () => {
  assert.ok(render.emptyHtml('<x>').includes('&lt;x&gt;'));
});
