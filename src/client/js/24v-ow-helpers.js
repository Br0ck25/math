// =====================================================================
//  HELPER PEOPLE in the towns' houses: Prof. Pi (gives the Gizmo), the Net Maker, two Traders, the Day Care keeper and the Move Tutor.
//  They only use what the game already has: ore and craftNet(), spares, the Moves sheet's saved set, and the Ranch tab of the hub.
//  Nobody here costs a thing except the ore or the spare buddy that is named, and nobody can take anything else.
// =====================================================================
owAddNpc('hollow-house', { id: 'hollow-pi', kind: 'gift', gift: 'gizmo', name: 'Prof. Pi', x: 5, y: 2, face: 'down', look: { skin: 1, hair: 0, outfit: 7, style: 0 },
  lines: ['Ah, there you are! I am Professor Pi. I study buddies and numbers, and they go together very well.', 'Take this Gizmo. It travels back to towns you know, and tells you a math tip each day.'],
  after: ['The Gizmo is in your Bag. Tap the Gizmo button on the map to use it.', 'Go and meet lots of buddies. I would love to hear about them!'] });
owAddNpc('meadow-house', { id: 'meadow-netmaker', kind: 'talk', name: 'Weaver Wren', x: 2, y: 2, face: 'down', look: { skin: 2, hair: 3, outfit: 2, style: 3 },
  lines: ['I weave Catch Nets. Buy them at the Mart and keep a few for the tall grass!'] });
owAddNpc('ember-house', { id: 'ember-trader', kind: 'trade', trade: { give: 'fox', get: 'bunny' }, name: 'Trader Rue', x: 2, y: 2, face: 'down', look: { skin: 3, hair: 2, outfit: 1, style: 2 }, lines: ['Hello, traveller! I love swapping buddies.'] });
owAddNpc('tide-house', { id: 'tide-daycare', kind: 'daycare', name: 'Keeper Marlo', x: 2, y: 2, face: 'down', look: { skin: 0, hair: 4, outfit: 5, style: 1 }, lines: ['Welcome to the Day Care!'] });
owAddNpc('mystic-house', { id: 'mystic-linktrader', kind: 'linktrader', name: 'Link Trader Orbit', x: 2, y: 2, face: 'down', look: { skin: 2, hair: 1, outfit: 3, style: 2 }, lines: ['Some buddies only reach their last form after a trade.', 'I swap them with a friend across the sea and bring them straight back. Same buddy, new strength!'] });
owAddNpc('grove-house', { id: 'grove-tutor', kind: 'tutor', name: 'Tutor Selene', x: 2, y: 2, face: 'down', look: { skin: 4, hair: 7, outfit: 4, style: 1 }, lines: ['Hello! I teach buddies new moves.'] });
owAddNpc('volt-house', { id: 'volt-trader', kind: 'trade', trade: { give: 'otter', get: 'hedgehog' }, name: 'Trader Kip', x: 2, y: 2, face: 'down', look: { skin: 1, hair: 6, outfit: 0, style: 2 }, lines: ['Hi there! Got a spare buddy to swap?'] });

const OW_SERVICES = {
  linktrader: function (npc) {
    const art = heroSprite(heroLookColors(npc.look), 'down', 0), pool = TRADE_EVOLVERS.filter(function (id) { return getOwnedIds().indexOf(id) !== -1 && !state.tradedUp[id]; });
    if (!pool.length) { openTalk({ name: npc.name, art: art, lines: npc.lines.concat([getOwnedIds().some(function (id) { return TRADE_EVOLVERS.indexOf(id) !== -1; }) ? 'Everything you have has already been traded. Wonderful!' : 'Bring me Spike, Pascal, Tank or Dusty and I will trade them for you.']) }); return; }
    openTalk({ name: npc.name, art: art, lines: npc.lines, choices: pool.map(function (id) {
      return { label: 'Trade ' + getPetById(id).baseName, run: function () {
        closeTalk(); state.tradedUp[id] = 1; saveState(); updateStatsUI();
        const now = getPetById(id);
        openTalk({ name: npc.name, art: art, lines: ['Here it is, back from the trade!', now.stage > 1 ? 'Oh! It evolved into ' + now.name + '!' : 'It is stronger inside now. At level ' + getSpecies(id).forms[2].minLevel + ' it will evolve!'] });
      } };
    }) });
  },
  trade: function (npc) {
    const t = npc.trade, give = getSpecies(t.give), get = getSpecies(t.get), art = heroSprite(heroLookColors(npc.look), 'down', 0);
    if (state.overworld.traded.indexOf(npc.id) !== -1) { openTalk({ name: npc.name, art: art, lines: ['Thank you for the trade! My ' + give.name + ' is very happy with its new friend.'] }); return; }
    const lines = ['I am looking for a spare ' + give.name + ', and I would swap it for my ' + get.name + '.', 'A spare is a buddy you caught that you already have.'];
    if (getOwnedIds().indexOf(t.get) !== -1) { openTalk({ name: npc.name, art: art, lines: lines.concat(['But you already have a ' + get.name + '. Come back if you want a different swap!']) }); return; }
    if (spareCount(t.give) < 1) { openTalk({ name: npc.name, art: art, lines: lines.concat(['You do not have a spare ' + give.name + ' yet. Catch one and come back!']) }); return; }
    openTalk({ name: npc.name, art: art, lines: lines, choices: [{ label: 'Swap a spare ' + give.name + ' for ' + get.name, run: function () { closeTalk(); owTrade(npc); } }] });
  },
  tutor: function (npc) {
    const pet = abPartyMon(state.activePet), art = heroSprite(heroLookColors(npc.look), 'down', 0), have = pet.moves.map(function (m) { return m.id; });
    const spare = abKnownMoves(pet.element, pet.level, pet.type).filter(function (m) { return have.indexOf(m.id) === -1; });
    const lines = ['A buddy takes four moves into battle. I can teach ' + pet.name + ' any move it has learned before.'];
    if (!spare.length) { openTalk({ name: npc.name, art: art, lines: lines.concat([pet.name + ' has no other moves to learn yet. Keep levelling up!']) }); return; }
    openTalk({ name: npc.name, art: art, lines: lines.concat(['Which move should ' + pet.name + ' learn?']),
      choices: spare.slice(0, 4).map(function (m) { return { label: m.name + ' (power ' + m.power + ')', run: function () { closeTalk(); owTutorForget(npc, pet, m); } }; }) });
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

// Which of the four moves does the new one replace?
function owTutorForget(npc, pet, m) {
  openTalk({ name: npc.name, art: heroSprite(heroLookColors(npc.look), 'down', 0), lines: ['Which move should ' + pet.name + ' forget to learn ' + m.name + '?'],
    choices: pet.moves.map(function (old, i) { return { label: 'Forget ' + old.name, run: function () { closeTalk(); owTeach(pet, m, i); } }; }) });
}
// The move is learned in place of the one forgotten.
function owTeach(pet, m, i) {
  const ids = pet.moves.map(function (x) { return x.id; });
  ids[i] = m.id;
  state.advMoves[pet.id] = ids;
  saveState();
  openTalk({ name: 'Move set', art: worldSprite('k-badge-case'), lines: [pet.name + ' forgot ' + pet.moves[i].name + ' and learned ' + m.name + '!'] });
}
