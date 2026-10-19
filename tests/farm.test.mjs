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
const winFight = (levels, foeLevel, wins, usedUp) => page.evaluate(async ([levels, foeLevel, wins, usedUp]) => {
  const ids = ['dog', 'otter', 'fox'];
  state.unlockedPets = ids.slice(); state.unlockedSecrets = []; state.team = ['dog', 'otter']; state.activePet = 'dog'; state.badges = [];
  ids.forEach((id, i) => { state.buddyXp[id] = xpForLevel(levels[i]); });
  state.wild.id = 'fox'; state.wild.trainer = ''; state.wild.shiny = false; state.wild.legend = false; state.gym = null; state.wild.since = 0;
  state.wildWins = wins || { day: '', n: 0 }; state.care = {};
  state.rested = usedUp ? { day: dayKey(), fights: { dog: ECON.farm.restedWins } } : { day: '', fights: {} };
  bossLevel = foeLevel; state.bossLevel = foeLevel; monsterCurrentHp = 1; inputLocked = false; partyHp = {};
  const xp0 = ids.map(getBuddyXp), gems0 = state.gems;
  const real = Math.random; Math.random = () => 0.99;                      // the catch fails and nothing else is random
  triggerMonsterDamage(50, false);
  await new Promise((res) => setTimeout(res, 2000));
  Math.random = real;
  return { gems: state.gems - gems0, xp: ids.map((id, i) => getBuddyXp(id) - xp0[i]), wins: state.wildWins.n };
}, [levels, foeLevel, wins, usedUp]);

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

test('rested bonus: each buddy\'s first ten plain wild wins of a day earn +50% XP, every buddy has its own ten, and a new day starts over', async () => {
  const r = await page.evaluate(() => {
    const out = {}, E = ECON.farm;
    const set = () => { state.unlockedPets = ['dog', 'otter']; state.unlockedSecrets = []; state.team = ['dog', 'otter']; state.activePet = 'dog'; state.rested = { day: '', fights: {} }; };
    set();
    out.fresh = [restedLeft('dog'), restedLeft('otter')];
    const shares = []; for (let i = 0; i < E.restedWins + 2; i++) shares.push(restedShare('dog'));
    out.dog = [shares.slice(0, E.restedWins).every((x) => x === 1 + E.restedXp), shares.slice(E.restedWins).every((x) => x === 1)];
    out.after = [restedLeft('dog'), restedLeft('otter'), restedShare('otter')];                // the other buddy is still fresh
    state.rested.day = '2000-01-01'; out.newDay = [restedLeft('dog'), restedShare('dog'), state.rested.day === dayKey()];
    hubPet = 'otter'; hubTab = 'care'; state.rested = { day: dayKey(), fights: { otter: 3 } }; renderHub();
    out.care = document.getElementById('hub-body').innerText.includes('Rested: +50% XP for ' + (E.restedWins - 3));
    state.rested.fights.otter = E.restedWins; renderHub(); out.used = document.getElementById('hub-body').innerText.includes('Rested bonus used up');
    state.rested.fights.otter = 0; state.wild.id = 'fox'; state.faintedPets = []; state.swapUsed = false; const toasts = []; const real = toast; toast = (m) => { toasts.push(String(m)); return real(m); };
    swapBuddy('otter'); toast = real; out.swapToast = toasts.some((t) => /rested/.test(t));
    return out;
  });
  assert.deepEqual(r.fresh, [10, 10]);
  assert.deepEqual(r.dog, [true, true]);
  assert.deepEqual(r.after, [0, 10, 1.5]);
  assert.deepEqual(r.newDay, [10, 1.5, true]);
  assert.ok(r.care, 'the Care tab shows how many rested wins are left');
  assert.ok(r.used, 'and says so when they are used up');
  assert.ok(r.swapToast, 'swapping in a rested buddy says so');
});

test('rested buddies earn more XP per win than a worn-out one on the same fight', async () => {
  const fresh = await winFight([30, 30, 30], 30);
  const used = await winFight([30, 30, 30], 30, undefined, true);
  assert.ok(fresh.xp[0] > used.xp[0], `rested ${fresh.xp[0]} > used up ${used.xp[0]}`);
  assert.ok(Math.abs(fresh.xp[0] / used.xp[0] - 1.5) < 0.2, 'about 50% more');
});

test('lands and Alpha hunts open by the journey level: one buddy far ahead cannot unlock the whole journey alone', async () => {
  const r = await page.evaluate(() => {
    const set = (a, b, c) => { state.unlockedPets = ['dog', 'otter', 'fox']; state.unlockedSecrets = []; state.activePet = 'dog'; state.team = ['dog']; state.buddyXp = { dog: xpForLevel(a), otter: xpForLevel(b), fox: xpForLevel(c) }; };
    const mystic = REGIONS.find((x) => x.id === 'mystic'), tide = REGIONS.find((x) => x.id === 'tide');
    const out = {};
    set(60, 5, 5); out.farmer = [journeyLevel(), getBestLevel(), regionUnlocked(tide), regionUnlocked(mystic)];
    openMap(); out.text = document.getElementById('map-body').innerText.includes('your team: Lv 35'); out.hint = document.getElementById('map-body').innerText.includes('Level up your other buddies'); closeMap();
    set(60, 60, 60); out.balanced = [journeyLevel(), regionUnlocked(mystic)];
    set(40, 25, 25); out.normal = [journeyLevel(), regionUnlocked(REGIONS.find((x) => x.id === 'volt'))];        // a normal team with a leader a bit ahead keeps its pace
    state.unlockedPets = ['dog']; state.buddyXp = { dog: xpForLevel(50) }; out.lone = [journeyLevel(), regionUnlocked(mystic)];                  // a first buddy has nobody to lag behind
    // Alpha hunts: the gate uses the journey level too
    const idx = monstersList.findIndex((m) => m.buddy); state.bossBook = { [idx]: { wins: 1, form: 0, alpha: 1 } }; state.unlockedSecrets = [];
    set(60, 5, 5); out.alphaFarmer = wantedBossCopies([idx]).length;
    set(60, 60, 60); out.alphaBalanced = wantedBossCopies([idx]).length > 0;
    return out;
  });
  assert.deepEqual(r.farmer, [35, 60, true, false], 'Tide Bay (Lv 16) is open, Mystic Peak (Lv 48) waits for the team');
  assert.ok(r.text, 'the lock says your team level');
  assert.ok(r.hint, 'and nudges the player to level the others');
  assert.deepEqual(r.balanced, [60, true]);
  assert.deepEqual(r.normal, [40, true]);
  assert.deepEqual(r.lone, [50, true]);
  assert.equal(r.alphaFarmer, 0);
  assert.ok(r.alphaBalanced);
});

test('bad win-count data in a save is repaired', async () => {
  const r = await page.evaluate(() => {
    state.wildWins = { day: 5, n: 'x' }; normalizeState(); const a = JSON.stringify(state.wildWins);
    state.wildWins = 'broken'; normalizeState();
    state.unlockedPets = ['dog']; state.rested = { day: 7, fights: { dog: 'x', ghost: 4, otter: 2 } }; normalizeState(); const b = JSON.stringify(state.rested);
    state.rested = 'broken'; normalizeState();
    return [a, Object.keys(state.wildWins).sort().join(','), b, Object.keys(state.rested).sort().join(',')];
  });
  assert.equal(r[0], '{"day":"","n":0}');
  assert.equal(r[1], 'day,n');
  assert.equal(r[2], '{"day":"","fights":{"dog":0}}', 'only owned buddies keep a count');
  assert.equal(r[3], 'day,fights');
});

test('no errors', () => { assert.deepEqual(errors, []); });
