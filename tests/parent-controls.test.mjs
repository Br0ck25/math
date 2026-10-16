import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame, signUp, call } from './helpers.mjs';

let browser, worker, env;
before(async () => { browser = await launch(); worker = await loadWorker(); env = { MATH_KV: fakeKV() }; });
after(async () => { await browser.close(); });
const c = (p, m, b, t) => call(worker, env, p, m, b, t);
const until = async (fn) => { for (let i = 0; i < 100; i++) { if (await fn()) return; await new Promise((r) => setTimeout(r, 50)); } assert.fail('timed out waiting for the saved value'); };

// A signed-in child (grade band 1) with a primary parent linked; returns both and the parent's token.
async function family(kidName, parentName) {
  const kid = await openGame(browser, worker, env, { fast: true });
  await kid.page.evaluate(() => { state.grade = 1; state.enabledOps = GRADE_DEFAULT_OPS[1].slice(); saveState(); });
  await signUp(kid.page, kidName);
  const token = await kid.page.evaluate(() => acct.token);
  const mom = (await c('/api/parent/register', 'POST', { name: parentName, password: 'secret1' })).data.token;
  const code = (await c('/api/link/code', 'POST', {}, token)).data.code;
  assert.equal((await c('/api/parent/claim', 'POST', { code }, mom)).status, 200);
  return { kid, mom };
}

test('the lowest level, math types and duels a parent sets are enforced on the child\'s device', async () => {
  const { kid, mom } = await family('kid_ctl', 'mom_ctl');
  const allowed = ['add', 'sub', 'mul', 'div', 'pct'];
  assert.equal((await c('/api/parent/controls', 'POST', { child: 'kid_ctl', minGrade: 2, ops: allowed, duelsOnline: false }, mom)).status, 200);
  const p = kid.page;
  await p.evaluate(() => acctStartup());
  const r = await p.evaluate(() => {
    const out = { grade: state.grade, duels: state.duelsOnline, ops: state.enabledOps.slice() };
    setGrade(0); out.afterLower = state.grade;
    setGrade(1); out.afterOne = state.grade;
    setGrade(3); out.afterHigher = state.grade;
    setGrade(2);
    openSettings();
    out.lockedButtons = Array.from(document.querySelectorAll('#grade-grid .grade-btn')).map((b) => b.classList.contains('locked'));
    out.note = document.getElementById('ctl-note').innerText;
    out.shownOps = Array.from(document.querySelectorAll('#ops-grid .op-lb')).map((b) => b.innerText);
    closeSettings();
    out.activeOps = new Set(Array.from({ length: 60 }, () => getActiveOps()).flat());
    out.activeOps = [...out.activeOps];
    return out;
  });
  assert.equal(r.grade, 2, 'the level was raised to the parent\'s lowest level');
  assert.equal(r.duels, false);
  assert.equal(r.afterLower, 2); assert.equal(r.afterOne, 2);
  assert.equal(r.afterHigher, 3, 'a higher level is free');
  assert.deepEqual(r.lockedButtons.slice(0, 3), [true, true, false]);
  assert.match(r.note, /lowest level is Grades 6–8/);
  assert.equal(r.shownOps.length, allowed.length, 'the settings list shows the parent\'s types, locked on');
  assert.ok(!r.shownOps.some((l) => /Derivative|Integral/.test(l)));
  assert.deepEqual(r.activeOps.sort(), [...allowed].sort(), 'exactly the parent\'s types are asked');

  // "easier" warm-up problems never go below the parent's lowest level
  const seen = await p.evaluate(() => {
    const got = [], gen = OP_BY_ID.add.gen;
    OP_BY_ID.add.gen = (g) => { got.push(g); return gen(g); };
    for (let i = 0; i < 5; i++) genEasy('add');
    OP_BY_ID.add.gen = gen;
    return got;
  });
  assert.ok(seen.length && seen.every((g) => g >= 2), 'easy problems use ' + seen);

  // online duels cannot be switched back on from the child's device
  const duels = await p.evaluate(() => { openParent(); setDuelsOnline(true); return { on: state.duelsOnline, disabled: document.getElementById('par-duels').disabled, note: document.getElementById('par-ctl-note').innerText }; });
  assert.equal(duels.on, false); assert.equal(duels.disabled, true); assert.match(duels.note, /online duels are off/);

  // the settings hold after a reload, even before the server answers
  await p.context().setOffline(true);
  await p.reload();
  assert.equal(await p.evaluate(() => ctlFloor()), 2);
  assert.ok((await p.evaluate(() => state.grade)) >= 2);
  await p.context().setOffline(false);
  await kid.context.close();
});

test('signing out needs the parent PIN while a parent\'s settings are on', async () => {
  const { kid, mom } = await family('kid_out', 'mom_out');
  await c('/api/parent/controls', 'POST', { child: 'kid_out', minGrade: 1, ops: null, duelsOnline: true }, mom);
  const p = kid.page;
  await p.evaluate(() => acctStartup());
  const r = await p.evaluate(async () => {
    state.parentPinHash = await hashPin('1234'); parentUnlocked = false;
    const out = {};
    acctLogout(); out.lockedStill = !!acct;
    acctShowDelete(); out.noDeleteForm = !document.getElementById('acct-del-pass');
    parentUnlocked = true;
    acctLogout(); out.signedOut = !acct; out.cleared = ctlActive();
    return out;
  });
  assert.equal(r.lockedStill, true); assert.equal(r.noDeleteForm, true);
  assert.equal(r.signedOut, true); assert.equal(r.cleared, false, 'the settings end with the sign-out');
  await kid.context.close();
});

test('a parent changes the settings from the parent page', async () => {
  const { kid, mom } = await family('kid_ui', 'mom_ui');
  const dad = (await c('/api/parent/register', 'POST', { name: 'dad_ui', password: 'secret1' })).data.token;
  const code = (await c('/api/link/code', 'POST', {}, await kid.page.evaluate(() => acct.token))).data.code;
  await c('/api/parent/claim', 'POST', { code }, dad);

  const g = await openGame(browser, worker, env, { fast: true });
  await g.page.goto('http://localhost/parent');
  await g.page.fill('#portal-name', 'mom_ui'); await g.page.fill('#portal-pass', 'secret1');
  await g.page.click('text=Sign in');
  await g.page.waitForSelector('.portal-kid');
  await g.page.selectOption('.portal-ctl select', '2');
  await g.page.uncheck('.portal-ctl input[data-op="deriv"]');
  await g.page.uncheck('.portal-ctl input[data-ctl="duels"]');
  await g.page.click('button:has-text("Save settings")');
  await g.page.waitForFunction(() => /Saved settings/.test(document.getElementById('portal-msg').innerText));
  const stored = await env.MATH_KV.get('ctl:kid_ui', 'json');
  assert.equal(stored.minGrade, 2); assert.equal(stored.duelsOnline, false);
  assert.ok(Array.isArray(stored.ops) && !stored.ops.includes('deriv') && stored.ops.includes('add'));

  // the child's device picks them up, and a view-only parent sees them without a form
  await kid.page.evaluate(() => acctStartup());
  assert.equal(await kid.page.evaluate(() => state.grade), 2);
  const v = await openGame(browser, worker, env, { fast: true });
  await v.page.goto('http://localhost/parent');
  await v.page.fill('#portal-name', 'dad_ui'); await v.page.fill('#portal-pass', 'secret1');
  await v.page.click('text=Sign in');
  await v.page.waitForSelector('.portal-kid');
  assert.equal(await v.page.locator('.portal-ctl').count(), 0);
  assert.match(await v.page.innerText('.portal-kid'), /lowest level Grades 6–8.*online duels off/);
  assert.equal(await g.page.evaluate(() => ECON.parents.gradeBands === GRADES.length), true);
  assert.deepEqual(g.errors.filter((e) => !/40\d/.test(e)), []);
  for (const x of [kid, g, v]) await x.context.close();
});

test('the daily goal and difficulty matching a parent sets are locked on the child\'s device', async () => {
  const { kid, mom } = await family('kid_goal', 'mom_goal');
  const p = kid.page;
  // while the parent leaves them to the child, nothing is locked
  await c('/api/parent/controls', 'POST', { child: 'kid_goal', minGrade: 0, ops: null, duelsOnline: true, goalMinutes: null, adaptive: null }, mom);
  await p.evaluate(() => acctStartup());
  assert.deepEqual(await p.evaluate(() => { openParent(); return [document.getElementById('par-minutes').disabled, document.getElementById('par-adaptive').disabled]; }), [false, false]);
  await p.evaluate(() => closeParent());

  await c('/api/parent/controls', 'POST', { child: 'kid_goal', minGrade: 0, ops: null, duelsOnline: true, goalMinutes: 45, goalReward: 'pizza night', adaptive: false }, mom);
  await p.evaluate(() => acctStartup());
  const r = await p.evaluate(() => {
    const out = { minutes: state.parentGoal.minutes, reward: state.parentGoal.reward, adapt: state.adapt.on };
    openParent();
    const sel = document.getElementById('par-minutes');
    sel.value = '10'; document.getElementById('par-reward').value = 'nothing'; setParentGoal(); setAdaptive(true);
    out.after = { minutes: state.parentGoal.minutes, reward: state.parentGoal.reward, adapt: state.adapt.on };
    out.disabled = ['par-minutes', 'par-reward', 'par-adaptive'].map((id) => document.getElementById(id).disabled);
    out.note = document.getElementById('par-ctl-note').innerText;
    out.shown = document.getElementById('par-goal-text').innerText;
    out.signOutNeedsPin = (state.parentPinHash = 'x', parentUnlocked = false, acctNeedsParent());
    return out;
  });
  assert.deepEqual([r.minutes, r.reward, r.adapt], [45, 'pizza night', false]);
  assert.deepEqual(r.after, { minutes: 45, reward: 'pizza night', adapt: false }, 'the child cannot change them');
  assert.deepEqual(r.disabled, [true, true, true]);
  assert.match(r.note, /daily goal is 45 minutes.*difficulty matching is off/);
  assert.match(r.shown, /pizza night/);
  assert.equal(r.signOutNeedsPin, true, 'a goal alone also protects the settings from a sign-out');
  await kid.context.close();
});

test('a parent sets the goal and difficulty matching from the parent page, and can delete their account', async () => {
  const { kid } = await family('kid_gp', 'mom_gp');
  const g = await openGame(browser, worker, env, { fast: true });
  await g.page.goto('http://localhost/parent');
  await g.page.fill('#portal-name', 'mom_gp'); await g.page.fill('#portal-pass', 'secret1');
  await g.page.click('text=Sign in');
  await g.page.waitForSelector('.portal-kid');
  await g.page.selectOption('select[data-ctl="goal"]', '30');
  await g.page.fill('input[data-ctl="reward"]', 'movie night');
  await g.page.selectOption('select[data-ctl="adaptive"]', 'off');
  await g.page.click('button:has-text("Save settings")');
  await g.page.waitForFunction(() => /Saved settings/.test(document.getElementById('portal-msg').innerText));
  const stored = await env.MATH_KV.get('ctl:kid_gp', 'json');
  assert.deepEqual([stored.goalMinutes, stored.goalReward, stored.adaptive], [30, 'movie night', false]);
  await kid.page.evaluate(() => acctStartup());
  assert.deepEqual(await kid.page.evaluate(() => [state.parentGoal.minutes, state.parentGoal.reward, state.adapt.on]), [30, 'movie night', false]);

  // the form shows what is set, and "decides" puts them back in the child's hands
  assert.equal(await g.page.inputValue('select[data-ctl="goal"]'), '30');
  assert.equal(await g.page.inputValue('select[data-ctl="adaptive"]'), 'off');
  await g.page.selectOption('select[data-ctl="goal"]', '');
  await g.page.selectOption('select[data-ctl="adaptive"]', '');
  await g.page.click('button:has-text("Save settings")');
  await g.page.waitForFunction(() => /Saved settings/.test(document.getElementById('portal-msg').innerText));
  assert.deepEqual(await kid.page.evaluate(async () => { await acctStartup(); return [goalLocked(), adaptiveLocked()]; }), [false, false]);

  // deleting the parent account asks for the password
  await g.page.click('text=Delete my parent account');
  await g.page.fill('#portal-del-pass', 'nope-nope');
  await g.page.click('.acct-btns >> text=Delete');
  await g.page.waitForFunction(() => /Wrong password/.test(document.getElementById('portal-msg').innerText));
  await g.page.fill('#portal-del-pass', 'secret1');
  await g.page.click('.acct-btns >> text=Delete');
  await g.page.waitForSelector('#portal-name');
  assert.match(await g.page.innerText('#portal-msg'), /was deleted/);
  assert.equal((await c('/api/parent/login', 'POST', { name: 'mom_gp', password: 'secret1' })).status, 401);
  assert.equal(await env.MATH_KV.get('ctl:kid_gp'), null);
  assert.deepEqual(g.errors.filter((e) => !/40\d/.test(e)), []);
  await kid.context.close(); await g.context.close();
});

test('the grade lock is visible without opening anything, and two children are kept apart', async () => {
  const a = await family('kid_a', 'mom_two');
  const b = await openGame(browser, worker, env, { fast: true });
  await signUp(b.page, 'kid_b');
  const tokB = await b.page.evaluate(() => acct.token);
  const momTok = (await c('/api/parent/login', 'POST', { name: 'mom_two', password: 'secret1' })).data.token;
  assert.equal((await c('/api/parent/claim', 'POST', { code: (await c('/api/link/code', 'POST', {}, tokB)).data.code }, momTok)).status, 200);

  const g = await openGame(browser, worker, env, { fast: true });
  await g.page.goto('http://localhost/parent');
  await g.page.fill('#portal-name', 'mom_two'); await g.page.fill('#portal-pass', 'secret1');
  await g.page.click('text=Sign in');
  await g.page.waitForFunction(() => document.querySelectorAll('.portal-kid').length === 2);
  assert.match(await g.page.innerText('#portal'), /Add another child/);
  assert.equal(await g.page.locator('details.portal-ctl[open]').count(), 2, 'the settings are open by default');
  assert.equal(await g.page.locator('select[data-ctl="grade"]').first().isVisible(), true, 'the grade lock is on screen');

  // lock kid_b only (the second card)
  await g.page.selectOption('#ctl-1 select[data-ctl="grade"]', '3');
  await g.page.click('#ctl-1 button:has-text("Save settings")');
  await g.page.waitForFunction(() => /Saved settings/.test(document.getElementById('portal-msg').innerText));
  assert.equal((await env.MATH_KV.get('ctl:kid_b', 'json')).minGrade, 3);
  assert.equal(await env.MATH_KV.get('ctl:kid_a'), null, 'the other child is untouched');
  await b.page.evaluate(() => acctStartup());
  await a.kid.page.evaluate(() => acctStartup());
  assert.equal(await b.page.evaluate(() => state.grade), 3);
  assert.notEqual(await a.kid.page.evaluate(() => state.grade), 3);
  for (const x of [a.kid, b, g]) await x.context.close();
});

test('weak spots have one-tap extra practice buttons that change what the child is asked', async () => {
  const { kid, mom } = await family('kid_boost', 'mom_boost');
  await kid.page.evaluate(() => {
    state.stats.days[dayKey()] = { s: 4, a: 14, ms: 60000, h: 0, w: 0, ops: { div: [10, 3], add: [10, 9] } };
    saveState();
  });
  await kid.page.evaluate(() => syncNow(true));
  const g = await openGame(browser, worker, env, { fast: true });
  await g.page.goto('http://localhost/parent');
  await g.page.fill('#portal-name', 'mom_boost'); await g.page.fill('#portal-pass', 'secret1');
  await g.page.click('text=Sign in');
  await g.page.waitForSelector('.portal-kid');
  assert.match(await g.page.innerText('.portal-kid'), /extra practice/i);
  assert.equal(await g.page.locator('.boost-btn[data-boost="add"]').count(), 0, 'only weak types get a button');
  await g.page.click('.boost-btn[data-boost="div"]');
  await g.page.waitForFunction(() => /\+10% practice/.test(document.querySelector('.portal-kid').innerText));
  assert.deepEqual((await env.MATH_KV.get('ctl:kid_boost', 'json')).boost, { div: 10 });
  await g.page.click('.boost-btn[data-boost="div"]');
  await g.page.waitForFunction(() => /\+20% practice/.test(document.querySelector('.portal-kid').innerText));
  await g.page.click('.boost-btn[data-boost="div"]');
  await g.page.waitForFunction(() => /\+30% practice/.test(document.querySelector('.portal-kid').innerText));
  assert.equal(await g.page.locator('.boost-btn[data-boost="div"]').first().isDisabled(), true, 'no more than 30% for one type');
  assert.deepEqual((await env.MATH_KV.get('ctl:kid_boost', 'json')).boost, { div: 30 });
  await g.page.click('.boost-btn[aria-label^="Remove"]');
  await g.page.waitForFunction(() => /\+20% practice/.test(document.querySelector('.portal-kid').innerText));
  assert.deepEqual((await env.MATH_KV.get('ctl:kid_boost', 'json')).boost, { div: 20 });
  // saving the other settings keeps the boost
  await g.page.click('button:has-text("Save settings")');
  await g.page.waitForFunction(() => /Saved settings/.test(document.getElementById('portal-msg').innerText));
  assert.deepEqual((await env.MATH_KV.get('ctl:kid_boost', 'json')).boost, { div: 20 });

  // on the child's device the type really is asked for more often (others give up their share evenly)
  await kid.page.evaluate(() => acctStartup());
  const shares = await kid.page.evaluate(() => { state.adapt.on = false; return typeShares(['add', 'sub', 'mul', 'div'], null).map((x) => Math.round(x * 1000) / 1000); });
  assert.deepEqual(shares, [0.183, 0.183, 0.183, 0.45]);
  assert.equal(await kid.page.evaluate(() => ctlActive()), false, 'extra practice alone does not lock sign-out');
  await kid.page.evaluate(() => { parentCtl.boost = {}; });
  assert.deepEqual(await kid.page.evaluate(() => typeShares(['add', 'sub', 'mul', 'div'], null).map((x) => Math.round(x * 100) / 100)), [0.25, 0.25, 0.25, 0.25]);
  await kid.context.close(); await g.context.close();
});

test('the challenge form takes the gems per answer and shows the prize', async () => {
  const { kid } = await family('kid_gems', 'mom_gems');
  const g = await openGame(browser, worker, env, { fast: true });
  await g.page.goto('http://localhost/parent');
  await g.page.fill('#portal-name', 'mom_gems'); await g.page.fill('#portal-pass', 'secret1');
  await g.page.click('text=Sign in');
  await g.page.waitForSelector('.portal-kid');
  assert.equal(await g.page.inputValue('input[data-chal="gems"]'), '1', 'one gem per answer by default');
  assert.match(await g.page.innerText('#chal-0'), /Total prize: 20 💎|^/);
  await g.page.fill('input[data-chal="problems"]', '30');
  await g.page.fill('input[data-chal="gems"]', '5');
  await g.page.waitForFunction(() => /too many.*100/.test(document.getElementById('chal-preview-0').innerText));
  await g.page.click('text=Start a challenge');
  await g.page.waitForFunction(() => /gems/.test(document.getElementById('portal-msg').innerText) && document.getElementById('portal-msg').className.includes('err'));
  assert.equal(await env.MATH_KV.get('chall:kid_gems'), null, 'nothing was created');
  await g.page.fill('input[data-chal="problems"]', '10');
  await g.page.waitForFunction(() => /Total prize: 50 💎/.test(document.getElementById('chal-preview-0').innerText));
  await g.page.click('text=Start a challenge');
  await g.page.waitForFunction(() => /Waiting for kid_gems to tap Start \(10 correct in 15 min = 50 💎\)/.test(document.getElementById('chal-0').innerText));
  assert.equal((await env.MATH_KV.get('chall:kid_gems', 'json')).gems, 50);
  await kid.page.evaluate(() => acctStartup());
  await kid.page.waitForFunction(() => chal && chal.gems === 50);
  assert.match(await kid.page.innerText('#chal-bar'), /10 in 15 min = 50 💎/);
  await kid.context.close(); await g.context.close();
});

test('a parent picks exactly which math types are asked, even ones above the child\'s grade, and can hand the choice back', async () => {
  const { kid, mom } = await family('kid_types', 'mom_types');
  const p = kid.page;
  await p.evaluate(() => { state.grade = 0; state.enabledOps = ['add', 'sub']; saveState(); });
  // percents and multiplication only, for a child in grades K-2
  assert.equal((await c('/api/parent/controls', 'POST', { child: 'kid_types', minGrade: 0, ops: ['pct', 'mul'], duelsOnline: true }, mom)).status, 200);
  await p.evaluate(() => acctStartup());
  const r = await p.evaluate(() => {
    const out = { active: getActiveOps().slice().sort(), enabled: state.enabledOps.slice() };
    out.made = Array.from({ length: 60 }, () => { generateProblem(); return currentProblem.modeTag; });
    out.grades = [];
    const gen = OP_BY_ID.pct.gen; OP_BY_ID.pct.gen = (g) => { out.grades.push(g); return gen(g); };
    for (let i = 0; i < 40; i++) generateProblem();
    OP_BY_ID.pct.gen = gen;
    toggleOp('add'); out.afterToggle = state.enabledOps.slice();
    openSettings();
    out.shown = Array.from(document.querySelectorAll('#ops-grid .op-lb')).map((b) => b.innerText).sort();
    out.locked = Array.from(document.querySelectorAll('#ops-grid .op-toggle')).every((b) => b.classList.contains('locked') && b.classList.contains('on'));
    out.note = document.getElementById('ctl-note').innerText;
    out.hint = document.getElementById('ops-hint').innerText;
    out.chip = document.getElementById('ops-chip').innerText;
    closeSettings();
    out.mcq = Array.from({ length: 30 }, () => makeMcq().op);
    return out;
  });
  assert.deepEqual(r.active, ['mul', 'pct']);
  assert.deepEqual([...new Set(r.made)].sort(), ['mul', 'pct'], 'only the chosen types come up, never a fallback to addition');
  assert.ok(r.grades.length && r.grades.every((g) => g >= 2), 'percents start at their own level, not below it: ' + r.grades);
  assert.deepEqual(r.enabled, ['add', 'sub'], 'the child\'s own choices are kept untouched');
  assert.deepEqual(r.afterToggle, ['add', 'sub'], 'the child cannot change them');
  assert.deepEqual(r.shown, ['Multiplication', 'Percents']);
  assert.equal(r.locked, true);
  assert.match(r.hint, /A parent picked these math types/);
  assert.match(r.note, /picked the math types \((Multiplication, Percents|Percents, Multiplication)\)/);
  assert.ok(r.mcq.every((o) => ['mul', 'pct'].includes(o)), 'duels and tournaments use them too');

  // ticking every type hands the choice back, and the child's own list returns
  assert.equal((await c('/api/parent/controls', 'POST', { child: 'kid_types', minGrade: 0, ops: null, duelsOnline: true }, mom)).status, 200);
  await p.evaluate(() => acctStartup());
  assert.deepEqual(await p.evaluate(() => getActiveOps().slice().sort()), ['add', 'sub']);
  await kid.context.close();
});

test('the math types section on the parent page is visible, with quick picks and a marker for types above the child\'s level', async () => {
  const { kid } = await family('kid_pick', 'mom_pick');
  const g = await openGame(browser, worker, env, { fast: true });
  await g.page.goto('http://localhost/parent');
  await g.page.fill('#portal-name', 'mom_pick'); await g.page.fill('#portal-pass', 'secret1');
  await g.page.click('text=Sign in');
  await g.page.waitForSelector('.portal-kid');
  assert.equal(await g.page.locator('input[data-op="mul"]').isVisible(), true, 'no folded section to open');
  assert.equal(await g.page.locator('input[data-op="pct"]').isVisible(), true);
  assert.match(await g.page.innerText('label:has(input[data-op="pct"])'), /↑/, 'percents are above a grade 3-5 child');
  assert.doesNotMatch(await g.page.innerText('label:has(input[data-op="mul"])'), /↑/);
  await g.page.click('button:has-text("Just + − × ÷")');
  assert.deepEqual(await g.page.$$eval('input[data-op]:checked', (els) => els.map((e) => e.dataset.op)), ['add', 'sub', 'mul', 'div']);
  await g.page.check('input[data-op="pct"]');
  await g.page.click('button:has-text("Save settings")');
  await until(async () => JSON.stringify((await env.MATH_KV.get('ctl:kid_pick', 'json') || {}).ops) === JSON.stringify(['add', 'sub', 'mul', 'div', 'pct']));
  await g.page.click('button:has-text("Tick all")');
  await g.page.click('button:has-text("Save settings")');
  await until(async () => (await env.MATH_KV.get('ctl:kid_pick', 'json')).ops === null);   // all ticked leaves the choice with the child
  await kid.context.close(); await g.context.close();
});
