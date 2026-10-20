// =====================================================================
//  SAVE / LOAD (+ migration from the old solve-count system)
// =====================================================================
function migrateState(old) {
  state.buddyXp = state.buddyXp || {};
  const fixList = function (list) {
    const out = [];
    (list || []).forEach(function (id) {
      let base = id;
      if (typeof id === 'string' && id.slice(-4) === '_evo') {
        base = id.slice(0, -4);
        const sp = getSpecies(base);
        if (sp) state.buddyXp[base] = Math.max(state.buddyXp[base] || 0, xpForLevel(sp.forms[1].minLevel));
      }
      if (getSpecies(base) && out.indexOf(base) === -1) out.push(base);
    });
    return out;
  };
  state.unlockedPets = fixList(state.unlockedPets);
  state.unlockedSecrets = fixList(state.unlockedSecrets);
  if (typeof state.activePet === 'string' && state.activePet.slice(-4) === '_evo') state.activePet = state.activePet.slice(0, -4);

  if (old && old.companionSolves) {
    Object.keys(old.companionSolves).forEach(function (id) {
      const base = id.replace('_evo', '');
      state.buddyXp[base] = Math.max(state.buddyXp[base] || 0, old.companionSolves[id] * 14);
    });
  }
  delete state.companionSolves;
  delete state.mode;
  delete state.level;
  delete state.xp;
}

// ----- normalising a loaded save: never trust what comes out of localStorage or the cloud -----
function isPlainObject(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
function asInt(v, lo, hi, dflt) {
  const n = parseInt(v, 10);
  return isNaN(n) ? dflt : clamp(n, lo, hi);
}
// Fill every key that freshState() defines, replacing values of the wrong type. Extra keys are kept.
function fillDefaults(target, defaults) {
  const out = isPlainObject(target) ? target : {};
  Object.keys(defaults).forEach(function (k) {
    const d = defaults[k], v = out[k];
    if (Array.isArray(d)) out[k] = Array.isArray(v) ? v : d.slice();
    else if (isPlainObject(d)) out[k] = fillDefaults(v, d);
    else if (d === null) out[k] = v === undefined ? null : v;
    else out[k] = typeof v === typeof d ? v : d;
  });
  return out;
}
// One small function per feature. Each only repairs its own fields.
const NORMALIZERS = [
  function core(s) {
    s.gems = isFinite(s.gems) ? Math.max(0, s.gems) : 0;
    s.nets = asInt(s.nets, 0, ECON.wild.net.stock, 0);
    s.grade = clamp(parseInt(s.grade, 10) || 0, 0, GRADES.length - 1);
    if (!s.enabledOps.length) s.enabledOps = GRADE_DEFAULT_OPS[s.grade].slice();
    if (s.unlockedPets.indexOf('dog') === -1) s.unlockedPets.unshift('dog');
    if (!s.unlockedAccessories.length) s.unlockedAccessories = ['none'];
    if (!s.activeAccessory) s.activeAccessory = 'none';
    if (!s.unlockedArmor.length) s.unlockedArmor = ['none'];
    if (!s.activeArmor || s.unlockedArmor.indexOf(s.activeArmor) === -1) s.activeArmor = 'none';
    if (!getSpecies(s.activePet) || s.unlockedPets.concat(s.unlockedSecrets).indexOf(s.activePet) === -1) s.activePet = 'dog';
  },
  function map(s) {
    s.badges = s.badges.filter(function (id, i) { return allGymRegions().some(function (r) { return r.id === id; }) && s.badges.indexOf(id) === i; });
    if (!REGIONS.some(function (r) { return r.id === s.region; })) s.region = 'meadow';
    const regList = REGIONS.map(function (r) { return r.id; });
    s.regionsVisited = (Array.isArray(s.regionsVisited) ? s.regionsVisited : ['meadow']).filter(function (id, i, a) {
      return regList.indexOf(id) !== -1 && a.indexOf(id) === i;
    });
    if (s.regionsVisited.indexOf('meadow') === -1) s.regionsVisited.unshift('meadow');
    if (s.region && s.regionsVisited.indexOf(s.region) === -1) s.regionsVisited.push(s.region);
    s.badges.forEach(function (b) { if (s.regionsVisited.indexOf(b) === -1) s.regionsVisited.push(b); });
    s.gym = null;                                                  // a gym is a chain of Adventure fights that is not saved (24y-ow-arenas.js)
    const rm = s.rematch;
    rm.day = typeof rm.day === 'string' ? rm.day.slice(0, 12) : '';
    rm.lands = Array.isArray(rm.lands) ? rm.lands.filter(function (id, i, a) { return allGymRegions().some(function (r) { return r.id === id; }) && a.indexOf(id) === i; }).slice(0, ECON.map.rematch.perDay) : [];
    rm.wins = asInt(rm.wins, 0, 1e6, 0);
    if (!isPlainObject(s.champ)) s.champ = { wins: 0, master: 0, day: '', masterDay: '' };
    s.champ.wins = asInt(s.champ.wins, 0, 1e6, 0);
    s.champ.master = asInt(s.champ.master, 0, 1e6, 0);
    s.champ.masterDay = typeof s.champ.masterDay === 'string' ? s.champ.masterDay.slice(0, 12) : '';
    s.champ.day = typeof s.champ.day === 'string' ? s.champ.day.slice(0, 12) : '';
  },
  function held(s) {
    const ids = HELD_ITEMS.map(function (i) { return i.id; });
    s.heldOwned = s.heldOwned.filter(function (id, i) { return ids.indexOf(id) !== -1 && s.heldOwned.indexOf(id) === i; });
    const owned = s.unlockedPets.concat(s.unlockedSecrets), taken = {}, held = {};
    Object.keys(s.held).forEach(function (b) {
      const item = s.held[b];
      if (owned.indexOf(b) !== -1 && s.heldOwned.indexOf(item) !== -1 && !taken[item]) { held[b] = item; taken[item] = true; }
    });
    s.held = held;
  },
  function spring(s) {
    const sp = s.spring || {};
    s.spring = { day: typeof sp.day === 'string' ? sp.day.slice(0, 12) : '' };
  },
  function dex(s) {
    const seen = {};
    Object.keys(s.dexSeen).forEach(function (id) { if (s.dexSeen[id] && getSpecies(id)) seen[id] = 1; });
    s.dexSeen = seen;
  },
  function shinies(s) {
    const owned = s.unlockedPets.concat(s.unlockedSecrets), shiny = {};
    Object.keys(s.shinies || {}).forEach(function (id) { if (s.shinies[id] && owned.indexOf(id) !== -1) shiny[id] = 1; });
    s.shinies = shiny;
  },
  function legend(s) {
    const l = s.legend;
    l.week = asInt(l.week, -1, 1e6, -1);
    l.caught = l.caught === true;
    s.legend = { week: l.week, caught: l.caught };
  },
  function packs(s) {
  },
  function bossBook(s) {
    const book = {};
    Object.keys(s.bossBook || {}).forEach(function (k) {
      const e = s.bossBook[k];
      if (!monstersList[k] || !e || typeof e !== 'object') return;
      book[k] = { wins: asInt(e.wins, 0, 1e6, 0), form: asInt(e.form, -1, 2, -1), alpha: asInt(e.alpha, 0, 1e6, 0) };
    });
    s.bossBook = book;
  },
  function adapt(s) {
    const a = s.adapt, w = ECON.adaptive.window;
    ['miss', 'easy', 'calm', 'recent', 'tier'].forEach(function (k) { if (!isPlainObject(a[k])) a[k] = {}; });
    Object.keys(a.recent).forEach(function (op) {
      if (!OP_BY_ID[op] || typeof a.recent[op] !== 'string') delete a.recent[op];
      else a.recent[op] = a.recent[op].replace(/[^012]/g, '').slice(-w);
    });
    Object.keys(a.tier).forEach(function (op) {
      if (!OP_BY_ID[op] || [-1, 0, 1].indexOf(a.tier[op]) === -1) delete a.tier[op];
    });
    a.served = a.served.replace(/[^cn]/g, '').slice(-ECON.adaptive.servedWindow);
  },
  function social(s) {
    s.duelFriends = s.duelFriends.filter(function (n) { return typeof n === 'string' && /^[a-z0-9_-]{3,20}$/.test(n); }).slice(0, 8);
    s.duelSettled = s.duelSettled.filter(function (n) { return typeof n === 'string'; }).slice(-80);
    ['w', 'l', 't'].forEach(function (k) { s.duelRecord[k] = asInt(s.duelRecord[k], 0, 1e6, 0); });
    s.duelStat.count = asInt(s.duelStat.count, 0, 1e6, 0);
  },
  function study(s) {
    const t = s.study, S = ECON.study, today = dayNumber();
    t.level = asInt(t.level, S.minLevel, S.maxLevel, S.minLevel);
    if (typeof t.subject === 'string' && t.subject !== 'all' && !t.subjects.length) t.subjects = [t.subject];      // saves from when only one subject could be picked
    delete t.subject;
    t.subjects = t.subjects.filter(function (id, i, a) { return typeof id === 'string' && (['parent', 'ky'].indexOf(id) !== -1 || STUDY_SUBJECTS.some(function (x) { return x.id === id; })) && a.indexOf(id) === i; });
    const known = function (id) { return STUDY_ID_RE.test(id) && (id.charAt(0) === 'p' || STUDY_BANK.some(function (q) { return q.id === id; })); };      // a question that is no longer in the bank is forgotten (a parent's start with p)
    const seen = {};
    Object.keys(t.seen).filter(function (id) { return known(id) && Array.isArray(t.seen[id]); }).slice(0, 2000).forEach(function (id) {
      const e = t.seen[id];
      seen[id] = [asInt(e[0], 0, 1e6, 0), asInt(e[1], 0, 1e6, 0), asInt(e[2], 0, 1e6, 0)];
    });
    t.seen = seen;
    t.miss = t.miss.filter(function (id, i, a) { return typeof id === 'string' && known(id) && a.indexOf(id) === i; }).slice(-S.missMax);
    const paid = {};
    Object.keys(t.paid).filter(known).forEach(function (id) { const d = asInt(t.paid[id], 0, 1e7, -1); if (d >= 0 && today - d <= 14) paid[id] = d; });
    t.paid = paid;
    t.day = typeof t.day === 'string' ? t.day.slice(0, 12) : '';
    t.gems = asInt(t.gems, 0, S.dayCap, 0);
    t.rounds = asInt(t.rounds, 0, 1e6, 0);
  },
  function egg(s) {
    const e = s.egg;
    const validElems = ['fire', 'water', 'nature', 'electric', 'dark', 'magic'];
    const validRarities = ['common', 'rare', 'mythic'];
    if (!e || typeof e !== 'object' || validElems.indexOf(e.element) === -1) {
      s.egg = null;
    } else {
      const rar = validRarities.indexOf(e.rarity) !== -1 ? e.rarity : 'common';
      const defTarget = (ECON.egg && ECON.egg.steps && ECON.egg.steps[rar]) || 5;
      const target = asInt(e.target, 1, 50, defTarget);
      s.egg = { element: e.element, rarity: rar, steps: asInt(e.steps, 0, target, 0), target: target };
    }
  },
  function readAloud(s) {
    s.readAloud = s.readAloud === true;
  },
  function hero(s) {
    const h = isPlainObject(s.hero) ? s.hero : {}, l = isPlainObject(h.look) ? h.look : {};
    s.hero = { name: cleanHeroName(h.name), look: { skin: asInt(l.skin, 0, HERO_SKINS.length - 1, 0), hair: asInt(l.hair, 0, HERO_HAIRS.length - 1, 0), outfit: asInt(l.outfit, 0, HERO_OUTFITS.length - 1, 0), style: asInt(l.style, 0, HERO_STYLES.length - 1, 0) }, made: h.made === true };
  },
  function keyItems(s) {
    const known = KEY_ITEMS.map(function (k) { return k.id; });
    s.keyItems = (Array.isArray(s.keyItems) ? s.keyItems : []).filter(function (id, i, a) { return known.indexOf(id) !== -1 && a.indexOf(id) === i; });
  },
  function adventureBattle(s) {
    const owned = getOwnedIds(), hp = isPlainObject(s.advHp) ? s.advHp : {};
    s.advHp = {};
    Object.keys(hp).forEach(function (id) { if (owned.indexOf(id) !== -1 && Number.isFinite(hp[id])) s.advHp[id] = clamp(Math.floor(hp[id]), 0, 9999); });
    const mv = isPlainObject(s.advMoves) ? s.advMoves : {};
    s.advMoves = {};
    Object.keys(mv).forEach(function (id) {
      if (owned.indexOf(id) !== -1 && Array.isArray(mv[id])) s.advMoves[id] = mv[id].filter(function (m, i, a) { return typeof m === 'string' && m.length <= 16 && a.indexOf(m) === i; }).slice(0, 4);
    });
    const pp = isPlainObject(s.advPp) ? s.advPp : {};
    s.advPp = {};
    Object.keys(pp).forEach(function (id) {
      if (owned.indexOf(id) === -1 || !isPlainObject(pp[id])) return;
      s.advPp[id] = {};
      Object.keys(pp[id]).slice(0, 8).forEach(function (m) { if (Number.isFinite(pp[id][m])) s.advPp[id][m.slice(0, 16)] = clamp(Math.floor(pp[id][m]), 0, 99); });
    });
    s.repelSteps = asInt(s.repelSteps, 0, ECON.overworld.repelSteps * 3, 0);
    s.potions = clamp(Math.floor(Number(s.potions)) || 0, 0, 99);
  },
  function overworld(s) {
    const o = isPlainObject(s.overworld) ? s.overworld : {};
    const map = OW_MAPS[o.map] || OW_MAPS[OW_START.map];
    const spot = owWalkable(map, o.x, o.y) && !owNpcAt(map, o.x, o.y) ? { x: o.x, y: o.y } : map.start;     // a hero that is not on a free walkable tile (a bad or old save) goes back to the start
    const known = function (kind, list) { return (Array.isArray(list) ? list : []).filter(function (id, i, a) { return owIds(kind).indexOf(id) !== -1 && a.indexOf(id) === i; }).slice(0, 200); };
    const sg = isPlainObject(o.signs) ? o.signs : {}, c = isPlainObject(o.center) ? o.center : {}, cm = OW_MAPS[c.map];
    const center = cm && owWalkable(cm, c.x, c.y) && !owNpcAt(cm, c.x, c.y) ? { map: c.map, x: c.x, y: c.y } : { map: OW_START.map, x: OW_MAPS[OW_START.map].start.x, y: OW_MAPS[OW_START.map].start.y };     // a Center that is not a place to stand: the start
    s.overworld = { map: map.id, x: spot.x, y: spot.y, face: OW_FACES.indexOf(o.face) !== -1 ? o.face : 'down',
      found: known('pickup', o.found), signs: { day: typeof sg.day === 'string' ? sg.day.slice(0, 10) : '', ids: known('sign', sg.ids) }, center: center, beat: known('trainer', o.beat), story: known('story', o.story), walk: { day: isPlainObject(o.walk) && typeof o.walk.day === 'string' ? o.walk.day.slice(0, 10) : '', n: isPlainObject(o.walk) ? asInt(o.walk.n, 0, 1e9, 0) : 0, eggs: isPlainObject(o.walk) ? asInt(o.walk.eggs, 0, 99, 0) : 0 }, seen: (Array.isArray(o.seen) ? o.seen : []).filter(function (id, i, a) { return owTowns().indexOf(id) !== -1 && a.indexOf(id) === i; }), traded: known('npc', o.traded), shaken: { day: typeof (isPlainObject(o.shaken) ? o.shaken : {}).day === 'string' ? o.shaken.day.slice(0, 10) : '', ids: known('tree', (isPlainObject(o.shaken) ? o.shaken : {}).ids) } };
  }
];
function normalizeState() {
  state = fillDefaults(state, freshState());
  NORMALIZERS.forEach(function (fn) { fn(state); });
  state.v = SCHEMA_VERSION;
}

// Upgrades for saves written by older versions, oldest first. `old` is the raw parsed save.
const MIGRATIONS = {
  0: function (old) { migrateState(old); },   // saves from before schema versions existed (old solve-count system)
  // The experience curve became Gold's (level cubed): every buddy keeps its level, with the experience that level now needs.
  1: function (old) {
    const oldNeed = function (L) { return L <= 1 ? 0 : Math.floor(2.4 * Math.pow(L, 2.3)); };
    if (!isPlainObject(old.buddyXp)) return;
    Object.keys(old.buddyXp).forEach(function (id) {
      const xp = Number(old.buddyXp[id]) || 0;
      let L = 1;
      while (L < MAX_LEVEL && xp >= oldNeed(L + 1)) L++;
      old.buddyXp[id] = L * L * L;
    });
  }
};
function migrateSave(old) {
  for (let v = parseInt(old.v, 10) || 0; v < SCHEMA_VERSION; v++) if (MIGRATIONS[v]) MIGRATIONS[v](old);
}

function loadState() {
  const saved = localStorage.getItem('math_quest_save');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state = Object.assign(freshState(), parsed);
      migrateSave(parsed);
    } catch (e) {
      state = freshState();
    }
  }
  normalizeState();

}

// Keeps the save well under the server limit by dropping the oldest, least useful history.
function pruneState() {
  state.duelSettled = state.duelSettled.slice(-20);
}
function serializeState() {
  let json = JSON.stringify(state);
  if (json.length > ECON.save.softLimitBytes) { pruneState(); json = JSON.stringify(state); }
  return json;
}

function saveState() {
  try { localStorage.setItem('math_quest_save', serializeState()); } catch (e) {}
  if (typeof acctMarkDirty === 'function') acctMarkDirty();
}
