// Against farming one over-levelled buddy: foe level follows the team, easy fights pay less, teammates share XP, and a daily soft cap.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

let browser, worker, env, page, errors;
before(async () => {
  browser = await launch();
  worker = await loadWorker();
  env = { MATH_KV: fakeKV() };
  ({ page, errors } = await openGame(browser, worker, env, { fast: true, wildStart: true }));
});
after(async () => { await browser.close(); });
beforeEach(async () => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  errors.length = 0;
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; });
});

// Stages a plain wild fight at `foeLevel` with buddies at the given levels (dog fights; the first two are the team), wins it, and reports what it paid.
const winFight = (levels, foeLevel, wins) => page.evaluate(async ([levels, foeLevel, wins]) => {
  const ids = ['dog', 'otter', 'fox'];
  state.unlockedPets = ids.slice(); state.unlockedSecrets = []; state.team = ['dog', 'otter']; state.activePet = 'dog'; state.badges = [];
  ids.forEach((id, i) => { state.buddyXp[id] = xpForLevel(levels[i]); });
  state.wild.id = 'fox'; state.wild.trainer = ''; state.wild.shiny = false; state.wild.legend = false; state.gym = null; state.wild.since = 0;
  state.wildWins = wins || { day: '', n: 0 }; state.care = {};
  bossLevel = foeLevel; state.bossLevel = foeLevel; monsterCurrentHp = 1; inputLocked = false; partyHp = {};
  const xp0 = ids.map(getBuddyXp), gems0 = state.gems;
  const real = Math.random; Math.random = () => 0.99;                      // the catch fails and nothing else is random
  triggerMonsterDamage(50, false);
  await new Promise((res) => setTimeout(res, 2000));
  Math.random = real;
  return { gems: state.gems - gems0, xp: ids.map((id, i) => getBuddyXp(id) - xp0[i]), wins: state.wildWins.n };
}, [levels, foeLevel, wins]);

test('foe level follows your three strongest buddies: one buddy far ahead stops pulling foes up, a normal team is untouched', async () => {
  const r = await page.evaluate(() => {
    const set = (a, b, c) => { state.unlockedPets = ['dog', 'otter', 'fox']; state.unlockedSecrets = []; state.activePet = 'dog'; state.buddyXp = { dog: xpForLevel(a), otter: xpForLevel(b), fox: xpForLevel(c) }; };
    const out = {};
    set(60, 5, 5); out.farmer = [teamPower(), foeBaseLevel()];
    set(20, 10, 10); out.normal = foeBaseLevel();
    set(40, 40, 40); out.balanced = foeBaseLevel();
    state.unlockedPets = ['dog']; state.buddyXp = { dog: xpForLevel(30) }; out.lone = foeBaseLevel();       // a first buddy has nobody to lag behind
    set(60, 5, 5); out.easy = [easyShare(35), easyShare(1), easyShare(70)];
    return out;
  });
  assert.deepEqual(r.farmer, [23, 35]);
  assert.equal(r.normal, 20);
  assert.equal(r.balanced, 40);
  assert.equal(r.lone, 30);
  assert.ok(Math.abs(r.easy[0] - 35 / 60) < 1e-9);
  assert.equal(r.easy[1], 0.25, 'never below the minimum share');
  assert.equal(r.easy[2], 1, 'a stronger foe pays in full');
});

test('an over-levelled buddy earns less XP and gems than a balanced team on the same fight, and the team catches up', async () => {
  const farmer = await winFight([60, 5, 5], 35);
  const balanced = await winFight([60, 60, 60], 60);
  const want = await page.evaluate(() => Math.max(1, Math.round((ECON.wild.gemBase + Math.floor(35 / ECON.wild.gemPerLevels)) * 35 / 60)));
  assert.equal(farmer.gems, want, 'the gems are scaled by foe level / buddy level');
  assert.ok(balanced.gems > farmer.gems, `balanced ${balanced.gems} > farmer ${farmer.gems}`);
  assert.ok(farmer.xp[0] < balanced.xp[0] * 0.7, `farmer XP ${farmer.xp[0]} is well under balanced ${balanced.xp[0]}`);
  assert.ok(farmer.xp[1] > 0, 'a teammate behind the fighter shares the XP');
  assert.equal(farmer.xp[2], 0, 'a buddy off the team gets nothing');
  assert.equal(balanced.xp[1], 0, 'a teammate that is not behind gets nothing');
});

test('after the daily number of wild wins, wild gems drop to a quarter (never below 1) with a kind message, and tomorrow starts fresh', async () => {
  const E = await page.evaluate(() => ECON.farm);
  const full = await winFight([30, 30, 30], 30);
  await page.evaluate(() => { window.__toasts = []; const real = toast; toast = (m) => { window.__toasts.push(String(m)); return real(m); }; });
  const tired = await winFight([30, 30, 30], 30, { day: await page.evaluate(() => dayKey()), n: E.dailyWins });
  const toast = await page.evaluate(() => window.__toasts.join(' | '));
  const yesterday = await winFight([30, 30, 30], 30, { day: '2000-01-01', n: E.dailyWins + 50 });
  assert.equal(tired.gems, Math.max(1, Math.round(full.gems * E.tiredShare)));
  assert.ok(tired.gems < full.gems);
  assert.match(toast, /sleepy|Full rewards tomorrow/i);
  assert.equal(yesterday.gems, full.gems, 'a new day pays in full again');
  assert.equal(yesterday.wins, 1, 'and the count starts over');
});

test('bad win-count data in a save is repaired', async () => {
  const r = await page.evaluate(() => {
    state.wildWins = { day: 5, n: 'x' }; normalizeState(); const a = JSON.stringify(state.wildWins);
    state.wildWins = 'broken'; normalizeState();
    return [a, Object.keys(state.wildWins).sort().join(',')];
  });
  assert.equal(r[0], '{"day":"","n":0}');
  assert.equal(r[1], 'day,n');
});

test('no errors', () => { assert.deepEqual(errors, []); });
