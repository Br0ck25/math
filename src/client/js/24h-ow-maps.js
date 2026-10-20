// =====================================================================
//  ADVENTURE MAPS (plain data; the engine is 24g-ow-engine.js, people are 24k-ow-people.js). One character per tile, every row of a map the same width (tests check it).
//  A warp is a tile that sends the hero to (tx, ty) of another map: that spot must be walkable and not a warp itself. Doors are walkable tiles with a warp.
//  `signs` maps "x,y" to the words of a sign tile: a string, or { id, text, quiz: true } for a math sign. `npcs` stand still and are solid.
//  `roads` maps "x,y" of a road barrier tile ('x') to the gym badge that opens it (or any later one): the story key to the next land.
//  An npc may also have: `needs` (a badge id, or 'champion': it is only there once you hold it), `vanish` (gone once beaten, or once its `story` scene is done),
//  `levelBonus` (a harder trainer), `kind: 'scene'` (talks once and marks its `story`), `kind: 'boss'` (a boss-list fight) and `story` + `reward` (a one-time prize).
//  `gyms` maps "x,y" of a gym door tile ('G') to a land id of REGIONS: stepping on it offers that land's gym.
//  `trees` maps "x,y" of a 'Y' tile to a tree id: it can be shaken once a day for a rare buddy. Water tiles ('~') can be fished once you hold the Fishing Rod. Gate letters are in OW_GATE_CHARS.
//  `objects` are pickups (sparkles) that can be taken once. Tile pictures are art/world/<t>.svg (scripts/world-art.mjs). `grass` tiles can start a wild fight.
//  `palette` recolours a map (the --w-* variables of the art). Ids of npcs, pickups and quiz signs are saved, so never rename one.
// =====================================================================
// The charms: each opens one kind of gate on the map and comes with a gym badge (a charm is never stored: you have it while you hold the badge, so old saves have theirs).
// A gate blocks only a side path (extra goods, a rare patch), never the main road. A gate tile is drawn `closed` until its charm is held, then `open`.
const OW_GATES = {
  trim:   { badge: 'meadow',  name: 'Trim Charm',   text: 'Clears little thorny bushes.',          closed: 't-gate-trim',   open: 't-open-trim',   hint: 'Thorny little bushes block the way. A Trim Charm from the Sunny Meadow Gym could clear them!' },
  steam:  { badge: 'ember',   name: 'Steam Boots',  text: 'Walk safely over hot steam vents.',    closed: 't-gate-steam',  open: 't-open-steam',  hint: 'Hot steam shoots out of the ground here. Steam Boots from the Ember Hills Gym would keep your feet safe!' },
  water:  { badge: 'tide',    name: 'Water Steps',  text: 'Step across deep water on stones.',    closed: 't-gate-water',  open: 't-open-water',  hint: 'The water is too deep to cross. Water Steps from the Tide Bay Gym would make stepping stones!' },
  vines:  { badge: 'grove',   name: 'Vine Gloves',  text: 'Climb tall walls of vines.',           closed: 't-gate-vines',  open: 't-open-vines',  hint: 'A wall of vines is in the way. Vine Gloves from the Leaf Grove Gym would help you climb!' },
  switch: { badge: 'volt',    name: 'Switch Key',   text: 'Flips switches that lower barriers.',  closed: 't-gate-switch', open: 't-open-switch', hint: 'A barrier blocks the path. A Switch Key from the Volt Valley Gym could lower it!' },
  lamp:   { badge: 'gloom',   name: 'Night Lamp',   text: 'Lights up thick fog.',                 closed: 't-gate-lamp',   open: 't-grass',       hint: 'The fog is too thick to see through. A Night Lamp from the Gloom Marsh Gym would light the way!' },
  stars:  { badge: 'mystic',  name: 'Star Steps',   text: 'Walk on floating stars.',              closed: 't-gate-stars',  open: 't-open-stars',  hint: 'There is a gap in the sky path. Star Steps from the Mystic Peak Gym would carry you across!' }
};
const OW_GATE_CHARS = { g: 'trim', h: 'steam', j: 'water', k: 'vines', l: 'switch', q: 'lamp', z: 'stars' };
const OW_TILES = {
  ',': { t: 't-grass' },
  '"': { t: 't-tall-grass', grass: true },
  '.': { t: 't-path' },
  '*': { t: 't-flower' },
  '_': { t: 't-sand' },
  '~': { t: 't-water', solid: true, water: true },
  'Y': { t: 't-tree-shake', solid: true },
  'T': { t: 't-tree', solid: true },
  '#': { t: 't-rock', solid: true },
  '=': { t: 't-fence', solid: true },
  'b': { t: 't-bush', solid: true },
  's': { t: 't-sign', solid: true },
  'R': { t: 't-roof', solid: true },
  'W': { t: 't-house-wall', solid: true },
  'D': { t: 't-door' },
  'G': { t: 't-gym-door' },
  'N': { t: 't-center-sign', solid: true },
  'K': { t: 't-mart-sign', solid: true },
  'x': { t: 't-gate-road', solid: true, road: true },
  'f': { t: 't-floor' },
  'w': { t: 't-wall', solid: true },
  'C': { t: 't-counter', solid: true },
  'S': { t: 't-shelf', solid: true },
  'r': { t: 't-rug' },
  'm': { t: 't-mat' }
};
// A small room: the mat in the bottom wall is the way out (see owRoom()).
Object.keys(OW_GATE_CHARS).forEach(function (c) { OW_TILES[c] = { t: OW_GATES[OW_GATE_CHARS[c]].closed, solid: true, gate: OW_GATE_CHARS[c] }; });
const OW_ROOM_ROWS = ['wwwwwwww', 'wSffffSw', 'wffffffw', 'wfrrrrfw', 'wffffffw', 'wffffffw', 'wwwmwwww'];
const OW_CENTER_ROWS = ['wwwwwwww', 'wfffffSw', 'wCCfCCCw', 'wffffffw', 'wffffffw', 'wfrrrrfw', 'wwwmwwww'];
const OW_MART_ROWS = ['wwwwwwww', 'wSSSSSSw', 'wffffffw', 'wCCfCCCw', 'wffffffw', 'wffffffw', 'wwwmwwww'];
function owRoom(id, name, exit, npcs, objects, rows) {
  return { id: id, name: name, region: 'meadow', start: { x: 3, y: 5 }, rows: rows || OW_ROOM_ROWS, warps: [{ x: 3, y: 6, to: exit.to, tx: exit.tx, ty: exit.ty }], npcs: npcs || [], objects: objects || [], signs: {} };
}
const OW_MAPS = {
  hollow: {
    id: 'hollow', name: 'Cozy Hollow', region: 'meadow', start: { x: 7, y: 9 },
    rows: [
      'TTTTTTT..TTTTTTT',
      'T,,,,,,..,,,,,,T',
      'T,RRRR,..,,**,,T',
      'T,RRRR,..,,**,,T',
      'T,WWDW,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'T,,*,,,..,RRR,YT',
      'T,,,,,,..,RRR,,T',
      'T,,,,,,..,WDW,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,s,,..,,,,*,T',
      'T,,,,,,..,,,,,,T',
      'TTTTTTTTTTTTTTTT'
    ],
    warps: [
      { x: 7, y: 0, to: 'route1', tx: 6, ty: 22 }, { x: 8, y: 0, to: 'route1', tx: 7, ty: 22 },
      { x: 4, y: 4, to: 'hollow-home', tx: 3, ty: 5 }, { x: 11, y: 8, to: 'hollow-house', tx: 3, ty: 5 }
    ],
    npcs: [],
    objects: [],
    trees: { '14,6': 'hollow-tree' },
    signs: { '4,10': 'Cozy Hollow. Follow the path north to Route 1!' }
  },
  'hollow-home': owRoom('hollow-home', 'Home', { to: 'hollow', tx: 4, ty: 5 }, [
    { id: 'hollow-mum', name: 'Mum', x: 4, y: 2, face: 'down', look: { skin: 1, hair: 2, outfit: 6, style: 3 },
      lines: ['Good morning! Did you sleep well?', 'The tall grass on Route 1 hides wild buddies. Win a fight there and you may catch one!', 'Take your time. Your buddies will be right beside you.'] }
  ], [{ id: 'hollow-home-gem', type: 'pickup', x: 6, y: 4, give: 'gems' }]),
  'hollow-house': owRoom('hollow-house', 'Neighbour', { to: 'hollow', tx: 11, ty: 9 }, [
    { id: 'hollow-kid', name: 'Pip', x: 2, y: 3, face: 'right', look: { skin: 3, hair: 4, outfit: 3, style: 2 },
      lines: ['Hi! I read every sign I find.', 'Some signs ask a math question. A right answer can pay a few gems, once a day.', 'A wrong answer costs nothing. You can try again!'] }
  ], []),
  route1: {
    id: 'route1', name: 'Route 1', region: 'meadow', start: { x: 6, y: 22 },
    rows: [
      'TTTTTT..TTTTTT',
      'T,,T,,..,,,,,T',
      'T,,g,,..,,,,,T',
      'TTT"",..,,**,T',
      'T,,"",..,,**,T',
      'T,,,,,..,,,,YT',
      'T,,,,,..""",,T',
      'T,,,,,..""",,T',
      'T,,,,,..""",,T',
      'T,,,,,..,,,,,T',
      'T""",,..,,,,,T',
      'T""",,..,,,,,T',
      'T""",,..,,b,,T',
      'T,,,,,..,,,,,T',
      'T,,*,,..,,,,,T',
      'T,,,,,..""",,T',
      'T,,,,,..""",,T',
      'T,,,,,..,,,,,T',
      'T,"",,..,,,,,T',
      'T,"",,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'TTTTTT..TTTTTT'
    ],
    warps: [
      { x: 6, y: 23, to: 'hollow', tx: 7, ty: 1 }, { x: 7, y: 23, to: 'hollow', tx: 8, ty: 1 },
      { x: 6, y: 0, to: 'meadow', tx: 7, ty: 14 }, { x: 7, y: 0, to: 'meadow', tx: 8, ty: 14 }
    ],
    npcs: [
      { id: 'route1-pia', kind: 'trainer', name: 'Scout Pia', x: 3, y: 9, face: 'right', look: { skin: 1, hair: 2, outfit: 2, style: 3 },
        lines: ['I spotted you! Let us see how your buddy does.'], win: ['Great battle! You and your buddy work well together.'] },
      { id: 'route1-leo', kind: 'trainer', name: 'Kid Leo', x: 10, y: 14, face: 'left', look: { skin: 4, hair: 0, outfit: 3, style: 2 },
        lines: ['Hey, you there! I just caught a new buddy. Want to battle?'], win: ['Wow, you are quick! I need more practice.'] }
    ],
    objects: [
      { id: 'route1-berries', type: 'pickup', x: 11, y: 9, give: 'berry' },
      { id: 'route1-nook-gem', type: 'pickup', x: 1, y: 1, give: 'gems' },
      { id: 'route1-nook-net', type: 'pickup', x: 2, y: 1, give: 'net' }
    ],
    trees: { '12,5': 'route1-tree' },
    signs: { }
  },
  meadow: {
    id: 'meadow', name: 'Meadow Town', region: 'meadow', start: { x: 7, y: 13 },
    rows: [
      'TTTTTTTxTTTTTTTT',
      'T,,,,,,,,,,,,,,T',
      'T,RRRR,..,RRRR,T',
      'T,RRRR,..,RRRR,T',
      'T,WNDW,..,WKDW,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'T,RRR,,..,RRR,,T',
      'T,RRR,,..,RRR,,T',
      'T,WDW,,..,WGW,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'T,,*,,,..,,,s,,T',
      'T,,,,,,..,,,,~~T',
      'T,,,,,,..,,,,~~T',
      'TTTTTTT..TTTTTTT'
    ],
    warps: [
      { x: 7, y: 15, to: 'route1', tx: 6, ty: 1 }, { x: 8, y: 15, to: 'route1', tx: 7, ty: 1 },
      { x: 7, y: 0, to: 'route2', tx: 6, ty: 22 },
      { x: 3, y: 9, to: 'meadow-house', tx: 3, ty: 5 }, { x: 4, y: 4, to: 'meadow-center', tx: 3, ty: 5 }, { x: 12, y: 4, to: 'meadow-mart', tx: 3, ty: 5 }
    ],
    npcs: [
      { id: 'meadow-guide', name: 'Guide Ivy', x: 6, y: 11, face: 'right', look: { skin: 2, hair: 5, outfit: 2, style: 1 },
        lines: ['Welcome to Meadow Town! I show new explorers around.', 'The Buddy Center has a heart on its sign. Resting buddies get better there, and your first rest each day is free.', 'The Mart has a coin on its sign. It sells more things as you win badges.', 'The gym on the right is the Meadow Gym. It is the first one, so step through its door when you feel ready!', 'The road north to Ember Hills opens when you win the Meadow Badge.'] }
      ,
      { id: 'meadow-fisher', kind: 'gift', gift: 'fishing-rod', name: 'Fisher Gil', x: 11, y: 13, face: 'right', look: { skin: 2, hair: 1, outfit: 5, style: 0 },
        lines: ['Ahoy! The pond here is full of water buddies.', 'I am too old to chase them. Take my old Fishing Rod!'],
        after: ['Walk up to the water and tap it to fish.', 'Sometimes nothing bites. Be patient!'] }
    ],
    objects: [
      { id: 'meadow-gem', type: 'pickup', x: 13, y: 7, give: 'gems' },
      { id: 'meadow-ore', type: 'pickup', x: 2, y: 13, give: 'ore' }
    ],
    signs: {
      '12,12': { id: 'meadow-quiz', text: 'Town quiz! Answer one question.', quiz: true }
    },
    gyms: { '11,9': 'meadow' },
    roads: { '7,0': 'meadow' },
    palette: { roof: '#4F8FE0', roofD: '#2F6CC0' }
  },
  'meadow-center': owRoom('meadow-center', 'Buddy Center', { to: 'meadow', tx: 4, ty: 5 }, [
    { id: 'meadow-nurse', kind: 'nurse', name: 'Nurse Joy', x: 3, y: 1, face: 'down', look: { skin: 1, hair: 7, outfit: 6, style: 3 }, lines: ['Welcome to the Buddy Center!'] }
  ], [], OW_CENTER_ROWS),
  'meadow-mart': owRoom('meadow-mart', 'Mart', { to: 'meadow', tx: 12, ty: 5 }, [
    { id: 'meadow-clerk', kind: 'clerk', name: 'Clerk Moss', x: 3, y: 2, face: 'down', look: { skin: 3, hair: 3, outfit: 3, style: 0 }, lines: ['Welcome to the Mart!'] }
  ], [], OW_MART_ROWS),
  'meadow-house': owRoom('meadow-house', 'Meadow House', { to: 'meadow', tx: 3, ty: 10 }, [
    { id: 'meadow-gran', name: 'Gran', x: 4, y: 2, face: 'down', look: { skin: 0, hair: 4, outfit: 5, style: 1 },
      lines: ['Come in, come in! I love visitors.', 'Buddies get stronger when you answer fast and answer right.', 'Wild buddies in the tall grass have a hard time hiding from you.'] }
  ], [{ id: 'meadow-house-net', type: 'pickup', x: 1, y: 4, give: 'net' }])
};
const OW_START = { map: 'hollow' };
// The lands that have a town on the map, in story order (each land's file adds its own row): the gym land, its town map, the route that leads in,
// its Buddy Center, Mart and house, the charm it gives, and the goods in its side nook. Generic tests walk this table.
const OW_LANDS = [
  { land: 'meadow', town: 'meadow', routeIn: 'route1', center: 'meadow-center', mart: 'meadow-mart', house: 'meadow-house', charm: 'trim', nook: [] }
];
// The towns the Gizmo can travel to once the hero has stood in them: Cozy Hollow, then each land's town.
function owTowns() { return [OW_START.map].concat(OW_LANDS.map(function (l) { return l.town; })); }
// The story beats that are saved once done (state.overworld.story): the Scramblers' three schemes and Riley's reveal.
const OW_STORY = ['tide-ferry', 'volt-blackout', 'gloom-scramblers', 'riley-reveal'];
// The names of the trainers on the map (a save may keep one as the current foe).
function owTrainerNames() {
  const names = [];
  Object.keys(OW_MAPS).forEach(function (k) { (OW_MAPS[k].npcs || []).forEach(function (n) { if (n.kind === 'trainer') names.push(n.name); }); });
  return names;
}
// Everything the save may name: npc ids, pickup ids and quiz sign ids across all maps.
function owIds(kind) {
  const ids = [];
  Object.keys(OW_MAPS).forEach(function (k) {
    const m = OW_MAPS[k];
    if (kind === 'pickup') (m.objects || []).forEach(function (o) { if (o.type === 'pickup') ids.push(o.id); });
    else if (kind === 'sign') Object.keys(m.signs || {}).forEach(function (p) { if (m.signs[p].quiz) ids.push(m.signs[p].id); });
    else if (kind === 'tree') Object.keys(m.trees || {}).forEach(function (p) { ids.push(m.trees[p]); });
    else if (kind === 'story') return;
    else (m.npcs || []).forEach(function (n) { if (kind !== 'trainer' || n.kind === 'trainer' || n.kind === 'boss') ids.push(n.id); });
  });
  return kind === 'story' ? OW_STORY.slice() : ids;
}
