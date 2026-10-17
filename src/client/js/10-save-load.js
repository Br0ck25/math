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
  state.faintedPets = fixList(state.faintedPets);
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
  function records(s) {
    const r = s.records;
    r.fastest = isFinite(r.fastest) ? clamp(r.fastest, 0, 3600) : 0;
    r.bestStreak = asInt(r.bestStreak, 0, 1000000, 0);
    r.solved = asInt(r.solved, 0, 100000000, 0);
    r.attempts = asInt(r.attempts, 0, 100000000, 0);
    if (typeof r.fastestOp !== 'string' || !OP_BY_ID[r.fastestOp]) r.fastestOp = '';
  },
  function map(s) {
    s.badges = s.badges.filter(function (id, i) { return gymRegions().some(function (r) { return r.id === id; }) && s.badges.indexOf(id) === i; });
    if (!REGIONS.some(function (r) { return r.id === s.region; })) s.region = 'meadow';
    const g = s.gym;
    const rematch = !!(g && g.rematch === true && s.storySeen.champion && g.region && s.badges.indexOf(g.region) !== -1);     // a rematch is only for Champions, in a land they cleared
    if (g && isPlainObject(g) && g.region === 'champion' && gymRegions().every(function (r) { return s.badges.indexOf(r.id) !== -1; })) {      // the Champion's Hall needs all six badges
      const champ = cleanChampionRun(g.champ);
      s.gym = { region: 'champion', step: champ.fallen.length, champ: champ };
    } else if (g && isPlainObject(g) && gymRegions().some(function (r) { return r.id === g.region; }) && (s.badges.indexOf(g.region) === -1 || rematch)) {
      s.gym = { region: g.region, step: asInt(g.step, 0, ECON.map.trainers, 0) };
      if (rematch) s.gym.rematch = true;
      s.region = g.region;
    } else s.gym = null;
    const rm = s.rematch;
    rm.day = typeof rm.day === 'string' ? rm.day.slice(0, 12) : '';
    rm.lands = Array.isArray(rm.lands) ? rm.lands.filter(function (id, i, a) { return gymRegions().some(function (r) { return r.id === id; }) && a.indexOf(id) === i; }).slice(0, ECON.map.rematch.perDay) : [];
    rm.wins = asInt(rm.wins, 0, 1e6, 0);
    if (!isPlainObject(s.champ)) s.champ = { wins: 0, day: '' };
    s.champ.wins = asInt(s.champ.wins, 0, 1e6, 0);
    s.champ.day = typeof s.champ.day === 'string' ? s.champ.day.slice(0, 12) : '';
  },
  function daily(s) {
    s.daily.day = typeof s.daily.day === 'string' ? s.daily.day.slice(0, 12) : '';
    s.daily.fights = asInt(s.daily.fights, 0, 1000, 0);
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
    l.day = typeof l.day === 'string' ? l.day.slice(0, 12) : '';
    l.caught = l.caught === true;
    l.misses = asInt(l.misses, 0, 20, 0);
    l.race = l.caught && (l.race === 'won' || l.race === 'lost') ? l.race : '';
    l.wins = asInt(l.wins, 0, 1e6, 0);
  },
  function packs(s) {
    s.packClaims = s.packClaims.filter(function (id, i, a) { return typeof id === 'string' && PACK_BY_ID[id] && a.indexOf(id) === i; });
  },
  function wild(s) {
    const w = s.wild;
    const ok = w.id && (wildPool().some(function (p) { return p.id === w.id; }) || (w.legend === true && legendPets.some(function (p) { return p.id === w.id; })));
    w.id = ok ? w.id : '';
    w.legend = w.legend === true && !!w.id && !w.trainer && legendPets.some(function (p) { return p.id === w.id; });
    w.shiny = w.shiny === true && !!w.id && !w.trainer;
    w.trainer = KNOWN_TRAINERS.indexOf(w.trainer) !== -1 && w.id ? w.trainer : '';
    w.since = asInt(w.since, 0, 50, 0);
    w.next = asInt(w.next, ECON.wild.bossEvery[0], ECON.wild.bossEvery[1], 6);
    delete w.miss;                                   // an old catch-streak counter
    const owned = s.unlockedPets.concat(s.unlockedSecrets), spares = {};
    Object.keys(s.spares).forEach(function (id) {
      const n = asInt(s.spares[id], 0, 99, 0);
      if (n > 0 && owned.indexOf(id) !== -1) spares[id] = n;
    });
    s.spares = spares;
  },
  function moves(s) {
    const set = {}, ids = MOVES.filter(function (m) { return m.kind !== 'ult'; }).map(function (m) { return m.id; });
    Object.keys(s.moveSet || {}).forEach(function (b) {
      if (!getSpecies(b) || !Array.isArray(s.moveSet[b])) return;
      set[b] = s.moveSet[b].filter(function (id, i, a) { return ids.indexOf(id) !== -1 && a.indexOf(id) === i; }).slice(0, ECON.moves.slots);
    });
    s.moveSet = set;
  },
  function bossBook(s) {
    const book = {};
    Object.keys(s.bossBook || {}).forEach(function (k) {
      const e = s.bossBook[k];
      if (!monstersList[k] || !e || typeof e !== 'object') return;
      book[k] = { wins: asInt(e.wins, 0, 1e6, 0), form: asInt(e.form, -1, 2, -1), alpha: asInt(e.alpha, 0, 1e6, 0) };
    });
    s.bossBook = book;
    s.bossSwapped = s.bossSwapped === true;
  },
  function calendar(s) {
    const sc = s.streakCal;
    sc.count = asInt(sc.count, 0, ECON.calendar.length, 0);
    sc.total = asInt(sc.total, 0, 1e6, 0);
  },
  function parent(s) {
    s.parentGoal.minutes = asInt(s.parentGoal.minutes, ECON.parents.goal.minMinutes, ECON.parents.goal.maxMinutes, 20);
    s.parentGoal.reward = String(s.parentGoal.reward || '').slice(0, 60);
    if (!/^[0-9a-f]{64}$|^$/.test(s.parentPinHash)) s.parentPinHash = '';
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
    s.challengePaid = s.challengePaid.filter(function (n) { return typeof n === 'string' && n.length <= 20; }).slice(-20);
    ['w', 'l', 't'].forEach(function (k) { s.duelRecord[k] = asInt(s.duelRecord[k], 0, 1e6, 0); });
    s.duelStat.count = asInt(s.duelStat.count, 0, 1e6, 0);
    ['runs', 'trophies', 'wins'].forEach(function (k) { s.tour[k] = asInt(s.tour[k], 0, 1e6, 0); });
    s.raidsCleared = asInt(s.raidsCleared, 0, 1e6, 0);
    s.lastRaidAt = asInt(s.lastRaidAt, 0, 1e9, 0);
  },
  function study(s) {
    const t = s.study, S = ECON.study, today = dayNumber();
    t.level = asInt(t.level, S.minLevel, S.maxLevel, S.minLevel);
    if (['all', 'parent', 'ky'].indexOf(t.subject) === -1 && !STUDY_SUBJECTS.some(function (x) { return x.id === t.subject; })) t.subject = 'all';
    const seen = {};
    Object.keys(t.seen).filter(function (id) { return STUDY_ID_RE.test(id) && Array.isArray(t.seen[id]); }).slice(0, 2000).forEach(function (id) {
      const e = t.seen[id];
      seen[id] = [asInt(e[0], 0, 1e6, 0), asInt(e[1], 0, 1e6, 0), asInt(e[2], 0, 1e6, 0)];
    });
    t.seen = seen;
    t.miss = t.miss.filter(function (id, i, a) { return typeof id === 'string' && STUDY_ID_RE.test(id) && a.indexOf(id) === i; }).slice(-S.missMax);
    const paid = {};
    Object.keys(t.paid).filter(function (id) { return STUDY_ID_RE.test(id); }).forEach(function (id) { const d = asInt(t.paid[id], 0, 1e7, -1); if (d >= 0 && today - d <= 14) paid[id] = d; });
    t.paid = paid;
    t.day = typeof t.day === 'string' ? t.day.slice(0, 12) : '';
    t.gems = asInt(t.gems, 0, S.dayCap, 0);
    t.rounds = asInt(t.rounds, 0, 1e6, 0);
  },
  function raid(s) {
    const r = s.raid;
    if (!r || typeof r !== 'object' || !Array.isArray(r.weaks) || !(r.total >= 2) || !(r.phase >= 0 && r.phase < r.total)) s.raid = null;
  }
];
function normalizeState() {
  state = fillDefaults(state, freshState());
  NORMALIZERS.forEach(function (fn) { fn(state); });
  state.v = SCHEMA_VERSION;
}

// Upgrades for saves written by older versions, oldest first. `old` is the raw parsed save.
const MIGRATIONS = {
  0: function (old) { migrateState(old); }   // saves from before schema versions existed (old solve-count system)
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

  partyHp = {};
  markDexSeen(state.wild.id);
  const wildFight = !!state.wild.id && !!state.bossLevel;
  if (wildFight || (state.currentMonsterIndex >= 0 && state.currentMonsterIndex < monstersList.length && state.recentBossTypes.length > 0 && state.bossLevel)) {
    currentMonsterIndex = state.currentMonsterIndex >= 0 && state.currentMonsterIndex < monstersList.length ? state.currentMonsterIndex : -1;
    bossLevel = clamp(state.bossLevel, 1, MAX_LEVEL);
    monsterCurrentHp = getBossMaxHp();
    if (inChampionBattle()) restoreChampionFoe();
  } else {
    currentMonsterIndex = -1;
    pickNextFoe();
  }
  bossMistakes = 0;
  markBossSeen(currentMonsterIndex);
}

// Keeps the save well under the server limit by dropping the oldest, least useful history.
function pruneState() {
  const days = Object.keys(state.stats.days).sort();
  while (days.length > 14) delete state.stats.days[days.shift()];
  state.duelSettled = state.duelSettled.slice(-20);
  state.challengePaid = state.challengePaid.slice(-20);
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
