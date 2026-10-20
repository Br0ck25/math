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
let hubTab = 'stats';
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
  ic.innerHTML = avatarHtml(d, 56) + (sleepy ? '<span style="font-size:1.2rem;">💤</span>' : '');
  document.getElementById('hub-name').innerText = d.name;
  document.getElementById('hub-sub').innerText = 'Lv ' + d.level + ' · ' + d.element + (sleepy ? ' · resting, a Buddy Center wakes it up' : '');
  document.getElementById('hub-hint').innerText = '';
  const tb = document.getElementById('hub-tabs');
  tb.innerHTML = '';
  [['stats', '📋 Stats'], ['hold', '🎒 Hold'], ['duel', '⚔️ Duel']].forEach(function (t) {
    const b = document.createElement('button');
    b.className = 'grade-btn' + (hubTab === t[0] ? ' active' : '');
    b.innerText = t[1];
    b.onclick = function () { setHubTab(t[0]); };
    tb.appendChild(b);
  });
  if (hubTab === 'duel') renderDuelTab();
  else if (hubTab === 'hold') renderHoldTab();
  else renderStatsTab();
}

// Gold's summary page: type, level, experience, the five stats (each species has its own build) and the moves with their PP.
function renderStatsTab() {
  const m = abPartyMon(hubPet), sp = getSpecies(hubPet), lv = m.level, xp = getBuddyXp(hubPet);
  const stat = function (label, v) { return '<div class="care-row"><div class="t">' + label + '</div><div class="t">' + v + '</div></div>'; };
  const moves = m.moves.map(function (mv) { return '<div class="care-row"><div><div class="t">' + escHtml(mv.name) + '</div><div class="d">' + escHtml(mv.type.toUpperCase()) + ' · power ' + mv.power + ' · ' + mv.acc + '% accuracy</div></div><div class="d">PP ' + mv.left + '/' + mv.pp + '</div></div>'; }).join('');
  const held = heldIdOf(hubPet), item = HELD_ITEMS.find(function (i) { return i.id === held; });
  document.getElementById('hub-body').innerHTML =
    stat('Type', escHtml(m.type.toUpperCase())) + stat('Level', lv + (lv < MAX_LEVEL ? ' (' + (xpForLevel(lv + 1) - xp) + ' XP to next)' : ' (max)')) +
    stat('HP', m.hp + ' / ' + m.max) + stat('Attack', m.atk) + stat('Defense', m.def) + stat('Speed', m.spd) + stat('Special', m.spc) +
    stat('Held item', item ? escHtml(item.name) : 'none') + '<div style="font-size:0.78rem; font-weight:800; margin:8px 0 2px;">Moves</div>' + moves;
}
