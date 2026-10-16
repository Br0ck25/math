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
