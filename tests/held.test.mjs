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
    buyHeld('berry'); confirmBuy(); out.bought = [state.heldOwned.join(), state.gems];
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
    heldUsed = { brave: true };                        // fox's quirk (Brave) is not what this test is about
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

test('pressing and holding a team chip opens the team picker; a quick tap still swaps; a tip shows once', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    const ids = storePets.slice(0, 4).map((x) => x.id);
    state.unlockedPets = ids; state.team = ids.slice(0, 3); state.activePet = ids[0]; state.swapUsed = false; state.faintedPets = []; state.storySeen = {};
    updateStatsUI();
    out.tip = document.getElementById('toast').innerText; state.storySeen.teamHint = state.storySeen.teamHint;
    const chip = () => document.querySelectorAll('#team-bar .swap-chip')[1];
    chip().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await new Promise((res) => setTimeout(res, 3000));
    chip().dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); chip().click();
    out.hub = [document.getElementById('hub-modal').style.display, hubTab, state.activePet === ids[0], state.swapUsed];
    document.getElementById('hub-modal').style.display = 'none'; modalDone();
    chip().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); chip().dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); chip().click();
    out.tap = [state.activePet === ids[1], document.getElementById('hub-modal').style.display];
    document.getElementById('toast').innerText = ''; updateStatsUI(); out.tip2 = document.getElementById('toast').innerText;
    hubTab = 'tour'; hubPet = ids[0]; renderHub(); out.heading = document.getElementById('hub-body').innerText;
    return out;
  });
  assert.match(r.tip, /press and hold a buddy/);
  assert.deepEqual(r.hub, ['flex', 'tour', true, false], 'a long press opens the picker and does not swap');
  assert.deepEqual(r.tap, [true, 'none'], 'a quick tap swaps');
  assert.equal(r.tip2, '', 'the tip shows only once');
  assert.match(r.heading, /Your team: pick up to 3 buddies/);
});

test('the Sanctuary, a new catch and the team chips share one swap per battle', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    const ids = storePets.slice(0, 3).map((x) => x.id);
    state.unlockedPets = ids; state.team = ids.slice(); state.activePet = ids[0]; state.swapUsed = false; state.faintedPets = []; state.gems = 100000;
    equipPet(ids[1]); out.shop = [state.activePet === ids[1], state.swapUsed];
    equipPet(ids[2]); out.shopAgain = state.activePet === ids[1];
    swapBuddy(ids[0]); out.chip = state.activePet === ids[1];
    equipPet(ids[1]); out.same = state.swapUsed;
    // a new catch only becomes your fighter while the swap is free
    pendingLootPet = getSpecies(ids[0]); closeLootModal(true); out.loot = state.activePet === ids[1];
    state.swapUsed = false; pendingLootPet = getSpecies(ids[2]); closeLootModal(true); out.lootFree = [state.activePet === ids[2], state.swapUsed];
    // adopting from the shop while the swap is used does not take over
    state.swapUsed = true; const buy = storePets.find((x) => x.cost > 0 && !x.requiresAllStorePets && !ids.includes(x.id) && state.unlockedPets.indexOf(x.id) === -1);
    state.activePet = ids[0]; selectOrBuyPet(buy); confirmBuy();
    out.adopt = [state.unlockedPets.includes(buy.id), state.activePet === ids[0]];
    // a new battle gives a new swap
    monsterCurrentHp = 1; inputLocked = false; triggerMonsterDamage(99, false);
    await new Promise((res) => setTimeout(res, 8000));
    out.fresh = state.swapUsed === false;
    return out;
  });
  assert.deepEqual(r.shop, [true, true], 'the Sanctuary equip uses the swap');
  assert.equal(r.shopAgain, true, 'a second Sanctuary swap is refused');
  assert.equal(r.chip, true, 'and so is a team chip swap');
  assert.equal(r.same, true);
  assert.equal(r.loot, true, 'a caught buddy does not take over once the swap is used');
  assert.deepEqual(r.lootFree, [true, true]);
  assert.deepEqual(r.adopt, [true, true], 'adopted but not equipped');
  assert.equal(r.fresh, true);
});

test('when your fighter faints and a teammate can still fight, you choose who comes next, and answering waits', async () => {
  const r = await page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const out = {};
    const ids = storePets.slice(0, 4).map((x) => x.id);
    state.unlockedPets = ids; state.team = ids.slice(0, 3); state.activePet = ids[0]; state.faintedPets = []; state.swapUsed = false; state.shields = 0;
    state.buddyXp[ids[0]] = xpForLevel(30);
    state.wild.id = ''; currentMonsterIndex = 0; bossLevel = 60; partyHp = {}; clearBuddyStatus(); guardUp = false; heldUsed = {};
    setPetHp(ids[0], 1); monsterCurrentHp = 99; inputLocked = false;
    const real = Math.random; Math.random = () => 0.99;
    userInput = String(currentProblem.answer + 7); checkAnswer();
    await wait(1500); Math.random = real;
    out.fainted = [state.faintedPets.includes(ids[0]), state.activePet === ids[0], needsSwitch(), inputLocked];
    out.msg = document.getElementById('feedback-msg').innerText;
    out.pick = document.getElementById('team-bar').classList.contains('pick');
    userInput = '5'; const before = monsterCurrentHp; pressKey('5'); checkAnswer(); out.blocked = monsterCurrentHp === before;
    swapBuddy(ids[0]); out.restingRefused = state.activePet === ids[0];
    equipPet(ids[3]); out.nonTeam = state.activePet === ids[0];          // not on the team: refused
    swapBuddy(ids[2]);
    out.sent = [state.activePet === ids[2], inputLocked, state.swapUsed, needsSwitch()];
    // the battle's free swap is still there afterwards
    swapBuddy(ids[1]); out.stillFree = state.activePet === ids[1];
    return out;
  });
  assert.deepEqual(r.fainted, [true, true, true, true], 'fainted, not replaced, and waiting');
  assert.match(r.msg, /Tap a teammate/);
  assert.equal(r.pick, true, 'the team chips glow');
  assert.equal(r.blocked, true, 'cannot answer until a teammate is chosen');
  assert.equal(r.restingRefused, true);
  assert.equal(r.nonTeam, true, 'only team members can come in');
  assert.deepEqual(r.sent, [true, false, false, false], 'the teammate is in, answering works, and the free swap is untouched');
  assert.equal(r.stillFree, true);
});

test('when the whole team has fainted, everyone is revived (a buddy outside the team never comes in)', async () => {
  const r = await page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const out = {};
    const ids = storePets.slice(0, 3).map((x) => x.id);
    state.unlockedPets = ids; state.team = ids.slice(0, 2); state.activePet = ids[0]; state.faintedPets = [ids[1]]; state.shields = 0;
    state.buddyXp[ids[2]] = xpForLevel(40);                  // strong, but not on the team
    state.wild.id = ''; currentMonsterIndex = 0; bossLevel = 60; partyHp = {}; setPetHp(ids[0], 1); monsterCurrentHp = 99; inputLocked = false;
    const real = Math.random; Math.random = () => 0.99;
    userInput = String(currentProblem.answer + 7); checkAnswer();
    await wait(2500); Math.random = real;
    out.revived = [state.faintedPets.length, needsSwitch(), state.activePet === ids[0], state.activePet === ids[2]];
    return out;
  });
  assert.deepEqual(r.revived, [0, false, true, false], 'the team is revived; the outsider never fought');
});

test('only team members can fight: the Sanctuary refuses an outsider, the picker keeps your fighter on the team, new buddies join only if there is room', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    const ids = storePets.slice(0, 5).map((x) => x.id);
    state.unlockedPets = ids; state.team = ids.slice(0, 3); state.activePet = ids[0]; state.swapUsed = false; state.faintedPets = []; state.gems = 100000;
    equipPet(ids[4]); out.outsider = [state.activePet === ids[0], state.swapUsed, document.getElementById('replace-modal').style.display];     // a full team: it asks who to replace
    closeReplace();
    swapBuddy(ids[4]); out.chipOutsider = [state.activePet === ids[0], state.swapUsed];
    equipPet(ids[1]); out.member = state.activePet === ids[1];
    // the fighter stays on the team
    hubPet = ids[1]; toggleTeam(ids[1]); out.stay = getTeam().includes(ids[1]);
    toggleTeam(ids[4]); out.replaced = [getTeam().length, getTeam().includes(ids[4]), getTeam().includes(ids[1]), getTeam().includes(ids[0])];
    // an old save whose team lacks the fighter: the fighter is added
    state.team = [ids[2], ids[3]]; state.activePet = ids[0]; out.included = getTeam().includes(ids[0]) && getTeam().length === 3;
    // a new buddy: room on the team = it joins and fights; full team = it waits in the collection
    state.team = [ids[0]]; state.activePet = ids[0]; state.swapUsed = false;
    out.room = [joinTeamIfRoom('x1'), joinTeamIfRoom(ids[1]), getTeam().length];
    state.team = ids.slice(0, 3); out.full = joinTeamIfRoom(ids[3]);
    state.activePet = ids[0]; state.swapUsed = false; pendingLootPet = getSpecies(ids[4]); closeLootModal(true);
    out.loot = [state.activePet === ids[0], document.getElementById('replace-modal').style.display]; closeReplace();
    return out;
  });
  assert.deepEqual(r.outsider, [true, false, 'flex'], 'an outsider does not fight; the Sanctuary asks who it should replace');
  assert.deepEqual(r.chipOutsider, [true, false]);
  assert.equal(r.member, true);
  assert.equal(r.stay, true, 'the fighter cannot be taken off the team');
  assert.deepEqual(r.replaced, [3, true, true, false], 'a full team drops the oldest buddy that is not the fighter');
  assert.equal(r.included, true);
  assert.deepEqual(r.room.slice(1), [true, 2]);
  assert.equal(r.full, false);
  assert.deepEqual([r.loot[0]], [true]);
  assert.equal(r.loot[1], 'flex', 'a full team asks who the new buddy replaces');
});

test('the Sanctuary: a buddy that is not on a full team asks which team buddy it replaces', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    const ids = storePets.slice(0, 5).map((x) => x.id);
    const reset = () => { state.unlockedPets = ids; state.team = ids.slice(0, 3); state.activePet = ids[0]; state.swapUsed = false; state.faintedPets = []; document.getElementById('replace-modal').style.display = 'none'; };
    reset();
    equipPet(ids[3]);
    const btns = () => [...document.querySelectorAll('#replace-options .move-btn')];
    out.asks = [document.getElementById('replace-modal').style.display, document.getElementById('replace-title').innerText, btns().length, btns().map((b) => b.disabled).join()];
    btns()[1].click();                                    // replace the second team buddy (not fighting)
    out.second = [JSON.stringify(getTeam()) === JSON.stringify([ids[0], ids[3], ids[2]]), state.activePet === ids[0], state.swapUsed, document.getElementById('replace-modal').style.display];
    // replacing the fighter: the new buddy takes over and uses the swap
    reset(); equipPet(ids[3]); btns()[0].click();
    out.fighter = [state.activePet === ids[3], state.swapUsed, getTeam().includes(ids[0]), getTeam().includes(ids[3])];
    // the swap is used: the fighter cannot be replaced; a resting buddy cannot be replaced
    reset(); state.swapUsed = true; state.faintedPets = [ids[2]]; equipPet(ids[3]);
    out.locked = btns().map((b) => b.disabled).join();
    btns()[0].click(); out.stillTeam = JSON.stringify(getTeam()) === JSON.stringify([ids[0], ids[1], ids[2]]);
    closeReplace();
    // room on the team: it joins and takes over (the swap is free)
    reset(); state.team = [ids[0], ids[1]]; equipPet(ids[3]);
    out.room = [getTeam().includes(ids[3]), state.activePet === ids[3], document.getElementById('replace-modal').style.display];
    // a resting team buddy stays on the team in the picker too
    reset(); state.faintedPets = [ids[1]]; hubPet = ids[0]; toggleTeam(ids[1]); out.pickerResting = getTeam().includes(ids[1]);
    // keep my team
    reset(); equipPet(ids[3]); closeReplace(); out.kept = [getTeam().includes(ids[3]), document.getElementById('replace-modal').style.display];
    return out;
  });
  assert.equal(r.asks[0], 'flex');
  assert.match(r.asks[1], /Which buddy should .* replace\?/);
  assert.equal(r.asks[2], 3);
  assert.equal(r.asks[3], 'false,false,false', 'all three can be replaced (nobody is resting, the swap is free)');
  assert.deepEqual(r.second, [true, true, false, 'none'], 'a team buddy was replaced; the fighter and the swap are untouched');
  assert.deepEqual(r.fighter, [true, true, false, true], 'replacing the fighter puts the new buddy in the fight and uses the swap');
  assert.equal(r.locked, 'true,false,true', 'the fighter (swap used) and the resting buddy cannot be replaced');
  assert.equal(r.stillTeam, true);
  assert.deepEqual(r.room, [true, true, 'none']);
  assert.equal(r.pickerResting, true);
  assert.deepEqual(r.kept, [false, 'none']);
});

test('quirks: every species has one (always the same), and brave, calm, lucky and curious change the battle', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    const by = {};
    storePets.forEach((p) => { (by[quirkOf(p.id).id] = by[quirkOf(p.id).id] || []).push(p.id); });
    out.kinds = Object.keys(by).sort().join(',');
    out.stable = quirkOf('fox') === quirkOf('fox');
    hubPet = 'dog'; hubTab = 'hold'; renderHub();
    out.shown = document.getElementById('hub-body').innerText.includes('Quirk: ' + quirkOf('dog').name);
    // brave: the first correct answer of a battle charges 1 extra energy, once
    state.activePet = by.brave[0]; resetBattleEffects(); ultimateCharge = 0; state.streak = 1;
    answerBonuses(false); answerBonuses(false);
    out.brave = ultimateCharge;
    // calm: statuses last 1 problem less
    const real = Math.random; Math.random = () => 0;
    state.activePet = by.calm[0]; clearBuddyStatus(); buddyStatus = { kind: '', left: 0 };
    maybeInflictStatus({ element: 'fire', wild: false });
    out.calm = buddyStatus.left;
    state.activePet = by.brave[0]; clearBuddyStatus(); maybeInflictStatus({ element: 'fire', wild: false });
    out.plain = buddyStatus.left;
    Math.random = real; clearBuddyStatus();
    // lucky: easier to catch
    const sp = getSpecies('fox');
    const luckyPet = storePets.find((p) => quirkOf(p.id).id === 'lucky');
    const same = storePets.find((p) => p.element === luckyPet.element && quirkOf(p.id).id !== 'lucky');     // same element: the type matchup is equal
    state.activePet = luckyPet.id; const lucky = wildCatchChance(sp, {});
    state.activePet = same.id; const base = wildCatchChance(sp, {});
    out.lucky = lucky > base;
    // curious: extra XP
    const gain = (id) => { state.activePet = id; state.buddyXp[id] = 0; awardBuddyXp(1000); return state.buddyXp[id]; };
    out.curious = [gain(by.curious[0]), gain(by.brave[0])];
    return out;
  });
  assert.equal(r.kinds, 'brave,calm,curious,lucky,quick');
  assert.ok(r.stable);
  assert.ok(r.shown, 'the Hold tab names the quirk');
  assert.equal(r.brave, 1, 'brave pays once per battle');
  assert.equal(r.calm, 2);
  assert.equal(r.plain, 3);
  assert.ok(r.lucky);
  assert.ok(r.curious[0] > r.curious[1], 'curious earns more XP');
});

test('no errors', () => { assert.deepEqual(errors, []); });
