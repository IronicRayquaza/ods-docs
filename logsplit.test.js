const { test, deepEqual, equal } = require('node:test');
const assert = require('node:assert');

const { errorLines, mergeResults } = require('./logsplit.js');

const log = ['[INFO] Phase 05: Docker', '[ERROR] Failed to install NVIDIA Container Toolkit.', '[OK] Docker found', '   [XX] Not enough free space on D: for the model download.', '[ERROR] Failed to install NVIDIA Container Toolkit.', 'short error:'].join('\n');

test('errorLines(log) deep-equals expected array', () => {
  assert.deepStrictEqual(errorLines(log), ['[ERROR] Failed to install NVIDIA Container Toolkit.', '[XX] Not enough free space on D: for the model download.']);
});

test('errorLines non-error text returns empty array', () => {
  assert.deepStrictEqual(errorLines('[ERROR] Failed to install NVIDIA Container Toolkit.'), []);
  assert.deepStrictEqual(errorLines(['[INFO] all good here', '[OK] done here today'].join('\n')), []);
});

test('errorLines returns 5 lines for 6 error lines', () => {
  const result = errorLines(['[ERROR] step one broke', '[ERROR] step two broke', '[ERROR] step three broke', '[ERROR] step four broke', '[ERROR] step five broke', '[ERROR] step six broke'].join('\n'));
  assert.strictEqual(result.length, 5);
});

test('mergeResults deduplicates and limits', () => {
  const a = { chunk: { file: 'a.md', line: 1 } };
  const b = { chunk: { file: 'b.md', line: 2 } };
  const c = { chunk: { file: 'c.md', line: 3 } };
  
  assert.deepStrictEqual(mergeResults([[a, b], [b, c]], 10).map(r => r.chunk.file), ['a.md', 'b.md', 'c.md']);
  assert.deepStrictEqual(mergeResults([[a, b], [c]], 2).map(r => r.chunk.file), ['a.md', 'b.md']);
});
