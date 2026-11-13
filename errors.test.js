const { errorChunks } = require('./errors.js');
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