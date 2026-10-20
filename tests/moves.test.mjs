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
  assert.deepEqual(r.names, ['Ember', 'Guard', 'Flame Wheel', 'Cleanse', 'Recover', 'Absorb', 'Signature', 'Flame Tail']);
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

test('evolution paths: a close bond (or the favorite snack today) makes a Radiant form; otherwise the player picks Guardian (HP) or Striker (attack); bad saves are repaired', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    const evolve = (id, bond, fed) => {
      state.activePet = id; state.unlockedPets = [id]; state.evoPath = {}; state.care = { [id]: { day: dayKey(), pets: 0, treat: false, fav: !!fed, bond: bond, last: '' } };
      state.buddyXp[id] = xpForLevel(15);
      awardBuddyXp(xpForLevel(40) - xpForLevel(15));
      const p = getPetById(id);
      return [p.name, p.path, getPetMaxHp(id) - petHpAt(p.level, p.stage), getPetAttack(id) - petAttackAt(p.level, p.stage)];
    };
    const B = ECON.evo.bondMin;
    out.bonded = evolve('dog', B, false);
    out.fed = evolve('dog', B - 1, true);                               // one heart short, but it ate its favorite today
    out.plain = evolve('dog', B - 1, false);
    closeEvoModal();
    // the evolution window lets a non-Radiant buddy switch to Striker
    const before = { ...getPetById('dog'), stage: 0, level: 15, path: '' };
    state.evoPath = { dog: 'guardian' };
    openEvoModal(before, getPetById('dog'));
    out.shown = document.getElementById('evo-paths').style.display;
    chooseEvoPath('striker');
    out.striker = [getPetById('dog').name, getPetMaxHp('dog') - petHpAt(getPetById('dog').level, getPetById('dog').stage), getPetAttack('dog') - petAttackAt(getPetById('dog').level, getPetById('dog').stage), document.getElementById('evo-path-striker').getAttribute('aria-pressed')];
    chooseEvoPath('radiant'); out.noRadiant = state.evoPath.dog;      // Radiant cannot be picked
    state.evoPath = { dog: 'radiant' };
    openEvoModal(before, getPetById('dog')); out.hidden = document.getElementById('evo-paths').style.display;
    chooseEvoPath('striker'); out.stays = state.evoPath.dog;           // a bonded buddy stays Radiant
    closeEvoModal();
    state.unlockedPets = ['dog']; state.unlockedSecrets = []; state.evoPath = { dog: 'striker', fox: 'radiant', otter: 'x', ghost: 'guardian' }; normalizeState();
    out.repaired = JSON.stringify(state.evoPath);
    state.evoPath = { dog: 'striker' }; state.buddyXp.dog = 0;
    out.baseForm = [getPetById('dog').path, getPetById('dog').name];  // a base-form buddy has no path
    return out;
  });
  assert.deepEqual(r.bonded, ['Radiant Thunder Wolf', 'radiant', 1, 1]);
  assert.deepEqual(r.fed, ['Radiant Thunder Wolf', 'radiant', 1, 1], 'the favorite snack counts as a bond heart');
  assert.deepEqual(r.plain, ['Guardian Thunder Wolf', 'guardian', 1, 0]);
  assert.equal(r.shown, '');
  assert.deepEqual(r.striker, ['Striker Thunder Wolf', 0, 1, 'true']);
  assert.equal(r.noRadiant, 'striker');
  assert.equal(r.hidden, 'none');
  assert.equal(r.stays, 'radiant');
  assert.equal(r.repaired, '{"dog":"striker"}');
  assert.deepEqual(r.baseForm, ['', 'Pup']);
});

test('every buddy has a signature move: hand-written for store buddies, made from the name and element for the rest, the same every time and opt-in for the default set', async () => {
  const r = await page.evaluate(() => {
    const groups = { store: storePets, secret: secretCompanions, mythic: mythicCompanions, ultra: ultraPets, boss: bossBuddies, legend: legendPets };
    const all = Object.values(groups).flat(), out = {};
    out.count = all.length;
    out.all = all.every((p) => signatureOf(p) && SIG_EFFECT_TEXT[signatureOf(p).effect] && signatureOf(p).name.length <= 24);
    const store = storePets.map((p) => signatureOf(p).name);
    out.storeUnique = new Set(store).size === store.length;
    out.storeByHand = storePets.every((p) => SIGNATURE_MOVES[p.id]);
    const leo = getSpecies('secret_1');
    out.made = [signatureOf(leo).name, signatureOf({ id: 'secret_1' }) === signatureOf(leo)];       // cached: the same object every time
    const krabs = bossBuddies.concat(secretCompanions).find((p) => /s$/.test(p.name.split(' ').pop())); out.apos = krabs ? signatureOf(krabs).name.split(' ')[0] : "x'"; out.aposWord = krabs ? signatureOf(krabs).name.split(' ').slice(1).join(' ') : 'Blaze';
    out.boss = signatureOf({ id: 'boss_1' }).name;                                                   // the last word of 'Magma Rex'
    out.effects = [...new Set(all.map((p) => signatureOf(p).effect))].sort().join(',');
    out.names = new Set(all.map((p) => signatureOf(p).name)).size;
    out.spread = new Set(all.filter((p) => p.element === 'water').map((p) => signatureOf(p).name.split(' ').pop() + signatureOf(p).effect)).size;
    state.moveSet = {}; out.default = all.slice(0, 80).some((p) => equippedMoves({ ...getPetById(p.id), level: 40 }).some((m) => m.sig));      // opt-in: no default move set changes
    return out;
  });
  assert.equal(r.count, 353);
  assert.ok(r.all, 'every buddy has a known effect and a name that fits the move pill');
  assert.ok(r.storeUnique);
  assert.ok(r.storeByHand);
  assert.match(r.made[0], /^Leo's \w+$/);
  assert.match(r.apos, /s'$/, 'a name ending in s takes just an apostrophe: ' + r.apos);
  assert.ok(r.made[1]);
  assert.match(r.boss, /^Rex's \w+$/);
  assert.equal(r.effects, 'drain,purify,surge,ward');
  assert.ok(r.names > 280, 'the moves are varied: ' + r.names);
  assert.ok(r.spread >= 20, 'word and effect are not tied together: ' + r.spread);
  assert.equal(r.default, false, 'a signature move is never in the default set');
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
  assert.equal(r.editButtons, 8, 'when choosing: every move, plus the dog\'s signature move');
  assert.deepEqual(r.full, ['strike,guard,power,heal,ult', 0], 'a full set refuses a fifth move and saves nothing');
  assert.equal(r.swapped, 'strike,power,heal,drain,ult');
  assert.equal(r.battleAfter, 5);
  assert.deepEqual(r.unequippedUsed, [false, false], 'a move left out cannot be used');
  assert.deepEqual(r.cleansed, [0, 0]);
  assert.equal(r.drained[1], 0); assert.ok(r.drained[0] >= 3, 'Absorb heals 1 HP: ' + r.drained);
  assert.deepEqual(r.repaired, ['["drain","strike","power","heal"]', 'dog']);
});

test('signature moves: a buddy with one learns it at level 12, it carries its own name and effect, and an unknown buddy has none', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    const fox = getPetById('fox'), bunny = getPetById('bunny');
    out.has = [signatureOf({ id: 'fox' }) !== null, signatureOf({ id: 'no_such_buddy' }) === null];
    out.learn = [movesLearned(11, { id: 'fox' }).some((m) => m.sig), movesLearned(12, { id: 'fox' }).some((m) => m.sig), movesLearned(40, { id: 'no_such_buddy' }).some((m) => m.sig), movesLearned(40).some((m) => m.sig)];
    out.name = moveName(MOVES.find((m) => m.sig), { id: 'fox' });
    out.between = [movesBetween(10, 13, { id: 'fox' }).map((m) => m.id).join(','), movesBetween(10, 13, { id: 'no_such_buddy' }).length];
    state.activePet = 'fox'; state.buddyXp.fox = xpForLevel(20); state.wild.id = ''; currentMonsterIndex = 0; bossLevel = 10; state.bossSwapped = false; state.raid = null;
    state.moveSet = { fox: ['strike', 'sig'] };
    partyHp = {}; monsterCurrentHp = 50; inputLocked = false; ultimateCharge = 2;
    const hp0 = monsterCurrentHp;
    useMove('sig');
    await new Promise((res) => setTimeout(res, 3000));
    out.cast = [hp0 - monsterCurrentHp > 0, ultimateCharge];           // fox: surge refunds 1 energy
    state.activePet = 'bunny'; state.buddyXp.bunny = xpForLevel(20); state.moveSet = { bunny: ['sig'] };
    buddyStatus = { kind: 'burn', left: 3 }; inputLocked = false; ultimateCharge = 2; monsterCurrentHp = 50;
    useMove('sig');
    await new Promise((res) => setTimeout(res, 3000));
    out.purify = buddyStatus.left;
    state.activePet = secretCompanions[0].id; state.unlockedSecrets = [secretCompanions[0].id]; state.buddyXp[secretCompanions[0].id] = xpForLevel(30); state.moveSet = {};
    out.koalaMoves = equippedMoves(getPetById(secretCompanions[0].id)).some((m) => m.sig);
    return out;
  });
  assert.deepEqual(r.has, [true, true]);
  assert.deepEqual(r.learn, [false, true, false, false]);
  assert.equal(r.name, 'Cinder Dash');
  assert.deepEqual(r.between, ['sig', 0]);
  assert.deepEqual(r.cast, [true, 1]);
  assert.equal(r.purify, 0, 'Moon Hop clears the status');
  assert.equal(r.koalaMoves, false);
});

test('a damage move can leave the foe burned, frozen or weakened by your buddy\'s element, and it wears off', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    Math.random = () => 0;
    monsterCurrentHp = 99; inputLocked = false; ultimateCharge = 3;
    useMove('strike');
    await new Promise((res) => setTimeout(res, 2000));
    out.fromMove = { kind: foeStatus.kind, left: foeStatus.left, chip: document.getElementById('monster-status').innerText, shown: getComputedStyle(document.getElementById('monster-status')).display };
    tickStatus(); tickStatus(); tickStatus();
    out.worn = { left: foeStatus.left, shown: getComputedStyle(document.getElementById('monster-status')).display };
    out.kinds = ['fire', 'electric', 'water', 'magic', 'nature', 'dark', 'shadow'].map((element) => { clearFoeStatus(); monsterCurrentHp = 99; maybeInflictFoeStatus({ element }); return foeStatus.kind; });
    foeStatus = { kind: 'burn', left: 2 }; resetBattleEffects(); out.reset = foeStatus.left;
    Math.random = () => 0.999;
    monsterCurrentHp = 99; clearFoeStatus(); maybeInflictFoeStatus({ element: 'fire' }); out.unlucky = foeStatus.left;
    return out;
  });
  assert.equal(r.fromMove.kind, 'weak', 'the starter is a nature buddy');
  assert.equal(r.fromMove.left, 3);
  assert.match(r.fromMove.chip, /💢3/);
  assert.notEqual(r.fromMove.shown, 'none');
  assert.equal(r.worn.left, 0);
  assert.equal(r.worn.shown, 'none');
  assert.deepEqual(r.kinds, ['burn', 'burn', 'frozen', 'frozen', 'weak', 'weak', 'weak']);
  assert.equal(r.reset, 0, 'a new fight starts clean');
  assert.equal(r.unlucky, 0, 'it is a chance, not a promise');
});

test('a burned foe takes 1 extra damage; a frozen foe hits for half and a weakened one for 1 less', async () => {
  const r = await page.evaluate(async () => {
    state.buddyXp.dog = xpForLevel(40);
    bossLevel = 40; state.bossLevel = 40;
    const wait = () => new Promise((res) => setTimeout(res, 2000));
    const dealt = async (kind) => { clearFoeStatus(); if (kind) foeStatus = { kind, left: 3 }; monsterCurrentHp = 999; inputLocked = false; triggerMonsterDamage(0); await wait(); return 999 - monsterCurrentHp; };
    const taken = async (kind) => { clearFoeStatus(); if (kind) foeStatus = { kind, left: 3 }; partyHp = {}; state.faintedPets = []; inputLocked = false; const before = getPetHp('dog'); triggerBuddyDamage(); await wait(); return before - getPetHp('dog'); };
    const plainHit = await dealt(''), burnHit = await dealt('burn');
    const plain = await taken(''), frozen = await taken('frozen'), weak = await taken('weak');
    return { plainHit, burnHit, plain, frozen, weak };
  });
  assert.equal(r.burnHit, r.plainHit + 1);
  assert.ok(r.plain >= 3, 'a hit big enough to tell the effects apart: ' + r.plain);
  assert.equal(r.frozen, Math.max(1, Math.floor(r.plain / 2)));
  assert.equal(r.weak, r.plain - 1);
});
