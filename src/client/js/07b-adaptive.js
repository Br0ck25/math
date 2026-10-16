// =====================================================================
//  ADAPTIVE PRACTICE
//  Each math type has a level: -1 easier, 0 normal (the parent's grade), +1 challenge (one grade up).
//  Levels follow recent accuracy and speed for THAT type, never the combo streak (a miss would otherwise punish success).
//  Weak types are served more often, but no type takes more than half the problems. Tournaments and duels ignore all of this.
//  Everything lives in state.adapt: on, miss (misses in a row), easy (queued warm-ups: one after every miss that was not a Challenge), calm (step back after a missed challenge),
//  recent (last results per type: '0' wrong, '1' right, '2' right and fast), tier, served (last problems: 'c' challenge, 'n' normal).
// =====================================================================
function easyScore(p) {
  const plain = (p.expr || (p.num1 + ' ' + p.num2)).replace(/<[^>]+>/g, '');
  return plain.length + String(Math.abs(p.answer)).length * 2;
}
// A gentler problem: one grade down (never below the type's own grade, or the lowest level a parent allows) and the simplest of five tries.
function genEasy(id) {
  const op = OP_BY_ID[id];
  const g = Math.max(op.minGrade, state.grade - 1, ctlFloor());
  let best = null;
  for (let i = 0; i < 5; i++) {
    const c = op.gen(g);
    if (!best || easyScore(c) < easyScore(best)) best = c;
  }
  return best;
}
function genChallenge(id) { return OP_BY_ID[id].gen(Math.max(OP_BY_ID[id].minGrade, Math.min(state.grade + 1, GRADES.length - 1))); }

function opTier(op) { return state.adapt.on ? (state.adapt.tier[op] || 0) : 0; }
function canChallenge() { return state.grade < GRADES.length - 1; }
const TIER_NAMES = { '-1': 'Easier', '0': 'Normal', '1': 'Challenge' };

// Share of recent tries answered correctly for a type, or null while there is too little to judge.
function recentAccuracy(op) {
  const r = state.adapt.recent[op] || '';
  if (r.length >= 5) return r.replace(/0/g, '').length / r.length;
  const w = sumDays(lastDayKeys(14)).byOp[op];
  return w && w[0] >= 5 ? w[1] / w[0] : null;
}

// Records one answer and moves the type's level when the recent record says so. Returns the change (-1, 0 or +1).
function recordAdaptive(op, correct, fast) {
  const a = state.adapt, E = ECON.adaptive;
  a.recent[op] = ((a.recent[op] || '') + (correct ? (fast ? '2' : '1') : '0')).slice(-E.window);
  if (!a.on) return 0;
  const r = a.recent[op], right = r.replace(/0/g, '').length;
  const acc = right / r.length, fastShare = right ? r.replace(/[01]/g, '').length / right : 0;
  const tier = a.tier[op] || 0;
  let change = 0;
  if (r.length >= E.upAfter && acc >= E.upAccuracy && fastShare >= E.upFastShare && tier < 1 && canChallenge()) change = 1;
  else if (r.length >= E.downAfter && acc <= E.downAccuracy && tier > -1) change = -1;
  if (change) {
    a.tier[op] = tier + change;
    a.recent[op] = '';                       // the next move needs fresh evidence
    toast(change > 0 ? '📈 ' + OP_BY_ID[op].label + ': ready for Challenge problems!' : '🌱 ' + OP_BY_ID[op].label + ': easier problems for a while');
  }
  return change;
}

function noteServed(challenge) {
  state.adapt.served = (state.adapt.served + (challenge ? 'c' : 'n')).slice(-ECON.adaptive.servedWindow);
}
function challengeBudgetLeft() {
  return (state.adapt.served.match(/c/g) || []).length < ECON.adaptive.maxChallengeServed;
}

// A parent's "extra practice" (+N% of all problems for a type): that type gains N points of share and the others give them up evenly.
function applyBoost(ops, p) {
  const b = parentCtl && parentCtl.boost;
  if (!b) return p;
  let q = p.slice();
  ops.forEach(function (op, i) {
    const extra = (b[op] || 0) / 100;
    if (!extra || q[i] >= 1) return;
    const rest = 1 - q[i], add = Math.min(extra, rest - 1e-6);
    q = q.map(function (x, j) { return j === i ? x + add : x * (rest - add) / rest; });
  });
  return q;
}

// Weights for picking the next math type: weaker types get more, the boss weak point gets its share, nobody exceeds the cap.
function typeShares(ops, weakOp) {
  const E = ECON.adaptive;
  const w = ops.map(function (op) {
    const acc = state.adapt.on ? recentAccuracy(op) : null;
    return acc === null ? 1 : 1 + E.weakBoost * Math.max(0, (E.upAccuracy - acc) / E.upAccuracy);
  });
  const sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
  const wi = weakOp ? ops.indexOf(weakOp) : -1;
  if (wi >= 0 && ops.length > 1 && w[wi] / sum(w) < E.bossWeakShare) {     // lift the boss weak point to its share, never lower it
    w[wi] = (sum(w) - w[wi]) * E.bossWeakShare / (1 - E.bossWeakShare);
  }
  let p = applyBoost(ops, w.map(function (x) { return x / sum(w); }));
  const cap = Math.max(E.maxTypeShare, 1 / ops.length);
  for (let pass = 0; pass < 4; pass++) {          // clip anything over the cap and share the excess among the rest
    const over = p.filter(function (x) { return x > cap + 1e-9; }).length;
    if (!over) break;
    const free = p.reduce(function (a, x) { return a + (x > cap ? 0 : x); }, 0);
    const room = 1 - cap * over;
    p = p.map(function (x) { return x > cap ? cap : x * room / free; });
  }
  return p;
}

// Chooses what to ask next: {op, kind: 'warmup' | 'easier' | 'challenge' | 'normal', make()}.
// 'warmup' is the one-off easy problem right after a miss (a quick win); 'easier' and 'challenge' follow the type's level.
function pickNextProblem(lastOp) {
  const ops = getActiveOps();
  const a = state.adapt;
  const queued = ops.filter(function (o) { return a.easy[o]; });
  let id;
  if (queued.length) id = queued[0];
  else {
    const pool = ops.length > 1 ? ops.filter(function (o) { return o !== lastOp; }) : ops;
    const shares = typeShares(pool, getWeakOp());
    let roll = Math.random();
    id = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) { roll -= shares[i]; if (roll < 0) { id = pool[i]; break; } }
  }
  let kind = 'normal';
  if (a.easy[id]) { kind = 'warmup'; delete a.easy[id]; }
  else if (a.calm[id]) { delete a.calm[id]; }
  else if (opTier(id) < 0) kind = 'easier';
  else if (opTier(id) > 0 && canChallenge() && challengeBudgetLeft()) kind = 'challenge';
  return { op: id, kind: kind, make: function () { return kind === 'warmup' || kind === 'easier' ? genEasy(id) : kind === 'challenge' ? genChallenge(id) : OP_BY_ID[id].gen(opGrade(OP_BY_ID[id])); } };
}
