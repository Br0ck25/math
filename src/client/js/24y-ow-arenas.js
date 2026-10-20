// =====================================================================
//  GYMS, STORY BOSSES AND THE HALL on the Adventure battle screen (24x-ow-battle.js). A gym is a chain of fights with the same team: its trainers, then the leader
//  (a boss from the boss list). The Hall is the Elite Four, then Champion Nova's six. Losing a chain sends you back to the last Buddy Center and the chain starts over.
//  The prizes are the ones the Map already pays: advanceGym() for a badge, championReward() for the Hall. Levels follow the land (ECON.map.levels), so a gym is a goal to train for.
// =====================================================================
const ELITE_FOUR = [
  { name: 'Elite Sol', element: 'fire' }, { name: 'Elite Marin', element: 'water' }, { name: 'Elite Volta', element: 'electric' }, { name: 'Elite Noct', element: 'dark' }
];
// n different buddies of an element (any element when ''), around a level.
function abTeamOf(element, n, level) {
  const pool = wildPool().filter(function (p) { return !element || p.element === element; }), out = [];
  for (let i = 0; i < n; i++) { let sp = pick(pool); for (let t = 0; t < 4 && out.some(function (f) { return f.id === sp.id; }); t++) sp = pick(pool); out.push({ id: sp.id, level: clamp(level + rnd(0, 1), 2, MAX_LEVEL) }); }
  return out;
}
function abBossIndex(element) {
  const cands = monstersList.map(function (_, i) { return i; }).filter(function (i) { return (!element || monstersList[i].element === element) && !monstersList[i].slays && bossAvailable(i); });
  return pick(cands);
}

// ----- gyms -----
function abGymRounds(id, rematch) {
  const r = regionById(id), base = (ECON.map.levels[id] || 1) + (rematch ? ECON.map.rematch.levels : 0), rounds = [];
  for (let s = 0; s < ECON.map.trainers; s++) rounds.push({ kind: 'trainer', name: gymTrainer(id, s), foes: abTeamOf(r.element, s === ECON.map.trainers - 1 ? 2 : 1, base + s) });
  const boss = abBossIndex(r.element), lvl = base + 2;
  markBossSeen(boss);
  rounds.push({ kind: 'leader', name: monstersList[boss].name, foes: [{ boss: boss, level: lvl + 1 }].concat(abTeamOf(r.element, 2, lvl)) });
  return rounds;
}
// The gym door was opened (owEnterGym): a fresh chain, a badge at the end.
function abStartGym(id) {
  const r = regionById(id), rematch = hasBadge(id);
  if (!r.gym || !regionUnlocked(r) || (rematch && !isChampion()) || state.gym || ab) return;
  state.region = id; markRegionVisited(id);
  abStart({ rounds: abGymRounds(id, rematch), onWin: function () { abGymWon(id, rematch); } });
}
function abGymWon(id, rematch) {
  state.gym = rematch ? { region: id, step: ECON.map.trainers, rematch: true } : { region: id, step: ECON.map.trainers };
  const res = advanceGym(true), art = worldSprite('t-gym-door');
  state.gym = null;
  saveState(); updateStatsUI();
  if (!res) { openTalk({ name: 'Gym Leader', art: art, lines: ['Well fought! You beat the gym again.'] }); return; }
  if (res.rematch) { openTalk({ name: 'Gym Leader', art: art, lines: ['A great rematch, Champion!', res.gems ? 'Rematch reward: +' + res.gems + ' gems.' : 'No more rematch gems today, but come back tomorrow!'] }); return; }
  const charm = KEY_ITEMS.find(function (k) { return k.badge === res.region.id; });
  const lines = [GYM_STORY[res.region.id].outro, 'You won the ' + res.region.name + ' Badge! +' + ECON.map.badgeGems + ' gems.'];
  if (charm) lines.push('You also get the ' + charm.name + '. ' + charm.text + ' Use it on the map!');
  if (res.hall) lines.push('All ' + gymRegions().length + " badges! The Champion's Hall is open.");
  openTalk({ name: res.region.name + ' Gym', art: art, lines: lines });
}

// ----- a story boss on the map (the Scramblers' bosses): the boss and two buddies of its element -----
function abStartBoss(npc) {
  const lvl = abWildLevel() + 2, boss = abBossIndex(npc.boss);
  markBossSeen(boss);
  abStart({ kind: 'leader', name: monstersList[boss].name, npc: npc, foes: [{ boss: boss, level: lvl + 1 }].concat(abTeamOf(npc.boss, 2, lvl)) });
}

// ----- the Hall: the Elite Four, then Nova -----
function abHallRounds() {
  const mine = getBuddyLevel(state.activePet), rounds = ELITE_FOUR.map(function (e) { return { kind: 'trainer', name: e.name, foes: abTeamOf(e.element, 3, mine) }; });
  rounds.push({ kind: 'leader', name: CHAMPION_NAME, foes: CHAMPION_TEAM.map(function (id) { return { id: id, level: clamp(mine + ECON.map.champion.levels, 1, MAX_LEVEL) }; }) });
  return rounds;
}
function abStartHall() {
  if (state.gym || ab || !championOpen()) return;
  abStart({ rounds: abHallRounds(), onWin: abHallWon });
}
function abHallWon() {
  const res = championReward(), art = worldSprite('t-gym-door'), lines = [];
  saveState(); updateStatsUI();
  lines.push(res.first ? 'Nova bows: "Six buddies and not one of them could stop you. You are the Number Kingdom Champion!"' : 'Nova laughs: "Another win! My team needs more practice, Champion."');
  lines.push(res.gems ? (res.first ? 'Champion reward: +' : 'Daily reward: +') + res.gems + ' gems!' : 'No more gems today, but come back tomorrow!');
  if (res.first) lines.push("New gear: Champion's Laurel, Trophy and Mantle. Find them in the Wardrobe. You also get " + res.nets + ' Catch Nets and a held item of each kind.');
  openTalk({ name: "Champion's Hall", art: art, lines: lines, onClose: owStepBack });
}
