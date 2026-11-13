const test = require('node:test');
const assert = require('node:assert');
const { citeErrors, fixedParts } = require('./cite.js');

test('fixedParts keeps the text between shell and PowerShell variables', () => {
  assert.deepStrictEqual(fixedParts('Not enough free space on $drive for the model download.'), ['not enough free space on', 'for the model download']);
  assert.deepStrictEqual(fixedParts('Docker Desktop cannot bind-mount ${INSTALL_DIR}.'), ['docker desktop cannot bind mount']);
});

test('citeErrors links each message to the sections that name or quote it', () => {
  const chunks = [
    { file: 'ods/docs/WINDOWS-TROUBLESHOOTING-GUIDE.md', heading: 'Problem: "Docker Desktop is not running"', text: 'Docker Desktop is not running. Please start it.', p: 'windows' },
    { file: 'ods/docs/INSTALL-TROUBLESHOOTING.md', heading: 'Container build DNS', anchor: 'container-build-dns', text: 'Check the resolvers.' },
    { file: 'ods/docs/INSTALL-TROUBLESHOOTING.md', heading: 'Disk', anchor: 'disk', text: 'Not enough free space on C: for the model download, free some up.' },
    { file: 'ods/installers/windows/ods.ps1', heading: 'Error: Docker Desktop is not running.', text: '', kind: 'error', p: 'windows' },
    { file: 'ods/installers/macos/ods-macos.sh', heading: 'Error: Docker Desktop is not running.', text: '', kind: 'error', p: 'macos' },
    { file: 'ods/installers/phases/11-services.sh', heading: 'Error: Build log contains a name-resolution error.', text: '', kind: 'error', refs: ['ods/docs/INSTALL-TROUBLESHOOTING.md#container-build-dns', 'ods/docs/GONE.md'] },
    { file: 'ods/installers/windows/lib/disk.ps1', heading: 'Error: Not enough free space on $drive for the model download.', text: '', kind: 'error' }
  ];
  const dangling = citeErrors(chunks);
  assert.deepStrictEqual(chunks[3].see, [{ i: 0, by: 'quote' }]);
  assert.strictEqual(chunks[4].see, undefined, 'a macOS message is not answered by the Windows guide');
  assert.deepStrictEqual(chunks[5].see, [{ i: 1, by: 'ref' }]);
  assert.deepStrictEqual(chunks[6].see, [{ i: 2, by: 'quote' }]);
  assert.strictEqual(chunks[5].refs, undefined);
  assert.deepStrictEqual(dangling, [{ from: 'ods/installers/phases/11-services.sh:undefined', ref: 'ods/docs/GONE.md' }]);
});
