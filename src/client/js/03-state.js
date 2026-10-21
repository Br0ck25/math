// Bump SCHEMA_VERSION and add a MIGRATIONS entry (10-save-load.js) whenever a saved field changes shape.
const SCHEMA_VERSION = 2;
function freshState() {
  return {
    v: SCHEMA_VERSION,
    grade: 1,
    enabledOps: GRADE_DEFAULT_OPS[1].slice(),
    gems: 0,
    streak: 0,
    shields: 0,
    cloverLeft: 0,
    daycare: { ids: [], from: {}, steps: 0, egg: 0, eggReady: false },        // buddies left at the Day Care (24vd-ow-daycare.js)
    genders: {},                                     // buddy id -> 'm' or 'f': the gender it was caught with
    happy: {},                                       // buddy id -> friendship 0-255 (wins, levels and walks raise it)
    fromTrade: {},                                   // buddy id -> 1 when it came from a Trader: it disobeys above the level its badges allow
    safari: { active: false, steps: 0, balls: 0 },   // a visit to the Safari Zone
    coins: 0,                                        // Game Corner coins
    tower: { day: '', best: 0, longDay: '' },                      // the Battle Tower: the day of the last prize and the best streak
    phone: { day: '', ready: '', known: [] },                   // the trainer who called today for a rematch (24vh-ow-phone.js)
    contest: null,                                   // today's Catching Contest: { day, balls, best: { name, score }, done }
    stoned: {},                                      // buddy id -> 1 once an Evolution Stone was used on it
    tradedUp: {},                                    // buddy id -> 1 once traded: its trade evolution can appear
    repelSteps: 0,                                   // grass steps left with no wild fights (Repel)
    heldOwned: [],                                   // held item ids you have bought
    held: {},                                        // buddy id -> held item id (one each, an item is held by one buddy)
    spring: { day: '' },                             // the day the free Healing Spring visit was used (24b-map.js)
    nets: 0,                                         // Catch Nets in stock: you choose how many (up to 3) to throw after a wild win
    monstersDefeated: 0,
    bossLevel: 1,
    activePet: 'dog',
    unlockedPets: ['dog'],
    unlockedSecrets: [],
    buddyXp: { dog: 0 },
    adapt: { on: true, miss: {}, easy: {}, calm: {}, recent: {}, tier: {}, served: '' },
    reduceMotion: null,
    seen: { hub: false, welcome: '' },
    duelStat: { day: '', count: 0 },
    duelsOnline: true,
    duelFriends: [],
    duelSettled: [],
    duelRecord: { w: 0, l: 0, t: 0 },
    team: [],
    region: 'meadow',                                // where you are on the map (wild buddies of its type are more common)
    regionsVisited: ['meadow'],                      // regions visited in the Number Kingdom
    badges: [],                                      // gym badges: region ids
    rematch: { day: '', lands: [], wins: 0 },        // Champion rematches: the lands paid today, and how many rematches were won in all
    champ: { wins: 0, master: 0, day: '', masterDay: '' },                     // the Champion's Hall: wins in all, and the day of the last paid win
    mom: { save: false, bank: 0 },                   // Mum's savings: whether she keeps half of each prize, and the gems she holds
    legend: { week: -1, caught: false, ids: [] },             // the roaming legend: this week's number and whether you caught it
    gym: null,                                       // a gym run in progress: { region, step } (the Champion's Hall also has `champ`, see 24d-champion.js)
    storySeen: {},                                   // one-time story beats already shown
    wild: { id: '', trainer: '', shiny: false, legend: false, since: 0, next: 6 },   // the wild buddy being fought ('' = a boss), wild buddies beaten since the last boss, how many to beat before the next boss
    dexSeen: {},                                     // buddy id -> 1 once met (wild or as a boss); owned buddies always count as seen
    spares: {},                                      // buddy id -> extra copies that can be sold
    bossBook: {},
    bookClaims: [],
    shinies: {},                                     // buddy id -> 1 once its golden (shiny) version was caught; the buddy then glows
    study: { level: 6, subjects: [], seen: {}, miss: [], paid: {}, day: '', gems: 0, rounds: 0 },   // Study (38-study.js): chosen level and subject, question id -> [right, wrong, day number], ids to review, id -> day it last paid, gems earned today, rounds finished
    egg: null,                                       // Incubating elemental egg: { element, rarity, steps, target } or null
    readAloud: false,                                // whether math and study problems are read aloud
    hero: { name: '', look: { skin: 0, hair: 0, outfit: 0, style: 0 }, made: false },   // the Adventure hero (24i-ow-hero.js): a short name (letters only, never shown to other players) and the look as indexes into the palettes; made = the creator was finished
    advHp: {},                                       // Adventure battle HP by buddy id (missing = full); the Buddy Center restores it (24w-ow-battle-data.js)
    virus: {},                                       // buddy id -> the day it caught Pokérus (YYYY-MM-DD), or 'cured'
    vitamins: {},                                    // buddy id -> { hp, atk, def, spd, spc: vitamins used (0-10) }
    ppUp: {},                                        // buddy id -> { move id: PP Ups used (0-3) }
    tms: {},                                         // TM ids held (single use), from the gym leaders
    tmKnown: {},                                     // buddy id -> TM move ids it was taught
    advMoves: {},                                    // Adventure battle moves chosen by buddy id: the move ids it takes into battle (absent = its newest four)
    advPp: {},                                       // Adventure battle PP left by buddy id and move id (missing = full); the Buddy Center restores it
    items: {},                                       // supplies beyond the Potion and the net: superpotion, fullheal, revive (counts)
    potions: 0,                                      // Potions for Adventure battles, bought at the Mart
    keyItems: [],                                    // key item ids earned on the Adventure (24i-ow-hero.js KEY_ITEMS)
    overworld: { map: 'hollow', x: 7, y: 9, face: 'down', found: [], fruitDay: '', weekly: {}, center: { map: 'hollow', x: 7, y: 9 }, beat: [], shaken: { day: '', ids: [] }, story: [], seen: [], traded: [], walk: { day: '', n: 0, eggs: 0 } },   // the Adventure map (24g-ow-engine.js): where the hero stands, the pickup ids already taken, the math signs paid today, and the last Buddy Center you visited (a team wipe on a walk returns you there), the trainers beaten, the trees shaken today, and the story beats done, the towns visited (the Gizmo travels to them), the trades made and the steps that warmed an egg today
  };
}

let state = freshState();
let pendingLootPet = null;
let currentMonsterIndex = 0;
let bossLevel = 1;
let partyHp = {};
