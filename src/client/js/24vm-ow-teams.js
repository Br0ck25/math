// =====================================================================
//  HAND-WRITTEN TEAMS AND TABLES: every route trainer (and side-path trainer) has its own team, and the far journey's eight routes have their own wild tables like the first journey's.
//  OW_TEAMS maps a trainer's id to [kind, level] pairs (a rematch adds ECON.phone.levels). Rival Riley and the story bosses keep their own rules.
// =====================================================================
Object.assign(OW_WILD_HAND, {
  route8:  { lv: [57, 60], day: ['tiger', 'ignis', 'fox', 'raptor', 'phoenix'],         morning: ['tiger', 'ignis', 'scorpion', 'raptor', 'phoenix'],    night: ['tiger', 'wolf', 'fox', 'scorpion', 'phoenix'] },
  route9:  { lv: [61, 64], day: ['shark', 'octopus', 'turtle', 'dolphin', 'frostfang'],  morning: ['shark', 'octopus', 'turtle', 'butterfly', 'frostfang'], night: ['shark', 'bat', 'turtle', 'dolphin', 'frostfang'] },
  route10: { lv: [65, 68], day: ['raptor', 'panda', 'bear', 'pascal', 'gorilla'],        morning: ['raptor', 'panda', 'bear', 'butterfly', 'gorilla'],    night: ['raptor', 'wolf', 'bear', 'pascal', 'gorilla'] },
  route11: { lv: [69, 72], day: ['zephyr', 'monkey', 'byte', 'rhino', 'griffin'],        morning: ['zephyr', 'monkey', 'byte', 'rhino', 'griffin'],        night: ['zephyr', 'bat', 'byte', 'panther', 'griffin'] },
  route12: { lv: [73, 76], day: ['bat', 'scorpion', 'jimothy', 'panther', 'wolf'],       morning: ['bat', 'scorpion', 'panda', 'panther', 'wolf'],         night: ['bat', 'scorpion', 'jimothy', 'panther', 'wolf'] },
  route13: { lv: [77, 80], day: ['cosmo', 'hedwig', 'koala', 'crookshanks', 'pegasus'],  morning: ['cosmo', 'hedwig', 'koala', 'butterfly', 'pegasus'],    night: ['cosmo', 'hedwig', 'bat', 'crookshanks', 'pegasus'] },
  route14: { lv: [81, 85], day: ['lion', 'shark', 'phoenix', 'griffin', 'pegasus'],      morning: ['lion', 'shark', 'tiger', 'griffin', 'pegasus'],        night: ['lion', 'wolf', 'phoenix', 'cosmo', 'pegasus'] },
  route15: { lv: [86, 90], day: ['gorilla', 'wolf', 'pegasus', 'phoenix', 'griffin'],    morning: ['gorilla', 'raptor', 'pegasus', 'phoenix', 'griffin'],  night: ['gorilla', 'wolf', 'cosmo', 'panther', 'griffin'] }
});
const OW_TEAMS = {
  'route1-pia': [['dog', 3], ['bunny', 4]], 'route1-leo': [['fox', 4]], 'route1-side-folk': [['dog', 4], ['otter', 4]],
  'route2-brick': [['tiger', 8], ['fox', 7]], 'route2-flint': [['ignis', 8], ['fox', 8], ['bunny', 7]], 'route2-side-folk': [['fox', 9], ['jimothy', 8]],
  'route3-marlo': [['otter', 15], ['dolphin', 16]], 'route3-pip': [['penguin', 15], ['olaf', 16], ['otter', 14]], 'route3-side-folk': [['dolphin', 17], ['hedwig', 16]],
  'route4-fern': [['dog', 22], ['hedgehog', 23], ['pascal', 24]], 'route4-oak': [['bear', 24], ['lion', 25]], 'route4-side-folk': [['otter', 23], ['olaf', 24]],
  'route5-amp': [['byte', 30], ['monkey', 31]], 'route5-ohm': [['zephyr', 31], ['rhino', 32], ['byte', 30]], 'route5-side-folk': [['griffin', 33], ['monkey', 31]],
  'route6-dusk': [['bat', 38], ['jimothy', 38], ['panther', 39]], 'route6-glow': [['wolf', 40], ['scorpion', 39]], 'route6-side-folk': [['panther', 40], ['bat', 39]],
  'route7-cass': [['cosmo', 46], ['hedwig', 47]], 'route7-sol': [['koala', 47], ['crookshanks', 48], ['bunny', 46]], 'route7-side-folk': [['pegasus', 49], ['hedwig', 47]],
  'skyroad-cirrus': [['pegasus', 55], ['griffin', 55]], 'skyroad-skye': [['phoenix', 56], ['butterfly', 54], ['zephyr', 55]], 'skyroad-side-folk': [['pegasus', 57], ['phoenix', 56]],
  'route8-a': [['tiger', 59], ['ignis', 60]], 'route8-b': [['fox', 59], ['phoenix', 61], ['raptor', 60]], 'route8-side-folk': [['gorilla', 61], ['tiger', 60]],
  'route9-a': [['shark', 63], ['octopus', 64]], 'route9-b': [['turtle', 63], ['dolphin', 64], ['frostfang', 65]], 'route9-side-folk': [['shark', 65], ['bat', 63]],
  'route10-a': [['raptor', 67], ['panda', 66]], 'route10-b': [['bear', 67], ['pascal', 68], ['butterfly', 66]], 'route10-side-folk': [['gorilla', 69], ['hedwig', 67]],
  'route11-a': [['byte', 71], ['rhino', 71]], 'route11-b': [['zephyr', 72], ['monkey', 71], ['griffin', 73]], 'route11-side-folk': [['griffin', 73], ['otter', 70]],
  'route12-a': [['bat', 75], ['panther', 76]], 'route12-b': [['scorpion', 75], ['wolf', 77], ['jimothy', 74]], 'route12-side-folk': [['wolf', 78], ['panther', 76]],
  'route13-a': [['cosmo', 79], ['koala', 78]], 'route13-b': [['pegasus', 81], ['hedwig', 79], ['crookshanks', 80]], 'route13-side-folk': [['butterfly', 81], ['cosmo', 80]],
  'route14-a': [['lion', 84], ['shark', 83]], 'route14-b': [['phoenix', 85], ['griffin', 84], ['pegasus', 83]], 'route14-side-folk': [['gorilla', 85], ['wolf', 84]],
  'route15-a': [['gorilla', 89], ['pegasus', 90]], 'route15-b': [['phoenix', 89], ['wolf', 90], ['griffin', 88]], 'route15-side-folk': [['lion', 91], ['shark', 90]]
};
// The gyms: three trainers (the second is always Rival Riley, who grows with the story) and then the leader, whose boss is fixed by the land (abBossIndex with the land's id) with the third trainer's kinds at its side.
const GYM_TEAMS = {
  meadow:   [[['dog', 2]], [['bunny', 3], ['fox', 3]], [['otter', 3], ['dog', 4]]],
  ember:    [[['fox', 8]], [['ignis', 9], ['bunny', 9]], [['tiger', 10], ['fox', 9]]],
  tide:     [[['otter', 16]], [['dolphin', 17], ['bunny', 17]], [['olaf', 18], ['penguin', 17]]],
  grove:    [[['dog', 24]], [['hedgehog', 25], ['bunny', 25]], [['bear', 26], ['pascal', 25]]],
  volt:     [[['byte', 32]], [['monkey', 33], ['bunny', 33]], [['rhino', 34], ['zephyr', 33]]],
  gloom:    [[['jimothy', 40]], [['panther', 41], ['bunny', 41]], [['bat', 42], ['wolf', 41]]],
  mystic:   [[['hedwig', 48]], [['cosmo', 49], ['bunny', 49]], [['koala', 50], ['crookshanks', 49]]],
  skyreach: [[['pegasus', 56]], [['butterfly', 57], ['phoenix', 57], ['bunny', 57]], [['griffin', 58], ['pegasus', 57]]],
  cinder:   [[['tiger', 60]], [['ignis', 61], ['phoenix', 61]], [['fox', 62], ['raptor', 61]]],
  coral:    [[['shark', 64]], [['octopus', 65], ['frostfang', 65]], [['turtle', 66], ['dolphin', 65]]],
  thistle:  [[['raptor', 68]], [['panda', 69], ['pascal', 69]], [['gorilla', 70], ['bear', 69]]],
  spark:    [[['zephyr', 72]], [['monkey', 73], ['griffin', 73]], [['rhino', 74], ['byte', 73]]],
  dusk:     [[['bat', 76]], [['wolf', 77], ['scorpion', 77]], [['panther', 78], ['jimothy', 77]]],
  prism:    [[['cosmo', 80]], [['hedwig', 81], ['crookshanks', 81]], [['koala', 82], ['pegasus', 81]]],
  cross:    [[['lion', 85]], [['shark', 86], ['phoenix', 86], ['pegasus', 86]], [['gorilla', 87], ['wolf', 86]]],
  summit:   [[['griffin', 90]], [['pegasus', 91], ['phoenix', 91], ['wolf', 91]], [['gorilla', 92], ['lion', 91], ['shark', 92]]]
};
// The swimmers on each route's pond islet fight with the side-path trainer's buddies (a swimmer is a trainer of the same level).
OW_LANDS.forEach(function (L) { const t = OW_TEAMS[L.routeIn + '-side-folk']; if (t) OW_TEAMS[L.routeIn + '-swimmer'] = t.map(function (b) { return [b[0], b[1]]; }); });
