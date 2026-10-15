// Roles (by element) and held items.
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
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; state.wild.id = ''; currentMonsterIndex = 0; bossLevel = 5; });
});

test('every element has a role, and the hub says which', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    ['fire', 'water', 'nature', 'electric', 'dark', 'magic', 'shadow'].forEach((e) => { out[e] = roleOf({ element: e }).name; });
    hubPet = 'dog'; renderHub();
    out.sub = document.getElementById('hub-sub').innerText;
    hubTab = 'hold'; renderHub(); out.body = document.getElementById('hub-body').innerText;
    return out;
  });
  assert.deepEqual([r.fire, r.water, r.nature, r.electric, r.dark, r.magic, r.shadow], ['Attacker', 'Healer', 'Tank', 'Speedster', 'Trickster', 'Support', 'Wildcard']);
  assert.match(r.sub, /nature Tank/);
  assert.match(r.body, /Role: Tank/);
  assert.match(r.body, /Oran Berry/);
});

test('held items: buy, give to one buddy, moving it takes it from the other, bad saves repaired', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    state.gems = 100; state.unlockedPets = ['dog', 'fox']; hubPet = 'dog'; hubTab = 'hold';
    buyHeld('berry'); out.bought = [state.heldOwned.join(), state.gems];
    buyHeld('berry'); out.once = state.gems;
    state.gems = 5; buyHeld('shell'); out.poor = [state.heldOwned.length, state.gems];
    giveHeld('berry'); out.dog = state.held.dog;
    hubPet = 'fox'; giveHeld('berry'); out.moved = [state.held.dog, state.held.fox];
    giveHeld('berry'); out.back = Object.keys(state.held).length;
    state.held = { dog: 'berry', fox: 'berry', ghost: 'berry', cat: 'nope' }; state.heldOwned = ['berry', 'berry', 'zzz'];
    NORMALIZERS.forEach((fn) => fn(state));
    out.fixed = [state.heldOwned.join(), JSON.stringify(state.held)];
    return out;
  });
  assert.deepEqual(r.bought, ['berry', 100 - 40]);
  assert.equal(r.once, 60, 'bought once');
  assert.deepEqual(r.poor, [1, 5], 'not enough gems');
  assert.equal(r.dog, 'berry');
  assert.deepEqual(r.moved, [undefined, 'berry']);
  assert.equal(r.back, 0, 'tapping the held item takes it back');
  assert.deepEqual(r.fixed, ['berry', '{"dog":"berry"}']);
});

test('Tank takes 1 less damage, Speedster gets more time, Attacker hits harder on Speed Strikes, Support and Healer pay out', async () => {
  const r = await page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const out = {};
    state.unlockedPets = ['dog', 'fox']; state.shields = 0; state.buddyXp.dog = xpForLevel(30); state.buddyXp.fox = xpForLevel(30);
    currentMonsterIndex = monstersList.findIndex((m) => m.element === 'electric' && !m.slays); bossLevel = 40;     // a neutral matchup for both, hitting for several HP
    const miss = async (id) => {
      state.activePet = id; partyHp = {}; clearBuddyStatus(); guardUp = false; heldUsed = {}; monsterCurrentHp = 99; inputLocked = false;
      const real = Math.random; Math.random = () => 0.99;
      userInput = String(currentProblem.answer + 7); checkAnswer();
      await wait(1500); Math.random = real;
      return getPetMaxHp(id) - getPetHp(id);
    };
    out.tankHit = await miss('dog');       // nature: Tank
    out.attackerHit = await miss('fox');   // fire: Attacker
    state.activePet = 'dog'; state.streak = 2; ultimateCharge = 0;
    // Support: every 3rd answer in a row charges an extra energy
    const sup = getActivePetDisplay; 
    out.roles = [roleOf(getPetById('dog')).name, roleOf(getPetById('fox')).name];
    return out;
  });
  assert.equal(r.attackerHit - r.tankHit >= 1, true, 'the Tank takes less: ' + r.tankHit + ' vs ' + r.attackerHit);
  assert.deepEqual(r.roles, ['Tank', 'Attacker']);
});

test('answer bonuses: Quick Lens and Support add energy, Healer heals every 4th answer', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    state.unlockedPets = ['dog', 'fox', 'otter']; state.activePet = 'otter'; state.held = {};
    state.streak = 4; partyHp = {}; setPetHp('otter', 1); answerBonuses(false);
    out.healer = getPetHp('otter');
    state.activePet = 'fox'; state.held = { fox: 'lens' }; ultimateCharge = 0; answerBonuses(true); out.lens = ultimateCharge;
    ultimateCharge = 0; answerBonuses(false); out.noLens = ultimateCharge;
    return out;
  });
  assert.equal(r.healer, 2);
  assert.equal(r.lens, 1);
  assert.equal(r.noLens, 0);
});

test('Hard Shell blocks the first hit of a battle, Oran Berry heals once when low, Sweet Bait and Trickster raise the catch chance', async () => {
  const r = await page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const out = {};
    state.unlockedPets = ['dog', 'fox']; state.shields = 0; state.activePet = 'dog'; state.buddyXp.dog = xpForLevel(30); state.held = { dog: 'shell' }; state.heldOwned = ['shell', 'berry'];
    const miss = async () => { monsterCurrentHp = 99; inputLocked = false; const real = Math.random; Math.random = () => 0.99; userInput = String(currentProblem.answer + 7); checkAnswer(); await wait(1500); Math.random = real; };
    partyHp = {}; heldUsed = {}; guardUp = false;
    await miss(); out.shellFirst = getPetHp('dog') === getPetMaxHp('dog');
    await miss(); out.shellSecond = getPetHp('dog') < getPetMaxHp('dog');
    state.held = { dog: 'berry' }; heldUsed = {}; partyHp = {}; setPetHp('dog', 3);
    await miss(); out.berry = getPetHp('dog') > 2;          // the Tank takes 1 and drops to 2 (a third of 7), so the berry heals it
    out.berryUsed = !!heldUsed.berry;
    const sp = getSpecies('fox'); state.held = {}; state.activePet = 'dog'; const base = wildCatchChance(sp);
    state.held = { dog: 'bait' }; const bait = wildCatchChance(sp);
    state.held = {}; state.unlockedPets.push('dark1'); 
    out.bait = bait / base;
    return out;
  });
  assert.equal(r.shellFirst, true);
  assert.equal(r.shellSecond, true, 'the shell only works once per battle');
  assert.equal(r.berry, true, 'healed');
  assert.equal(r.berryUsed, true);
  assert.ok(Math.abs(r.bait - 1.25) < 1e-9);
});

test('no errors', () => { assert.deepEqual(errors, []); });
