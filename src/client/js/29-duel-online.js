// ----- online duels (server scores the answers; both players play whenever) -----
let rd = { list: [], err: '', loading: false, to: '', stake: 10, cur: null, pollT: 0, waitTimer: null, seen: 0 };
try { rd.seen = parseInt(localStorage.getItem('mq_duel_seen') || '0', 10) || 0; } catch (e) {}

function rdReady() { return !!state.duelsOnline && !!acct && acctEnabled !== false; }
function renderOnlineDuel() {
  const body = document.getElementById('hub-body');
  if (!state.duelsOnline) { body.innerHTML = '<p style="font-size:0.85rem; margin:12px 0;">🔒 Online duels are turned off. A grown-up can turn them on in Settings → Parent report.</p>'; return; }
  if (acctEnabled === null) { checkAcctEnabled().then(function () { if (hubTab === 'duel' && duelMode === 'online') renderDuelTab(); }); }
  if (acctEnabled === false) { body.innerHTML = '<p style="font-size:0.85rem; margin:12px 0;">Online play is not switched on for this game yet.</p>'; return; }
  if (!acct) {
    body.innerHTML = '<p style="font-size:0.85rem; margin:10px 0;">Duel friends who are anywhere! You both need a player name. Create or sign in to your account first.</p>' +
      '<button class="key-btn submit-btn" style="width:100%; height:44px;" onclick="closeHub(); openSettings()">⚙️ Go to Account</button>';
    return;
  }
  const rec = state.duelRecord;
  const okStakes = allowedStakes(state.gems);
  if (okStakes.indexOf(rd.stake) === -1) rd.stake = okStakes[okStakes.length - 1] || 0;
  let h = '<div style="font-size:0.72rem; color:var(--text-muted); margin-bottom:4px;">Same questions for both players. Play anytime — whoever scores more wins. Record: ' + rec.w + 'W · ' + rec.l + 'L · ' + rec.t + 'T</div>' +
    '<div class="care-row" style="flex-direction:column; align-items:stretch; gap:6px;">' +
    '<input id="rd-to" class="acct-input" style="margin:0;" placeholder="Friend name" maxlength="20" autocapitalize="none" autocorrect="off" spellcheck="false" value="' + escHtml(rd.to) + '" oninput="rd.to = this.value.trim().toLowerCase()">' +
    (state.duelFriends.length ? '<div class="team-grid" style="grid-template-columns:repeat(4,1fr); margin:0;">' + state.duelFriends.map(function (n) { return '<div class="team-chip' + (rd.to === n ? ' on' : '') + '" style="padding:6px 2px;" onclick="rdPickFriend(&quot;' + n + '&quot;)">' + escHtml(n) + '</div>'; }).join('') + '</div>' : '') +
    '<div style="font-size:0.74rem; font-weight:800; text-align:left;">Stake (winner takes it, loser pays it):</div>' +
    '<div style="display:grid; grid-template-columns:repeat(4,1fr); gap:5px;">' + ECON.duel.stakes.map(function (x) {
      return '<button class="grade-btn' + (rd.stake === x ? ' active' : '') + '" style="padding:6px 2px;" ' + (okStakes.indexOf(x) === -1 ? 'disabled' : '') + ' onclick="rdSetStake(' + x + ')">' + (x ? x + ' 💎' : 'Free') + '</button>';
    }).join('') + '</div>' +
    '<div style="font-size:0.64rem; color:var(--text-muted); text-align:left;">You can stake up to half your gems. Levels, XP and buddies are never at risk.</div>' +
    '<button class="key-btn submit-btn" style="height:44px; font-size:1rem;" onclick="rdChallenge()">⚔️ Challenge &amp; play now</button>' +
    '<div style="font-size:0.72rem; color:#fca5a5; min-height:14px;" id="rd-err">' + escHtml(rd.err) + '</div></div>';
  h += '<div class="settings-label">Your duels</div><div id="rd-list">' + rdListHtml() + '</div>';
  body.innerHTML = h;
  if (!rd.loading && Date.now() - rd.pollT > 2500) rdRefresh();
}
function rdPickFriend(n) { soundClick(); rd.to = n; renderDuelTab(); }
function rdSetStake(x) { soundClick(); rd.stake = x; renderDuelTab(); }
function rdListHtml() {
  if (!rd.list.length) return '<div style="font-size:0.78rem; color:var(--text-muted);">' + (rd.loading ? 'Loading…' : 'No duels yet. Challenge a friend!') + '</div>';
  return rd.list.map(function (d) {
    const opp = escHtml(d.opp);
    const st = d.stake ? ' · ' + d.stake + ' 💎' : ' · friendly';
    let t, btns = '';
    if (d.status === 'todo') {
      const incoming = d.to === acct.name;
      t = (incoming ? '📨 <b>' + opp + '</b> challenged you!' : '▶️ Your challenge to <b>' + opp + '</b>') + st + ' · ' + d.n + ' Qs';
      btns = '<button class="claim-btn" onclick="rdPlay(&quot;' + d.id + '&quot;)">Play</button>' + (incoming ? '<button class="grade-btn" style="padding:4px 8px;" onclick="rdDecline(&quot;' + d.id + '&quot;)">✕</button>' : '');
    } else if (d.status === 'waiting') {
      t = '⏳ Waiting for <b>' + opp + '</b>' + st + ' · you got ' + d.mine.score + '/' + d.n;
      btns = '<button class="grade-btn" style="padding:4px 8px;" onclick="rdPlay(&quot;' + d.id + '&quot;)">Open</button>';
    } else if (d.status === 'declined') {
      t = '🚫 ' + opp + ' declined';
    } else {
      const o = d.outcome;
      t = (o === 'win' ? '🏆 You beat <b>' + opp + '</b>' : (o === 'loss' ? '😤 <b>' + opp + '</b> won' : '🤝 Tie with <b>' + opp + '</b>')) + ' ' + d.mine.score + '–' + d.theirs.score + (d.stake && o !== 'tie' ? ' · ' + (o === 'win' ? '+' : '-') + d.stake + ' 💎' : '');
      btns = '<button class="claim-btn" onclick="rdRematch(&quot;' + d.id + '&quot;)">🔁 Rematch</button>';
    }
    return '<div class="care-row"><div class="t" style="font-size:0.76rem; font-weight:700;">' + t + '</div><div style="display:flex; gap:4px;">' + btns + '</div></div>';
  }).join('');
}
async function rdRefresh() {
  if (!rdReady()) return;
  rd.loading = true; rd.pollT = Date.now();
  try {
    const r = await api('/api/duel/list');
    if (r.status === 200) { rd.list = r.data.duels || []; rdSettle(rd.list); }
    else if (r.status === 401) rd.err = 'Please sign in again in Settings.';
  } catch (e) { rd.err = 'Could not reach the server.'; }
  rd.loading = false;
  if (hubTab === 'duel' && duelMode === 'online' && document.getElementById('hub-modal').style.display === 'flex') {
    const l = document.getElementById('rd-list');
    if (l) l.innerHTML = rdListHtml();
  }
}
function rdSettle(list) {
  let changed = false;
  list.forEach(function (d) {
    if (d.status !== 'done' || state.duelSettled.indexOf(d.id) !== -1) return;
    state.duelSettled.push(d.id);
    changed = true;
    if (d.outcome === 'win') { state.duelRecord.w += 1; state.gems += d.stake; if (d.stake) toast('🏆 You won ' + d.stake + ' 💎 from ' + d.opp + '!'); }
    else if (d.outcome === 'loss') { state.duelRecord.l += 1; const pay = Math.min(d.stake, state.gems); state.gems -= pay; if (pay) toast('😤 ' + d.opp + ' won. You paid ' + pay + ' 💎.'); }
    else state.duelRecord.t += 1;
  });
  if (changed) {
    if (state.duelSettled.length > 80) state.duelSettled = state.duelSettled.slice(-80);
    saveState();
    updateStatsUI();
  }
}

function rdBuildQuestions(n) {
  const out = [];
  for (let i = 0; i < n; i++) { const q = makeMcq(); out.push(q.study ? { t: 't', e: q.expr, l: '', o: q.opts, a: q.ans } : { e: q.expr, l: q.lead, o: q.opts, a: q.ans }); }      // trivia questions say so (t) and are shown as plain text
  return out;
}
async function rdCreate(to, stake) {
  rd.err = '';
  const r = await api('/api/duel/create', 'POST', { to: to, stake: stake, qs: rdBuildQuestions(ECON.duel.questions) });
  if (r.status !== 200) { rd.err = (r.data && r.data.error) || 'Could not send the challenge.'; return null; }
  if (state.duelFriends.indexOf(to) === -1) { state.duelFriends.unshift(to); state.duelFriends = state.duelFriends.slice(0, 8); saveState(); }
  return r.data.id;
}
async function rdChallenge() {
  const to = (rd.to || '').trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,20}$/.test(to)) { rd.err = 'Type the player name of a friend.'; renderDuelTab(); return; }
  soundClick();
  document.getElementById('rd-err').innerText = 'Sending…';
  let id = null;
  try { id = await rdCreate(to, rd.stake); } catch (e) { rd.err = 'Could not reach the server.'; }
  if (!id) { renderDuelTab(); return; }
  rdPlay(id);
}
async function rdRematch(id) {
  const d = rd.list.filter(function (x) { return x.id === id; })[0] || (rd.cur && rd.cur.summary);
  if (!d) return;
  let stake = d.stake;
  if (!stakeAllowed(stake, state.gems)) { const ok = allowedStakes(state.gems); stake = ok[ok.length - 1] || 0; toast('Stake lowered to ' + stake + ' 💎'); }
  soundClick();
  let nid = null;
  try { nid = await rdCreate(d.opp, stake); } catch (e) { rd.err = 'Could not reach the server.'; }
  if (!nid) { rdCloseModal(); renderDuelTab(); toast(rd.err); return; }
  rdPlay(nid);
}
async function rdDecline(id) {
  soundClick();
  try { await api('/api/duel/decline', 'POST', { id: id }); } catch (e) {}
  rdRefresh();
}
async function rdBlock(name) {
  try { await api('/api/duel/block', 'POST', { name: name }); toast('🚫 ' + name + ' blocked'); } catch (e) {}
}

// ----- playing one online duel -----
async function rdPlay(id) {
  soundClick();
  document.getElementById('hub-modal').style.display = 'none';
  const m = document.getElementById('rd-modal');
  m.style.display = 'flex';
  document.getElementById('rd-box').innerHTML = '<div class="duel-count" style="font-size:2rem;">Loading…</div>';
  let r;
  try { r = await api('/api/duel/get?id=' + encodeURIComponent(id)); } catch (e) { r = { status: 0, data: {} }; }
  if (r.status !== 200) { document.getElementById('rd-box').innerHTML = '<p>' + escHtml((r.data && r.data.error) || 'Could not reach the server.') + '</p><button class="key-btn submit-btn" style="width:100%; height:44px;" onclick="rdCloseModal()">Back</button>'; return; }
  rd.cur = { id: id, duel: r.data.duel, summary: r.data.summary, i: 0, answers: [], t0: 0 };
  if (r.data.summary.status !== 'todo') { rdShowResult(r.data.summary); return; }
  rd.cur.t0 = Date.now();
  rdShowQuestion();
}
function rdShowQuestion() {
  const c = rd.cur, q = c.duel.qs[c.i], n = c.duel.qs.length;
  const opp = c.duel.from === acct.name ? c.duel.to : c.duel.from;
  document.getElementById('rd-box').innerHTML =
    '<div class="raid-chapter" style="color:#fde047;">⚔️ vs ' + escHtml(opp) + (c.duel.stake ? ' · ' + c.duel.stake + ' 💎 on the line' : ' · friendly') + '</div>' +
    '<div class="duel-bar" style="margin:8px 0 2px;"><i style="width:' + Math.round((c.i / n) * 100) + '%"></i></div>' +
    '<div style="font-size:0.72rem; color:var(--text-muted);">Question ' + (c.i + 1) + ' of ' + n + '</div>' +
    (q.t === 't' ? '<div class="tour-eq trivia-q">' + escHtml(q.e) + '</div>' : '<div class="tour-eq">' + q.e + ' <span style="color:var(--text-muted);">' + escHtml(q.l) + ' ?</span></div>') + '<div class="tour-opts study-opts" id="rd-opts"></div>' +
    '<button class="key-btn" style="width:100%; height:34px; font-size:0.75rem; margin-top:10px;" onclick="rdCloseModal()">Leave (you can finish later)</button>';
  fillOptButtons(document.getElementById('rd-opts'), q.o, rdAnswer);
}
async function rdAnswer(v) {
  const c = rd.cur;
  c.answers.push(v);
  soundClick();
  c.i += 1;
  if (c.i < c.duel.qs.length) { rdShowQuestion(); return; }
  document.getElementById('rd-box').innerHTML = '<div class="duel-count" style="font-size:2rem;">Checking…</div>';
  const ms = Date.now() - c.t0;
  let r;
  try { r = await api('/api/duel/submit', 'POST', { id: c.id, answers: c.answers, ms: ms }); } catch (e) { r = { status: 0, data: {} }; }
  if (r.status !== 200) {
    document.getElementById('rd-box').innerHTML = '<p>' + escHtml((r.data && r.data.error) || 'Could not send your answers. Check your internet.') + '</p><button class="key-btn submit-btn" style="width:100%; height:44px;" onclick="rdRetrySubmit()">Try again</button>';
    return;
  }
  calDayEvent();
  rdShowResult(r.data.summary);
}
async function rdRetrySubmit() {
  const c = rd.cur;
  c.i = c.duel.qs.length - 1;
  const last = c.answers.pop();
  await rdAnswer(last);
}
function rdShowResult(sum) {
  rd.cur.summary = sum;
  const n = sum.n, secs = function (x) { return (x.ms / 1000).toFixed(1) + 's'; };
  let h;
  if (sum.status === 'waiting') {
    h = '<div class="raid-chapter" style="color:#fde047;">Your score</div><div style="font-size:2.4rem; font-weight:900;">' + sum.mine.score + '/' + n + '</div>' +
      '<div style="font-size:0.78rem; color:var(--text-muted);">' + secs(sum.mine) + '</div>' +
      '<p style="font-size:0.85rem; margin:10px 0;">⏳ Waiting for <b>' + escHtml(sum.opp) + '</b> to play. You can close this — we will tell you the moment they finish.</p>' +
      '<button class="key-btn" style="width:100%; height:40px;" onclick="rdCloseModal()">Close</button>';
    rdWaitStart(sum.id);
  } else if (sum.status === 'done') {
    rdSettle([sum]);
    const o = sum.outcome;
    const title = o === 'win' ? '🏆 You win!' : (o === 'loss' ? '😤 ' + escHtml(sum.opp) + ' wins' : '🤝 Tie!');
    if (o === 'win') { launchConfetti(); soundSecretFound(); } else soundWrong();
    h = '<div style="font-size:1.7rem; font-weight:900; color:#fde047;">' + title + '</div>' +
      '<div style="font-size:0.95rem; font-weight:800; margin:6px 0;">You ' + sum.mine.score + '/' + n + ' (' + secs(sum.mine) + ') &nbsp;vs&nbsp; ' + escHtml(sum.opp) + ' ' + sum.theirs.score + '/' + n + ' (' + secs(sum.theirs) + ')</div>' +
      (sum.stake && o !== 'tie' ? '<div style="font-weight:900;">' + (o === 'win' ? '+' : '-') + sum.stake + ' 💎</div>' : '') +
      '<div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:8px;">Record: ' + state.duelRecord.w + 'W · ' + state.duelRecord.l + 'L · ' + state.duelRecord.t + 'T</div>' +
      '<button class="key-btn submit-btn" style="width:100%; height:56px; font-size:1.3rem;" onclick="rdRematch(&quot;' + sum.id + '&quot;)">🔁 Rematch</button>' +
      '<button class="key-btn" style="width:100%; height:38px; margin-top:6px;" onclick="rdCloseModal()">Done</button>';
  } else {
    h = '<p>This challenge was declined.</p><button class="key-btn submit-btn" style="width:100%; height:44px;" onclick="rdCloseModal()">Back</button>';
  }
  document.getElementById('rd-box').innerHTML = h;
}
function rdWaitStart(id) {
  clearInterval(rd.waitTimer);
  let tries = 0;
  rd.waitTimer = setInterval(async function () {
    tries += 1;
    if (tries > 60 || document.getElementById('rd-modal').style.display !== 'flex' || !rd.cur || rd.cur.id !== id) { clearInterval(rd.waitTimer); return; }
    try {
      const r = await api('/api/duel/get?id=' + encodeURIComponent(id));
      if (r.status === 200 && r.data.summary.status === 'done') { clearInterval(rd.waitTimer); rdShowResult(r.data.summary); }
    } catch (e) {}
  }, 3000);
}
function rdCloseModal() {
  clearInterval(rd.waitTimer);
  document.getElementById('rd-modal').style.display = 'none';
  hubTab = 'duel'; duelMode = 'online';
  document.getElementById('hub-modal').style.display = 'flex';
  renderHub();
}

// ----- notifications: cheap poll of one key -----
function rdOpenFromChip() {
  document.getElementById('duel-chip').style.display = 'none';
  hubTab = 'duel'; duelMode = 'online';
  openHub();
}
async function rdTick() {
  if (!rdReady() || document.hidden) return;
  const hubOpen = document.getElementById('hub-modal').style.display === 'flex' && hubTab === 'duel' && duelMode === 'online';
  const modalOpen = document.getElementById('rd-modal').style.display === 'flex';
  const idle = Date.now() - rd.lastActive > 300000;   // nobody touched the screen for 5 minutes: ease off
  const gap = (hubOpen || modalOpen) ? 2800 : (idle ? 60000 : 19000);
  if (Date.now() - rd.tickAt < gap) return;
  rd.tickAt = Date.now();
  let r;
  try { r = await api('/api/duel/ping'); } catch (e) { return; }
  const pg = r.status === 200 ? r.data.ping : null;
  if (!pg || pg.t <= rd.seen) return;
  rd.seen = pg.t;
  try { localStorage.setItem('mq_duel_seen', String(pg.t)); } catch (e) {}
  const who = escHtml(pg.from || 'A friend');
  if (pg.k === 'invite') {
    soundSecretFound();
    const chip = document.getElementById('duel-chip');
    chip.innerHTML = '⚔️ ' + who + ' challenged you! Tap to play';
    chip.style.display = 'block';
  } else if (pg.k === 'result') {
    toast('✅ ' + (pg.from || 'Your friend') + ' finished your duel!');
  } else if (pg.k === 'declined') {
    toast((pg.from || 'Your friend') + ' declined the duel');
  }
  if (hubOpen || pg.k === 'result') rdRefresh();
}
rd.tickAt = 0;
rd.lastActive = Date.now();
document.addEventListener('pointerdown', function () { rd.lastActive = Date.now(); }, { passive: true });
setInterval(rdTick, 3000);
