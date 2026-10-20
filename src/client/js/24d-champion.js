// =====================================================================
//  THE CHAMPION'S HALL: after all the gym badges, the Elite Four and then Champion Nova wait (24y-ow-arenas.js). Nova has six buddies, one of each type.
//  The first win makes you Champion and pays the big reward; after that a win pays a little once a day.
// =====================================================================
const CHAMPION_NAME = 'Champion Nova';
const CHAMPION_TEAM = ['phoenix', 'shark', 'lion', 'griffin', 'panther', 'pegasus'];       // fire, water, nature, electric, dark, magic (store buddies, so their ids never change)
function championOpen() { return isChampion() || gymRegions().every(function (r) { return hasBadge(r.id); }); }       // a Champion keeps the Hall when new gyms are added
// The Hall was won: the first win makes you Champion and pays the big reward, later wins pay a little once a day.
function championReward() {
  const ch = state.champ, M = ECON.map.champion, first = ch.wins === 0, pays = ch.day !== dayKey();
  const res = { champion: true, first: first, gems: 0, nets: 0, held: [], extra: 0 };
  if (first) {
    res.gems = M.firstGems; res.nets = M.nets;
    HELD_ITEMS.forEach(function (it) {                     // one of each held item; one you already own pays its shop price instead
      if (state.heldOwned.indexOf(it.id) === -1) { state.heldOwned.push(it.id); res.held.push(it.icon + ' ' + it.name); } else res.extra += ECON.held.cost[it.id];
    });
    state.storySeen.champion = 1;
  } else if (pays) res.gems = M.repeatGems;
  if (pays) ch.day = dayKey();
  ch.wins += 1;
  state.gems += res.gems + res.extra;
  state.nets += res.nets;
  res.wins = ch.wins;
  checkEarnedGear();
  return res;
}
