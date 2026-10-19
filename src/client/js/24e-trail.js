// =====================================================================
//  TRAILS: every land has a Trail to explore, new each day. Each spot is one math question: a right answer opens it, a wrong one just means try again.
//  Spots give goods (Catch Nets, berries, ore); finishing the whole Trail pays a few gems, for the first ECON.explore.trailsPerDay trails of a day.
//  The layout comes from the land and the day, so nothing but your progress is saved.
// =====================================================================
const TRAIL_SPOTS = [
  { kind: 'chest',  icon: '🎁', name: 'Hidden chest' },
  { kind: 'person', icon: '🧑‍🌾', name: 'Friendly traveller' },
  { kind: 'chest',  icon: '🎁', name: 'Old chest' },
  { kind: 'gate',   icon: '🚪', name: 'Stone gate' },
  { kind: 'gate',   icon: '🕳️', name: 'Hidden cave' },
  { kind: 'big',    icon: '🏆', name: 'Treasure chest' }
];
const TRAIL_LORE = {
  meadow: 'The meadow flowers only bloom for kids who count carefully.',
  ember: 'Fire buddies love the warm rocks of the Ember Hills.',
  tide: 'Tide Bay is calmest in the morning, so the water buddies come out to play.',
  grove: 'The old trees of Leaf Grove remember every buddy that ever walked here.',
  volt: 'Lightning never strikes the same trail twice in Volt Valley.',
  gloom: 'The fog in Gloom Marsh is thick, but friendly buddies glow in it.',
  mystic: 'Stars fall here at night. Make a wish after you solve a puzzle!'
};

// Partner skills: today's Stone gate wants one element on your team (a Wildcard buddy counts as any).
const PARTNER_SKILLS = {
  fire:     { icon: '🔥', name: 'Light',  text: 'lights up the dark cave' },
  water:    { icon: '🌊', name: 'Surf',   text: 'carries you across the water' },
  nature:   { icon: '🌿', name: 'Cut',    text: 'clears the thorny vines' },
  electric: { icon: '⚡', name: 'Power',  text: 'switches on the old machine' },
  dark:     { icon: '🌑', name: 'Sneak',  text: 'slips past the sleepy guard' },
  magic:    { icon: '✨', name: 'Reveal', text: 'shows the hidden door' }
};
// A small number that is the same for the same text, for choosing things by day and land.
function dayHash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 100003;
  return h;
}
// Today's weather: the same for everyone all day. It only favours some types of wild buddies; it never makes anything harder.
// buddies: store buddies that only show up in this weather (and show up more often in it).
const WEATHER = [
  { id: 'sunny',  icon: '☀️', name: 'Sunny',  favours: ['fire', 'nature'], text: 'more fire and nature buddies', buddies: ['lion', 'phoenix', 'raptor'] },
  { id: 'rainy',  icon: '🌧️', name: 'Rainy',  favours: ['water'],          text: 'more water buddies',           buddies: ['toon_peppa', 'octopus', 'turtle'] },
  { id: 'stormy', icon: '⛈️', name: 'Stormy', favours: ['electric'],       text: 'more electric buddies',        buddies: ['griffin', 'zephyr', 'rhino'] }
];
// The weather a buddy is bound to, or '' when it appears in any.
function weatherOfBuddy(id) {
  const w = WEATHER.find(function (x) { return x.buddies.indexOf(id) !== -1; });
  return w ? w.id : '';
}
function weatherToday() { return WEATHER[dayHash(dayKey() + 'weather') % WEATHER.length]; }
function trailProgress(landId) {
  let t = state.trails[landId];
  if (!t || t.day !== dayKey()) t = state.trails[landId] = { day: dayKey(), done: [] };
  return t;
}
function trailDone(landId, i) { return trailProgress(landId).done.indexOf(i) !== -1; }
function trailFinished(landId) { return trailProgress(landId).done.length >= ECON.explore.finishAt; }
// Which goods a chest holds today: always the same for the same land, day and spot.
function chestGoods(landId, i) { return ['net', 'berry', 'ore'][dayHash(landId + dayKey() + i) % 3]; }

// The gate at spot i of a land today: the element it wants (each gate wants a different one) and whether your team has it.
function trailGate(landId, i) {
  const els = Object.keys(PARTNER_SKILLS), first = TRAIL_SPOTS.findIndex(function (s) { return s.kind === 'gate'; });
  const element = els[(dayHash(landId + dayKey() + 'gate') + i - first) % els.length];
  const ok = getTeam().some(function (id) { const e = getSpecies(id).element; return e === element || e === 'shadow'; });
  return { element: element, skill: PARTNER_SKILLS[element], ok: ok };
}

let trailLand = '';
let trailQuestion = null;                  // the question open now: { spot, q }
function openTrail(landId) {
  const r = regionById(landId);
  if (!regionUnlocked(r)) { soundWrong(); return; }
  trailLand = landId;
  trailQuestion = null;
  showModal('trail-modal', renderTrail);
}
function closeTrail() { trailQuestion = null; hideModal('trail-modal'); }

function renderTrail() {
  const r = regionById(trailLand), box = document.getElementById('trail-body');
  document.getElementById('trail-title').innerText = '🧭 ' + r.name + ' Trail';
  if (trailQuestion) { renderTrailQuestion(box); return; }
  const done = trailProgress(trailLand).done.length;
  let h = '<div class="d" style="margin-bottom:6px;">' + escHtml(TRAIL_LORE[r.id] || '') + ' A new trail every day! Today: ' + weatherToday().icon + ' ' + weatherToday().name + ', ' + weatherToday().text + '. Look out for ' + weatherToday().buddies.map(function (id) { return getSpecies(id).name; }).join(', ') + '!</div>' +
    '<div class="d" style="margin-bottom:6px;">Spots found: ' + done + '/' + TRAIL_SPOTS.length + '</div><div class="moves-list">';
  TRAIL_SPOTS.forEach(function (s, i) {
    const open = trailDone(trailLand, i), gate = s.kind === 'gate' ? trailGate(trailLand, i) : null;
    const hint = open ? 'Done ✅' : gate ? (gate.ok ? gate.skill.icon + ' ' + gate.skill.name + ' is ready! Solve a puzzle to open it' : 'Bring a ' + gate.element + ' buddy ' + gate.skill.icon + ' to the team: ' + gate.skill.name + ' ' + gate.skill.text) : s.kind === 'person' ? 'Say hello' : 'Solve a puzzle to open it';
    h += '<button type="button" class="move-btn' + (open ? ' off' : '') + '" ' + (open ? 'disabled' : '') + ' onclick="openSpot(' + i + ')" aria-label="' + s.name + (open ? ', done' : '') + '">' +
      '<span class="mv-icon">' + s.icon + '</span><span class="mv-main"><b>' + s.name + '</b><small>' + escHtml(hint) + '</small></span></button>';
  });
  box.innerHTML = h + '</div>';
}
function renderTrailQuestion(box) {
  const s = TRAIL_SPOTS[trailQuestion.spot];
  box.innerHTML = '<div class="d" style="text-align:center;">' + s.icon + ' ' + s.name + '</div><div class="vault-equation">' + trailQuestion.q.html + '</div>' +
    '<div class="vault-answers-grid" id="trail-options"></div><div class="d" id="trail-note" style="text-align:center; min-height:1.2em; margin-top:6px;"></div>' +
    '<button class="key-btn action-btn" style="width:100%; height:44px; margin-top:8px;" onclick="leaveSpot()">Back to the trail</button>';
  fillOptButtons(document.getElementById('trail-options'), trailQuestion.q.opts, answerSpot);
}
function leaveSpot() { trailQuestion = null; soundClick(); renderTrail(); }

function openSpot(i) {
  if (trailDone(trailLand, i)) return;
  soundClick();
  if (TRAIL_SPOTS[i].kind === 'person') { finishSpot(i, 'person'); return; }
  if (TRAIL_SPOTS[i].kind === 'gate' && !trailGate(trailLand, i).ok) {
    const g = trailGate(trailLand, i);
    soundWrong();
    toast(g.skill.icon + ' Bring a ' + g.element + ' buddy on your team: ' + g.skill.name + ' ' + g.skill.text + '!');
    return;
  }
  trailQuestion = { spot: i, q: makeMcq({ count: 3 }) };
  renderTrail();
}
function answerSpot(value) {
  if (!trailQuestion) return;
  if (value !== trailQuestion.q.ans) {
    soundWrong();
    document.getElementById('trail-note').innerText = 'Not quite. Try another one!';
    return;
  }
  const i = trailQuestion.spot;
  trailQuestion = null;
  finishSpot(i, TRAIL_SPOTS[i].kind);
}
// Marks a spot done and gives what it holds.
function finishSpot(i, kind) {
  trailProgress(trailLand).done.push(i);
  let msg;
  if (kind === 'person') msg = '🧑‍🌾 ' + (TRAIL_LORE[trailLand] || 'Good luck out there!');
  else {
    const all = ['net', 'berry', 'ore'], first = chestGoods(trailLand, i);
    const goods = kind === 'big' ? all : kind === 'gate' ? [first, all[(all.indexOf(first) + 1) % all.length]] : [first];     // a gate holds two kinds
    const g = kind === 'gate' ? trailGate(trailLand, i) : null;
    msg = (g ? g.skill.icon + ' ' + g.skill.name + ' ' + g.skill.text + '! ' : '') + '🎁 ' + goods.map(trailGive).join(' · ');
    soundCoinChirp();
  }
  if (trailProgress(trailLand).done.length === ECON.explore.finishAt) msg += payTrail();      // the trail counts as done at finishAt spots, so one gate can wait for another day
  saveState();
  updateStatsUI();
  toast(msg);
  renderTrail();
}
// Gives one kind of goods (berries and ore go to the Ranch barn) and says what it was.
function trailGive(goods) {
  if (goods === 'net') {
    if (state.nets < maxNets()) { state.nets += 1; return '🕸️ Catch Net'; }
    goods = 'berry';                               // the net bag is full: berries instead
  }
  const n = goods === 'berry' ? ECON.explore.berries : ECON.explore.ore;
  ranchGive(goods, n);
  return n + ' ' + (goods === 'berry' ? '🫐' : '⛏️');
}
// The whole Trail is done: a few gems, for the first trailsPerDay trails of the day.
function payTrail() {
  const p = state.trailGems;
  if (p.day !== dayKey()) { p.day = dayKey(); p.n = 0; }
  if (p.n >= ECON.explore.trailsPerDay) return ' · Trail complete!';
  p.n += 1;
  state.gems += ECON.explore.gems;
  launchConfetti();
  return ' · Trail complete! +' + ECON.explore.gems + ' 💎';
}
