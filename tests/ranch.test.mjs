// The Ranch: off-team buddies work at stations while you are away and when you answer.
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
    state.unlockedPets = ['dog', 'fox', 'otter', 'bear']; state.activePet = 'dog'; state.team = ['dog']; state.badges = [];
    state.ranch = { at: 0, workers: {}, stock: { berry: 0, ore: 0 } };
  });
});

test('work spots grow with badges, and only buddies off the team can work', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    out.slots = [0, 1, 2, 4, 6].map((n) => { state.badges = ['ember', 'tide', 'grove', 'volt', 'gloom', 'mystic'].slice(0, n); return ranchSlots(); });
    state.badges = [];
    assignWorker('dog', 'berry'); out.team = Object.keys(state.ranch.workers).length;          // dog is on the team
    assignWorker('otter', 'berry'); out.first = Object.keys(state.ranch.workers);
    assignWorker('fox', 'ore'); out.full = Object.keys(state.ranch.workers);                   // only 1 spot at the start
    state.badges = ['ember', 'tide'];
    assignWorker('fox', 'ore'); out.two = ranchWorkers();
    assignWorker('bear', 'nonsense'); out.badStation = Object.keys(state.ranch.workers).length;
    state.team = ['dog', 'fox']; out.moved = ranchWorkers();                                    // fox joined the team: it stops working
    unassignWorker('otter'); out.home = ranchWorkers();
    return out;
  });
  assert.deepEqual(r.slots, [1, 1, 2, 3, 4]);
  assert.equal(r.team, 0, 'a team buddy cannot work');
  assert.deepEqual(r.first, ['otter']);
  assert.deepEqual(r.full, ['otter'], 'no free spot');
  assert.deepEqual(r.two, ['otter', 'fox']);
  assert.equal(r.badStation, 2);
  assert.deepEqual(r.moved, ['otter']);
  assert.deepEqual(r.home, []);
});

test('workers earn with time (matching elements faster, capped, never backwards) and with every right answer', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    const realNow = Date.now, T = 1000000000000;
    state.badges = ['ember', 'tide'];
    Date.now = () => T; ranchAccrue();
    assignWorker('otter', 'berry'); assignWorker('fox', 'berry');          // water matches the patch, fire does not
    Date.now = () => T + 3600 * 1000; ranchAccrue();
    out.hour = ranchHas('berry');
    const before = state.ranch.stock.berry;
    ranchCheer(); out.cheer = Math.round((state.ranch.stock.berry - before) * 1000) / 1000;
    state.ranch.stock.berry = 0; state.ranch.at = T;
    Date.now = () => T + 100 * 3600 * 1000; ranchAccrue(); out.capped = state.ranch.stock.berry;
    state.ranch.stock.berry = 0; state.ranch.at = T + 5000 * 1000;
    Date.now = () => T; ranchAccrue(); out.backwards = [state.ranch.stock.berry, state.ranch.at === T];
    state.ranch.stock.berry = 0; state.ranch.at = T;
    Date.now = () => T + 1000 * 3600 * 1000; ranchAccrue(); out.full = state.ranch.stock.berry;
    Date.now = realNow;
    out.perHour = [ECON.ranch.perHour, ECON.ranch.matchMult, ECON.ranch.capHours, ECON.ranch.answerSec, ECON.ranch.stockCap];
    return out;
  });
  const [perHour, mult, cap, sec] = r.perHour;
  assert.equal(r.hour, perHour * mult + perHour, 'an hour of an otter (x2) and a fox');
  assert.equal(r.cheer, Math.round((perHour * mult + perHour) * sec / 3600 * 1000) / 1000);
  assert.equal(r.capped, Math.min(perHour * mult * cap + perHour * cap, r.perHour[4]), 'a long trip counts only capHours');
  assert.deepEqual(r.backwards, [0, true], 'a clock set back earns nothing and loses nothing');
  assert.ok(r.full <= r.perHour[4], 'the barn is full at stockCap');
});

test('the Ranch tab shows the barn and buttons, and a right answer in battle cheers the workers', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    hubPet = 'otter'; hubTab = 'ranch'; renderHub();
    out.tab = document.getElementById('hub-body').innerText;
    assignWorker('otter', 'berry');
    out.working = document.getElementById('hub-body').innerText;
    const before = state.ranch.stock.berry;
    state.streak = 1; answerBonuses(false);
    out.cheered = state.ranch.stock.berry > before;
    hubPet = 'dog'; renderHub(); out.team = document.getElementById('hub-body').innerText;
    return out;
  });
  assert.match(r.tab, /Berry Patch/);
  assert.match(r.tab, /0\/1 working/);
  assert.match(r.working, /1\/1 working/);
  assert.match(r.working, /Send home/);
  assert.ok(r.cheered);
  assert.match(r.team, /fights instead of working/);
});

test('bad Ranch data in a save is repaired', async () => {
  const r = await page.evaluate(() => {
    state.ranch = { at: Date.now() + 1e9, workers: { otter: 'berry', ghost: 'berry', fox: 'moon' }, stock: { berry: 'x', ore: 9999, junk: 5 } };
    normalizeState();
    const a = JSON.stringify(state.ranch.workers), b = [state.ranch.stock.berry, state.ranch.stock.ore, state.ranch.at <= Date.now()];
    state.ranch = 'broken'; normalizeState();
    return { a, b, c: Object.keys(state.ranch).sort().join(',') };
  });
  assert.equal(r.a, '{"otter":"berry"}');
  assert.deepEqual(r.b, [0, 30, true]);
  assert.equal(r.c, 'at,stock,workers');
});

test('berries pay for the Biscuit and the Favorite snack instead of gems, and ore crafts Catch Nets up to the cap', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    state.gems = 100; state.nets = 0; state.care = {}; state.buddyXp.otter = xpForLevel(5);
    const E = ECON.ranch;
    hubPet = 'otter'; hubTab = 'care'; renderHub();
    out.hidden = !document.getElementById('hub-body').innerText.includes('🫐');            // no berry buttons before you use the Ranch
    state.ranch.stock = { berry: E.treatBerries + E.favBerries + 1.5, ore: E.orePerNet * 2 + 1 };
    renderHub(); out.shown = document.getElementById('hub-body').innerText.includes('🫐');
    const xp0 = getBuddyXp('otter');
    careAct('treat', 'berry');
    out.treat = [state.gems, ranchHas('berry'), getBuddyXp('otter') - xp0, getCare('otter').treat];
    careAct('treat', 'berry'); out.again = state.ranch.stock.berry;                         // once a day: nothing is spent
    careAct('fav', 'berry');
    out.fav = [state.gems, getBond('otter'), getCare('otter').fav, state.ranch.stock.berry];
    state.ranch.stock.berry = 0; getCare('otter').treat = false; careAct('treat', 'berry');
    out.broke = [getCare('otter').treat, state.gems];                                       // not enough berries: nothing happens, gems are not touched
    careAct('treat'); out.gems = [getCare('otter').treat, state.gems];                      // the gem price still works
    craftNet(); craftNet(); craftNet();
    out.nets = [state.nets, ranchHas('ore')];
    state.ranch.stock.ore = E.orePerNet * 3; state.nets = maxNets(); craftNet();
    out.full = [state.nets, ranchHas('ore')];
    return out;
  });
  assert.equal(r.hidden, true);
  assert.equal(r.shown, true);
  assert.equal(r.treat[0], 100, 'no gems were spent');
  assert.equal(r.treat[1], 5, '7.5 berries minus 2');
  assert.ok(r.treat[2] > 0 && r.treat[3]);
  assert.equal(r.again, 5.5, 'a second biscuit the same day costs nothing');
  assert.deepEqual(r.fav.slice(1, 3), [1, true]);
  assert.equal(r.fav[0], 100);
  assert.equal(r.fav[3], 1.5, 'the Favorite cost 4 berries');
  assert.deepEqual(r.broke, [false, 100]);
  assert.deepEqual(r.gems, [true, 100 - 2]);
  assert.deepEqual(r.nets, [2, 1], 'two nets from 13 ore at 6 each');
  assert.deepEqual(r.full, [9, 18], 'a full net stock refuses to craft and keeps the ore');
});

test('the Nursery: two workers and berries raise a rare egg of one of their types; one egg at a time', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    state.badges = ['ember', 'tide']; state.egg = null;
    assignWorker('otter', 'berry'); breedWorkers(); out.one = [state.egg, state.ranch.stock.berry];        // one worker is not enough
    assignWorker('fox', 'berry'); state.ranch.stock.berry = ECON.ranch.eggBerries - 1; breedWorkers(); out.poor = state.egg;
    state.ranch.stock.berry = ECON.ranch.eggBerries + 2.5;
    hubPet = 'otter'; hubTab = 'ranch'; renderHub(); out.btn = !document.querySelector('#hub-body button[onclick="breedWorkers()"]').disabled;
    breedWorkers();
    out.egg = [state.egg && state.egg.rarity, state.egg && ['water', 'fire'].includes(state.egg.element), state.ranch.stock.berry];
    state.ranch.stock.berry = 30; breedWorkers(); out.second = state.ranch.stock.berry;                  // an egg is already growing: nothing is spent
    renderHub(); out.text = document.getElementById('hub-body').innerText;
    return out;
  });
  assert.deepEqual(r.one, [null, 0]);
  assert.equal(r.poor, null);
  assert.equal(r.btn, true);
  assert.deepEqual(r.egg, ['rare', true, 2.5]);
  assert.equal(r.second, 30);
  assert.match(r.text, /more right answers to hatch/);
});

test('no errors', () => { assert.deepEqual(errors, []); });
