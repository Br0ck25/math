// The Adventure map: walking, tall-grass fights, the way back to the map, saving, and the map data itself.
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
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; state.storySeen.map = 1; state.hero.made = true; });
});

const walk = (dirs) => page.evaluate((d) => { d.forEach(owMove); return { ...state.overworld }; }, dirs);
const open = () => page.evaluate(() => { openAdventure(); return state.overworld; });

test('every map is valid: equal rows, known tiles, warps that land on walkable non-warp tiles, signs on sign tiles', async () => {
  const bad = await page.evaluate(() => {
    state.badges = gymRegions().map((x) => x.id);                                                        // every badge: the roads and gates are open
    const problems = [];
    Object.keys(OW_MAPS).forEach((id) => {
      const m = OW_MAPS[id];
      if (m.id !== id) problems.push(id + ': id');
      if (new Set(m.rows.map((r) => r.length)).size !== 1) problems.push(id + ': rows differ in width');
      m.rows.forEach((r, y) => r.split('').forEach((c, x) => { if (!OW_TILES[c]) problems.push(id + ': unknown tile ' + c + ' at ' + x + ',' + y); }));
      if (!owWalkable(m, m.start.x, m.start.y)) problems.push(id + ': start is not walkable');
      m.rows.forEach((row, y) => row.split('').forEach((c, x) => { if (c === 'x' && !gymRegions().some((g) => g.id === (m.roads || {})[x + ',' + y])) problems.push(id + ': road barrier ' + x + ',' + y + ' has no badge'); }));
      Object.keys(m.roads || {}).forEach((p) => { const [x, y] = p.split(',').map(Number); if (m.rows[y].charAt(x) !== 'x') problems.push(id + ': road badge on a tile that is not a barrier ' + p); });
      m.warps.forEach((w) => {
        if (!owWalkable(m, w.x, w.y)) problems.push(id + ': warp tile ' + w.x + ',' + w.y + ' is not walkable');
        const to = OW_MAPS[w.to];
        if (!to) { problems.push(id + ': warp to unknown map ' + w.to); return; }
        if (!owWalkable(to, w.tx, w.ty)) problems.push(id + ': warp lands on a wall in ' + w.to);
        else if (owWarpAt(to, w.tx, w.ty)) problems.push(id + ': warp lands on another warp in ' + w.to);
        if (!to.warps.some((b) => b.to === id)) problems.push(w.to + ' has no way back to ' + id);
      });
      Object.keys(m.signs || {}).forEach((k) => { const [x, y] = k.split(',').map(Number); if (m.rows[y].charAt(x) !== 's') problems.push(id + ': sign text on a tile that is not a sign ' + k); });
    });
    return problems;
  });
  assert.deepEqual(bad, []);
  const pictures = await page.evaluate(() => { mountWorldArt(); return Object.keys(OW_TILES).filter((c) => !document.getElementById('w-' + OW_TILES[c].t)); });
  assert.deepEqual(pictures, [], 'every tile needs its picture in art/world');
});

test('the Map window has an Adventure row that opens the walk, and the hero stands in the middle of the view', async () => {
  const r = await page.evaluate(() => {
    openMap();
    const row = document.querySelector('#map-body .adventure-row');
    const text = row && row.innerText;
    row.querySelector('button').click();
    const view = document.getElementById('ow-view');
    return { text, mapShut: document.getElementById('map-modal').style.display, ow: document.getElementById('overworld-modal').style.display,
      cells: view.querySelectorAll('.ow-cell').length, n: owCols(), hero: view.querySelectorAll('.ow-hero').length, title: document.getElementById('ow-title').innerText };
  });
  assert.match(r.text, /Adventure/);
  assert.equal(r.mapShut, 'none');
  assert.equal(r.ow, 'flex');
  assert.equal(r.cells, r.n * r.n);
  assert.equal(r.hero, 1);
  assert.equal(r.title, 'Cozy Hollow');
  assert.deepEqual(errors, []);
});

test('walls, trees and signs stop the hero; a sign tells its words; a step on open ground moves one tile', async () => {
  await open();
  let o = await walk(['up']);
  assert.deepEqual([o.x, o.y, o.face], [7, 8, 'up']);
  o = await walk(['left', 'left', 'left', 'left', 'left', 'left', 'left', 'left']);                   // the left edge is trees: it stops at x=1
  assert.equal(o.x, 1);
  assert.equal(o.face, 'left');
  const text = await page.evaluate(() => { state.overworld.x = 4; state.overworld.y = 9; owMove('down'); return { open: document.getElementById('talk-modal').style.display, words: document.getElementById('talk-text').innerText }; });
  assert.equal(text.open, 'flex', 'a sign opens the text window');
  assert.match(text.words, /Cozy Hollow/);
  await page.evaluate(() => closeTalk());
  assert.equal(await page.evaluate(() => state.overworld.y), 9, 'the sign is solid');
});

test('walking onto a warp tile moves between maps and back, and the map title follows', async () => {
  await open();
  let o = await walk(['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up']);
  assert.deepEqual([o.map, o.x, o.y], ['route1', 6, 22]);
  assert.equal(await page.evaluate(() => document.getElementById('ow-title').innerText), 'Route 1');
  o = await walk(['down']);
  assert.deepEqual([o.map, o.x, o.y], ['hollow', 7, 1]);
});

test('the safe steps after opening the map, then a grass step can start a fight that is the normal math battle', async () => {
  await open();
  const r = await page.evaluate(() => {
    ECON.overworld.graceSteps = 2; ECON.overworld.grassChance = 1;
    closeOverworld(); openAdventure();
    state.overworld.map = 'route1'; state.overworld.x = 3; state.overworld.y = 5; state.overworld.face = 'up';
    const log = [];
    owMove('up'); log.push(!!ab);                                                       // (3,4) tall grass, safe step 1
    owMove('up'); log.push(!!ab);                                                       // (3,3) tall grass, safe step 2
    owMove('down'); log.push(!!ab);                                                     // (3,4) tall grass: now the fight begins
    return { log, foe: ab.foes[0].id, shut: document.getElementById('overworld-modal').style.display, screen: document.getElementById('ab-modal').style.display };
  });
  assert.deepEqual(r.log, [false, false, true]);
  assert.ok(r.foe, 'a wild buddy is the foe');
  assert.equal(r.shut, 'none');
  assert.equal(r.screen, 'flex', 'the battle has its own screen');
});

test('open ground never starts a fight, even with a certain chance', async () => {
  await open();
  const r = await page.evaluate(() => {
    ECON.overworld.grassChance = 1; owSafe = 0;
    for (let i = 0; i < 4; i++) owMove(i % 2 ? 'down' : 'up');                                           // the path in Cozy Hollow
    return state.overworld.fight;
  });
  assert.equal(r, false);
});

test('winning a walk fight brings the map back at the same tile, and it does not count toward the next boss', async () => {
  await open();
  const r = await page.evaluate(async () => {
    ECON.overworld.grassChance = 1; owSafe = 0;
    state.overworld.map = 'route1'; state.overworld.x = 3; state.overworld.y = 5; state.overworld.face = 'up';
    const since = state.wild.since;
    owMove('up');
    const fought = !!ab;
    const at = { x: state.overworld.x, y: state.overworld.y, map: state.overworld.map };
    await new Promise((res) => setTimeout(res, 1500));
    abFoe().hp = 1; abFight(); abAnswer(ab.q.ans); abUseMove(0);
    for (let i = 0; i < 150 && ab; i++) await new Promise((res) => setTimeout(res, 100));
    return { fought, at, since, after: state.wild.since, over: !ab, ow: document.getElementById('overworld-modal').style.display, now: { x: state.overworld.x, y: state.overworld.y, map: state.overworld.map } };
  });
  assert.equal(r.fought, true);
  assert.equal(r.over, true);
  assert.equal(r.after, r.since, 'a walk fight is not counted toward the next boss');
  assert.equal(r.ow, 'flex', 'the map is back');
  assert.deepEqual(r.now, r.at);
});

test('a caught buddy joins you and the map comes back', async () => {
  await open();
  const r = await page.evaluate(async () => {
    ECON.overworld.grassChance = 1; owSafe = 0;
    state.overworld.map = 'route1'; state.overworld.x = 3; state.overworld.y = 5;
    owMove('up');
    const id = ab.foes[0].id;
    state.unlockedPets = ['dog']; state.unlockedSecrets = []; state.nets = 1;
    await new Promise((res) => setTimeout(res, 1500));
    Math.random = () => 0;
    abThrowNet();
    for (let i = 0; i < 150 && ab; i++) await new Promise((res) => setTimeout(res, 100));
    return { id, owned: getOwnedIds().indexOf(id) !== -1, over: !ab, ow: document.getElementById('overworld-modal').style.display };
  });
  assert.deepEqual([r.owned, r.over, r.ow], [true, true, 'flex']);
});

test('RUN leaves a walk fight with no penalty and the map comes back', async () => {
  await open();
  const r = await page.evaluate(async () => {
    ECON.overworld.grassChance = 1; owSafe = 0;
    state.overworld.map = 'route1'; state.overworld.x = 3; state.overworld.y = 5;
    owMove('up');
    const started = !!ab, gems = state.gems, level = getBuddyLevel(state.activePet);
    await new Promise((res) => setTimeout(res, 1500));
    abRun();
    for (let i = 0; i < 150 && ab; i++) await new Promise((res) => setTimeout(res, 100));
    return { started, over: !ab, ow: document.getElementById('overworld-modal').style.display, gems: state.gems === gems, level: getBuddyLevel(state.activePet) === level };
  });
  assert.deepEqual(r, { started: true, over: true, ow: 'flex', gems: true, level: true });
});

test('the map refuses to open during a gym or a raid, and a stale walk flag is cleared when the foe changes', async () => {
  const r = await page.evaluate(() => {
    state.gym = { region: 'ember', step: 0 };
    openAdventure();
    const gymShut = document.getElementById('overworld-modal').style.display;
    state.gym = null; state.raid = { phase: 0, total: 3, weaks: [], chapter: 0, introSeen: true };
    openAdventure();
    const raidShut = document.getElementById('overworld-modal').style.display;
    state.raid = null;
    state.overworld.fight = true; state.wild.id = '';                                                    // a boss replaced the foe
    return { gymShut, raidShut, flag: adventureFight() };
  });
  assert.notEqual(r.gymShut, 'flex');
  assert.notEqual(r.raidShut, 'flex');
  assert.equal(r.flag, false);
});

test('the position is saved, restored on reload, and a bad or old save puts the hero back at the start', async () => {
  await open();
  await walk(['up', 'up', 'up']);
  await page.evaluate(() => closeOverworld());
  await page.reload();
  assert.deepEqual(await page.evaluate(() => ({ ...state.overworld })), { map: 'hollow', x: 7, y: 6, face: 'up', fight: false, found: [], signs: { day: '', ids: [] }, center: { map: 'hollow', x: 7, y: 9 }, beat: [], foe: '', shaken: { day: '', ids: [] }, story: [], seen: ['hollow'], traded: [] });
  const fixed = await page.evaluate(() => {
    const bad = [{ map: 'nowhere', x: 3, y: 3, face: 'sideways', fight: 'yes' }, { map: 'hollow', x: 0, y: 0, face: 'left', fight: true }, { map: 'route1', x: 1.5, y: 'a' }, null, 'x'];
    return bad.map((b) => { state.overworld = b; NORMALIZERS.forEach((fn) => { if (fn.name === 'overworld') fn(state); }); return { ...state.overworld }; });
  });
  assert.deepEqual(fixed[0], { map: 'hollow', x: 7, y: 9, face: 'down', fight: false, found: [], signs: { day: '', ids: [] }, center: { map: 'hollow', x: 7, y: 9 }, beat: [], foe: '', shaken: { day: '', ids: [] }, story: [], seen: [], traded: [] });
  assert.deepEqual(fixed[1], { map: 'hollow', x: 7, y: 9, face: 'left', fight: true, found: [], signs: { day: '', ids: [] }, center: { map: 'hollow', x: 7, y: 9 }, beat: [], foe: '', shaken: { day: '', ids: [] }, story: [], seen: [], traded: [] }, 'a tree tile is not a place to stand');
  assert.deepEqual(fixed[2], { map: 'route1', x: 6, y: 22, face: 'down', fight: false, found: [], signs: { day: '', ids: [] }, center: { map: 'hollow', x: 7, y: 9 }, beat: [], foe: '', shaken: { day: '', ids: [] }, story: [], seen: [], traded: [] });
  assert.deepEqual(fixed[3], { map: 'hollow', x: 7, y: 9, face: 'down', fight: false, found: [], signs: { day: '', ids: [] }, center: { map: 'hollow', x: 7, y: 9 }, beat: [], foe: '', shaken: { day: '', ids: [] }, story: [], seen: [], traded: [] });
  assert.deepEqual(fixed[4], { map: 'hollow', x: 7, y: 9, face: 'down', fight: false, found: [], signs: { day: '', ids: [] }, center: { map: 'hollow', x: 7, y: 9 }, beat: [], foe: '', shaken: { day: '', ids: [] }, story: [], seen: [], traded: [] });
});

test('arrow keys and WASD walk while the map is open, and do not steal keys otherwise', async () => {
  const idle = await page.evaluate(() => { const before = { ...state.overworld }; window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); return { ...state.overworld }.y === before.y; });
  assert.ok(idle, 'the map is closed: the arrow does nothing');
  await open();
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(120);
  await page.keyboard.press('w');
  await page.waitForTimeout(120);
  await page.keyboard.press('a');
  assert.deepEqual(await page.evaluate(() => [state.overworld.x, state.overworld.y, state.overworld.face]), [6, 7, 'left']);
});

test('the D-pad buttons walk (a press steps once, a keyboard click steps once) and have labels', async () => {
  await open();
  const labels = await page.evaluate(() => Array.from(document.querySelectorAll('.ow-key:not(.ow-side)')).map((b) => b.getAttribute('aria-label')));
  assert.deepEqual(labels, ['Walk up', 'Walk left', 'Walk down', 'Walk right']);
  const up = page.locator('.ow-key.up');
  await up.dispatchEvent('pointerdown');
  await up.dispatchEvent('pointerup');
  await up.dispatchEvent('click');                                                                          // the click that follows a press is ignored, so this is the same step...
  assert.equal(await page.evaluate(() => state.overworld.y), 8);
  await up.dispatchEvent('click');                                                                          // ...and this one, with no press before it, is a keyboard step
  assert.equal(await page.evaluate(() => state.overworld.y), 7);
});

test('Escape closes the map and saves; the Adventure keeps working after the battle screen returns', async () => {
  await open();
  await walk(['up']);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.getElementById('overworld-modal').style.display), 'none');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('math_quest_save')).overworld.y), 8);
  assert.deepEqual(errors, []);
});

for (const [w, h] of [[320, 568], [360, 640], [420, 800]]) {
  test('the map, hero and D-pad fit on a ' + w + 'x' + h + ' phone with no sideways scroll', async () => {
    await page.setViewportSize({ width: w, height: h });
    await open();
    const r = await page.evaluate(() => {
      const box = (sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height }; };
      const keys = Array.from(document.querySelectorAll('.ow-key')).map((k) => k.getBoundingClientRect());
      return { view: box('#ow-view'), pad: box('.ow-pad'), keys: keys.map((k) => [k.width, k.height]), scroll: document.documentElement.scrollWidth, vw: innerWidth, vh: innerHeight, hero: box('.ow-hero') };
    });
    assert.ok(r.view.l >= 0 && r.view.r <= r.vw, 'the view is inside the screen');
    assert.ok(r.pad.b <= r.vh + 1, 'the D-pad is on screen without scrolling: ' + r.pad.b + ' of ' + r.vh);
    assert.ok(r.keys.every(([kw, kh]) => kw >= 44 && kh >= 44), 'tap targets are at least 44px');
    assert.ok(r.scroll <= r.vw);
    assert.ok(r.hero.w > 20, 'the hero is visible');
    await page.setViewportSize({ width: 1280, height: 720 });
  });
}

test('the battle screen fits 320x568 with every menu button reachable', async () => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => { ECON.overworld.graceSteps = 0; ECON.overworld.grassChance = 1; openAdventure(); state.overworld.map = 'route1'; state.overworld.x = 3; state.overworld.y = 5; owMove('up'); });
  await page.waitForFunction(() => ab && ab.phase === 'menu', null, { timeout: 15000 });
  const r = await page.evaluate(() => {
    const bs = [...document.querySelectorAll('#ab-panel button')].map((b) => b.getBoundingClientRect());
    return { n: bs.length, inside: bs.every((b) => b.width >= 44 && b.height >= 44 && b.right <= innerWidth && b.bottom <= innerHeight), scroll: document.documentElement.scrollWidth <= innerWidth };
  });
  assert.deepEqual(r, { n: 4, inside: true, scroll: true });
  await page.setViewportSize({ width: 1280, height: 720 });
});
