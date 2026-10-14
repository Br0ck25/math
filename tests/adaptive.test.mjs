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

test('the combo streak never changes difficulty', async () => {
  const r = await run(() => {
    state.streak = 500;
    for (let i = 0; i < 50; i++) generateProblem();
    return Object.keys(state.adapt.tier).length + state.adapt.served.replace(/n/g, '').length;
  });
  assert.equal(r, 0);
});

test('Challenge problems come from the next grade up; none at the top grade', async () => {
  const r = await run(() => {
    const seen = [];
    const real = OP_BY_ID.mul.gen;
    OP_BY_ID.mul.gen = (g) => { seen.push(g); return real(g); };
    state.adapt.tier.mul = 1; state.enabledOps = ['mul', 'add']; state.adapt.on = true;
    let sawChallenge = false;
    for (let i = 0; i < 60 && !sawChallenge; i++) { state.adapt.served = ''; generateProblem(); if (currentProblem.challenge) { sawChallenge = currentProblem.modeTag === 'mul'; } }
    const challengeGrade = seen[seen.length - 1];
    state.grade = 5; state.adapt.served = '';
    let any = false;
    for (let i = 0; i < 80; i++) { generateProblem(); if (currentProblem.challenge) any = true; }
    OP_BY_ID.mul.gen = real;
    return { sawChallenge, challengeGrade, topGradeChallenges: any };
  });
  assert.deepEqual(r, { sawChallenge: true, challengeGrade: 3, topGradeChallenges: false });
});

test('at most 4 Challenge problems in any 12, even when every type is at Challenge', async () => {
  const worst = await run(() => {
    state.enabledOps = ['add', 'sub', 'mul', 'div'];
    state.enabledOps.forEach((o) => { state.adapt.tier[o] = 1; });
    let worst = 0, flags = '';
    for (let i = 0; i < 300; i++) { generateProblem(); flags += currentProblem.challenge ? 'c' : 'n'; worst = Math.max(worst, (flags.slice(-12).match(/c/g) || []).length); }
    return worst;
  });
  assert.ok(worst <= 4, 'saw ' + worst);
  assert.ok(worst >= 3, 'challenge problems do appear');
});

test('after a missed Challenge problem the next one of that type steps back to normal', async () => {
  const r = await run(() => {
    state.enabledOps = ['add', 'mul'];
    state.adapt.tier.mul = 1;
    currentProblem = { layout: 'inline', expr: '12 × 12', answer: 144, modeTag: 'mul', challenge: true };
    inputLocked = false; userInput = '1'; state.shields = 0; checkAnswer();
    return { calm: state.adapt.calm.mul === true, tierKept: state.adapt.tier.mul };
  });
  assert.deepEqual(r, { calm: true, tierKept: 1 });
  const next = await run(() => { const n = pickNextProblem(null); const first = n.op === 'mul' ? n.kind : 'other'; return { first, calmLeft: !!state.adapt.calm.mul || first === 'other' }; });
  assert.ok(next.first === 'normal' || next.first === 'other');
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

test('Challenge answers earn 50% more XP; gems stay the same', async () => {
  const r = await run(() => {
    state.enabledOps = ['add', 'mul'];
    const xpFor = (challenge) => {
      state.buddyXp.dog = xpForLevel(10); state.streak = 0; state.shields = 0; state.gems = 0;     // mid-level, so no level-up gems muddy the comparison
      currentProblem = { layout: 'inline', expr: '2 + 2', answer: 4, modeTag: 'add', challenge };
      questionStartTime = Date.now() - 100000;                 // slow: no speed bonus either way
      inputLocked = false; userInput = '4'; checkAnswer();
      return { xp: state.buddyXp.dog - xpForLevel(10), gems: state.gems };
    };
    return { normal: xpFor(false), challenge: xpFor(true) };
  });
  assert.equal(r.challenge.xp, Math.round(r.normal.xp * 1.5));
  assert.equal(r.challenge.gems, r.normal.gems);
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

test('parent report: switch for adaptive practice, current levels listed; online-duel switch works', async () => {
  const r = await run(() => {
    state.adapt.tier = { mul: 1, div: -1 }; state.adapt.recent = { div: '0'.repeat(10) };
    parentUnlocked = true; openParent();
    const txt = document.getElementById('par-levels').innerText;
    const out = { challenge: /Multiplication\s*Challenge/.test(txt), easier: /Division\s*Easier/.test(txt) };
    document.getElementById('par-adaptive').checked = false; document.getElementById('par-adaptive').dispatchEvent(new Event('change'));
    out.off = state.adapt.on === false && /Off/.test(document.getElementById('par-levels').innerText);
    document.getElementById('par-adaptive').checked = true; document.getElementById('par-adaptive').dispatchEvent(new Event('change'));
    out.on = state.adapt.on === true;
    document.getElementById('par-duels').checked = false; document.getElementById('par-duels').dispatchEvent(new Event('change'));
    out.duelsOff = state.duelsOnline === false;
    return out;
  });
  assert.deepEqual(r, { challenge: true, easier: true, off: true, on: true, duelsOff: true });
});

test('a challenge problem is marked on screen', async () => {
  const r = await run(() => {
    state.enabledOps = ['mul']; state.adapt.tier.mul = 1; state.adapt.served = '';
    generateProblem();
    return document.getElementById('equation-mount').classList.contains('challenge') === currentProblem.challenge && currentProblem.challenge;
  });
  assert.equal(r, true);
});

test('no errors', () => { assert.deepEqual(errors, []); });
