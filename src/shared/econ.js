// =====================================================================
//  ECON: the single source of truth for rewards, costs and limits.
//  Included in BOTH the browser script and the Worker (see scripts/build.mjs).
//  Change numbers here only, then run `npm run sim` to see the effect on the economy.
// =====================================================================
const ECON = {
  solve: { gem: 1, speedGem: 1, streakEvery: 3, streakBonus: 2 },
  boss: {
    gemBase: 8, gemPerLevels: 5,
    atkPerLevels: 10,        // a boss's attack grows by 1 every 10 levels (wild buddies: ECON.wild.atkPerLevels)
    // A "slayer" boss is strong against one buddy: it hits that buddy harder (and may take up to 60% of its max HP in one hit instead of 40%),
    // and that buddy only deals 75% damage to it (no Shadow bonus).
    slayer: { extraDamage: 2, maxHpShare: 0.6, yourDamage: 0.75 },
    // Backup: an Alpha boss under `below` of its health may swap out for another boss at full health. The new boss is what you must beat
    // (the first one never counts as a win). It is tougher (+HP, +attack) and pays a bonus. `counterChance`: how often the partner is one that
    // beats your buddy (a slayer of it, or one whose element is strong against it).
    swap: { chance: 0.2, below: 0.25, counterChance: 0.5, extraHp: 2, extraAtk: 1, bonusGems: 5 }
  },
  // Beat any boss this many times in its Alpha form and it joins you as a buddy (at half your strongest buddy's level).
  // A boss you have started on (1 or 2 Alpha wins) is picked `weight` times as often, once your buddy can reach Alpha bosses (level `minLevel`).
  bossBuddy: { alphaWins: 3, weight: 5, minLevel: 43 },
  // Wild buddies: most battles. A boss comes after every `bossEvery` [min, max] of them. A wild buddy's HP grows with its level (`hpBase` + `hpPerLevel` per level)
  // and so does its attack (+1 per `atkPerLevels` levels), so fights stay even as your buddy grows. Beating one may catch it: `catchChance` by rarity,
  // times `matchup.strong` when your buddy is strong against it and `matchup.weak` when it is weak against it.
  // `storeShare`: how often the wild buddy is a store buddy (else a secret one; their catch chance is low so secret buddies stay a rare find).
  wild: {
    hpBase: 3, hpPerLevel: 0.4, atkPerLevels: 15, gemBase: 4, gemPerLevels: 6, xpBase: 8, bossEvery: [5, 8], storeShare: 0.35,
    catchChance: { cheap: 0.3, mid: 0.2, rare: 0.1, secret: 0.03 }, matchup: { strong: 1.5, weak: 0.5 },
    flawless: 1.25,                                   // beating it without a single mistake
    // Catch Nets: after a wild win you choose how many to throw (0-3). `mult[n]` multiplies the chance (never above `max`); you can hold `stock`.
    net: { mult: [1, 1.5, 2, 2.5], max: 0.75, stock: 9 }
  },
  // A spare (a caught buddy you already own) sells for a share of a store buddy's price (at least 1 gem), or a flat amount for a secret one.
  sell: { storeShare: 0.2, secret: 12, legend: 100 },
  // The map: a region unlocks when your best buddy reaches its level; a gym is `trainers` trainer battles and then a leader (a boss of that type).
  // Winning the gym gives a badge and gems; all the gym badges open the Champion's Hall.
  map: {
    levels: { meadow: 1, ember: 8, tide: 16, grove: 24, volt: 32, gloom: 40, mystic: 48, skyreach: 56 },
    trainers: 3, trainerHpMult: 1.2, trainerGems: 4, regionShare: 0.8, badgeGems: 60,
    // After becoming Champion any gym can be fought again as a rematch: the same trainers (Riley too) and leader, `levels` stronger.
    // The first clear of a land each day pays `gems`, for at most `perDay` lands a day (the fights themselves are free to repeat).
    rematch: { levels: 4, gems: 40, perDay: 3 },
    // The Champion's Hall (24d-champion.js), open once every gym badge is won (a Champion keeps it when gyms are added): Champion Nova's six buddies (one of each type), `levels` above your buddy.
    // Nova swaps a buddy that is below `swapAt` of its HP (or that your buddy beats) for a clearly better one: at most `maxSwaps` times, never again within `cooldown` hits.
    // The first win pays `firstGems`, `nets` Catch Nets, one of each held item and three secret gear pieces (and makes you Champion); after that a win pays `repeatGems` once a day.
    champion: { levels: 2, firstGems: 500, nets: 3, repeatGems: 50, swapAt: 0.4, maxSwaps: 4, cooldown: 3 }
  },
  // The Adventure map (24g-ow-engine.js): after a fight, `graceSteps` steps in tall grass are safe, then each grass step starts a wild fight with chance `grassChance`.
  overworld: { grassChance: 0.18, graceSteps: 4, saveEvery: 5, holdMs: 150, shoeMs: 95, signGems: 2, signsPerDay: 5, pickupGems: 5,
    // A trainer on the map sees the hero along the way it faces, up to `trainerSight` tiles (a trainer may set its own `sight`).
    trainerSight: 3,
    // Fishing (tap water with the Fishing Rod): this chance of a bite each try; a bite is a normal wild fight with a water buddy.
    fishBite: 0.6,
    // The story's one-time prizes (gems), by story beat: the Scramblers' schemes put right (24t-ow-story.js).
    storyGems: { 'tide-ferry': 20, 'volt-blackout': 25, 'gloom-scramblers': 40 },
    // The Mart (24l-ow-shops.js) sells these shop items (prices are ECON.items); each opens once you hold `badges` badges. No Boss Whistle: bosses are not met by walking.
    mart: [{ type: 'potion', badges: 0 }, { type: 'net', badges: 0 }, { type: 'shield', badges: 1 }, { type: 'clover', badges: 2 }, { type: 'candy', badges: 3 }, { type: 'ult', badges: 4 }] },    // holdMs: a held D-pad key steps this often (shoeMs with the Running Shoes). A math sign pays signGems once a day (at most signsPerDay signs a day); a gem pickup pays pickupGems once.
  // The daily rare: once a day, after you beat `after` wild buddies, a golden buddy shows up as a wild buddy: tougher (HP x hpMult), `catchMult` times easier to catch (never above `catchMax`), and it pays `gems`.
  daily: { after: 3, hpMult: 1.5, catchMult: 4, catchMax: 0.6, gems: 20 },
  // Held items (25b-held.js): prices in gems, and how much the Oran Berry heals.
  held: { cost: { berry: 40, shell: 60, charm: 60, lens: 50, bait: 50 }, berryHeal: 3 },
  // The Ranch (25d-ranch.js): off-team buddies work at stations. `perHour` goods an hour (x `matchMult` for a matching element), for at most `capHours` hours away at a time,
  // plus `answerSec` seconds of work for every correct answer. The barn holds `stockCap` of each good; a work spot opens for every `badgesPerSlot` badges (and one from the start).
  ranch: { perHour: 6, matchMult: 2, capHours: 4, answerSec: 60, stockCap: 30, badgesPerSlot: 2,
    // Berries can pay for the Biscuit (`treatBerries`) and the Favorite snack (`favBerries`) instead of gems; `orePerNet` ore make one Catch Net (a shop net costs `items.net` gems).
    treatBerries: 2, favBerries: 4, orePerNet: 6,
    // The Nursery: `eggBerries` berries and two or more workers make an egg (of `eggRarity`) with the element of one of the workers.
    eggBerries: 10, eggRarity: 'rare',
    // Honey feeds the hub's buddy `honeyXp` XP for `honeyPerFeed` honey; `partsPerPotion` parts brew a Super Potion.
    honeyPerFeed: 3, honeyXp: 12, partsPerPotion: 5 },
  // Trails (24e-trail.js): every land has a daily Trail of spots. A chest gives `berries` berries, `ore` ore or a Catch Net; the Trail pays `gems` gems for the first `trailsPerDay` trails of a day once `finishAt` of its spots are open (two gates, so one can wait for another day).
  explore: { berries: 3, ore: 2, gems: 8, trailsPerDay: 3, finishAt: 5 },
  // Against farming one over-levelled buddy (13b-wild.js, 12-battle.js): wild foes follow your buddy's level but never go above `lead` x the average of your `top` strongest buddies;
  // a plain wild win pays gems and XP times foe level / buddy level (never below `minShare`); teammates below the fighter get `shareXp` of the full XP;
  // and after `dailyWins` plain wild wins in a day, wild gems drop to `tiredShare` (never below 1) until tomorrow.
  // Rested bonus: each buddy's first `restedWins` plain wild wins of a day earn `restedXp` more XP, so rotating buddies is the fastest way to level.
  // Lands and Alpha hunts open by the journey level (13b-wild.js): your best level, but never above `lead` x the average of your `top` strongest buddies.
  farm: { lead: 1.5, top: 3, minShare: 0.25, shareXp: 0.3, dailyWins: 60, tiredShare: 0.25, restedWins: 10, restedXp: 0.5 },
  // Weather (24e-trail.js): today's weather favours some types. `share` is the part of wild fights (after the land's own `map.regionShare`) that use it.
  weather: { share: 0.15 },
  // Choosing an encounter (13b-wild.js): once you have `minBadges` badges, each plain wild fight offers `choices` species to meet.
  encounter: { minBadges: 1, choices: 3 },
  // Evolution paths (08-buddies.js): when a buddy first evolves, bond hearts (+1 if it ate its favorite snack today) of at least `bondMin` make it Radiant (`radiantHp` more HP and `radiantAtk` more attack for good).
  // Otherwise the player picks Guardian (`guardianHp` more HP) or Striker (`strikerAtk` more attack); Guardian is the default.
  evo: { bondMin: 3, radiantHp: 1, radiantAtk: 1, guardianHp: 1, strikerAtk: 1 },
  // Quirks (25b-held.js): every species has one; these are the sizes of the bonuses (xp: share of extra XP, speed: Speed Strike time, catch: catch chance, calmLess: problems a status lasts less).
  quirk: { xp: 0.1, speed: 1.1, catch: 1.1, calmLess: 1 },
  // Status effects (12d-status.js): the chance a foe's hit leaves one, and for how many problems.
  status: { wildChance: 0.25, bossChance: 0.4, problems: 3, foeChance: 0.5 },
  // Your damage moves can leave the foe burned, frozen or weakened for `problems` problems (same as a foe's status on you), with this chance (12d-status.js).
  // Healing Spring (24b-map.js): wakes every resting buddy. The first visit each day is free, later ones cost `gems`.
  spring: { gems: 5 },
  // Moves (12c-moves.js): Recover heals this share of max HP. A buddy takes `slots` moves (plus its ultimate) into battle; the player chooses which.
  moves: { healShare: 0.4, slots: 4 },
  // The Legend hunt (24c-legend.js): after becoming Champion, one legendary buddy a week (a different type each week) can be hunted once a day.
  // It is a wild fight: HP x hpMult, `levels` above your buddy, and a win always pays `gems`. The catch chance starts at `catchChance` and grows by `pity` for every miss that week.
  // Riley (the rival) hunts the same legend: Riley catches it on day `firstDay`..`lastDay` of the week (0 = Monday; it varies by week, never by chance).
  // Catch it before then and you beat Riley: `raceGems` once. Losing the race costs nothing: you can still catch it.
  legend: { hpMult: 2.5, levels: 5, catchChance: 0.3, pity: 0.1, gems: 60, raceGems: 40, riley: { firstDay: 2, lastDay: 5 } },
  // The Buddy Dex: owning every buddy of a pack pays once, per member, plus Catch Nets.
  dex: { packGemsPer: 8, packNets: 2 },
  levelUpGemsPerLevel: 3,
  evolveGems: 25,
  sessionGoal: { start: 25, step: 25, rewardDiv: 2, rewardBase: 12, maxReward: 50 },
  hint: { cost: 1 },
  // Shop item prices. The shield is dear on purpose: it must be a real decision, never a cheap way to skip a problem. (Rare Candy's price depends on the buddy's level.)
  items: { shield: 100, potion: 20, clover: 25, net: 30, whistle: 45, ult: 33 },
  milestoneGems: { 5: 2, 10: 5, 25: 15 },
  quest: {
    chest: 35, solveBase: 10, opBase: 15, opPer: 2,
    streak: { 5: 22, 8: 32 }, boss: { 2: 22, 3: 32 }, flawless: 30, fast: { 5: 22, 8: 32 }, ult: { 2: 20, 3: 28 }
  },
  calendar: { length: 14, chests: { 3: 40, 7: 90, 14: 200 } },
  care: { treatCost: 2, favCost: 8, maxBond: 5, petsPerDay: 3, petXp: 3, treatXp: 10, favXp: 25, bondXpBonus: 0.04 },
  raid: { every: 10, phases: 3, bonusGems: 40 },
  tournament: { rounds: 3, gemsPerRound: 5, xpPerRound: 15, championGems: 30, rewardedRunsPerDay: 2 },
  duel: { roomXp: 8, roomRewardedPerDay: 10, stakes: [0, 5, 10, 25], stakeCoverage: 2, questions: 10, ttlDays: 3, maxPerHour: 30 },
  // Adaptive practice (see 07b-adaptive.js). Levels are per math type: -1 easier, 0 normal (the parent's grade), +1 challenge.
  adaptive: {
    window: 20, upAfter: 20, downAfter: 10,            // results kept per type; tries needed before moving up / down
    upAccuracy: 0.85, upFastShare: 0.4, downAccuracy: 0.55,
    weakBoost: 2,                                      // a type you are at 0% on is picked up to 3x as often as one you have mastered
    maxTypeShare: 0.5,                                 // no single type may take more than half of the problems
    bossWeakShare: 0.4,                                // the boss weak point's share of problems
    servedWindow: 12, maxChallengeServed: 4,           // at most 4 challenge problems in any 12
    challengeXpBonus: 0.5
  },
  parents: { codeMinutes: 10, codeTries: 8, maxLinks: 4, maxKids: 10, gradeBands: 6, goal: { minMinutes: 5, maxMinutes: 240, maxRewardChars: 60 },
    challenge: { maxProblems: 100, minMinutes: 1, maxMinutes: 60, gemPerProblem: 1, maxGemPerProblem: 10, maxGems: 100, minSecPerProblem: 2, graceSeconds: 15 },   // a parent's timed challenge: N correct answers in M minutes pays N x gems-per-answer (1 unless the parent sets more), at most maxGems in all; answers faster than 2 s each are not believed
    boost: { step: 10, maxPerType: 30, maxTotal: 40, maxTypes: 12 } },   // a parent's "extra practice": each click moves 10% of all problems to a type, up to 30% for one type and 40% in all   // link codes last 10 minutes; a child can have 4 parents linked; a parent can watch 10 children; gradeBands = GRADES.length (checked in tests)
  // Study (38-study.js): question rounds in school subjects. A round is `roundSize` questions; only multiple-choice and typed rounds pay (flashcards are self-marked).
  // A right answer to a question not rewarded in the last `freshDays` days ("fresh") pays `gemPerNew` gem and `xpPerNew` buddy XP; a perfect round adds `perfectBonus`.
  // At most `dayCap` gems a day come from study, so repeating easy cards cannot be farmed. `missMax`: missed questions remembered for review.
  // `parent`: limits for questions a parent adds from their phone (see src/shared/study.js and src/server/17-study.js).
  study: { roundSize: 8, minLevel: 6, maxLevel: 8, gemPerNew: 1, perfectBonus: 3, dayCap: 20, xpPerNew: 2, freshDays: 3, missMax: 40,
    parent: { max: 150, qMax: 200, aMax: 60, extras: 3, bulk: 50 } },
  egg: { steps: { common: 5, rare: 8, mythic: 12 }, duplicateGems: 15, duplicateXp: 25 },
  tech: {
    solvesPerStar: 15,
    badgeStars: 2,
    goalStars: 1,
    flawlessStars: 1,
    nodes: [
      // Branch: mind (Arithmancy)
      { id: 'quick_sparks', branch: 'mind', tier: 1, name: 'Quick Sparks I', icon: '⚡', desc: 'Fast answers (<5s) grant +1 bonus Gem', stars: 1, gems: 20, pre: null },
      { id: 'gentle_guide', branch: 'mind', tier: 1, name: 'Gentle Guide', icon: '💡', desc: 'First hint in every battle is completely free', stars: 1, gems: 25, pre: null },
      { id: 'streak_cushion', branch: 'mind', tier: 2, name: 'Streak Cushion', icon: '🛡️', desc: 'A mistake drops your streak by 1 instead of 0', stars: 2, gems: 50, pre: 'quick_sparks' },
      { id: 'lucky_number', branch: 'mind', tier: 2, name: 'Lucky Number', icon: '✨', desc: '15% chance on streak for +3 bonus Gems', stars: 2, gems: 60, pre: 'gentle_guide' },
      { id: 'mind_over_matter', branch: 'mind', tier: 3, name: 'Mind Over Matter', icon: '🧠', desc: 'Streak bonus activates every 2 answers instead of 3', stars: 3, gems: 100, pre: 'streak_cushion' },
      { id: 'master_scholar', branch: 'mind', tier: 4, name: 'Master Scholar', icon: '👑', desc: 'Daily session goal rewards are doubled', stars: 5, gems: 200, pre: 'mind_over_matter' },

      // Branch: valor (Valor & Tactics)
      { id: 'energize', branch: 'valor', tier: 1, name: 'Energize I', icon: '⚡', desc: 'Start battles with 1 Energy charged', stars: 1, gems: 25, pre: null },
      { id: 'iron_will', branch: 'valor', tier: 1, name: 'Iron Will', icon: '❤️', desc: '+1 Max HP for your active buddy in battle', stars: 1, gems: 30, pre: null },
      { id: 'swift_recovery', branch: 'valor', tier: 2, name: 'Swift Recovery', icon: '💚', desc: 'Recover move costs 1 Energy instead of 2', stars: 2, gems: 60, pre: 'energize' },
      { id: 'elemental_strike', branch: 'valor', tier: 2, name: 'Elemental Strike', icon: '🔥', desc: '+1 damage on Super Effective attacks', stars: 2, gems: 75, pre: 'iron_will' },
      { id: 'guardian_aegis', branch: 'valor', tier: 3, name: 'Guardian Aegis', icon: '🛡️', desc: 'Survive a fatal blow at 1 HP once per battle', stars: 3, gems: 120, pre: 'swift_recovery' },
      { id: 'alpha_surge', branch: 'valor', tier: 4, name: 'Alpha Surge', icon: '💥', desc: 'Ultimate attacks deal +2 bonus damage', stars: 5, gems: 250, pre: 'guardian_aegis' },

      // Branch: wild (Exploration & Discovery)
      { id: 'net_crafter', branch: 'wild', tier: 1, name: 'Net Crafter', icon: '🕸️', desc: 'Max Catch Net stock increased from 9 to 15', stars: 1, gems: 20, pre: null },
      { id: 'track_finder', branch: 'wild', tier: 1, name: 'Track Finder', icon: '🐾', desc: 'Wild encounters appear 1 battle sooner', stars: 1, gems: 30, pre: null },
      { id: 'sticky_net', branch: 'wild', tier: 2, name: 'Sticky Net', icon: '🍯', desc: '+5% base catch chance per Catch Net thrown', stars: 2, gems: 75, pre: 'net_crafter' },
      { id: 'golden_scent', branch: 'wild', tier: 2, name: 'Golden Scent', icon: '⭐', desc: 'Daily golden rare spawns 1 fight earlier', stars: 2, gems: 60, pre: 'track_finder' },
      { id: 'legendary_tracker', branch: 'wild', tier: 3, name: 'Legendary Tracker', icon: '🏃', desc: 'Riley catches the Legend 1 day later in races', stars: 3, gems: 125, pre: 'golden_scent' },
      { id: 'dex_collector', branch: 'wild', tier: 4, name: 'Dex Collector', icon: '📖', desc: 'Claiming packs grants +50% Gems & +2 Nets', stars: 5, gems: 220, pre: 'sticky_net' },

      // Branch: care (Sanctuary & Bond)
      { id: 'chefs_touch', branch: 'care', tier: 1, name: "Chef's Touch", icon: '🍰', desc: 'Snacks and treats give +25% Buddy XP', stars: 1, gems: 20, pre: null },
      { id: 'warm_hearth', branch: 'care', tier: 1, name: 'Warm Hearth', icon: '✋', desc: 'Daily cuddles increased from 3 to 5 per buddy', stars: 1, gems: 25, pre: null },
      { id: 'fast_incubator', branch: 'care', tier: 2, name: 'Fast Incubator', icon: '🥚', desc: 'Elemental eggs hatch 2 problems faster', stars: 2, gems: 50, pre: 'warm_hearth' },
      { id: 'appraiser', branch: 'care', tier: 2, name: 'Appraiser', icon: '💰', desc: 'Selling spare duplicate buddies pays +50% Gems', stars: 2, gems: 60, pre: 'chefs_touch' },
      { id: 'deep_harmony', branch: 'care', tier: 3, name: 'Deep Harmony', icon: '💖', desc: 'Maximum buddy bond raised to 7 hearts', stars: 3, gems: 100, pre: 'fast_incubator' },
      { id: 'second_heart', branch: 'care', tier: 4, name: 'Second Heart', icon: '🌟', desc: 'Held item passive effects doubled', stars: 5, gems: 200, pre: 'deep_harmony' }
    ]
  },
  profile: { maxShowcase: 6, roomXpPerBuddy: 0.01, titles: { knight: 20, defender: 45, explorer: 60, tamer: 90, dragon: 90, arithmancer: 150 }, frames: { gold: 35, neon: 50, cosmic: 80, crystal: 120 } },
  save: { softLimitBytes: 300000, hardLimitBytes: 400000 }
};

// Gems for reaching a session goal of `solved` problems (grows with the goal, but is capped).
function sessionGoalReward(solved) {
  return Math.min(ECON.sessionGoal.maxReward, Math.round(solved / ECON.sessionGoal.rewardDiv) + ECON.sessionGoal.rewardBase);
}

// What a spare buddy sells for.
function spareValue(isStore, cost, isLegend) {
  if (isLegend) return ECON.sell.legend;
  return isStore ? Math.max(1, Math.round(cost * ECON.sell.storeShare)) : ECON.sell.secret;
}

// A stake is allowed when it is on the list and the player holds at least `stakeCoverage` times as many gems.
function stakeAllowed(stake, gems) {
  return ECON.duel.stakes.indexOf(stake) !== -1 && stake * ECON.duel.stakeCoverage <= gems;
}
function allowedStakes(gems) {
  return ECON.duel.stakes.filter(function (s) { return stakeAllowed(s, gems); });
}
