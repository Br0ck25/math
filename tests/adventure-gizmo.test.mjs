// The Gizmo and the helper people (Prof. Pi, Net Maker, Traders, Day Care keeper, Move Tutor) on the Adventure map.
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
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; state.storySeen.map = 1; state.hero.made = true; state.keyItems = ['map-card', 'radio-card']; });
});
const put = (map, x, y, face = 'up') => page.evaluate(([m, px, py, f]) => {
  state.overworld.map = m; state.overworld.x = px; state.overworld.y = py; state.overworld.face = f;
  if (document.getElementById('overworld-modal').style.display !== 'flex') openAdventure();
  renderOverworld();
}, [map, x, y, face]);
const talkText = () => page.evaluate(() => document.getElementById('talk-text').innerText);
const choices = () => page.evaluate(() => [...document.querySelectorAll('#talk-choices button')].map((b) => b.innerText));
// Walk up to the person at (x, y) from the tile below and read all their lines.
const meet = async (map, x, y) => {
  await put(map, x, y + 1, 'up');
  await page.evaluate(() => owMove('up'));
  while (await page.evaluate(() => document.getElementById('talk-next').innerText === 'Next')) await page.evaluate(() => talkNext());
};

test('Prof. Pi gives the Gizmo once, and the button shows on the map only with it', async () => {
  await put('hollow', 7, 9);
  assert.equal(await page.evaluate(() => document.getElementById('ow-gizmo-btn').style.display), 'none');
  await meet('hollow-house', 5, 2);
  assert.ok(await page.evaluate(() => hasKeyItem('gizmo')));
  assert.match(await talkText(), /Gizmo/);
  await page.evaluate(() => closeTalk());
  await page.evaluate(() => renderOverworld());
  assert.notEqual(await page.evaluate(() => document.getElementById('ow-gizmo-btn').style.display), 'none');
  assert.equal(await page.evaluate(() => state.keyItems.filter((k) => k === 'gizmo').length), 1);
});

test('the Gizmo travels only to towns the hero has stood in', async () => {
  await page.evaluate(() => { grantKeyItem('gizmo'); });
  await put('hollow', 7, 9);
  await page.evaluate(() => { state.overworld.map = 'meadow'; owSetRegion(OW_MAPS.meadow); openGizmo(); });
  assert.deepEqual(await page.evaluate(() => state.overworld.seen), ['hollow', 'meadow']);
  const rows = await page.evaluate(() => [...document.querySelectorAll('#gizmo-body .gizmo-row')].map((r) => r.innerText));
  assert.equal(rows.length, 2);                       // never a town that was not visited
  await page.evaluate(() => gizmoTravel('ember'));
  assert.equal(await page.evaluate(() => state.overworld.map), 'meadow');
  await page.evaluate(() => gizmoTravel('hollow'));
  assert.deepEqual(await page.evaluate(() => [state.overworld.map, state.overworld.x, state.overworld.y]), ['hollow', 7, 9]);
  assert.deepEqual(errors, []);
});

test('the Gizmo Town Map draws the towns, marks where you are and travels from a square', async () => {
  await page.evaluate(() => { grantKeyItem('gizmo'); });
  await page.evaluate(() => { state.overworld.seen = ['hollow']; state.overworld.map = 'meadow'; owSetRegion(OW_MAPS.meadow); openGizmo(); });
  assert.equal(await page.evaluate(() => document.querySelectorAll('#gizmo-body svg.gm-map .gm-town').length), await page.evaluate(() => OW_LANDS.length + 2));
  assert.deepEqual(await page.evaluate(() => ['.gm-land', '.gm-river', '.gm-water', '.gm-tree', '.gm-peak', '.gm-mtn'].map((q) => document.querySelectorAll('#gizmo-body svg.gm-map ' + q).length > 0)), [true, true, true, true, true, true]);   // coast, river, lakes, woods and mountains under the roads
  assert.equal(await page.evaluate(() => document.querySelectorAll('#gizmo-body svg.gm-map .gm-me').length), 1);
  assert.equal(await page.evaluate(() => document.querySelectorAll('#gizmo-body svg.gm-map .gm-town:not(.gm-dim)').length), 2);   // Cozy Hollow and Meadow Town only
  await page.evaluate(() => document.querySelector('#gizmo-body svg.gm-map g[onclick*="hollow"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  assert.equal(await page.evaluate(() => state.overworld.map), 'hollow');
  assert.deepEqual(errors, []);
});

test('the Gizmo shows the clock, calls and tips', async () => {
  await page.evaluate(() => { grantKeyItem('gizmo'); });
  await put('hollow', 7, 9);
  await page.evaluate(() => openGizmo());
  for (const t of ['clock', 'calls', 'tips']) {
    await page.evaluate((x) => gizmoSetTab(x), t);
    assert.ok((await page.evaluate(() => document.getElementById('gizmo-body').innerText)).length > 10, t);
  }
  await page.evaluate(() => gizmoSetTab('calls'));
  const before = await page.evaluate(() => document.querySelectorAll('#gizmo-body .gizmo-row').length);
  await page.evaluate(() => { state.overworld.story.push('tide-ferry'); gizmoSetTab('calls'); });
  assert.equal(await page.evaluate(() => document.querySelectorAll('#gizmo-body .gizmo-row').length), before + 1);
  assert.deepEqual(errors, []);
});

test('a Trader swaps one spare for a buddy you do not have, once', async () => {
  await page.evaluate(() => { state.spares = {}; state.unlockedPets = state.unlockedPets.filter((id) => id !== 'bunny'); });
  await meet('ember-house', 2, 2);
  assert.deepEqual(await choices(), []);               // no spare fox yet
  assert.match(await talkText(), /spare/i);
  await page.evaluate(() => { closeTalk(); if (getOwnedIds().indexOf('fox') === -1) grantBuddy('fox'); state.spares.fox = 1; });
  await meet('ember-house', 2, 2);
  assert.equal((await choices()).length, 1);
  await page.evaluate(() => talkChoose(0));
  assert.ok(await page.evaluate(() => getOwnedIds().indexOf('bunny') !== -1));
  assert.equal(await page.evaluate(() => spareCount('fox')), 0);
  assert.deepEqual(await page.evaluate(() => state.overworld.traded), ['ember-trader']);
  await meet('ember-house', 2, 2);
  assert.deepEqual(await choices(), []);               // already traded
});

test('the Tutor teaches a move that was forgotten', async () => {
  await page.evaluate(() => { state.buddyXp[state.activePet] = xpForLevel(30); });
  await meet('grove-house', 2, 2);
  const labels = await choices();
  assert.ok(labels.length >= 1);
  const before = await page.evaluate(() => abPartyMon(state.activePet).moves.map((m) => m.id));
  await page.evaluate(() => talkChoose(0));
  await page.evaluate(() => talkChoose(0));
  const after = await page.evaluate(() => abPartyMon(state.activePet).moves.map((m) => m.id));
  assert.notDeepEqual(after, before);
  assert.equal(after.length, 4);
  assert.deepEqual(errors, []);
});

test('a bad seen or traded list in a save is repaired', async () => {
  await page.evaluate(() => { state.overworld.seen = ['hollow', 'hollow', 'meadow-house', 'nowhere', 7]; state.overworld.traded = ['ember-trader', 'ember-trader', 'zzz']; normalizeState(); });
  assert.deepEqual(await page.evaluate(() => state.overworld.seen), ['hollow']);
  assert.deepEqual(await page.evaluate(() => state.overworld.traded), ['ember-trader']);
});

test('the map is tinted by the hour, and the Gizmo clock says the same time of day', async () => {
  await put('hollow', 7, 9);
  const r = await page.evaluate(() => {
    const real = Date.prototype.getHours, out = {};
    [[3, 'night'], [4, 'morning'], [9, 'morning'], [10, 'day'], [17, 'day'], [18, 'night'], [22, 'night']].forEach(([h, name]) => {
      Date.prototype.getHours = () => h; renderOverworld();
      out[h] = [owTimeOfDay() === name, document.getElementById('ow-view').classList.contains('ow-' + name)];
    });
    Date.prototype.getHours = () => 22; grantKeyItem('gizmo'); gizmoSetTab('clock'); showModal('gizmo-modal', renderGizmo);
    out.clock = /night/.test(document.getElementById('gizmo-body').innerText);
    Date.prototype.getHours = real;
    return out;
  });
  assert.deepEqual(Object.values(r).flat(), new Array(15).fill(true));
});

test('walking warms an egg: every few steps count as one answer, with a daily cap', async () => {
  await put('hollow', 7, 9);
  const r = await page.evaluate(() => {
    ECON.overworld.eggEvery = 2; ECON.overworld.eggPerDay = 3;
    state.egg = { element: 'fire', rarity: 'common', steps: 0, target: 50 };
    const o = state.overworld; o.walk = { day: '', n: 0, eggs: 0 };
    for (let i = 0; i < 40; i++) owWalkEgg();
    const capped = state.egg.steps;
    state.egg = null; const n = o.walk.n; owWalkEgg();
    return { capped, same: o.walk.n === n };
  });
  assert.deepEqual(r, { capped: 3, same: true });
});

test('the Map Card is not given to you: Guide Ivy gives it after her tour, and without it the Gizmo map is empty and cannot travel', async () => {
  await page.evaluate(() => { state.keyItems = []; grantKeyItem('gizmo'); state.overworld.seen = ['hollow', 'meadow']; state.overworld.map = 'meadow'; owSetRegion(OW_MAPS.meadow); openGizmo(); });
  assert.equal(await page.evaluate(() => document.querySelectorAll('#gizmo-body svg.gm-map').length), 0);
  assert.match(await page.evaluate(() => document.getElementById('gizmo-body').innerText), /Guide Ivy/);
  await page.evaluate(() => gizmoTravel('hollow'));
  assert.equal(await page.evaluate(() => state.overworld.map), 'meadow');
  await page.evaluate(() => { closeGizmo(); });
  const guide = await page.evaluate(() => where.npc('meadow', 'meadow-guide'));
  await meet('meadow', guide.x, guide.y);
  assert.ok(await page.evaluate(() => hasKeyItem('map-card')));
  await page.evaluate(() => { closeTalk(); openGizmo(); });
  assert.equal(await page.evaluate(() => document.querySelectorAll('#gizmo-body svg.gm-map').length), 1);
});

test('the Radio Card is won with a five-question quiz at the Radio Tower; without it the Gizmo radio gives no tips', async () => {
  const r = await page.evaluate(() => {
    state.keyItems = ['map-card']; grantKeyItem('gizmo'); gizmoTab = 'tips'; openGizmo();
    const locked = document.getElementById('gizmo-body').innerText;
    const sign = OW_MAPS['spark-tower-1'].signs['3,2'], tile = OW_MAPS['spark-tower-1'].rows[2].charAt(3);
    closeGizmo();
    state.overworld.beat = []; openSignQuiz(sign); const early = document.getElementById('talk-text').innerText;
    closeTalk(); state.overworld.beat = ['tower-zam']; openSignQuiz(sign); const rounds = talk.quiz.rounds; closeTalk();
    owStoryReward('radio-quiz');
    gizmoTab = 'tips'; openGizmo();
    return { locked, early, rounds, tile, has: hasKeyItem('radio-card'), tips: document.getElementById('gizmo-body').innerText, again: owStoryDone('radio-quiz') };
  });
  assert.match(r.locked, /Radio Card/);
  assert.match(r.early, /Zam/);
  assert.deepEqual([r.rounds, r.tile, r.has, r.again], [5, 's', true, false]);
  assert.doesNotMatch(r.tips, /not tuned/);
});

test('Cyclist Ray in Volt Valley gives the Bicycle once, and a held direction then steps faster than with the Running Shoes', async () => {
  const before = await page.evaluate(() => { state.keyItems = ['running-shoes']; return owStepMs(); });
  await meet('volt-house', 5, 2);
  const r = await page.evaluate(() => ({ has: hasKeyItem('bicycle'), ms: owStepMs(), shoe: ECON.overworld.shoeMs, again: grantKeyItem('bicycle') }));
  assert.equal(before, await page.evaluate(() => ECON.overworld.shoeMs));
  assert.deepEqual([r.has, r.ms < r.shoe, r.again], [true, true, false]);
});

test('Dowser Fen gives the Itemfinder, and with it hidden finds sparkle within three tiles and can be picked up', async () => {
  await meet('ember-house', 5, 2);
  const r = await page.evaluate(() => {
    const has = hasKeyItem('itemfinder'), h = OW_MAPS.route1.objects.find((o) => o.id === 'route1-hidden');
    openAdventure(); state.overworld.map = 'route1'; state.overworld.x = h.x; state.overworld.y = h.y + 1; state.overworld.found = [];
    const near = !!owPickupAt(OW_MAPS.route1, h.x, h.y);
    state.overworld.x = Math.min(12, h.x + 5); state.overworld.y = Math.min(21, h.y + 5);
    const far = !!owPickupAt(OW_MAPS.route1, h.x, h.y);
    state.keyItems = []; state.overworld.x = h.x; state.overworld.y = h.y + 1;
    const without = !!owPickupAt(OW_MAPS.route1, h.x, h.y);
    return { has, near, far, without, hidden: OW_LANDS.every((L) => OW_MAPS[L.routeIn].objects.some((o) => o.hidden)) };
  });
  assert.deepEqual(r, { has: true, near: true, far: false, without: false, hidden: true });
});

test('Apricorn trees grow back daily and Kurt makes a special net from two of them', async () => {
  await meet('grove-house', 6, 2);
  await page.evaluate(() => closeTalk());
  const r = await page.evaluate(() => {
    const bush = OW_MAPS.route1.objects.find((o) => o.id === 'route1-apricorns'), real = dayKey;
    dayKey = () => '2031-03-01'; renderOverworld(); state.items = {}; state.overworld.found = [];
    owCollect(bush); const one = state.items.apricorn, gone = !owPickupAt(OW_MAPS.route1, bush.x, bush.y);
    dayKey = () => '2031-03-02'; renderOverworld(); const back = !!owPickupAt(OW_MAPS.route1, bush.x, bush.y);
    dayKey = real;
    const npc = OW_MAPS['grove-house'].npcs.find((n) => n.id === 'grove-kurt');
    state.items.apricorn = 1; OW_SERVICES.kurt(npc); document.querySelectorAll('#talk-choices button')[0].click();
    const short = [state.items.apricorn, state.items.levelnet || 0, document.getElementById('talk-text').innerText];
    state.items.apricorn = 5; OW_SERVICES.kurt(npc); document.querySelectorAll('#talk-choices button')[2].click();
    return { one, gone, back, short, made: [state.items.apricorn, state.items.lurenet] };
  });
  assert.deepEqual([r.one, r.gone, r.back], [1, true, true]);
  assert.match(r.short[2], /You need 2 Apricorns/);
  assert.deepEqual([r.short[0], r.short[1], r.made], [1, 0, [3, 1]]);
});

test('the Gizmo Phone lists the numbers you have and a Call opens their words; a friend with a gift hands it over', async () => {
  const r = await page.evaluate(() => {
    grantKeyItem('gizmo'); grantKeyItem('fishing-rod'); state.phone.gift = ''; state.potions = 0; gizmoTab = 'phone'; openGizmo();
    const names = Array.from(document.querySelectorAll('#gizmo-body .gizmo-row b')).map((b) => b.textContent);
    const i = gizmoContacts().findIndex((c) => c.name === 'Fisher Gil'); gizmoCall(i);
    const out = { names, said: talk.lines.join(' '), potions: state.potions, open: !document.getElementById('talk-modal').classList.contains('hidden') };
    closeTalk(); gizmoCall(0); out.mom = /gems/.test(talk.lines.join(' ')); closeTalk(); return out;
  });
  assert.deepEqual(r.names.slice(0, 3), ['Mom', 'Prof. Pi', 'Fisher Gil']);
  assert.match(r.said, /fish are biting/); assert.equal(r.potions, 1); assert.ok(r.mom);
  assert.deepEqual(errors, []);
});

test('link roads join two towns by a second road: closed until both towns are seen, walkable end to end, and drawn on the Town Map with the caves', async () => {
  const r = await page.evaluate(() => {
    const out = { built: OW_LINKS.every((d) => !!OW_MAPS[d.id]) };
    const d = OW_LINKS[0], A = OW_MAPS[d.from], B = OW_MAPS[d.to], L = OW_MAPS[d.id];
    out.gaps = [A.warps.some((w) => w.x === 15 && w.y === 6 && w.to === d.id && w.needs === d.to), B.warps.some((w) => w.x === 0 && w.y === 6 && w.to === d.id && w.needs === d.from)];
    // walk end to end
    const seen = {}, q = [[1, 6]]; seen['1,6'] = 1;
    while (q.length) { const c = q.pop(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach((v) => { const x = c[0] + v[0], y = c[1] + v[1]; if (!seen[x + ',' + y] && owWalkable(L, x, y) && !owNpcAt(L, x, y)) { seen[x + ',' + y] = 1; q.push([x, y]); } }); }
    out.through = !!seen[(OW_MAPS[d.id].rows[0].length - 2) + ',6']; out.stuff = L.objects.every((o) => seen[o.x + ',' + o.y] || [[1, 0], [-1, 0], [0, 1], [0, -1]].some((v) => seen[(o.x + v[0]) + ',' + (o.y + v[1])]));
    // closed until the other town is seen
    grantKeyItem('gizmo'); grantKeyItem('map-card'); state.hero.made = true; openAdventure();
    const o = state.overworld; o.seen = [d.from]; o.map = d.from; o.x = 14; o.y = 6; owSetRegion(A); renderOverworld(); owMove('right');
    out.closed = o.map === d.from && o.x === 14 && owTileAt(A, 15, 6).t === 't-bush';
    o.seen = [d.from, d.to]; o.x = 14; o.y = 6; owMove('right');
    out.open = o.map === d.id;
    state.overworld.map = d.id; gizmoTab = 'map'; openGizmo();
    out.road = document.querySelectorAll('#gizmo-body svg.gm-map .gm-road').length; out.caves = document.querySelectorAll('#gizmo-body svg.gm-map .gm-cave').length;
    out.here = gizmoNodeOf(d.id).from === d.from;
    return out;
  });
  assert.deepEqual([r.built, r.gaps, r.through, r.stuff, r.closed, r.open, r.here], [true, [true, true], true, true, true, true, true]);
  assert.ok(r.road > 0 && r.caves > 0, JSON.stringify(r));
  assert.deepEqual(errors, []);
});

