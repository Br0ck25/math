// =====================================================================
//  PLAY STATS  (feeds the parent report)
// =====================================================================
function escHtml(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function statDay() {
  const days = state.stats.days;
  const k = dayKey();
  if (!days[k]) {
    days[k] = { s: 0, a: 0, ms: 0, h: 0, w: 0, ops: {} };
    const keys = Object.keys(days).sort();
    while (keys.length > 35) delete days[keys.shift()];
  }
  return days[k];
}
function recordStat(op, correct, secs, weakHit) {
  const d = statDay();
  d.a += 1;
  if (correct) d.s += 1;
  if (weakHit) d.w += 1;
  d.ms += Math.round(Math.min(Math.max(secs || 0, 0), 60) * 1000);
  const o = d.ops[op] || (d.ops[op] = [0, 0]);
  o[0] += 1;
  if (correct) o[1] += 1;
}
// All-time records (never pruned). Hinted answers do not count toward the fastest time.
function recordAllTime(op, correct, secs, hinted) {
  const r = state.records;
  r.attempts += 1;
  if (!correct) return;
  r.solved += 1;
  if (state.streak > r.bestStreak) r.bestStreak = state.streak;
  if (!hinted && secs > 0.3 && (!r.fastest || secs < r.fastest)) { r.fastest = Math.round(secs * 10) / 10; r.fastestOp = op; }
}
function minutesToday() {
  const d = state.stats.days[dayKey()];
  return d ? d.ms / 60000 : 0;
}
function checkParentGoal() {
  const g = state.parentGoal;
  const today = dayKey();
  if (g.notified === today || minutesToday() < g.minutes) return;
  g.notified = today;
  launchConfetti();
  soundSecretFound();
  toast('🏆 Daily math goal reached!' + (g.reward ? ' Reward: ' + g.reward : ' Tell a grown-up!'));
}
