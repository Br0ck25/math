// =====================================================================
//  PEOPLE, SIGNS AND PICKUPS on the Adventure map. One small text window (#talk-modal) serves every person and sign, with an SVG portrait (never emoji).
//  A math sign asks one makeMcq question (the same one the Trails use, so a parent's locked types, the grade floor and Study mode all apply).
//  Wrong answers are free. A right one pays nothing: a math sign is practice, as a sign is in Gold.
// =====================================================================
let talk = null;
function talkOpen() { const open = openOverlays(); return !!open.length && open[open.length - 1].id === 'talk-modal'; }

// What the hero bumped into: a person talks, a sign tells its words or asks its question.
function owInteract(map, x, y) {
  const npc = owNpcAt(map, x, y);
  if (npc) {
    if (npc.kind === 'trainer' || npc.kind === 'boss') { owTrainerTalk(npc); return; }       // a trainer keeps its way of facing (it decides what it sees)
    if (npc.kind === 'gift') { owGift(npc); return; }
    if (npc.kind === 'scene') { owScene(npc); return; }
    npc.face = OW_OPPOSITE[state.overworld.face];                    // the person turns to the hero
    renderOverworld();
    if (npc.kind === 'nurse') { openCenter(npc); return; }
    if (npc.kind === 'clerk') { openMart(npc); return; }
    if (OW_SERVICES[npc.kind]) { OW_SERVICES[npc.kind](npc); return; }
    openTalk({ name: npc.name, art: heroSprite(heroLookColors(npc.look), 'down', 0), lines: npc.lines });
    return;
  }
  const sign = map.signs && map.signs[x + ',' + y];
  if (sign) {
    if (typeof sign === 'string') openTalk({ name: 'Sign', art: worldSprite('t-sign'), lines: [sign] });
    else openSignQuiz(sign);
    return;
  }
  const tile = OW_TILES[(map.rows[y] || '').charAt(x)];
  if (!tile) return;
  if (tile.road) {
    const badge = map.roads && map.roads[x + ',' + y];
    if (badge && !owRoadOpen(badge)) openTalk({ name: 'Road guard', art: worldSprite('t-gate-road'), lines: ['The road ahead is for explorers who hold the ' + regionById(badge).name + ' Badge.', 'Win it at the gym here first, then come back!'] });
    return;
  }
  if (tile.gate && !hasKeyItem(tile.gate)) { openTalk({ name: 'Blocked', art: worldSprite(OW_GATES[tile.gate].closed), lines: [OW_GATES[tile.gate].hint] }); return; }
  const tree = map.trees && map.trees[x + ',' + y];
  if (tree) owShake(tree);
  else if (tile.water) owFish();
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
    document.getElementById('talk-note').innerText = qz.story ? 'Question ' + qz.round + ' of ' + qz.rounds + '. A wrong answer is free: try again!' : 'A math sign for practice. A wrong answer is free: try again!';
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
// A story puzzle (a sign with `story`) is a few questions in a row, locked until its Scrambler (`after`) is beaten, and pays a one-time prize.
function openSignQuiz(sign) {
  const art = worldSprite('t-sign');
  if (sign.story && state.overworld.story.indexOf(sign.story) !== -1) { openTalk({ name: 'Math sign', art: art, lines: [sign.done || 'Everything is in order again. Thank you!'] }); return; }
  if (sign.after && state.overworld.beat.indexOf(sign.after) === -1) { openTalk({ name: 'Math sign', art: art, lines: [sign.locked || 'A Scrambler is guarding this. Beat them first!'] }); return; }
  talk = { name: 'Math sign', art: art, lines: [sign.text], i: 0, quiz: { id: sign.id, q: makeMcq({ count: 3 }), done: false, story: sign.story || '', round: 1, rounds: sign.rounds || 1 } };
  showModal('talk-modal', renderTalk);
}
function answerSignQuiz(value) {
  const qz = talk && talk.quiz, note = document.getElementById('talk-note');
  if (!qz || qz.done) return;
  if (value !== qz.q.ans) { soundWrong(); note.innerText = 'Not quite. Try another one!'; return; }
  if (qz.round < qz.rounds) { qz.round += 1; qz.q = makeMcq({ count: 3 }); soundCorrect(1); renderTalk(); return; }          // the next question of the puzzle
  qz.done = true;
  soundCorrect(1);
  Array.prototype.forEach.call(document.querySelectorAll('#talk-opts button'), function (b) { b.disabled = true; });
  if (qz.story) { owStoryReward(qz.story); note.innerText = 'All fixed! Thank you!'; return; }
  note.innerText = 'Correct! Well done.';                           // a math sign is practice: Gold pays nothing for a sign
}

// ----- pickups: a sparkle on the ground, taken once (saved by id) -----
function owCollect(p) {
  state.overworld.found.push(p.id);
  let msg;
  if (p.give === 'gems') { state.potions = Math.min(99, state.potions + 1); msg = 'You found a Potion!'; }
  else if (p.give === 'berry') { state.potions = Math.min(99, state.potions + 1); msg = 'You picked a Berry! It works like a Potion.'; }      // a berry bush grows back every day (owFruitDay)
  else if (p.give === 'net' && state.nets < maxNets()) { state.nets += 1; msg = 'You found a Catch Net!'; }
  else { state.potions = Math.min(99, state.potions + 1); msg = 'You found a Potion!'; }      // instead of a net when the net bag is full
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
  if (phoneReady() === npc.id) { openTalk({ name: npc.name, art: art, lines: ['I have been training since our last battle. Ready for a rematch?'], onClose: owStepBack, choices: [{ label: 'Rematch!', run: function () { talk.onClose = null; closeTalk(); startTrainerFight(npc); } }] }); return; }
  if (state.overworld.beat.indexOf(npc.id) !== -1) { openTalk({ name: npc.name, art: art, lines: npc.win }); return; }
  openTalk({ name: npc.name, art: art, lines: npc.lines, onClose: owStepBack,
    choices: [{ label: 'Battle!', run: function () { talk.onClose = null; closeTalk(); startTrainerFight(npc); } }] });
}

// ----- gyms: stepping on a gym door offers that land's gym (the usual gym run on the battle screen: trainers, Riley, then the leader) -----
// ----- Silver Peak: the door of Master Ori -----
function owEnterMaster() {
  const art = worldSprite('t-gym-door'), say = function (lines, choices) { openTalk({ name: 'Silver Peak', art: art, lines: lines, choices: choices || null, onClose: owStepBack }); };
  if (state.gym) { say(['A gym run is already going on. Finish it or leave it on the Map first.']); return; }
  if (!hasBadge('summit')) { say(['The door is frozen shut. It opens for a trainer with the Summit Badge.']); return; }
  const go = function () { talk.onClose = null; closeTalk(); abStartMaster(); };
  say(state.champ.master ? ['Master Ori is ready for another match.'] : ['Master Ori waits at the top of the world with the six legends.', 'One fight, six buddies, no gym trainers first. Ready?'], [{ label: state.champ.master ? 'Rematch!' : 'Face the Master', run: go }]);
}
function owEnterGym(id) {
  if (id === 'champion') { owEnterHall(); return; }
  if (id === 'master') { owEnterMaster(); return; }
  const r = regionById(id), art = worldSprite('t-gym-door'), name = r.name + ' Gym';
  const say = function (lines, choices) { openTalk({ name: name, art: art, lines: lines, choices: choices || null, onClose: owStepBack }); };
  if (state.gym) { say(['A gym run is already going on. Finish it or leave it on the Map first.']); return; }
  if (!regionUnlocked(r)) { say(['The gym leader smiles: "Come back a little stronger!"', 'Your team is level ' + journeyLevel() + ' and this gym opens at level ' + regionLevel(r) + '. Train in the tall grass and visit again.']); return; }
  const have = hasBadge(id);
  if (have && !isChampion()) { say(['You already have the ' + r.name + ' Badge. Well done!', 'Champions can come back for rematches.']); return; }
  const go = function () { talk.onClose = null; closeTalk(); abStartGym(id); };
  if (have) { say(['Welcome back, Champion! Want a rematch? The trainers and the leader are stronger now.'], [{ label: 'Rematch!', run: go }]); return; }
  say(['This is the ' + r.name + ' Gym. Beat ' + ECON.map.trainers + ' trainers, then the gym leader, to win a badge.', 'Losing costs nothing, and you can leave any time. Ready?'], [{ label: 'Enter the gym', run: go }]);
}

// ----- a gift: the person gives a key item the first time (Fisher Gil's rod), and says something else after -----
function owGift(npc) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0), item = KEY_ITEMS.find(function (k) { return k.id === npc.gift; });
  if (grantKeyItem(npc.gift)) { saveState(); openTalk({ name: npc.name, art: art, lines: npc.lines.concat(['You got the ' + item.name + '!']) }); }
  else openTalk({ name: npc.name, art: art, lines: npc.after });
}

// Gold's three rods: the Old Rod is the gift; the Good Rod comes with your third badge and the Super Rod with the Champion's title.
function owRodTier() { return isChampion() ? 2 : state.badges.length >= 3 ? 1 : 0; }
// ----- fishing: tap water with the rod. Sometimes nothing bites; a bite is a normal wild fight with a water buddy. -----
function owFish() {
  if (!hasKeyItem('fishing-rod')) { openTalk({ name: 'Water', art: worldSprite('t-water'), lines: ['The water is calm and clear.', 'Maybe something is swimming down there. A Fishing Rod would help!'] }); return; }
  const rod = owRodTier(), R = ECON.overworld.rods[rod];
  if (Math.random() >= R.bite) { toast('No bite. Try again!'); return; }
  const water = wildPool().filter(function (p) { return p.element === 'water'; });
  const fit = water.filter(function (p) { return rod === 0 ? isStoreBuddy(p) && p.cost < 150 : rod === 1 ? isStoreBuddy(p) : true; });          // Old Rod: the everyday ones; Good: every store buddy; Super: the rare ones too
  startAdventureFight(pick(fit.length ? fit : water), R.level);
}

// ----- shake trees: once a day each, a rare buddy falls out (the same one all day, a different one tomorrow) -----
function shakeSpecies(id) {
  const pool = wildPool().filter(function (p) { return !isStoreBuddy(p) || p.cost >= 150; });          // not the everyday cheap ones
  return pool[dayHash(id + dayKey()) % pool.length];
}
function owShake(id) {
  const s = state.overworld.shaken, art = worldSprite('t-tree-shake');
  if (s.day !== dayKey()) { s.day = dayKey(); s.ids = []; }
  if (s.ids.indexOf(id) !== -1) { openTalk({ name: 'Tree', art: art, lines: ['You shook it again, but nothing more fell out.', 'Come back tomorrow!'] }); return; }
  s.ids.push(id);
  saveState();
  openTalk({ name: 'Tree', art: art, lines: ['You shake the tree... Something fell out!'], onClose: function () { startAdventureFight(shakeSpecies(id)); } });
}

// ----- a story scene: a person who talks once, marks its story beat, and goes (Riley's reveal); with no `story` it just talks every time (after the Champion) -----
function owScene(npc) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0), done = npc.story && state.overworld.story.indexOf(npc.story) !== -1;
  if (done) { openTalk({ name: npc.name, art: art, lines: npc.after || npc.lines }); return; }
  openTalk({ name: npc.name, art: art, lines: npc.lines, onClose: function () { if (npc.story) { owStoryReward(npc.story); renderOverworld(); } } });
}

// ----- the Champion's Hall: the door at the end of the Champion's Walk starts the Hall run (the usual one: Nova's six buddies) -----
function owEnterHall() {
  const art = worldSprite('t-gym-door'), say = function (lines, choices) { openTalk({ name: "Champion's Hall", art: art, lines: lines, choices: choices || null, onClose: owStepBack }); };
  if (state.gym) { say(['A gym run is already going on. Finish it or leave it on the Map first.']); return; }
  if (!championOpen()) { say(['The great golden doors are shut.', 'They open for trainers with all ' + gymRegions().length + ' gym badges. You have ' + state.badges.length + '. Keep going!']); return; }
  const go = function () { talk.onClose = null; closeTalk(); abStartHall(); };
  if (state.champ.wins > 0) say(['Welcome back, Champion! Nova is ready for another match.'], [{ label: 'Rematch!', run: go }]);
  else say(['The great golden doors swing open. Champion Nova is waiting inside.', 'The Elite Four first, then Nova and her six buddies. Ready?'], [{ label: 'Enter the Hall', run: go }]);
}
