// =====================================================================
//  DAILY STREAK CALENDAR  (a missed day pauses the streak, never wipes it)
// =====================================================================


// Called on every correct answer; only the first one each day counts.
function calDayEvent() {
  const sc = state.streakCal;
  const today = dayKey();
  if (sc.last === today) return;
  if (sc.count >= ECON.calendar.length) {
    // finished a full cycle: pay out any unopened chests and start a new one
    let owed = 0;
    Object.keys(ECON.calendar.chests).forEach(function (d) {
      if (sc.claimed.indexOf(Number(d)) === -1) owed += ECON.calendar.chests[d];
    });
    if (owed) state.gems += owed;
    sc.count = 0;
    sc.claimed = [];
  }
  sc.count += 1;
  sc.total += 1;
  sc.last = today;
  checkEarnedGear();
  toast('🔥 Streak day ' + sc.count + '!' + (ECON.calendar.chests[sc.count] ? ' A chest is ready!' : ''));
  saveState();
  updateCalBadge();
}

function calClaimable() {
  const sc = state.streakCal;
  return Object.keys(ECON.calendar.chests).filter(function (d) {
    return Number(d) <= sc.count && sc.claimed.indexOf(Number(d)) === -1;
  }).length;
}
function updateCalBadge() {
  const el = document.getElementById('cal-badge');
  if (!el) return;
  const n = calClaimable();
  el.innerText = n;
  el.style.display = n > 0 ? 'inline' : 'none';
}

function claimCalChest(day) {
  const sc = state.streakCal;
  if (!ECON.calendar.chests[day] || day > sc.count || sc.claimed.indexOf(day) !== -1) return;
  sc.claimed.push(day);
  grantGems(ECON.calendar.chests[day], '🎁 Day ' + day + ' chest! +' + ECON.calendar.chests[day] + ' 💎', true);
  renderCal();
}

function renderCal() {
  const sc = state.streakCal;
  const today = dayKey();
  const playedToday = sc.last === today;
  const status = document.getElementById('cal-status');
  if (playedToday) status.innerText = '✅ Today counted! You are on day ' + sc.count + '. Come back tomorrow for day ' + Math.min(sc.count + 1, ECON.calendar.length) + '.';
  else if (sc.count > 0 && sc.last !== daysAgoKey(1)) status.innerText = '⏸ Your streak is paused at day ' + sc.count + '. Solve one problem today to keep going — nothing is lost!';
  else status.innerText = 'Solve one problem today to reach day ' + (sc.count + 1) + '.';

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';
  for (let day = 1; day <= ECON.calendar.length; day++) {
    const cell = document.createElement('div');
    const filled = day <= sc.count;
    let cls = 'cal-cell' + (filled ? ' filled' : '') + (filled && day === sc.count && playedToday ? ' today' : '');
    if (ECON.calendar.chests[day]) {
      const opened = sc.claimed.indexOf(day) !== -1;
      cls += ' chest' + (opened ? ' opened' : (filled ? ' ready' : ''));
      cell.innerHTML = (opened ? '✅' : '🎁') + '<small>+' + ECON.calendar.chests[day] + '💎</small>';
      if (filled && !opened) cell.onclick = (function (d) { return function () { claimCalChest(d); }; })(day);
    } else {
      cell.innerHTML = filled ? '🔥' : String(day);
    }
    cell.className = cls;
    grid.appendChild(cell);
  }
  document.getElementById('cal-foot').innerText = 'Chests on days 3, 7 and 14. ' + sc.total + ' day' + (sc.total === 1 ? '' : 's') + ' played in total.';
}
function openCal() { showModal('cal-modal', renderCal); }
function closeCal() { hideModal('cal-modal', updateStatsUI); }

// ----- welcome back: after a break the streak is only paused, and the game says so kindly (once a day) -----
function welcomeBackText() {
  const sc = state.streakCal;
  if (!sc.last) return '';
  const gap = daysSince(sc.last);
  if (gap < 2) return '';
  let t = 'Your buddies missed you! It has been ' + gap + ' days.';
  t += sc.count > 0 ? ' Your streak is only paused at day ' + sc.count + ': solve one problem to keep it going.' : ' Solve one problem to start a new streak.';
  const chests = calClaimable();
  if (chests > 0) t += ' 🎁 ' + (chests === 1 ? 'A chest is' : chests + ' chests are') + ' waiting in your calendar.';
  return t;
}
function maybeWelcomeBack() {
  const text = welcomeBackText();
  if (!text || state.seen.welcome === dayKey()) return;
  state.seen.welcome = dayKey();
  saveState();
  enqueueModal(function () {
    soundCoinChirp();
    document.getElementById('welcome-text').innerText = text;
    document.getElementById('welcome-modal').style.display = 'flex';
  });
}
function closeWelcome() {
  soundClick();
  document.getElementById('welcome-modal').style.display = 'none';
  modalDone();
}
