const { errorChunks, docRefs } = require('./errors.js');
const test = require('node:test');
const assert = require('node:assert');

const text = [
  '#!/bin/bash',
  'x=1',
  '# Docker must be running here.',
  '# Second note.',
  '    error "Docker is not running. Start Docker and re-run."',
  'warn "short"',
  'throw "Windows runtime could not be verified, stopping."'
].join('\n');

const found = errorChunks('ods/a.sh', text);

test('found has length 2', () => {
  assert.strictEqual(found.length, 2);
});

test('found[0].heading, line, and kind are correct', () => {
  assert.strictEqual(found[0].heading, 'Error: Docker is not running. Start Docker and re-run.');
  assert.strictEqual(found[0].line, 5);
  assert.strictEqual(found[0].kind, 'error');
});

test('found[0].text contains notes and has 3 lines when split by \n\n', () => {
  assert.ok(found[0].text.includes('Docker must be running here.'));
  assert.ok(found[0].text.includes('Second note.'));
  assert.strictEqual(found[0].text.split('\n\n').length, 3);
});

test('found[1].line is 7 and text has 2 lines when split by \n\n', () => {
  assert.strictEqual(found[1].line, 7);
  assert.strictEqual(found[1].text.split('\n\n').length, 2);
});

test('the installers\' own ai_bad, ai_err and ai_warn messages are found, in either quote style', () => {
  const found = errorChunks('ods/x.sh', ['ai_bad "Docker access check failed for this user."', "  ai_err 'Apple Silicon (arm64) is required.'", 'ai_warn "Recovery: see docs/TROUBLESHOOTING.md#pixel-cannot-access-docker"', 'ai "Build log is in the usual place"'].join('\n'));
  assert.deepStrictEqual(found.map(f => f.line), [1, 2, 3]);
  assert.strictEqual(found[1].heading, 'Error: Apple Silicon (arm64) is required.');
});

test('docRefs finds the doc a message sends people to, and only that', () => {
  const lines = [
    'ai_warn "Build log contains a name-resolution error."',
    'ai "Check the uplink resolvers too."',
    'ai "See docs/INSTALL-TROUBLESHOOTING.md#container-build-dns for checks."',
    '',
    'ai "See docs/OTHER.md"'
  ];
  assert.deepStrictEqual(docRefs(lines, 0, 'ai_warn'), ['ods/docs/INSTALL-TROUBLESHOOTING.md#container-build-dns']);
  assert.deepStrictEqual(docRefs(['fail "docs/SUPPORT-MATRIX.md missing"'], 0, 'fail'), []);
  assert.deepStrictEqual(docRefs(['throw "First problem happened here."', 'throw "Second. See ods/docs/WINDOWS-QUICKSTART.md."'], 0, 'throw'), []);
  assert.deepStrictEqual(docRefs(['ai_bad "x failed badly here"', 'ai_warn "Recovery: https://github.com/Osmantic/ODS/blob/main/ods/docs/TROUBLESHOOTING.md#pixel"'], 0, 'ai_bad'), ['ods/docs/TROUBLESHOOTING.md#pixel']);
});
