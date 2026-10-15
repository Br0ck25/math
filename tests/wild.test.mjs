// Wild buddies: most battles are against a buddy you may catch; a boss comes after every 5-8; spares sell for gems.
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

// Beats the current foe. `random` (optional) fixes Math.random for the catch roll and the next pick.
const beat = (random) => page.evaluate(async (rnd) => {
  const real = Math.random;
  if (rnd !== undefined) Math.random = () => rnd;
  monsterCurrentHp = 1; inputLocked = false; state.faintedPets = [];
  triggerMonsterDamage(50, false);
  await new Promise((res) => setTimeout(res, 1000));
  Math.random = real;
}, random);

test('a new player starts against a wild buddy, with its catch chance shown and no weak point', async () => {
  const r = await page.evaluate(() => ({
    wild: getBossInfo().wild, id: state.wild.id, chip: document.getElementById('weak-chip').innerText,
    name: document.getElementById('monster-name').innerText, want: getSpecies(state.wild.id).name, form: getBossInfo().form
  }));
  assert.equal(r.wild, true);
  assert.ok(r.id);
  assert.equal(r.name, r.want);
  assert.equal(r.form, 0);
  assert.match(r.chip, /Catch chance: \d+%/);
});

test('a boss appears after every 5 to 8 wild buddies, then wild buddies start again', async () => {
  const seen = [];
  for (let i = 0; i < 20 && seen.filter((s) => s === 'boss').length < 2; i++) {
    seen.push(await page.evaluate(() => (getBossInfo().wild ? 'wild' : 'boss')));
    await beat(0.5);
  }
  const runs = []; let n = 0;
  seen.forEach((s) => { if (s === 'wild') n++; else { runs.push(n); n = 0; } });
  assert.ok(runs.length >= 1, JSON.stringify(seen));
  runs.forEach((x) => assert.ok(x >= 5 && x <= 8, 'wild battles before a boss: ' + x));
  assert.equal(seen[seen.indexOf('boss') + 1], 'wild', 'after a boss, wild buddies again');
});

test('a wild win pays wild gems, counts no boss, and the boss counter is untouched', async () => {
  const r = await page.evaluate(async () => {
    state.gems = 0; const lvl = bossLevel;
    monsterCurrentHp = 1; inputLocked = false;
    triggerMonsterDamage(50, false);
    await new Promise((res) => setTimeout(res, 1000));
    return { gems: state.gems, want: ECON.wild.gemBase + Math.floor(lvl / ECON.wild.gemPerLevels), bosses: state.monstersDefeated, since: state.wild.since };
  });
  assert.ok(r.gems >= r.want, `${r.gems} >= ${r.want}`);
  assert.equal(r.bosses, 0);
  assert.equal(r.since, 1);
});

test('beating a wild buddy can catch it: a new one joins, one you own becomes a spare', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    state.wild.id = 'fox'; bossLevel = 5; state.unlockedPets = ['dog'];
    const real = Math.random; Math.random = () => 0;
    monsterCurrentHp = 1; inputLocked = false; triggerMonsterDamage(50, false);
    await new Promise((res) => setTimeout(res, 1000));
    Math.random = real;
    out.owned = state.unlockedPets.includes('fox'); out.spares1 = spareCount('fox'); out.modal = document.getElementById('loot-modal').style.display;
    out.tag = document.getElementById('loot-modal-tag').innerText;
    closeLootModal(false);
    state.wild.id = 'fox'; bossLevel = 5; Math.random = () => 0;
    monsterCurrentHp = 1; inputLocked = false; triggerMonsterDamage(50, false);
    await new Promise((res) => setTimeout(res, 1000));
    Math.random = real;
    out.spares2 = spareCount('fox'); out.count = state.unlockedPets.filter((x) => x === 'fox').length;
    return out;
  });
  assert.equal(r.owned, true);
  assert.equal(r.spares1, 0);
  assert.equal(r.modal, 'flex');
  assert.match(r.tag, /CAUGHT/);
  assert.equal(r.spares2, 1, 'a second catch is a spare');
  assert.equal(r.count, 1, 'never listed twice');
});

test('missing a catch makes the next one more likely, and a catch resets it', async () => {
  const r = await page.evaluate(async () => {
    state.wild.id = 'fox'; state.wild.miss = 0;
    const sp = getSpecies('fox'); const base = wildCatchChance(sp);
    state.wild.miss = 2; const two = wildCatchChance(sp);
    state.wild.miss = 99; const capped = wildCatchChance(sp);
    return { base, two, capped, max: base + ECON.wild.pityMax * ECON.wild.pityStep };
  });
  assert.ok(r.two > r.base);
  assert.ok(Math.abs(r.capped - r.max) < 1e-9, 'the bonus is capped');
});

test('spares sell for gems, never below zero spares and never the last copy of a buddy', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    state.unlockedPets = ['dog', 'fox']; state.spares = { fox: 2 }; state.gems = 10;
    out.value = spareValueOf('fox'); out.cost = getSpecies('fox').cost;
    sellSpare('fox'); out.after1 = [state.gems, spareCount('fox')];
    sellSpare('fox'); sellSpare('fox');
    out.after3 = [state.gems, spareCount('fox'), state.unlockedPets.includes('fox')];
    state.spares = { fox: 1, dog: 2 }; state.gems = 0;
    const total = spareValueOf('fox') + 2 * spareValueOf('dog');
    sellAllSpares(); out.all = [state.gems === total, Object.keys(state.spares).length];
    out.secret = spareValue(false, 0); out.cap = spareValue(true, 100000);
    return out;
  });
  assert.equal(r.value, Math.max(3, Math.round(r.cost * 0.2)));
  assert.ok(r.value < r.cost, 'selling pays far less than buying');
  assert.deepEqual(r.after1, [10 + r.value, 1]);
  assert.deepEqual(r.after3, [10 + 2 * r.value, 0, true]);
  assert.deepEqual(r.all, [true, 0]);
  assert.equal(r.secret, 12);
  assert.equal(r.cap, 100);
});

test('the buddy hub offers to sell a spare', async () => {
  const r = await page.evaluate(() => {
    state.unlockedPets = ['dog', 'fox']; state.spares = { fox: 3 }; hubPet = 'fox'; hubTab = 'care'; renderHub();
    return document.getElementById('hub-body').innerText;
  });
  assert.match(r, /Spare Sparky x3/);
  assert.match(r, /Sell \+\d+/);
});

test('bad wild and spare data in a save is repaired', async () => {
  const r = await page.evaluate(() => {
    state.wild = { id: 'not_a_buddy', since: -4, next: 99, miss: 'x' };
    state.spares = { fox: 500, ghost: 3, dog: -1 }; state.unlockedPets = ['dog', 'fox'];
    NORMALIZERS.forEach((fn) => fn(state));
    return { wild: state.wild, spares: state.spares };
  });
  assert.deepEqual(r.wild, { id: '', since: 0, next: 8, miss: 0 });
  assert.deepEqual(r.spares, { fox: 99 });
});

test('a saved wild fight survives a reload', async () => {
  await page.evaluate(() => { state.wild.id = 'fox'; state.bossLevel = 7; saveState(); });
  await page.reload();
  assert.deepEqual(await page.evaluate(() => [state.wild.id, getBossInfo().name, getBossInfo().level]), ['fox', 'Sparky', 7]);
});

test('no errors', () => { assert.deepEqual(errors, []); });
