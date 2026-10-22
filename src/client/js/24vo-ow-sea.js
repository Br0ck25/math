// =====================================================================
//  THE OPEN SEA (Gold's Routes 19 to 21): Captain Wade of Tide Bay takes a hero who holds the Water Steps charm out to sea. Four islets lie in open water that only Surf crosses; each holds a find,
//  and water buddies of a higher level bite while you ride. A path of sand on the harbour islet leads home. Runs after the caves (24vn) so it can use the finished Tide Bay map.
// =====================================================================
OW_MAPS['tide-sea'] = {
  id: 'tide-sea', name: 'Open Sea', region: 'tide', palette: OW_MAPS.tide.palette, start: { x: 7, y: 12 },
  rows: ['~~~~~~~~~~~~~~~~', '~~~~~~~~~~~~~~~~', '~~,,,~~~~~~~~~~~', '~~,,,~~~~~~,,,~~', '~~~,~~~~~~~,,,~~', '~~~~~~~~~~~~~~~~', '~~~~~~~,,~~~~~~~', '~~~~~~~,,~~~~~~~', '~~~~~~~~~~~~~~~~', '~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~', '~~~~~~~dd~~~~~~~', '~~~~~~dddd~~~~~~', '~~~~~~dddd~~~~~~', '~~~~~~dddd~~~~~~', '~~~~~~~~~~~~~~~~'],
  warps: [{ x: 7, y: 14, to: 'tide', tx: OW_MAPS.tide.start.x, ty: OW_MAPS.tide.start.y }],
  npcs: [], signs: {}, trees: {},
  objects: [{ id: 'tide-sea-nook-gem', type: 'pickup', x: 3, y: 3, give: 'gems' }, { id: 'tide-sea-nook-net', type: 'pickup', x: 12, y: 4, give: 'net' },
    { id: 'tide-sea-nook-ultranet', type: 'pickup', x: 8, y: 7, give: 'ultranet' }]
};
// The dock door in the Captain's house (top wall) leads out; without the charm the sea sends you back (owSeaGuard in the engine).
OW_MAPS['tide-house'].rows = OW_MAPS['tide-house'].rows.slice();                  // the rooms share one row list: copy it before cutting a door
owSetTile('tide-house', 5, 0, 'D');
OW_MAPS['tide-house'].warps.push({ x: 5, y: 0, to: 'tide-sea', tx: 7, ty: 12 });
OW_MAPS['tide-sea'].warps[0] = { x: 7, y: 14, to: 'tide-house', tx: 5, ty: 1 };
OW_MAPS['tide-house'].npcs.find(function (n) { return n.id === 'tide-captain'; }).lines.push('The door at the back of my house opens on the open sea. Only a surfer should go out there!');
