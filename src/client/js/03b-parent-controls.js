// =====================================================================
//  SETTINGS A PARENT SETS FROM THEIR OWN PHONE  (see 35-parent-portal.js and src/server/15-parents.js)
//  { minGrade, ops, duelsOnline }: the lowest level the player may use (so nobody can drop to easy problems to farm gems),
//  the math types they may use (null = all) and whether online duels are allowed. The server sends them with every save;
//  the last ones are kept on this device so they also hold offline. A parent can lift them from their phone, and the
//  player can end them only by signing out, which asks for the parent PIN while they are on.
// =====================================================================
const CTL_KEY = 'math_quest_controls';
let parentCtl = null;

function cleanCtl(c) {
  if (!c || typeof c !== 'object') return null;
  const g = Math.floor(Number(c.minGrade));
  const ops = Array.isArray(c.ops) ? c.ops.filter(function (id) { return typeof id === 'string'; }) : null;
  return {
    minGrade: g >= 0 && g < GRADES.length ? g : 0,
    ops: ops && ops.length ? ops : null,
    duelsOnline: c.duelsOnline !== false
  };
}
(function loadCtl() {
  try { parentCtl = cleanCtl(JSON.parse(localStorage.getItem(CTL_KEY))); } catch (e) {}
})();

function ctlFloor() { return parentCtl ? parentCtl.minGrade : 0; }
function allowedOp(id) { return !parentCtl || !parentCtl.ops || parentCtl.ops.indexOf(id) !== -1; }
function duelsLocked() { return !!parentCtl && !parentCtl.duelsOnline; }
function ctlActive() { return !!parentCtl && (parentCtl.minGrade > 0 || !!parentCtl.ops || !parentCtl.duelsOnline); }

// Stores what the server sent (null = the parent has no settings on) and puts them into force now.
function setControls(c) {
  parentCtl = cleanCtl(c);
  try { if (parentCtl) localStorage.setItem(CTL_KEY, JSON.stringify(parentCtl)); else localStorage.removeItem(CTL_KEY); } catch (e) {}
  applyControls();
}
function applyControls() {
  if (!parentCtl) return;
  let changed = false;
  if (state.grade < parentCtl.minGrade) {
    state.grade = parentCtl.minGrade;
    state.enabledOps = GRADE_DEFAULT_OPS[state.grade].slice();
    changed = true;
  }
  if (parentCtl.ops) {
    const keep = state.enabledOps.filter(allowedOp);
    if (keep.length !== state.enabledOps.length) { state.enabledOps = keep; changed = true; }
  }
  if (duelsLocked() && state.duelsOnline) { state.duelsOnline = false; changed = true; }
  if (!changed) return;
  saveState();
  updateStatsUI();
  updatePracticeRow();
  generateProblem();
}
// Shown in the settings windows so the player knows why something is locked.
function ctlNote() {
  if (!ctlActive()) return '';
  const bits = [];
  if (parentCtl.minGrade > 0) bits.push('the lowest level is ' + GRADES[parentCtl.minGrade].long);
  if (parentCtl.ops) bits.push('only some math types are allowed');
  if (duelsLocked()) bits.push('online duels are off');
  return '🔒 Set by a parent: ' + bits.join(', ') + '.';
}
