// Runs only the tests that cover what you changed (plus build + lint), with one line of output when all is well.
//   node scripts/test-changed.mjs          changed files vs HEAD (staged, unstaged and new)
//   node scripts/test-changed.mjs --list   print the tests that would run
//   node scripts/test-changed.mjs a.js b.js   treat these as the changed files
// The full suite (`npm test`) still runs in CI. Add a row to MAP when you add a source file or test.
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';

// [path regex, tests that cover it]. Several rows may match; the tests are joined.
export const MAP = [
  [/shared\/econ\.js/, ['economy', 'adaptive', 'adventure-shops', 'adventure-battle']],
  [/js\/(02-data-core|04-data-buddies|04a-|08-buddies|09-bosses)/, ['content', 'packs', 'art-generated', 'adventure-battle']],
  [/js\/04b-packs/, ['packs', 'content']],
  [/js\/08[bcd]-/, ['content', 'art', 'cards']],
  [/js\/(07-math|07b-adaptive)/, ['generators', 'adaptive']],
  [/js\/(13-loot|13b-wild|13c-eggs|19-quests)/, ['adventure-trainers', 'adventure-battle']],
  [/js\/(24b-map|24d-champion)/, ['adventure-gyms', 'adventure-story']],
  [/js\/20b-tech-tree/, ['tech-tree', 'economy']],
  [/js\/(25-buddy-hub|25b-held|14-items)/, ['held', 'confirm', 'adventure-shops']],
  [/js\/25d-ranch/, ['ranch', 'held']],
  [/js\/33-shop/, ['confirm', 'adventure-shops']],
  [/js\/(37|38-)|shared\/study/, ['generators']],
  [/js\/26-trading/, ['cards']],
  [/js\/(27-|28-|29-)|server\/20-duels/, ['online-duel', 'server']],
  [/js\/(03-state|10-save-load|31-account)|server\/10-/, ['overworld', 'adventure-battle', 'adventure-gizmo', 'server']],
  [/server\/(00-|30-)/, ['server']],
  [/styles\.css|index\.html/, ['windows', 'adventure-boot', 'overworld', 'adventure-battle']],
  [/js\/(01-|01b-|05-|06-|11-|17-|32-|34-|97-|97b-|97c-|97d-|97e-|25c-|98-|99-)/, ['speech', 'windows', 'adventure-boot']],
  [/scripts\/(build|lint)\.mjs|tests\/helpers\.mjs/, ['adventure-boot', 'server']],
  [/scripts\/art|art\//, ['art', 'art-generated']],
  [/js\/24[g-z]-ow-/, ['overworld', 'adventure-boot', 'adventure-hero', 'adventure-towns', 'adventure-shops', 'adventure-trainers', 'adventure-gyms', 'adventure-gates', 'adventure-lands', 'adventure-story', 'adventure-gizmo', 'adventure-battle', 'art-world']],
  [/js\/24f-ow-|scripts\/(make-)?world-art|art\/world/, ['art-world', 'overworld', 'adventure-hero', 'adventure-towns']]
];
const FALLBACK = ['overworld', 'adventure-battle'];

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
