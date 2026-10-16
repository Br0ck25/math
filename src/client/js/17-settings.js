// =====================================================================
//  SETTINGS (grade level + math types)
// =====================================================================
function openSettings() { showModal('settings-modal', function () { renderAccount(); checkAcctEnabled(); renderSettings(); }); }
function closeSettings() { hideModal('settings-modal', updateStatsUI); }

// The type chart, written from TYPE_STRONG so it can never disagree with the battles: what each type beats and what beats it.
const TYPE_ICONS = { fire: '🔥', water: '💧', nature: '🌿', electric: '⚡', dark: '🌑', magic: '🔮' };
function renderTypeChart() {
  const el = document.getElementById('type-chart');
  if (!el) return;
  const names = function (list) { return list.length ? list.map(function (t) { return TYPE_ICONS[t] + ' ' + t.charAt(0).toUpperCase() + t.slice(1); }).join(', ') : '—'; };
  el.innerHTML = Object.keys(TYPE_ICONS).map(function (t) {
    const beats = TYPE_STRONG[t] || [];
    const weak = Object.keys(TYPE_STRONG).filter(function (o) { return TYPE_STRONG[o].indexOf(t) !== -1; });
    return '<div class="tc-row"><b>' + TYPE_ICONS[t] + ' ' + t.charAt(0).toUpperCase() + t.slice(1) + '</b><span>💪 strong against ' + names(beats) + '</span><span>⚠️ weak to ' + names(weak) + '</span></div>';
  }).join('') + '<div style="margin-top:6px;">🌟 Shadow deals x1.25 damage to everything<br>🛡️ Resisted hits do less damage; super-effective hits do +1 (never more than 40% of max HP)</div>';
}

function renderSettings() {
  renderTypeChart();
  document.getElementById('ctl-note').innerText = ctlNote();
  const gg = document.getElementById('grade-grid');
  gg.innerHTML = '';
  GRADES.forEach(function (g) {
    const b = document.createElement('button');
    const locked = g.id < ctlFloor();
    b.className = 'grade-btn' + (state.grade === g.id ? ' active' : '') + (locked ? ' locked' : '');
    b.innerText = g.label;
    if (locked) b.setAttribute('aria-label', g.long + ' (locked by a parent)');
    b.onclick = function () { setGrade(g.id); };
    gg.appendChild(b);
  });

  const og = document.getElementById('ops-grid');
  og.innerHTML = '';
  MATH_OPS.filter(function (o) { return o.minGrade <= state.grade && allowedOp(o.id); }).forEach(function (o) {
    const on = state.enabledOps.indexOf(o.id) !== -1;
    const b = document.createElement('button');
    b.className = 'op-toggle' + (on ? ' on' : '');
    b.innerHTML = `<span class="op-ic">${o.icon}</span><span class="op-lb">${o.label}</span><span class="op-sw">${on ? 'ON' : 'OFF'}</span>`;
    b.onclick = function () { toggleOp(o.id); };
    og.appendChild(b);
  });
}

function setGrade(g) {
  if (g < ctlFloor()) { soundWrong(); toast('🔒 A parent set the lowest level you can play.'); return; }
  soundClick();
  state.grade = g;
  state.enabledOps = GRADE_DEFAULT_OPS[g].slice();
  saveState();
  renderSettings();
  updatePracticeRow();
  generateProblem();
}

function toggleOp(id) {
  const idx = state.enabledOps.indexOf(id);
  if (idx !== -1) {
    if (getActiveOps().length <= 1 && getActiveOps()[0] === id) {
      soundWrong();
      toast('Keep at least one math type on!');
      return;
    }
    state.enabledOps.splice(idx, 1);
  } else {
    state.enabledOps.push(id);
  }
  soundClick();
  saveState();
  renderSettings();
  updatePracticeRow();
  generateProblem();
}
