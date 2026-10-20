// =====================================================================
//  THE MENU: the Start menu of the Adventure. The map is the whole game, so every other screen is reached from here.
//  The windows it opens come later in the page than the map and open above it (see index.html).
// =====================================================================
const MENU_ITEMS = [
  ['Buddies', 'openHub'], ['Bag', 'openBag'], ['Team', 'openPad'], ['Dex', 'openBook'],
  ['Wardrobe', 'openShop'], ['Gizmo', 'openGizmo'], ['Settings', 'openSettings']
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
