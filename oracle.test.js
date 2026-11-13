// Runs the checker's build step against a real Osmantic/ODS checkout, named
// by ODS_SOURCE (CI sets it). Without it these tests are skipped, and say so.
const test = require('node:test');
const assert = require('node:assert');
const { askOds, parseEnv } = require('./oracle.js');
const { gridPoints, pointKey } = require('./checker.js');

test('parseEnv reads KEY="value" lines', () => {
  assert.deepStrictEqual(parseEnv('HW_REC_TIER="T1"\nHW_REC_BACKEND="nvidia"\nnoise'), { HW_REC_TIER: 'T1', HW_REC_BACKEND: 'nvidia' });
});

const root = process.env.ODS_SOURCE;
test('ODS answers every machine on the page', { skip: root ? false : 'set ODS_SOURCE to an Osmantic/ODS checkout to run' }, () => {
  const r = askOds(root);
  for (const p of gridPoints()) {
    const a = r[pointKey(p)];
    assert.ok(a, 'no answer for ' + pointKey(p));
    if (p.kind === 'intel-mac') {
      assert.ok(a.checks.some(c => c.status === 'blocker'), 'Intel Mac should be blocked');
    } else {
      assert.ok(a.model || a.noModel, 'no model and no reason for ' + pointKey(p));
    }
  }
  // Spot checks that follow from ODS's own rules (SUPPORT-MATRIX tier map).
  assert.strictEqual(r['linux|nvidia|2|16'].backend, 'cpu');
  assert.strictEqual(r['linux|nvidia|24|16'].tier, '3');
  assert.strictEqual(r['linux|strix|0|128'].tier, 'SH_LARGE');
  assert.strictEqual(r['linux|arc|16|16'].tier, 'ARC');
  assert.strictEqual(r['macos|apple|0|64'].backend, 'apple');
});
