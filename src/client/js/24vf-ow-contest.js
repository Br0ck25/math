// =====================================================================
//  THE CATCHING CONTEST (Gold's Bug-Catching Contest): on Tuesdays, Thursdays and Saturdays the Sunny Park next to Meadow Town holds a contest.
//  You get ECON.contest.balls Park Balls; every wild buddy in the park's grass can be fought and thrown at, and the best one is judged by its level, how much HP it has left and how rare it is.
//  A contest buddy is not kept. state.contest = { day, balls, best, done }.
// =====================================================================
function contestDay() { return ECON.contest.days.indexOf(new Date().getDay()) !== -1; }
function contestActive() { const c = state.contest; return !!c && c.day === dayKey() && !c.done; }
// Level and how healthy it is count most, a rare kind adds a bonus.
function contestScore(foe) {
  const sp = getSpecies(foe.id), rare = !isStoreBuddy(sp) ? 60 : sp.cost >= 800 ? 40 : sp.cost >= 150 ? 20 : 0;
  return foe.level * 10 + Math.round(foe.hp / foe.max * 100) / 2 + rare;
}
function contestRank(score) { return score >= ECON.contest.ranks[0] ? 1 : score >= ECON.contest.ranks[1] ? 2 : score >= ECON.contest.ranks[2] ? 3 : 4; }
const CONTEST_PRIZES = { 1: 'stone', 2: 'ultranet', 3: 'greatnet', 4: 'potion' };
function contestPrize(rank) {
  const k = CONTEST_PRIZES[rank];
  if (k === 'potion') state.potions = Math.min(99, state.potions + 1); else state.items[k] = Math.min(99, (state.items[k] || 0) + 1);
  return ITEM_LOOKS[k === 'potion' ? 'potion' : k][1];
}
OW_SERVICES.judge = function (npc) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0), c = state.contest;
  if (contestActive() && (c.balls === 0 || c.best)) {                                                  // the judging
    const best = c.best, go = function () {
      closeTalk();
      if (!best) { c.done = true; saveState(); openTalk({ name: npc.name, art: art, lines: ['You did not bring a buddy to judge. Better luck next time!'] }); return; }
      const rank = contestRank(best.score), prize = contestPrize(rank); c.done = true; saveState();
      openTalk({ name: npc.name, art: art, lines: ['The winner is... ' + (rank === 1 ? 'YOU! First place with ' + best.name + '!' : rank === 2 ? 'second place goes to you, with ' + best.name + '.' : rank === 3 ? 'third place goes to you, with ' + best.name + '.' : 'you did not place, but ' + best.name + ' was a good catch.'), 'Your prize: ' + prize + '. Thank you for joining!'] });
    };
    openTalk({ name: npc.name, art: art, lines: [c.balls === 0 ? 'You are out of Park Balls. Shall I judge your catch?' : 'Done early? I can judge your best catch now.'], choices: [{ label: 'Judge it', run: go }] });
    return;
  }
  if (contestActive()) { openTalk({ name: npc.name, art: art, lines: ['The contest is on! You have ' + c.balls + ' Park Balls left. Walk in the tall grass and catch something strong.'] }); return; }
  if (state.contest && state.contest.day === dayKey()) { openTalk({ name: npc.name, art: art, lines: ['You already joined today. Come back on the next contest day!'] }); return; }
  if (!contestDay()) { openTalk({ name: npc.name, art: art, lines: ['The Catching Contest is held on Tuesdays, Thursdays and Saturdays. Come back then!'] }); return; }
  openTalk({ name: npc.name, art: art, lines: ['Welcome to the Catching Contest! You get ' + ECON.contest.balls + ' Park Balls. Catch the best buddy you can: level, health and rarity count.', 'The buddies you catch here go home afterwards. Ready?'],
    choices: [{ label: 'Join the contest', run: function () { closeTalk(); state.contest = { day: dayKey(), balls: ECON.contest.balls, best: null, done: false }; saveState(); toast('The contest begins! ' + ECON.contest.balls + ' Park Balls.'); } }] });
};
// The park and the way to it: a gap in the west edge of Meadow Town.
OW_MAPS['meadow-park'] = {
  id: 'meadow-park', name: 'Sunny Park', region: 'meadow', start: { x: 14, y: 5 }, palette: OW_MAPS.route1.palette,
  rows: (function () {
    const g = [], tree = [[6, 2], [6, 7]];
    for (let y = 0; y < 11; y++) { let r = ''; for (let x = 0; x < 16; x++) r += y === 0 || y === 10 || x === 0 ? 'T' : x === 15 ? (y === 5 ? '.' : 'T') : y === 5 && x >= 9 ? '.' : x >= 10 ? ',' : tree.some(function (t) { return t[0] === x && t[1] === y; }) ? 'T' : '"'; g.push(r); }
    return g;
  })(),
  warps: [{ x: 15, y: 5, to: 'meadow', tx: 1, ty: 6 }],
  npcs: [{ id: 'park-judge', kind: 'judge', name: 'Judge Hazel', x: 13, y: 3, face: 'down', look: { skin: 2, hair: 2, outfit: 6, style: 1 }, lines: ['The Catching Contest!'] }],
  objects: [{ id: 'park-potion', type: 'pickup', x: 1, y: 9, give: 'gems' }],
  trees: {}, signs: {}
};
owSetTile('meadow', 0, 6, '.');
OW_MAPS.meadow.warps.push({ x: 0, y: 6, to: 'meadow-park', tx: 14, ty: 5 });
