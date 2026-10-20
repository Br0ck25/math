import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

let browser, page, errors;
before(async () => {
  browser = await launch();
  ({ page, errors } = await openGame(browser, await loadWorker(), { MATH_KV: fakeKV() }, { fast: true }));
});
after(async () => { await browser.close(); });
beforeEach(async () => {
  await page.evaluate(() => { localStorage.clear(); state = freshState(); state.grade = 2; state.enabledOps = ['add', 'sub', 'mul', 'div']; getWeakOp = () => null; });   // no boss weak point unless a test asks
});
const run = (fn, arg) => page.evaluate(fn, arg);

test('a type moves up to Challenge only after 20 recent tries that are accurate AND quick, then needs fresh evidence', async () => {
  const r = await run(() => {
    const out = {};
    for (let i = 0; i < 19; i++) recordAdaptive('mul', true, true);
    out.before20 = opTier('mul');
    out.step = recordAdaptive('mul', true, true);
    out.afterStep = [opTier('mul'), state.adapt.recent.mul];
    for (let i = 0; i < 25; i++) recordAdaptive('mul', true, true);
    out.cappedAtPlusOne = opTier('mul');
    // accurate but slow does not qualify
    for (let i = 0; i < 25; i++) recordAdaptive('add', true, false);
    out.slowStays = opTier('add');
    // 80% accurate is not enough
    for (let i = 0; i < 20; i++) recordAdaptive('sub', i % 5 !== 0, true);
    out.eightyStays = opTier('sub');
    return out;
  });
  assert.deepEqual(r, { before20: 0, step: 1, afterStep: [1, ''], cappedAtPlusOne: 1, slowStays: 0, eightyStays: 0 });
});

test('a struggling type steps down after 10 tries and never below Easier', async () => {
  const r = await run(() => {
    const out = {};
    for (let i = 0; i < 9; i++) recordAdaptive('div', i % 2 === 0 ? true : false, false);
    out.beforeTen = opTier('div');
    recordAdaptive('div', false, false);
    out.down = opTier('div');
    for (let i = 0; i < 40; i++) recordAdaptive('div', false, false);
    out.floor = opTier('div');
    return out;
  });
  assert.deepEqual(r, { beforeTen: 0, down: -1, floor: -1 });
});

test('weak types are served more, strong types still appear, and no type passes half', async () => {
  const r = await run(() => {
    state.enabledOps = ['add', 'sub', 'mul', 'div', 'frac'];
    state.adapt.recent = { add: '2'.repeat(20), sub: '1'.repeat(20), mul: '1'.repeat(10) + '0'.repeat(10), div: '0'.repeat(20), frac: '1'.repeat(20) };
    const count = {};
    for (let i = 0; i < 5000; i++) { const p = pickNextProblem(null); count[p.op] = (count[p.op] || 0) + 1; }
    const share = (o) => count[o] / 5000;
    const max = Math.max(...Object.values(count)) / 5000;
    return { divBeatsAdd: share('div') > share('add') * 1.8, mulBetween: share('mul') > share('add') && share('mul') < share('div'), minShare: Math.min(...Object.values(count)) / 5000 > 0.08, max };
  });
  assert.equal(r.divBeatsAdd, true);
  assert.equal(r.mulBetween, true);
  assert.equal(r.minShare, true);
  assert.ok(r.max <= 0.5 + 0.02, 'top share ' + r.max);
});

test('the boss weak point gets its share, combined with weak types, still capped at half', async () => {
  const r = await run(() => {
    state.enabledOps = ['add', 'sub', 'mul', 'div'];
    state.adapt.recent = { add: '1'.repeat(20), sub: '1'.repeat(20), mul: '1'.repeat(20), div: '0'.repeat(20) };
    const weak = 'div';
    const shares = typeShares(['add', 'sub', 'mul', 'div'], weak);
    const noWeak = typeShares(['add', 'sub', 'mul', 'div'], null);
    const strongBoss = typeShares(['add', 'sub', 'mul', 'div'], 'add')[0];     // boss weak point on a mastered type is lifted to 40%
    return { strongBoss, divWithBoss: shares[3], divAlone: noWeak[3], sum: shares.reduce((a, b) => a + b, 0), plainBoss: typeShares(['add', 'sub', 'mul'], 'mul')[2] };
  });
  assert.ok(r.divWithBoss <= 0.5 + 1e-9 && r.divWithBoss >= r.divAlone - 1e-9, 'a weak boss type is never served less than its own weakness asks');
  assert.ok(Math.abs(r.strongBoss - 0.4) < 0.01, 'a mastered type that is the boss weak point still gets about 40%: ' + r.strongBoss);
  assert.ok(Math.abs(r.sum - 1) < 1e-9);
  assert.ok(Math.abs(r.plainBoss - 0.4) < 0.01, 'boss share with equal skills is about 40%: ' + r.plainBoss);
});

test('with adaptive practice off every type is uniform, at the chosen grade', async () => {
  const r = await run(() => {
    state.adapt.on = false;
    state.enabledOps = ['add', 'sub', 'mul', 'div'];
    state.adapt.recent = { add: '2'.repeat(20), div: '0'.repeat(20) };
    state.adapt.tier = { add: 1, div: -1 };
    const count = { add: 0, sub: 0, mul: 0, div: 0 }, kinds = new Set();
    for (let i = 0; i < 4000; i++) { const p = pickNextProblem(null); count[p.op]++; kinds.add(p.kind); }
    return { spread: Math.max(...Object.values(count)) / 4000 - Math.min(...Object.values(count)) / 4000, kinds: [...kinds], tierShown: opTier('add') };
  });
  assert.ok(r.spread < 0.06, 'spread ' + r.spread);
  assert.deepEqual(r.kinds, ['normal']);
  assert.equal(r.tierShown, 0);
});

test('tournaments, duels and the vault ignore levels: every question is at the chosen grade', async () => {
  const r = await run(() => {
    state.adapt.tier = { mul: 1, add: -1 };
    const grades = [];
    const real = { mul: OP_BY_ID.mul.gen, add: OP_BY_ID.add.gen };
    ['mul', 'add'].forEach((o) => { OP_BY_ID[o].gen = (g) => { grades.push(g); return real[o](g); }; });
    for (let i = 0; i < 40; i++) makeMcq({ op: i % 2 ? 'mul' : 'add' });
    OP_BY_ID.mul.gen = real.mul; OP_BY_ID.add.gen = real.add;
    return [...new Set(grades)];
  });
  assert.deepEqual(r, [2]);
});

test('levels survive a reload, a damaged adaptive record is repaired', async () => {
  await run(() => { state.adapt.tier.mul = 1; state.adapt.recent.mul = '2'.repeat(7); saveState(); });
  await page.reload();
  assert.deepEqual(await run(() => [state.adapt.tier.mul, state.adapt.recent.mul, state.adapt.on]), [1, '2222222', true]);
  await run(() => localStorage.setItem('math_quest_save', JSON.stringify({ adapt: { on: 'yes', tier: { mul: 7, nope: 1 }, recent: { mul: 'x9' + '1'.repeat(40), ghost: '1' }, served: 'zzcc', calm: 5 } })));
  await page.reload();
  const a = await run(() => JSON.parse(JSON.stringify(state.adapt)));
  assert.equal(a.on, true);
  assert.deepEqual(a.tier, {});
  assert.deepEqual(Object.keys(a.recent), ['mul']);
  assert.equal(a.recent.mul.length, 20);
  assert.match(a.served, /^cc/);
  assert.deepEqual(a.calm, {});
});

test('no errors', () => { assert.deepEqual(errors, []); });
