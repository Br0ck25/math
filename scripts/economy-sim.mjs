// Models a day of play from the numbers in src/shared/econ.js and shows where gems come from.
//   npm run sim
// The assumptions below are a guess at an average kid; change PROFILES to try others.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shared = new Function(fs.readFileSync(path.join(root, 'src/shared/econ.js'), 'utf8') + '; return { ECON, sessionGoalReward };')();
export const ECON = shared.ECON;
const sessionGoalReward = shared.sessionGoalReward;

export const PROFILES = {
  quick: { name: 'Quick session (10 min)', problems: 30, accuracy: 0.8, questsDone: 0.5, tournamentRuns: 0, playsDaily: true },
  typical: { name: 'Typical day (25 min)', problems: 80, accuracy: 0.85, questsDone: 0.8, tournamentRuns: 2, playsDaily: true },
  keen: { name: 'Keen day (50 min)', problems: 180, accuracy: 0.9, questsDone: 1, tournamentRuns: 2, playsDaily: true }
};
// Wild battles: a boss every avg(bossEvery) of them. A caught buddy is a spare (sellable) about half the time once the collection is growing.
const CATCH_RATE = 0.082, SPARE_SHARE = 0.5, AVG_SPARE_VALUE = 154, AVG_WILD_LEVEL = 9;   // 154: average sale of a caught store or secret buddy (20% of shop price, no maximum)
const SPEED_SHARE = 0.5, STREAK_SHARE = 0.8, HITS_PER_BOSS = 4.5, AVG_BOSS_LEVEL = 10, CLEAR_ROUND = 0.8;
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const vals = (o) => Object.keys(o).map((k) => o[k]);

export function simulate(p) {
  const E = ECON;
  const correct = p.problems * p.accuracy;
  const perCorrect = E.solve.gem + SPEED_SHARE * E.solve.speedGem + STREAK_SHARE * (E.solve.streakBonus / E.solve.streakEvery);
  const fights = correct / HITS_PER_BOSS;
  const perBoss = avg(E.wild.bossEvery);
  const bosses = fights / (perBoss + 1);
  const wildFights = fights - bosses;

  let goals = 0;
  for (let g = E.sessionGoal.start; g <= p.problems; g += E.sessionGoal.step) goals += sessionGoalReward(g);

  const q = E.quest;
  const solveAvg = q.solveBase + avg([15, 20, 30]);
  const poolAvg = avg([q.opBase + q.opPer * avg([5, 6, 8]), avg(vals(q.streak)), avg(vals(q.boss)), q.flawless, avg(vals(q.fast)), avg(vals(q.ult))]);
  const quests = p.questsDone * (solveAvg + 2 * poolAvg + q.chest);

  const calendar = p.playsDaily ? vals(E.calendar.chests).reduce((a, b) => a + b, 0) / E.calendar.length : 0;

  const t = E.tournament;
  let perRun = Math.pow(CLEAR_ROUND, t.rounds) * t.championGems;
  for (let n = 1; n <= t.rounds; n++) perRun += Math.pow(CLEAR_ROUND, n) * t.gemsPerRound * n;
  const tournament = Math.min(p.tournamentRuns, t.rewardedRunsPerDay) * perRun;

  const sources = {
    'solving problems': correct * perCorrect,
    'boss victories': bosses * (E.boss.gemBase + Math.floor(AVG_BOSS_LEVEL / E.boss.gemPerLevels)),
    'wild battles': wildFights * (E.wild.gemBase + Math.floor(AVG_WILD_LEVEL / E.wild.gemPerLevels)),
    'selling spares': wildFights * CATCH_RATE * SPARE_SHARE * AVG_SPARE_VALUE,
    'raid bonuses': (bosses / E.raid.every) * CLEAR_ROUND * E.raid.bonusGems,
    'session goals': goals,
    'daily quests': quests,
    'streak calendar': calendar,
    'tournament': tournament
  };
  const total = vals(sources).reduce((a, b) => a + b, 0);
  const sinks = { hints: 3 * E.hint.cost, 'buddy care': E.care.treatCost + E.care.favCost };
  return { profile: p.name, sources, total, competitive: tournament, sinks, perCorrect };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  Object.keys(PROFILES).forEach((k) => {
    const r = simulate(PROFILES[k]);
    console.log('\n' + r.profile + '  ->  about ' + Math.round(r.total) + ' gems/day');
    Object.keys(r.sources).forEach((s) => console.log('  ' + s.padEnd(18) + String(Math.round(r.sources[s])).padStart(5) + '  ' + String(Math.round((r.sources[s] / r.total) * 100)).padStart(3) + '%'));
  });
  console.log('\nCompetitive modes (tournament) are ' + Math.round((simulate(PROFILES.typical).competitive / simulate(PROFILES.typical).total) * 100) + '% of a typical day. Online duel stakes are zero-sum, so they add nothing to the total.');
}
