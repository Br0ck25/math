// Store Companions: All unique names
const storePets = [
  { id: 'dog', name: 'Pup', icon: '🐶', cost: 0, element: 'nature', superMove: 'Bark Strike', evoLevel: 30, evoName: 'Thunder Wolf', evoIcon: '🐺' },
  { id: 'jimothy', name: 'Jimothy', icon: '🦝', cost: 0, element: 'dark', superMove: 'Trash Panda Tumble', evoLevel: 35, evoName: 'Midnight Raider', evoIcon: '🦝' },
  { id: 'fox', name: 'Sparky', icon: '🦊', cost: 52, element: 'fire', superMove: 'Flame Tail', evoLevel: 40, evoName: 'Blaze Fox', evoIcon: '🦊' },
  { id: 'bunny', name: 'Hops', icon: '🐰', cost: 75, element: 'magic', superMove: 'Carrot Cannon', evoLevel: 40, evoName: 'Moon Rabbit', evoIcon: '🐰' },
  { id: 'otter', name: 'Pip', icon: '🦦', cost: 104, element: 'water', superMove: 'River Splash', evoLevel: 40, evoName: 'Frost Otter', evoIcon: '🦦' },
  { id: 'hedgehog', name: 'Spike', icon: '🦔', cost: 145, element: 'nature', superMove: 'Needle Barrage', evoLevel: 45, evoName: 'Thorn King', evoIcon: '🦔' },
  { id: 'ignis', name: 'Ignis', icon: '🐲', cost: 182, element: 'fire', superMove: 'Inferno Blast', evoLevel: 50, evoName: 'Ancient Drake', evoIcon: '🐉' },
  { id: 'penguin', name: 'Pebble', icon: '🐧', cost: 220, element: 'water', superMove: 'Blizzard Slide', evoLevel: 50, evoName: 'Emperor Penguin', evoIcon: '🐧' },
  { id: 'bear', name: 'Barnaby', icon: '🐻', cost: 260, element: 'nature', superMove: 'Mega Maul', evoLevel: 50, evoName: 'Grizzly King', evoIcon: '🐻' },
  { id: 'olaf', name: 'Olaf', icon: '⛄', cost: 290, element: 'water', superMove: 'Warm Hug Avalanche', evoLevel: 50, evoName: 'Frost Olaf', evoIcon: '⛄' },
  { id: 'hedwig', name: 'Hedwig', icon: '🦉', cost: 320, element: 'magic', superMove: 'Letter Dive Strike', evoLevel: 50, evoName: 'Royal Hedwig', evoIcon: '🦉' },
  { id: 'dolphin', name: 'Splash', icon: '🐬', cost: 345, element: 'water', superMove: 'Hydro Jet', evoLevel: 50, evoName: 'Tidal Dolphin', evoIcon: '🐬' },
  { id: 'pascal', name: 'Pascal', icon: '🦎', cost: 380, element: 'nature', superMove: 'Camo Whip Strike', evoLevel: 55, evoName: 'Rainbow Chameleon', evoIcon: '🦎' },
  { id: 'byte', name: 'Byte', icon: '🤖', cost: 410, element: 'electric', superMove: 'Overclock Shock', evoLevel: 60, evoName: 'Cyber Mecha', evoIcon: '🤖' },
  { id: 'crookshanks', name: 'Crookshanks', icon: '🐱', cost: 440, element: 'magic', superMove: 'Kneazle Pounce', evoLevel: 60, evoName: 'Shadow Kneazle', evoIcon: '🐈' },
  { id: 'rhino', name: 'Tank', icon: '🦏', cost: 470, element: 'electric', superMove: 'Volt Charge', evoLevel: 65, evoName: 'Thunder Rhino', evoIcon: '🦏' },
  { id: 'tiger', name: 'Blaze', icon: '🐯', cost: 510, element: 'fire', superMove: 'Tiger Claw', evoLevel: 60, evoName: 'Saber Tiger', evoIcon: '🐅' },
  { id: 'panther', name: 'Nyx', icon: '🐆', cost: 560, element: 'dark', superMove: 'Shadow Pounce', evoLevel: 70, evoName: 'Night Panther', evoIcon: '🐈‍⬛' },
  { id: 'bat', name: 'Echo', icon: '🦇', cost: 610, element: 'dark', superMove: 'Sonic Shriek', evoLevel: 70, evoName: 'Vampire Lord', evoIcon: '🧛' },
  { id: 'griffin', name: 'Zeus', icon: '🦅', cost: 690, element: 'electric', superMove: 'Thunderstorm', evoLevel: 80, evoName: 'Sky King', evoIcon: '🦅' },
  { id: 'cosmo', name: 'Cosmo', icon: '🐈', cost: 780, element: 'magic', superMove: 'Supernova Wave', evoLevel: 75, evoName: 'Nova Astral', evoIcon: '🐈' },
  { id: 'lion', name: 'Aslan', icon: '🦁', cost: 870, element: 'nature', superMove: 'Solar Roar', evoLevel: 80, evoName: 'Golden Monarch', evoIcon: '🦁' },
  { id: 'phoenix', name: 'Solaris', icon: '🦅', cost: 975, element: 'fire', superMove: 'Solar Rebirth', evoLevel: 80, evoName: 'Sun Emperor', evoIcon: '🦅' },
  { id: 'frostfang', name: 'Frostfang', icon: '🐉', cost: 1105, element: 'water', superMove: 'Glacial Frost', evoLevel: 85, evoName: 'Ice Dragon', evoIcon: '🐉' },
  { id: 'pegasus', name: 'Aero', icon: '🦄', cost: 1450, element: 'magic', superMove: 'Starlight Gallop', evoLevel: 90, evoName: 'Celestial Pegasus', evoIcon: '🦄' },
  { id: 'panda', name: 'Mochi', icon: '🐼', cost: 1600, element: 'nature', superMove: 'Bamboo Crash', evoLevel: 85, evoName: 'Bamboo Sage', evoIcon: '🐼' },
  { id: 'koala', name: 'Dreamy', icon: '🐨', cost: 1700, element: 'magic', superMove: 'Lullaby Wave', evoLevel: 85, evoName: 'Dream Weaver', evoIcon: '🐨' },
  { id: 'monkey', name: 'Banjo', icon: '🐵', cost: 1800, element: 'electric', superMove: 'Vine Swing Shock', evoLevel: 85, evoName: 'Storm Ape', evoIcon: '🦧' },
  { id: 'turtle', name: 'Shelldon', icon: '🐢', cost: 1900, element: 'water', superMove: 'Shell Fortress', evoLevel: 90, evoName: 'Tidal Titan', evoIcon: '🐢' },
  { id: 'octopus', name: 'Octavia', icon: '🐙', cost: 2000, element: 'water', superMove: 'Eight Arm Whirl', evoLevel: 90, evoName: 'Abyssal Octavia', evoIcon: '🦑' },
  { id: 'wolf', name: 'Howl', icon: '🐺', cost: 2100, element: 'dark', superMove: 'Moonlit Howl', evoLevel: 90, evoName: 'Moon Fenrir', evoIcon: '🐺' },
  { id: 'zephyr', name: 'Zephyr', icon: '🐉', cost: 2250, element: 'electric', superMove: 'Thunder Wyrm Dive', evoLevel: 95, evoName: 'Storm Wyrm', evoIcon: '🐲' },
  { id: 'shark', name: 'Finn', icon: '🦈', cost: 2400, element: 'water', superMove: 'Deep Sea Chomp', evoLevel: 95, evoName: 'Leviathan Jaws', evoIcon: '🦈' },
  { id: 'raptor', name: 'Raptor', icon: '🦅', cost: 2550, element: 'nature', superMove: 'Cliffside Dive', evoLevel: 95, evoName: 'Apex Raptor', evoIcon: '🦅' },
  { id: 'scorpion', name: 'Dusty', icon: '🦂', cost: 2700, element: 'dark', superMove: 'Venom Sting', evoLevel: 95, evoName: 'Venom Emperor', evoIcon: '🦂' },
  { id: 'butterfly', name: 'Aurora', icon: '🦋', cost: 2850, element: 'magic', superMove: 'Aurora Wing Storm', evoLevel: 100, evoName: 'Aurora Monarch', evoIcon: '🦋' },
  { id: 'gorilla', name: 'Titan', icon: '🦍', cost: 3000, element: 'nature', superMove: 'Titan Slam', evoLevel: 100, evoName: 'Titan Alpha', evoIcon: '🦍' },
  { id: 'toon_bluey', name: 'Bluey', icon: '🐕', cost: 3050, element: 'nature', superMove: 'Keepy Uppy Spin', evoLevel: 100, evoName: 'Super Bluey', evoIcon: '🐕', show: 'Bluey' },
  { id: 'toon_spongebob', name: 'SpongeBob', icon: '🧽', cost: 3080, element: 'water', superMove: 'Bubble Blast Jellyfish Jam', evoLevel: 100, evoName: 'Mighty SpongeBob', evoIcon: '🧽', show: 'SpongeBob' },
  { id: 'toon_chase', name: 'Chase', icon: '🐕‍🦺', cost: 3110, element: 'electric', superMove: 'Pup Pursuit Siren', evoLevel: 100, evoName: 'Super Chase', evoIcon: '🐕‍🦺', show: 'Paw Patrol' },
  { id: 'toon_peppa', name: 'Peppa Pig', icon: '🐷', cost: 3140, element: 'water', superMove: 'Muddy Puddle Splash', evoLevel: 100, evoName: 'Puddle Queen Peppa', evoIcon: '🐷', show: 'Peppa Pig' },
  { id: 'toon_bugs', name: 'Bugs Bunny', icon: '🐰', cost: 3170, element: 'magic', superMove: 'Carrot Trick Shot', evoLevel: 100, evoName: 'Wascally Bugs', evoIcon: '🐰', show: 'Looney Tunes' },
  { id: 'toon_homer', name: 'Homer', icon: '👨‍🦲', cost: 3200, element: 'electric', superMove: 'Donut Overload', evoLevel: 100, evoName: 'Power Plant Homer', evoIcon: '👨‍🦲', show: 'The Simpsons' },
  { id: 'bandit', name: 'Bandit', icon: '🐈‍⬛', cost: 3250, element: 'shadow', superMove: 'Shadow Swipe', evoLevel: 100, evoName: 'Ninja Bandit', evoIcon: '🐈‍⬛' }
];



// Ultra-Rare Mythic Lore Legends (Harry Potter & Storybook Movie Royalty) - 4% Drop Rate
const mythicSpecies = [
  { id: 'mythic_harry',      name: 'Harry',        icon: '🧙',  elem: 'magic', superMove: 'Expelliarmus Burst', mythic: true },
  { id: 'mythic_hermione',   name: 'Hermione',     icon: '🧙‍♀️',  elem: 'magic',   superMove: 'Wingardium Leviosa', mythic: true },
  { id: 'mythic_ron',        name: 'Ron',          icon: '🧙',  elem: 'magic',     superMove: 'Wizard Chess Slam',  mythic: true },
  { id: 'mythic_dumbledore', name: 'Dumbledore',   icon: '🧙‍♂️', elem: 'magic',     superMove: 'Fawkes Inferno Fire',mythic: true },
  { id: 'mythic_dobby',      name: 'Dobby',        icon: '🧝',  elem: 'magic',   superMove: 'Free Elf Sock Strike',mythic: true },
  { id: 'mythic_fawkes',     name: 'Fawkes',       icon: '🦅',  elem: 'fire',     superMove: 'Phoenix Firestorm',  mythic: true },
  { id: 'mythic_buckbeak',   name: 'Buckbeak',     icon: '🦅',  elem: 'nature',   superMove: 'Hippogriff Talon Dive',mythic: true },
  { id: 'mythic_niffler',    name: 'Niffler',      icon: '🦫',  elem: 'dark',     superMove: 'Shiny Coin Whirlwind',mythic: true },
  { id: 'mythic_luna',       name: 'Luna',         icon: '👱‍♀️',  elem: 'magic',    superMove: 'Spectrespec Beam',   mythic: true },
  { id: 'mythic_sirius',     name: 'Sirius',       icon: '🐺',  elem: 'dark',     superMove: 'Padfoot Shadow Leap',mythic: true },
  { id: 'mythic_elsa',       name: 'Elsa',         icon: '👸',  elem: 'water',    superMove: 'Let It Go Frostwave', mythic: true },
  { id: 'mythic_anna',       name: 'Anna',         icon: '👩‍🦰',  elem: 'nature',   superMove: 'True Love Warmth',   mythic: true },
  { id: 'mythic_rapunzel',   name: 'Rapunzel',     icon: '👱‍♀️',  elem: 'magic', superMove: 'Sundrop Healing Ray',mythic: true },
  { id: 'mythic_moana',      name: 'Moana',        icon: '👧',  elem: 'water',    superMove: 'Ocean Crest Surge',  mythic: true },
  { id: 'mythic_mirabel',    name: 'Mirabel',      icon: '👩',  elem: 'magic',   superMove: 'Casita Butterfly Swarm',mythic: true },
  { id: 'mythic_ariel',      name: 'Ariel',        icon: '🧜‍♀️', elem: 'water',    superMove: 'Part of That World Wave',mythic: true },
  { id: 'mythic_belle',      name: 'Belle',        icon: '👩‍🦱',  elem: 'magic',   superMove: 'Enchanted Rose Petals',mythic: true },
  { id: 'mythic_cinderella', name: 'Cinderella',   icon: '👸',  elem: 'magic',    superMove: 'Midnight Glass Magic',mythic: true },
  { id: 'mythic_barbie',     name: 'Barbie',       icon: '👱‍♀️',  elem: 'fire',     superMove: 'Dreamhouse Sparkle', mythic: true },
  { id: 'mythic_tinkerbell', name: 'Tinkerbell',   icon: '🧚',  elem: 'magic', superMove: 'Pixie Dust Nova',    mythic: true },
  { id: 'mythic_mulan',      name: 'Mulan',        icon: '🦸‍♀️',  elem: 'fire',     superMove: 'Imperial Dragon Slash',mythic: true },
  { id: 'mythic_stitch',     name: 'Stitch',       icon: '👽',  elem: 'electric', superMove: 'Experiment 626 Havoc',mythic: true },
  { id: 'mythic_arthur',      name: 'Arthur',       icon: '🤴',  elem: 'magic',    superMove: 'Excalibur Rising',   mythic: true },
  { id: 'mythic_robin',      name: 'Robin',        icon: '🧝‍♂️',  elem: 'nature',   superMove: 'Merry Arrow Storm',  mythic: true },
  { id: 'mythic_alice',      name: 'Alice',        icon: '👱‍♀️',  elem: 'magic',    superMove: 'Rabbit Hole Whirl',  mythic: true },
  { id: 'mythic_sinbad',     name: 'Sinbad',       icon: '🧔',  elem: 'water',    superMove: 'Seven Voyages Wave', mythic: true },
  { id: 'mythic_aladdin',    name: 'Aladdin',      icon: '🧞',  elem: 'magic',    superMove: 'Lamp Wish Blast',    mythic: true },
  { id: 'mythic_dorothy',    name: 'Dorothy',      icon: '👧',  elem: 'electric', superMove: 'Yellow Brick Cyclone',mythic: true },
  { id: 'mythic_bingo',      name: 'Bingo',        icon: '🦮',  elem: 'magic',    superMove: 'Magic Xylophone Wave', mythic: true, show: 'Bluey' },
  { id: 'mythic_patrick',    name: 'Patrick Star', icon: '🌟',  elem: 'water',    superMove: 'Rock Bottom Slam',     mythic: true, show: 'SpongeBob' },
  { id: 'mythic_skye',       name: 'Skye',         icon: '🐩',  elem: 'magic',    superMove: 'High Flyer Rescue',    mythic: true, show: 'Paw Patrol' },
  { id: 'mythic_george',     name: 'George Pig',   icon: '🐖',  elem: 'fire',     superMove: 'Dine-Saw Roar',        mythic: true, show: 'Peppa Pig' },
  { id: 'mythic_lisa',       name: 'Lisa',         icon: '👧',  elem: 'magic',    superMove: 'Jazz Genius Burst',    mythic: true, show: 'The Simpsons' },
  { id: 'mythic_daffy',      name: 'Daffy Duck',   icon: '🦆',  elem: 'fire',     superMove: 'Dizzy Duck Dive',      mythic: true, show: 'Looney Tunes' },
  { id: 'mythic_roadrunner', name: 'Road Runner',  icon: '🐦',  elem: 'electric', superMove: 'Supersonic Dash',      mythic: true, show: 'Looney Tunes' },
  { id: 'mythic_sandy',      name: 'Sandy Cheeks', icon: '🐿️', elem: 'electric', superMove: 'Treedome Karate Chop', mythic: true, show: 'SpongeBob' }
];

const mythicCompanions = mythicSpecies.map(m => ({ ...m, element: m.elem, secret: true }));

// The ultra-rare trio (lowest drop rate in the game: 0.5% each). All three fight with Shadow power whatever their element badge
// says (x1.25 damage, no type weaknesses; see battleElement), so they are exactly as strong as each other.
// `snack` is the favorite food shown in Buddy care; `lore` is the line on the discovery window.
const janiePet = {
  id: 'secret_janie',
  name: 'Janie',
  icon: '👽',
  element: 'shadow',
  superMove: 'Cosmic Abduction',
  secret: true,
  isJanie: true,
  ultra: true,
  snack: { icon: '🍞', name: 'Hawaiian rolls' },
  lore: '👽 The Rarest Buddy in the Universe!'
};
const amberPet = {
  id: 'secret_amber',
  name: 'Amber',
  icon: '🦥',
  element: 'nature',
  superMove: 'Slow-Mo Slam',
  secret: true,
  ultra: true,
  snack: { icon: '🍟', name: 'air fried potatoes' },
  lore: '🦥 So slow, so strong! Never rushed, never beaten.'
};
const papawPet = {
  id: 'secret_papaw',
  name: 'Papaw',
  icon: '🧘',
  element: 'magic',
  superMove: 'Inner Peace Blast',
  secret: true,
  ultra: true,
  snack: { icon: '🍔', name: 'hamburgers' },
  lore: '🧘 Calm, wise and unstoppable.'
};
const ultraPets = [janiePet, amberPet, papawPet];

// Boss buddies: every boss can be won as a buddy by beating it ECON.bossBuddy.alphaWins times in its Alpha form (see checkBossBuddy).
// Ids are 'boss_' + the boss's position in monstersList (the list only ever grows, so ids stay stable); the three slayers have their own ids.
// They are ordinary-strength secret buddies. `fixed` holds the hand-made details; the rest comes from the boss itself.
const BOSS_BUDDY_FIXED = {
  boss_cow: { superMove: 'Stampede Slam', snack: { icon: '🌾', name: 'fresh hay' } },
  boss_harpy: { superMove: 'Thunder Talon Dive' },
  boss_mara: { superMove: 'Tempting Trick' },
  boss_rocky: { superMove: 'Big Dog Pounce', snack: { icon: '🦴', name: 'big bones' } },
  boss_54: { superMove: 'Zoomie Fetch Frenzy', snack: { icon: '🎾', name: 'tennis balls' } }
};
const BOSS_MOVE_VERB = { fire: 'Blaze', water: 'Surge', nature: 'Smash', electric: 'Shock', dark: 'Shadow Strike', magic: 'Spell' };
const bossBuddies = monstersList.map(function (m, i) {
  if (!m.buddy) m.buddy = 'boss_' + i;
  const fixed = BOSS_BUDDY_FIXED[m.buddy] || {};
  const noun = m.name.split(' ').pop();
  return {
    id: m.buddy, name: m.name, icon: m.icon, element: m.element, secret: true, bossBuddy: true,
    superMove: fixed.superMove || noun + ' ' + BOSS_MOVE_VERB[m.element], snack: fixed.snack
  };
});

// Legendary buddies: one per type, hunted once a week by Champions (24c-legend.js). They are only ever won that way.
// Append new ones; their order sets which type comes up in which week.
const legendPets = [
  { id: 'legend_fire', name: 'Solaris', icon: '🦁', element: 'fire', superMove: 'Sun Crown Blast', lore: 'Born in the heart of the Ember Hills, Solaris lights every sunrise.' },
  { id: 'legend_water', name: 'Tsunara', icon: '🐋', element: 'water', superMove: 'Great Wave', lore: 'Tsunara sings in the deepest part of Tide Bay and the tides listen.' },
  { id: 'legend_nature', name: 'Sylvara', icon: '🦌', element: 'nature', superMove: 'Ancient Bloom', lore: 'Flowers grow wherever Sylvara walks in Leaf Grove.' },
  { id: 'legend_electric', name: 'Stormara', icon: '🦅', element: 'electric', superMove: 'Skyfall Bolt', lore: 'Stormara rides the lightning above Volt Valley.' },
  { id: 'legend_dark', name: 'Umbra', icon: '🐆', element: 'dark', superMove: 'Eclipse', lore: 'Umbra drifts through Gloom Marsh and hides the moon when it is shy.' },
  { id: 'legend_magic', name: 'Lumina', icon: '🦄', element: 'magic', superMove: 'Starfall', lore: 'Lumina sleeps on Mystic Peak and dreams the stars into the sky.' }
].map(function (l) { return { ...l, secret: true, legend: true }; });

