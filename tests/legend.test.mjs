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
    triggerMonsterDamage(99, false); await wait(3000);
    document.getElementById('raid-modal').style.display = 'none'; modalDone();
    Math.random = real;
    out.win = [state.gems >= ECON.legend.gems, state.wild.since === since, state.wild.legend, getOwnedIds().includes(sp.id)];
    // every other factor (type matchup, role, quirk) multiplies the whole chance, so a miss adds pity x (base / catchChance)
    out.miss = [legendState().misses, wildCatchChance(sp, {}) > base, wildCatchChance(sp, {}) - base, ECON.legend.pity * base / ECON.legend.catchChance];
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
  assert.ok(Math.abs(r.miss[2] - r.miss[3]) < 1e-9, 'each miss adds the pity share of the chance: ' + r.miss[2] + ' vs ' + r.miss[3]);
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
  assert.equal(r.legend, '{"week":-1,"day":"","caught":false,"misses":20,"race":"","wins":0}');
  assert.equal(r.pool, false);
});

test('Riley\'s race: the deadline is fixed by the week (never random), and the map shows it', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    const days = new Set(); for (let w = 0; w < 12; w++) { const real = weekNumber; weekNumber = () => 3000 + w; days.add(rileyDay()); weekNumber = real; }
    out.range = [Math.min(...days) >= ECON.legend.riley.firstDay, Math.max(...days) <= ECON.legend.riley.lastDay, days.size > 1];
    out.stable = rileyDay() === rileyDay();
    state.storySeen.champion = 1;
    const real = rileyDay;
    rileyDay = () => weekDay() + 2; openMap(); out.ahead = document.querySelector('#map-body .legend-row .d').innerText; closeMap();
    rileyDay = () => weekDay(); openMap(); out.behind = document.querySelector('#map-body .legend-row .d').innerText; closeMap();
    rileyDay = real;
    out.weekDay = weekDay(new Date(2026, 9, 12)) + ',' + weekDay(new Date(2026, 9, 18));
    return out;
  });
  assert.deepEqual(r.range, [true, true, true]);
  assert.equal(r.stable, true);
  assert.match(r.ahead, /Race Riley: 2 days left for \+40/);
  assert.match(r.behind, /Riley already caught it/);
  assert.equal(r.weekDay, '0,6', 'Monday is day 0, Sunday day 6');
});

test('beating Riley to the legend pays a bonus once and is counted; losing the race pays nothing and is kind', async () => {
  const r = await page.evaluate(() => {
    const out = {}, real = Math.random, realEnq = enqueueModal, realDay = rileyDay;
    const queue = []; enqueueModal = (f) => queue.push(f);
    Math.random = () => 0;
    state.storySeen.champion = 1; state.buddyXp.dog = xpForLevel(50); state.gems = 0; state.nets = 0; state.unlockedSecrets = [];
    const sp = legendOfWeek();
    const catchIt = () => resolveCatch({ id: sp.id, flawless: false, shiny: false }, 0);
    // a win: Riley is still 2 days away
    rileyDay = () => weekDay() + 2;
    catchIt();
    out.won = [state.gems, legendState().race, legendState().wins, getOwnedIds().includes(sp.id), queue.length];
    queue[queue.length - 1](); out.wonStory = [document.getElementById('raid-title').innerText, document.getElementById('raid-panels').innerText, document.getElementById('raid-note').innerText];
    openMap(); out.wonRow = document.querySelector('#map-body .legend-row .d').innerText; closeMap();
    // the same week again: a spare, no second bonus
    const g = state.gems; catchIt(); out.again = [state.gems - g - 0 >= 0 && state.gems === g, legendState().wins, state.spares[sp.id]];
    // a new week, Riley is already ahead
    state.legend.week = weekNumber() - 1; rileyDay = () => weekDay() - 1; state.unlockedSecrets = state.unlockedSecrets.filter((id) => id !== sp.id); state.spares = {};
    const g2 = state.gems; queue.length = 0; catchIt();
    out.lost = [state.gems - g2, legendState().race, legendState().wins, getOwnedIds().includes(sp.id)];
    queue[queue.length - 1](); out.lostStory = [document.getElementById('raid-title').innerText, document.getElementById('raid-panels').innerText, document.getElementById('raid-btn').innerText];
    openMap(); out.lostRow = document.querySelector('#map-body .legend-row .d').innerText; closeMap();
    // a new week clears the race but keeps the tally
    state.legend.week = weekNumber() - 1; out.newWeek = [legendState().race, legendState().caught, legendState().wins];
    Math.random = real; enqueueModal = realEnq; rileyDay = realDay;
    return out;
  });
  assert.deepEqual(r.won.slice(0, 4), [40, 'won', 1, true]);
  assert.equal(r.won[4], 2, 'the loot window, then the race story');
  assert.equal(r.wonStory[0], '🏁 You beat Riley!');
  assert.match(r.wonStory[1], /Race bonus: \+40 gems/);
  assert.match(r.wonStory[2], /Races won against Riley: 1/);
  assert.match(r.wonRow, /You beat Riley/);
  assert.deepEqual(r.again, [true, 1, 1], 'no second bonus in the same week');
  assert.deepEqual(r.lost, [0, 'lost', 1, true], 'losing the race pays nothing, takes nothing, and you still get the legend');
  assert.equal(r.lostStory[0], '🧢 Riley got there first');
  assert.match(r.lostStory[1], /No harm done/);
  assert.doesNotMatch(r.lostStory[1] + r.lostStory[2], /lose|lost|fail|sorry/i, 'kind copy');
  assert.match(r.lostRow, /Riley got there first/);
  assert.deepEqual(r.newWeek, ['', false, 1]);
});

test('the hunt story tells you how long Riley needs, and a saved race is repaired', async () => {
  const r = await page.evaluate(() => {
    const out = {}, realDay = rileyDay;
    state.storySeen.champion = 1; state.buddyXp.dog = xpForLevel(50);
    rileyDay = () => weekDay() + 1; startLegendHunt();
    out.ahead = document.getElementById('raid-panels').innerText;
    document.getElementById('raid-modal').style.display = 'none'; modalDone();
    state.wild.legend = false; state.legend.day = ''; state.wild.id = 'fox';
    rileyDay = () => weekDay() - 1; startLegendHunt();
    out.behind = document.getElementById('raid-panels').innerText;
    rileyDay = realDay;
    state.legend = { week: 5, day: '', caught: false, misses: 0, race: 'won', wins: -2 }; NORMALIZERS.forEach((fn) => fn(state));
    out.a = JSON.stringify(state.legend);
    state.legend = { week: 5, day: '', caught: true, misses: 0, race: 'hacked', wins: 4 }; NORMALIZERS.forEach((fn) => fn(state));
    out.b = state.legend.race;
    state.legend = { week: 5, day: '', caught: true, misses: 0, race: 'lost', wins: 4 }; NORMALIZERS.forEach((fn) => fn(state));
    out.c = state.legend.race;
    return out;
  });
  assert.match(r.ahead, /It catches it in 1 day\. Be first for a bonus!/);
  assert.match(r.behind, /Riley (already caught|has|found)/);
  assert.equal(r.a, '{"week":5,"day":"","caught":false,"misses":0,"race":"","wins":0}');
  assert.equal(r.b, '');
  assert.equal(r.c, 'lost');
});

test('no errors', () => { assert.deepEqual(errors, []); });
