// =====================================================================
//  ITEMS
// =====================================================================
// ~ the gems it would take to earn that level by solving; never below 20
function getCandyCost() {
  const lvl = getBuddyLevel(state.activePet);
  if (lvl >= MAX_LEVEL) return 0;
  return Math.max(20, Math.round((xpForLevel(lvl + 1) - getBuddyXp(state.activePet)) / 6));
}

// Price of a shop item right now (the candy depends on the active buddy; everything else is in ECON).
function itemCost(type) { return type === 'candy' ? getCandyCost() : ECON.items[type]; }
const ITEM_VERBS = { shield: 'Buy', candy: 'Eat', ult: 'Charge', clover: 'Use', net: 'Buy' };
// Labels the four item buttons: the price when affordable, otherwise how many more gems are needed (dimmed, but a tap still explains).
function renderItemButtons() {
  const nc = document.getElementById('net-count');
  if (nc) nc.innerText = state.nets;
  Object.keys(ITEM_VERBS).forEach(function (type) {
    const b = document.getElementById('item-' + type);
    if (!b) return;
    const cost = itemCost(type);
    const short = cost - state.gems;
    const maxed = type === 'candy' && cost === 0;
    b.innerText = maxed ? 'Max level ⭐' : short > 0 ? 'Need ' + short + ' more 💎' : cost + ' 💎 ' + ITEM_VERBS[type];
    b.title = maxed ? '' : 'Costs ' + cost + ' gems';
    b.classList.toggle('cant-afford', maxed || short > 0);
    b.setAttribute('aria-disabled', maxed || short > 0 ? 'true' : 'false');
  });
}

function buyItem(type) {
  const cost = itemCost(type);
  if (state.gems < cost) {
    soundWrong();
    toast(`You need ${cost - state.gems} more 💎 Gems!`);
    return;
  }
  if (type === 'candy') {
    const lvl = getBuddyLevel(state.activePet);
    if (lvl >= MAX_LEVEL) { toast('Your buddy is already max level!'); return; }
    state.gems -= cost;
    soundLevelUp();
    awardBuddyXp(xpForLevel(lvl + 1) - getBuddyXp(state.activePet));
    showPopup('🍬 RARE CANDY! LEVEL UP!');
  } else {
    if (type === 'net' && state.nets >= ECON.wild.net.stock) { toast('You can hold ' + ECON.wild.net.stock + ' Catch Nets'); return; }
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
    }
  }
  saveState();
  updateStatsUI();
}
