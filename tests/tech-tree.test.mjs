// Tests for Tree of Knowledge tech tree system
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
  await page.evaluate(() => {
    startGoldenVault = function () { modalDone(); };
    state.wild.id = '';
    currentMonsterIndex = 0;
    bossLevel = 5;
  });
});

test('state defaults and normalizers for tech tree', async () => {
  const r = await page.evaluate(() => {
    const fresh = freshState();
    const defaults = { stars: fresh.stars, tech: fresh.techUnlocked };
    state.stars = 'invalid';
    state.techUnlocked = ['quick_sparks', 'fake_tech', 'quick_sparks'];
    NORMALIZERS.forEach((fn) => fn(state));
    return { defaults, normalized: { stars: state.stars, tech: state.techUnlocked } };
  });
  assert.equal(r.defaults.stars, 0);
  assert.deepEqual(r.defaults.tech, []);
  assert.equal(r.normalized.stars, 0);
  assert.deepEqual(r.normalized.tech, ['quick_sparks']);
});

test('unlocking nodes with star sparks, prerequisites and tier gating', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    state.stars = 10;
    state.gems = 500;
    state.badges = [];

    // Try Tier 2 without prereq
    const prereqFail = checkTechReqs(getTechNode('streak_cushion'));
    out.prereqFail = prereqFail.reason;

    // Unlock Tier 1 prereq
    unlockTech('quick_sparks');
    out.unlockedQuick = hasTech('quick_sparks');
    out.afterQuick = { stars: state.stars, gems: state.gems };

    // Try Tier 2 with 0 badges
    const badgeFail = checkTechReqs(getTechNode('streak_cushion'));
    out.badgeFail = badgeFail.reason;

    // Grant 2 badges and unlock Tier 2
    state.badges = ['ember', 'tide'];
    const badgeOk = checkTechReqs(getTechNode('streak_cushion'));
    out.badgeOk = badgeOk.ok;
    unlockTech('streak_cushion');
    out.unlockedCushion = hasTech('streak_cushion');

    return out;
  });

  assert.match(r.prereqFail, /Requires Quick Sparks I/);
  assert.equal(r.unlockedQuick, true);
  assert.equal(r.afterQuick.stars, 9);
  assert.equal(r.afterQuick.gems, 480);
  assert.match(r.badgeFail, /Requires 2 Gym Badges/);
  assert.equal(r.badgeOk, true);
  assert.equal(r.unlockedCushion, true);
});

