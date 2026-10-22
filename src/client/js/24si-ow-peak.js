// =====================================================================
//  SILVER PEAK: above the Summit Citadel, one door and one fighter. Master Ori's six legends are the last fight of the second journey (Gold's Red on Mt. Silver).
//  The road opens with the Summit Badge; the door is a gym tile of the pseudo land 'master' (24k-ow-people.js owEnterMaster, 24y-ow-arenas.js abStartMaster).
// =====================================================================
OW_MAPS.summit.rows[0] = OW_MAPS.summit.rows[0].slice(0, 7) + 'x' + OW_MAPS.summit.rows[0].slice(8);
OW_MAPS.summit.roads = Object.assign(OW_MAPS.summit.roads || {}, { '7,0': 'summit' });
OW_MAPS.summit.warps.push({ x: 7, y: 0, to: 'peak', tx: 6, ty: 18 });
Object.assign(OW_MAPS, {
  peak: {
    id: 'peak', name: 'Silver Peak', region: 'summit', start: { x: 6, y: 18 }, palette: OW_SUMMIT_PALETTE,
    rows: ['TTTTTTTTTTTTTT', 'T,,,RRRR,,,,,T', 'T,,,RRRR,,,,,T', 'T,,,WWGW,,,,,T', 'T,,,,s..,,,,,T', 'T,,,,,..,,,*,T', 'T,,,,,..,,,,,T', 'T,*,,,..,,,,,T', 'T,,,,,..,,,,,T', 'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T', 'T,,,,,..,,,,,T', 'T,,,,,..,,*,,T', 'T,,,,,..,,,,,T', 'T,,,,,..,,,,,T', 'T,,,,,..,,,,,T', 'T,,*,,..,,,,,T', 'T,,,,,..,,,,,T', 'T,,,,,..,,,,,T', 'TTTTTT..TTTTTT'],
    warps: [{ x: 6, y: 19, to: 'summit', tx: 7, ty: 1 }, { x: 7, y: 19, to: 'summit', tx: 8, ty: 1 }],
    npcs: [],
    objects: [{ id: 'peak-gem', type: 'pickup', x: 11, y: 5, give: 'gems' }],
    gyms: { '6,3': 'master' },
    signs: { '5,4': 'Silver Peak. Only a trainer with the Summit Badge may meet the Master.' }
  }
});
