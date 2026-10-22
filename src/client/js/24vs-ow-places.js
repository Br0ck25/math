// =====================================================================
//  PLACES (Gold's villages, lakes and ruins that are not gym towns): hand-drawn maps joined to a town or route by a gap in its edge, laid on Gold's graph (docs/gold-world-graph.md).
//  owJoin opens the host's gap (the host's own tile row and a way in to ground its entrance reaches) and warps both ways; a place is a shortcut to nowhere you could not reach, so it needs no key.
// =====================================================================
// Joins `host` (its east edge when hostEdge is 15, its west edge when 0) at hostRow to `place` (the opposite edge) at placeRow.
function owJoin(host, hostEdge, hostRow, place, placeRow) {
  if (!owOpenGap(host, hostEdge, hostRow)) return false;
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
