// =====================================================================
//  HELPER PEOPLE in the towns' houses: Prof. Pi (gives the Gizmo), the Net Maker, two Traders, the Day Care keeper and the Move Tutor.
//  They only use what the game already has: ore and craftNet(), spares, the Moves sheet's saved set, and the Ranch tab of the hub.
//  Nobody here costs a thing except the ore or the spare buddy that is named, and nobody can take anything else.
// =====================================================================
owAddNpc('hollow-house', { id: 'hollow-pi', kind: 'gift', gift: 'gizmo', name: 'Prof. Pi', x: 5, y: 2, face: 'down', look: { skin: 1, hair: 0, outfit: 7, style: 0 },
  lines: ['Ah, there you are! I am Professor Pi. I study buddies and numbers, and they go together very well.', 'Take this Gizmo. It travels back to towns you know, keeps your quests, and tells you a math tip each day.'],
  after: ['The Gizmo is in your Bag. Tap the Gizmo button on the map to use it.', 'Go and meet lots of buddies. I would love to hear about them!'] });
owAddNpc('meadow-house', { id: 'meadow-netmaker', kind: 'netmaker', name: 'Net Maker Wren', x: 2, y: 2, face: 'down', look: { skin: 2, hair: 3, outfit: 2, style: 3 },
  lines: ['I weave Catch Nets from the ore your Ranch buddies dig up.'] });
owAddNpc('ember-house', { id: 'ember-trader', kind: 'trade', trade: { give: 'fox', get: 'bunny' }, name: 'Trader Rue', x: 2, y: 2, face: 'down', look: { skin: 3, hair: 2, outfit: 1, style: 2 }, lines: ['Hello, traveller! I love swapping buddies.'] });
owAddNpc('tide-house', { id: 'tide-daycare', kind: 'daycare', name: 'Keeper Marlo', x: 2, y: 2, face: 'down', look: { skin: 0, hair: 4, outfit: 5, style: 1 },
  lines: ['I look after buddies that are resting. They work, play and grow a little every day.', 'The Ranch at home does the same thing, and its Nursery can make an egg.'] });
owAddNpc('grove-house', { id: 'grove-tutor', kind: 'tutor', name: 'Tutor Selene', x: 2, y: 2, face: 'down', look: { skin: 4, hair: 7, outfit: 4, style: 1 }, lines: ['Hello! I teach buddies new moves.'] });
owAddNpc('volt-house', { id: 'volt-trader', kind: 'trade', trade: { give: 'otter', get: 'hedgehog' }, name: 'Trader Kip', x: 2, y: 2, face: 'down', look: { skin: 1, hair: 6, outfit: 0, style: 2 }, lines: ['Hi there! Got a spare buddy to swap?'] });

const OW_SERVICES = {
  netmaker: function (npc) {
    const need = ECON.ranch.orePerNet, art = heroSprite(heroLookColors(npc.look), 'down', 0);
    openTalk({ name: npc.name, art: art, lines: npc.lines.concat(['One net takes ' + need + ' ore. You have ' + ranchHas('ore') + ' ore and ' + state.nets + ' of ' + maxNets() + ' nets.']),
      choices: [{ label: 'Make a Catch Net', run: function () { closeTalk(); if (ranchHas('ore') < need) toast('You need ' + need + ' ore. Your Ranch buddies dig it up!'); else craftNet(); } }] });
  },
  trade: function (npc) {
    const t = npc.trade, give = getSpecies(t.give), get = getSpecies(t.get), art = heroSprite(heroLookColors(npc.look), 'down', 0);
    if (state.overworld.traded.indexOf(npc.id) !== -1) { openTalk({ name: npc.name, art: art, lines: ['Thank you for the trade! My ' + give.name + ' is very happy with its new friend.'] }); return; }
    const lines = ['I am looking for a spare ' + give.name + ', and I would swap it for my ' + get.name + '.', 'A spare is a buddy you caught that you already have.'];
    if (getOwnedIds().indexOf(t.get) !== -1) { openTalk({ name: npc.name, art: art, lines: lines.concat(['But you already have a ' + get.name + '. Come back if you want a different swap!']) }); return; }
    if (spareCount(t.give) < 1) { openTalk({ name: npc.name, art: art, lines: lines.concat(['You do not have a spare ' + give.name + ' yet. Catch one and come back!']) }); return; }
    openTalk({ name: npc.name, art: art, lines: lines, choices: [{ label: 'Swap a spare ' + give.name + ' for ' + get.name, run: function () { closeTalk(); owTrade(npc); } }] });
  },
  daycare: function (npc) {
    openTalk({ name: npc.name, art: heroSprite(heroLookColors(npc.look), 'down', 0), lines: npc.lines,
      choices: [{ label: 'Visit the Ranch', run: function () { closeTalk(); closeOverworld(); hubTab = 'ranch'; openHub(); } }] });
  },
  tutor: function (npc) {
    const pet = getActivePetDisplay(), art = heroSprite(heroLookColors(npc.look), 'down', 0);
    const known = movesLearned(pet.level, pet).filter(function (m) { return m.optional; });
    const lines = ['Buddies learn special moves as they grow. A buddy takes ' + ECON.moves.slots + ' moves into battle, and I can set one up for you.'];
    if (!known.length) { openTalk({ name: npc.name, art: art, lines: lines.concat([pet.name + ' has no extra moves to set up yet. Keep levelling up!']) }); return; }
    openTalk({ name: npc.name, art: art, lines: lines.concat(['Which move should ' + pet.name + ' take into battle?']),
      choices: known.map(function (m) { return { label: moveName(m, pet), run: function () { closeTalk(); owTeach(pet, m); } }; }) });
  }
};

// The swap: one spare goes, the new buddy joins your collection.
function owTrade(npc) {
  const t = npc.trade, sp = getSpecies(t.get);
  if (spareCount(t.give) < 1 || getOwnedIds().indexOf(t.get) !== -1 || state.overworld.traded.indexOf(npc.id) !== -1) return;
  state.spares[t.give] -= 1;
  if (!state.spares[t.give]) delete state.spares[t.give];
  grantBuddy(sp.id);
  (isStoreBuddy(sp) ? state.unlockedPets : state.unlockedSecrets).push(sp.id);
  state.overworld.traded.push(npc.id);
  checkEarnedGear();
  saveState();
  updateStatsUI();
  openTalk({ name: npc.name, art: heroSprite(heroLookColors(npc.look), 'down', 0), lines: ['It is a deal! Say hello to ' + sp.name + '. Look after it!'] });
}

// Puts one of the buddy's optional moves into its battle set (it takes the place of the last move when the set is full).
function owTeach(pet, m) {
  const now = equippedMoves(pet).filter(function (e) { return e.kind !== 'ult'; }).map(function (e) { return e.id; }), art = worldSprite('k-badge-case');
  if (now.indexOf(m.id) === -1) {
    if (now.length >= ECON.moves.slots) now.pop();
    now.push(m.id);
    state.moveSet[pet.id] = now;
    saveState();
  }
  openTalk({ name: 'Move set', art: art, lines: [pet.name + ' will use ' + moveName(m, pet) + ' in battle now.', 'You can change moves any time from the Moves sheet in a fight.'] });
}
