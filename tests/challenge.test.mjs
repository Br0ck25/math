import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker, fakeKV, call } from './helpers.mjs';

const worker = await loadWorker();
const setup = async () => {
  const env = { MATH_KV: fakeKV() };
  const c = (p, m, b, t) => call(worker, env, p, m, b, t);
  const kid = (await c('/api/register', 'POST', { name: 'kiddo', password: 'secret1', state: { unlockedPets: ['dog'], gems: 10 } })).data.token;
  const mom = (await c('/api/parent/register', 'POST', { name: 'mom_one', password: 'secret1' })).data.token;
  const dad = (await c('/api/parent/register', 'POST', { name: 'dad_one', password: 'secret1' })).data.token;
  for (const t of [mom, dad]) await c('/api/parent/claim', 'POST', { code: (await c('/api/link/code', 'POST', {}, kid)).data.code }, t);
  // moves the challenge clock: pretend it started `ms` ago
  const age = async (ms) => { const p = await env.MATH_KV.get('cprog:kiddo', 'json'); p.startedAt -= ms; await env.MATH_KV.put('cprog:kiddo', JSON.stringify(p)); };
  const mine = async () => (await c('/api/save', 'GET', null, kid)).data.challenge;
  return { env, c, kid, mom, dad, age, mine };
};
const make = (c, mom, over = {}) => c('/api/parent/challenge', 'POST', { child: 'kiddo', problems: 10, minutes: 5, ...over }, mom);

test('only the primary parent sets a challenge, with sensible numbers, one at a time', async () => {
  const { c, mom, dad } = await setup();
  assert.equal((await make(c, dad)).status, 403, 'the second parent can only look');
  for (const bad of [{ problems: 0 }, { problems: 101 }, { problems: 2.5 }, { minutes: 0 }, { minutes: 61 }, { minutes: 'x' }]) {
    assert.equal((await make(c, mom, bad)).status, 400, JSON.stringify(bad));
  }
  const ok = await make(c, mom, { problems: 100, minutes: 60 });
  assert.equal(ok.status, 200);
  assert.deepEqual([ok.data.challenge.problems, ok.data.challenge.gems, ok.data.challenge.state], [100, 100, 'ready']);
  assert.equal((await make(c, mom)).status, 409, 'one at a time');
  assert.equal((await c('/api/parent/challenge', 'POST', { child: 'kiddo', cancel: true }, dad)).status, 403);
  assert.equal((await c('/api/parent/challenge', 'POST', { child: 'kiddo', cancel: true }, mom)).status, 200);
  assert.equal((await make(c, mom)).status, 200, 'a new one after cancelling');
  assert.equal((await c('/api/parent/kids', 'GET', null, dad)).data.kids[0].challenge.state, 'ready', 'both parents can see it');
});

test('the clock starts when the child taps Start, and a win pays once', async () => {
  const { c, kid, mom, age, mine } = await setup();
  assert.equal(await mine(), null);
  const id = (await make(c, mom, { problems: 10, minutes: 5 })).data.challenge.id;
  assert.equal((await mine()).state, 'ready');
  assert.equal((await c('/api/challenge/claim', 'POST', { id, count: 10 }, kid)).status, 400, 'start first');
  const s1 = (await c('/api/challenge/start', 'POST', { id }, kid)).data.challenge;
  assert.equal(s1.state, 'running');
  assert.equal(s1.endsAt - s1.startedAt, 5 * 60000);
  await age(1000);
  const s2 = (await c('/api/challenge/start', 'POST', { id }, kid)).data.challenge;
  assert.equal(s2.startedAt, s1.startedAt - 1000, 'starting again never restarts the clock');
  assert.equal((await c('/api/challenge/claim', 'POST', { id, count: 9 }, kid)).status, 400, 'not finished');
  assert.match((await c('/api/challenge/claim', 'POST', { id, count: 10 }, kid)).data.error, /too fast/, '10 answers in 1 second is not believed');
  await age(60000);
  const won = await c('/api/challenge/claim', 'POST', { id, count: 10 }, kid);
  assert.deepEqual([won.data.won, won.data.gems, won.data.challenge.state], [true, 10, 'won']);
  const again = await c('/api/challenge/claim', 'POST', { id, count: 10 }, kid);
  assert.deepEqual([again.data.won, again.data.gems], [true, 10], 'asking again repeats the answer (the device pays once per id)');
  assert.equal((await mine()).state, 'won');
  assert.equal((await make(c, mom)).status, 200, 'the parent can set the next one');
});

test('progress is believable and shown to the parent', async () => {
  const { c, kid, mom, age } = await setup();
  const id = (await make(c, mom, { problems: 50, minutes: 10 })).data.challenge.id;
  await c('/api/challenge/start', 'POST', { id }, kid);
  let p = (await c('/api/challenge/progress', 'POST', { id, count: 50 }, kid)).data.challenge;
  assert.equal(p.count, 1, 'a few seconds cannot hold more than one answer at two seconds each');
  await age(60000);
  p = (await c('/api/challenge/progress', 'POST', { id, count: 20 }, kid)).data.challenge;
  assert.equal(p.count, 20);
  p = (await c('/api/challenge/progress', 'POST', { id, count: 5 }, kid)).data.challenge;
  assert.equal(p.count, 20, 'progress never goes backwards');
  const seen = (await c('/api/parent/kids', 'GET', null, mom)).data.kids[0].challenge;
  assert.deepEqual([seen.state, seen.count], ['running', 20]);
});

test('running out of time ends it kindly: no gems, nothing lost, and no way to claim late', async () => {
  const { c, kid, mom, age, mine } = await setup();
  const id = (await make(c, mom, { problems: 5, minutes: 1 })).data.challenge.id;
  await c('/api/challenge/start', 'POST', { id }, kid);
  await age(60000 + 16000);   // one minute plus the grace
  assert.equal((await mine()).state, 'ended');
  const late = await c('/api/challenge/claim', 'POST', { id, count: 5 }, kid);
  assert.deepEqual([late.status, late.data.won, late.data.gems], [200, false, 0]);
  assert.equal((await c('/api/parent/kids', 'GET', null, mom)).data.kids[0].challenge.state, 'ended');
  assert.equal((await make(c, mom)).status, 200, 'the parent may try again');
});

test('a cancelled challenge, or one from a parent who is no longer primary, disappears', async () => {
  const { c, kid, mom, mine } = await setup();
  const id = (await make(c, mom)).data.challenge.id;
  await c('/api/challenge/start', 'POST', { id }, kid);
  await c('/api/parent/challenge', 'POST', { child: 'kiddo', cancel: true }, mom);
  assert.equal(await mine(), null);
  assert.equal((await c('/api/challenge/claim', 'POST', { id, count: 10 }, kid)).status, 404);
  await make(c, mom);
  assert.equal((await mine()).state, 'ready');
  const list = (await c('/api/link/list', 'GET', null, kid)).data.links;
  await c('/api/link/unlink', 'POST', { id: list[0].id }, kid);   // the child unlinks mom
  assert.equal(await mine(), null, 'her challenge lapses with her link');
});
