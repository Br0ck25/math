// The map: regions, gyms, badges, rival.
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
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; state.storySeen.map = 1; });
});

const beat = () => page.evaluate(async () => {
  monsterCurrentHp = 1; inputLocked = false; state.faintedPets = [];
  triggerMonsterDamage(99, false);
  await new Promise((res) => setTimeout(res, 3000));
  document.getElementById('raid-modal').style.display = 'none'; modalDone();
});

test('the map lists eight lands; the others open by level and travelling to a locked one is refused', async () => {
  const r = await page.evaluate(() => {
    state.buddyXp.dog = xpForLevel(10);
    openMap();
    const rows = document.querySelectorAll('#map-body .map-row:not(.legend-row):not(.champion-row):not(.spring-row):not(.adventure-row)').length;
    const locked = document.querySelectorAll('#map-body .map-row.locked:not(.legend-row):not(.champion-row):not(.spring-row):not(.adventure-row)').length;
    const text = document.getElementById('map-body').innerText;
    travelTo('tide'); const refused = state.region;
    travelTo('ember'); const ok = state.region;
    state.buddyXp.dog = xpForLevel(50);
    return { rows, locked, refused, ok, text, unlocked: REGIONS.filter(regionUnlocked).map((x) => x.id), prog: document.getElementById('map-progress').innerText };
  });
  assert.equal(r.rows, 8);
  assert.equal(r.locked, 6, 'at level 10 only the meadow and Ember Hills are open');
  assert.match(r.text, /Reach Lv 16/);
  assert.equal(r.refused, 'meadow');
  assert.equal(r.ok, 'ember');
  assert.deepEqual(r.unlocked, ['meadow', 'ember', 'tide', 'grove', 'volt', 'gloom', 'mystic']);
  assert.match(r.prog, /Badges 0\/8/);
});

test('travelling makes that land\'s type more common, and tints the arena', async () => {
  const r = await page.evaluate(() => {
    state.buddyXp.dog = xpForLevel(30); state.region = 'tide';
    const real = Math.random; const counts = { water: 0, other: 0 };
    for (let i = 0; i < 60; i++) { state.wild.id = ''; pickNextWild(); (getSpecies(state.wild.id).element === 'water' ? counts.water++ : counts.other++); }
    Math.random = real;
    updateBattleUI();
    return { counts, tint: document.getElementById('battle-header-arena').style.getPropertyValue('--region'), hint: document.getElementById('type-match-hint').innerText };
  });
  assert.ok(r.counts.water > 40, 'mostly water buddies: ' + JSON.stringify(r.counts));
  assert.ok(r.tint.length > 0);
  assert.ok(r.hint.startsWith('🌊'), r.hint);
});

test('a gym: three trainers (the second is your rival, none can be caught), then a leader of that type; the badge pays and ends the gym', async () => {
  const r = await page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const out = {};
    state.buddyXp.dog = xpForLevel(30); state.unlockedPets = ['dog', 'fox'];
    startGym('ember');
    document.getElementById('raid-modal').style.display = 'none'; modalDone();
    out.start = [JSON.stringify(state.gym), state.region, getBossInfo().trainer, getBossInfo().element, document.getElementById('weak-chip').innerText];
    out.since0 = state.wild.since;
    return out;
  });
  assert.equal(r.start[0], '{"region":"ember","step":0}');
  assert.equal(r.start[1], 'ember');
  assert.equal(r.start[2], 'Scout Mia');
  assert.equal(r.start[3], 'fire');
  assert.match(r.start[4], /🏟️ 1\/4 · Trainer/);
  const names = [];
  for (let i = 0; i < 3; i++) {
    names.push(await page.evaluate(() => getBossInfo().name));
    const before = await page.evaluate(() => [Object.keys(state.spares).length, state.unlockedPets.length, state.wild.since, state.gems]);
    await page.evaluate(() => { const real = Math.random; Math.random = () => 0; window.__r = real; });
    await beat();
    await page.evaluate(() => { Math.random = window.__r; });
    const after = await page.evaluate(() => [Object.keys(state.spares).length, state.unlockedPets.length, state.wild.since, state.gems]);
    assert.equal(after[0], before[0], 'no spare from a trainer');
    assert.equal(after[1], before[1], 'no catch from a trainer');
    assert.equal(after[2], before[2], 'gym battles do not count toward the next boss');
    assert.ok(after[3] > before[3], 'trainers pay');
  }
  assert.ok(names[1].startsWith('Rival Riley'), names.join('|'));
  const leader = await page.evaluate(() => ({ wild: getBossInfo().wild, element: getBossInfo().element, slays: getBossInfo().slays, step: state.gym.step, chip: document.getElementById('weak-chip').innerText }));
  assert.equal(leader.wild, undefined, 'a boss');
  assert.equal(leader.element, 'fire');
  assert.equal(leader.slays, null);
  assert.equal(leader.step, 3);
  assert.match(leader.chip, /🏟️ 4\/4 Leader/);
  const g0 = await page.evaluate(() => state.gems);
  await beat();
  const done = await page.evaluate(() => ({ badges: state.badges.slice(), gym: state.gym, gems: state.gems, wild: !!getBossInfo().wild, story: document.getElementById('raid-title').innerText }));
  assert.deepEqual(done.badges, ['ember']);
  assert.equal(done.gym, null);
  assert.ok(done.gems - g0 >= 60, 'badge reward');
  assert.match(done.story, /Ember Hills Badge/);
});

test('leaving a gym ends it; a won gym cannot be started again; one gym at a time', async () => {
  const r = await page.evaluate(() => {
    state.buddyXp.dog = xpForLevel(50);
    startGym('ember'); document.getElementById('raid-modal').style.display = 'none'; modalDone();
    const a = state.gym && state.gym.region;
    startGym('tide'); const still = state.gym.region;
    travelTo('tide'); const blocked = state.region;
    leaveGym(); const left = state.gym;
    state.badges = ['ember']; startGym('ember'); const again = state.gym;
    return { a, still, blocked, left, again };
  });
  assert.equal(r.a, 'ember');
  assert.equal(r.still, 'ember');
  assert.equal(r.blocked, 'ember', 'cannot travel away mid-gym');
  assert.equal(r.left, null);
  assert.equal(r.again, null);
});

test('the last badge opens the Champion\'s Hall (it no longer makes you Champion by itself)', async () => {
  const r = await page.evaluate(() => {
    state.badges = gymRegions().map((x) => x.id).filter((id) => id !== 'mystic'); state.gems = 0; state.gym = { region: 'mystic', step: 3 };
    const before = championOpen();
    const res = advanceGym(true);
    return { before, hall: res.hall, champion: !!state.storySeen.champion, badges: state.badges.length, gems: state.gems, open: championOpen() };
  });
  assert.deepEqual(r, { before: false, hall: true, champion: false, badges: 8, gems: 60, open: true });
});

test('Champion rematches: only Champions can replay a cleared gym; trainers and leader are stronger, Riley is back, and the first clear of a land each day pays (3 lands a day)', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    state.buddyXp.dog = xpForLevel(60); state.badges = ['ember', 'tide', 'grove', 'volt']; state.gems = 0;
    startGym('ember'); out.notChampion = state.gym;
    state.badges = ['ember', 'tide', 'grove', 'volt', 'gloom', 'mystic']; state.storySeen.champion = 1; state.rematch = { day: '', lands: [], wins: 0 };
    const mine = getBuddyLevel(state.activePet);
    startGym('ember'); document.getElementById('raid-modal').style.display = 'none'; modalDone();
    out.gym = JSON.stringify(state.gym);
    out.intro = document.getElementById('raid-title').innerText;
    const lv = []; for (let i = 0; i < 20; i++) { pickGymFoe(); lv.push(bossLevel - mine); }
    out.stronger = Math.min.apply(null, lv) >= ECON.map.rematch.levels;
    out.rivalStep = (state.gym.step = 1, pickGymFoe(), getBossInfo().trainer);
    // clears: the first three lands pay, the fourth does not, the same land again does not
    const clear = (id) => { state.gym = { region: id, step: 3, rematch: true }; const g0 = state.gems; const res = advanceGym(true); return [res.rematch, state.gems - g0, state.gym]; };
    out.c1 = clear('ember'); out.c2 = clear('ember'); out.c3 = clear('tide'); out.c4 = clear('grove'); out.c5 = clear('volt');
    out.wins = state.rematch.wins; out.lands = state.rematch.lands.join();
    state.rematch.day = '2000-01-01'; out.nextDay = clear('volt')[1];
    out.badges = state.badges.length;
    // the map offers a rematch only to Champions
    openMap(); out.buttons = [...document.querySelectorAll('#map-body .claim-btn')].filter((b) => /Rematch/.test(b.innerText)).length; closeMap();
    state.storySeen.champion = 0; openMap(); out.noButtons = [...document.querySelectorAll('#map-body .claim-btn')].filter((b) => /Rematch/.test(b.innerText)).length; closeMap();
    return out;
  });
  assert.equal(r.notChampion, null, 'only Champions can rematch');
  assert.equal(r.gym, '{"region":"ember","step":0,"rematch":true}');
  assert.match(r.intro, /Rematch at Ember Hills/);
  assert.equal(r.stronger, true, 'foes are stronger in a rematch');
  assert.equal(r.rivalStep, 'Rival Riley');
  assert.deepEqual(r.c1, [true, 40, null]);
  assert.deepEqual(r.c2, [true, 0, null], 'the same land pays once a day');
  assert.deepEqual(r.c3, [true, 40, null]);
  assert.deepEqual(r.c4, [true, 40, null]);
  assert.deepEqual(r.c5, [true, 0, null], 'only 3 lands pay per day');
  assert.equal(r.wins, 5);
  assert.equal(r.lands, 'ember,tide,grove');
  assert.equal(r.nextDay, 40, 'a new day pays again');
  assert.equal(r.badges, 6, 'a rematch gives no new badge');
  assert.equal(r.buttons, 6);
  assert.equal(r.noButtons, 0);
});

test('a rematch in a save is kept for Champions and dropped for everyone else', async () => {
  const r = await page.evaluate(() => {
    state.badges = ['ember']; state.storySeen.champion = 1; state.gym = { region: 'ember', step: 2, rematch: true };
    state.rematch = { day: 5, lands: ['ember', 'ember', 'nope', 'tide'], wins: -3 };
    NORMALIZERS.forEach((fn) => fn(state));
    const a = [JSON.stringify(state.gym), JSON.stringify(state.rematch)];
    state.storySeen.champion = 0; state.gym = { region: 'ember', step: 2, rematch: true }; NORMALIZERS.forEach((fn) => fn(state));
    const b = state.gym;
    state.storySeen.champion = 1; state.gym = { region: 'ember', step: 2 }; NORMALIZERS.forEach((fn) => fn(state));
    return { a, b, c: state.gym };
  });
  assert.equal(r.a[0], '{"region":"ember","step":2,"rematch":true}');
  assert.equal(r.a[1], '{"day":"","lands":["ember","tide"],"wins":0}');
  assert.equal(r.b, null);
  assert.equal(r.c, null, 'a gym without the rematch flag in a cleared land is still dropped');
});

test('map data in a save is repaired', async () => {
  const r = await page.evaluate(() => {
    state.region = 'nowhere'; state.badges = ['volt', 'volt', 'meadow', 'zzz']; state.gym = { region: 'ember', step: 99 };
    NORMALIZERS.forEach((fn) => fn(state));
    const a = { region: state.region, badges: state.badges.slice(), gym: state.gym };
    state.gym = { region: 'volt', step: 1 };                       // already has the badge
    NORMALIZERS.forEach((fn) => fn(state));
    const b = state.gym;
    state.wild = { id: '', trainer: 'Hacker', since: 0, next: 6 }; NORMALIZERS.forEach((fn) => fn(state));
    return { a, b, trainer: state.wild.trainer };
  });
  assert.equal(r.a.region, 'ember', 'a gym in progress keeps you in its land');
  assert.deepEqual(r.a.badges, ['volt', 'meadow'], 'the Meadow has a gym too, an unknown id goes');
  assert.deepEqual(r.a.gym, { region: 'ember', step: 3 }, 'step is capped');
  assert.equal(r.b, null);
  assert.equal(r.trainer, '');
});

test('the first time the map opens, the journey story shows once; new lands announce themselves', async () => {
  const r = await page.evaluate(() => {
    state.storySeen = {}; openMap();
    const first = document.getElementById('raid-modal').style.display === 'flex' && /Number Kingdom Map/.test(document.getElementById('raid-title').innerText);
    document.getElementById('raid-modal').style.display = 'none'; closeMap();
    openMap(); const second = document.getElementById('raid-modal').style.display;
    closeMap();
    state.buddyXp.dog = xpForLevel(9); checkRegionUnlocks(); const msg = document.getElementById('toast').innerText;
    return { first, second, msg };
  });
  assert.equal(r.first, true);
  assert.equal(r.second, 'none');
  assert.match(r.msg, /New land open: 🌋 Ember Hills/);
});

test('adventure upgrades: trainer header, 4-tab nav, regional backdrops, inline moves, starter comic, egg incubator, 3-stage evo visuals, map trail, math manipulatives, and sanctuary room', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    // 1 & 2. Consolidated Trainer Header + Circular XP Ring + 4-Tab Bottom Bar
    out.xpRing = !!document.querySelector('progress.progress-ring#xp-ring');
    out.bottomTabs = document.querySelectorAll('.bottom-bar button').length;
    // 3. Regional SVG Backdrop
    state.region = 'ember'; updateStatsUI();
    out.backdropSvg = document.getElementById('arena-backdrop').innerHTML.includes('<svg');
    // 4. Inline Move Pills
    ultimateCharge = 3; renderInlineMoves();
    out.inlinePills = document.querySelectorAll('#inline-moves-bar .inline-move-pill').length;
    armMove('strike');
    out.armed = armedMove === 'strike' && document.getElementById('equation-mount').classList.contains('move-armed');
    consumeArmedMove();
    out.consumed = armedMove === '';
    // 5. Starter Picker Comic
    openStarterModal();
    out.starterChoices = document.querySelectorAll('#starter-choices-row button').length;
    chooseStarter('fox');
    out.choseFox = state.activePet === 'fox' && state.unlockedPets.includes('fox');
    // 6. 3-Wobble Capture Sequence
    playCatchAnimation(getSpecies('fox'), true, 1);
    out.catchOverlay = document.getElementById('catch-anim-overlay').classList.contains('show');
    // 7. Mystery Egg Incubator
    state.egg = null; awardEgg('water', 'common');
    out.eggAwarded = state.egg && state.egg.steps === 0 && state.egg.target === 5;
    tickEgg();
    out.eggTicked = state.egg && state.egg.steps === 1;
    // 8. 3-Stage Evolution Visuals
    out.stage1Crest = formMarkup(1, 'fire').includes('evo-crest');
    out.stage2Wings = formMarkup(2, 'fire').includes('evo-wings') && formMarkup(2, 'fire').includes('evo-crown') && formMarkup(2, 'fire').includes('evo-runes');
    // 9. Winding Map Trail
    state.buddyXp.fox = xpForLevel(15); openMap();
    out.mapTrail = document.querySelectorAll('#map-body .map-trail-nodes').length > 0 && document.querySelectorAll('#map-body .map-player-token').length > 0;
    closeMap();
    // 10. Visual Math Manipulatives
    out.tenFrame = mathManipulativeHtml({ modeTag: 'add', num1: 6, num2: 3, layout: 'inline' }).includes('ten-frame');
    out.borrowCol = mathManipulativeHtml({ modeTag: 'sub', num1: 42, num2: 17, layout: 'vertical' }).includes('manip-cols');
    out.mulArray = mathManipulativeHtml({ modeTag: 'mul', expr: '4 × 5' }).includes('manip-array');
    out.fracPie = mathManipulativeHtml({ modeTag: 'frac', expr: '3/4 of 12' }).includes('manip-pie');
    // 11. Sanctuary Room & Trainer Profile
    state.gems = 500; state.raidsCleared = 5; openHub(); setHubTab('room');
    out.sanctuary = document.querySelectorAll('#hub-body .sanctuary-buddy').length > 0;
    selectProfileTitle('Number Knight');
    out.titleUnlocked = state.profile.title === 'Number Knight' && document.getElementById('trainer-title-display').innerText.includes('Number Knight');
    selectProfileFrame('gold');
    out.frameUnlocked = state.profile.frame === 'gold';
    closeHub();
    // 12. Top bar Gems & Shield clicks + Sanctuary Room XP bonus (1% per buddy in room)
    document.getElementById('gems-pill').click();
    out.gemsOpensShop = document.getElementById('shop-modal').style.display === 'flex';
    closeShop();
    state.gems = 500;
    document.getElementById('shield-pill').click();
    out.shieldOpensBuy = document.getElementById('shop-modal').style.display === 'flex' && document.getElementById('confirm-modal').style.display === 'flex';
    closeConfirm();
    closeShop();
    const sixIds = storePets.slice(0, 6).map((p) => p.id);
    state.unlockedPets = sixIds.slice();
    state.activePet = sixIds[0];
    state.profile.showcase = sixIds.slice();
    sixIds.forEach((id) => { state.buddyXp[id] = xpForLevel(10); });
    const gainedActive = awardBattleXp(100);
    out.roomSixActiveXp = gainedActive === 106 && state.buddyXp[sixIds[0]] - xpForLevel(10) === 106;
    out.roomSixPassiveXp = state.buddyXp[sixIds[1]] - xpForLevel(10) === 0;
    return out;
  });
  assert.equal(r.xpRing, true);
  assert.equal(r.bottomTabs, 4);
  assert.equal(r.backdropSvg, true);
  assert.ok(r.inlinePills >= 2);
  assert.equal(r.armed, true);
  assert.equal(r.consumed, true);
  assert.equal(r.starterChoices, 3);
  assert.equal(r.choseFox, true);
  assert.equal(r.catchOverlay, true);
  assert.equal(r.eggAwarded, true);
  assert.equal(r.eggTicked, true);
  assert.equal(r.stage1Crest, true);
  assert.equal(r.stage2Wings, true);
  assert.equal(r.mapTrail, true);
  assert.equal(r.tenFrame, true);
  assert.equal(r.borrowCol, true);
  assert.equal(r.mulArray, true);
  assert.equal(r.fracPie, true);
  assert.equal(r.sanctuary, true);
  assert.equal(r.titleUnlocked, true);
  assert.equal(r.frameUnlocked, true);
  assert.equal(r.gemsOpensShop, true);
  assert.equal(r.shieldOpensBuy, true);
  assert.equal(r.roomSixActiveXp, true);
  assert.equal(r.roomSixPassiveXp, true);
});

test('no errors', () => { assert.deepEqual(errors, []); });

test('every land has its own trainers (Riley stays second), and a saved trainer name survives a reload', async () => {
  const r = await page.evaluate(() => {
    const lands = gymRegions().map((x) => x.id);
    const first = lands.map((id) => gymTrainer(id, 0)), last = lands.map((id) => gymTrainer(id, 2));
    state.wild.id = 'fox'; state.wild.trainer = gymTrainer('tide', 2);
    normalizeState();
    return { lands: lands.length, unique: new Set(first.concat(last)).size, riley: lands.every((id) => gymTrainer(id, 1) === 'Rival Riley'), kept: state.wild.trainer, repeats: gymTrainer('tide', 3) };
  });
  assert.equal(r.unique, r.lands * 2, 'two different trainers per land');
  assert.ok(r.riley);
  assert.equal(r.kept, 'Diver Coral');
  assert.equal(r.repeats, 'Angler Finn');
});

test('locked lands show how close you are and who lives there, and only the next one to open is marked', async () => {
  const r = await page.evaluate(() => {
    state.buddyXp.dog = xpForLevel(10);
    openMap();
    const locked = Array.from(document.querySelectorAll('#map-body .map-row.locked:not(.legend-row):not(.champion-row):not(.spring-row):not(.adventure-row)'));
    return {
      next: locked.filter((el) => el.classList.contains('next')).length,
      nextText: (locked.find((el) => el.classList.contains('next')) || {}).innerText || '',
      peeks: locked.every((el) => el.querySelector('.map-peek .buddy-img, .map-peek svg') || (el.querySelector('.map-peek') && el.querySelector('.map-peek').innerText.replace('👀', '').trim().length > 0)),
      bars: locked.every((el) => el.querySelector('.map-need i')),
      openHasPeek: document.querySelectorAll('#map-body .map-row:not(.locked) .map-peek').length
    };
  });
  assert.equal(r.next, 1);
  assert.match(r.nextText, /Tide Bay/);
  assert.match(r.nextText, /Next stop/);
  assert.ok(r.peeks, 'every locked land lists some buddies');
  assert.ok(r.bars, 'every locked land shows a level bar');
  assert.equal(r.openHasPeek, 0);
});

test('the Healing Spring wakes resting buddies: free once a day, then for gems, and never when nobody rests or gems are short', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    const row = () => { renderMap(); const el = document.querySelector('#map-body .spring-row'); return { text: el.querySelector('.d').innerText, off: el.querySelector('.claim-btn').disabled }; };
    state.gems = 100; state.faintedPets = [];
    out.none = row(); useSpring(); out.noneGems = state.gems;
    state.faintedPets = ['dog', 'fox'];
    out.free = row(); useSpring();
    out.afterFree = { fainted: state.faintedPets.length, gems: state.gems, day: state.spring.day === dayKey() };
    state.faintedPets = ['dog'];
    out.paid = row(); useSpring();
    out.afterPaid = { fainted: state.faintedPets.length, gems: state.gems };
    state.faintedPets = ['dog']; state.gems = ECON.spring.gems - 1;
    out.broke = row(); useSpring();
    out.afterBroke = { fainted: state.faintedPets.length, gems: state.gems };
    state.gems = 50; state.faintedPets = [state.activePet]; inputLocked = true; state.spring.day = '';
    useSpring();
    out.released = inputLocked;
    const s = freshState(); s.spring = { day: 12345 }; NORMALIZERS.forEach((fn) => fn(s)); out.badDay = s.spring.day;
    return out;
  });
  assert.match(r.none.text, /feeling great/); assert.ok(r.none.off); assert.equal(r.noneGems, 100);
  assert.match(r.free.text, /2 resting buddies · free today/); assert.ok(!r.free.off);
  assert.deepEqual(r.afterFree, { fainted: 0, gems: 100, day: true });
  assert.match(r.paid.text, new RegExp('1 resting buddy · ' + 5 + ' 💎'));
  assert.deepEqual(r.afterPaid, { fainted: 0, gems: 95 });
  assert.ok(r.broke.off); assert.deepEqual(r.afterBroke, { fainted: 1, gems: 4 });
  assert.equal(r.released, false, 'answering is no longer on hold');
  assert.equal(r.badDay, '');
});
