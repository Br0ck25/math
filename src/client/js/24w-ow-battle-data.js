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
  { id: 'quick', name: 'Quick Dash', type: 'normal', power: 40, acc: 100, pp: 30, level: 5, pri: 1 },       // moves first
  { id: 'slam', name: 'Body Slam', type: 'normal', power: 80, acc: 85, pp: 15, level: 20 }
];
// With every PP spent a buddy can still Struggle (it hurts itself a little).
const AB_STRUGGLE = { id: 'struggle', name: 'Struggle', type: 'normal', power: 50, acc: 100, pp: 1, left: 1, recoil: true };
// The status a damaging move of each element can leave (from the second tier on, one chance in five): burn and poison hurt a little every round, paralysis slows and can stop a move, sleep skips turns.
const AB_STATUS = { fire: 'burn', nature: 'poison', electric: 'paralysis', dark: 'sleep', magic: 'sleep' };
const AB_STATUS_TAG = { burn: 'BRN', poison: 'PSN', paralysis: 'PAR', sleep: 'SLP' };
const AB_STATUS_CHANCE = 0.2;
// The moves a buddy of this element knows at this level (its four newest), as fresh copies with their PP.
// Every move a buddy of this element has learned by this level, oldest first.
function abKnownMoves(element, level, type) {
  const names = AB_MOVE_NAMES[element] || AB_MOVE_NAMES.dark;
  return AB_NORMAL.concat(AB_TIERS.map(function (t, i) { return { id: element + (i + 1), name: names[i], type: type, power: t.power, acc: t.acc, pp: t.pp, level: t.level, status: i > 0 ? AB_STATUS[element] || '' : '' }; }))
    .filter(function (m) { return m.level <= level; }).sort(function (a, b) { return a.level - b.level; });
}
// The four moves it takes into battle: the ones chosen (state.advMoves), topped up with its newest if fewer than four were chosen. `pp` is the PP left per move id.
function abMoveList(element, level, type, pp, chosen) {
  const known = abKnownMoves(element, level, type);
  if (!Array.isArray(chosen)) chosen = known.slice(-4).map(function (m) { return m.id; });
  const list = chosen.map(function (id) { return known.find(function (m) { return m.id === id; }); }).filter(Boolean);
  known.slice().reverse().forEach(function (m) { if (list.length < 4 && list.indexOf(m) === -1) list.push(m); });
  return list.slice(0, 4).map(function (m) { return Object.assign({}, m, { left: pp && pp[m.id] !== undefined ? clamp(pp[m.id], 0, m.pp) : m.pp }); });
}
// A buddy's base strength: dearer store buddies are stronger; the others have a fixed one.
function abBase(sp) {
  if (sp.cost) return clamp(40 + Math.round(Math.log2(sp.cost + 1) * 5), 45, 100);
  return sp.legend ? 100 : sp.ultra ? 95 : sp.mythic ? 88 : 72;
}
// A fighter: species id and level (and its HP, full when not given). Gold's stat formula without the hidden values.
// Every kind has its own build: up to 10 more or less base strength in HP, Attack, Defense and Speed, fixed by its name; an element leans a little too (electric is quick, nature is sturdy).
const AB_SPEED_LEAN = { electric: 12, fire: 5, dark: 5, magic: 0, water: -4, nature: -10 };
function abShape(seed, element) {
  let h = 7;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 1000003;
  const off = function (k) { return Math.floor(h / Math.pow(21, k)) % 21 - 10; };
  return { hp: off(0) + (element === 'nature' ? 6 : 0), atk: off(1), def: off(2) + (element === 'nature' ? 4 : 0), spd: off(3) + (AB_SPEED_LEAN[element] || 0) };
}
function abBuild(id, name, icon, element, type, base, level, hp, pp, chosen) {
  const sh = abShape(id || name, element), stat = function (b) { return Math.floor(2 * Math.max(10, b) * level / 100); }, max = stat(base + sh.hp) + level + 10;
  return { id: id, name: name, icon: icon, element: element, type: type, level: level, max: max, hp: hp === undefined ? max : clamp(hp, 0, max), atk: stat(base + sh.atk) + 5, def: stat(base + sh.def) + 5, spd: stat(base + sh.spd) + 5, base: base, status: '', sleep: 0, moves: abMoveList(element, level, type, pp, chosen) };
}
function abMon(id, level, hp, pp, chosen) {
  const sp = getSpecies(id), stage = getFormIndex(sp, level);
  return abBuild(id, sp.forms[stage].name, sp.forms[stage].icon, sp.element, battleElement(sp), abBase(sp) + stage * 12, level, hp, pp, chosen);
}
// A boss from the boss list (a gym leader or a story boss): stronger than a wild buddy, with Elder and Alpha forms as in Practice.
function abBossMon(index, level) {
  const m = monstersList[index], form = getBossFormIndex(level);
  return abBuild('', form === 2 ? 'Alpha ' + m.name : form === 1 ? 'Elder ' + m.name : m.name, m.icon, m.element, m.element, 82 + form * 12, level);
}
// A foe from its description: {id, level} is a buddy, {boss: index, level} a boss.
function abFoeMon(f) { return f.boss !== undefined ? abBossMon(f.boss, f.level) : abMon(f.id, f.level); }
// One of your buddies, with the HP it has left.
function abPartyMon(id) { return abMon(id, getBuddyLevel(id), state.advHp[id], state.advPp[id], state.advMoves[id]); }
// Gold's damage formula: level, power and Attack against Defense, then same-type bonus, type effectiveness, a critical hit and a little luck.
function abDamage(att, def, move, crit) {
  const rel = getTypeRelation(move.type, def.type), eff = rel === 1 ? 2 : rel === -1 ? 0.5 : 1, stab = move.type === att.type ? 1.5 : 1;
  const base = Math.floor(Math.floor((Math.floor(2 * att.level / 5) + 2) * move.power * att.atk * (att.status === 'burn' ? 0.5 : 1) / def.def) / 50) + 2;
  const luck = (217 + Math.floor(Math.random() * 39)) / 255;
  return { dmg: Math.max(1, Math.floor(base * stab * eff * (crit ? 2 : 1) * luck)), eff: eff };
}
// Experience for beating a foe (a trainer's buddies give half as much again).
function abXpYield(foe, trainer) { return Math.max(1, Math.floor(foe.base * foe.level / 12 * (trainer ? 1.5 : 1))); }
// The level a wild buddy has on this land: a little above where the land's gym opens.
function abWildLevel() { return clamp((ECON.map.levels[state.region] || 1) + rnd(1, 3), 2, MAX_LEVEL); }
// Catching: Gold's rule. A weaker foe is easier (and one that is asleep, burned or the like even more), and rarer buddies are harder. Returns 0 to 1.
function abCatchChance(foe) {
  const sp = getSpecies(foe.id);
  const rate = sp.legend ? 3 : !isStoreBuddy(sp) ? 30 : sp.cost < 150 ? 200 : sp.cost < 800 ? 120 : 45;
  const a = Math.floor((3 * foe.max - 2 * foe.hp) * rate * ECON.overworld.netBonus * (foe.status ? 1.5 : 1) / (3 * foe.max));
  return Math.min(1, a / 255);
}
