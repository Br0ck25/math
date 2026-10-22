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
// A boss of the element for a story fight; with a `salt` (a gym's land id) it is always the same one, so a gym keeps its leader.
function abBossIndex(element, salt) {
  const cands = monstersList.map(function (_, i) { return i; }).filter(function (i) { return (!element || monstersList[i].element === element) && !monstersList[i].slays && bossAvailable(i); });
  if (!salt) return pick(cands);
  let h = 3; for (let i = 0; i < salt.length; i++) h = (h * 31 + salt.charCodeAt(i)) % 10007;
  return cands[h % cands.length];
}

// ----- gyms -----
function abGymRounds(id, rematch) {
  const r = regionById(id), up = rematch ? ECON.map.rematch.levels : 0, teams = GYM_TEAMS[id], rounds = [];
  const mons = function (team, plus) { return team.map(function (t) { return { id: t[0], level: clamp(t[1] + up + (plus || 0), 2, MAX_LEVEL) }; }); };
  for (let s = 0; s < ECON.map.trainers; s++) rounds.push({ kind: 'trainer', name: gymTrainer(id, s), foes: mons(teams[s % teams.length]) });
  const boss = abBossIndex(r.element, id), lvl = (ECON.map.levels[id] || 1) + up + 3;
  markBossSeen(boss);
  rounds.push({ kind: 'leader', bossIdx: boss, bossLevel: lvl, name: monstersList[boss].name, foes: [{ boss: boss, level: lvl }].concat(mons(teams[teams.length - 1], 1)) });
  return rounds;
}
// The gym door was opened (owEnterGym): a fresh chain, a badge at the end.
// `inside`: the leader's own fight in a gym you walked through (its trainers were met on the way); otherwise the whole chain.
function abStartGym(id, inside) {
  const r = regionById(id), rematch = hasBadge(id);
  if (!r.gym || !regionUnlocked(r) || (rematch && !isChampion()) || state.gym || ab) return;
  state.region = id; markRegionVisited(id);
  abStart({ rounds: inside && !rematch ? abGymRounds(id, rematch).slice(-1) : abGymRounds(id, rematch), gymWeather: { fire: 'sun', water: 'rain' }[r.element] || '', onWin: function () { abGymWon(id, rematch); } });
}
function abGymWon(id, rematch) {
  state.gym = rematch ? { region: id, step: ECON.map.trainers, rematch: true } : { region: id, step: ECON.map.trainers };
  const res = advanceGym(true), art = worldSprite('t-gym-door');
  state.gym = null;
  saveState(); updateStatsUI();
  if (!res) { openTalk({ name: 'Gym Leader', art: art, lines: ['Well fought! You beat the gym again.'] }); return; }
  if (res.rematch) { openTalk({ name: 'Gym Leader', art: art, lines: ['A great rematch, Champion! The prize money was paid in the fight.'] }); return; }
  const charm = KEY_ITEMS.find(function (k) { return k.badge === res.region.id; });
  const lines = [GYM_STORY[res.region.id].outro, 'You won the ' + res.region.name + ' Badge!'];
  if (AB_TM_BY_BADGE[res.region.id]) lines.push('You also get TM ' + AB_TMS[AB_TM_BY_BADGE[res.region.id]].name + '. A Move Tutor can teach it.');
  if (charm) lines.push('You also get the ' + charm.name + '. ' + charm.text + ' Use it on the map!');
  if (res.hall) lines.push('All ' + gymRegions().length + " badges! The Champion's Hall is open.");
  openTalk({ name: res.region.name + ' Gym', art: art, lines: lines });
}

// ----- a story boss on the map (the Scramblers' bosses): the boss and two buddies of its element -----
function abStartBoss(npc) {
  const lvl = abWildLevel() + 2, boss = abBossIndex(npc.boss);
  markBossSeen(boss);
  abStart({ rounds: [{ kind: 'leader', bossIdx: boss, bossLevel: lvl + 1, name: monstersList[boss].name, npc: npc, foes: [{ boss: boss, level: lvl + 1 }].concat(abTeamOf(npc.boss, 2, lvl)) }] });
}

// ----- the Hall: the Elite Four, then Nova -----
function abHallRounds() {
  const mine = getBuddyLevel(state.activePet), rounds = ELITE_FOUR.map(function (e) { return { kind: 'trainer', base: ECON.money.leaderBase, name: e.name, foes: abTeamOf(e.element, 5, mine) }; });
  rounds.push({ kind: 'leader', name: CHAMPION_NAME, foes: CHAMPION_TEAM.map(function (id) { return { id: id, level: clamp(mine + ECON.map.champion.levels, 1, MAX_LEVEL) }; }) });
  return rounds;
}
function abStartHall() {
  if (state.gym || ab || !championOpen()) return;
  abStart({ rounds: abHallRounds(), onWin: abHallWon });
}
// ----- Silver Peak: Master Ori's six legends, one fight -----
function abStartMaster() {
  if (state.gym || ab || !hasBadge('summit')) return;
  const lvl = clamp(Math.max(getBuddyLevel(state.activePet), ECON.map.master.minLevel) + ECON.map.master.levels, 1, MAX_LEVEL);
  abStart({ rounds: [{ kind: 'leader', name: MASTER_NAME, foes: MASTER_TEAM.map(function (id) { return { id: id, level: lvl }; }) }], onWin: abMasterWon });
}
function abMasterWon() {
  const ch = state.champ, first = ch.master === 0;
  ch.master += 1;
  saveState(); updateStatsUI();
  openTalk({ name: 'Silver Peak', art: worldSprite('t-gym-door'), lines: [first ? 'Master Ori bows: "My six legends are at their best, and you still won. There is nobody left to beat. You are the greatest trainer in the Number Kingdom."' : 'Master Ori smiles: "Back again? My legends missed you."'], onClose: owStepBack });
}
function abHallWon() {
  const res = championReward(), art = worldSprite('t-gym-door'), lines = [];
  saveState(); updateStatsUI();
  lines.push(res.first ? 'Nova bows: "Six buddies and not one of them could stop you. You are the Number Kingdom Champion!"' : 'Nova laughs: "Another win! My team needs more practice, Champion."');
  lines.push(res.first ? 'The prize money was paid in each fight.' : 'The prize money was paid in each fight again.');
  openTalk({ name: "Champion's Hall", art: art, lines: lines, onClose: owStepBack });
}
