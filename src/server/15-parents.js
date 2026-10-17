// ---------------------------------------------------------------------
//  PARENT ACCOUNTS  (a parent signs in at /parent, claims a child with a code and sees the child's stats)
//  Every key has exactly one writer, so nothing is ever read-modify-written by two people:
//    pacct:<parent>, psess:<hash>, pfail:<parent>   the parent's own login (see PARENT_NS)
//    claim:<hash(code)>   {child, linkId}   written by the CHILD's session; expires after ECON.parents.codeMinutes
//    grant:<child>        {links:[{id, at, primary, ch}]}   written only by the child: the links the child allows
//    plinks:<parent>      {kids:[{child, linkId, at}]}      written only by that parent
//    plink:<linkId>       {parent, at}   written by the parent who used the code (lets the child see who is linked); {gone:true} when that parent stops watching
//    cfail:<parent>       wrong code tries, expires in 15 minutes
//    chall:<child>        {id, problems, minutes, gems, linkId, at}  (or {cancelled:true})  the parent's timed challenge; primary parent only
//    cprog:<child>        {cid, startedAt, count, done, won}         written only by the child: the clock for the challenge (see 16-challenges.js)
//    ctl:<child>          {minGrade, ops, duelsOnline, linkId, at}   the parent's settings; written only by the primary parent and
//                         in force only while that link is still the child's primary link (so unlinking cannot be a way round them)
//    pq:<child>           {linkId, at, qs}   study questions the primary parent added (see 17-study.js); in force under the same rule
//  A parent sees a child only while the child's grant still lists the link, so the child can always unlink from their own device.
//  The first link is the primary parent (the only one who can change settings); later parents can only look.
// ---------------------------------------------------------------------
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O/1/I/L: easy to read out loud
const CODE_TTL = 60 * ECON.parents.codeMinutes;
function newLinkCode() {
  return Array.from(rand(8)).map(function (b) { return CODE_CHARS.charAt(b % CODE_CHARS.length); }).join('');
}
function cleanCode(c) {
  const s = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z0-9]{8}$/.test(s) ? s : '';
}
function claimKey(code) { return sha256Hex('claim:' + code).then(function (h) { return 'claim:' + h; }); }

// ---- the child's side (signed in as the player) --------------------------
// A link is live when a parent has used its code (plink exists) or its code has not run out yet.
async function liveLinks(kv, child) {
  const grant = (await kv.get('grant:' + child, 'json')) || { links: [] };
  const used = (await Promise.all(grant.links.map(function (l) { return kv.get('plink:' + l.id, 'json'); }))).map(function (u) { return u && !u.gone ? u : (u ? 'gone' : null); });
  const now = Date.now();
  let changed = false;
  const links = [];
  grant.links.forEach(function (l, i) {
    if (used[i] === 'gone') changed = true;
    else if (used[i] || now - l.at < CODE_TTL * 1000) links.push({ id: l.id, at: l.at, primary: !!l.primary, ch: l.ch, parent: used[i] ? used[i].parent : null });
    else changed = true;
  });
  // if the primary parent went away, the oldest remaining parent takes over
  if (links.length && !links.some(function (l) { return l.primary; })) {
    const next = links.find(function (l) { return l.parent; });
    if (next) { next.primary = true; changed = true; }
  }
  return { links: links, changed: changed };
}
function saveGrant(kv, child, links) {
  return kv.put('grant:' + child, JSON.stringify({ links: links.map(function (l) { return { id: l.id, at: l.at, primary: l.primary, ch: l.ch }; }) }));
}
function linkView(l) { return { id: l.id, at: l.at, primary: l.primary, parent: l.parent, pending: !l.parent }; }

async function handleLink(path, request, kv, who, body) {
  const child = who.name;
  if (path === '/api/link/list' && request.method === 'GET') {
    const cur = await liveLinks(kv, child);
    if (cur.changed) await saveGrant(kv, child, cur.links);
    return json({ links: cur.links.map(linkView) });
  }
  if (path === '/api/link/code' && request.method === 'POST') {
    const cur = await liveLinks(kv, child);
    // a new code replaces any code that has not been used yet
    const pending = cur.links.filter(function (l) { return !l.parent; });
    const links = cur.links.filter(function (l) { return l.parent; });
    for (let i = 0; i < pending.length; i++) await kv.delete(pending[i].ch);
    if (links.length >= ECON.parents.maxLinks) return json({ error: 'This player already has ' + ECON.parents.maxLinks + ' parents linked. Unlink one first.' }, 400);
    const code = newLinkCode();
    const ch = await claimKey(code);
    const link = { id: randomId(6), at: Date.now(), primary: !links.some(function (l) { return l.primary; }), ch: ch, parent: null };
    await kv.put(ch, JSON.stringify({ child: child, linkId: link.id }), { expirationTtl: CODE_TTL });
    links.push(link);
    await saveGrant(kv, child, links);
    return json({ ok: true, code: code, minutes: ECON.parents.codeMinutes, link: linkView(link) });
  }
  if (path === '/api/link/unlink' && request.method === 'POST') {
    const cur = await liveLinks(kv, child);
    const gone = cur.links.find(function (l) { return l.id === body.id; });
    if (!gone) return json({ error: 'That link is already gone.' }, 404);
    await kv.delete(gone.ch);
    const links = cur.links.filter(function (l) { return l !== gone; });
    if (!links.some(function (l) { return l.primary; })) {
      const next = links.find(function (l) { return l.parent; });
      if (next) next.primary = true;
    }
    await saveGrant(kv, child, links);
    return json({ ok: true, links: links.map(linkView) });
  }
  return json({ error: 'Not found' }, 404);
}

// ---- the parent's settings for a child -----------------------------------------
function isPrimaryLink(grant, linkId) { return !!grant && grant.links.some(function (l) { return l.id === linkId && l.primary; }); }
// The settings as the child's device and the parents see them (records written before a field existed read as "not set").
function controlsOf(ctl) {
  return {
    minGrade: ctl.minGrade, ops: ctl.ops, duelsOnline: ctl.duelsOnline,
    goalMinutes: ctl.goalMinutes === undefined ? null : ctl.goalMinutes, goalReward: ctl.goalReward || '',
    adaptive: typeof ctl.adaptive === 'boolean' ? ctl.adaptive : null,
    boost: ctl.boost || {}
  };
}
function liveControls(ctl, grant) {
  return ctl && isPrimaryLink(grant, ctl.linkId) ? controlsOf(ctl) : null;
}
// What the parents have set for a child: { controls, challenge }, each null when absent or no longer from the primary link.
// The common case (nothing set) costs two reads.
async function parentState(kv, child) {
  const first = await Promise.all([kv.get('ctl:' + child, 'json'), kv.get('chall:' + child, 'json')]);
  if (!first[0] && !first[1]) return { controls: null, challenge: null };
  const ids = [first[0], first[1]].filter(Boolean).map(function (x) { return x.linkId; }).filter(function (id, i, a) { return a.indexOf(id) === i; });
  const more = await Promise.all([kv.get('grant:' + child, 'json'), first[1] ? kv.get('cprog:' + child, 'json') : null].concat(ids.map(function (id) { return kv.get('plink:' + id, 'json'); })));
  // a settings record counts while its parent's link is the primary one AND that parent has not stopped watching or left
  const alive = function (id) { const rec = more[2 + ids.indexOf(id)]; return isPrimaryLink(more[0], id) && !(rec && rec.gone); };
  return {
    controls: first[0] && alive(first[0].linkId) ? controlsOf(first[0]) : null,
    challenge: first[1] && alive(first[1].linkId) ? challengeView(first[1], more[1], Date.now()) : null
  };
}
// The parent's own link to a child, when that link is the primary one. Returns { k, grant } or { res }.
async function primaryFor(kv, parent, childName) {
  const mine = (await kv.get('plinks:' + parent, 'json')) || { kids: [] };
  const k = mine.kids.find(function (x) { return x.child === String(childName || ''); });
  if (!k) return { res: json({ error: 'That child is not on your list.' }, 404) };
  const grant = await kv.get('grant:' + k.child, 'json');
  if (!isPrimaryLink(grant, k.linkId)) return { res: json({ error: 'Only the first parent linked to this player can change their settings.' }, 403) };
  return { k: k, grant: grant };
}
// The cloud copy of a save never holds a lower level, or online duels, than the parent allows.
function clampToControls(state, c) {
  if (!c) return;
  if (!(state.grade >= c.minGrade)) state.grade = c.minGrade;
  if (c.duelsOnline === false) state.duelsOnline = false;
}
function cleanControls(b) {
  const minGrade = Number(b.minGrade);
  if (!Number.isInteger(minGrade) || minGrade < 0 || minGrade >= ECON.parents.gradeBands) return null;
  let ops = null;
  if (b.ops !== null && b.ops !== undefined) {
    if (!Array.isArray(b.ops) || b.ops.length < 1 || b.ops.length > 40) return null;
    ops = [];
    for (let i = 0; i < b.ops.length; i++) {
      if (typeof b.ops[i] !== 'string' || !/^[a-z0-9_]{1,20}$/.test(b.ops[i])) return null;
      if (ops.indexOf(b.ops[i]) === -1) ops.push(b.ops[i]);
    }
  }
  if (typeof b.duelsOnline !== 'boolean') return null;
  // the daily time goal and adaptive practice are optional: absent or null means "the player decides"
  let goalMinutes = null;
  if (b.goalMinutes !== null && b.goalMinutes !== undefined) {
    goalMinutes = Number(b.goalMinutes);
    if (!Number.isInteger(goalMinutes) || goalMinutes < ECON.parents.goal.minMinutes || goalMinutes > ECON.parents.goal.maxMinutes) return null;
  }
  const goalReward = b.goalReward === undefined || b.goalReward === null ? '' : b.goalReward;
  if (typeof goalReward !== 'string' || goalReward.length > ECON.parents.goal.maxRewardChars || /[\u0000-\u001f<>]/.test(goalReward)) return null;
  if (b.adaptive !== undefined && b.adaptive !== null && typeof b.adaptive !== 'boolean') return null;
  // extra practice: { math type id: percent of all problems moved to it }
  const boost = {};
  if (b.boost !== undefined && b.boost !== null) {
    const B = ECON.parents.boost;
    if (typeof b.boost !== 'object' || Array.isArray(b.boost)) return null;
    const ids = Object.keys(b.boost);
    let total = 0;
    if (ids.length > B.maxTypes) return null;
    for (let i = 0; i < ids.length; i++) {
      const v = b.boost[ids[i]];
      if (!/^[a-z0-9_]{1,20}$/.test(ids[i]) || !Number.isInteger(v) || v < 0 || v > B.maxPerType) return null;
      if (v) { boost[ids[i]] = v; total += v; }
    }
    if (total > B.maxTotal) return null;
  }
  return { minGrade: minGrade, ops: ops, duelsOnline: b.duelsOnline, goalMinutes: goalMinutes, goalReward: goalReward.trim(), adaptive: typeof b.adaptive === 'boolean' ? b.adaptive : null, boost: boost };
}

// ---- the parent's side ---------------------------------------------------
const SUMMARY_DAYS = 14;
function num(v, max) { return typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(max || 1e9, v)) : 0; }
// What a parent may see of a child's save: numbers for the report, never the whole save (no PIN hash, no names of friends).
function kidSummary(save) {
  const st = (save && save.state) || {};
  const days = {};
  const src = (st.stats && st.stats.days) || {};
  Object.keys(src).filter(function (k) { return /^\d{4}-\d{2}-\d{2}$/.test(k); }).sort().slice(-SUMMARY_DAYS).forEach(function (k) {
    const d = src[k] || {};
    const ops = {};
    Object.keys(d.ops || {}).slice(0, 40).forEach(function (op) {
      if (/^[a-z0-9_]{1,20}$/.test(op) && Array.isArray(d.ops[op])) ops[op] = [num(d.ops[op][0]), num(d.ops[op][1])];
    });
    // study answers: st = [answered, right], sub = { subject id: [answered, right] }
    const sub = {};
    Object.keys(d.sub || {}).slice(0, 12).forEach(function (id) {
      if (/^[a-z]{1,10}$/.test(id) && Array.isArray(d.sub[id])) sub[id] = [num(d.sub[id][0]), num(d.sub[id][1])];
    });
    days[k] = { s: num(d.s), a: num(d.a), ms: num(d.ms), h: num(d.h), w: num(d.w), ops: ops, st: Array.isArray(d.st) ? [num(d.st[0]), num(d.st[1])] : [0, 0], sub: sub };
  });
  // study questions answered wrong: [question id, times wrong, times right], the most often missed first (at most 40)
  const seen = (st.study && st.study.seen) || {};
  const missed = Object.keys(seen).filter(function (id) { return /^[A-Za-z0-9_-]{3,16}$/.test(id) && Array.isArray(seen[id]) && num(seen[id][1], 1e6) > 0; })
    .map(function (id) { return [id, num(seen[id][1], 1e6), num(seen[id][0], 1e6)]; })
    .sort(function (a, b) { return b[1] - a[1] || a[2] - b[2]; });
  return {
    studyMissed: missed.slice(0, 40), studyMissedCount: missed.length,
    updatedAt: save ? save.updatedAt || 0 : 0,
    grade: num(st.grade, 12),
    gems: num(st.gems),
    streak: num(st.streakCal && st.streakCal.count),
    raids: num(st.raidsCleared),
    trophies: num(st.tour && st.tour.trophies),
    duelsOnline: st.duelsOnline !== false,
    days: days
  };
}

async function handleParent(path, request, kv, body) {
  if (path === '/api/parent/register' && request.method === 'POST') {
    const r = await createAccount(kv, PARENT_NS, body);
    if (r.res) return r.res;
    return json({ ok: true, name: r.name, token: await newSession(kv, r.name, PARENT_NS) });
  }
  if (path === '/api/parent/login' && request.method === 'POST') {
    const r = await signIn(kv, PARENT_NS, body);
    if (r.res) return r.res;
    return json({ ok: true, name: r.name, token: await newSession(kv, r.name, PARENT_NS) });
  }
  const who = await authenticate(request, kv, PARENT_NS);
  if (!who) return json({ error: 'Please sign in again.' }, 401);
  const parent = who.name;

  if (path === '/api/parent/kids' && request.method === 'GET') {
    const mine = (await kv.get('plinks:' + parent, 'json')) || { kids: [] };
    const rows = await Promise.all(mine.kids.map(async function (k) {
      const reads = await Promise.all([kv.get('grant:' + k.child, 'json'), kv.get('save:' + k.child, 'json'), kv.get('ctl:' + k.child, 'json'), kv.get('chall:' + k.child, 'json'), kv.get('cprog:' + k.child, 'json')]);
      const link = reads[0] && reads[0].links.find(function (l) { return l.id === k.linkId; });
      if (!link) return { child: k.child, revoked: true };
      const challenge = reads[3] && isPrimaryLink(reads[0], reads[3].linkId) ? challengeView(reads[3], reads[4], Date.now()) : null;
      return Object.assign({ child: k.child, primary: !!link.primary, revoked: false, controls: liveControls(reads[2], reads[0]), challenge: challenge }, kidSummary(reads[1]));
    }));
    return json({ kids: rows });
  }

  if (path === '/api/parent/claim' && request.method === 'POST') {
    const failKey = 'cfail:' + parent;
    const fails = parseInt((await kv.get(failKey)) || '0', 10);
    if (fails >= ECON.parents.codeTries) return json({ error: 'Too many wrong codes. Please wait 15 minutes and try again.' }, 429);
    const wrong = async function () { await kv.put(failKey, String(fails + 1), { expirationTtl: 900 }); return json({ error: 'That code is not right, or it ran out. Ask for a new one on the child\'s device.' }, 404); };
    const code = cleanCode(body.code);
    if (!code) return wrong();
    const key = await claimKey(code);
    const claim = await kv.get(key, 'json');
    if (!claim) return wrong();
    const grant = await kv.get('grant:' + claim.child, 'json');
    if (!grant || !grant.links.some(function (l) { return l.id === claim.linkId; })) return wrong();
    const mine = (await kv.get('plinks:' + parent, 'json')) || { kids: [] };
    const kids = mine.kids.filter(function (k) { return k.child !== claim.child; });
    if (kids.length >= ECON.parents.maxKids) return json({ error: 'You are already watching ' + ECON.parents.maxKids + ' children.' }, 400);
    kids.push({ child: claim.child, linkId: claim.linkId, at: Date.now() });
    await kv.put('plink:' + claim.linkId, JSON.stringify({ parent: parent, at: Date.now() }));
    await kv.put('plinks:' + parent, JSON.stringify({ kids: kids }));
    await kv.delete(key);
    await kv.delete(failKey);
    return json({ ok: true, child: claim.child });
  }

  if (path === '/api/parent/controls' && request.method === 'POST') {
    const p = await primaryFor(kv, parent, body.child);
    if (p.res) return p.res;
    const c = cleanControls(body);
    if (!c) return json({ error: 'Those settings are not valid.' }, 400);
    await kv.put('ctl:' + p.k.child, JSON.stringify(Object.assign({ linkId: p.k.linkId, at: Date.now() }, c)));
    return json({ ok: true, controls: c });
  }

  if (path === '/api/parent/challenge' && request.method === 'POST') return setChallenge(kv, parent, body);

  if (path.indexOf('/api/parent/study/') === 0 && request.method === 'POST') return handleParentStudy(path, kv, parent, body);

  if (path === '/api/parent/delete' && request.method === 'POST') {
    if (!(await checkPassword(kv, parent, String(body.password || ''), PARENT_NS))) return json({ error: 'Wrong password.' }, 401);
    const mine = (await kv.get('plinks:' + parent, 'json')) || { kids: [] };
    for (let i = 0; i < mine.kids.length; i++) {
      const k = mine.kids[i];
      // tell the child the link ended, and remove what this parent wrote for them
      await kv.put('plink:' + k.linkId, JSON.stringify({ gone: true }), { expirationTtl: CODE_TTL });
      const rows = await Promise.all([kv.get('ctl:' + k.child, 'json'), kv.get('chall:' + k.child, 'json'), kv.get('pq:' + k.child, 'json')]);
      if (rows[0] && rows[0].linkId === k.linkId) await kv.delete('ctl:' + k.child);
      if (rows[1] && rows[1].linkId === k.linkId) await kv.delete('chall:' + k.child);
      if (rows[2] && rows[2].linkId === k.linkId) await kv.delete('pq:' + k.child);
    }
    await Promise.all(['plinks:' + parent, 'cfail:' + parent, PARENT_NS.acct + parent, PARENT_NS.fail + parent, PARENT_NS.sess + who.tokenHash].map(function (key) { return kv.delete(key); }));
    return json({ ok: true });
  }

  if (path === '/api/parent/unlink' && request.method === 'POST') {
    const mine = (await kv.get('plinks:' + parent, 'json')) || { kids: [] };
    const gone = mine.kids.find(function (k) { return k.child === String(body.child || ''); });
    if (!gone) return json({ error: 'That child is not on your list.' }, 404);
    await kv.put('plinks:' + parent, JSON.stringify({ kids: mine.kids.filter(function (k) { return k !== gone; }) }));
    await kv.put('plink:' + gone.linkId, JSON.stringify({ gone: true }), { expirationTtl: CODE_TTL });   // tells the child this link ended (the marker fades once the child has tidied up)
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}
