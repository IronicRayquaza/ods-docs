const test = require('node:test');
const assert = require('node:assert');
const { platformOf, forPlatform } = require('./platform.js');

test('platformOf reads the file name first, then a heading naming one OS', () => {
  assert.strictEqual(platformOf('ods/docs/WINDOWS-QUICKSTART.md', 'Setup'), 'windows');
  assert.strictEqual(platformOf('ods/installers/windows/lib/ui.ps1', ''), 'windows');
  assert.strictEqual(platformOf('ods/installers/macos/install.sh', ''), 'macos');
  assert.strictEqual(platformOf('ods/docs/LINUX-TROUBLESHOOTING-GUIDE.md', ''), 'linux');
  assert.strictEqual(platformOf('ods/FAQ.md', 'Does ODS run on macOS?'), 'macos');
  assert.strictEqual(platformOf('ods/FAQ.md', 'Linux and macOS support'), '');
  assert.strictEqual(platformOf('ods/FAQ.md', 'Where are the logs?'), '');
});

test('forPlatform keeps the chosen OS and sections for any OS', () => {
  const docs = [{ p: 'windows' }, { p: 'linux' }, {}];
  assert.strictEqual(forPlatform(docs, '').length, 3);
  assert.deepStrictEqual(forPlatform(docs, 'windows'), [{ p: 'windows' }, {}]);
});
