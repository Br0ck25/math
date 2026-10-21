// The game starts on the Adventure: Who are you?, a starter buddy, then the map; later visits open on the map.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

let browser, worker, env;
before(async () => { browser = await launch(); worker = await loadWorker(); env = { MATH_KV: fakeKV() }; });
after(async () => { await browser.close(); });
const shown = (page, id) => page.evaluate((i) => document.getElementById(i).style.display === 'flex', id);

test('a new player lands on Who are you?, then picks a starter, then stands in Cozy Hollow', async () => {
  const { page, errors } = await openGame(browser, worker, { MATH_KV: fakeKV() }, { wildStart: true, adventureBoot: true, fast: true });
  await page.waitForFunction(() => document.getElementById('hero-modal').style.display === 'flex');
  assert.equal(await page.evaluate(() => document.getElementById('hero-title').innerText), 'Who are you?');
  await page.evaluate(() => finishHero());
  await page.waitForFunction(() => document.getElementById('overworld-modal').style.display === 'flex');
  assert.equal(await shown(page, 'starter-modal'), true, 'Prof. Pi offers the first buddy');
  await page.evaluate(() => chooseStarter('fox'));
  assert.equal(await page.evaluate(() => state.activePet), 'fox');
  assert.doesNotMatch(await page.evaluate(() => document.getElementById('toast').innerText), /<img|data:image/, 'the welcome note shows words, never picture markup');
  assert.deepEqual(await page.evaluate(() => [state.overworld.map, document.getElementById('ow-title').innerText]), ['hollow', 'Cozy Hollow']);
  assert.deepEqual(errors, []);
});

test('a returning player opens straight on the map, with no welcome window in the way, and the old Practice screen is hidden', async () => {
  const { page, errors } = await openGame(browser, worker, { MATH_KV: fakeKV() }, { wildStart: true, adventureBoot: true, fast: true });
  await page.waitForFunction(() => document.getElementById('hero-modal').style.display === 'flex');
  await page.evaluate(() => finishHero());
  await page.evaluate(() => { state.storySeen.starter = 1; saveState(); });
  await page.reload();
  await page.waitForFunction(() => document.getElementById('overworld-modal').style.display === 'flex');
  assert.equal(await shown(page, 'hero-modal'), false);
  assert.equal(await page.evaluate(() => document.querySelector('.game-container')), null, 'the old Practice screen is gone');
  assert.deepEqual(errors, []);
});

test('the Menu opens the other screens above the map, and closing them brings the map back', async () => {
  const { page, errors } = await openGame(browser, worker, { MATH_KV: fakeKV() }, { wildStart: true, adventureBoot: true, fast: true });
  await page.waitForFunction(() => document.getElementById('hero-modal').style.display === 'flex');
  await page.evaluate(() => { finishHero(); state.storySeen.starter = 1; closeStarterModal(); });
  await page.click('.ow-head .ow-back-chip');
  assert.equal(await shown(page, 'menu-modal'), true);
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#menu-body button')].map((b) => b.innerText)), ['Buddies', 'Bag', 'Team', 'Dex', 'Trainer', 'Save', 'Settings']);
  for (const [fn, id] of [['openHub', 'hub-modal'], ['openBook', 'book-modal'], ['openSettings', 'settings-modal']]) {
    await page.evaluate((f) => menuGo(f), fn);
    const top = await page.evaluate(() => { const o = openOverlays(); return o[o.length - 1].id; });
    assert.equal(top, id);
    await page.evaluate((i) => { const el = document.getElementById(i); window[el.dataset.close](); }, id);
  }
  assert.equal(await shown(page, 'overworld-modal'), true);
  assert.deepEqual(errors, []);
});
