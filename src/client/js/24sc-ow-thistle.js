// =====================================================================
//  LAND PASS: Thistle Wood. Route 10 leads in from Coral Reach (the road opens with the Coral Badge); the town has a Buddy Center, a Mart, a house and the Thistle Wood Gym.
//  Data only: the rules are in 24g-ow-engine.js and 24k-ow-people.js. Generated in the same shape as the other land files.
// =====================================================================
const OW_THISTLE_PALETTE = { grass: '#9CC67A', grassD: '#76A85A', leaf: '#3F7A4A', leafD: '#2C5C37', path: '#D9C9A0', pathD: '#B9A97D', roof: '#7A5C99', roofD: '#563F73', water: '#4C93A8' };
function owRoom_thistle(id, name, exit, npcs, objects, rows) { return Object.assign(owRoom(id, name, exit, npcs, objects, rows), { region: 'thistle', palette: OW_THISTLE_PALETTE }); }
Object.assign(OW_MAPS, {
  route10: {
    id: 'route10', name: 'Route 10', region: 'thistle', start: { x: 6, y: 22 }, palette: OW_THISTLE_PALETTE,
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
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,TT',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'TTTTTT..TTTTTT'
    ],
    warps: [
      { x: 6, y: 23, to: 'coral', tx: 7, ty: 1 }, { x: 7, y: 23, to: 'coral', tx: 7, ty: 1 },
      { x: 6, y: 0, to: 'thistle', tx: 7, ty: 14 }, { x: 7, y: 0, to: 'thistle', tx: 8, ty: 14 }
    ],
    npcs: [
      { id: 'route10-a', kind: 'trainer', name: 'Bug Catcher Moss', x: 4, y: 9, face: 'right', look: { skin: 4, hair: 6, outfit: 4, style: 2 },
        lines: ['Shh! Do not scare the bugs. Do not scare me either!'], win: ['You are a sneaky good battler.'] },
      { id: 'route10-b', kind: 'trainer', name: 'Forager Bramble', x: 10, y: 12, face: 'left', look: { skin: 5, hair: 7, outfit: 7, style: 3 },
        lines: ['I know every berry in the wood. Do you know your times tables?'], win: ['Sweet as a berry. Good job!'] }
    ],
    objects: [
      { id: 'route10-gem', type: 'pickup', x: 11, y: 20, give: 'gems' },
      { id: 'route10-net', type: 'pickup', x: 12, y: 19, give: 'net' }
    ],
    trees: { '3,10': 'route10-tree' },
    signs: {}
  },
  thistle: {
    id: 'thistle', name: 'Thistle Wood', region: 'thistle', start: { x: 7, y: 13 }, palette: OW_THISTLE_PALETTE,
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
      'T,,,,,,..,,,s,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'TTTTTTT..TTTTTTT'
    ],
    warps: [
      { x: 7, y: 15, to: 'route10', tx: 6, ty: 1 }, { x: 8, y: 15, to: 'route10', tx: 7, ty: 1 },
      { x: 3, y: 9, to: 'thistle-house', tx: 3, ty: 5 }, { x: 4, y: 4, to: 'thistle-center', tx: 3, ty: 5 }, { x: 12, y: 4, to: 'thistle-mart', tx: 3, ty: 5 },
      { x: 7, y: 0, to: 'route11', tx: 6, ty: 22 }
    ],
    npcs: [
      { id: 'thistle-guide', name: 'Guide Thorn', x: 6, y: 11, face: 'right', look: { skin: 3, hair: 2, outfit: 5, style: 0 },
        lines: ['The wood grows thick here, and the gym leader grows thicker plants.', 'The gym on the right asks for a buddy of level 68.', 'Win the Thistle Badge to keep going.'] }
    ],
    objects: [
      { id: 'thistle-gem', type: 'pickup', x: 13, y: 7, give: 'gems' },
      { id: 'thistle-net', type: 'pickup', x: 13, y: 11, give: 'net' }
    ],
    trees: {},
    roads: { '7,0': 'thistle' },
    gyms: { '11,9': 'thistle' },
    signs: { '12,12': { id: 'thistle-quiz', text: 'Wood quiz! Answer one question.', quiz: true } }
  },
  'thistle-center': owRoom_thistle('thistle-center', 'Buddy Center', { to: 'thistle', tx: 4, ty: 5 }, [
    { id: 'thistle-nurse', kind: 'nurse', name: 'Nurse Fern', x: 3, y: 1, face: 'down', look: { skin: 4, hair: 3, outfit: 6, style: 1 }, lines: ['Welcome to the Buddy Center!'] }
  ], [], OW_CENTER_ROWS),
  'thistle-mart': owRoom_thistle('thistle-mart', 'Mart', { to: 'thistle', tx: 12, ty: 5 }, [
    { id: 'thistle-clerk', kind: 'clerk', name: 'Clerk Acorn', x: 3, y: 2, face: 'down', look: { skin: 5, hair: 4, outfit: 0, style: 2 }, lines: ['Welcome to the Mart!'] }
  ], [], OW_MART_ROWS),
  'thistle-house': owRoom_thistle('thistle-house', 'Herbalist\'s House', { to: 'thistle', tx: 3, ty: 10 }, [
    { id: 'thistle-herbalist', name: 'Herbalist Sage', x: 4, y: 2, face: 'down', look: { skin: 0, hair: 5, outfit: 1, style: 3 },
      lines: ['Nature buddies heal fast in the wood. The leaves tell me so.', 'Everything is bigger and tougher on this side of the Peak.', 'Keep your buddies rested and your nets stocked.'] }
  ], [{ id: 'thistle-house-net', type: 'pickup', x: 6, y: 4, give: 'net' }])
});
OW_LANDS.push({ land: 'thistle', town: 'thistle', routeIn: 'route10', center: 'thistle-center', mart: 'thistle-mart', house: 'thistle-house', charm: '', nook: [] });
