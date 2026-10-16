// =====================================================================
//  THE CHAMPION'S HALL: after all six badges, Champion Nova waits with six buddies, one of each type.
//  Nova may swap buddies during the fight (a hurt buddy, or one that your buddy beats, steps out for a better one; ECON.map.champion).
//  Beat all six in a row to win. The first win pays the big reward and makes you Champion; after that a win pays a little once a day.
//  A fight is a gym run: state.gym = { region: 'champion', step, champ: { team, fallen, hp, swaps, cool, level } }.
// =====================================================================
const CHAMPION_NAME = 'Champion Nova';
const CHAMPION_TEAM = ['phoenix', 'shark', 'lion', 'griffin', 'panther', 'pegasus'];       // fire, water, nature, electric, dark, magic (store buddies, so their ids never change)
const CHAMPION_LINES = ['Six buddies, six types. Show me what you have got!', 'My team can swap places any time!', 'Every buddy of mine trained for this day!', 'Math is my superpower. Is it yours?', 'I will not go down easy, challenger!'];

function championOpen() { return gymRegions().every(function (r) { return hasBadge(r.id); }); }
function inChampionBattle() { return !!(state.gym && state.gym.champ); }
function championAlive() { const c = state.gym.champ; return c.team.filter(function (id) { return c.fallen.indexOf(id) === -1; }); }
function freshChampionRun() { return { team: CHAMPION_TEAM.slice(), fallen: [], hp: {}, swaps: 0, cool: 0, level: 0 }; }
// A saved run, repaired: only the six fixed buddies, healthy HP numbers, at least one buddy left to beat.
function cleanChampionRun(c) {
  if (!isPlainObject(c)) return freshChampionRun();
  const run = freshChampionRun();
  run.fallen = (Array.isArray(c.fallen) ? c.fallen : []).filter(function (id, i, a) { return run.team.indexOf(id) !== -1 && a.indexOf(id) === i; });
  if (run.fallen.length >= run.team.length) return freshChampionRun();
  run.team.forEach(function (id) { const v = isPlainObject(c.hp) ? c.hp[id] : 0; if (run.fallen.indexOf(id) === -1 && typeof v === 'number' && v >= 1) run.hp[id] = asInt(v, 1, 9999, 1); });
  run.swaps = asInt(c.swaps, 0, 99, 0);
  run.cool = asInt(c.cool, 0, 9, 0);
  run.level = asInt(c.level, 0, MAX_LEVEL, 0);
  return run;
}

// ----- picking Nova's buddy -----
// The first choice, and the next one after a buddy falls: the one that beats your fighter best (ties go in team order).
function championMatchup(id, pet) { return getTypeRelation(getSpecies(id).element, battleElement(pet)); }       // 1: Nova's buddy beats yours, -1: yours beats it
function pickChampionFoe() {
  const c = state.gym.champ, pet = getActivePetDisplay();
  if (!c.level) c.level = clamp(getBuddyLevel(state.activePet) + ECON.map.champion.levels, 1, MAX_LEVEL);
  let best = '', score = -9;
  championAlive().forEach(function (id) { const s = championMatchup(id, pet); if (s > score) { score = s; best = id; } });
  state.wild.id = best;
  state.wild.trainer = CHAMPION_NAME;
  state.wild.shiny = false;
  state.wild.legend = false;
  markDexSeen(best);
  bossLevel = c.level;
  gymFoeReset();
  if (c.hp[best] > 0) monsterCurrentHp = c.hp[best];
}
// After a saved game loads: the fight carries on with the same buddy and the HP it had.
function restoreChampionFoe() {
  const c = state.gym.champ;
  if (!c.level || championAlive().indexOf(state.wild.id) === -1) { pickChampionFoe(); return; }
  bossLevel = c.level;
  monsterCurrentHp = c.hp[state.wild.id] > 0 ? c.hp[state.wild.id] : getBossMaxHp();
}

// ----- Nova swaps -----
// Called after each hit on Nova's buddy. A buddy that is hurt, or that your buddy beats, steps out when a clearly better one waits.
function championAfterHit(pet) {
  if (!inChampionBattle() || monsterCurrentHp <= 0) return;
  const c = state.gym.champ, cur = state.wild.id, M = ECON.map.champion, max = getBossMaxHp();
  c.hp[cur] = Math.max(1, monsterCurrentHp);
  if (c.cool > 0) c.cool -= 1;
  if (c.swaps >= M.maxSwaps || c.cool > 0) return;
  if (monsterCurrentHp > max * M.swapAt && championMatchup(cur, pet) !== -1) return;
  const worth = function (id) { return championMatchup(id, pet) * 2 + (c.hp[id] > 0 ? c.hp[id] / max : 1); };
  let next = '';
  championAlive().forEach(function (id) { if (id !== cur && (!next || worth(id) > worth(next))) next = id; });
  if (!next || worth(next) < worth(cur) + 0.5) return;
  c.swaps += 1;
  c.cool = M.cooldown;
  state.wild.id = next;
  markDexSeen(next);
  monsterCurrentHp = c.hp[next] > 0 ? c.hp[next] : max;
  showPopup('🔄 ' + CHAMPION_NAME.split(' ')[1] + ' swaps to ' + getSpecies(next).name + '!');
  toast('🔄 ' + CHAMPION_NAME + ' swaps in ' + getSpecies(next).icon + ' ' + getSpecies(next).name + '!');
  setBossTaunt();
  saveState();
}

// ----- winning -----
// One of Nova's buddies fell (called by advanceGym). Returns null while buddies are left, else the result of the whole fight.
function championFell() {
  const g = state.gym, c = g.champ;
  if (c.fallen.indexOf(state.wild.id) === -1) c.fallen.push(state.wild.id);
  delete c.hp[state.wild.id];
  g.step = c.fallen.length;
  if (c.fallen.length < c.team.length) return null;
  state.gym = null;
  state.faintedPets = [];                                  // a won battle sends everyone home rested
  const ch = state.champ, M = ECON.map.champion, first = ch.wins === 0, pays = ch.day !== dayKey();
  const res = { champion: true, first: first, gems: 0, nets: 0, held: [], extra: 0 };
  if (first) {
    res.gems = M.firstGems; res.nets = M.nets;
    HELD_ITEMS.forEach(function (it) {                     // one of each held item; one you already own pays its shop price instead
      if (state.heldOwned.indexOf(it.id) === -1) { state.heldOwned.push(it.id); res.held.push(it.icon + ' ' + it.name); } else res.extra += ECON.held.cost[it.id];
    });
    state.storySeen.champion = 1;
  } else if (pays) res.gems = M.repeatGems;
  if (pays) ch.day = dayKey();
  ch.wins += 1;
  state.gems += res.gems + res.extra;
  state.nets += res.nets;
  res.wins = ch.wins;
  checkEarnedGear();
  return res;
}
function showChampionStory(res) {
  const panels = [{ icon: '👑', text: res.first ? 'Nova bows: "Six buddies and not one of them could stop you. You are the Number Kingdom Champion!"' : 'Nova laughs: "Another win! My team needs more practice, Champion."' }];
  if (res.gems) panels.push({ icon: '💎', text: (res.first ? 'Champion reward: +' : 'Daily reward: +') + res.gems + ' gems!' });
  else panels.push({ icon: '⭐', text: 'No more gems today, but come back tomorrow!' });
  if (res.first) {
    panels.push({ icon: '🎁', text: "New gear: Champion's Laurel, Champion's Trophy and Champion's Mantle! Find them in the Wardrobe." });
    panels.push({ icon: '🕸️', text: '+' + res.nets + ' Catch Nets' + (res.held.length ? ' and held items: ' + res.held.join(', ') : '') + (res.extra ? ' (+' + res.extra + ' gems for items you already had)' : '') + '!' });
  }
  showStoryModal({ chapter: res.first ? 'Champion!' : 'Champion Rematch', title: res.first ? '👑 You beat the Champion!' : "👑 Champion's Hall cleared!", panels: panels, note: "Champion's Hall wins: " + res.wins, btn: 'Hooray!', cleared: true });
}

// ----- the map and the start of a fight -----
function startChampion() {
  if (state.gym || !championOpen()) return;
  state.gym = { region: 'champion', step: 0, champ: freshChampionRun() };
  closeMap();
  pickGymFoe();
  setBossTaunt();
  updateStatsUI();
  saveState();
  const again = state.champ.wins > 0;
  enqueueModal(function () {
    showStoryModal({ chapter: "Champion's Hall", title: '👑 The Champion\'s Hall', panels: [
      { icon: '🏛️', text: again ? 'Nova is back on the stage: "Let us play again, Champion!"' : 'You walk into a golden hall. Champion Nova waits with a smile: "Six badges! I have been expecting you."' },
      { icon: '🔄', text: 'Nova has six buddies, one of each type. Nova can swap them at any time, so keep an eye on your matchups!' },
      { icon: '⚔️', text: 'Beat all six buddies in a row to win. If you leave, the fight starts over.' },
      { icon: '💎', text: again ? 'A win pays +' + ECON.map.champion.repeatGems + ' gems once a day.' : 'The first win pays +' + ECON.map.champion.firstGems + ' gems, special gear and more!' }], note: '6 buddies. Nova\'s buddies cannot be caught.', btn: '⚔️ To battle!' });
  });
}
function championRowHtml() {
  const open = championOpen(), here = inChampionBattle(), wins = state.champ.wins;
  let actions;
  if (!open) actions = '<span class="map-badge">🔒</span>';
  else if (here) actions = '<button class="claim-btn" onclick="leaveGym()">Leave battle (' + state.gym.step + '/' + CHAMPION_TEAM.length + ')</button>';
  else actions = '<button class="claim-btn" ' + (state.gym ? 'disabled' : '') + ' onclick="startChampion()">' + (wins ? '👑 Rematch' : '👑 Challenge') + '</button>';
  const desc = !open ? '🔒 Win all six badges first (' + state.badges.length + '/' + gymRegions().length + ')'
    : wins ? 'Six buddies, one of each type · +' + ECON.map.champion.repeatGems + ' 💎 once a day · wins: ' + wins
    : 'Six buddies, one of each type, and Nova swaps them · big reward on your first win';
  return '<div class="care-row map-row champion-row' + (open ? '' : ' locked') + '"><div><div class="t">👑 The Champion\'s Hall</div><div class="d">' + desc + '</div></div><div class="map-actions">' + actions + '</div></div>';
}
