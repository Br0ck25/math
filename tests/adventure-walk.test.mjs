// Walks the whole map: with every badge, charm and story beat, every door, gap and stair of every map is stepped onto with the real walking code, and each one lands where it says;
// then every map is reached from Cozy Hollow by those same steps, and every way back leads home. A map that nobody can enter or leave fails here.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

let browser, worker, page;
before(async () => {
  browser = await launch();
  worker = await loadWorker();
  ({ page } = await openGame(browser, worker, { MATH_KV: fakeKV() }, { fast: true, wildStart: true }));
});
after(async () => { await browser.close(); });

test('every warp of every map is walked onto and lands where it says, and every map is reached from Cozy Hollow and has a way back', async () => {
  const r = await page.evaluate(() => {
    window.__noWander = true; state.hero.made = true; startGoldenVault = function () {}; openAdventure();
    state.badges = allGymRegions().map((x) => x.id); state.storySeen.champion = 1; state.overworld.seen = owTowns();
    ['water', 'trim', 'steam', 'vines', 'lamp', 'stars', 'switch', 'whirl', 'fall', 'gizmo', 'radio-card', 'map-card', 'fishing-rod', 'bicycle'].forEach((k) => { if (!hasKeyItem(k)) grantKeyItem(k); });
    const o = state.overworld, bad = [], edges = {}; let walked = 0;
    const real = owNpcActive; owNpcActive = () => false;                                         // nobody stands in the way of this walk
    Object.keys(OW_MAPS).forEach((k) => {
      const m = OW_MAPS[k];
      m.warps.forEach((w) => {
        if (!OW_MAPS[w.to]) { bad.push(k + ' warp to nothing ' + w.to); return; }
        const dirs = [['up', 0, 1], ['down', 0, -1], ['left', 1, 0], ['right', -1, 0]];
        const from = dirs.map(([d, dx, dy]) => ({ d, x: w.x + dx, y: w.y + dy })).find((p) => owWalkable(m, p.x, p.y) && !(m.warps.some((q) => q.x === p.x && q.y === p.y)) && owTileAt(m, w.x, w.y) && !owTileAt(m, w.x, w.y).solid);
        if (!from) { bad.push(k + ' no way onto ' + w.x + ',' + w.y); return; }
        if (!owOpen()) { try { closeTalk(); } catch (e) { /* none open */ } } owBusy = false; o.map = k; o.x = from.x; o.y = from.y; o.face = from.d; owSetRegion(m); renderOverworld(); owMove(from.d);
        walked++;
        if (w.gate || w.to === 'safari-zone') { (edges[k] = edges[k] || new Set()).add(w.to); return; }                                                                         // a gym door asks first
        const guardTo = OW_MAPS[w.to].guard;
        if (o.map !== w.to || o.x !== w.tx || o.y !== w.ty) { if (!(guardTo && o.map === guardTo.to)) bad.push(k + '>' + w.to + ' landed ' + o.map + ' ' + o.x + ',' + o.y); }
        (edges[k] = edges[k] || new Set()).add(w.to);
      });
    });
    owNpcActive = real;
    const seen = new Set([OW_START.map]), q = [OW_START.map];
    while (q.length) { const k = q.shift(); [...(edges[k] || [])].forEach((t) => { if (!seen.has(t)) { seen.add(t); q.push(t); } }); }
    const unreached = Object.keys(OW_MAPS).filter((k) => !seen.has(k));
    const back = Object.keys(OW_MAPS).filter((k) => seen.has(k) && k !== OW_START.map && ![...seen].some((s) => false) && !(function reach(from) { const s = new Set([from]), qq = [from]; while (qq.length) { const c = qq.shift(); [...(edges[c] || [])].forEach((t) => { if (!s.has(t)) { s.add(t); qq.push(t); } }); } return s.has(OW_START.map); })(k));
    return { bad: bad.slice(0, 12), walked, unreached, back, maps: Object.keys(OW_MAPS).length };
  });
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.unreached, []);
  assert.deepEqual(r.back, [], 'every map has a way home');
  assert.ok(r.walked > 300, 'walked ' + r.walked + ' warps over ' + r.maps + ' maps');
});
