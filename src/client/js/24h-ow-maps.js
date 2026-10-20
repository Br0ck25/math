// =====================================================================
//  ADVENTURE MAPS (plain data; the engine is 24g-ow-engine.js, people are 24k-ow-people.js). One character per tile, every row of a map the same width (tests check it).
//  A warp is a tile that sends the hero to (tx, ty) of another map: that spot must be walkable and not a warp itself. Doors are walkable tiles with a warp.
//  `signs` maps "x,y" to the words of a sign tile: a string, or { id, text, quiz: true } for a math sign. `npcs` stand still and are solid.
//  `objects` are pickups (sparkles) that can be taken once. Tile pictures are art/world/<t>.svg (scripts/world-art.mjs). `grass` tiles can start a wild fight.
//  `palette` recolours a map (the --w-* variables of the art). Ids of npcs, pickups and quiz signs are saved, so never rename one.
// =====================================================================
const OW_TILES = {
  ',': { t: 't-grass' },
  '"': { t: 't-tall-grass', grass: true },
  '.': { t: 't-path' },
  '*': { t: 't-flower' },
  '_': { t: 't-sand' },
  '~': { t: 't-water', solid: true },
  'T': { t: 't-tree', solid: true },
  '#': { t: 't-rock', solid: true },
  '=': { t: 't-fence', solid: true },
  'b': { t: 't-bush', solid: true },
  's': { t: 't-sign', solid: true },
  'R': { t: 't-roof', solid: true },
  'W': { t: 't-house-wall', solid: true },
  'D': { t: 't-door' },
  'N': { t: 't-center-sign', solid: true },
  'K': { t: 't-mart-sign', solid: true },
  'f': { t: 't-floor' },
  'w': { t: 't-wall', solid: true },
  'C': { t: 't-counter', solid: true },
  'S': { t: 't-shelf', solid: true },
  'r': { t: 't-rug' },
  'm': { t: 't-mat' }
};
// A small room: the mat in the bottom wall is the way out (see owRoom()).
const OW_ROOM_ROWS = ['wwwwwwww', 'wSffffSw', 'wffffffw', 'wfrrrrfw', 'wffffffw', 'wffffffw', 'wwwmwwww'];
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
      'T,,*,,,..,RRR,,T',
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
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,"",..,,**,T',
      'T,,"",..,,**,T',
      'T,,,,,..,,,,,T',
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
    npcs: [],
    objects: [{ id: 'route1-berries', type: 'pickup', x: 11, y: 9, give: 'berry' }],
    signs: { }
  },
  meadow: {
    id: 'meadow', name: 'Meadow Town', region: 'meadow', start: { x: 7, y: 13 },
    rows: [
      'TTTTTTTTTTTTTTTT',
      'T,,,,,,,,,,,,,,T',
      'T,RRRR,..,RRRR,T',
      'T,RRRR,..,RRRR,T',
      'T,WNDW,..,WKDW,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'T,RRR,,..,,,,*,T',
      'T,RRR,,..,,,,,,T',
      'T,WDW,,..,s,,,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'T,,*,,,..,,,s,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'TTTTTTT..TTTTTTT'
    ],
    warps: [
      { x: 7, y: 15, to: 'route1', tx: 6, ty: 1 }, { x: 8, y: 15, to: 'route1', tx: 7, ty: 1 },
      { x: 3, y: 9, to: 'meadow-house', tx: 3, ty: 5 }, { x: 4, y: 4, to: 'meadow-center', tx: 3, ty: 5 }, { x: 12, y: 4, to: 'meadow-mart', tx: 3, ty: 5 }
    ],
    npcs: [
      { id: 'meadow-guide', name: 'Guide Ivy', x: 6, y: 11, face: 'right', look: { skin: 2, hair: 5, outfit: 2, style: 1 },
        lines: ['Welcome to Meadow Town! I show new explorers around.', 'The Buddy Center has a heart on its sign. Resting buddies get better there, and your first rest each day is free.', 'The Mart has a coin on its sign. It sells more things as you win badges.', 'A gym will stand here too. Gyms ask a buddy to be a little stronger first, so train in the tall grass!'] }
    ],
    objects: [
      { id: 'meadow-gem', type: 'pickup', x: 13, y: 7, give: 'gems' },
      { id: 'meadow-ore', type: 'pickup', x: 2, y: 13, give: 'ore' }
    ],
    signs: {
      '10,9': 'Meadow Gym: not open yet. Come back when your buddies are stronger!',
      '12,12': { id: 'meadow-quiz', text: 'Town quiz! Answer one question.', quiz: true }
    },
    palette: { roof: '#4F8FE0', roofD: '#2F6CC0' }
  },
  'meadow-center': owRoom('meadow-center', 'Buddy Center', { to: 'meadow', tx: 4, ty: 5 }, [
    { id: 'meadow-nurse', kind: 'nurse', name: 'Nurse Joy', x: 3, y: 1, face: 'down', look: { skin: 1, hair: 7, outfit: 6, style: 3 }, lines: ['Welcome to the Buddy Center!'] }
  ], [], ['wwwwwwww', 'wfffffSw', 'wCCfCCCw', 'wffffffw', 'wffffffw', 'wfrrrrfw', 'wwwmwwww']),
  'meadow-mart': owRoom('meadow-mart', 'Mart', { to: 'meadow', tx: 12, ty: 5 }, [
    { id: 'meadow-clerk', kind: 'clerk', name: 'Clerk Moss', x: 3, y: 2, face: 'down', look: { skin: 3, hair: 3, outfit: 3, style: 0 }, lines: ['Welcome to the Mart!'] }
  ], [], ['wwwwwwww', 'wSSSSSSw', 'wffffffw', 'wCCfCCCw', 'wffffffw', 'wffffffw', 'wwwmwwww']),
  'meadow-house': owRoom('meadow-house', 'Meadow House', { to: 'meadow', tx: 3, ty: 10 }, [
    { id: 'meadow-gran', name: 'Gran', x: 4, y: 2, face: 'down', look: { skin: 0, hair: 4, outfit: 5, style: 1 },
      lines: ['Come in, come in! I love visitors.', 'Buddies get stronger when you answer fast and answer right.', 'Wild buddies in the tall grass have a hard time hiding from you.'] }
  ], [{ id: 'meadow-house-net', type: 'pickup', x: 1, y: 4, give: 'net' }])
};
const OW_START = { map: 'hollow' };
// Everything the save may name: npc ids, pickup ids and quiz sign ids across all maps.
function owIds(kind) {
  const ids = [];
  Object.keys(OW_MAPS).forEach(function (k) {
    const m = OW_MAPS[k];
    if (kind === 'pickup') (m.objects || []).forEach(function (o) { if (o.type === 'pickup') ids.push(o.id); });
    else if (kind === 'sign') Object.keys(m.signs || {}).forEach(function (p) { if (m.signs[p].quiz) ids.push(m.signs[p].id); });
    else (m.npcs || []).forEach(function (n) { ids.push(n.id); });
  });
  return ids;
}
