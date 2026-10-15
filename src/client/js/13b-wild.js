// =====================================================================
//  WILD BUDDIES: most battles are against a wild buddy you may catch; a boss comes after every 5-8 of them.
//  A caught buddy you already own becomes a spare that can be sold for gems (see sellSpare). Numbers live in ECON.wild / ECON.sell.
// =====================================================================
// Store buddies (except the Bandit) and secret buddies. Mythic, ultra and boss buddies keep their own special ways of being earned.
function wildPool() {
  return storePets.filter(function (p) { return !p.requiresAllStorePets; }).concat(secretCompanions);
}
function isStoreBuddy(sp) { return storePets.indexOf(sp) !== -1; }
// 1 when your buddy is strong against this one (easier to catch), -1 when weak against it, 0 otherwise.
function catchMatchup(sp) {
  const mine = getActivePetDisplay();
  if (battleElement(mine) === 'shadow') return 0;
  return getTypeRelation(battleElement(mine), sp.element);
}
// The species of today's rare: the same for the whole day.
function dailyRareId() {
  const pool = wildPool(), k = dayKey();
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) % 100003;
  return pool[h % pool.length].id;
}
// opts.flawless: you won without a mistake; opts.shiny: the daily rare; opts.nets: how many Catch Nets are thrown (0-3).
function wildCatchChance(sp, opts) {
  const W = ECON.wild.catchChance;
  const base = !isStoreBuddy(sp) ? W.secret : sp.cost < 150 ? W.cheap : sp.cost < 800 ? W.mid : W.rare;
  const rel = catchMatchup(sp);
  let chance = base * (opts && opts.shiny ? ECON.daily.catchMult : 1) * (rel === 1 ? ECON.wild.matchup.strong : rel === -1 ? ECON.wild.matchup.weak : 1);
  if (opts && opts.flawless) chance *= ECON.wild.flawless;
  if (activeRole('Trickster')) chance *= 1.25;
  if (activeHolds('bait')) chance *= 1.25;
  const nets = opts && opts.nets ? Math.min(opts.nets, ECON.wild.net.mult.length - 1) : 0;
  if (nets) chance = Math.max(chance, Math.min(chance * ECON.wild.net.mult[nets], ECON.wild.net.max));       // nets never lower a chance
  if (opts && opts.shiny) chance = Math.min(chance, Math.max(ECON.daily.catchMax, base));
  return Math.min(1, chance);
}
function spareValueOf(id) {
  const sp = getSpecies(id);
  return sp ? spareValue(isStoreBuddy(sp), sp.cost) : 0;
}

function pickNextWild() {
  const pool = wildPool();
  let store = pool.filter(isStoreBuddy), secret = pool.filter(function (p) { return !isStoreBuddy(p); });
  const region = currentRegion();
  if (region.element && Math.random() < ECON.map.regionShare) {          // the land you are in: more of its type
    const ofType = function (list) { const l = list.filter(function (p) { return p.element === region.element; }); return l.length ? l : list; };
    store = ofType(store); secret = ofType(secret);
  }
  let sp;
  for (let tries = 0; tries < 5; tries++) {
    sp = pick(Math.random() < ECON.wild.storeShare ? store : secret);
    if (sp.id !== state.wild.id) break;
  }
  const d = state.daily, today = dayKey();
  if (d.day !== today) { d.day = today; d.fights = 0; d.spawned = false; }
  if (!d.spawned && d.fights >= ECON.daily.after && !state.gym) {   // the daily rare
    d.spawned = true;
    sp = getSpecies(dailyRareId());
    state.wild.shiny = true;
    toast('✨ A rare golden buddy appeared! It only comes once a day.');
  } else state.wild.shiny = false;
  state.wild.id = sp.id;
  state.wild.trainer = '';
  markDexSeen(sp.id);
  bossLevel = clamp(getBuddyLevel(state.activePet) + rnd(-3, 1), 1, MAX_LEVEL);
  state.bossLevel = bossLevel;
  state.bossSwapped = false;
  state.swapUsed = false;
  resetBattleEffects();
  state.raid = null;
  monsterCurrentHp = getBossMaxHp();
  partyHp = {};
  bossMistakes = 0;
}
// Picks what comes next: a wild buddy, or a boss once enough wild buddies have been beaten.
function pickNextFoe() {
  if (state.gym) { pickGymFoe(); return; }
  const w = state.wild;
  if (w.since >= w.next) pickNextBoss();
  else pickNextWild();
}

// After a wild win: roll to catch it. With Catch Nets in stock the player chooses how many to throw (0-3) first.
// A buddy you already own becomes a spare.
function rollCatch(wildId, flawless) {
  const sp = getSpecies(wildId);
  if (!sp) return;
  if (!state.wild.shiny) state.daily.fights += 1;
  const data = { id: wildId, flawless: !!flawless, shiny: state.wild.shiny };
  if (state.nets > 0) { enqueueModal(function () { showCatchModal(data); }); return; }
  resolveCatch(data, 0);
}
function resolveCatch(data, nets) {
  const sp = getSpecies(data.id);
  nets = Math.max(0, Math.min(nets, state.nets, ECON.wild.net.mult.length - 1));
  const chance = wildCatchChance(sp, { flawless: data.flawless, shiny: data.shiny, nets: nets });
  if (nets) { state.nets -= nets; toast('🕸️ ' + nets + ' Catch Net' + (nets > 1 ? 's' : '') + ' thrown (' + state.nets + ' left)'); }
  if (Math.random() >= chance) { if (data.shiny) toast('✨ The golden ' + sp.name + ' got away... a new one comes tomorrow!'); return; }
  if (data.shiny && !state.shinies[sp.id]) toast('✨ A shiny ' + sp.name + '! It will glow from now on.');
  if (getOwnedIds().indexOf(sp.id) !== -1) {
    if (data.shiny) state.shinies[sp.id] = 1;
    state.spares[sp.id] = Math.min(99, (state.spares[sp.id] || 0) + 1);
    toast('🎉 Caught a spare ' + sp.name + '! Sell it in the buddy hub for ' + spareValueOf(sp.id) + ' 💎');
    return;
  }
  grantBuddy(sp.id);
  (isStoreBuddy(sp) ? state.unlockedPets : state.unlockedSecrets).push(sp.id);
  if (data.shiny) state.shinies[sp.id] = 1;
  checkEarnedGear();
  enqueueModal(function () { showLootModal(sp, 'wild'); });
}

// ----- the catch window: you beat a wild buddy, now choose how many nets to throw -----
let catchData = null;
function showCatchModal(data) {
  catchData = data;
  const sp = getSpecies(data.id), W = ECON.wild.net;
  document.getElementById('catch-icon').innerHTML = sp.icon;
  document.getElementById('catch-title').innerText = 'You beat ' + (data.shiny ? '✨ ' : '') + sp.name + '! Catch it?';
  document.getElementById('catch-note').innerText = 'You have ' + state.nets + ' 🕸️ Catch Net' + (state.nets === 1 ? '' : 's') + '. Throw up to ' + (W.mult.length - 1) + ' for a better chance.' + (data.flawless ? ' No mistakes: bonus chance!' : '');
  const box = document.getElementById('catch-options');
  box.innerHTML = '';
  for (let n = 0; n < W.mult.length; n++) {
    const pct = Math.round(wildCatchChance(sp, { flawless: data.flawless, shiny: data.shiny, nets: n }) * 100);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'move-btn' + (n > state.nets ? ' off' : '');
    b.disabled = n > state.nets;
    b.innerHTML = '<span class="mv-icon">' + (n ? '🕸️' : '🫧') + '</span><span class="mv-main"><b>' + (n ? 'Throw ' + n + ' net' + (n > 1 ? 's' : '') : 'Try without a net') + '</b><small>' + (n > state.nets ? 'You only have ' + state.nets : 'Catch chance ' + pct + '%') + '</small></span><span class="mv-cost">' + pct + '%</span>';
    b.setAttribute('aria-label', (n ? 'Throw ' + n + ' nets' : 'Try without a net') + ', catch chance ' + pct + ' percent');
    b.onclick = function () { chooseNets(n); };
    box.appendChild(b);
  }
  document.getElementById('catch-modal').style.display = 'flex';
}
function chooseNets(n) {
  if (!catchData) return;
  const data = catchData;
  catchData = null;
  document.getElementById('catch-modal').style.display = 'none';
  soundClick();
  resolveCatch(data, n);
  saveState();
  updateStatsUI();
  modalDone();
}
// Closing the window without choosing is a plain try: the catch is never lost by accident.
function closeCatchModal() { chooseNets(0); }

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
