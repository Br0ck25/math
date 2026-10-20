// =====================================================================
//  SIDE PATHS: like Gold's routes that run left and right, every route has a gap in its east or west edge (they alternate) that leads to a short sideways path
//  with grass, a trainer and two finds. The maps are built here from the route they leave, so a new land gets its side path by being in OW_LANDS.
// =====================================================================
const OW_SIDE_FOLK = [['Hiker Stone', 'This path is quiet. Perfect for a battle!', 'Rock solid win, friend.'], ['Camper Jo', 'I pitched my tent here. Care to test my buddies?', 'You pack a punch!'], ['Birder Wren', 'I watch the wild buddies here. Now watch mine!', 'A fine flight of numbers.'],
  ['Fisher Bay', 'The fish are not biting, so I will battle!', 'You reeled me in.'], ['Ranger Moss', 'I keep this path safe. Show me you can too.', 'The path is in good hands.'], ['Hiker Slate', 'Nobody ever walks this way. Ready?', 'You made my day.'],
  ['Camper Ash', 'Warm fires and good fights!', 'What a spark!'], ['Scout Dale', 'I am scouting new trainers. Is it you?', 'Scouting report: excellent.']];
function owSideBuild(L, i) {
  const route = OW_MAPS[L.routeIn], east = i % 2 === 0, id = L.routeIn + '-side', ok = function (c) { return ',".*'.indexOf(c) !== -1; };
  const edge = east ? 13 : 0, inner = east ? 12 : 1, inner2 = east ? 11 : 2;
  const busy = function (x, y) { return (route.npcs || []).some(function (n) { return n.x === x && n.y === y; }) || (route.objects || []).some(function (o) { return o.x === x && o.y === y; }) || Object.keys(route.signs || {}).indexOf(x + ',' + y) !== -1 || Object.keys(route.trees || {}).indexOf(x + ',' + y) !== -1; };
  let y = -1;
  for (let d = 0; d < 12 && y < 0; d++) [10 + d, 10 - d].forEach(function (c) { if (y < 0 && c > 2 && c < route.rows.length - 3 && ok(route.rows[c].charAt(inner)) && ok(route.rows[c].charAt(inner2)) && !busy(inner, c) && !busy(inner2, c) && route.rows[c].charAt(edge) === 'T') y = c; });
  if (y < 0) return;
  owSetTile(L.routeIn, edge, y, '.');
  const mx = function (x) { return east ? x : 15 - x; }, folk = OW_SIDE_FOLK[i % OW_SIDE_FOLK.length];
  const rows = [], put = function (g, pts, ch) { pts.forEach(function (p) { g[p[1]][p[0]] = ch; }); }, g = [];
  for (let r = 0; r < 11; r++) { g.push([]); for (let c = 0; c < 16; c++) g[r].push(r === 0 || r === 10 || c === 0 || c === 15 ? 'T' : ','); }
  const rect = function (x0, y0, x1, y1) { const p = []; for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) p.push([mx(c), r]); return p; };
  put(g, rect(1, 5, 14, 5), '.'); put(g, [[mx(0), 5]], '.');
  put(g, rect(3, 1, 6, 3), '"'); put(g, rect(8, 7, 12, 9), '"'); put(g, rect(3, 7, 5, 9), '"'); put(g, [[mx(9), 2], [mx(14), 3], [mx(14), 7]], 'T'); put(g, [[mx(13), 1], [mx(14), 1]], '*');
  g.forEach(function (r) { rows.push(r.join('')); });
  OW_MAPS[id] = {
    id: id, name: route.name + ' side path', region: route.region, start: { x: mx(1), y: 5 }, palette: route.palette, rows: rows,
    warps: [{ x: mx(0), y: 5, to: L.routeIn, tx: inner, ty: y }],
    npcs: [{ id: id + '-folk', kind: 'trainer', name: folk[0], x: mx(10), y: 3, face: 'down', look: { skin: i % 6, hair: (i * 3) % 8, outfit: (i + 2) % 8, style: i % 4 }, lines: [folk[1]], win: [folk[2]] }],
    objects: [{ id: id + '-potion', type: 'pickup', x: mx(13), y: 2, give: 'gems' }, { id: id + '-net', type: 'pickup', x: mx(13), y: 8, give: 'net' }],
    trees: {}, signs: {}
  };
  route.warps.push({ x: edge, y: y, to: id, tx: mx(1), ty: 5 });
}
OW_LANDS.forEach(owSideBuild);
