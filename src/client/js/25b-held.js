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
  { id: 'focus',     icon: '🎗️', name: 'Focus Band', text: 'Sometimes (about 1 in 8) hangs on with 1 HP instead of fainting' },
  { id: 'egg',       icon: '🥚', name: 'Lucky Egg',  text: 'The holder gains half as much experience again' },
  { id: 'amulet',    icon: '🪙', name: 'Amulet Coin', text: 'Prize money is doubled when the holder is on the team in a trainer win' },
  { id: 'smoke',     icon: '💨', name: 'Smoke Ball', text: 'The holder always gets away from a wild buddy' },
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
  h += '<div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px;">You have 💎 ' + state.gems + '</div>';
  document.getElementById('hub-body').innerHTML = h;
}
