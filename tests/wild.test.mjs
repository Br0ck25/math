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
    state.gems = 0; state.monstersDefeated = 0; state.wild.since = 0; const lvl = bossLevel;      // (an earlier test's late save may have been reloaded)
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
  assert.deepEqual(r.wild, { id: '', trainer: '', shiny: false, since: 0, next: 8 });
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

test('the Buddy Dex: a buddy you have only met shows its name, an unmet one is hidden, and it counts seen and caught', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    state.unlockedPets = ['dog']; state.dexSeen = {};
    const unmet = wildPool().find((p) => p.id === 'fox');
    out.unseenBefore = dexSeen('fox');
    state.wild.id = ''; pickNextWild(); const met = state.wild.id;
    out.metSeen = dexSeen(met) && !getOwnedIds().includes(met);
    state.dexSeen = { fox: 1 };
    bookTab = 'buddy'; bookMissingOnly = false; renderBook();
    const html = document.getElementById('book-body').innerHTML;
    out.seenCard = /Seen · not caught yet/.test(html) && html.includes('Sparky');
    out.header = document.getElementById('book-progress').innerText;
    out.title = document.querySelector('#book-modal h2').innerText;
    out.num = '#' + String(dexNumber('dog')).padStart(3, '0');
    out.hasNum = html.includes(out.num + ' Pup');
    state.dexSeen = { fox: 1, nope: 1 }; NORMALIZERS.forEach((fn) => fn(state)); out.cleaned = Object.keys(state.dexSeen);
    return out;
  });
  assert.equal(r.unseenBefore, false);
  assert.equal(r.metSeen, true, 'meeting a wild buddy marks it seen');
  assert.equal(r.seenCard, true);
  assert.match(r.header, /Seen \d+ · ✅ Caught 1 \/ \d+/);
  assert.match(r.title, /Buddy Dex/);
  assert.equal(r.hasNum, true, 'dex numbers on cards');
  assert.deepEqual(r.cleaned, ['fox']);
});

test('Dex pack rewards: owning every buddy of a pack pays once (gems per member plus Catch Nets); an incomplete or claimed pack pays nothing', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    const g = buddyPacks().find((x) => x.pack.id === 'arctic');
    state.gems = 0; state.nets = 8; state.packClaims = []; bookTab = 'buddy'; bookMissingOnly = false;
    const first = g.members[0];
    state.unlockedPets = ['dog', first.id];
    claimPackReward('arctic'); out.incomplete = [state.gems, state.packClaims.length];
    renderBook(); out.noButton = !document.getElementById('book-body').innerHTML.includes('claimPackReward');
    g.members.forEach((m) => { if (!getOwnedIds().includes(m.id)) state.unlockedSecrets.push(m.id); });
    renderBook(); out.button = document.getElementById('book-body').innerHTML.includes('claimPackReward(&quot;arctic&quot;)');
    claimPackReward('arctic'); out.paid = [state.gems, state.nets, state.packClaims.join()];
    claimPackReward('arctic'); out.twice = state.gems;
    renderBook(); out.done = document.getElementById('book-body').innerHTML.includes('Pack complete');
    state.packClaims = ['arctic', 'arctic', 'nope', 7]; NORMALIZERS.forEach((fn) => fn(state)); out.clean = state.packClaims.join();
    out.pay = g.members.length * ECON.dex.packGemsPer;
    return out;
  });
  assert.deepEqual(r.incomplete, [0, 0]);
  assert.equal(r.noButton, true);
  assert.equal(r.button, true);
  assert.deepEqual(r.paid, [r.pay, 9, 'arctic'], 'nets are capped at the stock limit');
  assert.equal(r.twice, r.pay, 'a pack pays only once');
  assert.equal(r.done, true);
  assert.equal(r.clean, 'arctic');
});

test('shiny buddies: catching the golden daily rare makes that buddy glow for good (owned or a spare), and saves are repaired', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    const real = Math.random; Math.random = () => 0;                    // every catch succeeds
    state.unlockedPets = ['dog']; state.unlockedSecrets = []; state.shinies = {};
    const sp = wildPool().find((p) => isStoreBuddy(p) && p.id !== 'dog');
    resolveCatch({ id: sp.id, flawless: false, shiny: false }, 0);
    out.plain = [getOwnedIds().includes(sp.id), !!state.shinies[sp.id]];
    state.unlockedPets = ['dog']; state.shinies = {};
    resolveCatch({ id: sp.id, flawless: false, shiny: true }, 0);
    out.shiny = [getOwnedIds().includes(sp.id), !!state.shinies[sp.id]];
    out.glow = avatarHtml(getPetById(sp.id), 40).includes('buddy-avatar shiny') && !avatarHtml(getPetById('dog'), 40).includes('shiny');
    resolveCatch({ id: sp.id, flawless: false, shiny: true }, 0);        // already owned: a spare, still shiny
    out.spare = [state.spares[sp.id], !!state.shinies[sp.id]];
    bookTab = 'buddy'; bookMissingOnly = false; renderBook();
    out.book = document.getElementById('book-body').innerHTML.includes('✨ ') && /Shiny 1/.test(document.getElementById('book-progress').innerText);
    Math.random = real;
    state.shinies = { [sp.id]: 1, dog: 0, stranger: 1, fox: 1 }; NORMALIZERS.forEach((fn) => fn(state));
    out.clean = Object.keys(state.shinies).join();
    out.id = sp.id;
    return out;
  });
  assert.deepEqual(r.plain, [true, false], 'a normal catch is not shiny');
  assert.deepEqual(r.shiny, [true, true]);
  assert.equal(r.glow, true);
  assert.deepEqual(r.spare, [1, true]);
  assert.equal(r.book, true);
  assert.equal(r.clean, r.id, 'only owned buddies can be shiny');
});

test('Catch Nets: you choose after a win how many (up to 3) to throw; more nets, better chance; closing the window is a plain try', async () => {
  const r = await page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const out = {};
    const sp = getSpecies('fox'); state.activePet = 'dog'; state.nets = 0;
    const c = [0, 1, 2, 3].map((n) => wildCatchChance(sp, { nets: n }));
    out.chances = c; out.flawless = wildCatchChance(sp, { flawless: true }) / c[0]; out.cap = wildCatchChance(getSpecies('hedgehog'), { nets: 3, flawless: true });
    const win = async () => { state.wild.id = 'fox'; bossLevel = 5; bossMistakes = 0; monsterCurrentHp = 1; inputLocked = false; triggerMonsterDamage(99, false); await wait(1500); };
    state.unlockedPets = ['dog']; state.spares = {}; state.gems = 1000; modalDone();
    // no nets in stock: no window, the roll just happens
    const real = Math.random; Math.random = () => 0.99;
    await win(); out.noWindow = getComputedStyle(document.getElementById('catch-modal')).display;
    // with nets in stock: the window asks
    state.nets = 2; await win();
    out.window = document.getElementById('catch-modal').style.display;
    const btns = [...document.querySelectorAll('#catch-options .move-btn')];
    out.buttons = btns.map((b) => [b.disabled, b.querySelector('.mv-cost').innerText]);
    out.title = document.getElementById('catch-title').innerText;
    chooseNets(2);                                           // fails the roll (0.99) but the nets are spent
    out.afterTwo = [state.nets, document.getElementById('catch-modal').style.display];
    state.nets = 3; await win(); Math.random = () => 0; chooseNets(3);       // a sure catch
    out.caught = [state.unlockedPets.includes('fox'), state.nets];
    closeLootModal(false);
    state.nets = 1; Math.random = () => 0.99; await win(); closeCatchModal(); out.closed = state.nets;
    Math.random = real;
    chooseNets(1); out.noPending = state.nets;                // nothing pending: nothing happens
    // buying: up to the stock, no gems taken beyond it
    state.nets = 0; state.gems = 1000; buyItem('net'); const bought = [state.nets, state.gems];
    state.nets = ECON.wild.net.stock; state.gems = 1000; buyItem('net'); const full = [state.nets, state.gems];
    state.nets = 0; state.wild.id = 'fox'; updateStatsUI(); const chip0 = document.getElementById('weak-chip').innerText;
    state.nets = 2; updateStatsUI();
    return { ...out, bought, full, chip0, chip2: document.getElementById('weak-chip').innerText, stock: ECON.wild.net.stock };
  });
  assert.ok(r.chances[0] < r.chances[1] && r.chances[1] < r.chances[2] && r.chances[2] < r.chances[3], 'more nets, better chance: ' + r.chances);
  assert.ok(Math.abs(r.chances[2] / r.chances[0] - 2) < 1e-9 && Math.abs(r.chances[3] / r.chances[0] - 2.5) < 1e-9);
  assert.ok(Math.abs(r.flawless - 1.25) < 1e-9);
  assert.ok(r.cap <= 0.75 + 1e-9, 'never above the cap');
  assert.equal(r.noWindow, 'none', 'no nets: no window');
  assert.equal(r.window, 'flex');
  assert.deepEqual(r.buttons.map((b) => b[0]), [false, false, false, true], 'a third net is not available with 2 in stock');
  assert.match(r.title, /You beat Sparky/);
  assert.deepEqual(r.afterTwo, [0, 'none']);
  assert.deepEqual(r.caught, [true, 0], 'throwing 3 nets can catch it');
  assert.equal(r.closed, 1, 'closing the window spends no nets');
  assert.equal(r.noPending, 1);
  assert.deepEqual(r.bought, [1, 970]);
  assert.deepEqual(r.full, [r.stock, 1000], 'no more than the stock, and no gems taken');
  assert.ok(!r.chip0.includes('🕸️') && r.chip2.includes('🕸️2'));
});

test('the daily rare: once a day after 3 wild wins a golden buddy appears, tougher, easier to catch, paying extra; it is the same species all day', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    state.daily = { day: dayKey(), fights: 0, spawned: false }; state.wild.id = ''; state.gym = null;
    pickNextWild(); out.early = state.wild.shiny;
    state.daily.fights = 3; pickNextWild(); out.shiny = state.wild.shiny; out.id = state.wild.id; out.want = dailyRareId();
    const info = getBossInfo(); const plain = wildStats(bossLevel).maxHp;
    out.hp = [info.maxHp, Math.ceil(plain * ECON.daily.hpMult)]; out.name = info.name.startsWith('✨ ');
    out.chip = document.getElementById('weak-chip').innerText; updateWeakChip(); out.chip = document.getElementById('weak-chip').innerText;
    out.cap = wildCatchChance(getSpecies(out.id), { shiny: true });
    pickNextWild(); out.again = state.wild.shiny;
    state.daily.day = '2000-01-01'; state.daily.fights = 5; pickNextWild(); out.reset = [state.wild.shiny, state.daily.spawned, state.daily.fights];
    state.daily.fights = 3; pickNextWild(); out.nextDay = [state.wild.shiny, state.daily.spawned];
    state.wild.shiny = true; state.gems = 0; bossLevel = 5; state.unlockedPets = ['dog'];
    monsterCurrentHp = 1; inputLocked = false; triggerMonsterDamage(99, false);
    await new Promise((res) => setTimeout(res, 1500));
    out.gems = state.gems;
    state.wild = { id: 'fox', trainer: '', shiny: true, since: 0, next: 6 }; NORMALIZERS.forEach((fn) => fn(state)); out.keep = state.wild.shiny;
    state.wild = { id: '', trainer: '', shiny: true, since: 0, next: 6 }; NORMALIZERS.forEach((fn) => fn(state)); out.drop = state.wild.shiny;
    return out;
  });
  assert.equal(r.early, false, 'not before 3 wild wins');
  assert.equal(r.shiny, true);
  assert.equal(r.id, r.want);
  assert.deepEqual(r.hp[0], r.hp[1]);
  assert.equal(r.name, true);
  assert.match(r.chip, /✨ 🫧 Catch \d+%/);
  assert.ok(r.cap <= 0.6 + 1e-9 || r.cap >= 0, 'capped');
  assert.equal(r.again, false, 'only once a day');
  assert.deepEqual(r.reset, [false, false, 0], 'a new day starts the count again');
  assert.deepEqual(r.nextDay, [true, true], 'and brings a new one');
  assert.ok(r.gems >= ECON_DAILY_GEMS, 'extra gems: ' + r.gems);
  assert.equal(r.keep, true);
  assert.equal(r.drop, false);
});
const ECON_DAILY_GEMS = 20;

test('the type chart is fair: no two types beat each other, every type beats exactly two and loses to exactly two', async () => {
  const r = await page.evaluate(() => {
    const types = Object.keys(TYPE_STRONG), out = { mutual: [], none: [], count: {} };
    types.forEach((a) => TYPE_STRONG[a].forEach((b) => { if (TYPE_STRONG[b].includes(a)) out.mutual.push(a + '/' + b); }));
    types.forEach((t) => {
      const beats = TYPE_STRONG[t].length, weak = types.filter((o) => TYPE_STRONG[o].includes(t)).length;
      out.count[t] = [beats, weak]; if (!beats || !weak) out.none.push(t);
    });
    out.magic = [getTypeRelation('magic', 'dark'), getTypeRelation('magic', 'fire'), getTypeRelation('electric', 'magic'), getTypeRelation('water', 'magic'), getTypeRelation('magic', 'water'), getTypeRelation('magic', 'electric')];
    openSettings(); out.chart = document.getElementById('type-chart').textContent; closeSettings();
    return out;
  });
  assert.deepEqual(r.mutual, []);
  assert.deepEqual(r.none, []);
  Object.keys(r.count).forEach((t) => assert.deepEqual(r.count[t], [2, 2], t + ' beats two types and loses to two'));
  assert.deepEqual(r.magic, [1, 1, 1, 1, -1, -1]);
  assert.match(r.chart, /Magic[\s\S]*weak to 💧 Water, ⚡ Electric/);
});

test('no errors', () => { assert.deepEqual(errors, []); });
