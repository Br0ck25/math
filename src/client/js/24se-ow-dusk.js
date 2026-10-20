// =====================================================================
//  LAND PASS: Duskhollow. Route 12 leads in from Spark City (the road opens with the Spark Badge); the town has a Buddy Center, a Mart, a house and the Duskhollow Gym, and a nook that opens with the .
//  Data only: the rules are in 24g-ow-engine.js and 24k-ow-people.js. Generated in the same shape as the other land files.
// =====================================================================
const OW_DUSK_PALETTE = { grass: '#8E86AA', grassD: '#6F6890', leaf: '#4B4470', leafD: '#352F55', path: '#B9B2CC', pathD: '#9A93B3', roof: '#4B2E83', roofD: '#331F5E', water: '#3A4F8A' };
function owRoom_dusk(id, name, exit, npcs, objects, rows) { return Object.assign(owRoom(id, name, exit, npcs, objects, rows), { region: 'dusk', palette: OW_DUSK_PALETTE }); }
Object.assign(OW_MAPS, {
  route12: {
    id: 'route12', name: 'Route 12', region: 'dusk', start: { x: 6, y: 22 }, palette: OW_DUSK_PALETTE,
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
      { x: 6, y: 23, to: 'spark', tx: 7, ty: 1 }, { x: 7, y: 23, to: 'spark', tx: 7, ty: 1 },
      { x: 6, y: 0, to: 'dusk', tx: 7, ty: 14 }, { x: 7, y: 0, to: 'dusk', tx: 8, ty: 14 }
    ],
    npcs: [
      { id: 'route12-a', kind: 'trainer', name: 'Night Watch Raven', x: 3, y: 16, face: 'right', look: { skin: 2, hair: 4, outfit: 6, style: 0 },
        lines: ['It is always evening here. Battle by candlelight?'], win: ['You lit up the whole night!'] },
      { id: 'route12-b', kind: 'trainer', name: 'Storyteller Hush', x: 10, y: 8, face: 'left', look: { skin: 3, hair: 5, outfit: 1, style: 1 },
        lines: ['Let me tell you the tale of your defeat... oh wait.'], win: ['A twist ending. I love it.'] }
    ],
    objects: [
      { id: 'route12-gem', type: 'pickup', x: 4, y: 14, give: 'gems' },
      { id: 'route12-nook-gem', type: 'pickup', x: 12, y: 18, give: 'gems' },
      { id: 'route12-nook-net', type: 'pickup', x: 12, y: 19, give: 'net' },
      { id: 'route12-net', type: 'pickup', x: 5, y: 14, give: 'net' }
    ],
    trees: { '2,7': 'route12-tree' },
    signs: {}
  },
  dusk: {
    id: 'dusk', name: 'Duskhollow', region: 'dusk', start: { x: 7, y: 13 }, palette: OW_DUSK_PALETTE,
    rows: [
      'TTTTTTTxTTTTTTTT',
      'T,,,,,,,,,,,,,,T',
      'T,RRRR,..,RRRR,T',
      'T,RRRR,..,RRRR,T',
      'T,WNDW,..,WKDW,T',
      'T,,,,,,..,,,,T,T',
      'T,,,,,,..,,,,,TT',
      'T,RRR,,..,RRR,,T',
      'T,RRR,,..,RRR,,T',
      'T,WDW,,..,WGW,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'TTT,,,,..,,,s,,T',
      'T,,g,,,..,,,,,,T',
      'T,,T,,,..,,,,,,T',
      'TTTTTTT..TTTTTTT'
    ],
    warps: [
      { x: 7, y: 15, to: 'route12', tx: 6, ty: 1 }, { x: 8, y: 15, to: 'route12', tx: 7, ty: 1 },
      { x: 3, y: 9, to: 'dusk-house', tx: 3, ty: 5 }, { x: 4, y: 4, to: 'dusk-center', tx: 3, ty: 5 }, { x: 12, y: 4, to: 'dusk-mart', tx: 3, ty: 5 },
      { x: 7, y: 0, to: 'route13', tx: 6, ty: 22 }
    ],
    npcs: [
      { id: 'dusk-guide', name: 'Guide Twilight', x: 6, y: 11, face: 'right', look: { skin: 5, hair: 4, outfit: 7, style: 2 },
        lines: ['Duskhollow is dark but kind. The gym leader hides at the very back of the hollow.', 'The gym on the right asks for a buddy of level 76.', 'Win the Duskhollow Badge to keep going.'] }
    ],
    objects: [
      { id: 'dusk-gem', type: 'pickup', x: 13, y: 7, give: 'gems' },
      { id: 'dusk-net', type: 'pickup', x: 13, y: 11, give: 'net' },
      { id: 'dusk-nook-gem', type: 'pickup', x: 1, y: 13, give: 'gems' },
      { id: 'dusk-nook-net', type: 'pickup', x: 2, y: 14, give: 'net' }
    ],
    trees: {},
    roads: { '7,0': 'dusk' },
    gyms: { '11,9': 'dusk' },
    signs: { '12,12': { id: 'dusk-quiz', text: 'Hollow quiz! Answer one question.', quiz: true } }
  },
  'dusk-center': owRoom_dusk('dusk-center', 'Buddy Center', { to: 'dusk', tx: 4, ty: 5 }, [
    { id: 'dusk-nurse', kind: 'nurse', name: 'Nurse Dusk', x: 3, y: 1, face: 'down', look: { skin: 0, hair: 5, outfit: 0, style: 3 }, lines: ['Welcome to the Buddy Center!'] }
  ], [], OW_CENTER_ROWS),
  'dusk-mart': owRoom_dusk('dusk-mart', 'Mart', { to: 'dusk', tx: 12, ty: 5 }, [
    { id: 'dusk-clerk', kind: 'clerk', name: 'Clerk Ink', x: 3, y: 2, face: 'down', look: { skin: 1, hair: 6, outfit: 2, style: 0 }, lines: ['Welcome to the Mart!'] }
  ], [], OW_MART_ROWS),
  'dusk-house': owRoom_dusk('dusk-house', 'Moonkeeper\'s House', { to: 'dusk', tx: 3, ty: 10 }, [
    { id: 'dusk-moonkeeper', name: 'Moonkeeper Lune', x: 4, y: 2, face: 'down', look: { skin: 2, hair: 7, outfit: 3, style: 1 },
      lines: ['Dark buddies love quiet. They are good listeners.', 'Everything is bigger and tougher on this side of the Peak.', 'Keep your buddies rested and your nets stocked.'] }
  ], [{ id: 'dusk-house-net', type: 'pickup', x: 6, y: 4, give: 'net' }])
});
OW_LANDS.push({ land: 'dusk', town: 'dusk', routeIn: 'route12', center: 'dusk-center', mart: 'dusk-mart', house: 'dusk-house', charm: '', nook: ['dusk-nook-gem', 'dusk-nook-net'] });
