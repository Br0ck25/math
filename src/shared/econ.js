// =====================================================================
//  ECON: the single source of truth for rewards, costs and limits.
//  Included in BOTH the browser script and the Worker (see scripts/build.mjs).
//  Change numbers here only, then run `npm run sim` to see the effect on the economy.
// =====================================================================
const ECON = {
  solve: { gem: 1, speedGem: 1, streakEvery: 3, streakBonus: 2 },
  boss: { gemBase: 8, gemPerLevels: 5 },
  levelUpGemsPerLevel: 3,
  evolveGems: 25,
  sessionGoal: { start: 25, step: 25, rewardDiv: 2, rewardBase: 12, maxReward: 50 },
  hint: { cost: 1 },
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
  save: { softLimitBytes: 300000, hardLimitBytes: 400000 }
};

// Gems for reaching a session goal of `solved` problems (grows with the goal, but is capped).
function sessionGoalReward(solved) {
  return Math.min(ECON.sessionGoal.maxReward, Math.round(solved / ECON.sessionGoal.rewardDiv) + ECON.sessionGoal.rewardBase);
}

// A stake is allowed when it is on the list and the player holds at least `stakeCoverage` times as many gems.
function stakeAllowed(stake, gems) {
  return ECON.duel.stakes.indexOf(stake) !== -1 && stake * ECON.duel.stakeCoverage <= gems;
}
function allowedStakes(gems) {
  return ECON.duel.stakes.filter(function (s) { return stakeAllowed(s, gems); });
}
