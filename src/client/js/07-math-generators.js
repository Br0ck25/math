// =====================================================================
//  MATH PROBLEM GENERATORS  (grade 0=K-2 ... 5=Calculus)
// =====================================================================
function vert(n1, n2, op, ans) {
  return { layout: 'vertical', num1: n1, num2: n2, operator: op, answer: ans };
}

function genAdd(g) {
  let n1, n2;
  if (g === 0) { n1 = rnd(2, 15); n2 = rnd(1, 12); }
  else if (g === 1) {
    if (Math.random() > 0.4) { n1 = rnd(100, 750); n2 = rnd(50, 240); }
    else { n1 = rnd(15, 99); n2 = rnd(10, 89); }
  }
  else if (g === 2) { n1 = rnd(120, 9999); n2 = rnd(100, 5999); }
  else { n1 = rnd(1000, 59999); n2 = rnd(1000, 39999); }
  return vert(n1, n2, '+', n1 + n2);
}

function genSub(g) {
  let big, small;
  if (g === 0) { big = rnd(5, 20); small = rnd(1, big - 1); }
  else if (g === 1) {
    if (Math.random() > 0.4) { big = rnd(100, 950); small = rnd(25, big - 10); }
    else { big = rnd(20, 99); small = rnd(5, big - 5); }
  }
  else if (g === 2) { big = rnd(200, 9999); small = rnd(50, big - 10); }
  else { big = rnd(2000, 99999); small = rnd(1000, big - 100); }
  return vert(big, small, '−', big - small);
}

function genMul(g) {
  let a, b;
  if (g === 0) { a = rnd(2, 5); b = rnd(1, 5); }
  else if (g === 1) { a = rnd(2, 12); b = rnd(2, 12); }
  else if (g === 2) { a = rnd(11, 30); b = rnd(3, 12); }
  else if (g === 3) { a = rnd(11, 49); b = rnd(11, 29); }
  else { a = rnd(21, 99); b = rnd(11, 60); }
  return { layout: 'inline', expr: a + ' × ' + b, answer: a * b };
}

function genDiv(g) {
  let d, q;
  if (g === 0) { d = rnd(2, 5); q = rnd(1, 5); }
  else if (g === 1) { d = rnd(2, 12); q = rnd(2, 12); }
  else if (g === 2) { d = rnd(3, 15); q = rnd(5, 25); }
  else if (g === 3) { d = rnd(6, 25); q = rnd(12, 60); }
  else { d = rnd(11, 45); q = rnd(15, 99); }
  return { layout: 'inline', expr: (d * q) + ' ÷ ' + d, answer: q };
}

function genFrac(g) {
  const dens = g === 1 ? [2, 3, 4, 5, 10] : [2, 3, 4, 5, 6, 8, 10, 12];
  const d = pick(dens);
  const n = rnd(1, d - 1);
  const whole = d * rnd(2, g === 1 ? 8 : 15);
  return { expr: n + '/' + d + ' of ' + whole, answer: whole / d * n };
}

function genMean(g) {
  const count = rnd(4, 5);
  const m = rnd(5, g === 1 ? 20 : 60);
  let nums, last;
  do {
    nums = [];
    for (let i = 0; i < count - 1; i++) nums.push(rnd(Math.max(1, m - 8), m + 8));
    last = m * count - nums.reduce(function (a, b) { return a + b; }, 0);
  } while (last < 1 || last > m + 20);
  nums.push(last);
  return { layout: 'stack', expr: 'Average of ' + nums.join(', '), lead: 'Mean =', answer: m };
}

function genPow(g) {
  let b, e;
  if (g === 1) { b = rnd(2, 12); e = 2; }
  else if (g === 2) {
    if (Math.random() < 0.6) { b = rnd(2, 15); e = 2; } else { b = rnd(2, 6); e = 3; }
  } else {
    const t = rnd(0, 2);
    if (t === 0) { b = rnd(2, 9); e = rnd(2, 4); }
    else if (t === 1) { b = 2; e = rnd(5, 12); }
    else { b = rnd(3, 5); e = rnd(3, 5); }
  }
  return { layout: 'inline', expr: b + '<sup>' + e + '</sup>', answer: Math.pow(b, e) };
}

function genSqrt(g) {
  const useCube = g >= 2 && Math.random() < 0.3;
  if (useCube) {
    const r = rnd(2, g >= 3 ? 12 : 10);
    return { layout: 'inline', expr: '∛' + (r * r * r), answer: r };
  }
  const max = g === 1 ? 12 : (g === 2 ? 20 : (g === 3 ? 30 : 40));
  const r = rnd(2, max);
  return { layout: 'inline', expr: '√' + (r * r), answer: r };
}

function genOrder(g) {
  let expr, ans, a, b, c, d;
  if (g <= 1) {
    const t = rnd(0, 2);
    a = rnd(2, 9); b = rnd(2, 9); c = rnd(2, 9);
    if (t === 0) { expr = a + ' + ' + b + ' × ' + c; ans = a + b * c; }
    else if (t === 1) { c = rnd(1, Math.min(9, a * b - 1)); expr = a + ' × ' + b + ' − ' + c; ans = a * b - c; }
    else { expr = a + ' × ' + b + ' + ' + c; ans = a * b + c; }
  } else if (g === 2) {
    const t = rnd(0, 2);
    if (t === 0) { a = rnd(2, 12); b = rnd(2, 12); c = rnd(2, 9); expr = '(' + a + ' + ' + b + ') × ' + c; ans = (a + b) * c; }
    else if (t === 1) { a = rnd(10, 30); b = rnd(2, 9); c = rnd(2, 9); d = rnd(1, 15); expr = a + ' + ' + b + ' × ' + c + ' − ' + d; ans = a + b * c - d; }
    else { a = rnd(10, 30); b = rnd(2, a - 1); c = rnd(2, 9); d = rnd(1, 20); expr = '(' + a + ' − ' + b + ') × ' + c + ' + ' + d; ans = (a - b) * c + d; }
  } else {
    const t = rnd(0, 2);
    if (t === 0) { a = rnd(5, 30); b = rnd(2, 9); c = rnd(2, 9); d = rnd(2, 9); expr = a + ' + ' + b + '<sup>2</sup> − ' + c + ' × ' + d; ans = a + b * b - c * d; }
    else if (t === 1) { a = rnd(1, 9); b = rnd(1, 9); c = rnd(1, 40); expr = '(' + a + ' + ' + b + ')<sup>2</sup> − ' + c; ans = (a + b) * (a + b) - c; }
    else { a = rnd(2, 9); b = rnd(2, 12); c = rnd(2, 12); d = rnd(2, 9); expr = a + ' × (' + b + ' − ' + c + ') + ' + d + '<sup>2</sup>'; ans = a * (b - c) + d * d; }
  }
  return { layout: 'stack', expr: expr, lead: '=', answer: ans };
}

function genPct(g) {
  const pcts = g === 2 ? [10, 20, 25, 50, 75] : [5, 10, 15, 20, 25, 30, 40, 60, 75, 80, 90, 120, 150];
  const p = pick(pcts);
  const step = 100 / gcd(p, 100);
  const base = step * rnd(1, g === 2 ? 8 : 20);
  return { layout: 'inline', expr: p + '% of ' + base, answer: base * p / 100 };
}

function genDec(g) {
  const dp = g >= 3 ? 2 : 1;
  const sc = Math.pow(10, dp);
  const a = rnd(11, g >= 3 ? 3999 : 399) / sc;
  const b = rnd(11, g >= 3 ? 2999 : 299) / sc;
  const t = rnd(0, 2);
  if (t === 0) return { expr: a.toFixed(dp) + ' + ' + b.toFixed(dp), answer: a + b };
  if (t === 1) {
    const hi = Math.max(a, b), lo = Math.min(a, b);
    return { expr: hi.toFixed(dp) + ' − ' + lo.toFixed(dp), answer: hi - lo };
  }
  const m = rnd(2, 9);
  return { expr: a.toFixed(dp) + ' × ' + m, answer: a * m };
}

function genNeg(g) {
  const R = g >= 3 ? 60 : 20;
  const sign = function () { return Math.random() < 0.5 ? -1 : 1; };
  const t = rnd(0, 3);
  let a, b;
  if (t === 2) {
    a = rnd(2, 12) * sign(); b = rnd(2, 12) * sign();
    if (a > 0 && b > 0) a = -a;
    return { layout: 'inline', expr: negFirst(a) + ' × ' + negParen(b), answer: a * b };
  }
  if (t === 3) {
    b = rnd(2, 12) * sign(); const q = rnd(2, 12) * sign();
    if (b > 0 && q > 0) b = -b;
    return { layout: 'inline', expr: negFirst(b * q) + ' ÷ ' + negParen(b), answer: q };
  }
  a = rnd(2, R) * sign(); b = rnd(2, R) * sign();
  if (a > 0 && b > 0) b = -b;
  if (t === 0) return { layout: 'stack', expr: negFirst(a) + ' + ' + negParen(b), lead: '=', answer: a + b };
  return { layout: 'stack', expr: negFirst(a) + ' − ' + negParen(b), lead: '=', answer: a - b };
}

function genAlg(g) {
  let expr, x;
  if (g === 2) {
    x = rnd(2, 20);
    if (Math.random() < 0.5) { const a = rnd(2, 20); expr = 'x + ' + a + ' = ' + (x + a); }
    else { const a = rnd(2, 9); x = rnd(2, 12); expr = a + 'x = ' + (a * x); }
  } else if (g === 3) {
    const a = rnd(2, 9), b = rnd(-20, 20) || 5;
    x = rnd(-10, 12) || 3;
    const c = a * x + b;
    expr = a + 'x ' + sgnStr(b) + ' = ' + negFirst(c);
  } else {
    let a, b, c, d;
    do {
      a = rnd(3, 12); c = rnd(1, a - 1); x = rnd(-9, 12) || 4; b = rnd(-15, 15);
      d = a * x + b - c * x;
    } while (b === 0 || d === 0);
    expr = a + 'x ' + sgnStr(b) + ' = ' + c + 'x ' + sgnStr(d);
  }
  return { layout: 'stack', expr: expr, lead: 'x =', answer: x };
}

function genLog(g) {
  if (g >= 4 && Math.random() < 0.3) {
    const k = rnd(2, 9);
    return { layout: 'inline', expr: 'ln(e<sup>' + k + '</sup>)', answer: k };
  }
  const opts = [[2, 2, 10], [3, 2, 6], [4, 2, 5], [5, 2, 4], [10, 2, 6]];
  const o = pick(opts);
  const k = rnd(o[1], o[2]);
  return { layout: 'inline', expr: 'log<sub>' + o[0] + '</sub>(' + Math.pow(o[0], k) + ')', answer: k };
}

function genQuad(g) {
  let r, s;
  do {
    r = g === 3 ? rnd(1, 9) : rnd(-9, 9);
    s = g === 3 ? rnd(1, 9) : rnd(-9, 9);
  } while (r === s || r === 0 || s === 0);
  const expr = polyStr([[1, 2], [-(r + s), 1], [r * s, 0]]) + ' = 0';
  return { layout: 'stack', expr: expr, lead: 'Larger root x =', answer: Math.max(r, s) };
}

function genDeriv(g) {
  const deg = g >= 5 ? rnd(3, 4) : rnd(2, 3);
  const terms = [];
  for (let e = deg; e >= 0; e--) {
    const c = e === deg ? rnd(1, 5) * (Math.random() < 0.3 ? -1 : 1) : (Math.random() < 0.7 ? rnd(-6, 6) : 0);
    terms.push([c, e]);
  }
  const x0 = rnd(-3, 4);
  let val = 0;
  terms.forEach(function (t) { if (t[1] > 0) val += t[0] * t[1] * Math.pow(x0, t[1] - 1); });
  return { layout: 'stack', expr: 'f(x) = ' + polyStr(terms), lead: 'f′(' + negFirst(x0) + ') =', answer: val };
}

function genIntegral(g) {
  const d = rnd(2, g >= 5 ? 4 : 3);
  const k = rnd(1, g >= 5 ? 4 : 3);
  const anti = [];
  for (let i = 0; i < d; i++) {
    anti.push(i === d - 1 ? rnd(1, 3) * (Math.random() < 0.3 ? -1 : 1) : rnd(-3, 3));
  }
  const terms = [];
  let val = 0;
  for (let i = d - 1; i >= 0; i--) {
    terms.push([(i + 1) * anti[i], i]);
    val += anti[i] * Math.pow(k, i + 1);
  }
  return {
    layout: 'stack',
    expr: '∫<sub>0</sub><sup>' + k + '</sup> (' + polyStr(terms) + ') dx',
    lead: '=',
    answer: val
  };
}

function genLimit() {
  const t = rnd(0, 2);
  if (t === 0) {
    let r = rnd(-4, 6); if (r === 0) r = 3;
    const s = rnd(-5, 8);
    const num = polyStr([[1, 2], [s - r, 1], [-r * s, 0]]);
    const den = r > 0 ? 'x − ' + r : 'x + ' + (-r);
    return { layout: 'stack', expr: 'lim<sub>x→' + r + '</sub> (' + num + ') / (' + den + ')', lead: '=', answer: r + s };
  }
  if (t === 1) {
    const a = rnd(1, 4), k = rnd(2, 6), b = rnd(-5, 5), c = rnd(1, 9);
    const num = polyStr([[k * a, 2], [b, 1]]);
    const den = polyStr([[a, 2], [c, 0]]);
    return { layout: 'stack', expr: 'lim<sub>x→∞</sub> (' + num + ') / (' + den + ')', lead: '=', answer: k };
  }
  const a = rnd(2, 9);
  return { layout: 'stack', expr: 'lim<sub>x→0</sub> sin(' + a + 'x) / x', lead: '=', answer: a };
}

const HARD_OPS = ['mean', 'order', 'alg', 'log', 'quad', 'deriv', 'integral', 'limit', 'dec'];

const MATH_OPS = [
  { id: 'add',      icon: '➕',   label: 'Addition',             minGrade: 0, gen: genAdd },
  { id: 'sub',      icon: '➖',   label: 'Subtraction',          minGrade: 0, gen: genSub },
  { id: 'mul',      icon: '✖️',   label: 'Multiplication',       minGrade: 0, gen: genMul },
  { id: 'div',      icon: '➗',   label: 'Division',             minGrade: 0, gen: genDiv },
  { id: 'frac',     icon: '🍕',   label: 'Fractions of a number', minGrade: 1, gen: genFrac },
  { id: 'mean',     icon: '📊',   label: 'Averages (mean)',      minGrade: 1, gen: genMean },
  { id: 'pow',      icon: 'xⁿ',   label: 'Exponents',            minGrade: 1, gen: genPow },
  { id: 'sqrt',     icon: '√',    label: 'Roots',                minGrade: 1, gen: genSqrt },
  { id: 'order',    icon: '🧮',   label: 'Order of operations',  minGrade: 1, gen: genOrder },
  { id: 'pct',      icon: '%',    label: 'Percents',             minGrade: 2, gen: genPct },
  { id: 'dec',      icon: '0.5',  label: 'Decimals',             minGrade: 2, gen: genDec },
  { id: 'neg',      icon: '±',    label: 'Negative numbers',     minGrade: 2, gen: genNeg },
  { id: 'alg',      icon: '𝑥',    label: 'Solve for x',          minGrade: 2, gen: genAlg },
  { id: 'log',      icon: 'log',  label: 'Logarithms',           minGrade: 3, gen: genLog },
  { id: 'quad',     icon: 'x²',   label: 'Quadratics',           minGrade: 3, gen: genQuad },
  { id: 'deriv',    icon: 'd/dx', label: 'Derivatives',          minGrade: 4, gen: genDeriv },
  { id: 'integral', icon: '∫',    label: 'Integrals',            minGrade: 4, gen: genIntegral },
  { id: 'limit',    icon: 'lim',  label: 'Limits',               minGrade: 5, gen: genLimit }
];
const OP_BY_ID = {};
MATH_OPS.forEach(function (o) { OP_BY_ID[o.id] = o; });

function getActiveOps() {
  const g = state.grade;
  let ops = (state.enabledOps || []).filter(function (id) {
    return OP_BY_ID[id] && OP_BY_ID[id].minGrade <= g;
  });
  if (ops.length === 0) {
    ops = GRADE_DEFAULT_OPS[g].filter(function (id) { return OP_BY_ID[id] && OP_BY_ID[id].minGrade <= g; });
  }
  return ops.length ? ops : ['add'];
}

// Multiple-choice question from any problem source (tournament, duels and the vault share this).
//   opts.op       math type id (default: a random active type)
//   opts.problem  function(op) -> {layout, expr|num1/num2/operator, answer, lead}  (default: the game generators)
//   opts.count    number of answer buttons (default 4)
function makeMcq(opts) {
  opts = opts || {};
  const op = opts.op || pick(getActiveOps());
  const p = opts.problem ? opts.problem(op) : OP_BY_ID[op].gen(state.grade);
  const ans = Math.round(p.answer * 100) / 100;
  const expr = p.layout === 'vertical' ? p.num1 + ' ' + p.operator + ' ' + p.num2 : p.expr;
  const mag = Math.abs(ans);
  const step = Number.isInteger(ans) ? (mag >= 100 ? Math.pow(10, Math.floor(Math.log10(mag)) - 1) : 1) : 0.1;
  const count = opts.count || 4;
  const choices = [ans];
  let guard = 0;
  while (choices.length < count && guard++ < 80) {
    const k = rnd(1, 5) * (Math.random() < 0.5 ? -1 : 1);
    const v = Math.round((ans + k * step) * 100) / 100;
    if (choices.indexOf(v) === -1 && (ans < 0 || v >= 0)) choices.push(v);
  }
  choices.sort(function () { return Math.random() - 0.5; });
  return { op: op, ans: ans, opts: choices, expr: expr, lead: p.lead || '=', html: expr + ' <span style="color:var(--text-muted);">' + (p.lead || '=') + ' ?</span>' };
}
function fillOptButtons(box, opts, onPick) {
  box.innerHTML = '';
  opts.forEach(function (v) {
    const b = document.createElement('button');
    b.className = 'vault-btn';
    b.innerText = fmtAns(v);
    b.onclick = function () { onPick(v, b); };
    box.appendChild(b);
  });
}

let currentProblem = { layout: 'inline', expr: '', answer: 0, modeTag: 'add' };
let userInput = '';
let questionStartTime = Date.now();
let lastOpId = null;
let inputLocked = false;

let lastSig = '';
function sigOf(p) { return (p.expr || (p.num1 + p.operator + p.num2)) + '|' + p.answer; }

// ----- streak milestone celebrations -----
const MILESTONES = {
  5: { text: '🔥 5 IN A ROW!', sub: 'Nice combo!' },
  10: { text: '⚡ 10 IN A ROW!', sub: 'Unstoppable!' },
  25: { text: '👑 25 IN A ROW!', sub: 'LEGENDARY!' }
};
function soundFanfare(big) {
  const notes = big ? [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51, 1567.98] : [523.25, 659.25, 783.99, 1046.5];
  notes.forEach(function (f, i) { setTimeout(function () { playTone(f, 0.22, 'triangle'); }, i * 95); });
}
function streakMilestone(n) {
  const m = MILESTONES[n];
  state.gems += ECON.milestoneGems[n];
  soundFanfare(n >= 10);
  for (let i = 0; i < (n >= 25 ? 4 : n >= 10 ? 2 : 1); i++) setTimeout(function () { launchConfetti('streak'); }, i * 220);
  const ov = document.getElementById('milestone-overlay');
  document.getElementById('milestone-big').innerText = m.text;
  document.getElementById('milestone-sub').innerText = m.sub + ' +' + ECON.milestoneGems[n] + ' 💎';
  ov.classList.remove('show');
  void ov.offsetWidth;
  ov.classList.add('show');
  setTimeout(function () { ov.classList.remove('show'); }, 1900);
  const w = document.getElementById('fighter-icon-wrapper');
  w.classList.remove('buddy-dance');
  void w.offsetWidth;
  w.classList.add('buddy-dance');
  setTimeout(function () { w.classList.remove('buddy-dance'); }, 1300);
}

// ----- boss weak points: one math type hits this boss extra hard -----
const ELEM_WEAK_OPS = {
  fire: ['mul', 'pow', 'pct'],
  water: ['sub', 'div', 'frac'],
  nature: ['add', 'mean', 'order'],
  electric: ['mul', 'div', 'sqrt', 'alg'],
  dark: ['sub', 'neg', 'log'],
  magic: ['alg', 'order', 'frac', 'quad', 'limit']
};
function weakOpForBoss(idx) {
  const ops = getActiveOps();
  if (ops.length < 2 || idx < 0 || !monstersList[idx]) return null;
  const pref = (ELEM_WEAK_OPS[monstersList[idx].element] || []).filter(function (o) { return ops.indexOf(o) !== -1; });
  const pool = pref.length ? pref : ops;
  return pool[idx % pool.length];
}
function getWeakOp() {
  if (state.wild.id) return null;                       // wild buddies have no weak point; only bosses do
  const r = state.raid;
  if (r) {
    const ops = getActiveOps();
    const w = r.weaks[r.phase];
    return ops.length >= 2 && ops.indexOf(w) !== -1 ? w : null;
  }
  return weakOpForBoss(currentMonsterIndex);
}
// The small chip beside the type hint: a wild buddy's catch chance, or a boss's weak point (and raid phase). Kept short so it shares one row.
function updateWeakChip() {
  const chip = document.getElementById('weak-chip');
  if (!chip) return;
  const r = state.raid;
  const gym = state.gym ? '🏟️ ' + Math.min(state.gym.step + 1, ECON.map.trainers + 1) + '/' + (ECON.map.trainers + 1) : '';
  if (state.wild.id && state.wild.trainer) {
    chip.innerText = gym + ' · Trainer';
    chip.title = 'A gym trainer: beat all of them, then the leader. Trainer buddies cannot be caught.';
    return;
  }
  if (state.wild.id) {
    chip.innerText = (state.wild.legend ? '🌟 ' : '') + (state.wild.shiny ? '✨ ' : '') + '🫧 Catch ' + Math.round(wildCatchChance(getSpecies(state.wild.id), { shiny: state.wild.shiny }) * 100) + '%' + (state.nets > 0 ? ' 🕸️' + state.nets : '');
    chip.title = 'Chance to catch this buddy when you win. Better when your buddy is strong against it, and a win with no mistakes adds ' + Math.round((ECON.wild.flawless - 1) * 100) + '%. With Catch Nets you choose how many to throw after the win.';
    return;
  }
  const w = getWeakOp();
  const head = (gym ? gym + ' Leader' + (w ? ' · ' : '') : '') + (r ? '👑 ' + (r.phase + 1) + '/' + r.total + (w ? ' · ' : '') : '');
  chip.innerText = (w || r || gym) ? head + (w ? '🎯 Weak: ' + OP_BY_ID[w].icon + ' ' + OP_BY_ID[w].label : '') : '';
  chip.title = w ? 'Weak point: solve ' + OP_BY_ID[w].label + ' problems to hit harder' + (r ? ' (raid phase ' + (r.phase + 1) + ' of ' + r.total + ')' : '') : '';
}

function generateProblem() {
  const next = pickNextProblem(lastOpId);
  const id = next.op;
  lastOpId = id;
  let p = next.make();
  for (let tries = 0; tries < 6 && lastSig && sigOf(p) === lastSig; tries++) p = next.make();
  p.easy = next.kind === 'warmup';
  p.challenge = next.kind === 'challenge';
  noteServed(p.challenge);
  lastSig = sigOf(p);
  p.modeTag = id;
  if (!p.layout) {
    const plain = p.expr.replace(/<[^>]+>/g, '');
    p.layout = plain.length > 13 ? 'stack' : 'inline';
  }
  p.answer = Math.round(p.answer * 100) / 100;
  currentProblem = p;
  userInput = '';
  inputLocked = false;
  hintUsed = false;
  renderHintUI();
  updateWeakChip();
  document.getElementById('equation-mount').classList.toggle('challenge', p.challenge);
  questionStartTime = Date.now();
  padReset();
  renderEquationUI();
  holdForSwitch();
}

function renderEquationUI() {
  const mount = document.getElementById('equation-mount');
  const valText = userInput === '' ? '?' : userInput;
  const p = currentProblem;
  mount.classList.toggle('weak-glow', !!p.modeTag && p.modeTag === getWeakOp());

  if (p.layout === 'vertical') {
    mount.innerHTML = `
      <div class="equation-vertical">
        <div class="vertical-row"><span>${p.num1}</span></div>
        <div class="vertical-row bottom-row">
          <span class="vertical-op">${p.operator}</span>
          <span>${p.num2}</span>
        </div>
        <div class="vertical-row">
          <div class="answer-box" id="answer-box">${valText}</div>
        </div>
      </div>`;
  } else if (p.layout === 'inline') {
    mount.innerHTML = `
      <div class="equation-inline">
        <span>${p.expr}</span>
        <span>=</span>
        <div class="answer-box" id="answer-box">${valText}</div>
      </div>`;
  } else {
    mount.innerHTML = `
      <div class="equation-stack">
        <div class="eq-expr">${p.expr}</div>
        <div class="eq-ans">
          <span class="eq-lead">${p.lead || '='}</span>
          <div class="answer-box" id="answer-box">${valText}</div>
        </div>
      </div>`;
  }
}

function pressKey(key) {
  if (inputLocked) return;
  soundClick();
  if (key === 'backspace') {
    userInput = userInput.slice(0, -1);
  } else if (key === 'clear') {
    userInput = '';
  } else if (key === 'neg') {
    userInput = userInput.charAt(0) === '-' ? userInput.slice(1) : '-' + userInput;
  } else if (key === 'dot') {
    if (userInput.indexOf('.') === -1) {
      const body = userInput.replace('-', '');
      userInput = body === '' ? userInput + '0.' : userInput + '.';
    }
  } else {
    if (userInput.replace('-', '').length < 7) {
      if (userInput === '0') userInput = key;
      else if (userInput === '-0') userInput = '-' + key;
      else userInput += key;
    }
  }
  const answerBox = document.getElementById('answer-box');
  if (answerBox) answerBox.innerText = userInput === '' ? '?' : userInput;
  syncPad();
}
