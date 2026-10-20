// =====================================================================
//  THE LANDS: regions (one per type), gyms, badges and a friendly rival. Walking a land makes its type's wild buddies more common (state.region).
//  A gym opens at a buddy level (ECON.map.levels). It is a few trainer battles (the second one is your rival, Riley) and then a leader, a boss of that type (24y-ow-arenas.js).
// =====================================================================
const REGIONS = [
  { id: 'meadow', name: 'Sunny Meadow', icon: '🌼', element: '', gym: true },
  { id: 'ember', name: 'Ember Hills', icon: '🌋', element: 'fire', gym: true },
  { id: 'tide', name: 'Tide Bay', icon: '🌊', element: 'water', gym: true },
  { id: 'grove', name: 'Leaf Grove', icon: '🌳', element: 'nature', gym: true },
  { id: 'volt', name: 'Volt Valley', icon: '⚡', element: 'electric', gym: true },
  { id: 'gloom', name: 'Gloom Marsh', icon: '🌑', element: 'dark', gym: true },
  { id: 'mystic', name: 'Mystic Peak', icon: '🔮', element: 'magic', gym: true },
  { id: 'skyreach', name: 'Skyreach', icon: '☁️', element: '', gym: true },
  // The second journey, beyond the Peak: opens once you are Champion. Its badges are not needed for the Champion's Hall.
  { id: 'cinder', name: 'Cinder Mesa', icon: '🏜️', element: 'fire', gym: true, far: true },
  { id: 'coral', name: 'Coral Reach', icon: '🪸', element: 'water', gym: true, far: true },
  { id: 'thistle', name: 'Thistle Wood', icon: '🌲', element: 'nature', gym: true, far: true },
  { id: 'spark', name: 'Spark City', icon: '🏙️', element: 'electric', gym: true, far: true },
  { id: 'dusk', name: 'Duskhollow', icon: '🌘', element: 'dark', gym: true, far: true },
  { id: 'prism', name: 'Prism Caverns', icon: '💎', element: 'magic', gym: true, far: true },
  { id: 'cross', name: 'Crossroads', icon: '🧭', element: '', gym: true, far: true },
  { id: 'summit', name: 'Summit Citadel', icon: '🏔️', element: '', gym: true, far: true }
];   // every land has a gym; a land with no element (the Meadow, Skyreach, Crossroads and the Citadel) has buddies and a gym leader of every type
const RIVAL = 'Rival Riley';
// The trainers of each land, in battle order: one before Riley, Riley, one after. The list repeats if a gym has more trainers.
const GYM_TRAINERS = {
  meadow: ['Picnicker Daisy', RIVAL, 'Farmer Hazel'],
  ember: ['Scout Mia', RIVAL, 'Ranger Ava'],
  tide:  ['Angler Finn', RIVAL, 'Diver Coral'],
  grove: ['Gardener Fern', RIVAL, 'Ranger Oak'],
  volt:  ['Techie Watt', RIVAL, 'Sparky Zed'],
  gloom: ['Lantern Luna', RIVAL, 'Spooky Sage'],
  mystic: ['Stargazer Iris', RIVAL, 'Mage Orion'],
  skyreach: ['Pilot Wren', RIVAL, 'Cloud Rider Kai'],
  cinder: ['Kiln Worker Brick', RIVAL, 'Glassblower Ember'],
  coral: ['Pearl Diver Opal', RIVAL, 'Lighthouse Keeper Beam'],
  thistle: ['Bug Catcher Moss', RIVAL, 'Forager Bramble'],
  spark: ['Engineer Volt', RIVAL, 'Courier Zip'],
  dusk: ['Night Watch Raven', RIVAL, 'Storyteller Hush'],
  prism: ['Gem Cutter Jade', RIVAL, 'Crystal Seer Quartz'],
  cross: ['Trader Marco', RIVAL, 'Traveller Lyra'],
  summit: ['Ace Trainer Zenith', RIVAL, 'Ace Trainer Apex']
};
function gymTrainer(regionId, step) { const list = GYM_TRAINERS[regionId]; return list[step % list.length]; }
const GYM_STORY = {
  meadow: { intro: ['Sunny Meadow is where every journey starts. The gym stands among the flowers.', 'Riley waves: "Let us both win our first badge!"', 'The gym leader is friendly. Show your best math!'], outro: 'The flowers sway happily. The Meadow Badge is yours! Riley grins: "One down, seven to go!"' },
  ember: { intro: ['The Ember Hills glow orange. A gym stands at the top, hot as a campfire!', 'Riley waves: "Race you to the badge, math champ!"', 'Beat the trainers, then the gym leader!'], outro: 'The flames cool down and the Ember Badge is yours! Riley grins: "Next time I will win!"' },
  tide: { intro: ['Waves splash at Tide Bay. The gym floats on the water!', 'Riley is already there: "My buddy loves the sea!"', 'Stay sharp, the tide is rising!'], outro: 'The waves calm down. The Tide Badge shines in your hand! Riley laughs: "You are getting fast!"' },
  grove: { intro: ['Leaf Grove is quiet and green. The gym hides inside a giant tree.', 'Riley whispers: "Nobody beats the trees at counting rings!"', 'Show them your best math!'], outro: 'Leaves rustle happily. You earned the Grove Badge! Riley says: "I am learning from you!"' },
  volt: { intro: ['Sparks hop between the towers of Volt Valley!', 'Riley: "I practiced my speed. Can you keep up?"', 'The gym leader is lightning quick!'], outro: 'The lights flicker and cheer. The Volt Badge is yours! Riley: "Wow, that was electric!"' },
  gloom: { intro: ['Gloom Marsh is foggy and strange, but you are not afraid!', 'Riley: "Stay close. Shadows cannot beat teamwork!"', 'The gym leader waits in the mist.'], outro: 'The fog lifts. The Gloom Badge glimmers! Riley: "You were brave. I am proud to be your rival!"' },
  mystic: { intro: ['Mystic Peak is at the top of the kingdom, full of floating stars.', 'Riley: "One more gym waits in the sky after this. Do your best!"', 'Magic and math are best friends here.'], outro: 'Stars sparkle all around. The Mystic Badge is yours! Riley hugs the team: "You are the real champion!"' },
  skyreach: { intro: ['Skyreach floats above the clouds. The last gym shines like a second sun.', 'Riley: "This is it! I trained so hard to stand here with you."', 'The gym leader uses every type. Stay sharp!'], outro: 'The clouds part and the Skyreach Badge is yours! Riley smiles: "I did not try to beat you. I tried to keep up. Thank you for the race."' },
  cinder: { intro: ['The Mesa glows red in the sun. The gym is carved into the rock.', 'Riley: "We are in a whole new land. Stay sharp, Champion!"', 'The leader here burns hot. Keep your answers cool!'], outro: 'The kilns cheer. The Cinder Badge is yours!' },
  coral: { intro: ['Coral Reach shimmers under warm shallow water. The gym is a glass dome on the reef.', 'Riley: "My buddy loves it here. Mine, I mean. Not yours. Okay maybe yours too!"', 'Ride the waves of numbers!'], outro: 'The reef lights up. The Coral Badge is yours!' },
  thistle: { intro: ['Thistle Wood is thick with leaves. The gym is a treehouse in the tallest tree.', 'Riley whispers: "Watch your step. Everything here is alive."', 'Grow your math like a vine!'], outro: 'The woods rustle happily. The Thistle Badge is yours!' },
  spark: { intro: ['Spark City hums with power. The gym is a tower of wires and lights.', 'Riley: "Think fast. Think faster!"', 'The leader is a genius of numbers. Show yours!'], outro: 'The city lights flash in cheer. The Spark Badge is yours!' },
  dusk: { intro: ['Duskhollow is always evening. The gym is deep in the quiet dark.', 'Riley: "I am not scared. You are not scared. Nobody is scared."', 'The leader hides in the shadows. Find them with math!'], outro: 'The hollow glows softly. The Dusk Badge is yours!' },
  prism: { intro: ['Prism Caverns sparkle in every colour. The gym is a cathedral of crystal.', 'Riley: "It is so pretty I forgot to be nervous!"', 'Light bends here. Your answers had better not.'], outro: 'The crystals ring like bells. The Prism Badge is yours!' },
  cross: { intro: ['Every road in the world meets at the Crossroads. The gym welcomes every type of buddy.', 'Riley: "Nearly there. One more land after this!"', 'The leader uses every type. Be ready for anything!'], outro: 'The roads all point your way. The Crossroads Badge is yours!' },
  summit: { intro: ['The Summit Citadel is the top of the world. The last gym shines like a crown.', 'Riley: "We came so far. Finish it, partner."', 'This is the hardest gym of all. You have got this!'], outro: 'The whole Citadel rings with applause. The Summit Badge is yours!' }
};

function isChampion() { return !!state.storySeen.champion; }
// The first clear of a land each day pays, up to ECON.map.rematch.perDay lands a day.
function rematchPays(id) {
  const rm = state.rematch;
  return (rm.day !== dayKey() || (rm.lands.indexOf(id) === -1 && rm.lands.length < ECON.map.rematch.perDay));
}
function regionById(id) { return REGIONS.find(function (r) { return r.id === id; }) || REGIONS[0]; }
function currentRegion() { return regionById(state.region); }
function regionLevel(r) { return ECON.map.levels[r.id] || 1; }
function regionUnlocked(r) { return journeyLevel() >= regionLevel(r); }
function hasBadge(id) { return state.badges.indexOf(id) !== -1; }
function gymRegions() { return REGIONS.filter(function (r) { return r.gym && !r.far; }); }          // the first journey's gyms: all of their badges open the Champion's Hall
function allGymRegions() { return REGIONS.filter(function (r) { return r.gym; }); }

// A gym battle was won. Returns the badge result when the leader fell, else null.
function advanceGym(leaderWon) {
  const g = state.gym;
  if (!g) return null;
  const r = regionById(g.region);
  state.gym = null;
  if (g.rematch && hasBadge(r.id)) { state.rematch.wins += 1; return { region: r, rematch: true }; }
  if (hasBadge(r.id)) return null;
  state.badges.push(r.id);
  return { region: r, hall: !r.far && gymRegions().every(function (g) { return hasBadge(g.id); }) };       // the last badge opens the Champion's Hall
}
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
// A new region opens when your journey level (your best buddy, held back if the rest of your team is far behind) reaches its level.
function checkRegionUnlocks() {
  REGIONS.forEach(function (r) {
    if (!r.gym || r.id === 'meadow' || !regionUnlocked(r) || state.storySeen['open_' + r.id]) return;       // the Meadow is open from the start
    state.storySeen['open_' + r.id] = 1;
    toast('🗺️ New land open: ' + r.icon + ' ' + r.name + '! Find it on the map.');
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
      '<div class="comic-panel"><span class="comic-icon">🧢</span><span class="comic-text">Rival Riley grins: "Pick your partner! I\'ll race you to all 8 Gym Badges!"</span></div>' +
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
    if (state.team.length > ECON.team.max) state.team.length = ECON.team.max;
  }
  state.storySeen.starter = 1;
  if (typeof soundBuddyCry === 'function') soundBuddyCry(id, sp.element);
  launchConfetti();
  saveState();
  closeStarterModal();
  toast('🌟 You chose ' + sp.name + ' as your partner! Rival Riley is waiting on the Map!');
}
