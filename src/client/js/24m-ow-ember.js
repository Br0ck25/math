// =====================================================================
//  LAND PASS: Ember Hills. Route 2 leads in from Meadow Town (the road opens with the Meadow Badge); the town has a Buddy Center, a Mart, a house, the Ember Gym and a
//  rocky nook that opens with the Steam Boots (the charm of the Ember Badge). Data only: the rules are in 24g-ow-engine.js and 24k-ow-people.js.
// =====================================================================
const OW_EMBER_PALETTE = { grass: '#C29A5E', grassD: '#9A7440', leaf: '#8E5A2A', leafD: '#6B3F1A', path: '#D6BE98', pathD: '#B09468', roof: '#D9622B', roofD: '#A8431A' };
function owEmberRoom(id, name, exit, npcs, objects, rows) { return Object.assign(owRoom(id, name, exit, npcs, objects, rows), { region: 'ember', palette: OW_EMBER_PALETTE }); }
Object.assign(OW_MAPS, {
  route2: {
    id: 'route2', name: 'Route 2', region: 'ember', start: { x: 6, y: 22 }, palette: OW_EMBER_PALETTE,
    rows: [
      'TTTTTT..TTTTTT',
      'T,,,,,..,,,,,T',
      'T,,**,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,Y,,,..,""",T',
      'T,,,,,..,""",T',
      'T,,,,,..,""",T',
      'T,,,,,..,""",T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,""",..,,,,,T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,**,T',
      'T,,,,,..,,,,TT',
      'T,""",..,,,T,T',
      'T,""",..,,,g,T',
      'T,""",..,,,,TT',
      'T,""",..,,,,,T',
      'T,,,,,..,,,,,T',
      'TTTTTT..TTTTTT'
    ],
    warps: [
      { x: 6, y: 23, to: 'meadow', tx: 7, ty: 1 }, { x: 7, y: 23, to: 'meadow', tx: 7, ty: 1 },
      { x: 6, y: 0, to: 'ember', tx: 7, ty: 14 }, { x: 7, y: 0, to: 'ember', tx: 8, ty: 14 }
    ],
    npcs: [
      { id: 'route2-brick', kind: 'trainer', name: 'Hiker Brick', x: 3, y: 16, face: 'right', look: { skin: 3, hair: 0, outfit: 7, style: 0 },
        lines: ['Climbing makes me hungry for a battle!'], win: ['Phew! You are stronger than the mountain.'] },
      { id: 'route2-flint', kind: 'trainer', name: 'Camper Flint', x: 10, y: 8, face: 'left', look: { skin: 1, hair: 5, outfit: 1, style: 2 },
        lines: ['Hot day, hot battle! Ready?'], win: ['You cooled me down. Good match!'] }
    ],
    objects: [
      { id: 'route2-ore', type: 'pickup', x: 4, y: 8, give: 'ore' },
      { id: 'route2-nook-gem', type: 'pickup', x: 12, y: 18, give: 'gems' },
      { id: 'route2-nook-net', type: 'pickup', x: 12, y: 19, give: 'net' }
    ],
    trees: { '2,4': 'route2-tree' },
    signs: {}
  },
  ember: {
    id: 'ember', name: 'Ember Hills', region: 'ember', start: { x: 7, y: 13 }, palette: OW_EMBER_PALETTE,
    rows: [
      'TTTTTTTxTTTTTTTT',
      'T,,,,,,,,,,,,,,T',
      'T,RRRR,..,RRRR,T',
      'T,RRRR,..,RRRR,T',
      'T,WNDW,..,WKDW,T',
      'T,,,,,,..,,,,,#T',
      'T,,,,,,..,,,,,#T',
      'T,RRR,,..,RRR,,T',
      'T,RRR,,..,RRR,,T',
      'T,WDW,,..,WGW,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'T##*,,,..,,,s,,T',
      'T,,h,,,..,,,,,,T',
      'T,,#,,,..,,,,,,T',
      'TTTTTTT..TTTTTTT'
    ],
    warps: [
      { x: 7, y: 15, to: 'route2', tx: 6, ty: 1 }, { x: 8, y: 15, to: 'route2', tx: 7, ty: 1 },
      { x: 3, y: 9, to: 'ember-house', tx: 3, ty: 5 }, { x: 4, y: 4, to: 'ember-center', tx: 3, ty: 5 }, { x: 12, y: 4, to: 'ember-mart', tx: 3, ty: 5 },
      { x: 7, y: 0, to: 'route3', tx: 6, ty: 22 }
    ],
    npcs: [
      { id: 'ember-guide', name: 'Guide Cinder', x: 6, y: 11, face: 'right', look: { skin: 4, hair: 5, outfit: 1, style: 2 },
        lines: ['Welcome to Ember Hills! The ground here is warm all year.', 'The gym on the right belongs to the fire buddies. It asks for a buddy of level 8.', 'Win the Ember Badge and you get Steam Boots. They let you walk over the hot vents in the rocky nook on the left!'] }
    ],
    objects: [
      { id: 'ember-gem', type: 'pickup', x: 13, y: 7, give: 'gems' },
      { id: 'ember-ore', type: 'pickup', x: 13, y: 11, give: 'ore' },
      { id: 'ember-nook-ore', type: 'pickup', x: 1, y: 13, give: 'ore' },
      { id: 'ember-nook-gem', type: 'pickup', x: 2, y: 14, give: 'gems' }
    ],
    trees: {},
    roads: { '7,0': 'ember' },
    gyms: { '11,9': 'ember' },
    signs: { '12,12': { id: 'ember-quiz', text: 'Hot quiz! Answer one question.', quiz: true } }
  },
  'ember-center': owEmberRoom('ember-center', 'Buddy Center', { to: 'ember', tx: 4, ty: 5 }, [
    { id: 'ember-nurse', kind: 'nurse', name: 'Nurse Blaze', x: 3, y: 1, face: 'down', look: { skin: 2, hair: 5, outfit: 6, style: 1 }, lines: ['Welcome to the Buddy Center!'] }
  ], [], OW_CENTER_ROWS),
  'ember-mart': owEmberRoom('ember-mart', 'Mart', { to: 'ember', tx: 12, ty: 5 }, [
    { id: 'ember-clerk', kind: 'clerk', name: 'Clerk Ash', x: 3, y: 2, face: 'down', look: { skin: 4, hair: 0, outfit: 3, style: 2 }, lines: ['Welcome to the Mart!'] }
  ], [], OW_MART_ROWS),
  'ember-house': owEmberRoom('ember-house', 'Smith House', { to: 'ember', tx: 3, ty: 10 }, [
    { id: 'ember-smith', name: 'Smith Rowan', x: 4, y: 2, face: 'down', look: { skin: 3, hair: 1, outfit: 7, style: 0 },
      lines: ['I shape metal with the heat of the hills.', 'Fire buddies love it here. They warm up the forge for me!', 'A buddy that answers fast hits harder. Try it in the gym!'] }
  ], [{ id: 'ember-house-net', type: 'pickup', x: 6, y: 4, give: 'net' }])
});
OW_LANDS.push({ land: 'ember', town: 'ember', routeIn: 'route2', center: 'ember-center', mart: 'ember-mart', house: 'ember-house', charm: 'steam', nook: ['ember-nook-ore', 'ember-nook-gem'] });
