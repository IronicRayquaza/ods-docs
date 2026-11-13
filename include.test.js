const { shouldInclude, isErrorSource } = require('./include.js');
const test = require('node:test');
const assert = require('node:assert');

test('shouldInclude returns true for valid markdown docs', () => {
  assert.strictEqual(shouldInclude('ods/docs/FAQ.md'), true);
  assert.strictEqual(shouldInclude('ods/FAQ.md'), true);
  assert.strictEqual(shouldInclude('ods/extensions/services/n8n/README.md'), true);
});

test('shouldInclude returns false for non-markdown or skipped files', () => {
  assert.strictEqual(shouldInclude('ods/docs/MAINTAINER_RUNBOOK.md'), false);
  assert.strictEqual(shouldInclude('ods/docs/images/logo.png'), false);
  assert.strictEqual(shouldInclude('ods/tests/README.md'), false);
  assert.strictEqual(shouldInclude('ods/extensions/services/n8n/docs/notes.md'), false);
});

test('isErrorSource returns true for install scripts', () => {
  assert.strictEqual(isErrorSource('ods/ods-cli'), true);
  assert.strictEqual(isErrorSource('install.ps1'), true);
  assert.strictEqual(isErrorSource('ods/installers/phases/05-docker.sh'), true);
  assert.strictEqual(isErrorSource('ods/installers/windows/lib/ui.ps1'), true);
});

test('isErrorSource returns false for tests and non-install scripts', () => {
  assert.strictEqual(isErrorSource('ods/tests/test-tier-map.sh'), false);
  assert.strictEqual(isErrorSource('ods/installers/lib/x.test.sh'), false);
  assert.strictEqual(isErrorSource('ods/scripts/select-model.py'), false);
  assert.strictEqual(isErrorSource('ods/docs/FAQ.md'), false);
});