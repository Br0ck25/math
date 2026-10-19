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
// The same three effects can land on the foe when your damage move hits (ELEMENT_STATUS of your buddy's element). They are mild and never save a fight on their own.
const FOE_STATUS_TEXT = { burn: 'takes 1 extra damage from your hits', frozen: 'its hits do half damage', weak: 'its hits do 1 less damage' };
let foeStatus = { kind: '', left: 0 };

function clearBuddyStatus() { buddyStatus = { kind: '', left: 0 }; renderStatus(); }
function clearFoeStatus() { foeStatus = { kind: '', left: 0 }; renderFoeStatus(); }
function resetBattleEffects() {
  guardUp = false;
  heldUsed = {};
  if (typeof battleHintUsed !== 'undefined') battleHintUsed = false;
  clearBuddyStatus();
  clearFoeStatus();
  if (typeof hasTech === 'function' && hasTech('energize')) ultimateCharge = Math.max(ultimateCharge, 1);
}
function hasStatus(kind) { return buddyStatus.kind === kind && buddyStatus.left > 0; }
function foeHasStatus(kind) { return foeStatus.kind === kind && foeStatus.left > 0; }

// Called when a foe's hit lands (and the buddy is still standing).
function maybeInflictStatus(foe) {
  const chance = foe.wild ? ECON.status.wildChance : ECON.status.bossChance;
  const kind = ELEMENT_STATUS[foe.element];
  if (!kind || buddyStatus.left > 0 || Math.random() >= chance) return;
  buddyStatus = { kind: kind, left: Math.max(1, ECON.status.problems - (activeQuirk('calm') ? ECON.quirk.calmLess : 0)) };
  const s = STATUSES[kind];
  showPopup(s.icon + ' ' + s.name.toUpperCase() + '!');
  toast(s.icon + ' ' + getActivePetDisplay().baseName + ' is ' + s.name.toLowerCase() + ': ' + s.text.toLowerCase() + '. Recover cures it!');
  renderStatus();
}
// Your damage move hit: the foe may catch your buddy's element status.
function maybeInflictFoeStatus(pet) {
  const kind = ELEMENT_STATUS[battleElement(pet)];
  if (!kind || foeStatus.left > 0 || monsterCurrentHp <= 0 || Math.random() >= ECON.status.foeChance) return;
  foeStatus = { kind: kind, left: ECON.status.problems };
  const s = STATUSES[kind];
  showPopup(s.icon + ' ' + getBossInfo().name.toUpperCase() + ' IS ' + s.name.toUpperCase() + '!');
  toast(s.icon + ' ' + getBossInfo().name + ' is ' + s.name.toLowerCase() + ': ' + FOE_STATUS_TEXT[kind] + '.');
  renderFoeStatus();
}
function renderFoeStatus() {
  const el = document.getElementById('monster-status');
  if (!el) return;
  const on = foeStatus.left > 0;
  el.style.display = on ? '' : 'none';
  if (!on) { el.innerText = ''; el.removeAttribute('title'); return; }
  const s = STATUSES[foeStatus.kind];
  el.innerText = s.icon + foeStatus.left;
  el.title = s.name + ': ' + FOE_STATUS_TEXT[foeStatus.kind] + ' (' + foeStatus.left + ' more problems)';
  el.setAttribute('aria-label', el.title);
}
// One problem has been answered.
function tickStatus() {
  if (foeStatus.left > 0) { foeStatus.left -= 1; if (foeStatus.left <= 0) foeStatus.kind = ''; renderFoeStatus(); }
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
