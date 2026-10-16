import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame, signUp, call } from './helpers.mjs';

let browser, worker, env;
before(async () => { browser = await launch(); worker = await loadWorker(); env = { MATH_KV: fakeKV() }; });
after(async () => { await browser.close(); });
const c = (p, m, b, t) => call(worker, env, p, m, b, t);

async function family(kidName, parentName) {
  const kid = await openGame(browser, worker, env, { fast: true });
  await signUp(kid.page, kidName);
  const token = await kid.page.evaluate(() => acct.token);
  const mom = (await c('/api/parent/register', 'POST', { name: parentName, password: 'secret1' })).data.token;
  assert.equal((await c('/api/parent/claim', 'POST', { code: (await c('/api/link/code', 'POST', {}, token)).data.code }, mom)).status, 200);
  const age = async (ms) => { const p = await env.MATH_KV.get('cprog:' + kidName, 'json'); p.startedAt -= ms; await env.MATH_KV.put('cprog:' + kidName, JSON.stringify(p)); };
  return { kid, mom, age };
}
const answer = (page, right) => page.evaluate((ok) => {
  inputLocked = false; userInput = String(ok ? currentProblem.answer : currentProblem.answer + 7); checkAnswer();
}, right);

test('the child starts a challenge, only correct answers count, and the win pays once', async () => {
  const { kid, mom, age } = await family('kid_chal', 'mom_chal');
  const made = await c('/api/parent/challenge', 'POST', { child: 'kid_chal', problems: 3, minutes: 5 }, mom);
  const p = kid.page;
  await p.evaluate(() => { window.__grants = []; const g = grantGems; grantGems = (n, m, b) => { window.__grants.push(n); g(n, m, b); }; });
  await p.evaluate(() => acctStartup());
  await p.waitForFunction(() => document.getElementById('chal-bar').style.display === 'flex');
  assert.match(await p.innerText('#chal-bar'), /Parent challenge: 3 in 5 min = 3 💎/);
  assert.equal(await p.getAttribute('#chal-bar', 'aria-disabled'), null, 'tappable before it starts');

  await p.click('#chal-bar');
  assert.match(await p.innerText('#chal-text'), /3 problems correctly within 5 minutes/);
  await p.click('text=Start now');
  await p.waitForFunction(() => chal && chal.state === 'running');
  assert.match(await p.innerText('#chal-bar'), /⏱️ [45]:\d\d.*0\/3/);
  assert.equal(await p.getAttribute('#chal-bar', 'aria-disabled'), 'true');

  await answer(p, false);
  assert.equal(await p.evaluate(() => chal.count), 0, 'a wrong answer does not count');
  await answer(p, true);
  await answer(p, true);
  assert.match(await p.innerText('#chal-bar'), /2\/3/);

  await age(60000);                       // the server's clock: a minute has passed, so three answers are believable
  await answer(p, true);
  await p.waitForFunction(() => state.challengePaid.length === 1);
  assert.deepEqual(await p.evaluate(() => window.__grants.filter((n) => n === 3)), [3], 'three gems, once');
  assert.equal(await p.evaluate(() => state.challengePaid[0]), made.data.challenge.id);
  assert.equal(await p.evaluate(() => document.getElementById('chal-bar').style.display), 'none');
  assert.equal((await c('/api/parent/kids', 'GET', null, mom)).data.kids[0].challenge.state, 'won');

  // reopening the game never pays it again
  await p.reload();
  await p.evaluate(() => { window.__grants = []; const g = grantGems; grantGems = (n, m, b) => { window.__grants.push(n); g(n, m, b); }; });
  await p.evaluate(() => acctStartup());
  assert.deepEqual(await p.evaluate(() => window.__grants), []);
  assert.deepEqual(kid.errors.filter((e) => !/40\d/.test(e)), []);
  await kid.context.close();
});

test('running out of time says so kindly and pays nothing', async () => {
  const { kid, mom, age } = await family('kid_late', 'mom_late');
  await c('/api/parent/challenge', 'POST', { child: 'kid_late', problems: 5, minutes: 1 }, mom);
  const p = kid.page;
  await p.evaluate(async () => { await acctStartup(); await chalStart(); });
  await p.waitForFunction(() => chal && chal.state === 'running');
  await age(120000);
  await p.evaluate(() => { window.__grants = []; window.__toasts = []; const g = grantGems; grantGems = (n, m, b) => { window.__grants.push(n); g(n, m, b); }; const t = toast; toast = (m) => { window.__toasts.push(m); t(m); }; });
  await p.evaluate(() => chalProgress());
  await p.waitForFunction(() => chal && chal.state === 'ended');
  assert.match((await p.evaluate(() => window.__toasts)).join('|'), /Time is up.*nothing is lost/);
  assert.equal(await p.evaluate(() => document.getElementById('chal-bar').style.display), 'none');
  assert.deepEqual(await p.evaluate(() => window.__grants), []);
  assert.equal(await p.evaluate(() => state.challengePaid.length), 0);
  await kid.context.close();
});

test('a parent starts and cancels a challenge on the parent page; a second parent only watches', async () => {
  const { kid, mom } = await family('kid_pp', 'mom_pp');
  const dad = (await c('/api/parent/register', 'POST', { name: 'dad_pp', password: 'secret1' })).data.token;
  await c('/api/parent/claim', 'POST', { code: (await c('/api/link/code', 'POST', {}, await kid.page.evaluate(() => acct.token))).data.code }, dad);
  const g = await openGame(browser, worker, env, { fast: true });
  await g.page.goto('http://localhost/parent');
  await g.page.fill('#portal-name', 'mom_pp'); await g.page.fill('#portal-pass', 'secret1');
  await g.page.click('text=Sign in');
  await g.page.waitForSelector('.portal-kid');
  assert.match(await g.page.innerText('#chal-0'), /No challenge right now/);
  await g.page.fill('input[data-chal="problems"]', '4');
  await g.page.fill('input[data-chal="minutes"]', '2');
  await g.page.click('text=Start a challenge');
  await g.page.waitForFunction(() => /Waiting for kid_pp to tap Start \(4 correct in 2 min = 4 💎\)/.test(document.getElementById('chal-0').innerText));
  assert.equal((await env.MATH_KV.get('chall:kid_pp', 'json')).problems, 4);
  assert.equal(await g.page.locator('#chal-0 input').count(), 0, 'no second challenge while one is going');

  const v = await openGame(browser, worker, env, { fast: true });
  await v.page.goto('http://localhost/parent');
  await v.page.fill('#portal-name', 'dad_pp'); await v.page.fill('#portal-pass', 'secret1');
  await v.page.click('text=Sign in');
  await v.page.waitForSelector('.portal-kid');
  assert.match(await v.page.innerText('#chal-0'), /Waiting for kid_pp/);
  assert.equal(await v.page.locator('#chal-0 button').count(), 0, 'view-only');

  await g.page.click('text=Cancel this challenge');
  await g.page.waitForFunction(() => /No challenge right now/.test(document.getElementById('chal-0').innerText));
  assert.equal(await g.page.locator('#chal-0 input').count(), 3);
  assert.deepEqual(g.errors.filter((e) => !/40\d/.test(e)), []);
  for (const x of [kid, g, v]) await x.context.close();
});
