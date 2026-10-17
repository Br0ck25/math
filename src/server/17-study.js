// ---------------------------------------------------------------------
//  STUDY QUESTIONS A PARENT ADDS  (the child's Study screen mixes them in with the built-in questions)
//    pq:<child>   {linkId, at, only, qs:[{id, s, q, a, alt, wrong}]}   (only: show just these, hide the built-in questions)   written only by the primary parent, like ctl:
//  The questions count only while that link is still the child's primary link and the parent has not stopped watching, so unlinking
//  cannot leave a parent's questions behind. They reach only the parent's own child: they are never used in duels, tournaments or the vault.
// ---------------------------------------------------------------------
async function liveStudy(kv, child) {
  const pq = await kv.get('pq:' + child, 'json');
  if (!pq || !Array.isArray(pq.qs)) return { questions: [], only: false };
  const rows = await Promise.all([kv.get('grant:' + child, 'json'), kv.get('plink:' + pq.linkId, 'json')]);
  return isPrimaryLink(rows[0], pq.linkId) && !(rows[1] && rows[1].gone) ? { questions: pq.qs, only: pq.only === true } : { questions: [], only: false };
}
// The children (from the names asked for) that this parent is the primary parent of: [{ child, linkId }].
async function primaryKids(kv, parent, names) {
  const mine = (await kv.get('plinks:' + parent, 'json')) || { kids: [] };
  const want = (Array.isArray(names) ? names : []).filter(function (n, i, a) { return typeof n === 'string' && a.indexOf(n) === i; }).slice(0, ECON.parents.maxKids);
  const kids = mine.kids.filter(function (k) { return want.indexOf(k.child) !== -1; });
  const grants = await Promise.all(kids.map(function (k) { return kv.get('grant:' + k.child, 'json'); }));
  return kids.filter(function (k, i) { return isPrimaryLink(grants[i], k.linkId); });
}
async function handleParentStudy(path, kv, parent, body) {
  const kids = await primaryKids(kv, parent, body.children || [body.child]);
  if (!kids.length) return json({ error: 'You can only change study questions for children you are the first parent of.' }, 403);
  const L = ECON.study.parent;
  const record = async function (k) {
    const pq = await kv.get('pq:' + k.child, 'json');
    return pq && pq.linkId === k.linkId && Array.isArray(pq.qs) ? pq : { qs: [], only: false };
  };
  const current = async function (k) { return (await record(k)).qs; };
  const save = async function (k, qs, only) {
    await kv.put('pq:' + k.child, JSON.stringify({ linkId: k.linkId, at: Date.now(), only: only === undefined ? (await record(k)).only === true : only, qs: qs }));
  };

  if (path === '/api/parent/study/list') {
    const lists = {}, only = {};
    for (let i = 0; i < kids.length; i++) { const rec = await record(kids[i]); lists[kids[i].child] = rec.qs; only[kids[i].child] = rec.only === true; }
    return json({ ok: true, lists: lists, only: only });
  }
  // "Only my questions": the child's Study screen then shows just the parent's questions (when there are any), not the built-in ones.
  if (path === '/api/parent/study/only') {
    if (typeof body.only !== 'boolean') return json({ error: 'Choose on or off.' }, 400);
    const results = {};
    for (let i = 0; i < kids.length; i++) { await save(kids[i], await current(kids[i]), body.only); results[kids[i].child] = { only: body.only }; }
    return json({ ok: true, results: results });
  }
  if (path === '/api/parent/study/add') {
    if (!Array.isArray(body.questions) || !body.questions.length || body.questions.length > L.bulk) return json({ error: 'Add between 1 and ' + L.bulk + ' questions at a time.' }, 400);
    const clean = [];
    for (let i = 0; i < body.questions.length; i++) {
      const c = cleanStudyQ(body.questions[i]);
      if (!c) return json({ error: 'Question ' + (i + 1) + ' is not valid. It needs a question (up to ' + L.qMax + ' letters) and an answer (up to ' + L.aMax + ').' }, 400);
      clean.push(c);
    }
    const results = {};
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i], qs = await current(k);
      const have = qs.map(function (x) { return x.q.toLowerCase(); });
      let added = 0, dup = 0, full = 0;
      clean.forEach(function (c) {
        if (have.indexOf(c.q.toLowerCase()) !== -1) dup++;
        else if (qs.length >= L.max) full++;
        else { qs.push(Object.assign({ id: 'p' + randomId(4) }, c)); have.push(c.q.toLowerCase()); added++; }
      });
      if (added) await save(k, qs);
      results[k.child] = { added: added, dup: dup, full: full, total: qs.length };
    }
    return json({ ok: true, results: results });
  }
  if (path === '/api/parent/study/remove') {
    const ids = Array.isArray(body.ids) ? body.ids.filter(function (x) { return typeof x === 'string'; }).slice(0, L.max) : [];
    if (!ids.length && body.all !== true) return json({ error: 'Nothing to remove.' }, 400);
    const results = {};
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i], qs = await current(k);
      const keep = body.all === true ? [] : qs.filter(function (x) { return ids.indexOf(x.id) === -1; });
      if (keep.length !== qs.length) await save(k, keep);
      results[k.child] = { removed: qs.length - keep.length, total: keep.length };
    }
    return json({ ok: true, results: results });
  }
  return json({ error: 'Not found' }, 404);
}
