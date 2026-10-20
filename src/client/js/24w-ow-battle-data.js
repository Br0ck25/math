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
  { id: 'quick', name: 'Quick Dash', type: 'normal', power: 40, acc: 100, pp: 30, level: 8, pri: 1 },       // moves first
  { id: 'slam', name: 'Body Slam', type: 'normal', power: 80, acc: 85, pp: 15, level: 20 }
];
// With every PP spent a buddy can still Struggle (it hurts itself a little).
const AB_STRUGGLE = { id: 'struggle', name: 'Struggle', type: 'normal', power: 50, acc: 100, pp: 1, left: 1, recoil: true };
// The status a damaging move of each element can leave (from the second tier on, one chance in five): burn and poison hurt a little every round, paralysis slows and can stop a move, sleep skips turns.
const AB_STATUS = { fire: 'burn', water: 'freeze', nature: 'poison', electric: 'paralysis', dark: 'sleep', magic: 'confusion' };
const AB_STATUS_TAG = { burn: 'BRN', poison: 'PSN', paralysis: 'PAR', sleep: 'SLP', freeze: 'FRZ' };
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
// Hand-tuned builds for the buddies you meet most (a gym leader's or a Champion's team, the first few store buddies, the legends); every other kind uses the name-based build below.
const AB_SHAPES = {
  dog: { hp: 8, atk: 2, def: 4, spd: -2, spc: 0 }, jimothy: { hp: -2, atk: 4, def: -4, spd: 12, spc: 2 }, fox: { hp: -4, atk: 8, def: -2, spd: 10, spc: 6 }, bunny: { hp: -6, atk: -2, def: -6, spd: 14, spc: 8 },
  otter: { hp: 2, atk: 2, def: 0, spd: 6, spc: 4 }, hedgehog: { hp: 0, atk: 4, def: 14, spd: -4, spc: -4 }, ignis: { hp: -2, atk: 0, def: -2, spd: 6, spc: 14 }, penguin: { hp: 8, atk: -2, def: 8, spd: -6, spc: 2 },
  bear: { hp: 12, atk: 8, def: 4, spd: -8, spc: -4 }, olaf: { hp: 10, atk: -4, def: 2, spd: -10, spc: 8 }, hedwig: { hp: -4, atk: 2, def: -2, spd: 10, spc: 12 }, dolphin: { hp: 2, atk: 2, def: 0, spd: 12, spc: 6 },
  pascal: { hp: 4, atk: -2, def: 12, spd: -6, spc: 6 }, byte: { hp: -4, atk: -2, def: 0, spd: 12, spc: 14 }, crookshanks: { hp: 0, atk: 6, def: -2, spd: 12, spc: 4 }, rhino: { hp: 8, atk: 14, def: 12, spd: -12, spc: -6 },
  tiger: { hp: 2, atk: 14, def: 0, spd: 8, spc: 0 }, panther: { hp: -2, atk: 10, def: -2, spd: 14, spc: 2 }, bat: { hp: -6, atk: 2, def: -8, spd: 16, spc: 6 }, griffin: { hp: 2, atk: 10, def: 2, spd: 12, spc: 6 },
  cosmo: { hp: 0, atk: -4, def: 0, spd: 4, spc: 16 }, lion: { hp: 8, atk: 14, def: 6, spd: 2, spc: 0 }, phoenix: { hp: 4, atk: 2, def: 2, spd: 10, spc: 16 }, frostfang: { hp: 2, atk: 12, def: 2, spd: 10, spc: 4 },
  pegasus: { hp: 0, atk: 2, def: 0, spd: 16, spc: 12 }, panda: { hp: 14, atk: 4, def: 10, spd: -10, spc: 0 }, koala: { hp: 12, atk: -4, def: 6, spd: -12, spc: 10 }, monkey: { hp: 0, atk: 6, def: -4, spd: 14, spc: 4 },
  turtle: { hp: 6, atk: 0, def: 16, spd: -14, spc: 4 }, octopus: { hp: 2, atk: -2, def: 2, spd: 4, spc: 16 }, wolf: { hp: 2, atk: 12, def: 2, spd: 12, spc: 0 }, shark: { hp: 2, atk: 16, def: -2, spd: 10, spc: 2 },
  gorilla: { hp: 12, atk: 16, def: 6, spd: -6, spc: -4 },
  legend_fire: { hp: 10, atk: 6, def: 8, spd: 6, spc: 16 }, legend_water: { hp: 16, atk: 4, def: 10, spd: 2, spc: 12 }, legend_nature: { hp: 14, atk: 8, def: 14, spd: -2, spc: 8 },
  legend_electric: { hp: 6, atk: 6, def: 4, spd: 16, spc: 14 }, legend_dark: { hp: 8, atk: 16, def: 6, spd: 12, spc: 6 }, legend_magic: { hp: 8, atk: 2, def: 8, spd: 10, spc: 16 }
};
function abShape(seed, element) {
  if (AB_SHAPES[seed]) return AB_SHAPES[seed];
  let h = 7;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 1000003;
  const off = function (k) { return Math.floor(h / Math.pow(21, k)) % 21 - 10; };
  return { hp: off(0) + (element === 'nature' ? 6 : 0), atk: off(1), def: off(2) + (element === 'nature' ? 4 : 0), spd: off(3) + (AB_SPEED_LEAN[element] || 0), spc: off(4) };
}
function abBuild(id, name, icon, element, type, base, level, hp, pp, chosen) {
  const sh = abShape(id || name, element), stat = function (b) { return Math.floor(2 * Math.max(10, b) * level / 100); }, max = stat(base + sh.hp) + level + 10;
  return { id: id, name: name, icon: icon, element: element, type: type, level: level, max: max, hp: hp === undefined ? max : clamp(hp, 0, max), atk: stat(base + sh.atk) + 5, def: stat(base + sh.def) + 5, spd: stat(base + sh.spd) + 5, spc: stat(base + sh.spc) + 5, base: base, status: '', sleep: 0, held: '', moves: abMoveList(element, level, type, pp, chosen) };
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
function abFoeMon(f) {
  if (f.boss !== undefined) return abBossMon(f.boss, f.level);
  const m = abMon(f.id, f.level);
  if (f.shiny) {                                                    // a shiny buddy is a little stronger, and glows once caught
    m.shiny = true; m.name = 'Shiny ' + m.name;
    ['max', 'hp', 'atk', 'def', 'spd', 'spc'].forEach(function (k) { m[k] = Math.floor(m[k] * 1.1); });
  }
  return m;
}
// One of your buddies, with the HP it has left.
function abPartyMon(id) { const m = abMon(id, getBuddyLevel(id), state.advHp[id], state.advPp[id], state.advMoves[id]); m.held = state.held[id] || ''; return m; }
// Gold's damage formula, step by step. Normal moves are physical (Attack against Defense); every other type is special (Special against Special), as in Gold.
// A burn halves a physical Attack. A critical hit doubles the damage before the +2; then the same-type bonus, type effectiveness and luck follow, each rounded down.
const AB_CRIT = 17 / 256, AB_CRIT_LENS = 32 / 256;     // the critical hit chance, and with a Scope Lens (one stage up)
function abDamage(att, def, move, crit) {
  const special = move.type !== 'normal';
  let A = special ? att.spc : att.atk, D = special ? def.spc : def.def;
  if (!special && att.status === 'burn') A = Math.floor(A / 2);
  if (A > 255 || D > 255) { A = Math.floor(A / 4); D = Math.floor(D / 4); }
  A = Math.max(1, A); D = Math.max(1, D);
  const rel = getTypeRelation(move.type, def.type), eff = rel === 1 ? 2 : rel === -1 ? 0.5 : 1;
  let d = Math.floor(Math.floor((Math.floor(2 * att.level / 5) + 2) * move.power * A / D) / 50);
  if (att.held === 'charm' && move.type === att.type) d = Math.floor(d * 110 / 100);                    // a Type Charm: its own type hits 10% harder
  if (crit) d *= 2;
  d = Math.min(d, 997) + 2;
  if (move.type === att.type && move.type !== 'normal') d = Math.floor(d * 3 / 2);
  d = eff === 2 ? d * 2 : eff === 0.5 ? Math.floor(d / 2) : d;
  d = Math.floor(d * (217 + Math.floor(Math.random() * 39)) / 255);
  return { dmg: Math.max(1, d), eff: eff };
}
// Experience for beating a foe, for each buddy that fought: the foe's base experience shared by the fighters, times its level over seven (a trainer's buddies give half as much again).
function abXpYield(foe, trainer, fighters) { return Math.max(1, Math.floor(Math.floor(foe.base / Math.max(1, fighters)) * foe.level / 7 * (trainer ? 1.5 : 1))); }
// The level a wild buddy has on this land: a little above where the land's gym opens.
function abWildLevel() { return clamp((ECON.map.levels[state.region] || 1) + rnd(1, 3), 2, MAX_LEVEL); }
// Catching, Gold's rule: the species' catch rate (a Catch Net is worth a Great Ball) shrinks with the foe's HP, a sleeping foe adds 10, and the net holds if a 0-255 roll is at most that. Returns 0 to 1.
function abCatchA(foe) {
  const sp = getSpecies(foe.id);
  const rate = Math.min(255, Math.floor((sp.legend ? 3 : !isStoreBuddy(sp) ? 45 : sp.cost < 150 ? 255 : sp.cost < 800 ? 120 : 45) * ECON.overworld.netBonus));
  const a = Math.max(1, Math.floor(rate * (3 * foe.max - 2 * foe.hp) / (3 * foe.max))) + (foe.status === 'sleep' || foe.status === 'freeze' ? 10 : 0);
  return Math.min(255, a);
}
function abCatchChance(foe) { return (abCatchA(foe) + 1) / 256; }
// How many times the net shakes before it breaks free: each check passes more often when the catch value is high.
function abShakes(a) {
  const pass = (63 + (a - 1) * 192 / 254) / 255;
  let n = 0;
  while (n < 3 && Math.random() < pass) n++;
  return n;
}
