// =====================================================================
//  BUDDY PACKS: every buddy belongs to exactly one pack, and the Collection Book groups by pack.
//  A buddy goes to the first pack that claims it, in this order: its cartoon show, its id, then its picture (emoji).
//  A new buddy needs no entry if its picture fits a pack below; tests/packs.test.mjs fails if one lands in the catch-all.
// =====================================================================
const PACKS = [
  { id: 'pets', name: 'Pet Shop Pack', icon: '🐹', icons: ['🐶', '🐱', '🐈', '🐕', '🐩', '🦮', '🐹', '🐭', '🐁', '🐀', '🐰', '🐇', '🧸'] },
  { id: 'farm', name: 'Farm Pack', icon: '🐮', icons: ['🐮', '🐷', '🐖', '🐑', '🐐', '🐔', '🐓', '🐣', '🐥', '🦃', '🐴', '🐎', '🐂', '🐃', '🦙', '🦆'] },
  { id: 'cats', name: 'Wild Cats Pack', icon: '🐯', icons: ['🦁', '🐯', '🐅', '🐆'] },
  { id: 'bears', name: 'Bears & Pandas Pack', icon: '🐼', icons: ['🐼', '🐨', '🐻'] },
  { id: 'safari', name: 'Safari Pack', icon: '🦒', icons: ['🐵', '🦧', '🦍', '🦒', '🦓', '🦘', '🦏', '🦛', '🐘', '🐪', '🦥'] },
  { id: 'woodland', name: 'Woodland Pack', icon: '🦔', icons: ['🦔', '🦊', '🐺', '🦝', '🦡', '🦨', '🦫', '🦦', '🐿️', '🐗', '🦌'] },
  { id: 'ocean', name: 'Ocean Pack', icon: '🐬', icons: ['🐡', '🐠', '🐟', '🐬', '🐳', '🦈', '🦭', '🧜', '🌊', '💧'] },
  { id: 'shellfish', name: 'Shellfish & Squid Pack', icon: '🦀', icons: ['🐙', '🦑', '🦐', '🦞', '🦀', '🐚', '🦪'] },
  { id: 'sky', name: 'Sky & Birds Pack', icon: '🦅', icons: ['🦅', '🦉', '🦜', '🦢', '🦩', '🦚', '🕊️', '🐦', '🪶', '🐤', '🐧'] },
  { id: 'bugs', name: 'Bug Pack', icon: '🐝', icons: ['🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦗', '🕷️', '🦂', '🦟', '🪲', '🪰', '🪱', '🦠'] },
  { id: 'reptiles', name: 'Reptiles, Frogs & Dinos Pack', icon: '🦖', icons: ['🦎', '🐍', '🐢', '🐊', '🦖', '🦕', '🦤', '🐸'] },
  { id: 'arctic', name: 'Arctic Pack', icon: '❄️', icons: ['🦣', '❄️'], ids: ['penguin'] },
  { id: 'garden', name: 'Garden & Treats Pack', icon: '🌳', icons: ['🍄', '🌵', '🌲', '🍁', '🍉', '🧁'] },
  { id: 'elements', name: 'Elements Pack', icon: '⚡', icons: ['⚡', '🔥', '🌪️', '🌈', '☄️', '☀️', '🌙'] },
  { id: 'space', name: 'Space & Tech Pack', icon: '🚀', icons: ['🪐', '⭐', '🚀', '🛸', '👽', '🤖'], ids: ['cosmo', 'byte', 'secret_janie'] },
  { id: 'night', name: 'Night Pack', icon: '🦇', icons: ['🦇', '🎃', '👻'], ids: ['bat'] },
  { id: 'fantasy', name: 'Fantasy Pack', icon: '🐲', icons: ['🐲', '🐉', '🦄', '🧝'], ids: ['phoenix', 'griffin'] },
  { id: 'treasure', name: 'Treasure & Knights Pack', icon: '💎', icons: ['💎', '👑', '🛡️', '⚔️', '🔮', '🧿'], ids: ['bandit'] },
  { id: 'wizard', name: 'Wizard School Pack', icon: '🧙', ids: ['hedwig', 'crookshanks', 'mythic_harry', 'mythic_hermione', 'mythic_ron', 'mythic_dumbledore', 'mythic_dobby', 'mythic_fawkes', 'mythic_buckbeak', 'mythic_niffler', 'mythic_luna', 'mythic_sirius'] },
  { id: 'princess', name: 'Fairytale Princess Pack', icon: '👸', ids: ['olaf', 'pascal', 'mythic_elsa', 'mythic_anna', 'mythic_rapunzel', 'mythic_moana', 'mythic_mirabel', 'mythic_ariel', 'mythic_belle', 'mythic_cinderella', 'mythic_barbie', 'mythic_tinkerbell', 'mythic_mulan', 'mythic_stitch'] },
  { id: 'legends', name: 'Storybook Legends Pack', icon: '🏰', ids: ['mythic_arthur', 'mythic_robin', 'mythic_alice', 'mythic_sinbad', 'mythic_aladdin', 'mythic_dorothy'] },
  { id: 'bluey', name: 'Bluey Pack', icon: '🐕', shows: ['Bluey'] },
  { id: 'spongebob', name: 'SpongeBob Pack', icon: '🧽', shows: ['SpongeBob'] },
  { id: 'pawpatrol', name: 'Paw Patrol Pack', icon: '🚓', shows: ['Paw Patrol'] },
  { id: 'peppa', name: 'Peppa Pig Pack', icon: '🐷', shows: ['Peppa Pig'] },
  { id: 'simpsons', name: 'Simpsons Pack', icon: '🍩', shows: ['The Simpsons'] },
  { id: 'looney', name: 'Looney Tunes Pack', icon: '🥕', shows: ['Looney Tunes'] },
  { id: 'mystery', name: 'Mystery Pack', icon: '❓' }       // catch-all: nothing above claimed it
];
const PACK_BY_ID = {};
PACKS.forEach(function (p) { PACK_BY_ID[p.id] = p; });

// Every buddy in the game, in one list: store, mythic, the cosmic one, then secret creatures.
function allBuddies() { return storePets.concat(mythicCompanions, [janiePet], secretCompanions); }

let packCache = null;
function packOf(sp) {
  if (!packCache) {
    packCache = {};
    allBuddies().forEach(function (b) {
      const hit = PACKS.find(function (p) { return (p.shows && p.shows.indexOf(b.show) !== -1) || (p.ids && p.ids.indexOf(b.id) !== -1); }) ||
        PACKS.find(function (p) { return p.icons && typeof b.icon === 'string' && p.icons.indexOf(b.icon) !== -1; }) || PACK_BY_ID.mystery;
      packCache[b.id] = hit;
    });
  }
  return packCache[sp.id] || PACK_BY_ID.mystery;
}
// The packs that have members, in display order: [{pack, members}]
function buddyPacks() {
  return PACKS.map(function (p) { return { pack: p, members: allBuddies().filter(function (b) { return packOf(b) === p; }) }; })
    .filter(function (g) { return g.members.length > 0; });
}
