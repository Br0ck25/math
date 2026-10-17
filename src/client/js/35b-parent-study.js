// =====================================================================
//  PARENT PAGE: study questions a parent adds for their children  (the server side is src/server/17-study.js)
//  One form adds a question to any of the children the parent is the first parent of ("all my children" is one tap). The child's Study
//  screen mixes these in with the built-in questions. They are only ever shown to that child, never to other players.
// =====================================================================
let portalStudy = {};               // child name -> that child's questions, as the server listed them
let portalStudyOpen = false;
let portalStudyReady = false;

function portalStudyKids() { return (portalKids || []).filter(function (k) { return k.primary && !k.revoked; }); }
// Shown on the parent page between "add a child" and the children's cards (nothing when no child lets this parent change things).
function studySection() {
  const kids = portalStudyKids();
  if (!kids.length) return '';
  const L = ECON.study.parent;
  const boxes = kids.map(function (k, i) {
    return '<label class="portal-op"><input type="checkbox" data-pqkid="' + escHtml(k.child) + '" checked> ' + escHtml(k.child) + '</label>';
  }).join('');
  const subjects = STUDY_SUBJECTS.map(function (s) { return '<option value="' + s.id + '">' + s.icon + ' ' + escHtml(s.label) + '</option>'; }).join('');
  return '<details class="portal-study" id="portal-study"' + (portalStudyOpen ? ' open' : '') + ' ontoggle="portalStudyToggle(this)"><summary>📚 Study questions for my children</summary>' +
    '<div class="portal-sub">Add your own questions and answers. They appear in the Study screen on the child\'s device, mixed in with the built-in ones, next time the game opens. You can add up to ' + L.max + ' per child.</div>' +
    '<div class="settings-label">Add to</div>' +
    '<div class="portal-ops" id="pstudy-kids">' + boxes + '</div>' +
    (kids.length > 1 ? '<div class="acct-btns"><button class="grade-btn" onclick="portalStudyTick(true)">All my children</button><button class="grade-btn" onclick="portalStudyTick(false)">None</button></div>' : '') +
    '<div class="settings-label">Subject</div><select class="acct-input" id="pstudy-s" aria-label="Subject">' + subjects + '</select>' +
    '<div class="settings-label">Question</div><textarea class="acct-input" id="pstudy-q" rows="2" maxlength="' + L.qMax + '" placeholder="For example: What is the capital of Kentucky?" aria-label="Question"></textarea>' +
    '<div class="settings-label">Answer</div><input class="acct-input" id="pstudy-a" type="text" maxlength="' + L.aMax + '" placeholder="Frankfort" autocomplete="off" aria-label="Answer">' +
    '<input class="acct-input" id="pstudy-alt" type="text" placeholder="Also accept (optional, separate with ;)" autocomplete="off" aria-label="Other accepted answers">' +
    '<input class="acct-input" id="pstudy-wrong" type="text" placeholder="Wrong choices for multiple choice (optional, up to ' + L.extras + ', separate with ;)" autocomplete="off" aria-label="Wrong choices">' +
    '<button class="grade-btn" style="width:100%; margin-top:8px;" onclick="portalStudyAdd()">➕ Add question</button>' +
    '<details class="portal-study" style="margin-top:8px;"><summary>📋 Add many at once</summary>' +
    '<div class="portal-sub">One question per line: <b>question | answer | also accepted; another | wrong choice; another</b>. Only the first two parts are needed. Up to ' + L.bulk + ' lines at a time, all in the subject chosen above.</div>' +
    '<textarea class="acct-input" id="pstudy-bulk" rows="5" aria-label="Many questions, one per line" placeholder="What is 7 x 8? | 56&#10;Capital of France? | Paris | | Rome; Madrid; Berlin"></textarea>' +
    '<button class="grade-btn" style="width:100%; margin-top:6px;" onclick="portalStudyBulk()">Add all lines</button></details>' +
    '<div class="acct-msg" id="pstudy-msg" role="status"></div>' +
    '<div class="settings-label">Questions so far</div><div id="pstudy-lists"></div></details>';
}
function portalStudyMsg(text, kind) {
  const el = document.getElementById('pstudy-msg');
  if (el) { el.innerText = text; el.className = 'acct-msg ' + (kind || ''); }
}
function portalStudyTick(on) {
  Array.prototype.forEach.call(document.querySelectorAll('#pstudy-kids input[data-pqkid]'), function (el) { el.checked = on; });
}
function portalStudyToggle(el) {
  portalStudyOpen = el.open;
  if (el.open && !portalStudyReady) portalStudyLoad();
  else portalStudyLists();
}
async function portalStudyLoad() {
  const kids = portalStudyKids().map(function (k) { return k.child; });
  if (!kids.length) return;
  try {
    const r = await portalApi('/api/parent/study/list', 'POST', { children: kids });
    if (r.status === 200) { portalStudy = r.data.lists || {}; portalStudyReady = true; }
    else portalStudyMsg((r.data && r.data.error) || 'Could not load the questions.', 'err');
  } catch (e) { portalStudyMsg('Could not reach the server.', 'err'); }
  portalStudyLists();
}
function portalStudyLists() {
  const box = document.getElementById('pstudy-lists');
  if (!box) return;
  if (!portalStudyReady) { box.innerHTML = '<div class="portal-sub">Loading…</div>'; return; }
  box.innerHTML = portalStudyKids().map(function (k) {
    const list = portalStudy[k.child] || [];
    const rows = list.map(function (q) {
      const sub = STUDY_SUBJECTS.filter(function (s) { return s.id === q.s; })[0];
      return '<div class="par-row"><span style="flex:1; white-space:normal; overflow-wrap:anywhere;">' + (sub ? sub.icon + ' ' : '') + '<b>' + escHtml(q.q) + '</b> → ' + escHtml(q.a) + '</span>' +
        '<button class="grade-btn boost-btn" onclick="portalStudyRemove(\'' + escHtml(k.child) + '\', \'' + escHtml(q.id) + '\')" aria-label="Remove this question for ' + escHtml(k.child) + '">✕</button></div>';
    }).join('');
    return '<div class="settings-label">' + escHtml(k.child) + ' · ' + list.length + ' of ' + ECON.study.parent.max + '</div>' + (rows || '<div class="portal-sub">No questions yet.</div>');
  }).join('');
}
// "question | answer | also accepted; another | wrong; wrong" per line -> [{q, a, alt, wrong}] (the server checks them again).
function parseStudyLines(text, subject) {
  const split = function (s) { return (s || '').split(';').map(function (x) { return x.trim(); }).filter(Boolean); };
  return String(text).split('\n').map(function (line) { return line.trim(); }).filter(Boolean).map(function (line) {
    const p = line.split('|').map(function (x) { return x.trim(); });
    return { s: subject, q: p[0] || '', a: p[1] || '', alt: split(p[2]), wrong: split(p[3]) };
  });
}
async function portalStudySend(questions, bulk) {
  const kids = Array.prototype.filter.call(document.querySelectorAll('#pstudy-kids input[data-pqkid]'), function (el) { return el.checked; }).map(function (el) { return el.dataset.pqkid; });
  if (!kids.length) return portalStudyMsg('Tick at least one child.', 'err');
  for (let i = 0; i < questions.length; i++) {
    if (!cleanStudyQ(questions[i])) return portalStudyMsg((bulk ? 'Line ' + (i + 1) + ': ' : '') + 'each question needs a question and an answer (at most ' + ECON.study.parent.qMax + ' and ' + ECON.study.parent.aMax + ' letters, up to ' + ECON.study.parent.extras + ' extra answers).', 'err');
  }
  try {
    const r = await portalApi('/api/parent/study/add', 'POST', { children: kids, questions: questions });
    if (r.status !== 200) return portalStudyMsg((r.data && r.data.error) || 'Could not add the questions.', 'err');
    const res = r.data.results || {};
    const parts = Object.keys(res).map(function (c) {
      const x = res[c];
      return c + ': ' + x.added + ' added' + (x.dup ? ', ' + x.dup + ' already there' : '') + (x.full ? ', ' + x.full + ' not added (list full)' : '');
    });
    portalStudyMsg('✅ ' + parts.join(' · '), 'ok');
    ['pstudy-q', 'pstudy-a', 'pstudy-alt', 'pstudy-wrong', 'pstudy-bulk'].forEach(function (id) { const el = document.getElementById(id); if (el) el.value = ''; });
    await portalStudyLoad();
  } catch (e) { portalStudyMsg('Could not reach the server.', 'err'); }
}
function portalStudyAdd() {
  const v = function (id) { return document.getElementById(id).value; };
  const split = function (s) { return s.split(';').map(function (x) { return x.trim(); }).filter(Boolean); };
  return portalStudySend([{ s: v('pstudy-s'), q: v('pstudy-q'), a: v('pstudy-a'), alt: split(v('pstudy-alt')), wrong: split(v('pstudy-wrong')) }]);
}
function portalStudyBulk() {
  const rows = parseStudyLines(document.getElementById('pstudy-bulk').value, document.getElementById('pstudy-s').value);
  if (!rows.length) return portalStudyMsg('Type or paste at least one line.', 'err');
  if (rows.length > ECON.study.parent.bulk) return portalStudyMsg('Add at most ' + ECON.study.parent.bulk + ' lines at a time.', 'err');
  return portalStudySend(rows, true);
}
async function portalStudyRemove(child, id) {
  try {
    const r = await portalApi('/api/parent/study/remove', 'POST', { child: child, ids: [id] });
    if (r.status !== 200) return portalStudyMsg((r.data && r.data.error) || 'Could not remove it.', 'err');
    portalStudyMsg('Removed.', 'ok');
    await portalStudyLoad();
  } catch (e) { portalStudyMsg('Could not reach the server.', 'err'); }
}
