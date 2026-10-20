// The second journey beyond the Peak: eight more gym lands for a Champion, their badges kept apart from the Hall, and Master Ori on Silver Peak.
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
const ev = (fn, arg) => page.evaluate(fn, arg);
const winChain = async () => {
  await ev(() => { Math.random = () => 0.3; });
  for (let k = 0; k < 400; k++) {
    await page.waitForFunction(() => !ab || (!ab.busy && (ab.phase === 'menu' || ab.phase === 'learn')), null, { timeout: 240000 });
    if (!(await ev(() => !!ab))) return;
    if (await ev(() => ab.phase === 'learn')) { await ev(() => abLearnChoose(-1)); continue; }
    await ev(() => { ab.foes.forEach((f) => { f.hp = Math.min(f.hp, 1); f.atk = 1; f.spc = 1; }); abFight(); abAnswer(ab.q.ans); ab.party.forEach((m) => m.moves.forEach((mv) => { mv.left = mv.pp; })); abUseMove(0); });
    await page.waitForTimeout(500);
  }
};

test('eight more gym lands for a Champion: rising levels, three trainers (Riley second) and a story each, kept apart from the Hall', async () => {
  const r = await ev(() => {
    const far = allGymRegions().filter((g) => g.far);
    return { far: far.map((g) => g.id), levels: far.map((g) => ECON.map.levels[g.id]), ok: far.every((g) => GYM_TRAINERS[g.id].length === 3 && GYM_TRAINERS[g.id][1] === RIVAL && GYM_STORY[g.id].outro), hall: gymRegions().length, all: allGymRegions().length };
  });
  assert.deepEqual(r.far, ['cinder', 'coral', 'thistle', 'spark', 'dusk', 'prism', 'cross', 'summit']);
  assert.ok(r.levels.every((l, i) => l > (i ? r.levels[i - 1] : 56)), 'each land asks for more than the one before');
  assert.ok(r.ok);
  assert.deepEqual([r.hall, r.all], [8, 16]);
});

test('a second-journey badge is saved, but never counts toward the Champion\'s Hall', async () => {
  const r = await ev(() => {
    state.storySeen.champion = 0; state.badges = ['cinder']; const shut = championOpen();
    state.badges = gymRegions().map((g) => g.id).concat(['cinder', 'nonsense']); NORMALIZERS.forEach((fn) => fn(state));
    const kept = state.badges.indexOf('cinder') !== -1 && state.badges.indexOf('nonsense') === -1;
    state.badges = gymRegions().map((g) => g.id).slice(0, 7); state.region = 'cinder';
    state.gym = { region: 'cinder', step: ECON.map.trainers }; const res = advanceGym(true);
    return { shut, kept, far: res.region.id, hall: res.hall };
  });
  assert.deepEqual(r, { shut: false, kept: true, far: 'cinder', hall: false });
});

test('the road west out of Skyreach opens for the Champion and leads to Cinder Mesa, whose gym needs level 60', async () => {
  const r = await ev(() => {
    const m = OW_MAPS.skyreach; state.storySeen.champion = 0; const closed = !owWalkable(m, 0, 5);
    state.storySeen.champion = 1; const open = owWalkable(m, 0, 5);
    return { closed, open, warp: m.warps.some((w) => w.x === 0 && w.y === 5 && w.to === 'route8'), lvl: ECON.map.levels.cinder, rows: OW_MAPS.route8.region };
  });
  assert.deepEqual(r, { closed: true, open: true, warp: true, lvl: 60, rows: 'cinder' });
});

test('Silver Peak: the door needs the Summit Badge; Master Ori\'s six legends pay once big, then a little once a day', async () => {
  const shut = await ev(() => { owEnterMaster(); return talk.lines.join(' '); });
  assert.match(shut, /Summit Badge/);
  await ev(() => { closeTalk(); state.badges = ['summit']; state.gems = 0; state.nets = 0; state.buddyXp[state.activePet] = xpForLevel(95); abStartMaster(); });
  const team = await ev(() => ab.foes.map((f) => f.id));
  assert.deepEqual(team, ['legend_fire', 'legend_water', 'legend_nature', 'legend_electric', 'legend_dark', 'legend_magic']);
  await winChain();
  const first = await ev(() => [state.champ.master, state.gems, state.nets]);
  assert.deepEqual(first, [1, await ev(() => ECON.map.master.firstGems), await ev(() => ECON.map.master.nets)]);
  await ev(() => { closeTalk(); state.gems = 0; abStartMaster(); });
  await winChain();
  assert.deepEqual(await ev(() => [state.champ.master, state.gems]), [2, 0], 'the first win already paid today');
  await ev(() => { closeTalk(); state.gems = 0; state.champ.masterDay = ''; abStartMaster(); });
  await winChain();
  assert.deepEqual(await ev(() => [state.champ.master, state.gems]), [3, await ev(() => ECON.map.master.repeatGems)], 'a new day pays the repeat reward');
});

test('no errors', () => { assert.deepEqual(errors, []); });
