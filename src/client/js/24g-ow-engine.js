// =====================================================================
//  THE ADVENTURE MAP: a hero walks tile maps (24h-ow-maps.js); tall grass can start a wild fight, which is the normal math battle.
//  A fight that began on a walk (state.overworld.fight) returns to the map when it is won, and does not count toward the next boss.
//  Pictures are SVG (24f-ow-art.js), never emoji. The numbers are in ECON.overworld.
// =====================================================================
const OW_FACES = ['down', 'up', 'left', 'right'];
const OW_STEP = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
const OW_KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
let owSafe = 0;              // safe grass steps left (no fight)
let owTrail = null;          // where the hero stood a step ago: the buddy walks there
let owFrame = 0;             // which walking picture
let owUnsaved = 0;           // steps since the last save
let owFromQueue = false;     // the map was opened by the modal queue (after a fight), so closing it must call modalDone()
let owHoldTimer = null, owLastMove = 0, owPointerUsed = false;

function owTileAt(map, x, y) { const row = map.rows[y]; return (row && OW_TILES[row.charAt(x)]) || null; }
function owWalkable(map, x, y) { const t = Number.isInteger(x) && Number.isInteger(y) ? owTileAt(map, x, y) : null; return !!t && !t.solid; }
function owWarpAt(map, x, y) { return map.warps.find(function (w) { return w.x === x && w.y === y; }) || null; }
function owOpen() {
  const open = openOverlays(), top = open[open.length - 1];
  return !!top && top.id === 'overworld-modal';
}
function owCols() { return window.innerWidth <= 360 ? 7 : 9; }

// ----- drawing: the tiles around the hero, then the buddy and the hero on top -----
function owActorHtml(cls, vx, vy, n, inner) {
  return '<span class="ow-actor ' + cls + '" style="left:' + (vx / n * 100).toFixed(3) + '%;top:' + (vy / n * 100).toFixed(3) + '%">' + inner + '</span>';
}
function owFollowerHtml() {
  const art = BUDDY_ART[state.activePet];
  return art ? '<img class="ow-buddy" alt="" src="' + art + '">' : worldSprite('o-paw', 'ow-buddy');
}
function renderOverworld() {
  const o = state.overworld, map = OW_MAPS[o.map], n = owCols(), half = (n - 1) / 2, view = document.getElementById('ow-view');
  let h = '';
  for (let vy = 0; vy < n; vy++) {
    for (let vx = 0; vx < n; vx++) {
      const t = owTileAt(map, o.x - half + vx, o.y - half + vy);
      h += '<span class="ow-cell">' + (t ? worldSprite(t.t) : '') + '</span>';
    }
  }
  if (owTrail && (owTrail.x !== o.x || owTrail.y !== o.y)) h += owActorHtml('ow-follow', owTrail.x - o.x + half, owTrail.y - o.y + half, n, owFollowerHtml());
  h += owActorHtml('ow-hero', half, half, n, heroSprite(heroLookColors(), o.face, owFrame));
  view.style.setProperty('--ow-n', n);
  view.innerHTML = h;
  view.setAttribute('aria-label', map.name + ' map');
  document.getElementById('ow-title').innerText = map.name;
}

// ----- walking -----
function owMove(dir) {
  if (!owOpen()) return;
  const o = state.overworld, map = OW_MAPS[o.map], d = OW_STEP[dir];
  o.face = dir;
  const nx = o.x + d[0], ny = o.y + d[1];
  if (!owWalkable(map, nx, ny)) {                                   // a wall, a tree or a sign: just turn (a sign tells its words)
    const text = map.signs && map.signs[nx + ',' + ny];
    if (text) toast(text);
    renderOverworld();
    return;
  }
  owTrail = { x: o.x, y: o.y };
  o.x = nx; o.y = ny;
  owFrame = owFrame ? 0 : 1;
  const warp = owWarpAt(map, nx, ny);
  if (warp) { o.map = warp.to; o.x = warp.tx; o.y = warp.ty; owTrail = null; }
  if (++owUnsaved >= ECON.overworld.saveEvery || warp) { owUnsaved = 0; saveState(); }
  renderOverworld();
  if (!warp && owTileAt(OW_MAPS[o.map], o.x, o.y).grass && owGrassStep()) startAdventureFight();
}
// One step in tall grass: the first graceSteps after a fight are safe, then each step may start a wild fight.
function owGrassStep() {
  if (owSafe > 0) { owSafe -= 1; return false; }
  return Math.random() < ECON.overworld.grassChance;
}
// The D-pad: press to step, hold to keep walking. A keyboard "click" (no pointer) steps once.
function owHold(dir) {
  owPointerUsed = true;
  owRelease();
  owMove(dir);
  owHoldTimer = setTimeout(function () { owHoldTimer = setInterval(function () { owMove(dir); }, hasKeyItem('running-shoes') ? ECON.overworld.shoeMs : ECON.overworld.holdMs); }, 260);
}
function owRelease() { clearTimeout(owHoldTimer); clearInterval(owHoldTimer); owHoldTimer = null; }
function owClick(dir) { if (owPointerUsed) { owPointerUsed = false; return; } owMove(dir); }
window.addEventListener('keydown', function (e) {
  const dir = OW_KEYS[e.key];
  if (!dir || !owOpen()) return;
  e.preventDefault();
  if (Date.now() - owLastMove < 90) return;
  owLastMove = Date.now();
  owMove(dir);
});

// ----- the window -----
function openAdventure() {
  if (state.gym) { soundWrong(); toast('Finish or leave the gym first'); return; }
  if (state.raid) { soundWrong(); toast('Finish the raid boss first'); return; }
  if (document.getElementById('map-modal').style.display === 'flex') closeMap();
  if (!state.hero.made) { openHeroCreator(); return; }               // the first walk starts with Who are you?
  showAdventureWindow();
}
function showAdventureWindow() {
  showModal('overworld-modal', function () { owSafe = ECON.overworld.graceSteps; owTrail = null; renderOverworld(); });
}
function closeOverworld() {
  owRelease();
  hideModal('overworld-modal', function () {
    saveState();
    updateStatsUI();
    if (owFromQueue) { owFromQueue = false; modalDone(); }
  });
}
// The row at the top of the Map window.
function adventureRowHtml() {
  return '<div class="care-row map-row adventure-row"><div class="ow-row-icon">' + worldSprite('t-tall-grass') + '</div><div class="ow-row-text"><div class="t">Adventure</div><div class="d">Walk ' + OW_MAPS[state.overworld.map].name + ' and meet wild buddies in the tall grass</div></div>' +
    '<div class="map-actions"><button class="claim-btn" onclick="openAdventure()">Explore</button></div></div>';
}

// ----- a fight that begins on a walk, and how it ends -----
// True while the current wild fight began on the map. A flag left over from a foe that was replaced meanwhile (a gym, a legend hunt, a boss) is cleared.
function adventureFight() {
  const o = state.overworld;
  if (o.fight && (state.gym || !state.wild.id || state.wild.legend || state.wild.trainer)) o.fight = false;
  return o.fight;
}
function startAdventureFight() {
  if (state.gym || state.raid) return;
  owRelease();
  state.overworld.fight = true;
  pickNextWild();
  hideModal('overworld-modal');
  setBossTaunt();
  updateStatsUI();
  saveState();
  announceFoe();
}
// Won a fight that began on the map: the next Practice foe waits, and the map comes back after any catch window.
function adventureWin() {
  if (!adventureFight()) return false;
  state.overworld.fight = false;
  pickNextWild();
  setBossTaunt();
  updateStatsUI();
  saveState();
  enqueueModal(function () { owFromQueue = true; showAdventureWindow(); });
  return true;
}
// "Back to the map" in a fight that began there: no penalty, the foe walks away.
function adventureBack() {
  if (!adventureFight()) return;
  state.overworld.fight = false;
  pickNextWild();
  setBossTaunt();
  updateStatsUI();
  saveState();
  showAdventureWindow();
}
function refreshAdventureButton() {
  const b = document.getElementById('ow-back-btn');
  if (b) b.style.display = adventureFight() ? '' : 'none';
}
