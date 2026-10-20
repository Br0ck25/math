// =====================================================================
//  LAND PASS: Prism Caverns. Route 13 leads in from Duskhollow (the road opens with the Duskhollow Badge); the town has a Buddy Center, a Mart, a house and the Prism Caverns Gym.
//  Data only: the rules are in 24g-ow-engine.js and 24k-ow-people.js. Generated in the same shape as the other land files.
// =====================================================================
const OW_PRISM_PALETTE = { grass: '#D9B8E8', grassD: '#BC93D2', leaf: '#8E5FB0', leafD: '#6B3F8C', path: '#EFE3F6', pathD: '#D3C2E0', roof: '#E060A8', roofD: '#B03C80', water: '#5A8FD0' };
function owRoom_prism(id, name, exit, npcs, objects, rows) { return Object.assign(owRoom(id, name, exit, npcs, objects, rows), { region: 'prism', palette: OW_PRISM_PALETTE }); }
Object.assign(OW_MAPS, {
  route13: {
    id: 'route13', name: 'Route 13', region: 'prism', start: { x: 6, y: 22 }, palette: OW_PRISM_PALETTE,
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
      'T,,,,,..,""",T',
      'TT,,,,..,""",T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'TTTTTT..TTTTTT'
    ],
    warps: [
      { x: 6, y: 23, to: 'dusk', tx: 7, ty: 1 }, { x: 7, y: 23, to: 'dusk', tx: 7, ty: 1 },
      { x: 6, y: 0, to: 'prism', tx: 7, ty: 14 }, { x: 7, y: 0, to: 'prism', tx: 8, ty: 14 }
    ],
    npcs: [
      { id: 'route13-a', kind: 'trainer', name: 'Gem Cutter Jade', x: 10, y: 14, face: 'left', look: { skin: 4, hair: 7, outfit: 7, style: 1 },
        lines: ['Every gem has a hidden number. Want to guess mine?'], win: ['Brilliant! You shine!'] },
      { id: 'route13-b', kind: 'trainer', name: 'Crystal Seer Quartz', x: 3, y: 10, face: 'right', look: { skin: 5, hair: 0, outfit: 2, style: 2 },
        lines: ['I see a battle in your future. It starts now!'], win: ['I did not see that coming.'] }
    ],
    objects: [
      { id: 'route13-gem', type: 'pickup', x: 9, y: 6, give: 'gems' },
      { id: 'route13-net', type: 'pickup', x: 1, y: 19, give: 'net' }
    ],
    trees: { '2,8': 'route13-tree' },
    signs: {}
  },
  prism: {
    id: 'prism', name: 'Prism Caverns', region: 'prism', start: { x: 7, y: 13 }, palette: OW_PRISM_PALETTE,
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
      'T,,,,,,..,,,s,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'TTTTTTT..TTTTTTT'
    ],
    warps: [
      { x: 7, y: 15, to: 'route13', tx: 6, ty: 1 }, { x: 8, y: 15, to: 'route13', tx: 7, ty: 1 },
      { x: 3, y: 9, to: 'prism-house', tx: 3, ty: 5 }, { x: 4, y: 4, to: 'prism-center', tx: 3, ty: 5 }, { x: 12, y: 4, to: 'prism-mart', tx: 3, ty: 5 },
      { x: 7, y: 0, to: 'route14', tx: 6, ty: 22 }
    ],
    npcs: [
      { id: 'prism-guide', name: 'Guide Facet', x: 6, y: 11, face: 'right', look: { skin: 0, hair: 1, outfit: 0, style: 3 },
        lines: ['Prism Caverns sparkle in every colour. The gym leader reads the light.', 'The gym on the right asks for a buddy of level 80.', 'Win the Prism Badge to keep going.'] }
    ],
    objects: [
      { id: 'prism-gem', type: 'pickup', x: 13, y: 7, give: 'gems' },
      { id: 'prism-net', type: 'pickup', x: 13, y: 11, give: 'net' }
    ],
    trees: {},
    roads: { '7,0': 'prism' },
    gyms: { '11,9': 'prism' },
    signs: { '12,12': { id: 'prism-quiz', text: 'Cavern quiz! Answer one question.', quiz: true } }
  },
  'prism-center': owRoom_prism('prism-center', 'Buddy Center', { to: 'prism', tx: 4, ty: 5 }, [
    { id: 'prism-nurse', kind: 'nurse', name: 'Nurse Glimmer', x: 3, y: 1, face: 'down', look: { skin: 1, hair: 6, outfit: 1, style: 0 }, lines: ['Welcome to the Buddy Center!'] }
  ], [], OW_CENTER_ROWS),
  'prism-mart': owRoom_prism('prism-mart', 'Mart', { to: 'prism', tx: 12, ty: 5 }, [
    { id: 'prism-clerk', kind: 'clerk', name: 'Clerk Prism', x: 3, y: 2, face: 'down', look: { skin: 2, hair: 7, outfit: 3, style: 1 }, lines: ['Welcome to the Mart!'] }
  ], [], OW_MART_ROWS),
  'prism-house': owRoom_prism('prism-house', 'Gem Cutter\'s House', { to: 'prism', tx: 3, ty: 10 }, [
    { id: 'prism-gemcutter', name: 'Cutter Agate', x: 4, y: 2, face: 'down', look: { skin: 3, hair: 0, outfit: 4, style: 2 },
      lines: ['Magic buddies glow when they stand in the crystals.', 'Everything is bigger and tougher on this side of the Peak.', 'Keep your buddies rested and your nets stocked.'] }
  ], [{ id: 'prism-house-net', type: 'pickup', x: 6, y: 4, give: 'net' }])
});
OW_LANDS.push({ land: 'prism', town: 'prism', routeIn: 'route13', center: 'prism-center', mart: 'prism-mart', house: 'prism-house', charm: '', nook: [] });
