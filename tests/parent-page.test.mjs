import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame, signUp, call } from './helpers.mjs';

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

test('with several children each one is clearly separate: own colour, a gap, a pinned name bar and jump buttons', async () => {
  const mom = (await call(worker, env, '/api/parent/register', 'POST', { name: 'mom_many', password: 'secret1' })).data.token;
  const kids = [];
  for (const n of ['amy_k', 'ben_k', 'cat_k']) {
    const k = await openGame(browser, worker, env, { fast: true });
    await k.page.evaluate(() => { state.stats.days[dayKey()] = { s: 6, a: 10, ms: 600000, h: 0, w: 0, ops: { add: [10, 9] } }; saveState(); });
    await signUp(k.page, n);
    const code = (await call(worker, env, '/api/link/code', 'POST', {}, await k.page.evaluate(() => acct.token))).data.code;
    assert.equal((await call(worker, env, '/api/parent/claim', 'POST', { code }, mom)).status, 200);
    kids.push(k);
  }
  const g = await openGame(browser, worker, env, { fast: true, viewport: { width: 360, height: 640 } });
  await g.page.goto('http://localhost/parent');
  await g.page.fill('#portal-name', 'mom_many'); await g.page.fill('#portal-pass', 'secret1');
  await g.page.click('text=Sign in');
  await g.page.waitForFunction(() => document.querySelectorAll('.portal-kid').length === 3);
  const m = await g.page.evaluate(() => {
    const cards = [...document.querySelectorAll('.portal-kid')];
    const r = cards.map((c) => c.getBoundingClientRect());
    return {
      names: cards.map((c) => c.querySelector('.portal-kid-head h2').innerText),
      labels: cards.map((c) => c.querySelector('.portal-kid-head small').innerText),
      colours: cards.map((c) => getComputedStyle(c.querySelector('.portal-avatar')).backgroundColor),
      borders: cards.map((c) => getComputedStyle(c).borderTopColor),
      gaps: r.slice(1).map((b, i) => Math.round(b.top - r[i].bottom)),
      nav: [...document.querySelectorAll('.portal-nav-btn:has(i)')].map((b) => ({ t: b.innerText.trim(), h: Math.round(b.getBoundingClientRect().height) })),
      sideways: document.getElementById('portal').scrollWidth > innerWidth
    };
  });
  assert.deepEqual(m.names, ['amy_k', 'ben_k', 'cat_k']);
  assert.deepEqual(m.labels.map((l) => l.replace(/ ·.*/, '')), ['Child 1 of 3', 'Child 2 of 3', 'Child 3 of 3']);
  assert.equal(new Set(m.colours).size, 3, 'each child has their own colour');
  assert.equal(new Set(m.borders).size, 3);
  assert.ok(m.gaps.every((x) => x >= 32), 'a clear gap between children: ' + m.gaps);
  assert.deepEqual(m.nav.map((n) => n.t), ['amy_k', 'ben_k', 'cat_k']);
  assert.ok(m.nav.every((n) => n.h >= 44), 'jump buttons are easy to tap');
  assert.equal(m.sideways, false);

  // the jump button brings that child to the top of the screen
  await g.page.click('.portal-nav-btn:has-text("ben_k")');
  await g.page.waitForFunction(() => { const t = document.getElementById('kid-1').getBoundingClientRect().top; return t >= -2 && t <= 20; });

  // scrolling through a child keeps their name bar on screen, and the next child's bar takes over at their card
  const bars = await g.page.evaluate(async () => {
    const p = document.getElementById('portal'), card = (i) => document.getElementById('kid-' + i);
    const head = (i) => card(i).querySelector('.portal-kid-head').getBoundingClientRect();
    p.scrollTop = card(0).offsetTop + card(0).offsetHeight / 2; await new Promise((r) => setTimeout(r, 50));
    const inFirst = { first: Math.round(head(0).top), second: Math.round(head(1).top) };
    p.scrollTop = card(1).offsetTop + card(1).offsetHeight / 2; await new Promise((r) => setTimeout(r, 50));
    const inSecond = { first: Math.round(head(0).bottom), second: Math.round(head(1).top) };
    return { inFirst, inSecond };
  });
  assert.ok(Math.abs(bars.inFirst.first) <= 1, 'amy\'s name bar is pinned at the top while her stats scroll: ' + bars.inFirst.first);
  assert.ok(bars.inFirst.second > 100, 'ben\'s bar is still down in his own card');
  assert.ok(Math.abs(bars.inSecond.second) <= 1, 'ben\'s name bar takes over in his card');
  assert.ok(bars.inSecond.first < 0, 'amy\'s bar has left the screen');

  // a single child needs no jump buttons
  for (const n of ['ben_k', 'cat_k']) await call(worker, env, '/api/parent/unlink', 'POST', { child: n }, mom);
  await g.page.click('button:has-text("Refresh")');
  await g.page.waitForFunction(() => document.querySelectorAll('.portal-kid').length === 1);
  assert.equal(await g.page.locator('.portal-nav').count(), 0);
  assert.doesNotMatch(await g.page.innerText('.portal-kid-head small'), /Child 1 of/);
  for (const k of kids) await k.context.close();
  await g.context.close();
});
