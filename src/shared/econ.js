// =====================================================================
//  ECON: the single source of truth for rewards, costs and limits.
//  Included in BOTH the browser script and the Worker (see scripts/build.mjs).
//  Change numbers here only, then run `npm run sim` to see the effect on the economy.
// =====================================================================
const ECON = {
  boss: {
    gemBase: 8, gemPerLevels: 5,

    // A "slayer" boss is strong against one buddy: it hits that buddy harder (and may take up to 60% of its max HP in one hit instead of 40%),
    // and that buddy only deals 75% damage to it (no Shadow bonus).

    // Backup: an Alpha boss under `below` of its health may swap out for another boss at full health. The new boss is what you must beat
    // (the first one never counts as a win). It is tougher (+HP, +attack) and pays a bonus. `counterChance`: how often the partner is one that
    // beats your buddy (a slayer of it, or one whose element is strong against it).
    },
  // Beat any boss this many times in its Alpha form and it joins you as a buddy (at half your strongest buddy's level).
  // A boss you have started on (1 or 2 Alpha wins) is picked `weight` times as often, once your buddy can reach Alpha bosses (level `minLevel`).
  bossBuddy: { alphaWins: 3, weight: 5, minLevel: 43 },
  // Wild buddies: most battles. A boss comes after every `bossEvery` [min, max] of them. A wild buddy's HP grows with its level (`hpBase` + `hpPerLevel` per level)
  // and so does its attack (+1 per `atkPerLevels` levels), so fights stay even as your buddy grows. Beating one may catch it: `catchChance` by rarity,
  // times `matchup.strong` when your buddy is strong against it and `matchup.weak` when it is weak against it.
  // `storeShare`: how often the wild buddy is a store buddy (else a secret one; their catch chance is low so secret buddies stay a rare find).
  wild: {
    gemBase: 4, gemPerLevels: 6, xpBase: 8, bossEvery: [5, 8], storeShare: 0.35,

    flawless: 1.25,                                   // beating it without a single mistake
    // Catch Nets: after a wild win you choose how many to throw (0-3). `mult[n]` multiplies the chance (never above `max`); you can hold `stock`.
    net: { mult: [1, 1.5, 2, 2.5], max: 0.75, stock: 9 }
  },
  // A spare (a caught buddy you already own) sells for a share of a store buddy's price (at least 1 gem), or a flat amount for a secret one.
  sell: { storeShare: 0.2, secret: 12, legend: 100 },
  // A wild buddy is shiny (it glows once caught) one time in `shinyOdds`.
  shiny: { shinyOdds: 512 },
  // The map: a region unlocks when your best buddy reaches its level; a gym is `trainers` trainer battles and then a leader (a boss of that type).
  // Winning the gym gives a badge and gems; all the gym badges open the Champion's Hall.
  map: {
    levels: { meadow: 1, ember: 8, tide: 16, grove: 24, volt: 32, gloom: 40, mystic: 48, skyreach: 56, cinder: 60, coral: 64, thistle: 68, spark: 72, dusk: 76, prism: 80, cross: 85, summit: 90 },
    trainers: 3, trainerGems: 4, regionShare: 0.8, badgeGems: 60,
    // After becoming Champion any gym can be fought again as a rematch: the same trainers (Riley too) and leader, `levels` stronger.
    // The first clear of a land each day pays `gems`, for at most `perDay` lands a day (the fights themselves are free to repeat).
    rematch: { levels: 4, gems: 40, perDay: 3 },
    // The Champion's Hall (24d-champion.js), open once every gym badge is won (a Champion keeps it when gyms are added): Champion Nova's six buddies (one of each type), `levels` above your buddy.
    // Nova swaps a buddy that is below `swapAt` of its HP (or that your buddy beats) for a clearly better one: at most `maxSwaps` times, never again within `cooldown` hits.
    // The first win pays `firstGems`, `nets` Catch Nets, one of each held item and three secret gear pieces (and makes you Champion); after that a win pays `repeatGems` once a day.
    champion: { levels: 2, firstGems: 500, nets: 3, repeatGems: 50},
    // Silver Peak (24y-ow-arenas.js): Master Ori's six legends, `levels` above your buddy (never below `minLevel`). The first win pays `firstGems` and `nets`, a repeat win `repeatGems` once a day.
    master: { levels: 3, minLevel: 90, firstGems: 1000, nets: 5, repeatGems: 100 }
  },
  // The Adventure map (24g-ow-engine.js): after a fight, `graceSteps` steps in tall grass are safe, then each grass step starts a wild fight with chance `grassChance`.
  overworld: { grassChance: 0.18, repelSteps: 100, graceSteps: 4, saveEvery: 5, holdMs: 150, shoeMs: 95, signGems: 2, signsPerDay: 5, pickupGems: 5,
    // A trainer on the map sees the hero along the way it faces, up to `trainerSight` tiles (a trainer may set its own `sight`).
    trainerSight: 3,
    // Fishing (tap water with the Fishing Rod): this chance of a bite each try; a bite is a normal wild fight with a water buddy.
    fishBite: 0.6,
    // The story's one-time prizes (gems), by story beat: the Scramblers' schemes put right (24t-ow-story.js).
    storyGems: { 'tide-ferry': 20, 'volt-blackout': 25, 'gloom-scramblers': 40 },
    // The Mart (24l-ow-shops.js) sells these shop items (prices are ECON.items); each opens once you hold `badges` badges. No Boss Whistle: bosses are not met by walking.
    netBonus: 1.5, potionHeal: 40, eggEvery: 25, eggPerDay: 8, blackoutShare: 0.5,     // walking: every eggEvery steps count as one answer for an egg, at most eggPerDay a day
         // Adventure battles (24w-ow-battle-data.js): a Catch Net is worth a Great Ball (x netBonus), a Potion heals potionHeal HP
    mart: [{ type: 'potion', badges: 0 }, { type: 'net', badges: 0 }, { type: 'repel', badges: 1 }, { type: 'candy', badges: 3 }] },    // holdMs: a held D-pad key steps this often (shoeMs with the Running Shoes). A math sign pays signGems once a day (at most signsPerDay signs a day); a gem pickup pays pickupGems once.
  // Held items (25b-held.js): prices in gems, and how much the Oran Berry heals.
  held: { cost: { berry: 40, leftovers: 60, claw: 50, lens: 50, charm: 60 }, berryHeal: 10 },
  // The team: how many buddies go into battle (Adventure fights, tournaments and Practice swaps).
  team: { max: 6 },
  // Trails (24e-trail.js): every land has a daily Trail of spots. A chest gives `berries` berries, `ore` ore or a Catch Net; the Trail pays `gems` gems for the first `trailsPerDay` trails of a day once `finishAt` of its spots are open (two gates, so one can wait for another day).
  // Against farming one over-levelled buddy (13b-wild.js, 12-battle.js): wild foes follow your buddy's level but never go above `lead` x the average of your `top` strongest buddies;
  // a plain wild win pays gems and XP times foe level / buddy level (never below `minShare`); teammates below the fighter get `shareXp` of the full XP;
  // and after `dailyWins` plain wild wins in a day, wild gems drop to `tiredShare` (never below 1) until tomorrow.
  // Rested bonus: each buddy's first `restedWins` plain wild wins of a day earn `restedXp` more XP, so rotating buddies is the fastest way to level.
  // Lands and Alpha hunts open by the journey level (13b-wild.js): your best level, but never above `lead` x the average of your `top` strongest buddies.
  farm: { lead: 1.5, top: 3, },
  // Weather (24e-trail.js): today's weather favours some types. `share` is the part of wild fights (after the land's own `map.regionShare`) that use it.
  weather: { share: 0.15 },
  // Choosing an encounter (13b-wild.js): once you have `minBadges` badges, each plain wild fight offers `choices` species to meet.
  spring: { gems: 5 },
  // Moves (12c-moves.js): Recover heals this share of max HP. A buddy takes `slots` moves (plus its ultimate) into battle; the player chooses which.
  // The Legend hunt (24c-legend.js): after becoming Champion, one legendary buddy a week (a different type each week) can be hunted once a day.
  // It is a wild fight: HP x hpMult, `levels` above your buddy, and a win always pays `gems`. The catch chance starts at `catchChance` and grows by `pity` for every miss that week.
  // Catch it before then and you beat Riley: `raceGems` once. Losing the race costs nothing: you can still catch it.
  // The roaming legend (13b-wild.js): once you are Champion, one legendary buddy a week roams a different route each day. `encounter` is the chance that a grass step on that route meets it, at `level`.
  legend: { level: 60, encounter: 0.15 },
  // The Buddy Dex: owning every buddy of a pack pays once, per member, plus Catch Nets.
  dex: { packGemsPer: 8, packNets: 2 },
  levelUpGemsPerLevel: 3,
  evolveGems: 25,
  // Shop item prices. The shield is dear on purpose: it must be a real decision, never a cheap way to skip a problem. (Rare Candy's price depends on the buddy's level.)
  items: { potion: 20, net: 30, repel: 25 },
  quest: {
    chest: 35, solveBase: 10, opBase: 15, opPer: 2,
    streak: { 5: 22, 8: 32 }, boss: { 2: 22, 3: 32 }, flawless: 30, fast: { 5: 22, 8: 32 }, ult: { 2: 20, 3: 28 }
  },
  calendar: { length: 14, chests: { 3: 40, 7: 90, 14: 200 } },
  duel: { roomXp: 8, roomRewardedPerDay: 10, stakes: [0, 5, 10, 25], stakeCoverage: 2, questions: 10, ttlDays: 3, maxPerHour: 30 },
  // Adaptive practice (see 07b-adaptive.js). Levels are per math type: -1 easier, 0 normal (the parent's grade), +1 challenge.
  adaptive: {
    window: 20, upAfter: 20, downAfter: 10,            // results kept per type; tries needed before moving up / down
    upAccuracy: 0.85, upFastShare: 0.4, downAccuracy: 0.55,
    weakBoost: 2,                                      // a type you are at 0% on is picked up to 3x as often as one you have mastered
    maxTypeShare: 0.5,                                 // no single type may take more than half of the problems
    bossWeakShare: 0.4,                                // the boss weak point's share of problems
    servedWindow: 12, maxChallengeServed: 4,           // at most 4 challenge problems in any 12
  },
  // Study (38-study.js): question rounds in school subjects. A round is `roundSize` questions; only multiple-choice and typed rounds pay (flashcards are self-marked).
  // A right answer to a question not rewarded in the last `freshDays` days ("fresh") pays `gemPerNew` gem and `xpPerNew` buddy XP; a perfect round adds `perfectBonus`.
  // At most `dayCap` gems a day come from study, so repeating easy cards cannot be farmed. `missMax`: missed questions remembered for review.
  // `parent`: limits for questions a parent adds from their phone (see src/shared/study.js and src/server/17-study.js).
  study: { minLevel: 6, maxLevel: 8, dayCap: 20, missMax: 40,
    },
  egg: { steps: { common: 5, rare: 8, mythic: 12 }, duplicateXp: 25 },
  save: { softLimitBytes: 300000, hardLimitBytes: 400000 }
};

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
