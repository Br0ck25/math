const monstersList = [
  // 6 Fire Bosses
  { name: "Fire Drake", icon: "🐲", baseHp: 4, element: "fire", taunts: ["You cannot calculate my flames!", "Feel the blazing inferno!"] },
  { name: "Magma Golem", icon: "🌋", baseHp: 5, element: "fire", taunts: ["I am forged in molten rock!", "Crushing your numbers!"] },
  { name: "Inferno Phoenix", icon: "🦅", baseHp: 5, element: "fire", taunts: ["From the ash I rise!", "Burn away your math skills!"] },
  { name: "Blazing Cerberus", icon: "🐕‍🦺", baseHp: 5, element: "fire", taunts: ["Three heads, triple the flame!", "No escape from my fire!"] },
  { name: "Sun Titan", icon: "☀️", baseHp: 6, element: "fire", taunts: ["I burn brighter than a thousand stars!", "Solar flare unleashed!"] },
  { name: "Cinder Djinn", icon: "🧞", baseHp: 5, element: "fire", taunts: ["Your answers turn to smoke!", "A wish for defeat granted!"] },

  // 6 Water Bosses
  { name: "Giggle Slime", icon: "👾", baseHp: 3, element: "water", taunts: ["Three digits are too big for you!", "Giggle-giggle! Bet you miss!"] },
  { name: "Cosmic Yeti", icon: "🦍", baseHp: 5, element: "water", taunts: ["Brrr! Freeze your brain!", "Subtractions leave you cold!"] },
  { name: "Leviathan Kraken", icon: "🦑", baseHp: 6, element: "water", taunts: ["Drown in the deep ocean depths!", "Eight arms to crush your streak!"] },
  { name: "Frost Mammoth", icon: "🦣", baseHp: 5, element: "water", taunts: ["I will freeze your calculations!", "Permafrost charge!"] },
  { name: "Abyssal Serpent", icon: "🐉", baseHp: 6, element: "water", taunts: ["The deep ocean crushes all!", "Tidal wave incoming!"] },
  { name: "Glacier Crab", icon: "🦀", baseHp: 5, element: "water", taunts: ["Cold as ice, sharp as pincers!", "Snap your numbers in half!"] },

  // 6 Nature Bosses
  { name: "Sneaky Goblin", icon: "👺", baseHp: 3, element: "nature", taunts: ["I'll steal your gems!", "Think fast, math cadet!"] },
  { name: "Bramble Treant", icon: "🌲", baseHp: 4, element: "nature", taunts: ["My roots hold deep!", "Tangle your calculations!"] },
  { name: "Venom Hydrak", icon: "🐍", baseHp: 5, element: "nature", taunts: ["Hiss! Toxic subtraction!", "Poison fangs strike hard!"] },
  { name: "Jungle Behemoth", icon: "🦏", baseHp: 5, element: "nature", taunts: ["Heavy footfalls shake the jungle!", "Nature's unstoppable force!"] },
  { name: "Spore Mantis", icon: "🦗", baseHp: 5, element: "nature", taunts: ["Fast strikes from the canopy!", "Blades of the forest!"] },
  { name: "Thorn Dragon", icon: "🐲", baseHp: 6, element: "nature", taunts: ["Sharp thorns defend the ancient grove!", "Entangling vines trap you!"] },

  // 6 Electric Bosses
  { name: "Robo-Glitch", icon: "🤖", baseHp: 4, element: "electric", taunts: ["Syntax Error in human brain!", "Multiplication overload!"] },
  { name: "Thunder Griffin", icon: "⚡", baseHp: 5, element: "electric", taunts: ["Lightning speed arithmetic!", "Shockwaves incoming!"] },
  { name: "Plasma Core", icon: "🛸", baseHp: 5, element: "electric", taunts: ["Voltage surge exceeding limit!", "Alien calculation protocol!"] },
  { name: "Volt Dynamo", icon: "🔋", baseHp: 5, element: "electric", taunts: ["High voltage overload!", "Batteries fully charged!"] },
  { name: "Storm Falcon", icon: "🦅", baseHp: 5, element: "electric", taunts: ["Lightning rides on my wings!", "Thunder crack in the sky!"] },
  { name: "Cyber Mecha", icon: "🦾", baseHp: 6, element: "electric", taunts: ["Target locked, human computation failing!", "Laser grid activated!"] },

  // 6 Dark Bosses
  { name: "Shadow Sphinx", icon: "🦁", baseHp: 5, element: "dark", taunts: ["None solve my ancient riddles!", "Step into the shadow realm!"] },
  { name: "Nightmare Bat", icon: "🦇", baseHp: 4, element: "dark", taunts: ["Blind in the pitch black!", "Screeching frequencies!"] },
  { name: "Void Reaper", icon: "💀", baseHp: 6, element: "dark", taunts: ["Your streak belongs to me!", "Fade into nothingness!"] },
  { name: "Phantom Ghost", icon: "👻", baseHp: 5, element: "dark", taunts: ["You cannot touch what is in the dark!", "Spectral chill down your spine!"] },
  { name: "Eclipse Wolf", icon: "🐺", baseHp: 5, element: "dark", taunts: ["The moon darkens when I hunt!", "Howl in the midnight void!"] },
  { name: "Cursed Mummy", icon: "🧟", baseHp: 6, element: "dark", taunts: ["Ancient math curses upon you!", "Sealed in dark tombs forever!"] },

  // 6 Magic Bosses
  { name: "Hex Witch", icon: "🧙‍♀️", baseHp: 5, element: "magic", taunts: ["Your numbers are bewitched!", "Eye of newt, tail of math!"] },
  { name: "Rune Golem", icon: "🗿", baseHp: 6, element: "magic", taunts: ["Ancient runes guard my answers!", "Stone and spell, you shall not pass!"] },
  { name: "Tome Mimic", icon: "📖", baseHp: 4, element: "magic", taunts: ["I am the book that bites back!", "Turn the page... if you dare!"] },
  { name: "Mirror Wraith", icon: "🪞", baseHp: 5, element: "magic", taunts: ["I reflect your every mistake!", "Which answer is real?"] },
  { name: "Chaos Jester", icon: "🤡", baseHp: 4, element: "magic", taunts: ["Abra-cadabra, you are wrong!", "Tricks and spells, no treats!"] },
  { name: "Arcane Archmage", icon: "🧙‍♂️", baseHp: 6, element: "magic", taunts: ["Behold my forbidden formulas!", "Mathematics is the oldest magic!"] },
  // ---- v4 additions: 14 more bosses (appended so saved boss books keep their numbers) ----
  { name: "Dynamite Imp", icon: "🧨", baseHp: 4, element: "fire", taunts: ["Three, two... boom!", "I light up every fuse!"] },
  { name: "Scorch Scorpion", icon: "🦂", baseHp: 5, element: "fire", taunts: ["My tail burns like a torch!", "The desert sand is red hot!"] },
  { name: "Ember Ogre", icon: "👹", baseHp: 6, element: "fire", taunts: ["Smash and sizzle!", "Nobody out-counts an ogre!"] },
  { name: "Tide Turtle", icon: "🐢", baseHp: 4, element: "water", taunts: ["Slow and steady beats you!", "Splash! Right into my shell!"] },
  { name: "Storm Shark", icon: "🦈", baseHp: 5, element: "water", taunts: ["I smell a wrong answer!", "Circling closer, little mathlete!"] },
  { name: "Coral Siren", icon: "🧜‍♀️", baseHp: 5, element: "water", taunts: ["My song makes numbers dance!", "Sink into the sparkling deep!"] },
  { name: "Swamp Gator", icon: "🐊", baseHp: 5, element: "nature", taunts: ["Snap! Too slow!", "The bog swallows bad sums!"] },
  { name: "Bee Queen", icon: "🐝", baseHp: 4, element: "nature", taunts: ["Buzz off, math cadet!", "My hive counts faster than you!"] },
  { name: "Neon Beetle", icon: "🪲", baseHp: 4, element: "electric", taunts: ["Glow, glow, zap!", "My shell is fully charged!"] },
  { name: "Circuit Spider", icon: "🕷️", baseHp: 5, element: "electric", taunts: ["Caught in my web of wires!", "Every thread carries a shock!"] },
  { name: "Gloom Owl", icon: "🦉", baseHp: 5, element: "dark", taunts: ["Who? Who got that wrong?", "The night sees every mistake!"] },
  { name: "Bone Pirate", icon: "☠️", baseHp: 6, element: "dark", taunts: ["Yo ho ho, give me your gems!", "X marks your mistake!"] },
  { name: "Potion Imp", icon: "🧪", baseHp: 4, element: "magic", taunts: ["Bubble, bubble, wrong answer!", "One drop and poof!"] },
  { name: "Mirror Knight", icon: "🤺", baseHp: 6, element: "magic", taunts: ["I copy every move you make!", "En garde, number knight!"] },

  // 3 Buddy Slayers: they fight like any other boss, but each is strong against one ultra-rare buddy (see ECON.boss.slayer)
  { name: "Bovine Bruiser", icon: "🐄", baseHp: 6, element: "nature", slays: "secret_janie", buddy: "boss_cow", taunts: ["Moo-ve over, math cadet!", "I will stampede right over your sums!"] },
  { name: "Harpy Eagle", icon: "🦅", baseHp: 6, element: "electric", slays: "secret_amber", buddy: "boss_harpy", taunts: ["Slow and steady will not save you from my dive!", "Nothing escapes my talons!"] },
  { name: "Māra", icon: "😈", baseHp: 6, element: "dark", slays: "secret_papaw", buddy: "boss_mara", taunts: ["Why not skip this one? Giving up is easier!", "Doubt is my favorite trick!"] },

  // The strongest boss of all (more HP and +1 attack), only met once your buddy is level 50 (`minLevel`), and a slayer of the Bandit: a big pitbull who chases cats
  { name: "Rocky", icon: "🐕", baseHp: 9, atkBonus: 1, minLevel: 50, element: "fire", slays: "bandit", buddy: "boss_rocky", taunts: ["Woof! Cats do not get past me!", "I am the biggest, strongest pup on the block!"] }
];

const GRADES = [
  { id: 0, label: 'K–2',      long: 'Grades K–2' },
  { id: 1, label: '3–5',      long: 'Grades 3–5' },
  { id: 2, label: '6–8',      long: 'Grades 6–8' },
  { id: 3, label: '9–12',     long: 'Grades 9–12' },
  { id: 4, label: 'College',  long: 'College' },
  { id: 5, label: 'Calculus', long: 'Calculus' }
];

// Math types switched on by default when you pick a grade
const GRADE_DEFAULT_OPS = [
  ['add', 'sub'],
  ['add', 'sub', 'mul', 'div'],
  ['add', 'sub', 'mul', 'div', 'pct', 'neg'],
  ['mul', 'div', 'pow', 'sqrt', 'alg', 'neg', 'quad'],
  ['alg', 'quad', 'log', 'pow', 'deriv'],
  ['deriv', 'integral', 'limit']
];

const sessionStats = {
  solved: 0,
  attempts: 0,
  goal: ECON.sessionGoal.start,
  goalClaimed: false,
  fastestTime: null,
  byOp: {}
};
