const test = require('node:test');
const assert = require('node:assert');
const { KINDS, supportRowFor, isComputed, gridPoints, pointKey, parseSupportMatrix, thresholdFrom, modelDiskGb } = require('./checker.js');

test('every kind offers memory choices in ascending order', () => {
  for (const k of KINDS) {
    for (const list of [k.ram, k.mem].filter(Boolean)) {
      assert.deepStrictEqual(list, [...list].sort((a, b) => a - b), k.id);
    }
  }
});

test('gridPoints skips Windows AMD, which Windows setup decides', () => {
  const keys = new Set(gridPoints().map(pointKey));
  assert.ok(keys.has('windows|nvidia|8|16'));
  assert.ok(keys.has('macos|apple|0|16'));
  assert.ok(!keys.has('windows|amd|8|16'));
  assert.ok(![...keys].some(k => k.startsWith('windows|strix')));
  assert.strictEqual(isComputed('linux', 'amd'), true);
});

test('supportRowFor names the matrix row that covers a machine', () => {
  assert.strictEqual(supportRowFor('windows', 'cpu'), 'Windows (Docker Desktop + WSL2)');
  assert.strictEqual(supportRowFor('linux', 'strix'), 'Linux + AMD Strix Halo (llama.cpp, Vulkan)');
  assert.strictEqual(supportRowFor('macos', 'intel-mac'), null);
  assert.strictEqual(supportRowFor('linux', 'cpu'), null);
});

test('parseSupportMatrix reads the What Works Today table', () => {
  const md = '# M\n\n## What Works Today\n\nIntro.\n\n| Platform | Status | What you get today |\n|---|---|---|\n| **Linux + NVIDIA (CUDA)** | **Supported** | Complete install. |\n| **Linux + Intel Arc (SYCL)** | **Experimental** | Pass `--tier ARC`. |\n\n## Next\n';
  assert.deepStrictEqual(parseSupportMatrix(md), {
    'Linux + NVIDIA (CUDA)': { status: 'Supported', details: 'Complete install.' },
    'Linux + Intel Arc (SYCL)': { status: 'Experimental', details: 'Pass `--tier ARC`.' }
  });
  assert.throws(() => parseSupportMatrix('# nothing'), /What Works Today/);
});

test('thresholdFrom reads the GB figure at the end of a preflight message', () => {
  assert.strictEqual(thresholdFrom('RAM 0GB is below tier 1 recommendation (16GB).'), 16);
  assert.strictEqual(thresholdFrom('Disk 0GB is below the required minimum for tier SH_LARGE (120GB).'), 120);
  assert.throws(() => thresholdFrom('something else'), /threshold/);
});

test('modelDiskGb matches the installer: whole GB of model plus 15', () => {
  assert.strictEqual(modelDiskGb(5760), 21);
  assert.strictEqual(modelDiskGb(1024), 16);
  assert.strictEqual(modelDiskGb(1025), 17);
});
