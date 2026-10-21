// =====================================================================
//  THE MENU: the Start menu of the Adventure. The map is the whole game, so every other screen is reached from here.
//  The windows it opens come later in the page than the map and open above it (see index.html).
// =====================================================================
const MENU_ITEMS = [
  ['Buddies', 'openHub'], ['Bag', 'openBag'], ['Team', 'openPad'], ['Dex', 'openBook'],
  ['Gizmo', 'openGizmo'], ['Trainer', 'openTrainerCard'], ['Save', 'menuSave'], ['Settings', 'openSettings']
];
function openMenu() {
  showModal('menu-modal', function () {
    updateStatsUI();
    document.getElementById('menu-body').innerHTML = '<div class="menu-grid">' + MENU_ITEMS.filter(function (m) { return m[1] !== 'openGizmo' || hasKeyItem('gizmo'); }).map(function (m) {
      return '<button type="button" class="ab-btn" onclick="menuGo(\'' + m[1] + '\')">' + m[0] + '</button>';
    }).join('') + '</div>';
  });
}
function closeMenu() { hideModal('menu-modal'); }
function menuGo(fn) { window[fn](); }
// Gold's Trainer Card: who you are, your badges and how far you have come, in the text window.
function openTrainerCard() {
  const badges = gymRegions().filter(function (r) { return hasBadge(r.id); }).length, far = allGymRegions().filter(function (r) { return r.far && hasBadge(r.id); }).length;
  openTalk({ name: state.hero.name || 'Trainer', art: heroSprite(heroLookColors(), 'down', 0), lines: [
    'Badges: ' + badges + ' of ' + gymRegions().length + (far ? ' (and ' + far + ' beyond the Peak)' : '') + (isChampion() ? '. You are the Champion!' : '.'),
    'Buddies: ' + getOwnedIds().length + '. Gems: ' + state.gems + '.'] });
}
// Gold's Save: the game saves as you go; this does it right now.
function menuSave() { saveState(); toast('Game saved.'); }
