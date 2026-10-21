// =====================================================================
//  ITEMS the Mart and the Shop sell: Potions and Catch Nets for battles,. Prices are in ECON.items; the Mart (24l-ow-shops.js) opens more with badges.
// =====================================================================
// Price of a shop item (ECON.items).
function itemCost(type) { return ECON.items[type]; }
const ITEM_LOOKS = {
  potion: ['💖', 'Potion', 'Heals ' + ECON.overworld.potionHeal + ' HP in a battle and cures a status'],
  net: ['🕸️', 'Catch Net', 'Throw it at a wild buddy to catch it'],
  greatnet: ['🕸️', 'Great Net', 'A better net: catches x1.5 as well'],
  ultranet: ['🕸️', 'Ultra Net', 'The best net: catches x2 as well'],
  elixir: ['🧪', 'Elixir', 'Restores 10 PP to every move in a battle'],
  xattack: ['⚔️', 'X Attack', 'Raises Attack by a stage for the rest of a battle'],
  xdefend: ['🛡️', 'X Defend', 'Raises Defense by a stage for the rest of a battle'],
  xspeed: ['💨', 'X Speed', 'Raises Speed by a stage for the rest of a battle'],
  maxrepel: ['🧴', 'Max Repel', 'No wild buddies in the grass for ' + ECON.overworld.maxRepelSteps + ' steps'],
  stone: ['💎', 'Evolution Stone', 'Some buddies evolve at once when you use it (see the Stats tab)'],
  ether: ['🧪', 'Ether', 'Restores 10 PP to one move in a battle'],
  ppup: ['⬆️', 'PP Up', 'Raises a move\'s PP for good (see the Stats tab, up to three times)'],
  escaperope: ['🪢', 'Escape Rope', 'Takes you back to the last Buddy Center (use it from the Bag)'],
  hpup: ['💪', 'HP Up', 'Raises a buddy\'s HP for good (see the Stats tab)'],
  protein: ['💪', 'Protein', 'Raises a buddy\'s Attack for good (see the Stats tab)'],
  iron: ['💪', 'Iron', 'Raises a buddy\'s Defense for good (see the Stats tab)'],
  carbos: ['💪', 'Carbos', 'Raises a buddy\'s Speed for good (see the Stats tab)'],
  calcium: ['💪', 'Calcium', 'Raises a buddy\'s Special for good (see the Stats tab)'],
  maxpotion: ['💗', 'Max Potion', 'Heals all of a buddy\'s HP in a battle'],
  fullrestore: ['💗', 'Full Restore', 'Heals all of a buddy\'s HP in a battle and cures a status'],
  hyperpotion: ['💗', 'Hyper Potion', 'Heals ' + ECON.overworld.hyperPotionHeal + ' HP in a battle and cures a status'],
  superpotion: ['💗', 'Super Potion', 'Heals ' + ECON.overworld.superPotionHeal + ' HP in a battle and cures a status'],
  antidote: ['💊', 'Antidote', 'Cures poison in a battle'],
  burnheal: ['💊', 'Burn Heal', 'Cures a burn in a battle'],
  iceheal: ['💊', 'Ice Heal', 'Thaws a frozen buddy in a battle'],
  awakening: ['💊', 'Awakening', 'Wakes a sleeping buddy in a battle'],
  parlyzheal: ['💊', 'Parlyz Heal', 'Cures paralysis in a battle'],
  fullheal: ['💊', 'Full Heal', 'Cures a status in a battle'],
  revive: ['✨', 'Revive', 'Wakes a resting buddy in a battle with half its HP'],
  repel: ['🧴', 'Repel', 'No wild buddies in the grass for ' + ECON.overworld.repelSteps + ' steps']
};


function maxNets() {
  return ECON.wild.net.stock;
}

function buyItem(type) {
  const cost = itemCost(type);
  if (state.gems < cost) {
    soundWrong();
    toast(`You need ${cost - state.gems} more gems!`);
    return;
  }
  if (type === 'net' && state.nets >= maxNets()) { toast('You can hold ' + maxNets() + ' Catch Nets'); return; }
  const look = ITEM_LOOKS[type];
  askBuy({ icon: look[0], name: look[1], cost: cost, note: look[2] }, function () { payItem(type); });
}
// After "Buy": check again (the situation may have changed), then pay and give the item.
function payItem(type) {
  const cost = itemCost(type);
  if (state.gems < cost || (type === 'net' && state.nets >= maxNets())) return;
  state.gems -= cost;
  soundLevelUp();
  if (type === 'net') {
    state.nets += 1;
    showPopup('Catch Net! (' + state.nets + ')');
  } else if (type === 'repel') {
    state.repelSteps = Math.min(ECON.overworld.repelSteps * 3, state.repelSteps + ECON.overworld.repelSteps);
    showPopup('Repel! (' + state.repelSteps + ' steps)');
  } else if (type === 'maxrepel') {
    state.repelSteps = Math.min(ECON.overworld.maxRepelSteps * 2, state.repelSteps + ECON.overworld.maxRepelSteps);
    showPopup('Max Repel! (' + state.repelSteps + ' steps)');
  } else if (state.items && type !== 'potion') {
    state.items[type] = Math.min(99, (state.items[type] || 0) + 1);
    showPopup(ITEM_LOOKS[type][1] + '! (' + state.items[type] + ')');
  } else if (type === 'potion') {
    state.potions = Math.min(99, state.potions + 1);
    showPopup('Potion! (' + state.potions + ')');
  }
  saveState();
  updateStatsUI();
  if (typeof refreshMart === 'function') refreshMart();
}

// ----- buy confirmation: every purchase with gems asks first -----
// askBuy({icon, name, cost, note}, onYes): shows what it costs and what is left; onYes runs only after "Buy". Callers check they can afford it first.
let pendingBuy = null;
function askBuy(o, onYes) {
  pendingBuy = onYes;
  document.getElementById('confirm-icon').innerHTML = o.icon;
  document.getElementById('confirm-title').innerText = 'Buy ' + o.name + '?';
  document.getElementById('confirm-note').innerText = o.note || '';
  document.getElementById('confirm-wallet').innerText = 'Costs 💎 ' + o.cost + '\nYou have 💎 ' + state.gems + ' · left 💎 ' + (state.gems - o.cost);
  document.getElementById('confirm-yes').innerText = 'Buy for ' + o.cost + ' 💎';
  document.getElementById('confirm-yes').setAttribute('aria-label', 'Buy ' + o.name + ' for ' + o.cost + ' gems');
  showModal('confirm-modal');
}
function closeConfirm() { pendingBuy = null; hideModal('confirm-modal'); }
function confirmBuy() {
  const go = pendingBuy;
  pendingBuy = null;
  hideModal('confirm-modal');
  if (go) go();
}
