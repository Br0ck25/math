// Adventure towns: people, doors and rooms, math signs, pickups, and Meadow Town (the data rules, and how they play).
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
const put = (map, x, y, face = 'down') => page.evaluate(([m, px, py, f]) => {
  state.overworld.map = m; state.overworld.x = px; state.overworld.y = py; state.overworld.face = f; state.overworld.found = []; state.overworld.signs = { day: '', ids: [] };
  if (document.getElementById('overworld-modal').style.display !== 'flex') openAdventure();
  renderOverworld();
}, [map, x, y, face]);
const shown = (id) => page.evaluate((i) => document.getElementById(i).style.display === 'flex', id);
const state_ = () => page.evaluate(() => JSON.parse(JSON.stringify(state.overworld)));

test('the town data is sound: unique ids, people and pickups on free walkable tiles, doors that lead in and back, and everything reachable', async () => {
  const problems = await page.evaluate(() => {
    const out = [], seen = {};
    state.badges = gymRegions().map((x) => x.id);                                                       // every charm: the gates are open, so everything can be reached
    owNpcActive = () => true;                                                                           // and every person is there (some only appear after a badge or the Champion)
    const unique = (id, what) => { if (seen[id]) out.push('duplicate id ' + id + ' (' + what + ')'); seen[id] = 1; };
    const arrivals = {};                                                                                // map id -> tiles where the hero can appear
    Object.keys(OW_MAPS).forEach((k) => { arrivals[k] = [OW_MAPS[k].start]; });
    Object.keys(OW_MAPS).forEach((k) => OW_MAPS[k].warps.forEach((w) => arrivals[w.to].push({ x: w.tx, y: w.ty })));
    Object.keys(OW_MAPS).forEach((k) => {
      const m = OW_MAPS[k], free = (x, y) => owWalkable(m, x, y) && !owWarpAt(m, x, y) && !owNpcAt(m, x, y);
      (m.npcs || []).forEach((n) => {
        unique(n.id, 'npc');
        if (!owWalkable(m, n.x, n.y)) out.push(k + ': ' + n.id + ' is not on walkable ground');
        if (owWarpAt(m, n.x, n.y)) out.push(k + ': ' + n.id + ' stands on a warp');
        if (arrivals[k].some((a) => a.x === n.x && a.y === n.y)) out.push(k + ': ' + n.id + ' stands where the hero arrives');
        if (OW_FACES.indexOf(n.face) === -1) out.push(n.id + ': bad face');
        if (!n.name || !Array.isArray(n.lines) || !n.lines.length || n.lines.some((l) => typeof l !== 'string' || !l.trim() || l.length > 160)) out.push(n.id + ': needs a name and short lines');
        const l = n.look || {};
        if (!(l.skin in HERO_SKINS && l.hair in HERO_HAIRS && l.outfit in HERO_OUTFITS && l.style in HERO_STYLES)) out.push(n.id + ': bad look');
        if (n.kind === 'gift' && (!KEY_ITEMS.some((k) => k.id === n.gift) || !Array.isArray(n.after) || !n.after.length)) out.push(n.id + ': a gift needs a real key item and words for after');
        if (n.kind === 'trainer') {
          if (!Array.isArray(n.win) || !n.win.length || n.win.some((w) => typeof w !== 'string' || !w.trim() || w.length > 160)) out.push(n.id + ': a trainer needs words for after the battle');
          const d = OW_STEP[n.face];                                                                  // what the trainer can see must not reach a place the hero appears
          for (let i = 1; i <= (n.sight || ECON.overworld.trainerSight); i++) {
            const cx = n.x + d[0] * i, cy = n.y + d[1] * i;
            if (!owWalkable(m, cx, cy) || owNpcAt(m, cx, cy)) break;
            if (arrivals[k].some((a) => a.x === cx && a.y === cy)) out.push(n.id + ': sees an arrival tile ' + cx + ',' + cy);
          }
        }
      });
      (m.objects || []).forEach((o) => {
        unique(o.id, 'pickup');
        if (!free(o.x, o.y)) out.push(k + ': pickup ' + o.id + ' is not on a free tile');
        if (['gems', 'net', 'berry', 'ore'].indexOf(o.give) === -1) out.push(o.id + ': unknown gift ' + o.give);
        if (arrivals[k].some((a) => a.x === o.x && a.y === o.y)) out.push(o.id + ': on an arrival tile');
      });
      Object.keys(m.trees || {}).forEach((p) => { const [x, y] = p.split(',').map(Number); unique(m.trees[p], 'tree'); if (m.rows[y].charAt(x) !== 'Y') out.push(k + ': tree ' + m.trees[p] + ' is not on a shake-tree tile'); });
      m.rows.forEach((row, y) => row.split('').forEach((c, x) => { if (c === 'Y' && !(m.trees || {})[x + ',' + y]) out.push(k + ': tree tile ' + x + ',' + y + ' has no tree id'); }));
      Object.keys(m.signs || {}).forEach((p) => { const s = m.signs[p]; if (typeof s !== 'string') { unique(s.id, 'sign'); if (!s.text) out.push(s.id + ': no text'); } });
      m.rows.forEach((row, y) => row.split('').forEach((c, x) => {
        if (c !== 'D') return;
        const w = owWarpAt(m, x, y);
        if (!w) { out.push(k + ': door at ' + x + ',' + y + ' leads nowhere'); return; }
        const back = OW_MAPS[w.to].warps.find((b) => b.to === k);
        if (!back || back.tx !== x || back.ty !== y + 1) out.push(k + ': the way out of ' + w.to + ' must land south of the door ' + x + ',' + y);
      }));
      // everything can be reached: a free tile next to each person, pickup and sign is reachable from some arrival tile
      const seenTiles = new Set(), queue = arrivals[k].filter((a) => owWalkable(m, a.x, a.y)).map((a) => [a.x, a.y]);
      queue.forEach((q) => seenTiles.add(q.join()));
      while (queue.length) {
        const [cx, cy] = queue.shift();
        if (owWarpAt(m, cx, cy) && !arrivals[k].some((a) => a.x === cx && a.y === cy)) continue;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = cx + dx, ny = cy + dy; if (owWalkable(m, nx, ny) && !owNpcAt(m, nx, ny) && !seenTiles.has(nx + ',' + ny)) { seenTiles.add(nx + ',' + ny); queue.push([nx, ny]); } });
      }
      const reachable = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seenTiles.has((x + dx) + ',' + (y + dy)));
      (m.npcs || []).forEach((n) => { if (!reachable(n.x, n.y)) out.push(k + ': nobody can reach ' + n.id); });
      (m.objects || []).forEach((o) => { if (!seenTiles.has(o.x + ',' + o.y)) out.push(k + ': nobody can reach ' + o.id); });
      Object.keys(m.signs || {}).forEach((p) => { const [x, y] = p.split(',').map(Number); if (!reachable(x, y)) out.push(k + ': nobody can reach the sign ' + p); });
      Object.keys(m.trees || {}).forEach((p) => { const [x, y] = p.split(',').map(Number); if (!reachable(x, y)) out.push(k + ': nobody can reach the tree ' + p); });
    });
    const maps = Object.keys(OW_MAPS), reach = new Set([OW_START.map]);
    for (let i = 0; i < maps.length; i++) maps.forEach((k) => { if (reach.has(k)) OW_MAPS[k].warps.forEach((w) => reach.add(w.to)); });
    maps.forEach((k) => { if (!reach.has(k)) out.push(k + ' cannot be reached from the start'); });
    return out;
  });
  assert.deepEqual(problems, []);
});

test('a person is solid: bumping turns them to face you, opens the text window, and the hero stays put', async () => {
  await put('hollow-home', 5, 2, 'down');
  await page.evaluate(() => owMove('left'));
  assert.equal(await shown('talk-modal'), true);
  assert.equal(await page.evaluate(() => document.getElementById('talk-name').innerText), 'Mum');
  assert.match(await page.evaluate(() => document.getElementById('talk-text').innerText), /Good morning/);
  assert.equal(await page.evaluate(() => document.querySelectorAll('#talk-art use').length), 2, 'the portrait is the hero art: a body and hair');
  assert.deepEqual([(await state_()).x, (await state_()).y, (await state_()).face], [5, 2, 'left']);
  assert.equal(await page.evaluate(() => OW_MAPS['hollow-home'].npcs[0].face), 'right', 'Mum turned towards the hero');
  assert.equal(await page.evaluate(() => document.querySelector('#talk-modal .modal-x') !== null), true, 'it has the close button every window has');
});

test('the text window goes line by line, closes at the end, and Escape closes it at once; the map is still there', async () => {
  await put('hollow-home', 5, 2, 'down');
  await page.evaluate(() => owMove('left'));
  assert.equal(await page.evaluate(() => document.getElementById('talk-next').innerText), 'Next');
  await page.click('#talk-next');
  assert.match(await page.evaluate(() => document.getElementById('talk-text').innerText), /tall grass/);
  await page.click('#talk-text');                                                                         // tapping the words also goes on
  assert.equal(await page.evaluate(() => document.getElementById('talk-next').innerText), 'Close');
  await page.click('#talk-next');
  assert.equal(await shown('talk-modal'), false);
  assert.equal(await shown('overworld-modal'), true);
  await page.evaluate(() => owMove('left'));
  await page.keyboard.press('Escape');
  assert.equal(await shown('talk-modal'), false);
  assert.equal(await shown('overworld-modal'), true);
  assert.deepEqual(errors, []);
});

test('Space and Enter talk to what the hero faces, without skipping the first line, and go on in the window', async () => {
  await put('hollow-home', 5, 2, 'left');
  await page.keyboard.press('Enter');
  assert.equal(await shown('talk-modal'), true);
  assert.match(await page.evaluate(() => document.getElementById('talk-text').innerText), /Good morning/, 'the same key press must not also advance the text');
  await page.keyboard.press(' ');
  assert.match(await page.evaluate(() => document.getElementById('talk-text').innerText), /tall grass/);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  assert.equal(await shown('talk-modal'), false);
  await put('hollow-home', 5, 4, 'up');
  await page.keyboard.press('Enter');
  assert.equal(await shown('talk-modal'), false, 'nothing to talk to');
});

test('words in the text window are shown as text, never as markup', async () => {
  await put('hollow-home', 5, 2, 'down');
  await page.evaluate(() => { OW_MAPS['hollow-home'].npcs[0].lines = ['<img src=x onerror="window.pwned=1"> hi']; OW_MAPS['hollow-home'].npcs[0].name = '<b>Mum</b>'; owMove('left'); });
  const r = await page.evaluate(() => ({ imgs: document.querySelectorAll('#talk-modal img').length, text: document.getElementById('talk-text').innerText, name: document.getElementById('talk-name').innerText, pwned: window.pwned || 0 }));
  assert.deepEqual(r, { imgs: 0, text: '<img src=x onerror="window.pwned=1"> hi', name: '<b>Mum</b>', pwned: 0 });
});

test('a door leads into a room and the mat leads out, to the tile south of the door; rooms have no tall grass', async () => {
  await put('hollow', 4, 5, 'up');
  await page.evaluate(() => owMove('up'));
  let o = await state_();
  assert.deepEqual([o.map, o.x, o.y], ['hollow-home', 3, 5]);
  assert.equal(await page.evaluate(() => document.getElementById('ow-title').innerText), 'Home');
  assert.equal(await page.evaluate(() => { ECON.overworld.grassChance = 1; owSafe = 0; owMove('up'); owMove('down'); owMove('down'); return !!ab; }), false);
  o = await state_();
  assert.deepEqual([o.map, o.x, o.y], ['hollow', 4, 5]);
  await put('hollow', 11, 9, 'up');
  await page.evaluate(() => owMove('up'));
  assert.equal((await state_()).map, 'hollow-house');
});

test('Route 1 leads to Meadow Town, which is painted in its own colours, and back', async () => {
  await put('route1', 6, 1, 'up');
  await page.evaluate(() => owMove('up'));
  const o = await state_();
  assert.deepEqual([o.map, o.x, o.y], ['meadow', 7, 14]);
  assert.equal(await page.evaluate(() => document.getElementById('ow-title').innerText), 'Meadow Town');
  assert.equal(await page.evaluate(() => document.getElementById('ow-view').style.getPropertyValue('--w-roof')), '#4F8FE0');
  await page.evaluate(() => { owMove('down'); });
  assert.equal((await state_()).map, 'route1');
  assert.equal(await page.evaluate(() => document.getElementById('ow-view').style.getPropertyValue('--w-roof')), '', 'Route 1 keeps the default colours');
});

test('a math sign is practice: wrong answers are free, a right one pays nothing, and the question follows the types the child may be asked', async () => {
  await put('meadow', 12, 13, 'up');
  await page.evaluate(() => { state.gems = 10; state.enabledOps = ['mul']; owMove('up'); });
  assert.equal(await shown('talk-modal'), true);
  assert.equal(await page.evaluate(() => document.getElementById('talk-name').innerText), 'Math sign');
  assert.equal(await page.evaluate(() => document.querySelectorAll('#talk-opts button').length), 3);
  assert.equal(await page.evaluate(() => talk.quiz.q.op), 'mul');
  const wrong = await page.evaluate(() => { const bad = talk.quiz.q.opts.find((v) => v !== talk.quiz.q.ans); const i = talk.quiz.q.opts.indexOf(bad); document.querySelectorAll('#talk-opts button')[i].click(); return { gems: state.gems, note: document.getElementById('talk-note').innerText }; });
  assert.deepEqual(wrong, { gems: 10, note: 'Not quite. Try another one!' });
  const right = await page.evaluate(() => { const i = talk.quiz.q.opts.indexOf(talk.quiz.q.ans); document.querySelectorAll('#talk-opts button')[i].click(); return { gems: state.gems, note: document.getElementById('talk-note').innerText, disabled: Array.from(document.querySelectorAll('#talk-opts button')).every((b) => b.disabled) }; });
  assert.deepEqual(right, { gems: 10, note: 'Correct! Well done.', disabled: true });
});

test('pickups: walking onto a sparkle takes it once, it is saved, and a full net bag gives a Potion instead', async () => {
  await put('hollow-home', 6, 3, 'down');
  const r = await page.evaluate(() => {
    state.potions = 0; const gems0 = state.potions;
    owMove('down');                                                                                       // (6,4): a gem sparkle
    const after = { gems: state.potions, found: state.overworld.found.slice(), sparkles: document.querySelectorAll('.ow-pickup').length };
    owMove('up'); owMove('down');
    return { gems0, after, again: state.potions };
  });
  assert.equal(r.after.gems, 1, 'a Potion, as a find on the ground is in Gold');
  assert.deepEqual(r.after.found, ['hollow-home-gem']);
  assert.equal(r.after.sparkles, 0, 'the sparkle is gone');
  assert.equal(r.again, r.after.gems, 'taken once');
  await page.evaluate(() => hideModal('overworld-modal'));
  await page.reload();
  assert.deepEqual(await page.evaluate(() => state.overworld.found), ['hollow-home-gem'], 'saved by id');
  const net = await page.evaluate(() => {
    state.hero.made = true; state.overworld.found = []; state.potions = 0; state.nets = maxNets();
    state.overworld.map = 'meadow-house'; state.overworld.x = 2; state.overworld.y = 4; state.overworld.face = 'left'; openAdventure(); owMove('left');
    return { nets: state.nets, gems: state.potions, toast: document.getElementById('toast').innerText };
  });
  assert.equal(net.nets, await page.evaluate(() => maxNets()));
  assert.equal(net.gems, 1);
  assert.match(net.toast, /Potion/);
  const open = await page.evaluate(() => { state.overworld.found = []; state.nets = 0; state.overworld.x = 2; state.overworld.y = 4; state.overworld.face = 'left'; renderOverworld(); owMove('left'); return { nets: state.nets, found: state.overworld.found.slice() }; });
  assert.deepEqual(open, { nets: 1, found: ['meadow-house-net'] }, 'with room in the bag it is a Catch Net');
});

test('a saved found list is repaired: unknown or repeated ids are dropped', async () => {
  const r = await page.evaluate(() => {
    const o = (v) => { state.overworld = v; NORMALIZERS.forEach((fn) => { if (fn.name === 'overworld') fn(state); }); return JSON.parse(JSON.stringify(state.overworld)); };
    return [
      o({ map: 'hollow', x: 7, y: 9, face: 'down', fight: false, found: ['hollow-home-gem', 'hollow-home-gem', 'nope', 5, null, 'meadow-ore'] }),
      o({ map: 'hollow', x: 7, y: 9, found: 'all' }),
      o({ map: 'hollow-home', x: 4, y: 2 })                                                                // Mum's tile: not a place to stand
    ];
  });
  assert.deepEqual(r[0].found, ['hollow-home-gem', 'meadow-ore']);
  assert.deepEqual(r[1].found, []);
  assert.deepEqual([r[2].x, r[2].y], [3, 5]);
});

test('Guide Ivy greets the hero in Meadow Town', async () => {
  await put('meadow', 7, 11, 'left');
  await page.evaluate(() => owMove('left'));
  assert.equal(await page.evaluate(() => document.getElementById('talk-name').innerText), 'Guide Ivy');
});

for (const [w, h] of [[320, 568], [360, 640], [420, 800]]) {
  test('the text window and a math sign fit a ' + w + 'x' + h + ' phone, with tap targets of 44px', async () => {
    await page.setViewportSize({ width: w, height: h });
    await put('meadow', 12, 13, 'up');
    const r = await page.evaluate(() => {
      owMove('up');
      const c = document.querySelector('#talk-modal .modal-content').getBoundingClientRect();
      const btns = Array.from(document.querySelectorAll('#talk-opts button, #talk-next')).map((b) => { const q = b.getBoundingClientRect(); return [q.width, q.height, q.bottom <= innerHeight]; });
      return { inside: c.left >= 0 && c.right <= innerWidth && c.bottom <= innerHeight, scroll: document.documentElement.scrollWidth <= innerWidth, btns };
    });
    assert.ok(r.inside, 'the window stays on the screen');
    assert.ok(r.scroll);
    assert.ok(r.btns.length === 4 && r.btns.every(([bw, bh, on]) => bw >= 44 && bh >= 44 && on), JSON.stringify(r.btns));
    await page.setViewportSize({ width: 1280, height: 720 });
  });
}
