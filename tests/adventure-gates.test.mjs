// Charms and gates, the hidden nook, fishing and shake trees on the Adventure map.
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
const treeSpot = () => page.evaluate(() => { const k = Object.keys(OW_MAPS.route1.trees)[0].split(',').map(Number); window.__T = nextTo('route1', k[0], k[1]); return window.__T; });
const put = (map, x, y, face = 'up') => page.evaluate(([m, px, py, f]) => {
  state.overworld.map = m; state.overworld.x = px; state.overworld.y = py; state.overworld.face = f;
  if (document.getElementById('overworld-modal').style.display !== 'flex') openAdventure();
  renderOverworld();
}, [map, x, y, face]);
const shown = (id) => page.evaluate((i) => document.getElementById(i).style.display === 'flex', id);
const wait = (ms) => page.waitForTimeout(ms);

test('seven charms, one per badge except Skyreach, each with a picture for the charm, the closed gate and the open gate', async () => {
  const r = await page.evaluate(() => {
    mountWorldArt();
    const ids = Object.keys(OW_GATES), has = (x) => !!document.getElementById('w-' + x);
    return {
      ids, badges: ids.map((i) => OW_GATES[i].badge), distinct: new Set(ids.map((i) => OW_GATES[i].badge)).size,
      real: ids.every((i) => gymRegions().some((g) => g.id === OW_GATES[i].badge)),
      charmArt: ids.every((i) => has('k-' + i) && KEY_ITEMS.some((k) => k.id === i && k.art === 'k-' + i && k.badge === OW_GATES[i].badge)),
      gateArt: ids.every((i) => has(OW_GATES[i].closed) && has(OW_GATES[i].open)), tileArt: Object.keys(OW_TILES).every((c) => has(OW_TILES[c].t)),
      chars: Object.keys(OW_GATE_CHARS).sort().join(), hints: ids.every((i) => OW_GATES[i].hint.includes(OW_GATES[i].name) && OW_GATES[i].text),
      skyreach: KEY_ITEMS.some((k) => k.badge === 'skyreach')
    };
  });
  assert.deepEqual(r.ids, ['trim', 'steam', 'water', 'vines', 'switch', 'lamp', 'stars']);
  assert.deepEqual(r.badges, ['meadow', 'ember', 'tide', 'grove', 'volt', 'gloom', 'mystic']);
  assert.equal(r.distinct, 7);
  assert.ok(r.real && r.charmArt && r.gateArt && r.tileArt && r.hints);
  assert.equal(r.chars, 'g,h,j,k,l,q,z');
  assert.equal(r.skyreach, false);
});

test('a charm is yours while you hold its badge: old saves have theirs, nothing is stored, and it cannot be handed out', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    state.badges = [];
    out.none = Object.keys(OW_GATES).map(hasKeyItem);
    state.badges = ['meadow', 'tide'];
    out.two = Object.keys(OW_GATES).map(hasKeyItem);
    out.grant = grantKeyItem('stars');
    out.stored = state.keyItems.slice();
    state.badges = ['mystic']; out.stars = hasKeyItem('stars');
    state.keyItems = ['trim', 'badge-case', 'laser']; NORMALIZERS.forEach((fn) => { if (fn.name === 'keyItems') fn(state); });
    out.kept = state.keyItems.slice();
    return out;
  });
  assert.deepEqual(r.none, [false, false, false, false, false, false, false]);
  assert.deepEqual(r.two, [true, false, true, false, false, false, false]);
  assert.equal(r.grant, false);
  assert.deepEqual(r.stored, []);
  assert.equal(r.stars, true);
  assert.deepEqual(r.kept, ['trim', 'badge-case'], 'only real key items survive a repair');
});

test('winning a badge tells about its charm; the Bag shows the charms you hold', async () => {
  const r = await page.evaluate(() => {
    state.badges = [];
    abGymWon('ember', false);
    const story = talk.lines.join(' ');
    state.hero.name = 'Sam'; renderBag();
    return { story, bag: document.getElementById('bag-body').innerText };
  });
  assert.match(r.story, /Steam Boots/);
  assert.match(r.bag, /Steam Boots/);
  assert.doesNotMatch(r.bag, /Trim Charm/);
  const sky = await page.evaluate(() => { abGymWon('skyreach', false); return talk.lines.join(' '); });
  assert.doesNotMatch(sky, /also get the/, 'Skyreach has no charm');
});

test('every kind of gate blocks with its own kind hint until the charm is held, then is walkable and drawn open', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    Object.keys(OW_GATE_CHARS).forEach((c) => {
      const id = OW_GATE_CHARS[c], g = OW_GATES[id];
      OW_MAPS.gatetest = { id: 'gatetest', name: 'Gate test', region: 'meadow', start: { x: 1, y: 1 }, rows: ['TTTTT', 'T,' + c + ',T', 'TTTTT'], warps: [], npcs: [], objects: [], signs: {} };
      state.badges = []; state.overworld.map = 'gatetest'; state.overworld.x = 1; state.overworld.y = 1; state.overworld.face = 'right';
      if (document.getElementById('overworld-modal').style.display !== 'flex') openAdventure();
      renderOverworld();
      const closedArt = !!document.querySelector('#ow-view use[href="#w-' + g.closed + '"]');
      owMove('right');
      const blocked = { x: state.overworld.x, hint: document.getElementById('talk-text').innerText, talk: document.getElementById('talk-modal').style.display, name: document.getElementById('talk-name').innerText };
      closeTalk();
      state.badges = [g.badge]; renderOverworld();
      const openArt = !!document.querySelector('#ow-view use[href="#w-' + g.open + '"]');
      owMove('right');
      out[id] = { closedArt, blocked, openArt, passed: state.overworld.x, tile: owWalkable(OW_MAPS.gatetest, 2, 1) };
    });
    delete OW_MAPS.gatetest; state.overworld.map = 'hollow'; state.overworld.x = 7; state.overworld.y = 9;
    return out;
  });
  Object.keys(r).forEach((id) => {
    assert.equal(r[id].closedArt, true, id + ' is drawn closed');
    assert.deepEqual([r[id].blocked.x, r[id].blocked.talk, r[id].blocked.name], [1, 'flex', 'Blocked'], id + ' blocks');
    assert.match(r[id].blocked.hint, /Come back|could|would/i);
    assert.equal(r[id].openArt, true, id + ' is drawn open with its charm');
    assert.deepEqual([r[id].passed, r[id].tile], [2, true], id + ' lets the hero through with its charm');
  });
  assert.deepEqual(errors, []);
});

test('the Route 1 nook is behind thorny bushes: closed without the Trim Charm, open with the Meadow badge, with two gifts inside', async () => {
  const gem = await page.evaluate(() => OW_MAPS.route1.objects.find((o) => o.id === 'route1-nook-gem'));
  await put('route1', gem.x, gem.y + 2, 'up');                              // the bush is the tile between the road side and the gifts
  const blocked = await page.evaluate((y) => { owMove('up'); return { y: state.overworld.y, text: document.getElementById('talk-text').innerText }; }, gem.y);
  assert.equal(blocked.y, gem.y + 2);
  assert.match(blocked.text, /Trim Charm from the Sunny Meadow Gym/);
  await page.evaluate(() => { closeTalk(); state.badges = ['meadow']; state.potions = 0; state.nets = 0; });
  const r = await page.evaluate(() => {
    owMove('up'); owMove('up'); const gems = state.potions; owMove('up');                  // the bush, the Potion, then the net
    return { pos: [state.overworld.x, state.overworld.y], net: state.nets, gems, found: state.overworld.found.slice() };
  });
  assert.deepEqual(r.pos, [gem.x, gem.y - 1]);
  assert.equal(r.net, 1);
  assert.equal(r.gems, 1, 'a Potion in the nook');
  assert.deepEqual(r.found.sort(), ['route1-nook-gem', 'route1-nook-net']);
});

test('the main road never needs a charm: with every road open and no charm, every map, gym door, person and trainer can be reached; only side goods wait', async () => {
  const r = await page.evaluate(() => {
    hasKeyItem = () => false; owRoadOpen = () => true; owNpcActive = () => true;                                                    // no charm in the bag, the badge roads open
    const arrivals = {}, maps = Object.keys(OW_MAPS);
    maps.forEach((k) => { arrivals[k] = [OW_MAPS[k].start]; });
    const reached = new Set([OW_START.map]), tiles = {};
    for (let round = 0; round < maps.length + 1; round++) {
      maps.forEach((k) => {
        if (!reached.has(k) && !(arrivals[k].length > 1)) return;
        const m = OW_MAPS[k], seen = new Set(), q = [];
        (reached.has(k) ? arrivals[k] : []).forEach((a) => { if (owWalkable(m, a.x, a.y)) { seen.add(a.x + ',' + a.y); q.push([a.x, a.y]); } });
        while (q.length) {
          const [cx, cy] = q.shift();
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = cx + dx, ny = cy + dy; if (owWalkable(m, nx, ny) && !owNpcAt(m, nx, ny) && !seen.has(nx + ',' + ny)) { seen.add(nx + ',' + ny); q.push([nx, ny]); } });
        }
        tiles[k] = seen;
        m.warps.forEach((w) => { if (seen.has(w.x + ',' + w.y) && !reached.has(w.to)) { reached.add(w.to); arrivals[w.to].push({ x: w.tx, y: w.ty }); } });
      });
    }
    const near = (k, x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => tiles[k] && tiles[k].has((x + dx) + ',' + (y + dy)));
    const out = { maps: maps.filter((k) => !reached.has(k)), gyms: [], people: [], side: [], nooks: [] };
    maps.forEach((k) => {
      const m = OW_MAPS[k];
      Object.keys(m.gyms || {}).forEach((p) => { if (!(tiles[k] && tiles[k].has(p))) out.gyms.push(k + ':' + p); });
      (m.npcs || []).forEach((n) => { if (!near(k, n.x, n.y)) out.people.push(n.id); });
      (m.objects || []).forEach((o) => { if (!(tiles[k] && tiles[k].has(o.x + ',' + o.y))) out.side.push(o.id); if (/-nook-/.test(o.id)) out.nooks.push(o.id); });
    });
    return out;
  });
  assert.deepEqual([r.maps, r.gyms, r.people], [[], [], []]);
  assert.ok(r.nooks.length >= 6);
  assert.deepEqual(r.side.sort(), r.nooks.sort(), 'the goods in the nooks (behind the gates) are the only thing that waits for a charm');
});

test('Fisher Gil gives the Fishing Rod once; after that he says how to fish', async () => {
  await put('meadow', 12, 13, 'left');
  const r = await page.evaluate(() => {
    owMove('left');
    const first = document.getElementById('talk-text').innerText;
    document.getElementById('talk-next').click();
    const second = document.getElementById('talk-text').innerText;
    document.getElementById('talk-next').click();
    const third = document.getElementById('talk-text').innerText;
    const has = hasKeyItem('fishing-rod'), saved = JSON.parse(localStorage.getItem('math_quest_save')).keyItems.slice();
    closeTalk();
    owMove('left');
    const again = document.getElementById('talk-text').innerText;
    closeTalk();
    return { first, second, third, has, saved, again, keys: state.keyItems.slice() };
  });
  assert.match(r.first, /water buddies/);
  assert.match(r.second, /Take my old Fishing Rod/);
  assert.equal(r.third, 'You got the Fishing Rod!');
  assert.equal(r.has, true);
  assert.ok(r.saved.includes('fishing-rod'));
  assert.match(r.again, /tap it to fish/);
  assert.equal(r.keys.filter((k) => k === 'fishing-rod').length, 1, 'only one rod');
});

test('without the rod the pond only suggests one; with it a try may bite (a normal wild fight with a water buddy) or not', async () => {
  await put('meadow', 12, 14, 'right');
  const noRod = await page.evaluate(() => { owMove('right'); const t = document.getElementById('talk-text').innerText; closeTalk(); return { t, fight: !!ab }; });
  assert.match(noRod.t, /calm and clear/);
  assert.equal(noRod.fight, false);
  const nibble = await page.evaluate(() => {
    state.keyItems = ['fishing-rod'];
    const real = Math.random; Math.random = () => 0.99;
    owMove('right'); Math.random = real;
    return { fight: !!ab, toast: document.getElementById('toast').innerText, ow: document.getElementById('overworld-modal').style.display };
  });
  assert.deepEqual([nibble.fight, nibble.toast, nibble.ow], [false, 'No bite. Try again!', 'flex']);
  const bite = await page.evaluate(() => {
    const real = Math.random; Math.random = () => 0;
    owMove('right'); Math.random = real;
    return { fight: !!ab, kind: ab.kind, element: ab.foes[0].element, ow: document.getElementById('overworld-modal').style.display, screen: document.getElementById('ab-modal').style.display };
  });
  assert.deepEqual([bite.fight, bite.kind, bite.element, bite.screen], [true, 'wild', 'water', 'flex']);
  assert.notEqual(bite.ow, 'flex');
});

test('a fished buddy is beaten like any wild buddy: the map comes back and the next foe waits', async () => {
  await put('meadow', 12, 14, 'right');
  const r = await page.evaluate(async () => {
    state.keyItems = ['fishing-rod']; state.buddyXp[state.activePet] = xpForLevel(12);
    const real = Math.random; Math.random = () => 0; owMove('right'); Math.random = real;
    const since = state.wild.since;
    while (!(ab.phase === 'menu' && !ab.busy)) await new Promise((res) => setTimeout(res, 100));
    abFoe().hp = 1; abFight(); abAnswer(ab.q.ans); abUseMove(0);
    for (let i = 0; i < 200 && ab; i++) await new Promise((res) => setTimeout(res, 100));
    return { ow: document.getElementById('overworld-modal').style.display, fight: !!ab, since: [since, state.wild.since], pos: [state.overworld.map, state.overworld.x, state.overworld.y] };
  });
  assert.equal(r.ow, 'flex');
  assert.equal(r.fight, false);
  assert.deepEqual(r.since[0], r.since[1]);
  assert.deepEqual(r.pos, ['meadow', 12, 14]);
});

test('a shake tree drops a rare buddy once a day: the same one all day, never a cheap one, and each tree on its own', async () => {
  const T = await treeSpot(); await put('route1', T.x, T.y, T.face);
  const r = await page.evaluate(() => {
    const out = {};
    out.same = shakeSpecies('route1-tree').id === shakeSpecies('route1-tree').id;
    out.notCheap = ['route1-tree', 'hollow-tree'].every((t) => { const sp = shakeSpecies(t); return !isStoreBuddy(sp) || sp.cost >= 150; });
    const real = dayKey; const picks = new Set();
    for (let d = 1; d <= 12; d++) { dayKey = function () { return '2031-01-' + String(d).padStart(2, '0'); }; picks.add(shakeSpecies('route1-tree').id); }
    dayKey = real; out.varies = picks.size > 3;
    const want = shakeSpecies('route1-tree').id;
    owMove(__T.face);
    out.first = { text: document.getElementById('talk-text').innerText, fight: !!ab, shaken: state.overworld.shaken.ids.slice() };
    closeTalk();
    out.fight = { on: !!ab, id: ab.foes[0].id, want, ow: document.getElementById('overworld-modal').style.display };
    return out;
  });
  assert.ok(r.same && r.notCheap && r.varies);
  assert.match(r.first.text, /Something fell out/);
  assert.deepEqual(r.first.shaken, ['route1-tree']);
  assert.equal(r.first.fight, false, 'the fight starts when the words are closed');
  assert.deepEqual([r.fight.on, r.fight.id === r.fight.want], [true, true]);
  assert.notEqual(r.fight.ow, 'flex');
});

test('shaking again the same day gives nothing, tomorrow it works again, and another tree is separate', async () => {
  const T = await treeSpot(); await put('route1', T.x, T.y, T.face);
  const r = await page.evaluate(() => {
    const out = {};
    owMove(__T.face); closeTalk(); ab = null; document.getElementById('ab-modal').style.display = 'none'; document.getElementById('overworld-modal').style.display = 'flex';
    state.overworld.map = 'route1'; state.overworld.x = __T.x; state.overworld.y = __T.y; state.overworld.face = __T.face; renderOverworld();
    owMove(__T.face);
    out.again = { text: document.getElementById('talk-text').innerText, fight: !!ab };
    closeTalk();
    state.overworld.shaken.day = '1999-01-01';
    owMove(__T.face);
    out.tomorrow = document.getElementById('talk-text').innerText; closeTalk();
    ab = null; document.getElementById('ab-modal').style.display = 'none'; document.getElementById('overworld-modal').style.display = 'flex';
    state.overworld.map = 'hollow'; state.overworld.x = 13; state.overworld.y = 6; state.overworld.face = 'right'; renderOverworld();
    owMove('right');
    out.other = document.getElementById('talk-text').innerText; out.ids = state.overworld.shaken.ids.slice();
    return out;
  });
  assert.match(r.again.text, /nothing more fell out/);
  assert.equal(r.again.fight, false);
  assert.match(r.tomorrow, /Something fell out/);
  assert.match(r.other, /Something fell out/);
  assert.deepEqual(r.ids, ['route1-tree', 'hollow-tree']);
});

test('saved shaken trees are repaired: only real trees, once each, with a plain day', async () => {
  const r = await page.evaluate(() => {
    const run = (v) => { state.overworld = Object.assign({ map: 'hollow', x: 7, y: 9, face: 'down' }, v); NORMALIZERS.forEach((fn) => { if (fn.name === 'overworld') fn(state); }); return JSON.parse(JSON.stringify(state.overworld.shaken)); };
    return [run({ shaken: { day: '2030-05-05-long', ids: ['hollow-tree', 'hollow-tree', 'nope', 7, 'route1-tree'] } }), run({ shaken: 'all' }), run({})];
  });
  assert.deepEqual(r[0], { day: '2030-05-05', ids: ['hollow-tree', 'route1-tree'] });
  assert.deepEqual(r[1], { day: '', ids: [] });
  assert.deepEqual(r[2], { day: '', ids: [] });
});

for (const [w, h] of [[320, 568], [420, 800]]) {
  test('the gate hint and the Bag with charms fit a ' + w + 'x' + h + ' phone', async () => {
    await page.setViewportSize({ width: w, height: h });
    await put('route1', 4, 2, 'left');
    const r = await page.evaluate(() => {
      owMove('left');
      const c = document.querySelector('#talk-modal .modal-content').getBoundingClientRect();
      const hint = c.left >= 0 && c.right <= innerWidth && c.bottom <= innerHeight && document.documentElement.scrollWidth <= innerWidth;
      closeTalk(); state.badges = gymRegions().map((x) => x.id); state.hero.name = 'Sam'; openBag();
      const b = document.querySelector('#bag-modal .modal-content').getBoundingClientRect();
      return { hint, bag: b.left >= 0 && b.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth, arts: document.querySelectorAll('#bag-body .bag-key-art').length };
    });
    assert.ok(r.hint && r.bag);
    assert.equal(r.arts, 7, 'the seven charms (this hero has no other key items)');
    await page.setViewportSize({ width: 1280, height: 720 });
  });
}
