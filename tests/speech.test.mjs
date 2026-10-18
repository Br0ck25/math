import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

let browser, worker, env, page;
before(async () => {
  browser = await launch();
  worker = await loadWorker();
  env = { MATH_KV: fakeKV() };
  ({ page } = await openGame(browser, worker, env, { fast: true }));
});
after(async () => {
  if (browser) await browser.close();
});

test('read aloud state defaults and normalizers', async () => {
  const r = await page.evaluate(() => {
    const fresh = freshState();
    const defaults = { readAloud: fresh.readAloud };
    state.readAloud = 'notABool';
    normalizeState();
    const afterBad = state.readAloud;
    state.readAloud = true;
    normalizeState();
    const afterTrue = state.readAloud;
    return { defaults, afterBad, afterTrue };
  });
  assert.equal(r.defaults.readAloud, false);
  assert.equal(r.afterBad, false);
  assert.equal(r.afterTrue, true);
});

test('mathToWords translates vertical and inline equations into natural spoken text', async () => {
  const r = await page.evaluate(() => {
    return {
      vertAdd: mathToWords({ layout: 'vertical', num1: 24, num2: 18, operator: '+' }),
      vertSub: mathToWords({ layout: 'vertical', num1: 50, num2: 12, operator: '−' }),
      vertMul: mathToWords({ layout: 'vertical', num1: 7, num2: 8, operator: '×' }),
      vertDiv: mathToWords({ layout: 'vertical', num1: 45, num2: 5, operator: '÷' }),
      inlineMul: mathToWords({ layout: 'inline', expr: '9 × 6 = ?' }),
      inlineDiv: mathToWords({ layout: 'inline', expr: '56 ÷ 7' }),
      fraction: mathToWords({ expr: '3/4 of 32' }),
      sqrt: mathToWords({ expr: '√64' }),
      squared: mathToWords({ expr: '5^2' }),
      cubed: mathToWords({ expr: '2^3' })
    };
  });
  assert.equal(r.vertAdd, 'What is 24 plus 18?');
  assert.equal(r.vertSub, 'What is 50 minus 12?');
  assert.equal(r.vertMul, 'What is 7 times 8?');
  assert.equal(r.vertDiv, 'What is 45 divided by 5?');
  assert.equal(r.inlineMul, 'What is 9 times 6?');
  assert.equal(r.inlineDiv, 'What is 56 divided by 7?');
  assert.equal(r.fraction, 'What is 3 over 4 of 32?');
  assert.equal(r.sqrt, 'What is square root of 64?');
  assert.equal(r.squared, 'What is 5 squared?');
  assert.equal(r.cubed, 'What is 2 cubed?');
});

test('studyToWords translates study prompts and answer choices', async () => {
  const r = await page.evaluate(() => {
    const q1 = { q: 'Who gave the Gettysburg Address?' };
    const choices = ['George Washington', 'Abraham Lincoln', 'Thomas Jefferson', 'Theodore Roosevelt'];
    const mcq = studyToWords(q1, choices);
    const flashcard = studyToWords(q1);
    return { mcq, flashcard };
  });
  assert.equal(r.flashcard, 'Question: Who gave the Gettysburg Address?');
  assert.ok(r.mcq.includes('Choice 1: George Washington'));
  assert.ok(r.mcq.includes('Choice 2: Abraham Lincoln'));
  assert.ok(r.mcq.includes('Choice 3: Thomas Jefferson'));
  assert.ok(r.mcq.includes('Choice 4: Theodore Roosevelt'));
});

test('arena speaker button and settings read-aloud toggle', async () => {
  const r = await page.evaluate(() => {
    const arenaBtn = document.getElementById('arena-speak-btn');
    const readBtn = document.getElementById('read-aloud-btn');
    const initialText = readBtn ? readBtn.innerText : '';
    state.readAloud = false;
    toggleReadAloud();
    const turnedOn = state.readAloud;
    const onText = readBtn ? readBtn.innerText : '';
    toggleReadAloud();
    const turnedOff = state.readAloud;
    const offText = readBtn ? readBtn.innerText : '';
    return {
      hasArenaBtn: !!arenaBtn,
      hasReadBtn: !!readBtn,
      initialText,
      turnedOn,
      onText,
      turnedOff,
      offText
    };
  });
  assert.equal(r.hasArenaBtn, true);
  assert.equal(r.hasReadBtn, true);
  assert.equal(r.turnedOn, true);
  assert.ok(r.onText.includes('ON'));
  assert.equal(r.turnedOff, false);
  assert.ok(r.offText.includes('OFF'));
});

test('Study round displays read button and stops speech when answering', async () => {
  const r = await page.evaluate(async () => {
    let speechStopped = false;
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        cancel: () => { speechStopped = true; },
        speak: () => {}
      },
      configurable: true,
      writable: true
    });
    openStudy();
    const roundBefore = studyRound;
    studyStart('mcq');
    const roundAfter = !!studyRound;
    const studySpeakBtn = document.getElementById('study-speak-btn');
    const hasStudySpeak = !!studySpeakBtn;
    const opts = studyRound && studyRound.opts;
    if (opts && opts[0]) studyPickOpt(opts[0]);
    const stoppedOnAnswer = speechStopped;
    closeStudy();
    return { hasStudySpeak, stoppedOnAnswer };
  });
  assert.equal(r.hasStudySpeak, true);
  assert.equal(r.stoppedOnAnswer, true);
});
