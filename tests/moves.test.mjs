// Moves, energy, status effects, evolution.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

let browser, worker, env, page, errors;
before(async () => {
  browser = await launch();
  worker = await loadWorker();
  env = { MATH_KV: fakeKV() };
  ({ page, errors } = await openGame(browser, worker, env, { fast: true }));
});
after(async () => { await browser.close(); });
beforeEach(async () => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  errors.length = 0;
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; });
});

test('a buddy learns moves by level, with names from its element', async () => {
  const r = await page.evaluate(() => {
    const at = (lvl) => movesLearned(lvl).map((m) => m.id).join(',');
    const pet = { element: 'fire', superMove: 'Flame Tail', level: 1 };
    return { l1: at(1), l8: at(8), l18: at(18), l30: at(30), names: MOVES.map((m) => moveName(m, pet)), water: moveName(MOVES[2], { element: 'water', superMove: 'x' }), between: movesBetween(10, 20).map((m) => m.id) };
  });
  assert.equal(r.l1, 'strike,ult');
  assert.equal(r.l8, 'strike,guard,ult');
  assert.equal(r.l18, 'strike,guard,power,ult');
  assert.equal(r.l30, 'strike,guard,power,cleanse,heal,ult');
  assert.deepEqual(r.names, ['Ember', 'Guard', 'Flame Wheel', 'Cleanse', 'Recover', 'Absorb', 'Flame Tail']);
  assert.equal(r.water, 'Tidal Crash');
  assert.deepEqual(r.between, ['power']);
});

test('the Moves sheet spends energy: a damage move hits, guard blocks the next hit, recover heals, and unlearned or unaffordable moves are off', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    state.buddyXp.dog = xpForLevel(40); state.activePet = 'dog'; state.wild.id = ''; currentMonsterIndex = 0; bossLevel = 10; state.bossSwapped = false; state.raid = null;
    partyHp = {}; monsterCurrentHp = 50; inputLocked = false; ultimateCharge = 0;
    state.moveSet = { dog: ['strike', 'guard', 'power', 'heal'] };
    openMoves();
    out.sheet = document.getElementById('moves-modal').style.display;
    out.offAtZero = [...document.querySelectorAll('#moves-list .move-btn')].filter((b) => b.disabled).length;
    closeMoves();
    ultimateCharge = 1; const hp0 = monsterCurrentHp;
    useMove('strike');
    await new Promise((res) => setTimeout(res, 3000));
    out.strike = [hp0 - monsterCurrentHp > 0, ultimateCharge];
    ultimateCharge = 1; useMove('guard'); out.guard = [guardUp, ultimateCharge];
    inputLocked = false; state.shields = 0; const petHp = getPetHp('dog');
    userInput = String(currentProblem.answer + 7); checkAnswer();
    await new Promise((res) => setTimeout(res, 3000));
    out.blocked = [getPetHp('dog') === petHp, guardUp];
    inputLocked = false; setPetHp('dog', 1); ultimateCharge = 2; useMove('heal');
    out.heal = [getPetHp('dog') > 1, ultimateCharge];
    ultimateCharge = 0; useMove('power'); out.noEnergy = ultimateCharge;
    state.buddyXp.dog = xpForLevel(5); ultimateCharge = 3; const before = monsterCurrentHp; useMove('power');
    out.unlearned = monsterCurrentHp === before;
    return out;
  });
  assert.equal(r.sheet, 'flex');
  assert.ok(r.offAtZero >= 4, 'with no energy the moves are off');
  assert.deepEqual(r.strike, [true, 0]);
  assert.deepEqual(r.guard, [true, 0]);
  assert.deepEqual(r.blocked, [true, false], 'the hit was blocked and Guard used up');
  assert.deepEqual(r.heal, [true, 0]);
  assert.equal(r.noEnergy, 0);
  assert.equal(r.unlearned, true, 'a move your buddy has not learned does nothing');
});

test('status effects: a foe can burn, freeze or weaken your buddy for 3 problems; they tick down and Recover cures them', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    out.map = ['fire', 'water', 'nature', 'electric', 'magic', 'dark'].map((e) => ELEMENT_STATUS[e]).join(',');
    state.wild.id = ''; currentMonsterIndex = 0; bossLevel = 5; resetBattleEffects();
    const real = Math.random; Math.random = () => 0;
    maybeInflictStatus({ element: 'fire', wild: false });
    out.applied = [buddyStatus.kind, buddyStatus.left, document.getElementById('pet-status').innerText];
    maybeInflictStatus({ element: 'water', wild: false });
    out.noStack = buddyStatus.kind;
    Math.random = real;
    tickStatus(); tickStatus(); out.left2 = buddyStatus.left;
    tickStatus(); out.gone = [buddyStatus.kind, document.getElementById('pet-status').style.display];
    Math.random = () => 0; maybeInflictStatus({ element: 'nature', wild: true }); Math.random = real;
    clearBuddyStatus(); out.cleared = buddyStatus.left;
    return out;
  });
  assert.equal(r.map, 'burn,frozen,weak,burn,frozen,weak');
  assert.deepEqual(r.applied, ['burn', 3, '🔥3']);
  assert.equal(r.noStack, 'burn', 'one status at a time');
  assert.equal(r.left2, 1);
  assert.deepEqual(r.gone, ['', 'none']);
  assert.equal(r.cleared, 0);
});

test('burn makes a miss cost 1 extra HP, weak takes 1 off your hit, frozen halves a slow hit; a new battle clears them', async () => {
  const r = await page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const out = {};
    state.activePet = 'dog'; state.buddyXp.dog = xpForLevel(30); state.shields = 0; state.wild.id = ''; currentMonsterIndex = 0; bossLevel = 1; state.bossSwapped = false; state.raid = null;
    const miss = async (burn) => {
      partyHp = {}; clearBuddyStatus(); if (burn) buddyStatus = { kind: 'burn', left: 3 };
      monsterCurrentHp = 99; inputLocked = false; guardUp = false;
      const real = Math.random; Math.random = () => 0.99;       // no new status
      userInput = String(currentProblem.answer + 7); checkAnswer();
      await wait(1500); Math.random = real;
      return getPetMaxHp('dog') - getPetHp('dog');
    };
    out.plain = await miss(false); out.burned = await miss(true);
    const hit = async (kind) => {
      clearBuddyStatus(); if (kind) buddyStatus = { kind, left: 3 };
      monsterCurrentHp = 99; inputLocked = false; triggerMonsterDamage(0, false, false, kind === 'frozen' ? 0.5 : 1);
      await wait(1500);
      return 99 - monsterCurrentHp;
    };
    out.hit = await hit(''); out.weak = await hit('weak'); out.frozen = await hit('frozen');
    buddyStatus = { kind: 'weak', left: 2 }; guardUp = true; pickNextWild();
    out.reset = [buddyStatus.left, guardUp];
    return out;
  });
  assert.equal(r.burned, r.plain + 1);
  assert.ok(r.weak < r.hit && r.weak >= 1);
  assert.ok(r.frozen < r.hit && r.frozen >= 1);
  assert.deepEqual(r.reset, [0, false]);
});

test('evolving shows the jump in stats and the moves learned', async () => {
  const r = await page.evaluate(() => {
    const before = getPetById('dog');
    state.buddyXp.dog = xpForLevel(31); const after = getPetById('dog');
    openEvoModal({ ...before, level: 29, stage: 0 }, { ...after, level: 30, stage: 1 });
    const txt = document.getElementById('evo-stats').innerText;
    closeEvoModal();
    return { txt, hp: [petHpAt(29, 0), petHpAt(30, 1)], atk: [petAttackAt(29, 0), petAttackAt(30, 1)] };
  });
  assert.ok(r.txt.includes('➜'), r.txt);
  assert.ok(r.txt.includes('HP ' + r.hp[0] + ' ➜ ' + r.hp[1]), r.txt);
  assert.ok(r.txt.includes('ATK ' + r.atk[0] + ' ➜ ' + r.atk[1]), r.txt);
  assert.match(r.txt, /New move: Recover/);
});

test('no errors', () => { assert.deepEqual(errors, []); });

test('move slots: a buddy takes 4 moves plus its ultimate into battle, the player chooses them, and the choice is saved and repaired', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    state.buddyXp.dog = xpForLevel(40); state.activePet = 'dog'; state.wild.id = ''; currentMonsterIndex = 0; ultimateCharge = 3; inputLocked = false;
    const pet = () => getActivePetDisplay();
    const ids = () => equippedMoves(pet()).map((m) => m.id).join(',');
    const shown = () => [...document.querySelectorAll('#moves-list .move-btn b')].map((b) => b.innerText).length;
    out.default = ids();                                       // unchanged for existing players: the new moves are opt-in
    openMoves(); out.battleButtons = shown();
    toggleMovesEdit(); out.editButtons = shown();
    toggleEquip('drain'); out.full = [ids(), (state.moveSet.dog || []).length];     // all 4 slots are full: nothing changes
    toggleEquip('guard'); toggleEquip('drain');
    out.swapped = ids();
    toggleMovesEdit(); out.battleAfter = shown();
    // a move that is not equipped cannot be used
    const hp = monsterCurrentHp; ultimateCharge = 3; const before = ultimateCharge; useMove('guard'); out.unequippedUsed = [ultimateCharge !== before, guardUp];
    // cleanse clears a status
    toggleEquip('power'); toggleEquip('cleanse'); closeMoves();
    buddyStatus = { kind: 'burn', left: 3 }; ultimateCharge = 1; useMove('cleanse'); out.cleansed = [buddyStatus.left, ultimateCharge];
    // drain hurts the foe and heals a point
    setPetHp('dog', 2); monsterCurrentHp = 50; inputLocked = false; ultimateCharge = 2; useMove('drain'); out.drained = [getPetHp('dog'), ultimateCharge];
    // saves are repaired
    state.moveSet = { dog: ['drain', 'drain', 'nonsense', 'strike', 'power', 'heal', 'guard'], nobody: ['strike'], bunny: 'x' };
    normalizeState();
    out.repaired = [JSON.stringify(state.moveSet.dog), Object.keys(state.moveSet).join(',')];
    return out;
  });
  assert.equal(r.default, 'strike,guard,power,heal,ult');
  assert.equal(r.battleButtons, 5, 'in battle: 4 moves and the ultimate');
  assert.equal(r.editButtons, 7, 'when choosing: every move');
  assert.deepEqual(r.full, ['strike,guard,power,heal,ult', 0], 'a full set refuses a fifth move and saves nothing');
  assert.equal(r.swapped, 'strike,power,heal,drain,ult');
  assert.equal(r.battleAfter, 5);
  assert.deepEqual(r.unequippedUsed, [false, false], 'a move left out cannot be used');
  assert.deepEqual(r.cleansed, [0, 0]);
  assert.equal(r.drained[1], 0); assert.ok(r.drained[0] >= 3, 'Absorb heals 1 HP: ' + r.drained);
  assert.deepEqual(r.repaired, ['["drain","strike","power","heal"]', 'dog']);
});
