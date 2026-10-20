// ----- tournament: team picker -----
// Up to ECON.team.max (6) buddies. Only team members can fight, so your current fighter is always on it. With no team picked, it is your strongest buddies.
function getTeam() {
  const owned = getOwnedIds();
  let t = state.team.filter(function (id, i) { return owned.indexOf(id) !== -1 && state.team.indexOf(id) === i; }).slice(0, ECON.team.max);
  if (!t.length) {
    t = owned.slice().sort(function (a, b) { return getBuddyLevel(b) - getBuddyLevel(a); }).slice(0, ECON.team.max);
  }
  if (t.indexOf(state.activePet) === -1 && owned.indexOf(state.activePet) !== -1) t = [state.activePet].concat(t).slice(0, ECON.team.max);
  return t;
}
// The lead is the buddy sent out first in a battle. Changing it is free; only a team member can lead, and one that has fainted cannot.
function setLead(id) {
  if (id === state.activePet) return false;
  if (getTeam().indexOf(id) === -1) { soundWrong(); toast('Only your team can fight. Add it to your team first.'); return false; }
  if (state.advHp[id] === 0) { soundWrong(); toast(getPetById(id).name + ' has fainted. Rest at a Buddy Center first.'); return false; }
  state.activePet = id;
  return true;
}
// A new buddy joins the team only if there is room (and then it may fight); otherwise it waits in your collection.
function joinTeamIfRoom(id) {
  const t = getTeam();
  if (t.indexOf(id) !== -1) return true;
  if (t.length >= ECON.team.max) return false;
  state.team = t.concat(id);
  return true;
}
// ----- adding a buddy to a full team: choose who it replaces -----
let replaceFor = '';
function openReplaceModal(newId) {
  replaceFor = newId;
  showModal('replace-modal', renderReplace);
}
function closeReplace() { replaceFor = ''; hideModal('replace-modal'); }
function renderReplace() {
  const sp = getPetById(replaceFor);
  document.getElementById('replace-title').innerText = 'Which buddy should ' + sp.name + ' replace?';
  const list = document.getElementById('replace-options');
  list.innerHTML = '';
  getTeam().forEach(function (id) {
    const d = getPetById(id);
    const resting = false;
    const locked = false;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'move-btn' + (locked ? ' off' : '');
    b.disabled = locked;
    const note = 'Lv ' + d.level;
    b.innerHTML = '<span class="mv-icon">' + d.icon + '</span><span class="mv-main"><b>' + escHtml(d.name) + '</b><small>' + escHtml(note) + '</small></span>';
    b.setAttribute('aria-label', 'Replace ' + d.name + '. ' + note);
    b.onclick = function () { replaceTeamMember(id); };
    list.appendChild(b);
  });
}
function replaceTeamMember(oldId) {
  const newId = replaceFor;
  const t = getTeam(), i = t.indexOf(oldId);
  if (!newId || i === -1) { soundWrong(); return; }
  t[i] = newId;
  state.team = t;
  const name = getPetById(newId).name;
  closeReplace();
  if (oldId === state.activePet) state.activePet = newId;          // the new buddy takes the lead
  else toast(name + ' joined your team in place of ' + getPetById(oldId).name + '.');
  soundClick();
  saveState();
  updateStatsUI();
  if (typeof rerenderShop === 'function' && document.getElementById('shop-modal').style.display === 'flex') rerenderShop();
}
function toggleTeam(id) {
  let t = getTeam();
  const i = t.indexOf(id);
  if (i !== -1) {
    if (id === state.activePet) { soundWrong(); toast('Your fighter has to stay on the team. Swap to another team buddy first.'); return; }
    if (isSleepy(id)) { soundWrong(); toast('A resting buddy stays on the team until you beat a boss.'); return; }
    if (t.length > 1) t.splice(i, 1);
  } else if (t.length < ECON.team.max) t.push(id);
  else {
    const drop = t.findIndex(function (x) { return x !== state.activePet && !isSleepy(x); });      // the oldest buddy that is neither fighting nor resting
    if (drop === -1) { soundWrong(); toast('Everyone on your team is fighting or resting right now.'); return; }
    t.splice(drop, 1); t.push(id);
  }
  state.team = t;
  soundClick();
  saveState();
  renderHub();
}
function tourRunsLeft() {
  const t = state.tour;
  return t.day === dayKey() ? Math.max(0, ECON.tournament.rewardedRunsPerDay - t.runs) : ECON.tournament.rewardedRunsPerDay;
}
function renderTourTab() {
  const team = getTeam();
  let h = '<div style="font-size:0.78rem; font-weight:800; margin-bottom:2px;">Your team: pick up to ' + ECON.team.max + ' buddies. Only team buddies can fight (in battles and tournaments)</div>' +
    '<div class="team-grid">' + getOwnedIds().map(function (id) {
      const d = getPetById(id);
      return '<div class="team-chip' + (team.indexOf(id) !== -1 ? ' on' : '') + '" onclick="toggleTeam(&quot;' + id + '&quot;)"><b>' + d.icon + '</b>Lv ' + d.level + '</div>';
    }).join('') + '</div>';
  h += '<div style="font-size:0.72rem; color:var(--text-muted);">3 rounds vs computer trainers. Answer to attack, miss and they hit back! Type matchups count.</div>' +
    '<div style="font-size:0.72rem; margin:4px 0; color:#fde047; font-weight:800;">🏆 Trophies: ' + state.tour.trophies + ' · Rewarded runs left today: ' + tourRunsLeft() + '</div>' +
    '<button class="key-btn submit-btn" style="width:100%; height:44px; font-size:1rem;" onclick="tourStart()">🏆 Enter Tournament</button>';
  document.getElementById('hub-body').innerHTML = h;
}


// ----- tournament battle -----
const TRAINERS = [
  { name: 'Trainer Maple', icon: '🧑‍🌾', say: 'My team grew up on the farm!' },
  { name: 'Captain Bolt', icon: '🧑‍✈️', say: 'Ready for takeoff... and defeat!' },
  { name: 'Professor Pi', icon: '🧑‍🏫', say: 'Let me calculate your loss!' },
  { name: 'Ninja Nia', icon: '🥷', say: 'You will not see me coming.' },
  { name: 'Chef Basil', icon: '🧑‍🍳', say: 'Cooked up a winning team!' },
  { name: 'Wizard Wren', icon: '🧙', say: 'Abracadabra, I win!' }
];
let tour = null;

function mkFighter(id, level) {
  const sp = getSpecies(id);
  const stage = getFormIndex(sp, level);
  const f = sp.forms[stage];
  return { id: id, name: f.name, icon: f.icon, element: sp.element, ultra: !!sp.ultra, level: level, stage: stage,
    atk: 1 + Math.floor(level / 12) + stage, maxHp: 3 + Math.floor(level / 8) + stage, hp: 0 };
}
function tourMakeRound(n, avg) {
  const tr = TRAINERS[(rnd(0, TRAINERS.length - 1) + n) % TRAINERS.length];
  const pool = storePets.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 3);
  const foes = pool.map(function (sp) {
    const f = mkFighter(sp.id, clamp(avg + (n - 1) * 2 + rnd(-1, 1), 1, MAX_LEVEL));
    f.hp = f.maxHp;
    return f;
  });
  return { trainer: tr, foes: foes };
}
function tourStart() {
  const team = getTeam();
  if (!team.length) return;
  const t = state.tour;
  if (t.day !== dayKey()) { t.day = dayKey(); t.runs = 0; }
  t.runs += 1;
  const rewarded = t.runs <= ECON.tournament.rewardedRunsPerDay;
  const mine = team.map(function (id) {
    const d = getPetById(id);
    return { id: id, name: d.name, icon: d.icon, element: d.element, ultra: d.ultra, level: d.level, stage: d.stage,
      atk: getPetAttack(id), maxHp: getPetMaxHp(id), hp: getPetMaxHp(id) };
  });
  const avg = Math.round(mine.reduce(function (a, f) { return a + f.level; }, 0) / mine.length);
  tour = { mine: mine, avg: avg, round: 1, rewarded: rewarded, foes: tourMakeRound(1, avg), me: 0, foe: 0, answer: null, busy: false, over: false };
  saveState();
  document.getElementById('hub-modal').style.display = 'none';
  document.getElementById('tour-close').innerText = 'Give up';
  document.getElementById('tour-play').style.display = 'block';
  document.getElementById('tour-modal').style.display = 'flex';
  document.getElementById('tour-log').innerText = tour.foes.trainer.icon + ' "' + tour.foes.trainer.say + '"' + (rewarded ? '' : ' (practice run: no rewards today)');
  tourRender();
  tourQuestion();
}
function tourCur() { return tour.foes; }
function tourSideHtml(f, foe) {
  const pct = Math.max(0, Math.round((f.hp / f.maxHp) * 100));
  return '<div class="ic">' + f.icon + '</div>' + escHtml(f.name) + '<br><span style="color:var(--text-muted);">Lv ' + f.level + ' · ' + f.element + '</span>' +
    '<div class="tour-hp' + (foe ? ' foe' : '') + '"><i style="width:' + pct + '%"></i></div>' + Math.max(0, f.hp) + '/' + f.maxHp + ' HP';
}
function tourRender() {
  const r = tourCur();
  document.getElementById('tour-title').innerText = '🏆 Tournament · Round ' + tour.round + '/3';
  document.getElementById('tour-trainer').innerText = r.trainer.icon + ' ' + r.trainer.name + ' · foes left ' + r.foes.filter(function (f) { return f.hp > 0; }).length + ' · your team ' + tour.mine.filter(function (f) { return f.hp > 0; }).length;
  document.getElementById('tour-me').innerHTML = tourSideHtml(tour.mine[tour.me], false);
  document.getElementById('tour-foe').innerHTML = tourSideHtml(r.foes[tour.foe], true);
}
function tourDamage(att, def) {
  let dmg = att.atk;
  const rel = getTypeRelation(battleElement(att), battleElement(def));
  if (battleElement(att) === 'shadow') dmg = Math.ceil(dmg * 1.25);
  else if (rel === 1) dmg = Math.ceil(dmg * 1.5);
  else if (rel === -1) dmg = Math.max(1, Math.floor(dmg * 0.5));
  return Math.max(1, dmg);
}
function tourQuestion() {
  if (!tour || tour.over) return;
  const q = makeMcq();
  tour.answer = q.ans;
  tour.op = q.op;
  tour.q = q;
  tour.t0 = Date.now();
  document.getElementById('tour-eq').innerHTML = q.html;
  document.getElementById('tour-eq').classList.toggle('trivia-q', !!q.study);
  document.getElementById('tour-opts').classList.toggle('study-opts', !!q.study);
  fillOptButtons(document.getElementById('tour-opts'), q.opts, function (v) { tourAnswer(v); });
  tour.busy = false;
}
function tourFlash(id) {
  const el = document.getElementById(id);
  el.classList.remove('hit');
  void el.offsetWidth;
  el.classList.add('hit');
}
function tourAnswer(v) {
  if (!tour || tour.busy || tour.over) return;
  tour.busy = true;
  const r = tourCur();
  const me = tour.mine[tour.me], foe = r.foes[tour.foe];
  const ok = mcqRight(v, tour.answer);
  const secs = (Date.now() - tour.t0) / 1000;
  let msg;
  let next = 700;
  if (ok) {
    questEvent('solve', tour.op);
    soundCorrect();
    const dmg = tourDamage(me, foe);
    foe.hp -= dmg;
    tourFlash('tour-foe');
    msg = '✅ ' + me.name + ' hits for ' + dmg + '!';
    if (foe.hp <= 0) {
      msg += ' ' + foe.name + ' is out!';
      next = 1100;
      const alive = r.foes.map(function (f, i) { return f.hp > 0 ? i : -1; }).filter(function (i) { return i >= 0; });
      if (alive.length) tour.foe = alive[0];
      else { tourRender(); document.getElementById('tour-log').innerText = msg; setTimeout(tourRoundWon, 900); return; }
    }
  } else {
    soundWrong();
    const dmg = tourDamage(foe, me);
    me.hp -= dmg;
    tourFlash('tour-me');
    msg = '❌ Answer was ' + fmtAns(tour.answer) + '. ' + foe.name + ' hits for ' + dmg + '!';
    if (me.hp <= 0) {
      msg += ' ' + me.name + ' is out!';
      next = 1400;
      const alive = tour.mine.map(function (f, i) { return f.hp > 0 ? i : -1; }).filter(function (i) { return i >= 0; });
      if (alive.length) tour.me = alive[0];
      else { tourRender(); document.getElementById('tour-log').innerText = msg; setTimeout(tourLost, 1000); return; }
    }
  }
  tourRender();
  document.getElementById('tour-log').innerText = msg;
  setTimeout(tourQuestion, next + (ok ? 0 : 500));
}
function tourRoundWon() {
  if (!tour) return;
  const n = tour.round;
  const gems = tour.rewarded ? ECON.tournament.gemsPerRound * n : 0;
  const xp = tour.rewarded ? ECON.tournament.xpPerRound * n : 0;
  if (gems) state.gems += gems;
  tour.mine.forEach(function (f) { if (xp) addXpTo(f.id, xp); });
  launchConfetti();
  soundMonsterDefeated();
  if (n >= ECON.tournament.rounds) { tourChampion(gems); return; }
  tour.round = n + 1;
  tour.foes = tourMakeRound(tour.round, tour.avg);
  tour.foe = 0;
  tour.mine.forEach(function (f) { if (f.hp > 0) f.hp = Math.min(f.maxHp, f.hp + 1); });
  const alive = tour.mine.map(function (f, i) { return f.hp > 0 ? i : -1; }).filter(function (i) { return i >= 0; });
  tour.me = alive.length ? alive[0] : 0;
  saveState();
  updateStatsUI();
  tourRender();
  document.getElementById('tour-log').innerText = '🎉 Round ' + n + ' won!' + (gems ? ' +' + gems + ' 💎, buddies +' + xp + ' XP.' : '') + ' Next: ' + tour.foes.trainer.name + ' — "' + tour.foes.trainer.say + '"';
  tour.busy = true;
  setTimeout(tourQuestion, 2200);
}
function tourChampion(gems) {
  tour.over = true;
  const bonus = tour.rewarded ? ECON.tournament.championGems : 0;
  if (bonus) { state.gems += bonus; state.tour.trophies += 1; }
  state.tour.wins += 1;
  checkEarnedGear();
  saveState();
  updateStatsUI();
  soundSecretFound();
  launchConfetti();
  document.getElementById('tour-play').style.display = 'none';
  document.getElementById('tour-log').innerText = '🏆 CHAMPION! You won the tournament!' + (bonus ? ' +' + gems + ' 💎 and a +' + bonus + ' 💎 champion bonus, plus a trophy for your cards!' : ' (Practice run — come back tomorrow for rewards.)');
  document.getElementById('tour-close').innerText = 'Back to Game';
}
function tourLost() {
  if (!tour) return;
  tour.over = true;
  saveState();
  updateStatsUI();
  document.getElementById('tour-play').style.display = 'none';
  document.getElementById('tour-log').innerText = '💔 Your team was beaten in round ' + tour.round + '. You kept everything you earned so far — train up and try again!';
  document.getElementById('tour-close').innerText = 'Back to Game';
}
function tourQuit() {
  soundClick();
  document.getElementById('tour-modal').style.display = 'none';
  tour = null;
  saveState();
  updateStatsUI();
  document.getElementById('hub-modal').style.display = 'flex';
  renderHub();
}
