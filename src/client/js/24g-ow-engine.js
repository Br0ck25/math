// =====================================================================
//  THE ADVENTURE MAP: a hero walks tile maps (24h-ow-maps.js); tall grass can start a wild fight on the Adventure battle screen (24x-ow-battle.js).
//  Pictures are SVG (24f-ow-art.js), never emoji. The numbers are in ECON.overworld.
// =====================================================================
const OW_FACES = ['down', 'up', 'left', 'right'];
const OW_OPPOSITE = { down: 'up', up: 'down', left: 'right', right: 'left' };
const OW_STEP = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
const OW_KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
let owStepsWalked = 0;        // steps this session: every 50 raise the lead's friendship
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
  if (badge === 'champion') return isChampion();                 // the way to the second journey
  const ids = allGymRegions().map(function (r) { return r.id; });
  return ids.slice(ids.indexOf(badge)).some(hasBadge);
}
// Walking into a land makes its buddies the ones in the grass (the same as travelling there on the Map).
function owSetRegion(map) {
  if (owTowns().indexOf(map.id) !== -1 && state.overworld.seen.indexOf(map.id) === -1) state.overworld.seen.push(map.id);
  if (map.region && state.region !== map.region) { state.region = map.region; markRegionVisited(map.region); }
}
function owWalkable(map, x, y) { const t = Number.isInteger(x) && Number.isInteger(y) ? owTileAt(map, x, y) : null; return !!t && !t.solid; }
// A person is there when its `needs` is met (a badge, or 'champion') and it has not vanished (beaten, or its story scene done).
// The day of the week on this device (0 = Sunday); a few visitors only come on their own day, as Gold's Tuscany does on Tuesdays.
function owWeekday() { return new Date().getDay(); }
function owNpcActive(n) {
  const o = state.overworld;
  if (n.day !== undefined && n.day !== owWeekday()) return false;
  if (n.needs && !(n.needs === 'champion' ? isChampion() : hasBadge(n.needs))) return false;
  if (n.kind === 'trainer' && phoneReady() === n.id) return true;                       // a trainer who called for a rematch is back on the map
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
    if ((n.kind !== 'trainer' && n.kind !== 'boss') || !owNpcActive(n) || (state.overworld.beat.indexOf(n.id) !== -1 && phoneReady() !== n.id)) return false;
    const d = OW_STEP[n.face], sight = n.sight || ECON.overworld.trainerSight;
    for (let i = 1; i <= sight; i++) {
      const cx = n.x + d[0] * i, cy = n.y + d[1] * i;
      if (!owWalkable(map, cx, cy) || owNpcAt(map, cx, cy)) return false;
      if (cx === x && cy === y) return true;
    }
    return false;
  }) || null;
}
// A find that is still there; a hidden one only shows (and can be picked up) while the hero holds the Itemfinder and is within three tiles (Gold's Itemfinder).
function owPickupShows(o) {
  if (state.overworld.found.indexOf(o.id) !== -1) return false;
  return !o.hidden || (hasKeyItem('itemfinder') && Math.abs(o.x - state.overworld.x) + Math.abs(o.y - state.overworld.y) <= 3);
}
function owPickupAt(map, x, y) { return (map.objects || []).find(function (o) { return o.type === 'pickup' && o.x === x && o.y === y && owPickupShows(o); }) || null; }
function owWarpAt(map, x, y) { return map.warps.find(function (w) { return w.x === x && w.y === y; }) || null; }
function owOpen() {
  const open = openOverlays(), top = open[open.length - 1];
  return !!top && top.id === 'overworld-modal';
}
// How many tiles the view shows: as many columns as fit the width (an odd number, so the hero is in the middle), and as many rows as fit the height.
function owGrid() {
  const stage = document.getElementById('ow-stage'), w = (stage && stage.clientWidth) || window.innerWidth - 16, h = (stage && stage.clientHeight) || Math.round(window.innerHeight * 0.55);
  const odd = function (n) { return n % 2 ? n : n - 1; };
  const cols = clamp(odd(Math.round(w / 46)), 7, 15), tile = w / cols;
  return { cols: cols, rows: Math.max(5, odd(Math.floor(h / tile))), tile: tile };
}

// ----- drawing: the tiles around the hero, then the buddy and the hero on top -----
function owActorHtml(cls, vx, vy, g, inner) {
  return '<span class="ow-actor ' + cls + '" style="left:' + (vx / g.cols * 100).toFixed(3) + '%;top:' + (vy / g.rows * 100).toFixed(3) + '%">' + inner + '</span>';
}
function owFollowerHtml() {
  const art = BUDDY_ART[state.activePet];
  return art ? '<img class="ow-buddy" alt="" src="' + art + '">' : worldSprite('o-paw', 'ow-buddy');
}
// What lies past the top or bottom edge of a map: the tile of the neighbour that the edge warp leads to, lined up so that stepping through the warp does not move the view
// (route y -1 is the town's row ty - 1). Returns the tile and the neighbour's colours, or null when the edge has no way on.
function owBeyond(map, x, y) {
  if (map.room) return null;                                                                              // inside a building nothing shows past the wall
  const n = map.rows.length, edge = y < 0 ? 0 : n - 1, w = (y < 0 || y >= n) && map.warps.filter(function (p) { return p.y === edge && OW_MAPS[p.to]; }).sort(function (a, b) { return Math.abs(a.x - x) - Math.abs(b.x - x); })[0];
  if (!w) return null;
  const nm = OW_MAPS[w.to], nx = clamp(x + w.tx - w.x, 0, nm.rows[0].length - 1), ny = clamp(w.ty + (y - w.y), 0, nm.rows.length - 1), t = owTileAt(nm, nx, ny);
  return t ? { t: t, style: owPaletteCss(nm.palette), map: nm, x: x + w.tx - w.x, y: w.ty + (y - w.y) } : null;
}
function owPaletteCss(palette) { return Object.keys(palette || {}).map(function (k) { return '--w-' + k.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }) + ':' + palette[k]; }).join(';'); }
// Berry bushes (a pickup whose id ends in -berries) grow back each new day, like Gold's fruit trees: on a new day their ids leave the found list.
function owFruitDay() {
  const o = state.overworld, today = dayKey();
  if (o.fruitDay === today) return;
  const bushes = owIds('pickup').filter(function (id) { return /-(berries|apricorns)$/.test(id); });
  o.found = o.found.filter(function (id) { return bushes.indexOf(id) === -1; });
  o.fruitDay = today;
}
function renderOverworld() {
  owFruitDay();
  const o = state.overworld, map = OW_MAPS[o.map], g = owGrid(), hx = (g.cols - 1) / 2, hy = (g.rows - 1) / 2, view = document.getElementById('ow-view');
  const inView = function (x, y) { return Math.abs(x - o.x) <= hx && Math.abs(y - o.y) <= hy; };
  let h = '';
  const farActors = [];                                                                                   // people and finds of the next map that are in view past the edge
  for (let vy = 0; vy < g.rows; vy++) {
    for (let vx = 0; vx < g.cols; vx++) {
      const x = o.x - hx + vx, y = o.y - hy + vy;
      const t = owTileAt(map, x, y), beyond = t ? null : owBeyond(map, x, y);                  // past the edge Gold shows the next map (the same cell the warp lands on), never black
      const shown = t || (beyond && beyond.t) || (map.room ? null : owTileAt(map, clamp(x, 0, map.rows[0].length - 1), clamp(y, 0, map.rows.length - 1)));      // a room is surrounded by black, as in Gold
      h += '<span class="ow-cell"' + (beyond && beyond.style ? ' style="' + beyond.style + '"' : '') + '>' + (shown ? worldSprite(shown.t) : '') + '</span>';
      if (beyond) farActors.push([beyond, vx, vy]);
    }
  }
  (map.objects || []).forEach(function (ob) {
    if (ob.type === 'pickup' && owPickupShows(ob) && inView(ob.x, ob.y)) h += owActorHtml('ow-pickup', ob.x - o.x + hx, ob.y - o.y + hy, g, worldSprite('o-sparkle'));
  });
  (map.npcs || []).forEach(function (np) {
    if (!owNpcActive(np)) return;
    if (inView(np.x, np.y)) h += owActorHtml('ow-npc', np.x - o.x + hx, np.y - o.y + hy, g, heroSprite(heroLookColors(np.look), np.face, 0));
    if (np.alert && inView(np.x, np.y - 1)) h += owActorHtml('ow-alert', np.x - o.x + hx, np.y - 1 - o.y + hy, g, worldSprite('fx-alert'));
  });
  farActors.forEach(function (f) {
    const b = f[0], npc = owNpcAt(b.map, b.x, b.y), pick = !npc && (b.map.objects || []).find(function (ob) { return ob.type === 'pickup' && ob.x === b.x && ob.y === b.y && o.found.indexOf(ob.id) === -1; });
    if (npc && owNpcActive(npc)) h += owActorHtml('ow-npc', f[1], f[2], g, heroSprite(heroLookColors(npc.look), npc.face, 0));
    else if (pick) h += owActorHtml('ow-pickup', f[1], f[2], g, worldSprite('o-sparkle'));
  });
  if (owTrail && (owTrail.x !== o.x || owTrail.y !== o.y)) h += owActorHtml('ow-follow', owTrail.x - o.x + hx, owTrail.y - o.y + hy, g, owFollowerHtml());
  h += owActorHtml('ow-hero' + (owTileAt(map, o.x, o.y).water ? ' ow-surfing' : ''), hx, hy, g, heroSprite(heroLookColors(), o.face, owFrame));
  view.style.cssText = '--ow-cols:' + g.cols + ';--ow-rows:' + g.rows + ';--ow-tile:' + g.tile.toFixed(2) + 'px;' + owPaletteCss(map.palette);
  view.innerHTML = h;
  view.className = 'ow-view ow-' + owTimeOfDay() + (map.dark ? ' ow-dark' : '');
  if (map.dark) view.style.setProperty('--dark-r', ((hasKeyItem('lamp') ? 5 : 2.6) * g.tile).toFixed(0) + 'px');
  view.setAttribute('aria-label', map.name + ' map');
  document.getElementById('ow-title').innerText = map.name;
  document.getElementById('ow-gizmo-btn').style.display = hasKeyItem('gizmo') ? '' : 'none';
}

// The time of day on this device, with Gold's hours (morning 4-10, day 10-18, night 18-4): the map is tinted, wild buddies change, and the Gizmo's clock says it.
function owTimeOfDay() {
  const h = new Date().getHours();
  return h >= 4 && h < 10 ? 'morning' : h >= 10 && h < 18 ? 'day' : 'night';
}
// Walking warms an egg: every eggEvery steps count as one correct answer, at most eggPerDay a day.
function owWalkEgg() {
  const w = state.overworld.walk;
  if (!state.egg) return;
  if (w.day !== dayKey()) { w.day = dayKey(); w.n = 0; w.eggs = 0; }
  if (++w.n % ECON.overworld.eggEvery !== 0 || w.eggs >= ECON.overworld.eggPerDay) return;
  w.eggs += 1;
  tickEgg();
}

// ----- walking -----
// Gold's Strength: a boulder moves one tile when the hero, holding the Vine Gloves, walks into it, onto free cave floor beyond. Leaving the cave puts it back (rows0), so no push can lock a way for good.
function owPush(map, x, y, d) {
  const bx = x + d[0], by = y + d[1];
  if (!hasKeyItem('vines') || !map.rows[by] || map.rows[by].charAt(bx) !== 'c' || owNpcAt(map, bx, by) || owWarpAt(map, bx, by) || owPickupAt(map, bx, by)) return false;
  map.rows0 = map.rows0 || map.rows.slice();
  const set = function (px, py, ch) { map.rows[py] = map.rows[py].slice(0, px) + ch + map.rows[py].slice(px + 1); };
  set(bx, by, '%'); set(x, y, 'c');
  return true;
}
function owMove(dir) {
  if (!owOpen() || owBusy) return;
  const o = state.overworld, map = OW_MAPS[o.map], d = OW_STEP[dir];
  o.face = dir;
  const nx = o.x + d[0], ny = o.y + d[1];
  if (owTileAt(map, nx, ny).boulder) owPush(map, nx, ny, d);
  const surf = !!owTileAt(map, nx, ny).water && hasKeyItem('water') && !owNpcAt(map, nx, ny) && !owWarpAt(map, nx, ny);      // Gold's Surf: with the Water Steps charm the hero rides over water
  const ledge = dir === 'down' && owTileAt(map, nx, ny).ledge && owWalkable(map, nx, ny + 1) && !owNpcAt(map, nx, ny + 1);      // Gold's ledge: you hop down over it, never up
  if (!ledge && !surf && (!owWalkable(map, nx, ny) || owNpcAt(map, nx, ny))) {          // a wall, a tree, a person or a sign: just turn (people talk, signs tell their words)
    renderOverworld();
    owInteract(map, nx, ny);
    return;
  }
  owTrail = { x: o.x, y: o.y };
  o.x = nx; o.y = ledge ? ny + 1 : ny;
  owFrame = owFrame ? 0 : 1;
  const warp = owWarpAt(map, o.x, o.y);
  if (warp) { if (map.rows0) map.rows = map.rows0.slice(); o.map = warp.to; o.x = warp.tx; o.y = warp.ty; owTrail = null; owSetRegion(OW_MAPS[o.map]); if (o.map === 'tide-sea' && !hasKeyItem('water')) { o.map = 'tide-house'; o.x = 5; o.y = 1; toast('The open sea needs Water Steps, from the Tide Bay Gym.'); } }
  owWalkEgg(); owDaycareStep(); owSafariStep(); if (++owStepsWalked % 50 === 0) addHappy(state.activePet, 1);
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
  else if (owTileAt(here, o.x, o.y).water && owGrassStep()) startAdventureFight(owWaterBuddy(owRodTier()), here.id === 'tide-sea' ? 3 : 0, true);      // water buddies bite while surfing
}
// Space or Enter: talk to or read what the hero faces.
function owInteractFacing() {
  if (owBusy) return;
  const o = state.overworld, d = OW_STEP[o.face];
  owInteract(OW_MAPS[o.map], o.x + d[0], o.y + d[1]);
}
// One step in tall grass: the first graceSteps after a fight are safe, then each step may start a wild fight.
function owGrassStep() {
  if (state.repelSteps > 0) { state.repelSteps -= 1; if (!state.repelSteps) toast('The Repel wore off.'); return false; }
  if (owSafe > 0) { owSafe -= 1; return false; }
  return Math.random() < ECON.overworld.grassChance;
}
// The D-pad: press to step, hold to keep walking. A keyboard "click" (no pointer) steps once.
// How often a held direction steps: walking, with the Running Shoes, or on the Bicycle (Gold's fastest way on foot).
function owStepMs() { return hasKeyItem('bicycle') ? ECON.overworld.bikeMs : hasKeyItem('running-shoes') ? ECON.overworld.shoeMs : ECON.overworld.holdMs; }
function owHold(dir) {
  owPointerUsed = true;
  owRelease();
  owMove(dir);
  owHoldTimer = setTimeout(function () { owHoldTimer = setInterval(function () { owMove(dir); }, owStepMs()); }, 260);
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

window.addEventListener('resize', function () { if (owOpen()) renderOverworld(); });
// Touch or mouse on the map: hold on a side of the hero to walk that way (slide to turn); tap the hero to talk to or read what it faces.
(function owTouch() {
  const view = document.getElementById('ow-view');
  let held = '';
  const dirAt = function (e) {
    const hero = view.querySelector('.ow-hero');
    if (!hero) return '';
    const r = hero.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (Math.abs(dx) < r.width * 0.6 && Math.abs(dy) < r.height * 0.6) return 'talk';
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  };
  const go = function (e) {
    const d = dirAt(e);
    if (d === held) return;
    held = d;
    owRelease();
    if (d === 'talk') owInteractFacing(); else if (d) owHold(d);
  };
  view.addEventListener('pointerdown', function (e) { if (!owOpen()) return; e.preventDefault(); view.setPointerCapture(e.pointerId); go(e); });
  view.addEventListener('pointermove', function (e) { if (held && held !== 'talk') go(e); });
  ['pointerup', 'pointercancel'].forEach(function (k) { view.addEventListener(k, function () { held = ''; owRelease(); }); });
})();

// ----- the window -----
function openAdventure() {
  if (!state.hero.made) { openHeroCreator(); return; }               // the first walk starts with Who are you?
  showAdventureWindow();
}
// The game starts on the Adventure: Who are you? for a new player (then a starter buddy), the map for everyone else. True when it opened.
function adventureBoot() {
  if (window.__noAdventureBoot) return false;
  document.body.classList.add('adv');
  showAdventureWindow();
  if (!state.hero.made) openHeroCreator();
  return true;
}
function showAdventureWindow() {
  showModal('overworld-modal', function () { owSafe = ECON.overworld.graceSteps; owTrail = null; owSetRegion(OW_MAPS[state.overworld.map]); renderOverworld(); });
  renderOverworld();                                              // again once it is on screen, so the tiles fit its real size
}

// ----- a fight that begins on a walk: the Adventure battle screen (24x-ow-battle.js, 24y-ow-arenas.js) -----
// `sp` (optional): the buddy that appears (fishing, a shaken tree); otherwise the usual wild pick.
function startAdventureFight(sp, levelBonus, fished) {
  if (ab) return;
  owRelease();
  if (state.overworld.map === 'safari-zone' && !sp) {                       // the Safari Zone: its own rare buddies, no fighting
    if (!safariActive()) return;
    const w = safariPick();
    abStart({ kind: 'wild', safari: { bait: 0, rock: 0 }, foes: [{ id: w.id, level: clamp(abWildLevel() + rnd(0, 2), 2, MAX_LEVEL), shiny: Math.random() * ECON.shiny.shinyOdds < 1 }] });
    return;
  }
  if (state.overworld.map === 'meadow-park' && !sp) {                       // the park: wild buddies only during the contest, and only while there are Park Balls
    if (!contestActive() || state.contest.balls < 1) return;
    const w = rollWildSpecies([]);
    abStart({ kind: 'wild', contest: true, foes: [{ id: w.id, level: clamp(abWildLevel() + rnd(0, 2), 2, MAX_LEVEL) }] });
    return;
  }
  const roamer = !sp && legendRoamers().find(function (x) { return x.route === state.overworld.map; });
  if (roamer && Math.random() < ECON.legend.encounter) { abStart({ kind: 'wild', foes: [{ id: roamer.legend.id, level: ECON.legend.level }] }); return; }
  const route = sp ? null : owRollRoute(state.overworld.map);
  if (route) { abStart({ kind: 'wild', foes: [{ id: route.id, level: route.level, shiny: Math.random() * ECON.shiny.shinyOdds < 1 }] }); return; }
  sp = sp || rollWildSpecies([]);
  abStart({ kind: 'wild', fished: !!fished, foes: [{ id: sp.id, level: clamp(abWildLevel() + (levelBonus || 0), 2, MAX_LEVEL), shiny: Math.random() * ECON.shiny.shinyOdds < 1 }] });
}
// A trainer on the map battles through the gym-trainer path (uncatchable, pays ECON.map.trainerGems), one buddy of the land's mix, near the buddy's level.
function startTrainerFight(npc) {
  if (ab) return;
  owRelease();
  if (npc.kind === 'boss') { abStartBoss(npc); return; }
  const rematch = phoneReady() === npc.id, foes = [], n = clamp(1 + Math.floor(state.badges.length / 3) + (rematch ? 1 : 0), 1, 3), lvl = abWildLevel() + (npc.levelBonus || 0) + (rematch ? ECON.phone.levels : 0);
  const team = OW_TEAMS[npc.id];
  if (team) { abStart({ kind: 'trainer', name: npc.name, npc: npc, rematch: rematch, foes: team.map(function (t) { return { id: t[0], level: clamp(t[1] + (rematch ? ECON.phone.levels : 0), 2, MAX_LEVEL) }; }) }); return; }
  for (let i = 0; i < n; i++) foes.push({ id: rollWildSpecies(foes.map(function (f) { return f.id; })).id, level: clamp(lvl + rnd(0, 1), 2, MAX_LEVEL) });     // a trainer's buddies are a little above the land's wild ones
  abStart({ kind: 'trainer', name: npc.name, npc: npc, foes: foes, rematch: rematch });
}
// Marks a story beat done; true the first time (the caller pays its prize).
function owStoryDone(id) {
  const s = state.overworld.story;
  if (!id || s.indexOf(id) !== -1) return false;
  s.push(id);
  saveState();
  return true;
}
// A story beat pays no money in Gold (only trainers do, abPrize); a few hand over an item the first time (OW_STORY_ITEMS).
function owStoryReward(id) {
  if (!owStoryDone(id)) return;
  const it = OW_STORY_ITEMS[id];
  const key = OW_STORY_KEYS[id];
  if (key && grantKeyItem(key)) { saveState(); toast('You got the Radio Card!'); }
  if (it) { state.items[it] = Math.min(99, (state.items[it] || 0) + 1); saveState(); toast('You got an Evolution Stone!'); }
}
// One step back the way the hero came (it faces where it was walking), if that tile is free.
function owStepBack() {
  const o = state.overworld, m = OW_MAPS[o.map], d = OW_STEP[OW_OPPOSITE[o.face]], bx = o.x + d[0], by = o.y + d[1];
  if (owWalkable(m, bx, by) && !owNpcAt(m, bx, by) && !owWarpAt(m, bx, by)) { o.x = bx; o.y = by; owTrail = null; saveState(); }
  renderOverworld();
}
