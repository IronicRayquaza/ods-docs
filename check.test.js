const test = require('node:test');
const assert = require('node:assert');
const { assess, diskNeed } = require('./check.js');

const model = { id: 'qwen3.5-9b-q4', name: 'Qwen 3.5 9B', specialty: 'General', sizeMb: 5760, context: 65536 };
const data = {
  kinds: [{ id: 'nvidia' }, { id: 'arc' }, { id: 'amd' }, { id: 'intel-mac' }, { id: 'cpu' }],
  support: {
    'Linux + NVIDIA (CUDA)': { status: 'Supported', detailsHtml: 'Complete.' },
    'Linux + Intel Arc (SYCL)': { status: 'Experimental', detailsHtml: 'Pass --tier ARC.' },
    'Windows (Docker Desktop + WSL2)': { status: 'Supported', detailsHtml: 'WSL2.' }
  },
  supportRows: { 'linux|nvidia': 'Linux + NVIDIA (CUDA)', 'linux|arc': 'Linux + Intel Arc (SYCL)', 'windows|amd': 'Windows (Docker Desktop + WSL2)' },
  computed: { 'linux|nvidia': true, 'linux|arc': true, 'windows|amd': false, 'macos|intel-mac': true, 'linux|cpu': true },
  results: {
    'linux|nvidia|8|16': { tier: '1', backend: 'nvidia', ramMin: 16, diskMin: 30, checks: [], model: model, reason: 'Curated fit.', alternatives: ['Qwen 3.5 4B'] },
    'linux|arc|8|16': { tier: 'ARC_LITE', backend: 'intel', ramMin: 16, diskMin: 50, checks: [{ status: 'warn', message: "Unknown backend 'intel'.", action: '' }], model: model, reason: '', alternatives: [] },
    'macos|intel-mac|0|16': { tier: '1', backend: 'apple', ramMin: null, diskMin: null, checks: [{ status: 'blocker', message: 'Apple Silicon (arm64) is required.', action: '' }] },
    'linux|cpu|0|8': { tier: '1', backend: 'cpu', ramMin: 16, diskMin: 30, checks: [], model: model, reason: '', alternatives: [] }
  }
};

test('a supported machine with room is a clear yes', () => {
  const r = assess(data, { os: 'linux', kind: 'nvidia', mem: 8, ram: 16, disk: 100 });
  assert.strictEqual(r.level, 'good');
  assert.strictEqual(r.model.name, 'Qwen 3.5 9B');
  assert.deepStrictEqual(r.items.map(i => i.status), ['pass', 'pass']);
  assert.strictEqual(r.guide, 'quickstart');
});

test('disk need is the larger of the tier minimum and the model plus 15 GB', () => {
  assert.strictEqual(diskNeed({ diskMin: 30, model: model }), 30);
  assert.strictEqual(diskNeed({ diskMin: 15, model: model }), 21);
  assert.strictEqual(diskNeed({ diskMin: null, model: model }), 21);
});

test('too little disk is a fixable stop, not a no', () => {
  const r = assess(data, { os: 'linux', kind: 'nvidia', mem: 8, ram: 16, disk: 20 });
  assert.strictEqual(r.level, 'caution');
  assert.strictEqual(r.headline, 'Yes, once you free up disk space');
});

test('no disk entered shows what is needed', () => {
  const r = assess(data, { os: 'linux', kind: 'nvidia', mem: 8, ram: 16, disk: null });
  assert.ok(r.items.some(i => i.status === 'note' && /about 30 GB/.test(i.text)));
});

test('low RAM and experimental support are caveats', () => {
  assert.strictEqual(assess(data, { os: 'linux', kind: 'cpu', mem: 0, ram: 8, disk: null }).level, 'caution');
  const arc = assess(data, { os: 'linux', kind: 'arc', mem: 8, ram: 16, disk: 100 });
  assert.strictEqual(arc.headline, 'Experimental on this machine');
  assert.strictEqual(arc.guide, 'intel-arc-guide');
});

test('a blocker from ODS is a no', () => {
  const r = assess(data, { os: 'macos', kind: 'intel-mac', mem: 0, ram: 16, disk: 100 });
  assert.strictEqual(r.level, 'bad');
  assert.strictEqual(r.tier, null);
});

test('Windows AMD points at Windows setup instead of guessing', () => {
  const r = assess(data, { os: 'windows', kind: 'amd', mem: 16, ram: 32, disk: null });
  assert.strictEqual(r.level, 'info');
  assert.strictEqual(r.support.status, 'Supported');
});
