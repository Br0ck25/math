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
  { id: 'slam', name: 'Body Slam', type: 'normal', power: 80, acc: 85, pp: 15, level: 20 },
  // Gold's stat moves: no damage, they move a stat up or down by stages (-6 to +6) for the rest of the fight. `fx`: which stat, how many stages, and who is changed.
  { id: 'growl', name: 'Growl', type: 'normal', power: 0, acc: 100, pp: 40, level: 4, fx: { stat: 'atk', n: -1, on: 'foe' } },
  { id: 'leer', name: 'Leer', type: 'normal', power: 0, acc: 100, pp: 30, level: 10, fx: { stat: 'def', n: -1, on: 'foe' } },
  { id: 'harden', name: 'Harden', type: 'normal', power: 0, acc: 100, pp: 30, level: 12, fx: { stat: 'def', n: 1, on: 'self' } },
  { id: 'smoke', name: 'Smokescreen', type: 'normal', power: 0, acc: 100, pp: 20, level: 16, fx: { stat: 'acc', n: -1, on: 'foe' } },
  { id: 'swords', name: 'Swords Dance', type: 'normal', power: 0, acc: 100, pp: 30, level: 24, fx: { stat: 'atk', n: 2, on: 'self' } },
  { id: 'agility', name: 'Agility', type: 'normal', power: 0, acc: 100, pp: 30, level: 30, fx: { stat: 'spd', n: 2, on: 'self' } }
];
// Stat stages as in Gold: a stage multiplies a stat (and, for accuracy, the hit chance) by these percents.
const AB_STAGE_PCT = [25, 28, 33, 40, 50, 66, 100, 150, 200, 250, 300, 350, 400];
const AB_ACC_PCT = [33, 36, 43, 50, 60, 75, 100, 133, 166, 200, 250, 266, 300];
const AB_STAT_NAME = { atk: 'Attack', def: 'Defense', spd: 'Speed', spc: 'Special', acc: 'accuracy' };
function abStage(m, stat) { return m.stg && m.stg[stat] || 0; }
// A stat with its stage applied.
function abStat(m, stat) { return Math.max(1, Math.floor(m[stat] * AB_STAGE_PCT[abStage(m, stat) + 6] / 100)); }
// With every PP spent a buddy can still Struggle (it hurts itself a little).
const AB_STRUGGLE = { id: 'struggle', name: 'Struggle', type: 'normal', power: 50, acc: 100, pp: 1, left: 1, recoil: true };
// The status a damaging move of each element can leave (from the second tier on, one chance in five): burn and poison hurt a little every round, paralysis slows and can stop a move, sleep skips turns.
const AB_STATUS = { fire: 'burn', water: 'freeze', nature: 'poison', electric: 'paralysis', dark: 'sleep', magic: 'confusion' };
const AB_STATUS_TAG = { burn: 'BRN', poison: 'PSN', paralysis: 'PAR', sleep: 'SLP', freeze: 'FRZ' };
const AB_STATUS_CHANCE = 0.2;
// Gold teaches every kind its own moves at its own pace (about one new move every 6 to 8 levels): each kind's learnset is fixed by its id. Everyone starts with Tackle and the first move of its type (two moves, like a Gold starter).
// The element's four tiers land near levels 1, 11-17, 28-34 and 44-50; three gentle and two strong normal moves fill in between.
const AB_WEAK = ['quick', 'growl', 'leer', 'harden', 'smoke'], AB_STRONG = ['slam', 'swords', 'agility'];
function abLearnset(id, element, type) {
  let h = 11; for (let i = 0; i < id.length; i++) h = (h * 37 + id.charCodeAt(i)) % 1000003;
  const rnd = function (n) { h = (h * 1103515245 + 12345) % 2147483648; return h % n; };
  const lib = function (mid) { return AB_NORMAL.find(function (m) { return m.id === mid; }); };
  const weak = AB_WEAK.slice(), strong = AB_STRONG.slice(), pick = function (arr) { return arr.splice(rnd(arr.length), 1)[0]; };
  const names = AB_MOVE_NAMES[element] || AB_MOVE_NAMES.dark, out = [Object.assign({}, lib('tackle'), { level: 1 })];
  const tierLv = [1, 11 + rnd(7), 28 + rnd(7), 44 + rnd(7)];
  AB_TIERS.forEach(function (t, i) { out.push({ id: element + (i + 1), name: names[i], type: type, power: t.power, acc: t.acc, pp: t.pp, level: tierLv[i], status: i > 0 ? AB_STATUS[element] || '' : '' }); });
  const others = [pick(weak), pick(weak), pick(strong), pick(weak), pick(strong)], lv = [6, 11, 24, 33, 38];
  others.forEach(function (mid, i) { out.push(Object.assign({}, lib(mid), { level: lv[i] + rnd(3) })); });
  return out;
}
// Moves a TM taught (Gold: single-use machines; ours come from the gym leaders). `el`: the element it needs ('' = any buddy).
const AB_TMS = {
  doubleedge: { name: 'Double-Edge', el: '', type: 'normal', power: 120, acc: 100, pp: 15, recoil: true },
  fireblast: { name: 'Fire Blast', el: 'fire', power: 110, acc: 85, pp: 5 }, surf: { name: 'Surf', el: 'water', power: 95, acc: 100, pp: 15 },
  solarbeam: { name: 'Solar Beam', el: 'nature', power: 120, acc: 100, pp: 10 }, thunder: { name: 'Thunder', el: 'electric', power: 110, acc: 70, pp: 10 },
  shadowball: { name: 'Shadow Ball', el: 'dark', power: 80, acc: 100, pp: 15 }, psychic: { name: 'Psychic', el: 'magic', power: 90, acc: 100, pp: 10 },
  hyperbeam: { name: 'Hyper Beam', el: '', type: 'normal', power: 150, acc: 90, pp: 5 }
};
const AB_TM_BY_BADGE = { meadow: 'doubleedge', ember: 'fireblast', tide: 'surf', grove: 'solarbeam', volt: 'thunder', gloom: 'shadowball', mystic: 'psychic', skyreach: 'hyperbeam' };
function abTmMove(tmId, element, type) {
  const t = AB_TMS[tmId];
  return Object.assign({ id: tmId, type: t.type || type, level: 0, status: t.el ? AB_STATUS[element] || '' : '' }, t);
}
// Every move a buddy has learned by this level (its learnset), plus the TM moves it was taught, oldest first. Without an id: the old shared ladder.
function abKnownMoves(element, level, type, id) {
  const names = AB_MOVE_NAMES[element] || AB_MOVE_NAMES.dark;
  const base = id ? abLearnset(id, element, type) : AB_NORMAL.concat(AB_TIERS.map(function (t, i) { return { id: element + (i + 1), name: names[i], type: type, power: t.power, acc: t.acc, pp: t.pp, level: t.level, status: i > 0 ? AB_STATUS[element] || '' : '' }; }));
  const taught = id && state.tmKnown && state.tmKnown[id] ? state.tmKnown[id].filter(function (t) { return AB_TMS[t]; }).map(function (t) { return abTmMove(t, element, type); }) : [];
  return base.filter(function (m) { return m.level <= level; }).sort(function (a, b) { return a.level - b.level; }).concat(taught);
}
// The four moves it takes into battle: the ones chosen (state.advMoves), topped up with its newest if fewer than four were chosen. `pp` is the PP left per move id.
function abMoveList(element, level, type, pp, chosen, id) {
  const known = abKnownMoves(element, level, type, id);
  if (!Array.isArray(chosen)) {                                                   // by default: the newest damaging moves, and the newest stat move last
    const hit = known.filter(function (m) { return !m.fx; }), stat = known.filter(function (m) { return m.fx; }).slice(-1);
    chosen = hit.slice(stat.length ? -3 : -4).concat(stat).map(function (m) { return m.id; });
  }
  const list = chosen.map(function (id) { return known.find(function (m) { return m.id === id; }); }).filter(Boolean);
  known.slice().reverse().forEach(function (m) { if (list.length < 4 && list.indexOf(m) === -1) list.push(m); });
  return list.slice(0, 4).map(function (m) {
    const max = m.pp + (id && state.ppUp && state.ppUp[id] && state.ppUp[id][m.id] || 0) * Math.floor(m.pp / 5);          // PP Ups: a fifth more each, up to three
    return Object.assign({}, m, { pp: max, left: pp && pp[m.id] !== undefined ? clamp(pp[m.id], 0, max) : max });
  });
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
  return { id: id, name: name, icon: icon, element: element, type: type, level: level, max: max, hp: hp === undefined ? max : clamp(hp, 0, max), atk: stat(base + sh.atk) + 5, def: stat(base + sh.def) + 5, spd: stat(base + sh.spd) + 5, spc: stat(base + sh.spc) + 5, base: base, status: '', sleep: 0, held: '', moves: abMoveList(element, level, type, pp, chosen, id) };
}
// Gold's gender: most kinds are male or female (legends and the ultra trio have none). A kind you own keeps the one it was caught with (state.genders), else a fixed one from its name.
function abGenderOf(id) {
  const sp = getSpecies(id);
  if (!sp || sp.legend || sp.ultra) return '';
  if (state.genders && state.genders[id]) return state.genders[id];
  let h = 5; for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) % 1009;
  return h % 2 ? 'm' : 'f';
}
function abGenderTag(m) { return m.g === 'm' ? ' \u2642' : m.g === 'f' ? ' \u2640' : ''; }
function abMon(id, level, hp, pp, chosen) {
  const sp = getSpecies(id), stage = getFormIndex(sp, level);
  const mon = abBuild(id, sp.forms[stage].name, sp.forms[stage].icon, sp.element, battleElement(sp), abBase(sp) + stage * 12, level, hp, pp, chosen);
  mon.g = abGenderOf(id);
  return mon;
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
  if (m.g) m.g = f.g || (Math.random() < 0.5 ? 'm' : 'f');          // a wild buddy is male or female by chance
  if (f.shiny) {                                                    // a shiny buddy is a little stronger, and glows once caught
    m.shiny = true; m.name = 'Shiny ' + m.name;
    ['max', 'hp', 'atk', 'def', 'spd', 'spc'].forEach(function (k) { m[k] = Math.floor(m[k] * 1.1); });
  }
  return m;
}
// One of your buddies, with the HP it has left.
// Gold's badge boost: each of the first journey's eight badges raises one stat of your buddies by an eighth (attack, defense, speed, special, and round again).
const AB_BADGE_STAT = ['atk', 'def', 'spd', 'spc', 'atk', 'def', 'spd', 'spc'];
function abBadgeBoost(m) {
  gymRegions().forEach(function (r, i) { if (hasBadge(r.id)) m[AB_BADGE_STAT[i]] = Math.floor(m[AB_BADGE_STAT[i]] * 9 / 8); });
  return m;
}
function abPartyMon(id) { const m = abMon(id, getBuddyLevel(id), state.advHp[id], state.advPp[id], state.advMoves[id]); m.held = state.held[id] || ''; return abBadgeBoost(m); }
// Gold's damage formula, step by step. Normal moves are physical (Attack against Defense); every other type is special (Special against Special), as in Gold.
// A burn halves a physical Attack. A critical hit doubles the damage before the +2; then the same-type bonus, type effectiveness and luck follow, each rounded down.
const AB_CRIT = 17 / 256, AB_CRIT_LENS = 32 / 256;     // the critical hit chance, and with a Scope Lens (one stage up)
function abDamage(att, def, move, crit) {
  const special = move.type !== 'normal';
  let A = abStat(att, special ? 'spc' : 'atk'), D = abStat(def, special ? 'spc' : 'def');
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
// Catching, Gold's rule: the species' catch rate (a Catch Net is a Poke Ball; the Great and Ultra Nets are x1.5 and x2) shrinks with the foe's HP, a sleeping foe adds 10, and the net holds if a 0-255 roll is at most that. Returns 0 to 1.
function abCatchA(foe, ball) {
  const sp = getSpecies(foe.id);
  const rate = Math.min(255, Math.floor((sp.legend ? 3 : !isStoreBuddy(sp) ? 45 : sp.cost < 150 ? 255 : sp.cost < 800 ? 120 : 45) * (ball || 1)));
  const a = Math.max(1, Math.floor(rate * (3 * foe.max - 2 * foe.hp) / (3 * foe.max))) + (foe.status === 'sleep' || foe.status === 'freeze' ? 10 : 0);
  return Math.min(255, a);
}
function abCatchChance(foe, ball) { return (abCatchA(foe, ball) + 1) / 256; }
// How many times the net shakes before it breaks free: each check passes more often when the catch value is high.
function abShakes(a) {
  const pass = (63 + (a - 1) * 192 / 254) / 255;
  let n = 0;
  while (n < 3 && Math.random() < pass) n++;
  return n;
}
