// =====================================================================
//  ADVENTURE MAPS (plain data; the engine is 24g-ow-engine.js). One character per tile, every row of a map the same width (tests/overworld.test.mjs checks).
//  A warp is a tile that sends the hero to (tx, ty) of another map: that spot must be walkable and not a warp itself. `signs` give the text of a sign tile ("x,y").
//  Tile pictures are art/world/<t>.svg (scripts/world-art.mjs). `grass` tiles can start a wild fight (ECON.overworld).
// =====================================================================
const OW_TILES = {
  ',': { t: 't-grass' },
  '"': { t: 't-tall-grass', grass: true },
  '.': { t: 't-path' },
  '*': { t: 't-flower' },
  '_': { t: 't-sand' },
  '~': { t: 't-water', solid: true },
  'T': { t: 't-tree', solid: true },
  '#': { t: 't-rock', solid: true },
  '=': { t: 't-fence', solid: true },
  'b': { t: 't-bush', solid: true },
  's': { t: 't-sign', solid: true },
  'R': { t: 't-roof', solid: true },
  'W': { t: 't-house-wall', solid: true },
  'D': { t: 't-door', solid: true }
};
const OW_MAPS = {
  hollow: {
    id: 'hollow', name: 'Cozy Hollow', region: 'meadow', start: { x: 7, y: 9 },
    rows: [
      'TTTTTTT..TTTTTTT',
      'T,,,,,,..,,,,,,T',
      'T,RRRR,..,,**,,T',
      'T,RRRR,..,,**,,T',
      'T,WWDW,..,,,,,,T',
      'T,,,,,,..,,,,,,T',
      'T,,*,,,..,RRR,,T',
      'T,,,,,,..,RRR,,T',
      'T,,,,,,..,WDW,,T',
      'T,,,,,,..,,,,,,T',
      'T,,,s,,..,,,,*,T',
      'T,,,,,,..,,,,,,T',
      'TTTTTTTTTTTTTTTT'
    ],
    warps: [{ x: 7, y: 0, to: 'route1', tx: 6, ty: 22 }, { x: 8, y: 0, to: 'route1', tx: 7, ty: 22 }],
    signs: { '4,10': 'Cozy Hollow. Follow the path north to Route 1!' }
  },
  route1: {
    id: 'route1', name: 'Route 1', region: 'meadow', start: { x: 6, y: 22 },
    rows: [
      'TTTTTTTTTTTTTT',
      'T,,,,s..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,"",..,,**,T',
      'T,,"",..,,**,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..""",,T',
      'T,,,,,..""",,T',
      'T,,,,,..""",,T',
      'T,,,,,..,,,,,T',
      'T""",,..,,,,,T',
      'T""",,..,,,,,T',
      'T""",,..,,b,,T',
      'T,,,,,..,,,,,T',
      'T,,*,,..,,,,,T',
      'T,,,,,..""",,T',
      'T,,,,,..""",,T',
      'T,,,,,..,,,,,T',
      'T,"",,..,,,,,T',
      'T,"",,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T',
      'TTTTTT..TTTTTT'
    ],
    warps: [{ x: 6, y: 23, to: 'hollow', tx: 7, ty: 1 }, { x: 7, y: 23, to: 'hollow', tx: 8, ty: 1 }],
    signs: { '5,1': 'The road ends here for now. More lands are coming soon!' }
  }
};
const OW_START = { map: 'hollow' };
