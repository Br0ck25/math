// The battle screen must fit every phone: no overlap between the equation and the text under it, nothing sideways, 44px tap targets.
// Worst case on purpose: a wild buddy with a 3-buddy team, a napping buddy, a streak banner, a hint, wide letters.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

let browser, worker, env, page, errors;
before(async () => {
  browser = await launch();
  worker = await loadWorker();
  env = { MATH_KV: fakeKV() };
  ({ page, errors } = await openGame(browser, worker, env, { wildStart: true }));
});
after(async () => { await browser.close(); });

const SIZES = [[320, 568], [360, 640], [375, 548], [375, 667], [360, 808], [412, 915]];
const PROBLEMS = {
  vertical: { layout: 'vertical', num1: 657, num2: 142, operator: '+', answer: 799, modeTag: 'add' },
  inline: { layout: 'inline', expr: '35 ÷ 5', answer: 7, modeTag: 'div' },
  stack: { layout: 'stack', expr: 'Average of 12, 15, 18, 21, 24, 27', lead: 'Mean =', answer: 19.5, modeTag: 'add' }
};

test('the equation never overlaps the text under it, and nothing runs off the screen, on any phone or sum layout', async () => {
  await page.addStyleTag({ content: '* { letter-spacing: 0.05em !important; }' });      // iPhone text is wider than this machine's
  const bad = [];
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    for (const kind of Object.keys(PROBLEMS)) {
      const out = await page.evaluate(({ p, w, h, kind }) => {
        const o = [], tag = w + 'x' + h + ' ' + kind + ': ';
        state.unlockedPets = ['dog', 'fox', 'otter']; state.team = state.unlockedPets.slice(); state.activePet = 'dog';
        state.wild.id = 'octo' in {} ? 'octo' : wildPool()[5].id; bossLevel = 12; state.streak = 3; state.swapUsed = false;
        updateStatsUI();
        currentProblem = Object.assign({}, p); renderEquationUI();
        document.getElementById('streak-msg').innerText = '🔥 3 IN A ROW!';
        document.getElementById('feedback-msg').innerText = 'Ready for the next one!';
        document.getElementById('hint-box').innerText = '📘 How to: Start with the ones column: add 4 and 8, then carry the one.';
        document.getElementById('fighter-icon-wrapper').classList.add('napping');
        bossReact('laugh');
        const R = (e) => e.getBoundingClientRect(), vis = (e) => R(e).height > 2 && R(e).width > 2;
        const arena = document.querySelector('.arena'), mount = document.getElementById('equation-mount');
        const eq = mount.firstElementChild, er = R(eq), mr = R(mount);
        if (arena.scrollHeight > arena.clientHeight + 1) o.push(tag + 'arena clips ' + arena.scrollHeight + ' > ' + arena.clientHeight);
        if (er.top < mr.top - 1 || er.bottom > mr.bottom + 1) o.push(tag + 'equation outside its box ' + Math.round(er.top) + '..' + Math.round(er.bottom) + ' vs ' + Math.round(mr.top) + '..' + Math.round(mr.bottom));
        if (er.right > mr.right + 1 || er.left < mr.left - 1) o.push(tag + 'equation too wide');
        ['hint-box', 'feedback-msg', 'streak-msg'].forEach((id) => {
          const e = document.getElementById(id);
          if (!vis(e)) return;
          const r = R(e);
          if (er.bottom > r.top + 1 && er.top < r.bottom - 1) o.push(tag + id + ' overlaps the equation');
        });
        if (document.documentElement.scrollWidth > innerWidth + 1) o.push(tag + 'sideways scroll');
        const hdr = R(document.getElementById('battle-header-arena'));
        document.querySelectorAll('#battle-header-arena .fighter-card, #battle-header-arena .swap-chip, #battle-header-arena .ult-btn').forEach((e) => {
          const r = R(e); if (r.right > hdr.right + 1 || r.left < hdr.left - 1) o.push(tag + (e.className || e.tagName) + ' outside the panel');
        });
        document.querySelectorAll('#team-bar .swap-chip').forEach((c) => { const r = R(c); if (r.height < 43.5 || r.width < 43.5) o.push(tag + 'team chip smaller than 44px ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
        const ult = R(document.querySelector('.ultimate-container'));
        if (ult.height > 70) o.push(tag + 'ultimate row wrapped (' + Math.round(ult.height) + 'px)');
        if (R(document.querySelector('.bottom-bar')).bottom > innerHeight + 1) o.push(tag + 'bottom bar off screen');
        if (R(document.querySelector('.keypad')).bottom > R(document.querySelector('.bottom-bar')).top + 1) o.push(tag + 'keypad overlaps the bottom bar');
        document.getElementById('fighter-icon-wrapper').classList.remove('napping');
        return o;
      }, { p: PROBLEMS[kind], w, h, kind });
      bad.push(...out);
    }
  }
  assert.deepEqual(bad, []);
});

test('the answer area is at least 150px tall on every phone size', async () => {
  const small = [];
  for (const [w, h] of SIZES) {
    await page.setViewportSize({ width: w, height: h });
    const ah = await page.evaluate(() => { state.team = state.unlockedPets.slice(); updateStatsUI(); return document.querySelector('.arena').getBoundingClientRect().height; });
    if (ah < 150) small.push(w + 'x' + h + ' arena ' + Math.round(ah));
  }
  assert.deepEqual(small, []);
});

test('the type hint and the chip share one row, and the goal counter moves into the stats row on short phones', async () => {
  await page.setViewportSize({ width: 360, height: 640 });
  const r = await page.evaluate(() => {
    updateStatsUI();
    const R = (id) => document.getElementById(id).getBoundingClientRect();
    const pill = document.querySelector('.goal-pill');
    return { sameRow: Math.abs(R('type-match-hint').top - R('weak-chip').top) < 4, hint: document.getElementById('type-match-hint').innerText, chip: document.getElementById('weak-chip').innerText, pill: getComputedStyle(pill).display, pillText: document.getElementById('goal-pill-text').innerText };
  });
  assert.equal(r.sameRow, true);
  assert.ok(r.hint.length > 3);
  assert.match(r.chip, /Catch \d+%/);
  assert.equal(r.pill, 'flex');
  assert.match(r.pillText, /^\d+\/\d+$/);
  await page.setViewportSize({ width: 360, height: 808 });
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.goal-pill')).display), 'none', 'on tall phones the goal row is shown instead');
});

test('no errors', () => { assert.deepEqual(errors, []); });
