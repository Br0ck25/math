// =====================================================================
//  EARNED GEAR: secret pieces that cannot be bought. Each carries `earn: {key, n, text}` in 04-data-buddies.js
//  and is awarded the moment the matching counter reaches n. To add one, add the data row and (if needed) a counter here.
// =====================================================================
const EARN_COUNTERS = {
  raids: function () { return state.raidsCleared; },
  cups: function () { return state.tour.wins; },
  calendarDay: function () { return state.streakCal.count; },
  bosses: function () { return state.monstersDefeated; }
};
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
