// =====================================================================
//  BOSSES: LEVELS + EVOLVED FORMS
// =====================================================================
function getBossFormIndex(lvl) { return lvl >= 45 ? 2 : (lvl >= 20 ? 1 : 0); }
const WILD_TAUNTS = ['Let us see what you have got!', 'I will not go down easy!', 'Think you can catch me?', 'Show me your best math!'];
// A wild buddy's HP and attack grow with its level (ECON.wild), so battles stay even as your buddy levels up.
function wildStats(level) {
  return { maxHp: ECON.wild.hpBase + Math.floor(level * ECON.wild.hpPerLevel), atk: 1 + Math.floor(level / ECON.wild.atkPerLevels) };
}
// A boss's attack: grows with its level, +1 as an Alpha, plus its own bonus (Rocky).
function bossAtk(base, level, form) {
  return 1 + (base.atkBonus || 0) + (form === 2 ? 1 : 0) + Math.floor(level / ECON.boss.atkPerLevels);
}
// Some bosses only appear once your buddy is strong enough (monster.minLevel).
function bossAvailable(i) { return (monstersList[i].minLevel || 0) <= getBuddyLevel(state.activePet); }
function getBossInfo() {
  if (state.wild.id) {
    const sp = getSpecies(state.wild.id), st = wildStats(bossLevel), trainer = state.wild.trainer;
    if (trainer) st.maxHp = Math.ceil(st.maxHp * ECON.map.trainerHpMult);
    const shiny = !!state.wild.shiny, legend = !!state.wild.legend;
    if (shiny) st.maxHp = Math.ceil(st.maxHp * ECON.daily.hpMult);
    if (legend) st.maxHp = Math.ceil(st.maxHp * ECON.legend.hpMult);
    return {
      legend: legend, name: (legend ? '🌟 ' : '') + (shiny ? '✨ ' : '') + (trainer ? trainer + "'s " + sp.name : sp.name), trainer: trainer, shiny: shiny, icon: sp.icon, element: sp.element, taunts: inChampionBattle() ? CHAMPION_LINES : WILD_TAUNTS, slays: null, wild: true,
      form: 0, level: bossLevel, maxHp: st.maxHp, atk: st.atk, swapped: false
    };
  }
  const base = monstersList[currentMonsterIndex];
  const form = getBossFormIndex(bossLevel);
  const name = form === 2 ? 'Alpha ' + base.name : (form === 1 ? 'Elder ' + base.name : base.name);
  return {
    name: state.raid ? '👑 ' + name : name, icon: base.icon, element: base.element, taunts: base.taunts, slays: base.slays || null,
    form: form, level: bossLevel,
    maxHp: base.baseHp + Math.floor(bossLevel / 3) + form * 2 + (state.raid ? 2 : 0) + (state.bossSwapped ? ECON.boss.swap.extraHp : 0),
    atk: bossAtk(base, bossLevel, form) + (state.bossSwapped ? ECON.boss.swap.extraAtk : 0),
    swapped: !!state.bossSwapped
  };
}
// True when this boss is a slayer of that buddy (a boss from getBossInfo(), a buddy from getPetById()).
function slaysBuddy(boss, pet) { return !!boss.slays && boss.slays === pet.id; }
function slayerTarget(boss) { const sp = boss.slays && getSpecies(boss.slays); return sp ? sp.name : ''; }
function getBossMaxHp() { return getBossInfo().maxHp; }

const TYPE_STRONG = {
  fire: ['nature', 'dark'],
  water: ['fire', 'magic'],
  nature: ['water', 'electric'],
  electric: ['water', 'magic'],
  dark: ['nature', 'electric'],
  magic: ['dark', 'fire']
};
// The element a fighter battles with: ultra-rare buddies always use Shadow power, whatever element badge they show.
function battleElement(p) { return p.ultra ? 'shadow' : p.element; }
function getTypeRelation(att, def) {
  if (att === 'shadow' || def === 'shadow') return 0;
  if ((TYPE_STRONG[att] || []).indexOf(def) !== -1) return 1;
  if ((TYPE_STRONG[def] || []).indexOf(att) !== -1) return -1;
  return 0;
}

// Extra copies of the bosses you have started on (1 or 2 Alpha wins, buddy not yet won), so the rematches come in reasonable time.
// Only once your buddy is strong enough to meet Alpha bosses.
function wantedBossCopies(candidates) {
  const B = ECON.bossBuddy;
  if (Math.min(getBuddyLevel(state.activePet), journeyLevel()) < B.minLevel) return [];
  const extra = [];
  candidates.forEach(function (i) {
    const m = monstersList[i], e = state.bossBook[i];
    if (m.buddy && e && e.alpha > 0 && e.alpha < B.alphaWins && state.unlockedSecrets.indexOf(m.buddy) === -1) for (let k = 1; k < B.weight; k++) extra.push(i);
  });
  return extra;
}
// The partner an Alpha boss calls for: half the time one that beats your buddy (a slayer of it, or an element strong against it), else any other boss.
function pickBackupBoss(pet) {
  const others = monstersList.map(function (_, i) { return i; }).filter(function (i) { return i !== currentMonsterIndex && bossAvailable(i); });
  if (Math.random() < ECON.boss.swap.counterChance) {
    const counters = others.filter(function (i) {
      const m = monstersList[i];
      return m.slays === pet.id || (TYPE_STRONG[m.element] || []).indexOf(pet.element) !== -1;
    });
    if (counters.length) return pick(counters);
  }
  return pick(others);
}
// Called after each hit that leaves the boss alive. An Alpha boss under 25% health may swap for a fresh, tougher boss (never in raids, once per boss).
// Returns true when it swapped. The first boss is not beaten: only the new one can give a win.
function maybeBackupBoss(boss, pet) {
  const S = ECON.boss.swap;
  if (boss.form !== 2 || state.raid || state.bossSwapped || monsterCurrentHp <= 0 || monsterCurrentHp >= boss.maxHp * S.below) return false;
  if (Math.random() >= S.chance) return false;
  const old = boss.name;
  currentMonsterIndex = pickBackupBoss(pet);
  state.currentMonsterIndex = currentMonsterIndex;
  state.bossSwapped = true;
  state.swapUsed = false;
  state.recentBossTypes.push(monstersList[currentMonsterIndex].element);
  if (state.recentBossTypes.length > 10) state.recentBossTypes = state.recentBossTypes.slice(-10);
  markBossSeen(currentMonsterIndex);
  monsterCurrentHp = getBossMaxHp();
  const nb = getBossInfo();
  soundSuperMove();
  launchConfetti('streak');
  screenShake(true);
  showPopup('📣 BACKUP ARRIVES!');
  toast('⚠️ ' + old + ' calls for backup! ' + nb.name + ' steps in at full health' + (nb.slays === pet.id ? ' and is strong against ' + pet.baseName + '!' : '!'));
  setBossTaunt();
  updateStatsUI();
  saveState();
  return true;
}
function pickNextBoss() {
  state.wild.id = '';
  state.wild.trainer = '';
  state.wild.shiny = false;
  state.wild.legend = false;
  state.wild.since = 0;
  const nextWild = rnd(ECON.wild.bossEvery[0], ECON.wild.bossEvery[1]);
  state.wild.next = (typeof hasTech === 'function' && hasTech('track_finder')) ? Math.max(3, nextWild - 1) : nextWild;
  if (!state.recentBossTypes) state.recentBossTypes = [];
  let excludedType = null;
  const len = state.recentBossTypes.length;
  if (len >= 2 && state.recentBossTypes[len - 1] === state.recentBossTypes[len - 2]) {
    excludedType = state.recentBossTypes[len - 1];
  }
  let candidates = [];
  for (let i = 0; i < monstersList.length; i++) {
    if (excludedType && monstersList[i].element === excludedType) continue;
    if (i !== currentMonsterIndex && bossAvailable(i)) candidates.push(i);
  }
  if (candidates.length === 0) candidates = monstersList.map(function (_, idx) { return idx; }).filter(bossAvailable);
  candidates = candidates.concat(wantedBossCopies(candidates));

  const nextIdx = candidates[rnd(0, candidates.length - 1)];
  currentMonsterIndex = nextIdx;
  state.currentMonsterIndex = nextIdx;
  state.recentBossTypes.push(monstersList[nextIdx].element);
  if (state.recentBossTypes.length > 10) state.recentBossTypes = state.recentBossTypes.slice(-10);

  bossLevel = clamp(getBuddyLevel(state.activePet) + rnd(-2, 3), 1, MAX_LEVEL);
  state.bossSwapped = false;
  state.swapUsed = false;
  resetBattleEffects();
  state.raid = null;
  if (state.monstersDefeated > 0 && state.monstersDefeated % ECON.raid.every === 0 && state.lastRaidAt !== state.monstersDefeated) {
    startRaid();
    bossLevel = clamp(bossLevel + 3, 1, MAX_LEVEL);
  }
  state.bossLevel = bossLevel;
  monsterCurrentHp = getBossMaxHp();
  partyHp = {};
  bossMistakes = 0;
  markBossSeen(currentMonsterIndex);
}
