// Tests for Tree of Knowledge tech tree system
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
  await page.evaluate(() => {
    startGoldenVault = function () { modalDone(); };
    state.wild.id = '';
    currentMonsterIndex = 0;
    bossLevel = 5;
  });
});

test('state defaults and normalizers for tech tree', async () => {
  const r = await page.evaluate(() => {
    const fresh = freshState();
    const defaults = { stars: fresh.stars, tech: fresh.techUnlocked, solves: fresh.techSolves };
    state.stars = 'invalid';
    state.techSolves = -10;
    state.techUnlocked = ['quick_sparks', 'fake_tech', 'quick_sparks'];
    NORMALIZERS.forEach((fn) => fn(state));
    return { defaults, normalized: { stars: state.stars, solves: state.techSolves, tech: state.techUnlocked } };
  });
  assert.equal(r.defaults.stars, 0);
  assert.deepEqual(r.defaults.tech, []);
  assert.equal(r.defaults.solves, 0);
  assert.equal(r.normalized.stars, 0);
  assert.equal(r.normalized.solves, 0);
  assert.deepEqual(r.normalized.tech, ['quick_sparks']);
});

test('unlocking nodes with star sparks, prerequisites and tier gating', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    state.stars = 10;
    state.gems = 500;
    state.badges = [];

    // Try Tier 2 without prereq
    const prereqFail = checkTechReqs(getTechNode('streak_cushion'));
    out.prereqFail = prereqFail.reason;

    // Unlock Tier 1 prereq
    unlockTech('quick_sparks');
    out.unlockedQuick = hasTech('quick_sparks');
    out.afterQuick = { stars: state.stars, gems: state.gems };

    // Try Tier 2 with 0 badges
    const badgeFail = checkTechReqs(getTechNode('streak_cushion'));
    out.badgeFail = badgeFail.reason;

    // Grant 2 badges and unlock Tier 2
    state.badges = ['ember', 'tide'];
    const badgeOk = checkTechReqs(getTechNode('streak_cushion'));
    out.badgeOk = badgeOk.ok;
    unlockTech('streak_cushion');
    out.unlockedCushion = hasTech('streak_cushion');

    return out;
  });

  assert.match(r.prereqFail, /Requires Quick Sparks I/);
  assert.equal(r.unlockedQuick, true);
  assert.equal(r.afterQuick.stars, 9);
  assert.equal(r.afterQuick.gems, 480);
  assert.match(r.badgeFail, /Requires 2 Gym Badges/);
  assert.equal(r.badgeOk, true);
  assert.equal(r.unlockedCushion, true);
});

test('battle and math perks work as expected', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    const baseHp = getPetMaxHp(state.activePet);

    // Iron Will (+1 Max HP)
    state.techUnlocked.push('iron_will');
    out.ironHp = getPetMaxHp(state.activePet) - baseHp;

    // Energize (start battle with 1 energy)
    state.techUnlocked.push('energize');
    ultimateCharge = 0;
    resetBattleEffects();
    out.chargeWithEnergize = ultimateCharge;

    // Swift Recovery (Recover costs 1 energy instead of 2)
    const healMove = MOVES.find((m) => m.id === 'heal');
    out.baseHealCost = moveCost(healMove);
    state.techUnlocked.push('swift_recovery');
    out.swiftHealCost = moveCost(healMove);

    // Net Crafter (max nets 15 instead of 9)
    out.baseMaxNets = maxNets();
    state.techUnlocked.push('net_crafter');
    out.techMaxNets = maxNets();

    // Fast Incubator (egg target reduced by 2)
    state.techUnlocked.push('fast_incubator');
    awardEgg('fire', 'common');
    out.eggSteps = state.egg.target;

    // Gentle Guide (first hint is free)
    state.techUnlocked.push('gentle_guide');
    battleHintUsed = false;
    out.firstHint = hintCost();
    battleHintUsed = true;
    out.secondHint = hintCost();

    // Streak Cushion (preserves streak - 1 on mistake)
    state.techUnlocked.push('streak_cushion');
    state.streak = 5;
    state.shields = 0;
    guardUp = true;
    triggerBuddyDamage();
    out.streakAfterMistake = state.streak;

    return out;
  });

  assert.equal(r.ironHp, 1, 'Iron Will gives +1 Max HP');
  assert.equal(r.chargeWithEnergize, 1, 'Energize gives 1 initial energy');
  assert.equal(r.baseHealCost, 2, 'Default Recover costs 2');
  assert.equal(r.swiftHealCost, 1, 'Swift Recovery makes Recover cost 1');
  assert.equal(r.baseMaxNets, 9, 'Default net stock is 9');
  assert.equal(r.techMaxNets, 15, 'Net Crafter expands stock to 15');
  assert.equal(r.eggSteps, 3, 'Fast Incubator reduces 5-step egg to 3 steps');
  assert.equal(r.firstHint, 0, 'Gentle Guide first hint is free');
  assert.equal(r.secondHint, 1, 'Gentle Guide second hint costs normal gems');
  assert.equal(r.streakAfterMistake, 4, 'Streak Cushion drops 5 to 4 instead of 0');
});

test('Tree of Knowledge UI opens and displays branch nodes', async () => {
  const r = await page.evaluate(() => {
    state.stars = 3;
    state.gems = 150;
    updateStatsUI();
    const pill = document.getElementById('tree-pill');
    const pillText = pill ? pill.innerText : '';
    openTree();
    const modal = document.getElementById('tree-modal');
    const starsDisplay = document.getElementById('tree-stars').innerText;
    const bodyText = document.getElementById('tree-branch-container').innerText;
    closeTree();
    return { pillText, modalVisible: modal.style.display !== 'none', starsDisplay, hasNodes: bodyText.includes('Quick Sparks I') };
  });

  assert.match(r.pillText, /3\s*★/);
  assert.equal(r.starsDisplay, '3');
  assert.equal(r.hasNodes, true);
});

test('shop battle supplies: candy is 50+, potion heals, whistle summons boss, tree has no all branch', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    out.treeBranches = TREE_BRANCHES.map((b) => b.id);

    // Rare Candy is at least 50 gems
    state.activePet = 'dog';
    state.buddyXp.dog = xpForLevel(1);
    out.candyCost = getCandyCost();

    // Super Potion heals active buddy from damaged HP
    const maxHp = getPetMaxHp('dog');
    setPetHp('dog', 1);
    state.faintedPets = ['cat'];
    state.gems = 1000;
    payItem('potion');
    out.healedHp = getPetHp('dog');
    out.faintedCleared = state.faintedPets.length === 0;

    // Boss Whistle summons next boss
    state.wild.id = 'dog';
    payItem('whistle');
    out.isBoss = !getBossInfo().wild;
    out.since = state.wild.since;

    return { ...out, maxHp };
  });

  assert.equal(r.treeBranches.includes('all'), false, 'no all branch in tree');
  assert.ok(r.candyCost >= 50, 'candy is at least 50 gems: ' + r.candyCost);
  assert.equal(r.healedHp, r.maxHp, 'potion restores full hp');
  assert.equal(r.faintedCleared, true, 'potion revives fainted buddies');
  assert.equal(r.isBoss, true, 'whistle summons a boss');
  assert.equal(r.since, 0, 'boss reset wild counter');
});

test('trainer titles, collapsible sanctuary sections, and full move names', async () => {
  const r = await page.evaluate(() => {
    const out = {};

    // 1. All 4 branch tabs in tree modal
    openTree();
    const branchBtns = Array.from(document.querySelectorAll('#tree-branch-tabs button')).map((b) => b.innerText);
    out.fourBranches = branchBtns;
    closeTree();

    // 2. Full move names (e.g. Leaf Storm)
    const pet = getActivePetDisplay();
    const leafMove = MOVES.find((m) => m.name === 'Leaf Storm') || { id: 'leaf_storm', name: 'Leaf Storm', icon: '🍃', minLevel: 1, cost: 2 };
    renderInlineMoves();
    const bar = document.getElementById('inline-moves-bar');
    out.leafFull = moveName(leafMove, pet);

    // 3. Trainer Titles Requirements
    // Number Knight (requires 5 raids)
    state.raidsCleared = 4;
    out.knightLocked = !titleRequirementMet('Number Knight');
    state.raidsCleared = 5;
    out.knightUnlocked = titleRequirementMet('Number Knight');

    // Gem Defender (requires level 20 buddy)
    state.buddyXp.dog = xpForLevel(19);
    out.gemDefLocked = !titleRequirementMet('Gem Defender');
    state.buddyXp.dog = xpForLevel(20);
    out.gemDefUnlocked = titleRequirementMet('Gem Defender');

    // Kingdom Explorer (requires visiting all 7 kingdoms)
    state.regionsVisited = ['meadow', 'ember', 'tide', 'grove', 'volt', 'gloom'];
    out.explorerLocked = !titleRequirementMet('Kingdom Explorer');
    state.regionsVisited.push('mystic');
    out.explorerUnlocked = titleRequirementMet('Kingdom Explorer');

    // Buddy Tamer (requires 50 unique buddies)
    state.unlockedPets = ['dog'];
    out.tamerLocked = !titleRequirementMet('Buddy Tamer');
    state.unlockedPets = ['dog'].concat(Array.from({ length: 49 }, (_, i) => 'buddy_' + i));
    out.tamerUnlocked = titleRequirementMet('Buddy Tamer');

    // Grand Arithmancer (requires buddy level 60+)
    state.buddyXp.dog = xpForLevel(59);
    out.arithLocked = !titleRequirementMet('Grand Arithmancer');
    state.buddyXp.dog = xpForLevel(60);
    out.arithUnlocked = titleRequirementMet('Grand Arithmancer');

    // 4. Sanctuary collapsible sections
    openHub();
    setHubTab('room');
    const initRoomSec = sanctuarySections.room;
    toggleSanctuarySection('room');
    const toggledRoomSec = sanctuarySections.room;

    // 5. Title gem purchase flow
    state.gems = 100;
    state.raidsCleared = 5; // Unlocks Number Knight
    state.profile.unlockedTitles = ['Rookie Calculator'];
    selectProfileTitle('Number Knight'); // Purchases for 20 gems
    out.boughtKnight = state.profile.unlockedTitles.includes('Number Knight') && state.profile.title === 'Number Knight';
    out.gemsAfterBuy = state.gems;

    // 6. Tap buddy toast is clean (no raw img/svg tags)
    tapRoomBuddy('dog');
    out.tapToast = document.getElementById('toast').innerText;

    closeHub();

    out.initRoomSec = initRoomSec;
    out.toggledRoomSec = toggledRoomSec;

    return out;
  });

  assert.equal(r.fourBranches.length, 4, 'all 4 branch buttons rendered');
  assert.equal(r.leafFull, 'Leaf Storm', 'full move name');
  assert.equal(r.knightLocked, true, 'Number Knight locked at 4 raids');
  assert.equal(r.knightUnlocked, true, 'Number Knight unlocked at 5 raids');
  assert.equal(r.boughtKnight, true, 'Number Knight purchased with gems after unlock');
  assert.equal(r.gemsAfterBuy, 80, '20 gems deducted for Number Knight');
  assert.equal(r.tapToast.includes('<img'), false, 'tap buddy toast does not contain html tags');
  assert.match(r.tapToast, /waves happily from the Sanctuary/);
  assert.equal(r.gemDefLocked, true, 'Gem Defender locked at level 19');
  assert.equal(r.gemDefUnlocked, true, 'Gem Defender unlocked at level 20');
  assert.equal(r.explorerLocked, true, 'Kingdom Explorer locked at 6 lands');
  assert.equal(r.explorerUnlocked, true, 'Kingdom Explorer unlocked at 7 lands');
  assert.equal(r.tamerLocked, true, 'Buddy Tamer locked at 1 buddy');
  assert.equal(r.tamerUnlocked, true, 'Buddy Tamer unlocked at 50 buddies');
  assert.equal(r.arithLocked, true, 'Grand Arithmancer locked at level 59');
  assert.equal(r.arithUnlocked, true, 'Grand Arithmancer unlocked at level 60');
  assert.equal(r.initRoomSec !== r.toggledRoomSec, true, 'collapsible sections toggle');
});

