// =====================================================================
//  ITEMS
// =====================================================================
// ~ the gems it would take to earn that level by solving; never below 50
function getCandyCost() {
  const lvl = getBuddyLevel(state.activePet);
  if (lvl >= MAX_LEVEL) return 0;
  return Math.max(50, Math.round((xpForLevel(lvl + 1) - getBuddyXp(state.activePet)) / 6));
}

// Price of a shop item right now (the candy depends on the active buddy; everything else is in ECON).
function itemCost(type) { return type === 'candy' ? getCandyCost() : ECON.items[type]; }
const ITEM_LOOKS = {
  shield: ['🛡️', 'Streak Shield', 'Blocks 1 mistake'],
  candy: ['🍬', 'Rare Candy', 'Your buddy levels up right now'],
  potion: ['💖', 'Super Potion', 'Fully restores buddy HP & revives fainted'],
  clover: ['🍀', 'Lucky Clover', 'Lucky for the next 8 solves'],
  net: ['🕸️', 'Catch Net', 'Helps you catch a buddy after a win'],
  whistle: ['🔔', 'Boss Whistle', 'Summons the next big Boss immediately!'],
  ult: ['⚡', 'Ult Battery', 'Fully charges your energy']
};
const ITEM_VERBS = { shield: 'Buy', candy: 'Eat', potion: 'Drink', clover: 'Use', net: 'Buy', whistle: 'Blow', ult: 'Charge' };
// Labels the item buttons: the price when affordable, otherwise how many more gems are needed (dimmed, but a tap still explains).
function renderItemButtons() {
  const nc = document.getElementById('net-count');
  if (nc) nc.innerText = state.nets;
  Object.keys(ITEM_VERBS).forEach(function (type) {
    const b = document.getElementById('item-' + type);
    if (!b) return;
    const cost = itemCost(type);
    const short = cost - state.gems;
    const pet = state.activePet;
    const maxed = (type === 'candy' && cost === 0) ||
                  (type === 'potion' && getPetHp(pet) >= getPetMaxHp(pet) && (!state.faintedPets || state.faintedPets.length === 0));
    b.innerText = (type === 'candy' && maxed) ? 'Max level ⭐' :
                  (type === 'potion' && maxed) ? 'Full HP 💖' :
                  short > 0 ? 'Need ' + short + ' more 💎' : cost + ' 💎 ' + ITEM_VERBS[type];
    b.title = maxed ? '' : 'Costs ' + cost + ' gems';
    b.classList.toggle('cant-afford', maxed || short > 0);
    b.setAttribute('aria-disabled', maxed || short > 0 ? 'true' : 'false');
  });
}

function maxNets() {
  return (typeof hasTech === 'function' && hasTech('net_crafter')) ? 15 : ECON.wild.net.stock;
}

function buyItem(type) {
  const cost = itemCost(type);
  if (state.gems < cost) {
    soundWrong();
    toast(`You need ${cost - state.gems} more 💎 Gems!`);
    return;
  }
  if (type === 'candy' && getBuddyLevel(state.activePet) >= MAX_LEVEL) { toast('Your buddy is already max level!'); return; }
  if (type === 'net' && state.nets >= maxNets()) { toast('You can hold ' + maxNets() + ' Catch Nets'); return; }
  if (type === 'potion') {
    if (potionUseless()) {
      toast('Your buddies are already at full HP!');
      return;
    }
  }
  if (type === 'whistle') {
    const bi = typeof getBossInfo === 'function' ? getBossInfo() : null;
    if (bi && !bi.wild && !bi.trainer) {
      toast('A Boss is already here!');
      return;
    }
  }
  const look = ITEM_LOOKS[type];
  askBuy({ icon: look[0], name: look[1], cost: cost, note: look[2] }, function () { payItem(type); });
}
// A Super Potion does nothing when your buddy is at full HP and nobody has fainted.
function potionUseless() {
  const pet = state.activePet;
  return getPetHp(pet) >= getPetMaxHp(pet) && (!state.faintedPets || state.faintedPets.length === 0);
}
function applyPotion() {
  const pet = state.activePet;
  setPetHp(pet, getPetMaxHp(pet));
  state.faintedPets = [];
  partyHp = {};
  showPopup('💖 SUPER POTION! FULL HP!');
}
// After "Buy": check again (the situation may have changed), then pay and apply the item.
function payItem(type) {
  const cost = itemCost(type);
  if (state.gems < cost || (type === 'candy' && getBuddyLevel(state.activePet) >= MAX_LEVEL) || (type === 'net' && state.nets >= maxNets())) return;
  if (type === 'potion') {
    if (potionUseless()) return;
  }
  if (type === 'candy') {
    const lvl = getBuddyLevel(state.activePet);
    state.gems -= cost;
    soundLevelUp();
    awardBuddyXp(xpForLevel(lvl + 1) - getBuddyXp(state.activePet));
    showPopup('🍬 RARE CANDY! LEVEL UP!');
  } else {
    state.gems -= cost;
    soundLevelUp();
    if (type === 'net') {
      state.nets += 1;
      showPopup('🕸️ CATCH NET! (' + state.nets + ')');
    } else if (type === 'shield') {
      state.shields += 1;
      showPopup('+1 STREAK SHIELD! 🛡️');
    } else if (type === 'ult') {
      ultimateCharge = 3;
      showPopup('ULTIMATE CHARGED! ⚡');
    } else if (type === 'clover') {
      state.cloverLeft = (state.cloverLeft || 0) + 8;
      showPopup('LUCKY CLOVER (8 SOLVES)! 🍀');
    } else if (type === 'potion') {
      applyPotion();
    } else if (type === 'whistle') {
      state.wild.since = state.wild.next;
      pickNextBoss();
      setBossTaunt();
      resetBattleEffects();
      updateBattleUI();
      soundSuperMove();
      showPopup('🔔 BOSS SUMMONED!');
    }
  }
  saveState();
  updateStatsUI();
  renderItemButtons();
  if (typeof refreshMart === 'function') refreshMart();
}
