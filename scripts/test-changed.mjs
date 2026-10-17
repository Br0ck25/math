// Runs only the tests that cover what you changed (plus build + lint), with one line of output when all is well.
//   node scripts/test-changed.mjs          changed files vs HEAD (staged, unstaged and new)
//   node scripts/test-changed.mjs --list   print the tests that would run
//   node scripts/test-changed.mjs a.js b.js   treat these as the changed files
// The full suite (`npm test`) still runs in CI. Add a row to MAP when you add a source file or test.
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';

// [path regex, tests that cover it]. Several rows may match; the tests are joined.
export const MAP = [
  [/shared\/econ\.js/, ['economy', 'wild', 'adaptive']],
  [/js\/(02-data-core|04-data-buddies|04a-|08-buddies|09-bosses)/, ['content', 'packs', 'art-generated']],
  [/js\/04b-packs/, ['packs', 'content']],
  [/js\/08[bcd]-/, ['content', 'art', 'ui', 'held']],
  [/js\/07-math|js\/07a-/, ['generators', 'adaptive']],
  [/js\/07b-adaptive/, ['adaptive', 'generators']],
  [/js\/(12-battle|12b-|13-loot|19-quests)/, ['wild', 'backup', 'feel']],
  [/js\/12[cd]-/, ['moves']],
  [/js\/(13b-wild|24-raids)/, ['wild', 'legend']],
  [/js\/24b-map/, ['map']],
  [/js\/24c-legend/, ['legend']],
  [/js\/24d-champion/, ['champion']],
  [/js\/(25-buddy-hub|25b-held|14-items)/, ['held', 'confirm']],
  [/js\/(15-vault|33-shop)/, ['confirm', 'ui']],
  [/js\/(03b-|23-|35-|35b-|36-)|server\/(15-|16-)/, ['parent-controls', 'parent-page', 'parents', 'challenge', 'challenge-ui']],
  [/js\/(37|38-|35b-parent-study)|server\/17-|shared\/study/, ['study', 'confirm']],
  [/js\/26-trading/, ['cards']],
  [/js\/(27-|28-|29-)|server\/20-duels/, ['online-duel', 'server']],
  [/js\/(03-state|10-save-load|31-account)|server\/10-/, ['backup', 'app', 'parents']],
  [/server\/(00-|30-)/, ['server']],
  [/styles\.css|index\.html/, ['layout', 'windows', 'ui', 'contrast', 'app']],
  [/js\/(01-|05-|97-|97b-|97c-|98-|06-|11-|16-|17-|18-|20-|21-|22-|30-|32-|34-|99-)/, ['app', 'ui']],
  [/scripts\/(build|lint)\.mjs|tests\/helpers\.mjs/, ['app', 'server']],
  [/scripts\/art|art\//, ['art', 'art-generated']]
];
const FALLBACK = ['app', 'ui'];

export function changedFiles() {
  const sh = (c) => execSync(c, { encoding: 'utf8' }).split('\n').filter(Boolean);
  return [...new Set([...sh('git diff --name-only HEAD'), ...sh('git ls-files --others --exclude-standard')])];
}

export function testsFor(files) {
  const out = new Set();
  files.filter((f) => !/^(worker\.js|CLAUDE\.md|README\.md|\.claude\/|package)/.test(f)).forEach((f) => {
    const own = /^tests\/(.+)\.test\.mjs$/.exec(f);
    if (own) { out.add(own[1]); return; }
    const hits = MAP.filter(([re]) => re.test(f));
    (hits.length ? hits.flatMap((h) => h[1]) : FALLBACK).forEach((t) => out.add(t));
  });
  return [...out].filter((t) => fs.existsSync('tests/' + t + '.test.mjs')).sort();
}

export function run(files) {
  const tests = testsFor(files);
  if (!files.some((f) => /^(src|scripts|tests)\//.test(f))) { console.log('test-changed: nothing in src/, scripts/ or tests/ changed'); return 0; }
  for (const cmd of [['node', ['scripts/build.mjs']], ['node', ['scripts/lint.mjs']]]) {
    const r = spawnSync(cmd[0], cmd[1], { encoding: 'utf8' });
    if (r.status) { console.log((r.stdout + r.stderr).trim()); return r.status; }
  }
  if (!tests.length) { console.log('test-changed: build and lint pass, no tests mapped'); return 0; }
  const r = spawnSync('node', ['--test', '--test-reporter=dot', '--test-concurrency=1', ...tests.map((t) => 'tests/' + t + '.test.mjs')], { encoding: 'utf8' });
  if (r.status) { console.log((r.stdout + r.stderr).trim().split('\n').slice(-80).join('\n')); return r.status; }
  console.log('test-changed: build, lint and ' + tests.length + ' test file(s) pass (' + tests.join(', ') + ')');
  return 0;
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const args = process.argv.slice(2), list = args.includes('--list'), given = args.filter((a) => !a.startsWith('--'));
  const files = given.length ? given : changedFiles();
  if (list) console.log(testsFor(files).join('\n'));
  else process.exit(run(files));
}
