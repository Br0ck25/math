// Practice flow: streak milestones, boss weak points, generateProblem(), the equation UI and the keypad. Generators are in 07-math-generators.js.
// ----- streak milestone celebrations -----
const MILESTONES = {
  5: { text: '🔥 5 IN A ROW!', sub: 'Nice combo!' },
  10: { text: '⚡ 10 IN A ROW!', sub: 'Unstoppable!' },
  25: { text: '👑 25 IN A ROW!', sub: 'LEGENDARY!' }
};
function soundFanfare(big) {
  const notes = big ? [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51, 1567.98] : [523.25, 659.25, 783.99, 1046.5];
  notes.forEach(function (f, i) { setTimeout(function () { playTone(f, 0.22, 'triangle'); }, i * 95); });
}
function streakMilestone(n) {
  const m = MILESTONES[n];
  state.gems += ECON.milestoneGems[n];
  soundFanfare(n >= 10);
  for (let i = 0; i < (n >= 25 ? 4 : n >= 10 ? 2 : 1); i++) setTimeout(function () { launchConfetti('streak'); }, i * 220);
  const ov = document.getElementById('milestone-overlay');
  document.getElementById('milestone-big').innerText = m.text;
  document.getElementById('milestone-sub').innerText = m.sub + ' +' + ECON.milestoneGems[n] + ' 💎';
  ov.classList.remove('show');
  void ov.offsetWidth;
  ov.classList.add('show');
  setTimeout(function () { ov.classList.remove('show'); }, 1900);
  const w = document.getElementById('fighter-icon-wrapper');
  w.classList.remove('buddy-dance');
  void w.offsetWidth;
  w.classList.add('buddy-dance');
  setTimeout(function () { w.classList.remove('buddy-dance'); }, 1300);
}

// ----- boss weak points: one math type hits this boss extra hard -----
const ELEM_WEAK_OPS = {
  fire: ['mul', 'pow', 'pct'],
  water: ['sub', 'div', 'frac'],
  nature: ['add', 'mean', 'order'],
  electric: ['mul', 'div', 'sqrt', 'alg'],
  dark: ['sub', 'neg', 'log'],
  magic: ['alg', 'order', 'frac', 'quad', 'limit']
};
function weakOpForBoss(idx) {
  const ops = getActiveOps();
  if (ops.length < 2 || idx < 0 || !monstersList[idx]) return null;
  const pref = (ELEM_WEAK_OPS[monstersList[idx].element] || []).filter(function (o) { return ops.indexOf(o) !== -1; });
  const pool = pref.length ? pref : ops;
  return pool[idx % pool.length];
}
function getWeakOp() {
  if (state.wild.id) return null;                       // wild buddies have no weak point; only bosses do
  const r = state.raid;
  if (r) {
    const ops = getActiveOps();
    const w = r.weaks[r.phase];
    return ops.length >= 2 && ops.indexOf(w) !== -1 ? w : null;
  }
  return weakOpForBoss(currentMonsterIndex);
}
// The small chip beside the type hint: a wild buddy's catch chance, or a boss's weak point (and raid phase). Kept short so it shares one row.
function updateWeakChip() {
  const chip = document.getElementById('weak-chip');
  if (!chip) return;
  const r = state.raid;
  if (inChampionBattle()) {
    chip.innerText = '👑 ' + championAlive().length + ' left';
    chip.title = "The Champion's Hall: beat all six of Nova's buddies. Nova can swap them at any time.";
    return;
  }
  const gym = state.gym ? '🏟️ ' + Math.min(state.gym.step + 1, ECON.map.trainers + 1) + '/' + (ECON.map.trainers + 1) : '';
  if (state.wild.id && state.wild.trainer) {
    chip.innerText = gym + ' · Trainer';
    chip.title = 'A gym trainer: beat all of them, then the leader. Trainer buddies cannot be caught.';
    return;
  }
  if (state.wild.id) {
    chip.innerText = (state.wild.legend ? '🌟 ' : '') + (state.wild.shiny ? '✨ ' : '') + '🫧 Catch ' + Math.round(wildCatchChance(getSpecies(state.wild.id), { shiny: state.wild.shiny }) * 100) + '%' + (state.nets > 0 ? ' 🕸️' + state.nets : '');
    chip.title = 'Chance to catch this buddy when you win. Better when your buddy is strong against it, and a win with no mistakes adds ' + Math.round((ECON.wild.flawless - 1) * 100) + '%. With Catch Nets you choose how many to throw after the win.';
    return;
  }
  const op = getWeakOp();
  const w = !op ? null : studyOn ? studyWeakSubject() : { icon: OP_BY_ID[op].icon, label: OP_BY_ID[op].label };           // trivia mode: a school subject
  const head = (gym ? gym + ' Leader' + (w ? ' · ' : '') : '') + (r ? '👑 ' + (r.phase + 1) + '/' + r.total + (w ? ' · ' : '') : '');
  chip.innerText = (w || r || gym) ? head + (w ? '🎯 Weak: ' + w.icon + ' ' + w.label : '') : '';
  chip.title = w ? 'Weak point: ' + (studyOn ? 'answer ' + w.label + ' questions' : 'solve ' + w.label + ' problems') + ' to hit harder' + (r ? ' (raid phase ' + (r.phase + 1) + ' of ' + r.total + ')' : '') : '';
}

function generateProblem() {
  const next = pickNextProblem(lastOpId);
  const id = next.op;
  lastOpId = id;
  let p = next.make();
  for (let tries = 0; tries < 6 && lastSig && sigOf(p) === lastSig; tries++) p = next.make();
  p.easy = next.kind === 'warmup';
  p.challenge = next.kind === 'challenge';
  noteServed(p.challenge);
  lastSig = sigOf(p);
  p.modeTag = id;
  if (!p.layout) {
    const plain = p.expr.replace(/<[^>]+>/g, '');
    p.layout = plain.length > 13 ? 'stack' : 'inline';
  }
  p.answer = Math.round(p.answer * 100) / 100;
  currentProblem = p;
  userInput = '';
  inputLocked = false;
  hintUsed = false;
  renderHintUI();
  updateWeakChip();
  document.getElementById('equation-mount').classList.toggle('challenge', p.challenge);
  questionStartTime = Date.now();
  padReset();
  renderEquationUI();
  holdForSwitch();
  if (typeof speakCurrentProblem === 'function') speakCurrentProblem(false);
}

function renderEquationUI() {
  const mount = document.getElementById('equation-mount');
  const valText = userInput === '' ? '?' : userInput;
  const p = currentProblem;
  mount.classList.toggle('weak-glow', !!p.modeTag && p.modeTag === getWeakOp());

  if (p.layout === 'vertical') {
    mount.innerHTML = `
      <div class="equation-vertical">
        <div class="vertical-row"><span>${p.num1}</span></div>
        <div class="vertical-row bottom-row">
          <span class="vertical-op">${p.operator}</span>
          <span>${p.num2}</span>
        </div>
        <div class="vertical-row">
          <div class="answer-box" id="answer-box">${valText}</div>
        </div>
      </div>`;
  } else if (p.layout === 'inline') {
    mount.innerHTML = `
      <div class="equation-inline">
        <span>${p.expr}</span>
        <span>=</span>
        <div class="answer-box" id="answer-box">${valText}</div>
      </div>`;
  } else {
    mount.innerHTML = `
      <div class="equation-stack">
        <div class="eq-expr">${p.expr}</div>
        <div class="eq-ans">
          <span class="eq-lead">${p.lead || '='}</span>
          <div class="answer-box" id="answer-box">${valText}</div>
        </div>
      </div>`;
  }
}

function pressKey(key) {
  if (inputLocked) return;
  if (typeof stopSpeech === 'function') stopSpeech();
  soundClick();
  if (key === 'backspace') {
    userInput = userInput.slice(0, -1);
  } else if (key === 'clear') {
    userInput = '';
  } else if (key === 'neg') {
    userInput = userInput.charAt(0) === '-' ? userInput.slice(1) : '-' + userInput;
  } else if (key === 'dot') {
    if (userInput.indexOf('.') === -1) {
      const body = userInput.replace('-', '');
      userInput = body === '' ? userInput + '0.' : userInput + '.';
    }
  } else {
    if (userInput.replace('-', '').length < 7) {
      if (userInput === '0') userInput = key;
      else if (userInput === '-0') userInput = '-' + key;
      else userInput += key;
    }
  }
  const answerBox = document.getElementById('answer-box');
  if (answerBox) answerBox.innerText = userInput === '' ? '?' : userInput;
  syncPad();
}
