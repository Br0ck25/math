// =====================================================================
//  STUDY (trivia mode): school-subject questions (the questions are in 37-study-data.js and 37a-37h). While it is on, the whole game asks them
//  instead of math: battles, signs, tournaments and duels use makeMcq(), which gives a study question in the same shape. Switch it in Settings.
// =====================================================================
const STUDY_ID_RE = /^[a-z]{3,7}[0-9]{1,4}$|^p[A-Za-z0-9_-]{3,12}$/;
let studyOn = false;             // trivia mode: questions are about school subjects instead of math
function studyAll() { return STUDY_BANK; }

// Does a question belong to a filter ('all', a subject id or 'ky') at a level?
function studyMatch(q, filter, level) {
  if (q.g > level) return false;
  return filter === 'all' || (filter === 'ky' ? q.t === 'ky' : q.s === filter);
}
// The questions for one filter or a list of them (a question in any of them counts).
function studyPool(filter, level) {
  const list = Array.isArray(filter) ? filter : [filter];
  return studyAll().filter(function (q) { return list.some(function (f) { return studyMatch(q, f, level); }); });
}
// The subjects the player ticked that are still on offer; none ticked means all.
function studySelected(filters) {
  const have = (filters || studyFilters()).map(function (f) { return f[0]; });
  const sel = state.study.subjects.filter(function (id) { return id !== 'all' && have.indexOf(id) !== -1; });
  return sel.length ? sel : ['all'];
}
function studyFilters() {
  const lvl = state.study.level;
  const list = [['all', '🎓 All']];
  STUDY_SUBJECTS.forEach(function (s) { if (studyPool(s.id, lvl).length) list.push([s.id, s.icon + ' ' + s.label]); });
  if (studyPool('ky', lvl).length) list.push(['ky', '🏇 Kentucky']);
  return list;
}

// ---- answers ----------------------------------------------------------------
function studyNorm(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/(\d),(\d)/g, '$1$2').replace(/[−–]/g, '-').replace(/&/g, ' and ')
    .replace(/[^a-z0-9./^()+*=:×\- ]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(the|a|an) /, '');
}
// The same, with every space gone, so "x = 5", "x=5" and "(x + 2)(x + 3)" compare equal to their short forms.
function studySquash(s) { return studyNorm(s).replace(/ /g, ''); }
function studyKind(a) { return /^-?[\d,]*\.?\d+$/.test(a) ? 'num' : (/^-?\d+\/\d+$/.test(a) ? 'frac' : 'word'); }
// What a question asks for, guessed from its words: a person, a place, a work (book, song, painting...) or a term. Wrong choices of the same type look right.
function studyType(q) {
  if (/^x-\d/.test(q.a)) return 'match';
  const t = q.q.toLowerCase();
  if (/\b(who|this (man|woman|person|author|poet|writer|artist|composer|president|leader|explorer|general|inventor|philosopher|scientist|dancer|architect|sculptor|painter|king|queen|emperor|ruler|conquistador|playwright|activist|politician|musician|singer|congressman|senator|justice|mathematician|pioneer|abolitionist|aviator|astronaut|physicist|chemist|choreographer|conductor))\b/.test(t)) return 'person';
  if (/\b(where|which (river|city|country|state|mountain|island|continent|ocean|sea|lake|desert|region|colony|empire)|this (river|city|country|state|mountain|island|continent|ocean|sea|lake|desert|region|colony|empire|territory|park|range|capital))\b/.test(t)) return 'place';
  if (/\b(this (novel|book|poem|story|painting|song|musical|opera|play|ballet|symphony|film|sculpture|fable|essay|speech|work|series|show|novella|tragedy|comedy|biography|document|battle|war)|title of)\b/.test(t)) return 'work';
  return 'term';
}
// Four choices: the answer and three wrong ones. A parent's own wrong choices come first; then nearby numbers or fractions; then answers of
// other questions on the same topic or subject.
function studyChoices(q) {
  const want = [q.a].concat(q.alt).map(studySquash), wrong = [];
  const add = function (t) {
    const n = studySquash(t);
    if (n && want.indexOf(n) === -1 && !wrong.some(function (w) { return studySquash(w) === n; })) wrong.push(t);
  };
  q.wrong.forEach(add);
  const kind = studyKind(q.a);
  if (wrong.length < 3 && kind === 'num') {
    const n = parseFloat(q.a.replace(/,/g, ''));
    const commas = q.a.indexOf(',') !== -1;
    shuffled(makeMcq({ count: 6, problem: function () { return { answer: n, expr: '', lead: '' }; } }).opts).forEach(function (v) { add(commas ? v.toLocaleString('en-US') : String(v)); });
  } else if (wrong.length < 3 && kind === 'frac') {
    const p = q.a.split('/').map(Number);
    [[p[0] + 1, p[1]], [Math.max(1, p[0] - 1), p[1]], [p[0], p[1] + 1], [p[1], p[0]], [p[0] + 1, p[1] + 1], [p[0] + 2, p[1]]].forEach(function (f) { add(f[0] + '/' + f[1]); });
  }
  if (wrong.length < 3) {
    const type = studyType(q), words = q.a.split(/\s+/).length, digits = /\d/.test(q.a);
    const rank = function (o) {
      return (studyType(o) === type ? 0 : 12) + (o.s === q.s ? 0 : 8) + (studyKind(o.a) === kind ? 0 : 5) + (/\d/.test(o.a) === digits ? 0 : 6) +
        Math.min(6, Math.abs(o.a.split(/\s+/).length - words) * 2) + Math.random() * 4;
    };
    shuffled(studyAll().filter(function (o) { return o.id !== q.id && (q.parent || !o.parent); })).sort(function (x, y) { return rank(x) - rank(y); }).forEach(function (o) { if (wrong.length < 3) add(o.a); });
  }
  return shuffled([q.a].concat(wrong.slice(0, 3)));
}

// Is this choice the right answer (for a math question, a number; for a study question, the words)?
function mcqRight(v, ans) { return typeof ans === 'string' ? String(v) === ans : Math.abs(v - ans) < 0.0001; }
function studyBuiltin(filters, level) { return STUDY_BANK.filter(function (q) { return filters.some(function (f) { return studyMatch(q, f, level); }); }); }
// A multiple-choice study question in the shape makeMcq gives (so tournaments, duels and the vault need no other changes). `count` = number of choices.
function studyMcq(count) {
  let pool = studyBuiltin(studySelected(), state.study.level);
  if (!pool.length) pool = STUDY_BANK;
  const recent = studyMcq.recent || (studyMcq.recent = []);
  const fresh = pool.filter(function (q) { return recent.indexOf(q.id) === -1; });
  const q = pick(fresh.length ? fresh : pool);
  recent.push(q.id);
  if (recent.length > 15) recent.shift();
  let opts = studyChoices(q);
  if (count && count < opts.length) opts = shuffled([q.a].concat(shuffled(opts.filter(function (o) { return o !== q.a; })).slice(0, count - 1)));
  return { op: 'study', study: q, ans: q.a, opts: opts, expr: q.q, lead: '', html: escHtml(q.q) };
}

function toggleStudy() {
  studyOn = !studyOn;
  soundClick();
  document.body.classList.toggle('trivia', studyOn);
  const b = document.getElementById('study-toggle-btn');
  if (b) b.innerText = studyOn ? 'Questions: school subjects' : 'Questions: math';
}

// The subjects window (Settings > Trivia): one list for grades 6-8 together (every question up to the top grade is in); tick subjects, none ticked means all.
function studyHome() { state.study.level = ECON.study.maxLevel; showModal('study-modal', renderStudyHome); }
function closeStudyHome() { hideModal('study-modal'); }
function renderStudyHome() {
  const sel = studySelected();
  document.getElementById('study-subjects').innerHTML = studyFilters().filter(function (f) { return f[0] !== 'all'; }).map(function (f) {
    return '<button type="button" class="grade-btn' + (sel.indexOf(f[0]) !== -1 && sel[0] !== 'all' ? ' active' : '') + '" onclick="studyToggleSubject(\'' + f[0] + '\')">' + escHtml(f[1]) + '</button>';
  }).join('');
}
function studyToggleSubject(id) {
  const cur = state.study.subjects, i = cur.indexOf(id);
  if (i === -1) cur.push(id); else cur.splice(i, 1);
  soundClick(); saveState(); renderStudyHome();
}
