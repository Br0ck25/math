// =====================================================================
//  TOWN PLANS: Gold's towns are each drawn by hand and none is like another (a harbour, a town on terraces, a plaza, a lake with a ring road, a wood, a river). A plan here says how one town is
//  laid out: a style, its height, and whether it is mirrored. The style puts the Buddy Center, Mart, house and gym where they belong in that style and draws the streets, water and trees;
//  owBuildTown (24vc) then stands the town's people, signs and finds on the plain ground, cuts the nook in and checks everything can be reached, as it does for the slot layout, which stays
//  as the fall-back (and Meadow Town's plan). The main road is always columns 7 and 8 from the bottom edge to the top gate, so the routes line up with the towns.
// =====================================================================
const OW_TOWN_PLANS = {
  meadow: { style: 'green', h: 18 }, ember: { style: 'terrace', h: 22 }, tide: { style: 'harbour', h: 22 }, grove: { style: 'forest', h: 20 }, volt: { style: 'grid', h: 22 },
  gloom: { style: 'marsh', h: 22 }, mystic: { style: 'staircase', h: 22, mirror: true }, skyreach: { style: 'plaza', h: 22, mirror: true }, cinder: { style: 'river', h: 22 },
  coral: { style: 'lagoon', h: 22 }, thistle: { style: 'park', h: 22, mirror: true }, spark: { style: 'avenues', h: 22 }, dusk: { style: 'lake', h: 22, mirror: true },
  prism: { style: 'diamond', h: 22 }, cross: { style: 'crossroads', h: 22, mirror: true }, summit: { style: 'terrace', h: 22, mirror: true, frozen: true }
};
// The helpers a style draws with (x is as drawn for the unmirrored town; a mirrored town is the same picture flipped left to right).
function owTownTools(g, W, H, doors, mirror, rnd) {
  const mx = function (x) { return mirror ? W - 1 - x : x; }, T = {
    at: function (x, y) { return y >= 0 && y < H && x >= 0 && x < W ? g[y][mx(x)] : ''; },
    set: function (x, y, ch) { if (y >= 0 && y < H && x >= 0 && x < W) g[y][mx(x)] = ch; },
    fill: function (x0, y0, x1, y1, ch) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) T.set(x, y, ch); },
    path: function (x0, y0, x1, y1) { T.fill(x0, y0, x1, y1, '.'); },
    // a path along row y from x to the main road
    lane: function (x, y) { const t = x < 7 ? 7 : 8; for (let k = Math.min(x, t); k <= Math.max(x, t); k++) T.set(k, y, '.'); },
    // a building: `roof` rows of roof from y0, a wall row under them with the door `d` tiles in, and a path from the door to the road
    bldg: function (role, x0, y0, w, roof, d) {
      d = d === undefined ? (w >= 4 ? 2 : 1) : d;
      for (let y = y0; y < y0 + roof; y++) for (let x = 0; x < w; x++) T.set(x0 + x, y, 'R');
      const wy = y0 + roof; for (let x = 0; x < w; x++) T.set(x0 + x, wy, 'W');
      T.set(x0 + d, wy, role === 'gym' ? 'G' : 'D');
      if (role === 'center' && d >= 1) T.set(x0 + d - 1, wy, 'N'); else if (role === 'mart' && d >= 1) T.set(x0 + d - 1, wy, 'K');
      T.lane(x0 + d, wy + 1);
      doors[role] = { x: mx(x0 + d), y: wy };
    },
    // Puts the four buildings in the style's slots, in an order that differs from town to town: the gym takes a tall slot (a roof row more) where there is one, and each building sits anywhere along its slot.
    assign: function (slots, roles) {
      roles = roles || ['center', 'mart', 'house', 'gym'];
      const order = owShuffle(roles, rnd), spots = owShuffle(slots, rnd), tall = spots.findIndex(function (sl) { return sl.tall; }), gi = order.indexOf('gym');
      if (tall !== -1 && gi !== -1) { const t = order[tall]; order[tall] = 'gym'; order[gi] = t; }
      T.unused = spots.slice(order.length);
      order.forEach(function (role, k) {
        const sl = spots[k], w = role === 'house' ? (rnd() < 0.5 ? 2 : 3) : role === 'mart' ? 4 : 5, left = sl.x < 7, base = left ? 2 : 9, x0 = base + Math.floor(rnd() * (5 - w + 1)), isTall = role === 'gym' && sl.tall;
        T.bldg(role, x0, isTall ? sl.y - 1 : sl.y, w, isTall ? 3 : 2);
      });
    },
    pond: function (x0, y0, w, h) { T.fill(x0, y0, x0 + w - 1, y0 + h - 1, '_'); T.fill(x0 + 1, y0 + 1, x0 + w - 2, y0 + h - 2, '~'); },
    rnd: rnd
  };
  return T;
}
const OW_TOWN_STYLES = {
  // the home village: a green with a pond on the west, the buildings in a loose line down the east side and one across the top
  green: function (T) {
    T.assign([{ x: 2, y: 1 }, { x: 9, y: 1 }, { x: 9, y: 7 }, { x: 2, y: 12 }]);
    T.path(2, 4, 13, 5); T.pond(3, 7, 5, 4); T.set(6, 6, 'a'); T.set(5, 12, '*');
  },
  // two terraces with a ledge between them (hop down, take the road up), a meadow at the foot
  terrace: function (T) {
    T.assign([{ x: 2, y: 2, tall: true }, { x: 9, y: 2 }, { x: 2, y: 11 }, { x: 9, y: 11 }]); T.path(2, 5, 13, 6);
    for (let x = 2; x <= 13; x++) if (x < 7 || x > 8) T.set(x, 9, 'v');
    T.set(2, 8, '#'); T.set(13, 8, '#'); T.set(3, 10, '#');
    if (T.frozen) T.pond(4, 15, 4, 3);
  },
  // the sea along the south: a quay, sand and a bridge on the main road
  harbour: function (T, H) {
    const top = H - 5;
    T.fill(2, top - 1, 13, top - 1, '_'); T.fill(2, top, 13, H - 3, '~'); T.fill(7, top, 8, H - 3, 'B');
    T.assign([{ x: 2, y: 1 }, { x: 9, y: 1 }, { x: 2, y: 7, tall: true }, { x: 9, y: 7, tall: true }]); T.path(2, 4, 13, 5); T.path(2, 10, 13, 10);
  },
  // a paved square with two fountains between a row of buildings on top and another below
  plaza: function (T) {
    T.path(2, 4, 13, 5); T.fill(3, 6, 12, 10, 'd'); T.fill(4, 8, 5, 9, '~'); T.fill(10, 8, 11, 9, '~');
    [[3, 6], [12, 6], [3, 10], [12, 10]].forEach(function (p) { T.set(p[0], p[1], 'a'); });
    T.fill(7, 6, 8, 10, '.');
    T.assign([{ x: 2, y: 1 }, { x: 9, y: 1 }, { x: 2, y: 11 }, { x: 9, y: 11 }]); T.path(2, 14, 13, 14);
  },
  // a lake in the middle, a bridge over it on the road and a ring path round it
  lake: function (T) {
    T.path(2, 4, 13, 5); T.path(3, 7, 12, 7); T.path(3, 11, 12, 11); T.path(3, 7, 3, 11); T.path(12, 7, 12, 11);
    T.fill(4, 8, 11, 10, '~'); T.fill(7, 8, 8, 10, 'B');
    T.assign([{ x: 2, y: 1 }, { x: 9, y: 1 }, { x: 2, y: 12 }, { x: 9, y: 12 }]); T.path(2, 15, 13, 15);
  },
  // buildings dotted down the town in steps, with woods between and a path that winds to each door
  forest: function (T, H) {
    T.assign([{ x: 2, y: 2 }, { x: 9, y: 3 }, { x: 2, y: 8 }, { x: 9, y: 10 }]);
    const fx = T.rnd();
    for (let y = 2; y <= H - 4; y++) for (let x = 2; x <= 13; x++) { if (x === 7 || x === 8) continue; if (((x * 7 + y * 13 + Math.floor(fx * 50)) % 10) < 3 && (x < 4 || x > 11 || y % 3 === 0) && T.at(x, y) === ',') T.set(x, y, 'T'); }
  },
  // two rows of buildings with a big park between: a pond, an orchard and lamps
  park: function (T) {
    T.path(2, 4, 13, 5);
    T.pond(3, 7, 4, 4); for (let y = 7; y <= 10; y++) for (let x = 10; x <= 13; x++) if ((x + y) % 2) T.set(x, y, 'T');
    T.set(6, 6, 'a'); T.set(9, 11, 'a');
    T.assign([{ x: 2, y: 1 }, { x: 9, y: 1 }, { x: 2, y: 11 }, { x: 9, y: 11 }]); T.path(2, 14, 13, 14);
  },
  // a marsh: little ponds with sandy banks dotted about, the buildings in two rows
  marsh: function (T) {
    T.path(2, 4, 13, 5); T.pond(3, 7, 3, 3); T.pond(10, 8, 4, 3); T.pond(4, 11, 3, 3);
    T.assign([{ x: 2, y: 1 }, { x: 9, y: 1 }, { x: 2, y: 15 }, { x: 9, y: 12 }]); T.path(2, 18, 13, 18);
    for (let y = 7; y <= 17; y += 3) T.set(9, y, '*');
  },
  // streets in a grid: three avenues across, six plots, four with buildings and the others paved squares
  grid: function (T) {
    T.path(2, 4, 13, 5); T.path(2, 9, 13, 10); T.path(2, 14, 13, 15);
    T.assign([{ x: 2, y: 1 }, { x: 9, y: 1 }, { x: 2, y: 6 }, { x: 9, y: 6 }, { x: 2, y: 11 }, { x: 9, y: 11 }].filter(function (sl, k) { return true; }));
    (T.unused || []).forEach(function (sl) { T.fill(sl.x, sl.y, sl.x + 4, sl.y + 2, 'd'); T.set(sl.x + 2, sl.y + 1, 'a'); });
  },
  // steps up a hillside: the west column steps up at one row, the east column at another
  staircase: function (T) {
    T.path(2, 5, 13, 6);
    T.bldg('gym', 2, 1, 5, 3); T.bldg('center', 9, 2, 5, 2);
    for (let x = 2; x <= 6; x++) T.set(x, 8, 'v');
    T.bldg('mart', 9, 7, 4, 2); T.path(9, 10, 13, 10);
    T.bldg('house', 2, 10, 3, 2); T.path(2, 13, 6, 13);
    for (let x = 9; x <= 13; x++) T.set(x, 12, 'v');
    T.set(13, 8, '#'); T.set(2, 14, '#'); T.set(13, 14, '#');
  },
  // the sea down the east side with a pier across it, sand along the shore
  lagoon: function (T, H) {
    T.fill(9, 8, 9, H - 4, '_'); T.fill(10, 8, 13, H - 4, '~'); T.fill(10, H - 3, 13, H - 3, '_'); T.fill(9, 8, 13, 8, '_'); T.fill(10, 9, 13, H - 4, '~');
    T.fill(9, 12, 13, 12, 'B');
    T.assign([{ x: 2, y: 1 }, { x: 9, y: 1 }, { x: 2, y: 8 }, { x: 2, y: 13 }]); T.path(2, 4, 13, 5);
  },
  // a flower garden in the middle with a diamond of paths to the four corners
  diamond: function (T) {
    T.path(2, 4, 13, 5);
    for (let y = 6; y <= 12; y++) for (let x = 3; x <= 12; x++) if (x !== 7 && x !== 8) T.set(x, y, (x + y) % 3 ? '*' : ',');
    for (let k = 0; k <= 4; k++) { [[7 - k, 8 + k], [8 + k, 8 + k], [7 - k, 8 - k], [8 + k, 8 - k]].forEach(function (p) { T.set(p[0], p[1], '.'); T.set(p[0] + (p[0] < 8 ? -1 : 1) * 0, p[1] + 1, '.'); }); }
    T.assign([{ x: 2, y: 1 }, { x: 9, y: 1 }, { x: 2, y: 13 }, { x: 9, y: 13 }]); T.path(2, 16, 13, 16);
  },
  // an X of paths crossing the middle of the town, a building in each corner
  crossroads: function (T) {
    T.path(2, 4, 13, 5);
    for (let k = 0; k <= 5; k++) { [[2 + k, 6 + k], [13 - k, 6 + k], [2 + k, 12 - k], [13 - k, 12 - k]].forEach(function (p) { T.set(p[0], p[1], '.'); T.set(p[0] + (p[0] < 7 ? 1 : -1), p[1], '.'); }); }
    T.assign([{ x: 2, y: 1 }, { x: 9, y: 1 }, { x: 2, y: 13 }, { x: 9, y: 13 }]); T.path(2, 16, 13, 16);
  },
  // two long avenues lined with buildings and a market in the square between
  avenues: function (T) {
    T.path(2, 5, 13, 6); T.path(2, 11, 13, 12);
    T.fill(3, 8, 12, 8, '='); T.fill(3, 9, 12, 9, 'd');
    T.assign([{ x: 2, y: 2 }, { x: 9, y: 2 }, { x: 2, y: 13 }, { x: 9, y: 13 }]); T.path(2, 16, 13, 16);
  },
  // a river down the west side with a bridge on the street; the buildings stand on the east bank, a small house between river and road
  river: function (T, H) {
    T.fill(2, 1, 2, H - 2, '_'); T.fill(3, 1, 4, H - 2, '~'); T.fill(5, 1, 5, H - 2, '_');
    T.assign([{ x: 9, y: 1 }, { x: 9, y: 6 }, { x: 9, y: 11 }], ['center', 'mart', 'gym']); T.bldg('house', 5, 9, 2, 2);
    T.path(2, 4, 13, 5); T.fill(3, 4, 4, 5, 'B');
  }
};
// Runs a plan on the grid: the edge columns of the old map are kept (the side games cut their doors there), the style draws, and every kept gap in the edge is joined to the road.
function owRunPlan(plan, g, W, H, doors, rnd, old) {
  const T = owTownTools(g, W, H, doors, !!plan.mirror, rnd); T.frozen = !!plan.frozen;
  OW_TOWN_STYLES[plan.style](T, H);
  for (let y = 1; y < H - 1; y++) [0, 1, 14, 15].forEach(function (x) { g[y][x] = y >= 4 && y <= 8 ? old[y].charAt(x) : 'T'; });
  for (let y = 1; y < H - 1; y++) { if (g[y][7] === 'T' || g[y][7] === ',') g[y][7] = '.'; if (g[y][8] === 'T' || g[y][8] === ',') g[y][8] = '.'; }
  if (Object.keys(doors).length < 4) return false;
  [[1, 5], [1, 6], [14, 7], [14, 6]].forEach(function (p) {
    const x = p[0], y = p[1], t = OW_TILES[g[y][x]]; if (!t || t.solid) return;
    const step = x < 7 ? 1 : -1;
    for (let k = x; k !== (x < 7 ? 7 : 8); k += step) {
      const c = g[y][k], t2 = OW_TILES[c];
      if (c === '~') { g[y][k] = 'B'; continue; }
      if (c === '.' || c === 'B' || c === 'd' || c === '_') continue;
      if (c === ',' || c === 'T' || c === '*' || c === 'a' || c === '#') { g[y][k] = '.'; continue; }
      if (t2 && t2.solid) return;                                                                     // a wall in the way: this layout leaves the gap shut (the checks that follow will say so)
    }
  });
  return true;
}
