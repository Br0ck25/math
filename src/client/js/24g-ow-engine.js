// =====================================================================
//  THE ADVENTURE MAP: a hero walks tile maps (24h-ow-maps.js); tall grass can start a wild fight, which is the normal math battle.
//  A fight that began on a walk (state.overworld.fight) returns to the map when it is won, and does not count toward the next boss.
//  Pictures are SVG (24f-ow-art.js), never emoji. The numbers are in ECON.overworld.
// =====================================================================
const OW_FACES = ['down', 'up', 'left', 'right'];
const OW_OPPOSITE = { down: 'up', up: 'down', left: 'right', right: 'left' };
const OW_STEP = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
const OW_KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
let owSafe = 0;              // safe grass steps left (no fight)
let owTrail = null;          // where the hero stood a step ago: the buddy walks there
let owFrame = 0;             // which walking picture
let owUnsaved = 0;           // steps since the last save
let owFromQueue = false;     // the map was opened by the modal queue (after a fight), so closing it must call modalDone()
let owBusy = false;          // a trainer has spotted the hero: no walking until the challenge shows
let owHoldTimer = null, owLastMove = 0, owPointerUsed = false;

// The tile at x,y as the hero meets it: a gate is its open picture, and walkable, once the hero has the charm.
function owTileAt(map, x, y) {
  const row = map.rows[y], t = row && OW_TILES[row.charAt(x)];
  if (!t) return null;
  return t.gate && hasKeyItem(t.gate) ? { t: OW_GATES[t.gate].open, open: true } : t;
}
function owWalkable(map, x, y) { const t = Number.isInteger(x) && Number.isInteger(y) ? owTileAt(map, x, y) : null; return !!t && !t.solid; }
function owNpcAt(map, x, y) { return (map.npcs || []).find(function (n) { return n.x === x && n.y === y; }) || null; }
function owNpcById(id) {
  for (const k of Object.keys(OW_MAPS)) { const n = (OW_MAPS[k].npcs || []).find(function (p) { return p.id === id; }); if (n) return n; }
  return null;
}
// The trainer who sees the hero on this tile: not beaten yet, and the hero is on a free line of up to `sight` tiles in the way it faces.
function owTrainerSeeing(map, x, y) {
  return (map.npcs || []).find(function (n) {
    if (n.kind !== 'trainer' || state.overworld.beat.indexOf(n.id) !== -1) return false;
    const d = OW_STEP[n.face], sight = n.sight || ECON.overworld.trainerSight;
    for (let i = 1; i <= sight; i++) {
      const cx = n.x + d[0] * i, cy = n.y + d[1] * i;
      if (cx === x && cy === y) return true;
      if (!owWalkable(map, cx, cy) || owNpcAt(map, cx, cy)) return false;
    }
    return false;
  }) || null;
}
function owPickupAt(map, x, y) { return (map.objects || []).find(function (o) { return o.type === 'pickup' && o.x === x && o.y === y && state.overworld.found.indexOf(o.id) === -1; }) || null; }
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
  (map.objects || []).forEach(function (ob) {
    if (ob.type === 'pickup' && o.found.indexOf(ob.id) === -1 && Math.abs(ob.x - o.x) <= half && Math.abs(ob.y - o.y) <= half) h += owActorHtml('ow-pickup', ob.x - o.x + half, ob.y - o.y + half, n, worldSprite('o-sparkle'));
  });
  (map.npcs || []).forEach(function (np) {
    if (Math.abs(np.x - o.x) <= half && Math.abs(np.y - o.y) <= half) h += owActorHtml('ow-npc', np.x - o.x + half, np.y - o.y + half, n, heroSprite(heroLookColors(np.look), np.face, 0));
    if (np.alert && Math.abs(np.x - o.x) <= half && Math.abs(np.y - 1 - o.y) <= half) h += owActorHtml('ow-alert', np.x - o.x + half, np.y - 1 - o.y + half, n, worldSprite('fx-alert'));
  });
  if (owTrail && (owTrail.x !== o.x || owTrail.y !== o.y)) h += owActorHtml('ow-follow', owTrail.x - o.x + half, owTrail.y - o.y + half, n, owFollowerHtml());
  h += owActorHtml('ow-hero', half, half, n, heroSprite(heroLookColors(), o.face, owFrame));
  view.style.cssText = '--ow-n:' + n + ';' + Object.keys(map.palette || {}).map(function (k) { return '--w-' + k.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }) + ':' + map.palette[k]; }).join(';');
  view.innerHTML = h;
  view.setAttribute('aria-label', map.name + ' map');
  document.getElementById('ow-title').innerText = map.name;
}

// ----- walking -----
function owMove(dir) {
  if (!owOpen() || owBusy) return;
  const o = state.overworld, map = OW_MAPS[o.map], d = OW_STEP[dir];
  o.face = dir;
  const nx = o.x + d[0], ny = o.y + d[1];
  if (!owWalkable(map, nx, ny) || owNpcAt(map, nx, ny)) {          // a wall, a tree, a person or a sign: just turn (people talk, signs tell their words)
    renderOverworld();
    owInteract(map, nx, ny);
    return;
  }
  owTrail = { x: o.x, y: o.y };
  o.x = nx; o.y = ny;
  owFrame = owFrame ? 0 : 1;
  const warp = owWarpAt(map, nx, ny);
  if (warp) { o.map = warp.to; o.x = warp.tx; o.y = warp.ty; owTrail = null; }
  if (++owUnsaved >= ECON.overworld.saveEvery || warp) { owUnsaved = 0; saveState(); }
  renderOverworld();
  if (warp) return;
  const here = OW_MAPS[o.map], pickup = owPickupAt(here, o.x, o.y);
  if (pickup) { owCollect(pickup); renderOverworld(); }
  const seer = owTrainerSeeing(here, o.x, o.y);
  if (seer) { owChallenge(seer); return; }
  const gym = here.gyms && here.gyms[o.x + ',' + o.y];
  if (gym) { owEnterGym(gym); return; }
  if (owTileAt(here, o.x, o.y).grass && owGrassStep()) startAdventureFight();
}
// Space or Enter: talk to or read what the hero faces.
function owInteractFacing() {
  if (owBusy) return;
  const o = state.overworld, d = OW_STEP[o.face];
  owInteract(OW_MAPS[o.map], o.x + d[0], o.y + d[1]);
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
  if ((e.key === ' ' || e.key === 'Enter') && owOpen()) { e.preventDefault(); e.stopImmediatePropagation(); owInteractFacing(); return; }
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
  if (o.fight && (state.gym || !state.wild.id || state.wild.legend || (state.wild.trainer && !o.foe))) o.fight = false;     // a trainer is fine when the walk began it
  if (!o.fight) o.foe = '';
  return o.fight;
}
// `sp` (optional): the buddy that appears (fishing, a shaken tree); otherwise the usual wild pick.
function startAdventureFight(sp) {
  if (state.gym || state.raid) return;
  owRelease();
  state.overworld.fight = true;
  state.overworld.foe = '';
  if (sp) { state.wild.shiny = false; startWild(sp); } else pickNextWild();
  hideModal('overworld-modal');
  setBossTaunt();
  updateStatsUI();
  saveState();
  announceFoe();
}
// A trainer on the map battles through the gym-trainer path (uncatchable, pays ECON.map.trainerGems), one buddy of the land's mix, near the buddy's level.
function startTrainerFight(npc) {
  if (state.gym || state.raid) return;
  owRelease();
  const sp = rollWildSpecies([]);
  state.wild.id = sp.id;
  state.wild.trainer = npc.name;
  state.wild.shiny = false;
  state.wild.legend = false;
  markDexSeen(sp.id);
  bossLevel = clamp(foeBaseLevel() + rnd(0, 1), 1, MAX_LEVEL);
  gymFoeReset();
  state.overworld.fight = true;
  state.overworld.foe = npc.id;
  hideModal('overworld-modal');
  setBossTaunt();
  updateStatsUI();
  saveState();
  announceFoe();
}
// Won a fight that began on the map: the next Practice foe waits, and the map comes back after any catch window.
function adventureWin() {
  if (!adventureFight()) return false;
  const o = state.overworld, npc = o.foe ? owNpcById(o.foe) : null;
  if (npc && o.beat.indexOf(npc.id) === -1) o.beat.push(npc.id);        // a trainer is beaten for good
  o.fight = false;
  o.foe = '';
  pickNextWild();
  setBossTaunt();
  updateStatsUI();
  saveState();
  enqueueModal(function () { owFromQueue = true; showAdventureWindow(); if (npc) owTrainerTalk(npc); });
  return true;
}
// The whole team fainted in a fight that began on the map: everyone is revived and the hero wakes outside the last Buddy Center. Nothing is lost.
function adventureWipe() {
  if (!adventureFight()) return false;
  const o = state.overworld, c = o.center;
  o.fight = false;
  o.foe = '';
  o.map = c.map; o.x = c.x; o.y = c.y; o.face = 'down';
  state.faintedPets = [];
  partyHp = {};
  pickNextWild();
  setBossTaunt();
  generateProblem();                                                  // answering is open again for Practice
  updateStatsUI();
  saveState();
  enqueueModal(function () {
    owFromQueue = true;
    showAdventureWindow();
    openTalk({ name: 'Buddy Center', art: worldSprite('t-center-sign'), lines: ['Oh no, your buddies got very tired.', 'They rested at the Buddy Center and feel great again. No gems were lost. Ready to try again?'] });
  });
  return true;
}
// "Back to the map" in a fight that began there: no penalty, the foe walks away.
function adventureBack() {
  if (!adventureFight()) return;
  const trainer = !!state.overworld.foe;
  state.overworld.fight = false;
  state.overworld.foe = '';
  pickNextWild();
  setBossTaunt();
  updateStatsUI();
  saveState();
  showAdventureWindow();
  if (trainer) owStepBack();                                          // the trainer is still waiting: one step back out of its sight
}
// One step back the way the hero came (it faces where it was walking), if that tile is free.
function owStepBack() {
  const o = state.overworld, m = OW_MAPS[o.map], d = OW_STEP[OW_OPPOSITE[o.face]], bx = o.x + d[0], by = o.y + d[1];
  if (owWalkable(m, bx, by) && !owNpcAt(m, bx, by) && !owWarpAt(m, bx, by)) { o.x = bx; o.y = by; owTrail = null; saveState(); }
  renderOverworld();
}
function refreshAdventureButton() {
  const b = document.getElementById('ow-back-btn');
  if (b) b.style.display = adventureFight() ? '' : 'none';
}
