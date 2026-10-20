// Roles (by element) and held items.
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
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; state.wild.id = ''; currentMonsterIndex = 0; bossLevel = 5; });
});

test('every element has a role, and the hub says which', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    ['fire', 'water', 'nature', 'electric', 'dark', 'magic', 'shadow'].forEach((e) => { out[e] = roleOf({ element: e }).name; });
    hubPet = 'dog'; renderHub();
    out.sub = document.getElementById('hub-sub').innerText;
    hubTab = 'hold'; renderHub(); out.body = document.getElementById('hub-body').innerText;
    return out;
  });
  assert.deepEqual([r.fire, r.water, r.nature, r.electric, r.dark, r.magic, r.shadow], ['Attacker', 'Healer', 'Tank', 'Speedster', 'Trickster', 'Support', 'Wildcard']);
  assert.match(r.sub, /nature Tank/);
  assert.match(r.body, /Role: Tank/);
  assert.match(r.body, /Oran Berry/);
});

test('held items: buy, give to one buddy, moving it takes it from the other, bad saves repaired', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    state.gems = 100; state.unlockedPets = ['dog', 'fox']; hubPet = 'dog'; hubTab = 'hold';
    buyHeld('berry'); confirmBuy(); out.bought = [state.heldOwned.join(), state.gems];
    buyHeld('berry'); out.once = state.gems;
    state.gems = 5; buyHeld('shell'); out.poor = [state.heldOwned.length, state.gems];
    giveHeld('berry'); out.dog = state.held.dog;
    hubPet = 'fox'; giveHeld('berry'); out.moved = [state.held.dog, state.held.fox];
    giveHeld('berry'); out.back = Object.keys(state.held).length;
    state.held = { dog: 'berry', fox: 'berry', ghost: 'berry', cat: 'nope' }; state.heldOwned = ['berry', 'berry', 'zzz'];
    NORMALIZERS.forEach((fn) => fn(state));
    out.fixed = [state.heldOwned.join(), JSON.stringify(state.held)];
    return out;
  });
  assert.deepEqual(r.bought, ['berry', 100 - 40]);
  assert.equal(r.once, 60, 'bought once');
  assert.deepEqual(r.poor, [1, 5], 'not enough gems');
  assert.equal(r.dog, 'berry');
  assert.deepEqual(r.moved, [undefined, 'berry']);
  assert.equal(r.back, 0, 'tapping the held item takes it back');
  assert.deepEqual(r.fixed, ['berry', '{"dog":"berry"}']);
});

test('no errors', () => { assert.deepEqual(errors, []); });
