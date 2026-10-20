// The Buddy Center and the Mart on the Adventure map.
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
const topOverlay = () => page.evaluate(() => { const o = openOverlays(); return o.length ? o[o.length - 1].id : ''; });
const toNurse = () => put('meadow-center', 3, 2, 'up');
const toClerk = () => put('meadow-mart', 3, 3, 'up');

test('the Buddy Center and the Mart are the doors at the top of Meadow Town, and the way out lands in front of them', async () => {
  await put('meadow', 4, 5, 'up');
  await page.evaluate(() => owMove('up'));
  assert.equal(await page.evaluate(() => state.overworld.map), 'meadow-center');
  await page.evaluate(() => { owMove('down'); });
  assert.deepEqual(await page.evaluate(() => [state.overworld.map, state.overworld.x, state.overworld.y]), ['meadow', 4, 5]);
  await put('meadow', 12, 5, 'up');
  await page.evaluate(() => owMove('up'));
  assert.equal(await page.evaluate(() => state.overworld.map), 'meadow-mart');
  assert.equal(await page.evaluate(() => document.getElementById('ow-title').innerText), 'Mart');
});

test('the Center: the first rest of a day is free and wakes every resting buddy', async () => {
  await toNurse();
  const r = await page.evaluate(() => {
    state.faintedPets = ['dog']; state.gems = 7; state.spring.day = '';
    owMove('up');
    return { name: document.getElementById('talk-name').innerText, line: document.getElementById('talk-text').innerText };
  });
  assert.equal(r.name, 'Nurse Joy');
  assert.match(r.line, /1 buddy is resting/);
  await page.click('#talk-next');
  assert.match(await page.evaluate(() => document.getElementById('talk-text').innerText), /first rest each day is free/);
  assert.deepEqual(await page.evaluate(() => Array.from(document.querySelectorAll('#talk-choices button')).map((b) => b.innerText)), ['Rest (free)']);
  assert.equal(await page.evaluate(() => document.getElementById('talk-next').innerText), 'Not now');
  await page.click('#talk-choices button');
  const after = await page.evaluate(() => ({ fainted: state.faintedPets.slice(), gems: state.gems, day: state.spring.day === dayKey(), text: document.getElementById('talk-text').innerText, choices: document.querySelectorAll('#talk-choices button').length, next: document.getElementById('talk-next').innerText }));
  assert.deepEqual(after, { fainted: [], gems: 7, day: true, text: 'All rested! Your buddies are ready to go.', choices: 0, next: 'Close' });
  assert.deepEqual(errors, []);
});

test('the Center: a second rest the same day costs the Spring price, and without the gems it only explains', async () => {
  await toNurse();
  const price = await page.evaluate(() => ECON.spring.gems);
  const paid = await page.evaluate(() => {
    state.faintedPets = ['dog']; state.gems = 50; state.spring.day = dayKey();
    owMove('up');
    document.getElementById('talk-next').click();
    const label = document.querySelector('#talk-choices button').innerText;
    document.querySelector('#talk-choices button').click();
    return { label, gems: state.gems, fainted: state.faintedPets.length };
  });
  assert.equal(paid.label, 'Rest (' + price + ' gems)');
  assert.equal(paid.gems, 50 - price);
  assert.equal(paid.fainted, 0);
  await page.evaluate(() => closeTalk());
  const poor = await page.evaluate(() => {
    state.faintedPets = ['dog']; state.gems = 1; state.spring.day = dayKey();
    owMove('up');
    document.getElementById('talk-next').click();
    return { text: document.getElementById('talk-text').innerText, choices: document.querySelectorAll('#talk-choices button').length, fainted: state.faintedPets.length, gems: state.gems };
  });
  assert.match(poor.text, /Come back when you have more/);
  assert.deepEqual([poor.choices, poor.fainted, poor.gems], [0, 1, 1]);
});

test('the Center: with nobody resting it says everyone is fine, and never takes gems', async () => {
  await toNurse();
  const r = await page.evaluate(() => {
    state.faintedPets = []; state.gems = 9; state.spring.day = dayKey();
    owMove('up');
    document.getElementById('talk-next').click();
    return { text: document.getElementById('talk-text').innerText, choices: document.querySelectorAll('#talk-choices button').length, gems: state.gems };
  });
  assert.match(r.text, /feeling great/);
  assert.deepEqual([r.choices, r.gems], [0, 9]);
});

test('visiting the nurse remembers the Center: the tile outside its door', async () => {
  await toNurse();
  assert.deepEqual(await page.evaluate(() => state.overworld.center), { map: 'hollow', x: 7, y: 9 }, 'the default is the start');
  await page.evaluate(() => owMove('up'));
  assert.deepEqual(await page.evaluate(() => state.overworld.center), { map: 'meadow', x: 4, y: 5 });
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('math_quest_save')).overworld.center), { map: 'meadow', x: 4, y: 5 });
});

test('a saved Center that is not a place to stand falls back to the start', async () => {
  const r = await page.evaluate(() => {
    const run = (center) => { state.overworld = { map: 'hollow', x: 7, y: 9, face: 'down', fight: false, found: [], signs: { day: '', ids: [] }, center }; NORMALIZERS.forEach((fn) => { if (fn.name === 'overworld') fn(state); }); return JSON.parse(JSON.stringify(state.overworld.center)); };
    return [run({ map: 'meadow', x: 4, y: 5 }), run({ map: 'nowhere', x: 4, y: 5 }), run({ map: 'meadow', x: 3, y: 4 }), run({ map: 'meadow-center', x: 3, y: 1 }), run(null), run({ map: 'meadow', x: 'a', y: 1.5 })];
  });
  assert.deepEqual(r[0], { map: 'meadow', x: 4, y: 5 });
  r.slice(1).forEach((c) => assert.deepEqual(c, { map: 'hollow', x: 7, y: 9 }));
});

test('the Mart opens more items as badges are won, and has no Boss Whistle', async () => {
  await toClerk();
  const none = await page.evaluate(() => { state.badges = []; owMove('up'); return Array.from(document.querySelectorAll('#mart-body .mart-row')).map((r) => ({ text: r.innerText.replace(/\s+/g, ' '), locked: r.classList.contains('locked'), buttons: r.querySelectorAll('button').length })); });
  assert.deepEqual(none.map((r) => r.locked), [false, false, true, true, true, true]);
  assert.match(none[0].text, /Super Potion/);
  assert.match(none[1].text, /Catch Net/);
  assert.match(none[2].text, /Opens with 1 badge\b/);
  assert.match(none[3].text, /Opens with 2 badges/);
  assert.deepEqual(none.map((r) => r.buttons), [1, 1, 0, 0, 0, 0], 'a locked item has nothing to buy');
  assert.ok(none.every((r) => !/Whistle/.test(r.text)));
  const all = await page.evaluate(() => { state.badges = ['ember', 'tide', 'grove', 'volt']; renderMart(); return Array.from(document.querySelectorAll('#mart-body .mart-row')).map((r) => r.classList.contains('locked')); });
  assert.deepEqual(all, [false, false, false, false, false, false]);
  const prices = await page.evaluate(() => ECON.overworld.mart.map((it, i) => document.querySelectorAll('#mart-body .mart-row')[i].querySelector('button').innerText === itemCost(it.type) + ' gems'));
  assert.ok(prices.every(Boolean), 'the price on the button is the shop price');
});

test('buying at the Mart goes through the shop confirmation, which opens on top, and the window shows the new wallet', async () => {
  await toClerk();
  await page.evaluate(() => { state.gems = 100; state.nets = 0; owMove('up'); });
  const cost = await page.evaluate(() => ECON.items.net);
  await page.click('#mart-body .mart-row:nth-child(2) button');
  assert.equal(await topOverlay(), 'confirm-modal', 'the confirmation must not hide under the Mart');
  assert.match(await page.evaluate(() => document.getElementById('confirm-title').innerText), /Catch Net/);
  await page.click('#confirm-yes');
  assert.deepEqual(await page.evaluate(() => [state.gems, state.nets]), [100 - cost, 1]);
  assert.equal(await page.evaluate(() => document.getElementById('mart-wallet').innerText), 'You have ' + (100 - cost) + ' gems');
  assert.equal(await topOverlay(), 'mart-modal');
  assert.deepEqual(errors, []);
});

test('not enough gems explains and buys nothing; Escape closes the confirmation, then the Mart, then the map stays', async () => {
  await toClerk();
  await page.evaluate(() => { state.gems = 1; state.nets = 0; owMove('up'); });
  await page.click('#mart-body .mart-row:nth-child(2) button');
  assert.equal(await topOverlay(), 'mart-modal', 'no confirmation when you cannot pay');
  assert.match(await page.evaluate(() => document.getElementById('toast').innerText), /more/);
  assert.deepEqual(await page.evaluate(() => [state.gems, state.nets]), [1, 0]);
  await page.evaluate(() => { state.gems = 100; });
  await page.click('#mart-body .mart-row:nth-child(2) button');
  assert.equal(await topOverlay(), 'confirm-modal');
  await page.keyboard.press('Escape');
  assert.equal(await topOverlay(), 'mart-modal');
  await page.keyboard.press('Escape');
  assert.equal(await topOverlay(), 'overworld-modal');
  assert.equal(await page.evaluate(() => state.nets), 0);
});

for (const [w, h] of [[320, 568], [360, 640], [420, 800]]) {
  test('the Mart and the Center fit a ' + w + 'x' + h + ' phone with 44px tap targets', async () => {
    await page.setViewportSize({ width: w, height: h });
    await toClerk();
    const mart = await page.evaluate(() => {
      state.badges = ['ember', 'tide', 'grove', 'volt']; owMove('up');
      const c = document.querySelector('#mart-modal .modal-content').getBoundingClientRect();
      const b = Array.from(document.querySelectorAll('#mart-body button')).map((x) => { const q = x.getBoundingClientRect(); return q.width >= 44 && q.height >= 44 && q.right <= innerWidth; });
      return { inside: c.left >= 0 && c.right <= innerWidth, scroll: document.documentElement.scrollWidth <= innerWidth, b, n: b.length };
    });
    assert.ok(mart.inside && mart.scroll && mart.n === 6 && mart.b.every(Boolean), JSON.stringify(mart));
    await page.evaluate(() => closeMart());
    await toNurse();
    const center = await page.evaluate(() => {
      state.faintedPets = ['dog']; state.spring.day = ''; owMove('up'); document.getElementById('talk-next').click();
      const c = document.querySelector('#talk-modal .modal-content').getBoundingClientRect();
      const b = Array.from(document.querySelectorAll('#talk-choices button, #talk-next')).map((x) => { const q = x.getBoundingClientRect(); return q.width >= 44 && q.height >= 44 && q.bottom <= innerHeight; });
      return { inside: c.left >= 0 && c.right <= innerWidth && c.bottom <= innerHeight, b };
    });
    assert.ok(center.inside && center.b.length === 2 && center.b.every(Boolean), JSON.stringify(center));
    await page.setViewportSize({ width: 1280, height: 720 });
  });
}
