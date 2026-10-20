// =====================================================================
//  ADVENTURE BATTLES, the numbers: every buddy gets real stats (HP, Attack, Defense) from its level and its kind, and up to four moves that
//  work like Pokemon Gold's: a type, a power, an accuracy and PP. The math decides whether your attack happens (24x-ow-battle.js).
//  These stats are only for the Adventure; Practice keeps its hearts. Battle HP is saved in state.advHp (the Buddy Center restores it).
// =====================================================================
// Four attacks per element, learned at these levels. Normal moves (Tackle, Body Slam) are for everyone.
const AB_TIERS = [{ level: 1, power: 40, acc: 100, pp: 25 }, { level: 14, power: 65, acc: 100, pp: 20 }, { level: 28, power: 90, acc: 95, pp: 15 }, { level: 42, power: 120, acc: 80, pp: 5 }];
const AB_MOVE_NAMES = {
  fire: ['Cinder', 'Flame Dash', 'Blaze Wave', 'Inferno'],
  water: ['Splash Shot', 'Bubble Burst', 'Tide Surge', 'Hydro Crash'],
  nature: ['Vine Lash', 'Leaf Storm', 'Thorn Burst', 'Bloom Beam'],
  electric: ['Zap', 'Static Bolt', 'Thunder Arc', 'Storm Strike'],
  dark: ['Shadow Nip', 'Dusk Claw', 'Night Slash', 'Void Crash'],
  magic: ['Sparkle', 'Star Dust', 'Moon Ray', 'Cosmic Burst']
};
const AB_NORMAL = [
  { id: 'tackle', name: 'Tackle', type: 'normal', power: 40, acc: 100, pp: 35, level: 1 },
  { id: 'slam', name: 'Body Slam', type: 'normal', power: 80, acc: 85, pp: 15, level: 20 }
];
// The moves a buddy of this element knows at this level (its four newest), as fresh copies with their PP.
function abMoveList(element, level, type) {
  const names = AB_MOVE_NAMES[element] || AB_MOVE_NAMES.dark;
  const all = AB_NORMAL.concat(AB_TIERS.map(function (t, i) { return { id: element + (i + 1), name: names[i], type: type, power: t.power, acc: t.acc, pp: t.pp, level: t.level }; }));
  return all.filter(function (m) { return m.level <= level; }).sort(function (a, b) { return a.level - b.level; }).slice(-4)
    .map(function (m) { return Object.assign({}, m, { left: m.pp }); });
}
// A buddy's base strength: dearer store buddies are stronger; the others have a fixed one.
function abBase(sp) {
  if (sp.cost) return clamp(40 + Math.round(Math.log2(sp.cost + 1) * 5), 45, 100);
  return sp.legend ? 100 : sp.ultra ? 95 : sp.mythic ? 88 : 72;
}
// A fighter: species id and level (and its HP, full when not given). Gold's stat formula without the hidden values.
function abMon(id, level, hp) {
  const sp = getSpecies(id), stage = getFormIndex(sp, level), form = sp.forms[stage];
  const base = abBase(sp) + stage * 12, s = Math.floor(2 * base * level / 100), max = s + level + 10, type = battleElement(sp);
  return { id: id, name: form.name, icon: form.icon, element: sp.element, type: type, level: level, max: max, hp: hp === undefined ? max : clamp(hp, 0, max), atk: s + 5, def: s + 5, base: base, moves: abMoveList(sp.element, level, type) };
}
// One of your buddies, with the HP it has left.
function abPartyMon(id) { return abMon(id, getBuddyLevel(id), state.advHp[id]); }
// Gold's damage formula: level, power and Attack against Defense, then same-type bonus, type effectiveness, a critical hit and a little luck.
function abDamage(att, def, move, crit) {
  const rel = getTypeRelation(move.type, def.type), eff = rel === 1 ? 2 : rel === -1 ? 0.5 : 1, stab = move.type === att.type ? 1.5 : 1;
  const base = Math.floor(Math.floor((Math.floor(2 * att.level / 5) + 2) * move.power * att.atk / def.def) / 50) + 2;
  const luck = (217 + Math.floor(Math.random() * 39)) / 255;
  return { dmg: Math.max(1, Math.floor(base * stab * eff * (crit ? 2 : 1) * luck)), eff: eff };
}
// Experience for beating a foe (a trainer's buddies give half as much again).
function abXpYield(foe, trainer) { return Math.max(1, Math.floor(foe.base * foe.level / 12 * (trainer ? 1.5 : 1))); }
// The level a wild buddy has on this land: a little above where the land's gym opens.
function abWildLevel() { return clamp((ECON.map.levels[state.region] || 1) + rnd(1, 3), 2, MAX_LEVEL); }
// Catching: Gold's rule. A weaker foe is easier, and rarer buddies are harder. Returns 0 to 1.
function abCatchChance(foe) {
  const sp = getSpecies(foe.id);
  const rate = sp.legend ? 3 : !isStoreBuddy(sp) ? 30 : sp.cost < 150 ? 200 : sp.cost < 800 ? 120 : 45;
  const a = Math.floor((3 * foe.max - 2 * foe.hp) * rate * ECON.overworld.netBonus / (3 * foe.max));
  return Math.min(1, a / 255);
}
