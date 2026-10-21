// =====================================================================
//  SIDE PATHS: like Gold's routes that run left and right, every route has a gap in its east or west edge (they alternate) that leads to a short sideways path
//  with grass, a trainer and two finds. The maps are built here from the route they leave, so a new land gets its side path by being in OW_LANDS.
// =====================================================================
const OW_SIDE_FOLK = [['Hiker Stone', 'This path is quiet. Perfect for a battle!', 'Rock solid win, friend.'], ['Camper Jo', 'I pitched my tent here. Care to test my buddies?', 'You pack a punch!'], ['Birder Wren', 'I watch the wild buddies here. Now watch mine!', 'A fine flight of numbers.'],
  ['Fisher Bay', 'The fish are not biting, so I will battle!', 'You reeled me in.'], ['Ranger Moss', 'I keep this path safe. Show me you can too.', 'The path is in good hands.'], ['Hiker Slate', 'Nobody ever walks this way. Ready?', 'You made my day.'],
  ['Camper Ash', 'Warm fires and good fights!', 'What a spark!'], ['Scout Dale', 'I am scouting new trainers. Is it you?', 'Scouting report: excellent.']];
function owReachSet(m) {
  const seen = {}, q = [[m.start.x, m.start.y]]; seen[m.start.x + ',' + m.start.y] = 1;
  while (q.length) { const c = q.pop(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { const x = c[0] + d[0], y = c[1] + d[1], k = x + ',' + y; if (!seen[k] && m.rows[y] && OW_TILES[m.rows[y].charAt(x)] && !OW_TILES[m.rows[y].charAt(x)].solid && !(m.npcs || []).some(function (n) { return n.x === x && n.y === y; })) { seen[k] = 1; q.push([x, y]); } }); }
  return seen;
}
function owSideBuild(L, i) {
  const route = OW_MAPS[L.routeIn], east = i % 2 === 0, id = L.routeIn + '-side', ok = function (c) { return ',".*'.indexOf(c) !== -1; };
  const edge = east ? 13 : 0, inner = east ? 12 : 1, inner2 = east ? 11 : 2;
  const busy = function (x, y) { return (route.npcs || []).some(function (n) { return n.x === x && n.y === y; }) || (route.objects || []).some(function (o) { return o.x === x && o.y === y; }) || Object.keys(route.signs || {}).indexOf(x + ',' + y) !== -1 || Object.keys(route.trees || {}).indexOf(x + ',' + y) !== -1; };
  let y = -1;
  const reach = route.blocks ? owReachSet(route) : null;                                                // a block route has to be walked to the gap, not just dug into
  for (let d = 0; d < 12 && y < 0; d++) [10 + d, 10 - d].forEach(function (c) { if (y < 0 && c > 2 && c < route.rows.length - 3 && (!reach || reach[inner2 + ',' + c]) && (route.blocks ? ok(route.rows[c].charAt(inner2)) && ok(route.rows[c].charAt(east ? 10 : 3)) : ok(route.rows[c].charAt(inner)) && ok(route.rows[c].charAt(inner2))) && !busy(inner, c) && !busy(inner2, c) && route.rows[c].charAt(edge) === 'T') y = c; });
  if (y < 0) return;
  owSetTile(L.routeIn, edge, y, '.');
  if (route.blocks) owSetTile(L.routeIn, inner, y, '.');                                                // the thick border of a block route is two trees deep
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

// ----- forced grass (Gold): on some stretches the whole road is tall grass, so there is no way past without walking through it -----
// Each route gets a band of two or three rows across its width; Repel is the way to cross it in peace.
function owGrassBand(mapId, y0, y1) {
  if (OW_MAPS[mapId].blocks) return;
  const m = OW_MAPS[mapId];
  for (let y = y0; y <= y1; y++) for (let x = 1; x <= 12; x++) if (',.*'.indexOf(m.rows[y].charAt(x)) !== -1) owSetTile(mapId, x, y, '"');
}
OW_LANDS.forEach(function (L, i) { owGrassBand(L.routeIn, 7 + (i * 5) % 9, 8 + (i * 5) % 9 + (i % 2)); });

// ----- winding roads (Gold): tree walls across the route with the gap on alternating sides, so the way north runs up, left, up, right, through the grass -----
// A row is only walled when nothing stands on it (people, finds, signs, trees, doors), so every gap stays reachable.
function owWindRoute(mapId, i) {
  if (OW_MAPS[mapId].blocks) return [];                                                                  // a route laid out from blocks (24vb) already winds
  const m = OW_MAPS[mapId], n = m.rows.length, keys = Object.keys(m.signs || {}).concat(Object.keys(m.trees || {}));
  const busy = function (x, y) {
    return m.warps.some(function (w) { return Math.abs(w.x - x) <= 1 && Math.abs(w.y - y) <= 1; }) || (m.npcs || []).concat(m.objects || []).some(function (p) { return p.x === x && p.y === y; }) || keys.indexOf(x + ',' + y) !== -1;
  };
  let side = i % 2;
  const walls = [];
  for (let y = 4; y < n - 4; y += 3) {
    if (/[^,."*T_]/.test(m.rows[y].slice(1, 13)) || Math.abs(y - m.start.y) < 3 || (m.npcs || []).some(function (p) { return Math.abs(p.y - y) <= 1; })) continue;
    for (let x = 1; x <= 12; x++) if ((side ? x < 10 : x > 3) && ',.*"'.indexOf(m.rows[y].charAt(x)) !== -1 && !busy(x, y)) owSetTile(mapId, x, y, 'T');
    for (let x = 1; x <= 12; x++) if ((side ? x >= 10 : x <= 3) && ',.*'.indexOf(m.rows[y].charAt(x)) !== -1 && !busy(x, y)) owSetTile(mapId, x, y, 'd');      // the gap is bare dirt
    walls.push({ y: y, side: side }); side = 1 - side;
  }
  return walls;
}
// A pond cut into one wall (on the side that is blocked): a one-tile bridge from the north shore leads to a dirt islet with a swimmer and a find, so the far side of the water holds a person.
function owLake(mapId, i, walls) {
  if (OW_MAPS[mapId].blocks) return;
  const m = OW_MAPS[mapId], busy = function (x, y) { return m.warps.some(function (w) { return Math.abs(w.x - x) <= 1 && Math.abs(w.y - y) <= 1; }) || (m.npcs || []).concat(m.objects || []).some(function (p) { return p.x === x && p.y === y; }) || Object.keys(m.signs || {}).concat(Object.keys(m.trees || {})).indexOf(x + ',' + y) !== -1; };
  for (let k = 0; k < walls.length; k++) {
    const w = walls[k], west = w.side === 1, x0 = west ? 1 : 8, cx = west ? 3 : 10, ok = [];
    let fits = w.y >= 3 && w.y + 2 < m.rows.length - 3;      // the lake stops a row short of the next wall, whose gap is on this side
    for (let y = w.y - 1; fits && y <= w.y + 1; y++) for (let x = x0; x < x0 + 5; x++) if (',".*T'.indexOf(m.rows[y].charAt(x)) === -1 || busy(x, y)) fits = false;
    if (!fits || ',"*.d'.indexOf(m.rows[w.y - 2].charAt(cx)) === -1 || busy(cx, w.y - 2)) continue;
    for (let y = w.y - 1; y <= w.y + 1; y++) for (let x = x0; x < x0 + 5; x++) owSetTile(mapId, x, y, '~');
    owSetTile(mapId, cx, w.y - 1, 'B'); owSetTile(mapId, cx, w.y, 'd');      // the find lies on the bridge, so it never sits behind the swimmer
    const folk = OW_SIDE_FOLK[(i + 3) % OW_SIDE_FOLK.length];
    m.npcs.push({ id: mapId + '-swimmer', kind: 'trainer', name: 'Swimmer ' + folk[0].split(' ')[1], x: cx, y: w.y, face: 'down', look: { skin: (i + 2) % 6, hair: (i * 5) % 8, outfit: (i + 5) % 8, style: (i + 1) % 4 }, lines: ['Nobody swims out here! Care for a battle?'], win: ['The water is lovely. So was that fight!'] });
    m.objects = (m.objects || []).concat([{ id: mapId + '-islet', type: 'pickup', x: cx, y: w.y - 1, give: i % 2 ? 'net' : 'gems' }]);
    return;
  }
}
OW_LANDS.forEach(function (L, i) { owLake(L.routeIn, i, owWindRoute(L.routeIn, i)); });

// ----- ledges and thick borders (Gold): a row of ledge on one side of the road that you can only hop down over, and a second row of trees along both edges -----
// Only plain grass is changed, and never near a door, a person, a sign or a find, so every route stays as open as before (the middle of the road is never touched).
function owLandscape(mapId, i) {
  if (OW_MAPS[mapId].blocks) return;
  const m = OW_MAPS[mapId], n = m.rows.length, keys = Object.keys(m.signs || {}).concat(Object.keys(m.trees || {}));
  const near = function (x, y, r) { return m.warps.some(function (w) { return Math.abs(w.x - x) <= r && Math.abs(w.y - y) <= r; }) || (m.npcs || []).concat(m.objects || []).some(function (p) { return Math.abs(p.x - x) <= r && Math.abs(p.y - y) <= r; }) || keys.some(function (k) { const p = k.split(',').map(Number); return Math.abs(p[0] - x) <= r && Math.abs(p[1] - y) <= r; }); };
  const plain = function (x, y) { return m.rows[y].charAt(x) === ',' && !near(x, y, 1); };
  for (let y = 2; y < n - 2; y++) [1, 12].forEach(function (x) { if (plain(x, y) && !near(x, y, 2)) owSetTile(mapId, x, y, 'T'); });
  const sides = i % 2 ? [8, 1] : [1, 8];                                                                  // the ledge prefers the side opposite the last one
  const free = function (x, y) { return m.rows[y].charAt(x) === ',' && !near(x, y, 0); };
  for (let y = n - 4; y > 3; y--) for (let s = 0; s < 2; s++) {
    let ok = true; for (let x = sides[s]; x < sides[s] + 4; x++) if (!free(x, y) || ',"*d'.indexOf(m.rows[y - 1].charAt(x)) === -1 || ',"*d'.indexOf(m.rows[y + 1].charAt(x)) === -1) ok = false;
    if (ok) { for (let x = sides[s]; x < sides[s] + 4; x++) owSetTile(mapId, x, y, 'v'); return; }
  }
}

// ----- stamps (our version of Gold's blocks): big grass fields, a house with a door and a room, and Cut-tree shortcuts through the tree walls -----
function owNear(m, x, y, r) {
  const keys = Object.keys(m.signs || {}).concat(Object.keys(m.trees || {}));
  return m.warps.some(function (w) { return Math.abs(w.x - x) <= r && Math.abs(w.y - y) <= r; }) || (m.npcs || []).concat(m.objects || []).some(function (p) { return Math.abs(p.x - x) <= r && Math.abs(p.y - y) <= r; }) || keys.some(function (k) { const p = k.split(',').map(Number); return Math.abs(p[0] - x) <= r && Math.abs(p[1] - y) <= r; });
}
// The first rectangle (scanning from the top) of plain grass that nothing stands on (or within `margin` tiles of).
function owFindSpot(m, w, h, from, margin, allow) {
  for (let y = from; y + h < m.rows.length - 2; y++) for (let x = 1; x + w <= 13; x++) {
    let ok = true;
    for (let yy = y; ok && yy < y + h; yy++) for (let xx = x; ok && xx < x + w; xx++) if (yy < 1 || yy >= m.rows.length - 1 || xx < 1 || xx > 12 || (allow || ',').indexOf(m.rows[yy].charAt(xx)) === -1 || owNear(m, xx, yy, margin)) ok = false;
    if (ok) return { x: x, y: y };
  }
  return null;
}
const OW_HOUSE_FOLK = [['Berry Grower Pat', 'I grow berries behind the house. Nobody ever stops by!'], ['Old Lady Mae', 'Come in, come in. The kettle is on.'], ['Hiker Tom', 'I rest here between climbs. Take a break!'], ['Kid Dot', 'This is my grandma\'s house. She is out walking.']];
function owRouteHouse(mapId, i) {
  const m = OW_MAPS[mapId], spot = m.blocks ? m.house : owFindSpot(m, 3, 3, 3 + (i * 3) % 7, 0), id = mapId + '-house';
  if (!spot) return;
  const x = spot.x, y = spot.y, folk = OW_HOUSE_FOLK[i % OW_HOUSE_FOLK.length];
  [[0, 'R'], [1, 'R'], [2, 'R']].forEach(function (p) { owSetTile(mapId, x + p[0], y, p[1]); });
  owSetTile(mapId, x, y + 1, 'W'); owSetTile(mapId, x + 1, y + 1, 'D'); owSetTile(mapId, x + 2, y + 1, 'W');
  m.warps.push({ x: x + 1, y: y + 1, to: id, tx: 3, ty: 5 });
  OW_MAPS[id] = Object.assign(owRoom(id, m.name + ' house', { to: mapId, tx: x + 1, ty: y + 2 }, [{ id: id + '-folk', name: folk[0], x: 4, y: 2, face: 'down', look: { skin: (i + 1) % 6, hair: (i * 2) % 8, outfit: (i + 4) % 8, style: i % 4 }, lines: [folk[1]] }],
    [{ id: id + '-gift', type: 'pickup', x: 1, y: 4, give: i % 2 ? 'gems' : 'net' }]), { region: m.region, palette: m.palette });
}
function owGrassFields(mapId, i) {
  if (OW_MAPS[mapId].blocks) return;
  const m = OW_MAPS[mapId];
  [[6, 4], [5, 3], [5, 3], [4, 3]].forEach(function (sz) {
    const spot = owFindSpot(m, sz[0], sz[1], 1, 0, ',*');
    if (spot) for (let y = spot.y; y < spot.y + sz[1]; y++) for (let x = spot.x; x < spot.x + sz[0]; x++) owSetTile(mapId, x, y, '"');
  });
}
// A tree in the middle of a tree wall that the Trim charm clears: a second, shorter way through (the zigzag stays open without it).
function owCutShortcuts(mapId) {
  if (OW_MAPS[mapId].blocks) return;
  const m = OW_MAPS[mapId]; let made = 0;
  for (let y = 3; y < m.rows.length - 3 && made < 2; y++) {
    const r = m.rows[y];
    if (r.charAt(6) !== 'T' || r.charAt(7) !== 'T' || ',."*d'.indexOf(m.rows[y - 1].charAt(6)) === -1 || ',."*d'.indexOf(m.rows[y + 1].charAt(6)) === -1 || owNear(m, 6, y, 1)) continue;
    owSetTile(mapId, 6, y, 'g'); made++; y += 4;
  }
}
OW_LANDS.forEach(function (L, i) { owRouteHouse(L.routeIn, i); owGrassFields(L.routeIn, i); });
OW_LANDS.forEach(function (L, i) { owLandscape(L.routeIn, i); owCutShortcuts(L.routeIn); });
