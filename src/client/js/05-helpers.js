// =====================================================================
//  SHARED HELPERS
// =====================================================================
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
const rnd = getRandomInt;
function pick(arr) { return arr[rnd(0, arr.length - 1)]; }
function gcd(a, b) { return b ? gcd(b, a % b) : a; }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function sgnStr(n) { return n < 0 ? '− ' + (-n) : '+ ' + n; }
function negFirst(n) { return n < 0 ? '−' + (-n) : '' + n; }
function negParen(n) { return n < 0 ? '(−' + (-n) + ')' : '' + n; }
// Local calendar day as 'YYYY-MM-DD'. Every daily feature (quests, streak, stats, care, duels) uses these.
function dayKey(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
// The number of the current week (Monday to Sunday), the same for everyone. `weekDaysLeft()` counts the days until the next one.
function dayNumber(d) { const k = dayKey(d).split('-'); return Math.round(Date.UTC(+k[0], +k[1] - 1, +k[2]) / 86400000); }
function weekNumber(d) { return Math.floor((dayNumber(d) + 3) / 7); }
function weekDaysLeft(d) { return 7 - ((dayNumber(d) + 3) % 7); }
function daysAgoKey(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dayKey(d);
}
// `count` day keys, oldest first, ending `skip` days ago (skip 0 = ends today).
function lastDayKeys(count, skip) {
  const out = [];
  for (let i = (skip || 0) + count - 1; i >= (skip || 0); i--) out.push(daysAgoKey(i));
  return out;
}
// Whole days from a saved day key (see dayKey) to today.
function daysSince(key) { return Math.round((new Date(dayKey() + 'T12:00:00') - new Date(key + 'T12:00:00')) / 86400000); }
function fmtAns(a) { return Number.isInteger(a) ? String(a) : String(+a.toFixed(2)); }

// Pays out gems with the usual celebration, then saves and refreshes the gem displays.
// Callers re-render their own panel afterwards.
function grantGems(n, message, big) {
  state.gems += n;
  if (big) { soundSecretFound(); launchConfetti(); } else soundCoinChirp();
  toast(message);
  saveState();
  updateStatsUI();
}

function polyStr(terms) {
  let s = '';
  terms.forEach(function (t) {
    const c = t[0], e = t[1];
    if (c === 0) return;
    const abs = Math.abs(c);
    let body;
    if (e === 0) body = '' + abs;
    else body = (abs === 1 ? '' : abs) + 'x' + (e === 1 ? '' : '<sup>' + e + '</sup>');
    if (s === '') s = (c < 0 ? '−' : '') + body;
    else s += ' ' + (c < 0 ? '−' : '+') + ' ' + body;
  });
  return s || '0';
}
