// =====================================================================
//  LAND PASS: Crossroads. Route 14 leads in from Prism Caverns (the road opens with the Prism Badge); the town has a Buddy Center, a Mart, a house and the Crossroads Gym, and a nook that opens with the .
//  Data only: the rules are in 24g-ow-engine.js and 24k-ow-people.js. Generated in the same shape as the other land files.
// =====================================================================
const OW_CROSS_PALETTE = { grass: '#B7D8A0', grassD: '#92BC78', leaf: '#5F9A5A', leafD: '#437A40', path: '#E9DDBC', pathD: '#CDBE95', roof: '#D98A3A', roofD: '#B0651E', water: '#4A8FB8' };
function owRoom_cross(id, name, exit, npcs, objects, rows) { return Object.assign(owRoom(id, name, exit, npcs, objects, rows), { region: 'cross', palette: OW_CROSS_PALETTE }); }
Object.assign(OW_MAPS, {
  route14: {
    id: 'route14', name: 'Route 14', region: 'cross', start: { x: 6, y: 22 }, palette: OW_CROSS_PALETTE,
    rows: [
      'TTTTTT..TTTTTT',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,"""".."""",T',
      'T,"""".."""",T',
      'T,"""".."""",T',
      'T,"""".."""",T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,Y,,..,,**,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,"""".."""",T',
      'T,"""".."""",T',
      'T,"""".."""",T',
      'T,""""..""""TT',
      'T,,,,,..,,,T,T',
      'T,,,,,..,,,z,T',
      'T,,,,,..,,,,TT',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'TTTTTT..TTTTTT'
    ],
    warps: [
      { x: 6, y: 23, to: 'prism', tx: 7, ty: 1 }, { x: 7, y: 23, to: 'prism', tx: 7, ty: 1 },
      { x: 6, y: 0, to: 'cross', tx: 7, ty: 14 }, { x: 7, y: 0, to: 'cross', tx: 8, ty: 14 }
    ],
    npcs: [
      { id: 'route14-a', kind: 'trainer', name: 'Trader Marco', x: 4, y: 9, face: 'right', look: { skin: 0, hair: 2, outfit: 0, style: 2 },
        lines: ['Buddies from every land pass through here. So do trainers!'], win: ['A fair trade, a fair loss.'] },
      { id: 'route14-b', kind: 'trainer', name: 'Traveller Lyra', x: 10, y: 12, face: 'left', look: { skin: 1, hair: 3, outfit: 3, style: 3 },
        lines: ['I have walked every road. Let me test yours.'], win: ['You walk a fine road, friend.'] }
    ],
    objects: [
      { id: 'route14-gem', type: 'pickup', x: 11, y: 20, give: 'gems' },
      { id: 'route14-nook-gem', type: 'pickup', x: 12, y: 18, give: 'gems' },
      { id: 'route14-nook-net', type: 'pickup', x: 12, y: 19, give: 'net' },
      { id: 'route14-net', type: 'pickup', x: 3, y: 20, give: 'net' }
    ],
    trees: { '3,10': 'route14-tree' },
    signs: {}
  },
  cross: {
    id: 'cross', name: 'Crossroads', region: 'cross', start: { x: 7, y: 13 }, palette: OW_CROSS_PALETTE,
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
      'T,WDW,,..,WGW,TT',
      'T,,,,,,..,,,,TTT',
      'T,,,,,,..,,,,,,T',
      'TTT,,,,..,,,s,,T',
      'T,,j,,,..,,,,,,T',
      'T,,T,,,..,,,,,,T',
      'TTTTTTT..TTTTTTT'
    ],
    warps: [
      { x: 7, y: 15, to: 'route14', tx: 6, ty: 1 }, { x: 8, y: 15, to: 'route14', tx: 7, ty: 1 },
      { x: 3, y: 9, to: 'cross-house', tx: 3, ty: 5 }, { x: 4, y: 4, to: 'cross-center', tx: 3, ty: 5 }, { x: 12, y: 4, to: 'cross-mart', tx: 3, ty: 5 },
      { x: 7, y: 0, to: 'route15', tx: 6, ty: 22 }
    ],
    npcs: [
      { id: 'cross-guide', name: 'Guide Compass', x: 6, y: 11, face: 'right', look: { skin: 1, hair: 6, outfit: 1, style: 0 },
        lines: ['Every road meets at the Crossroads. The gym here uses every type of buddy.', 'The gym on the right asks for a buddy of level 85.', 'Win the Crossroads Badge to keep going.'] }
    ],
    objects: [
      { id: 'cross-gem', type: 'pickup', x: 13, y: 7, give: 'gems' },
      { id: 'cross-net', type: 'pickup', x: 13, y: 11, give: 'net' },
      { id: 'cross-nook-gem', type: 'pickup', x: 1, y: 13, give: 'gems' },
      { id: 'cross-nook-net', type: 'pickup', x: 2, y: 14, give: 'net' }
    ],
    trees: {},
    roads: { '7,0': 'cross' },
    gyms: { '11,9': 'cross' },
    signs: { '12,12': { id: 'cross-quiz', text: 'Crossroads quiz! Answer one question.', quiz: true } }
  },
  'cross-center': owRoom_cross('cross-center', 'Buddy Center', { to: 'cross', tx: 4, ty: 5 }, [
    { id: 'cross-nurse', kind: 'nurse', name: 'Nurse Path', x: 3, y: 1, face: 'down', look: { skin: 2, hair: 7, outfit: 2, style: 1 }, lines: ['Welcome to the Buddy Center!'] }
  ], [], OW_CENTER_ROWS),
  'cross-mart': owRoom_cross('cross-mart', 'Mart', { to: 'cross', tx: 12, ty: 5 }, [
    { id: 'cross-clerk', kind: 'clerk', name: 'Clerk Route', x: 3, y: 2, face: 'down', look: { skin: 3, hair: 0, outfit: 4, style: 2 }, lines: ['Welcome to the Mart!'] }
  ], [], OW_MART_ROWS),
  'cross-house': owRoom_cross('cross-house', 'Mapmaker\'s House', { to: 'cross', tx: 3, ty: 10 }, [
    { id: 'cross-mapmaker', name: 'Mapmaker Atlas', x: 4, y: 2, face: 'down', look: { skin: 4, hair: 1, outfit: 5, style: 3 },
      lines: ['Every road in the world is on this wall. Even the ones you have not walked yet.', 'Everything is bigger and tougher on this side of the Peak.', 'Keep your buddies rested and your nets stocked.'] }
  ], [{ id: 'cross-house-net', type: 'pickup', x: 6, y: 4, give: 'net' }])
});
OW_LANDS.push({ land: 'cross', town: 'cross', routeIn: 'route14', center: 'cross-center', mart: 'cross-mart', house: 'cross-house', charm: '', nook: ['cross-nook-gem', 'cross-nook-net'] });
