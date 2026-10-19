// Trails: a daily set of spots in every land; each opens with one right answer and gives goods.
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
    state.storySeen.map = 1; state.nets = 0; state.gems = 0; state.trails = {}; state.trailGems = { day: '', n: 0 };
    state.ranch = { at: 0, workers: {}, stock: { berry: 0, ore: 0 } };
  });
});

test('the Explore button opens the land\'s Trail; a wrong answer keeps the spot closed and a right one opens it and gives goods', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    openMap();
    out.button = [...document.querySelectorAll('#map-body button')].some((b) => b.innerText.includes('Explore'));
    openTrail('meadow');
    out.shown = [document.getElementById('trail-modal').style.display, document.querySelectorAll('#trail-body .move-btn').length];
    openSpot(0);
    out.question = trailQuestion !== null && document.querySelectorAll('#trail-options .vault-btn').length >= 2;
    const wrong = trailQuestion.q.opts.find((v) => v !== trailQuestion.q.ans);
    answerSpot(wrong);
    out.wrong = [trailDone('meadow', 0), trailQuestion !== null, document.getElementById('trail-note').innerText];
    const goods = chestGoods('meadow', 0);
    answerSpot(trailQuestion.q.ans);
    out.right = [trailDone('meadow', 0), trailQuestion, goods, state.nets, state.ranch.stock.berry, state.ranch.stock.ore];
    openSpot(1); out.person = [trailQuestion, trailDone('meadow', 1)];          // the traveller needs no question
    openSpot(0); out.again = trailQuestion;                                      // an opened spot stays done
    closeTrail(); closeMap();
    return out;
  });
  assert.equal(r.button, true);
  assert.deepEqual(r.shown, ['flex', 6]);
  assert.equal(r.question, true);
  assert.deepEqual(r.wrong.slice(0, 2), [false, true]);
  assert.match(r.wrong[2], /try another/i);
  assert.equal(r.right[0], true);
  assert.equal(r.right[1], null);
  const [, , goods, nets, berry, ore] = r.right;
  assert.deepEqual([nets, berry, ore], goods === 'net' ? [1, 0, 0] : goods === 'berry' ? [0, 3, 0] : [0, 0, 2]);
  assert.deepEqual(r.person, [null, true]);
  assert.equal(r.again, null);
});

test('a Trail is the same all day for a land and changes with the day; progress starts over each day', async () => {
  const r = await page.evaluate(() => {
    const real = dayKey;
    const goods = (day) => { dayKey = () => day; return [0, 2, 3, 4].map((i) => chestGoods('ember', i)).join(','); };
    const a1 = goods('2026-01-01'), a2 = goods('2026-01-01');
    const days = ['2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07'].map(goods);
    dayKey = () => '2026-02-01'; trailLand = 'ember'; finishSpot(0, 'chest'); const monday = trailProgress('ember').done.slice();
    dayKey = () => '2026-02-02'; const tuesday = trailProgress('ember').done.slice();
    dayKey = real;
    return { same: a1 === a2, varies: days.some((d) => d !== a1), monday, tuesday };
  });
  assert.ok(r.same);
  assert.ok(r.varies, 'other days have other chests');
  assert.deepEqual(r.monday, [0]);
  assert.deepEqual(r.tuesday, [], 'a new day, a fresh Trail');
});

test('goods respect the caps: a full net bag gives berries, and the barn never goes over its cap', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    state.nets = maxNets(); out.full = [trailGive('net'), state.nets === maxNets(), state.ranch.stock.berry];
    state.nets = 0; out.net = [trailGive('net'), state.nets];
    state.ranch.stock.berry = ECON.ranch.stockCap - 1; trailGive('berry'); out.cap = state.ranch.stock.berry;
    return out;
  });
  assert.deepEqual(r.full, ['3 🫐', true, 3]);
  assert.deepEqual(r.net, ['🕸️ Catch Net', 1]);
  assert.equal(r.cap, 30);
});

test('a Trail pays gems when five of its six spots are open, for the first three Trails of a day and nothing more, and never twice', async () => {
  const r = await page.evaluate(() => {
    const out = [], kinds = TRAIL_SPOTS.map((s) => s.kind);
    ['meadow', 'ember', 'tide', 'grove'].forEach((land) => {
      trailLand = land; const before = state.gems;
      kinds.slice(0, 4).forEach((k, i) => finishSpot(i, k));
      const four = state.gems - before;                                  // four spots: not done yet
      finishSpot(4, kinds[4]); const five = state.gems - before;
      finishSpot(5, kinds[5]); const six = state.gems - before;
      out.push([four, five, six]);
    });
    return { out, gems: ECON.explore.gems, finished: trailFinished('meadow'), spots: TRAIL_SPOTS.length, at: ECON.explore.finishAt };
  });
  assert.equal(r.spots, 6);
  assert.equal(r.at, 5);
  assert.deepEqual(r.out.map((x) => x[0]), [0, 0, 0, 0]);
  assert.deepEqual(r.out.map((x) => x[1]), [r.gems, r.gems, r.gems, 0], 'the first three Trails of the day pay');
  assert.deepEqual(r.out.map((x) => x[2]), [r.gems, r.gems, r.gems, 0], 'the sixth spot pays nothing more');
  assert.ok(r.finished);
});

test('the Stone gate wants one element on your team: without it the gate stays shut, with it (or a Wildcard buddy) it opens and holds two kinds of goods', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    const gate = trailGate('ember', 3).element;
    const of = (pred) => storePets.find((p) => pred(p.element) && !p.requiresAllStorePets).id;
    const wrong = of((e) => e !== gate && e !== 'shadow'), right = of((e) => e === gate);
    const team = (id) => { state.unlockedPets = [id]; state.unlockedSecrets = []; state.team = [id]; state.activePet = id; };
    trailLand = 'ember';
    team(wrong); out.shut = trailGate('ember', 3).ok;
    renderTrail(); out.hint = document.getElementById('trail-body').innerText.includes('Bring a ' + gate + ' buddy');
    openSpot(3); out.noQuestion = [trailQuestion, trailDone('ember', 3)];
    team(right); out.ready = trailGate('ember', 3).ok;
    openSpot(3); out.question = trailQuestion !== null;
    answerSpot(trailQuestion.q.ans);
    out.opened = [trailDone('ember', 3), [state.nets, state.ranch.stock.berry, state.ranch.stock.ore].filter((n) => n > 0).length];
    const wild = storePets.concat(secretCompanions).find((p) => p.element === 'shadow');
    if (wild) { team(wild.id); out.wildcard = trailGate('ember', 3).ok && trailGate('ember', 4).ok; } else out.wildcard = true;
    out.skills = Object.keys(PARTNER_SKILLS).length;
    out.two = [trailGate('ember', 3).element !== trailGate('ember', 4).element, TRAIL_SPOTS.filter((x) => x.kind === 'gate').length];   // the cave wants a different element than the gate
    return out;
  });
  assert.equal(r.shut, false);
  assert.ok(r.hint, 'the list names the element the gate wants');
  assert.deepEqual(r.noQuestion, [null, false]);
  assert.equal(r.ready, true);
  assert.equal(r.question, true);
  assert.deepEqual(r.opened, [true, 2], 'a gate holds two kinds of goods');
  assert.equal(r.wildcard, true);
  assert.equal(r.skills, 6);
  assert.deepEqual(r.two, [true, 2], 'two gates, each wanting a different element');
});

test('weather: the same all day, changes over the days, shows on the map and the Trail, and favours some types of wild buddies', async () => {
  const r = await page.evaluate(() => {
    const out = {}, real = dayKey, realRandom = Math.random;
    const on = (day) => { dayKey = () => day; return weatherToday(); };
    const days = Array.from({ length: 40 }, (_, i) => '2026-03-' + String(i % 28 + 1).padStart(2, '0') + (i > 27 ? 'b' : ''));
    out.stable = on('2026-03-01') === on('2026-03-01');
    const seen = {}; days.forEach((d) => { seen[on(d).id] = true; });
    out.kinds = Object.keys(seen).sort().join(',');
    // for each kind of weather: a wild pick inside the weather's share of the roll favours its types
    out.picks = WEATHER.map((w) => {
      const day = days.find((d) => on(d).id === w.id);
      dayKey = () => day; state.region = 'meadow';
      const seq = [ECON.map.regionShare + 0.01, 0.1]; let k = 0; Math.random = () => seq[Math.min(k++, 1)];
      const sp = rollWildSpecies([]); Math.random = realRandom;
      return [w.id, w.favours.includes(sp.element)];
    });
    dayKey = () => days[0]; state.storySeen.map = 1; openMap();
    out.map = document.getElementById('map-progress').innerText.includes(weatherToday().name);
    openTrail('meadow'); out.trail = document.getElementById('trail-body').innerText.includes('Today: ' + weatherToday().icon);
    closeTrail(); closeMap(); dayKey = real;
    return out;
  });
  assert.ok(r.stable);
  assert.equal(r.kinds, 'rainy,stormy,sunny');
  assert.deepEqual(r.picks.map((p) => p[1]), [true, true, true], JSON.stringify(r.picks));
  assert.ok(r.map, 'the map header names the weather');
  assert.ok(r.trail, 'the Trail says today\'s weather');
});

test('weather buddies: nine store buddies only show up in their weather, and the weather slice of wild fights picks them', async () => {
  const r = await page.evaluate(() => {
    const out = {}, real = dayKey, realRandom = Math.random;
    const dayOf = (id) => ['2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04', '2026-04-05', '2026-04-06', '2026-04-07', '2026-04-08'].concat(Array.from({ length: 40 }, (_, i) => '2026-05-' + String(i + 1))).find((d) => { dayKey = () => d; return weatherToday().id === id; });
    out.bound = WEATHER.map((w) => w.buddies.length).join(',');
    out.allStore = WEATHER.every((w) => w.buddies.every((id) => storePets.some((p) => p.id === id)));
    out.weatherOf = [weatherOfBuddy('toon_peppa'), weatherOfBuddy('lion'), weatherOfBuddy('dog')];
    state.region = 'meadow';
    out.off = WEATHER.map((w) => {
      dayKey = () => dayOf(w.id);
      const others = WEATHER.filter((x) => x !== w).reduce((a, x) => a.concat(x.buddies), []);
      let seen = 0;
      for (let i = 0; i < 400; i++) { const sp = rollWildSpecies([]); if (others.indexOf(sp.id) !== -1) seen++; }
      return seen;
    });
    out.slice = WEATHER.map((w) => {
      dayKey = () => dayOf(w.id);
      const seq = [ECON.map.regionShare + 0.01, 0.1]; let k = 0; Math.random = () => seq[Math.min(k++, 1)];
      const sp = rollWildSpecies([]); Math.random = realRandom;
      return w.buddies.includes(sp.id);
    });
    dayKey = real;
    return out;
  });
  assert.equal(r.bound, '3,3,3');
  assert.ok(r.allStore);
  assert.deepEqual(r.weatherOf, ['rainy', 'sunny', '']);
  assert.deepEqual(r.off, [0, 0, 0], 'a weather buddy never shows up in other weather');
  assert.deepEqual(r.slice, [true, true, true]);
});

test('bad Trail data in a save is repaired', async () => {
  const r = await page.evaluate(() => {
    state.trails = { meadow: { day: 'x', done: [0, 0, 9, 'a', 2, -1] }, ghost: { day: 'y', done: [1] }, ember: 'broken' };
    state.trailGems = { day: 5, n: 'x' };
    normalizeState();
    return { t: JSON.stringify(state.trails), g: JSON.stringify(state.trailGems) };
  });
  assert.equal(r.t, '{"meadow":{"day":"x","done":[0,2]}}');
  assert.equal(r.g, '{"day":"","n":0}');
});

test('no errors', () => { assert.deepEqual(errors, []); });
