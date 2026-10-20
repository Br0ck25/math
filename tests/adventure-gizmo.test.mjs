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
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; state.storySeen.map = 1; state.hero.made = true; });
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

test('the Gizmo shows the clock, quests, calls and tips, and a quest can be claimed from it', async () => {
  await page.evaluate(() => { grantKeyItem('gizmo'); });
  await put('hollow', 7, 9);
  await page.evaluate(() => openGizmo());
  for (const t of ['clock', 'quests', 'calls', 'tips']) {
    await page.evaluate((x) => gizmoSetTab(x), t);
    assert.ok((await page.evaluate(() => document.getElementById('gizmo-body').innerText)).length > 10, t);
  }
  await page.evaluate(() => { const q = ensureQuests().list[0]; q.progress = q.target; q.done = true; gizmoSetTab('quests'); });
  const gems = await page.evaluate(() => state.gems);
  await page.evaluate(() => gizmoClaim(0));
  assert.ok(await page.evaluate(() => state.gems) > gems);
  assert.equal(await page.evaluate(() => ensureQuests().list[0].claimed), true);
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
