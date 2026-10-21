// =====================================================================
//  THE BATTLE TOWER (Gold Crystal's): seven trainers in a row, three buddies each, as strong as your lead. Your buddies' HP and PP are put back when the run ends, win or lose, and a blackout costs nothing here.
//  A full run pays a PP Up once a day, and each trainer pays its usual prize money. state.tower = { day, best }.
// =====================================================================
const TOWER_TRAINERS = ['Ace Ivo', 'Ace Dara', 'Ace Moxie', 'Ace Rune', 'Ace Pike', 'Ace Lark', 'Tower Tycoon Orion'];
// `long`: the Marathon, Gold's streak past seven: a second seven, four levels stronger.
function abTowerRounds(long) {
  const lvl = clamp(getBuddyLevel(state.activePet), 20, MAX_LEVEL), one = function (more, tag) {
    return TOWER_TRAINERS.map(function (name, i) { return { kind: i === 6 ? 'leader' : 'trainer', base: i === 6 ? ECON.money.leaderBase : ECON.money.trainerBase, name: name + tag, foes: abTeamOf('', 3, clamp(lvl + more + (i === 6 ? 2 : 0), 2, MAX_LEVEL)) }; });
  };
  return long ? one(0, '').concat(one(4, ' II')) : one(0, '');
}
function abStartTower(long) {
  if (ab || state.gym) return;
  const snap = { hp: JSON.parse(JSON.stringify(state.advHp)), pp: JSON.parse(JSON.stringify(state.advPp)) };
  if (!abStart({ rounds: abTowerRounds(long), tower: snap, onWin: function () { abTowerWon(long); } })) return;
}
function abTowerWon(long) {
  const t = state.tower, key = long ? 'longDay' : 'day', first = t[key] !== dayKey();
  t.best = long ? 14 : Math.max(t.best, 7); if (first) { t[key] = dayKey(); const it = long ? 'maxrevive' : 'ppup'; state.items[it] = Math.min(99, (state.items[it] || 0) + 1); }
  saveState();
  openTalk({ name: 'Battle Tower', art: worldSprite('t-gym-door'), lines: [long ? 'Fourteen wins in a row! The Tower Tycoon is speechless.' : 'Seven wins in a row! The Tower Tycoon bows.', first ? 'Your prize for today: ' + (long ? 'a Max Revive!' : 'a PP Up!') : 'You already took today\'s prize, but the prize money was yours.'] });
}
OW_SERVICES.tower = function (npc) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0), t = state.tower;
  openTalk({ name: npc.name, art: art, lines: ['Welcome to the Battle Tower! Seven trainers, three buddies each, all as strong as your lead.', 'Your buddies get their HP and PP back when you leave. ' + (t.best ? 'Your best streak: ' + t.best + '.' : 'Care to try?')],
    choices: [{ label: 'Enter the Tower', run: function () { closeTalk(); abStartTower(false); } }, { label: 'Marathon (14 trainers)', run: function () { closeTalk(); abStartTower(true); } }] });
};
owAddNpc('summit-house', { id: 'summit-tower', kind: 'tower', name: 'Tower Clerk Vale', x: 2, y: 2, face: 'down', look: { skin: 4, hair: 3, outfit: 4, style: 3 }, lines: ['The Battle Tower.'] });
