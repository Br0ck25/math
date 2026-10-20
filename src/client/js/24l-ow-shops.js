// =====================================================================
//  THE BUDDY CENTER and THE MART on the Adventure map. Both reuse what the game already has:
//  the Center is the Healing Spring (24b-map.js: the first rest of a day is free, then ECON.spring.gems),
//  the Mart sells the Shop's items through buyItem() (prices, caps and the "Buy?" window stay in 14-items.js and 33-shop.js).
//  The Mart opens more items as badges are won (ECON.overworld.mart).
// =====================================================================

// ----- the Center -----
// The last Center visited is where a team wipe on a walk brings the hero back: the tile outside its door.
function rememberCenter() {
  const exit = OW_MAPS[state.overworld.map].warps[0];
  state.overworld.center = { map: exit.to, x: exit.tx, y: exit.ty };
  saveState();
}
function openCenter(npc) {
  rememberCenter();
  const art = heroSprite(heroLookColors(npc.look), 'down', 0), hurt = getTeam().some(function (id) { return abPartyMon(id).hp < abPartyMon(id).max; });
  if (!hurt) { openTalk({ name: npc.name, art: art, lines: ['Welcome to the Buddy Center!', 'Everyone is feeling great. Come back any time!'] }); return; }
  openTalk({ name: npc.name, art: art, lines: ['Welcome to the Buddy Center!', 'Your buddies look tired. Shall I look after them? It is free.'], choices: [{ label: 'Rest', run: centerHeal }] });
}
function centerHeal() {
  state.advHp = {};
  state.advPp = {};
  partyHp = {};
  soundLevelUp();
  saveState();
  if (talk) { talk.lines = ['All rested! Your buddies are ready to go.']; talk.choices = null; talk.i = 0; renderTalk(); }
}

// ----- the Mart -----
function openMart() {
  showModal('mart-modal', renderMart);
}
function closeMart() { hideModal('mart-modal', updateStatsUI); }
function renderMart() {
  document.getElementById('mart-wallet').innerText = 'You have ' + state.gems + ' gems';
  document.getElementById('mart-body').innerHTML = ECON.overworld.mart.map(function (it) {
    const look = ITEM_LOOKS[it.type], open = state.badges.length >= it.badges, cost = itemCost(it.type);
    const act = open ? '<button type="button" class="claim-btn" aria-label="Buy ' + look[1] + ' for ' + cost + ' gems" onclick="buyItem(\'' + it.type + '\')">' + cost + ' gems</button>' : '';
    return '<div class="care-row mart-row' + (open ? '' : ' locked') + '"><div class="mart-info"><div class="t">' + look[1] + '</div><div class="d">' + (open ? look[2] : 'Opens with ' + it.badges + (it.badges === 1 ? ' badge' : ' badges')) + '</div></div>' + act + '</div>';
  }).join('') + '<div class="t" style="margin:10px 0 2px;">Sell</div>' + (['potion', 'net', 'greatnet', 'ultranet', 'superpotion', 'fullheal', 'revive', 'elixir', 'xattack', 'xdefend', 'xspeed', 'stone', 'ether', 'ppup', 'escaperope'].filter(function (t) { return sellCount(t) > 0; }).map(function (t) {
    const look = ITEM_LOOKS[t], half = Math.floor(itemCost(t) / 2);
    return '<div class="care-row mart-row"><div class="mart-info"><div class="t">' + look[1] + ' x' + sellCount(t) + '</div><div class="d">The Mart pays half the price.</div></div><button type="button" class="claim-btn" aria-label="Sell one ' + look[1] + ' for ' + half + ' gems" onclick="sellItem(\'' + t + '\')">+' + half + '</button></div>';
  }).join('') || '<div class="d">You have nothing to sell.</div>');
}
// Selling back, as in Gold: a Mart pays half the price for what you carry.
function sellCount(type) { return type === 'net' ? state.nets : type === 'potion' ? state.potions : (state.items[type] || 0); }
function sellItem(type) {
  if (sellCount(type) < 1) return;
  if (type === 'net') state.nets -= 1; else if (type === 'potion') state.potions -= 1; else { state.items[type] -= 1; if (!state.items[type]) delete state.items[type]; }
  state.gems += Math.floor(itemCost(type) / 2);
  soundCoinChirp(); saveState(); updateStatsUI(); refreshMart();
}
// After a purchase the window shows the new wallet.
function refreshMart() {
  if (document.getElementById('mart-modal').style.display === 'flex') renderMart();
}
