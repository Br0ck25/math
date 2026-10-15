// =====================================================================
//  ECON: the single source of truth for rewards, costs and limits.
//  Included in BOTH the browser script and the Worker (see scripts/build.mjs).
//  Change numbers here only, then run `npm run sim` to see the effect on the economy.
// =====================================================================
const ECON = {
  solve: { gem: 1, speedGem: 1, streakEvery: 3, streakBonus: 2 },
  boss: {
    gemBase: 8, gemPerLevels: 5,
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
  // `storeShare`: how often the wild buddy is a store buddy (else a secret one).
  wild: {
    hpBase: 3, hpPerLevel: 0.4, atkPerLevels: 15, gemBase: 4, gemPerLevels: 6, xpBase: 8, bossEvery: [5, 8], storeShare: 0.35,
    catchChance: { cheap: 0.3, mid: 0.2, rare: 0.1, secret: 0.12 }, matchup: { strong: 1.5, weak: 0.5 }
  },
  // A spare (a caught buddy you already own) sells for a share of a store buddy's price (at least 1 gem), or a flat amount for a secret one.
  sell: { storeShare: 0.2, secret: 12 },
  levelUpGemsPerLevel: 3,
  evolveGems: 25,
  sessionGoal: { start: 25, step: 25, rewardDiv: 2, rewardBase: 12, maxReward: 50 },
  hint: { cost: 1 },
  // Shop item prices. The shield is dear on purpose: it must be a real decision, never a cheap way to skip a problem. (Rare Candy's price depends on the buddy's level.)
  items: { shield: 100, ult: 33, clover: 25 },
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
  save: { softLimitBytes: 300000, hardLimitBytes: 400000 }
};

// Gems for reaching a session goal of `solved` problems (grows with the goal, but is capped).
function sessionGoalReward(solved) {
  return Math.min(ECON.sessionGoal.maxReward, Math.round(solved / ECON.sessionGoal.rewardDiv) + ECON.sessionGoal.rewardBase);
}

// What a spare buddy sells for.
function spareValue(isStore, cost) {
  return isStore ? Math.max(1, Math.round(cost * ECON.sell.storeShare)) : ECON.sell.secret;
}

// A stake is allowed when it is on the list and the player holds at least `stakeCoverage` times as many gems.
function stakeAllowed(stake, gems) {
  return ECON.duel.stakes.indexOf(stake) !== -1 && stake * ECON.duel.stakeCoverage <= gems;
}
function allowedStakes(gems) {
  return ECON.duel.stakes.filter(function (s) { return stakeAllowed(s, gems); });
}
