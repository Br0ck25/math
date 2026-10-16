// ---------------------------------------------------------------------
//  TIMED CHALLENGES  (a parent sets "N correct answers in M minutes"; finishing in time pays N gems)
//  The parent writes chall:<child> (see 15-parents.js); the child writes cprog:<child>. The clock is the server's:
//  it starts when the child taps Start, and a win is accepted only if it arrives inside the time and not faster than
//  ECON.parents.challenge.minSecPerProblem per answer. All-or-nothing: running out of time costs nothing.
//  The answers themselves are checked on the child's device (like all practice), so the limits above are what keep a
//  claim believable. The gems are added by the child's device, once per challenge id (the server reports it as won
//  as many times as asked, so a lost reply can be recovered).
// ---------------------------------------------------------------------
const CHAL = ECON.parents.challenge;

// What either side may see of a challenge: its numbers and where it stands.
// state: 'ready' (not started), 'running', 'won' or 'ended' (time ran out).
function challengeView(def, prog, now) {
  if (!def || def.cancelled) return null;
  const v = { id: def.id, problems: def.problems, minutes: def.minutes, gems: def.gems, state: 'ready', count: 0, startedAt: 0, endsAt: 0, serverNow: now };
  const p = prog && prog.cid === def.id ? prog : null;
  if (!p) return v;
  v.startedAt = p.startedAt;
  v.endsAt = p.startedAt + def.minutes * 60000;
  v.count = Math.min(def.problems, p.count || 0);
  if (p.done) v.state = p.won ? 'won' : 'ended';
  else if (now > v.endsAt + CHAL.graceSeconds * 1000) v.state = 'ended';
  else v.state = 'running';
  return v;
}
function challengeBusy(v) { return !!v && (v.state === 'ready' || v.state === 'running'); }

// ---- the parent starts or cancels one ---------------------------------------
async function setChallenge(kv, parent, body) {
  const p = await primaryFor(kv, parent, body.child);
  if (p.res) return p.res;
  const child = p.k.child;
  const reads = await Promise.all([kv.get('chall:' + child, 'json'), kv.get('cprog:' + child, 'json')]);
  const view = reads[0] && isPrimaryLink(p.grant, reads[0].linkId) ? challengeView(reads[0], reads[1], Date.now()) : null;
  if (body.cancel === true) {
    if (!view) return json({ error: 'There is no challenge to cancel.' }, 404);
    await kv.put('chall:' + child, JSON.stringify({ id: view.id, cancelled: true, linkId: p.k.linkId, at: Date.now() }));
    return json({ ok: true, challenge: null });
  }
  const problems = Number(body.problems), minutes = Number(body.minutes);
  const gemsPer = body.gemsPer === undefined || body.gemsPer === null ? CHAL.gemPerProblem : Number(body.gemsPer);
  if (!Number.isInteger(problems) || problems < 1 || problems > CHAL.maxProblems) return json({ error: 'Pick 1 to ' + CHAL.maxProblems + ' problems.' }, 400);
  if (!Number.isInteger(minutes) || minutes < CHAL.minMinutes || minutes > CHAL.maxMinutes) return json({ error: 'Pick ' + CHAL.minMinutes + ' to ' + CHAL.maxMinutes + ' minutes.' }, 400);
  if (!Number.isInteger(gemsPer) || gemsPer < 1 || gemsPer > CHAL.maxGemPerProblem) return json({ error: 'Pick 1 to ' + CHAL.maxGemPerProblem + ' gems per answer.' }, 400);
  if (problems * gemsPer > CHAL.maxGems) return json({ error: 'That would be ' + problems * gemsPer + ' gems. The most for one challenge is ' + CHAL.maxGems + '.' }, 400);
  if (challengeBusy(view)) return json({ error: 'A challenge is already going. Cancel it first.' }, 409);
  const def = { id: randomId(6), problems: problems, minutes: minutes, gems: problems * gemsPer, linkId: p.k.linkId, at: Date.now() };
  await kv.put('chall:' + child, JSON.stringify(def));
  return json({ ok: true, challenge: challengeView(def, null, Date.now()) });
}

// ---- the child's side ---------------------------------------------------------
async function handleChallenge(path, request, kv, who, body) {
  const child = who.name;
  const st = await parentState(kv, child);
  const view = st.challenge;
  if (!view || view.id !== body.id) return json({ error: 'That challenge is over or was cancelled.', challenge: view }, 404);
  const now = Date.now();
  const prog = await kv.get('cprog:' + child, 'json');
  const mine = prog && prog.cid === view.id ? prog : null;
  const save = function (p) { return kv.put('cprog:' + child, JSON.stringify(p), { expirationTtl: 60 * 60 * 24 * 30 }); };
  const def = { id: view.id, problems: view.problems, minutes: view.minutes, gems: view.gems };

  if (path === '/api/challenge/start' && request.method === 'POST') {
    const cur = mine || { cid: view.id, startedAt: now, count: 0, done: false, won: false };
    if (!mine) await save(cur);   // asking again never restarts the clock
    return json({ ok: true, challenge: challengeView(def, cur, now) });
  }
  if (!mine) return json({ error: 'Start the challenge first.' }, 400);
  const elapsed = now - mine.startedAt;

  if (path === '/api/challenge/progress' && request.method === 'POST') {
    if (view.state === 'running') {
      const believable = Math.floor(elapsed / 1000 / CHAL.minSecPerProblem) + 1;
      const count = Math.max(mine.count, Math.min(Math.floor(Number(body.count)) || 0, def.problems, believable));
      if (count !== mine.count) { mine.count = count; await save(mine); }
    }
    return json({ ok: true, challenge: challengeView(def, mine, now) });
  }

  if (path === '/api/challenge/claim' && request.method === 'POST') {
    if (mine.done) return json({ ok: true, won: !!mine.won, gems: mine.won ? def.gems : 0, challenge: challengeView(def, mine, now) });
    if (view.state === 'ended') {
      mine.done = true; mine.won = false;
      await save(mine);
      return json({ ok: true, won: false, gems: 0, challenge: challengeView(def, mine, now) });
    }
    if (!(Number(body.count) >= def.problems)) return json({ error: 'Not finished yet.' }, 400);
    if (elapsed < def.problems * CHAL.minSecPerProblem * 1000) return json({ error: 'That was too fast to be real. Keep going and try again.' }, 400);
    mine.done = true; mine.won = true; mine.count = def.problems;
    await save(mine);
    return json({ ok: true, won: true, gems: def.gems, challenge: challengeView(def, mine, now) });
  }
  return json({ error: 'Not found' }, 404);
}
