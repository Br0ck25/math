// =====================================================================
//  WILD BUDDIES: which buddies live in the wild (rollWildSpecies), today's weather, and the spares you can sell. Wild fights are 24x-ow-battle.js.
//  A caught buddy you already own becomes a spare that can be traded to a Trader. Numbers live in ECON.wild / ECON.sell.
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
  return storePets.concat(secretCompanions);
}
function isStoreBuddy(sp) { return storePets.indexOf(sp) !== -1; }

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
// ----- fixed wild tables per route (Gold): a route has its own few kinds with set odds and a level range; the time of day swaps some of them -----
// Day: four common kinds (30, 30, 20, 15%) and a rare one (5%). Morning swaps one common kind for a nature or water buddy, night two for dark or magic ones. The levels run around the route's own level.
const WILD_ODDS = [30, 30, 20, 15, 5];
const OW_WILD_TABLES = {};
function owRouteLevel(mapId) {
  const m = OW_MAPS[mapId], base = m && /-side$/.test(mapId) ? mapId.replace(/-side$/, '') : mapId, i = OW_LANDS.findIndex(function (L) { return L.routeIn === base; });
  if (i < 0) return 0;
  const lv = ECON.map.levels, here = lv[OW_LANDS[i].land], prev = i ? lv[OW_LANDS[i - 1].land] : 0;
  return Math.round((prev + here) / 2) + 2 + (base !== mapId ? 1 : 0);
}
function owWildTable(mapId) {
  if (OW_WILD_TABLES[mapId] !== undefined) return OW_WILD_TABLES[mapId];
  const m = OW_MAPS[mapId], center = owRouteLevel(mapId);
  if (!m || !center || !m.rows.some(function (r) { return r.indexOf('"') !== -1; })) return (OW_WILD_TABLES[mapId] = null);
  const el = regionById(m.region).element, order = function (list, salt) {
    const h = function (id) { let x = 17; const s = salt + id; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) % 100003; return x; };
    return list.slice().sort(function (a, b) { return h(a.id) - h(b.id); });
  };
  const store = wildPool().filter(isStoreBuddy), secret = wildPool().filter(function (p) { return !isStoreBuddy(p); });
  const own = function (list) { const l = list.filter(function (p) { return !el || p.element === el; }); return l.length >= 3 ? l : list; };
  const ofEl = function (list, els, salt) { const l = list.filter(function (p) { return els.indexOf(p.element) !== -1; }); return order(l.length ? l : list, salt); };
  const day = order(own(store), mapId).slice(0, 4).map(function (p) { return p.id; }), rare = order(own(secret), mapId + 'r')[0].id;
  const swap = function (slots, els, salt) { const t = day.slice(); slots.forEach(function (s, k) { const c = ofEl(store, els, mapId + salt)[k]; if (c && t.indexOf(c.id) === -1) t[s] = c.id; }); return t; };
  return (OW_WILD_TABLES[mapId] = { center: center, day: day.concat(rare), morning: swap([2], ['nature', 'water'], 'm').concat(rare), night: swap([1, 2], ['dark', 'magic'], 'n').concat(rare) });
}
// One wild buddy for the grass of this map, from its table: { id, level }, or null when the map has no table of its own.
function owRollRoute(mapId) {
  const t = owWildTable(mapId);
  if (!t) return null;
  const list = t[owTimeOfDay()] || t.day;
  let r = Math.random() * 100, k = 0;
  while (k < WILD_ODDS.length - 1 && r >= WILD_ODDS[k]) { r -= WILD_ODDS[k]; k++; }
  return { id: list[k], level: clamp(t.center + rnd(-1, 1) + (k === WILD_ODDS.length - 1 ? 2 : 0), 2, MAX_LEVEL) };
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

// ----- the roaming legend (Gold's roaming beasts): after you are Champion, one legendary buddy a week roams one route a day -----
// The six legends, then the storybook heroes and the ultra trio, one a week: every buddy can be caught.
function legendRoster() { return legendPets.concat(mythicCompanions, ultraPets); }
function legendOfWeek() { const r = legendRoster(); return r[weekNumber() % r.length]; }
function legendState() {
  const l = state.legend, w = weekNumber();
  if (l.week !== w) { l.week = w; l.caught = false; }
  return l;
}
// The route the legend is on today ('' when it is not roaming: you are not Champion yet, or you caught it this week).
function legendRoute() {
  if (!isChampion() || legendState().caught) return '';
  const routes = OW_LANDS.map(function (l) { return l.routeIn; });
  return routes[dayHash(weekNumber() + dayKey()) % routes.length];
}
