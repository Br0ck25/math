// Buying anything with gems asks first (askBuy): shop items, buddies, gear, armor and held items.
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
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; });
});

test('no errors', () => { assert.deepEqual(errors, []); });

test('the buy confirmation opens on top of the buddy hub, not behind it', async () => {
  const r = await page.evaluate(() => {
    state.gems = 999;
    openHub(); setHubTab('hold');
    buyHeld('berry');
    const box = document.querySelector('#confirm-modal .modal-content').getBoundingClientRect();
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return { onTop: !!top && !!top.closest('#confirm-modal'), shown: document.getElementById('confirm-modal').style.display };
  });
  assert.equal(r.shown, 'flex');
  assert.ok(r.onTop, 'the window the player must answer is the one on top');
});
