import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorker, fakeKV, call } from './helpers.mjs';

const worker = await loadWorker();
const setup = async () => {
  const env = { MATH_KV: fakeKV() };
  const save = { unlockedPets: ['dog'], gems: 100 };
  const tok = {};
  for (const n of ['alice', 'bobby', 'carol']) tok[n] = (await call(worker, env, '/api/register', 'POST', { name: n, password: 'secret1', state: save })).data.token;
  return { env, tok, c: (p, m, b, who) => call(worker, env, p, m, b, who && tok[who]) };
};
const questions = (n = 5) => Array.from({ length: n }, (_, i) => {
  const a = (i + 2) * 3;
  return { e: (i + 2) + ' × 3', l: '=', o: [a, a + 1, a - 1, a + 2], a };
});

test('every response carries the security headers', async () => {
  const { c } = await setup();
  for (const path of ['/', '/api/status', '/manifest.json', '/icon.svg', '/sw.js']) {
    const r = await c(path, 'GET');
    assert.match(r.headers.get('content-security-policy'), /default-src 'none'/, path);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff', path);
  }
});

test('plain http is sent to https, with the path kept, and https browsers are told to stay on https', async () => {
  const hit = async (url, headers) => worker.fetch(new Request(url, { headers: headers || {} }), { MATH_KV: fakeKV() }, {});
  const r = await hit('http://mathquest.example.com/api/status?x=1');
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), 'https://mathquest.example.com/api/status?x=1');
  assert.match(r.headers.get('strict-transport-security'), /max-age=\d{7,}/);
  const behindProxy = await hit('https://mathquest.example.com/', { 'cf-visitor': '{"scheme":"http"}' });
  assert.equal(behindProxy.status, 301, 'Cloudflare says the visitor used http');
  const ok = await hit('https://mathquest.example.com/');
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('strict-transport-security'), /max-age/);
  assert.doesNotMatch(ok.headers.get('strict-transport-security'), /includeSubDomains/, 'other sites on the same domain must not be affected');
  assert.match(ok.headers.get('content-security-policy'), /upgrade-insecure-requests/);
  assert.equal((await hit('http://localhost:8787/')).status, 200, 'local development stays on http');
  assert.equal((await hit('http://127.0.0.1:8787/')).status, 200);
});

test('accounts: bad names, duplicate names, wrong passwords', async () => {
  const { c } = await setup();
  assert.equal((await c('/api/register', 'POST', { name: 'x', password: 'secret1' })).status, 400);
  assert.equal((await c('/api/register', 'POST', { name: 'alice', password: 'secret1' })).status, 409);
  assert.equal((await c('/api/login', 'POST', { name: 'alice', password: 'wrong!!' })).status, 401);
  assert.equal((await c('/api/login', 'POST', { name: 'alice', password: 'secret1' })).status, 200);
});

test('saves: a stale version is a conflict, force overwrites, oversized saves are refused', async () => {
  const { c } = await setup();
  const s = { unlockedPets: ['dog'], gems: 5 };
  assert.equal((await c('/api/save', 'PUT', { state: s, baseVersion: 1 }, 'alice')).status, 200);
  assert.equal((await c('/api/save', 'PUT', { state: s, baseVersion: 1 }, 'alice')).status, 409);
  assert.equal((await c('/api/save', 'PUT', { state: s, baseVersion: 1, force: true }, 'alice')).status, 200);
  const big = { unlockedPets: ['dog'], gems: 5, junk: 'x'.repeat(ECON_HARD) };
  assert.equal((await c('/api/save', 'PUT', { state: big, baseVersion: 3 }, 'alice')).status, 413);
});
const ECON_HARD = 400001;

test('duel API: validation', async () => {
  const { c } = await setup();
  const base = { to: 'bobby', stake: 10, qs: questions() };
  assert.equal((await c('/api/duel/create', 'POST', { ...base, stake: 99 }, 'alice')).status, 400, 'stake not on the list');
  await c('/api/register', 'POST', { name: 'poorkid', password: 'secret1', state: { unlockedPets: ['dog'], gems: 40 } });
  assert.equal((await c('/api/duel/create', 'POST', { ...base, to: 'poorkid', stake: 25 }, 'alice')).status, 400, 'a friend must hold twice the stake');
  assert.equal((await c('/api/duel/create', 'POST', { ...base, to: 'poorkid', stake: 10 }, 'alice')).status, 200);
  assert.equal((await c('/api/duel/create', 'POST', { ...base, qs: questions(7) }, 'alice')).status, 400, 'bad question count');
  assert.equal((await c('/api/duel/create', 'POST', { ...base, qs: questions().map((q) => ({ ...q, e: '<img onerror=1>' })) }, 'alice')).status, 400, 'html is refused');
  assert.equal((await c('/api/duel/create', 'POST', { ...base, to: 'alice' }, 'alice')).status, 400, 'cannot challenge yourself');
  assert.equal((await c('/api/duel/create', 'POST', { ...base, to: 'nobody1' }, 'alice')).status, 404);
});

test('duel API: play, hidden answers, scoring, tie-break and settlement data', async () => {
  const { c, env } = await setup();
  const qs = questions();
  const made = await c('/api/duel/create', 'POST', { to: 'bobby', stake: 10, qs }, 'alice');
  assert.equal(made.status, 200);
  const id = made.data.id;
  assert.equal((await c('/api/duel/ping', 'GET', null, 'bobby')).data.ping.k, 'invite');

  const got = await c('/api/duel/get?id=' + id, 'GET', null, 'bobby');
  assert.deepEqual(Object.keys(got.data.duel.qs[0]).sort(), ['e', 'l', 'o'], 'answers never leave the server');
  assert.equal((await c('/api/duel/get?id=' + id, 'GET', null, 'carol')).status, 404, 'strangers cannot open it');

  assert.equal((await c('/api/duel/submit', 'POST', { id, answers: [1, 2], ms: 1000 }, 'alice')).status, 400, 'must answer every question');
  const a = await c('/api/duel/submit', 'POST', { id, answers: qs.map((q) => q.a), ms: 20000 }, 'alice');
  assert.equal(a.data.summary.status, 'waiting');
  assert.equal((await c('/api/duel/ping', 'GET', null, 'bobby')).data.ping.k, 'invite', 'still an invitation until bobby plays');
  const list = await c('/api/duel/list', 'GET', null, 'bobby');
  assert.equal(list.data.duels[0].status, 'todo');
  assert.equal(list.data.duels[0].theirs, null, 'their score stays hidden until you have played');

  const b = await c('/api/duel/submit', 'POST', { id, answers: qs.map((q, i) => (i < 3 ? q.a : 0)), ms: 15000 }, 'bobby');
  assert.equal(b.data.summary.status, 'done');
  assert.equal(b.data.summary.outcome, 'loss');
  assert.equal((await c('/api/duel/list', 'GET', null, 'alice')).data.duels[0].outcome, 'win');
  assert.equal((await c('/api/duel/submit', 'POST', { id, answers: qs.map(() => 0), ms: 1 }, 'bobby')).data.summary.mine.score, 3, 'a second submit changes nothing');
  assert.equal((await c('/api/duel/ping', 'GET', null, 'alice')).data.ping.k, 'result');

  // equal scores: the faster player wins; equal times tie
  const q2 = await c('/api/duel/create', 'POST', { to: 'bobby', stake: 0, qs }, 'alice');
  await c('/api/duel/submit', 'POST', { id: q2.data.id, answers: qs.map((q) => q.a), ms: 9000 }, 'alice');
  const fast = await c('/api/duel/submit', 'POST', { id: q2.data.id, answers: qs.map((q) => q.a), ms: 8000 }, 'bobby');
  assert.equal(fast.data.summary.outcome, 'win');
  const q3 = await c('/api/duel/create', 'POST', { to: 'bobby', stake: 0, qs }, 'alice');
  await c('/api/duel/submit', 'POST', { id: q3.data.id, answers: qs.map((q) => q.a), ms: 9000 }, 'alice');
  assert.equal((await c('/api/duel/submit', 'POST', { id: q3.data.id, answers: qs.map((q) => q.a), ms: 9000 }, 'bobby')).data.summary.outcome, 'tie');
  assert.ok(env.MATH_KV.m.size > 0);
});

test('duel API: decline, block and the hourly limit', async () => {
  const { c } = await setup();
  const made = await c('/api/duel/create', 'POST', { to: 'bobby', stake: 0, qs: questions() }, 'alice');
  assert.equal((await c('/api/duel/decline', 'POST', { id: made.data.id }, 'alice')).status, 404, 'only the invited player can decline');
  assert.equal((await c('/api/duel/decline', 'POST', { id: made.data.id }, 'bobby')).status, 200);
  assert.equal((await c('/api/duel/list', 'GET', null, 'alice')).data.duels[0].status, 'declined');
  assert.equal((await c('/api/duel/block', 'POST', { name: 'alice' }, 'bobby')).status, 200);
  assert.equal((await c('/api/duel/create', 'POST', { to: 'bobby', stake: 0, qs: questions() }, 'alice')).status, 404, 'blocked players get a plain "not found"');
  let last;
  for (let i = 0; i < 31; i++) last = await c('/api/duel/create', 'POST', { to: 'carol', stake: 0, qs: questions() }, 'alice');
  assert.equal(last.status, 429);
});

test('the app is called Buddymon and installs with an icon served by the Worker', async () => {
  const res = (path) => worker.fetch(new Request('http://localhost' + path), { MATH_KV: fakeKV() }, {});
  const man = await (await res('/manifest.json')).json();
  assert.equal(man.name, 'Buddymon');
  assert.ok(man.icons.some((i) => i.src === '/icon.svg' && i.purpose === 'maskable'));
  const icon = await res('/icon.svg');
  assert.equal(icon.headers.get('content-type'), 'image/svg+xml');
  assert.match(await icon.text(), /^<svg /);
  assert.match(await (await res('/')).text(), /<title>Buddymon<\/title>[\s\S]*rel="icon"/);
});
