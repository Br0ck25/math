// =====================================================================
//  WILD BUDDIES: most battles are against a wild buddy you may catch; a boss comes after every 5-8 of them.
//  A caught buddy you already own becomes a spare that can be sold for gems (see sellSpare). Numbers live in ECON.wild / ECON.sell.
// =====================================================================
// Store buddies (except the Bandit) and secret buddies. Mythic, ultra and boss buddies keep their own special ways of being earned.
function wildPool() {
  return storePets.filter(function (p) { return !p.requiresAllStorePets; }).concat(secretCompanions);
}
function isStoreBuddy(sp) { return storePets.indexOf(sp) !== -1; }
function wildCatchChance(sp) {
  const W = ECON.wild.catchChance;
  const base = !isStoreBuddy(sp) ? W.secret : sp.cost < 150 ? W.cheap : sp.cost < 800 ? W.mid : W.rare;
  return Math.min(1, base + Math.min(state.wild.miss, ECON.wild.pityMax) * ECON.wild.pityStep);
}
function spareValueOf(id) {
  const sp = getSpecies(id);
  return sp ? spareValue(isStoreBuddy(sp), sp.cost) : 0;
}

function pickNextWild() {
  const pool = wildPool();
  const store = pool.filter(isStoreBuddy), secret = pool.filter(function (p) { return !isStoreBuddy(p); });
  let sp;
  for (let tries = 0; tries < 5; tries++) {
    sp = pick(Math.random() < ECON.wild.storeShare ? store : secret);
    if (sp.id !== state.wild.id) break;
  }
  state.wild.id = sp.id;
  bossLevel = clamp(getBuddyLevel(state.activePet) + rnd(-3, 1), 1, MAX_LEVEL);
  state.bossLevel = bossLevel;
  state.bossSwapped = false;
  state.raid = null;
  monsterCurrentHp = getBossMaxHp();
  partyHp = {};
  bossMistakes = 0;
}
// Picks what comes next: a wild buddy, or a boss once enough wild buddies have been beaten.
function pickNextFoe() {
  const w = state.wild;
  if (w.since >= w.next) pickNextBoss();
  else pickNextWild();
}

// After a wild win: roll to catch it. A buddy you already own becomes a spare.
function rollCatch(wildId) {
  const sp = getSpecies(wildId);
  if (!sp) return;
  if (Math.random() >= wildCatchChance(sp)) { state.wild.miss += 1; return; }
  state.wild.miss = 0;
  if (getOwnedIds().indexOf(sp.id) !== -1) {
    state.spares[sp.id] = Math.min(99, (state.spares[sp.id] || 0) + 1);
    toast('🎉 Caught a spare ' + sp.name + '! Sell it in the buddy hub for ' + spareValueOf(sp.id) + ' 💎');
    return;
  }
  grantBuddy(sp.id);
  (isStoreBuddy(sp) ? state.unlockedPets : state.unlockedSecrets).push(sp.id);
  checkEarnedGear();
  enqueueModal(function () { showLootModal(sp, 'wild'); });
}

function spareCount(id) { return state.spares[id] || 0; }
function sellSpare(id) {
  if (spareCount(id) < 1) return;
  const v = spareValueOf(id);
  state.spares[id] -= 1;
  if (!state.spares[id]) delete state.spares[id];
  state.gems += v;
  soundCoinChirp();
  saveState();
  updateStatsUI();
  toast('💰 Sold a spare ' + getSpecies(id).name + ' for ' + v + ' 💎');
  renderHub();
}
function sellAllSpares() {
  let total = 0, n = 0;
  Object.keys(state.spares).forEach(function (id) {
    const c = spareCount(id);
    total += c * spareValueOf(id);
    n += c;
  });
  if (!n) return;
  state.spares = {};
  state.gems += total;
  soundCoinChirp();
  saveState();
  updateStatsUI();
  toast('💰 Sold ' + n + ' spare' + (n === 1 ? '' : 's') + ' for ' + total + ' 💎');
  renderHub();
}
