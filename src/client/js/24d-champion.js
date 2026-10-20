// =====================================================================
//  THE CHAMPION'S HALL: after all the gym badges, the Elite Four and then Champion Nova wait (24y-ow-arenas.js). Nova has six buddies, one of each type.
//  The first win makes you Champion and pays the big reward; after that a win pays a little once a day.
// =====================================================================
const CHAMPION_NAME = 'Champion Nova';
const CHAMPION_TEAM = ['phoenix', 'shark', 'lion', 'griffin', 'panther', 'pegasus'];       // fire, water, nature, electric, dark, magic (store buddies, so their ids never change)
const MASTER_NAME = 'Master Ori';
const MASTER_TEAM = ['legend_fire', 'legend_water', 'legend_nature', 'legend_electric', 'legend_dark', 'legend_magic'];       // the six legends, one of each type
function championOpen() { return isChampion() || gymRegions().every(function (r) { return hasBadge(r.id); }); }       // a Champion keeps the Hall when new gyms are added
// The Hall was won: the first win makes you Champion. The money was paid fight by fight (abPrize).
function championReward() {
  const ch = state.champ, first = ch.wins === 0;
  if (first) state.storySeen.champion = 1;
  ch.wins += 1;
  return { champion: true, first: first, wins: ch.wins };
}
