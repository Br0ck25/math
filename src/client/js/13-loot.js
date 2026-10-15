// =====================================================================
//  LOOT DROPS
// =====================================================================
const ULTRA_CHANCE = 0.005;
function checkForSecretLootDrop(hadCasualties) {
  if (hadCasualties) return;
  const qualifiesForDrop = (state.streak >= 5) || (state.monstersDefeated % 5 === 0);
  if (!qualifiesForDrop) return;

  const isMilestonePity = (state.monstersDefeated % 10 === 0);
  const roll = Math.random();

  const giveLoot = function (drop, category) {
    grantBuddy(drop.id);
    state.unlockedSecrets.push(drop.id);
    checkEarnedGear();
    saveState();
    enqueueModal(function () { showLootModal(drop, category); });
  };

  // 1. The ultra-rare trio: each has its own 0.5% slice of the roll, so every one is exactly as rare as the others
  for (let i = 0; i < ultraPets.length; i++) {
    if (state.unlockedSecrets.indexOf(ultraPets[i].id) === -1 && roll >= i * ULTRA_CHANCE && roll < (i + 1) * ULTRA_CHANCE) {
      giveLoot(ultraPets[i], 'ultra');
      return;
    }
  }
  // 2. Mythic (4%)
  const unownedMythics = mythicCompanions.filter(function (mc) { return state.unlockedSecrets.indexOf(mc.id) === -1; });
  if (unownedMythics.length > 0 && roll < 0.04) {
    giveLoot(pick(unownedMythics), 'mythic');
    return;
  }
  // 3. Secret (12% / pity)
  const unownedSecrets = secretCompanions.filter(function (sc) { return state.unlockedSecrets.indexOf(sc.id) === -1; });
  if (unownedSecrets.length > 0 && (isMilestonePity || roll < 0.12)) {
    giveLoot(pick(unownedSecrets), 'secret');
  }
}

function showLootModal(pet, lootCategory) {
  pendingLootPet = pet;
  soundSecretFound();
  launchConfetti();

  const border = document.getElementById('loot-modal-border');
  const tag = document.getElementById('loot-modal-tag');
  const title = document.getElementById('loot-modal-title');
  const subtitle = document.getElementById('loot-modal-subtitle');
  const startLv = getBuddyLevel(pet.id);

  if (lootCategory === 'ultra') {
    border.style.borderColor = '#10b981';
    tag.style.background = '#064e3b';
    tag.style.color = '#a7f3d0';
    tag.innerText = '🛸 ULTRA RARE COSMIC ANOMALY!';
    title.innerText = pet.name + ' Discovered!';
    subtitle.innerText = `${pet.lore} Joins at Lv ${startLv} • Ult: ${pet.superMove}`;
  } else if (lootCategory === 'boss') {
    border.style.borderColor = '#ef4444';
    tag.style.background = '#7f1d1d';
    tag.style.color = '#fecaca';
    tag.innerText = '🏆 BOSS BUDDY!';
    title.innerText = pet.name + ' Joins You!';
    subtitle.innerText = `💪 Beaten ${ECON.bossBuddy.alphaWins} times as an Alpha! Joins at Lv ${startLv} • Ult: ${pet.superMove}`;
  } else if (lootCategory === 'mythic') {
    border.style.borderColor = '#d946ef';
    tag.style.background = '#701a75';
    tag.style.color = '#fdf4ff';
    tag.innerText = '⚡ ULTRA RARE MYTHIC LEGEND!';
    title.innerText = 'Storybook Hero Rescued!';
    subtitle.innerText = `👑 Joins at Lv ${startLv} • Signature Ult: ${pet.superMove}`;
  } else {
    border.style.borderColor = '#818cf8';
    tag.style.background = '#312e81';
    tag.style.color = '#c7d2fe';
    tag.innerText = '🌟 Rare Encounter!';
    title.innerText = 'New Companion Rescued!';
    subtitle.innerText = `✨ Joins at Lv ${startLv} • Special Ult: ${pet.superMove}`;
  }

  document.getElementById('loot-modal-icon').innerHTML = pet.icon;
  document.getElementById('loot-modal-name').innerText = pet.name;
  document.getElementById('loot-modal').style.display = 'flex';
}

function closeLootModal(equipNow) {
  soundClick();
  if (equipNow && pendingLootPet) {
    state.activePet = pendingLootPet.id;
    saveState();
  }
  document.getElementById('loot-modal').style.display = 'none';
  pendingLootPet = null;
  updateStatsUI();
  modalDone();
}
