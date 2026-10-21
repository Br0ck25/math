// =====================================================================
//  BLOCKS (Gold's way of building land): every route is a 7 x 12 grid of 2 x 2 blocks (grass, tall grass, trees, road, flowers, water, ledge) laid out from a road plan,
//  so the road winds (up, left, up, right), tall-grass fields have clear edges, trees stand in thick walls and a Trim-charm lane runs straight through a bend.
//  The people, finds, shake tree and nook that the route's own file lists are then stood on the new land (each still reachable, trainers looking at the road).
//  A route that cannot be laid out in a few tries keeps its hand-written rows. Runs after every route and story file, before the side paths (24ve).
// =====================================================================
const OW_BLOCKS = { T: ['TT', 'TT'], g: [',,', ',,'], G: ['""', '""'], p: ['..', '..'], f: ['*,', ',*'], w: ['~~', '~~'], l: ['vv', ',,'], h: [',,', ',,'], r: [',,', ',,'], d: ['dd', 'dd'] };
// The block column of the road for each of the 12 block rows, top to bottom (3 is the middle, where the road leaves the map). Bends jump two or more columns so the straight lane between them stays apart from the road.
const OW_ROAD_PLANS = [
  [3, 3, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3], [3, 3, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3], [3, 3, 3, 3, 1, 1, 1, 1, 3, 3, 3, 3], [3, 3, 3, 3, 5, 5, 5, 5, 3, 3, 3, 3],
  [3, 1, 1, 1, 3, 3, 5, 5, 5, 3, 3, 3], [3, 5, 5, 5, 3, 3, 1, 1, 1, 3, 3, 3]
];
function owRng(text, k) {
  let a = k * 7919 + 17; for (let i = 0; i < text.length; i++) a = (a * 31 + text.charCodeAt(i)) | 0;
  return function () { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// One try at laying a route out; returns its new rows, people and finds, or null when something could not be placed.
function owBlockRoute(L, i, attempt) {
  const m = OW_MAPS[L.routeIn], rnd = owRng(L.routeIn, attempt), plan = OW_ROAD_PLANS[(i + (attempt > 6 ? attempt : 0)) % OW_ROAD_PLANS.length], gateChar = (m.rows.join('').match(/[ghjklqz]/) || ['g'])[0];
  const B = []; for (let by = 0; by < 12; by++) { B.push([]); for (let bx = 0; bx < 7; bx++) B[by].push(bx === 0 || bx === 6 || by === 0 || by === 11 ? 'T' : 'g'); }
  const at = function (bx, by) { return B[by] && B[by][bx]; }, roadNear = function (bx, by, r) { for (let y = by - r; y <= by + r; y++) for (let x = bx - r; x <= bx + r; x++) if (at(x, y) === 'p') return true; return false; };
  for (let by = 0; by < 12; by++) { B[by][plan[by]] = 'p'; if (by) for (let c = Math.min(plan[by], plan[by - 1]); c <= Math.max(plan[by], plan[by - 1]); c++) B[by][c] = 'p'; }
  const lanes = [], bands = [];
  for (let a = 0; a < 12; a++) if (plan[a] !== 3 && (a === 0 || plan[a - 1] === 3)) { let b = a; while (b + 1 < 12 && plan[b + 1] !== 3) b++; if (b - a >= 2) lanes.push([a + 1, b]); a = b; }
  lanes.forEach(function (r) {
    const m = Math.floor((r[0] + r[1]) / 2);
    for (let by = r[0]; by <= r[1]; by++) B[by][3] = 'g';
    for (let bx = 1; bx < 6; bx++) if (bx !== 3 && B[m][bx] !== 'p') B[m][bx] = 'T';                       // a tree wall across the bend, with the lane's Trim-charm tree in it
  });
  for (let by = 1; by < 11; by++) if (plan[by] === 3 && plan[by - 1] === 3 && !lanes.some(function (r) { return by >= r[0] && by <= r[1]; }) && bands.length < 1) bands.push(by);
  bands.forEach(function (by) { for (let bx = 1; bx < 6; bx++) B[by][bx] = bx === 3 ? 'G' : 'T'; });
  const free = function (bx, by, w, h) { for (let y = by; y < by + h; y++) for (let x = bx; x < bx + w; x++) if (at(x, y) !== 'g') return false; return true; };
  const spots = function (w, h) { const out = []; for (let by = 2; by < 10 - h + 1; by++) for (let bx = 1; bx < 6 - w + 1; bx++) if (free(bx, by, w, h)) out.push([bx, by]); return out; };
  const take = function (list) { return list.length ? list[Math.floor(rnd() * list.length)] : null; };
  let score = 0;
  const bigField = take(spots(3, 2));
  if (bigField) { score++; for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) B[bigField[1] + y][bigField[0] + x] = 'G'; }
  const pond = take(spots(2, 2).filter(function (s) { return 'gGfp'.indexOf(at(s[0], s[1] - 1)) !== -1 && 'gGfp'.indexOf(at(s[0] + 1, s[1] - 1)) !== -1; }));
  if (!pond) return null;
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) B[pond[1] + y][pond[0] + x] = 'w';
  for (let x = 0; x < 2; x++) if (B[pond[1] - 1][pond[0] + x] === 'g') B[pond[1] - 1][pond[0] + x] = 'r';      // the shore the bridge starts from stays open
  const house = take(spots(2, 2).filter(function (s) { return 'gGf'.indexOf(at(s[0], s[1] + 2)) !== -1 || at(s[0], s[1] + 2) === 'p'; }));
  if (house) { score++; for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) B[house[1] + y][house[0] + x] = 'h'; }
  const edgeOk = function (w) { return spots(w, 1).filter(function (s) { for (let x = 0; x < w; x++) if ('gG'.indexOf(at(s[0] + x, s[1] - 1)) === -1 || 'gG'.indexOf(at(s[0] + x, s[1] + 1)) === -1) return false; return true; }); };
  const ledgeW = edgeOk(3).length ? 3 : 2, ledge = take(edgeOk(ledgeW));
  if (ledge) { score += 2; for (let x = 0; x < ledgeW; x++) B[ledge[1]][ledge[0] + x] = 'l'; }

  for (let k = 0; k < 3; k++) { const f = take(spots(2, rnd() < 0.5 ? 2 : 1)); if (f) { const w = 2; for (let y = 0; y < 2; y++) for (let x = 0; x < w; x++) if (at(f[0] + x, f[1] + y) === 'g') B[f[1] + y][f[0] + x] = 'G'; } }
  for (let by = 1; by < 11; by++) for (let bx = 1; bx < 6; bx++) if (B[by][bx] === 'g' && !roadNear(bx, by, 1)) { const r = rnd(); if (r < 0.2) B[by][bx] = 'T'; else if (r < 0.3) B[by][bx] = 'f'; else if (r < 0.36) B[by][bx] = 'd'; }
  const g = []; for (let y = 0; y < 24; y++) g.push(new Array(14).fill(','));
  for (let by = 0; by < 12; by++) for (let bx = 0; bx < 7; bx++) { const blk = OW_BLOCKS[B[by][bx]]; for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) g[by * 2 + y][bx * 2 + x] = blk[y].charAt(x); }
  const px = pond[0] * 2, py = pond[1] * 2;
  g[py][px + 1] = 'B'; g[py + 1][px + 1] = 'd';
  lanes.forEach(function (r) { const y = 2 * Math.floor((r[0] + r[1]) / 2); g[y][6] = 'g'; g[y][7] = 'T'; g[y + 1][6] = 'g'; g[y + 1][7] = 'T'; });
  const solid = function (c) { return 'TYvRW~#bs=x'.indexOf(c) !== -1 || OW_GATE_CHARS[c]; };
  const walk = function (x, y) { return x >= 0 && x < 14 && y >= 0 && y < 24 && !solid(g[y][x]); };
  const npcs = m.npcs.map(function (n) { return Object.assign({}, n); }), objects = (m.objects || []).map(function (o) { return Object.assign({}, o); }), used = {};
  const mark = function (x, y) { used[x + ',' + y] = 1; }, usedNear = function (x, y) { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (used[(x + dx) + ',' + (y + dy)]) return true; return false; };
  if (house) for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) mark(house[0] * 2 + x, house[1] * 2 + y);                // the house and the way down from its door
  mark(6, 22); mark(7, 22); mark(px + 1, py); mark(px + 1, py + 1);
  const roadAt = function (x, y) { return g[y][x] === '.'; };
  const ground = function (x, y) { return ',"*d'.indexOf(g[y][x]) !== -1 && !usedNear(x, y); };
  // trainers (and anyone else with a name): three tiles from the road, looking at it along a clear row, spread down the route
  const people = npcs.filter(function (n) { return n.kind === 'trainer' || n.kind === 'boss'; });
  const roadRows = []; for (let y = 3; y < 21; y++) { const xs = []; for (let x = 1; x < 13; x++) if (roadAt(x, y)) xs.push(x); if (xs.length) roadRows.push([y, xs]); }
  for (let k = 0; k < people.length; k++) {
    const n = people[k], target = 4 + Math.floor(k * 15 / people.length) + Math.floor(rnd() * 2); let done = false;
    const order = roadRows.slice().sort(function (a, b) { return Math.abs(a[0] - target) - Math.abs(b[0] - target); });
    for (let r = 0; r < order.length && !done; r++) {
      const y = order[r][0], xs = order[r][1], first = rnd() < 0.5 ? -1 : 1;
      [3, 2, 4].forEach(function (dx) { [first, -first].forEach(function (s) { xs.forEach(function (xr) {
        const x = xr + s * dx; if (done || x < 1 || x > 12 || roadAt(x, y) || !ground(x, y)) return;
        for (let t = 1; t < dx; t++) if (!walk(xr + s * t, y)) return;
        n.x = x; n.y = y; n.face = s < 0 ? 'right' : 'left'; mark(x, y); done = true;
      }); }); });
    }
    if (!done) return null;
  }
  // the shake tree and the finds that lie in the open: grass next to trees or at the edge, away from the road
  const open = function () { const out = []; for (let y = 2; y < 22; y++) for (let x = 2; x < 12; x++) if (g[y][x] === ',' && !usedNear(x, y) && !roadAt(x - 1, y) && !roadAt(x + 1, y) && !roadAt(x, y - 1) && !roadAt(x, y + 1)) out.push([x, y]); return out; };
  const treeId = Object.keys(m.trees || {}).map(function (k) { return m.trees[k]; })[0], trees = {};
  if (treeId) { const s = take(open()); if (!s) return null; g[s[1]][s[0]] = 'Y'; trees[s[0] + ',' + s[1]] = treeId; mark(s[0], s[1]); }
  for (let k = 0; k < objects.length; k++) {
    const o = objects[k]; if (/nook/.test(o.id)) continue;
    const s = take(open()); if (!s) return null; o.x = s[0]; o.y = s[1]; mark(s[0], s[1]);
  }
  const hide = take(open()); if (!hide) return null;                                                      // a hidden find (Itemfinder) in the open, away from the others
  mark(hide[0], hide[1]); objects.push({ id: L.routeIn + '-hidden', type: 'pickup', hidden: true, x: hide[0], y: hide[1], give: i % 2 ? 'net' : 'gems' });
  // the nook: a gate in a tree wall with two finds behind it
  const nookObjs = objects.filter(function (o) { return /nook/.test(o.id); });
  if (nookObjs.length) {
    const cands = [];
    for (let y = 6; y < 21; y++) for (let x = 3; x < 11; x++) {
      if (!ground(x, y)) continue;
      let ok = true; for (let yy = y - 4; ok && yy < y; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (',"*dT'.indexOf(g[yy][xx]) === -1 || usedNear(xx, yy)) ok = false;
      if (ok) cands.push([x, y]);
    }
    const s = take(cands); if (!s) return null;
    for (let yy = s[1] - 4; yy < s[1]; yy++) for (let xx = s[0] - 1; xx <= s[0] + 1; xx++) { g[yy][xx] = 'T'; mark(xx, yy); }
    g[s[1] - 1][s[0]] = gateChar;
    nookObjs.forEach(function (o, k) { g[s[1] - 2 - k][s[0]] = ','; o.x = s[0]; o.y = s[1] - 2 - k; });
  }
  // everything on the land must be reachable on foot (the nook gate and the Trim lane are opened by their charms)
  const seen = {}, q = [[6, 22]]; seen['6,22'] = 1;
  const blocked = function (x, y) { return npcs.some(function (n) { return n.x === x && n.y === y; }); };
  while (q.length) { const c = q.pop(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { const x = c[0] + d[0], y = c[1] + d[1], k = x + ',' + y; if (!seen[k] && walk(x, y) && !blocked(x, y)) { seen[k] = 1; q.push([x, y]); } }); }
  const reach = function (x, y) { return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { return seen[(x + d[0]) + ',' + (y + d[1])]; }) || seen[x + ',' + y]; };
  if (!seen[(px + 1) + ',' + (py - 1)] || !reach(6, 0) || !reach(7, 0) || !people.every(function (n) { return reach(n.x, n.y); }) || !objects.every(function (o) { return /nook/.test(o.id) || seen[o.x + ',' + o.y]; })) return null;
  // the bend must cost at least two steps of tall grass wherever the whole way is grass: count the least on any walk from start to the top
  const cost = {}, heap = [[0, 6, 22]]; cost['6,22'] = 0; let best = Infinity;
  while (heap.length) {
    heap.sort(function (a, b) { return a[0] - b[0]; }); const c = heap.shift(); if (c[0] > cost[c[1] + ',' + c[2]]) continue;
    if (c[2] === 1 && (c[1] === 6 || c[1] === 7)) best = Math.min(best, c[0]);
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { const x = c[1] + d[0], y = c[2] + d[1]; if (!walk(x, y) || blocked(x, y) || (x === 6 || x === 7) && (y === 0 || y === 23)) return; const nd = c[0] + (g[y][x] === '"' ? 1 : 0), k = x + ',' + y; if (cost[k] === undefined || nd < cost[k]) { cost[k] = nd; heap.push([nd, x, y]); } });
  }
  if (best < 2 || best >= 99) return null;
  const houseAt = house ? { x: house[0] * 2, y: house[1] * 2 } : null;
  const pondFolk = { x: px + 1, y: py + 1 };
  return { rows: g.map(function (r) { return r.join(''); }), npcs: npcs, objects: objects, trees: trees, score: score, house: houseAt, pond: pondFolk, bridge: { x: px + 1, y: py } };
}
OW_LANDS.forEach(function (L, i) {
  const m = OW_MAPS[L.routeIn]; let best = null;
  for (let attempt = 0; attempt < 40 && (!best || best.score < 4); attempt++) { const r = owBlockRoute(L, i, attempt); if (r && (!best || r.score > best.score)) best = r; }
  if (!best) return;
  m.rows = best.rows; m.npcs = best.npcs; m.objects = best.objects; m.trees = best.trees; m.blocks = true; m.house = best.house;
  m.npcs.push({ id: L.routeIn + '-swimmer', kind: 'trainer', name: 'Swimmer ' + OW_SIDE_FOLK_NAME(i), x: best.pond.x, y: best.pond.y, face: 'down', look: { skin: (i + 2) % 6, hair: (i * 5) % 8, outfit: (i + 5) % 8, style: (i + 1) % 4 }, lines: ['Nobody swims out here! Care for a battle?'], win: ['The water is lovely. So was that fight!'] });
  m.objects.push({ id: L.routeIn + '-islet', type: 'pickup', x: best.bridge.x, y: best.bridge.y, give: i % 2 ? 'net' : 'gems' });
});
function OW_SIDE_FOLK_NAME(i) { return ['Stone', 'Jo', 'Wren', 'Bay', 'Moss', 'Slate', 'Ash', 'Dale'][i % 8]; }
