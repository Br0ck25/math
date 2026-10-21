// =====================================================================
//  TOWN BLOCKS: every town used to be one plan. Now each is laid out from buildings and land stamps: the main road runs up the middle, a cross street at rows 5-6, and the Buddy
//  Center, Mart, house and gym take four of six slots (top, middle and bottom row, left and right of the road), each with a lane of path from its door to the road. The two
//  slots left over get a pond, garden, grove, plaza, orchard, paddock or boulder field. The town's people, signs and finds are then stood on the new land, and a wood with the nook is cut in.
//  The edge columns at rows 4-8 are kept as they were: the side games (24vf and later) and the hideout doors cut their gaps there.
//  A town that cannot be laid out in a few tries keeps its hand-written rows. Runs after the route blocks (24vb) and before the side games.
// =====================================================================
const OW_TOWN_SLOTS = { TL: [2, 2], TR: [10, 2], ML: [2, 7], MR: [10, 7], BL: [2, 11], BR: [10, 11], XL: [2, 15], XR: [10, 15] };      // the left column of the slot and the top row of the roof
function owBuildTown(L, i, attempt) {
  const m = OW_MAPS[L.town], rnd = owRng(L.town, 100 + attempt), old = m.rows, W = 16, H = L.town === 'meadow' ? 16 : [16, 18, 20][i % 3];                  // towns differ in height: the first stays small, the others are 16, 18 or 20 tall
  const g = []; for (let y = 0; y < H; y++) { g.push([]); for (let x = 0; x < W; x++) g[y].push(','); }
  for (let x = 0; x < W; x++) { g[0][x] = old[0].charAt(x); g[H - 1][x] = old[old.length - 1].charAt(x); }
  for (let y = 1; y < H - 1; y++) [0, 1, 14, 15].forEach(function (x) { g[y][x] = y >= 4 && y <= 8 ? old[y].charAt(x) : 'T'; });
  for (let y = 1; y < H - 1; y++) { g[y][7] = '.'; g[y][8] = '.'; }
  for (let x = 2; x <= 13; x++) { g[5][x] = '.'; g[6][x] = '.'; }
  const slotNames = ['TL', 'TR', 'ML', 'MR', 'BL', 'BR'].concat(H === 20 ? ['XL', 'XR'] : []), extra = H === 18 ? ['XL', 'XR'] : [];
  const names = slotNames.sort(function () { return rnd() - 0.5; });
  const roles = [['center', 4], ['mart', 4], ['house', 3], ['gym', 3]], doors = {}, used = {};
  const mark = function (x, y) { used[x + ',' + y] = 1; }, ents = {}, entNear = function (x, y) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (ents[(x + dx) + ',' + (y + dy)]) return true; return false; }, usedNear = function (x, y) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (used[(x + dx) + ',' + (y + dy)]) return true; return false; };
  roles.forEach(function (r, k) {
    const slot = names[k], sx = OW_TOWN_SLOTS[slot][0], sy = OW_TOWN_SLOTS[slot][1], w = r[1], left = slot.charAt(1) === 'L';
    const x0 = left ? sx + (w === 3 ? Math.floor(rnd() * 2) : 0) : sx + (w === 3 ? Math.floor(rnd() * 2) : 0), d = w === 4 ? 2 : 1;
    for (let y = 0; y < 2; y++) for (let x = 0; x < w; x++) g[sy + y][x0 + x] = 'R';
    for (let x = 0; x < w; x++) g[sy + 2][x0 + x] = 'W';
    g[sy + 2][x0 + d] = r[0] === 'gym' ? 'G' : 'D';
    if (r[0] === 'center') g[sy + 2][x0 + 1] = 'N'; else if (r[0] === 'mart') g[sy + 2][x0 + 1] = 'K';
    const front = sy + 3, dx = x0 + d, target = dx < 7 ? 7 : 8, step = target > dx ? 1 : -1;
    for (let x = dx; x !== target; x += step) { if (g[front][x] === ',' || g[front][x] === '.') g[front][x] = '.'; else return; }
    doors[r[0]] = { x: dx, y: sy + 2, slot: slot };
  });
  if (Object.keys(doors).length < 4) return null;
  const at = function (x, y) { return g[y] ? g[y][x] : ''; }, solid = function (c) { const t = OW_TILES[c]; return !t || !!t.solid; };
  const plain = function (x, y) { return at(x, y) === ',' && !used[x + ',' + y]; };
  const rect = function (x, y, w, h) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (!plain(xx, yy)) return false; return true; };
  const spots = function (w, h, x0, y0, x1, y1) { const out = []; for (let y = y0; y + h <= y1 + 1; y++) for (let x = x0; x + w <= x1 + 1; x++) if (rect(x, y, w, h)) out.push([x, y]); return out; };
  const take = function (list) { return list.length ? list[Math.floor(rnd() * list.length)] : null; };
  // the nook: a thick wood with a gate in it and the finds behind
  const gateChar = L.charm ? (old.join('').match(/[ghjklqz]/) || ['g'])[0] : (i % 2 ? 'y' : 'n'), nookObjs = (m.objects || []).filter(function (o) { return /nook/.test(o.id); }), objs = (m.objects || []).map(function (o) { return Object.assign({}, o); });
  let nook = null;
  if (nookObjs.length) {
    const c = []; for (let y = 8; y < 14; y++) for (let x = 3; x < 13; x++) if (x !== 7 && x !== 8 && rect(x - 1, y - 4, 3, 4) && (at(x, y) === ',' || at(x, y) === '.') && Math.abs(x - 7.5) > 2) c.push([x, y]);
    nook = take(c); if (!nook) return null;
    for (let yy = nook[1] - 4; yy < nook[1]; yy++) for (let xx = nook[0] - 1; xx <= nook[0] + 1; xx++) { g[yy][xx] = 'T'; mark(xx, yy); }
    g[nook[1] - 1][nook[0]] = gateChar; g[nook[1] - 2][nook[0]] = ','; g[nook[1] - 3][nook[0]] = ','; mark(nook[0], nook[1] - 1); mark(nook[0], nook[1] - 2); mark(nook[0], nook[1] - 3); ents[nook[0] + ',' + nook[1]] = 1;      // nobody stands where the nook is entered
    objs.filter(function (o) { return /nook/.test(o.id); }).forEach(function (o, k) { o.x = nook[0]; o.y = nook[1] - 2 - k; });
  }
  // land stamps in the two slots no building took
  const STAMPS = {
    pond: [4, 3, function (x, y) { return x === 0 || x === 3 || y === 0 || y === 2 ? '_' : '~'; }],
    garden: [3, 3, function (x, y) { return y === 0 ? 'b' : (x + y) % 2 ? '*' : ','; }],
    grove: [3, 3, function (x, y) { return y < 2 || x === 1 ? 'T' : '*'; }],
    plaza: [3, 3, function (x, y) { return (x === 0 || x === 2) && (y === 0 || y === 2) ? '*' : 'd'; }],
    orchard: [3, 3, function (x, y) { return (x + y) % 2 ? ',' : 'T'; }],
    paddock: [4, 3, function (x, y) { return (x === 0 || x === 3 || y === 0 || y === 2) && !(y === 2 && x === 1) ? '=' : ','; }],
    boulders: [3, 3, function (x, y) { return (x + y) % 3 === 0 ? '#' : '*'; }]
  };
  const pool = Object.keys(STAMPS), free = names.slice(4).concat(extra);
  let water = null;
  free.forEach(function (slot, k) {
    const sx = OW_TOWN_SLOTS[slot][0], sy = OW_TOWN_SLOTS[slot][1], pick = k === 0 && (/tide|coral/.test(L.land) || m.npcs.some(function (n) { return /fisher/.test(n.id); })) ? 'pond' : pool[Math.floor(rnd() * pool.length)], st = STAMPS[pick];
    let sw = st, s = take(spots(st[0], st[1], sx, sy, sx + 4, sy + 3));
    if (!s) { sw = STAMPS.plaza; s = take(spots(3, 3, sx, sy, sx + 4, sy + 3)); }
    if (!s) return;
    for (let y = 0; y < sw[1]; y++) for (let x = 0; x < sw[0]; x++) { g[s[1] + y][s[0] + x] = sw[2](x, y); mark(s[0] + x, s[1] + y); if (sw[2](x, y) === '~') water = [s[0] + x, s[1] + y]; }
  });
  if (!water && (/tide|coral/.test(L.land) || m.npcs.some(function (n) { return /fisher/.test(n.id); }))) return null;      // a harbour town and the fisher's town must have water
  // people, signs and finds: on plain ground near the road, never on a lane row or beside another
  const lanes = { 5: 1, 6: 1, 10: 1, 14: 1, 18: 1 };
  const cells = []; for (let y = 1; y < H - 1; y++) for (let x = 2; x < W - 2; x++) if (plain(x, y) && !lanes[y] && x !== 7 && x !== 8) cells.push([x, y]);
  const place = function (score, pred) {
    const ok = cells.filter(function (c) { return plain(c[0], c[1]) && !entNear(c[0], c[1]) && (!pred || pred(c)); });
    if (!ok.length) return null;
    let best = null, bs = Infinity; ok.forEach(function (c) { const s = score(c) + rnd() * 0.5; if (s < bs) { bs = s; best = c; } });
    mark(best[0], best[1]); ents[best[0] + ',' + best[1]] = 1; return best;
  };
  const station = function (c) { return Math.abs(Math.abs(c[0] - 7.5) - 2.5) + Math.abs(c[1] - 12) * 0.6; };
  const npcs = m.npcs.map(function (n) { return Object.assign({}, n); });
  for (let k = 0; k < npcs.length; k++) {
    const n = npcs[k]; let c;
    if (n.id === L.town + '-fisher' && water) c = place(function (cc) { return Math.abs(cc[0] - water[0]) + Math.abs(cc[1] - water[1]); });
    else if (n.kind === 'trainer') c = place(station, function (cc) { const s = cc[0] < 7 ? 1 : -1, d = (cc[0] < 7 ? 7 : 8) - cc[0] > 0 ? 7 - cc[0] : cc[0] - 8; if (d > 4) return false; for (let t = 1; t <= d; t++) if (solid(at(cc[0] + s * t, cc[1]))) return false; return true; });      // a trainer looks at the road along a clear row
    else c = place(station);
    if (!c) return null; n.x = c[0]; n.y = c[1]; n.face = c[0] < 7 ? 'right' : 'left';
  }
  const signs = {}, signKeys = Object.keys(m.signs || {});
  for (let k = 0; k < signKeys.length; k++) { const c = place(station); if (!c) return null; signs[c[0] + ',' + c[1]] = m.signs[signKeys[k]]; g[c[1]][c[0]] = 's'; }
  for (let k = 0; k < objs.length; k++) { if (/nook/.test(objs[k].id)) continue; const c = place(function () { return rnd(); }); if (!c) return null; objs[k].x = c[0]; objs[k].y = c[1]; }
  for (let y = 1; y < H - 1; y++) for (let x = 2; x < W - 2; x++) if (plain(x, y) && !lanes[y] && x !== 7 && x !== 8 && !entNear(x, y) && rnd() < 0.12) g[y][x] = '*';
  // everything must be reachable on foot from the start, as before
  const flood = function (gateOpen) {
    const seen = {}, q = [[7, H - 3]]; seen[7 + ',' + (H - 3)] = 1;
    const walk = function (x, y) { return x >= 0 && x < W && y >= 0 && y < H && (!solid(at(x, y)) || (gateOpen && at(x, y) === gateChar)) && !npcs.some(function (n) { return n.x === x && n.y === y; }); };
    while (q.length) { const c = q.pop(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { const x = c[0] + d[0], y = c[1] + d[1]; if (!seen[x + ',' + y] && walk(x, y)) { seen[x + ',' + y] = 1; q.push([x, y]); } }); }
    return seen;
  };
  const seen = flood(false), open = flood(true);
  const reach = function (x, y) { return seen[x + ',' + y] || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { return seen[(x + d[0]) + ',' + (y + d[1])]; }); };
  const edge = [[1, 5], [1, 6], [14, 7], [14, 6]].filter(function (p) { return !solid(old[p[1]].charAt(p[0])); });
  if (!Object.keys(doors).every(function (k) { return reach(doors[k].x, doors[k].y); }) || !edge.every(function (p) { return reach(p[0], p[1]); }) || !npcs.every(function (n) { return reach(n.x, n.y); }) || !objs.every(function (o) { return /nook/.test(o.id) ? open[o.x + ',' + o.y] : seen[o.x + ',' + o.y]; }) || Object.keys(signs).some(function (k) { const p = k.split(',').map(Number); return !reach(p[0], p[1]); })) return null;
  return { rows: g.map(function (r) { return r.join(''); }), doors: doors, npcs: npcs, objects: objs, signs: signs };
}
function owDressTown(L, i) {
  const m = OW_MAPS[L.town]; let r = null;
  for (let attempt = 0; attempt < 60 && !r; attempt++) r = owBuildTown(L, i, attempt);
  if (!r) return;
  const H = r.rows.length;
  m.start = { x: 7, y: H - 3 };
  m.warps.forEach(function (w) { if (w.y === 15 && OW_MAPS[w.to] && w.x >= 7 && w.x <= 8) w.y = H - 1; });                                  // the way back down moves with the bottom edge
  OW_MAPS[L.routeIn].warps.forEach(function (w) { if (w.to === L.town && w.y === 0) w.ty = H - 2; });
  m.rows = r.rows; m.npcs = r.npcs; m.objects = r.objects; m.signs = r.signs; m.blocks = true;
  const rooms = { center: L.center, mart: L.mart, house: L.house };
  m.warps = m.warps.filter(function (w) { return [L.center, L.mart, L.house].indexOf(w.to) === -1; });
  Object.keys(rooms).forEach(function (k) {
    const d = r.doors[k]; m.warps.push({ x: d.x, y: d.y, to: rooms[k], tx: OW_MAPS[rooms[k]].warps[0].x, ty: OW_MAPS[rooms[k]].warps[0].y - 1 });
    const back = OW_MAPS[rooms[k]].warps[0]; back.tx = d.x; back.ty = d.y + 1;
  });
  m.gyms = {}; m.gyms[r.doors.gym.x + ',' + r.doors.gym.y] = L.land;
}
OW_LANDS.forEach(owDressTown);
