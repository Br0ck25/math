// =====================================================================
//  THE SAFARI ZONE (Gold's): a gate room in Thistle Wood (through a gap in the west edge). For 500 gems you get 30 Safari Balls and 500 steps in a field of tall grass.
//  No fighting: a wild buddy can be thrown at, fed bait (it stays longer but is harder to catch), hit with a rock (it is easier to catch but may flee) or left alone. state.safari = { active, steps, balls }.
// =====================================================================
function safariActive() { return !!state.safari.active; }
function safariEnd(why) {
  const s = state.safari, was = s.active;
  s.active = false; s.steps = 0; s.balls = 0;
  const o = state.overworld; o.map = 'thistle-gate'; o.x = 3; o.y = 5; owTrail = null; saveState();
  if (was && owOpen()) { renderOverworld(); openTalk({ name: 'Safari Warden', art: worldSprite('t-gym-door'), lines: [why] }); }
}
// One step in the zone: the warden's counter runs down.
function owSafariStep() {
  if (state.overworld.map === 'safari-zone' && !safariActive()) { const o = state.overworld; o.map = 'thistle-gate'; o.x = 3; o.y = 5; owTrail = null; renderOverworld(); toast('Please pay at the desk first.'); return; }
  if (state.overworld.map !== 'safari-zone') return;
  if (--state.safari.steps <= 0) safariEnd('Ding-dong! Time is up. Please come back to the gate.');
}
// The buddy that shows up: the rarer kinds, as the zone's own.
function safariPick() {
  const pool = wildPool().filter(function (p) { return !isStoreBuddy(p) || p.cost >= 800; });
  return pick(pool);
}
function abSafariFlees() { const s = ab.safari; return Math.random() < (s.rock > 0 ? 0.35 : s.bait > 0 ? 0.05 : 0.15); }
// After your move the buddy may run off; if not, the menu comes back (or the balls are gone and the visit ends).
function abSafariTurn() {
  if (abSafariFlees()) { abSteps([[abFoe().name + ' ran away!', null, 1100], ['', function () { abFinish('run'); }, 0]]); return; }
  abSteps([[abFoe().name + (ab.safari.rock > 0 ? ' is angry!' : ab.safari.bait > 0 ? ' is eating!' : ' is watching you carefully.'), null, 1000]]);
  if (ab.safari.bait > 0) ab.safari.bait--; else if (ab.safari.rock > 0) ab.safari.rock--;
  abSteps([abMenuStep()]);
}
function abSafariBall() {
  if (state.safari.balls < 1) return;
  const foe = abFoe(), s = ab.safari, chance = Math.min(1, abCatchChance(foe, 1.5) * (s.rock > 0 ? 2 : 1) * (s.bait > 0 ? 0.5 : 1)), got = Math.random() < chance;
  state.safari.balls -= 1; ab.phase = 'busy';
  abSteps([['You threw a Safari Ball!', null, 1000]]);
  const shakes = got ? 3 : Math.min(2, abShakes(abCatchA(foe, 1.5)));
  for (let k = 0; k < shakes; k++) abSteps([['...', function () { soundCatchWobble(k); }, 700]]);
  if (!got) { abSteps([['Oh no! ' + foe.name + ' broke free!', null, 1100]]); if (state.safari.balls < 1) { abSteps([['You are out of Safari Balls!', null, 1000], ['', function () { abFinish('run'); }, 0]]); return; } abSafariTurn(); return; }
  abSteps([['Gotcha! ' + foe.name + ' was caught!', function () { ab.caught = true; soundCatchSuccess(); abKeepCaught(foe); }, 1300], ['', function () { abFinish('caught'); }, 0]]);
}
function abSafariBait() { ab.phase = 'busy'; ab.safari.bait = 3; ab.safari.rock = 0; abSteps([['You threw some bait at ' + abFoe().name + '.', null, 1000]]); abSafariTurn(); }
function abSafariRock() { ab.phase = 'busy'; ab.safari.rock = 3; ab.safari.bait = 0; abSteps([['You threw a rock at ' + abFoe().name + '!', null, 1000]]); abSafariTurn(); }
OW_SERVICES.safari = function (npc) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0), s = state.safari;
  openTalk({ name: npc.name, art: art, lines: ['Welcome to the Safari Zone! For ' + ECON.safari.fee + ' gems you get ' + ECON.safari.balls + ' Safari Balls and ' + ECON.safari.steps + ' steps.', 'You cannot fight in there. Throw bait, rocks and balls instead. The rare buddies live here.'],
    choices: [{ label: 'Pay ' + ECON.safari.fee + ' gems', run: function () {
      closeTalk();
      if (state.gems < ECON.safari.fee) { soundWrong(); toast('You need ' + ECON.safari.fee + ' gems.'); return; }
      state.gems -= ECON.safari.fee; s.active = true; s.steps = ECON.safari.steps; s.balls = ECON.safari.balls;
      const o = state.overworld; o.map = 'safari-zone'; o.x = 10; o.y = 14; o.face = 'up'; owTrail = null; saveState(); updateStatsUI(); renderOverworld();
    } }] });
};
OW_MAPS['thistle-gate'] = owRoom('thistle-gate', 'Safari Gate', { to: 'thistle', tx: 1, ty: 6 }, [
  { id: 'thistle-warden', kind: 'safari', name: 'Warden Fern', x: 3, y: 2, face: 'down', look: { skin: 3, hair: 4, outfit: 2, style: 0 }, lines: ['The Safari Zone.'] }
], [], OW_ROOM_ROWS);
OW_MAPS['thistle-gate'].warps.push({ x: 4, y: 1, to: 'safari-zone', tx: 10, ty: 14 });                // the door to the zone: it only stays open for a paid visit (owSafariStep)
OW_MAPS['thistle-gate'].region = 'thistle'; OW_MAPS['thistle-gate'].palette = OW_THISTLE_PALETTE;
OW_MAPS['safari-zone'] = {
  id: 'safari-zone', name: 'Safari Zone', region: 'thistle', start: { x: 10, y: 14 }, palette: OW_THISTLE_PALETTE,
  rows: (function () { const g = []; for (let y = 0; y < 16; y++) { let r = ''; for (let x = 0; x < 21; x++) r += y === 0 || x === 0 || x === 20 || (y === 15 && x !== 10) ? 'T' : y === 15 ? '.' : (y === 14 && x === 10) || ((y + x) % 9 === 0 && y % 3 === 0) ? ',' : (x % 6 === 3 && y % 5 === 2) ? 'T' : '"'; g.push(r); } return g; })(),
  warps: [{ x: 10, y: 15, to: 'thistle-gate', tx: 3, ty: 5 }], npcs: [], objects: [], trees: {}, signs: {}
};
owSetTile('thistle', 0, 6, '.');
OW_MAPS.thistle.warps.push({ x: 0, y: 6, to: 'thistle-gate', tx: 3, ty: 5 });
