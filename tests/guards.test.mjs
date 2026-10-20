// Guards for mistakes that already happened once (they used to be warnings in CLAUDE.md). Fast: no browser.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assemble } from '../scripts/build.mjs';

const { js, serverJs } = assemble();

test('functions an earlier regex refactor deleted still exist, and every page handler has a function', () => {
  ['hubStep'].forEach((fn) => assert.match(js, new RegExp('function\\s+' + fn + '\\b'), fn + ' is missing'));
  const html = fs.readFileSync('src/client/index.html', 'utf8');
  const called = [...html.matchAll(/\son(?:click|change|input|submit)="\s*([A-Za-z_]\w*)\(/g)].map((m) => m[1]);
  called.forEach((n) => assert.match(js, new RegExp('function\\s+' + n + '\\b'), 'index.html calls ' + n + '()'));
});

test('every online-duel notification names its kind, so one kind never silently overwrites another', () => {
  const calls = serverJs.split('\n').filter((l) => /await ping\(/.test(l));
  assert.ok(calls.length >= 3, 'expected several ping() calls');
  calls.forEach((c) => assert.ok(/'(invite|result|declined)'/.test(c), 'ping without a known kind: ' + c.trim()));
  assert.match(serverJs, /k:\s*kind/, 'ping must store the kind');
});

test('test pages never register the service worker', () => {
  assert.match(fs.readFileSync('tests/helpers.mjs', 'utf8'), /serviceWorkers:\s*'block'/);
});
