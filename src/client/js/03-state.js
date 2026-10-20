// Bump SCHEMA_VERSION and add a MIGRATIONS entry (10-save-load.js) whenever a saved field changes shape.
const SCHEMA_VERSION = 1;
function defaultProfile() {
  return { title: 'Rookie Calculator', unlockedTitles: ['Rookie Calculator'], frame: 'classic', unlockedFrames: ['classic'], showcase: [] };
}
function freshState() {
  return {
    v: SCHEMA_VERSION,
    grade: 1,
    enabledOps: GRADE_DEFAULT_OPS[1].slice(),
    gems: 0,
    streak: 0,
    shields: 0,
    cloverLeft: 0,
    heldOwned: [],                                   // held item ids you have bought
    held: {},                                        // buddy id -> held item id (one each, an item is held by one buddy)
    ranch: { at: 0, workers: {}, stock: { berry: 0, ore: 0, honey: 0, parts: 0 } },   // buddy id -> station id, the goods in the barn, and when work was last counted
    spring: { day: '' },                             // the day the free Healing Spring visit was used (24b-map.js)
    rested: { day: '', fights: {} },                 // buddy id -> plain wild wins today (the first ECON.farm.restedWins of each earn bonus XP)
    wildWins: { day: '', n: 0 },                     // plain wild wins today (after ECON.farm.dailyWins, wild gems are smaller)
    trails: {},                                      // land id -> { day, done: [spot numbers] }: today's Trail progress
    trailGems: { day: '', n: 0 },                    // how many Trails paid gems today
    evoPath: {},                                     // buddy id -> 'radiant', 'guardian' or 'striker': the path it took when it first evolved
    nets: 0,                                         // Catch Nets in stock: you choose how many (up to 3) to throw after a wild win
    monstersDefeated: 0,
    currentMonsterIndex: -1,
    bossLevel: 1,
    activePet: 'dog',
    unlockedPets: ['dog'],
    unlockedSecrets: [],
    buddyXp: { dog: 0 },
    unlockedAccessories: ['none'],
    activeAccessory: 'none',
    unlockedArmor: ['none'],
    activeArmor: 'none',
    faintedPets: [],
    recentBossTypes: [],
    quests: null,
    streakCal: { count: 0, last: '', total: 0, claimed: [] },
    stats: { days: {} },
    records: { fastest: 0, bestStreak: 0, solved: 0, attempts: 0, fastestOp: '' },
    parentGoal: { minutes: 20, reward: '', notified: '' },
    parentPinHash: '',
    adapt: { on: true, miss: {}, easy: {}, calm: {}, recent: {}, tier: {}, served: '' },
    reduceMotion: null,
    seen: { hub: false, welcome: '' },
    care: {},
    duelStat: { day: '', count: 0 },
    duelsOnline: true,
    duelFriends: [],
    duelSettled: [],
    challengePaid: [],                               // parent challenge ids already paid out on this save (the gems are added once per id)
    duelRecord: { w: 0, l: 0, t: 0 },
    team: [],
    tour: { day: '', runs: 0, trophies: 0, wins: 0 },
    raid: null,
    raidsCleared: 0,
    lastRaidAt: 0,
    region: 'meadow',                                // where you are on the map (wild buddies of its type are more common)
    regionsVisited: ['meadow'],                      // regions visited in the Number Kingdom
    daily: { day: '', fights: 0, spawned: false },   // today's count of wild buddies beaten, and whether the daily rare has appeared yet
    badges: [],                                      // gym badges: region ids
    rematch: { day: '', lands: [], wins: 0 },        // Champion rematches: the lands paid today, and how many rematches were won in all
    champ: { wins: 0, day: '' },                     // the Champion's Hall: wins in all, and the day of the last paid win
    legend: { week: -1, day: '', caught: false, misses: 0, race: '', wins: 0 },   // this week's Legend hunt: the day it was last started, whether it was caught, misses so far (each adds to the catch chance), the race with Riley ('won' / 'lost' once caught), races won in all
    gym: null,                                       // a gym run in progress: { region, step } (the Champion's Hall also has `champ`, see 24d-champion.js)
    storySeen: {},                                   // one-time story beats already shown
    wild: { id: '', trainer: '', shiny: false, legend: false, since: 0, next: 6 },   // the wild buddy being fought ('' = a boss), wild buddies beaten since the last boss, how many to beat before the next boss
    swapUsed: false,                                 // the one free buddy swap of this battle has been used
    dexSeen: {},                                     // buddy id -> 1 once met (wild or as a boss); owned buddies always count as seen
    moveSet: {},                                     // buddy id -> the move ids the player took into battle (absent = the first ones it learned)
    spares: {},                                      // buddy id -> extra copies that can be sold
    bossBook: {},
    bossSwapped: false,
    bookClaims: [],
    shinies: {},                                     // buddy id -> 1 once its golden (shiny) version was caught; the buddy then glows
    packClaims: [],                                  // pack ids whose completion reward was claimed
    study: { level: 6, subjects: [], seen: {}, miss: [], paid: {}, day: '', gems: 0, rounds: 0 },   // Study (38-study.js): chosen level and subject, question id -> [right, wrong, day number], ids to review, id -> day it last paid, gems earned today, rounds finished
    egg: null,                                       // Incubating elemental egg: { element, rarity, steps, target } or null
    profile: defaultProfile(),
    stars: 0,                                        // Star Sparks (★): earned from solving problems, badges & goals, spent in the Tree of Knowledge
    techUnlocked: [],                                // tech node ids unlocked in the Tree of Knowledge
    techSolves: 0,                                   // correct answers toward the next Star Spark
    readAloud: false,                                // whether math and study problems are read aloud
    hero: { name: '', look: { skin: 0, hair: 0, outfit: 0, style: 0 }, made: false },   // the Adventure hero (24i-ow-hero.js): a short name (letters only, never shown to other players) and the look as indexes into the palettes; made = the creator was finished
    keyItems: [],                                    // key item ids earned on the Adventure (24i-ow-hero.js KEY_ITEMS)
    overworld: { map: 'hollow', x: 7, y: 9, face: 'down', fight: false, found: [], signs: { day: '', ids: [] }, center: { map: 'hollow', x: 7, y: 9 }, beat: [], foe: '', shaken: { day: '', ids: [] }, story: [] },   // the Adventure map (24g-ow-engine.js): where the hero stands, and whether the current wild fight began on a walk (a win then returns to the map), the pickup ids already taken, the math signs paid today, and the last Buddy Center you visited (a team wipe on a walk returns you there), the trainers beaten, the trainer of the current walk fight, the trees shaken today, and the story beats done
  };
}

let state = freshState();
let pendingLootPet = null;
let ultimateCharge = 0;
let armedMove = '';
let currentMonsterIndex = 0;
let monsterCurrentHp = 4;
let bossLevel = 1;
let partyHp = {};
let bossMistakes = 0;
