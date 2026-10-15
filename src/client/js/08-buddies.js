// =====================================================================
//  BUDDIES: LEVELS, XP, EVOLUTION LINES  (Pokémon style)
// =====================================================================
const MAX_LEVEL = 100;
function xpForLevel(L) { return L <= 1 ? 0 : Math.floor(2.4 * Math.pow(L, 2.3)); }
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

function getSpecies(id) {
  const ultra = ultraPets.find(function (p) { return p.id === id; });
  if (ultra) return ultra;
  const bb = bossBuddies.find(function (p) { return p.id === id; });
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
  return {
    id: sp.id,
    name: form.name,
    baseName: sp.name,
    icon: form.icon,
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
function getActivePetDisplay() { return getPetById(state.activePet); }

function getArmorHp() { return getArmor(state.activeArmor).hp; }
function getPetMaxHp(id) { const p = getPetById(id); return 3 + Math.floor(p.level / 8) + p.stage + getArmorHp(); }
function getPetAttack(id) { const p = getPetById(id); return 1 + Math.floor(p.level / 12) + p.stage; }

function getPetHp(id) { return partyHp[id] === undefined ? getPetMaxHp(id) : Math.min(partyHp[id], getPetMaxHp(id)); }
function setPetHp(id, v) { partyHp[id] = Math.max(0, v); }

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

function awardBuddyXp(amount) {
  const id = state.activePet;
  amount = Math.round(amount * (1 + ECON.care.bondXpBonus * getBond(id)));
  const before = getPetById(id);
  const oldMax = getPetMaxHp(id);
  const curHp = getPetHp(id);
  state.buddyXp[id] = Math.min(xpForLevel(MAX_LEVEL), getBuddyXp(id) + amount);
  const after = getPetById(id);
  if (after.level > before.level) {
    state.gems += ECON.levelUpGemsPerLevel * (after.level - before.level);
    const newMax = getPetMaxHp(id);
    partyHp[id] = Math.min(newMax, curHp + (newMax - oldMax));
    soundLevelUp();
    launchConfetti('level');
    toast('⬆️ ' + after.baseName + ' grew to Lv ' + after.level + '!');
    if (after.stage > before.stage) {
      state.gems += ECON.evolveGems;
      enqueueModal(function () { openEvoModal(before, after); });
    }
  }
  return after;
}

function openEvoModal(before, after) {
  soundSecretFound();
  launchConfetti();
  document.getElementById('evo-title').innerText = 'What? ' + before.name + ' is evolving!';
  document.getElementById('evo-from').innerHTML = avatarHtml(before, 72);
  document.getElementById('evo-to').innerHTML = avatarHtml(after, 72);
  document.getElementById('evo-text').innerText = before.name + ' evolved into ' + after.name + '!  (+25 💎)';
  document.getElementById('evo-stats').innerText =
    'Lv ' + after.level + '  •  ❤️ HP ' + getPetMaxHp(after.id) + '  •  ⚔️ ATK ' + getPetAttack(after.id) + '  •  Ult: ' + after.superMove;
  const m = document.getElementById('evo-modal');
  const row = m.querySelector('.evo-row');
  row.classList.remove('go'); void row.offsetWidth; row.classList.add('go');
  m.style.display = 'flex';
}
function closeEvoModal() {
  soundClick();
  document.getElementById('evo-modal').style.display = 'none';
  updateStatsUI();
  saveState();
  modalDone();
}
