// =====================================================================
//  LAND PASS: Spark City. Route 11 leads in from Thistle Wood (the road opens with the Thistle Badge); the town has a Buddy Center, a Mart, a house and the Spark City Gym.
//  Data only: the rules are in 24g-ow-engine.js and 24k-ow-people.js. Generated in the same shape as the other land files.
// =====================================================================
const OW_SPARK_PALETTE = { grass: '#C9D4DC', grassD: '#A9B8C4', leaf: '#6B7F95', leafD: '#4C6076', path: '#E8E8EE', pathD: '#C8CAD6', roof: '#E0B020', roofD: '#B08408', water: '#3E88B8' };
function owRoom_spark(id, name, exit, npcs, objects, rows) { return Object.assign(owRoom(id, name, exit, npcs, objects, rows), { region: 'spark', palette: OW_SPARK_PALETTE }); }
Object.assign(OW_MAPS, {
  route11: {
    id: 'route11', name: 'Route 11', region: 'spark', start: { x: 6, y: 22 }, palette: OW_SPARK_PALETTE,
    rows: [
      'TTTTTT..TTTTTT',
      'T,,,,,..,,,,,T',
      'T,**,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,Y,,,..,"",,T',
      'T,,,,,..,"",,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'TT""",..,""",T',
      'T,T"",..,""",T',
      'T,,,,,..,,,,,T',
      'TT,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'TTTTTT..TTTTTT'
    ],
    warps: [
      { x: 6, y: 23, to: 'thistle', tx: 7, ty: 1 }, { x: 7, y: 23, to: 'thistle', tx: 7, ty: 1 },
      { x: 6, y: 0, to: 'spark', tx: 7, ty: 14 }, { x: 7, y: 0, to: 'spark', tx: 8, ty: 14 }
    ],
    npcs: [
      { id: 'route11-a', kind: 'trainer', name: 'Engineer Volt', x: 10, y: 14, face: 'left', look: { skin: 0, hair: 1, outfit: 5, style: 3 },
        lines: ['My machines run on math. So does my buddy!'], win: ['Short circuit! You win!'] },
      { id: 'route11-b', kind: 'trainer', name: 'Courier Zip', x: 3, y: 12, face: 'right', look: { skin: 1, hair: 2, outfit: 0, style: 0 },
        lines: ['Gotta go fast. Battle fast too?'], win: ['You are even quicker than me!'] }
    ],
    objects: [
      { id: 'route11-gem', type: 'pickup', x: 9, y: 2, give: 'gems' },
      { id: 'route11-net', type: 'pickup', x: 1, y: 19, give: 'net' }
    ],
    trees: { '2,11': 'route11-tree' },
    signs: {}
  },
  spark: {
    id: 'spark', name: 'Spark City', region: 'spark', start: { x: 7, y: 13 }, palette: OW_SPARK_PALETTE,
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
      'T,WDW,,..,WGW,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,,,,..,,,s,,T',
      'TTT,,,,..,,,,,,T',
      'TT,,,,,..,,,,,,T',
      'TTTTTTT..TTTTTTT'
    ],
    warps: [
      { x: 7, y: 15, to: 'route11', tx: 6, ty: 1 }, { x: 8, y: 15, to: 'route11', tx: 7, ty: 1 },
      { x: 3, y: 9, to: 'spark-house', tx: 3, ty: 5 }, { x: 4, y: 4, to: 'spark-center', tx: 3, ty: 5 }, { x: 12, y: 4, to: 'spark-mart', tx: 3, ty: 5 },
      { x: 7, y: 0, to: 'route12', tx: 6, ty: 22 }
    ],
    npcs: [
      { id: 'spark-guide', name: 'Guide Dynamo', x: 6, y: 11, face: 'right', look: { skin: 4, hair: 7, outfit: 6, style: 1 },
        lines: ['Spark City never sleeps. The gym leader runs the biggest power grid around.', 'The gym on the right asks for a buddy of level 72.', 'Win the Spark Badge to keep going.'] }
    ],
    objects: [
      { id: 'spark-gem', type: 'pickup', x: 13, y: 7, give: 'gems' },
      { id: 'spark-net', type: 'pickup', x: 13, y: 11, give: 'net' }
    ],
    trees: {},
    roads: { '7,0': 'spark' },
    gyms: { '11,9': 'spark' },
    signs: { '12,12': { id: 'spark-quiz', text: 'City quiz! Answer one question.', quiz: true } }
  },
  'spark-center': owRoom_spark('spark-center', 'Buddy Center', { to: 'spark', tx: 4, ty: 5 }, [
    { id: 'spark-nurse', kind: 'nurse', name: 'Nurse Amp', x: 3, y: 1, face: 'down', look: { skin: 5, hair: 4, outfit: 7, style: 2 }, lines: ['Welcome to the Buddy Center!'] }
  ], [], OW_CENTER_ROWS),
  'spark-mart': owRoom_spark('spark-mart', 'Mart', { to: 'spark', tx: 12, ty: 5 }, [
    { id: 'spark-clerk', kind: 'clerk', name: 'Clerk Watt', x: 3, y: 2, face: 'down', look: { skin: 0, hair: 5, outfit: 1, style: 3 }, lines: ['Welcome to the Mart!'] }
  ], [], OW_MART_ROWS),
  'spark-house': owRoom_spark('spark-house', 'Inventor\'s House', { to: 'spark', tx: 3, ty: 10 }, [
    { id: 'spark-inventor', name: 'Inventor Gear', x: 4, y: 2, face: 'down', look: { skin: 1, hair: 6, outfit: 2, style: 0 },
      lines: ['I am building a calculator that fits in a hat. It does not fit in a hat yet.', 'Everything is bigger and tougher on this side of the Peak.', 'Keep your buddies rested and your nets stocked.'] }
  ], [{ id: 'spark-house-net', type: 'pickup', x: 6, y: 4, give: 'net' }])
});
OW_LANDS.push({ land: 'spark', town: 'spark', routeIn: 'route11', center: 'spark-center', mart: 'spark-mart', house: 'spark-house', charm: '', nook: [] });
