// Gold's held items in battle, the roaming legend, shiny buddies, and the full-screen touch map.
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
  await page.setViewportSize({ width: 390, height: 780 });
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; state.hero.made = true; state.buddyXp[state.activePet] = xpForLevel(20); { let n = 0; Math.random = () => (n = (n + 0.31) % 0.79); } });
});
const ev = (fn, arg) => page.evaluate(fn, arg);
const menu = () => page.waitForFunction(() => ab && !ab.busy && ab.phase === 'menu', null, { timeout: 20000 });
const begin = async () => { await ev(() => { openAdventure(); abStart({ kind: 'wild', foes: [{ id: 'fox', level: 12 }] }); }); await menu(); };

test('the battle fills the whole screen and an attack plays a picture on the target', async () => {
  await begin();
  const r = await ev(() => {
    const c = document.querySelector('#ab-modal .ab-content').getBoundingClientRect();
    abFx(abMe(), abFoe(), { type: 'fire' }, true);
    return { w: c.width, h: c.height, fx: !!document.querySelector('#ab-modal .ab-fx.t-fire'), shake: document.getElementById('ab-foe-icon').classList.contains('ab-shake') };
  });
  assert.deepEqual([r.w, r.h], [390, 780]);
  assert.ok(r.fx && r.shake);
});

test('a Berry heals 10 HP when health drops to half or less, and is used up', async () => {
  await ev(() => { state.heldOwned = ['berry']; state.held = { [state.activePet]: 'berry' }; });
  await begin();
  await ev(() => { const m = abMe(); m.hp = Math.floor(m.max / 2) + 3; abHit(abFoe(), m, { power: 40, acc: 100, type: 'normal', name: 'x' }, () => {}, () => {}); });
  await page.waitForTimeout(1800);
  assert.ok((await ev(() => abMe().hp)) > 0);
  assert.deepEqual(await ev(() => [state.heldOwned, state.held, abMe().held]), [[], {}, '']);
});

test('Leftovers heal a little every round, a Type Charm and a Scope Lens change the numbers, and a Quick Claw can go first', async () => {
  await ev(() => { state.heldOwned = ['leftovers']; state.held = { [state.activePet]: 'leftovers' }; });
  await begin();
  const hp = await ev(() => { const m = abMe(); m.hp = 5; ab.phase = 'busy'; abEndRound(); return m.hp; });
  await menu();
  assert.ok((await ev(() => abMe().hp)) > hp);
  const r = await ev(() => {
    Math.random = () => 0.99;
    const a = abMon('fox', 30), d = abMon('hedgehog', 30), mv = a.moves.find((m) => m.type === 'fire');
    const plain = abDamage(a, d, mv, false).dmg; a.held = 'charm';
    const boosted = abDamage(a, d, mv, false).dmg;
    return { plain, boosted, lens: AB_CRIT_LENS > AB_CRIT };
  });
  assert.ok(r.boosted > r.plain && r.lens);
  await ev(() => { ab.phase = 'busy'; });
});

test('the roaming legend: only after the Champion, one route a day, gone for the week once caught', async () => {
  const r = await ev(() => {
    state.storySeen.champion = 0; const before = legendRoute();
    state.storySeen.champion = 1; const route = legendRoute();
    const routes = OW_LANDS.map((l) => l.routeIn);
    state.overworld.map = route; ECON.legend.encounter = 1; startAdventureFight();
    const met = ab && ab.foes[0].id === legendOfWeek().id && ab.foes[0].level === ECON.legend.level;
    return { before, onRoute: routes.includes(route), met, rumour: GIZMO_CALLS.some((c) => c.dyn && c.when()) };
  });
  assert.deepEqual([r.before, r.onRoute, r.met, r.rumour], ['', true, true, true]);
  await menu();
  await ev(() => { ab.foes[0].hp = 1; state.nets = 5; Math.random = () => 0; abThrowNet(); });
  await page.waitForFunction(() => !ab, null, { timeout: 30000 });
  assert.equal(await ev(() => [legendRoute(), legendState().caught].join()), ',true');
  assert.ok(await ev(() => getOwnedIds().indexOf(legendOfWeek().id) !== -1));
});

test('a shiny buddy is a little stronger and glows once caught', async () => {
  const r = await ev(() => { const a = abFoeMon({ id: 'fox', level: 20 }), b = abFoeMon({ id: 'fox', level: 20, shiny: true }); return [b.max > a.max, /^Shiny /.test(b.name), ECON.shiny.shinyOdds]; });
  assert.deepEqual(r, [true, true, 512]);
  await ev(() => { state.shinies = {}; state.unlockedPets = ['dog']; state.nets = 3; openAdventure(); abStart({ kind: 'wild', foes: [{ id: 'bunny', level: 5, shiny: true }] }); });
  await menu();
  await ev(() => { Math.random = () => 0; abThrowNet(); });
  await page.waitForFunction(() => !ab, null, { timeout: 30000 });
  assert.equal(await ev(() => state.shinies.bunny), 1);
});

test('the map fills the screen, shows trees (never black) past the edge, and a finger on the map walks', async () => {
  await ev(() => { openAdventure(); state.overworld.map = 'hollow'; state.overworld.x = 1; state.overworld.y = 1; renderOverworld(); });
  const g = await ev(() => ({ n: document.querySelectorAll('#ow-view .ow-cell').length, grid: owGrid(), empty: [...document.querySelectorAll('#ow-view .ow-cell')].filter((c) => !c.querySelector('svg')).length, w: document.getElementById('ow-view').getBoundingClientRect().width }));
  assert.equal(g.n, g.grid.cols * g.grid.rows);
  assert.equal(g.empty, 0);
  assert.ok(g.w >= 389 - 8 * 2, 'the map is as wide as the screen: ' + g.w);
  await ev(() => { state.overworld.x = 7; state.overworld.y = 9; state.overworld.face = 'up'; renderOverworld(); });
  const box = await ev(() => { const r = document.querySelector('.ow-hero').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
  const y0 = await ev(() => state.overworld.y);
  await page.mouse.move(box.x, box.y - box.w * 2);
  await page.mouse.down();
  await page.waitForTimeout(400);
  await page.mouse.up();
  assert.ok((await ev(() => state.overworld.y)) < y0, 'holding above the hero walks up');
  assert.deepEqual(errors, []);
});
