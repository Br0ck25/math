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
const GYM_TRAINERS = ['Scout Mia', RIVAL, 'Ranger Ava'];       // in battle order; the list repeats if a gym has more trainers
const KNOWN_TRAINERS = GYM_TRAINERS.concat(['']);
const GYM_STORY = {
  ember: { intro: ['The Ember Hills glow orange. A gym stands at the top, hot as a campfire!', 'Riley waves: "Race you to the badge, math champ!"', 'Beat the trainers, then the gym leader!'], outro: 'The flames cool down and the Ember Badge is yours! Riley grins: "Next time I will win!"' },
  tide: { intro: ['Waves splash at Tide Bay. The gym floats on the water!', 'Riley is already there: "My buddy loves the sea!"', 'Stay sharp, the tide is rising!'], outro: 'The waves calm down. The Tide Badge shines in your hand! Riley laughs: "You are getting fast!"' },
  grove: { intro: ['Leaf Grove is quiet and green. The gym hides inside a giant tree.', 'Riley whispers: "Nobody beats the trees at counting rings!"', 'Show them your best math!'], outro: 'Leaves rustle happily. You earned the Grove Badge! Riley says: "I am learning from you!"' },
  volt: { intro: ['Sparks hop between the towers of Volt Valley!', 'Riley: "I practiced my speed. Can you keep up?"', 'The gym leader is lightning quick!'], outro: 'The lights flicker and cheer. The Volt Badge is yours! Riley: "Wow, that was electric!"' },
  gloom: { intro: ['Gloom Marsh is foggy and strange, but you are not afraid!', 'Riley: "Stay close. Shadows cannot beat teamwork!"', 'The gym leader waits in the mist.'], outro: 'The fog lifts. The Gloom Badge glimmers! Riley: "You were brave. I am proud to be your rival!"' },
  mystic: { intro: ['Mystic Peak is at the top of the kingdom, full of floating stars.', 'Riley: "This is the last gym. Do your best!"', 'Magic and math are best friends here.'], outro: 'Stars sparkle all around. The Mystic Badge is yours! Riley hugs the team: "You are the real champion!"' }
};

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
  const g = state.gym, r = regionById(g.region), mine = getBuddyLevel(state.activePet);
  if (g.step < ECON.map.trainers) {
    const sp = pick(wildPool().filter(function (p) { return p.element === r.element; }));
    state.wild.id = sp.id;
    state.wild.trainer = GYM_TRAINERS[g.step % GYM_TRAINERS.length];
    state.wild.shiny = false;
    markDexSeen(sp.id);
    bossLevel = clamp(mine + rnd(0, 2), 1, MAX_LEVEL);
  } else {
    const cands = monstersList.map(function (_, i) { return i; }).filter(function (i) { return monstersList[i].element === r.element && !monstersList[i].slays && bossAvailable(i); });
    currentMonsterIndex = pick(cands);
    state.currentMonsterIndex = currentMonsterIndex;
    state.wild.id = '';
    state.wild.trainer = '';
    state.wild.shiny = false;
    bossLevel = clamp(mine + rnd(1, 3), 1, MAX_LEVEL);
    markBossSeen(currentMonsterIndex);
  }
  gymFoeReset();
}
function inGymLeaderFight() { return !!state.gym && state.gym.step >= ECON.map.trainers && !state.wild.id; }

// A gym battle was won. Returns the badge result when the leader fell, else null.
function advanceGym(leaderWon) {
  const g = state.gym;
  if (!g) return null;
  if (!leaderWon) { g.step += 1; return null; }
  const r = regionById(g.region);
  state.gym = null;
  if (hasBadge(r.id)) return null;
  state.badges.push(r.id);
  state.gems += ECON.map.badgeGems;
  const champion = state.badges.length >= gymRegions().length && !state.storySeen.champion;
  if (champion) { state.storySeen.champion = 1; state.gems += ECON.map.championGems; }
  return { region: r, champion: champion };
}
function showBadgeStory(res) {
  const st = GYM_STORY[res.region.id];
  const panels = [{ icon: '🏅', text: st.outro }, { icon: '💎', text: 'Badge reward: +' + ECON.map.badgeGems + ' gems!' }];
  if (res.champion) panels.push({ icon: '🏆', text: 'All badges! You are the Number Kingdom Champion! +' + ECON.map.championGems + ' gems!' });
  showStoryModal({ chapter: 'Badge ' + state.badges.length + '/' + gymRegions().length, title: res.region.icon + ' ' + res.region.name + ' Badge!', panels: panels, note: 'Badges: ' + state.badges.length + ' of ' + gymRegions().length, btn: 'Hooray!', cleared: true });
}

// ----- the map window -----
function openMap() { showModal('map-modal', renderMap); }
function closeMap() { hideModal('map-modal', updateStatsUI); }
function travelTo(id) {
  const r = regionById(id);
  if (!regionUnlocked(r)) { soundWrong(); toast('🔒 Reach level ' + regionLevel(r) + ' to visit ' + r.name); return; }
  if (state.gym && state.gym.region !== id) { soundWrong(); toast('Finish or leave the gym first'); return; }
  state.region = id;
  soundClick();
  saveState();
  renderMap();
  updateStatsUI();
}
function startGym(id) {
  const r = regionById(id);
  if (!r.element || !regionUnlocked(r) || hasBadge(id) || state.gym) return;
  state.region = id;
  state.gym = { region: id, step: 0 };
  closeMap();
  pickGymFoe();
  setBossTaunt();
  updateStatsUI();
  saveState();
  const st = GYM_STORY[id];
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
  const best = getBestLevel(), total = gymRegions().length;
  document.getElementById('map-progress').innerText = '🏅 Badges ' + state.badges.length + '/' + total + ' · 📍 ' + currentRegion().name + (state.storySeen.champion ? ' · 🏆 Champion' : '');
  let h = '';
  REGIONS.forEach(function (r) {
    const open = regionUnlocked(r), here = state.region === r.id, g = state.gym && state.gym.region === r.id;
    const need = regionLevel(r);
    let actions = '';
    if (!open) actions = '<div class="d">🔒 Reach Lv ' + need + ' (your best: Lv ' + best + ')</div>';
    else {
      actions = '<button class="claim-btn" ' + (here ? 'disabled' : '') + ' onclick="travelTo(&quot;' + r.id + '&quot;)">' + (here ? '📍 Here' : 'Travel') + '</button>';
      if (r.element) {
        if (hasBadge(r.id)) actions += '<span class="map-badge" title="Badge earned">🏅</span>';
        else if (g) actions += '<button class="claim-btn" onclick="leaveGym()">Leave gym (' + state.gym.step + '/' + (ECON.map.trainers + 1) + ')</button>';
        else actions += '<button class="claim-btn" ' + (state.gym ? 'disabled' : '') + ' onclick="startGym(&quot;' + r.id + '&quot;)">🏟️ Gym</button>';
      }
    }
    const desc = r.element ? 'More ' + r.element + ' buddies · gym leader: a ' + r.element + ' boss' : 'Buddies of every type';
    h += '<div class="care-row map-row' + (here ? ' here' : '') + (open ? '' : ' locked') + '"><div><div class="t">' + r.icon + ' ' + r.name + (r.element ? ' <span class="element-pill elem-' + r.element + '">' + r.element + '</span>' : '') + '</div><div class="d">' + desc + '</div></div><div class="map-actions">' + actions + '</div></div>';
  });
  document.getElementById('map-body').innerHTML = h;
  if (!state.storySeen.map) {
    state.storySeen.map = 1;
    saveState();
    showStoryModal({ chapter: 'The Journey', title: '🗺️ The Number Kingdom Map', panels: [
      { icon: '🗺️', text: 'The Number Kingdom has six lands, one for each type of buddy.' },
      { icon: '🏟️', text: 'Each land has a gym. Beat its trainers and its leader to win a badge!' },
      { icon: '🧢', text: 'Your friendly rival Riley is on the same journey. Collect all six badges to become Champion!' }], note: 'Lands open as your buddies get stronger.', btn: "Let's go!" });
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
