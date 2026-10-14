// =====================================================================
//  GOLDEN VAULT
// =====================================================================
let vaultTimerInterval = null;
let vaultTimeRemaining = 20;
let vaultGemsEarned = 0;
let vaultCurrentAnswer = 0;

function startGoldenVault() {
  soundSecretFound();
  launchConfetti();
  vaultTimeRemaining = 20;
  vaultGemsEarned = 0;
  document.getElementById('vault-gem-tally').innerText = '0';
  document.getElementById('vault-timer').innerText = '20s';
  document.getElementById('vault-modal').style.display = 'flex';
  nextVaultQuestion();

  clearInterval(vaultTimerInterval);
  vaultTimerInterval = setInterval(function () {
    vaultTimeRemaining -= 1;
    document.getElementById('vault-timer').innerText = `${vaultTimeRemaining}s`;
    if (vaultTimeRemaining <= 0) {
      clearInterval(vaultTimerInterval);
      state.gems += vaultGemsEarned;
      saveState();
      updateStatsUI();
      setTimeout(function () {
        document.getElementById('vault-modal').style.display = 'none';
        showPopup(`VAULT COMPLETE! +${vaultGemsEarned} 💎`);
        modalDone();
      }, 400);
    }
  }, 1000);
}

// Small, quick sums for the 20-second vault (the bigger generators would be too slow here).
function vaultProblem(op) {
  let sym = '+', n1 = 2, n2 = 2, ans = 4;
  if (op === 'add') { n1 = rnd(2, 9); n2 = rnd(2, 9); ans = n1 + n2; }
  else if (op === 'sub') { sym = '−'; n1 = rnd(6, 15); n2 = rnd(2, n1 - 1); ans = n1 - n2; }
  else if (op === 'mul') { sym = '×'; n1 = rnd(2, 8); n2 = rnd(2, 6); ans = n1 * n2; }
  else { sym = '÷'; n2 = rnd(2, 6); ans = rnd(2, 8); n1 = n2 * ans; }
  return { layout: 'inline', expr: n1 + ' ' + sym + ' ' + n2, answer: ans };
}
function nextVaultQuestion() {
  const basics = getActiveOps().filter(function (id) { return ['add', 'sub', 'mul', 'div'].indexOf(id) !== -1; });
  const q = makeMcq({ op: basics.length ? pick(basics) : 'add', problem: vaultProblem, count: 3 });
  vaultCurrentAnswer = q.ans;
  document.getElementById('vault-eq').innerText = q.expr;
  fillOptButtons(document.getElementById('vault-options'), q.opts, handleVaultGuess);
}
function handleVaultGuess(chosenVal) {
  if (vaultTimeRemaining <= 0) return;
  if (chosenVal === vaultCurrentAnswer) {
    soundCoinChirp();
    vaultGemsEarned += 2;
  } else {
    soundWrong();
    if (vaultGemsEarned > 0) vaultGemsEarned -= 1;
  }
  document.getElementById('vault-gem-tally').innerText = vaultGemsEarned;
  nextVaultQuestion();
}

function vaultPick(index) {
  const btns = document.querySelectorAll('.vault-btn');
  if (btns && btns[index]) btns[index].click();
}
