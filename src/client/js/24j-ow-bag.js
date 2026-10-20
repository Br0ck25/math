// =====================================================================
//  THE ADVENTURE BAG and TEAM: both only show what the game already keeps (shields, nets, held items, the egg, badges, the team).
//  Buying and caring stay in the Shop and the Hub; a button takes you there. Nothing here is a second copy of an inventory.
// =====================================================================
function bagRow(label, value) { return '<div class="bag-row"><span>' + label + '</span><b>' + value + '</b></div>'; }
function bagSection(title, body) { return '<div class="bag-sec"><h3>' + title + '</h3>' + body + '</div>'; }
function renderBag() {
  document.getElementById('bag-title').innerText = heroName() + "'s Bag";
  const keys = KEY_ITEMS.filter(function (k) { return hasKeyItem(k.id); }).map(function (k) {
    return '<div class="bag-key"><span class="bag-key-art">' + worldSprite(k.art) + '</span><div><div class="t">' + k.name + '</div><div class="d">' + k.text + '</div></div></div>';
  }).join('');
  const badges = state.badges.map(function (id) { return regionById(id).name; });
  const held = HELD_ITEMS.filter(function (it) { return state.heldOwned.indexOf(it.id) !== -1; }).map(function (it) {
    const who = Object.keys(state.held).filter(function (b) { return state.held[b] === it.id; })[0];
    return bagRow(it.name, who ? 'held by ' + escHtml(getPetById(who).baseName) : 'not held');
  }).join('') || '<div class="d">None yet. Find them in the Hold tab of the Hub.</div>';
  const supplies = bagRow('Gems', state.gems) + bagRow('Streak Shields', state.shields) + bagRow('Catch Nets', state.nets + ' of ' + maxNets()) +
    bagRow('Repel', state.repelSteps > 0 ? state.repelSteps + ' steps left' : 'none') + bagRow('Lucky Clover', state.cloverLeft > 0 ? state.cloverLeft + ' solves left' : 'none');
  const egg = state.egg ? bagRow('Egg', escHtml(state.egg.element) + ' · ' + state.egg.steps + ' of ' + state.egg.target) : '<div class="d">No egg right now. Bosses and quests give eggs.</div>';
  document.getElementById('bag-body').innerHTML =
    bagSection('Key items', keys || '<div class="d">Nothing yet.</div>') +
    bagSection('Badges (' + badges.length + ')', hasKeyItem('badge-case') ? '<div class="d">' + (badges.length ? badges.join(', ') : 'None yet. Win one at a gym!') + '</div>' : '<div class="d">You need the Badge Case.</div>') +
    bagSection('Supplies', supplies) + bagSection('Held items', held) + bagSection('Egg', egg) +
    '<div class="bag-actions"><button type="button" class="claim-btn" onclick="bagGo(\'shop\')">Shop</button><button type="button" class="claim-btn" onclick="bagGo(\'hub\')">Buddy Hub</button><button type="button" class="claim-btn" onclick="openHeroCreator()">Change look</button></div>';
}
function openBag() { showModal('bag-modal', renderBag); }
function closeBag() { hideModal('bag-modal'); }
// Opens the Shop or the Hub over the map; closing them brings the map back.
function bagGo(where) {
  closeBag();
  if (where === 'shop') openShop(); else { hubTab = 'hold'; openHub(); }
}

// ----- the team and the PC box: six buddies fight, the rest wait in the box (Gold's PC) -----
function padRow(id, action) {
  const p = getPetById(id), mon = abPartyMon(id), hp = mon.hp, max = mon.max, resting = isSleepy(id);
  return '<div class="care-row pad-row' + (resting ? ' resting' : '') + '"><span class="pad-icon">' + p.icon + '</span><div class="pad-main"><div class="t">' + escHtml(p.baseName) + ' · Lv ' + p.level + (resting ? ' · resting' : '') + '</div>' +
    '<div class="pad-hp" role="img" aria-label="HP ' + hp + ' of ' + max + '"><i style="width:' + Math.round(100 * hp / Math.max(1, max)) + '%"></i></div><div class="d">HP ' + hp + '/' + max + '</div></div>' + action + '</div>';
}
function padBtn(label, fn, id) { return '<button type="button" class="claim-btn" onclick="' + fn + '(\'' + escHtml(id) + '\')">' + label + '</button>'; }
function renderPad() {
  document.getElementById('pad-title').innerText = heroName() + "'s team";
  const team = getTeam(), box = getOwnedIds().filter(function (id) { return team.indexOf(id) === -1; }).sort(function (a, b) { return getBuddyLevel(b) - getBuddyLevel(a); });
  document.getElementById('pad-body').innerHTML = '<div class="pad-note d">Team (' + team.length + '/' + ECON.team.max + '): the lead goes first in a battle.</div>' +
    team.map(function (id) { return padRow(id, id === state.activePet ? '<span class="pad-tag">Leading</span>' : (isSleepy(id) ? '' : padBtn('Lead', 'padLead', id)) + (team.length > 1 ? padBtn('Box', 'padDeposit', id) : '')); }).join('') +
    '<div class="pad-note d">PC box (' + box.length + ')</div>' +
    (box.map(function (id) { return padRow(id, padBtn('Team', 'padWithdraw', id)); }).join('') || '<div class="d pad-note">Empty. Buddies you catch beyond six wait here.</div>');
}
function openPad() { showModal('pad-modal', renderPad); }
function closePad() { hideModal('pad-modal'); }
function padRefresh() {
  saveState(); renderPad();
  if (document.getElementById('overworld-modal').style.display === 'flex') renderOverworld();
}
function padLead(id) { if (setLead(id)) padRefresh(); }
function padDeposit(id) {
  const t = getTeam();
  if (id === state.activePet || t.length < 2) { soundWrong(); toast('The lead has to stay on the team. Choose another lead first.'); return; }
  state.team = t.filter(function (x) { return x !== id; });
  soundClick(); padRefresh();
}
function padWithdraw(id) {
  if (joinTeamIfRoom(id)) { soundClick(); padRefresh(); return; }
  openReplaceModal(id);                                                           // the team is full: pick who goes to the box
}
