// =====================================================================
//  EARNED GEAR: secret pieces that cannot be bought. Each carries `earn: {key, n, text}` in 04-data-buddies.js
//  and is awarded the moment the matching counter reaches n. To add one, add the data row and (if needed) a counter here.
// =====================================================================
const EARN_COUNTERS = {
  raids: function () { return state.raidsCleared; },
  calendarDay: function () { return state.streakCal.count; },
  bosses: function () { return state.monstersDefeated; },
  champion: function () { return state.champ.wins; },
  cartoons: function () { return ownedCartoons().length; },
  headliners: function () { return ownedCartoons().filter(function (p) { return p.id.indexOf('toon_') === 0; }).length; }
};
// Cartoon-cast buddies (they carry a `show`) that this player owns.
function ownedCartoons() {
  return getOwnedIds().map(getSpecies).filter(function (p) { return p && p.show; });
}
function earnedReady(g) {
  return !!g.earn && EARN_COUNTERS[g.earn.key]() >= g.earn.n;
}
// Awards anything newly earned. Safe to call often (it only acts once per piece); returns how many were awarded.
function checkEarnedGear() {
  let got = 0;
  [[accessoriesList, state.unlockedAccessories], [armorList, state.unlockedArmor]].forEach(function (pair) {
    pair[0].forEach(function (g) {
      if (g.earn && pair[1].indexOf(g.id) === -1 && earnedReady(g)) {
        pair[1].push(g.id);
        got += 1;
        toast('🎁 New gear earned: ' + g.name + '!');
        soundSecretFound();
      }
    });
  });
  if (got) { saveState(); updateStatsUI(); }
  return got;
}
// What a locked piece shows instead of a price.
function gearLockText(g) { return g.earn ? '🏆 ' + g.earn.text : '💎 ' + g.cost; }
