// Bump SCHEMA_VERSION and add a MIGRATIONS entry (10-save-load.js) whenever a saved field changes shape.
const SCHEMA_VERSION = 1;
function freshState() {
  return {
    v: SCHEMA_VERSION,
    grade: 1,
    enabledOps: GRADE_DEFAULT_OPS[1].slice(),
    gems: 0,
    streak: 0,
    shields: 0,
    cloverLeft: 0,
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
    duelRecord: { w: 0, l: 0, t: 0 },
    team: [],
    tour: { day: '', runs: 0, trophies: 0, wins: 0 },
    raid: null,
    raidsCleared: 0,
    lastRaidAt: 0,
    bossBook: {},
    bookClaims: []
  };
}

let state = freshState();
let pendingLootPet = null;
let ultimateCharge = 0;
let currentMonsterIndex = 0;
let monsterCurrentHp = 4;
let bossLevel = 1;
let partyHp = {};
let bossMistakes = 0;
