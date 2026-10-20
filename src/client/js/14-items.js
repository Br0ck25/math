// =====================================================================
//  ITEMS the Mart and the Shop sell: Potions and Catch Nets for battles, and Rare Candy. Prices are in ECON.items; the Mart (24l-ow-shops.js) opens more with badges.
// =====================================================================
// ~ the gems it would take to earn that level; never below 50
function getCandyCost() {
  const lvl = getBuddyLevel(state.activePet);
  if (lvl >= MAX_LEVEL) return 0;
  return Math.max(50, Math.round((xpForLevel(lvl + 1) - getBuddyXp(state.activePet)) / 6));
}

// Price of a shop item right now (the candy depends on the active buddy; everything else is in ECON).
function itemCost(type) { return type === 'candy' ? getCandyCost() : ECON.items[type]; }
const ITEM_LOOKS = {
  candy: ['🍬', 'Rare Candy', 'Your buddy levels up right now'],
  potion: ['💖', 'Potion', 'Heals ' + ECON.overworld.potionHeal + ' HP in a battle and cures a status'],
  net: ['🕸️', 'Catch Net', 'Throw it at a wild buddy to catch it']
};

// Labels the item buttons in the Shop: the price when affordable, otherwise how many more gems are needed (a tap still explains).
function renderItemButtons() {
  document.getElementById('net-count').innerText = state.nets;
  document.getElementById('potion-count').innerText = state.potions;
  Object.keys(ITEM_LOOKS).forEach(function (type) {
    const b = document.getElementById('item-' + type);
    if (!b) return;
    const cost = itemCost(type), short = cost - state.gems, maxed = type === 'candy' && cost === 0;
    b.innerText = maxed ? 'Max level' : short > 0 ? 'Need ' + short + ' more 💎' : cost + ' 💎';
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
    toast(`You need ${cost - state.gems} more gems!`);
    return;
  }
  if (type === 'candy' && getBuddyLevel(state.activePet) >= MAX_LEVEL) { toast('Your buddy is already max level!'); return; }
  if (type === 'net' && state.nets >= maxNets()) { toast('You can hold ' + maxNets() + ' Catch Nets'); return; }
  const look = ITEM_LOOKS[type];
  askBuy({ icon: look[0], name: look[1], cost: cost, note: look[2] }, function () { payItem(type); });
}
// After "Buy": check again (the situation may have changed), then pay and give the item.
function payItem(type) {
  const cost = itemCost(type);
  if (state.gems < cost || (type === 'candy' && getBuddyLevel(state.activePet) >= MAX_LEVEL) || (type === 'net' && state.nets >= maxNets())) return;
  state.gems -= cost;
  soundLevelUp();
  if (type === 'candy') {
    const lvl = getBuddyLevel(state.activePet);
    awardBuddyXp(xpForLevel(lvl + 1) - getBuddyXp(state.activePet));
    showPopup('Rare Candy! Level up!');
  } else if (type === 'net') {
    state.nets += 1;
    showPopup('Catch Net! (' + state.nets + ')');
  } else if (type === 'potion') {
    state.potions = Math.min(99, state.potions + 1);
    showPopup('Potion! (' + state.potions + ')');
  }
  saveState();
  updateStatsUI();
  renderItemButtons();
  if (typeof refreshMart === 'function') refreshMart();
}
