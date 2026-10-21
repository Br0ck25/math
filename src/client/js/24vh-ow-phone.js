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
