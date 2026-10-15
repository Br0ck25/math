// =====================================================================
//  ROLES AND HELD ITEMS  (the "Hold" tab of the buddy hub)
//  Every element has a role with a small passive that works while that buddy fights. A buddy can also hold one item (bought with gems).
// =====================================================================
const ELEMENT_ROLES = {
  fire:     { icon: '⚔️', name: 'Attacker',  text: '+1 damage on Speed Strikes' },
  water:    { icon: '💧', name: 'Healer',    text: 'Heals 1 HP after every 4th correct answer' },
  nature:   { icon: '🛡️', name: 'Tank',      text: 'Takes 1 less damage from every hit' },
  electric: { icon: '⚡', name: 'Speedster', text: 'Speed Strikes are easier to get (25% more time)' },
  dark:     { icon: '🕵️', name: 'Trickster', text: 'Wild buddies are 25% easier to catch' },
  magic:    { icon: '✨', name: 'Support',   text: 'Every 3rd correct answer charges 1 extra energy' },
  shadow:   { icon: '🌟', name: 'Wildcard',  text: 'Deals 25% more damage (shadow power)' }
};
const HELD_ITEMS = [
  { id: 'berry', icon: '🫐', name: 'Oran Berry',  text: 'Heals ' + ECON.held.berryHeal + ' HP once per battle when health is low' },
  { id: 'shell', icon: '🐚', name: 'Hard Shell',  text: 'Blocks the first hit of every battle' },
  { id: 'charm', icon: '🔮', name: 'Type Charm',  text: '+1 damage on super-effective hits' },
  { id: 'lens',  icon: '🔍', name: 'Quick Lens',  text: 'A Speed Strike charges 1 extra energy' },
  { id: 'bait',  icon: '🍯', name: 'Sweet Bait',  text: 'Wild buddies are 25% easier to catch' }
];
let heldUsed = {};                         // once-per-battle items used so far

function roleOf(pet) { return ELEMENT_ROLES[pet.element] || ELEMENT_ROLES.magic; }
function heldIdOf(buddyId) { return state.held[buddyId] || ''; }
function holds(buddyId, item) { return heldIdOf(buddyId) === item; }
// The buddy fighting now has this role / item?
function activeRole(name) { return roleOf(getActivePetDisplay()).name === name; }
function activeHolds(item) { return holds(state.activePet, item); }

function buyHeld(id) {
  if (state.heldOwned.indexOf(id) !== -1) return;
  const cost = ECON.held.cost[id];
  if (state.gems < cost) { soundWrong(); toast('You need ' + (cost - state.gems) + ' more 💎'); return; }
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
  const pet = getPetById(hubPet), role = roleOf(pet), mine = heldIdOf(hubPet);
  let h = '<div class="care-row"><div><div class="t">' + role.icon + ' Role: ' + role.name + '</div><div class="d">' + role.text + '. Roles come from the buddy\'s type, so mix them in your team!</div></div></div>' +
    '<div style="font-size:0.78rem; font-weight:800; margin:6px 0 2px;">🎒 Held item (one per buddy)</div>';
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

// ----- effects in battle -----
function addEnergy(n) { ultimateCharge = Math.min(3, ultimateCharge + n); }
// After a correct answer (state.streak already counts it): roles and items that pay out.
function answerBonuses(isFast) {
  if (isFast && activeHolds('lens')) addEnergy(1);
  if (activeRole('Support') && state.streak % 3 === 0) addEnergy(1);
  if (activeRole('Healer') && state.streak % 4 === 0) {
    const id = state.activePet, max = getPetMaxHp(id);
    if (getPetHp(id) < max) { setPetHp(id, getPetHp(id) + 1); toast('💧 Healer: +1 HP'); }
  }
}
