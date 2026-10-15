import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ECON, PROFILES, simulate, longGame } from '../scripts/economy-sim.mjs';

const typical = simulate(PROFILES.typical);
const share = (r, k) => r.sources[k] / r.total;

test('a typical day earns a healthy but not runaway number of gems', () => {
  assert.ok(typical.total > 200 && typical.total < 900, 'typical day: ' + Math.round(typical.total));
});

test('even a short session feels rewarding', () => {
  assert.ok(simulate(PROFILES.quick).total >= 60, 'a 10 minute session should earn at least 60 gems');
});

test('no single source dominates, and competitive play is a bonus, not the main job', () => {
  Object.keys(typical.sources).forEach((k) => assert.ok(share(typical, k) < 0.4, k + ' is ' + Math.round(share(typical, k) * 100) + '%'));
  assert.ok(typical.competitive / typical.total < 0.25, 'tournament share ' + Math.round((typical.competitive / typical.total) * 100) + '%');
});

test('longer play always earns more, but not endlessly more', () => {
  const q = simulate(PROFILES.quick).total, t = typical.total, k = simulate(PROFILES.keen).total;
  assert.ok(q < t && t < k && k < t * 2.5, 'keen day ' + Math.round(k) + ' vs typical ' + Math.round(t));
});

test('stakes are affordable and bounded: every listed stake is covered by an ordinary day', () => {
  assert.ok(Math.max(...ECON.duel.stakes) * ECON.duel.stakeCoverage < typical.total);
  assert.equal(ECON.duel.stakes[0], 0, 'a free (friendly) option always exists');
});

test('economy numbers are sane', () => {
  assert.ok(typical.perCorrect >= 1 && typical.perCorrect <= 4);
  assert.ok(ECON.hint.cost >= 1 && ECON.hint.cost <= 3, 'hints must stay cheap or they will not be used');
  const chests = Object.keys(ECON.calendar.chests).map(Number);
  assert.ok(chests.every((d) => d <= ECON.calendar.length));
  assert.ok(chests.includes(ECON.calendar.length), 'the last day of the calendar has a chest');
});

test('a streak shield is expensive enough to be a real decision, yet reachable within a day of play', () => {
  assert.equal(ECON.items.shield, 100);
  assert.ok(ECON.items.shield > simulate(PROFILES.quick).total / 4, 'dearer than a quarter of a short session');
  assert.ok(ECON.items.shield < typical.total / 3, 'under a third of a typical day');
});

test('the long game: a typical player has goals for months, and a buddy takes weeks (not days, not years) to reach the top', () => {
  const g = longGame(PROFILES.typical);
  assert.ok(g.buddyDays > 60 && g.buddyDays < 200, 'buying every buddy takes ' + Math.round(g.buddyDays) + ' days');
  assert.ok(g.gearDays > 15 && g.gearDays < 100, 'buying all gear takes ' + Math.round(g.gearDays) + ' days');
  assert.ok(g.level100 > 30 && g.level100 < 150, 'level 100 takes ' + g.level100 + ' days');
  assert.ok(simulate(PROFILES.quick).total > 0 && longGame(PROFILES.quick).level100 < 400, 'even a 10 minute player gets there within a year');
});

test('Champion rematches are a bonus, not a new main income', () => {
  const c = simulate(PROFILES.champion);
  assert.ok(c.sources['champion rematches'] / c.total < 0.2, 'rematch share ' + Math.round((c.sources['champion rematches'] / c.total) * 100) + '%');
  assert.ok(c.total / typical.total < 1.25, 'a Champion earns at most 25% more than a typical day');
});
