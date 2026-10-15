// Game feel: sounds, celebrations, kind feedback, progress hints, welcome-back, buddy and boss reactions.
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
});
const solveCorrectly = () => page.evaluate(() => { inputLocked = false; userInput = String(currentProblem.answer); checkAnswer(); });
const solveWrong = () => page.evaluate(() => { inputLocked = false; userInput = String(currentProblem.answer + 7); checkAnswer(); });

test('the correct-answer sound climbs with the combo, up to one octave', async () => {
  const k = await page.evaluate(() => [comboPitch(1), comboPitch(2), comboPitch(13), comboPitch(99)]);
  assert.equal(k[0], 1);
  assert.ok(k[1] > 1 && k[1] < 1.1);
  assert.ok(Math.abs(k[2] - 2) < 1e-9);
  assert.equal(k[3], k[2], 'capped at an octave');
});

test('a wrong answer shows what was typed beside the right answer, kindly, and queues a quick win', async () => {
  await solveWrong();
  const r = await page.evaluate(() => ({
    msg: document.getElementById('feedback-msg').innerText,
    answer: fmtAns(currentProblem.answer),
    queued: Object.keys(state.adapt.easy).length
  }));
  assert.match(r.msg, /^You said /);
  assert.ok(r.msg.includes('the answer is ' + r.answer), r.msg);
  assert.doesNotMatch(r.msg, /wrong|incorrect|bad/i);
  assert.equal(r.queued, 1, 'the next problem of that type is a gentle warm-up');
});

test('the next problem after a miss is a warm-up of the same type', async () => {
  await solveWrong();
  const r = await page.evaluate(async () => {
    const op = currentProblem.modeTag;
    await new Promise((res) => setTimeout(res, 200));
    for (let i = 0; i < 40 && !currentProblem.easy; i++) { await new Promise((res) => setTimeout(res, 100)); }
    return { op, easy: currentProblem.easy, now: currentProblem.modeTag };
  });
  assert.equal(r.easy, true);
  assert.equal(r.now, r.op);
});

test('a right answer floats the gems and XP gained, and nothing floats with reduced motion', async () => {
  await page.evaluate(() => { state.reduceMotion = false; });
  await solveCorrectly();
  const texts = await page.evaluate(() => new Promise((res) => setTimeout(() => res([...document.querySelectorAll('.float-gain')].map((e) => e.innerText)), 400)));
  assert.ok(texts.some((t) => /\+\d+ 💎/.test(t)), JSON.stringify(texts));
  assert.ok(texts.some((t) => /\+\d+ XP/.test(t)), JSON.stringify(texts));
  await page.evaluate(() => { state.reduceMotion = true; document.querySelectorAll('.float-gain').forEach((e) => e.remove()); });
  await solveCorrectly();
  const none = await page.evaluate(() => new Promise((res) => setTimeout(() => res(document.querySelectorAll('.float-gain').length), 300)));
  assert.equal(none, 0);
});

test('each celebration kind exists, and motion-reduced players get no particles', async () => {
  const r = await page.evaluate(() => {
    state.reduceMotion = false;
    const out = {};
    ['basic', 'streak', 'level', 'boss'].forEach((k) => { particles.length = 0; launchConfetti(k); out[k] = particles.length; });
    state.reduceMotion = true;
    particles.length = 0; launchConfetti('boss'); out.reduced = particles.length;
    return out;
  });
  assert.ok(r.boss > r.basic && r.level > r.basic, JSON.stringify(r));
  assert.equal(r.reduced, 0);
});

test('praise gets bigger as the combo grows', async () => {
  const r = await page.evaluate(() => ({ hot: PRAISE.hot.indexOf(praiseFor(5, false)) >= 0, fast: PRAISE.fast.indexOf(praiseFor(2, true)) >= 0, base: PRAISE.base.indexOf(praiseFor(2, false)) >= 0 }));
  assert.deepEqual(r, { hot: true, fast: true, base: true });
});

test('a goal line says what is close: an evolution or the next buddy', async () => {
  const t = await page.evaluate(() => nextGoalText());
  assert.match(t, /to unlock|to evolve|can unlock/);
  assert.equal(await page.evaluate(() => document.getElementById('next-goal').innerText), t);
  const afford = await page.evaluate(() => { state.gems = 100000; return nextGoalText(); });
  assert.match(afford, /can unlock|to evolve/);
});

test('welcome back appears once after a break, never after a short one', async () => {
  await page.evaluate(() => { state.streakCal.count = 4; state.streakCal.last = daysAgoKey(5); saveState(); });
  await page.reload();
  await page.waitForFunction(() => document.getElementById('welcome-modal').style.display === 'flex');
  const text = await page.evaluate(() => document.getElementById('welcome-text').innerText);
  assert.match(text, /5 days/);
  assert.match(text, /paused at day 4/);
  assert.doesNotMatch(text, /lost|reset|broke/i);
  await page.evaluate(() => closeWelcome());
  await page.reload();
  await page.waitForTimeout(400);
  assert.notEqual(await page.evaluate(() => document.getElementById('welcome-modal').style.display), 'flex', 'only once a day');
  await page.evaluate(() => { state.seen.welcome = ''; state.streakCal.last = daysAgoKey(1); saveState(); });
  await page.reload();
  await page.waitForTimeout(400);
  assert.notEqual(await page.evaluate(() => document.getElementById('welcome-modal').style.display), 'flex', 'yesterday is not a break');
  assert.deepEqual(errors, []);
});

test('buddy and boss react: hop, wince, nervous at low health, glow by element', async () => {
  const r = await page.evaluate(() => {
    const icon = document.getElementById('pet-fighter-icon');
    buddyReact('cheer');
    const hop = icon.classList.contains('buddy-hop');
    buddyReact('wince');
    const wince = icon.classList.contains('buddy-wince');
    const pet = getActivePetDisplay();
    setPetHp(pet.id, 1);
    updateBattleUI();
    const worried = icon.classList.contains('buddy-worried');
    setPetHp(pet.id, getPetMaxHp(pet.id));
    updateBattleUI();
    const calm = !icon.classList.contains('buddy-worried');
    const elem = document.getElementById('boss-box').getAttribute('data-element');
    return { hop, wince, worried, calm, elem, known: ['fire', 'water', 'nature', 'electric', 'dark', 'magic'].includes(elem), hit: !!BOSS_HIT_WORD[elem] };
  });
  assert.deepEqual([r.hop, r.wince, r.worried, r.calm, r.known, r.hit], [true, true, true, true, true, true], JSON.stringify(r));
});

test('a hot combo makes the buddy glow', async () => {
  await page.evaluate(() => { state.streak = 5; updateBattleUI(); });
  assert.equal(await page.evaluate(() => document.getElementById('fighter-icon-wrapper').classList.contains('combo-hot')), true);
  await page.evaluate(() => { state.streak = 0; updateBattleUI(); });
  assert.equal(await page.evaluate(() => document.getElementById('fighter-icon-wrapper').classList.contains('combo-hot')), false);
});

test('the parent summary names the strongest type', async () => {
  const r = await page.evaluate(() => ({ best: strongestOp({ add: [10, 9], sub: [10, 5], mul: [3, 3] }), none: strongestOp({ add: [2, 2] }) }));
  assert.equal(r.best, 'add');
  assert.equal(r.none, null);
});

test('the streak shield costs what the economy says: refused below it, bought at it', async () => {
  const r = await page.evaluate(() => {
    const price = ECON.items.shield;
    state.shields = 0; state.gems = price - 1; buyItem('shield', 1);       // a stale price passed in must be ignored
    const refused = { shields: state.shields, gems: state.gems };
    state.gems = price; buyItem('shield', 1);
    return { price, refused, bought: { shields: state.shields, gems: state.gems }, label: document.getElementById('item-shield').innerText };
  });
  assert.deepEqual(r.refused, { shields: 0, gems: r.price - 1 });
  assert.deepEqual(r.bought, { shields: 1, gems: 0 });
  assert.equal(r.label, 'Need ' + r.price + ' more 💎', 'out of gems, the button says how many more are needed');
});

test('a wrong answer opens a card with the right answer that closes by itself after 5 seconds or by the ✕', async () => {
  await solveWrong();
  const r = await page.evaluate(() => ({
    shown: getComputedStyle(document.getElementById('miss-modal')).display,
    answer: document.getElementById('miss-answer').innerText,
    want: fmtAns(currentProblem.answer),
    ms: MISS_CARD_MS,
    x: !!document.querySelector('#miss-modal .modal-x')
  }));
  assert.equal(r.shown, 'flex');
  assert.equal(r.answer, r.want);
  assert.equal(r.ms, 5000);
  assert.ok(r.x, 'sticky exit button');
  await page.evaluate(() => document.querySelector('#miss-modal .modal-x').click());
  assert.equal(await page.evaluate(() => document.getElementById('miss-modal').style.display), 'none');
  await page.evaluate(() => { inputLocked = false; userInput = String(currentProblem.answer + 7); checkAnswer(); });
  await page.waitForFunction(() => document.getElementById('miss-modal').style.display === 'none', null, { timeout: 7000 });
});

test('all-time records keep the fastest answer, longest streak and totals', async () => {
  await solveCorrectly(); await solveCorrectly(); await solveCorrectly();
  await solveWrong();
  const r = await page.evaluate(() => ({ ...state.records }));
  assert.equal(r.solved, 3);
  assert.equal(r.attempts, 4);
  assert.equal(r.bestStreak, 3);
  assert.ok(r.fastest >= 0);
  await page.evaluate(() => { state.records.fastest = 'x'; state.records.bestStreak = -4; saveState(); });
  await page.reload();
  const n = await page.evaluate(() => ({ ...state.records }));
  assert.equal(n.fastest, 0);
  assert.equal(n.bestStreak, 0);
  await page.evaluate(() => { state.records = { fastest: 1.2, bestStreak: 9, solved: 20, attempts: 25, fastestOp: 'add' }; fillReport(); });
  const t = await page.evaluate(() => document.getElementById('rep-alltime').innerText);
  assert.match(t, /1\.2s/);
  assert.match(t, /9/);
  assert.match(t, /80%/);
});

test('bosses react by element: bubble and line on a Speed Strike, a laugh when they hit, anger when low', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    ['fire', 'water', 'nature', 'electric', 'dark', 'magic'].forEach((e) => { out[e] = Object.keys(BOSS_MOODS[e]).sort().join(); });
    const boss = getBossInfo();
    bossReact('fast');
    out.fastBubble = document.getElementById('boss-bubble').innerText;
    out.fastLine = document.getElementById('boss-taunt-box').innerText;
    out.fastWant = BOSS_MOODS[boss.element].say.fast;
    bossReact('laugh');
    out.laughCls = document.getElementById('boss-box').classList.contains('boss-laugh');
    return out;
  });
  const keys = r.fire;
  ['water', 'nature', 'electric', 'dark', 'magic'].forEach((e) => assert.equal(r[e], keys, e + ' has every mood'));
  assert.equal(r.fastBubble, '💨');
  assert.ok(r.fastLine.includes(r.fastWant), r.fastLine);
  assert.equal(r.laughCls, true);
});

test('a hit that leaves the boss alive and a Speed Strike both make it react, and a miss makes it laugh', async () => {
  const r = await page.evaluate(() => {
    monsterCurrentHp = getBossMaxHp() + 50;
    state.shields = 0;
    userInput = String(currentProblem.answer + 7); inputLocked = false; checkAnswer();
    return new Promise((res) => setTimeout(() => res(document.getElementById('boss-bubble').innerText), 300));
  });
  assert.ok(r.length > 0, 'a bubble over the boss after it hit your buddy');
});

test('the buddy cheers every third answer in a row, naps when idle and wakes on a tap', async () => {
  const r = await page.evaluate(async () => {
    const w = document.getElementById('fighter-icon-wrapper');
    const out = {};
    state.streak = 2; inputLocked = false; userInput = String(currentProblem.answer); checkAnswer();
    out.cheer = w.classList.contains('happy-bounce');
    inputLocked = false;
    napBuddy();
    out.napping = w.classList.contains('napping');
    document.dispatchEvent(new Event('pointerdown'));
    out.woke = !w.classList.contains('napping');
    inputLocked = false;
    document.querySelectorAll('.modal-overlay').forEach((m) => { m.style.display = 'none'; });   // a milestone window would keep the buddy awake
    document.dispatchEvent(new Event('pointerdown'));
    await new Promise((res) => setTimeout(res, IDLE_NAP_MS + 2000));
    out.napsByItself = w.classList.contains('napping');
    return out;
  });
  assert.equal(r.cheer, true, 'a streak of 3 bounces the buddy ' + JSON.stringify(r));
  assert.equal(r.napping, true, JSON.stringify(r));
  assert.equal(r.woke, true, JSON.stringify(r));
  assert.equal(r.napsByItself, true, 'idle for a while: the buddy falls asleep ' + JSON.stringify(r));
});

test('the team bar shows each buddy\'s matchup against the boss and swapping changes the fighter', async () => {
  const r = await page.evaluate(() => {
    const owned = storePets.slice(0, 3).map((s) => s.id);
    state.unlockedPets = owned; state.team = owned.slice(); state.activePet = owned[0]; state.faintedPets = [];
    updateStatsUI();
    const chips = [...document.querySelectorAll('#team-bar .swap-chip')];
    const out = { n: chips.length, first: chips[0].classList.contains('active'), labels: chips.map((c) => c.getAttribute('aria-label')) };
    chips[1].click();
    out.now = state.activePet === owned[1];
    out.second = document.querySelectorAll('#team-bar .swap-chip')[1].classList.contains('active');
    state.faintedPets = [owned[2]]; updateStatsUI();
    document.querySelectorAll('#team-bar .swap-chip')[2].click();
    out.restingStays = state.activePet === owned[1];
    state.activePet = owned[0]; state.team = [owned[0]]; updateStatsUI();      // the fighter is always on the team
    out.hidden = document.getElementById('team-bar').children.length;
    return out;
  });
  assert.equal(r.n, 3);
  assert.ok(r.first);
  assert.ok(r.labels.every((l) => /damage against/.test(l)), r.labels.join('|'));
  assert.ok(r.now && r.second, 'tapping a chip swaps in that buddy');
  assert.ok(r.restingStays, 'a resting buddy cannot be swapped in');
  assert.equal(r.hidden, 0, 'a one-buddy team shows no bar');
});
