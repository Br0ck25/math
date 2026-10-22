// =====================================================================
//  LAND PASS: Skyreach. Skyreach Road leads in from Mystic Peak (the road opens with the Mystic Badge); the town has a Buddy Center, a Mart, a house and the Skyreach Gym.
//  Data only: the rules are in 24g-ow-engine.js and 24k-ow-people.js. Generated in the same shape as the other land files.
// =====================================================================
const OW_SKYREACH_PALETTE = { grass: '#BFE3F5', grassD: '#92C9E6', leaf: '#7FB7DA', leafD: '#5E9AC2', path: '#F2F0E8', pathD: '#D8D5C6', roof: '#F2B13F', roofD: '#C68510' };
function owRoom_skyreach(id, name, exit, npcs, objects, rows) { return Object.assign(owRoom(id, name, exit, npcs, objects, rows), { region: 'skyreach', palette: OW_SKYREACH_PALETTE }); }
Object.assign(OW_MAPS, {
  skyroad: {
    id: 'skyroad', name: 'Skyreach Road', region: 'skyreach', start: { x: 6, y: 22 }, palette: OW_SKYREACH_PALETTE,
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
      'T,,,,,..,,,,,T',
      'T,,,,,..,""",T',
      'T,,,,,..,""",T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'T,""",..,,,,,T',
      'T,,,,,..,,*,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,"""TT',
      'T,,,,,..,""T,T',
      'T,,*,,..,""z,T',
      'T,,,,,..,"""TT',
      'T,,,,,..,""",T',
      'T,,,,,..,,,,,T',
      'TTTTTT..TTTTTT'
    ],
    warps: [
      { x: 6, y: 23, to: 'mystic', tx: 7, ty: 1 }, { x: 7, y: 23, to: 'mystic', tx: 8, ty: 1 },
      { x: 6, y: 0, to: 'skyreach', tx: 7, ty: 14 }, { x: 7, y: 0, to: 'skyreach', tx: 8, ty: 14 }
    ],
    npcs: [
      { id: 'skyroad-cirrus', kind: 'trainer', name: 'Pilot Cirrus', x: 10, y: 16, face: 'left', look: { skin: 2, hair: 4, outfit: 2, style: 0 },
        lines: ['Up here the clouds are soft. The battles are not! Ready?'], win: ['What a flight! You are a sky-high champion.'] },
      { id: 'skyroad-skye', kind: 'trainer', name: 'Glider Skye', x: 3, y: 7, face: 'right', look: { skin: 1, hair: 1, outfit: 6, style: 3 },
        lines: ['I glide on the wind. Let us see how well you glide on numbers!'], win: ['Whoosh! You swept me away.'] }
    ],
    objects: [
      { id: 'skyroad-berries', type: 'pickup', x: 11, y: 3, give: 'berry' },
      { id: 'skyroad-nook-gem', type: 'pickup', x: 12, y: 18, give: 'gems' },
      { id: 'skyroad-nook-net', type: 'pickup', x: 12, y: 19, give: 'net' }
    ],
    trees: { '2,8': 'skyroad-tree' },
    signs: {}
  },
  skyreach: {
    id: 'skyreach', name: 'Skyreach', region: 'skyreach', start: { x: 7, y: 13 }, palette: OW_SKYREACH_PALETTE,
    rows: [
      'TTTTTTTTTTTTTTTT',
      'T,,,,,,,,,,,,,,T',
      'T,RRRR,..,RRRR,T',
      'T,RRRR,..,RRRR,T',
      'T,WNDW,..,WKDW,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,*,T',
      'T,RRR,,..,RRR,*T',
      'T,RRR,,..,RRR,,T',
      'T,WDW,,..,WGW,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'T,*,,,,..,,,s,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'TTTTTTT..TTTTTTT'
    ],
    warps: [
      { x: 7, y: 15, to: 'skyroad', tx: 6, ty: 1 }, { x: 8, y: 15, to: 'skyroad', tx: 7, ty: 1 },
      { x: 3, y: 9, to: 'skyreach-house', tx: 3, ty: 5 }, { x: 4, y: 4, to: 'skyreach-center', tx: 3, ty: 5 }, { x: 12, y: 4, to: 'skyreach-mart', tx: 3, ty: 5 }
    ],
    npcs: [
      { id: 'skyreach-guide', name: 'Guide Cumulus', x: 6, y: 11, face: 'right', look: { skin: 0, hair: 6, outfit: 6, style: 1 },
        lines: ['Welcome to Skyreach, above the clouds!', 'The gym on the right is the last one. It asks for a buddy of level 56.', 'Riley is somewhere near. Riley trained very hard to be here with you.'] }
    ],
    objects: [
      { id: 'skyreach-gem', type: 'pickup', x: 13, y: 7, give: 'gems' },
      { id: 'skyreach-ore', type: 'pickup', x: 13, y: 11, give: 'ore' }
    ],
    trees: {},
    gyms: { '11,9': 'skyreach' },
    signs: { '12,12': { id: 'skyreach-quiz', text: 'Cloud quiz! Answer one question.', quiz: true } }
  },
  'skyreach-center': owRoom_skyreach('skyreach-center', 'Buddy Center', { to: 'skyreach', tx: 4, ty: 5 }, [
    { id: 'skyreach-nurse', kind: 'nurse', name: 'Nurse Breeze', x: 3, y: 1, face: 'down', look: { skin: 1, hair: 4, outfit: 6, style: 1 }, lines: ['Welcome to the Buddy Center!'] }
  ], [], OW_CENTER_ROWS),
  'skyreach-mart': owRoom_skyreach('skyreach-mart', 'Mart', { to: 'skyreach', tx: 12, ty: 5 }, [
    { id: 'skyreach-clerk', kind: 'clerk', name: 'Clerk Gale', x: 3, y: 2, face: 'down', look: { skin: 4, hair: 2, outfit: 0, style: 2 }, lines: ['Welcome to the Mart!'] }
  ], [], OW_MART_ROWS),
  'skyreach-house': owRoom_skyreach('skyreach-house', 'Dockhand\'s House', { to: 'skyreach', tx: 3, ty: 10 }, [
    { id: 'skyreach-dockhand', name: 'Dockhand Jet', x: 4, y: 2, face: 'down', look: { skin: 3, hair: 0, outfit: 1, style: 0 },
      lines: ['The airship dock is up the road. Not today, though!', 'Everything here floats, even the houses.', 'Keep your buddies close. The wind is strong up here.'] }
  ], [{ id: 'skyreach-house-net', type: 'pickup', x: 6, y: 4, give: 'net' }])
});
OW_LANDS.push({ land: 'skyreach', town: 'skyreach', routeIn: 'skyroad', center: 'skyreach-center', mart: 'skyreach-mart', house: 'skyreach-house', charm: '', nook: [] });
