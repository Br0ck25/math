// =====================================================================
//  STUDY: school-subject questions for grades 6-8 (the questions are in 37-study-data.js and 37a-37e; a parent can add more, see
//  35b-parent-study.js and src/server/17-study.js). Three ways to study: flashcards (self-marked, no gems), Quick Recall (multiple choice)
//  and Type it. Only the last two pay, and only a little: `ECON.study` has the numbers (a daily gem cap, and a question pays again only after
//  `freshDays` days) so easy cards cannot be farmed. Missed questions come back first. Nothing here punishes: a wrong answer shows the answer.
// =====================================================================
const STUDY_PARENT_KEY = 'math_quest_pq';
const STUDY_ID_RE = /^[a-z]{3,7}[0-9]{1,4}$|^p[A-Za-z0-9_-]{3,12}$/;
let parentQs = [];               // questions this player's parent added (already cleaned)
let parentOnly = false;           // the parent chose "only my questions": the built-in ones are hidden
let parentQsOwner = '';          // the player name they belong to (never show one player's to another)
let studyOn = false;             // the study pane is showing instead of the math problem
let studyScreen = 'home';        // 'home' | 'card' | 'done'
let studyRound = null;           // { mode, qs, i, results, phase, t0 }
let studyNote = '';

// ---- the questions --------------------------------------------------------
function cleanParentQ(r) {
  const c = cleanStudyQ(r);
  if (!c || typeof r.id !== 'string' || !/^p[A-Za-z0-9_-]{3,12}$/.test(r.id)) return null;
  return { id: r.id, s: c.s, g: ECON.study.minLevel, t: 'parent', q: c.q, a: c.a, alt: c.alt, x: '', wrong: c.wrong, parent: true };
}
function setParentQs(list, owner, only) {
  parentOnly = only === true;
  parentQs = (Array.isArray(list) ? list : []).map(cleanParentQ).filter(Boolean).slice(0, ECON.study.parent.max);
  parentQsOwner = owner || '';
  try {
    if (parentQs.length) localStorage.setItem(STUDY_PARENT_KEY, JSON.stringify({ name: parentQsOwner, only: parentOnly, qs: parentQs.map(function (q) { return { id: q.id, s: q.s, q: q.q, a: q.a, alt: q.alt, wrong: q.wrong }; }) }));
    else localStorage.removeItem(STUDY_PARENT_KEY);
  } catch (e) {}
}
(function loadParentQs() {
  try {
    const c = JSON.parse(localStorage.getItem(STUDY_PARENT_KEY));
    if (c && typeof c.name === 'string' && acct && acct.name === c.name) setParentQs(c.qs, c.name, c.only);
  } catch (e) {}
})();
// A parent's questions for the player who is signed in right now.
function studyParent() { return acct && parentQsOwner === acct.name ? parentQs : []; }
// Only the parent's questions are used (they must have added some, or Study would be empty).
function studyOnlyParent() { return parentOnly && studyParent().length > 0; }
async function studyLoadParent() {
  if (!acct) return;
  try {
    const r = await api('/api/study');
    if (r.status === 200 && Array.isArray(r.data.questions)) { setParentQs(r.data.questions, acct.name, r.data.only); if (studyScreen === 'home') studyRender(); }
  } catch (e) {}
}
function studyAll() { return STUDY_BANK.concat(studyParent()); }

// Does a question belong to a filter ('all', a subject id, 'ky' or 'parent') at a level? A parent's questions ignore the level.
function studyMatch(q, filter, level) {
  if (q.parent) return filter === 'all' || filter === 'parent' || filter === q.s;
  if (filter === 'parent' || q.g > level) return false;
  return filter === 'all' || (filter === 'ky' ? q.t === 'ky' : q.s === filter);
}
// The questions for one filter or a list of them (a question in any of them counts).
function studyPool(filter, level) {
  const only = studyOnlyParent(), list = Array.isArray(filter) ? filter : [filter];
  return studyAll().filter(function (q) { return (!only || q.parent) && list.some(function (f) { return studyMatch(q, f, level); }); });
}
// The subjects the player ticked that are still on offer; none ticked means all.
function studySelected(filters) {
  const have = (filters || studyFilters()).map(function (f) { return f[0]; });
  const sel = state.study.subjects.filter(function (id) { return id !== 'all' && have.indexOf(id) !== -1; });
  return sel.length ? sel : ['all'];
}
function studyFilters() {
  const lvl = state.study.level;
  const list = [['all', studyOnlyParent() ? '👪 My parent\'s questions' : '🎓 All']];
  STUDY_SUBJECTS.forEach(function (s) { if (studyPool(s.id, lvl).length) list.push([s.id, s.icon + ' ' + s.label]); });
  if (studyOnlyParent()) return list;
  list.push(['ky', '🏇 Kentucky']);
  if (studyParent().length) list.push(['parent', '👪 From my parent']);
  return list;
}

// ---- answers ----------------------------------------------------------------
function studyNorm(s) {
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/(\d),(\d)/g, '$1$2').replace(/[−–]/g, '-').replace(/&/g, ' and ')
    .replace(/[^a-z0-9./^()+*=:×\- ]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(the|a|an) /, '');
}
// The same, with every space gone, so "x = 5", "x=5" and "(x + 2)(x + 3)" compare equal to their short forms.
function studySquash(s) { return studyNorm(s).replace(/ /g, ''); }
function oneEditApart(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}
// Is the typed text right? Case, accents, spaces, "the", commas in numbers and one slip of the finger in a long word are all fine.
function studyCheck(q, text) {
  const t = studySquash(text);
  if (!t) return false;
  const good = [q.a].concat(q.alt).map(studySquash);
  if (good.indexOf(t) !== -1) return true;
  if (/\d/.test(t)) return false;
  return good.some(function (g) { return !/\d/.test(g) && g.length >= 6 && oneEditApart(g, t); });
}
function studyKind(a) { return /^-?[\d,]*\.?\d+$/.test(a) ? 'num' : (/^-?\d+\/\d+$/.test(a) ? 'frac' : 'word'); }
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
    const rank = function (o) { return (o.t === q.t ? 0 : (o.s === q.s ? 1 : 2)) * 10 + (studyKind(o.a) === kind ? 0 : 5) + Math.random() * 4; };
    shuffled(studyAll().filter(function (o) { return o.id !== q.id; })).sort(function (x, y) { return rank(x) - rank(y); }).forEach(function (o) { if (wrong.length < 3) add(o.a); });
  }
  return shuffled([q.a].concat(wrong.slice(0, 3)));
}

// ---- what is remembered ------------------------------------------------------
function studyDay() {
  const st = state.study, k = dayKey();
  if (st.day !== k) { st.day = k; st.gems = 0; }
  return st;
}
// A question pays again only after ECON.study.freshDays days.
function studyFresh(id) {
  const p = state.study.paid[id];
  return p === undefined || dayNumber() - p >= ECON.study.freshDays;
}
function studyRecord(q, ok) {
  const st = state.study, e = st.seen[q.id] || (st.seen[q.id] = [0, 0, 0]);
  e[ok ? 0 : 1] += 1;
  e[2] = dayNumber();
  const i = st.miss.indexOf(q.id);
  if (ok && i !== -1) st.miss.splice(i, 1);
  if (!ok && i === -1) { st.miss.push(q.id); if (st.miss.length > ECON.study.missMax) st.miss.shift(); }
}
// The parent report counts answers to typed and multiple-choice questions (flashcards are marked by the player, so they are not counted).
function studyStat(q, ok, secs) {
  const d = statDay();
  if (!d.st) d.st = [0, 0];
  if (!d.sub) d.sub = {};
  d.st[0] += 1;
  if (ok) d.st[1] += 1;
  const o = d.sub[q.s] || (d.sub[q.s] = [0, 0]);
  o[0] += 1;
  if (ok) o[1] += 1;
  d.ms += Math.round(Math.min(Math.max(secs || 0, 0), 60) * 1000);
}
// How well a question is known: unseen first, then the ones answered wrong most often.
function studyKnown(q) {
  const e = state.study.seen[q.id];
  return e ? e[0] - 2 * e[1] : -1;
}
function studyMastered(pool) {
  const st = state.study;
  return pool.filter(function (q) { const e = st.seen[q.id]; return e && e[0] >= 2 && e[0] > e[1] && st.miss.indexOf(q.id) === -1; }).length;
}
// A round: up to two of the parent's new or missed questions, then missed ones, then new ones, then the least known.
function studyPick(pool, n) {
  const st = state.study, out = [], used = {};
  const take = function (list, max) {
    for (let i = 0; i < list.length && out.length < n && max > 0; i++) if (!used[list[i].id]) { used[list[i].id] = 1; out.push(list[i]); max--; }
  };
  take(shuffled(pool.filter(function (q) { return q.parent && (!st.seen[q.id] || st.miss.indexOf(q.id) !== -1); })), 2);
  take(shuffled(pool.filter(function (q) { return st.miss.indexOf(q.id) !== -1; })), 3);
  take(shuffled(pool.filter(function (q) { return !st.seen[q.id]; })), n);
  take(shuffled(pool).sort(function (a, b) { return studyKnown(a) - studyKnown(b); }), n);
  return shuffled(out);
}

// ---- the window ---------------------------------------------------------------
// Study takes the place of the arena and the keypad on the main page (the buddy and the top bars stay). The bottom-bar button switches between the two.
function studySync() {
  document.querySelector('.game-container').classList.toggle('study-on', studyOn);
  document.getElementById('study-pane').style.display = studyOn ? '' : 'none';
  document.getElementById('study-toggle-text').innerText = studyOn ? '🧮 Math' : '📚 Study';
  document.getElementById('study-toggle').setAttribute('aria-label', studyOn ? 'Back to math problems' : 'Study school subjects');
}
function toggleStudy() { if (studyOn) closeStudy(); else openStudy(); }
function openStudy() {
  if (studyOn) return;
  soundClick();
  pauseClock();
  studyOn = true;
  studyScreen = 'home';
  studyRound = null;
  studyNote = '';
  studyDay();
  studySync();
  studyRender();
  studyLoadParent();
}
function closeStudy() {
  if (!studyOn) return;
  soundClick();
  studyOn = false;
  studyRound = null;
  studySync();
  if (!openOverlays().length) resumeClock();
  saveState();
  updateStatsUI();
}
// Escape and the ✕: from a round go back to the start (what was answered is remembered), from the start close.
function studyEsc() {
  if (studyScreen === 'home') return closeStudy();
  soundClick();
  studyNote = studyScreen === 'card' ? 'Round paused. Everything you answered is remembered.' : '';
  studyHome();
}
function studyHome() {
  studyScreen = 'home';
  studyRound = null;
  saveState();
  studyRender();
}
function studySetLevel(n) {
  soundClick();
  state.study.level = clamp(n, ECON.study.minLevel, ECON.study.maxLevel);
  saveState();
  studyRender();
}
// Tap a subject to add it or take it off; "All" clears the choice.
function studySetFilter(id) {
  soundClick();
  const sel = state.study.subjects, i = sel.indexOf(id);
  if (id === 'all') state.study.subjects = [];
  else if (i === -1) sel.push(id);
  else sel.splice(i, 1);
  saveState();
  studyRender();
}
function studyRender() {
  const box = document.getElementById('study-box');
  if (!box) return;
  if (studyScreen === 'card' && studyRound) box.innerHTML = studyCardHtml();
  else if (studyScreen === 'done' && studyRound) box.innerHTML = studyDoneHtml();
  else box.innerHTML = studyHomeHtml();
  studyFillOpts();
  const input = document.getElementById('study-in');
  if (input) input.focus();
  const next = document.getElementById('study-next');
  if (next) next.focus();
}
// Multiple choice: the four buttons. After an answer they stay, locked, with the right one green and a wrong pick red.
function studyFillOpts() {
  const r = studyRound, opts = document.getElementById('study-opts');
  if (!r || !opts) return;
  const q = r.qs[r.i];
  fillOptButtons(opts, r.opts, studyPickOpt);
  opts.classList.toggle('study-wide', r.opts.some(function (o) { return o.length > 26; }));        // only very long answers get a full-width row each
  if (r.phase !== 'reveal') return;
  Array.prototype.forEach.call(opts.children, function (b) {
    b.disabled = true;
    if (b.innerText === q.a) b.classList.add('right');
    else if (b.innerText === r.picked) b.classList.add('wrong');
  });
}
function studyHomeHtml() {
  const S = ECON.study, st = studyDay();
  const level = st.level, filters = studyFilters();
  const sel = studySelected(filters);
  const pool = studyPool(sel, level);
  const levelBtns = [6, 7, 8].map(function (n) {
    return '<button class="grade-btn' + (n === level ? ' active' : '') + '" onclick="studySetLevel(' + n + ')" aria-pressed="' + (n === level) + '">' + n + 'th' + (n === 8 ? ' (all)' : '') + '</button>';
  }).join('');
  const filterBtns = filters.map(function (f) {
    const n = studyPool(f[0], level).length;
    return '<button class="grade-btn' + (sel.indexOf(f[0]) !== -1 ? ' active' : '') + '" onclick="studySetFilter(\'' + f[0] + '\')" aria-pressed="' + (sel.indexOf(f[0]) !== -1) + '">' + escHtml(f[1]) + ' <small>' + n + '</small></button>';
  }).join('');
  const off = pool.length ? '' : ' disabled';
  const missed = pool.filter(function (q) { return st.miss.indexOf(q.id) !== -1; }).length;
  return '<h2 style="font-size:1.3rem;">📚 Study</h2>' +
    '<div class="settings-hint" style="margin-top:2px;">School subjects for grades 6–8. Right answers earn buddy XP and a few gems, up to ' + S.dayCap + ' 💎 a day.</div>' +
    (studyNote ? '<div class="study-note" role="status">' + escHtml(studyNote) + '</div>' : '') +
    (studyOnlyParent() ? '<div class="study-note">👪 Your parent chose to practise their own questions.</div>' : '<div class="settings-label">Level</div><div class="study-chips study-levels">' + levelBtns + '</div>') +
    '<div class="settings-label">Subjects <small>(tap one or more)</small></div><div class="study-chips">' + filterBtns + '</div>' +
    '<div class="study-stats" aria-live="polite">' + pool.length + ' questions · ' + studyMastered(pool) + ' learned' + (missed ? ' · ' + missed + ' to review' : '') + ' · today ' + st.gems + '/' + S.dayCap + ' 💎</div>' +
    '<div class="settings-label">How do you want to study?</div>' +
    '<button class="key-btn submit-btn study-go" onclick="studyStart(\'mcq\')"' + off + '>🎯 Quick Recall <small>pick the answer</small></button>' +
    '<button class="grade-btn study-go" onclick="studyStart(\'type\')"' + off + '>⌨️ Type it <small>write the answer</small></button>' +
    '<button class="grade-btn study-go" onclick="studyStart(\'cards\')"' + off + '>🃏 Flashcards <small>no gems, just practice</small></button>' +
    (pool.length ? '' : '<div class="settings-hint">No questions here yet.' + (sel.indexOf('parent') !== -1 ? ' A parent can add some from the parent page.' : '') + '</div>') +
    '<div class="settings-hint">A question pays again after ' + S.freshDays + ' days. Missed questions come back first.</div>' +
    '<button class="key-btn submit-btn study-back" onclick="closeStudy()">🧮 Back to math</button>';
}

// ---- a round --------------------------------------------------------------------
function studyStart(mode) {
  const st = state.study, pool = studyPool(studySelected(), st.level);
  if (!pool.length) return;
  soundClick();
  studyRound = { mode: mode, qs: studyPick(pool, ECON.study.roundSize), i: 0, results: [], phase: 'ask', t0: Date.now(), opts: null };
  studyNote = '';
  studyScreen = 'card';
  studyAsk();
}
function studyAsk() {
  const r = studyRound, q = r.qs[r.i];
  r.phase = 'ask';
  r.t0 = Date.now();
  r.opts = r.mode === 'mcq' ? studyChoices(q) : null;
  r.picked = '';
  studyRender();
}
function studySubjectOf(q) { return STUDY_SUBJECTS.filter(function (s) { return s.id === q.s; })[0] || STUDY_SUBJECTS[STUDY_SUBJECTS.length - 1]; }
function studyCardHtml() {
  const r = studyRound, q = r.qs[r.i], sub = studySubjectOf(q);
  const pct = Math.round(r.i / r.qs.length * 100);
  let body = r.mode === 'mcq' ? '<div class="tour-opts study-opts" id="study-opts"></div>' : '';
  if (r.phase === 'ask') {
    if (r.mode === 'type') body = '<input class="acct-input" id="study-in" type="text" maxlength="80" placeholder="Type your answer" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Your answer" onkeydown="if(event.key===\'Enter\')studySubmitText()">' +
      '<button class="key-btn submit-btn study-go" onclick="studySubmitText()">Check ➔</button>';
    else if (r.mode === 'cards') body = '<button class="key-btn submit-btn study-go" onclick="studyReveal()">Show answer</button>';
  } else {
    const last = r.results[r.results.length - 1];
    body += '<div class="study-fb ' + (last.shown ? 'shown' : (last.ok ? 'right' : 'wrong')) + '" id="study-fb" role="status">' + studyFeedback(q, last) + '</div>';
    if (r.mode === 'cards') body += '<div class="acct-btns"><button class="grade-btn study-go" onclick="studyMark(false)">↻ Again</button><button class="key-btn submit-btn study-go" onclick="studyMark(true)">✓ Got it</button></div>';
    else body += '<button class="key-btn submit-btn study-go" id="study-next" onclick="studyNext()">' + (r.i + 1 >= r.qs.length ? 'See results ➔' : 'Next ➔') + '</button>';
  }
  return '<div class="study-top"><div class="raid-chapter" style="color:#a5b4fc;">Question ' + (r.i + 1) + ' of ' + r.qs.length + ' · ' + sub.icon + ' ' + escHtml(sub.label) + (q.parent ? ' · 👪 from your parent' : '') + '</div>' +
    '<button class="grade-btn study-exit" onclick="studyEsc()" aria-label="Stop this round and go back">⏸ Back</button></div>' +
    '<div class="study-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div>' +
    '<div class="study-q">' + escHtml(q.q) + '</div>' + body;
}
function studyFeedback(q, res) {
  if (res.shown) return '<b>Answer: ' + escHtml(q.a) + '</b>' + (q.x ? '<br>' + escHtml(q.x) : '') + '<br>Did you know it?';
  if (res.ok) return '✅ <b>Correct!</b> ' + escHtml(q.a) + (q.x ? '<br>' + escHtml(q.x) : '');
  return '💡 Good try! The answer is <b>' + escHtml(q.a) + '</b>.' + (q.x ? '<br>' + escHtml(q.x) : '') + '<br>It will come back so you can learn it.';
}
function studyAnswered(ok, shown) {
  const r = studyRound, q = r.qs[r.i];
  const secs = (Date.now() - r.t0) / 1000;
  r.results.push({ id: q.id, ok: ok, shown: !!shown, fresh: studyFresh(q.id) });
  r.phase = 'reveal';
  if (!shown) {
    studyRecord(q, ok);
    studyStat(q, ok, secs);
    calDayEvent();
    if (ok) soundCorrect(); else soundWrong();
  }
  saveState();
  studyRender();
}
function studyPickOpt(v) {
  const r = studyRound;
  if (!r || r.phase !== 'ask') return;
  r.picked = String(v);
  studyAnswered(String(v) === r.qs[r.i].a, false);
}
function studySubmitText() {
  const r = studyRound, input = document.getElementById('study-in');
  if (!r || r.phase !== 'ask' || !input) return;
  if (!input.value.trim()) { toast('Type an answer first'); return; }
  studyAnswered(studyCheck(r.qs[r.i], input.value), false);
}
function studyReveal() {
  const r = studyRound;
  if (!r || r.phase !== 'ask') return;
  soundClick();
  studyAnswered(false, true);
}
// Flashcards: the player says whether they knew it.
function studyMark(knew) {
  const r = studyRound;
  if (!r || r.phase !== 'reveal') return;
  const q = r.qs[r.i];
  r.results[r.results.length - 1].ok = knew;
  studyRecord(q, knew);
  calDayEvent();
  if (knew) soundCorrect(); else soundClick();
  studyNext();
}
function studyNext() {
  const r = studyRound;
  if (!r) return;
  soundClick();
  r.i += 1;
  if (r.i >= r.qs.length) return studyFinish();
  studyAsk();
}
// Pays for a finished multiple-choice or typed round (flashcards pay nothing).
function studyFinish() {
  const r = studyRound, S = ECON.study, st = studyDay();
  r.paid = 0; r.xp = 0; r.room = Math.max(0, S.dayCap - st.gems);
  const right = r.results.filter(function (x) { return x.ok; }).length;
  r.right = right;
  if (r.mode !== 'cards') {
    const fresh = r.results.filter(function (x) { return x.ok && x.fresh; });
    const perfect = right === r.results.length && fresh.length >= Math.ceil(r.results.length / 2);
    r.fresh = fresh.length;
    r.paid = Math.min(fresh.length * S.gemPerNew + (perfect ? S.perfectBonus : 0), r.room);
    r.xp = r.room > 0 ? fresh.length * S.xpPerNew : 0;
    r.perfect = perfect;
    if (r.room > 0) fresh.forEach(function (x) { st.paid[x.id] = dayNumber(); });
    st.gems += r.paid;
    if (r.xp) addXpTo(state.activePet, r.xp);
    st.rounds += 1;
  }
  studyScreen = 'done';
  checkParentGoal();
  if (r.paid) grantGems(r.paid, '📚 +' + r.paid + ' 💎 for studying!', r.perfect);
  else { saveState(); updateStatsUI(); }
  studyRender();
}
function studyDoneHtml() {
  const r = studyRound, S = ECON.study;
  let pay;
  if (r.mode === 'cards') pay = 'Flashcards are for practice, so they do not earn gems. Try Quick Recall when you feel ready!';
  else if (r.paid) pay = '+' + r.paid + ' 💎' + (r.xp ? ' and +' + r.xp + ' XP for your buddy' : '') + (r.perfect ? ' (perfect round bonus!)' : '') + '.';
  else if (!r.room) pay = 'You reached today\'s study limit of ' + S.dayCap + ' 💎. Studying still makes you stronger, and the limit starts over tomorrow!';
  else pay = 'These questions were all done recently, so no new gems this time. Try another subject for more!';
  const missed = r.results.filter(function (x) { return !x.ok; }).map(function (x) {
    const q = studyAll().filter(function (o) { return o.id === x.id; })[0];
    return q ? '<li><b>' + escHtml(q.q) + '</b><br>' + escHtml(q.a) + '</li>' : '';
  }).join('');
  return '<h2 style="font-size:1.3rem;">' + (r.right === r.results.length ? '🌟 Perfect round!' : '🎉 Round done!') + '</h2>' +
    '<div class="tour-eq">' + r.right + ' / ' + r.results.length + ' ✅</div>' +
    '<div class="study-note" role="status">' + escHtml(pay) + '</div>' +
    (missed ? '<div class="settings-label">Worth another look</div><ul class="study-missed">' + missed + '</ul>' : '') +
    '<button class="key-btn submit-btn study-go" onclick="studyStart(\'' + r.mode + '\')">Study again</button>' +
    '<button class="grade-btn study-go" onclick="studyHome()">Choose something else</button>' +
    '<button class="grade-btn study-go" onclick="closeStudy()">🧮 Back to math</button>';
}
