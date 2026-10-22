// =====================================================================
//  PLACES (Gold's villages, lakes and ruins that are not gym towns): hand-drawn maps joined to a town or route by a gap in its edge, laid on Gold's graph (docs/gold-world-graph.md).
//  owJoin opens the host's gap (the host's own tile row and a way in to ground its entrance reaches) and warps both ways; a place is a shortcut to nowhere you could not reach, so it needs no key.
// =====================================================================
// Joins `host` (its east edge when hostEdge is 15, its west edge when 0) at hostRow to `place` (the opposite edge) at placeRow.
function owJoin(host, hostEdge, hostRow, place, placeRow) {
  if (!owOpenGap(host, hostEdge, hostRow)) return false;
  const hm = OW_MAPS[host];                                                                            // a walker standing in the way in is moved off it (its home moves too)
  (hm.npcs || []).forEach(function (n) {
    if (Math.abs(n.y - hostRow) > 1 || (hostEdge === 15 ? n.x < 11 : n.x > 4)) return;
    for (let d = 3; d <= 8; d++) [1, -1].forEach(function (sgn) {
      const y = hostRow + sgn * d;
      if (Math.abs(n.y - hostRow) <= 1 && hm.rows[y] && ',*'.indexOf(hm.rows[y].charAt(n.x)) !== -1 && !owNpcAt(hm, n.x, y)) { n.y = y; if (n.home) n.home = { x: n.x, y: y }; }
    });
  });
  const P = OW_MAPS[place], placeEdge = hostEdge === 15 ? 0 : P.rows[0].length - 1;
  owSetTile(place, placeEdge, placeRow, '.');
  OW_MAPS[host].warps.push({ x: hostEdge, y: hostRow, to: place, tx: placeEdge === 0 ? 1 : placeEdge - 1, ty: placeRow });
  P.warps.push({ x: placeEdge, y: placeRow, to: host, tx: hostEdge === 15 ? 14 : 1, ty: hostRow });
  return true;
}
const OW_CHERRY_LOOK = function (i) { return { skin: (i + 1) % 6, hair: (i * 3) % 8, outfit: (i + 2) % 8, style: i % 4 }; };
// Cherrygrove (Gold's village between New Bark and Violet): a Buddy Center, a Mart and two houses on one street, east of Cozy Hollow.
OW_MAPS.cherrygrove = {
  id: 'cherrygrove', name: 'Cherrygrove', region: 'meadow', start: { x: 1, y: 7 }, palette: OW_MAPS.hollow.palette, annex: { near: 'hollow' },
  rows: [
    'TTTTTTTTTTTTTTTTTTTT',
    'T,,,,,,,,,,,,,,,,,,T',
    'T,,RRRRR,TTTRRRR,,,T',
    'T,,RRRRR,*,,RRRR,,,T',
    'T,,WNDWW,,,,WKDW,,,T',
    'T,*,,.,,*,,,,,.,,*,T',
    'T,,,,.,,,s,,,,.,,,,T',
    '..................,T',
    'T,*,,,,,,,,,,,,,*,,T',
    'T,,,,,,,~~~,,,,,,,,T',
    'T,,RRRR,~~~,RRRR,,,T',
    'T,,RRRR,,,,,RRRR,,,T',
    'T,,WWDW,,,,,WWDW,,,T',
    'T,,,,,,,,,,,,,,,,,,T',
    'T,,,,,,,,,,,,,,,,,,T',
    'TTTTTTTTTTTTTTTTTTTT'
  ],
  warps: [{ x: 5, y: 4, to: 'cherry-center', tx: 5, ty: 8 }, { x: 14, y: 4, to: 'cherry-mart', tx: 5, ty: 8 }, { x: 5, y: 12, to: 'cherry-house1', tx: 5, ty: 8 }, { x: 14, y: 12, to: 'cherry-house2', tx: 5, ty: 8 }],
  npcs: [
    { id: 'cherry-gran', name: 'Old Pat', x: 9, y: 8, face: 'down', look: OW_CHERRY_LOOK(1), lines: ['Cherrygrove is a quiet place. The pond never freezes, even in the coldest winter.', 'Everyone passes through on the way to Meadow Town.'] },
    { id: 'cherry-kid', name: 'Kid Lark', x: 16, y: 9, face: 'left', look: OW_CHERRY_LOOK(4), lines: ['My buddy slept all day. Then it beat me at a race!'] }
  ],
  objects: [{ id: 'cherry-gems', type: 'pickup', x: 17, y: 13, give: 'gems' }],
  trees: {}, signs: { '9,6': 'Cherrygrove. A Buddy Center and a Mart for travellers. Cozy Hollow is to the west.' }
};
OW_MAPS['cherry-center'] = Object.assign(owRoom('cherry-center', 'Buddy Center', { to: 'cherrygrove', tx: 5, ty: 5 }, [
  { id: 'cherry-nurse', kind: 'nurse', name: 'Nurse Joy', x: 3, y: 1, face: 'down', look: { skin: 1, hair: 7, outfit: 6, style: 3 }, lines: ['Welcome to the Buddy Center!'] }
], [], OW_CENTER_ROWS), { annex: { near: 'hollow' } });
OW_MAPS['cherry-mart'] = Object.assign(owRoom('cherry-mart', 'Mart', { to: 'cherrygrove', tx: 14, ty: 5 }, [
  { id: 'cherry-clerk', kind: 'clerk', name: 'Clerk Fern', x: 3, y: 2, face: 'down', look: { skin: 2, hair: 6, outfit: 3, style: 2 }, lines: ['Welcome to the Mart!'] }
], [], OW_MART_ROWS), { annex: { near: 'hollow' } });
OW_MAPS['cherry-house1'] = Object.assign(owRoom('cherry-house1', 'Cherrygrove house', { to: 'cherrygrove', tx: 5, ty: 13 }, [
  { id: 'cherry-folk1', name: 'Gardener Ivy', x: 4, y: 2, face: 'down', look: OW_CHERRY_LOOK(2), lines: ['I grow cherries behind the house. The buddies love them.'] }
], [{ id: 'cherry-house1-net', type: 'pickup', x: 1, y: 4, give: 'net' }]), { annex: { near: 'hollow' } });
OW_MAPS['cherry-house2'] = Object.assign(owRoom('cherry-house2', 'Cherrygrove house', { to: 'cherrygrove', tx: 14, ty: 13 }, [
  { id: 'cherry-folk2', name: 'Grandpa Oak', x: 4, y: 2, face: 'down', look: OW_CHERRY_LOOK(5), lines: ['In my day the road to the next town was only a path.', 'Now there are three ways to get anywhere!'] }
]), { annex: { near: 'hollow' } });
owJoin('hollow', 15, 9, 'cherrygrove', 7);

// Lake of Rage (Gold's red-fish lake north of Mahogany): a still lake with a shore path all round it, west of Mystic Peak.
OW_MAPS['lake-of-rage'] = {
  id: 'lake-of-rage', name: 'Lake of Rage', region: 'mystic', start: { x: 20, y: 8 }, palette: OW_MAPS.mystic.palette, annex: { near: 'mystic' },
  rows: [
    'TTTTTTTTTTTTTTTTTTTTTT',
    'T,,,,,,,,,,,,,,,,,,,,T',
    'T,TT*,,,,,,,,,,,,,,TTT',
    'T,,,,,,,,,,,,,,,,,,,,T',
    'T,,,,............,,,,T',
    'T,,,,.~~~~~~~~~~.,,,,T',
    'T,,,,.~~~~~~~~~~.,,,,T',
    'T,,,,.~~~~~~~~~~.,,s,T',
    'T,,,,.~~~~~~~~~~......',
    'T,,,,.~~~~~~~~~~.,,,,T',
    'T,,,,.~~~~~~~~~~.,,,,T',
    'T,,,,.~~~~~~~~~~.,,,,T',
    'T,,,,.~~~~~~~~~~.,,,,T',
    'T,,,,............,,,,T',
    'T,,,,,,,,,,,,,,,,,,,,T',
    'T,T*,,,,,,,,,,,,,,*,,T',
    'T,,T,,,,,,,,,,,,,,TT,T',
    'TTTTTTTTTTTTTTTTTTTTTT'
  ],
  warps: [],
  npcs: [{ id: 'rage-fisher', name: 'Fisher Rin', x: 11, y: 14, face: 'up', look: OW_CHERRY_LOOK(3), lines: ['They say a great red fish lives in this lake. I have been waiting years for a bite.', 'Fishing is all patience. Stand on the shore and the water does the rest.'] }],
  objects: [{ id: 'rage-gems', type: 'pickup', x: 3, y: 3, give: 'gems' }, { id: 'rage-net', type: 'pickup', x: 18, y: 15, give: 'net' }, { id: 'rage-berries', type: 'pickup', x: 2, y: 14, give: 'berry' }],
  trees: {}, signs: { '19,7': 'Lake of Rage. The water is calm today. A shore path runs all the way round.' }
};
// The Ruins of Alph (Gold's old stones off Route 32): a courtyard ringed by old stone, a stone hut in the middle and a chamber inside it, west of Ember Hills.
OW_MAPS['ruins-of-alph'] = {
  id: 'ruins-of-alph', name: 'Ruins of Alph', region: 'ember', start: { x: 18, y: 7 }, palette: OW_MAPS.ember.palette, annex: { near: 'ember' },
  rows: [
    'TTTTTTTTTTTTTTTTTTTT',
    'T__________________T',
    'T_#______________#_T',
    'T_,_##########_#___T',
    'T___#__RRRR__#_____T',
    'T___#__RRRR__#__,__T',
    'T__,#__WWDW__#_____T',
    'T___#____.___#......',
    'T___#____.___#_____T',
    'T__,#____.___#_____T',
    'T___####_.####__,__T',
    'T__________________T',
    'T_____s________#___T',
    'T_#______________#_T',
    'T__________________T',
    'TTTTTTTTTTTTTTTTTTTT'
  ],
  warps: [{ x: 9, y: 6, to: 'ruins-chamber', tx: 5, ty: 8 }],
  npcs: [{ id: 'ruins-scholar', name: 'Scholar Ayla', x: 11, y: 8, face: 'left', look: OW_CHERRY_LOOK(0), lines: ['These stones were here before any road. Nobody knows who laid them.', 'The chamber in the hut is open to anyone who is quiet.'] }],
  objects: [{ id: 'ruins-gems', type: 'pickup', x: 3, y: 6, give: 'gems' }, { id: 'ruins-net', type: 'pickup', x: 16, y: 10, give: 'net' }],
  trees: {}, signs: { '6,12': 'Ruins of Alph. Old stones, older than any road. Please do not climb them.' }
};
OW_MAPS['ruins-chamber'] = Object.assign(owRoom('ruins-chamber', 'Ruin chamber', { to: 'ruins-of-alph', tx: 9, ty: 7 }, [
  { id: 'ruins-sage', name: 'Old Sage Quill', x: 4, y: 2, face: 'down', look: OW_CHERRY_LOOK(5), lines: ['Carvings on every wall. Each one is a different shape.', 'I have studied them for forty years and still find a new one each morning.'] }
], [{ id: 'ruins-relic', type: 'pickup', x: 1, y: 4, give: 'gems' }]), { region: 'ember', palette: OW_MAPS.ember.palette, annex: { near: 'ember' } });
// The Whirl Islands (Gold's sea caves off Route 40): open water behind a sand shore, with five islets that only a surfer reaches (the door sends everyone else back).
OW_MAPS['whirl-islands'] = {
  id: 'whirl-islands', name: 'Whirl Islands', region: 'gloom', start: { x: 22, y: 8 }, palette: OW_MAPS.gloom.palette, sea: 4, annex: { near: 'gloom' },
  rows: [
    '~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~,,,~~~~~~~~~~~~~~~~~~',
    '~~~,,,~~~~~~,,,~~~~~~~~~',
    '~~~,,,~~~~~~,,,~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~dddd',
    '~~~~~~~~~~~~~~~~~~~~dddd',
    '~~~~~~~~~~~~~~~~~~~~ddd.',
    '~~~~~~~~~~~~~~~~~~~~dddd',
    '~~~~~,,,~~~~~~~~~~~~dddd',
    '~~~~~,,,~~~~~~~~~~~~dddd',
    '~~~~~,,,~~~~~,,,,~~~~~~~',
    '~~~~~~~~~~~~~,,,,~~~~~~~',
    '~~~~~~~~~~~~~,,,,~~~~~~~',
    '~~,,,~~~~~~~~~~~~~~~~~~~',
    '~~,,,~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~'
  ],
  warps: [], npcs: [], signs: {}, trees: {}, guard: { key: 'water', to: 'gloom', x: 1, y: 18 },
  objects: [[4, 3, 'gems'], [13, 3, 'net'], [6, 11, 'ultranet'], [14, 13, 'gems'], [3, 15, 'net']].map(function (f, i) { return { id: 'whirl-sea-' + (i + 1), type: 'pickup', x: f[0], y: f[1], give: f[2] }; })
};
owJoin('mystic', 0, 6, 'lake-of-rage', 8);
owJoin('ember', 0, 6, 'ruins-of-alph', 7);
owJoin('gloom', 0, 18, 'whirl-islands', 8);

// A mouth cut into a tree wall of `mapId` (the same kind of spot a route's own cave uses, and a way a walker reaches): returns [x, y] or null.
function owRouteMouth(mapId, fromY) {
  const R = OW_MAPS[mapId], reach = owReachSet(R), at = function (x, y) { return R.rows[y] ? R.rows[y].charAt(x) : ''; };
  for (let y = fromY; y < R.rows.length - 3; y++) for (let x = 2; x < R.rows[0].length - 2; x++) if (at(x, y) === 'T' && at(x, y - 1) === 'T' && ',."*d'.indexOf(at(x, y + 1)) !== -1 && reach[x + ',' + (y + 1)] && !owNear(R, x, y + 1, 1) && !owNear(R, x, y, 1) && !owSeenByTrainer(R, x, y + 1)) return [x, y];
  return null;
}
// A cave with two mouths, one in each of two roads (Gold's Union Cave and Dark Cave). `a` is the mouth at the cave's bottom exit and `b` the one at its top.
function owJoinCave(id, a, b) {
  const C = OW_MAPS[id], ma = owRouteMouth(a[0], a[1]), mb = owRouteMouth(b[0], b[1]);
  if (!ma || !mb) return false;
  [[a[0], ma], [b[0], mb]].forEach(function (p, k) { owSetTile(p[0], p[1][0], p[1][1], 'O'); OW_MAPS[p[0]].warps.push({ x: p[1][0], y: p[1][1], to: id, tx: C.exits[k][0], ty: C.exits[k][1] }); });
  C.warps[0].tx = ma[0]; C.warps[0].ty = ma[1] + 1; C.warps[1].tx = mb[0]; C.warps[1].ty = mb[1] + 1;
  C.warps[0].to = a[0]; C.warps[1].to = b[0];
  return true;
}
// Dark Cave (Gold's cave between Route 31 and Route 45): a winding dark cave between two places on the road home from Skyreach, with a boulder in a side branch (Strength) and a dead end.
OW_MAPS['dark-cave'] = {
  id: 'dark-cave', name: 'Dark Cave', region: 'skyreach', dark: true, room: true, palette: OW_MAPS.skyreach.palette, annex: { near: 'skyreach' }, start: { x: 3, y: 14 }, exits: [[3, 14], [18, 1]],
  rows: [
    '##################m###',
    '#################ccc##',
    '#################ccc##',
    '###ccc###########ccc##',
    '###ccc###########ccc##',
    '###ccc%ccccccccccccc##',
    '###ccccccccccccccccc##',
    '#########ccc##########',
    '#########ccc#cccccc###',
    '##ccccccccccccccccc###',
    '##ccccccccccccccccc###',
    '##cccccccccc#cccccc###',
    '##ccc########cccccc###',
    '##ccc#################',
    '##ccc#################',
    '###m##################'
  ],
  warps: [{ x: 3, y: 15, to: 'link-skyreach-hollow', tx: 0, ty: 0 }, { x: 18, y: 0, to: 'link-skyreach-hollow', tx: 0, ty: 0 }],
  npcs: [{ id: 'dark-delver', name: 'Delver Ash', x: 14, y: 10, face: 'left', look: OW_CHERRY_LOOK(2), lines: ['It is easy to lose the way in here. Keep the walls on your left.', 'A big boulder sits in the little side branch. It looks like it could be pushed.'] }],
  objects: [{ id: 'dark-cave-gem', type: 'pickup', x: 4, y: 3, give: 'gems' }, { id: 'dark-cave-boulder', type: 'pickup', x: 6, y: 5, give: 'ultranet' }, { id: 'dark-cave-net', type: 'pickup', x: 16, y: 11, give: 'net' }],
  trees: {}, signs: {}
};
// Union Cave (Gold's cave between Route 32 and Route 33): a cave through the hill between two ends of Route 2, saving the long way round.
OW_MAPS['union-cave'] = {
  id: 'union-cave', name: 'Union Cave', region: 'ember', dark: true, room: true, palette: OW_MAPS.ember.palette, annex: { near: 'ember' }, start: { x: 2, y: 12 }, exits: [[2, 12], [21, 1]],
  rows: [
    '#####################m##',
    '####################ccc#',
    '##########ccccccccccccc#',
    '##########ccccccccccccc#',
    '##########ccccccccccccc#',
    '##########cccc##########',
    '####cccccccccc##########',
    '####cccccccccc##########',
    '####cccccccccccc########',
    '####ccc#####ccccccccc###',
    '#cccccc#######ccccccc###',
    '#cccccc#######ccccccc###',
    '#cccccc#######ccccccc###',
    '##m#####################'
  ],
  warps: [{ x: 2, y: 13, to: 'route2', tx: 0, ty: 0 }, { x: 21, y: 0, to: 'route2', tx: 0, ty: 0 }],
  npcs: [{ id: 'union-hiker', name: 'Hiker Flint', x: 12, y: 3, face: 'down', look: OW_CHERRY_LOOK(4), lines: ['This cave goes straight through the hill. Saves a long walk round!', 'Water buddies like the cool back of the cave.'] }],
  objects: [{ id: 'union-gem', type: 'pickup', x: 16, y: 11, give: 'gems' }, { id: 'union-net', type: 'pickup', x: 6, y: 7, give: 'net' }],
  trees: {}, signs: {}
};
// The Dragon's Den (Gold's shrine pool under Blackthorn): a lit cavern with a pool and a shrine on an island reached by a bridge, east of Skyreach.
OW_MAPS['dragons-den'] = {
  id: 'dragons-den', name: "Dragon's Den", region: 'skyreach', room: true, palette: OW_MAPS.skyreach.palette, annex: { near: 'skyreach' }, start: { x: 1, y: 8 },
  rows: [
    '####################',
    '####################',
    '######ccccccccccccc#',
    '######ccccccccccccc#',
    '######ccccccccccccc#',
    '######ccc~~~B~~~ccc#',
    '#cccccccc~~~B~~~ccc#',
    '#cccccccc~~ddd~~ccc#',
    '.cccccccc~~ddd~~ccc#',
    '#cccccccc~~~~~~~ccc#',
    '#cccccccc~~~~~~~ccc#',
    '######ccccccccccccc#',
    '######ccccccccccccc#',
    '######ccccccccccccc#',
    '####################',
    '####################'
  ],
  warps: [],
  npcs: [{ id: 'den-elder', name: 'Elder Drake', x: 12, y: 8, face: 'up', look: OW_CHERRY_LOOK(5), lines: ['This pool is the shrine of the old dragons. Only the patient come all the way here.', 'Those who walk the road with care are welcome. Sit as long as you like.'] }],
  objects: [{ id: 'den-gems', type: 'pickup', x: 16, y: 4, give: 'gems' }, { id: 'den-net', type: 'pickup', x: 3, y: 7, give: 'net' }],
  trees: {}, signs: {}
};
// The Slowpoke Well (Gold's well under Azalea Town): a cavern with a pool and a bridge to a small island, east of Ember Hills.
OW_MAPS['slowpoke-well'] = {
  id: 'slowpoke-well', name: 'Slowpoke Well', region: 'ember', room: true, palette: OW_MAPS.ember.palette, annex: { near: 'ember' }, start: { x: 1, y: 7 },
  rows: [
    '##################',
    '##################',
    '#####cccccccccccc#',
    '#####cccccccccccc#',
    '#####cc~~~B~~~~cc#',
    '#cccccc~~~B~~~~cc#',
    '#cccccc~~dddd~~cc#',
    '.cccccc~~dddd~~cc#',
    '#cccccc~~~~~~~~cc#',
    '#cccccc~~~~~~~~cc#',
    '#####cccccccccccc#',
    '#####cccccccccccc#',
    '##################',
    '##################'
  ],
  warps: [],
  npcs: [{ id: 'well-keeper', name: 'Well Keeper Moe', x: 11, y: 7, face: 'up', look: OW_CHERRY_LOOK(1), lines: ['The well is dry on top but wet underneath. Buddies nap down here all day.', 'Do not wake them. They are grumpy before lunch.'] }],
  objects: [{ id: 'well-gems', type: 'pickup', x: 15, y: 3, give: 'gems' }, { id: 'well-net', type: 'pickup', x: 3, y: 6, give: 'net' }],
  trees: {}, signs: {}
};
[['dark-cave', ['link-skyreach-hollow', 4], ['link-skyreach-hollow', 6]], ['union-cave', ['route2', 1], ['route2', 3]]].forEach(function (c) { if (!owJoinCave(c[0], c[1], c[2])) delete OW_MAPS[c[0]]; });
owJoin('skyreach', 15, 14, 'dragons-den', 8);
owJoin('ember', 15, 14, 'slowpoke-well', 7);

// The Dept. Store of Tide Bay (Gold's Goldenrod City, the hub): a five-floor shop in the biggest town, one of its closed houses given a door. Floor 1 is the reception, 2 the Mart counter,
// 3 a Name Rater, 4 a toy floor with finds and 5 the roof. Stairs join the floors the way the Radio Tower's do.
(function () {
  const T = OW_MAPS.tide;
  let door = null;
  for (let y = 14; y < T.rows.length - 3 && !door; y++) { const m = /W{4}/.exec(T.rows[y]); if (m && T.rows[y].indexOf('D') === -1 && /R{4}/.test(T.rows[y - 1]) && ',*'.indexOf(T.rows[y + 1].charAt(m.index + 2)) !== -1) door = [m.index + 2, y]; }
  if (!door) return;
  const stairs = function (up, down) { return ['wwwwwwwwwwww', 'w' + (down ? 'm' : 'f') + 'ffff' + (up ? 'm' : 'f') + 'fSSfw', 'wffffffffffw', 'wfSSffffSSfw', 'wffffffffffw', 'wfffSSSSfffw', 'wffffffffffw', 'wfSSffffSSfw', 'wffffffffffw', 'wwwwwmwwwwww']; };
  const names = ['Reception', 'Mart', 'Names', 'Toys', 'Roof'], look = OW_CHERRY_LOOK;
  const floor = function (n, npcs, objects) {
    const id = 'dept-' + n, m = owRoom(id, 'Dept. Store, ' + (n === 5 ? 'roof' : 'floor ' + n) + ': ' + names[n - 1], { to: 'tide', tx: door[0], ty: door[1] + 1 }, npcs, objects, stairs(n < 5, n > 1));
    m.region = 'tide'; m.palette = OW_TIDE_PALETTE; m.annex = { near: 'tide' }; m.warps = n === 1 ? m.warps : [];
    if (n < 5) m.warps.push({ x: 6, y: 1, to: 'dept-' + (n + 1), tx: 1, ty: 2 });
    if (n > 1) m.warps.push({ x: 1, y: 1, to: 'dept-' + (n - 1), tx: 6, ty: 2 });
    OW_MAPS[id] = m;
  };
  floor(1, [{ id: 'dept-greeter', name: 'Greeter Lia', x: 4, y: 4, face: 'down', look: look(1), lines: ['Welcome to the Dept. Store! Floor 2 is the Mart, floor 3 rates names, floor 4 is all toys, and the roof has the best view in town.'] }], []);
  floor(2, [{ id: 'dept-clerk', kind: 'clerk', name: 'Clerk Pine', x: 3, y: 2, face: 'down', look: look(3), lines: ['Welcome to the Mart!'] }], []);
  floor(3, [{ id: 'dept-rater', kind: 'rater', name: 'Name Rater Ivo', x: 8, y: 4, face: 'down', look: look(4), lines: ['I rate names.'] }], []);
  floor(4, [{ id: 'dept-kid', name: 'Kid Tam', x: 4, y: 6, face: 'down', look: look(0), lines: ['I come here every Saturday to look at the toys!'] }],
    [{ id: 'dept-toy1', type: 'pickup', x: 9, y: 4, give: 'gems' }, { id: 'dept-toy2', type: 'pickup', x: 2, y: 8, give: 'net' }]);
  floor(5, [{ id: 'dept-roof', name: 'Vendor Dot', x: 8, y: 4, face: 'left', look: look(5), lines: ['From up here you can see the whole bay. On a clear day, even the lighthouse.'] }], [{ id: 'dept-roof-gems', type: 'pickup', x: 6, y: 7, give: 'gems' }]);
  owSetTile('tide', door[0], door[1], 'D');
  T.warps.push({ x: door[0], y: door[1], to: 'dept-1', tx: OW_MAPS['dept-1'].warps[0].x, ty: OW_MAPS['dept-1'].warps[0].y - 1 });
})();

// The Underground of Tide Bay (Gold's Goldenrod Underground): a long shop passage under the town, with a bargain counter, reached by a door in one of its closed houses.
(function () {
  const T = OW_MAPS.tide; let door = null;
  for (let y = 12; y < T.rows.length - 3 && !door; y++) { const re = /W{3}/g; let m; while (!door && (m = re.exec(T.rows[y]))) { const x = m.index + 1; if (T.rows[y].indexOf('D') === -1 && /R{3}/.test(T.rows[y - 1]) && ',*'.indexOf(T.rows[y + 1].charAt(x)) !== -1 && T.rows[y].charAt(x) === 'W') door = [x, y]; } }
  if (!door) return;
  const rows = ['wwwwwwwwwwwwwwwwwwww', 'wffffffffffffffffffw', 'wfCCCfffffffffCCCffw', 'wffffffffffffffffffw', 'wffffffffffffffffffw', 'wffffffffffffffffffw', 'wwwwwwwwwwmwwwwwwwww'];
  OW_MAPS['tide-underground'] = Object.assign(owRoom('tide-underground', 'Underground', { to: 'tide', tx: door[0], ty: door[1] + 1 }, [
    { id: 'under-clerk', kind: 'clerk', name: 'Bargain Bea', x: 3, y: 1, face: 'down', look: OW_CHERRY_LOOK(2), lines: ['Welcome to the bargain counter!'] },
    { id: 'under-barber', name: 'Barber Hal', x: 15, y: 1, face: 'down', look: OW_CHERRY_LOOK(4), lines: ['A trim, a shave, and a tale! The Underground has been open since before the tower was built.'] },
    { id: 'under-walker', name: 'Walker Ume', x: 9, y: 4, face: 'right', look: OW_CHERRY_LOOK(1), lines: ['I walk the Underground every morning. It is the only place in town with no wind.'] }
  ], [{ id: 'under-gems', type: 'pickup', x: 17, y: 4, give: 'gems' }, { id: 'under-net', type: 'pickup', x: 1, y: 4, give: 'net' }], rows), { region: 'tide', palette: OW_TIDE_PALETTE, annex: { near: 'tide' } });
  owSetTile('tide', door[0], door[1], 'D');
  T.warps.push({ x: door[0], y: door[1], to: 'tide-underground', tx: OW_MAPS['tide-underground'].warps[0].x, ty: OW_MAPS['tide-underground'].warps[0].y - 1 });
})();

// Towers (Gold's Sprout Tower and Tin Tower): a courtyard with the tower in it, joined to a town by a gap in its edge, and a tower of floors joined by stairs. A sage waits on every floor and the
// top one has an old stone sign that asks questions in a row and pays an Evolution Stone once.
const OW_TOWER_GROUNDS = [
  'TTTTTTTTTTTTTTTT',
  'T,,,,RRRRRR,,,,T',
  'T,TT,RRRRRR,,T,T',
  'T,,,,WWWDWW,*,,T',
  'T,,,,,,,.,,,,,,T',
  'T,,*,,,,.,,~~~,T',
  'T,,,,s*,.,,~~~,T',
  'T,,,,,,,.,,,,,,T',
  '..........,,,,*T',
  'T,TT,,,,,,,,TT,T',
  'T,,,,*,,,,,,,,,T',
  'TTTTTTTTTTTTTTTT'
];
function owTower(d) {
  const mirror = d.hostEdge === 0, gid = d.id + '-grounds', H = OW_MAPS[d.host], doorX = mirror ? 7 : 8, rows = OW_TOWER_GROUNDS.map(function (r) { return mirror ? r.split('').reverse().join('') : r; });
  const stairs = function (up, down) { return ['wwwwwwwwwwww', 'w' + (down ? 'm' : 'f') + 'ffff' + (up ? 'm' : 'f') + 'fSSfw', 'wffffffffffw', 'wfSSffffSSfw', 'wffffffffffw', 'wfffSSSSfffw', 'wffffffffffw', 'wfSSffffSSfw', 'wffffffffffw', 'wwwwwmwwwwww']; };
  OW_MAPS[gid] = { id: gid, name: d.name + ' grounds', region: d.region, start: { x: mirror ? 14 : 1, y: 8 }, palette: H.palette, annex: { near: d.host }, rows: rows,
    warps: [{ x: doorX, y: 3, to: d.id + '-1', tx: 5, ty: 8 }],
    npcs: [{ id: d.id + '-keeper', name: d.keeper, x: mirror ? 10 : 5, y: 5, face: 'down', look: OW_CHERRY_LOOK(d.look), lines: d.groundsLines }],
    objects: [{ id: d.id + '-grounds-gems', type: 'pickup', x: mirror ? 5 : 10, y: 10, give: 'gems' }], trees: {}, signs: {} };
  OW_MAPS[gid].signs[(mirror ? 10 : 5) + ',6'] = d.sign;
  for (let n = 1; n <= d.floors; n++) {
    const id = d.id + '-' + n, top = n === d.floors;
    const m = owRoom(id, d.name + (top ? ', top' : ', floor ' + n), { to: gid, tx: doorX, ty: 4 }, [{ id: id + '-sage', name: d.sages[(n - 1) % d.sages.length], x: 4, y: 4, face: 'down', look: OW_CHERRY_LOOK(d.look + n), lines: d.floorLines[(n - 1) % d.floorLines.length] }],
      n === 2 ? [{ id: id + '-gems', type: 'pickup', x: 9, y: 4, give: 'gems' }] : n === 3 ? [{ id: id + '-net', type: 'pickup', x: 2, y: 8, give: 'net' }] : [], stairs(!top, n > 1));
    m.region = d.region; m.palette = H.palette; m.annex = { near: d.host }; m.warps = n === 1 ? m.warps : [];
    if (!top) m.warps.push({ x: 6, y: 1, to: d.id + '-' + (n + 1), tx: 1, ty: 2 });
    if (n > 1) m.warps.push({ x: 1, y: 1, to: d.id + '-' + (n - 1), tx: 6, ty: 2 });
    if (top) { Object.assign(m.npcs[0], { kind: 'trainer', x: 6, y: 2, face: 'left', win: d.win }); OW_TEAMS[id + '-sage'] = d.team; }
    if (top) { m.rows[6] = m.rows[6].slice(0, 5) + 's' + m.rows[6].slice(6); m.signs['5,6'] = { id: d.id + '-quiz', text: d.quizText, quiz: true, rounds: d.rounds, story: d.id + '-sage', after: id + '-sage', locked: 'The elder beside the stone watches you. Beat them first!' }; }
    OW_MAPS[id] = m;
  }
  OW_STORY.push(d.id + '-sage'); OW_STORY_ITEMS[d.id + '-sage'] = 'stone';
  return owJoin(d.host, d.hostEdge, d.hostRow, gid, 8);
}
[{ id: 'sprout', name: 'Sprout Tower', host: 'meadow', hostEdge: 15, hostRow: 14, region: 'meadow', floors: 3, keeper: 'Monk Sen', look: 2, rounds: 3, team: [['hedwig', 14], ['bunny', 13]], win: ['A fine battle. The stone is yours to try.'],
  groundsLines: ['The tower sways in the wind, they say. Come in and see for yourself.', 'Each floor has a sage. The top one has a puzzle.'], sign: 'Sprout Tower. Three floors of quiet. Visitors welcome.',
  sages: ['Sage Bo', 'Sage Wen', 'Elder Li'], floorLines: [['Welcome. Walk softly on the stairs.'], ['The tower sways a little in the wind. Do not be alarmed.'], ['Welcome to the top. The old stone beside me asks questions. Three right in a row and it gives up a gift.']],
  quizText: 'An old stone with numbers on it. Answer three questions in a row and it gives up a gift.' },
 { id: 'tin', name: 'Tin Tower', host: 'grove', hostEdge: 0, hostRow: 20, region: 'grove', floors: 5, keeper: 'Monk Rei', look: 4, rounds: 5, team: [['phoenix', 32], ['pegasus', 31], ['griffin', 32]], win: ['Well fought. Go on, try the stone.'],
  groundsLines: ['The Tin Tower rises five floors. The view from the top is worth every stair.', 'Sages watch over each floor.'], sign: 'Tin Tower. Five floors. Mind the stairs.',
  sages: ['Sage Hu', 'Sage Mei', 'Sage Tao', 'Sage Ren', 'Elder Quan'], floorLines: [['A long climb ahead. Rest when you need to.'], ['Every floor has its own quiet.'], ['Halfway. The tower is older than the town.'], ['Nearly there. One more flight.'], ['The top! The old stone beside me asks five questions in a row. It is a hard one, but the gift is good.']],
  quizText: 'An old stone with numbers on it. Answer five questions in a row and it gives up a gift.' }].forEach(owTower);

// The red fish of the Lake of Rage (Gold's red Gyarados): once, with the Fishing Rod, Fisher Rin lets you cast into the middle of the lake. A shiny shark bites, at a level well above the lake.
OW_STORY.push('rage-fish');
OW_SERVICES.lakefish = function (npc) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0), done = state.overworld.story.indexOf('rage-fish') !== -1;
  if (done) { openTalk({ name: npc.name, art: art, lines: ['The red fish is gone from the lake. I will wait for the next one.'] }); return; }
  if (!hasKeyItem('fishing-rod')) { openTalk({ name: npc.name, art: art, lines: npc.lines.concat(['You need a Fishing Rod to cast into the deep water. Fisher Gil in Meadow Town gives one.']) }); return; }
  openTalk({ name: npc.name, art: art, lines: ['Cast into the middle, where the water is darkest...', 'Something big is pulling on the line!'], onClose: function () { owStoryDone('rage-fish'); abStart({ kind: 'wild', fished: true, foes: [{ id: 'shark', level: 44, shiny: true }] }); } });
};
Object.assign(OW_MAPS['lake-of-rage'].npcs.find(function (n) { return n.id === 'rage-fisher'; }), { kind: 'lakefish' });

// Sleeping buddies in the Slowpoke Well (Gold's dozing Slowpoke): three buddies asleep on the shore. A tune on the Gizmo radio wakes one at a time and sends it on its way.
['well-nap1', 'well-nap2', 'well-nap3'].forEach(function (id, i) {
  OW_STORY.push(id + '-woken');
  OW_MAPS['slowpoke-well'].npcs.push({ id: id, kind: 'sleeper', name: 'Sleeping buddy', x: [4, 15, 14][i], y: [9, 9, 11][i], face: 'down', story: id + '-woken', vanish: true, look: OW_CHERRY_LOOK(i + 1), lines: ['A buddy is fast asleep. It is far too peaceful to disturb. A lively tune might wake it.'] });
});

// The Burned Tower (Gold's burned-out tower in Ecruteak City): a scorched courtyard beside the Tin Tower, a ruined ground floor and upper floor, and a cellar where three beasts sleep. Reached from the Tin Tower's courtyard.
(function () {
  const g = []; for (let y = 0; y < 12; y++) { g.push([]); for (let x = 0; x < 16; x++) g[y].push(y === 0 || y === 11 || x === 0 || x === 15 ? 'T' : '_'); }
  const put = function (x, y, w, h, c) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy][xx] = c; };
  put(5, 1, 6, 2, 'R'); put(5, 3, 6, 1, 'W'); g[3][8] = 'D';
  for (let y = 4; y < 8; y++) g[y][8] = '.';
  for (let x = 6; x < 16; x++) g[8][x] = '.';
  [[2, 2], [3, 2], [12, 6], [13, 6], [3, 9], [12, 9], [2, 5]].forEach(function (p) { g[p[1]][p[0]] = '#'; });
  g[6][4] = ',';
  const rows = g.map(function (r) { return r.join(''); });
  OW_MAPS['burned-grounds'] = { id: 'burned-grounds', name: 'Burned Tower grounds', region: 'grove', start: { x: 14, y: 8 }, palette: OW_MAPS.grove.palette, annex: { near: 'grove' }, rows: rows,
    warps: [{ x: 8, y: 3, to: 'burned-1', tx: 5, ty: 8 }],
    npcs: [{ id: 'burned-watcher', name: 'Watcher Mio', x: 5, y: 6, face: 'right', look: OW_CHERRY_LOOK(3), lines: ['A fire took the tower long ago. They say three beasts live in the cellar, asleep since the flames.', 'Leave them be, and be careful on the old floors.'] }],
    objects: [{ id: 'burned-gems', type: 'pickup', x: 4, y: 6, give: 'gems' }], trees: {}, signs: { '9,6': 'Burned Tower. The floors are old and the cellar is deep. Visitors take care.' } };
  OW_MAPS['burned-grounds'].rows[6] = OW_MAPS['burned-grounds'].rows[6].slice(0, 9) + 's' + OW_MAPS['burned-grounds'].rows[6].slice(10);
  const stairs = function (up, down) { return ['wwwwwwwwwwww', 'w' + (down ? 'm' : 'f') + 'ffff' + (up ? 'm' : 'f') + 'fSSfw', 'wffffffffffw', 'wfSSffffSSfw', 'wffffffffffw', 'wfffSSSSfffw', 'wffffffffffw', 'wfSSffffSSfw', 'wffffffffffw', 'wwwwwmwwwwww']; };
  const dress = function (m, near) { m.region = 'grove'; m.palette = OW_MAPS.grove.palette; m.annex = { near: near }; return m; };
  const f1 = dress(owRoom('burned-1', 'Burned Tower, ground floor', { to: 'burned-grounds', tx: 8, ty: 4 }, [{ id: 'burned-f1-sage', name: 'Sage Ko', x: 4, y: 4, face: 'down', look: OW_CHERRY_LOOK(1), lines: ['Black beams overhead. The floor is thin in places.'] }], [], stairs(true, false)), 'grove');
  f1.warps.push({ x: 6, y: 1, to: 'burned-2', tx: 1, ty: 2 });
  f1.rows[7] = f1.rows[7].slice(0, 9) + 'u' + f1.rows[7].slice(10); f1.warps.push({ x: 9, y: 7, to: 'burned-cellar', tx: 5, ty: 2 });      // a hole in the floor leads down
  const f2 = dress(owRoom('burned-2', 'Burned Tower, upper floor', { to: 'burned-grounds', tx: 8, ty: 4 }, [{ id: 'burned-f2-sage', name: 'Sage Ume', x: 6, y: 4, face: 'left', look: OW_CHERRY_LOOK(5), lines: ['From here you can see the Tin Tower. They were once one tower.'] }], [{ id: 'burned-relic', type: 'pickup', x: 9, y: 4, give: 'net' }], stairs(false, true)), 'grove');
  f2.warps = [{ x: 1, y: 1, to: 'burned-1', tx: 6, ty: 2 }];
  const cellar = dress(owRoom('burned-cellar', 'Burned Tower cellar', { to: 'burned-1', tx: 9, ty: 6 }, [], [{ id: 'burned-cellar-gems', type: 'pickup', x: 9, y: 4, give: 'gems' }]), 'grove');
  cellar.dark = true; cellar.warps = [{ x: 5, y: 9, to: 'burned-1', tx: 9, ty: 6 }];
  ['burned-beast1', 'burned-beast2', 'burned-beast3'].forEach(function (id, i) { OW_STORY.push(id + '-woken'); cellar.npcs.push({ id: id, kind: 'sleeper', name: 'Sleeping beast', x: [2, 5, 8][i], y: 5, face: 'down', story: id + '-woken', vanish: true, look: OW_CHERRY_LOOK(i + 2), lines: ['A great beast sleeps here, as it has for years. A lively tune might stir it.'] }); });
  OW_MAPS['burned-1'] = f1; OW_MAPS['burned-2'] = f2; OW_MAPS['burned-cellar'] = cellar;
  owJoin('tin-grounds', 0, 5, 'burned-grounds', 8);
})();

// Tide Bay East (the other half of Gold's big city): a second screen of the hub across a gap in its east edge, with a Bike Shop, a Flower Shop, a Fan Club and a house along one street.
OW_MAPS['tide-east'] = {
  id: 'tide-east', name: 'Tide Bay East', region: 'tide', start: { x: 1, y: 9 }, palette: OW_MAPS.tide.palette, annex: { near: 'tide' },
  rows: [
    'TTTTTTTTTTTTTTTT',
    'T,,,,,,,,,,,,,,T',
    'T,RRRRRTTRRRRR,T',
    'T,RRRRRT,RRRRR,T',
    'T,WWDWW,,WWDWW,T',
    'T,,,.,,,a,,.,,,T',
    'T,,,.,,,,,,.,,,T',
    'T*,,.,,,,,,.,,*T',
    'T,,,.,,,,,,.,,,T',
    '...............T',
    'T,,,,,,,,,,,,,*T',
    'T,,,,,,,,,,,,,,T',
    'T,RRRRR,,,RRRR,T',
    'T,RRRRR,,,RRRR,T',
    'T,WWDWW,,,WDWW,T',
    'T,,,,,,,,,,,,,,T',
    'T,,,,,,~~~,,,,,T',
    'T*,,,,,~~~,,,*,T',
    'T,,,,,,,*,,,,,,T',
    'TTTTTTTTTTTTTTTT'
  ],
  warps: [{ x: 4, y: 4, to: 'tide-bikes', tx: 5, ty: 8 }, { x: 11, y: 4, to: 'tide-flowers', tx: 5, ty: 8 }, { x: 4, y: 14, to: 'tide-fans', tx: 5, ty: 8 }, { x: 11, y: 14, to: 'tide-east-house', tx: 5, ty: 8 }],
  npcs: [{ id: 'teast-walker', name: 'Walker Bo', x: 9, y: 8, face: 'down', look: OW_CHERRY_LOOK(3), lines: ['This half of the city is quieter. The big shops are across the gap, in the west.'] },
    { id: 'teast-kid', name: 'Kid Ren', x: 6, y: 15, face: 'right', look: OW_CHERRY_LOOK(0), lines: ['Our pond has the loudest frogs in town.'] }],
  objects: [{ id: 'teast-gems', type: 'pickup', x: 13, y: 18, give: 'gems' }], trees: {}, signs: { '8,6': 'Tide Bay East. Bike Shop, Flower Shop and Fan Club. The Dept. Store is back west.' }
};
OW_MAPS['tide-east'].rows[6] = OW_MAPS['tide-east'].rows[6].slice(0, 8) + 's' + OW_MAPS['tide-east'].rows[6].slice(9);
[['tide-bikes', 'Bike Shop', 4, 4, { id: 'teast-bikes-seller', name: 'Seller Ria', lines: ['Bicycles! The best ones are far too dear for a window shopper, but look all you like.'] }, { id: 'tide-bikes-net', give: 'net' }],
 ['tide-flowers', 'Flower Shop', 11, 4, { id: 'teast-flower-florist', name: 'Florist Lily', lines: ['Flowers for every day of the week. The berries out the back are free to anyone who asks nicely.'] }, { id: 'tide-flowers-berries', give: 'berry' }],
 ['tide-fans', 'Fan Club', 4, 14, { id: 'teast-fans-chair', name: 'Chairman Pell', lines: ['Welcome to the Buddy Fan Club! I could talk about my favourite buddy for six hours. Do sit down.', 'It is the one that sleeps in the sun. Does not sound like much, but it is magnificent.'] }, { id: 'tide-fans-gems', give: 'gems' }],
 ['tide-east-house', 'Tide Bay house', 11, 14, { id: 'teast-house-marn', name: 'Old Marn', lines: ['I have lived on this street since it was a path with one lamp.'] }, null]].forEach(function (r, i) {
  const npc = Object.assign({ x: 4, y: 2, face: 'down', look: OW_CHERRY_LOOK(i + 1) }, r[4]);
  OW_MAPS[r[0]] = Object.assign(owRoom(r[0], r[1], { to: 'tide-east', tx: r[2], ty: r[3] + 1 }, [npc], r[5] ? [Object.assign({ type: 'pickup', x: 1, y: 4 }, r[5])] : []), { region: 'tide', palette: OW_TIDE_PALETTE, annex: { near: 'tide' } });
});
owJoin('tide', 15, 20, 'tide-east', 9);
