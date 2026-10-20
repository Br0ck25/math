// Eight gyms: the Meadow and Skyreach join the six elemental lands; the Hall needs every badge (a Champion keeps it); the Meadow gym door on the Adventure map.
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
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; state.storySeen.map = 1; state.hero.made = true; });
});
const shown = (id) => page.evaluate((i) => document.getElementById(i).style.display === 'flex', id);
const put = (map, x, y, face = 'up') => page.evaluate(([m, px, py, f]) => {
  state.overworld.map = m; state.overworld.x = px; state.overworld.y = py; state.overworld.face = f;
  if (document.getElementById('overworld-modal').style.display !== 'flex') openAdventure();
  renderOverworld();
}, [map, x, y, face]);

test('there are eight gym lands, each with a level, three trainers (Riley second) and a story', async () => {
  const r = await page.evaluate(() => ({
    ids: gymRegions().map((x) => x.id), levels: gymRegions().map((x) => regionLevel(x)), lands: REGIONS.length,
    trainers: gymRegions().every((x) => GYM_TRAINERS[x.id].length === 3 && GYM_TRAINERS[x.id][1] === RIVAL && new Set(GYM_TRAINERS[x.id]).size === 3),
    story: gymRegions().every((x) => GYM_STORY[x.id].intro.length === 3 && GYM_STORY[x.id].outro.length > 20),
    lore: REGIONS.every((x) => !!TRAIL_LORE[x.id]), known: gymRegions().every((x) => GYM_TRAINERS[x.id].every((n) => KNOWN_TRAINERS.indexOf(n) !== -1)),
    names: new Set(gymRegions().flatMap((x) => GYM_TRAINERS[x.id].filter((n) => n !== RIVAL))).size
  }));
  assert.deepEqual(r.ids, ['meadow', 'ember', 'tide', 'grove', 'volt', 'gloom', 'mystic', 'skyreach']);
  assert.deepEqual(r.levels, [1, 8, 16, 24, 32, 40, 48, 56]);
  assert.equal(r.lands, 8);
  assert.ok(r.trainers && r.story && r.lore && r.known);
  assert.equal(r.names, 16, 'every trainer is a different person');
});

test('a land with no element has trainer buddies and a leader of any type, never a slayer, always one the buddy may meet', async () => {
  const r = await page.evaluate(() => {
    state.buddyXp.dog = xpForLevel(70);
    const out = {};
    ['meadow', 'skyreach'].forEach((id) => {
      state.gym = { region: id, step: 0 }; const trainerEls = new Set(), leaderEls = new Set(); let slayer = false, unavailable = false;
      for (let i = 0; i < 80; i++) {
        state.gym.step = i % 3; pickGymFoe(); trainerEls.add(getSpecies(state.wild.id).element);
        state.gym.step = ECON.map.trainers; pickGymFoe(); leaderEls.add(monstersList[currentMonsterIndex].element); slayer = slayer || !!monstersList[currentMonsterIndex].slays; unavailable = unavailable || !bossAvailable(currentMonsterIndex);
      }
      out[id] = { trainers: trainerEls.size > 2, leaders: leaderEls.size > 2, slayer, unavailable, wildId: state.wild.id };
    });
    state.gym = { region: 'ember', step: 0 };
    const fire = new Set(); for (let i = 0; i < 40; i++) { state.gym.step = ECON.map.trainers; pickGymFoe(); fire.add(monstersList[currentMonsterIndex].element); }
    out.ember = [...fire].join();
    state.gym = null;
    return out;
  });
  ['meadow', 'skyreach'].forEach((id) => assert.deepEqual(r[id], { trainers: true, leaders: true, slayer: false, unavailable: false, wildId: '' }, id));
  assert.equal(r.ember, 'fire', 'an elemental gym is unchanged');
});

test('the Meadow gym is always open and pays the badge once; Skyreach opens at its level', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    out.open = [regionUnlocked(regionById('meadow')), regionUnlocked(regionById('skyreach'))];
    startGym('skyreach'); out.refused = state.gym;
    startGym('meadow'); document.getElementById('raid-modal').style.display = 'none'; modalDone();
    out.gym = JSON.stringify(state.gym); out.foe = getBossInfo().trainer;
    state.gems = 0; state.stars = 0; state.gym.step = ECON.map.trainers;
    const res = advanceGym(true);
    out.badge = [state.badges.slice(), state.gems, state.stars, res.hall];
    state.buddyXp.dog = xpForLevel(80);
    out.skyOpen = regionUnlocked(regionById('skyreach'));
    startGym('skyreach'); out.sky = state.gym && state.gym.region; state.gym = null;
    return out;
  });
  assert.deepEqual(r.open, [true, false]);
  assert.equal(r.refused, null);
  assert.equal(r.gym, '{"region":"meadow","step":0}');
  assert.equal(r.foe, 'Picnicker Daisy');
  assert.deepEqual(r.badge, [['meadow'], 60, 2, false]);
  assert.equal(r.skyOpen, true);
  assert.equal(r.sky, 'skyreach');
});

test('the Map window shows both new gyms with a gym button and a leader of any type, and the Meadow no longer hides its gym', async () => {
  const r = await page.evaluate(() => {
    state.buddyXp.dog = xpForLevel(80); openMap();
    const rows = Array.from(document.querySelectorAll('#map-body .map-row:not(.legend-row):not(.champion-row):not(.spring-row):not(.adventure-row)'));
    const find = (name) => rows.find((x) => x.innerText.includes(name));
    return { n: rows.length, meadow: find('Sunny Meadow').innerText, sky: find('Skyreach').innerText, gymButtons: rows.filter((x) => /Gym/.test(x.innerText) && x.querySelector('.claim-btn[onclick^="startGym"]')).length, trail: document.querySelectorAll('#map-body .map-trail-nodes').length };
  });
  assert.equal(r.n, 8);
  assert.match(r.meadow, /gym leader: a boss of any type/);
  assert.match(r.sky, /gym leader: a boss of any type/);
  assert.equal(r.gymButtons, 8);
  assert.equal(r.trail, 8, 'every open land shows its gym trail');
});

test('the Champion\'s Hall needs every badge, but a Champion keeps it when gyms are added', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    const six = ['ember', 'tide', 'grove', 'volt', 'gloom', 'mystic'];
    state.badges = six.slice(); state.storySeen.champion = 0;
    out.sixNew = championOpen(); openMap(); out.text = document.querySelector('#map-body .champion-row').innerText; closeMap();
    state.badges = gymRegions().map((x) => x.id); out.all = championOpen();
    state.badges = six.slice(); state.storySeen.champion = 1; out.sixChampion = championOpen();
    startChampion(); out.run = state.gym && state.gym.region; document.getElementById('raid-modal').style.display = 'none'; modalDone();
    state.gym.champ.fallen = CHAMPION_TEAM.slice(0, 2); const kept = JSON.stringify(state.gym.champ.fallen);
    NORMALIZERS.forEach((fn) => fn(state)); out.keptRun = state.gym && state.gym.region === 'champion' && JSON.stringify(state.gym.champ.fallen) === kept;
    state.storySeen.champion = 0; NORMALIZERS.forEach((fn) => fn(state)); out.droppedRun = state.gym;
    return out;
  });
  assert.equal(r.sixNew, false);
  assert.match(r.text, /Win all 8 badges first \(6\/8\)/);
  assert.equal(r.all, true);
  assert.equal(r.sixChampion, true);
  assert.equal(r.run, 'champion');
  assert.equal(r.keptRun, true, 'a Champion\'s run in progress survives a reload');
  assert.equal(r.droppedRun, null, 'the same run is dropped when the Hall is not earned');
});

test('a land opens with a note when its level is reached, except the Meadow which is open from the start', async () => {
  const r = await page.evaluate(() => {
    state.buddyXp.dog = xpForLevel(90); state.storySeen = { map: 1 };
    checkRegionUnlocks();
    return { meadow: !!state.storySeen.open_meadow, sky: !!state.storySeen.open_skyreach, toast: document.getElementById('toast').innerText };
  });
  assert.equal(r.meadow, false);
  assert.equal(r.sky, true);
  assert.match(r.toast, /Skyreach/);
});

test('every gym door on a map is on a gym tile, and every gym tile has a land with a gym', async () => {
  const bad = await page.evaluate(() => {
    const out = [];
    Object.keys(OW_MAPS).forEach((k) => {
      const m = OW_MAPS[k], doors = Object.keys(m.gyms || {});
      doors.forEach((p) => { const [x, y] = p.split(',').map(Number); if (m.rows[y].charAt(x) !== 'G') out.push(k + ': ' + p + ' is not a gym tile'); if (m.gyms[p] !== 'champion' && (!regionById(m.gyms[p]).gym || regionById(m.gyms[p]).id !== m.gyms[p])) out.push(k + ': ' + m.gyms[p] + ' has no gym'); });
      m.rows.forEach((row, y) => row.split('').forEach((c, x) => { if (c === 'G' && doors.indexOf(x + ',' + y) === -1) out.push(k + ': gym tile ' + x + ',' + y + ' leads nowhere'); }));
    });
    return out;
  });
  assert.deepEqual(bad, []);
});

test('stepping on the Meadow gym door offers the gym; Enter starts the gym run on the battle screen with the first trainer', async () => {
  await put('meadow', 11, 10, 'up');
  await page.evaluate(() => owMove('up'));
  assert.equal(await shown('talk-modal'), true);
  assert.equal(await page.evaluate(() => document.getElementById('talk-name').innerText), 'Sunny Meadow Gym');
  assert.match(await page.evaluate(() => document.getElementById('talk-text').innerText), /Beat 3 trainers/);
  await page.click('#talk-next');
  assert.match(await page.evaluate(() => document.getElementById('talk-text').innerText), /Losing costs nothing/);
  assert.deepEqual(await page.evaluate(() => Array.from(document.querySelectorAll('#talk-choices button')).map((b) => b.innerText)), ['Enter the gym']);
  await page.click('#talk-choices button');
  await page.waitForFunction(() => typeof ab !== 'undefined' && ab);
  const r = await page.evaluate(() => ({ gym: state.gym, rounds: ab.rounds.map((x) => x.kind), first: ab.name, ow: document.getElementById('overworld-modal').style.display, talk: document.getElementById('talk-modal').style.display }));
  assert.equal(r.gym, null, 'the gym run lives on the battle screen, not in state.gym');
  assert.deepEqual(r.rounds, ['trainer', 'trainer', 'trainer', 'leader']);
  assert.equal(r.first, 'Picnicker Daisy');
  assert.notEqual(r.ow, 'flex');
  assert.notEqual(r.talk, 'flex');
  assert.deepEqual(errors, []);
});

test('Not now at the gym door steps the hero back out, and a gym run in progress is explained, not restarted', async () => {
  await put('meadow', 11, 10, 'up');
  await page.evaluate(() => owMove('up'));
  await page.click('#talk-next');
  await page.click('#talk-next');
  assert.equal(await shown('talk-modal'), false);
  assert.deepEqual(await page.evaluate(() => [state.overworld.x, state.overworld.y, state.gym]), [11, 10, null]);
  const r = await page.evaluate(() => { state.gym = { region: 'ember', step: 1 }; owMove('up'); const t = document.getElementById('talk-text').innerText; const gym = JSON.stringify(state.gym); state.gym = null; return { t, gym }; });
  assert.match(r.t, /already going on/);
  assert.equal(r.gym, '{"region":"ember","step":1}');
});

test('a gym that is too hard says how close you are and starts nothing; a won badge is a kind note; a Champion may rematch', async () => {
  await put('meadow', 11, 10, 'up');
  const hard = await page.evaluate(() => { ECON.map.levels.meadow = 50; owMove('up'); const out = { t: document.getElementById('talk-text').innerText, choices: document.querySelectorAll('#talk-choices button').length, gym: state.gym }; ECON.map.levels.meadow = 1; closeTalk(); return out; });
  assert.match(hard.t, /Come back a little stronger/);
  assert.deepEqual([hard.choices, hard.gym], [0, null]);
  await page.click('#talk-next').catch(() => {});
  const done = await page.evaluate(() => { state.overworld.x = 11; state.overworld.y = 10; state.overworld.face = 'up'; renderOverworld(); state.badges = ['meadow']; owMove('up'); const out = { t: document.getElementById('talk-text').innerText, choices: document.querySelectorAll('#talk-choices button').length }; closeTalk(); return out; });
  assert.match(done.t, /already have the Sunny Meadow Badge/);
  assert.equal(done.choices, 0);
  const champ = await page.evaluate(() => { state.overworld.x = 11; state.overworld.y = 10; state.overworld.face = 'up'; renderOverworld(); state.storySeen.champion = 1; owMove('up'); const out = { t: document.getElementById('talk-text').innerText, choices: Array.from(document.querySelectorAll('#talk-choices button')).map((b) => b.innerText) }; document.querySelector('#talk-choices button').click(); out.gym = JSON.stringify(state.gym); return out; });
  assert.match(champ.t, /Welcome back, Champion/);
  assert.deepEqual(champ.choices, ['Rematch!']);
});

test('old saves keep working: six badges and no Hall yet leave the Meadow and Skyreach to win, and the Map says so', async () => {
  const r = await page.evaluate(() => {
    state.badges = ['ember', 'tide', 'grove', 'volt', 'gloom', 'mystic']; NORMALIZERS.forEach((fn) => fn(state));
    openMap(); const t = document.getElementById('map-progress').innerText; closeMap();
    return { badges: state.badges.length, t, open: championOpen() };
  });
  assert.equal(r.badges, 6);
  assert.match(r.t, /Badges 6\/8/);
  assert.equal(r.open, false);
});

const ready = () => page.waitForFunction(() => ab && !ab.busy && ab.phase === 'menu', null, { timeout: 30000 });
// Wins every fight of the chain: each time the menu is up, every foe is at 1 HP and one right answer and attack finishes the current one.
const winChain = async () => {
  await page.evaluate(() => { Math.random = () => 0.3; });
  for (let k = 0; k < 150; k++) {
    await page.waitForFunction(() => !ab || (!ab.busy && ab.phase === 'menu'), null, { timeout: 60000 });
    if (!(await page.evaluate(() => !!ab))) return;
    await page.evaluate(() => { ab.foes.forEach((f) => { f.hp = Math.min(f.hp, 1); f.atk = 1; }); abFight(); abAnswer(ab.q.ans); abUseMove(0); });
    await page.waitForTimeout(500);
  }
};

test('a gym is a chain: win every round with the same team and the badge, gems and charm come at the end', async () => {
  await page.evaluate(() => { state.buddyXp[state.activePet] = xpForLevel(20); state.gems = 0; abStartGym('meadow'); });
  await page.evaluate(() => { Math.random = () => 0.5; });
  await winChain();
  await page.waitForFunction(() => document.getElementById('talk-modal').style.display === 'flex');
  const r = await page.evaluate(() => ({ badges: state.badges.slice(), gems: state.gems, name: document.getElementById('talk-name').innerText, ow: document.getElementById('overworld-modal').style.display }));
  assert.deepEqual(r.badges, ['meadow']);
  assert.ok(r.gems >= await page.evaluate(() => ECON.map.badgeGems));
  assert.match(r.name, /Gym/);
  assert.equal(r.ow, 'flex');
});

test('losing in a gym gives no badge and returns to the Center; the Hall is the Elite Four then Nova, and its win makes you Champion', async () => {
  await page.evaluate(() => { state.buddyXp[state.activePet] = xpForLevel(5); state.overworld.center = { map: 'meadow', x: 4, y: 5 }; abStartGym('meadow'); Math.random = () => 0.5; });
  await ready();
  await page.evaluate(() => { ab.party.forEach((m) => { m.hp = 1; state.advHp[m.id] = 1; }); ab.foes.forEach((f) => { f.level = 60; }); Math.random = () => 0.3; abFight(); abAnswer(ab.q.ans + 999); });
  await page.waitForFunction(() => !ab, null, { timeout: 30000 });
  assert.deepEqual(await page.evaluate(() => [state.badges.length, state.overworld.map]), [0, 'meadow']);
  const hall = await page.evaluate(() => { const rs = abHallRounds(); return { n: rs.length, names: rs.map((x) => x.name), nova: rs[4].foes.length, kinds: rs.map((x) => x.kind) }; });
  assert.deepEqual(hall.names.slice(0, 4), ['Elite Sol', 'Elite Marin', 'Elite Volta', 'Elite Noct']);
  assert.deepEqual([hall.n, hall.nova, hall.kinds[4]], [5, 6, 'leader']);
  await page.evaluate(() => { state.badges = gymRegions().map((g) => g.id); state.buddyXp[state.activePet] = xpForLevel(60); abStartHall(); Math.random = () => 0.5; });
  await winChain();
  assert.equal(await page.evaluate(() => state.storySeen.champion), 1);
});
