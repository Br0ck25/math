// =====================================================================
//  LAND PASS: Volt Valley. Route 5 leads in from Leaf Grove (the road opens with the Grove Badge); the town has a Buddy Center, a Mart, a house and the Volt Valley Gym, and a nook that opens with the Switch Key.
//  Data only: the rules are in 24g-ow-engine.js and 24k-ow-people.js. Generated in the same shape as the other land files.
// =====================================================================
const OW_VOLT_PALETTE = { grass: '#C8D36A', grassD: '#A5B046', leaf: '#7C8A2E', leafD: '#5E6A1E', path: '#DAD3B6', pathD: '#BDB591', roof: '#E2B92C', roofD: '#B88F10' };
function owRoom_volt(id, name, exit, npcs, objects, rows) { return Object.assign(owRoom(id, name, exit, npcs, objects, rows), { region: 'volt', palette: OW_VOLT_PALETTE }); }
Object.assign(OW_MAPS, {
  route5: {
    id: 'route5', name: 'Route 5', region: 'volt', start: { x: 6, y: 22 }, palette: OW_VOLT_PALETTE,
    rows: [
      'TTTTTT..TTTTTT',
      'T,,,,,..,,,,,T',
      'T,""",..,,,,,T',
      'T,""",..,,,,,T',
      'T,""",..,""",T',
      'T,""",..,""",T',
      'TY,,,,..,""",T',
      'T,,,,,..,""",T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..**,,,T',
      'T,""",..,,,,,T',
      'T,""",..,,,,,T',
      'T,""",..,,,,,T',
      'T,""",..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'TT,,,,..,,,,,T',
      'T,T,,,..,""",T',
      'T,k,,,..,""",T',
      'TT,,,,..,""",T',
      'T,,,,,..,""",T',
      'T,,,,,..,,,,,T',
      'TTTTTT..TTTTTT'
    ],
    warps: [
      { x: 6, y: 23, to: 'grove', tx: 7, ty: 1 }, { x: 7, y: 23, to: 'grove', tx: 7, ty: 1 },
      { x: 6, y: 0, to: 'volt', tx: 7, ty: 14 }, { x: 7, y: 0, to: 'volt', tx: 8, ty: 14 }
    ],
    npcs: [
      { id: 'route5-amp', kind: 'trainer', name: 'Linesman Amp', x: 10, y: 16, face: 'left', look: { skin: 2, hair: 1, outfit: 3, style: 0 },
        lines: ['Zzzap! I felt your buddy coming from far away!'], win: ['Shocking! You are a bright spark.'] },
      { id: 'route5-ohm', kind: 'trainer', name: 'Student Ohm', x: 3, y: 8, face: 'right', look: { skin: 1, hair: 0, outfit: 0, style: 2 },
        lines: ['I just learned about circuits. Let me test them in a battle!'], win: ['My circuit blew a fuse! Great match.'] }
    ],
    objects: [
      { id: 'route5-ore', type: 'pickup', x: 9, y: 12, give: 'ore' },
      { id: 'route5-nook-gem', type: 'pickup', x: 1, y: 18, give: 'gems' },
      { id: 'route5-nook-net', type: 'pickup', x: 1, y: 19, give: 'net' }
    ],
    trees: { '1,6': 'route5-tree' },
    signs: {}
  },
  volt: {
    id: 'volt', name: 'Volt Valley', region: 'volt', start: { x: 7, y: 13 }, palette: OW_VOLT_PALETTE,
    rows: [
      'TTTTTTTxTTTTTTTT',
      'T,,,,,,,,,,,,,,T',
      'T,RRRR,..,RRRR,T',
      'T,RRRR,..,RRRR,T',
      'T,WNDW,..,WKDW,T',
      'T,,,,,,..,,,,#,T',
      'T,,,,,,..,,,,#,T',
      'T,RRR,,..,RRR,,T',
      'T,RRR,,..,RRR,,T',
      'T,WDW,,..,WGW,,T',
      'T,,,,,,..,,,,,#T',
      'T,,,,,,..,,,,,,T',
      'T##,,,,..,,,s,,T',
      'T,,l,,,..,,,,,#T',
      'T,,#,,,..,,,,,,T',
      'TTTTTTT..TTTTTTT'
    ],
    warps: [
      { x: 7, y: 15, to: 'route5', tx: 6, ty: 1 }, { x: 8, y: 15, to: 'route5', tx: 7, ty: 1 },
      { x: 3, y: 9, to: 'volt-house', tx: 3, ty: 5 }, { x: 4, y: 4, to: 'volt-center', tx: 3, ty: 5 }, { x: 12, y: 4, to: 'volt-mart', tx: 3, ty: 5 },
      { x: 7, y: 0, to: 'route6', tx: 6, ty: 22 }
    ],
    npcs: [
      { id: 'volt-guide', name: 'Guide Spark', x: 6, y: 11, face: 'right', look: { skin: 2, hair: 4, outfit: 3, style: 2 },
        lines: ['Welcome to Volt Valley! Hear the towers hum?', 'The gym on the right is full of lightning-fast electric buddies. It asks for a buddy of level 32.', 'Win the Volt Badge and you get the Switch Key. It lowers the barrier in the humming nook on the left!'] }
    ],
    objects: [
      { id: 'volt-gem', type: 'pickup', x: 13, y: 7, give: 'gems' },
      { id: 'volt-berry', type: 'pickup', x: 13, y: 11, give: 'berry' },
      { id: 'volt-nook-gem', type: 'pickup', x: 1, y: 13, give: 'gems' },
      { id: 'volt-nook-net', type: 'pickup', x: 2, y: 14, give: 'net' }
    ],
    trees: {},
    roads: { '7,0': 'volt' },
    gyms: { '11,9': 'volt' },
    signs: { '12,12': { id: 'volt-quiz', text: 'Power quiz! Answer one question.', quiz: true } }
  },
  'volt-center': owRoom_volt('volt-center', 'Buddy Center', { to: 'volt', tx: 4, ty: 5 }, [
    { id: 'volt-nurse', kind: 'nurse', name: 'Nurse Bolt', x: 3, y: 1, face: 'down', look: { skin: 1, hair: 3, outfit: 3, style: 1 }, lines: ['Welcome to the Buddy Center!'] }
  ], [], OW_CENTER_ROWS),
  'volt-mart': owRoom_volt('volt-mart', 'Mart', { to: 'volt', tx: 12, ty: 5 }, [
    { id: 'volt-clerk', kind: 'clerk', name: 'Clerk Fuse', x: 3, y: 2, face: 'down', look: { skin: 3, hair: 5, outfit: 0, style: 2 }, lines: ['Welcome to the Mart!'] }
  ], [], OW_MART_ROWS),
  'volt-house': owRoom_volt('volt-house', 'Inventor\'s House', { to: 'volt', tx: 3, ty: 10 }, [
    { id: 'volt-inventor', name: 'Inventor Gizmo', x: 4, y: 2, face: 'down', look: { skin: 2, hair: 2, outfit: 5, style: 2 },
      lines: ['I build machines out of wires and numbers!', 'Electric buddies charge my batteries. In return I polish their fur.', 'Every gadget is just a long list of small steps. Counting, adding, repeating.'] }
  ], [{ id: 'volt-house-net', type: 'pickup', x: 6, y: 4, give: 'net' }])
});
OW_LANDS.push({ land: 'volt', town: 'volt', routeIn: 'route5', center: 'volt-center', mart: 'volt-mart', house: 'volt-house', charm: 'switch', nook: ['volt-nook-gem', 'volt-nook-net'] });
