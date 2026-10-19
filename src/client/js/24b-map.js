// =====================================================================
//  THE MAP: regions (one per type), gyms, badges, story beats and a friendly rival.
//  A region unlocks at a buddy level (ECON.map.levels). Travelling there makes its type's wild buddies more common.
//  A gym is a few trainer battles (the second one is your rival, Riley) and then a leader, a boss of that type. Trainer buddies cannot be caught.
// =====================================================================
const REGIONS = [
  { id: 'meadow', name: 'Sunny Meadow', icon: '🌼', element: '' },
  { id: 'ember', name: 'Ember Hills', icon: '🌋', element: 'fire' },
  { id: 'tide', name: 'Tide Bay', icon: '🌊', element: 'water' },
  { id: 'grove', name: 'Leaf Grove', icon: '🌳', element: 'nature' },
  { id: 'volt', name: 'Volt Valley', icon: '⚡', element: 'electric' },
  { id: 'gloom', name: 'Gloom Marsh', icon: '🌑', element: 'dark' },
  { id: 'mystic', name: 'Mystic Peak', icon: '🔮', element: 'magic' }
];
const RIVAL = 'Rival Riley';
// The trainers of each land, in battle order: one before Riley, Riley, one after. The list repeats if a gym has more trainers.
const GYM_TRAINERS = {
  ember: ['Scout Mia', RIVAL, 'Ranger Ava'],
  tide:  ['Angler Finn', RIVAL, 'Diver Coral'],
  grove: ['Gardener Fern', RIVAL, 'Ranger Oak'],
  volt:  ['Techie Watt', RIVAL, 'Sparky Zed'],
  gloom: ['Lantern Luna', RIVAL, 'Spooky Sage'],
  mystic: ['Stargazer Iris', RIVAL, 'Mage Orion']
};
const KNOWN_TRAINERS = Object.keys(GYM_TRAINERS).reduce(function (all, k) { return all.concat(GYM_TRAINERS[k]); }, ['']);
function gymTrainer(regionId, step) { const list = GYM_TRAINERS[regionId]; return list[step % list.length]; }
const GYM_STORY = {
  ember: { intro: ['The Ember Hills glow orange. A gym stands at the top, hot as a campfire!', 'Riley waves: "Race you to the badge, math champ!"', 'Beat the trainers, then the gym leader!'], outro: 'The flames cool down and the Ember Badge is yours! Riley grins: "Next time I will win!"' },
  tide: { intro: ['Waves splash at Tide Bay. The gym floats on the water!', 'Riley is already there: "My buddy loves the sea!"', 'Stay sharp, the tide is rising!'], outro: 'The waves calm down. The Tide Badge shines in your hand! Riley laughs: "You are getting fast!"' },
  grove: { intro: ['Leaf Grove is quiet and green. The gym hides inside a giant tree.', 'Riley whispers: "Nobody beats the trees at counting rings!"', 'Show them your best math!'], outro: 'Leaves rustle happily. You earned the Grove Badge! Riley says: "I am learning from you!"' },
  volt: { intro: ['Sparks hop between the towers of Volt Valley!', 'Riley: "I practiced my speed. Can you keep up?"', 'The gym leader is lightning quick!'], outro: 'The lights flicker and cheer. The Volt Badge is yours! Riley: "Wow, that was electric!"' },
  gloom: { intro: ['Gloom Marsh is foggy and strange, but you are not afraid!', 'Riley: "Stay close. Shadows cannot beat teamwork!"', 'The gym leader waits in the mist.'], outro: 'The fog lifts. The Gloom Badge glimmers! Riley: "You were brave. I am proud to be your rival!"' },
  mystic: { intro: ['Mystic Peak is at the top of the kingdom, full of floating stars.', 'Riley: "This is the last gym. Do your best!"', 'Magic and math are best friends here.'], outro: 'Stars sparkle all around. The Mystic Badge is yours! Riley hugs the team: "You are the real champion!"' }
};

// What Riley says in a rematch: the first one, then the others in turn.
const RIVAL_REMATCH = [
  { intro: 'Riley is waiting: "I trained all week, Champion. This time I will win!"', outro: 'Riley sighs, then smiles: "You won again... but I was so close!"' },
  { intro: 'Riley grins: "My buddies learned new tricks just to beat you!"', outro: 'Riley laughs: "Still not enough! Same time next week?"' },
  { intro: 'Riley cracks their knuckles: "Today I am not holding back!"', outro: 'Riley shakes your hand: "You make me a better trainer every time."' }
];
function isChampion() { return !!state.storySeen.champion; }
function rematchLine() { return RIVAL_REMATCH[state.rematch.wins % RIVAL_REMATCH.length]; }
// The first clear of a land each day pays, up to ECON.map.rematch.perDay lands a day.
function rematchPays(id) {
  const rm = state.rematch;
  return (rm.day !== dayKey() || (rm.lands.indexOf(id) === -1 && rm.lands.length < ECON.map.rematch.perDay));
}
function regionById(id) { return REGIONS.find(function (r) { return r.id === id; }) || REGIONS[0]; }
function currentRegion() { return regionById(state.region); }
function regionLevel(r) { return ECON.map.levels[r.id] || 1; }
function regionUnlocked(r) { return getBestLevel() >= regionLevel(r); }
function hasBadge(id) { return state.badges.indexOf(id) !== -1; }
function gymRegions() { return REGIONS.filter(function (r) { return r.element; }); }

// ----- picking the foes of a gym -----
function gymFoeReset() {
  state.bossSwapped = false;
  state.swapUsed = false;
  state.raid = null;
  resetBattleEffects();
  state.bossLevel = bossLevel;
  monsterCurrentHp = getBossMaxHp();
  partyHp = {};
  bossMistakes = 0;
}
function pickGymFoe() {
  if (state.gym.champ) { pickChampionFoe(); return; }
  const g = state.gym, r = regionById(g.region), mine = getBuddyLevel(state.activePet), bonus = g.rematch ? ECON.map.rematch.levels : 0;
  if (g.step < ECON.map.trainers) {
    const sp = pick(wildPool().filter(function (p) { return p.element === r.element; }));
    state.wild.id = sp.id;
    state.wild.trainer = gymTrainer(g.region, g.step);
    state.wild.shiny = false;
    state.wild.legend = false;
    markDexSeen(sp.id);
    bossLevel = clamp(mine + rnd(0, 2) + bonus, 1, MAX_LEVEL);
  } else {
    const cands = monstersList.map(function (_, i) { return i; }).filter(function (i) { return monstersList[i].element === r.element && !monstersList[i].slays && bossAvailable(i); });
    currentMonsterIndex = pick(cands);
    state.currentMonsterIndex = currentMonsterIndex;
    state.wild.id = '';
    state.wild.trainer = '';
    state.wild.shiny = false;
    state.wild.legend = false;
    bossLevel = clamp(mine + rnd(1, 3) + bonus, 1, MAX_LEVEL);
    markBossSeen(currentMonsterIndex);
  }
  gymFoeReset();
}
function inGymLeaderFight() { return !!state.gym && !state.gym.champ && state.gym.step >= ECON.map.trainers && !state.wild.id; }

// A gym battle was won. Returns the badge result when the leader fell, else null.
function advanceGym(leaderWon) {
  const g = state.gym;
  if (!g) return null;
  if (g.champ) return championFell();
  if (!leaderWon) { g.step += 1; return null; }
  const r = regionById(g.region);
  state.gym = null;
  if (g.rematch && hasBadge(r.id)) {
    const rm = state.rematch, pays = rematchPays(r.id);
    if (rm.day !== dayKey()) { rm.day = dayKey(); rm.lands = []; }
    rm.wins += 1;
    if (pays && rm.lands.indexOf(r.id) === -1) { rm.lands.push(r.id); state.gems += ECON.map.rematch.gems; return { region: r, rematch: true, gems: ECON.map.rematch.gems }; }
    return { region: r, rematch: true, gems: 0 };
  }
  if (hasBadge(r.id)) return null;
  state.badges.push(r.id);
  state.gems += ECON.map.badgeGems;
  const badgeStars = (ECON.tech && ECON.tech.badgeStars) || 2;
  state.stars = (state.stars || 0) + badgeStars;
  toast('⭐ Earned ' + badgeStars + ' Star Sparks from Gym Badge! (★ ' + state.stars + ')');
  return { region: r, hall: state.badges.length >= gymRegions().length };       // the sixth badge opens the Champion's Hall
}
function showBadgeStory(res) {
  if (res.champion) { showChampionStory(res); return; }
  if (res.rematch) {
    const line = RIVAL_REMATCH[(state.rematch.wins - 1 + RIVAL_REMATCH.length) % RIVAL_REMATCH.length];
    showStoryModal({ chapter: 'Champion Rematch', title: res.region.icon + ' ' + res.region.name + ' cleared again!', panels: [{ icon: '🧢', text: line.outro }, { icon: '💎', text: res.gems ? 'Rematch reward: +' + res.gems + ' gems!' : 'No more rematch rewards today, but come back tomorrow!' }], note: 'Rematches won: ' + state.rematch.wins, btn: 'Hooray!', cleared: true });
    return;
  }
  const st = GYM_STORY[res.region.id];
  const panels = [{ icon: '🏅', text: st.outro }, { icon: '💎', text: 'Badge reward: +' + ECON.map.badgeGems + ' gems!' }];
  if (res.hall) panels.push({ icon: '👑', text: "All six badges! The Champion's Hall is open: find it at the top of the Map." });
  showStoryModal({ chapter: 'Badge ' + state.badges.length + '/' + gymRegions().length, title: res.region.icon + ' ' + res.region.name + ' Badge!', panels: panels, note: 'Badges: ' + state.badges.length + ' of ' + gymRegions().length, btn: 'Hooray!', cleared: true });
}

// ----- the map window -----
function openMap() { showModal('map-modal', renderMap); }
function closeMap() { hideModal('map-modal', updateStatsUI); }
function markRegionVisited(id) {
  if (!state.regionsVisited) state.regionsVisited = ['meadow'];
  if (id && state.regionsVisited.indexOf(id) === -1) state.regionsVisited.push(id);
}
function getVisitedKingdomsCount() {
  const visited = (state.regionsVisited || ['meadow']).slice();
  if (state.region && visited.indexOf(state.region) === -1) visited.push(state.region);
  if (Array.isArray(state.badges)) {
    state.badges.forEach(function (b) {
      if (visited.indexOf(b) === -1) visited.push(b);
    });
  }
  return REGIONS.filter(function (r) { return visited.indexOf(r.id) !== -1; }).length;
}
function travelTo(id) {
  const r = regionById(id);
  if (!regionUnlocked(r)) { soundWrong(); toast('🔒 Reach level ' + regionLevel(r) + ' to visit ' + r.name); return; }
  if (state.gym && (state.gym.champ || state.gym.region !== id)) { soundWrong(); toast('Finish or leave the gym first'); return; }
  state.region = id;
  markRegionVisited(id);
  soundClick();
  saveState();
  renderMap();
  updateStatsUI();
}
function startGym(id) {
  const r = regionById(id);
  const rematch = hasBadge(id);
  if (!r.element || !regionUnlocked(r) || (rematch && !isChampion()) || state.gym) return;
  state.region = id;
  markRegionVisited(id);
  state.gym = rematch ? { region: id, step: 0, rematch: true } : { region: id, step: 0 };
  closeMap();
  pickGymFoe();
  setBossTaunt();
  updateStatsUI();
  saveState();
  const st = GYM_STORY[id];
  if (rematch) {
    enqueueModal(function () {
      showStoryModal({ chapter: 'Champion Rematch', title: r.icon + ' Rematch at ' + r.name, panels: [{ icon: '🏟️', text: 'The ' + r.name + ' gym welcomes the Champion back. The trainers and the leader are stronger now!' }, { icon: '🧢', text: rematchLine().intro }, { icon: '💎', text: rematchPays(id) ? 'The first clear of a land each day pays +' + ECON.map.rematch.gems + ' gems.' : 'Today\'s rewards are done, but the fights are still great practice!' }], note: ECON.map.trainers + ' trainers, then the gym leader.', btn: '⚔️ To battle!' });
    });
    return;
  }
  enqueueModal(function () {
    showStoryModal({ chapter: r.name + ' Gym', title: r.icon + ' The ' + r.name + ' Gym', panels: st.intro.map(function (t, i) { return { icon: ['🏟️', '🧢', '⚔️'][i] || '⭐', text: t }; }), note: ECON.map.trainers + ' trainers, then the gym leader. Trainer buddies cannot be caught.', btn: '⚔️ To battle!' });
  });
}
function leaveGym() {
  if (!state.gym) return;
  state.gym = null;
  pickNextFoe();
  setBossTaunt();
  updateStatsUI();
  saveState();
  toast('You left the gym. Come back any time!');
  renderMap();
}
function renderMap() {
  document.getElementById('map-title').innerText = '🗺️ ' + triviaWords('Number Kingdom') + ' Map';
  const best = getBestLevel(), total = gymRegions().length;
  const myPet = getActivePetDisplay();
  document.getElementById('map-progress').innerText = '🏅 Badges ' + state.badges.length + '/' + total + ' · 📍 ' + currentRegion().name + (state.storySeen.champion ? ' · 🏆 Champion' : '');
  let h = '<div class="map-board">' + championRowHtml() + legendRowHtml();
  REGIONS.forEach(function (r) {
    const open = regionUnlocked(r), here = state.region === r.id, g = state.gym && state.gym.region === r.id;
    const need = regionLevel(r), badge = hasBadge(r.id);
    let actions = '';
    if (!open) actions = '<div class="d">🔒 Reach Lv ' + need + ' (your best: Lv ' + best + ')</div>';
    else {
      actions = '<button class="claim-btn" ' + (here ? 'disabled' : '') + ' onclick="travelTo(&quot;' + r.id + '&quot;)">' + (here ? '📍 Here' : 'Travel') + '</button>';
      if (r.element) {
        if (badge && g) actions += '<button class="claim-btn" onclick="leaveGym()">Leave rematch (' + state.gym.step + '/' + (ECON.map.trainers + 1) + ')</button>';
        else if (badge) actions += '<span class="map-badge" title="Badge earned">🏅</span>' + (isChampion() ? '<button class="claim-btn" ' + (state.gym ? 'disabled' : '') + ' onclick="startGym(&quot;' + r.id + '&quot;)">🔁 Rematch</button>' : '');
        else if (g) actions += '<button class="claim-btn" onclick="leaveGym()">Leave gym (' + state.gym.step + '/' + (ECON.map.trainers + 1) + ')</button>';
        else actions += '<button class="claim-btn" ' + (state.gym ? 'disabled' : '') + ' onclick="startGym(&quot;' + r.id + '&quot;)">🏟️ Gym</button>';
      }
    }
    const desc = r.element ? 'More ' + r.element + ' buddies · gym leader: a ' + r.element + ' boss' : 'Buddies of every type';
    let trail = '';
    if (open && r.element) {
      const nodes = [
        { icon: '🌿', lbl: 'Tall Grass' },
        { icon: '🧒', lbl: gymTrainer(r.id, 0) },
        { icon: '🧢', lbl: 'Rival Riley' },
        { icon: '🧭', lbl: gymTrainer(r.id, 2) },
        { icon: '🏰', lbl: 'Gym Leader' }
      ];
      const activeIdx = g ? Math.min(nodes.length - 1, state.gym.step + 1) : (here ? 0 : -1);
      trail = '<div class="map-trail-nodes">';
      nodes.forEach(function (nd, idx) {
        const done = badge || (g && idx > 0 && idx <= state.gym.step);
        const cur = idx === activeIdx;
        if (idx > 0) trail += '<div class="map-node-link' + (done ? ' done' : '') + '"></div>';
        trail += '<div class="map-step-node' + (done ? ' done' : '') + (cur ? ' active' : '') + '">' +
          '<div class="map-node-dot">' + (cur ? '<span class="map-player-token" title="You are here">' + myPet.icon + '</span>' : '') + nd.icon + '</div>' +
          '<span class="map-node-lbl">' + nd.lbl + '</span></div>';
      });
      trail += '</div>';
    } else if (open && !r.element && here) {
      trail = '<div class="map-trail-nodes"><div class="map-step-node active"><div class="map-node-dot"><span class="map-player-token">' + myPet.icon + '</span>🌼</div><span class="map-node-lbl">Meadow Trail</span></div></div>';
    }
    h += '<div class="care-row map-row' + (here ? ' here' : '') + (open ? '' : ' locked') + '" style="flex-direction:column; align-items:stretch;"><div style="display:flex; justify-content:space-between; align-items:center; gap:8px;"><div><div class="t">' + r.icon + ' ' + r.name + (r.element ? ' <span class="element-pill elem-' + r.element + '">' + r.element + '</span>' : '') + '</div><div class="d">' + desc + '</div></div><div class="map-actions">' + actions + '</div></div>' + trail + '</div>';
  });
  h += '</div>';
  document.getElementById('map-body').innerHTML = h;
  if (!state.storySeen.map) {
    state.storySeen.map = 1;
    saveState();
    showStoryModal({ chapter: 'The Journey', title: '🗺️ The Number Kingdom Map', panels: [
      { icon: '🗺️', text: 'The Number Kingdom has six lands, one for each type of buddy.' },
      { icon: '🏟️', text: 'Each land has a gym. Beat its trainers and its leader to win a badge!' },
      { icon: '🧢', text: 'Your friendly rival Riley is on the same journey. Collect all six badges to open the Champion\'s Hall!' }], note: 'Lands open as your buddies get stronger.', btn: "Let's go!" });
  }
}
// A new region opens when your best buddy reaches its level.
function checkRegionUnlocks() {
  REGIONS.forEach(function (r) {
    if (!r.element || !regionUnlocked(r) || state.storySeen['open_' + r.id]) return;
    state.storySeen['open_' + r.id] = 1;
    toast('🗺️ New land open: ' + r.icon + ' ' + r.name + '! Check the Map.');
  });
}

// =====================================================================
//  CHOOSE YOUR STARTER (3-Panel Adventure Comic + Fire/Water/Nature Pick)
// =====================================================================
const STARTER_CHOICES = [
  { id: 'fox', element: 'fire', badge: '🔥 Fire Starter', role: 'Striker · +20% Attack' },
  { id: 'otter', element: 'water', badge: '🌊 Water Starter', role: 'Scholar · +25% XP' },
  { id: 'dog', element: 'nature', badge: '🌿 Nature Starter', role: 'Lucky · +25% Gems' }
];
function openStarterModal() {
  showModal('starter-modal', renderStarterModal);
}
function closeStarterModal() {
  hideModal('starter-modal', updateStatsUI);
}
function renderStarterModal() {
  const body = document.getElementById('starter-body');
  if (!body) return;
  body.innerHTML =
    '<div class="comic" style="margin-bottom:8px;">' +
      '<div class="comic-panel"><span class="comic-icon">🗺️</span><span class="comic-text">Welcome to the Number Kingdom! Every math problem powers up your buddy.</span></div>' +
      '<div class="comic-panel"><span class="comic-icon">🧢</span><span class="comic-text">Rival Riley grins: "Pick your partner! I\'ll race you to all 6 Gym Badges!"</span></div>' +
      '<div class="comic-panel"><span class="comic-icon">⚡</span><span class="comic-text">Choose a Fire, Water, or Nature starter buddy to begin your quest:</span></div>' +
    '</div>' +
    '<div id="starter-choices-row" style="display:flex; gap:6px;"></div>';
  const row = document.getElementById('starter-choices-row');
  STARTER_CHOICES.forEach(function (ch) {
    const sp = getSpecies(ch.id) || storePets[0];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'claim-btn';
    btn.style.cssText = 'flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; padding:8px 6px; border-radius:12px;';
    btn.setAttribute('aria-label', 'Choose ' + sp.name + ' (' + ch.element + ' starter)');
    btn.innerHTML = '<span style="font-size:1.9rem; line-height:1;">' + sp.icon + '</span>' +
      '<b style="font-size:0.78rem;">' + sp.name + '</b>' +
      '<span class="element-pill elem-' + ch.element + '" style="font-size:0.56rem;">' + ch.badge + '</span>' +
      '<small style="font-size:0.55rem; opacity:0.85;">' + ch.role + '</small>';
    btn.onclick = function () { chooseStarter(ch.id); };
    row.appendChild(btn);
  });
}
function chooseStarter(id) {
  const sp = getSpecies(id);
  if (!sp) return;
  if (state.unlockedPets.indexOf(id) === -1) state.unlockedPets.push(id);
  grantBuddy(id);
  state.activePet = id;
  if (Array.isArray(state.team) && state.team.indexOf(id) === -1) {
    state.team.unshift(id);
    if (state.team.length > 3) state.team.length = 3;
  }
  state.storySeen.starter = 1;
  if (state.profile && state.profile.showcase.indexOf(id) === -1) {
    state.profile.showcase.unshift(id);
    if (state.profile.showcase.length > ECON.profile.maxShowcase) state.profile.showcase.length = ECON.profile.maxShowcase;
  }
  if (typeof soundBuddyCry === 'function') soundBuddyCry(id, sp.element);
  launchConfetti();
  saveState();
  closeStarterModal();
  toast('🌟 You chose ' + sp.icon + ' ' + sp.name + ' as your partner! Rival Riley is waiting on the Map!');
}
