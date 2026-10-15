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
  assert.match(r.chip, /Catch \d+%/);
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

test('catching is easier when your buddy is strong against the wild one, harder when it is weak', async () => {
  const r = await page.evaluate(() => {
    state.unlockedPets = ['dog', 'fox']; state.unlockedSecrets = [];
    const sp = getSpecies('fox');                       // fire
    state.activePet = 'otter';                          // water beats fire
    state.unlockedPets = ['dog', 'fox', 'otter'];
    const strong = wildCatchChance(sp);
    state.activePet = 'hedgehog'; state.unlockedPets.push('hedgehog');   // nature loses to fire
    const weak = wildCatchChance(sp);
    state.activePet = 'fox';
    const even = wildCatchChance(sp);
    return { strong, weak, even, base: ECON.wild.catchChance.cheap };
  });
  assert.ok(Math.abs(r.even - r.base) < 1e-9);
  assert.ok(Math.abs(r.strong - r.base * 1.5) < 1e-9);
  assert.ok(Math.abs(r.weak - r.base * 0.5) < 1e-9);
});

test('wild buddies get tougher as they level, hit harder, and obey the type chart', async () => {
  const r = await page.evaluate(() => {
    const out = { hp: [1, 10, 30, 60].map((l) => wildStats(l).maxHp), atk: [1, 20, 60].map((l) => wildStats(l).atk) };
    state.wild.id = 'fox'; bossLevel = 30;
    out.info = [getBossInfo().maxHp, getBossInfo().atk];
    state.unlockedPets = ['dog', 'fox', 'otter']; state.activePet = 'otter'; updateStatsUI();
    out.hint = document.getElementById('type-match-hint').innerText;
    return out;
  });
  assert.ok(r.hp.every((v, i) => !i || v > r.hp[i - 1]), 'HP grows with level: ' + r.hp);
  assert.ok(r.atk[2] > r.atk[0], 'attack grows too: ' + r.atk);
  assert.deepEqual(r.info, [wildStatsExpect(30)[0], wildStatsExpect(30)[1]]);
  assert.match(r.hint, /Super effective/);
});
function wildStatsExpect(l) { return [3 + Math.floor(l * 0.4), 1 + Math.floor(l / 15)]; }

test('a wild buddy has a card, opened by tapping it in the arena', async () => {
  const r = await page.evaluate(() => {
    state.wild.id = 'fox'; bossLevel = 20; state.unlockedPets = ['dog'];
    openArenaBossCard();
    const out = { open: document.getElementById('bosscard-modal').style.display, title: document.getElementById('boss-card-title').innerText };
    const c = wildCard('fox', 20);
    out.card = [c.name, c.levelText, c.stats.map((s) => s[2]).join(','), c.foot];
    const cv = document.createElement('canvas'); drawCardFromDesc(cv, c); out.w = cv.width;
    closeBossCard();
    return out;
  });
  assert.equal(r.open, 'flex');
  assert.match(r.title, /Wild Buddy Card/);
  assert.deepEqual(r.card.slice(0, 3), ['Sparky', 'Lv 20', 'HP,Attack,Catch']);
  assert.match(r.card[3], /Not in your collection/);
  assert.equal(r.w, 600);
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
    out.secret = spareValue(false, 0); out.big = spareValue(true, 3250); out.free = spareValue(true, 0);
    return out;
  });
  assert.equal(r.value, Math.round(r.cost * 0.2), 'exactly 20% of the shop price');
  assert.ok(r.value < r.cost, 'selling pays far less than buying');
  assert.deepEqual(r.after1, [10 + r.value, 1]);
  assert.deepEqual(r.after3, [10 + 2 * r.value, 0, true]);
  assert.deepEqual(r.all, [true, 0]);
  assert.equal(r.secret, 12);
  assert.equal(r.big, 650, 'no maximum');
  assert.equal(r.free, 1);
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
    state.wild = { id: 'not_a_buddy', since: -4, next: 99, miss: 3 };
    state.spares = { fox: 500, ghost: 3, dog: -1 }; state.unlockedPets = ['dog', 'fox'];
    NORMALIZERS.forEach((fn) => fn(state));
    return { wild: state.wild, spares: state.spares };
  });
  assert.deepEqual(r.wild, { id: '', since: 0, next: 8 });
  assert.deepEqual(r.spares, { fox: 99 });
});

test('a saved wild fight survives a reload', async () => {
  await page.evaluate(() => { state.wild.id = 'fox'; state.bossLevel = 7; saveState(); });
  await page.reload();
  assert.deepEqual(await page.evaluate(() => [state.wild.id, getBossInfo().name, getBossInfo().level]), ['fox', 'Sparky', 7]);
});

test('quests: only bosses count for "defeat bosses" and "flawless", not wild buddies', async () => {
  const r = await page.evaluate(async () => {
    state.quests = { day: dayKey(), chestClaimed: false, list: [
      { id: 'q0', type: 'boss', text: 'x', target: 2, reward: 1, progress: 0, done: false, claimed: false },
      { id: 'q1', type: 'flawless', text: 'x', target: 1, reward: 1, progress: 0, done: false, claimed: false }
    ] };
    monsterCurrentHp = 1; inputLocked = false; triggerMonsterDamage(50, false);
    await new Promise((res) => setTimeout(res, 1000));
    const afterWild = state.quests.list.map((q) => q.progress);
    state.wild.id = ''; currentMonsterIndex = 0; bossLevel = 5; partyHp = {}; bossMistakes = 0;
    monsterCurrentHp = 1; inputLocked = false; triggerMonsterDamage(50, false);
    await new Promise((res) => setTimeout(res, 1000));
    return { afterWild, afterBoss: state.quests.list.map((q) => q.progress) };
  });
  assert.deepEqual(r.afterWild, [0, 0]);
  assert.deepEqual(r.afterBoss, [1, 1]);
});

test('bosses grow stronger with their level, like wild buddies do', async () => {
  const r = await page.evaluate(() => {
    state.wild.id = ''; currentMonsterIndex = 0; state.bossSwapped = false; state.raid = null;
    const atk = [1, 9, 10, 30, 60].map((l) => { bossLevel = l; return getBossInfo().atk; });
    bossLevel = 60;
    return { atk, card: bossCard(0, { level: 60 }).stats[1][1], info: getBossInfo().atk, wildAtk: wildStats(60).atk };
  });
  assert.ok(r.atk.every((v, i) => !i || v >= r.atk[i - 1]) && r.atk[4] > r.atk[0], 'grows: ' + r.atk);
  assert.equal(r.atk[1], 1);
  assert.equal(r.atk[2], 2);
  assert.equal(r.card, r.info);
  assert.ok(r.info > r.wildAtk, 'a boss hits harder than a wild buddy of the same level');
});

test('one buddy swap per battle; a new battle gives a new swap', async () => {
  const r = await page.evaluate(async () => {
    const ids = storePets.slice(0, 3).map((s) => s.id);
    state.unlockedPets = ids; state.team = ids.slice(); state.activePet = ids[0]; state.faintedPets = []; state.swapUsed = false;
    updateStatsUI();
    swapBuddy(ids[1]);
    const out = { first: state.activePet === ids[1], used: state.swapUsed };
    swapBuddy(ids[2]);
    out.stayed = state.activePet === ids[1];
    out.dimmed = [...document.querySelectorAll('#team-bar .swap-chip')].filter((c) => c.classList.contains('resting')).length;
    monsterCurrentHp = 1; inputLocked = false; triggerMonsterDamage(50, false);
    await new Promise((res) => setTimeout(res, 1000));
    out.reset = state.swapUsed === false;
    return out;
  });
  assert.equal(r.first, true);
  assert.equal(r.used, true);
  assert.equal(r.stayed, true, 'the second swap is refused');
  assert.equal(r.dimmed, 2, 'the other chips look unavailable');
  assert.equal(r.reset, true);
});

test('fainted buddies come back only after a boss, not after a wild win', async () => {
  const r = await page.evaluate(async () => {
    state.unlockedPets = ['dog', 'fox']; state.activePet = 'dog'; state.faintedPets = ['fox'];
    monsterCurrentHp = 1; inputLocked = false; triggerMonsterDamage(50, false);
    await new Promise((res) => setTimeout(res, 1000));
    const afterWild = state.faintedPets.slice();
    state.wild.id = ''; currentMonsterIndex = 0; bossLevel = 5; partyHp = {}; state.faintedPets = ['fox'];
    monsterCurrentHp = 1; inputLocked = false; triggerMonsterDamage(50, false);
    await new Promise((res) => setTimeout(res, 1000));
    return { afterWild, afterBoss: state.faintedPets.slice() };
  });
  assert.deepEqual(r.afterWild, ['fox']);
  assert.deepEqual(r.afterBoss, []);
});

test('secret buddies stay a rare find: a low catch chance and a small share of all wild encounters', async () => {
  const r = await page.evaluate(() => {
    const sp = wildPool().find((p) => !isStoreBuddy(p));
    state.activePet = 'dog';
    const secretShare = 1 - ECON.wild.storeShare;
    return { chance: wildCatchChance(sp), perFight: secretShare * wildCatchChance(sp) };
  });
  assert.ok(r.chance <= 0.05, 'a secret buddy is caught ' + r.chance);
  assert.ok(r.perFight < 0.03, 'a new secret buddy at most every ~35 battles: ' + r.perFight);
});

test('Rocky only appears once your buddy is level 50, and never as a pick for a weaker one', async () => {
  const r = await page.evaluate(() => {
    const rocky = monstersList.findIndex((m) => m.name === 'Rocky');
    const picks = (xp) => {
      state.activePet = 'dog'; state.buddyXp.dog = xp; state.wild.since = 99;
      const seen = new Set();
      for (let i = 0; i < 400; i++) { currentMonsterIndex = -1; state.recentBossTypes = []; pickNextBoss(); seen.add(currentMonsterIndex); }
      return seen.has(rocky);
    };
    const out = { weak: picks(xpForLevel(49)), strong: picks(xpForLevel(50)) };
    state.buddyXp.dog = xpForLevel(10); out.avail = bossAvailable(rocky);
    state.buddyXp.dog = xpForLevel(50); out.availStrong = bossAvailable(rocky);
    return out;
  });
  assert.equal(r.weak, false);
  assert.equal(r.strong, true, 'a level 50 buddy can meet him');
  assert.equal(r.avail, false);
  assert.equal(r.availStrong, true);
});

test('no errors', () => { assert.deepEqual(errors, []); });
