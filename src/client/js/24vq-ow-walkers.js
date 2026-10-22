// =====================================================================
//  TOWNSFOLK WHO MOVE (Gold's NPCs wander): every town gets two villagers who stroll about near where they stand, a step now and then, and talk differently after dark. They only walk on plain ground,
//  never onto a door, a gym door, a find, grass, the hero or each other, and stay within two tiles of home. Runs after the walled gyms (24vp) so the towns are finished.
// =====================================================================
const OW_STROLLERS = [
  ['Villager Jo', 'I love a walk around {t}.', 'The air in {t} is lovely today.', 'Night walks are my favourite. So quiet!'],
  ['Neighbour Sam', 'Have you tried the Mart here? Handy!', 'Buddies love a stroll as much as I do.', 'Shh, the buddies are asleep. Walk softly.'],
  ['Grandpa Wren', 'I have lived in {t} all my life.', 'Back in my day we counted every step.', 'Mind the dark, young one. Stay on the road!'],
  ['Kid Moss', 'I am practising my walking!', 'Race you to the sign! Okay, no I will not.', 'I am not allowed out this late. Do not tell!']
];
function owPlaceStrollers(town, k) {
  const m = OW_MAPS[town], rnd = owRng(town, 700 + k), reach = owReachSet(m), spots = [], landings = [];
  Object.keys(OW_MAPS).forEach(function (id) { OW_MAPS[id].warps.forEach(function (w) { if (w.to === town) landings.push([w.tx, w.ty]); }); });          // where the hero arrives from anywhere
  for (let y = 2; y < m.rows.length - 2; y++) for (let x = 2; x < m.rows[0].length - 2; x++) {
    const c = m.rows[y].charAt(x);
    if ((c === '.' || c === ',') && reach[x + ',' + y] && !owNear(m, x, y, 1) && !landings.some(function (l) { return Math.abs(l[0] - x) <= 1 && Math.abs(l[1] - y) <= 1; }) && !(m.gyms && m.gyms[x + ',' + y]) && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(function (d) { const t = OW_TILES[(m.rows[y + d[1]] || '').charAt(x + d[0])]; return t && !t.solid; })) spots.push([x, y]);
  }
  const out = [];
  for (let n = 0; n < 2 && spots.length; n++) {
    const s = spots.splice(Math.floor(rnd() * spots.length), 1)[0], who = OW_STROLLERS[(k + n * 2) % OW_STROLLERS.length];
    out.push({ id: town + '-walker-' + n, name: who[0], x: s[0], y: s[1], face: 'down', wander: true, home: { x: s[0], y: s[1] }, look: { skin: (k + n * 3) % 6, hair: (k * 3 + n) % 8, outfit: (k + n * 5) % 8, style: (k + n) % 4 },
      lines: [who[1].replace('{t}', m.name), who[2].replace('{t}', m.name)], night: [who[3]] });
    for (let i = spots.length - 1; i >= 0; i--) if (Math.abs(spots[i][0] - s[0]) + Math.abs(spots[i][1] - s[1]) < 5) spots.splice(i, 1);          // the two stand well apart
  }
  m.npcs.push.apply(m.npcs, out);
}
owTowns().forEach(function (t, k) { if (t !== OW_START.map) owPlaceStrollers(t, k); });          // Cozy Hollow, where the walk begins, stays as it is
// A step or two now and then, only while the map is open and quiet.
function owWander() {
  if (window.__noWander || !owOpen() || ab || owBusy || (typeof talkOpen === 'function' && talkOpen())) return;
  const o = state.overworld, m = OW_MAPS[o.map];
  let moved = false;
  (m.npcs || []).forEach(function (n) {
    if (!n.wander || Math.random() > 0.4) return;
    const dir = pick(['up', 'down', 'left', 'right']), d = OW_STEP[dir], nx = n.x + d[0], ny = n.y + d[1];
    n.face = dir; moved = true;
    const t = owTileAt(m, nx, ny);
    if (Math.abs(nx - n.home.x) > 2 || Math.abs(ny - n.home.y) > 2 || !t || t.solid || t.grass || (nx === o.x && ny === o.y) || (owTrail && nx === owTrail.x && ny === owTrail.y) || owNpcAt(m, nx, ny) || owWarpAt(m, nx, ny) || (m.gyms && m.gyms[nx + ',' + ny]) || owPickupAt(m, nx, ny)) return;
    n.x = nx; n.y = ny;
  });
  if (moved) renderOverworld();
}
setInterval(owWander, 1400);
// Lamp posts beside the main street, three to a town, on plain grass that touches a path; a post is only set where it cuts nothing off.
function owPlaceLamps(town, k) {
  const m = OW_MAPS[town], rnd = owRng(town, 900 + k), before = Object.keys(owReachSet(m)).length, landings = [];
  Object.keys(OW_MAPS).forEach(function (id) { OW_MAPS[id].warps.forEach(function (w) { if (w.to === town) landings.push([w.tx, w.ty]); }); });
  const cands = [];
  for (let y = 2; y < m.rows.length - 2; y++) for (let x = 2; x < m.rows[0].length - 2; x++) {
    if (m.rows[y].charAt(x) === ',' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { return m.rows[y + d[1]].charAt(x + d[0]) === '.'; }) && !owNear(m, x, y, 1) && !landings.some(function (l) { return Math.abs(l[0] - x) <= 1 && Math.abs(l[1] - y) <= 1; })) cands.push([x, y]);
  }
  let placed = [], size = before;
  for (let t = 0; t < 60 && placed.length < 3 && cands.length; t++) {
    const c = cands.splice(Math.floor(rnd() * cands.length), 1)[0];
    if (placed.some(function (p) { return Math.abs(p[0] - c[0]) + Math.abs(p[1] - c[1]) < 6; })) continue;
    const row = m.rows[c[1]];
    m.rows[c[1]] = row.slice(0, c[0]) + 'a' + row.slice(c[0] + 1);
    const now = Object.keys(owReachSet(m)).length;
    if (now === size - 1) { placed.push(c); size = now; } else m.rows[c[1]] = row;                      // it would shut something in: put the grass back
  }
}
owTowns().forEach(function (t, k) { if (t !== OW_START.map) owPlaceLamps(t, k); });
