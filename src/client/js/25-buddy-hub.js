// =====================================================================
//  BUDDY HUB: held items and duels
// =====================================================================
const ELEM_COLORS = { fire: '#ef4444', water: '#38bdf8', nature: '#22c55e', electric: '#facc15', dark: '#8b5cf6', magic: '#ec4899', shadow: '#a855f7' };

function addXpTo(id, amt) {
  state.buddyXp[id] = Math.min(xpForLevel(MAX_LEVEL), getBuddyXp(id) + amt);
}
// A buddy with no battle HP left is resting (it wakes at a Buddy Center).
function isSleepy(id) { return state.advHp[id] === 0; }

// ----- hub shell -----
let hubPet = 'dog';
let hubTab = 'hold';
function openHub() { showModal('hub-modal', function () { state.seen.hub = true; hubPet = getOwnedIds().indexOf(state.activePet) !== -1 ? state.activePet : 'dog'; renderHub(); }); }
function closeHub() { hideModal('hub-modal', function () { saveState(); updateStatsUI(); }); }
// ‹ › in the hub header: previous / next buddy you own
function hubStep(dir) {
  const ids = getOwnedIds();
  hubPet = ids[(ids.indexOf(hubPet) + dir + ids.length) % ids.length];
  soundClick();
  renderHub();
}
function setHubTab(t) {
  soundClick();
  hubTab = t;
  renderHub();
}
function name0(id) { return getPetById(id).baseName; }
function renderHub() {
  const d = getPetById(hubPet);
  const sleepy = isSleepy(hubPet);
  const ic = document.getElementById('hub-icon');
  ic.className = 'hub-icon' + (sleepy ? ' sleepy' : '');
  const gear = hubPet === state.activePet ? activeGear() : { acc: null, armor: null };
  ic.innerHTML = avatarHtml(d, 56, gearMarkup(gear.acc, gear.armor)) + (sleepy ? '<span style="font-size:1.2rem;">💤</span>' : '');
  document.getElementById('hub-name').innerText = d.name;
  document.getElementById('hub-sub').innerText = 'Lv ' + d.level + ' · ' + d.element + (sleepy ? ' · resting, a Buddy Center wakes it up' : '');
  document.getElementById('hub-hint').innerText = '';
  const tb = document.getElementById('hub-tabs');
  tb.innerHTML = '';
  [['hold', '🎒 Hold'], ['duel', '⚔️ Duel']].forEach(function (t) {
    const b = document.createElement('button');
    b.className = 'grade-btn' + (hubTab === t[0] ? ' active' : '');
    b.innerText = t[1];
    b.onclick = function () { setHubTab(t[0]); };
    tb.appendChild(b);
  });
  if (hubTab === 'duel') renderDuelTab();
  else renderHoldTab();
}
