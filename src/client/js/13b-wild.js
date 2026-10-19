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
  let chance = (sp.legend ? ECON.legend.catchChance + ECON.legend.pity * legendState().misses : base) * (opts && opts.shiny ? ECON.daily.catchMult : 1) * (rel === 1 ? ECON.wild.matchup.strong : rel === -1 ? ECON.wild.matchup.weak : 1);
  if (opts && opts.flawless) chance *= ECON.wild.flawless;
  if (activeRole('Trickster')) chance *= 1.25;
  if (activeQuirk('lucky')) chance *= ECON.quirk.catch;
  if (activeHolds('bait')) chance *= (typeof hasTech === 'function' && hasTech('second_heart') ? 1.5 : 1.25);
  const nets = opts && opts.nets ? Math.min(opts.nets, ECON.wild.net.mult.length - 1) : 0;
  if (nets) {
    chance = Math.max(chance, Math.min(chance * ECON.wild.net.mult[nets], ECON.wild.net.max));       // nets never lower a chance
    if (typeof hasTech === 'function' && hasTech('sticky_net')) chance = Math.min(1, chance + 0.05 * nets);
  }
  if (opts && opts.shiny) chance = Math.min(chance, Math.max(ECON.daily.catchMax, base));
  return Math.min(1, chance);
}
function spareValueOf(id) {
  const sp = getSpecies(id);
  const base = sp ? spareValue(isStoreBuddy(sp), sp.cost, sp.legend) : 0;
  return (typeof hasTech === 'function' && hasTech('appraiser')) ? Math.round(base * 1.5) : base;
}

// One random wild species, favouring the land you are in; never one in `skip` (the species that fought last by default).
function rollWildSpecies(skip) {
  const pool = wildPool();
  let store = pool.filter(isStoreBuddy), secret = pool.filter(function (p) { return !isStoreBuddy(p); });
  const region = currentRegion(), roll = Math.random();
  const favour = function (elements) {
    const ofType = function (list) { const l = list.filter(function (p) { return elements.indexOf(p.element) !== -1; }); return l.length ? l : list; };
    store = ofType(store); secret = ofType(secret);
  };
  if (region.element && roll < ECON.map.regionShare) favour([region.element]);                                   // the land you are in: more of its type
  else if (roll >= ECON.map.regionShare && roll < ECON.map.regionShare + ECON.weather.share) favour(weatherToday().favours);   // today's weather
  let sp;
  for (let tries = 0; tries < 5; tries++) {
    sp = pick(Math.random() < ECON.wild.storeShare ? store : secret);
    if (skip.indexOf(sp.id) === -1) break;
  }
  return sp;
}
// How strong your buddies are together: the average level of your ECON.farm.top strongest.
function teamPower() {
  const levels = getOwnedIds().map(getBuddyLevel).sort(function (a, b) { return b - a; }).slice(0, ECON.farm.top);
  return levels.length ? Math.round(levels.reduce(function (a, b) { return a + b; }, 0) / levels.length) : 1;
}
// The level wild foes are built around: your buddy's, but one buddy far ahead of the rest cannot pull it up.
function foeBaseLevel() {
  return Math.min(getBuddyLevel(state.activePet), Math.max(1, Math.round(teamPower() * ECON.farm.lead)));
}
// A plain wild win pays less when the foe is weaker than your buddy (never below ECON.farm.minShare).
function easyShare(foeLevel) {
  return clamp(foeLevel / Math.max(1, getBuddyLevel(state.activePet)), ECON.farm.minShare, 1);
}
// Counts a plain wild win today; after ECON.farm.dailyWins of them wild gems are smaller until tomorrow. Returns the share of gems to pay.
function wildWinShare() {
  const w = state.wildWins;
  if (w.day !== dayKey()) { w.day = dayKey(); w.n = 0; }
  w.n += 1;
  if (w.n === ECON.farm.dailyWins + 1) toast('😴 Your buddies are getting sleepy, so wild gems are smaller for today. Full rewards tomorrow!');
  return w.n > ECON.farm.dailyWins ? ECON.farm.tiredShare : 1;
}
// Teammates who are behind the fighter learn from the fight too.
function shareTeamXp(xp) {
  const lead = getBuddyLevel(state.activePet);
  getTeam().forEach(function (id) {
    if (id !== state.activePet && getBuddyLevel(id) < lead) awardBuddyXp(Math.round(xp * ECON.farm.shareXp), id);
  });
}
function pickNextWild() {
  let sp = rollWildSpecies([state.wild.id]);
  const d = state.daily, today = dayKey();
  if (d.day !== today) { d.day = today; d.fights = 0; d.spawned = false; }
  const dailyAfter = (typeof hasTech === 'function' && hasTech('golden_scent')) ? Math.max(1, ECON.daily.after - 1) : ECON.daily.after;
  if (!d.spawned && d.fights >= dailyAfter && !state.gym) {   // the daily rare
    d.spawned = true;
    sp = getSpecies(dailyRareId());
    state.wild.shiny = true;
    toast('✨ A rare golden buddy appeared! It only comes once a day.');
  } else state.wild.shiny = false;
  startWild(sp);
}
// Makes `sp` the foe: a fresh wild fight at a level near your buddy's.
function startWild(sp) {
  state.wild.legend = false;
  state.wild.id = sp.id;
  state.wild.trainer = '';
  markDexSeen(sp.id);
  if (typeof soundBuddyCry === 'function') soundBuddyCry(sp.id, sp.element);
  bossLevel = clamp(foeBaseLevel() + rnd(-3, 1), 1, MAX_LEVEL);
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

// Animated 3-wobble capture sequence on the battle stage (tick... tick... CLICK!)
let catchAnimTimers = [];
function playCatchAnimation(sp, caught, nets) {
  const ov = document.getElementById('catch-anim-overlay');
  if (!ov || !sp) return;
  if (!document.getElementById('catch-orb')) {
    ov.innerHTML = '<div class="catch-orb" id="catch-orb">🔴</div>' +
      '<div class="catch-ticks"><span class="catch-tick" id="catch-tick-0"></span><span class="catch-tick" id="catch-tick-1"></span><span class="catch-tick" id="catch-tick-2"></span></div>' +
      '<div class="catch-status-text" id="catch-status-text">Tick...</div>';
  }
  const orb = document.getElementById('catch-orb');
  const txt = document.getElementById('catch-status-text');
  catchAnimTimers.forEach(clearTimeout);
  catchAnimTimers = [];
  ov.classList.add('show');
  orb.className = 'catch-orb';
  orb.innerText = nets > 0 ? '🕸️' : '🔴';
  txt.innerText = (nets > 0 ? 'Net ×' + nets + ' — ' : '') + 'Tick...';
  const ticks = [0, 1, 2].map(function (i) { return document.getElementById('catch-tick-' + i); });
  ticks.forEach(function (t) { if (t) t.className = 'catch-tick'; });
  const wobbles = caught ? 3 : rnd(1, 2);
  for (let w = 0; w < wobbles; w++) {
    catchAnimTimers.push(setTimeout(function () {
      if (ticks[w]) ticks[w].classList.add('lit');
      txt.innerText = w === 0 ? 'Tick...' : w === 1 ? 'Tick... tick...' : 'Almost...';
      if (typeof soundCatchWobble === 'function') soundCatchWobble(w + 1);
    }, w * 420 + 80));
  }
  catchAnimTimers.push(setTimeout(function () {
    if (caught) {
      orb.className = 'catch-orb caught';
      orb.innerText = '🌟';
      txt.innerText = 'CLICK! Caught ' + sp.name + '!';
      if (typeof soundCatchSuccess === 'function') soundCatchSuccess();
    } else {
      orb.className = 'catch-orb broke';
      orb.innerText = '💨';
      txt.innerText = 'Poof! ' + sp.name + ' broke free!';
      ticks.forEach(function (t) { if (t) t.className = 'catch-tick fail'; });
    }
  }, wobbles * 420 + 140));
  catchAnimTimers.push(setTimeout(function () {
    ov.classList.remove('show');
  }, wobbles * 420 + 950));
}

// After a wild win: roll to catch it. With Catch Nets in stock the player chooses how many to throw (0-3) first.
// A buddy you already own becomes a spare.
function rollCatch(wildId, flawless) {
  const sp = getSpecies(wildId);
  if (!sp) return;
  if (!state.wild.shiny && !state.wild.legend) state.daily.fights += 1;
  const data = { id: wildId, flawless: !!flawless, shiny: state.wild.shiny };
  if (state.nets > 0) { enqueueModal(function () { showCatchModal(data); }); return; }
  resolveCatch(data, 0);
}
function resolveCatch(data, nets) {
  const sp = getSpecies(data.id);
  nets = Math.max(0, Math.min(nets, state.nets, ECON.wild.net.mult.length - 1));
  const chance = wildCatchChance(sp, { flawless: data.flawless, shiny: data.shiny, nets: nets });
  if (nets) { state.nets -= nets; toast('🕸️ ' + nets + ' Catch Net' + (nets > 1 ? 's' : '') + ' thrown (' + state.nets + ' left)'); }
  const roll = Math.random();
  if (sp.legend && roll >= chance) { playCatchAnimation(sp, false, nets); legendMiss(sp); return; }
  if (roll >= chance) {
    playCatchAnimation(sp, false, nets);
    if (data.shiny) toast('✨ The golden ' + sp.name + ' got away... a new one comes tomorrow!');
    return;
  }
  playCatchAnimation(sp, true, nets);
  const raced = sp.legend ? legendCaught(sp) : false;
  if (data.shiny && !state.shinies[sp.id]) toast('✨ A shiny ' + sp.name + '! It will glow from now on.');
  if (getOwnedIds().indexOf(sp.id) !== -1) {
    if (data.shiny) state.shinies[sp.id] = 1;
    state.spares[sp.id] = Math.min(99, (state.spares[sp.id] || 0) + 1);
    toast('🎉 Caught a spare ' + sp.name + '! Sell it in the buddy hub for ' + spareValueOf(sp.id) + ' 💎');
    if (raced) enqueueRaceStory(sp);
    return;
  }
  grantBuddy(sp.id);
  (isStoreBuddy(sp) ? state.unlockedPets : state.unlockedSecrets).push(sp.id);
  if (data.shiny) state.shinies[sp.id] = 1;
  checkEarnedGear();
  enqueueModal(function () { showLootModal(sp, sp.legend ? 'legend' : 'wild'); });
  if (raced) enqueueRaceStory(sp);
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

// ----- choosing a wild encounter -----
// After a wild win (once you have a badge) the next plain wild fight is offered with ECON.encounter.choices species; the one already picked stays first and is kept if the window is closed.
function encounterOffered() {
  const nb = getBossInfo();
  return !!nb.wild && !nb.trainer && !nb.shiny && !nb.legend && !state.gym && state.badges.length >= ECON.encounter.minBadges;
}
let encounterOptions = [];
function openEncounterChoice() {
  const first = getSpecies(state.wild.id);
  encounterOptions = [first];
  while (encounterOptions.length < ECON.encounter.choices) {
    const sp = rollWildSpecies(encounterOptions.map(function (p) { return p.id; }));
    if (encounterOptions.some(function (p) { return p.id === sp.id; })) break;
    encounterOptions.push(sp);
  }
  const list = document.getElementById('encounter-options');
  list.innerHTML = '';
  encounterOptions.forEach(function (sp) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'move-btn';
    const pct = Math.round(wildCatchChance(sp, {}) * 100), note = sp.element + ' type · about ' + pct + '% to catch';
    b.innerHTML = '<span class="mv-icon">' + sp.icon + '</span><span class="mv-main"><b>' + escHtml(sp.name) + '</b><small>' + escHtml(note) + '</small></span>';
    b.setAttribute('aria-label', 'Meet ' + sp.name + ', ' + note);
    b.onclick = function () { chooseEncounter(sp.id); };
    list.appendChild(b);
  });
  soundClick();
  document.getElementById('encounter-modal').style.display = 'flex';
}
function closeEncounter() {
  document.getElementById('encounter-modal').style.display = 'none';
  modalDone();
}
function chooseEncounter(id) {
  const sp = encounterOptions.find(function (p) { return p.id === id; });
  if (sp && sp.id !== state.wild.id) {
    startWild(sp);
    setBossTaunt();
    updateStatsUI();
    saveState();
    toast('A wild Lv ' + bossLevel + ' ' + sp.name + ' appeared!');
  }
  closeEncounter();
}
