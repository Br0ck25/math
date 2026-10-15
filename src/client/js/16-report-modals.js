// =====================================================================
//  REPORT / GOAL / RESET MODALS
// =====================================================================
function fillReport() {
  document.getElementById('rep-solved').innerText = sessionStats.solved;
  const acc = sessionStats.attempts > 0 ? Math.round((sessionStats.solved / sessionStats.attempts) * 100) : 100;
  document.getElementById('rep-accuracy').innerText = `${acc}%`;
  document.getElementById('rep-fastest').innerText = sessionStats.fastestTime ? `${sessionStats.fastestTime.toFixed(1)}s` : '--';
  const ids = Object.keys(sessionStats.byOp);
  document.getElementById('rep-ops').innerHTML = ids.length
    ? ids.map(function (id) { return `<tr><td>${OP_BY_ID[id].icon} ${OP_BY_ID[id].label}</td><td>${sessionStats.byOp[id]}</td></tr>`; }).join('')
    : '<tr><td>Solved by type</td><td>--</td></tr>';
  document.getElementById('rep-secrets').innerText = state.unlockedSecrets.length;
  document.getElementById('rep-bosses').innerText = state.monstersDefeated;
  document.getElementById('rep-best').innerText = getBestLevel();
  const r = state.records;
  const fastOp = OP_BY_ID[r.fastestOp];
  const rows = [
    ['🏅 All-time fastest answer', r.fastest ? r.fastest.toFixed(1) + 's' + (fastOp ? ' (' + fastOp.label + ')' : '') : '--'],
    ['🔥 Longest streak', r.bestStreak || '--'],
    ['✅ All-time solved', r.solved],
    ['🎯 All-time accuracy', r.attempts ? Math.round(r.solved / r.attempts * 100) + '%' : '--'],
    ['📅 Days played', state.streakCal.total || '--']
  ];
  document.getElementById('rep-alltime').innerHTML = rows.map(function (x) { return '<tr><td>' + x[0] + '</td><td>' + escHtml(x[1]) + '</td></tr>'; }).join('');
}
function openReportModal() { showModal('report-modal', fillReport); }
function closeReportModal() { hideModal('report-modal'); }

function closeGoalModal() {
  soundClick();
  document.getElementById('goal-modal').style.display = 'none';
  // next session goal
  sessionStats.goal += ECON.sessionGoal.step;
  sessionStats.goalClaimed = false;
  updateBattleUI();
  saveState();
  modalDone();
}

function openResetModal() {
  document.getElementById('reset-cloud-note').style.display = (acct && acct.token) ? 'block' : 'none';
  showModal('reset-modal');
}
function closeResetModal() { hideModal('reset-modal'); }
function confirmReset() {
  soundWrong();
  state = freshState();
  localStorage.removeItem('math_quest_save');
  partyHp = {};
  ultimateCharge = 0;
  currentMonsterIndex = -1;
  pickNextBoss();
  sessionStats.solved = 0;
  sessionStats.attempts = 0;
  sessionStats.goal = ECON.sessionGoal.start;
  sessionStats.goalClaimed = false;
  sessionStats.fastestTime = null;
  sessionStats.byOp = {};
  document.getElementById('reset-modal').style.display = 'none';
  document.getElementById('settings-modal').style.display = 'none';
  setBossTaunt();
  updateStatsUI();
  generateProblem();
  saveState();
  document.getElementById('streak-msg').innerText = 'READY TO SOLVE?';
  document.getElementById('feedback-msg').innerText = 'Progress has been reset! Ready to start anew!';
}
