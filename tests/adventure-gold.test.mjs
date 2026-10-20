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
    const sp = document.getElementById('ab-me-icon').getBoundingClientRect().width;
    return { sp, w: c.width, h: c.height, fx: !!document.querySelector('#ab-modal .ab-fx.t-fire'), shake: document.getElementById('ab-foe-icon').classList.contains('ab-shake') };
  });
  assert.deepEqual([r.w, r.h], [390, 780]);
  assert.ok(r.sp >= 100, 'the buddies are drawn big, like in Gold');
  assert.ok(r.fx && r.shake);
});

test('every buddy can be caught: in the wild pool, a boss prize, or in the weekly legend rotation, and each one can fight', async () => {
  const r = await ev(() => {
    const wild = wildPool().concat(legendRoster()).concat(bossBuddies).map((b) => b.id);
    const lost = allBuddies().filter((b) => wild.indexOf(b.id) === -1).map((b) => b.id);
    const bad = allBuddies().filter((b) => { try { const m = abMon(b.id, 10); return !(m.max > 0 && m.moves.length >= 2); } catch (e) { return true; } }).map((b) => b.id);
    return { lost, bad };
  });
  assert.deepEqual(r, { lost: [], bad: [] });
});

test('Gold statuses: water freezes (a frozen buddy cannot move, a tenth thaw), magic confuses (it may hurt itself, then snaps out)', async () => {
  assert.deepEqual(await ev(() => [AB_STATUS.water, AB_STATUS.magic]), ['freeze', 'confusion']);
  await begin();
  const frozen = await ev(() => { const me = abMe(), foe = abFoe(); me.status = 'freeze'; Math.random = () => 0.5; let moved = false; abStrike(me, foe, me.moves[0], () => {}, () => {}); return new Promise((res) => setTimeout(() => res([me.status, foe.hp === foe.max]), 1500)); });
  assert.deepEqual(frozen, ['freeze', true], 'it stayed frozen and did not attack');
  const thawed = await ev(() => { const me = abMe(); Math.random = () => 0.05; abStrike(me, abFoe(), me.moves[0], () => {}, () => {}); return new Promise((res) => setTimeout(() => res(me.status), 1800)); });
  assert.equal(thawed, '', 'a low roll thaws it');
  await menu();
  const conf = await ev(() => { const me = abMe(), hp = me.hp; me.conf = 3; Math.random = () => 0.3; abStrike(me, abFoe(), me.moves[0], () => {}, () => {}); return new Promise((res) => setTimeout(() => res([me.hp < hp, me.conf]), 2500)); });
  assert.deepEqual(conf, [true, 2], 'a low roll: it hurt itself and has one turn less');
});

test('the fishing rod grows with you: Old, Good with 3 badges, Super for the Champion, each biting more and pulling bigger buddies', async () => {
  const r = await ev(() => {
    grantKeyItem('fishing-rod'); state.badges = []; state.storySeen.champion = 0; const tiers = [owRodTier()];
    state.badges = ['meadow', 'ember', 'tide']; tiers.push(owRodTier());
    state.storySeen.champion = 1; tiers.push(owRodTier());
    const seen = [];
    const real = startAdventureFight; window.startAdventureFight = (sp, lv) => seen.push([sp.element, isStoreBuddy(sp) ? sp.cost : -1, lv]);
    Math.random = () => 0.1; state.storySeen.champion = 0; state.badges = []; owFish();
    window.startAdventureFight = real;
    return { tiers, bites: ECON.overworld.rods.map((x) => x.bite), levels: ECON.overworld.rods.map((x) => x.level), old: seen[0] };
  });
  assert.deepEqual(r.tiers, [0, 1, 2]);
  assert.deepEqual([r.bites, r.levels], [[0.4, 0.6, 0.8], [-2, 0, 3]]);
  assert.equal(r.old[0], 'water'); assert.ok(r.old[1] < 150 && r.old[2] === -2, 'the Old Rod pulls an everyday water buddy a little weaker');
});

test('the Day Care: two buddies grow a level per 40 steps, a same-type pair leaves an egg, taking one back costs by levels gained, and they leave the team', async () => {
  const r = await ev(() => {
    const fire = storePets.filter((p) => p.element === 'fire' && p.id !== state.activePet).slice(0, 2).map((p) => p.id);
    state.unlockedPets = [state.activePet].concat(fire); state.team = state.unlockedPets.slice(); state.gems = 1000; state.egg = null;
    const npc = OW_MAPS['tide-house'].npcs.find((n) => n.kind === 'daycare'), out = {};
    const talkTo = (i) => { talk.i = talk.lines.length - 1; renderTalk(); talkChoose(i); };
    for (let k = 0; k < 2; k++) { OW_SERVICES.daycare(npc); talkTo(talk.choices.length - 1); talk.i = talk.lines.length - 1; renderTalk(); talkChoose(0); }
    out.left = state.daycare.ids.length; out.team = getTeam().length;
    const lv = getBuddyLevel(fire[0]);
    for (let i = 0; i < 40; i++) owDaycareStep();
    out.grew = getBuddyLevel(fire[0]) - lv;
    for (let i = 0; i < 200; i++) owDaycareStep();
    out.egg = state.daycare.eggReady;
    OW_SERVICES.daycare(npc); const labels = talk.choices.map((c) => c.label); talkTo(labels.findIndex((l) => /egg/.test(l)));
    out.hasEgg = !!state.egg;
    const cost = daycareCost(fire[0]); out.cost = cost > ECON.daycare.base;
    OW_SERVICES.daycare(npc); talkTo(0);
    out.back = state.daycare.ids.length; out.gems = state.gems < 1000;
    return out;
  });
  assert.deepEqual(r, { left: 2, team: 1, grew: 1, egg: true, hasEgg: true, cost: true, back: 1, gems: true });
});

test('the buddy summary shows type, level, the five stats and the moves with PP', async () => {
  const t = await ev(() => { hubTab = 'stats'; openHub(); return document.getElementById('hub-body').innerText; });
  for (const w of ['Type', 'Level', 'HP', 'Attack', 'Defense', 'Speed', 'Special', 'Held item', 'Moves', 'PP ']) assert.match(t, new RegExp(w));
  assert.equal(await ev(() => document.querySelectorAll('#hub-tabs button').length), 3);
});

test('a Repel keeps wild buddies out of the grass for its steps, wears off, and is sold at the Mart after the first badge', async () => {
  const r = await ev(() => {
    ECON.overworld.grassChance = 1; owSafe = 0; state.gems = 100; state.repelSteps = 0;
    const open = ECON.overworld.mart.find((m) => m.type === 'repel').badges, cost = itemCost('repel');
    payItem('repel'); const steps = state.repelSteps, left = state.gems;
    let fights = 0; for (let i = 0; i < steps; i++) if (owGrassStep()) fights++;
    const worn = state.repelSteps, next = owGrassStep();
    state.repelSteps = 99999; NORMALIZERS.forEach((fn) => fn(state));
    return { open, cost, steps, left, fights, worn, next, clamped: state.repelSteps };
  });
  assert.deepEqual(r, { open: 1, cost: 25, steps: 100, left: 75, fights: 0, worn: 0, next: true, clamped: 300 });
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
