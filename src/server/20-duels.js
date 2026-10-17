// ---------------------------------------------------------------------
//  ONLINE DUELS  (async: same questions, scored on the server, gem stakes)
//  KV layout (every key expires after 3 days):
//    duel:<id>           immutable {from,to,stake,qs:[{e,l,o,a}],created}
//    res:<id>:<name>     written only by that player {score,ms,at}
//    duels:<name>:<id>   index entry (metadata) for each participant
//    ping:<name>         last notification for that player
//    decl:<id>           the invited player declined
//    blk:<me>:<them>     me has blocked them (no expiry)
// ---------------------------------------------------------------------
const DUEL_TTL = 60 * 60 * 24 * ECON.duel.ttlDays;
function newDuelId() { return randomId(6); }
async function savedGems(kv, name) {
  const s = await kv.get('save:' + name, 'json');
  return s && s.state && typeof s.state.gems === 'number' ? s.state.gems : 0;
}
function cleanText(t, max, allowSubSup) {
  if (typeof t !== 'string' || t.length > max) return null;
  const bare = allowSubSup ? t.replace(/<\/?(sub|sup)>/g, '') : t;
  return /[<>&"`]/.test(bare) ? null : t;
}
// Plain text for trivia questions: any characters but control ones. The client always shows it as text (escHtml), never as HTML.
function cleanPlain(t, max) {
  return typeof t === 'string' && t.length >= 1 && t.length <= max && !/[\u0000-\u001f\u007f]/.test(t) ? t : null;
}
function cleanQuestions(qs) {
  if (!Array.isArray(qs) || [5, 10, 15].indexOf(qs.length) === -1) return null;
  const out = [];
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i] || {};
    if (q.t === 't') {                                                   // a trivia (study) question: words, not numbers
      const te = cleanPlain(q.e, 520), ta = cleanPlain(q.a, 120);
      if (!te || !ta || !Array.isArray(q.o) || q.o.length < 2 || q.o.length > 4) return null;
      const to = q.o.map(function (x) { return cleanPlain(x, 120); });
      if (to.some(function (x, k) { return !x || to.indexOf(x) !== k; }) || to.indexOf(ta) === -1) return null;
      out.push({ t: 't', e: te, l: '', o: to, a: ta });
      continue;
    }
    const e = cleanText(q.e, 240, true);
    const l = cleanText(q.l == null ? '=' : q.l, 24, false);
    if (!e || l === null) return null;
    if (!Array.isArray(q.o) || q.o.length < 2 || q.o.length > 4) return null;
    const o = q.o.map(Number);
    const a = Number(q.a);
    if (o.some(function (v) { return !isFinite(v) || Math.abs(v) > 1e9; }) || !isFinite(a)) return null;
    if (!o.some(function (v) { return Math.abs(v - a) < 0.0001; })) return null;
    out.push({ e: e, l: l, o: o, a: a });
  }
  return out;
}
async function duelSummary(kv, duel, me) {
  const opp = duel.from === me ? duel.to : duel.from;
  const rs = await Promise.all([kv.get('res:' + duel.id + ':' + me, 'json'), kv.get('res:' + duel.id + ':' + opp, 'json'), kv.get('decl:' + duel.id)]);
  const mine = rs[0], theirs = rs[1];
  const sum = { id: duel.id, from: duel.from, to: duel.to, opp: opp, stake: duel.stake, n: duel.qs.length, created: duel.created, mine: mine ? { score: mine.score, ms: mine.ms } : null, theirs: null, outcome: null, declined: false };
  if (rs[2]) { sum.declined = true; sum.status = 'declined'; return sum; }
  if (!mine) { sum.status = 'todo'; return sum; }
  if (!theirs) { sum.status = 'waiting'; return sum; }
  sum.status = 'done';
  sum.theirs = { score: theirs.score, ms: theirs.ms };
  sum.outcome = mine.score > theirs.score ? 'win' : (mine.score < theirs.score ? 'loss' : (mine.ms < theirs.ms ? 'win' : (mine.ms > theirs.ms ? 'loss' : 'tie')));
  return sum;
}
async function ping(kv, to, id, kind, from) {
  await kv.put('ping:' + to, JSON.stringify({ t: Date.now(), id: id, k: kind, from: from }), { expirationTtl: DUEL_TTL });
}
async function handleDuel(path, request, url, kv, who, body) {
  const me = who.name;
  if (path === '/api/duel/ping' && request.method === 'GET') {
    return json({ ping: (await kv.get('ping:' + me, 'json')) || null });
  }

  if (path === '/api/duel/list' && request.method === 'GET') {
    const l = await kv.list({ prefix: 'duels:' + me + ':', limit: 60 });
    const metas = l.keys.map(function (k) { return k.metadata; }).filter(function (m) { return m && m.id; });
    metas.sort(function (a, b) { return b.created - a.created; });
    const duels = (await Promise.all(metas.slice(0, 12).map(async function (m) {
      const d = await kv.get('duel:' + m.id, 'json');
      return d ? duelSummary(kv, d, me) : null;
    }))).filter(Boolean);
    return json({ duels: duels });
  }

  if (path === '/api/duel/get' && request.method === 'GET') {
    const id = String(url.searchParams.get('id') || '');
    const d = /^[A-Za-z0-9_-]{6,12}$/.test(id) ? await kv.get('duel:' + id, 'json') : null;
    if (!d || (d.from !== me && d.to !== me)) return json({ error: 'That duel is not available any more.' }, 404);
    const sum = await duelSummary(kv, d, me);
    return json({ duel: { id: d.id, from: d.from, to: d.to, stake: d.stake, qs: d.qs.map(function (q) { return q.t === 't' ? { t: 't', e: q.e, l: q.l, o: q.o } : { e: q.e, l: q.l, o: q.o }; }) }, summary: sum });
  }

  if (path === '/api/duel/create' && request.method === 'POST') {
    const to = String(body.to || '').trim().toLowerCase();
    const stake = Number(body.stake);
    if (!NAME_RE.test(to) || to === me) return json({ error: 'Type the player name of a friend.' }, 400);
    if (ECON.duel.stakes.indexOf(stake) === -1) return json({ error: 'Pick one of the stake choices.' }, 400);
    const qs = cleanQuestions(body.qs);
    if (!qs) return json({ error: 'Those questions were not valid.' }, 400);
    if (!(await kv.get('acct:' + to)) || (await kv.get('blk:' + to + ':' + me))) return json({ error: 'No player called "' + to + '" can be challenged right now.' }, 404);
    const rlKey = 'rl:' + me;
    const used = parseInt((await kv.get(rlKey)) || '0', 10);
    if (used >= ECON.duel.maxPerHour) return json({ error: 'Lots of challenges! Take a short break and try again soon.' }, 429);
    if (stake > 0) {
      const gems = await Promise.all([savedGems(kv, me), savedGems(kv, to)]);
      if (!stakeAllowed(stake, gems[0])) return json({ error: 'You can stake at most half of your gems.' }, 400);
      if (!stakeAllowed(stake, gems[1])) return json({ error: 'That friend cannot cover this stake. Try a smaller one.' }, 400);
    }
    await kv.put(rlKey, String(used + 1), { expirationTtl: 3600 });
    const id = newDuelId();
    const duel = { id: id, from: me, to: to, stake: stake, qs: qs, created: Date.now() };
    const meta = { id: id, created: duel.created };
    await Promise.all([
      kv.put('duel:' + id, JSON.stringify(duel), { expirationTtl: DUEL_TTL }),
      kv.put('duels:' + me + ':' + id, '1', { expirationTtl: DUEL_TTL, metadata: meta }),
      kv.put('duels:' + to + ':' + id, '1', { expirationTtl: DUEL_TTL, metadata: meta })
    ]);
    await ping(kv, to, id, 'invite', me);
    return json({ ok: true, id: id });
  }

  if (path === '/api/duel/submit' && request.method === 'POST') {
    const id = String(body.id || '');
    const d = /^[A-Za-z0-9_-]{6,12}$/.test(id) ? await kv.get('duel:' + id, 'json') : null;
    if (!d || (d.from !== me && d.to !== me)) return json({ error: 'That duel is not available any more.' }, 404);
    if (await kv.get('decl:' + id)) return json({ error: 'That challenge was declined.' }, 409);
    const resKey = 'res:' + id + ':' + me;
    if (!(await kv.get(resKey))) {
      const ans = Array.isArray(body.answers) ? body.answers : [];
      if (ans.length !== d.qs.length) return json({ error: 'Answer every question first.' }, 400);
      let score = 0;
      d.qs.forEach(function (q, i) { if (q.t === 't' ? String(ans[i]) === q.a : Math.abs(Number(ans[i]) - q.a) < 0.0001) score += 1; });
      const ms = Math.min(900000, Math.max(d.qs.length * 400, Math.round(Number(body.ms) || 0)));
      await kv.put(resKey, JSON.stringify({ score: score, ms: ms, at: Date.now() }), { expirationTtl: DUEL_TTL });
      const other = d.from === me ? d.to : d.from;
      // if they have not played yet this is still an invitation ("your turn"); otherwise it is the result
      await ping(kv, other, id, (await kv.get('res:' + id + ':' + other)) ? 'result' : 'invite', me);
    }
    return json({ ok: true, summary: await duelSummary(kv, d, me) });
  }

  if (path === '/api/duel/decline' && request.method === 'POST') {
    const id = String(body.id || '');
    const d = /^[A-Za-z0-9_-]{6,12}$/.test(id) ? await kv.get('duel:' + id, 'json') : null;
    if (!d || d.to !== me) return json({ error: 'That duel is not available any more.' }, 404);
    if (!(await kv.get('res:' + id + ':' + me))) {
      await kv.put('decl:' + id, '1', { expirationTtl: DUEL_TTL });
      await ping(kv, d.from, id, 'declined', me);
    }
    return json({ ok: true });
  }

  if (path === '/api/duel/block' && request.method === 'POST') {
    const name = String(body.name || '').trim().toLowerCase();
    if (!NAME_RE.test(name) || name === me) return json({ error: 'Bad name' }, 400);
    await kv.put('blk:' + me + ':' + name, '1');
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}
