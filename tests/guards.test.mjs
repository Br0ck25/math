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

test('the world is laid out the same in every browser: no random-comparator sorts (their order differs between Chrome and Safari) in the Adventure files', () => {
  const dir = 'src/client/js/';
  fs.readdirSync(dir).filter((f) => /^24[g-z]/.test(f)).forEach((f) => assert.doesNotMatch(fs.readFileSync(dir + f, 'utf8'), /\.sort\(\s*function\s*\(\)\s*\{\s*return\s+(rnd|Math\.random)\(\)/, f + ' sorts with a random comparator; use owShuffle'));
});
