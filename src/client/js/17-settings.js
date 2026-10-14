// =====================================================================
//  SETTINGS (grade level + math types)
// =====================================================================
function openSettings() { showModal('settings-modal', function () { renderAccount(); checkAcctEnabled(); renderSettings(); }); }
function closeSettings() { hideModal('settings-modal', updateStatsUI); }

function renderSettings() {
  const gg = document.getElementById('grade-grid');
  gg.innerHTML = '';
  GRADES.forEach(function (g) {
    const b = document.createElement('button');
    b.className = 'grade-btn' + (state.grade === g.id ? ' active' : '');
    b.innerText = g.label;
    b.onclick = function () { setGrade(g.id); };
    gg.appendChild(b);
  });

  const og = document.getElementById('ops-grid');
  og.innerHTML = '';
  MATH_OPS.filter(function (o) { return o.minGrade <= state.grade; }).forEach(function (o) {
    const on = state.enabledOps.indexOf(o.id) !== -1;
    const b = document.createElement('button');
    b.className = 'op-toggle' + (on ? ' on' : '');
    b.innerHTML = `<span class="op-ic">${o.icon}</span><span class="op-lb">${o.label}</span><span class="op-sw">${on ? 'ON' : 'OFF'}</span>`;
    b.onclick = function () { toggleOp(o.id); };
    og.appendChild(b);
  });
}

function setGrade(g) {
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
