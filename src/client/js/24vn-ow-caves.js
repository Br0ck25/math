// =====================================================================
//  CAVES (Gold's Union Cave, Dark Cave, Ilex Forest...): every route has a cave mouth in its trees that leads down into a dark cave of two floors. Only a circle around the hero is lit
//  (wider with the Night Lamp, the Gloom Badge's charm). Every step on the cave floor can start a fight, with the route's buddies a level stronger; a Hiker waits on the first floor,
//  and the ladder at the far end leads to the second floor, where two finds lie. The cave floors are grown by random walks from the entrance, so each one is different.
//  Runs after the side paths (24ve) so the mouth is cut into the finished route.
// =====================================================================
function owCaveFloor(rnd, W, H, entrance) {
  const g = []; for (let y = 0; y < H; y++) { g.push([]); for (let x = 0; x < W; x++) g[y].push('#'); }
  const want = Math.floor(W * H * 0.42); let floor = 0, x = entrance[0], y = entrance[1];
  for (let steps = 0; steps < 2000 && floor < want; steps++) {
    if (g[y][x] === '#') { g[y][x] = 'c'; floor++; }
    const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rnd() * 4)];
    x = Math.max(1, Math.min(W - 2, x + d[0])); y = Math.max(1, Math.min(H - 2, y + d[1]));
    if (rnd() < 0.03) { x = entrance[0]; y = entrance[1]; }                                                // now and then start again from the entrance, so the cave branches
  }
  return g;
}
// The floor tiles reachable from `from`, farthest first.
function owCaveFar(g, from) {
  const dist = {}, q = [from], order = []; dist[from[0] + ',' + from[1]] = 0;
  while (q.length) { const c = q.shift(); order.push(c); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { const x = c[0] + d[0], y = c[1] + d[1], k = x + ',' + y; if (g[y] && g[y][x] === 'c' && dist[k] === undefined) { dist[k] = dist[c[0] + ',' + c[1]] + 1; q.push([x, y]); } }); }
  return order.reverse();
}
// Does any trainer on the map look at this tile (a clear row of up to three)? The way out of a cave must not land in someone's sight.
function owSeenByTrainer(R, x, y) {
  return R.npcs.some(function (n) {
    if (n.kind !== 'trainer' && n.kind !== 'boss') return false;
    const d = OW_STEP[n.face], sight = n.sight || 3;
    for (let t = 1; t <= sight; t++) { const cx = n.x + d[0] * t, cy = n.y + d[1] * t; if (cx === x && cy === y) return true; if (!R.rows[cy] || OW_TILES[R.rows[cy].charAt(cx)].solid) return false; }
    return false;
  });
}
function owBuildCave(L, i) {
  const R = OW_MAPS[L.routeIn], rnd = owRng(L.routeIn, 300);
  const at = function (x, y) { return R.rows[y] ? R.rows[y].charAt(x) : ''; };
  const cands = [];
  for (let y = 4; y < R.rows.length - 3; y++) for (let x = 1; x < 13; x++) if (at(x, y) === 'T' && at(x, y - 1) === 'T' && ',."*d'.indexOf(at(x, y + 1)) !== -1 && !owNear(R, x, y + 1, 1) && !owNear(R, x, y, 1) && !owSeenByTrainer(R, x, y + 1)) cands.push([x, y]);
  if (!cands.length) return;
  const mouth = cands[Math.floor(rnd() * cands.length)], W = 14, H = 14, entrance = [7, H - 2];
  const id1 = L.routeIn + '-cave1', id2 = L.routeIn + '-cave2', base = { region: R.region, palette: R.palette, dark: true, room: true };
  // floor 1: from the entrance, the ladder at the farthest tile
  const g1 = owCaveFloor(rnd, W, H, entrance); g1[H - 1][7] = 'm';
  const far1 = owCaveFar(g1, entrance), lad1 = far1[0];
  g1[lad1[1]][lad1[0]] = 'u';
  const near = function (g, list, p) { return list.some(function (q) { return Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) < 2; }); };
  const spots1 = far1.filter(function (p) { return g1[p[1]][p[0]] === 'c' && !near(g1, [entrance, lad1], p); });
  const hiker = spots1[Math.floor(spots1.length / 2)];
  // floor 2: arrives beside its own ladder, which is where the first floor's ladder leads
  const g2 = owCaveFloor(rnd, W, H, entrance), far2 = owCaveFar(g2, entrance), lad2 = far2[far2.length - 1];
  g2[lad2[1]][lad2[0]] = 'u';
  const arrive = function (g, lad) { return [[0, 1], [0, -1], [1, 0], [-1, 0]].map(function (d) { return [lad[0] + d[0], lad[1] + d[1]]; }).find(function (p) { return g[p[1]] && g[p[1]][p[0]] === 'c'; }); };
  const a1 = arrive(g1, lad1), a2 = arrive(g2, lad2);
  if (!a1 || !a2) return;
  const rows = function (g) { return g.map(function (r) { return r.join(''); }); };
  const spots2 = far2.filter(function (p) { return g2[p[1]][p[0]] === 'c' && !near(g2, [lad2, entrance], p); });
  if (spots1.length < 3 || spots2.length < 3) return;
  OW_MAPS[id1] = Object.assign({ id: id1, name: R.name + ' cave', start: { x: entrance[0], y: entrance[1] }, rows: rows(g1),
    warps: [{ x: 7, y: H - 1, to: L.routeIn, tx: mouth[0], ty: mouth[1] + 1 }, { x: lad1[0], y: lad1[1], to: id2, tx: a2[0], ty: a2[1] }],
    npcs: [{ id: id1 + '-hiker', kind: 'trainer', name: 'Hiker ' + ['Rocky', 'Flint', 'Boulder', 'Gravel'][i % 4], x: hiker[0], y: hiker[1], face: 'down', look: { skin: 3, hair: i % 8, outfit: 7, style: 0 }, lines: ['Caves are the best place to train!'], win: ['You found your way in the dark. Well done!'] }],
    objects: [], trees: {}, signs: {} }, base);
  OW_MAPS[id2] = Object.assign({ id: id2, name: R.name + ' cave, below', start: { x: a2[0], y: a2[1] }, rows: rows(g2),
    warps: [{ x: lad2[0], y: lad2[1], to: id1, tx: a1[0], ty: a1[1] }], npcs: [],
    objects: [{ id: id2 + '-gem', type: 'pickup', x: spots2[0][0], y: spots2[0][1], give: i % 2 ? 'gems' : 'net' }, { id: id2 + '-net', type: 'pickup', x: spots2[Math.floor(spots2.length / 2)][0], y: spots2[Math.floor(spots2.length / 2)][1], give: i % 2 ? 'net' : 'gems' }],
    trees: {}, signs: {} }, base);
  owSetTile(L.routeIn, mouth[0], mouth[1], 'O');
  R.warps.push({ x: mouth[0], y: mouth[1], to: id1, tx: entrance[0], ty: entrance[1] });
}
OW_LANDS.forEach(owBuildCave);
