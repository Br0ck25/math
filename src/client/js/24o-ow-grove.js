// =====================================================================
//  LAND PASS: Leaf Grove. Route 4 leads in from Tide Bay (the road opens with the Tide Badge); the town has a Buddy Center, a Mart, a house and the Leaf Grove Gym, and a nook that opens with the Vine Gloves.
//  Data only: the rules are in 24g-ow-engine.js and 24k-ow-people.js. Generated in the same shape as the other land files.
// =====================================================================
const OW_GROVE_PALETTE = { grass: '#6DBE5A', grassD: '#4B9A3C', leaf: '#2F7A3A', leafD: '#1F5A2A', path: '#D9C79A', pathD: '#BBA775', roof: '#3F8F4A', roofD: '#2C6A36', wood: '#7A4B12' };
function owRoom_grove(id, name, exit, npcs, objects, rows) { return Object.assign(owRoom(id, name, exit, npcs, objects, rows), { region: 'grove', palette: OW_GROVE_PALETTE }); }
Object.assign(OW_MAPS, {
  route4: {
    id: 'route4', name: 'Route 4', region: 'grove', start: { x: 6, y: 22 }, palette: OW_GROVE_PALETTE,
    rows: [
      'TTTTTT..TTTTTT',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,""",..,,,,,T',
      'T,""",..,,,,,T',
      'T,""",..,,,,,T',
      'T,""",..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,Y,,,..,,,,,T',
      'T,,**,..,""",T',
      'T,,,,,..,""",T',
      'T,,,,,..,""",T',
      'T,""",..,""",T',
      'T,""",..,,,,,T',
      'T,""",..,,,,,T',
      'T,,,,,..,,*,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,"""TT',
      'T,,,,,..,""T,T',
      'T,,,,,..,""j,T',
      'T,,,,,..,"""TT',
      'T,,,,,..,""",T',
      'T,,,,,..,,,,,T',
      'TTTTTT..TTTTTT'
    ],
    warps: [
      { x: 6, y: 23, to: 'tide', tx: 7, ty: 1 }, { x: 7, y: 23, to: 'tide', tx: 7, ty: 1 },
      { x: 6, y: 0, to: 'grove', tx: 7, ty: 14 }, { x: 7, y: 0, to: 'grove', tx: 8, ty: 14 }
    ],
    npcs: [
      { id: 'route4-fern', kind: 'trainer', name: 'Botanist Fern', x: 10, y: 15, face: 'left', look: { skin: 2, hair: 2, outfit: 2, style: 3 },
        lines: ['I was counting leaves, but a battle sounds even better!'], win: ['Wonderful! You grow stronger every day.'] },
      { id: 'route4-oak', kind: 'trainer', name: 'Woodcutter Oak', x: 3, y: 7, face: 'right', look: { skin: 3, hair: 1, outfit: 7, style: 0 },
        lines: ['These woods are big. Let us see how big your courage is!'], win: ['Strong as a tree! Good battle.'] }
    ],
    objects: [
      { id: 'route4-berries', type: 'pickup', x: 11, y: 3, give: 'berry' },
      { id: 'route4-nook-gem', type: 'pickup', x: 12, y: 18, give: 'gems' },
      { id: 'route4-nook-net', type: 'pickup', x: 12, y: 19, give: 'net' }
    ],
    trees: { '2,8': 'route4-tree' },
    signs: {}
  },
  grove: {
    id: 'grove', name: 'Leaf Grove', region: 'grove', start: { x: 7, y: 13 }, palette: OW_GROVE_PALETTE,
    rows: [
      'TTTTTTTTTTTTTTTT',
      'T,,,,,,,,,,,,,,T',
      'T,RRRR,..,RRRR,T',
      'T,RRRR,..,RRRR,T',
      'T,WNDW,..,WKDW,T',
      'T,,,,,,..,,,,T,T',
      'T,,,,,,..,,,,,TT',
      'T,RRR,,..,RRR,,T',
      'T,RRR,,..,RRR,,T',
      'T,WDW,,..,WGW,,T',
      'T,,,,,,..,,,,,TT',
      'T,,,,,,..,,,,,TT',
      'TTT,,,,..,,,s,,T',
      'T,,k,,,..,,,,,TT',
      'T,,T,,,..,,,,,,T',
      'TTTTTTT..TTTTTTT'
    ],
    warps: [
      { x: 7, y: 15, to: 'route4', tx: 6, ty: 1 }, { x: 8, y: 15, to: 'route4', tx: 7, ty: 1 },
      { x: 3, y: 9, to: 'grove-house', tx: 3, ty: 5 }, { x: 4, y: 4, to: 'grove-center', tx: 3, ty: 5 }, { x: 12, y: 4, to: 'grove-mart', tx: 3, ty: 5 }
    ],
    npcs: [
      { id: 'grove-guide', name: 'Guide Willow', x: 6, y: 11, face: 'right', look: { skin: 1, hair: 5, outfit: 2, style: 1 },
        lines: ['Welcome to Leaf Grove! Listen: the trees whisper if you stand still.', 'The gym on the right grows inside a giant tree. It asks for a buddy of level 24.', 'Win the Grove Badge and you get Vine Gloves. They let you climb the vine wall in the leafy nook on the left!'] }
    ],
    objects: [
      { id: 'grove-gem', type: 'pickup', x: 13, y: 7, give: 'gems' },
      { id: 'grove-ore', type: 'pickup', x: 13, y: 11, give: 'ore' },
      { id: 'grove-nook-gem', type: 'pickup', x: 1, y: 13, give: 'gems' },
      { id: 'grove-nook-ore', type: 'pickup', x: 2, y: 14, give: 'ore' }
    ],
    trees: {},
    gyms: { '11,9': 'grove' },
    signs: { '12,12': { id: 'grove-quiz', text: 'Garden quiz! Answer one question.', quiz: true } }
  },
  'grove-center': owRoom_grove('grove-center', 'Buddy Center', { to: 'grove', tx: 4, ty: 5 }, [
    { id: 'grove-nurse', kind: 'nurse', name: 'Nurse Fern', x: 3, y: 1, face: 'down', look: { skin: 0, hair: 4, outfit: 2, style: 3 }, lines: ['Welcome to the Buddy Center!'] }
  ], [], OW_CENTER_ROWS),
  'grove-mart': owRoom_grove('grove-mart', 'Mart', { to: 'grove', tx: 12, ty: 5 }, [
    { id: 'grove-clerk', kind: 'clerk', name: 'Clerk Moss', x: 3, y: 2, face: 'down', look: { skin: 2, hair: 0, outfit: 2, style: 0 }, lines: ['Welcome to the Mart!'] }
  ], [], OW_MART_ROWS),
  'grove-house': owRoom_grove('grove-house', 'Gardener\'s House', { to: 'grove', tx: 3, ty: 10 }, [
    { id: 'grove-gardener', name: 'Gardener Basil', x: 4, y: 2, face: 'down', look: { skin: 0, hair: 3, outfit: 2, style: 1 },
      lines: ['My garden grows in neat rows. Rows and columns, just like a times table!', 'Nature buddies help the plants grow. I give them berries as thanks.', 'Be gentle with the ferns. They tickle!'] }
  ], [{ id: 'grove-house-net', type: 'pickup', x: 6, y: 4, give: 'net' }])
});
OW_LANDS.push({ land: 'grove', town: 'grove', routeIn: 'route4', center: 'grove-center', mart: 'grove-mart', house: 'grove-house', charm: 'vines', nook: ['grove-nook-gem', 'grove-nook-ore'] });
