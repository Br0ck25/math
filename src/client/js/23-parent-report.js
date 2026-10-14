// =====================================================================
//  PARENT REPORT
// =====================================================================
function sumDays(keys) {
  const t = { solved: 0, attempts: 0, ms: 0, hints: 0, played: 0, weak: 0, byOp: {} };
  keys.forEach(function (k) {
    const d = state.stats.days[k];
    if (!d) return;
    t.played += d.a > 0 ? 1 : 0;
    t.solved += d.s; t.attempts += d.a; t.ms += d.ms; t.hints += d.h; t.weak += d.w || 0;
    Object.keys(d.ops).forEach(function (op) {
      const o = t.byOp[op] || (t.byOp[op] = [0, 0]);
      o[0] += d.ops[op][0]; o[1] += d.ops[op][1];
    });
  });
  t.acc = t.attempts ? Math.round((t.solved / t.attempts) * 100) : 0;
  return t;
}
function deltaText(now, before, unit) {
  const d = now - before;
  return (d > 0 ? '▲ +' : (d < 0 ? '▼ ' : '＝ ')) + (d === 0 ? 'same' : d + unit);
}
let parentUnlocked = false;
// Parent switches. (setDuelsOnline was lost in an earlier rewrite; tests/parent-switches covers both now.)
function setDuelsOnline(on) { state.duelsOnline = !!on; saveState(); toast(on ? 'Online duels on' : 'Online duels off'); }
function setAdaptive(on) { state.adapt.on = !!on; saveState(); toast(on ? 'Adaptive practice on' : 'Adaptive practice off'); renderParent(); }
function parentLocked() { return !!state.parentPinHash && !parentUnlocked; }
// 4-digit PIN stored only as a SHA-256 hash (a light lock against little fingers, not real security).
async function hashPin(pin) {
  const data = new TextEncoder().encode('mq-pin:' + pin);
  if (!(window.crypto && crypto.subtle)) {
    let h = 5381;
    for (let i = 0; i < data.length; i++) h = ((h * 33) ^ data[i]) >>> 0;
    return ('00000000' + h.toString(16)).slice(-8).repeat(8);   // fallback for non-secure contexts
  }
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  return Array.from(d).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}
// Older saves kept the PIN as plain text. Convert it once at startup.
async function migratePin() {
  if (/^[0-9]{4}$/.test(state.parentPin || '')) {
    state.parentPinHash = await hashPin(state.parentPin);
    delete state.parentPin;
    saveState();
  }
}
async function parentUnlock() {
  const input = document.getElementById('par-pin-in');
  if ((await hashPin(input.value)) === state.parentPinHash) { parentUnlocked = true; input.value = ''; renderParent(); }
  else { document.getElementById('par-lock-msg').innerText = 'That PIN is not right.'; input.value = ''; soundWrong(); }
}
async function parentSetPin() {
  const v = document.getElementById('par-pin-new').value;
  if (!/^[0-9]{4}$/.test(v)) { toast('PIN must be 4 digits'); return; }
  state.parentPinHash = await hashPin(v);
  parentUnlocked = true;
  document.getElementById('par-pin-new').value = '';
  saveState();
  toast('🔒 PIN set');
  renderParent();
}
function parentClearPin() {
  state.parentPinHash = '';
  saveState();
  toast('PIN removed');
  renderParent();
}
function parentSummary() {
  const w = sumDays(lastDayKeys(7));
  let t = 'Math Quest weekly summary: solved ' + w.solved + ' problems at ' + w.acc + '% accuracy in ' + Math.round(w.ms / 60000) + ' minutes over ' + w.played + ' day(s).';
  const weak = Object.keys(w.byOp).filter(function (id) { return OP_BY_ID[id] && w.byOp[id][0] >= 5 && w.byOp[id][1] / w.byOp[id][0] < 0.7; });
  t += weak.length ? ' Needs practice: ' + weak.map(function (id) { return OP_BY_ID[id].label; }).join(', ') + '.' : ' No weak spots this week!';
  return t;
}
function parentShare() {
  const text = parentSummary();
  if (navigator.share) navigator.share({ title: 'Math Quest summary', text: text }).catch(function () {});
  else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('📋 Summary copied'); }, function () { toast(text); });
  else toast(text);
}

function renderParent() {
  const locked = parentLocked();
  document.getElementById('par-lock').style.display = locked ? 'block' : 'none';
  document.getElementById('par-content').style.display = locked ? 'none' : 'block';
  if (locked) { document.getElementById('par-lock-msg').innerText = ''; return; }
  document.getElementById('par-duels').checked = !!state.duelsOnline;
  document.getElementById('par-adaptive').checked = state.adapt.on;
  const lv = getActiveOps().filter(function (op) { return state.adapt.on ? true : false; }).map(function (op) {
    const t = opTier(op), acc = recentAccuracy(op);
    const col = t > 0 ? '#fde047' : (t < 0 ? '#86efac' : 'var(--text-muted)');
    return '<div class="par-row"><span class="lbl">' + OP_BY_ID[op].icon + ' ' + OP_BY_ID[op].label + '</span><span style="color:' + col + '; font-weight:800;">' + TIER_NAMES[t] + '</span><span class="pct">' + (acc === null ? 'new' : Math.round(acc * 100) + '% lately') + '</span></div>';
  });
  document.getElementById('par-levels').innerHTML = state.adapt.on ? lv.join('') : '<span style="color:var(--text-muted);">Off: every type uses the chosen grade.</span>';
  document.getElementById('par-pin-note').innerText = state.parentPinHash ? 'PIN is on. You will be asked each time the app is reopened.' : 'Optional: stop little fingers from changing goals.';
  document.getElementById('par-pin-clear').style.display = state.parentPinHash ? 'inline-block' : 'none';
  const keys = lastDayKeys(7);
  const days = state.stats.days;
  const wk = sumDays(keys), pv = sumDays(lastDayKeys(7, 7));
  const solved = wk.solved, attempts = wk.attempts, ms = wk.ms, hints = wk.hints, played = wk.played, acc = wk.acc, byOp = wk.byOp;
  const tile = function (v, l) { return '<div class="par-tile"><b>' + v + '</b><span>' + l + '</span></div>'; };
  document.getElementById('par-tiles').innerHTML =
    tile(solved, 'Solved') + tile(attempts ? acc + '%' : '--', 'Accuracy') + tile(Math.round(ms / 60000) + 'm', 'Time played') +
    tile(played + '/7', 'Days played') + tile(hints, 'Hints used') + tile(state.streakCal.count, 'Streak day') +
    tile(wk.weak, 'Weak-point hits') + tile(state.raidsCleared, 'Raids cleared') + tile(state.tour.trophies, 'Trophies');
  document.getElementById('par-compare').innerText = pv.attempts
    ? 'vs last week: solved ' + deltaText(solved, pv.solved, '') + ' · accuracy ' + deltaText(acc, pv.acc, '%')
    : '';

  const maxMs = Math.max(60000, Math.max.apply(null, keys.map(function (k) { return days[k] ? days[k].ms : 0; })));
  const names = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  document.getElementById('par-days').innerHTML = keys.map(function (k) {
    const m = days[k] ? days[k].ms : 0;
    const dt = new Date(k + 'T12:00:00');
    return '<div class="par-day">' + (m ? Math.round(m / 60000) : '') + '<i style="height:' + Math.round((m / maxMs) * 52) + 'px"></i>' + names[dt.getDay()] + '</div>';
  }).join('');

  const ids = Object.keys(byOp).filter(function (id) { return OP_BY_ID[id]; }).sort(function (a, b) { return byOp[b][0] - byOp[a][0]; });
  document.getElementById('par-types').innerHTML = ids.length ? ids.map(function (id) {
    const a = byOp[id][0], c = byOp[id][1];
    const pct = Math.round((c / a) * 100);
    const col = pct >= 85 ? '#10b981' : (pct >= 65 ? '#f59e0b' : '#ef4444');
    return '<div class="par-row"><span class="lbl">' + OP_BY_ID[id].icon + ' ' + OP_BY_ID[id].label + '</span><span class="bar"><i style="width:' + pct + '%; background:' + col + '"></i></span><span class="pct">' + pct + '% (' + a + ')</span></div>';
  }).join('') : '<div style="font-size:0.78rem; color:var(--text-muted);">No practice recorded yet this week.</div>';

  const weak = ids.filter(function (id) { return byOp[id][0] >= 5 && byOp[id][1] / byOp[id][0] < 0.7; });
  document.getElementById('par-weak').innerHTML = weak.length
    ? weak.map(function (id) { return '⚠️ ' + OP_BY_ID[id].icon + ' ' + OP_BY_ID[id].label + ' — worth some extra practice'; }).join('<br>')
    : (ids.length ? '✅ No weak spots this week. Great work!' : '<span style="color:var(--text-muted);">Needs at least 5 tries of a type to show.</span>');

  const g = state.parentGoal;
  const sel = document.getElementById('par-minutes');
  if (!sel.options.length) [10, 15, 20, 30, 45, 60].forEach(function (m) { sel.add(new Option(m + ' minutes', m)); });
  sel.value = String(g.minutes);
  if (sel.value !== String(g.minutes)) { sel.add(new Option(g.minutes + ' minutes', g.minutes)); sel.value = String(g.minutes); }
  document.getElementById('par-reward').value = g.reward;
  const mins = minutesToday();
  document.getElementById('par-goal-fill').style.width = Math.min(100, Math.round((mins / g.minutes) * 100)) + '%';
  document.getElementById('par-goal-text').innerText = mins >= g.minutes
    ? '🎉 Goal reached today!' + (g.reward ? ' Time for: ' + g.reward : '')
    : Math.floor(mins) + ' of ' + g.minutes + ' minutes today' + (g.reward ? ' — reward: ' + g.reward : '');
}
function setParentGoal() {
  const g = state.parentGoal;
  g.minutes = clamp(parseInt(document.getElementById('par-minutes').value, 10) || 20, 5, 240);
  g.reward = document.getElementById('par-reward').value.slice(0, 60);
  g.notified = minutesToday() >= g.minutes ? dayKey() : '';
  saveState();
  renderParent();
}
function openParent() { showModal('parent-modal', function () { parentUnlocked = false; renderParent(); }); }
function closeParent() { hideModal('parent-modal'); }
