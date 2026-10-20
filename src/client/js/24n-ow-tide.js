// =====================================================================
//  LAND PASS: Tide Bay. Route 3 leads in from Ember Hills (the road opens with the Ember Badge); the town has a Buddy Center, a Mart, a house and the Tide Bay Gym, and a nook that opens with the Water Steps.
//  Data only: the rules are in 24g-ow-engine.js and 24k-ow-people.js. Generated in the same shape as the other land files.
// =====================================================================
const OW_TIDE_PALETTE = { grass: '#8FD3B6', grassD: '#5BAF92', leaf: '#2E8B7A', leafD: '#1F6A5C', path: '#E6DDB8', pathD: '#C9BF94', roof: '#2F7FD0', roofD: '#1D5CA3', water: '#4FB3E8' };
function owRoom_tide(id, name, exit, npcs, objects, rows) { return Object.assign(owRoom(id, name, exit, npcs, objects, rows), { region: 'tide', palette: OW_TIDE_PALETTE }); }
Object.assign(OW_MAPS, {
  route3: {
    id: 'route3', name: 'Route 3', region: 'tide', start: { x: 6, y: 22 }, palette: OW_TIDE_PALETTE,
    rows: [
      'TTTTTT..TTTTTT',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,""",..,,,,,T',
      'T,""",..,,,Y,T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'T,,,,,..,""",T',
      'T,,,,,..,""",T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,""",..,,,,,T',
      'T,""",..,,,,,T',
      'T,""",..,,,,,T',
      'T,""",..,,,,,T',
      'T,,,,,..,,,,,T',
      'TT**,,..,,,,,T',
      'T,T,,,..,""",T',
      'T,h,,,..,""",T',
      'TT,,,,..,""",T',
      'T,,,,,..,""",T',
      'T,,,,,..,,,,,T',
      'TTTTTT..TTTTTT'
    ],
    warps: [
      { x: 6, y: 23, to: 'ember', tx: 7, ty: 1 }, { x: 7, y: 23, to: 'ember', tx: 7, ty: 1 },
      { x: 6, y: 0, to: 'tide', tx: 7, ty: 14 }, { x: 7, y: 0, to: 'tide', tx: 8, ty: 14 }
    ],
    npcs: [
      { id: 'route3-marlo', kind: 'trainer', name: 'Swimmer Marlo', x: 10, y: 16, face: 'left', look: { skin: 1, hair: 3, outfit: 1, style: 0 },
        lines: ['The water was great today. Now for a battle!'], win: ['Splash! You are a strong swimmer on land too.'] },
      { id: 'route3-pip', kind: 'trainer', name: 'Sailor Pip', x: 3, y: 8, face: 'right', look: { skin: 2, hair: 0, outfit: 0, style: 2 },
        lines: ['Ahoy there! Ready to set sail into a battle?'], win: ['Fair winds to you! That was a fine match.'] }
    ],
    objects: [
      { id: 'route3-berries', type: 'pickup', x: 9, y: 12, give: 'berry' },
      { id: 'route3-nook-gem', type: 'pickup', x: 1, y: 18, give: 'gems' },
      { id: 'route3-nook-net', type: 'pickup', x: 1, y: 19, give: 'net' }
    ],
    trees: { '11,4': 'route3-tree' },
    signs: {}
  },
  tide: {
    id: 'tide', name: 'Tide Bay', region: 'tide', start: { x: 7, y: 13 }, palette: OW_TIDE_PALETTE,
    rows: [
      'TTTTTTTTTTTTTTTT',
      'T,,,,,,,,,,,,,,T',
      'T,RRRR,..,RRRR,T',
      'T,RRRR,..,RRRR,T',
      'T,WNDW,..,WKDW,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'T,RRR,,..,RRR,,T',
      'T,RRR,,..,RRR,,T',
      'T,WDW,,..,WGW,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'T~~,,,,..,,,s,,T',
      'T,,j,,,..,,,~~~T',
      'T,,~,,,..,,,~~~T',
      'TTTTTTT..TTTTTTT'
    ],
    warps: [
      { x: 7, y: 15, to: 'route3', tx: 6, ty: 1 }, { x: 8, y: 15, to: 'route3', tx: 7, ty: 1 },
      { x: 3, y: 9, to: 'tide-house', tx: 3, ty: 5 }, { x: 4, y: 4, to: 'tide-center', tx: 3, ty: 5 }, { x: 12, y: 4, to: 'tide-mart', tx: 3, ty: 5 }
    ],
    npcs: [
      { id: 'tide-guide', name: 'Guide Marina', x: 6, y: 11, face: 'right', look: { skin: 1, hair: 6, outfit: 0, style: 1 },
        lines: ['Welcome to Tide Bay! The water here is calm in the morning.', 'The gym on the right belongs to the water buddies. It asks for a buddy of level 16.', 'Win the Tide Badge and you get Water Steps. They make stepping stones in deep water, like in the little cove on the left!'] }
    ],
    objects: [
      { id: 'tide-gem', type: 'pickup', x: 13, y: 7, give: 'gems' },
      { id: 'tide-berry', type: 'pickup', x: 13, y: 11, give: 'berry' },
      { id: 'tide-nook-gem', type: 'pickup', x: 1, y: 13, give: 'gems' },
      { id: 'tide-nook-net', type: 'pickup', x: 2, y: 14, give: 'net' }
    ],
    trees: {},
    gyms: { '11,9': 'tide' },
    signs: { '12,12': { id: 'tide-quiz', text: 'Dockside quiz! Answer one question.', quiz: true } }
  },
  'tide-center': owRoom_tide('tide-center', 'Buddy Center', { to: 'tide', tx: 4, ty: 5 }, [
    { id: 'tide-nurse', kind: 'nurse', name: 'Nurse Coral', x: 3, y: 1, face: 'down', look: { skin: 1, hair: 2, outfit: 6, style: 1 }, lines: ['Welcome to the Buddy Center!'] }
  ], [], OW_CENTER_ROWS),
  'tide-mart': owRoom_tide('tide-mart', 'Mart', { to: 'tide', tx: 12, ty: 5 }, [
    { id: 'tide-clerk', kind: 'clerk', name: 'Clerk Pearl', x: 3, y: 2, face: 'down', look: { skin: 2, hair: 1, outfit: 0, style: 0 }, lines: ['Welcome to the Mart!'] }
  ], [], OW_MART_ROWS),
  'tide-house': owRoom_tide('tide-house', 'Captain\'s House', { to: 'tide', tx: 3, ty: 10 }, [
    { id: 'tide-captain', name: 'Captain Wade', x: 4, y: 2, face: 'down', look: { skin: 3, hair: 4, outfit: 7, style: 0 },
      lines: ['Ahoy! I steer the ferry across the bay.', 'Numbers matter at sea. A good sailor counts every wave.', 'Water buddies love a calm bay. They swim right up to the dock!'] }
  ], [{ id: 'tide-house-net', type: 'pickup', x: 6, y: 4, give: 'net' }])
});
OW_LANDS.push({ land: 'tide', town: 'tide', routeIn: 'route3', center: 'tide-center', mart: 'tide-mart', house: 'tide-house', charm: 'water', nook: ['tide-nook-gem', 'tide-nook-net'] });
