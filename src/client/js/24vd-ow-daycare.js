// =====================================================================
//  THE DAY CARE (Gold's): Keeper Marlo looks after up to two buddies. Each grows a level every ECON.daycare.stepsPerLevel steps you walk, and two of the same
//  type may leave an egg. Taking one back costs gems by the levels it gained. state.daycare = { ids, from, steps, egg, eggReady }.
// =====================================================================
function daycareHas(id) { return state.daycare.ids.indexOf(id) !== -1; }
function daycareCost(id) { const D = ECON.daycare, gained = getBuddyLevel(id) - (state.daycare.from[id] || getBuddyLevel(id)); return D.base + D.perLevel * gained; }
// One step on the map: the buddies grow, and a pair of the same type works on an egg.
function owDaycareStep() {
  const d = state.daycare, D = ECON.daycare;
  if (!d.ids.length) return;
  d.steps += 1;
  if (d.steps % D.stepsPerLevel === 0) d.ids.forEach(function (id) { const lv = getBuddyLevel(id); if (lv < MAX_LEVEL) state.buddyXp[id] = Math.max(getBuddyXp(id), xpForLevel(lv + 1)); });
  if (d.ids.length === 2 && !d.eggReady && daycareCompatible(d.ids[0], d.ids[1]) && ++d.egg >= D.eggSteps) d.eggReady = true;
}
// A pair leaves an egg when they are the same type and one is male, one female (Gold: a genderless buddy never does).
function daycareCompatible(a, b) { const ga = abGenderOf(a), gb = abGenderOf(b); return !!ga && !!gb && ga !== gb && getPetById(a).element === getPetById(b).element; }
function owDaycareTalk(npc, lines) {
  const d = state.daycare, art = heroSprite(heroLookColors(npc.look), 'down', 0), choices = [];
  d.ids.forEach(function (id) {
    const cost = daycareCost(id);
    choices.push({ label: 'Take back ' + getPetById(id).baseName + ' (Lv ' + getBuddyLevel(id) + ', ' + cost + ' gems)', run: function () {
      closeTalk();
      if (state.gems < cost) { soundWrong(); toast('You need ' + (cost - state.gems) + ' more gems.'); return; }
      state.gems -= cost; d.ids = d.ids.filter(function (x) { return x !== id; }); delete d.from[id]; d.egg = 0;
      saveState(); updateStatsUI(); toast(getPetById(id).baseName + ' is back with you!');
    } });
  });
  if (d.eggReady) choices.push({ label: 'Take the egg', run: function () { closeTalk(); if (awardEgg(getPetById(d.ids[0]).element, 'common')) { d.eggReady = false; d.egg = 0; saveState(); } else toast('You already carry an egg. Hatch it first!'); } });
  if (d.ids.length < ECON.daycare.max) choices.push({ label: 'Leave a buddy', run: function () { owDaycareLeave(npc); } });
  openTalk({ name: npc.name, art: art, lines: lines, choices: choices.length ? choices : null });
}
function owDaycareLeave(npc) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0), pool = getOwnedIds().filter(function (id) { return id !== state.activePet && !daycareHas(id); }).sort(function (a, b) { return getBuddyLevel(b) - getBuddyLevel(a); }).slice(0, 5);
  closeTalk();
  if (!pool.length) { openTalk({ name: npc.name, art: art, lines: ['You need another buddy besides your leader. Catch one first!'] }); return; }
  openTalk({ name: npc.name, art: art, lines: ['Which buddy should I look after?'], choices: pool.map(function (id) {
    return { label: getPetById(id).baseName + ' (Lv ' + getBuddyLevel(id) + ')', run: function () {
      closeTalk(); state.daycare.ids.push(id); state.daycare.from[id] = getBuddyLevel(id); state.team = state.team.filter(function (x) { return x !== id; });
      saveState(); toast(getPetById(id).baseName + ' will grow while you walk.');
    } };
  }) });
}
OW_SERVICES.daycare = function (npc) {
  const d = state.daycare;
  owDaycareTalk(npc, d.eggReady ? ['Oh! There is an egg! Your buddies must get along well.']
    : d.ids.length ? ['Your buddies are doing fine. They grow a little every ' + ECON.daycare.stepsPerLevel + ' steps you walk.', 'A male and a female of the same type may even leave an egg.']
    : ['I look after buddies for you. They grow while you walk, up to two at a time.', 'A male and a female of the same type may leave an egg. Taking one back costs ' + ECON.daycare.base + ' gems plus ' + ECON.daycare.perLevel + ' for each level gained.']);
};
