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
});
after(async () => { await browser.close(); });
const inPage = (fn, arg) => page.evaluate(fn, arg);

// ---------------------------------------------------------------- the question bank
test('the study bank is complete, original in layout and sized for grades 6-8', () => {
  const { STUDY_BANK, STUDY_SUBJECTS, ECON } = loadBank();
  const ids = new Set(), texts = new Set(), bad = [];
  STUDY_BANK.forEach((q) => {
    if (ids.has(q.id)) bad.push('duplicate id ' + q.id);
    ids.add(q.id);
    if (texts.has(q.q.toLowerCase())) bad.push('duplicate question ' + q.id);
    texts.add(q.q.toLowerCase());
    if (!STUDY_SUBJECTS.some((s) => s.id === q.s)) bad.push(q.id + ' has an unknown subject');
    if (![6, 7, 8].includes(q.g)) bad.push(q.id + ' level must be 6, 7 or 8');
    if (!q.t || !q.q || q.q.length < 10 || q.q.length > 260) bad.push(q.id + ' question text');
    if (!q.a || q.a.length > 60) bad.push(q.id + ' answer must be 1-60 letters');
    if (/[<>]/.test(q.q + q.a + q.alt.join('') + q.x)) bad.push(q.id + ' has markup');
    if (q.alt.some((a) => !a || a.length > 60)) bad.push(q.id + ' alt');
    if (q.wrong.length && (q.wrong.length < 3 || q.wrong.map((w) => w.toLowerCase()).includes(q.a.toLowerCase()))) bad.push(q.id + ' wrong choices must be 3+ and differ from the answer');
    if (!ECON.study.parent.aMax) bad.push('econ');
  });
  assert.deepEqual(bad, []);
  const count = (s) => STUDY_BANK.filter((q) => q.s === s).length;
  ['social', 'science', 'lang', 'arts', 'math'].forEach((s) => assert.ok(count(s) >= 60, s + ' needs at least 60 questions, has ' + count(s)));
  assert.ok(STUDY_BANK.filter((q) => q.t === 'ky').length >= 20, 'a Kentucky set');
  [6, 7, 8].forEach((g) => assert.ok(STUDY_BANK.filter((q) => q.g === g).length >= 50, 'enough at level ' + g));
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
  await page.click('.bottom-bar >> text=Study');
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
  assert.equal(s.gems, 8 + 3, 'a gem per new right answer and a perfect-round bonus');
  assert.equal(s.today, 11);
  assert.deepEqual(s.stat, [8, 8], 'the parent report counts them');
  assert.ok(s.xp >= 16);
  await page.click('#study-box >> text=Back to Game');
  assert.equal(await page.evaluate(() => document.getElementById('study-modal').style.display), 'none');
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
    state.study.miss = []; state.study.seen = {}; state.study.subject = 'all';
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
    state.study = { level: 99, subject: 'zzz', seen: { '<script>': [1, 1, 1], social1: [-5, 'x', 3], bogus: 5, science2: [2, 1, 4] }, miss: ['social1', 'social1', 'nope!', 5], paid: { social1: -4, science2: dayNumber() - 30, math3: dayNumber() }, day: 7, gems: 999, rounds: 'x' };
    normalizeState();
    return state.study;
  });
  assert.equal(r.level, 8, 'clamped to the top level');
  assert.equal(r.subject, 'all');
  assert.deepEqual(Object.keys(r.seen).sort(), ['science2', 'social1']);
  assert.deepEqual(r.seen.social1, [0, 0, 3]);
  assert.deepEqual(r.miss, ['social1']);
  assert.deepEqual(Object.keys(r.paid), ['math3'], 'old rewards are forgotten');
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
    state.study.subject = 'ky';
    openStudy();
    const out = { pool: studyPool('all', 8).map((q) => q.id), html: document.getElementById('study-box').innerText, filters: studyFilters().map((f) => f[0]) };
    setParentQs([], 'kid_x', true);
    out.emptyFallsBack = studyPool('all', 6).length > 100;
    setParentQs([{ id: 'pAAAA', s: 'science', q: 'What gas do plants take in?', a: 'Carbon dioxide' }], 'kid_x', false);
    out.mixed = studyPool('all', 6).length > 100;
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
