const { splitMarkdown } = require('./chunk.js');
const test = require('node:test');
const assert = require('node:assert');

test('splitMarkdown returns 3 sections', () => {
  const text = [
    '# Title',
    'Intro line.',
    '## Install',
    'Run the installer.',
    '```bash',
    '# not a heading',
    '```',
    '## Empty',
    '### Models',
    'Pick a model.'
  ].join('\n');
  const chunks = splitMarkdown('a.md', text);
  assert.strictEqual(chunks.length, 3);
});

test('the headings are ["Title", "Install", "Models"]', () => {
  const text = [
    '# Title',
    'Intro line.',
    '## Install',
    'Run the installer.',
    '```bash',
    '# not a heading',
    '```',
    '## Empty',
    '### Models',
    'Pick a model.'
  ].join('\n');
  const chunks = splitMarkdown('a.md', text);
  assert.deepStrictEqual(chunks.map(c => c.heading), ['Title', 'Install', 'Models']);
});

test('the line numbers are [1, 3, 9]', () => {
  const text = [
    '# Title',
    'Intro line.',
    '## Install',
    'Run the installer.',
    '```bash',
    '# not a heading',
    '```',
    '## Empty',
    '### Models',
    'Pick a model.'
  ].join('\n');
  const chunks = splitMarkdown('a.md', text);
  assert.deepStrictEqual(chunks.map(c => c.line), [1, 3, 9]);
});

test('the text of the second section contains "# not a heading"', () => {
  const text = [
    '# Title',
    'Intro line.',
    '## Install',
    'Run the installer.',
    '```bash',
    '# not a heading',
    '```',
    '## Empty',
    '### Models',
    'Pick a model.'
  ].join('\n');
  const chunks = splitMarkdown('a.md', text);
  assert.ok(chunks[1].text.includes('# not a heading'));
});