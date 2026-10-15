// The Legend hunt: one legendary buddy a week for Champions.
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

test('the legend of the week is the same all week, changes on Monday, and cycles through every type', async () => {
  const r = await page.evaluate(() => {
    const monday = new Date(2026, 9, 12), sunday = new Date(2026, 9, 18), next = new Date(2026, 9, 19);     // 12 Oct 2026 is a Monday
    const out = { wd: [weekNumber(monday) === weekNumber(sunday), weekNumber(next) === weekNumber(monday) + 1] };
    out.left = [weekDaysLeft(monday), weekDaysLeft(sunday)];
    const types = new Set(); for (let w = 0; w < legendPets.length; w++) types.add(legendPets[(weekNumber(monday) + w) % legendPets.length].element);
    out.types = types.size; out.all = legendPets.every((l) => getSpecies(l.id) === l && l.secret && l.legend && l.forms.length === 3);
    return out;
  });
  assert.deepEqual(r.wd, [true, true]);
  assert.deepEqual(r.left, [7, 1]);
  assert.equal(r.types, 6);
  assert.equal(r.all, true);
});

test('only Champions can hunt, once a day, never in a gym; the hunt is a tough wild fight that does not count toward the next boss', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    state.buddyXp.dog = xpForLevel(50); state.activePet = 'dog';
    out.locked = [legendBlocker(), (startLegendHunt(), state.wild.legend)];
    openMap(); out.lockedRow = document.querySelector('#map-body .legend-row').classList.contains('locked'); closeMap();
    state.storySeen.champion = 1;
    state.gym = { region: 'ember', step: 0 }; out.gym = [legendBlocker(), (startLegendHunt(), state.wild.legend)]; state.gym = null;
    const sp = legendOfWeek(), mine = getBuddyLevel('dog');
    openMap(); out.hunt = document.querySelector('#map-body .legend-row .claim-btn').disabled; closeMap();
    startLegendHunt(); document.getElementById('raid-modal').style.display = 'none'; modalDone();
    const info = getBossInfo();
    out.foe = [state.wild.id === sp.id, state.wild.legend, info.legend, info.name.startsWith('🌟'), bossLevel - mine, info.maxHp > wildStats(bossLevel).maxHp * 2];
    out.chip = document.getElementById('weak-chip').innerText;
    out.again = legendBlocker();
    return out;
  });
  assert.match(r.locked[0], /Become Champion/);
  assert.equal(r.locked[1], false);
  assert.equal(r.lockedRow, true);
  assert.match(r.gym[0], /gym/); assert.equal(r.gym[1], false);
  assert.equal(r.hunt, false, 'a Champion can start the hunt from the map');
  assert.deepEqual(r.foe, [true, true, true, true, 5, true]);
  assert.match(r.chip, /^🌟 🫧 Catch \d+%/);
  assert.match(r.again, /The hunt is on/);
});

test('winning pays gems, does not move the boss counter, and a miss raises the next chance; a catch ends the week\'s hunt', async () => {
  const r = await page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const out = {};
    state.storySeen.champion = 1; state.buddyXp.dog = xpForLevel(50); state.activePet = 'dog'; state.nets = 0; state.gems = 0;
    const sp = legendOfWeek(), real = Math.random;
    const base = wildCatchChance(sp, {});
    startLegendHunt(); document.getElementById('raid-modal').style.display = 'none'; modalDone();
    const since = state.wild.since;
    Math.random = () => 0.999;                                      // the catch fails
    monsterCurrentHp = 1; inputLocked = false; state.faintedPets = [];
    triggerMonsterDamage(99, false); await wait(1500);
    document.getElementById('raid-modal').style.display = 'none'; modalDone();
    Math.random = real;
    out.win = [state.gems >= ECON.legend.gems, state.wild.since === since, state.wild.legend, getOwnedIds().includes(sp.id)];
    out.miss = [legendState().misses, wildCatchChance(sp, {}) > base, wildCatchChance(sp, {}) - base];
    out.sameDay = legendBlocker();
    state.legend.day = '2000-01-01';                                // tomorrow
    out.tomorrow = legendBlocker();
    Math.random = () => 0; resolveCatch({ id: sp.id, flawless: false, shiny: false }, 0); Math.random = real;
    out.caught = [getOwnedIds().includes(sp.id), legendState().caught, /joined you this week/.test(legendBlocker())];
    Math.random = () => 0; resolveCatch({ id: sp.id, flawless: false, shiny: false }, 0); Math.random = real;
    out.spare = [state.spares[sp.id], spareValueOf(sp.id)];
    state.legend.week = weekNumber() - 1; out.newWeek = [legendState().caught, legendState().misses];
    return out;
  });
  assert.deepEqual(r.win, [true, true, false, false], 'a win pays, the boss counter is untouched, the foe is gone');
  assert.deepEqual(r.miss.slice(0, 2), [1, true]);
  assert.ok(Math.abs(r.miss[2] - 0.1) < 0.02, 'each miss adds about 10 points: ' + r.miss[2]);
  assert.match(r.sameDay, /hunted today/);
  assert.equal(r.tomorrow, '');
  assert.deepEqual(r.caught, [true, true, true]);
  assert.deepEqual(r.spare, [1, 100], 'a second legend is a spare worth 100 gems');
  assert.deepEqual(r.newWeek, [false, 0], 'a new week starts fresh');
});

test('a legend fight in a save survives a reload; a tampered one is dropped; weekly progress is clamped', async () => {
  const r = await page.evaluate(() => {
    const sp = legendOfWeek();
    state.wild = { id: sp.id, trainer: '', shiny: false, legend: true, since: 0, next: 6 }; NORMALIZERS.forEach((fn) => fn(state));
    const kept = [state.wild.id === sp.id, state.wild.legend];
    state.wild = { id: 'fox', trainer: '', shiny: false, legend: true, since: 0, next: 6 }; NORMALIZERS.forEach((fn) => fn(state));
    const fake = [state.wild.id, state.wild.legend];
    state.wild = { id: sp.id, trainer: '', shiny: false, legend: false, since: 0, next: 6 }; NORMALIZERS.forEach((fn) => fn(state));   // a legend as a plain wild buddy is not allowed
    const plain = state.wild.id;
    state.legend = { week: 'x', day: 7, caught: 'yes', misses: 999 }; NORMALIZERS.forEach((fn) => fn(state));
    return { kept, fake, plain, legend: JSON.stringify(state.legend), pool: wildPool().some((p) => p.legend) };
  });
  assert.deepEqual(r.kept, [true, true]);
  assert.deepEqual(r.fake, ['fox', false], 'a normal buddy keeps its place but is not a legend');
  assert.equal(r.plain, '', 'legends never appear as ordinary wild buddies');
  assert.equal(r.legend, '{"week":-1,"day":"","caught":false,"misses":20}');
  assert.equal(r.pool, false);
});

test('no errors', () => { assert.deepEqual(errors, []); });
