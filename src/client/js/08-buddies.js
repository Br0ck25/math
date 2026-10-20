// =====================================================================
//  BUDDIES: LEVELS, XP, EVOLUTION LINES  (Pokémon style)
// =====================================================================
const MAX_LEVEL = 100;
// Gold's Medium Fast growth: a buddy needs level cubed experience in all.
function xpForLevel(L) { return L <= 1 ? 0 : L * L * L; }
function levelFromXp(xp) {
  let L = 1;
  while (L < MAX_LEVEL && xp >= xpForLevel(L + 1)) L++;
  return L;
}

// Store buddies: 3 forms (base -> evolved -> Mega)
storePets.forEach(function (p) {
  const e1 = 16 + Math.round(((p.evoLevel || 30) - 30) / 3.5);
  p.forms = [
    { name: p.name, icon: p.icon, minLevel: 1 },
    { name: p.evoName, icon: p.evoIcon, minLevel: e1 },
    { name: 'Mega ' + p.evoName, icon: p.evoIcon, minLevel: Math.max(e1 + 20, 55) }
  ];
});
// Rescued buddies: base -> Solar -> Cosmic
function secretForms(p) {
  return [
    { name: p.name, icon: p.icon, minLevel: 1 },
    { name: 'Solar ' + p.name, icon: p.icon, minLevel: 30 },
    { name: 'Cosmic ' + p.name, icon: p.icon, minLevel: 65 }
  ];
}
ultraPets.concat(bossBuddies).forEach(function (p) { p.forms = secretForms(p); });
mythicCompanions.forEach(function (p) { p.forms = secretForms(p); });
secretCompanions.forEach(function (p) { p.forms = secretForms(p); });
legendPets.forEach(function (p) { p.forms = secretForms(p); });

function getSpecies(id) {
  const ultra = ultraPets.find(function (p) { return p.id === id; });
  if (ultra) return ultra;
  const bb = bossBuddies.find(function (p) { return p.id === id; }) || legendPets.find(function (p) { return p.id === id; });
  if (bb) return bb;
  return storePets.find(function (p) { return p.id === id; }) ||
         mythicCompanions.find(function (p) { return p.id === id; }) ||
         secretCompanions.find(function (p) { return p.id === id; }) || null;
}
function getBuddyXp(id) { return (state.buddyXp && state.buddyXp[id]) || 0; }
function getBuddyLevel(id) { return levelFromXp(getBuddyXp(id)); }
function getFormIndex(sp, level) {
  let idx = 0;
  sp.forms.forEach(function (f, i) { if (level >= f.minLevel) idx = i; });
  return idx;
}

function getPetById(id) {
  const sp = getSpecies(id) || storePets[0];
  const level = getBuddyLevel(sp.id);
  const stage = getFormIndex(sp, level);
  const form = sp.forms[stage];
  const suffix = stage === 1 ? ' EX' : (stage === 2 ? ' MAX' : '');
  const path = stage > 0 && state.evoPath && EVO_PATHS[state.evoPath[sp.id]] ? state.evoPath[sp.id] : '';
  return {
    id: sp.id,
    name: (path ? EVO_PATHS[path].name + ' ' : '') + form.name,
    path: path,
    radiant: path === 'radiant',
    baseName: sp.name,
    icon: form.icon,
    emoji: form.emoji || form.icon,
    element: sp.element,
    superMove: sp.superMove + suffix,
    stage: stage,
    level: level,
    isEvolved: stage > 0,
    secret: !!sp.secret,
    mythic: !!sp.mythic,
    isJanie: !!sp.isJanie,
    ultra: !!sp.ultra
  };
}
function getArmorHp() { return getArmor(state.activeArmor).hp; }
// HP and attack of a buddy at a level and evolution stage (also used to show the jump when it evolves).
function petHpAt(level, stage) { return 3 + Math.floor(level / 8) + stage + getArmorHp(); }
function petAttackAt(level, stage) { return 1 + Math.floor(level / 12) + stage; }
function getPetMaxHp(id) { const p = getPetById(id); return petHpAt(p.level, p.stage) + evoBonus(p.path).hp + (typeof hasTech === 'function' && hasTech('iron_will') ? 1 : 0); }
function getPetAttack(id) { const p = getPetById(id); return petAttackAt(p.level, p.stage) + evoBonus(p.path).atk; }

function getPetHp(id) { return partyHp[id] === undefined ? getPetMaxHp(id) : Math.min(partyHp[id], getPetMaxHp(id)); }
function getOwnedIds() { return state.unlockedPets.concat(state.unlockedSecrets); }
function getBestLevel() {
  let best = 1;
  getOwnedIds().forEach(function (id) { best = Math.max(best, getBuddyLevel(id)); });
  return best;
}
// New buddies join at half the level of your strongest buddy
function grantBuddy(id) {
  if (state.buddyXp[id] === undefined) {
    state.buddyXp[id] = xpForLevel(Math.max(1, Math.floor(getBestLevel() * 0.5)));
  }
}

// The paths a buddy can take when it first evolves, and what each gives for good (see ECON.evo).
const EVO_PATHS = {
  radiant:  { name: 'Radiant',  hp: ECON.evo.radiantHp,  atk: ECON.evo.radiantAtk },
  guardian: { name: 'Guardian', hp: ECON.evo.guardianHp, atk: 0 },
  striker:  { name: 'Striker',  hp: 0, atk: ECON.evo.strikerAtk }
};
function evoBonus(path) { return EVO_PATHS[path] || { hp: 0, atk: 0 }; }

// XP for a buddy (the fighter by default).
function awardBuddyXp(amount, id) {
  id = id || state.activePet;
  amount = Math.round(amount * (1 + ECON.care.bondXpBonus * getBond(id)));
  const before = getPetById(id);
  const oldMax = getPetMaxHp(id);
  const curHp = getPetHp(id);
  state.buddyXp[id] = Math.min(xpForLevel(MAX_LEVEL), getBuddyXp(id) + amount);
  let after = getPetById(id);
  if (before.stage === 0 && after.stage > 0) {                                           // the first evolution picks a path
    state.evoPath[id] = getBond(id) + (getCare(id).fav ? 1 : 0) >= ECON.evo.bondMin ? 'radiant' : 'guardian';
    after = getPetById(id);
  }
  if (after.level > before.level) {
    state.gems += ECON.levelUpGemsPerLevel * (after.level - before.level);
    const newMax = getPetMaxHp(id);
    partyHp[id] = Math.min(newMax, curHp + (newMax - oldMax));
    soundLevelUp();
    launchConfetti('level');
    toast('⬆️ ' + after.baseName + ' grew to Lv ' + after.level + '!');
    checkRegionUnlocks();
    if (after.stage > before.stage) {
      state.gems += ECON.evolveGems;
      enqueueModal(function () { openEvoModal(before, after); });
    }
  }
  return after;
}

let evoShown = null;                       // the evolution on screen: { before, id }
function openEvoModal(before, after) {
  evoShown = { before: before, id: after.id };
  soundSecretFound();
  launchConfetti();
  document.getElementById('evo-title').innerText = 'What? ' + before.name + ' is evolving!';
  document.getElementById('evo-from').innerHTML = avatarHtml(before, 72);
  renderEvoModal();
  const m = document.getElementById('evo-modal');
  const row = m.querySelector('.evo-row');
  row.classList.remove('go'); void row.offsetWidth; row.classList.add('go');
  m.style.display = 'flex';
}
function renderEvoModal() {
  const before = evoShown.before, after = getPetById(evoShown.id), first = before.stage === 0 && !!after.path;
  document.getElementById('evo-to').innerHTML = avatarHtml(after, 72);
  document.getElementById('evo-text').innerText = before.name + ' evolved into ' + after.name + '!  (+25 💎)' + (first && after.radiant ? ' ✨ Your close bond made it Radiant: +' + ECON.evo.radiantHp + ' HP and +' + ECON.evo.radiantAtk + ' attack for good!' : '');
  document.getElementById('evo-stats').innerText =
    'Lv ' + before.level + ' ➜ ' + after.level + '  •  ❤️ HP ' + petHpAt(before.level, before.stage) + ' ➜ ' + getPetMaxHp(after.id) +
    '  •  ⚔️ ATK ' + petAttackAt(before.level, before.stage) + ' ➜ ' + getPetAttack(after.id) + '  •  Ult: ' + after.superMove ;
  const box = document.getElementById('evo-paths');
  box.style.display = first && !after.radiant ? '' : 'none';                 // a bonded buddy is Radiant; the others choose
  ['guardian', 'striker'].forEach(function (k) {
    const b = document.getElementById('evo-path-' + k), on = after.path === k;
    b.innerText = (k === 'guardian' ? '🛡️ Guardian +' + ECON.evo.guardianHp + ' HP' : '⚔️ Striker +' + ECON.evo.strikerAtk + ' ATK') + (on ? ' ✅' : '');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
// The player picks Guardian or Striker for a buddy that has just evolved (not for a Radiant one).
function chooseEvoPath(path) {
  if (!evoShown || (path !== 'guardian' && path !== 'striker') || evoShown.before.stage !== 0) return;
  const cur = getPetById(evoShown.id);
  if (!cur.path || cur.radiant) return;
  state.evoPath[evoShown.id] = path;
  soundClick();
  saveState();
  renderEvoModal();
}
function closeEvoModal() {
  soundClick();
  document.getElementById('evo-modal').style.display = 'none';
  updateStatsUI();
  saveState();
  modalDone();
}
