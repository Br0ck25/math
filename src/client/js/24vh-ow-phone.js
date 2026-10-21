// =====================================================================
//  PHONE CALLS (Gold's trainer rematches): every route trainer you beat has your number. Once a day one of them calls the Gizmo, says it trained hard and waits where you fought it.
//  Beat it again (stronger, ECON.phone.levels above the land) and it pays its prize again. state.phone = { day, ready, known } (known: the trainers beaten before today, so nobody calls on the day you beat them).
// =====================================================================
const OW_PHONE_MAP = /^route\d+(-side)?$|^skyroad(-side)?$/;
function phoneTrainers() {
  const out = [];
  Object.keys(OW_MAPS).forEach(function (k) {
    if (!OW_PHONE_MAP.test(k)) return;
    OW_MAPS[k].npcs.forEach(function (n) { if (n.kind === 'trainer' && !n.story && n.name !== RIVAL && state.overworld.beat.indexOf(n.id) !== -1) out.push({ npc: n, map: k }); });
  });
  return out;
}
// Today's caller ('' when nobody has your number yet); it stays until you have beaten it.
function phoneReady() {
  const p = state.phone, list = phoneTrainers();
  if (p.ready && !list.some(function (t) { return t.npc.id === p.ready; })) p.ready = '';
  if (p.day !== dayKey()) {                                                       // a new day: someone who had your number since an earlier day may call
    p.day = dayKey();
    const known = list.filter(function (t) { return p.known.indexOf(t.npc.id) !== -1; });
    if (!p.ready && known.length) p.ready = known[dayHash('phone' + dayKey()) % known.length].npc.id;
    p.known = list.map(function (t) { return t.npc.id; });
  }
  return p.ready;
}
function phoneCaller() { const id = phoneReady(); return id ? phoneTrainers().find(function (t) { return t.npc.id === id; }) || null : null; }
GIZMO_CALLS.push({ from: 'Trainer call', text: '', when: function () { return !!phoneCaller(); }, dyn: function () {
  const c = phoneCaller();
  return c.npc.name + ': "I have been training since our battle! Meet me on ' + OW_MAPS[c.map].name + ' for a rematch!"';
} });

// Friends who are not trainers (Gold's Gina, Wade and the rest): everyone who gave you a key item has your number, and once a day one of them calls with a small gift to take.
const PHONE_FRIENDS = [
  { key: 'fishing-rod', name: 'Fisher Gil', text: 'The fish are biting! I kept a Potion for you.', give: 'potion' },
  { key: 'bicycle', name: 'Cyclist Ray', text: 'I found a Catch Net on my ride. It is yours!', give: 'net' },
  { key: 'itemfinder', name: 'Dowser Fen', text: 'My rod twitched over an Apricorn. Take it!', give: 'apricorn' },
  { key: 'map-card', name: 'Guide Ivy', text: 'I packed a Potion in case you get lost.', give: 'potion' }
];
function phoneFriend() {
  const list = PHONE_FRIENDS.filter(function (f) { return hasKeyItem(f.key); });
  return state.phone.gift !== dayKey() && list.length ? list[dayHash('friend' + dayKey()) % list.length] : null;
}
function phoneClaim() {
  const f = phoneFriend();
  if (!f) return;
  state.phone.gift = dayKey();
  if (f.give === 'net' && state.nets < maxNets()) state.nets += 1;
  else if (f.give === 'apricorn') state.items.apricorn = Math.min(99, (state.items.apricorn || 0) + 1);
  else state.potions = Math.min(99, state.potions + 1);                                    // also instead of a net when the net bag is full
  soundCoinChirp(); saveState(); updateStatsUI(); toast(f.name + ' sent a gift!'); if (typeof renderGizmo === 'function') renderGizmo();
}
GIZMO_CALLS.push({ from: 'Friend call', text: '', claim: true, when: function () { return !!phoneFriend(); }, dyn: function () { const f = phoneFriend(); return f.name + ': "' + f.text + '"'; } });
