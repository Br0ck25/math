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
  return {
    id: sp.id,
    name: form.name,
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
function getPetMaxHp(id) { const p = getPetById(id); return petHpAt(p.level, p.stage); }
function getPetAttack(id) { const p = getPetById(id); return petAttackAt(p.level, p.stage); }

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

// XP for a buddy (the fighter by default).
function awardBuddyXp(amount, id) {
  id = id || state.activePet;
  const before = getPetById(id);
  const oldMax = getPetMaxHp(id);
  const curHp = getPetHp(id);
  state.buddyXp[id] = Math.min(xpForLevel(MAX_LEVEL), getBuddyXp(id) + amount);
  let after = getPetById(id);
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
  const before = evoShown.before, after = getPetById(evoShown.id);
  document.getElementById('evo-to').innerHTML = avatarHtml(after, 72);
  document.getElementById('evo-text').innerText = before.name + ' evolved into ' + after.name + '!  (+25 💎)' + '';
  document.getElementById('evo-stats').innerText =
    'Lv ' + before.level + ' ➜ ' + after.level + '  •  ❤️ HP ' + petHpAt(before.level, before.stage) + ' ➜ ' + getPetMaxHp(after.id) +
    '  •  ⚔️ ATK ' + petAttackAt(before.level, before.stage) + ' ➜ ' + getPetAttack(after.id) + '  •  Ult: ' + after.superMove ;
}
function closeEvoModal() {
  soundClick();
  document.getElementById('evo-modal').style.display = 'none';
  updateStatsUI();
  saveState();
  modalDone();
}

// ----- the team: who can fight, who leads, who a new buddy replaces -----
// Up to ECON.team.max (6) buddies. Only team members can fight, so your current fighter is always on it. With no team picked, it is your strongest buddies.
function getTeam() {
  const owned = getOwnedIds();
  let t = state.team.filter(function (id, i) { return owned.indexOf(id) !== -1 && state.team.indexOf(id) === i; }).slice(0, ECON.team.max);
  if (!t.length) {
    t = owned.slice().sort(function (a, b) { return getBuddyLevel(b) - getBuddyLevel(a); }).slice(0, ECON.team.max);
  }
  if (t.indexOf(state.activePet) === -1 && owned.indexOf(state.activePet) !== -1) t = [state.activePet].concat(t).slice(0, ECON.team.max);
  return t;
}
// The lead is the buddy sent out first in a battle. Changing it is free; only a team member can lead, and one that has fainted cannot.
function setLead(id) {
  if (id === state.activePet) return false;
  if (getTeam().indexOf(id) === -1) { soundWrong(); toast('Only your team can fight. Add it to your team first.'); return false; }
  if (state.advHp[id] === 0) { soundWrong(); toast(getPetById(id).name + ' has fainted. Rest at a Buddy Center first.'); return false; }
  state.activePet = id;
  return true;
}
// A new buddy joins the team only if there is room (and then it may fight); otherwise it waits in your collection.
function joinTeamIfRoom(id) {
  const t = getTeam();
  if (t.indexOf(id) !== -1) return true;
  if (t.length >= ECON.team.max) return false;
  state.team = t.concat(id);
  return true;
}
// ----- adding a buddy to a full team: choose who it replaces -----
let replaceFor = '';
function openReplaceModal(newId) {
  replaceFor = newId;
  showModal('replace-modal', renderReplace);
}
function closeReplace() { replaceFor = ''; hideModal('replace-modal'); }
function renderReplace() {
  const sp = getPetById(replaceFor);
  document.getElementById('replace-title').innerText = 'Which buddy should ' + sp.name + ' replace?';
  const list = document.getElementById('replace-options');
  list.innerHTML = '';
  getTeam().forEach(function (id) {
    const d = getPetById(id);
    const resting = false;
    const locked = false;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'move-btn' + (locked ? ' off' : '');
    b.disabled = locked;
    const note = 'Lv ' + d.level;
    b.innerHTML = '<span class="mv-icon">' + d.icon + '</span><span class="mv-main"><b>' + escHtml(d.name) + '</b><small>' + escHtml(note) + '</small></span>';
    b.setAttribute('aria-label', 'Replace ' + d.name + '. ' + note);
    b.onclick = function () { replaceTeamMember(id); };
    list.appendChild(b);
  });
}
function replaceTeamMember(oldId) {
  const newId = replaceFor;
  const t = getTeam(), i = t.indexOf(oldId);
  if (!newId || i === -1) { soundWrong(); return; }
  t[i] = newId;
  state.team = t;
  const name = getPetById(newId).name;
  closeReplace();
  if (oldId === state.activePet) state.activePet = newId;          // the new buddy takes the lead
  else toast(name + ' joined your team in place of ' + getPetById(oldId).name + '.');
  soundClick();
  saveState();
  updateStatsUI();
  if (typeof rerenderShop === 'function' && document.getElementById('shop-modal').style.display === 'flex') rerenderShop();
  if (document.getElementById('pad-modal').style.display === 'flex') padRefresh();
}
