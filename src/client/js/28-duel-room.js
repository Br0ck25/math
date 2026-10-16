// ----- same-room duel: one screen, two players, same questions -----
let duelSetup = { b: [null, null], n: 10, flip: false };
let duel = null;
function duelDefaults() {
  const ids = getOwnedIds();
  if (!duelSetup.b[0] || ids.indexOf(duelSetup.b[0]) === -1) duelSetup.b[0] = hubPet;
  if (!duelSetup.b[1] || ids.indexOf(duelSetup.b[1]) === -1) duelSetup.b[1] = ids.filter(function (i) { return i !== duelSetup.b[0]; })[0] || duelSetup.b[0];
}
function renderRoomDuel() {
  duelDefaults();
  const ids = getOwnedIds();
  const row = function (pi, label, col) {
    return '<div style="font-size:0.78rem; font-weight:800; color:' + col + '; text-align:left;">' + label + '</div><div class="team-grid">' + ids.map(function (id) {
      const d = getPetById(id);
      return '<div class="team-chip' + (duelSetup.b[pi] === id ? ' on' : '') + '" onclick="duelPick(' + pi + ',&quot;' + id + '&quot;)"><b>' + d.icon + '</b>Lv ' + d.level + '</div>';
    }).join('') + '</div>';
  };
  const left = Math.max(0, ECON.duel.roomRewardedPerDay - (state.duelStat.day === dayKey() ? state.duelStat.count : 0));
  document.getElementById('hub-body').innerHTML =
    '<div style="font-size:0.74rem; color:var(--text-muted); margin-bottom:4px;">Same room, one screen! Both players answer the same questions at the same time. Most right wins; a tie goes to the faster player. Pure skill: no stat edge for anyone.</div>' +
    row(0, '🔵 Player 1 (bottom)', '#7dd3fc') + row(1, '🩷 Player 2 (top)', '#f9a8d4') +
    '<div style="display:flex; gap:8px; justify-content:center; align-items:center; margin:6px 0; font-size:0.78rem; font-weight:700;">Questions: ' +
    [5, 10, 15].map(function (n) { return '<button class="grade-btn' + (duelSetup.n === n ? ' active' : '') + '" style="padding:4px 10px;" onclick="duelSetN(' + n + ')">' + n + '</button>'; }).join('') + '</div>' +
    '<label style="font-size:0.74rem; display:block; margin-bottom:6px;"><input type="checkbox" ' + (duelSetup.flip ? 'checked' : '') + ' onchange="duelSetup.flip = this.checked"> Sitting face to face (flip the top player)</label>' +
    '<div style="font-size:0.68rem; color:#fde047; margin-bottom:6px;">Each duel gives both buddies +' + ECON.duel.roomXp + ' XP (' + left + ' rewarded duels left today).</div>' +
    '<button class="key-btn submit-btn" style="width:100%; height:44px; font-size:1rem;" onclick="duelStart(true)">⚔️ Start Duel</button>';
}
function duelPick(pi, id) { soundClick(); duelSetup.b[pi] = id; renderDuelTab(); }
function duelSetN(n) { soundClick(); duelSetup.n = n; renderDuelTab(); }
let duelMode = 'room';
function setDuelMode(m) { soundClick(); duelMode = m; renderDuelTab(); }
function renderDuelTab() {
  if (duelMode === 'online') renderOnlineDuel(); else renderRoomDuel();
  const body = document.getElementById('hub-body');
  body.insertAdjacentHTML('afterbegin', '<div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:8px;"><button class="grade-btn' + (duelMode === 'room' ? ' active' : '') + '" onclick="setDuelMode(&quot;room&quot;)">🏠 Same room</button><button class="grade-btn' + (duelMode === 'online' ? ' active' : '') + '" onclick="setDuelMode(&quot;online&quot;)">🌍 Online</button></div>');
}

function duelStart(fresh) {
  duelDefaults();
  const qs = [];
  for (let i = 0; i < duelSetup.n; i++) qs.push(makeMcq());
  const series = fresh || !duel ? [0, 0] : duel.series;
  duel = { qs: qs, b: duelSetup.b.slice(), series: series, flip: duelSetup.flip, started: false, ended: false,
    p: [0, 1].map(function () { return { i: 0, score: 0, done: false, t: 0, lock: false }; }) };
  document.getElementById('hub-modal').style.display = 'none';
  document.getElementById('duel-modal').style.display = 'flex';
  document.getElementById('duel-mid').style.display = 'none';
  duelRender();
  duelCountdown(3);
}
function duelCover(html) {
  const c = document.getElementById('duel-cover');
  c.innerHTML = html;
  c.classList.add('show');
}
function duelCountdown(n) {
  if (!duel) return;
  const sc = duel.series;
  duelCover('<div style="font-size:0.9rem; font-weight:800;">' + getPetById(duel.b[0]).icon + ' Player 1 ' + sc[0] + ' – ' + sc[1] + ' Player 2 ' + getPetById(duel.b[1]).icon + '</div><div class="duel-count">' + (n > 0 ? n : 'GO!') + '</div>');
  if (n > 0) { soundClick(); setTimeout(function () { duelCountdown(n - 1); }, 700); }
  else {
    soundSecretFound();
    setTimeout(function () {
      if (!duel) return;
      document.getElementById('duel-cover').classList.remove('show');
      document.getElementById('duel-mid').style.display = 'block';
      duel.started = true;
      duel.t0 = Date.now();
    }, 450);
  }
}
function duelRender() {
  [0, 1].forEach(function (pi) {
    const pl = duel.p[pi];
    const half = document.getElementById('duel-p' + (pi + 1));
    half.className = 'duel-half p' + (pi + 1) + (pi === 1 && duel.flip ? ' flip' : '');
    const d = getPetById(duel.b[pi]);
    const head = '<div class="duel-head"><span>' + d.icon + ' ' + escHtml(d.name) + '</span><span>⭐ ' + pl.score + '</span></div>' +
      '<div class="duel-bar"><i style="width:' + Math.round((pl.i / duel.qs.length) * 100) + '%"></i></div>';
    if (pl.done) {
      half.innerHTML = head + '<div class="duel-eq" style="font-size:1.2rem;">✅ Finished! Waiting for the other player...</div><div></div>';
      return;
    }
    const q = duel.qs[pl.i];
    half.innerHTML = head + '<div class="duel-eq">' + q.html + '</div><div class="tour-opts"></div>';
    fillOptButtons(half.querySelector('.tour-opts'), q.opts, function (v) { duelAnswer(pi, v); });
  });
}
function duelAnswer(pi, v) {
  if (!duel || !duel.started || duel.ended) return;
  const pl = duel.p[pi];
  if (pl.done || pl.lock) return;
  const q = duel.qs[pl.i];
  if (Math.abs(v - q.ans) < 0.0001) {
    soundCorrect();
    pl.score += 1;
    pl.i += 1;
    if (pl.i >= duel.qs.length) { pl.done = true; pl.t = Date.now() - duel.t0; }
    duelRender();
    if (duel.p[0].done && duel.p[1].done) setTimeout(duelEnd, 500);
  } else {
    soundWrong();
    pl.lock = true;
    pl.i += 1;
    const half = document.getElementById('duel-p' + (pi + 1));
    half.classList.add('wrong');
    half.querySelectorAll('.vault-btn').forEach(function (b) { b.disabled = true; });
    setTimeout(function () {
      if (!duel) return;
      pl.lock = false;
      if (pl.i >= duel.qs.length) { pl.done = true; pl.t = Date.now() - duel.t0; }
      duelRender();
      if (duel.p[0].done && duel.p[1].done) setTimeout(duelEnd, 500);
    }, 900);
  }
}
function duelEnd() {
  if (!duel || duel.ended) return;
  duel.ended = true;
  const a = duel.p[0], b = duel.p[1];
  let win = a.score > b.score ? 0 : (b.score > a.score ? 1 : (a.t < b.t ? 0 : (b.t < a.t ? 1 : -1)));
  if (win >= 0) duel.series[win] += 1;
  const ds = state.duelStat;
  if (ds.day !== dayKey()) { ds.day = dayKey(); ds.count = 0; }
  let xpNote = '';
  if (ds.count < ECON.duel.roomRewardedPerDay) {
    ds.count += 1;
    duel.b.forEach(function (id, i) { if (i === 0 || id !== duel.b[0]) addXpTo(id, ECON.duel.roomXp); });
    xpNote = 'Both buddies +' + ECON.duel.roomXp + ' XP';
  }
  saveState();
  updateStatsUI();
  launchConfetti();
  soundMonsterDefeated();
  const names = ['Player 1', 'Player 2'];
  const sec = function (p) { return (p.t / 1000).toFixed(1) + 's'; };
  const title = win < 0 ? '🤝 It is a tie!' : getPetById(duel.b[win]).emoji + ' ' + names[win] + ' wins!';
  duelCover('<div style="font-size:1.6rem; font-weight:900; color:#fde047;">' + title + '</div>' +
    '<div style="font-size:0.95rem; font-weight:800;">🔵 ' + a.score + '/' + duel.qs.length + ' (' + sec(a) + ') &nbsp;vs&nbsp; 🩷 ' + b.score + '/' + duel.qs.length + ' (' + sec(b) + ')</div>' +
    '<div style="font-size:1.1rem; font-weight:900;">Series: ' + duel.series[0] + ' – ' + duel.series[1] + '</div>' +
    '<div style="font-size:0.72rem; color:var(--text-muted);">' + xpNote + '</div>' +
    '<button class="key-btn submit-btn" style="width:80%; height:56px; font-size:1.3rem;" onclick="duelStart(false)">🔁 Rematch</button>' +
    '<div style="display:flex; gap:8px; width:80%;"><button class="grade-btn" style="flex:1;" onclick="duelSwap()">🔀 Swap seats</button><button class="grade-btn" style="flex:1;" onclick="duelQuit()">Done</button></div>');
}
function duelSwap() {
  soundClick();
  duelSetup.b = [duelSetup.b[1], duelSetup.b[0]];
  duel.series = [duel.series[1], duel.series[0]];
  duelStart(false);
}
function duelQuit() {
  soundClick();
  duel = null;
  document.getElementById('duel-cover').classList.remove('show');
  document.getElementById('duel-modal').style.display = 'none';
  updateStatsUI();
  document.getElementById('hub-modal').style.display = 'flex';
  renderHub();
}
