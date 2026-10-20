// =====================================================================
//  THE ADVENTURE MAP: a hero walks tile maps (24h-ow-maps.js); tall grass can start a wild fight on the Adventure battle screen (24x-ow-battle.js).
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
let owBusy = false;          // a trainer has spotted the hero: no walking until the challenge shows
let owHoldTimer = null, owLastMove = 0, owPointerUsed = false;

// The tile at x,y as the hero meets it: a gate is its open picture, and walkable, once the hero has the charm.
function owTileAt(map, x, y) {
  const row = map.rows[y], t = row && OW_TILES[row.charAt(x)];
  if (!t) return null;
  if (t.road) { const b = map.roads && map.roads[x + ',' + y]; return b && owRoadOpen(b) ? { t: 't-path', open: true } : t; }
  return t.gate && hasKeyItem(t.gate) ? { t: OW_GATES[t.gate].open, open: true } : t;
}
// The road to the next land opens with the badge of the land before it, or any later badge (a save that already went on).
function owRoadOpen(badge) {
  const ids = gymRegions().map(function (r) { return r.id; });
  return ids.slice(ids.indexOf(badge)).some(hasBadge);
}
// Walking into a land makes its buddies the ones in the grass (the same as travelling there on the Map).
function owSetRegion(map) {
  if (owTowns().indexOf(map.id) !== -1 && state.overworld.seen.indexOf(map.id) === -1) state.overworld.seen.push(map.id);
  if (map.region && state.region !== map.region) { state.region = map.region; markRegionVisited(map.region); }
}
function owWalkable(map, x, y) { const t = Number.isInteger(x) && Number.isInteger(y) ? owTileAt(map, x, y) : null; return !!t && !t.solid; }
// A person is there when its `needs` is met (a badge, or 'champion') and it has not vanished (beaten, or its story scene done).
function owNpcActive(n) {
  const o = state.overworld;
  if (n.needs && !(n.needs === 'champion' ? isChampion() : hasBadge(n.needs))) return false;
  if (n.vanish && (o.beat.indexOf(n.id) !== -1 || (n.story && o.story.indexOf(n.story) !== -1))) return false;
  return true;
}
function owNpcAt(map, x, y) { return (map.npcs || []).find(function (n) { return n.x === x && n.y === y && owNpcActive(n); }) || null; }
function owNpcById(id) {
  for (const k of Object.keys(OW_MAPS)) { const n = (OW_MAPS[k].npcs || []).find(function (p) { return p.id === id; }); if (n) return n; }
  return null;
}
// The trainer who sees the hero on this tile: not beaten yet, and the hero is on a free line of up to `sight` tiles in the way it faces.
function owTrainerSeeing(map, x, y) {
  return (map.npcs || []).find(function (n) {
    if ((n.kind !== 'trainer' && n.kind !== 'boss') || !owNpcActive(n) || state.overworld.beat.indexOf(n.id) !== -1) return false;
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
    if (!owNpcActive(np)) return;
    if (Math.abs(np.x - o.x) <= half && Math.abs(np.y - o.y) <= half) h += owActorHtml('ow-npc', np.x - o.x + half, np.y - o.y + half, n, heroSprite(heroLookColors(np.look), np.face, 0));
    if (np.alert && Math.abs(np.x - o.x) <= half && Math.abs(np.y - 1 - o.y) <= half) h += owActorHtml('ow-alert', np.x - o.x + half, np.y - 1 - o.y + half, n, worldSprite('fx-alert'));
  });
  if (owTrail && (owTrail.x !== o.x || owTrail.y !== o.y)) h += owActorHtml('ow-follow', owTrail.x - o.x + half, owTrail.y - o.y + half, n, owFollowerHtml());
  h += owActorHtml('ow-hero', half, half, n, heroSprite(heroLookColors(), o.face, owFrame));
  view.style.cssText = '--ow-n:' + n + ';' + Object.keys(map.palette || {}).map(function (k) { return '--w-' + k.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }) + ':' + map.palette[k]; }).join(';');
  view.innerHTML = h;
  view.setAttribute('aria-label', map.name + ' map');
  document.getElementById('ow-title').innerText = map.name;
  document.getElementById('ow-gizmo-btn').style.display = hasKeyItem('gizmo') ? '' : 'none';
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
  if (warp) { o.map = warp.to; o.x = warp.tx; o.y = warp.ty; owTrail = null; owSetRegion(OW_MAPS[o.map]); }
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
  showModal('overworld-modal', function () { owSafe = ECON.overworld.graceSteps; owTrail = null; owSetRegion(OW_MAPS[state.overworld.map]); renderOverworld(); });
}
function closeOverworld() {
  owRelease();
  hideModal('overworld-modal', function () {
    saveState();
    updateStatsUI();
  });
}
// The row at the top of the Map window.
function adventureRowHtml() {
  return '<div class="care-row map-row adventure-row"><div class="ow-row-icon">' + worldSprite('t-tall-grass') + '</div><div class="ow-row-text"><div class="t">Adventure</div><div class="d">Walk ' + OW_MAPS[state.overworld.map].name + ' and meet wild buddies in the tall grass</div></div>' +
    '<div class="map-actions"><button class="claim-btn" onclick="openAdventure()">Explore</button></div></div>';
}

// ----- a fight that begins on a walk: the Adventure battle screen (24x-ow-battle.js, 24y-ow-arenas.js) -----
// `sp` (optional): the buddy that appears (fishing, a shaken tree); otherwise the usual wild pick.
function startAdventureFight(sp) {
  if (state.gym || state.raid || ab) return;
  owRelease();
  sp = sp || rollWildSpecies([]);
  abStart({ kind: 'wild', foes: [{ id: sp.id, level: abWildLevel() }] });
}
// A trainer on the map battles through the gym-trainer path (uncatchable, pays ECON.map.trainerGems), one buddy of the land's mix, near the buddy's level.
function startTrainerFight(npc) {
  if (state.gym || state.raid || ab) return;
  owRelease();
  if (npc.kind === 'boss') { abStartBoss(npc); return; }
  const foes = [], n = clamp(1 + Math.floor(state.badges.length / 3), 1, 3), lvl = abWildLevel() + (npc.levelBonus || 0);
  for (let i = 0; i < n; i++) foes.push({ id: rollWildSpecies(foes.map(function (f) { return f.id; })).id, level: clamp(lvl + rnd(0, 1), 2, MAX_LEVEL) });     // a trainer's buddies are a little above the land's wild ones
  abStart({ kind: 'trainer', name: npc.name, npc: npc, foes: foes });
}
// Marks a story beat done; true the first time (the caller pays its prize).
function owStoryDone(id) {
  const s = state.overworld.story;
  if (!id || s.indexOf(id) !== -1) return false;
  s.push(id);
  saveState();
  return true;
}
function owStoryReward(id) {
  if (!owStoryDone(id)) return;
  const gems = ECON.overworld.storyGems[id];
  if (gems) grantGems(gems, 'Story reward: +' + gems + ' gems!', true);
}
// One step back the way the hero came (it faces where it was walking), if that tile is free.
function owStepBack() {
  const o = state.overworld, m = OW_MAPS[o.map], d = OW_STEP[OW_OPPOSITE[o.face]], bx = o.x + d[0], by = o.y + d[1];
  if (owWalkable(m, bx, by) && !owNpcAt(m, bx, by) && !owWarpAt(m, bx, by)) { o.x = bx; o.y = by; owTrail = null; saveState(); }
  renderOverworld();
}
