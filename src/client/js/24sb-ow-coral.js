// =====================================================================
//  LAND PASS: Coral Reach. Route 9 leads in from Cinder Mesa (the road opens with the Cinder Badge); the town has a Buddy Center, a Mart, a house and the Coral Reach Gym, and a nook that opens with the .
//  Data only: the rules are in 24g-ow-engine.js and 24k-ow-people.js. Generated in the same shape as the other land files.
// =====================================================================
const OW_CORAL_PALETTE = { grass: '#9FD8C8', grassD: '#74BDAB', leaf: '#3E9D95', leafD: '#2B7C78', path: '#F1E4C8', pathD: '#D6C4A0', roof: '#2E86AB', roofD: '#1F6285', water: '#2F7FB5' };
function owRoom_coral(id, name, exit, npcs, objects, rows) { return Object.assign(owRoom(id, name, exit, npcs, objects, rows), { region: 'coral', palette: OW_CORAL_PALETTE }); }
Object.assign(OW_MAPS, {
  route9: {
    id: 'route9', name: 'Route 9', region: 'coral', start: { x: 6, y: 22 }, palette: OW_CORAL_PALETTE,
    rows: [
      'TTTTTT..TTTTTT',
      'T,,,,,..,,,,,T',
      'T"""",..,**,,T',
      'T"""",..,,,,,T',
      'T"""",..,,,,,T',
      'T"""",..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,Y,,,..,""",T',
      'T,,,,,..,""",T',
      'T,,,,,..,""",T',
      'T,,,,,..,""",T',
      'T,,,,,..,,,,,T',
      'T"""",..,,,,,T',
      'T"""",..,,,,,T',
      'T"""",..,,,,,T',
      'T"""",..,,,,,T',
      'TT,,,,..,""",T',
      'T,T,,,..,""",T',
      'T,h,,,..,""",T',
      'TT,,,,..,""",T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'TTTTTT..TTTTTT'
    ],
    warps: [
      { x: 6, y: 23, to: 'cinder', tx: 7, ty: 1 }, { x: 7, y: 23, to: 'cinder', tx: 8, ty: 1 },
      { x: 6, y: 0, to: 'coral', tx: 7, ty: 14 }, { x: 7, y: 0, to: 'coral', tx: 8, ty: 14 }
    ],
    npcs: [
      { id: 'route9-a', kind: 'trainer', name: 'Pearl Diver Opal', x: 10, y: 14, face: 'left', look: { skin: 2, hair: 3, outfit: 3, style: 1 },
        lines: ['The reef is full of surprises. So am I. Battle?'], win: ['You sank my plan! Nice!'] },
      { id: 'route9-b', kind: 'trainer', name: 'Lighthouse Keeper Beam', x: 3, y: 10, face: 'right', look: { skin: 3, hair: 4, outfit: 6, style: 2 },
        lines: ['I keep the light on for brave trainers. Show me yours!'], win: ['A bright victory. Thank you!'] }
    ],
    objects: [
      { id: 'route9-gem', type: 'pickup', x: 9, y: 6, give: 'gems' },
      { id: 'route9-nook-gem', type: 'pickup', x: 1, y: 18, give: 'gems' },
      { id: 'route9-nook-net', type: 'pickup', x: 1, y: 19, give: 'net' },
      { id: 'route9-net', type: 'pickup', x: 8, y: 6, give: 'net' }
    ],
    trees: { '2,8': 'route9-tree' },
    signs: {}
  },
  coral: {
    id: 'coral', name: 'Coral Reach', region: 'coral', start: { x: 7, y: 13 }, palette: OW_CORAL_PALETTE,
    rows: [
      'TTTTTTTxTTTTTTTT',
      'T,,,,,,,,,,,,,,T',
      'T,RRRR,..,RRRR,T',
      'T,RRRR,..,RRRR,T',
      'T,WNDW,..,WKDW,T',
      'T,,,,,,..,,,,,,T',
      'TTT,,,,..,,,,,,T',
      'TTRRR,,..,RRR,,T',
      'T,RRR,,..,RRR,,T',
      'T,WDW,,..,WGW,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'TTT,,,,..,,,s,,T',
      'T,,l,,,..,,,,,,T',
      'T,,T,,,..,,,,,,T',
      'TTTTTTT..TTTTTTT'
    ],
    warps: [
      { x: 7, y: 15, to: 'route9', tx: 6, ty: 1 }, { x: 8, y: 15, to: 'route9', tx: 7, ty: 1 },
      { x: 3, y: 9, to: 'coral-house', tx: 3, ty: 5 }, { x: 4, y: 4, to: 'coral-center', tx: 3, ty: 5 }, { x: 12, y: 4, to: 'coral-mart', tx: 3, ty: 5 },
      { x: 7, y: 0, to: 'route10', tx: 6, ty: 22 }
    ],
    npcs: [
      { id: 'coral-guide', name: 'Guide Shell', x: 6, y: 11, face: 'right', look: { skin: 2, hair: 5, outfit: 4, style: 3 },
        lines: ['Coral Reach sits on warm shallow water. The gym leader here loves the sea.', 'The gym on the right asks for a buddy of level 64.', 'Win the Coral Badge to keep going.'] }
    ],
    objects: [
      { id: 'coral-gem', type: 'pickup', x: 13, y: 7, give: 'gems' },
      { id: 'coral-net', type: 'pickup', x: 13, y: 11, give: 'net' },
      { id: 'coral-nook-gem', type: 'pickup', x: 1, y: 13, give: 'gems' },
      { id: 'coral-nook-net', type: 'pickup', x: 2, y: 14, give: 'net' }
    ],
    trees: {},
    roads: { '7,0': 'coral' },
    gyms: { '11,9': 'coral' },
    signs: { '12,12': { id: 'coral-quiz', text: 'Reef quiz! Answer one question.', quiz: true } }
  },
  'coral-center': owRoom_coral('coral-center', 'Buddy Center', { to: 'coral', tx: 4, ty: 5 }, [
    { id: 'coral-nurse', kind: 'nurse', name: 'Nurse Wave', x: 3, y: 1, face: 'down', look: { skin: 3, hair: 2, outfit: 5, style: 0 }, lines: ['Welcome to the Buddy Center!'] }
  ], [], OW_CENTER_ROWS),
  'coral-mart': owRoom_coral('coral-mart', 'Mart', { to: 'coral', tx: 12, ty: 5 }, [
    { id: 'coral-clerk', kind: 'clerk', name: 'Clerk Pearl', x: 3, y: 2, face: 'down', look: { skin: 4, hair: 3, outfit: 7, style: 1 }, lines: ['Welcome to the Mart!'] }
  ], [], OW_MART_ROWS),
  'coral-house': owRoom_coral('coral-house', 'Reef Keeper\'s House', { to: 'coral', tx: 3, ty: 10 }, [
    { id: 'coral-reefer', name: 'Reefer Anemone', x: 4, y: 2, face: 'down', look: { skin: 5, hair: 4, outfit: 0, style: 2 },
      lines: ['Water buddies hum when the tide turns. Listen closely.', 'Everything is bigger and tougher on this side of the Peak.', 'Keep your buddies rested and your nets stocked.'] }
  ], [{ id: 'coral-house-net', type: 'pickup', x: 6, y: 4, give: 'net' }])
});
OW_LANDS.push({ land: 'coral', town: 'coral', routeIn: 'route9', center: 'coral-center', mart: 'coral-mart', house: 'coral-house', charm: '', nook: ['coral-nook-gem', 'coral-nook-net'] });
