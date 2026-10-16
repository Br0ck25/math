import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker, fakeKV, call } from './helpers.mjs';

const worker = await loadWorker();
const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const save = { unlockedPets: ['dog'], gems: 42, grade: 3, parentPinHash: 'SECRET-HASH', duelFriends: ['zed'],
  stats: { days: { [day(0)]: { s: 8, a: 10, ms: 120000, h: 1, w: 0, ops: { add: [10, 8] } } } }, streakCal: { count: 4 }, raidsCleared: 2, tour: { trophies: 3 } };
const setup = async () => {
  const env = { MATH_KV: fakeKV() };
  const c = (p, m, b, t) => call(worker, env, p, m, b, t);
  const kid = (await c('/api/register', 'POST', { name: 'kiddo', password: 'secret1', state: save })).data.token;
  const mom = (await c('/api/parent/register', 'POST', { name: 'mom_one', password: 'secret1' })).data.token;
  const dad = (await c('/api/parent/register', 'POST', { name: 'dad_one', password: 'secret1' })).data.token;
  return { env, c, kid, mom, dad };
};
const link = async (c, kid, parentTok) => {
  const code = (await c('/api/link/code', 'POST', {}, kid)).data.code;
  return { code, res: await c('/api/parent/claim', 'POST', { code }, parentTok) };
};

test('parent accounts are separate from player accounts', async () => {
  const { c, kid, mom } = await setup();
  assert.equal((await c('/api/parent/register', 'POST', { name: 'mom_one', password: 'secret1' })).status, 409);
  assert.equal((await c('/api/parent/login', 'POST', { name: 'kiddo', password: 'secret1' })).status, 401, 'a player name is not a parent');
  assert.equal((await c('/api/login', 'POST', { name: 'mom_one', password: 'secret1' })).status, 401, 'a parent name is not a player');
  assert.equal((await c('/api/save', 'GET', null, mom)).status, 401, 'a parent token cannot act as a player');
  assert.equal((await c('/api/parent/kids', 'GET', null, kid)).status, 401, 'a player token cannot act as a parent');
  for (let i = 0; i < 8; i++) await c('/api/parent/login', 'POST', { name: 'mom_one', password: 'nope-nope' });
  assert.equal((await c('/api/parent/login', 'POST', { name: 'mom_one', password: 'secret1' })).status, 429, 'locked out after too many wrong passwords');
});

test('a parent claims a child with a code and sees only the report numbers', async () => {
  const { c, kid, mom } = await setup();
  assert.equal((await c('/api/link/code', 'POST', {})).status, 401, 'only a signed-in player can ask for a code');
  const { code, res } = await link(c, kid, mom);
  assert.match(code, /^[A-Z2-9]{8}$/);
  assert.equal(res.status, 200);
  assert.equal(res.data.child, 'kiddo');
  const kids = (await c('/api/parent/kids', 'GET', null, mom)).data.kids;
  assert.equal(kids.length, 1);
  assert.equal(kids[0].child, 'kiddo');
  assert.equal(kids[0].primary, true);
  assert.equal(kids[0].gems, 42);
  assert.equal(kids[0].grade, 3);
  assert.equal(kids[0].days[day(0)].s, 8);
  assert.deepEqual(kids[0].days[day(0)].ops, { add: [10, 8] });
  const text = JSON.stringify(kids);
  assert.doesNotMatch(text, /SECRET-HASH|zed|parentPin/, 'the PIN hash and friends are never sent');
  assert.equal((await c('/api/parent/claim', 'POST', { code }, mom)).status, 404, 'a code works once');
});

test('wrong codes are refused and lock the parent out after a few tries', async () => {
  const { c, mom } = await setup();
  for (let i = 0; i < 8; i++) assert.equal((await c('/api/parent/claim', 'POST', { code: 'ABCDEFG' + (i + 2) }, mom)).status, 404);
  assert.equal((await c('/api/parent/claim', 'POST', { code: 'ABCDEFGH' }, mom)).status, 429);
});

test('a code runs out, and a new code replaces an unused one', async () => {
  const { env, c, kid, mom } = await setup();
  const first = (await c('/api/link/code', 'POST', {}, kid)).data.code;
  const second = (await c('/api/link/code', 'POST', {}, kid)).data.code;
  assert.equal((await c('/api/parent/claim', 'POST', { code: first }, mom)).status, 404, 'the old code was replaced');
  for (const [k, e] of env.MATH_KV.m) if (k.startsWith('claim:')) e.exp = Date.now() - 1;   // time passes
  assert.equal((await c('/api/parent/claim', 'POST', { code: second }, mom)).status, 404, 'expired');
});

test('the first parent is primary; the child can unlink and the next parent takes over', async () => {
  const { c, kid, mom, dad } = await setup();
  assert.equal((await link(c, kid, mom)).res.status, 200);
  assert.equal((await link(c, kid, dad)).res.status, 200);
  let list = (await c('/api/link/list', 'GET', null, kid)).data.links;
  assert.deepEqual(list.map((l) => [l.parent, l.primary]), [['mom_one', true], ['dad_one', false]]);
  assert.equal((await c('/api/parent/kids', 'GET', null, dad)).data.kids[0].primary, false);
  assert.equal((await c('/api/link/unlink', 'POST', { id: list[0].id }, kid)).status, 200);
  assert.equal((await c('/api/parent/kids', 'GET', null, mom)).data.kids[0].revoked, true, 'mom can no longer see the child');
  list = (await c('/api/link/list', 'GET', null, kid)).data.links;
  assert.deepEqual(list.map((l) => [l.parent, l.primary]), [['dad_one', true]]);
  assert.equal((await c('/api/parent/kids', 'GET', null, dad)).data.kids[0].primary, true);
});

test('a parent can stop watching, and deleting the child account ends all links', async () => {
  const { c, kid, mom } = await setup();
  await link(c, kid, mom);
  assert.equal((await c('/api/parent/unlink', 'POST', { child: 'kiddo' }, mom)).status, 200);
  assert.deepEqual((await c('/api/parent/kids', 'GET', null, mom)).data.kids, []);
  assert.deepEqual((await c('/api/link/list', 'GET', null, kid)).data.links, [], 'the child sees the link is gone');
  await link(c, kid, mom);
  assert.equal((await c('/api/delete', 'POST', { password: 'secret1' }, kid)).status, 200);
  assert.equal((await c('/api/parent/kids', 'GET', null, mom)).data.kids[0].revoked, true);
});

test('a child can have only a few parents', async () => {
  const { env, c, kid } = await setup();
  for (let i = 0; i < 4; i++) {
    const t = (await c('/api/parent/register', 'POST', { name: 'parent_' + i, password: 'secret1' })).data.token;
    assert.equal((await link(c, kid, t)).res.status, 200);
  }
  assert.equal((await c('/api/link/code', 'POST', {}, kid)).status, 400);
  assert.ok(env);
});

const ctl = (over = {}) => ({ child: 'kiddo', minGrade: 1, ops: null, duelsOnline: true, ...over });

test('only the primary parent can change settings, and they are checked', async () => {
  const { c, kid, mom, dad } = await setup();
  await link(c, kid, mom);
  await link(c, kid, dad);
  assert.equal((await c('/api/parent/controls', 'POST', ctl(), dad)).status, 403, 'the second parent can only look');
  assert.equal((await c('/api/parent/controls', 'POST', ctl({ child: 'someone' }), mom)).status, 404);
  for (const bad of [{ minGrade: 6 }, { minGrade: -1 }, { minGrade: 1.5 }, { ops: [] }, { ops: ['<b>'] }, { ops: 'add' }, { duelsOnline: 'no' }]) {
    assert.equal((await c('/api/parent/controls', 'POST', ctl(bad), mom)).status, 400, JSON.stringify(bad));
  }
  const ok = await c('/api/parent/controls', 'POST', ctl({ ops: ['add', 'add', 'sub'], duelsOnline: false }), mom);
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.data.controls, { minGrade: 1, ops: ['add', 'sub'], duelsOnline: false });
  assert.deepEqual((await c('/api/parent/kids', 'GET', null, mom)).data.kids[0].controls, ok.data.controls);
  assert.equal((await c('/api/parent/kids', 'GET', null, dad)).data.kids[0].controls.minGrade, 1, 'the second parent can see them');
});

test('the child receives the settings, and the cloud save never holds a lower level or duels', async () => {
  const { c, kid, mom } = await setup();
  await link(c, kid, mom);
  assert.equal((await c('/api/save', 'GET', null, kid)).data.controls, null);
  await c('/api/parent/controls', 'POST', ctl({ minGrade: 2, duelsOnline: false }), mom);
  assert.deepEqual((await c('/api/save', 'GET', null, kid)).data.controls, { minGrade: 2, ops: null, duelsOnline: false });
  const put = await c('/api/save', 'PUT', { state: { ...save, grade: 0, duelsOnline: true }, baseVersion: 1, force: true }, kid);
  assert.equal(put.data.controls.minGrade, 2, 'every save tells the device the settings');
  const stored = (await c('/api/save', 'GET', null, kid)).data.save.state;
  assert.equal(stored.grade, 2, 'raised to the lowest level the parent allows');
  assert.equal(stored.duelsOnline, false);
  const high = await c('/api/save', 'PUT', { state: { ...save, grade: 4 }, baseVersion: put.data.version }, kid);
  assert.equal((await c('/api/save', 'GET', null, kid)).data.save.state.grade, 4, 'a higher level is never lowered');
  assert.ok(high.data.ok);
  assert.deepEqual((await c('/api/login', 'POST', { name: 'kiddo', password: 'secret1' })).data.controls, { minGrade: 2, ops: null, duelsOnline: false });
});

test('settings stop applying when the parent who set them is no longer the primary link', async () => {
  const { c, kid, mom, dad } = await setup();
  await link(c, kid, mom);
  await link(c, kid, dad);
  await c('/api/parent/controls', 'POST', ctl({ minGrade: 3 }), mom);
  assert.equal((await c('/api/save', 'GET', null, kid)).data.controls.minGrade, 3);
  const list = (await c('/api/link/list', 'GET', null, kid)).data.links;
  await c('/api/link/unlink', 'POST', { id: list[0].id }, kid);   // the kid unlinks mom; dad becomes primary
  assert.equal((await c('/api/save', 'GET', null, kid)).data.controls, null, 'mom\'s settings lapse with her link');
  assert.equal((await c('/api/parent/controls', 'POST', ctl({ minGrade: 2 }), dad)).status, 200);
  assert.equal((await c('/api/save', 'GET', null, kid)).data.controls.minGrade, 2, 'dad\'s own settings apply');
});
