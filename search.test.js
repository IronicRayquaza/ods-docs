const test = require('node:test');
const assert = require('node:assert');
const { tokenize, search, pickResults, groupErrors, wholeMessageIn } = require('./search.js');

const docs = [
  { file: 'ods/docs/MODEL-MANAGEMENT.md', heading: 'Switching models', line: 10, text: 'Run ods model switch to change the model.' },
  { file: 'ods/FAQ.md', heading: 'Where are the logs?', line: 290, text: 'Use docker logs to see service logs.' },
  { file: 'ods/docs/NETWORK.md', heading: 'LAN access', line: 5, text: 'Open the dashboard from another device.' },
  { file: 'ods/docs/TROUBLESHOOTING.md', heading: 'NVIDIA Container Toolkit Missing', line: 63, text: 'Install the NVIDIA Container Toolkit, then restart Docker.' },
  { file: 'ods/installers/phases/05-docker.sh', heading: 'Error: Failed to install NVIDIA Container Toolkit.', line: 623, text: 'Failed to install NVIDIA Container Toolkit.', kind: 'error' },
  { file: 'ods/installers/windows/lib/disk.ps1', heading: 'Error: Not enough free space on $drive for the model download.', line: 40, text: 'Not enough free space on $drive for the model download.', kind: 'error' }
];

const list = [
  { score: 150, exact: true, chunk: { kind: 'error', line: 1 } },
  { score: 140, exact: true, chunk: { kind: 'error', line: 2 } },
  { score: 130, exact: false, chunk: { line: 3 } },
  { score: 120, exact: false, chunk: { kind: 'error', line: 4 } },
  { score: 10, exact: false, chunk: { line: 5 } },
  { score: 5, exact: false, chunk: { line: 6 } }
];

test('tokenize', () => {
  assert.deepStrictEqual(tokenize('How do I switch the model?'), ['switch', 'model']);
  assert.deepStrictEqual(tokenize('port 3000 failed'), ['port', 'failed']);
});

test('switch model', () => {
  assert.strictEqual(search(docs, 'switch model', 5)[0].chunk.heading, 'Switching models');
});

test('pasted error', () => {
  const first = search(docs, '[ERROR] Failed to install NVIDIA Container Toolkit.', 5)[0];
  assert.strictEqual(first.chunk.line, 623);
  assert.strictEqual(first.exact, true);
});

test('pasted error with a variable', () => {
  const first = search(docs, '  [XX] Not enough free space on D: for the model download.', 5)[0];
  assert.strictEqual(first.chunk.line, 40);
  assert.strictEqual(first.exact, true);
});

test('plain question about the toolkit', () => {
  const results = search(docs, 'container toolkit missing', 5);
  assert.strictEqual(results[0].chunk.line, 63);
  assert.ok(results.every(r => r.exact === false));
});

test('logs', () => {
  const results = search(docs, 'logs', 5);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].chunk.line, 290);
});

test('no match', () => {
  assert.deepStrictEqual(search(docs, 'how do i', 5), []);
  assert.deepStrictEqual(search(docs, 'zebra', 5), []);
});

test('pickResults keeps every exact error and the top sections', () => {
  assert.deepStrictEqual(pickResults(list, 2).map(r => r.chunk.line), [1, 2, 3, 5]);
  assert.deepStrictEqual(pickResults(list.slice(2), 5).map(r => r.chunk.line), [3, 5, 6]);
});

test('groupErrors puts one message printed in several places together', () => {
  const a = { kind: 'error', heading: 'Error: Docker Desktop is not running.', file: 'ods/installers/macos/ods-macos.sh' };
  const b = { kind: 'error', heading: 'Error: Docker Desktop is not running.', file: 'ods/installers/windows/ods.ps1' };
  const c = { kind: 'error', heading: 'Error: Something else broke here.', file: 'ods/ods-cli' };
  const groups = groupErrors([{ chunk: a }, { chunk: { heading: 'Docs' } }, { chunk: c }, { chunk: b }]);
  assert.deepStrictEqual(groups.map(g => [g.message, g.chunks.length]), [['Error: Docker Desktop is not running.', 2], ['Error: Something else broke here.', 1]]);
});

test('wholeMessageIn tells a pasted message from a longer one that contains it', () => {
  const short = { kind: 'error', heading: 'Error: Docker Desktop is not running.' };
  const long = { kind: 'error', heading: 'Error: Docker Desktop is not running, so ODS containers cannot be removed safely.' };
  const drive = { kind: 'error', heading: 'Error: Not enough free space on $drive for the model download.' };
  assert.ok(wholeMessageIn(short, '[XX] Docker Desktop is not running.'));
  assert.ok(!wholeMessageIn(long, 'Docker Desktop is not running.'));
  assert.ok(wholeMessageIn(drive, 'Not enough free space on D: for the model download.'));
  assert.ok(!wholeMessageIn({ kind: 'error', heading: 'Error: Service $service is not running' }, 'Docker Desktop is not running.'));
});
