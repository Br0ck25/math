// =====================================================================
//  WALKABLE GYMS (Gold's gyms): every gym has an inside to walk through: its trainers wait along the way, and the gym leader stands at the far end. Three layouts take turns:
//    switch  - one math switch (a stone sign with questions) lowers the barrier in front of the leader;
//    double  - two switches, one beside each trainer, and both must be thrown;
//    lanes   - no barrier, three trainers in a row of lanes.
//  The gym door in town offers "Enter the gym" and walks the hero in (owEnterGym); the leader's fight is the gym's last round (abStartGym(id, true)), which gives the badge.
//  The trainers pay as any trainer does and stay beaten. A Champion's rematch is still the whole chain from the door. Runs after the seas (24vo).
// =====================================================================
const OW_GYM_STYLES = ['switch', 'double', 'lanes'];
function owGymRows(style) {
  const g = []; for (let y = 0; y < 16; y++) { g.push([]); for (let x = 0; x < 14; x++) g[y].push(y === 0 || y === 15 || x === 0 || x === 13 ? 'w' : 'o'); }
  g[15][6] = 'm';
  g[1][1] = 'P'; g[1][12] = 'P';
  if (style !== 'lanes') { for (let x = 1; x < 13; x++) g[5][x] = 'w'; g[5][6] = 'X'; }
  return g;
}
function owBuildGym(r, i) {
  const town = OW_MAPS[r.id], pos = town && Object.keys(town.gyms || {}).find(function (p) { return town.gyms[p] === r.id; });
  if (!pos) return;
  const dx = +pos.split(',')[0], dy = +pos.split(',')[1], id = r.id + '-gym', style = OW_GYM_STYLES[i % 3], g = owGymRows(style), teams = GYM_TEAMS[r.id];
  const npcs = [], signs = {}, doors = {}, trainer = function (k, x, y, face) {
    const name = gymTrainer(r.id, k), nid = id + '-t' + k, rival = name === RIVAL;
    OW_TEAMS[nid] = teams[k % teams.length].map(function (b) { return [b[0], b[1]]; });
    npcs.push({ id: nid, kind: 'trainer', name: name, x: x, y: y, face: face, sight: 4, look: rival ? OW_RILEY_LOOK : { skin: (i + k) % 6, hair: (i * 3 + k) % 8, outfit: (i + k * 2) % 8, style: (i + k) % 4 },
      lines: [name === RIVAL ? 'You made it this far! Let us see who is quicker.' : 'The gym leader is at the end. You will have to get past me!'], win: ['Good battle! Go on, the way is open.'] });
    return nid;
  };
  const sign = function (x, y, sid, after, text) { g[y][x] = 's'; signs[x + ',' + y] = { id: id + '-' + sid, text: text, quiz: true, rounds: 3, story: id + '-' + sid, after: after, locked: 'A trainer is standing guard over this switch. Beat them first!' }; OW_STORY.push(id + '-' + sid); return id + '-' + sid; };
  if (style === 'switch') {
    const a = trainer(0, 2, 9, 'right'); trainer(1, 10, 11, 'left');
    doors['6,5'] = [sign(11, 13, 'switch', a, 'A stone switch with numbers carved in it. Answer three questions in a row and the barrier lowers.')];
  } else if (style === 'double') {
    const a = trainer(0, 2, 9, 'right'), b = trainer(1, 10, 11, 'left');
    doors['6,5'] = [sign(2, 13, 'switch-a', a, 'The left switch. Answer three questions in a row to throw it.'), sign(11, 13, 'switch-b', b, 'The right switch. Answer three questions in a row to throw it.')];
    trainer(2, 10, 7, 'left');
  } else { trainer(0, 2, 11, 'right'); trainer(1, 10, 8, 'left'); trainer(2, 2, 6, 'right'); }
  npcs.push({ id: id + '-leader', kind: 'gymleader', gym: r.id, name: 'Leader of ' + r.name, x: 6, y: 3, face: 'down', look: { skin: (i * 5) % 6, hair: (i * 7) % 8, outfit: (i * 3) % 8, style: i % 4 },
    lines: ['Welcome to my gym! You found your way through. Show me what you and your buddies can do!'], win: ['You have the badge. Well fought!'] });
  OW_MAPS[id] = { id: id, name: r.name + ' Gym', region: r.id, palette: town.palette, room: true, start: { x: 6, y: 14 }, rows: g.map(function (row) { return row.join(''); }),
    warps: [{ x: 6, y: 15, to: r.id, tx: dx, ty: dy + 1 }], npcs: npcs, signs: signs, objects: [], trees: {}, doors: doors };
  town.warps.push({ x: dx, y: dy, to: id, tx: 6, ty: 14, gate: true });
}
allGymRegions().forEach(function (r, i) { if (r.id !== 'champion') owBuildGym(r, i); });
OW_SERVICES.gymleader = function (npc) {
  const id = npc.gym, art = heroSprite(heroLookColors(npc.look), 'down', 0);
  if (hasBadge(id)) { openTalk({ name: npc.name, art: art, lines: npc.win }); return; }
  openTalk({ name: npc.name, art: art, lines: npc.lines, choices: [{ label: 'Battle!', run: function () { closeTalk(); abStartGym(id, true); } }] });
};
