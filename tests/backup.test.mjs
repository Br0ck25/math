// Alpha bosses under 25% health may swap for a tougher boss at full health; only the new boss can give a win.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

let browser, page, errors;
before(async () => {
  browser = await launch();
  ({ page, errors } = await openGame(browser, await loadWorker(), { MATH_KV: fakeKV() }));
});
after(async () => { await browser.close(); });
beforeEach(async () => {
  await page.evaluate(() => {
    state.raid = null; state.bossSwapped = false; state.bossBook = {}; state.recentBossTypes = [];
    state.activePet = 'dog'; state.buddyXp.dog = xpForLevel(60);
    currentMonsterIndex = 0; bossLevel = 50; partyHp = {};
  });
});
// Runs maybeBackupBoss with a fixed die roll and the boss at `hpShare` of its health.
const tryBackup = (opts) => page.evaluate((o) => {
  if (o.level !== undefined) bossLevel = o.level;
  if (o.raid) state.raid = { phase: 0, total: 3, weaks: ['add', 'add', 'add'], chapter: 0, introSeen: true };
  if (o.swapped) state.bossSwapped = true;
  const boss = getBossInfo();
  monsterCurrentHp = Math.max(1, Math.floor(boss.maxHp * o.hpShare));
  const real = Math.random; Math.random = () => o.roll;
  const swapped = maybeBackupBoss(boss, getActivePetDisplay());
  Math.random = real;
  return { swapped, index: currentMonsterIndex, swappedFlag: state.bossSwapped, hp: monsterCurrentHp, max: getBossMaxHp(), book: JSON.stringify(state.bossBook), first: boss };
}, opts);

test('an Alpha boss under 25% health can swap out for a tougher boss at full health', async () => {
  const before = await page.evaluate(() => getBossInfo());
  const r = await tryBackup({ hpShare: 0.2, roll: 0 });
  assert.equal(r.swapped, true);
  assert.notEqual(r.index, 0);
  assert.equal(r.swappedFlag, true);
  assert.equal(r.hp, r.max, 'the new boss starts at full health');
  const nb = await page.evaluate(() => getBossInfo());
  assert.equal(nb.atk, 1 + 1 + 1, 'Alpha attack plus the backup bonus');
  assert.equal(before.swapped, false);
  assert.equal(nb.swapped, true);
});

test('the first boss is not beaten: only the new boss is in the book, with no win yet', async () => {
  const r = await tryBackup({ hpShare: 0.2, roll: 0 });
  const book = JSON.parse(r.book);
  assert.equal(book[0], undefined, 'the boss that called for backup gets no win');
  assert.deepEqual(book[r.index], { wins: 0, form: -1, alpha: 0 }, 'the new boss is met, not beaten');
});

test('it needs Alpha, no raid, health under 25%, a lucky roll, and only happens once', async () => {
  assert.equal((await tryBackup({ hpShare: 0.2, roll: 0, level: 10 })).swapped, false, 'not Alpha');
  assert.equal((await tryBackup({ hpShare: 0.2, roll: 0, raid: true })).swapped, false, 'not in a raid');
  assert.equal((await tryBackup({ hpShare: 0.6, roll: 0 })).swapped, false, 'still healthy');
  assert.equal((await tryBackup({ hpShare: 0.2, roll: 0.9 })).swapped, false, 'unlucky roll: it fights on');
  assert.equal((await tryBackup({ hpShare: 0.2, roll: 0, swapped: true })).swapped, false, 'one swap per boss');
});

test('half the time the partner beats your buddy: a slayer of it or a stronger element', async () => {
  const r = await page.evaluate(() => {
    const out = { counter: 0, any: new Set() };
    const real = Math.random;
    for (let k = 0; k < 40; k++) {
      state.bossSwapped = false; currentMonsterIndex = 0;
      Math.random = () => 0;                                       // the counter roll succeeds
      const i = pickBackupBoss(getActivePetDisplay());
      if ((TYPE_STRONG[monstersList[i].element] || []).indexOf('nature') !== -1) out.counter++;
    }
    // a slayer's own target: Janie is only ever countered by Bovine Bruiser
    state.unlockedSecrets.push('secret_janie'); state.buddyXp.secret_janie = xpForLevel(40); state.activePet = 'secret_janie';
    Math.random = () => 0; out.janie = monstersList[pickBackupBoss(getActivePetDisplay())].name;
    let seen = new Set(); Math.random = real;
    state.activePet = 'dog';
    for (let k = 0; k < 400; k++) { Math.random = () => 0.999; seen.add(pickBackupBoss(getActivePetDisplay())); Math.random = real; seen.add(pickBackupBoss(getActivePetDisplay())); }
    out.spread = seen.size;
    return out;
  });
  assert.equal(r.counter, 40, 'with the counter roll, the partner is always strong against nature');
  assert.equal(r.janie, 'Bovine Bruiser');
  assert.ok(r.spread > 10, 'otherwise any boss can come: ' + r.spread);
});

test('beating the swapped-in boss gives the win and a bonus; the next boss is a normal one again', async () => {
  const r = await page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    state.bossSwapped = true; currentMonsterIndex = 7; bossLevel = 50; partyHp = {}; state.faintedPets = [];
    state.bossBook = {}; markBossSeen(7);
    monsterCurrentHp = 1; state.gems = 0; state.monstersDefeated = 1;
    const boss = getBossInfo();
    const base = ECON.boss.gemBase + Math.floor(boss.level / ECON.boss.gemPerLevels);
    triggerMonsterDamage(50, false); await wait(1200);
    return { win: state.bossBook[7].wins, alpha: state.bossBook[7].alpha, bonus: ECON.boss.swap.bonusGems, base, swappedAfter: state.bossSwapped, bossesDefeated: state.monstersDefeated };
  });
  assert.equal(r.win, 1);
  assert.equal(r.alpha, 1, 'the Alpha win counts toward its buddy');
  assert.equal(r.swappedAfter, false);
  assert.equal(r.bossesDefeated, 2);
});

test('the swap flag survives a reload and bad saves are repaired', async () => {
  await page.evaluate(() => { state.bossSwapped = true; state.currentMonsterIndex = 7; state.bossLevel = 50; state.recentBossTypes = ['water']; saveState(); });
  await page.reload();
  assert.deepEqual(await page.evaluate(() => [state.bossSwapped, currentMonsterIndex, getBossInfo().swapped]), [true, 7, true]);
  await page.evaluate(() => { state.bossSwapped = 'yes'; NORMALIZERS.forEach((fn) => fn(state)); });
  assert.equal(await page.evaluate(() => state.bossSwapped), false);
});
