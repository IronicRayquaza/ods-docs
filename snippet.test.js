import { escapeHtml, makeSnippet, highlight } from './snippet.js';
import { test } from 'node:test';
import assert from 'node:assert';

test('escapeHtml("<b>\"x\" & y\"</b>") is "&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;"', () => {
  assert.strictEqual(escapeHtml('<b>"x" & y</b>'), '&lt;b&gt;&quot;x&quot; &amp; y&lt;/b&gt;');
});

test('makeSnippet("short text here", ["text"], 100) is "short text here"', () => {
  assert.strictEqual(makeSnippet('short text here', ['text'], 100), 'short text here');
});

test('makeSnippet on long text with "model" starts with …, ends with …, and contains "model"', () => {
  const long = 'a'.repeat(100) + ' model ' + 'b'.repeat(100);
  const result = makeSnippet(long, ['model'], 80);
  assert.strictEqual(result.startsWith('…'), true);
  assert.strictEqual(result.endsWith('…'), true);
  assert.ok(result.includes('model'));
});

test('highlight("Switch the model", ["model"]) is "Switch the <mark>model</mark>"', () => {
  assert.strictEqual(highlight('Switch the model', ['model']), 'Switch the <mark>model</mark>');
});

test('highlight("a &lt; b", ["lt"]) is "a &lt; b"', () => {
  assert.strictEqual(highlight('a &lt; b', ['lt']), 'a &lt; b');
});
test('plainText reads Markdown the way the page shows it', async () => {
  const { plainText } = await import('./snippet.js');
  assert.strictEqual(plainText('**Symptoms:**\n```\nDocker is not running.\n```\nSee [the guide](x.md) and `ods start`.\n| A | B |\n|---|---|\n| one | two |'), 'Symptoms: Docker is not running. See the guide and ods start. A · B one · two');
});

test('highlight marks whole words, not the inside of other words', () => {
  assert.strictEqual(highlight('Docker cannot start, not now', ['not']), 'Docker cannot start, <mark>not</mark> now');
  assert.strictEqual(highlight('re-run when it reports ready', ['re']), '<mark>re</mark>-run when it reports ready');
  assert.strictEqual(highlight('builders build', ['build']), '<mark>build</mark>ers <mark>build</mark>');
});
