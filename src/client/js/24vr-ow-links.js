// =====================================================================
//  LINK ROADS (Gold's second ways between places): a few towns are joined by a second road from the east gap of one to the west gap of the other, so the map is a web and
//  not a single chain. Each is a wide, winding road with grass, a pond, a sign, a trainer and finds. A link only opens once you have stood in both towns (it is a shortcut,
//  never a way past a gym). The maps are built here from the towns, after the towns, routes and side games have been laid out.
// =====================================================================
const OW_LINKS = [
  { id: 'link-meadow-grove', name: 'Hillside Road', from: 'meadow', to: 'grove' },
  { id: 'link-tide-coral', name: 'Shore Road', from: 'tide', to: 'coral' },
  { id: 'link-volt-gloom', name: 'Pylon Road', from: 'volt', to: 'gloom' },
  { id: 'link-coral-cross', name: 'Frost Pass', from: 'coral', to: 'cross' },
  { id: 'link-cinder-summit', name: 'Ash Road', from: 'cinder', to: 'summit' }
];
const OW_LINK_W = 26, OW_LINK_H = 13;
// One try at laying a link out; returns the map or null when something could not be placed.
function owBuildLink(def, i, attempt) {
  const W = OW_LINK_W, H = OW_LINK_H, rnd = owRng(def.id, attempt), A = OW_MAPS[def.from], B = OW_MAPS[def.to];
  const land = OW_LANDS.find(function (L) { return L.town === def.from; }), route = OW_MAPS[land.routeIn];
  const g = []; for (let y = 0; y < H; y++) { g.push([]); for (let x = 0; x < W; x++) g[y].push(y < 2 || y > H - 3 || x === 0 || x === W - 1 ? 'T' : ','); }
  // the road: two tiles wide, level at both ends (row 5 and 6) and bending in between
  let ry = 5, x = 1; const spans = [];
  while (x < W - 1) {
    const len = x < 4 || x > W - 6 ? 4 : 3 + Math.floor(rnd() * 4);
    for (let k = 0; k < len && x < W - 1; k++, x++) { g[ry][x] = '.'; g[ry + 1][x] = '.'; }
    spans.push([x - len, x - 1, ry]);
    if (x >= W - 5) { if (ry !== 5) { const to = 5; for (let y = Math.min(ry, to); y <= Math.max(ry, to) + 1; y++) g[y][x - 1] = '.'; ry = 5; } continue; }
    const options = [3, 4, 6, 7, 8].filter(function (v) { return Math.abs(v - ry) >= 2; }), nry = options[Math.floor(rnd() * options.length)];
    for (let y = Math.min(ry, nry); y <= Math.max(ry, nry) + 1; y++) g[y][x - 1] = '.';
    ry = nry;
  }
  g[6][0] = '.'; g[6][W - 1] = '.';
  const road = function (px, py) { return g[py] && g[py][px] === '.'; };
  const nearRoad = function (px, py, r) { for (let yy = py - r; yy <= py + r; yy++) for (let xx = px - r; xx <= px + r; xx++) if (road(xx, yy)) return true; return false; };
  const patch = function (ch, w, h, tries) {
    for (let t = 0; t < tries; t++) {
      const px = 2 + Math.floor(rnd() * (W - 4 - w)), py = 2 + Math.floor(rnd() * (H - 4 - h));
      let ok = true; for (let yy = py - 1; yy <= py + h && ok; yy++) for (let xx = px - 1; xx <= px + w && ok; xx++) if (g[yy][xx] !== ',' && !(g[yy][xx] === 'T' && (yy < py || yy >= py + h || xx < px || xx >= px + w))) ok = false;
      if (ok && !nearRoad(px + Math.floor(w / 2), py + Math.floor(h / 2), 0)) { for (let yy = py; yy < py + h; yy++) for (let xx = px; xx < px + w; xx++) g[yy][xx] = ch; return [px, py]; }
    }
    return null;
  };
  const pond = patch('~', 4, 2, 60); if (!pond) return null;
  for (let k = 0; k < 3; k++) patch('"', 4, 2, 30);
  for (let yy = 2; yy < H - 2; yy++) for (let xx = 1; xx < W - 1; xx++) if (g[yy][xx] === ',' && !nearRoad(xx, yy, 1)) { const r = rnd(); if (r < 0.22) g[yy][xx] = 'T'; else if (r < 0.3) g[yy][xx] = '*'; }
  const walk = function (px, py) { return g[py] && ',"*.dB'.indexOf(g[py][px]) !== -1; };
  // a sign at each end, on the grass beside the road
  const signs = {}; let placed = 0;
  [[2, 4], [W - 3, 4], [2, 8], [W - 3, 8]].forEach(function (p) { if (placed < 2 && g[p[1]][p[0]] !== '~' && !road(p[0], p[1]) && g[p[1] - (p[1] < 6 ? -1 : 1)] && nearRoad(p[0], p[1], 1)) { g[p[1]][p[0]] = 's'; signs[p[0] + ',' + p[1]] = def.name + ': ' + A.name + ' to the west, ' + B.name + ' to the east.'; placed++; } });
  if (placed < 1) return null;
  // trainers three tiles from the road, looking at it along a clear column
  const folk = OW_SIDE_FOLK[(i + 1) % OW_SIDE_FOLK.length], folk2 = OW_SIDE_FOLK[(i + 5) % OW_SIDE_FOLK.length], npcs = [];
  [[folk, 'down'], [folk2, 'up']].forEach(function (f, k) {
    const cands = [];
    spans.forEach(function (sp) { for (let px = sp[0] + 1; px <= sp[1] - 1; px++) { const dir = f[1] === 'down' ? 1 : -1, ty = sp[2] + (f[1] === 'down' ? -3 : 4), ok = g[ty] && g[ty][px] === ',' && g[ty + dir] && ',"*'.indexOf(g[ty + dir][px]) !== -1 && g[ty + 2 * dir] && ',"*'.indexOf(g[ty + 2 * dir][px]) !== -1; if (ok && px > 3 && px < W - 4) cands.push([px, ty]); } });
    if (!cands.length) return;
    const p = cands[Math.floor(rnd() * cands.length)];
    g[p[1]][p[0]] = ','; npcs.push({ id: def.id + '-trainer' + k, kind: 'trainer', name: f[0][0], x: p[0], y: p[1], face: f[1], look: { skin: (i + k) % 6, hair: (i * 3 + k) % 8, outfit: (i + 2 + k) % 8, style: (i + k) % 4 }, lines: [f[0][1]], win: [f[0][2]] });
  });
  if (!npcs.length) return null;
  const free = []; for (let yy = 2; yy < H - 2; yy++) for (let xx = 2; xx < W - 2; xx++) if (g[yy][xx] === ',' && !npcs.some(function (n) { return Math.abs(n.x - xx) + Math.abs(n.y - yy) < 3; })) free.push([xx, yy]);
  const objects = [];
  ['potion', 'net'].forEach(function (k) { if (!free.length) return; const p = free.splice(Math.floor(rnd() * free.length), 1)[0]; objects.push({ id: def.id + '-' + k, type: 'pickup', x: p[0], y: p[1], give: k === 'net' ? 'net' : 'gems' }); });
  const map = {
    id: def.id, name: def.name, region: A.region, start: { x: 1, y: 6 }, palette: route.palette, rows: g.map(function (r) { return r.join(''); }),
    warps: [{ x: 0, y: 6, to: def.from, tx: 14, ty: 6 }, { x: W - 1, y: 6, to: def.to, tx: 1, ty: 6 }],
    npcs: npcs, objects: objects, trees: {}, signs: signs, link: { from: def.from, to: def.to }
  };
  const reach = owReachSet(map);
  const reachable = function (p) { return reach[p.x + ',' + p.y] || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { return reach[(p.x + d[0]) + ',' + (p.y + d[1])]; }); };
  if (!map.objects.every(reachable) || !reach[(W - 2) + ',6']) return null;
  return map;
}
// Opens a town's east (x 15) or west (x 0) edge at row 6 and cuts a way in along row 6 until it meets ground the town's entrance already reaches (trees and water are cut, buildings are not).
function owOpenGap(town, edge) {
  const m = OW_MAPS[town], dx = edge === 0 ? 1 : -1;
  owSetTile(town, edge, 6, '.');
  for (let x = edge + dx; x >= 1 && x <= 14; x += dx) {
    const c = m.rows[6].charAt(x);
    if (',".*_d'.indexOf(c) === -1) { if (c === 'T') owSetTile(town, x, 6, '.'); else if (c === '~') owSetTile(town, x, 6, 'B'); else if (c !== '.' && c !== 'B') return false; }
    if (owReachSet(m)[x + ',6']) return true;
  }
  return false;
}
OW_LINKS.forEach(function (def, i) {
  let map = null; for (let attempt = 0; attempt < 60 && !map; attempt++) map = owBuildLink(def, i, attempt);
  if (!map) return;
  OW_MAPS[def.id] = map;
  // the gaps in the two towns: the east edge of the first (y 6) and the west edge of the second
  if (!owOpenGap(def.from, 15) || !owOpenGap(def.to, 0)) { delete OW_MAPS[def.id]; return; }
  OW_MAPS[def.from].warps.push({ x: 15, y: 6, to: def.id, tx: 1, ty: 6, needs: def.to });
  OW_MAPS[def.to].warps.push({ x: 0, y: 6, to: def.id, tx: OW_LINK_W - 2, ty: 6, needs: def.from });
});
