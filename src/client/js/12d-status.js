// =====================================================================
//  STATUS EFFECTS: a foe's hit can leave your buddy burned, frozen or weakened for a few problems.
//  They change how answers are scored (mistakes, speed, damage), never whether an answer is right. Not saved: they end with the battle.
// =====================================================================
const STATUSES = {
  burn:   { icon: '🔥', name: 'Burned',   text: 'Wrong answers cost 1 extra HP' },
  frozen: { icon: '❄️', name: 'Frozen',   text: 'Answer quickly or your hit is only half as strong' },
  weak:   { icon: '💢', name: 'Weakened', text: 'Your hits do 1 less damage' }
};
const ELEMENT_STATUS = { fire: 'burn', electric: 'burn', water: 'frozen', magic: 'frozen', nature: 'weak', dark: 'weak', shadow: 'weak' };
let buddyStatus = { kind: '', left: 0 };

function clearBuddyStatus() { buddyStatus = { kind: '', left: 0 }; renderStatus(); }
function resetBattleEffects() {
  guardUp = false;
  heldUsed = {};
  if (typeof battleHintUsed !== 'undefined') battleHintUsed = false;
  clearBuddyStatus();
  if (typeof hasTech === 'function' && hasTech('energize')) ultimateCharge = Math.max(ultimateCharge, 1);
}
function hasStatus(kind) { return buddyStatus.kind === kind && buddyStatus.left > 0; }

// Called when a foe's hit lands (and the buddy is still standing).
function maybeInflictStatus(foe) {
  const chance = foe.wild ? ECON.status.wildChance : ECON.status.bossChance;
  const kind = ELEMENT_STATUS[foe.element];
  if (!kind || buddyStatus.left > 0 || Math.random() >= chance) return;
  buddyStatus = { kind: kind, left: ECON.status.problems };
  const s = STATUSES[kind];
  showPopup(s.icon + ' ' + s.name.toUpperCase() + '!');
  toast(s.icon + ' ' + getActivePetDisplay().baseName + ' is ' + s.name.toLowerCase() + ': ' + s.text.toLowerCase() + '. Recover cures it!');
  renderStatus();
}
// One problem has been answered.
function tickStatus() {
  if (buddyStatus.left <= 0) return;
  buddyStatus.left -= 1;
  if (buddyStatus.left <= 0) { toast('✨ ' + getActivePetDisplay().baseName + ' feels better!'); buddyStatus.kind = ''; }
  renderStatus();
}
function renderStatus() {
  const el = document.getElementById('pet-status');
  if (!el) return;
  const on = buddyStatus.left > 0;
  el.style.display = on ? '' : 'none';
  if (!on) { el.innerText = ''; el.removeAttribute('title'); return; }
  const s = STATUSES[buddyStatus.kind];
  el.innerText = s.icon + buddyStatus.left;
  el.title = s.name + ': ' + s.text + ' (' + buddyStatus.left + ' more problems)';
  el.setAttribute('aria-label', el.title);
}
