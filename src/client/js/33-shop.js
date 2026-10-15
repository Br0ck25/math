// =====================================================================
//  SANCTUARY (shop)
// =====================================================================
function hasUnlockedAllOtherStorePets() {
  return storePets.filter(function (p) { return !p.requiresAllStorePets; })
    .every(function (p) { return state.unlockedPets.indexOf(p.id) !== -1; });
}
function getUnownedStorePetsCount() {
  const others = storePets.filter(function (p) { return !p.requiresAllStorePets; });
  return { owned: others.filter(function (p) { return state.unlockedPets.indexOf(p.id) !== -1; }).length, total: others.length };
}

function fillBuddyTotals() {
  document.getElementById('store-total-count').innerText = storePets.length;
  document.getElementById('store-owned-count').innerText = storePets.filter(function (p) { return state.unlockedPets.indexOf(p.id) !== -1; }).length;
  document.getElementById('mythic-total-count').innerText = mythicCompanions.length;
  document.getElementById('secret-total-count').innerText = secretCompanions.length;
}
function rerenderShop() {
  fillBuddyTotals();
  renderShopPets();
  renderArmor();
  renderAccessories();
  renderSecretPets();
  updateStatsUI();
}
function openShop() { showModal('shop-modal', rerenderShop); }
function closeShop() { hideModal('shop-modal', updateStatsUI); }

function renderArmor() {
  const container = document.getElementById('armor-grid');
  container.innerHTML = '';
  armorList.forEach(function (ar) {
    const isUnlocked = state.unlockedArmor.indexOf(ar.id) !== -1;
    const isEquipped = state.activeArmor === ar.id;
    const card = document.createElement('div');
    card.className = 'pet-card' + (isEquipped ? ' selected' : '') + (!isUnlocked ? ' locked' : '');
    card.onclick = function () { selectOrBuyArmor(ar); };
    card.innerHTML = `
      <div class="card-pic" style="font-size: 1.9rem; min-height: 36px; display: flex; align-items: center; justify-content: center;">${ar.icon}</div>
      <div class="card-name">${ar.name}</div>
      <div class="armor-hp">${ar.hp > 0 ? '+' + ar.hp + ' HP' : 'No bonus'}</div>
      <div style="font-size: 0.7rem; color: ${isUnlocked ? '#10b981' : '#f59e0b'}; font-weight: 700;">
        ${isEquipped ? 'Worn' : isUnlocked ? 'Equip' : gearLockText(ar)}
      </div>`;
    container.appendChild(card);
  });
}

function selectOrBuyArmor(ar) {
  const owned = state.unlockedArmor.indexOf(ar.id) !== -1;
  if (!owned) {
    if (ar.earn) { soundWrong(); toast('🔒 Earn it: ' + ar.earn.text); return; }
    if (state.gems < ar.cost) {
      soundWrong();
      toast(`You need ${ar.cost - state.gems} more 💎 Gems for ${ar.name}!`);
      return;
    }
    state.gems -= ar.cost;
    state.unlockedArmor.push(ar.id);
    soundLevelUp();
    launchConfetti();
  } else {
    soundClick();
  }
  const oldBonus = getArmorHp();
  state.activeArmor = ar.id;
  const diff = getArmorHp() - oldBonus;
  // keep current-fight HP in step with the new max (a downed buddy stays down)
  Object.keys(partyHp).forEach(function (pid) {
    if (partyHp[pid] > 0) partyHp[pid] = Math.max(1, Math.min(getPetMaxHp(pid), partyHp[pid] + diff));
  });
  saveState();
  rerenderShop();
}

function renderAccessories() {
  const container = document.getElementById('accessories-grid');
  container.innerHTML = '';
  accessoriesList.forEach(function (acc) {
    const isUnlocked = state.unlockedAccessories.indexOf(acc.id) !== -1;
    const isEquipped = state.activeAccessory === acc.id;
    const card = document.createElement('div');
    card.className = `pet-card ${isEquipped ? 'selected' : ''} ${!isUnlocked ? 'locked' : ''}`;
    card.onclick = function () { selectOrBuyAccessory(acc); };
    card.innerHTML = `
      <div class="card-pic" style="font-size: 1.9rem; min-height: 36px; display: flex; align-items: center; justify-content: center;">${acc.icon}</div>
      <div style="font-weight: 700; font-size: 0.78rem;">${acc.name}</div>
      <div style="font-size: 0.7rem; color: ${isUnlocked ? '#10b981' : '#f59e0b'}; font-weight: 700;">
        ${isEquipped ? 'Worn' : isUnlocked ? 'Equip' : gearLockText(acc)}
      </div>`;
    container.appendChild(card);
  });
}

function selectOrBuyAccessory(acc) {
  if (state.unlockedAccessories.indexOf(acc.id) !== -1) {
    state.activeAccessory = acc.id;
    soundClick();
  } else if (acc.earn) {
    soundWrong();
    toast('🔒 Earn it: ' + acc.earn.text);
  } else if (state.gems >= acc.cost) {
    state.gems -= acc.cost;
    state.unlockedAccessories.push(acc.id);
    state.activeAccessory = acc.id;
    soundLevelUp();
    launchConfetti();
  } else {
    soundWrong();
    toast(`You need ${acc.cost - state.gems} more 💎 Gems to unlock ${acc.name}!`);
  }
  saveState();
  renderAccessories();
  updateStatsUI();
}

function nextEvoText(sp, level) {
  const next = sp.forms.find(function (f) { return f.minLevel > level; });
  return next ? `Evolves Lv ${next.minLevel}` : 'Final form ⭐';
}

function makePetCard(sp, o) {
  const owned = !!o.owned;
  const d = owned ? getPetById(sp.id) : { name: sp.name, icon: sp.icon, element: sp.element, level: 0, stage: 0 };
  const selected = owned && state.activePet === sp.id;
  const fainted = owned && state.faintedPets.indexOf(sp.id) !== -1;

  const card = document.createElement('div');
  card.className = 'pet-card' + (selected ? ' selected' : '') + (!owned ? ' locked' : '') + (fainted ? ' fainted' : '');
  if (o.accent) card.style.borderColor = selected ? o.accent : (fainted ? '#ef4444' : o.dim);
  card.onclick = o.onclick;

  let statusText = o.statusText, statusColor = o.statusColor;
  if (owned) {
    if (fainted) { statusText = '💔 Resting'; statusColor = '#ef4444'; }
    else if (selected) { statusText = 'Active'; statusColor = '#10b981'; }
    else { statusText = 'Equip'; statusColor = o.equipColor || '#10b981'; }
  }
  const stats = owned ? `Lv ${d.level} ❤️${getPetMaxHp(sp.id)} ⚔️${getPetAttack(sp.id)}` : 'Not owned yet';
  const evo = owned ? nextEvoText(sp, d.level) : `Evolves Lv ${sp.forms[1].minLevel}`;
  const nameColor = o.nameColor ? `color:${o.nameColor};` : '';

  card.innerHTML = `
    <div class="icon-wrap" style="min-height: 44px; display: flex; align-items: center; justify-content: center;">${avatarHtml(d, 40)}</div>
    <div class="card-name" style="${nameColor}">${d.name}</div>
    <div style="margin: 1px 0;"><span class="element-pill elem-${d.element}">${d.element}</span></div>
    <div style="font-size: 0.62rem; color: #cbd5e1;">${stats}</div>
    <div style="font-size: 0.62rem; color: #a5b4fc;">${evo}</div>
    <div style="font-size: 0.68rem; color: ${statusColor}; font-weight: 800;">${statusText}</div>`;
  return card;
}

function equipPet(id) {
  if (state.faintedPets.indexOf(id) !== -1) {
    soundWrong();
    toast(`${getPetById(id).name} is resting! Defeat this boss to revive your team.`);
    return;
  }
  state.activePet = id;
  soundClick();
  saveState();
  rerenderShop();
}

function renderShopPets() {
  const container = document.getElementById('pet-grid');
  container.innerHTML = '';
  const otherStats = getUnownedStorePetsCount();
  const allOthersOwned = hasUnlockedAllOtherStorePets();

  storePets.forEach(function (pet) {
    const owned = state.unlockedPets.indexOf(pet.id) !== -1;
    const lockedBandit = pet.requiresAllStorePets && !allOthersOwned && !owned;
    container.appendChild(makePetCard(pet, {
      owned: owned,
      statusText: lockedBandit ? `🔒 Needs All ${otherStats.total} (${otherStats.owned}/${otherStats.total})` : `💎 ${pet.cost}`,
      statusColor: lockedBandit ? '#94a3b8' : '#f59e0b',
      onclick: function () { selectOrBuyPet(pet); }
    }));
  });
}

function selectOrBuyPet(pet) {
  if (state.unlockedPets.indexOf(pet.id) !== -1) { equipPet(pet.id); return; }

  if (pet.requiresAllStorePets && !hasUnlockedAllOtherStorePets()) {
    const s = getUnownedStorePetsCount();
    soundWrong();
    toast(`Adopt all ${s.total} other Store Buddies first! (${s.owned}/${s.total})`);
    return;
  }
  if (state.gems < pet.cost) {
    soundWrong();
    toast(`You need ${pet.cost - state.gems} more 💎 Gems to adopt ${pet.name}!`);
    return;
  }
  state.gems -= pet.cost;
  grantBuddy(pet.id);
  state.unlockedPets.push(pet.id);
  checkEarnedGear();
  state.activePet = pet.id;
  soundLevelUp();
  launchConfetti();
  toast(`${pet.name} joined your team at Lv ${getBuddyLevel(pet.id)}!`);
  saveState();
  rerenderShop();
}

// Fills "<name>-pet-grid" with the owned buddies of a short list and "<name>-found-count" / "<name>-total-count" with the totals.
function fillBuddyGrid(name, list, emptyNote, look) {
  const box = document.getElementById(name + '-pet-grid');
  box.innerHTML = '';
  const found = list.filter(function (u) { return state.unlockedSecrets.indexOf(u.id) !== -1; });
  document.getElementById(name + '-found-count').innerText = found.length;
  document.getElementById(name + '-total-count').innerText = list.length;
  if (!found.length) { box.innerHTML = '<div class="empty-note">' + emptyNote + '</div>'; return; }
  found.forEach(function (u) {
    box.appendChild(makePetCard(u, { owned: true, accent: look.accent, dim: look.dim, nameColor: look.nameColor, onclick: function () { equipPet(u.id); } }));
  });
}
function renderSecretPets() {
  // Mythic
  const mythicContainer = document.getElementById('mythic-pet-grid');
  mythicContainer.innerHTML = '';
  const mythicFound = mythicCompanions.filter(function (m) { return state.unlockedSecrets.indexOf(m.id) !== -1; });
  document.getElementById('mythic-found-count').innerText = mythicFound.length;
  if (mythicFound.length === 0) {
    mythicContainer.innerHTML = '<div class="empty-note">Defeat bosses flawlessly with high combos to rescue mythic storybook heroes!</div>';
  } else {
    mythicFound.forEach(function (sp) {
      mythicContainer.appendChild(makePetCard(sp, { owned: true, accent: '#d946ef', dim: '#701a75', equipColor: '#d946ef', nameColor: '#fdf4ff', onclick: function () { equipPet(sp.id); } }));
    });
  }

  // The ultra-rare trio, then the boss buddies
  fillBuddyGrid('ultra', ultraPets, 'Janie, Amber and Papaw have not been detected yet. Keep exploring flawless boss runs!', { accent: '#10b981', dim: '#064e3b', nameColor: '#a7f3d0' });
  fillBuddyGrid('bossbuddy', bossBuddies, 'Beat any boss ' + ECON.bossBuddy.alphaWins + ' times in its Alpha form to win it as a buddy. Check the Boss tab in the Book!', { accent: '#ef4444', dim: '#7f1d1d', nameColor: '#fecaca' });

  // Regular secrets
  const container = document.getElementById('secret-pet-grid');
  container.innerHTML = '';
  const regular = state.unlockedSecrets.filter(function (id) { return id.indexOf('mythic_') !== 0 && !ultraPets.concat(bossBuddies).some(function (u) { return u.id === id; }); });
  document.getElementById('secret-found-count').innerText = regular.length;
  if (regular.length === 0) {
    container.innerHTML = '<div class="empty-note">Defeat bosses in battle to discover rare secret creatures!</div>';
    return;
  }
  regular.forEach(function (id) {
    const sp = getSpecies(id);
    if (!sp) return;
    container.appendChild(makePetCard(sp, { owned: true, accent: '#818cf8', dim: '#334155', equipColor: '#38bdf8', onclick: function () { equipPet(sp.id); } }));
  });
}
