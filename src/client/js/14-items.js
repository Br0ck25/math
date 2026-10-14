// =====================================================================
//  ITEMS
// =====================================================================
// ~ the gems it would take to earn that level by solving; never below 20
function getCandyCost() {
  const lvl = getBuddyLevel(state.activePet);
  if (lvl >= MAX_LEVEL) return 0;
  return Math.max(20, Math.round((xpForLevel(lvl + 1) - getBuddyXp(state.activePet)) / 6));
}

function buyItem(type, cost) {
  if (type === 'candy') cost = getCandyCost();
  if (type === 'shield') cost = ECON.items.shield;
  if (state.gems < cost) {
    soundWrong();
    toast(`You need ${cost - state.gems} more 💎 Gems!`);
    return;
  }
  if (type === 'candy') {
    const lvl = getBuddyLevel(state.activePet);
    if (lvl >= MAX_LEVEL) { toast('Your buddy is already max level!'); return; }
    state.gems -= cost;
    soundLevelUp();
    awardBuddyXp(xpForLevel(lvl + 1) - getBuddyXp(state.activePet));
    showPopup('🍬 RARE CANDY! LEVEL UP!');
  } else {
    state.gems -= cost;
    soundLevelUp();
    if (type === 'shield') {
      state.shields += 1;
      showPopup('+1 STREAK SHIELD! 🛡️');
    } else if (type === 'ult') {
      ultimateCharge = 3;
      showPopup('ULTIMATE CHARGED! ⚡');
    } else if (type === 'clover') {
      state.cloverLeft = (state.cloverLeft || 0) + 8;
      showPopup('LUCKY CLOVER (8 SOLVES)! 🍀');
    }
  }
  saveState();
  updateStatsUI();
}
