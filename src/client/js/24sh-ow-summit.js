// =====================================================================
//  LAND PASS: Summit Citadel. Route 15 leads in from Crossroads (the road opens with the Crossroads Badge); the town has a Buddy Center, a Mart, a house and the Summit Citadel Gym.
//  Data only: the rules are in 24g-ow-engine.js and 24k-ow-people.js. Generated in the same shape as the other land files.
// =====================================================================
const OW_SUMMIT_PALETTE = { grass: '#E8EEF5', grassD: '#C7D4E4', leaf: '#8FA6C2', leafD: '#6A84A6', path: '#F6F4EE', pathD: '#DAD6C8', roof: '#C9A227', roofD: '#9C7A12', water: '#5C93C8' };
function owRoom_summit(id, name, exit, npcs, objects, rows) { return Object.assign(owRoom(id, name, exit, npcs, objects, rows), { region: 'summit', palette: OW_SUMMIT_PALETTE }); }
Object.assign(OW_MAPS, {
  route15: {
    id: 'route15', name: 'Route 15', region: 'summit', start: { x: 6, y: 22 }, palette: OW_SUMMIT_PALETTE,
    rows: [
      'TTTTTT..TTTTTT',
      'T,,,,,..,,,,,T',
      'T,,,,,..,""",T',
      'T,,,,,..,""",T',
      'T,,,,,..,""",T',
      'T,,,,,..,""",T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,Y,T',
      'T,,,,,..,,,,,T',
      'T,""",..,,,,,T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,**,,..,,,,,T',
      'TT,,,,..,,,,,T',
      'T,T"",..,,,,,T',
      'T,,"",..,,,,,T',
      'TT""",..,,,,,T',
      'T,""",..,,,,,T',
      'T,,,,,..,,,,,T',
      'TTTTTT..TTTTTT'
    ],
    warps: [
      { x: 6, y: 23, to: 'cross', tx: 7, ty: 1 }, { x: 7, y: 23, to: 'cross', tx: 7, ty: 1 },
      { x: 6, y: 0, to: 'summit', tx: 7, ty: 14 }, { x: 7, y: 0, to: 'summit', tx: 8, ty: 14 }
    ],
    npcs: [
      { id: 'route15-a', kind: 'trainer', name: 'Ace Trainer Zenith', x: 10, y: 16, face: 'left', look: { skin: 2, hair: 5, outfit: 1, style: 3 },
        lines: ['Only the best reach the Citadel. Show me why you did.'], win: ['The summit is yours to climb.'] },
      { id: 'route15-b', kind: 'trainer', name: 'Ace Trainer Apex', x: 3, y: 8, face: 'right', look: { skin: 3, hair: 6, outfit: 4, style: 0 },
        lines: ['I trained for years to stand here. So did you, I can tell.'], win: ['Now that was a battle worth the climb!'] }
    ],
    objects: [
      { id: 'route15-gem', type: 'pickup', x: 9, y: 14, give: 'gems' },
      { id: 'route15-net', type: 'pickup', x: 1, y: 19, give: 'net' }
    ],
    trees: { '11,7': 'route15-tree' },
    signs: {}
  },
  summit: {
    id: 'summit', name: 'Summit Citadel', region: 'summit', start: { x: 7, y: 13 }, palette: OW_SUMMIT_PALETTE,
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
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,s,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'TTTTTTT..TTTTTTT'
    ],
    warps: [
      { x: 7, y: 15, to: 'route15', tx: 6, ty: 1 }, { x: 8, y: 15, to: 'route15', tx: 7, ty: 1 },
      { x: 3, y: 9, to: 'summit-house', tx: 3, ty: 5 }, { x: 4, y: 4, to: 'summit-center', tx: 3, ty: 5 }, { x: 12, y: 4, to: 'summit-mart', tx: 3, ty: 5 }
    ],
    npcs: [
      { id: 'summit-guide', name: 'Guide Pinnacle', x: 6, y: 11, face: 'right', look: { skin: 2, hair: 3, outfit: 2, style: 1 },
        lines: ['The Citadel is the top of the world. The last gym here is the hardest of all.', 'The gym on the right asks for a buddy of level 90.', 'Win the Summit Badge to keep going.'] }
    ],
    objects: [
      { id: 'summit-gem', type: 'pickup', x: 13, y: 7, give: 'gems' },
      { id: 'summit-net', type: 'pickup', x: 13, y: 11, give: 'net' }
    ],
    trees: {},
    gyms: { '11,9': 'summit' },
    signs: { '12,12': { id: 'summit-quiz', text: 'Citadel quiz! Answer one question.', quiz: true } }
  },
  'summit-center': owRoom_summit('summit-center', 'Buddy Center', { to: 'summit', tx: 4, ty: 5 }, [
    { id: 'summit-nurse', kind: 'nurse', name: 'Nurse Peak', x: 3, y: 1, face: 'down', look: { skin: 3, hair: 0, outfit: 3, style: 2 }, lines: ['Welcome to the Buddy Center!'] }
  ], [], OW_CENTER_ROWS),
  'summit-mart': owRoom_summit('summit-mart', 'Mart', { to: 'summit', tx: 12, ty: 5 }, [
    { id: 'summit-clerk', kind: 'clerk', name: 'Clerk Crown', x: 3, y: 2, face: 'down', look: { skin: 4, hair: 1, outfit: 5, style: 3 }, lines: ['Welcome to the Mart!'] }
  ], [], OW_MART_ROWS),
  'summit-house': owRoom_summit('summit-house', 'Watchman\'s House', { to: 'summit', tx: 3, ty: 10 }, [
    { id: 'summit-watchman', name: 'Watchman Crest', x: 4, y: 2, face: 'down', look: { skin: 5, hair: 2, outfit: 6, style: 0 },
      lines: ['From my window I can see every land you have crossed. You came a long way.', 'Everything is bigger and tougher on this side of the Peak.', 'Keep your buddies rested and your nets stocked.'] }
  ], [{ id: 'summit-house-net', type: 'pickup', x: 6, y: 4, give: 'net' }])
});
OW_LANDS.push({ land: 'summit', town: 'summit', routeIn: 'route15', center: 'summit-center', mart: 'summit-mart', house: 'summit-house', charm: '', nook: [] });
