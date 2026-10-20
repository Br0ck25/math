// =====================================================================
//  LAND PASS: Cinder Mesa. Route 8 leads in from Skyreach (the road opens once you are Champion); the town has a Buddy Center, a Mart, a house and the Cinder Mesa Gym, and a nook that opens with the .
//  Data only: the rules are in 24g-ow-engine.js and 24k-ow-people.js. Generated in the same shape as the other land files.
// =====================================================================
const OW_CINDER_PALETTE = { grass: '#C9A27A', grassD: '#B08658', leaf: '#8A5A3C', leafD: '#6A3F28', path: '#E6D2B5', pathD: '#C9B08C', roof: '#C8452B', roofD: '#9B2E1B', water: '#4A7FA0' };
function owRoom_cinder(id, name, exit, npcs, objects, rows) { return Object.assign(owRoom(id, name, exit, npcs, objects, rows), { region: 'cinder', palette: OW_CINDER_PALETTE }); }
Object.assign(OW_MAPS, {
  route8: {
    id: 'route8', name: 'Route 8', region: 'cinder', start: { x: 6, y: 22 }, palette: OW_CINDER_PALETTE,
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
      'T,,,,,..,""g,T',
      'T,,,,,..,"""TT',
      'T,,,,,..,""",T',
      'T,,,,,..,,,,,T',
      'TTTTTT..TTTTTT'
    ],
    warps: [
      { x: 6, y: 23, to: 'skyreach', tx: 1, ty: 5 }, { x: 7, y: 23, to: 'skyreach', tx: 1, ty: 5 },
      { x: 6, y: 0, to: 'cinder', tx: 7, ty: 14 }, { x: 7, y: 0, to: 'cinder', tx: 8, ty: 14 }
    ],
    npcs: [
      { id: 'route8-a', kind: 'trainer', name: 'Kiln Worker Brick', x: 3, y: 16, face: 'right', look: { skin: 0, hair: 0, outfit: 2, style: 0 },
        lines: ['Hot work! Care for a battle to warm up?'], win: ['You cooled me right off!'] },
      { id: 'route8-b', kind: 'trainer', name: 'Glassblower Ember', x: 10, y: 8, face: 'left', look: { skin: 1, hair: 1, outfit: 5, style: 1 },
        lines: ['I shape glass in the heat. Let me shape a battle!'], win: ['Crystal clear win. Well done!'] }
    ],
    objects: [
      { id: 'route8-gem', type: 'pickup', x: 4, y: 14, give: 'gems' },
      { id: 'route8-nook-gem', type: 'pickup', x: 12, y: 18, give: 'gems' },
      { id: 'route8-nook-net', type: 'pickup', x: 12, y: 19, give: 'net' },
      { id: 'route8-net', type: 'pickup', x: 5, y: 14, give: 'net' }
    ],
    trees: { '2,7': 'route8-tree' },
    signs: {}
  },
  cinder: {
    id: 'cinder', name: 'Cinder Mesa', region: 'cinder', start: { x: 7, y: 13 }, palette: OW_CINDER_PALETTE,
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
      'T,,k,,,..,,,,,,T',
      'T,,T,,,..,,,,,,T',
      'TTTTTTT..TTTTTTT'
    ],
    warps: [
      { x: 7, y: 15, to: 'route8', tx: 6, ty: 1 }, { x: 8, y: 15, to: 'route8', tx: 7, ty: 1 },
      { x: 3, y: 9, to: 'cinder-house', tx: 3, ty: 5 }, { x: 4, y: 4, to: 'cinder-center', tx: 3, ty: 5 }, { x: 12, y: 4, to: 'cinder-mart', tx: 3, ty: 5 },
      { x: 7, y: 0, to: 'route9', tx: 6, ty: 22 }
    ],
    npcs: [
      { id: 'cinder-guide', name: 'Guide Ash', x: 6, y: 11, face: 'right', look: { skin: 1, hair: 0, outfit: 3, style: 2 },
        lines: ['The Mesa is where the second journey begins. Everyone here is stronger than the first lands.', 'The gym on the right asks for a buddy of level 60.', 'Win the Cinder Badge to keep going.'] }
    ],
    objects: [
      { id: 'cinder-gem', type: 'pickup', x: 13, y: 7, give: 'gems' },
      { id: 'cinder-net', type: 'pickup', x: 13, y: 11, give: 'net' },
      { id: 'cinder-nook-gem', type: 'pickup', x: 1, y: 13, give: 'gems' },
      { id: 'cinder-nook-net', type: 'pickup', x: 2, y: 14, give: 'net' }
    ],
    trees: {},
    roads: { '7,0': 'cinder' },
    gyms: { '11,9': 'cinder' },
    signs: { '12,12': { id: 'cinder-quiz', text: 'Mesa quiz! Answer one question.', quiz: true } }
  },
  'cinder-center': owRoom_cinder('cinder-center', 'Buddy Center', { to: 'cinder', tx: 4, ty: 5 }, [
    { id: 'cinder-nurse', kind: 'nurse', name: 'Nurse Spark', x: 3, y: 1, face: 'down', look: { skin: 2, hair: 1, outfit: 4, style: 3 }, lines: ['Welcome to the Buddy Center!'] }
  ], [], OW_CENTER_ROWS),
  'cinder-mart': owRoom_cinder('cinder-mart', 'Mart', { to: 'cinder', tx: 12, ty: 5 }, [
    { id: 'cinder-clerk', kind: 'clerk', name: 'Clerk Flint', x: 3, y: 2, face: 'down', look: { skin: 3, hair: 2, outfit: 6, style: 0 }, lines: ['Welcome to the Mart!'] }
  ], [], OW_MART_ROWS),
  'cinder-house': owRoom_cinder('cinder-house', 'Potter\'s House', { to: 'cinder', tx: 3, ty: 10 }, [
    { id: 'cinder-potter', name: 'Potter Clay', x: 4, y: 2, face: 'down', look: { skin: 4, hair: 3, outfit: 7, style: 1 },
      lines: ['Fire buddies love a hot kiln. I keep one going all day.', 'Everything is bigger and tougher on this side of the Peak.', 'Keep your buddies rested and your nets stocked.'] }
  ], [{ id: 'cinder-house-net', type: 'pickup', x: 6, y: 4, give: 'net' }])
});
OW_LANDS.push({ land: 'cinder', town: 'cinder', routeIn: 'route8', center: 'cinder-center', mart: 'cinder-mart', house: 'cinder-house', charm: '', nook: ['cinder-nook-gem', 'cinder-nook-net'] });

// The airship road: once you are Champion, the west edge of Skyreach opens onto Route 8 (the second journey).
OW_MAPS.skyreach.rows[5] = 'x' + OW_MAPS.skyreach.rows[5].slice(1);
OW_MAPS.skyreach.roads = Object.assign(OW_MAPS.skyreach.roads || {}, { '0,5': 'champion' });
OW_MAPS.skyreach.warps.push({ x: 0, y: 5, to: 'route8', tx: 6, ty: 22 });
