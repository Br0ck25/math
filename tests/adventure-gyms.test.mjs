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

test('a land opens with a note when its level is reached, except the Meadow which is open from the start', async () => {
  const r = await page.evaluate(() => {
    state.buddyXp.dog = xpForLevel(58); state.storySeen = { map: 1 };
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
      doors.forEach((p) => { const [x, y] = p.split(',').map(Number); if (m.rows[y].charAt(x) !== 'G') out.push(k + ': ' + p + ' is not a gym tile'); if (m.gyms[p] !== 'champion' && m.gyms[p] !== 'master' && (!regionById(m.gyms[p]).gym || regionById(m.gyms[p]).id !== m.gyms[p])) out.push(k + ': ' + m.gyms[p] + ' has no gym'); });
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

const ready = () => page.waitForFunction(() => ab && !ab.busy && ab.phase === 'menu', null, { timeout: 30000 });
// Wins every fight of the chain: each time the menu is up, every foe is at 1 HP and one right answer and attack finishes the current one.
const winChain = async () => {
  await page.evaluate(() => { Math.random = () => 0.3; });
  for (let k = 0; k < 400; k++) {
    await page.waitForFunction(() => !ab || (!ab.busy && (ab.phase === 'menu' || ab.phase === 'learn')), null, { timeout: 240000 });
    if (!(await page.evaluate(() => !!ab))) return;
    if (await page.evaluate(() => ab.phase === 'learn')) { await page.evaluate(() => abLearnChoose(-1)); continue; }       // a full buddy is asked which move to forget: keep the moves
    await page.evaluate(() => { ab.foes.forEach((f) => { f.hp = Math.min(f.hp, 1); f.atk = 1; f.spc = 1; }); abFight(); abAnswer(ab.q.ans); ab.party.forEach((m) => m.moves.forEach((mv) => { mv.left = mv.pp; })); abUseMove(0); });
    await page.waitForTimeout(500);
  }
};

test('a gym is a chain: win every round with the same team and the badge and charm come at the end, and every trainer and the leader pay their prize money', async () => {
  await page.evaluate(() => { state.buddyXp[state.activePet] = xpForLevel(20); state.gems = 0; abStartGym('meadow'); });
  await page.evaluate(() => { Math.random = () => 0.5; });
  await winChain();
  await page.waitForFunction(() => document.getElementById('talk-modal').style.display === 'flex');
  const r = await page.evaluate(() => ({ badges: state.badges.slice(), gems: state.gems, name: document.getElementById('talk-name').innerText, ow: document.getElementById('overworld-modal').style.display }));
  assert.deepEqual(r.badges, ['meadow']);
  assert.ok(r.gems > 0, 'the trainers and the leader paid');
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

test('there are eight gym lands, each with a level, three trainers (Riley second) and a story', async () => {
  const r = await page.evaluate(() => gymRegions().map((g) => [g.id, ECON.map.levels[g.id] >= 1, GYM_TRAINERS[g.id].length, GYM_TRAINERS[g.id][1] === RIVAL, !!GYM_STORY[g.id]]));
  assert.equal(r.length, 8);
  assert.ok(r.every((x) => x[1] && x[2] === 3 && x[3] && x[4]));
});

test('a land with no element has trainer buddies and a leader of any type, never a slayer; the Hall needs every badge but a Champion keeps it', async () => {
  const r = await page.evaluate(() => {
    const out = { kinds: new Set(), slayer: false };
    for (let i = 0; i < 30; i++) { const b = monstersList[abBossIndex('')]; out.kinds.add(b.element); if (b.slays) out.slayer = true; }
    state.badges = ['meadow']; state.storySeen.champion = 0; const shut = championOpen();
    state.badges = gymRegions().map((g) => g.id); const open = championOpen();
    state.badges = []; state.storySeen.champion = 1; const champ = championOpen();
    return { kinds: out.kinds.size, slayer: out.slayer, shut, open, champ };
  });
  assert.ok(r.kinds >= 3);
  assert.equal(r.slayer, false);
  assert.deepEqual([r.shut, r.open, r.champ], [false, true, true]);
});
