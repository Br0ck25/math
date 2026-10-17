import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, loadWorker, fakeKV, openGame, call } from './helpers.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const bankFiles = fs.readdirSync(path.join(root, 'src/client/js')).filter((f) => /^37.*\.js$/.test(f)).sort();
const loadBank = () => new Function(src('src/shared/econ.js') + src('src/shared/study.js') + bankFiles.map((f) => src('src/client/js/' + f)).join('\n') + '; return { STUDY_BANK, STUDY_SUBJECTS, ECON, cleanStudyQ };')();

let browser, worker, env, page, errors;
before(async () => {
  browser = await launch();
  worker = await loadWorker();
  env = { MATH_KV: fakeKV() };
  ({ page, errors } = await openGame(browser, worker, env, { fast: true }));
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; checkForSecretLootDrop = function () {}; rollCatch = function () {}; });          // beating foes while studying must not open the vault or a loot window over the test
});
after(async () => { await browser.close(); });
const inPage = (fn, arg) => page.evaluate(fn, arg);

// ---------------------------------------------------------------- the question bank
test('every question in the study bank is well formed, and the bank holds only the KAAC test', () => {
  const { STUDY_BANK, STUDY_SUBJECTS, ECON } = loadBank();
  const ids = new Set(), texts = new Set(), bad = [];
  STUDY_BANK.forEach((q) => {
    if (ids.has(q.id)) bad.push('duplicate id ' + q.id);
    ids.add(q.id);
    if (texts.has(q.q.toLowerCase())) bad.push('duplicate question ' + q.id);
    texts.add(q.q.toLowerCase());
    if (!STUDY_SUBJECTS.some((s) => s.id === q.s)) bad.push(q.id + ' has an unknown subject');
    if (![6, 7, 8].includes(q.g)) bad.push(q.id + ' level must be 6, 7 or 8');
    if (!q.t || !q.q || q.q.length < 10 || q.q.length > 600) bad.push(q.id + ' question text');
    if (!q.a || q.a.length > 100) bad.push(q.id + ' answer must be 1-100 letters');
    if (/[<>]/.test(q.q + q.a + q.alt.join('') + q.x)) bad.push(q.id + ' has markup');
    if (q.alt.some((a) => !a || a.length > 60)) bad.push(q.id + ' alt');
    if (q.wrong.length && (q.wrong.length < 3 || q.wrong.some((w) => !w || w.length > 100) || q.wrong.map((w) => w.toLowerCase()).includes(q.a.toLowerCase()))) bad.push(q.id + ' wrong choices must be 3+ and differ from the answer');
    if (/[�-]|\s{2,}/.test(q.q + q.a + q.wrong.join(''))) bad.push(q.id + ' has garbled text');
    if (!ECON.study.parent.aMax) bad.push('econ');
  });
  assert.deepEqual(bad, []);
  assert.ok(STUDY_BANK.every((q) => q.t.indexOf('kaac') === 0 && /^(kaac|assess|quick)\d+$/.test(q.id)), 'the bank holds only KAAC practice questions, nothing written for the game');
  const count = (s) => STUDY_BANK.filter((q) => q.s === s).length;
  ['social', 'science', 'lang', 'arts', 'math'].forEach((s) => assert.ok(count(s) >= 100, s + ' has ' + count(s)));
  assert.equal(STUDY_BANK.length, 32 + 248 + 550, '2024 elementary test + 2025 district assessments + 2025 quick recall rounds');
  assert.ok(!STUDY_BANK.some((q) => /\b(shown here|seen here|pictured|shown below|the map shows|the table shows|the graph|the diagram|the figure)\b/i.test(q.q)), 'questions that come with a picture are left out');
});

test('ids follow the subject and position, so only appending is safe', async () => {
  const r = await inPage(() => STUDY_BANK.map((q) => q.id));
  const seen = {};
  r.forEach((id) => { const s = id.replace(/\d+$/, ''), n = +id.slice(s.length); seen[s] = (seen[s] || 0) + 1; assert.equal(n, seen[s], id + ' is out of order'); });
});

// ---------------------------------------------------------------- answers
test('typed answers: case, articles, commas, spaces and a slip of the finger are fine; wrong answers are not', async () => {
  const r = await inPage(() => {
    const q = { a: 'Mississippi River', alt: ['Mississippi'] }, n = { a: '1400', alt: ['1,400'] }, x = { a: 'x = 5', alt: [] }, e = { a: 'Ohio River', alt: [] };
    return [studyCheck(q, 'mississippi'), studyCheck(q, 'THE Mississippi River'), studyCheck(q, 'mississipi river'), studyCheck(q, 'Missouri River'), studyCheck(q, ''),
      studyCheck(n, '1,400'), studyCheck(n, '1400'), studyCheck(n, '1401'), studyCheck(x, 'x=5'), studyCheck(x, 'x = 6'), studyCheck(e, 'Ohio Rivr'), studyCheck({ a: 'Zeus', alt: [] }, 'Zeos')];
  });
  assert.deepEqual(r, [true, true, true, false, false, true, true, false, true, false, true, false], 'short words need an exact match, long ones allow one slip');
});

test('every question gives four different choices with exactly one right answer, and accepts its own answers', async () => {
  const bad = await inPage(() => {
    const out = [];
    STUDY_BANK.forEach((q) => {
      const c = studyChoices(q), sq = c.map(studySquash);
      const good = [q.a].concat(q.alt).map(studySquash);
      if (c.length !== 4 || new Set(sq).size !== 4 || c.indexOf(q.a) === -1) out.push(q.id + ' choices ' + JSON.stringify(c));
      if (c.filter((x) => good.indexOf(studySquash(x)) !== -1).length !== 1) out.push(q.id + ' more than one right choice');
      if (!studyCheck(q, q.a)) out.push(q.id + ' own answer');
      q.alt.forEach((a) => { if (!studyCheck(q, a)) out.push(q.id + ' alt ' + a); });
    });
    return out;
  });
  assert.deepEqual(bad, []);
});

// ---------------------------------------------------------------- a round
test('a Quick Recall round plays through the window, pays a little and shows the result', async () => {
  await inPage(() => { state.gems = 0; state.study.gems = 0; state.study.day = dayKey(); updateStatsUI(); });
  await page.click('#study-toggle');
  await page.waitForSelector('#study-box .study-go');
  assert.match(await page.innerText('#study-box'), /Quick Recall/);
  await page.click('text=Quick Recall');
  for (let i = 0; i < 8; i++) {
    const ans = await inPage(() => studyRound.qs[studyRound.i].a);
    assert.match(await page.innerText('.raid-chapter'), new RegExp('Question ' + (i + 1) + ' of 8', 'i'));
    await page.locator('#study-opts button').filter({ hasText: new RegExp('^' + ans.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).first().click();
    assert.match(await page.innerText('#study-fb'), /Correct/);
    assert.equal(await page.locator('#study-opts button.right').count(), 1);
    await page.click('#study-next');
  }
  assert.match(await page.innerText('#study-box'), /8 \/ 8/);
  assert.match(await page.innerText('#study-box'), /Perfect round/);
  const s = await inPage(() => ({ gems: state.gems, today: state.study.gems, stat: statDay().st, xp: getBuddyXp(state.activePet) }));
  assert.ok(s.gems >= 8 + 3, 'a gem per new right answer and a perfect-round bonus (and any foe beaten on the way)');
  assert.equal(s.today, 11);
  assert.deepEqual(s.stat, [8, 8], 'the parent report counts them');
  assert.ok(s.xp >= 16);
  await page.click('#study-box >> text=Back to math');
  assert.equal(await page.evaluate(() => document.querySelector('.game-container').classList.contains('study-on')), false);
  assert.ok(await page.isVisible('.arena'), 'the math problem is back');
});

test('study pays at most the daily cap, and a question that paid does not pay again for a few days', async () => {
  const r = await inPage(() => {
    const before = state.gems;
    for (let n = 0; n < 12; n++) { studyStart('mcq'); studyRound.qs.forEach((q) => { studyPickOpt(q.a); studyNext(); }); }
    const q = STUDY_BANK[0];
    const out = { gained: state.gems - before, today: state.study.gems, cap: ECON.study.dayCap };
    state.study.paid[q.id] = dayNumber();
    out.freshNow = studyFresh(q.id);
    state.study.paid[q.id] = dayNumber() - ECON.study.freshDays;
    out.freshLater = studyFresh(q.id);
    return out;
  });
  assert.equal(r.today, r.cap, 'stops at the daily limit');
  assert.equal(r.gained, r.cap - 11, 'only what was left of the cap');
  assert.equal(r.freshNow, false);
  assert.equal(r.freshLater, true);
});

test('tomorrow the cap starts over, and a round in the cap says so kindly', async () => {
  const r = await inPage(() => {
    state.study.day = '2000-01-01';
    studyDay();
    const reset = state.study.gems;
    state.study.gems = ECON.study.dayCap;
    studyScreen = 'card';
    studyStart('mcq'); studyRound.qs.forEach((q) => { studyPickOpt(q.a); studyNext(); });
    return { reset, text: document.getElementById('study-box').innerText, gems: state.study.gems };
  });
  assert.equal(r.reset, 0);
  assert.match(r.text, /limit of 20/);
  assert.match(r.text, /starts over tomorrow/);
  assert.equal(r.gems, 20);
  await inPage(() => closeStudy());
});

test('missed questions are remembered and come back first; right answers clear them', async () => {
  const r = await inPage(() => {
    state.study.miss = []; state.study.seen = {}; state.study.subjects = [];
    state.study.day = dayKey(); state.study.gems = 0;
    openStudy();
    studyStart('type');
    const q = studyRound.qs[0];
    document.getElementById('study-in').value = 'zzzz not it';
    studySubmitText();
    const out = { missed: state.study.miss.slice(), id: q.id, text: document.getElementById('study-fb').innerText };
    studyNext(); // moves on
    // new round: the missed one must be in it
    studyHome();
    studyStart('type');
    out.back = studyRound.qs.some((x) => x.id === q.id);
    const again = studyRound.qs.find((x) => x.id === q.id);
    while (studyRound.qs[studyRound.i].id !== q.id) { studyRound.i++; studyAsk(); }
    document.getElementById('study-in').value = again.a;
    studySubmitText();
    out.cleared = state.study.miss.indexOf(q.id) === -1;
    return out;
  });
  assert.deepEqual(r.missed, [r.id]);
  assert.match(r.text, /Good try/);
  assert.match(r.text, /come back/);
  assert.ok(r.back, 'a missed question is picked again');
  assert.ok(r.cleared);
  await inPage(() => closeStudy());
});

test('flashcards are self-marked: they train the remembering but pay nothing and are not in the parent report', async () => {
  const r = await inPage(() => {
    state.gems = 5; state.study.gems = 0; state.study.seen = {}; state.study.miss = [];
    const before = statDay().st ? statDay().st.slice() : null;
    openStudy();
    studyStart('cards');
    const ids = [];
    for (let i = 0; i < 8; i++) { ids.push(studyRound.qs[studyRound.i].id); studyReveal(); studyMark(i % 2 === 0); }
    const out = { gems: state.gems, before, after: statDay().st, seen: Object.keys(state.study.seen).length, miss: state.study.miss.length, text: document.getElementById('study-box').innerText };
    closeStudy();
    return out;
  });
  assert.equal(r.gems, 5);
  assert.deepEqual(r.after, r.before);
  assert.equal(r.seen, 8);
  assert.equal(r.miss, 4);
  assert.match(r.text, /do not earn gems/);
});

test('the parent report shows study answers by subject', async () => {
  const html = await inPage(() => {
    const d = dayKey();
    const days = { [d]: { s: 0, a: 0, ms: 60000, h: 0, w: 0, ops: {}, st: [10, 8], sub: { social: [6, 5], science: [4, 3] } } };
    return reportParts(days, { streak: 1, raids: 0, trophies: 0 }).study;
  });
  assert.match(html, /10 answered, 80% right/);
  assert.match(html, /Social studies/);
  assert.match(html, /83%/);
});

test('saved study data is repaired on load', async () => {
  const r = await inPage(() => {
    state.study = { level: 99, subject: 'zzz', seen: { '<script>': [1, 1, 1], kaac1: [-5, 'x', 3], bogus: 5, kaac2: [2, 1, 4], social12: [1, 0, 1], pAAAA: [1, 0, 1] }, miss: ['kaac1', 'kaac1', 'nope!', 5, 'social12'], paid: { kaac1: -4, kaac2: dayNumber() - 30, kaac3: dayNumber() }, day: 7, gems: 999, rounds: 'x' };
    normalizeState();
    return state.study;
  });
  assert.equal(r.level, 8, 'clamped to the top level');
  assert.deepEqual(r.subjects, []);
  assert.deepEqual(Object.keys(r.seen).sort(), ['kaac1', 'kaac2', 'pAAAA'], 'questions no longer in the bank are forgotten, a parent\'s are kept');
  assert.deepEqual(r.seen.kaac1, [0, 0, 3]);
  assert.deepEqual(r.miss, ['kaac1']);
  assert.deepEqual(Object.keys(r.paid), ['kaac3'], 'old rewards are forgotten');
  assert.equal(r.day, '');
  assert.equal(r.gems, 20);
  assert.equal(r.rounds, 0);
  assert.deepEqual(errors, []);
});

// ---------------------------------------------------------------- parent questions: the server
const dayStat = { s: 0, a: 0, ms: 0, h: 0, w: 0, ops: {}, st: [5, 4], sub: { social: [5, 4], 'bad id!': [1, 1] } };
const saveOf = () => ({ unlockedPets: ['dog'], gems: 1, grade: 2, stats: { days: { [new Date().toISOString().slice(0, 10)]: dayStat } } });
const setup = async () => {
  const e = { MATH_KV: fakeKV() };
  const c = (p, m, b, t) => call(worker, e, p, m, b, t);
  const kids = {};
  for (const n of ['kid_a', 'kid_b']) kids[n] = (await c('/api/register', 'POST', { name: n, password: 'secret1', state: saveOf() })).data.token;
  const mom = (await c('/api/parent/register', 'POST', { name: 'mom_one', password: 'secret1' })).data.token;
  const dad = (await c('/api/parent/register', 'POST', { name: 'dad_one', password: 'secret1' })).data.token;
  const link = async (kid, parent) => (await c('/api/parent/claim', 'POST', { code: (await c('/api/link/code', 'POST', {}, kids[kid])).data.code }, parent)).status;
  return { e, c, kids, mom, dad, link };
};
const Q = (q, a, extra = {}) => ({ s: 'social', q, a, ...extra });

test('a parent adds study questions for all their children; each child gets only their own', async () => {
  const { c, kids, mom, link } = await setup();
  assert.equal(await link('kid_a', mom), 200);
  assert.equal(await link('kid_b', mom), 200);
  const add = await c('/api/parent/study/add', 'POST', { children: ['kid_a', 'kid_b'], questions: [Q('What is the capital of France?', 'Paris', { alt: ['paris, france'], wrong: ['Rome', 'Madrid', 'Berlin'] }), Q('Who wrote Charlotte\'s Web?', 'E. B. White')] }, mom);
  assert.equal(add.status, 200);
  assert.deepEqual(add.data.results.kid_a, { added: 2, dup: 0, full: 0, total: 2 });
  assert.deepEqual(add.data.results.kid_b, { added: 2, dup: 0, full: 0, total: 2 });
  const a = (await c('/api/study', 'GET', null, kids.kid_a)).data.questions;
  assert.equal(a.length, 2);
  assert.match(a[0].id, /^p[A-Za-z0-9_-]{4,10}$/);
  assert.deepEqual([a[0].q, a[0].a, a[0].alt, a[0].wrong], ['What is the capital of France?', 'Paris', ['paris, france'], ['Rome', 'Madrid', 'Berlin']]);
  const ids = (await c('/api/study', 'GET', null, kids.kid_b)).data.questions.map((q) => q.id);
  assert.notEqual(ids[0], a[0].id, 'every child has their own copy');
  // the same question twice is not added twice
  const again = await c('/api/parent/study/add', 'POST', { children: ['kid_a'], questions: [Q('what is the capital of france?', 'Paris')] }, mom);
  assert.deepEqual(again.data.results.kid_a, { added: 0, dup: 1, full: 0, total: 2 });
  // remove one for one child
  const gone = await c('/api/parent/study/remove', 'POST', { children: ['kid_a'], ids: [a[0].id] }, mom);
  assert.equal(gone.data.results.kid_a.total, 1);
  assert.equal((await c('/api/study', 'GET', null, kids.kid_a)).data.questions.length, 1);
  assert.equal((await c('/api/study', 'GET', null, kids.kid_b)).data.questions.length, 2);
  const list = await c('/api/parent/study/list', 'POST', { children: ['kid_a', 'kid_b'] }, mom);
  assert.deepEqual(Object.keys(list.data.lists), ['kid_a', 'kid_b']);
  assert.equal((await c('/api/study', 'GET')).status, 401, 'only a signed-in player');
});

test('only the first parent can change a child\'s questions, and bad input is refused', async () => {
  const { c, kids, mom, dad, link } = await setup();
  await link('kid_a', mom);
  await link('kid_a', dad);
  await link('kid_b', dad);
  assert.equal((await c('/api/parent/study/add', 'POST', { children: ['kid_a'], questions: [Q('Is dad allowed to do this?', 'No')] }, dad)).status, 403, 'a second parent can only look');
  assert.equal((await c('/api/parent/study/add', 'POST', { children: ['kid_a', 'kid_b'], questions: [Q('Who may add questions to kid_a?', 'Mom')] }, mom)).data.results.kid_b, undefined, 'a child of another parent is not touched');
  assert.equal((await c('/api/parent/study/add', 'POST', { children: ['kid_b'], questions: [Q('Who may add questions to kid_b?', 'Dad')] }, dad)).status, 200, 'the first parent of kid_b is dad');
  assert.equal((await c('/api/parent/study/add', 'POST', { children: ['stranger'], questions: [Q('Nobody to receive this?', 'No')] }, mom)).status, 403);
  const bad = [[], [{ q: 'No answer here', a: '' }], [{ q: 'ab', a: 'x' }], [{ q: 'x'.repeat(201), a: 'x' }], [{ q: 'Answer too long here?', a: 'y'.repeat(61) }], [{ q: 'Too many extras here?', a: 'a', alt: ['1', '2', '3', '4'] }], [{ q: 'Control char here?', a: 'a\u0001b' }], ['text'], [null], [{ q: 'Not an array here?', a: 'a', wrong: 'x' }]];
  for (const questions of bad) assert.equal((await c('/api/parent/study/add', 'POST', { children: ['kid_a'], questions }, mom)).status, 400, JSON.stringify(questions));
  assert.equal((await c('/api/parent/study/add', 'POST', { children: ['kid_a'], questions: Array.from({ length: 51 }, (_, i) => Q('Question number ' + i + '?', 'a')) }, mom)).status, 400, 'at most 50 at a time');
  // a limit per child
  for (let b = 0; b < 3; b++) assert.equal((await c('/api/parent/study/add', 'POST', { children: ['kid_a'], questions: Array.from({ length: 50 }, (_, i) => Q('Filler question ' + b + '-' + i + '?', 'a')) }, mom)).status, 200);
  const full = await c('/api/parent/study/add', 'POST', { children: ['kid_a'], questions: [Q('One question too many?', 'a')] }, mom);
  assert.equal(full.data.results.kid_a.full, 1);
  assert.equal(full.data.results.kid_a.total, 150);
  // HTML is kept as plain text: the page shows it through escHtml and the server only ever returns JSON
  await c('/api/parent/study/remove', 'POST', { children: ['kid_a'], all: true }, mom);
  await c('/api/parent/study/add', 'POST', { children: ['kid_a'], questions: [Q('Is <b>this</b> bold?', '<i>no</i>')] }, mom);
  const q = (await c('/api/study', 'GET', null, kids.kid_a)).data.questions[0];
  assert.equal(q.q, 'Is <b>this</b> bold?');
});

test('study questions stop when the parent unlinks, is no longer first, or is deleted; the report carries study numbers', async () => {
  const { c, kids, mom, dad, link } = await setup();
  await link('kid_a', mom);
  await c('/api/parent/study/add', 'POST', { children: ['kid_a'], questions: [Q('Does this vanish on unlink?', 'Yes')] }, mom);
  const rows = (await c('/api/parent/kids', 'GET', null, mom)).data.kids;
  const day = Object.values(rows[0].days)[0];
  assert.deepEqual(day.st, [5, 4]);
  assert.deepEqual(day.sub, { social: [5, 4] }, 'only well-formed subject ids get through');
  assert.equal((await c('/api/study', 'GET', null, kids.kid_a)).data.questions.length, 1);
  await c('/api/parent/unlink', 'POST', { child: 'kid_a' }, mom);
  assert.deepEqual((await c('/api/study', 'GET', null, kids.kid_a)).data.questions, []);
  // linked again by dad: mom's old questions do not come back
  await link('kid_a', dad);
  assert.deepEqual((await c('/api/study', 'GET', null, kids.kid_a)).data.questions, []);
  // deleting the account removes what the parent wrote
  const { c: c2, kids: k2, mom: m2, link: l2, e } = await setup();
  await l2('kid_b', m2);
  await c2('/api/parent/study/add', 'POST', { children: ['kid_b'], questions: [Q('Will deletion clean this up?', 'Yes')] }, m2);
  assert.ok(await e.MATH_KV.get('pq:kid_b'));
  await c2('/api/parent/delete', 'POST', { password: 'secret1' }, m2);
  assert.equal(await e.MATH_KV.get('pq:kid_b'), null);
  assert.deepEqual((await c2('/api/study', 'GET', null, k2.kid_b)).data.questions, []);
});

// ---------------------------------------------------------------- parent questions: the parent page and the child's device
test('a parent adds questions to all their children on the parent page, and the child studies them', async () => {
  const { e, c, kids, mom, link } = await setup();
  await link('kid_a', mom);
  await link('kid_b', mom);
  const m = await openGame(browser, worker, e, { fast: true, init: `localStorage.setItem('math_quest_parent', JSON.stringify({ name: 'mom_one', token: '${mom}' }))` });
  await m.page.goto('http://localhost/parent');
  await m.page.waitForSelector('#portal-study');
  await m.page.click('#portal-study > summary');
  await m.page.waitForSelector('#pstudy-kids input[data-pqkid]');
  assert.equal(await m.page.locator('#pstudy-kids input:checked').count(), 2, 'every child is ticked to start with');
  await m.page.selectOption('#pstudy-s', 'science');
  await m.page.fill('#pstudy-q', 'What gas do plants take in?');
  await m.page.fill('#pstudy-a', 'Carbon dioxide');
  await m.page.fill('#pstudy-alt', 'CO2; carbon dioxide gas');
  await m.page.fill('#pstudy-wrong', 'Oxygen; Nitrogen; Helium');
  await m.page.click('text=Add question');
  await m.page.waitForFunction(() => /kid_a: 1 added/.test(document.getElementById('pstudy-msg').innerText));
  assert.match(await m.page.innerText('#pstudy-msg'), /kid_b: 1 added/);
  assert.match(await m.page.innerText('#pstudy-lists'), /What gas do plants take in\?/);
  // only one child this time, with the bulk box
  await m.page.click('text=None');
  await m.page.check('#pstudy-kids input[data-pqkid="kid_b"]');
  await m.page.click('summary:has-text("Add many at once")');
  await m.page.fill('#pstudy-bulk', 'What is 7 x 8? | 56\nCapital of France? | Paris | paris, france | Rome; Madrid; Berlin\n');
  await m.page.click('text=Add all lines');
  await m.page.waitForFunction(() => /kid_b: 2 added/.test(document.getElementById('pstudy-msg').innerText));
  assert.equal((await c('/api/study', 'GET', null, kids.kid_a)).data.questions.length, 1);
  assert.equal((await c('/api/study', 'GET', null, kids.kid_b)).data.questions.length, 3);
  await m.page.fill('#pstudy-bulk', 'only a question with no answer');
  await m.page.click('text=Add all lines');
  assert.match(await m.page.innerText('#pstudy-msg'), /Line 1: each question needs/);
  // remove one
  await m.page.locator('#pstudy-lists button[aria-label*="kid_b"]').first().click();
  await m.page.waitForFunction(() => /Removed/.test(document.getElementById('pstudy-msg').innerText));
  assert.equal((await c('/api/study', 'GET', null, kids.kid_b)).data.questions.length, 2);
  assert.deepEqual(m.errors, []);

  // the child's device, signed in as kid_b, shows them and mixes them into a round
  const k = await openGame(browser, worker, e, { fast: true });
  const tok = kids.kid_b;
  await k.page.evaluate(([n, t]) => { startSession(n, t, 1); }, ['kid_b', tok]);
  await k.page.evaluate(() => openStudy());
  await k.page.waitForFunction(() => studyParent().length === 2);
  await k.page.waitForFunction(() => /From my parent/.test(document.getElementById('study-box').innerText));
  await k.page.click('text=From my parent');
  assert.match(await k.page.innerText('.study-stats'), /^2 questions/);
  await k.page.click('text=Quick Recall');
  const first = await k.page.evaluate(() => ({ q: studyRound.qs[0].q, parent: !!studyRound.qs[0].parent, opts: studyRound.opts.length }));
  assert.ok(first.parent);
  assert.equal(first.opts, 4);
  assert.match(await k.page.innerText('.raid-chapter'), /from your parent/i);
  // a different player on the same device never sees them
  await k.page.evaluate(() => { startSession('kid_a', 'x', 1); });
  assert.equal(await k.page.evaluate(() => studyParent().length), 0);
  // signing out forgets them
  await k.page.evaluate(([n, t]) => { startSession(n, t, 1); }, ['kid_b', tok]);
  assert.equal(await k.page.evaluate(() => studyParent().length), 2);
  await k.page.evaluate(() => { setParentQs([], ''); });
  assert.equal(await k.page.evaluate(() => localStorage.getItem('math_quest_pq')), null);
  assert.deepEqual(k.errors.filter((x) => !/401/.test(x)), []);
  await m.context.close(); await k.context.close();
});

test('a parent can show a child only their own questions; it needs questions, applies to the ticked children and stops with the link', async () => {
  const { c, kids, mom, dad, link } = await setup();
  await link('kid_a', mom);
  await link('kid_b', mom);
  await link('kid_a', dad);
  assert.equal((await c('/api/study', 'GET', null, kids.kid_a)).data.only, false);
  assert.equal((await c('/api/parent/study/only', 'POST', { children: ['kid_a'], only: 'yes' }, mom)).status, 400);
  assert.equal((await c('/api/parent/study/only', 'POST', { children: ['kid_a'], only: true }, dad)).status, 403, 'a second parent can only look');
  const r = await c('/api/parent/study/only', 'POST', { children: ['kid_a'], only: true }, mom);
  assert.equal(r.status, 200);
  await c('/api/parent/study/add', 'POST', { children: ['kid_a', 'kid_b'], questions: [Q('Does the flag survive adding questions?', 'Yes')] }, mom);
  assert.equal((await c('/api/study', 'GET', null, kids.kid_a)).data.only, true, 'adding questions keeps the choice');
  assert.equal((await c('/api/study', 'GET', null, kids.kid_b)).data.only, false, 'only the ticked child');
  const list = await c('/api/parent/study/list', 'POST', { children: ['kid_a', 'kid_b'] }, mom);
  assert.deepEqual(list.data.only, { kid_a: true, kid_b: false });
  await c('/api/parent/study/only', 'POST', { children: ['kid_a'], only: false }, mom);
  assert.equal((await c('/api/study', 'GET', null, kids.kid_a)).data.only, false);
  await c('/api/parent/study/only', 'POST', { children: ['kid_a'], only: true }, mom);
  await c('/api/parent/unlink', 'POST', { child: 'kid_a' }, mom);
  assert.deepEqual((await c('/api/study', 'GET', null, kids.kid_a)).data, { questions: [], only: false });
});

test('with "only my questions" the child sees just those: no built-in subjects, no level row', async () => {
  const r = await inPage(() => {
    startSession('kid_x', 'tok', 1);
    setParentQs([{ id: 'pAAAA', s: 'science', q: 'What gas do plants take in?', a: 'Carbon dioxide' }, { id: 'pBBBB', s: 'social', q: 'Who lives at the north pole?', a: 'Santa' }], 'kid_x', true);
    state.study.subjects = ['ky'];
    openStudy();
    const out = { pool: studyPool('all', 8).map((q) => q.id), html: document.getElementById('study-box').innerText, filters: studyFilters().map((f) => f[0]) };
    setParentQs([], 'kid_x', true);
    out.emptyFallsBack = studyPool('all', 6).length === 830;
    setParentQs([{ id: 'pAAAA', s: 'science', q: 'What gas do plants take in?', a: 'Carbon dioxide' }], 'kid_x', false);
    out.mixed = studyPool('all', 6).length === 831;
    closeStudy();
    acct = null; persistAcct();
    return out;
  });
  assert.deepEqual(r.pool, ['pAAAA', 'pBBBB']);
  assert.match(r.html, /practise their own questions/);
  assert.doesNotMatch(r.html, /Level\b/i);
  assert.deepEqual(r.filters, ['all', 'social', 'science']);
  assert.ok(r.emptyFallsBack, 'with no questions of theirs the built-in ones come back');
  assert.ok(r.mixed);
});

test('the parent page always shows the study section, and says what to do first when no child lets this parent add questions', async () => {
  const e = { MATH_KV: fakeKV() };
  const tok = (await call(worker, e, '/api/parent/register', 'POST', { name: 'solo_mom', password: 'secret1' })).data.token;
  const m = await openGame(browser, worker, e, { fast: true, init: `localStorage.setItem('math_quest_parent', JSON.stringify({ name: 'solo_mom', token: '${tok}' }))` });
  await m.page.goto('http://localhost/parent');
  await m.page.waitForSelector('#portal-study');
  await m.page.click('#portal-study > summary');
  assert.match(await m.page.innerText('#portal-study'), /Add a child first/);
  await m.context.close();
});

test('Study takes the place of the math problem and keypad on the main page, and the bottom-bar button switches back', async () => {
  // the earlier tests beat foes, so a loot window may be open: clear every window first
  await inPage(() => { Array.prototype.forEach.call(document.querySelectorAll('.modal-overlay'), (m) => { m.style.display = 'none'; }); modalQueue.length = 0; modalBusy = false; if (studyOn) closeStudy(); });
  assert.ok(await page.isVisible('.arena'));
  assert.ok(await page.isVisible('.keypad'));
  assert.equal(await page.locator('#study-pane').isVisible(), false);
  await page.click('#study-toggle');
  assert.equal(await page.locator('.arena').isVisible(), false);
  assert.equal(await page.locator('.keypad').isVisible(), false);
  assert.ok(await page.isVisible('#study-pane'));
  assert.equal(await page.isVisible('.top-bar'), true, 'the buddy and the top bars stay');
  assert.match(await page.innerText('#study-toggle'), /Math/);
  // no math keys while studying: digits and Enter do nothing to the math problem
  const before = await inPage(() => ({ input: userInput, attempts: state.records.attempts }));
  await inPage(() => document.activeElement.blur());      // the toggle button was just tapped: Enter would press it again
  await page.keyboard.press('5');
  await page.keyboard.press('Enter');
  assert.deepEqual(await inPage(() => ({ input: userInput, attempts: state.records.attempts })), before);
  // Escape goes back from a round to the start, then to the math problem
  await page.click('text=Quick Recall');
  await page.keyboard.press('Escape');
  assert.match(await page.innerText('#study-box'), /Round paused/);
  await page.keyboard.press('Escape');
  assert.ok(await page.isVisible('.arena'));
  assert.match(await page.innerText('#study-toggle'), /Study/);
});

test('several subjects can be studied together; All clears the choice; old saves keep their one subject', async () => {
  const r = await inPage(() => {
    startSession('kid_x', 'tok', 1);
    setParentQs([{ id: 'pAAAA', s: 'science', q: 'What gas do plants take in?', a: 'Carbon dioxide' }, { id: 'pBBBB', s: 'social', q: 'Who lives at the north pole?', a: 'Santa' }], 'kid_x', false);
    state.study.subjects = []; state.study.level = 8;
    openStudy();
    const click = (id) => { studySetFilter(id); };
    const ids = () => studyPool(studySelected(), 8).map((q) => q.s);
    click('science'); click('arts');
    const both = new Set(ids());
    const pressed = [...document.querySelectorAll('#study-box .study-chips:not(.study-levels) .active')].map((b) => b.innerText.replace(/\d+$/, '').trim());
    click('science');
    const one = new Set(ids());
    click('social');
    const three = [...new Set(ids())].sort();
    studyStart('mcq');
    const roundSubjects = new Set(studyRound.qs.map((q) => q.s));
    studyHome();
    click('all');
    const cleared = state.study.subjects.length;
    closeStudy();
    // an older save kept a single subject
    state.study = Object.assign(state.study, { subject: 'arts', subjects: [] });
    normalizeState();
    const out = { both: [...both].sort(), pressed, one: [...one], three, roundOk: [...roundSubjects].every((x) => ['arts', 'social'].includes(x)), cleared, migrated: state.study.subjects, gone: 'subject' in state.study };
    acct = null; persistAcct(); setParentQs([], '');
    return out;
  });
  assert.deepEqual(r.both, ['arts', 'science']);
  assert.equal(r.pressed.length, 2);
  assert.deepEqual(r.one, ['arts']);
  assert.deepEqual(r.three, ['arts', 'social']);
  assert.ok(r.roundOk);
  assert.equal(r.cleared, 0);
  assert.deepEqual(r.migrated, ['arts']);
  assert.equal(r.gone, false);
});

test('the study pane fits phones: nothing sideways, and it stays above the bottom bar, at the start and in a round', async () => {
  for (const [w, h] of [[320, 568], [360, 640], [375, 548], [420, 800]]) {
    const g = await openGame(browser, worker, env, { viewport: { width: w, height: h }, fast: true });
    await g.page.click('#study-toggle');
    const check = async (label) => {
      const o = await g.page.evaluate(() => {
        const pane = document.getElementById('study-pane').getBoundingClientRect(), bar = document.querySelector('.bottom-bar').getBoundingClientRect();
        return { sideways: document.documentElement.scrollWidth > innerWidth + 1 || document.getElementById('study-pane').scrollWidth > document.getElementById('study-pane').clientWidth + 1, overlap: pane.bottom > bar.top + 1, tall: pane.height };
      });
      assert.equal(o.sideways, false, w + 'x' + h + ' ' + label + ' sideways scroll');
      assert.equal(o.overlap, false, w + 'x' + h + ' ' + label + ' overlaps the bottom bar');
      assert.ok(o.tall > 120, w + 'x' + h + ' ' + label + ' pane has room');
    };
    await check('start');
    await g.page.click('text=Quick Recall');
    await g.page.evaluate(() => { studyRound.qs[0].q = 'A very long question that wraps over several lines on a small phone screen to test how things fit?'; studyAsk(); });
    await check('question');
    await g.page.evaluate(() => { const r = studyRound; studyPickOpt(r.opts.find((o) => o !== r.qs[r.i].a)); });
    await check('answered');
    assert.ok(await g.page.locator('#study-next').isVisible(), 'the Next button can be reached');
    await g.context.close();
  }
});

test('the KAAC 2024 district arts test is in word for word (32 questions, no picture ones) and Study credits KAAC', async () => {
  const { STUDY_BANK } = loadBank();
  const k = STUDY_BANK.filter((q) => q.t === 'kaac');
  assert.equal(k.length, 32);
  assert.ok(k.every((q) => q.s === 'arts' && q.wrong.length === 3));
  assert.equal(k.find((q) => /Fonteyn/.test(q.q)).a, 'Rudolf Nureyev');
  assert.equal(k.find((q) => /Schubert/.test(q.q)).a, 'x-1, y-2, z-3');
  assert.equal(k.find((q) => /athlete/.test(q.q)).a, 'x-3, y-2, z-1');
  assert.ok(!k.some((q) => /seen here|shown here|pictured here/.test(q.q)), 'picture questions are left out');
  const credit = await inPage(() => { state.study.subjects = ['arts']; state.study.level = 8; if (studyOn) closeStudy(); openStudy(); const t = document.getElementById('study-box').innerText; closeStudy(); return t; });
  assert.match(credit, /Kentucky Association for Academic Competition \(KAAC\), used with permission/);
  const other = await inPage(() => {
    startSession('kid_x', 'tok', 1);
    setParentQs([{ id: 'pAAAA', s: 'science', q: 'What gas do plants take in?', a: 'Carbon dioxide' }], 'kid_x', true);
    state.study.subjects = []; openStudy();
    const t = document.getElementById('study-box').innerText;
    closeStudy(); acct = null; persistAcct(); setParentQs([], '');
    return t;
  });
  assert.doesNotMatch(other, /Kentucky Association/, 'no credit when none of their questions are in the mix');
});

test('study answers fight like math answers: right hits the foe, wrong hurts your buddy, shields, fainting and victory all work', async () => {
  const g = await openGame(browser, worker, env, { fast: true });
  const p = g.page;
  const ev = (fn, arg) => p.evaluate(fn, arg);
  await ev(() => { rollCatch = function () {}; checkForSecretLootDrop = function () {}; startGoldenVault = function () { modalDone(); }; openStudy(); studyStart('mcq'); });
  const answer = (right) => ev((right) => {
    const r = studyRound, q = r.qs[r.i];
    studyPickOpt(right ? q.a : r.opts.find((o) => o !== q.a));
    return studyRound.results.length;
  }, right);
  const next = () => ev(() => { studyNext(); return studyRound ? studyRound.i : -1; });

  // a right answer hits the foe, and the popup shows (it lives in the study pane while the math area is hidden)
  const hp0 = await ev(() => monsterCurrentHp);
  await answer(true);
  await p.waitForFunction((h) => monsterCurrentHp < h, hp0);
  assert.match(await ev(() => document.getElementById('study-popup').innerText), /\S/);
  assert.equal(await ev(() => state.streak), 1);
  assert.equal(await ev(() => ultimateCharge), 1, 'a right answer charges energy');
  await next();

  // a wrong answer lets the foe hit your buddy and ends the combo
  const pet = await ev(() => state.activePet), php0 = await ev((id) => getPetHp(id), pet);
  await answer(false);
  await p.waitForFunction(([id, h]) => getPetHp(id) < h, [pet, php0]);
  assert.equal(await ev(() => state.streak), 0);
  assert.match(await ev(() => document.getElementById('study-fb').innerText), /Good try/);
  await next();

  // a streak shield soaks up one wrong answer
  await ev(() => { state.shields = 1; });
  const php1 = await ev((id) => getPetHp(id), pet);
  await answer(false);
  await p.waitForTimeout(400);
  assert.equal(await ev(() => state.shields), 0);
  assert.equal(await ev((id) => getPetHp(id), pet), php1, 'no damage while the shield holds');
  await next();

  // a fainted fighter cannot answer until a teammate is sent in
  await ev(() => { state.unlockedPets.push('cat'); state.team = ['cat']; state.faintedPets = [state.activePet]; updateStatsUI(); studyRender(); });
  assert.match(await ev(() => document.getElementById('study-box').innerText), /needs rest/);
  const before = await ev(() => studyRound.results.length);
  await ev(() => { studyPickOpt(studyRound.opts[0]); });
  assert.equal(await ev(() => studyRound.results.length), before, 'the answer is not taken');
  await ev(() => { sendInReplacement('cat'); });
  assert.doesNotMatch(await ev(() => document.getElementById('study-box').innerText), /needs rest/);
  assert.equal(await ev(() => state.activePet), 'cat');
  await answer(true);
  await next();

  // beating the foe: the same victory as in math (a boss counts, the next foe appears)
  await ev(() => { monsterCurrentHp = 1; });
  const wins0 = await ev(() => state.monstersDefeated + state.wild.since);
  await answer(true);
  await p.waitForFunction((w) => state.monstersDefeated + state.wild.since > w, wins0, { timeout: 10000 });
  assert.deepEqual(g.errors, []);

  // flashcards are self-marked, so they never hit anything
  await p.waitForFunction(() => monsterCurrentHp > 0);
  await p.waitForTimeout(500);                                   // the next foe has arrived and everything has settled
  const hpF = await ev(() => { studyHome(); studyStart('cards'); const h = monsterCurrentHp; for (let i = 0; i < 4; i++) { studyReveal(); studyMark(true); } return h; });
  await p.waitForTimeout(500);
  assert.equal(await ev(() => monsterCurrentHp), hpF);
  await g.context.close();
});

// ---------------------------------------------------------------- wrong answers on the parent page, collapsible children
const seenSave = (extra = {}) => ({ unlockedPets: ['dog'], gems: 5, grade: 2, study: { seen: { kaac1: [1, 3, 5], assess5: [4, 0, 5], quick9: [0, 1, 5], pAAAA: [2, 2, 5], 'bad id!': [1, 1, 1] } }, ...extra });

test('the report to a parent lists the study questions a child got wrong, most often first, and how many times', async () => {
  const e = { MATH_KV: fakeKV() };
  const c = (p, m, b, t) => call(worker, e, p, m, b, t);
  const kid = (await c('/api/register', 'POST', { name: 'kid_m', password: 'secret1', state: seenSave() })).data.token;
  const mom = (await c('/api/parent/register', 'POST', { name: 'mom_m', password: 'secret1' })).data.token;
  await c('/api/parent/claim', 'POST', { code: (await c('/api/link/code', 'POST', {}, kid)).data.code }, mom);
  const k = (await c('/api/parent/kids', 'GET', null, mom)).data.kids[0];
  assert.deepEqual(k.studyMissed, [['kaac1', 3, 1], ['pAAAA', 2, 2], ['quick9', 1, 0]], 'wrong-count first; only well-formed ids; questions never missed are left out');
  assert.equal(k.studyMissedCount, 3);
});

test('the parent page shows which study questions were missed and how often, and children fold up so ten of them do not mean endless scrolling', async () => {
  const e = { MATH_KV: fakeKV() };
  const c = (p, m, b, t) => call(worker, e, p, m, b, t);
  const mom = (await c('/api/parent/register', 'POST', { name: 'mom_big', password: 'secret1' })).data.token;
  for (const n of ['kid_a1', 'kid_b1', 'kid_c1', 'kid_d1']) {
    const t = (await c('/api/register', 'POST', { name: n, password: 'secret1', state: n === 'kid_a1' ? seenSave() : { unlockedPets: ['dog'], gems: 1 } })).data.token;
    await c('/api/parent/claim', 'POST', { code: (await c('/api/link/code', 'POST', {}, t)).data.code }, mom);
  }
  const m = await openGame(browser, worker, e, { fast: true, init: `localStorage.setItem('math_quest_parent', JSON.stringify({ name: 'mom_big', token: '${mom}' }))` });
  await m.page.goto('http://localhost/parent');
  await m.page.waitForFunction(() => document.querySelectorAll('details.portal-kid').length === 4);
  assert.equal(await m.page.locator('details.portal-kid[open]').count(), 0, 'with more than three children they start folded');
  assert.match(await m.page.innerText('#kid-0 > summary'), /kid_a1.*3 missed/s, 'the name bar says how many questions are being missed');
  assert.ok(await m.page.locator('#kid-1 > summary').isVisible());
  // open one by tapping its name bar
  await m.page.click('#kid-0 > summary');
  assert.equal(await m.page.locator('details.portal-kid[open]').count(), 1);
  await m.page.click('#kid-0 details.portal-more summary:has-text("answered wrong (3)")');
  const text = await m.page.innerText('#kid-0 details.portal-more');
  assert.match(text, /wrong 3 times · ✅ right 1/);
  assert.match(text, /wrong 1 time ·/);
  assert.match(text, /Answer: /);
  // it stays open when the page refreshes its list
  await m.page.click('button:has-text("Refresh")');
  await m.page.waitForFunction(() => document.querySelectorAll('details.portal-kid').length === 4);
  assert.equal(await m.page.locator('#kid-0[open]').count(), 1);
  // open all / close all / a jump button opens the one it goes to
  await m.page.click('text=Open all');
  assert.equal(await m.page.locator('details.portal-kid[open]').count(), 4);
  await m.page.click('text=Close all');
  assert.equal(await m.page.locator('details.portal-kid[open]').count(), 0);
  await m.page.click('.portal-nav-btn:has-text("kid_c1")');
  assert.equal(await m.page.locator('#kid-2[open]').count(), 1);
  assert.equal(await m.page.locator('details.portal-kid[open]').count(), 1);
  assert.deepEqual(m.errors, []);
  await m.context.close();

  // the child's own parent report has the same list
  const g = await openGame(browser, worker, e, { fast: true });
  const own = await g.page.evaluate(() => { state.study.seen = { kaac1: [1, 3, 5], assess5: [4, 0, 5] }; openParent(); parentUnlocked = true; renderParent(); return document.getElementById('par-study').innerText; });
  assert.match(own, /answered wrong \(1\)/i);
  await g.context.close();
});

// ---------------------------------------------------------------- trivia mode: Study changes the whole game
test('trivia mode: the Kingdom, settings, practice row and weak point change with Study, and switch back with Math', async () => {
  const g = await openGame(browser, worker, env, { fast: true });
  const p = g.page, ev = (fn, arg) => p.evaluate(fn, arg);
  const shown = (sel) => ev((s) => { const el = document.querySelector(s); return !!el && getComputedStyle(el).display !== 'none'; }, sel);
  // math mode
  await ev(() => { renderMap(); });
  assert.match(await ev(() => document.getElementById('map-title').innerText), /Number Kingdom Map/);
  assert.equal(await shown('#grade-grid'), true);
  assert.equal(await shown('.trivia-only'), false);
  assert.match(await ev(() => document.getElementById('grade-chip').innerText), /📚 /);
  assert.match(await ev(() => getWeakOp() && document.getElementById('weak-chip').innerText), /Weak/);
  const mathWeak = await ev(() => document.getElementById('weak-chip').innerText);
  // trivia mode
  await ev(() => { openStudy(); renderMap(); });
  assert.equal(await ev(() => document.body.classList.contains('trivia')), true);
  assert.match(await ev(() => document.getElementById('map-title').innerText), /Trivia Kingdom Map/);
  assert.equal(await ev(() => triviaWords('The Number Kingdom is saved. Number King Nova bows.')), 'The Trivia Kingdom is saved. Trivia King Nova bows.');
  assert.equal(await shown('.math-only'), false, 'grade level and math types are not shown');
  assert.equal(await shown('.trivia-only'), true);
  assert.match(await ev(() => document.getElementById('grade-chip').innerText), /Trivia/);
  const weak = await ev(() => document.getElementById('weak-chip').innerText);
  assert.match(weak, /Weak: .*(Social studies|Science|Language arts|Arts|Math facts)/);
  assert.notEqual(weak, mathWeak);
  // the story windows use the Kingdom's new name too
  await ev(() => { showStoryModal({ chapter: 'The Number Kingdom', title: 'The Number Kingdom Map', panels: [{ icon: '🏰', text: 'The Number Kingdom was peaceful.' }], btn: 'Go' }); });
  assert.match(await ev(() => document.getElementById('raid-title').innerText + document.getElementById('raid-panels').innerText), /Trivia Kingdom Map[\s\S]*Trivia Kingdom was peaceful/);
  await ev(() => { document.getElementById('raid-modal').style.display = 'none'; closeStudy(); renderMap(); });
  assert.match(await ev(() => document.getElementById('map-title').innerText), /Number Kingdom Map/);
  assert.equal(await shown('.math-only'), true);
  assert.equal(await ev(() => document.getElementById('weak-chip').innerText), mathWeak);
  await g.context.close();
});

test('trivia mode: the Cup, both kinds of duel and the vault ask study questions, and never a parent\'s own', async () => {
  const g = await openGame(browser, worker, env, { fast: true });
  const p = g.page, ev = (fn, arg) => p.evaluate(fn, arg);
  await ev(() => { checkForSecretLootDrop = function () {}; });
  // math mode: numbers
  assert.equal(await ev(() => typeof makeMcq().ans), 'number');
  await ev(() => { startSession('kid_t', 'tok', 1); setParentQs([{ id: 'pZZZZ', s: 'social', q: 'What does the parent ask?', a: 'Something private' }], 'kid_t', true); openStudy(); });
  // words, four distinct choices with the answer, and never the parent's question or answer
  const draws = await ev(() => { const out = []; for (let i = 0; i < 300; i++) { const q = makeMcq(); out.push({ study: !!q.study, parent: !!q.study && !!q.study.parent, four: q.opts.length === 4 && new Set(q.opts).size === 4 && q.opts.indexOf(q.ans) !== -1, leak: q.opts.concat(q.expr).some((t) => /Something private|parent ask/.test(t)), word: typeof q.ans === 'string', html: q.html === escHtml(q.expr) }); } return out; });
  assert.ok(draws.every((d) => d.study && !d.parent && d.four && !d.leak && d.word && d.html));
  // the Cup (tournament): a right pick is judged on the words
  await ev(() => { tourStart(); });
  const t = await ev(() => ({ eq: document.getElementById('tour-eq').innerText, same: document.getElementById('tour-eq').innerText === tour.q.expr, btns: document.querySelectorAll('#tour-opts button').length, ans: tour.answer }));
  assert.equal(t.same, true);
  assert.equal(t.btns, 4);
  const hp = await ev(() => tour.foes.foes[tour.foe].hp);
  await ev(() => { tourAnswer(tour.answer); });
  assert.ok((await ev(() => tour.foes.foes[0].hp)) < hp || (await ev(() => tour.foe)) > 0, 'a right answer hurt the trainer\'s buddy');
  assert.match(await ev(() => document.getElementById('tour-log').innerText), /✅/);
  await ev(() => { tourQuit(); });
  // the same-room duel
  await ev(() => { duelStart(true); duel.started = true; });
  const d = await ev(() => ({ study: duel.qs.every((q) => q.study), n: duel.qs.length, distinct: new Set(duel.qs.map((q) => q.expr)).size }));
  assert.ok(d.study);
  assert.ok(d.distinct >= d.n - 1, 'questions are not repeated');
  await ev(() => { duelAnswer(0, duel.qs[0].ans); });
  assert.equal(await ev(() => duel.p[0].score), 1);
  await ev(() => { duelAnswer(1, duel.qs[0].opts.find((o) => o !== duel.qs[0].ans)); });
  assert.equal(await ev(() => duel.p[1].score), 0);
  await ev(() => { duelQuit(); });
  // the golden vault: three choices, right is +2
  await ev(() => { startGoldenVault(); clearInterval(vaultTimerInterval); });
  const v = await ev(() => ({ eq: document.getElementById('vault-eq').innerText, buttons: document.querySelectorAll('#vault-options button').length, word: typeof vaultCurrentAnswer }));
  assert.equal(v.buttons, 3);
  assert.equal(v.word, 'string');
  await ev(() => { handleVaultGuess(vaultCurrentAnswer); });
  assert.equal(await ev(() => vaultGemsEarned), 2);
  await ev(() => { document.getElementById('vault-modal').style.display = 'none'; acct = null; persistAcct(); setParentQs([], ''); });
  assert.deepEqual(g.errors.filter((x) => !/401/.test(x)), [], 'the made-up sign-in is turned away by the server, nothing else goes wrong');
  await g.context.close();
});

test('online duels can carry trivia questions: the server checks and scores them, and never sends the answers', async () => {
  const e = { MATH_KV: fakeKV() };
  const c = (p, m, b, t) => call(worker, e, p, m, b, t);
  const a = (await c('/api/register', 'POST', { name: 'duel_a', password: 'secret1', state: { gems: 100 } })).data.token;
  const b = (await c('/api/register', 'POST', { name: 'duel_b', password: 'secret1', state: { gems: 100 } })).data.token;
  const qs = Array.from({ length: 5 }, (_, i) => ({ t: 't', e: 'Which one is question "' + i + '"? <b>&</b>', l: '', o: ['red', 'blue', 'green', 'quote " here'], a: i % 2 ? 'blue' : 'quote " here' }));
  const made = await c('/api/duel/create', 'POST', { to: 'duel_b', stake: 0, qs }, a);
  assert.equal(made.status, 200);
  const got = await c('/api/duel/get?id=' + made.data.id, 'GET', null, b);
  assert.equal(got.data.duel.qs[0].t, 't');
  assert.equal(got.data.duel.qs[0].e, qs[0].e, 'text is kept exactly (the page shows it as text)');
  assert.ok(!JSON.stringify(got.data).includes('"a":'), 'the answers stay on the server');
  const done = await c('/api/duel/submit', 'POST', { id: made.data.id, answers: qs.map((q, i) => i < 3 ? q.a : 'red'), ms: 5000 }, b);
  assert.equal(done.data.summary.mine.score, 3);
  // not valid: the answer is not one of the choices, a repeated choice, a control character, too many choices, a mixed bag
  const bad = [
    { ...qs[0], a: 'purple' }, { ...qs[0], o: ['red', 'red', 'blue'] }, { ...qs[0], e: 'bell\u0007' }, { ...qs[0], o: ['a', 'b', 'c', 'd', 'e'] }, { ...qs[0], e: 'x'.repeat(521) }, { ...qs[0], o: ['red'] }
  ];
  for (const q of bad) assert.equal((await c('/api/duel/create', 'POST', { to: 'duel_b', stake: 0, qs: [q, ...qs.slice(1)] }, a)).status, 400, JSON.stringify(q).slice(0, 80));
  // the math duels still work as before
  const math = Array.from({ length: 5 }, () => ({ e: '2 + 2', l: '=', o: [3, 4, 5], a: 4 }));
  assert.equal((await c('/api/duel/create', 'POST', { to: 'duel_b', stake: 0, qs: math }, a)).status, 200);
});
