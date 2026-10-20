// =====================================================================
//  LAND PASS: Mystic Peak. Route 7 leads in from Gloom Marsh (the road opens with the Gloom Badge); the town has a Buddy Center, a Mart, a house and the Mystic Peak Gym, and a nook that opens with the Star Steps.
//  Data only: the rules are in 24g-ow-engine.js and 24k-ow-people.js. Generated in the same shape as the other land files.
// =====================================================================
const OW_MYSTIC_PALETTE = { grass: '#9FB6E8', grassD: '#7C97D2', leaf: '#6E7FD0', leafD: '#4F5FB0', path: '#E2D9F0', pathD: '#C4B8DC', roof: '#8E5BD6', roofD: '#6A3DB0' };
function owRoom_mystic(id, name, exit, npcs, objects, rows) { return Object.assign(owRoom(id, name, exit, npcs, objects, rows), { region: 'mystic', palette: OW_MYSTIC_PALETTE }); }
Object.assign(OW_MAPS, {
  route7: {
    id: 'route7', name: 'Route 7', region: 'mystic', start: { x: 6, y: 22 }, palette: OW_MYSTIC_PALETTE,
    rows: [
      'TTTTTT..TTTTTT',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'T,,,,,..,""",T',
      'T,,,,,..,,,,,T',
      'TY,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,""",T',
      'T,,,,,..,""",T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'T,""",..,,,,,T',
      'T,""",..,,,,,T',
      'T,,,,,..,,,,,T',
      'TT**,,..,,,,,T',
      'T,T,,,..,,,,,T',
      'T,q,,,..,,,,,T',
      'TT,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'TTTTTT..TTTTTT'
    ],
    warps: [
      { x: 6, y: 23, to: 'gloom', tx: 7, ty: 1 }, { x: 7, y: 23, to: 'gloom', tx: 7, ty: 1 },
      { x: 6, y: 0, to: 'mystic', tx: 7, ty: 14 }, { x: 7, y: 0, to: 'mystic', tx: 8, ty: 14 }
    ],
    npcs: [
      { id: 'route7-cass', kind: 'trainer', name: 'Astronomer Cass', x: 10, y: 16, face: 'left', look: { skin: 1, hair: 5, outfit: 4, style: 1 },
        lines: ['I was counting stars. Now let me count your wins!'], win: ['A shooting star! What a battle.'] },
      { id: 'route7-sol', kind: 'trainer', name: 'Dreamer Sol', x: 3, y: 8, face: 'right', look: { skin: 3, hair: 6, outfit: 6, style: 0 },
        lines: ['I dreamed of a battle last night. It came true!'], win: ['Sweet dreams! You were wonderful.'] }
    ],
    objects: [
      { id: 'route7-ore', type: 'pickup', x: 9, y: 9, give: 'ore' },
      { id: 'route7-nook-gem', type: 'pickup', x: 1, y: 18, give: 'gems' },
      { id: 'route7-nook-net', type: 'pickup', x: 1, y: 19, give: 'net' }
    ],
    trees: { '1,8': 'route7-tree' },
    signs: {}
  },
  mystic: {
    id: 'mystic', name: 'Mystic Peak', region: 'mystic', start: { x: 7, y: 13 }, palette: OW_MYSTIC_PALETTE,
    rows: [
      'TTTTTTTxTTTTTTTT',
      'T,,,,,,,,,,,,,,T',
      'T,RRRR,..,RRRR,T',
      'T,RRRR,..,RRRR,T',
      'T,WNDW,..,WKDW,T',
      'T,,,,,,..,,,,##T',
      'T,,,,,,..,,,,#,T',
      'T,RRR,,..,RRR,,T',
      'T,RRR,,..,RRR,,T',
      'T,WDW,,..,WGW,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'T##,,,,..,,,s,#T',
      'T,,z,,,..,,,,,,T',
      'T,,#,,,..,,,,,,T',
      'TTTTTTT..TTTTTTT'
    ],
    warps: [
      { x: 7, y: 15, to: 'route7', tx: 6, ty: 1 }, { x: 8, y: 15, to: 'route7', tx: 7, ty: 1 },
      { x: 3, y: 9, to: 'mystic-house', tx: 3, ty: 5 }, { x: 4, y: 4, to: 'mystic-center', tx: 3, ty: 5 }, { x: 12, y: 4, to: 'mystic-mart', tx: 3, ty: 5 },
      { x: 7, y: 0, to: 'skyroad', tx: 6, ty: 22 }
    ],
    npcs: [
      { id: 'mystic-guide', name: 'Guide Stella', x: 6, y: 11, face: 'right', look: { skin: 1, hair: 6, outfit: 4, style: 3 },
        lines: ['Welcome to Mystic Peak! Stars fall here at night.', 'The gym on the right is full of magic buddies. It asks for a buddy of level 48.', 'Win the Mystic Badge and you get the Star Steps. They make floating stars to walk on, in the nook on the left!'] }
    ],
    objects: [
      { id: 'mystic-gem', type: 'pickup', x: 13, y: 7, give: 'gems' },
      { id: 'mystic-berry', type: 'pickup', x: 13, y: 11, give: 'berry' },
      { id: 'mystic-nook-gem', type: 'pickup', x: 1, y: 13, give: 'gems' },
      { id: 'mystic-nook-net', type: 'pickup', x: 2, y: 14, give: 'net' }
    ],
    trees: {},
    roads: { '7,0': 'mystic' },
    gyms: { '11,9': 'mystic' },
    signs: { '12,12': { id: 'mystic-quiz', text: 'Starry quiz! Answer one question.', quiz: true } }
  },
  'mystic-center': owRoom_mystic('mystic-center', 'Buddy Center', { to: 'mystic', tx: 4, ty: 5 }, [
    { id: 'mystic-nurse', kind: 'nurse', name: 'Nurse Luna', x: 3, y: 1, face: 'down', look: { skin: 2, hair: 7, outfit: 4, style: 3 }, lines: ['Welcome to the Buddy Center!'] }
  ], [], OW_CENTER_ROWS),
  'mystic-mart': owRoom_mystic('mystic-mart', 'Mart', { to: 'mystic', tx: 12, ty: 5 }, [
    { id: 'mystic-clerk', kind: 'clerk', name: 'Clerk Comet', x: 3, y: 2, face: 'down', look: { skin: 0, hair: 3, outfit: 4, style: 0 }, lines: ['Welcome to the Mart!'] }
  ], [], OW_MART_ROWS),
  'mystic-house': owRoom_mystic('mystic-house', 'Stargazer\'s House', { to: 'mystic', tx: 3, ty: 10 }, [
    { id: 'mystic-stargazer', name: 'Stargazer Vega', x: 4, y: 2, face: 'down', look: { skin: 0, hair: 4, outfit: 6, style: 3 },
      lines: ['I watch the sky from my window every night.', 'Magic buddies love the stars. They sparkle when they sleep.', 'A telescope is just a very careful way of counting.'] }
  ], [{ id: 'mystic-house-net', type: 'pickup', x: 6, y: 4, give: 'net' }])
});
OW_LANDS.push({ land: 'mystic', town: 'mystic', routeIn: 'route7', center: 'mystic-center', mart: 'mystic-mart', house: 'mystic-house', charm: 'stars', nook: ['mystic-nook-gem', 'mystic-nook-net'] });
