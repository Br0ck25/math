// =====================================================================
//  TOWN LAND: the towns were all one plan, so each gets its own look from a few stamps (a pond with sand, a garden, a grove, a dirt plaza, a ledge), lanes of path from every door to the
//  road, flower strips and a second row of trees along the edge. Only plain grass that nothing stands on or next to is changed, so every door, person, sign and find stays where it was.
//  Runs after the routes (24vb) and before the side games that cut their own gaps into towns (24vf and later).
// =====================================================================
function owDressTown(L, i) {
  const m = OW_MAPS[L.town], rnd = owRng(L.town, 7), W = m.rows[0].length, H = m.rows.length, keys = Object.keys(m.signs || {}).concat(Object.keys(m.trees || {}));
  const near = function (x, y, r) { return m.warps.some(function (w) { return Math.abs(w.x - x) <= r && Math.abs(w.y - y) <= r; }) || (m.npcs || []).concat(m.objects || []).some(function (p) { return Math.abs(p.x - x) <= r && Math.abs(p.y - y) <= r; }) || keys.some(function (k) { const p = k.split(',').map(Number); return Math.abs(p[0] - x) <= r && Math.abs(p[1] - y) <= r; }) || Object.keys(m.gyms || {}).some(function (k) { const p = k.split(',').map(Number); return Math.abs(p[0] - x) <= r && Math.abs(p[1] - y) <= r; }); };
  const at = function (x, y) { return m.rows[y] ? m.rows[y].charAt(x) : ''; }, plain = function (x, y) { return at(x, y) === ',' && !near(x, y, 0); };
  const spot = function (w, h, x0, y0, x1, y1) {
    const out = [];
    for (let y = y0; y + h <= y1 + 1; y++) for (let x = x0; x + w <= x1 + 1; x++) { let ok = true; for (let yy = y; ok && yy < y + h; yy++) for (let xx = x; ok && xx < x + w; xx++) if (!plain(xx, yy)) ok = false; if (ok) out.push([x, y]); }
    return out.length ? out[Math.floor(rnd() * out.length)] : null;
  };
  const fill = function (x, y, w, h, f) { for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const c = f(xx, yy); if (c) owSetTile(L.town, x + xx, y + yy, c); } };
  const STAMPS = {
    pond: function (z) { const s = spot(4, 3, z[0], z[1], z[2], z[3]); if (s) fill(s[0], s[1], 4, 3, function (x, y) { return x === 0 || x === 3 || y === 0 || y === 2 ? '_' : '~'; }); return !!s; },
    garden: function (z) { const s = spot(3, 3, z[0], z[1], z[2], z[3]); if (s) fill(s[0], s[1], 3, 3, function (x, y) { return y === 0 ? 'b' : (x + y) % 2 ? '*' : ','; }); return !!s; },
    grove: function (z) { const s = spot(3, 3, z[0], z[1], z[2], z[3]); if (s) fill(s[0], s[1], 3, 3, function (x, y) { return y < 2 || x === 1 ? 'T' : '*'; }); return !!s; },
    plaza: function (z) { const s = spot(3, 3, z[0], z[1], z[2], z[3]); if (s) fill(s[0], s[1], 3, 3, function (x, y) { return (x === 0 || x === 2) && (y === 0 || y === 2) ? '*' : 'd'; }); return !!s; },
    ledge: function (z) { const s = spot(3, 3, z[0], z[1], z[2], z[3]); if (s) fill(s[0], s[1], 3, 3, function (x, y) { return y === 1 ? 'v' : y === 0 && x % 2 ? '*' : null; }); return !!s; }
  };
  // a stamp stays only if everything that has to be reached still can be: the doors, people, finds, signs and the gym door
  const walkable = function (x, y) { const t = OW_TILES[at(x, y)]; return !!t && !t.solid; };
  const countReachable = function () {
    const seen = {}, q = [[m.start.x, m.start.y]]; seen[m.start.x + ',' + m.start.y] = 1;
    while (q.length) { const c = q.pop(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { const x = c[0] + d[0], y = c[1] + d[1]; if (!seen[x + ',' + y] && walkable(x, y)) { seen[x + ',' + y] = 1; q.push([x, y]); } }); }
    const reach = function (x, y) { return seen[x + ',' + y] || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { return seen[(x + d[0]) + ',' + (y + d[1])]; }); };
    return m.warps.filter(function (w) { return reach(w.x, w.y); }).length + (m.npcs || []).concat(m.objects || []).filter(function (p) { return reach(p.x, p.y); }).length + keys.concat(Object.keys(m.gyms || {})).filter(function (k) { const p = k.split(',').map(Number); return reach(p[0], p[1]); }).length;
  };
  const baseline = countReachable();
  const tryStamp = function (n, z) { const keep = m.rows.slice(); if (STAMPS[n](z) && countReachable() === baseline) return true; m.rows = keep; return false; };
  const names = Object.keys(STAMPS), pickName = function (not) { let n; do { n = names[Math.floor(rnd() * names.length)]; } while (n === not); return n; };
  const zones = [[1, 11, 6, H - 2], [W - 7, 11, W - 2, H - 2], [1, 7, 1, 9], [W - 3, 6, W - 2, 9]];
  let prev = '';
  zones.forEach(function (z, k) {
    let n = k === 0 && /tide|coral/.test(L.land) ? 'pond' : pickName(prev);
    if (!tryStamp(n, z) && !tryStamp('plaza', z)) return; prev = n;
  });
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (plain(x, y) && rnd() < 0.1) owSetTile(L.town, x, y, '*');                      // a few flowers
  // a lane of path from each door (and the gym door) sideways to the road, along the row just below it
  const doors = m.warps.filter(function (w) { return OW_MAPS[w.to] && at(w.x, w.y) === 'D'; }).map(function (w) { return [w.x, w.y]; }).concat(Object.keys(m.gyms || {}).map(function (k) { return k.split(',').map(Number); }));
  const road = []; for (let x = 0; x < W; x++) if (at(x, H - 2) === '.') road.push(x);
  doors.forEach(function (d) {
    const y = d[1] + 1, target = road.length ? road.reduce(function (a, b) { return Math.abs(b - d[0]) < Math.abs(a - d[0]) ? b : a; }) : d[0], step = target > d[0] ? 1 : -1, cells = [];
    for (let x = d[0]; x !== target; x += step) { if (at(x, y) !== ',' && at(x, y) !== '.') return; cells.push(x); }
    cells.forEach(function (x) { if (at(x, y) === ',') owSetTile(L.town, x, y, '.'); });
  });
  // the second row of trees along the edge, but never in front of a door or in the rows where the side games cut their gaps
  for (let y = 1; y < H - 1; y++) [1, W - 2].forEach(function (x) { if ((y < 4 || y > 9) && plain(x, y) && !near(x, y, 2)) owSetTile(L.town, x, y, 'T'); });
}
OW_LANDS.forEach(owDressTown);
