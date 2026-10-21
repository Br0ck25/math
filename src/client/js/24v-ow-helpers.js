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
    const spare = abKnownMoves(pet.element, pet.level, pet.type, pet.id).filter(function (m) { return have.indexOf(m.id) === -1; });
    const tms = Object.keys(state.tms).filter(function (t) { return AB_TMS[t] && (!AB_TMS[t].el || AB_TMS[t].el === pet.element) && abKnownMoves(pet.element, 100, pet.type, pet.id).every(function (m) { return m.id !== t; }); });
    const lines = ['A buddy takes four moves into battle. I can teach ' + pet.name + ' any move it has learned before, and any TM you carry.'];
    if (!spare.length && !tms.length) { openTalk({ name: npc.name, art: art, lines: lines.concat([pet.name + ' has no other moves to learn yet. Keep levelling up!']) }); return; }
    const list = spare.slice(0, 3).map(function (m) { return { label: m.name + (m.fx ? ' (status)' : ' (power ' + m.power + ')'), run: function () { closeTalk(); owTutorForget(npc, pet, m); } }; })
      .concat(tms.slice(0, 3).map(function (t) { const m = abTmMove(t, pet.element, pet.type); return { label: 'TM ' + m.name + ' (power ' + m.power + ')', run: function () { closeTalk(); delete state.tms[t]; state.tmKnown[pet.id] = (state.tmKnown[pet.id] || []).concat(t); saveState(); owTutorForget(npc, pet, m); } }; }));
    openTalk({ name: npc.name, art: art, lines: lines.concat(['Which move should ' + pet.name + ' learn?']), choices: list });
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
  state.fromTrade[sp.id] = 1;
  saveState();
  updateStatsUI();
  openTalk({ name: npc.name, art: heroSprite(heroLookColors(npc.look), 'down', 0), lines: ['It is a deal! Say hello to ' + sp.name + '. Look after it!'] });
}

// Which of the four moves does the new one replace?
function owTutorForget(npc, pet, m) {
  if (pet.moves.length < 4) { owTeach(pet, m, pet.moves.length); return; }
  openTalk({ name: npc.name, art: heroSprite(heroLookColors(npc.look), 'down', 0), lines: ['Which move should ' + pet.name + ' forget to learn ' + m.name + '?'],
    choices: pet.moves.map(function (old, i) { return { label: 'Forget ' + old.name, run: function () { closeTalk(); owTeach(pet, m, i); } }; }) });
}
// The move is learned in place of the one forgotten.
function owTeach(pet, m, i) {
  const ids = pet.moves.map(function (x) { return x.id; });
  ids[i] = m.id;
  state.advMoves[pet.id] = ids;
  saveState();
  openTalk({ name: 'Move set', art: worldSprite('k-badge-case'), lines: [i < pet.moves.length ? pet.name + ' forgot ' + pet.moves[i].name + ' and learned ' + m.name + '!' : pet.name + ' learned ' + m.name + '!'] });
}
owAddNpc('volt-house', { id: 'volt-cyclist', kind: 'gift', gift: 'bicycle', name: 'Cyclist Ray', x: 5, y: 2, face: 'down', look: { skin: 2, hair: 6, outfit: 3, style: 2 }, lines: ['I ride all day through Volt Valley!', 'You walk everywhere? Take my spare Bicycle!'], after: ['Hold a direction on the map to ride. Ride safe!'] });
owAddNpc('ember-house', { id: 'ember-dowser', kind: 'gift', gift: 'itemfinder', name: 'Dowser Fen', x: 5, y: 2, face: 'down', look: { skin: 1, hair: 3, outfit: 6, style: 0 }, lines: ['I find things that nobody sees!', 'Take my Itemfinder. Hidden finds sparkle when you are close.'], after: ['Walk about and watch for sparkles. Some finds hide on every route!'] });
// Kurt (Gold's Apricorn ball maker): two Apricorns from the route trees make one special net.
const KURT_NETS = [['levelnet', 'Level Net'], ['fastnet', 'Fast Net'], ['lurenet', 'Lure Net'], ['friendnet', 'Friend Net']];
OW_SERVICES.kurt = function (npc) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0), cost = ECON.overworld.kurtApricorns;
  openTalk({ name: npc.name, art: art, lines: ['I make special nets from Apricorns. ' + cost + ' Apricorns make one. You have ' + (state.items.apricorn || 0) + '.'], choices: KURT_NETS.map(function (n) {
    return { label: n[1], run: function () {
      closeTalk();
      if ((state.items.apricorn || 0) < cost) { soundWrong(); openTalk({ name: npc.name, art: art, lines: ['You need ' + cost + ' Apricorns. Shake the trees on the routes!'] }); return; }
      state.items.apricorn -= cost; if (!state.items.apricorn) delete state.items.apricorn;
      state.items[n[0]] = Math.min(99, (state.items[n[0]] || 0) + 1); saveState();
      openTalk({ name: npc.name, art: art, lines: ['Here is your ' + n[1] + '!'] });
    } };
  }) });
};
owAddNpc('grove-house', { id: 'grove-kurt', kind: 'kurt', name: 'Kurt', x: 6, y: 2, face: 'down', look: { skin: 2, hair: 2, outfit: 5, style: 0 }, lines: ['I make nets.'] });
// Weekday visitors (Gold's Tuscany of Tuesday and her friends): each is in town only on their own day of the week and gives one gift a day.
const OW_WEEKLY = [
  ['meadow', 'meadow-monty', 'Hiker Monty', 1, 'greatnet', 'Great Net', 'Monday is my day for the road. Here, a net for yours!'],
  ['ember', 'ember-tuscany', 'Tuscany of Tuesday', 2, 'hyperpotion', 'Hyper Potion', 'I only visit on Tuesdays. Take this, dear!'],
  ['tide', 'tide-wesley', 'Wesley of Wednesday', 3, 'revive', 'Revive', 'It is Wednesday, so I am here. A little something for you.']
];
OW_WEEKLY.forEach(function (w, i) { owAddNpc(w[0], { id: w[1], kind: 'weekly', name: w[2], day: w[3], give: w[4], giveName: w[5], x: 6, y: 11, face: 'down', look: { skin: i + 1, hair: i * 2, outfit: i + 4, style: i % 4 }, lines: [w[6]] }); });
OW_SERVICES.weekly = function (npc) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0), w = state.overworld.weekly, today = dayKey();
  if (w[npc.id] === today) { openTalk({ name: npc.name, art: art, lines: ['I already gave you my present today. See you next week!'] }); return; }
  w[npc.id] = today; state.items[npc.give] = Math.min(99, (state.items[npc.give] || 0) + 1); saveState();
  openTalk({ name: npc.name, art: art, lines: npc.lines.concat(['You got a ' + npc.giveName + '!']) });
};
// The daily Lucky Number at the Radio Tower: one number from 0 to 499 every day; a buddy whose number matches it wins a PP Up (each buddy's number is fixed by its name).
function luckyNumber() { return dayHash('lucky' + dayKey()) % 500; }
function buddyNumber(id) { return dayHash('number' + id) % 500; }
OW_SERVICES.lucky = function (npc) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0), w = state.overworld.weekly, today = dayKey(), n = luckyNumber();
  const hit = getOwnedIds().find(function (id) { return buddyNumber(id) === n; });
  const lines = ['Tonight\'s Lucky Number is ' + n + '! Does one of your buddies carry it?'];
  if (hit && w['tower-lucky'] !== today) { w['tower-lucky'] = today; state.items.ppup = Math.min(99, (state.items.ppup || 0) + 1); saveState(); lines.push(getPetById(hit).baseName + ' has number ' + n + '! You win a PP Up!'); }
  else if (hit) lines.push('You already won today. Come back tomorrow!');
  else lines.push('No match today. Check each buddy\'s number on its Stats tab!');
  openTalk({ name: npc.name, art: art, lines: lines });
};
// Mum (Gold's Mom): while she is saving, she keeps half of every trainer prize (the bank), and gives it back whenever you ask. The part she keeps is returned here.
function momKeeps(prize) {
  if (!state.mom.save) return 0;
  const k = Math.floor(prize * ECON.mom.share); state.mom.bank = Math.min(999999, state.mom.bank + k); saveState(); return k;
}
OW_SERVICES.mum = function (npc) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0), m = state.mom;
  openTalk({ name: npc.name, art: art, lines: [((npc.lines || [''])[0] + ' I am keeping ' + m.bank + ' gems for you. Shall I put half of what you win aside?').trim()], choices: [
    { label: m.save ? 'Stop saving' : 'Save half of my prizes', run: function () { closeTalk(); m.save = !m.save; saveState(); openTalk({ name: npc.name, art: art, lines: [m.save ? 'Good idea! I will keep half of your prizes safe.' : 'All right. You keep everything you win.'] }); } },
    { label: 'Take my savings', run: function () { closeTalk(); const n = m.bank; m.bank = 0; if (n) grantGems(n, 'Mum gave you ' + n + ' gems!', false); else openTalk({ name: npc.name, art: art, lines: ['There is nothing saved yet.'] }); saveState(); } }
  ] });
};
OW_SERVICES.sleeper = function (npc) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0);
  if (!hasKeyItem('radio-card')) { openTalk({ name: npc.name, art: art, lines: npc.lines }); return; }
  openTalk({ name: npc.name, art: art, lines: ['You tune the Gizmo radio to a lively song...', 'The buddy wakes up with a yawn and wanders off!'], onClose: function () { owStoryDone(npc.story); renderOverworld(); } });
};
owAddNpc('hollow-home', { id: 'hollow-mum-savings', kind: 'mum', name: 'Mum at the desk', x: 8, y: 2, face: 'down', look: { skin: 1, hair: 2, outfit: 6, style: 3 }, lines: ['I keep your savings tidy!'] });
