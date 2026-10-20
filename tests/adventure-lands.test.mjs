// The land passes: every land with a town on the Adventure map is checked the same way (OW_LANDS), and the road between lands opens with the badge.
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
const put = (map, x, y, face = 'up') => page.evaluate(([m, px, py, f]) => {
  state.overworld.map = m; state.overworld.x = px; state.overworld.y = py; state.overworld.face = f;
  if (document.getElementById('overworld-modal').style.display !== 'flex') openAdventure();
  renderOverworld();
}, [map, x, y, face]);
const shown = (id) => page.evaluate((i) => document.getElementById(i).style.display === 'flex', id);

test('every land with a town has what a town needs: a gym door, a Center and a Mart with their people, a house, a guide, a quiz sign, a route in, and goods in a nook', async () => {
  const problems = await page.evaluate(() => {
    const out = [];
    state.badges = gymRegions().map((x) => x.id);
    OW_LANDS.forEach((L) => {
      const town = OW_MAPS[L.town], need = (c, why) => { if (!c) out.push(L.land + ': ' + why); };
      need(town && regionById(L.land).gym, 'no town or no gym land');
      if (!town) return;
      need(town.region === L.land, 'the town belongs to its land');
      need(Object.values(town.gyms || {}).indexOf(L.land) !== -1, 'a gym door for its own gym');
      need(OW_MAPS[L.routeIn] && OW_MAPS[L.routeIn].warps.some((w) => w.to === L.town), 'a route leads into the town');
      need(OW_MAPS[L.center].npcs.some((n) => n.kind === 'nurse'), 'a nurse');
      need(OW_MAPS[L.mart].npcs.some((n) => n.kind === 'clerk'), 'a clerk');
      need((OW_MAPS[L.house].npcs || []).length >= 1, 'someone in the house');
      need(town.npcs.length >= 1 && town.npcs.some((n) => !n.kind), 'a person who talks');
      need(Object.values(town.signs || {}).some((s) => s.quiz), 'a quiz sign');
      need(town.warps.filter((w) => w.to === L.center || w.to === L.mart || w.to === L.house).length === 3, 'doors to the Center, Mart and house');
      need(L.land === 'meadow' || (town.palette && Object.keys(town.palette).length >= 4), 'its own colours');
      need((OW_MAPS[L.routeIn].npcs || []).filter((n) => n.kind === 'trainer').length >= 2, 'at least two trainers on the route in');
      need((OW_MAPS[L.routeIn].trees && Object.keys(OW_MAPS[L.routeIn].trees).length) || (town.trees && Object.keys(town.trees).length), 'a shake tree');
      L.nook.forEach((id) => need(OW_MAPS[L.town].objects.some((o) => o.id === id), 'nook goods ' + id));
      need(!L.charm || OW_GATES[L.charm].badge === L.land, 'the charm is the land\'s own');
      [L.center, L.mart, L.house].forEach((room) => { const w = OW_MAPS[room].warps[0], d = town.warps.find((x) => x.to === room); need(w.to === L.town && w.tx === d.x && w.ty === d.y + 1, room + ': the way out lands south of the door'); });
    });
    return out;
  });
  assert.deepEqual(problems, []);
});

test('the lands table is in story order and matches the gym lands', async () => {
  const r = await page.evaluate(() => ({ lands: OW_LANDS.map((L) => L.land), order: gymRegions().map((g) => g.id), ids: new Set(OW_LANDS.map((L) => L.town)).size === OW_LANDS.length }));
  assert.deepEqual(r.lands, r.order.slice(0, r.lands.length));
  assert.ok(r.ids);
});

test('every road barrier opens with the badge before it, or any later badge, and says kindly what is missing', async () => {
  const r = await page.evaluate(() => {
    const out = [];
    Object.keys(OW_MAPS).forEach((k) => {
      const m = OW_MAPS[k];
      Object.keys(m.roads || {}).forEach((p) => {
        const [x, y] = p.split(',').map(Number), badge = m.roads[p], ids = gymRegions().map((g) => g.id);
        state.badges = [];
        const closed = !owWalkable(m, x, y);
        state.badges = [badge];
        const opens = owWalkable(m, x, y);
        state.badges = ids.slice(ids.indexOf(badge) + 1, ids.indexOf(badge) + 2);
        const later = ids.indexOf(badge) === ids.length - 1 ? true : owWalkable(m, x, y);
        state.badges = ids.slice(0, ids.indexOf(badge));
        const earlier = !owWalkable(m, x, y);
        out.push({ map: k, p, badge, closed, opens, later, earlier });
      });
    });
    return out;
  });
  assert.ok(r.length >= 1);
  r.forEach((o) => assert.deepEqual([o.closed, o.opens, o.later, o.earlier], [true, true, true, true], JSON.stringify(o)));
  await put('meadow', 7, 1, 'up');
  const hint = await page.evaluate(() => { state.badges = []; renderOverworld(); owMove('up'); return { x: state.overworld.y, name: document.getElementById('talk-name').innerText, text: document.getElementById('talk-text').innerText }; });
  assert.deepEqual([hint.x, hint.name], [1, 'Road guard']);
  assert.match(hint.text, /Sunny Meadow Badge/);
});

test('with the Meadow Badge the road north opens, Route 2 makes the grass fiery, and the Practice Map says you are in Ember Hills', async () => {
  await put('meadow', 7, 1, 'up');
  const r = await page.evaluate(() => {
    state.badges = ['meadow']; renderOverworld();
    owMove('up');
    const gate = [state.overworld.map, state.overworld.x, state.overworld.y, state.region];
    const real = Math.random; let fire = 0; Math.random = real;
    for (let i = 0; i < 80; i++) if (getSpecies(rollWildSpecies([]).id).element === 'fire') fire++;
    openMap(); const here = document.querySelector('#map-body .map-row.here').innerText; closeMap();
    return { gate, fire, here, visited: state.regionsVisited.slice() };
  });
  assert.deepEqual(r.gate, ['route2', 6, 22, 'ember']);
  assert.ok(r.fire > 40, 'mostly fire buddies in the grass: ' + r.fire + ' of 80');
  assert.match(r.here, /Ember Hills/);
  assert.ok(r.visited.includes('ember'));
});

test('an old save that already has a later badge walks through the road without the first one', async () => {
  await put('meadow', 7, 1, 'up');
  const r = await page.evaluate(() => { state.badges = ['tide']; owMove('up'); return state.overworld.map; });
  assert.equal(r, 'route2');
});

test('Route 2 has two trainers that see the path, a shake tree, and a nook behind thorny bushes', async () => {
  await put('route2', 6, 17, 'up');
  await page.evaluate(() => owMove('up'));                                                              // (6,16): Hiker Brick at 3,16 looks right
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => document.getElementById('talk-name').innerText), 'Hiker Brick');
  await page.click('#talk-next');
  const r = await page.evaluate(() => {
    state.overworld.x = 10; state.overworld.y = 19; state.overworld.face = 'right'; state.badges = []; renderOverworld();
    owMove('right'); const blocked = document.getElementById('talk-text').innerText; closeTalk();
    state.badges = ['meadow']; renderOverworld(); owMove('right'); owMove('right');
    return { blocked, pos: [state.overworld.x, state.overworld.y], tree: Object.values(OW_MAPS.route2.trees) };
  });
  assert.match(r.blocked, /Trim Charm/);
  assert.deepEqual(r.pos, [12, 19]);
  assert.deepEqual(r.tree, ['route2-tree']);
});

test('Ember Hills: its gym door explains the level, the steam nook waits for the Steam Boots, and the Center remembers the town', async () => {
  await put('ember', 11, 10, 'up');
  const gym = await page.evaluate(() => { owMove('up'); return { name: document.getElementById('talk-name').innerText, text: document.getElementById('talk-text').innerText, gym: state.gym }; });
  assert.equal(gym.name, 'Ember Hills Gym');
  assert.match(gym.text, /Come back a little stronger/);
  assert.equal(gym.gym, null);
  await page.evaluate(() => closeTalk());
  await put('ember', 4, 13, 'left');
  const nook = await page.evaluate(() => { state.badges = []; owMove('left'); const t = document.getElementById('talk-text').innerText; closeTalk(); return t; });
  assert.match(nook, /Steam Boots from the Ember Hills Gym/);
  await page.evaluate(() => { state.badges = ['meadow', 'ember']; state.overworld.x = 4; state.overworld.y = 13; renderOverworld(); owMove('left'); owMove('left'); });
  assert.deepEqual(await page.evaluate(() => [state.overworld.x, state.overworld.y]), [2, 13]);
  await put('ember-center', 3, 2, 'up');
  await page.evaluate(() => owMove('up'));
  assert.deepEqual(await page.evaluate(() => state.overworld.center), { map: 'ember', x: 4, y: 5 });
});

test('the Ember gym opens at its level and starts the fire gym run with the first trainer', async () => {
  await put('ember', 11, 10, 'up');
  await page.evaluate(() => { state.buddyXp.dog = xpForLevel(20); owMove('up'); });
  await page.click('#talk-next');
  await page.click('#talk-choices button');
  const r = await page.evaluate(() => ({ gym: JSON.stringify(state.gym), foe: getBossInfo().trainer, el: getSpecies(state.wild.id).element }));
  assert.equal(r.gym, '{"region":"ember","step":0}');
  assert.equal(r.foe, 'Scout Mia');
  assert.equal(r.el, 'fire');
  assert.deepEqual(errors, []);
});

test('a reload in the middle of a trainer battle leaves the trainer unbeaten and nothing stuck', async () => {
  await put('route2', 6, 17, 'up');
  await page.evaluate(() => owMove('up'));
  await page.waitForTimeout(300);
  await page.click('#talk-choices button');
  await page.reload();
  const r = await page.evaluate(() => ({ battle: typeof ab !== 'undefined' && !!ab, beat: state.overworld.beat.length, fight: state.overworld.fight }));
  assert.deepEqual(r, { battle: false, beat: 0, fight: false });
});

for (const [w, h] of [[320, 568], [420, 800]]) {
  test('Ember Hills draws on a ' + w + 'x' + h + ' phone with its own colours and nothing sideways', async () => {
    await page.setViewportSize({ width: w, height: h });
    await put('ember', 7, 10, 'up');
    const r = await page.evaluate(() => { const v = document.getElementById('ow-view'); return { roof: v.style.getPropertyValue('--w-roof'), scroll: document.documentElement.scrollWidth <= innerWidth, hero: !!v.querySelector('.ow-hero'), cells: v.querySelectorAll('.ow-cell').length }; });
    assert.equal(r.roof, '#D9622B');
    assert.ok(r.scroll && r.hero);
    assert.equal(r.cells, w <= 360 ? 49 : 81);
    await page.setViewportSize({ width: 1280, height: 720 });
  });
}

test('every nook is behind its charm gate: unreachable without the charm, reachable with it (the nook in each town, and the one on each route)', async () => {
  const r = await page.evaluate(() => {
    const reach = (k) => {                                                       // tiles the hero can stand on from every arrival tile of map k
      const m = OW_MAPS[k], starts = [m.start];
      Object.keys(OW_MAPS).forEach((o) => OW_MAPS[o].warps.forEach((w) => { if (w.to === k) starts.push({ x: w.tx, y: w.ty }); }));
      const seen = new Set(), q = [];
      starts.forEach((a) => { if (owWalkable(m, a.x, a.y) && !seen.has(a.x + ',' + a.y)) { seen.add(a.x + ',' + a.y); q.push([a.x, a.y]); } });
      while (q.length) { const [cx, cy] = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = cx + dx, ny = cy + dy; if (owWalkable(m, nx, ny) && !owNpcAt(m, nx, ny) && !seen.has(nx + ',' + ny)) { seen.add(nx + ',' + ny); q.push([nx, ny]); } }); }
      return seen;
    };
    const nooks = [];
    OW_LANDS.forEach((L) => { if (L.nook.length) nooks.push({ map: L.town, ids: L.nook }); const route = OW_MAPS[L.routeIn]; const ids = route.objects.filter((o) => /-nook-/.test(o.id)).map((o) => o.id); if (ids.length) nooks.push({ map: L.routeIn, ids }); });
    const out = [], real = hasKeyItem;
    state.badges = gymRegions().map((x) => x.id);
    nooks.forEach((n) => {
      const m = OW_MAPS[n.map], at = (id) => { const o = m.objects.find((p) => p.id === id); return o.x + ',' + o.y; };
      hasKeyItem = () => false;
      const without = reach(n.map);
      hasKeyItem = real;
      const withAll = reach(n.map);
      out.push({ map: n.map, closed: n.ids.every((id) => !without.has(at(id))), open: n.ids.every((id) => withAll.has(at(id))) });
    });
    return out;
  });
  assert.ok(r.length >= 4);
  r.forEach((o) => assert.deepEqual([o.closed, o.open], [true, true], JSON.stringify(o)));
});

test('Tide Bay: the road from Ember Hills opens with the Ember Badge, Route 3 turns the grass to water buddies, and the pond is right there to fish in', async () => {
  await put('ember', 7, 1, 'up');
  const r = await page.evaluate(() => {
    state.badges = ['ember']; renderOverworld();
    owMove('up');
    const gate = [state.overworld.map, state.overworld.x, state.overworld.y, state.region];
    let water = 0; for (let i = 0; i < 80; i++) if (getSpecies(rollWildSpecies([]).id).element === 'water') water++;
    return { gate, water, trainers: OW_MAPS.route3.npcs.map((n) => n.face + '@' + n.x), tide: OW_MAPS.tide.rows.slice(13, 15) };
  });
  assert.deepEqual(r.gate, ['route3', 6, 22, 'tide']);
  assert.ok(r.water > 40, 'mostly water buddies: ' + r.water + ' of 80');
  assert.deepEqual(r.trainers, ['left@10', 'right@3'], 'the route is the mirror of Route 2, so its trainers stand the other way round');
  assert.ok(r.tide.every((row) => /~~T$/.test(row)));
});

test('all eight gym lands have a town, in story order, chained by roads: each town\'s exit leads to the next route and opens with its own badge', async () => {
  const r = await page.evaluate(() => {
    const out = { lands: OW_LANDS.map((L) => L.land), chain: [], journey: [] };
    for (let i = 0; i + 1 < OW_LANDS.length; i++) {
      const a = OW_LANDS[i], b = OW_LANDS[i + 1], town = OW_MAPS[a.town];
      const roadTile = Object.keys(town.roads || {}).find((p) => town.roads[p] === a.land), warp = town.warps.find((w) => w.to === b.routeIn);
      out.chain.push([a.land + '>' + b.land, !!roadTile, !!warp, !!warp && roadTile === warp.x + ',' + warp.y]);
    }
    // the journey: with the badges won so far, the next town is reachable from the start by walking and warping, and not before
    const ids = gymRegions().map((g) => g.id), reachableMaps = () => {
      const seen = new Set([OW_START.map]), q = [OW_START.map];
      while (q.length) {
        const k = q.shift(), m = OW_MAPS[k], tiles = new Set(), w = [m.start];
        Object.keys(OW_MAPS).forEach((o) => OW_MAPS[o].warps.forEach((x) => { if (x.to === k && seen.has(o)) w.push({ x: x.tx, y: x.ty }); }));
        const st = []; w.forEach((a) => { if (owWalkable(m, a.x, a.y) && !tiles.has(a.x + ',' + a.y)) { tiles.add(a.x + ',' + a.y); st.push([a.x, a.y]); } });
        while (st.length) { const [cx, cy] = st.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = cx + dx, ny = cy + dy; if (owWalkable(m, nx, ny) && !owNpcAt(m, nx, ny) && !tiles.has(nx + ',' + ny)) { tiles.add(nx + ',' + ny); st.push([nx, ny]); } }); }
        m.warps.forEach((x) => { if (tiles.has(x.x + ',' + x.y) && !seen.has(x.to)) { seen.add(x.to); q.push(x.to); } });
      }
      return seen;
    };
    OW_LANDS.forEach((L, i) => {
      state.badges = ids.slice(0, i);                                                                 // the badges you hold on arriving at land i
      const here = reachableMaps();
      out.journey.push([L.land, here.has(L.town), i + 1 < OW_LANDS.length && here.has(OW_LANDS[i + 1].town)]);
    });
    return out;
  });
  assert.deepEqual(r.lands, ['meadow', 'ember', 'tide', 'grove', 'volt', 'gloom', 'mystic', 'skyreach']);
  r.chain.forEach((c) => assert.deepEqual(c.slice(1), [true, true, true], c[0]));
  r.journey.forEach((j) => assert.equal(j[1], true, j[0] + ' can be reached with the badges before it'));
  assert.ok(r.journey.slice(0, -1).every((j) => j[2] === false), 'the next town is never reachable before its road opens');
});

test('Skyreach is the last land: no charm nook of its own, its gym needs level 56, and its road leads on to the Champion\'s Walk', async () => {
  await put('skyreach', 11, 10, 'up');
  const r = await page.evaluate(() => {
    const L = OW_LANDS[OW_LANDS.length - 1];
    owMove('up');
    const out = { land: L.land, charm: L.charm, nook: L.nook, name: document.getElementById('talk-name').innerText, text: talk.lines.join(' '), road: OW_MAPS.skyreach.roads['7,0'], to: OW_MAPS.skyreach.warps.find((w) => w.x === 7 && w.y === 0).to };
    return out;
  });
  assert.deepEqual([r.land, r.charm, r.nook], ['skyreach', '', []]);
  assert.equal(r.name, 'Skyreach Gym');
  assert.match(r.text, /level 56/);
  assert.deepEqual([r.road, r.to], ['skyreach', 'champwalk']);
});
