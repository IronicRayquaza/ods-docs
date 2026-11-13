const test = require('node:test');
const assert = require('node:assert');
const { headingId, makeSlugger, docSlug } = require('./slug.js');

test('headingId matches GitHub anchors', () => {
  assert.strictEqual(headingId('Problem: Port Already in Use'), 'problem-port-already-in-use');
  assert.strictEqual(headingId('Installer Stops With `No module named \'yaml\'`'), 'installer-stops-with-no-module-named-yaml');
  assert.strictEqual(headingId('⚡ Quick Fixes (Try These First)'), '-quick-fixes-try-these-first');
  assert.strictEqual(headingId('See [the FAQ](FAQ.md) **now**'), 'see-the-faq-now');
  assert.strictEqual(headingId('snake_case_name'), 'snake_case_name');
});

test('makeSlugger numbers repeated headings like GitHub', () => {
  const slug = makeSlugger();
  assert.deepStrictEqual(['Setup', 'Setup', 'Setup'].map(slug), ['setup', 'setup-1', 'setup-2']);
});

test('docSlug gives stable, unique page names', () => {
  assert.strictEqual(docSlug('ods/docs/WINDOWS-QUICKSTART.md'), 'windows-quickstart');
  assert.strictEqual(docSlug('ods/docs/INSTALLER_TRUST.md'), 'installer-trust');
  assert.strictEqual(docSlug('ods/FAQ.md'), 'faq');
  assert.strictEqual(docSlug('ods/docs/FAQ.md'), 'hardware-faq');
  assert.strictEqual(docSlug('ods/README.md'), 'overview');
  assert.strictEqual(docSlug('SECURITY.md'), 'security-policy');
  assert.strictEqual(docSlug('ods/SECURITY.md'), 'security');
  assert.strictEqual(docSlug('ods/extensions/services/open-webui/README.md'), 'service-open-webui');
  assert.strictEqual(docSlug('ods/docs/pixel/APPROVAL-TERMINAL.md'), 'pixel-approval-terminal');
});
