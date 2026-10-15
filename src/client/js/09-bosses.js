// =====================================================================
//  BOSSES: LEVELS + EVOLVED FORMS
// =====================================================================
function getBossFormIndex(lvl) { return lvl >= 45 ? 2 : (lvl >= 20 ? 1 : 0); }
function getBossInfo() {
  const base = monstersList[currentMonsterIndex];
  const form = getBossFormIndex(bossLevel);
  const name = form === 2 ? 'Alpha ' + base.name : (form === 1 ? 'Elder ' + base.name : base.name);
  return {
    name: state.raid ? '👑 ' + name : name, icon: base.icon, element: base.element, taunts: base.taunts, slays: base.slays || null,
    form: form, level: bossLevel,
    maxHp: base.baseHp + Math.floor(bossLevel / 3) + form * 2 + (state.raid ? 2 : 0) + (state.bossSwapped ? ECON.boss.swap.extraHp : 0),
    atk: 1 + (form === 2 ? 1 : 0) + (state.bossSwapped ? ECON.boss.swap.extraAtk : 0),
    swapped: !!state.bossSwapped
  };
}
// True when this boss is a slayer of that buddy (a boss from getBossInfo(), a buddy from getPetById()).
function slaysBuddy(boss, pet) { return !!boss.slays && boss.slays === pet.id; }
function slayerTarget(boss) { const sp = boss.slays && getSpecies(boss.slays); return sp ? sp.name : ''; }
function getBossMaxHp() { return getBossInfo().maxHp; }

const TYPE_STRONG = {
  fire: ['nature'],
  water: ['fire'],
  nature: ['water', 'electric'],
  electric: ['water', 'magic'],
  dark: ['nature'],
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
  if (getBuddyLevel(state.activePet) < B.minLevel) return [];
  const extra = [];
  candidates.forEach(function (i) {
    const m = monstersList[i], e = state.bossBook[i];
    if (m.buddy && e && e.alpha > 0 && e.alpha < B.alphaWins && state.unlockedSecrets.indexOf(m.buddy) === -1) for (let k = 1; k < B.weight; k++) extra.push(i);
  });
  return extra;
}
// The partner an Alpha boss calls for: half the time one that beats your buddy (a slayer of it, or an element strong against it), else any other boss.
function pickBackupBoss(pet) {
  const others = monstersList.map(function (_, i) { return i; }).filter(function (i) { return i !== currentMonsterIndex; });
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
  if (!state.recentBossTypes) state.recentBossTypes = [];
  let excludedType = null;
  const len = state.recentBossTypes.length;
  if (len >= 2 && state.recentBossTypes[len - 1] === state.recentBossTypes[len - 2]) {
    excludedType = state.recentBossTypes[len - 1];
  }
  let candidates = [];
  for (let i = 0; i < monstersList.length; i++) {
    if (excludedType && monstersList[i].element === excludedType) continue;
    if (i !== currentMonsterIndex) candidates.push(i);
  }
  if (candidates.length === 0) candidates = monstersList.map(function (_, idx) { return idx; });
  candidates = candidates.concat(wantedBossCopies(candidates));

  const nextIdx = candidates[rnd(0, candidates.length - 1)];
  currentMonsterIndex = nextIdx;
  state.currentMonsterIndex = nextIdx;
  state.recentBossTypes.push(monstersList[nextIdx].element);
  if (state.recentBossTypes.length > 10) state.recentBossTypes = state.recentBossTypes.slice(-10);

  bossLevel = clamp(getBuddyLevel(state.activePet) + rnd(-2, 3), 1, MAX_LEVEL);
  state.bossSwapped = false;
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
