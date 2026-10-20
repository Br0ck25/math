// =====================================================================
//  PEOPLE, SIGNS AND PICKUPS on the Adventure map. One small text window (#talk-modal) serves every person and sign, with an SVG portrait (never emoji).
//  A math sign asks one makeMcq question (the same one the Trails use, so a parent's locked types, the grade floor and Study mode all apply).
//  Wrong answers are free. A right one pays ECON.overworld.signGems once per sign per day, for at most signsPerDay signs a day.
// =====================================================================
let talk = null;
function talkOpen() { const open = openOverlays(); return !!open.length && open[open.length - 1].id === 'talk-modal'; }

// What the hero bumped into: a person talks, a sign tells its words or asks its question.
function owInteract(map, x, y) {
  const npc = owNpcAt(map, x, y);
  if (npc) {
    if (npc.kind === 'trainer') { owTrainerTalk(npc); return; }       // a trainer keeps its way of facing (it decides what it sees)
    npc.face = OW_OPPOSITE[state.overworld.face];                    // the person turns to the hero
    renderOverworld();
    if (npc.kind === 'nurse') { openCenter(npc); return; }
    if (npc.kind === 'clerk') { openMart(npc); return; }
    openTalk({ name: npc.name, art: heroSprite(heroLookColors(npc.look), 'down', 0), lines: npc.lines });
    return;
  }
  const sign = map.signs && map.signs[x + ',' + y];
  if (!sign) return;
  if (typeof sign === 'string') openTalk({ name: 'Sign', art: worldSprite('t-sign'), lines: [sign] });
  else openSignQuiz(sign);
}

// ----- the text window -----
function openTalk(o) {
  talk = { name: o.name, art: o.art, lines: o.lines, i: 0, quiz: o.quiz || null, choices: o.choices || null, onClose: o.onClose || null };
  showModal('talk-modal', renderTalk);
}
function renderTalk() {
  document.getElementById('talk-name').innerText = talk.name;
  document.getElementById('talk-art').innerHTML = talk.art;
  document.getElementById('talk-text').innerText = talk.lines[talk.i];
  const last = talk.i >= talk.lines.length - 1, quiz = document.getElementById('talk-quiz');
  const choices = document.getElementById('talk-choices');
  choices.innerHTML = '';
  if (last && talk.choices) talk.choices.forEach(function (c, i) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'claim-btn talk-choice'; b.innerText = c.label;
    b.onclick = function () { talkChoose(i); };
    choices.appendChild(b);
  });
  document.getElementById('talk-next').innerText = last ? (talk.choices ? 'Not now' : 'Close') : 'Next';
  quiz.style.display = talk.quiz ? 'block' : 'none';
  if (talk.quiz) {
    const qz = talk.quiz;
    document.getElementById('talk-q').innerHTML = qz.q.html;
    fillOptButtons(document.getElementById('talk-opts'), qz.q.opts, answerSignQuiz);
    document.getElementById('talk-note').innerText = qz.paid ? 'This sign already paid today. Practice is free!' : signsLeft() > 0 ? 'A right answer pays ' + ECON.overworld.signGems + ' gems, once a day.' : 'No more sign gems today, but practice is free!';
  }
}
function talkChoose(i) { const c = talk && talk.choices && talk.choices[i]; if (c) c.run(); }
function talkNext() {
  if (!talk) return;
  if (talk.i < talk.lines.length - 1) { talk.i += 1; soundClick(); renderTalk(); } else closeTalk();
}
function closeTalk() {
  const t = talk;
  talk = null;
  hideModal('talk-modal', function () { updateStatsUI(); if (t && t.onClose) t.onClose(); });
}
window.addEventListener('keydown', function (e) {
  if ((e.key === 'Enter' || e.key === ' ') && talkOpen() && !talk.quiz && !(talk.choices && talk.i >= talk.lines.length - 1)) { e.preventDefault(); talkNext(); }
});

// ----- math signs -----
function signsToday() {
  const s = state.overworld.signs;
  if (s.day !== dayKey()) { s.day = dayKey(); s.ids = []; }
  return s.ids;
}
function signPaid(id) { return signsToday().indexOf(id) !== -1; }
function signsLeft() { return Math.max(0, ECON.overworld.signsPerDay - signsToday().length); }
function openSignQuiz(sign) {
  talk = { name: 'Math sign', art: worldSprite('t-sign'), lines: [sign.text], i: 0, quiz: { id: sign.id, q: makeMcq({ count: 3 }), paid: signPaid(sign.id), done: false } };
  showModal('talk-modal', renderTalk);
}
function answerSignQuiz(value) {
  const qz = talk && talk.quiz, note = document.getElementById('talk-note');
  if (!qz || qz.done) return;
  if (value !== qz.q.ans) { soundWrong(); note.innerText = 'Not quite. Try another one!'; return; }
  qz.done = true;
  soundCorrect(1);
  Array.prototype.forEach.call(document.querySelectorAll('#talk-opts button'), function (b) { b.disabled = true; });
  if (qz.paid || signsLeft() === 0) { note.innerText = qz.paid ? 'Correct! This sign already paid today.' : 'Correct! No more sign gems today.'; return; }
  signsToday().push(qz.id);
  grantGems(ECON.overworld.signGems, 'Correct! +' + ECON.overworld.signGems + ' gems', false);
  note.innerText = 'Correct! +' + ECON.overworld.signGems + ' gems';
}

// ----- pickups: a sparkle on the ground, taken once (saved by id) -----
function owCollect(p) {
  state.overworld.found.push(p.id);
  let msg;
  if (p.give === 'gems') { grantGems(ECON.overworld.pickupGems, 'You found ' + ECON.overworld.pickupGems + ' gems!', false); return; }
  if (p.give === 'net' && state.nets < maxNets()) { state.nets += 1; msg = 'You found a Catch Net!'; }
  else if (p.give === 'ore') { ranchGive('ore', ECON.explore.ore); msg = 'You found ' + ECON.explore.ore + ' ore!'; }
  else { ranchGive('berry', ECON.explore.berries); msg = 'You found ' + ECON.explore.berries + ' berries!'; }      // berries, or instead of a net when the net bag is full
  soundCoinChirp();
  saveState();
  updateStatsUI();
  toast(msg);
}

// ----- trainers: a "!" over its head, then its words, then the battle (or "Not now": one step back) -----
function owChallenge(npc) {
  owRelease();
  owBusy = true;
  npc.alert = true;
  renderOverworld();
  setTimeout(function () {
    owBusy = false;
    npc.alert = false;
    if (!owOpen()) return;                                           // the map was closed meanwhile
    renderOverworld();
    owTrainerTalk(npc);
  }, 650);
}
function owTrainerTalk(npc) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0);
  if (state.overworld.beat.indexOf(npc.id) !== -1) { openTalk({ name: npc.name, art: art, lines: npc.win }); return; }
  openTalk({ name: npc.name, art: art, lines: npc.lines, onClose: owStepBack,
    choices: [{ label: 'Battle!', run: function () { talk.onClose = null; closeTalk(); startTrainerFight(npc); } }] });
}

// ----- gyms: stepping on a gym door offers that land's gym (the usual gym run on the battle screen: trainers, Riley, then the leader) -----
function owEnterGym(id) {
  const r = regionById(id), art = worldSprite('t-gym-door'), name = r.name + ' Gym';
  const say = function (lines, choices) { openTalk({ name: name, art: art, lines: lines, choices: choices || null, onClose: owStepBack }); };
  if (state.gym) { say(['A gym run is already going on. Finish it or leave it on the Map first.']); return; }
  if (!regionUnlocked(r)) { say(['The gym leader smiles: "Come back a little stronger!"', 'Your team is level ' + journeyLevel() + ' and this gym opens at level ' + regionLevel(r) + '. Train in the tall grass and visit again.']); return; }
  const have = hasBadge(id);
  if (have && !isChampion()) { say(['You already have the ' + r.name + ' Badge. Well done!', 'Champions can come back for rematches.']); return; }
  const go = function () { talk.onClose = null; closeTalk(); closeOverworld(); startGym(id); };
  if (have) { say(['Welcome back, Champion! Want a rematch? The trainers and the leader are stronger now.'], [{ label: 'Rematch!', run: go }]); return; }
  say(['This is the ' + r.name + ' Gym. Beat ' + ECON.map.trainers + ' trainers, then the gym leader, to win a badge.', 'Losing costs nothing, and you can leave any time. Ready?'], [{ label: 'Enter the gym', run: go }]);
}
