// =====================================================================
//  SHARED HELPERS
// =====================================================================
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
const rnd = getRandomInt;
function pick(arr) { return arr[rnd(0, arr.length - 1)]; }
// A shuffled copy of a list.
function shuffled(arr) { return arr.map(function (v) { return [Math.random(), v]; }).sort(function (x, y) { return x[0] - y[0]; }).map(function (x) { return x[1]; }); }
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
function weekDaysLeft(d) { return 7 - ((dayNumber(d) + 3) % 7); }
// Whole days from a saved day key (see dayKey) to today.
function daysSince(key) { return Math.round((new Date(dayKey() + 'T12:00:00') - new Date(key + 'T12:00:00')) / 86400000); }
function fmtAns(a) { return typeof a === 'string' ? a : (Number.isInteger(a) ? String(a) : String(+a.toFixed(2))); }       // study answers are words

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
function escHtml(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// A small number that is the same for the same text, for choosing things by day and land.
function dayHash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 100003;
  return h;
}
// The number of the current week (Monday to Sunday), the same for everyone.
function weekNumber(d) { return Math.floor((dayNumber(d) + 3) / 7); }
