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
    maxHp: base.baseHp + Math.floor(bossLevel / 3) + form * 2 + (state.raid ? 2 : 0),
    atk: 1 + (form === 2 ? 1 : 0)
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

// Extra copies of the bosses whose buddy you can still win, so the Alpha wins come in reasonable time. Only once your buddy can reach Alpha bosses.
function wantedBossCopies(candidates) {
  const B = ECON.bossBuddy;
  if (getBuddyLevel(state.activePet) < B.minLevel) return [];
  const extra = [];
  candidates.forEach(function (i) {
    const m = monstersList[i];
    if (m.buddy && state.unlockedSecrets.indexOf(m.buddy) === -1) for (let k = 1; k < B.weight; k++) extra.push(i);
  });
  return extra;
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
