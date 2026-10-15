// =====================================================================
//  THE LEGEND HUNT: after becoming Champion, one legendary buddy a week can be hunted once a day.
//  The legend of the week is the same for everyone (a different type each week, in the order of `legendPets`). The hunt is a tough wild fight;
//  a win always pays gems, and the catch chance grows with every miss that week (ECON.legend). Hunting is started from the Map.
//  Riley, the rival, hunts the same legend and catches it on a set day of the week: beat Riley to it for a bonus. Losing the race costs nothing.
// =====================================================================
// Which day of the week it is (0 = Monday), and the day Riley catches this week's legend (never random: it only depends on the week).
function weekDay(d) { return 6 - (weekDaysLeft(d) - 1); }
function rileyDay() { const R = ECON.legend.riley; return R.firstDay + ((weekNumber() * 3 + 1) % (R.lastDay - R.firstDay + 1)); }
function rileyLeft() { return rileyDay() - weekDay(); }                      // days until Riley catches it; 0 or less: Riley already has
const RIVAL_LEGEND = [
  { track: 'Riley is on the trail of {n} too!', done: 'Riley already caught {n}, but you can still hunt it!', won: 'Riley arrives, out of breath: "You got {n} first! Wow, you are fast!"', lost: 'Riley grins: "I got to {n} first this time! You caught it too, so we are both legends!"' },
  { track: 'Riley is tracking {n} across the kingdom.', done: 'Riley found {n} already. Your turn!', won: 'Riley laughs: "You beat me to {n}! Next week I will be faster!"', lost: 'Riley waves: "I caught {n} earlier, but I am glad you did too!"' },
  { track: 'Riley says: "I will catch {n} before you do!"', done: 'Riley has {n} now. Show it what you can do!', won: 'Riley cheers: "{n} chose you! I am so proud to race you!"', lost: 'Riley high-fives you: "We both have {n}. Same team!"' }
];
function rivalLine(kind, sp) { return RIVAL_LEGEND[weekNumber() % RIVAL_LEGEND.length][kind].replace(/\{n\}/g, sp.name); }
// You caught this week's legend. The first catch of the week settles the race with Riley. Returns true when the race story should show.
function legendCaught(sp) {
  const l = legendState();
  if (l.caught) return false;
  l.caught = true;
  l.race = rileyLeft() > 0 ? 'won' : 'lost';
  if (l.race === 'won') { l.wins += 1; grantGems(ECON.legend.raceGems, '🏁 You beat Riley to ' + sp.name + '! +' + ECON.legend.raceGems + ' 💎', true); }
  return true;
}
function enqueueRaceStory(sp) {
  const l = legendState(), won = l.race === 'won';
  enqueueModal(function () {
    showStoryModal({ chapter: 'Legend Race', title: won ? '🏁 You beat Riley!' : '🧢 Riley got there first', panels: [{ icon: '🧢', text: rivalLine(won ? 'won' : 'lost', sp) }, { icon: won ? '💎' : '🤝', text: won ? 'Race bonus: +' + ECON.legend.raceGems + ' gems!' : 'No harm done. Win the next race to earn the bonus!' }], note: 'Races won against Riley: ' + l.wins, btn: 'Hooray!', cleared: won });
  });
}
function legendOfWeek() { return legendPets[weekNumber() % legendPets.length]; }
// This week's progress; a new week starts fresh.
function legendState() {
  const l = state.legend, w = weekNumber();
  if (l.week !== w) { l.week = w; l.day = ''; l.caught = false; l.misses = 0; l.race = ''; }
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
    showStoryModal({ chapter: 'Legend Hunt', title: sp.icon + ' ' + sp.name + ' appears!', panels: [
      { icon: sp.icon, text: sp.lore },
      { icon: '⚔️', text: sp.name + ' is much tougher than a wild buddy. Win and it may join you!' },
      { icon: '🧢', text: rivalLine(rileyLeft() > 0 ? 'track' : 'done', sp) + (rileyLeft() > 0 ? ' It catches it in ' + rileyLeft() + ' day' + (rileyLeft() === 1 ? '' : 's') + '. Be first for a bonus!' : '') },
      { icon: '🍀', text: 'Each miss makes the next catch easier. Catch Nets help too!' }], note: 'One hunt a day. A new legend arrives every Monday.', btn: '⚔️ To battle!' });
  });
}
function legendRowHtml() {
  const sp = legendOfWeek(), why = legendBlocker(), l = legendState();
  const owned = getOwnedIds().indexOf(sp.id) !== -1;
  const chance = Math.round(Math.min(1, ECON.legend.catchChance + ECON.legend.pity * l.misses) * 100);
  const race = !isChampion() ? '' : l.caught ? (l.race === 'won' ? ' 🏁 You beat Riley!' : ' 🧢 Riley got there first.') : rileyLeft() > 0 ? ' 🧢 Race Riley: ' + rileyLeft() + ' day' + (rileyLeft() === 1 ? '' : 's') + ' left for +' + ECON.legend.raceGems + ' 💎' : ' 🧢 Riley already caught it.';
  const desc = isChampion() ? (why || 'Catch chance about ' + chance + '% before bonuses' + (owned ? ' · you own it: a spare sells for ' + ECON.sell.legend + ' 💎' : '')) + race : why;
  return '<div class="care-row map-row legend-row' + (isChampion() ? '' : ' locked') + '"><div><div class="t">🌟 Legend of the week: ' + sp.icon + ' ' + escHtml(sp.name) + ' <span class="element-pill elem-' + sp.element + '">' + sp.element + '</span></div><div class="d">' + escHtml(desc) + '</div></div>' +
    '<div class="map-actions">' + (isChampion() ? '<button class="claim-btn" ' + (why ? 'disabled' : '') + ' onclick="startLegendHunt()">🌟 Hunt</button>' : '<span class="map-badge">🔒</span>') + '</div></div>';
}
