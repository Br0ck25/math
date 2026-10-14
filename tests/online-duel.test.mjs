import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame, signUp } from './helpers.mjs';

let browser, worker, env, A, B;
before(async () => {
  browser = await launch();
  worker = await loadWorker();
  env = { MATH_KV: fakeKV() };
  for (const [key, name] of [['A', 'alice'], ['B', 'bobby']]) {
    const g = await openGame(browser, worker, env, { fast: true });
    await g.page.evaluate(() => { state.gems = 100; saveState(); });
    await signUp(g.page, name);
    if (key === 'A') A = g; else B = g;
  }
});
after(async () => { await browser.close(); });

// Plays the open duel on `g`, answering `right` questions correctly. The answers live only on the server,
// so the test reads them from the KV store (a player in a browser cannot).
async function playOpenDuel(g, right) {
  await g.page.waitForFunction(() => rd.cur && rd.cur.duel && document.getElementById('rd-opts'));
  const id = await g.page.evaluate(() => rd.cur.id);
  const answers = (await env.MATH_KV.get('duel:' + id, 'json')).qs.map((q) => q.a);
  for (let i = 0; i < answers.length; i++) {
    const correct = i < right;
    await g.page.evaluate(([a, ok]) => { const q = rd.cur.duel.qs[rd.cur.i]; rdAnswer(ok ? a : q.o.find((v) => Math.abs(v - a) > 1e-9)); }, [answers[i], correct]);
  }
  await g.page.waitForFunction(() => /You win|wins|Tie|Waiting/.test(document.getElementById('rd-box').innerText));
  return id;
}

test('challenge, notification, play, result and settlement on both sides', async () => {
  await A.page.evaluate(() => { hubTab = 'duel'; duelMode = 'online'; openHub(); rd.to = 'bobby'; rd.stake = 10; });
  await A.page.evaluate(() => rdChallenge());
  const id = await playOpenDuel(A, 10);
  assert.match(await A.page.innerText('#rd-box'), /Waiting for/);

  // Bob is told within one poll, sees the stake, plays worse and loses
  await B.page.evaluate(async () => { rd.tickAt = 0; await rdTick(); });
  assert.match(await B.page.evaluate(() => document.getElementById('duel-chip').innerText), /alice challenged you/);
  await B.page.evaluate(() => rdOpenFromChip());
  await B.page.waitForFunction(() => document.getElementById('rd-list').innerText.includes('alice challenged you'));
  await B.page.evaluate((i) => rdPlay(i), id);
  await playOpenDuel(B, 6);
  assert.match(await B.page.innerText('#rd-box'), /alice wins/);

  // Alice's waiting screen notices the result by itself
  await A.page.waitForFunction(() => /You win/.test(document.getElementById('rd-box').innerText), null, { timeout: 15000 });
  const [a, b] = await Promise.all([A, B].map((g) => g.page.evaluate(() => ({ gems: state.gems, rec: state.duelRecord }))));
  assert.equal(a.gems, 110);
  assert.equal(b.gems, 90);
  assert.deepEqual([a.rec.w, a.rec.l, b.rec.w, b.rec.l], [1, 0, 0, 1]);
});

test('results are only paid once, however often they are viewed', async () => {
  await A.page.evaluate(() => rdRefresh());
  await A.page.evaluate(() => rdRefresh());
  assert.equal(await A.page.evaluate(() => state.gems), 110);
});

test('rematch is one tap and starts playing straight away with the same stake', async () => {
  const r = await A.page.evaluate(async () => {
    const before = rd.cur.id;
    await rdRematch(before);
    await new Promise((res) => setTimeout(res, 200));
    return { fresh: rd.cur.id !== before, to: rd.cur.duel.to, stake: rd.cur.duel.stake, questions: rd.cur.duel.qs.length };
  });
  assert.deepEqual(r, { fresh: true, to: 'bobby', stake: 10, questions: 10 });
});

test('a rematch stake the player cannot cover is lowered automatically', async () => {
  const r = await B.page.evaluate(async () => {
    await rdRefresh();
    state.gems = 12;           // twice the stake must be held, so only 0 and 5 are possible
    const old = rd.list.find((d) => d.status === 'done');
    rd.list = [{ id: old.id, opp: 'alice', stake: 25, status: 'done' }];
    await rdRematch(old.id);
    await new Promise((res) => setTimeout(res, 300));
    return { allowed: allowedStakes(state.gems), stake: rd.cur.duel.stake };
  });
  assert.deepEqual(r, { allowed: [0, 5], stake: 5 });
});

test('declining and the parent off-switch', async () => {
  await B.page.evaluate(() => { state.gems = 100; });
  const made = await A.page.evaluate(async () => { const id = await rdCreate('bobby', 0); return id; });
  await B.page.evaluate((i) => rdDecline(i), made);
  const status = await A.page.evaluate(async (i) => { await rdRefresh(); return rd.list.find((d) => d.id === i).status; }, made);
  assert.equal(status, 'declined');
  const off = await B.page.evaluate(() => { state.duelsOnline = false; return rdReady(); });
  assert.equal(off, false, 'no polling or challenges while a grown-up has duels off');
  await B.page.evaluate(() => { state.duelsOnline = true; });
});

test('notification polling backs off when nobody is touching the screen', async () => {
  const gaps = await A.page.evaluate(() => {
    let calls = 0;
    const realApi = api; api = async () => { calls++; return { status: 200, data: { ping: null } }; };
    closeHub();
    document.getElementById('rd-modal').style.display = 'none';
    rd.tickAt = Date.now() - 20000; rd.lastActive = Date.now();           rdTick();
    const active = calls;
    rd.tickAt = Date.now() - 20000; rd.lastActive = Date.now() - 400000;  rdTick();
    const idle = calls - active;
    api = realApi;
    return { active, idle };
  });
  assert.deepEqual(gaps, { active: 1, idle: 0 });
});
