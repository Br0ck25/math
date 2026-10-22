// =====================================================================
//  LAND PASS: Gloom Marsh. Route 6 leads in from Volt Valley (the road opens with the Volt Badge); the town has a Buddy Center, a Mart, a house and the Gloom Marsh Gym, and a nook that opens with the Night Lamp.
//  Data only: the rules are in 24g-ow-engine.js and 24k-ow-people.js. Generated in the same shape as the other land files.
// =====================================================================
const OW_GLOOM_PALETTE = { grass: '#6E7B6A', grassD: '#56634F', leaf: '#3E4F45', leafD: '#2B3A32', path: '#A89F8F', pathD: '#8A8171', roof: '#5B4A8C', roofD: '#3E3166', water: '#3B6E8F' };
function owRoom_gloom(id, name, exit, npcs, objects, rows) { return Object.assign(owRoom(id, name, exit, npcs, objects, rows), { region: 'gloom', palette: OW_GLOOM_PALETTE }); }
Object.assign(OW_MAPS, {
  route6: {
    id: 'route6', name: 'Route 6', region: 'gloom', start: { x: 6, y: 22 }, palette: OW_GLOOM_PALETTE,
    rows: [
      'TTTTTT..TTTTTT',
      'T,,,,,..,,,,,T',
      'T,""",..,,,,,T',
      'T,""",..,,,,,T',
      'T,""",..,,,,,T',
      'T,""",..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,Y,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,""",T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,**,T',
      'T,,,,,..,,,,TT',
      'T,,,,,..,""T,T',
      'T,,,,,..,""l,T',
      'T,,,,,..,"""TT',
      'T,,,,,..,""",T',
      'T,,,,,..,,,,,T',
      'TTTTTT..TTTTTT'
    ],
    warps: [
      { x: 6, y: 23, to: 'volt', tx: 7, ty: 1 }, { x: 7, y: 23, to: 'volt', tx: 8, ty: 1 },
      { x: 6, y: 0, to: 'gloom', tx: 7, ty: 14 }, { x: 7, y: 0, to: 'gloom', tx: 8, ty: 14 }
    ],
    npcs: [
      { id: 'route6-dusk', kind: 'trainer', name: 'Ghost Hunter Dusk', x: 3, y: 16, face: 'right', look: { skin: 0, hair: 0, outfit: 4, style: 0 },
        lines: ['Do not be scared. The fog is only fog. Battle?'], win: ['Not a single shiver. You are brave!'] },
      { id: 'route6-glow', kind: 'trainer', name: 'Lamplighter Glow', x: 10, y: 8, face: 'left', look: { skin: 2, hair: 3, outfit: 3, style: 1 },
        lines: ['I light the lamps each evening. Want to light up a battle?'], win: ['What a bright match. Thank you!'] }
    ],
    objects: [
      { id: 'route6-berries', type: 'pickup', x: 4, y: 14, give: 'berry' },
      { id: 'route6-nook-gem', type: 'pickup', x: 12, y: 18, give: 'gems' },
      { id: 'route6-nook-net', type: 'pickup', x: 12, y: 19, give: 'net' }
    ],
    trees: { '2,7': 'route6-tree' },
    signs: {}
  },
  gloom: {
    id: 'gloom', name: 'Gloom Marsh', region: 'gloom', start: { x: 7, y: 13 }, palette: OW_GLOOM_PALETTE,
    rows: [
      'TTTTTTTxTTTTTTTT',
      'T,,,,,,,,,,,,,,T',
      'T,RRRR,..,RRRR,T',
      'T,RRRR,..,RRRR,T',
      'T,WNDW,..,WKDW,T',
      'T,,,,,,..,,,,,#T',
      'T,,,,,,..,,,,,#T',
      'T,RRR,,..,RRR,,T',
      'T,RRR,,..,RRR,,T',
      'T,WDW,,..,WGW,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'TTT,,,,..,,,s,,T',
      'T,,q,,,..,,,,~~T',
      'T,,T,,,..,,,,~~T',
      'TTTTTTT..TTTTTTT'
    ],
    warps: [
      { x: 7, y: 15, to: 'route6', tx: 6, ty: 1 }, { x: 8, y: 15, to: 'route6', tx: 7, ty: 1 },
      { x: 3, y: 9, to: 'gloom-house', tx: 3, ty: 5 }, { x: 4, y: 4, to: 'gloom-center', tx: 3, ty: 5 }, { x: 12, y: 4, to: 'gloom-mart', tx: 3, ty: 5 },
      { x: 7, y: 0, to: 'route7', tx: 6, ty: 22 }
    ],
    npcs: [
      { id: 'gloom-guide', name: 'Guide Mist', x: 6, y: 11, face: 'right', look: { skin: 0, hair: 6, outfit: 4, style: 1 },
        lines: ['Welcome to Gloom Marsh. The fog is thick, but the lanterns are friendly.', 'The gym on the right is hidden in the mist. It asks for a buddy of level 40.', 'Win the Gloom Badge and you get the Night Lamp. It lights up the thick fog in the nook on the left!'] }
    ],
    objects: [
      { id: 'gloom-gem', type: 'pickup', x: 13, y: 7, give: 'gems' },
      { id: 'gloom-ore', type: 'pickup', x: 13, y: 11, give: 'ore' },
      { id: 'gloom-nook-gem', type: 'pickup', x: 1, y: 13, give: 'gems' },
      { id: 'gloom-nook-ore', type: 'pickup', x: 2, y: 14, give: 'ore' }
    ],
    trees: {},
    roads: { '7,0': 'gloom' },
    gyms: { '11,9': 'gloom' },
    signs: { '12,12': { id: 'gloom-quiz', text: 'Foggy quiz! Answer one question.', quiz: true } }
  },
  'gloom-center': owRoom_gloom('gloom-center', 'Buddy Center', { to: 'gloom', tx: 4, ty: 5 }, [
    { id: 'gloom-nurse', kind: 'nurse', name: 'Nurse Shade', x: 3, y: 1, face: 'down', look: { skin: 0, hair: 2, outfit: 4, style: 3 }, lines: ['Welcome to the Buddy Center!'] }
  ], [], OW_CENTER_ROWS),
  'gloom-mart': owRoom_gloom('gloom-mart', 'Mart', { to: 'gloom', tx: 12, ty: 5 }, [
    { id: 'gloom-clerk', kind: 'clerk', name: 'Clerk Murk', x: 3, y: 2, face: 'down', look: { skin: 3, hair: 0, outfit: 7, style: 0 }, lines: ['Welcome to the Mart!'] }
  ], [], OW_MART_ROWS),
  'gloom-house': owRoom_gloom('gloom-house', 'Lantern Maker\'s House', { to: 'gloom', tx: 3, ty: 10 }, [
    { id: 'gloom-maker', name: 'Maker Wick', x: 4, y: 2, face: 'down', look: { skin: 1, hair: 0, outfit: 4, style: 1 },
      lines: ['I make lanterns that glow all night.', 'Dark buddies are shy, but they love a warm light.', 'Count the lanterns on the way home. There is a surprise if you count right!'] }
  ], [{ id: 'gloom-house-net', type: 'pickup', x: 6, y: 4, give: 'net' }])
});
OW_LANDS.push({ land: 'gloom', town: 'gloom', routeIn: 'route6', center: 'gloom-center', mart: 'gloom-mart', house: 'gloom-house', charm: 'lamp', nook: ['gloom-nook-gem', 'gloom-nook-ore'] });
