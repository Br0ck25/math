// =====================================================================
//  WILD BUDDIES: which buddies live in the wild (rollWildSpecies), today's weather, and the spares you can sell. Wild fights are 24x-ow-battle.js.
//  A caught buddy you already own becomes a spare that can be sold for gems (see sellSpare). Numbers live in ECON.wild / ECON.sell.
// =====================================================================
// Today's weather: the same for everyone all day. It only favours some types of wild buddies; it never makes anything harder.
// buddies: store buddies that only show up in this weather (and show up more often in it).
const WEATHER = [
  { id: 'sunny',  name: 'Sunny',  favours: ['fire', 'nature'], text: 'more fire and nature buddies', buddies: ['lion', 'phoenix', 'raptor'] },
  { id: 'rainy',  name: 'Rainy',  favours: ['water'],          text: 'more water buddies',           buddies: ['toon_peppa', 'octopus', 'turtle'] },
  { id: 'stormy', name: 'Stormy', favours: ['electric'],       text: 'more electric buddies',        buddies: ['griffin', 'zephyr', 'rhino'] }
];
// The weather a buddy is bound to, or '' when it appears in any.
function weatherOfBuddy(id) {
  const w = WEATHER.find(function (x) { return x.buddies.indexOf(id) !== -1; });
  return w ? w.id : '';
}
function weatherToday() { return WEATHER[dayHash(dayKey() + 'weather') % WEATHER.length]; }
// Store buddies (except the Bandit) and secret buddies. Mythic, ultra and boss buddies keep their own special ways of being earned.
// Which kinds of wild buddy come out when (Gold's wild buddies change with the time of day).
const TIME_FAVOURS = { morning: ['nature', 'water'], night: ['dark', 'magic'] };
function wildPool() {
  return storePets.filter(function (p) { return !p.requiresAllStorePets; }).concat(secretCompanions);
}
function isStoreBuddy(sp) { return storePets.indexOf(sp) !== -1; }
function spareValueOf(id) {
  const sp = getSpecies(id);
  const base = sp ? spareValue(isStoreBuddy(sp), sp.cost, sp.legend) : 0;
  return (typeof hasTech === 'function' && hasTech('appraiser')) ? Math.round(base * 1.5) : base;
}

// One random wild species, favouring the land you are in; never one in `skip` (the species that fought last by default).
function rollWildSpecies(skip) {
  const pool = wildPool();
  const today = weatherToday();
  let store = pool.filter(function (p) { return isStoreBuddy(p) && (!weatherOfBuddy(p.id) || weatherOfBuddy(p.id) === today.id); }), secret = pool.filter(function (p) { return !isStoreBuddy(p); });
  const region = currentRegion(), roll = Math.random();
  const favour = function (elements) {
    const ofType = function (list) { const l = list.filter(function (p) { return elements.indexOf(p.element) !== -1; }); return l.length ? l : list; };
    store = ofType(store); secret = ofType(secret);
  };
  const weatherPick = function (w) {                           // its types, and its own buddies when any are left
    favour(w.favours);
    const own = store.filter(function (p) { return w.buddies.indexOf(p.id) !== -1; });
    if (own.length) store = own;
  };
  if (region.element && roll < ECON.map.regionShare) favour([region.element]);                                   // the land you are in: more of its type
  else if (roll >= ECON.map.regionShare && roll < ECON.map.regionShare + ECON.weather.share) weatherPick(today);   // today's weather
  else if (TIME_FAVOURS[owTimeOfDay()] && Math.random() < 0.3) favour(TIME_FAVOURS[owTimeOfDay()]);               // the time of day: dark and magic buddies come out at night, nature and water ones in the morning
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
// The level that opens lands and Alpha hunts: your best buddy's, but one buddy far ahead of the rest cannot carry the journey alone.
function journeyLevel() {
  return Math.min(getBestLevel(), Math.max(1, Math.round(teamPower() * ECON.farm.lead)));
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
