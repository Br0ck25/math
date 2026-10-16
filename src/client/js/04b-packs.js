// =====================================================================
//  BUDDY PACKS: every buddy belongs to exactly one pack, and the Collection Book groups by pack.
//  A buddy goes to the first pack that claims it, in this order: its cartoon show, its id, then its picture (emoji).
//  A new buddy needs no entry if its picture fits a pack below (boss buddies go by element); tests/packs.test.mjs fails if one lands in the catch-all.
// =====================================================================
const PACKS = [
  { id: 'pets', name: 'Pet Shop Pack', icon: '🐹', ids: ['secret_93'], icons: ['🐶', '🐱', '🐈', '🐕', '🐩', '🦮', '🐹', '🐭', '🐁', '🐀', '🐰', '🐇', '🧸'] },
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
  { id: 'arctic', name: 'Arctic Pack', icon: '❄️', icons: ['🦣', '❄️'], ids: ['penguin', 'secret_82'] },
  { id: 'garden', name: 'Garden Critters Pack', icon: '🐌', ids: ['secret_71', 'secret_72', 'secret_73', 'secret_74', 'secret_180', 'secret_181'] },
  { id: 'elements', name: 'Elements Pack', icon: '⚡', ids: ['secret_76', 'secret_77', 'secret_78', 'secret_79', 'secret_80', 'secret_83', 'secret_84'] },
  { id: 'space', name: 'Space & Tech Pack', icon: '🚀', icons: ['🪐', '⭐', '🚀', '🛸', '👽', '🤖'], ids: ['cosmo', 'byte', 'secret_janie', 'secret_75', 'secret_89', 'secret_90'] },
  { id: 'night', name: 'Night Pack', icon: '🦇', icons: ['🦇', '🎃', '👻'], ids: ['bat'] },
  { id: 'fantasy', name: 'Fantasy Pack', icon: '🐲', icons: ['🐲', '🐉', '🦄', '🧝'], ids: ['phoenix', 'griffin', 'secret_papaw'] },
  { id: 'treasure', name: 'Treasure & Knights Pack', icon: '💎', icons: ['💎', '👑', '🛡️', '⚔️', '🔮', '🧿'], ids: ['bandit', 'secret_85', 'secret_86', 'secret_87', 'secret_88', 'secret_91', 'secret_92'] },
  { id: 'wizard', name: 'Wizard School Pack', icon: '🧙', ids: ['hedwig', 'crookshanks', 'mythic_harry', 'mythic_hermione', 'mythic_ron', 'mythic_dumbledore', 'mythic_dobby', 'mythic_fawkes', 'mythic_buckbeak', 'mythic_niffler', 'mythic_luna', 'mythic_sirius'] },
  { id: 'princess', name: 'Fairytale Princess Pack', icon: '👸', ids: ['olaf', 'pascal', 'mythic_elsa', 'mythic_anna', 'mythic_rapunzel', 'mythic_moana', 'mythic_mirabel', 'mythic_ariel', 'mythic_belle', 'mythic_cinderella', 'mythic_barbie', 'mythic_tinkerbell', 'mythic_mulan', 'mythic_stitch'] },
  { id: 'legends', name: 'Storybook Legends Pack', icon: '🏰', ids: ['mythic_arthur', 'mythic_robin', 'mythic_alice', 'mythic_sinbad', 'mythic_aladdin', 'mythic_dorothy'] },
  { id: 'bluey', name: 'Bluey Pack', icon: '🐕', shows: ['Bluey'] },
  { id: 'spongebob', name: 'SpongeBob Pack', icon: '🧽', shows: ['SpongeBob'] },
  { id: 'pawpatrol', name: 'Paw Patrol Pack', icon: '🐕‍🦺', shows: ['Paw Patrol'] },
  { id: 'peppa', name: 'Peppa Pig Pack', icon: '🐷', shows: ['Peppa Pig'] },
  { id: 'simpsons', name: 'Simpsons Pack', icon: '👨‍🦲', shows: ['The Simpsons'] },
  { id: 'looney', name: 'Looney Tunes Pack', icon: '🐰', shows: ['Looney Tunes'] },
  { id: 'legends-hunt', name: 'Legend Hunt Pack', icon: '🌟', ids: ['legend_fire', 'legend_water', 'legend_nature', 'legend_electric', 'legend_dark', 'legend_magic'] },
  { id: 'boss-fire', name: 'Fire Boss Pack', icon: '🔥', bossElem: 'fire' },
  { id: 'boss-water', name: 'Water Boss Pack', icon: '💧', bossElem: 'water' },
  { id: 'boss-nature', name: 'Nature Boss Pack', icon: '🌿', bossElem: 'nature' },
  { id: 'boss-electric', name: 'Electric Boss Pack', icon: '⚡', bossElem: 'electric' },
  { id: 'boss-dark', name: 'Dark Boss Pack', icon: '🌑', bossElem: 'dark' },
  { id: 'boss-magic', name: 'Magic Boss Pack', icon: '✨', bossElem: 'magic' },
  { id: 'mystery', name: 'Mystery Pack', icon: '❓' }       // catch-all: nothing above claimed it
];
const PACK_BY_ID = {};
PACKS.forEach(function (p) { PACK_BY_ID[p.id] = p; });

// Every buddy in the game, in one list: store, mythic, the ultra-rare trio, the boss buddies, then secret creatures.
function allBuddies() { return storePets.concat(mythicCompanions, ultraPets, bossBuddies, secretCompanions, legendPets); }

let packCache = null;
function packOf(sp) {
  if (!packCache) {
    packCache = {};
    allBuddies().forEach(function (b) {
      const hit = PACKS.find(function (p) { return (p.shows && p.shows.indexOf(b.show) !== -1) || (p.ids && p.ids.indexOf(b.id) !== -1) || (p.bossElem && b.bossBuddy && p.bossElem === b.element); }) ||
        PACKS.find(function (p) { return p.icons && typeof (b.emoji || b.icon) === 'string' && p.icons.indexOf(b.emoji || b.icon) !== -1; }) || PACK_BY_ID.mystery;
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
