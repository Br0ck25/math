// =====================================================================
//  THE OPEN SEAS (Gold's Routes 19 to 21): a dock door in a harbour house (Captain Wade's in Tide Bay, the Reef Keeper's in Coral Reach) opens on open water that only Surf crosses.
//  Islets lie out in it, each with a find, and water buddies of a higher level bite while you ride. A path of sand on the harbour islet leads home. Without the Water Steps charm the
//  door sends you back (the engine reads `guard`). Runs after the caves (24vn) so it can use the finished town maps.
// =====================================================================
function owMakeSea(s) {
  const houseMap = OW_MAPS[s.house], L = s.rows.length, harbour = { x: 7, y: L - 2 };
  OW_MAPS[s.id] = { id: s.id, name: s.name, region: s.land, palette: OW_MAPS[s.land].palette, start: { x: 7, y: L - 4 }, rows: s.rows, sea: s.bonus,
    warps: [{ x: harbour.x, y: harbour.y, to: s.house, tx: 5, ty: 1 }], npcs: [], signs: {}, trees: {}, guard: { key: 'water', to: s.house, x: 5, y: 1 },
    objects: s.finds.map(function (f, i) { return { id: s.id + '-nook-' + f[2] + i, type: 'pickup', x: f[0], y: f[1], give: f[2] }; }) };
  houseMap.rows = houseMap.rows.slice();                                  // the rooms share one row list: copy it before cutting a door
  owSetTile(s.house, 5, 0, 'D');
  houseMap.warps.push({ x: 5, y: 0, to: s.id, tx: 7, ty: L - 4 });
  houseMap.npcs.find(function (n) { return n.id === s.keeper; }).lines.push(s.line);
}
owMakeSea({ id: 'tide-sea', name: 'Open Sea', land: 'tide', house: 'tide-house', keeper: 'tide-captain', bonus: 3,
  line: 'The door at the back of my house opens on the open sea. Only a surfer should go out there!',
  rows: ['~~~~~~~~~~~~~~~~', '~~~~~~~~~~~~~~~~', '~~,,,~~~~~~~~~~~', '~~,,,~~~~~~,,,~~', '~~~,~~~~~~~,,,~~', '~~~~~~~~~~~~~~~~', '~~~~~~~,,~~~~~~~', '~~~~~~~,,~~~~~~~', '~~~~~~~~~~~~~~~~', '~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~', '~~~~~~~dd~~~~~~~', '~~~~~~dddd~~~~~~', '~~~~~~dddd~~~~~~', '~~~~~~dddd~~~~~~', '~~~~~~~~~~~~~~~~'],
  finds: [[3, 3, 'gems'], [12, 4, 'net'], [8, 7, 'ultranet']] });
owMakeSea({ id: 'coral-sea', name: 'Deep Sea', land: 'coral', house: 'coral-house', keeper: 'coral-reefer', bonus: 5,
  line: 'There is a door at the back of my house. It opens on the deep sea, where the big ones swim. Surf carefully!',
  rows: ['~~~~~~~~~~~~~~~~', '~,,~~~~~~~~~,,~~', '~,,~~~~~~~~~,,~~', '~~~~~~~~~~~~~~~~', '~~~~~,,,,~~~~~~~', '~~~~~,,,,~~~~~~~', '~~~~~~~~~~~~~~~~', '~~,,~~~~~~~~,,~~', '~~,,~~~~~~~~,,~~', '~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~', '~~~~~~~dd~~~~~~~', '~~~~~~dddd~~~~~~', '~~~~~~dddd~~~~~~', '~~~~~~dddd~~~~~~', '~~~~~~~~~~~~~~~~'],
  finds: [[1, 1, 'gems'], [12, 1, 'ultranet'], [6, 4, 'net'], [2, 7, 'gems'], [12, 7, 'ultranet']] });
