import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame, signUp, call } from './helpers.mjs';

let browser, worker, env;
before(async () => { browser = await launch(); worker = await loadWorker(); env = { MATH_KV: fakeKV() }; });
after(async () => { await browser.close(); });
const c = (p, m, b, t) => call(worker, env, p, m, b, t);

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
  assert.ok(r.ops.every((id) => allowed.includes(id)), 'only allowed types stay on');
  assert.equal(r.afterLower, 2); assert.equal(r.afterOne, 2);
  assert.equal(r.afterHigher, 3, 'a higher level is free');
  assert.deepEqual(r.lockedButtons.slice(0, 3), [true, true, false]);
  assert.match(r.note, /lowest level is Grades 6–8/);
  assert.ok(!r.shownOps.some((l) => /Derivative|Integral/.test(l)));
  assert.ok(r.activeOps.every((id) => allowed.includes(id)));

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
  await g.page.click('.portal-ctl summary');
  await g.page.selectOption('.portal-ctl select', '2');
  await g.page.uncheck('.portal-ctl input[data-op="deriv"]');
  await g.page.uncheck('.portal-ctl input[data-ctl="duels"]');
  await g.page.click('text=Save settings');
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
  await g.page.click('.portal-ctl summary');
  await g.page.selectOption('select[data-ctl="goal"]', '30');
  await g.page.fill('input[data-ctl="reward"]', 'movie night');
  await g.page.selectOption('select[data-ctl="adaptive"]', 'off');
  await g.page.click('text=Save settings');
  await g.page.waitForFunction(() => /Saved settings/.test(document.getElementById('portal-msg').innerText));
  const stored = await env.MATH_KV.get('ctl:kid_gp', 'json');
  assert.deepEqual([stored.goalMinutes, stored.goalReward, stored.adaptive], [30, 'movie night', false]);
  await kid.page.evaluate(() => acctStartup());
  assert.deepEqual(await kid.page.evaluate(() => [state.parentGoal.minutes, state.parentGoal.reward, state.adapt.on]), [30, 'movie night', false]);

  // the form shows what is set, and "decides" puts them back in the child's hands
  await g.page.click('.portal-ctl summary');
  assert.equal(await g.page.inputValue('select[data-ctl="goal"]'), '30');
  assert.equal(await g.page.inputValue('select[data-ctl="adaptive"]'), 'off');
  await g.page.selectOption('select[data-ctl="goal"]', '');
  await g.page.selectOption('select[data-ctl="adaptive"]', '');
  await g.page.click('text=Save settings');
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
