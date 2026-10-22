// =====================================================================
//  HAND-DRAWN ROUTES: a route drawn tile by tile, as Gold draws its landmarks, in place of one laid out from blocks (24vb). Each lists its rows and where the people and finds of the
//  route's own file stand. A letter q in the rows is the route's charm gate. The pond is the usual 4 x 4 one (a bridge, a swimmer on the dirt, a stone to a second islet).
//  Rules a hand route keeps: the first and last two rows are plain road at x 6-7 (the seams with the towns), every person and find stands where it can be reached,
//  and a trainer looks along a clear row at the road. The tests check all of it.
// =====================================================================
const OW_HAND_ROUTES = {
  // Leaf Grove's road is a forest maze (Gold's Ilex Forest): clearings joined by tree walls with their gaps on alternating sides, a pond, and a nook behind a charm gate in the wall.
  route5: {
    rows: [
      'TTTTTT..TTTTTT',
      'TTTTTT..TTTTTT',
      'TT,,,,..,,,,TT',
      'TT,",,..,"*,TT',
      'TT,,,,..,"",TT',
      'TT,*,,..,,,,TT',
      'TTTTT,..,TTTTT',
      'TTTTT,..,TTTTT',
      'TT,,*,..,,,,TT',
      'TT,,,,..,T,,TT',
      'TT,,..,,,,,YTT',
      'TT..,,,,"",,TT',
      'TT..,,"",,,,TT',
      'TT..,,"",TTTTT',
      'TT..TTTTTTTTTT',
      'TT..TTTTTTTTTT',
      'TT..,,,,,,q,TT',
      'TT..,,*,,"",TT',
      'TT......,,,TTT',
      'TT......~BjdTT',
      'TT......~d~~TT',
      'TT""""..~~~~TT',
      'TT""""..~~~~TT',
      'TTTTTT""TTTTTT',
      'TTTTTT""TTTTTT',
      'TT,,,,..,,,,TT',
      'TT,*,,..,"",TT',
      'TT,,,,..,"",TT',
      'TT,,"",..,*,TT',
      'TTTTT,..,TTTTT',
      'TTTTTT..TTTTTT',
      'TTTTTT..TTTTTT'
    ],
    trainers: [[10, 5, 'left'], [9, 12, 'right']], house: [2, 2],
    finds: { 'route5-ore': [3, 5] }, apricorn: [5, 17], hidden: [10, 27],
    nook: { gate: [10, 16], items: [[10, 15], [10, 14]] },
    tree: [11, 10], pond: [8, 19]
  }
  ,
  // Ember's road to Tide Bay is a ledge run (Gold's Route 45): three lines of ledge across the road, each with its gap of tall grass on the other side, so the way up zigzags and the way back down is a hop.
  route3: {
    rows: [
      'TTTTTT..TTTTTT', 'TTTTTT..TTTTTT', 'TT,,,,..,,,,TT', 'TT,*,,..,,*,TT', 'TT,,,,..,,,YTT', 'TTvvvvvvvv""TT',
      'TTTTT,,,,,..TT', 'TTTTT"",,,..TT', 'TTT,T,,,,,..TT', 'TTT,T,,,,,..TT', 'TT,q,,,,,,..TT', 'TT,,,,,,,,..TT',
      'TT""vvvvvvvvTT', 'TT..,,,,,,,TTT', 'TT..,,,,~BjdTT', 'TT..,,,,~d~~TT', 'TT..,,,,~~~~TT', 'TT..,,,,~~~~TT',
      'TT........,,TT', 'TTvvvvvvvv""TT', 'TT,,,,,,,,..TT', 'TT,,,,,,....TT', 'TTTTTT..TTTTTT', 'TTTTTT..TTTTTT'
    ],
    trainers: [[9, 3, 'left'], [5, 16, 'up']], house: [2, 2],
    finds: { 'route3-berries': [5, 4] }, apricorn: [5, 20], hidden: [4, 21],
    nook: { gate: [3, 10], items: [[3, 9], [3, 8]] },
    tree: [11, 4], pond: [8, 14]
  },
  // Coral Reach's road to Thistle Wood crosses a lake on a causeway (the bridge is the only way over the water), with a band of tall grass on the near shore.
  route10: {
    rows: [
      'TTTTTT..TTTTTT', 'TTTTTT..TTTTTT', 'TT,,,,..,,,,TT', 'TT,,,*..,*,,TT', 'TT,,,,..,,,,TT', 'TTTTT".."TTTTT',
      'TT,,,,..,,,,TT', 'TT,"",..,"",TT', 'TT,"",..,"",TT', 'TT,,,,..,,,,TT', 'TT~~~~BB~~~~TT', 'TT~~~~BB~~~~TT',
      'TT~~~~BB~~~~TT', 'TT~~~~BB~~~~TT', 'TT~~~~BB~~~~TT', 'TT~~~~BB~~~~TT', 'TT~~~~BB~~~~TT', 'TT~~~~BB~~~~TT',
      'TT""""""""""TT', 'TT""""""""""TT', 'TT,,,,..,,,,TT', 'TT,,,,..,,,YTT', 'TT,,,,..,,,TTT', 'TTTTT,..~BjdTT',
      'TTTTT,..~d~~TT', 'TTT,T,..~~~~TT', 'TTT,T,..~~~~TT', 'TT,q,,..,,,,TT', 'TT,,,,..,,,,TT', 'TTTTT,..,TTTTT',
      'TTTTTT..TTTTTT', 'TTTTTT..TTTTTT'
    ],
    trainers: [[9, 3, 'left'], [3, 8, 'left']], house: [2, 2],
    finds: { 'route10-gem': [10, 2], 'route10-net': [11, 9] }, apricorn: [9, 28], hidden: [4, 21],
    nook: { gate: [3, 27], items: [[3, 26], [3, 25]] },
    tree: [11, 21], pond: [8, 23]
  }
};
// Builds the same result as owBlockRoute (24vb) from a hand-drawn route, or null when a person or find of the route's file has no place in it.
function owHandRoute(L, spec) {
  const m = OW_MAPS[L.routeIn], gateChar = L.charm ? (m.rows.join('').match(/[ghjklqz]/) || ['g'])[0] : 'n';
  const rows = spec.rows.map(function (r) { return r.replace('q', gateChar); });
  spec.nook.items.forEach(function (p) { rows[p[1]] = rows[p[1]].slice(0, p[0]) + ',' + rows[p[1]].slice(p[0] + 1); });                  // the two finds behind the gate stand on grass inside the wall
  const npcs = m.npcs.map(function (n) { return Object.assign({}, n); }), objects = (m.objects || []).map(function (o) { return Object.assign({}, o); }), trees = {};
  const people = npcs.filter(function (n) { return n.kind === 'trainer' || n.kind === 'boss'; });
  if (people.length > spec.trainers.length) return null;
  people.forEach(function (n, k) { n.x = spec.trainers[k][0]; n.y = spec.trainers[k][1]; n.face = spec.trainers[k][2]; });
  for (let k = 0; k < objects.length; k++) {
    const o = objects[k];
    if (/nook-gem$/.test(o.id)) { o.x = spec.nook.items[0][0]; o.y = spec.nook.items[0][1]; } else if (/nook-net$/.test(o.id)) { o.x = spec.nook.items[1][0]; o.y = spec.nook.items[1][1]; }
    else if (spec.finds[o.id]) { o.x = spec.finds[o.id][0]; o.y = spec.finds[o.id][1]; } else return null;
  }
  const treeId = Object.keys(m.trees || {}).map(function (k) { return m.trees[k]; })[0]; if (treeId) trees[spec.tree[0] + ',' + spec.tree[1]] = treeId;
  const px = spec.pond[0], py = spec.pond[1];
  objects.push({ id: L.routeIn + '-surf', type: 'pickup', x: px + 3, y: py, give: 'ultranet' });
  objects.push({ id: L.routeIn + '-apricorns', type: 'pickup', x: spec.apricorn[0], y: spec.apricorn[1], give: 'apricorn' });
  objects.push({ id: L.routeIn + '-hidden', type: 'pickup', hidden: true, x: spec.hidden[0], y: spec.hidden[1], give: L.routeIn.length % 2 ? 'net' : 'gems' });
  return { n: rows.length, rows: rows, npcs: npcs, objects: objects, trees: trees, score: 99, house: { x: spec.house[0], y: spec.house[1] }, pond: { x: px + 1, y: py + 1 }, bridge: { x: px + 1, y: py }, hand: true };
}
