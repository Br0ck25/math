import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame, signUp } from './helpers.mjs';

let browser, worker, env;
before(async () => { browser = await launch(); worker = await loadWorker(); env = { MATH_KV: fakeKV() }; });
after(async () => { await browser.close(); });

test('a parent links a child from the child\'s device and sees the report on their own', async () => {
  const kid = await openGame(browser, worker, env, { fast: true });
  await kid.page.evaluate(() => {
    const d = dayKey();
    state.gems = 77; state.stats.days[d] = { s: 9, a: 10, ms: 300000, h: 0, w: 0, ops: { add: [10, 9] } };
    saveState();
  });
  // before signing in, the window explains what to do
  await kid.page.evaluate(() => openParent());
  assert.match(await kid.page.innerText('#par-link'), /Sign in to your online account/);
  await kid.page.evaluate(() => closeParent());
  await signUp(kid.page, 'kiddo');
  await kid.page.evaluate(() => syncNow(true));

  // ask for a code
  await kid.page.evaluate(() => openParent());
  await kid.page.waitForSelector('#par-link .grade-btn');
  await kid.page.click('#par-link .grade-btn');
  await kid.page.waitForSelector('.link-code');
  const shown = (await kid.page.innerText('.link-code')).trim();
  assert.match(shown, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.match(await kid.page.innerText('#par-link'), /Waiting for a parent/);

  // the parent, on another phone
  const mom = await openGame(browser, worker, env, { fast: true });
  await mom.page.goto('http://localhost/parent');
  await mom.page.waitForSelector('#portal-name');
  assert.equal(await mom.page.evaluate(() => getComputedStyle(document.querySelector('.game-container')).display), 'none', 'the game is hidden on the parent page');
  await mom.page.fill('#portal-name', 'mom_one');
  await mom.page.fill('#portal-pass', 'secret1');
  await mom.page.click('text=Create parent account');
  await mom.page.waitForSelector('#portal-code');
  await mom.page.fill('#portal-code', 'WRONG-CODE');
  await mom.page.click('text=Add child');
  await mom.page.waitForFunction(() => /not right/.test(document.getElementById('portal-msg').innerText));
  await mom.page.fill('#portal-code', shown.toLowerCase());
  await mom.page.click('text=Add child');
  await mom.page.waitForSelector('.portal-kid');
  const card = await mom.page.innerText('.portal-kid');
  assert.match(card, /kiddo/);
  assert.match(card, /you can change settings/);
  assert.match(card, /77/);
  assert.match(card, /Solved/);
  assert.equal(await mom.page.locator('.portal-kid .par-tile b').first().innerText(), '9');

  // she is still signed in after a reload
  await mom.page.reload();
  await mom.page.waitForSelector('.portal-kid');

  // the child sees who is linked and can unlink
  await kid.page.evaluate(() => { linkLoaded = false; renderParentLink(); });
  await kid.page.waitForFunction(() => /mom_one/.test(document.getElementById('par-link').innerText));
  await kid.page.click('#par-link >> text=Unlink');
  await kid.page.waitForFunction(() => !/mom_one/.test(document.getElementById('par-link').innerText));
  await mom.page.reload();
  await mom.page.waitForSelector('.portal-kid');
  assert.match(await mom.page.innerText('.portal-kid'), /unlinked you/);
  assert.deepEqual(kid.errors, []);
  assert.deepEqual(mom.errors.filter((e) => !/40[14]|404/.test(e)), []);
  await kid.context.close(); await mom.context.close();
});

test('the parent page on a child\'s device never uploads a blank save over the child\'s progress', async () => {
  const g = await openGame(browser, worker, env, { fast: true });
  await g.page.evaluate(() => { state.gems = 321; saveState(); });
  await signUp(g.page, 'kid_two');
  await g.page.evaluate(() => syncNow(true));
  const before = await env.MATH_KV.get('save:kid_two', 'json');
  await g.page.goto('http://localhost/parent');
  await g.page.waitForSelector('#portal-name');
  await g.page.evaluate(async () => { acct.dirty = true; await syncNow(true); });
  const after = await env.MATH_KV.get('save:kid_two', 'json');
  assert.equal(after.version, before.version, 'no upload happened');
  assert.equal(after.state.gems, 321);
  await g.context.close();
});
