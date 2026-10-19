// =====================================================================
//  THE RANCH (the "Ranch" tab of the buddy hub)
//  Buddies that are not on your team can work at a station. They earn while you are away (at most ECON.ranch.capHours at a time) and every
//  correct answer cheers them on. Nothing is lost when you stay away: the clock only stops. Numbers live in ECON.ranch.
// =====================================================================
// match: elements that work this station at ECON.ranch.matchMult times the speed.
const RANCH_STATIONS = [
  { id: 'berry', icon: '🫐', name: 'Berry Patch', good: 'Berries', match: ['nature', 'water'] },
  { id: 'ore',   icon: '⛏️', name: 'Mine',        good: 'Ore',     match: ['fire', 'electric', 'dark'] },
  { id: 'honey', icon: '🍯', name: 'Apiary',      good: 'Honey',   match: ['magic', 'nature'] },
  { id: 'parts', icon: '🔧', name: 'Workshop',    good: 'Parts',   match: ['electric', 'magic'] }
];
function ranchStation(id) { return RANCH_STATIONS.find(function (s) { return s.id === id; }) || null; }
function ranchSlots() { return 1 + Math.floor(state.badges.length / ECON.ranch.badgesPerSlot); }

// Buddies that really work now: assigned, owned and not on the team.
function ranchWorkers() {
  const owned = getOwnedIds(), team = getTeam();
  return Object.keys(state.ranch.workers).filter(function (id) {
    return owned.indexOf(id) !== -1 && team.indexOf(id) === -1 && ranchStation(state.ranch.workers[id]);
  }).slice(0, ranchSlots());
}
function ranchRate(id) {
  const st = ranchStation(state.ranch.workers[id]), sp = getSpecies(id);
  return ECON.ranch.perHour * (st.match.indexOf(sp.element) !== -1 || sp.element === 'shadow' ? ECON.ranch.matchMult : 1);      // a Wildcard buddy is good at everything
}
function ranchAdd(seconds) {
  const r = state.ranch;
  ranchWorkers().forEach(function (id) {
    const good = state.ranch.workers[id];
    r.stock[good] = Math.min(ECON.ranch.stockCap, Math.round(((r.stock[good] || 0) + ranchRate(id) * seconds / 3600) * 1000) / 1000);
  });
}
// Work done since last time (never negative, never more than capHours).
function ranchAccrue() {
  const r = state.ranch, now = Date.now();
  if (r.at > 0) ranchAdd(clamp((now - r.at) / 1000, 0, ECON.ranch.capHours * 3600));
  r.at = now;
}
// A correct answer: every worker does a little work.
function ranchCheer() {
  if (ranchWorkers().length) ranchAdd(ECON.ranch.answerSec);
}
function ranchHas(good) { return Math.floor(state.ranch.stock[good] || 0); }
function ranchGive(good, n) { state.ranch.stock[good] = Math.min(ECON.ranch.stockCap, (state.ranch.stock[good] || 0) + n); }
function ranchStarted() { return Object.keys(state.ranch.workers).length > 0 || RANCH_STATIONS.some(function (s) { return ranchHas(s.id) > 0; }); }
// Pay a price in gems, or in berries when pay is 'berry' (the caller has checked canPay).
function canPay(pay, gems, berries) { return pay === 'berry' ? ranchHas('berry') >= berries : state.gems >= gems; }
function spend(pay, gems, berries) { if (pay === 'berry') state.ranch.stock.berry -= berries; else state.gems -= gems; }

// Ore makes Catch Nets.
function craftNet() {
  if (ranchHas('ore') < ECON.ranch.orePerNet) { soundWrong(); return; }
  if (state.nets >= maxNets()) { soundWrong(); toast('You can hold ' + maxNets() + ' Catch Nets'); return; }
  state.ranch.stock.ore -= ECON.ranch.orePerNet;
  state.nets += 1;
  soundCoinChirp();
  showPopup('🕸️ CATCH NET! (' + state.nets + ')');
  saveState();
  updateStatsUI();
  renderHub();
}

function assignWorker(id, station) {
  const r = state.ranch;
  if (getOwnedIds().indexOf(id) === -1 || getTeam().indexOf(id) !== -1 || !ranchStation(station)) { soundWrong(); return; }
  ranchAccrue();
  if (!r.workers[id] && ranchWorkers().length >= ranchSlots()) { soundWrong(); toast('The Ranch has ' + ranchSlots() + ' work spot' + (ranchSlots() === 1 ? '' : 's') + '. Send someone home first, or win badges for more!'); return; }
  r.workers[id] = station;
  soundClick();
  saveState();
  renderHub();
}
function unassignWorker(id) {
  ranchAccrue();
  delete state.ranch.workers[id];
  soundClick();
  saveState();
  renderHub();
}

// Honey feeds the buddy shown in the hub: a little Buddy XP.
function feedHoney() {
  const id = hubPet;
  if (isSleepy(id)) { soundWrong(); return; }
  if (ranchHas('honey') < ECON.ranch.honeyPerFeed) { soundWrong(); return; }
  state.ranch.stock.honey -= ECON.ranch.honeyPerFeed;
  addXpTo(id, ECON.ranch.honeyXp);
  soundCoinChirp();
  hubBounce('🍯 ' + getPetById(id).baseName + ' loves the honey! +' + ECON.ranch.honeyXp + ' XP');
  saveState();
  renderHub();
}
// Parts brew a Super Potion: full HP for your buddy and everyone who fainted wakes up.
function craftPotion() {
  if (ranchHas('parts') < ECON.ranch.partsPerPotion) { soundWrong(); return; }
  if (potionUseless()) { soundWrong(); toast('Your buddies are already at full HP!'); return; }
  state.ranch.stock.parts -= ECON.ranch.partsPerPotion;
  applyPotion();
  saveState();
  updateStatsUI();
  renderHub();
}

// The Nursery: the workers raise an egg together. It is a normal egg (state.egg, hatched by correct answers), so only one can grow at a time.
function breedWorkers() {
  const w = ranchWorkers();
  if (w.length < 2) { soundWrong(); toast('Two or more buddies have to be working together.'); return; }
  if (state.egg) { soundWrong(); toast('Your egg has to hatch first!'); return; }
  if (ranchHas('berry') < ECON.ranch.eggBerries) { soundWrong(); toast('You need ' + (ECON.ranch.eggBerries - ranchHas('berry')) + ' more 🫐'); return; }
  state.ranch.stock.berry -= ECON.ranch.eggBerries;
  awardEgg(getSpecies(pick(w)).element, ECON.ranch.eggRarity);
  soundSecretFound();
  saveState();
  renderHub();
}

function renderRanchTab() {
  ranchAccrue();
  const r = state.ranch, id = hubPet, d = getPetById(id), onTeam = getTeam().indexOf(id) !== -1;
  const working = ranchWorkers();
  let h = '<div class="care-row"><div><div class="t">🏡 Ranch · ' + working.length + '/' + ranchSlots() + ' working</div>' +
    '<div class="d">Buddies off your team work for you, even when you are away (up to ' + ECON.ranch.capHours + ' hours at a time). Every right answer helps too! More work spots open with badges.</div></div></div>' +
    '<div class="care-row"><div><div class="t">' + RANCH_STATIONS.map(function (s) { return s.icon + ' ' + ranchHas(s.id); }).join(' &nbsp; ') + '</div>' +
    '<div class="d">In the barn (up to ' + ECON.ranch.stockCap + ' of each).</div></div></div>';
  h += '<div class="care-row"><div><div class="t">🕸️ Craft a Catch Net</div><div class="d">' + ECON.ranch.orePerNet + ' ⛏️ ore · you have ' + state.nets + '/' + maxNets() + ' nets</div></div>' +
    '<button class="claim-btn" ' + (ranchHas('ore') < ECON.ranch.orePerNet || state.nets >= maxNets() ? 'disabled' : '') + ' onclick="craftNet()">Craft</button></div>';
  const egg = state.egg;
  h += '<div class="care-row"><div><div class="t">🥚 Nursery</div><div class="d">' + (egg
    ? 'A ' + egg.rarity + ' ' + egg.element + ' egg: ' + Math.max(0, egg.target - egg.steps) + ' more right answers to hatch!'
    : 'Your workers raise a ' + ECON.ranch.eggRarity + ' egg together: ' + ECON.ranch.eggBerries + ' 🫐 and two or more workers. Its type is one of theirs.') + '</div></div>' +
    '<button class="claim-btn" ' + (egg || working.length < 2 || ranchHas('berry') < ECON.ranch.eggBerries ? 'disabled' : '') + ' onclick="breedWorkers()">Raise</button></div>';
  const sleepyPet = isSleepy(id);
  h += '<div class="care-row"><div><div class="t">🍯 Honey treat for ' + escHtml(d.baseName) + '</div><div class="d">' + ECON.ranch.honeyPerFeed + ' 🍯 · +' + ECON.ranch.honeyXp + ' Buddy XP' + (sleepyPet ? ' · resting right now' : '') + '</div></div>' +
    '<button class="claim-btn" ' + (sleepyPet || ranchHas('honey') < ECON.ranch.honeyPerFeed ? 'disabled' : '') + ' onclick="feedHoney()">Feed</button></div>' +
    '<div class="care-row"><div><div class="t">💖 Brew a Super Potion</div><div class="d">' + ECON.ranch.partsPerPotion + ' 🔧 parts · full HP and wakes up everyone who fainted</div></div>' +
    '<button class="claim-btn" ' + (potionUseless() || ranchHas('parts') < ECON.ranch.partsPerPotion ? 'disabled' : '') + ' onclick="craftPotion()">Brew</button></div>';
  working.forEach(function (w) {
    const st = ranchStation(r.workers[w]), b = getPetById(w);
    h += '<div class="care-row"><div><div class="t">' + st.icon + ' ' + escHtml(b.baseName) + ' · ' + st.name + '</div><div class="d">' + Math.round(ranchRate(w) * 10) / 10 + ' ' + st.good.toLowerCase() + ' an hour' + (ranchRate(w) > ECON.ranch.perHour ? ' (loves this work!)' : '') + '</div></div>' +
      '<button class="claim-btn" aria-label="Send ' + escHtml(b.baseName) + ' home" onclick="unassignWorker(&quot;' + w + '&quot;)">Send home</button></div>';
  });
  h += '<div style="font-size:0.78rem; font-weight:800; margin:6px 0 2px;">' + escHtml(d.baseName) + '</div>';
  if (onTeam) h += '<div class="care-row"><div class="d">On your team, so it fights instead of working. Swap it off the team to put it to work.</div></div>';
  else if (r.workers[id] && working.indexOf(id) !== -1) h += '<div class="care-row"><div class="d">Already working.</div></div>';
  else RANCH_STATIONS.forEach(function (s) {
    const good = s.match.indexOf(d.element) !== -1;
    h += '<div class="care-row"><div><div class="t">' + s.icon + ' ' + s.name + '</div><div class="d">' + s.good + (good ? ' · ' + d.element + ' buddies are fast here!' : '') + '</div></div>' +
      '<button class="claim-btn" onclick="assignWorker(&quot;' + id + '&quot;, &quot;' + s.id + '&quot;)">Work here</button></div>';
  });
  document.getElementById('hub-body').innerHTML = h;
}
