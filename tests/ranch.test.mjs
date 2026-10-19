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

test('no errors', () => { assert.deepEqual(errors, []); });
