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
// Gold's Trainer Card: name, number, money, play time and the badge case (every gym's badge, dim until you win it).
setInterval(function () { if (!document.hidden && state && state.hero && state.hero.made) state.playSecs = Math.min(3599990, (state.playSecs || 0) + 5); }, 5000);
function playTimeText(secs) { const m = Math.floor(secs / 60); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); }
function openTrainerCard() {
  if (!state.trainerId) state.trainerId = 1 + Math.floor(Math.random() * 65535);
  showModal('trainer-modal', function () {
    const roster = allGymRegions(), got = roster.filter(function (r) { return hasBadge(r.id); }).length;
    document.getElementById('trainer-body').innerHTML =
      '<div class="tc-top"><div><div class="tc-line">NAME/' + escHtml((state.hero.name || 'Trainer').toUpperCase()) + '</div><div class="tc-line">ID No ' + String(state.trainerId).padStart(5, '0') + '</div>' +
      '<div class="tc-line">GEMS ' + state.gems + '</div><div class="tc-line">PLAY TIME ' + playTimeText(state.playSecs || 0) + '</div></div><div class="tc-hero">' + heroSprite(heroLookColors(), 'down', 0) + '</div></div>' +
      '<div class="tc-title">BADGES ' + got + '/' + roster.length + (isChampion() ? ' - CHAMPION' : '') + '</div>' +
      '<div class="tc-badges">' + roster.map(function (r, i) { return '<div class="tc-badge' + (hasBadge(r.id) ? ' got' : '') + '" title="' + escHtml(r.name) + '"><span class="tc-n">' + (i + 1) + '</span><span class="tc-i">' + (hasBadge(r.id) ? r.icon : '?') + '</span><span class="tc-l">' + escHtml(r.name) + '</span></div>'; }).join('') + '</div>' +
      '<button type="button" class="ab-btn" onclick="closeTrainerCard()">Close</button>';
  });
}
function closeTrainerCard() { hideModal('trainer-modal'); }
// Gold's Save: the game saves as you go; this does it right now.
function menuSave() { saveState(); toast('Game saved.'); }
