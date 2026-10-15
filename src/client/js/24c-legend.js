// =====================================================================
//  THE LEGEND HUNT: after becoming Champion, one legendary buddy a week can be hunted once a day.
//  The legend of the week is the same for everyone (a different type each week, in the order of `legendPets`). The hunt is a tough wild fight;
//  a win always pays gems, and the catch chance grows with every miss that week (ECON.legend). Hunting is started from the Map.
// =====================================================================
function legendOfWeek() { return legendPets[weekNumber() % legendPets.length]; }
// This week's progress; a new week starts fresh.
function legendState() {
  const l = state.legend, w = weekNumber();
  if (l.week !== w) { l.week = w; l.day = ''; l.caught = false; l.misses = 0; }
  return l;
}
// Why the hunt cannot start now (a sentence), or '' when it can.
function legendBlocker() {
  const l = legendState(), sp = legendOfWeek();
  if (!isChampion()) return 'Become Champion to hunt legends.';
  if (state.wild.legend) return 'The hunt is on! Win the fight to try to catch ' + sp.name + '.';
  if (l.caught) return sp.name + ' joined you this week! A new legend comes in ' + weekDaysLeft() + ' day' + (weekDaysLeft() === 1 ? '' : 's') + '.';
  if (l.day === dayKey()) return 'You hunted today. Come back tomorrow!';
  if (state.gym) return 'Finish or leave the gym first.';
  return '';
}
function legendMiss(sp) {
  const l = legendState();
  l.misses = Math.min(20, l.misses + 1);
  toast('🌟 ' + sp.name + ' slipped away... It will test you again tomorrow, and your chance is higher next time!');
}
function startLegendHunt() {
  const why = legendBlocker();
  if (why) { soundWrong(); toast(why); return; }
  const sp = legendOfWeek();
  legendState().day = dayKey();
  state.wild.id = sp.id;
  state.wild.trainer = '';
  state.wild.shiny = false;
  state.wild.legend = true;
  markDexSeen(sp.id);
  bossLevel = clamp(getBuddyLevel(state.activePet) + ECON.legend.levels, 1, MAX_LEVEL);
  gymFoeReset();                                     // the same reset a gym foe gets: HP, swap, effects, mistakes
  closeMap();
  setBossTaunt();
  updateStatsUI();
  saveState();
  enqueueModal(function () {
    showStoryModal({ chapter: 'Legend Hunt', title: '🌟 ' + sp.icon + ' ' + sp.name + ' appears!', panels: [
      { icon: sp.icon, text: sp.lore },
      { icon: '⚔️', text: sp.name + ' is much tougher than a wild buddy. Win and it may join you!' },
      { icon: '🍀', text: 'Each miss makes the next catch easier. Catch Nets help too!' }], note: 'One hunt a day. A new legend arrives every Monday.', btn: '⚔️ To battle!' });
  });
}
function legendRowHtml() {
  const sp = legendOfWeek(), why = legendBlocker(), l = legendState();
  const owned = getOwnedIds().indexOf(sp.id) !== -1;
  const chance = Math.round(Math.min(1, ECON.legend.catchChance + ECON.legend.pity * l.misses) * 100);
  const desc = isChampion() ? (why || 'Catch chance about ' + chance + '% before bonuses' + (owned ? ' · you own it: a spare sells for ' + ECON.sell.legend + ' 💎' : '')) : why;
  return '<div class="care-row map-row legend-row' + (isChampion() ? '' : ' locked') + '"><div><div class="t">🌟 Legend of the week: ' + sp.icon + ' ' + escHtml(sp.name) + ' <span class="element-pill elem-' + sp.element + '">' + sp.element + '</span></div><div class="d">' + escHtml(desc) + '</div></div>' +
    '<div class="map-actions">' + (isChampion() ? '<button class="claim-btn" ' + (why ? 'disabled' : '') + ' onclick="startLegendHunt()">🌟 Hunt</button>' : '<span class="map-badge">🔒</span>') + '</div></div>';
}
