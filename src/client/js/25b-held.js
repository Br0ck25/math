// =====================================================================
//  HELD ITEMS  (the "Hold" tab of the buddy hub): Gold's held items. A buddy holds one, and it works in Adventure battles (24x-ow-battle.js).
//  Berry heals when HP is half or less and is used up; Leftovers heal a little every round; Quick Claw sometimes moves first; Scope Lens raises the
//  critical hit chance; Type Charm makes the holder's own type hit 10% harder.
// =====================================================================
const HELD_ITEMS = [
  { id: 'berry',     icon: '🫐', name: 'Berry',      text: 'Heals ' + ECON.held.berryHeal + ' HP when health drops to half or less. Used up.' },
  { id: 'leftovers', icon: '🍙', name: 'Leftovers',  text: 'Heals 1/16 of its HP every round of a battle' },
  { id: 'claw',      icon: '🪝', name: 'Quick Claw', text: 'Sometimes moves first in a round' },
  { id: 'lens',      icon: '🔍', name: 'Scope Lens', text: 'Critical hits happen more often' },
  { id: 'charm',     icon: '🔮', name: 'Type Charm', text: 'Moves of its own type do 10% more damage' }
];
function heldIdOf(buddyId) { return state.held[buddyId] || ''; }
function holds(buddyId, item) { return heldIdOf(buddyId) === item; }
function buyHeld(id, confirmed) {
  if (state.heldOwned.indexOf(id) !== -1) return;
  const cost = ECON.held.cost[id];
  if (state.gems < cost) { soundWrong(); toast('You need ' + (cost - state.gems) + ' more 💎'); return; }
  if (!confirmed) {
    const it = HELD_ITEMS.find(function (x) { return x.id === id; });
    askBuy({ icon: it.icon, name: it.name, cost: cost, note: it.text }, function () { buyHeld(id, true); });
    return;
  }
  state.gems -= cost;
  state.heldOwned.push(id);
  soundCoinChirp();
  saveState();
  updateStatsUI();
  renderHub();
}
// Giving an item to a buddy takes it from whoever held it before. Tapping the held item takes it back.
function giveHeld(id) {
  if (state.heldOwned.indexOf(id) === -1) return;
  const was = heldIdOf(hubPet) === id;
  Object.keys(state.held).forEach(function (b) { if (state.held[b] === id) delete state.held[b]; });
  if (!was) state.held[hubPet] = id;
  soundClick();
  saveState();
  renderHub();
}

function renderHoldTab() {
  const mine = heldIdOf(hubPet);
  let h = '<div style="font-size:0.78rem; font-weight:800; margin:6px 0 2px;">🎒 Held item (one per buddy)</div>';
  HELD_ITEMS.forEach(function (it) {
    const owned = state.heldOwned.indexOf(it.id) !== -1;
    const holder = Object.keys(state.held).find(function (b) { return state.held[b] === it.id; });
    const d = it.text + (holder && holder !== hubPet ? ' · held by ' + escHtml(getPetById(holder).baseName) : '');
    const btn = !owned
      ? '<button class="claim-btn" onclick="buyHeld(&quot;' + it.id + '&quot;)">' + ECON.held.cost[it.id] + ' 💎</button>'
      : '<button class="claim-btn" onclick="giveHeld(&quot;' + it.id + '&quot;)">' + (mine === it.id ? 'Take back' : 'Give') + '</button>';
    h += '<div class="care-row"><div><div class="t">' + it.icon + ' ' + it.name + (mine === it.id ? ' ✅' : '') + '</div><div class="d">' + d + '</div></div>' + btn + '</div>';
  });
  const spareMine = spareCount(hubPet), all = Object.keys(state.spares).reduce(function (a, k) { return a + state.spares[k]; }, 0);
  const row = function (title, desc, btn) { return '<div class="care-row"><div><div class="t">' + title + '</div><div class="d">' + desc + '</div></div>' + btn + '</div>'; };
  const sell = function (label, fn) { return '<button class="claim-btn" onclick="' + fn + '">' + label + '</button>'; };
  if (spareMine) h += row('🎒 Spare ' + name0(hubPet) + ' x' + spareMine, 'Extra copies from wild battles. Your buddy stays safe!', sell('Sell +' + spareValueOf(hubPet) + ' 💎', 'sellSpare(&quot;' + hubPet + '&quot;)'));
  if (all > spareMine) h += row('🎒 All spares (' + all + ')', 'Sell every extra copy at once.', sell('Sell all', 'sellAllSpares()'));
  h += '<div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px;">You have 💎 ' + state.gems + '</div>';
  document.getElementById('hub-body').innerHTML = h;
}
