// =====================================================================
//  EGGS: found as rewards, they hatch as you walk and win battles (state.egg, ECON.egg). The Ranch's Nursery makes them too.
// =====================================================================
function awardEgg(element, rarity) {
  if (state.egg) return false;
  const validElems = ['fire', 'water', 'nature', 'electric', 'dark', 'magic'];
  const el = validElems.indexOf(element) !== -1 ? element : 'fire';
  const rar = ['common', 'rare', 'mythic'].indexOf(rarity) !== -1 ? rarity : 'common';
  const baseTarget = (ECON.egg && ECON.egg.steps && ECON.egg.steps[rar]) || 5;
  const target = (typeof hasTech === 'function' && hasTech('fast_incubator')) ? Math.max(2, baseTarget - 2) : baseTarget;
  state.egg = { element: el, rarity: rar, steps: 0, target: target };
  toast('🥚 Found a ' + rar.toUpperCase() + ' ' + el.toUpperCase() + ' Egg! Walk and win battles to hatch it!');
  return true;
}

function tickEgg() {
  if (!state.egg) return null;
  state.egg.steps += 1;
  if (state.egg.steps < state.egg.target) return null;
  return hatchEgg();
}

function hatchEgg() {
  if (!state.egg) return null;
  const egg = state.egg;
  state.egg = null;
  const owned = getOwnedIds();
  const pool = wildPool().filter(function (p) { return p.element === egg.element && owned.indexOf(p.id) === -1; });
  const fallbackPool = wildPool().filter(function (p) { return owned.indexOf(p.id) === -1; });
  const chosen = pool.length ? pick(pool) : (fallbackPool.length ? pick(fallbackPool) : null);
  soundSecretFound();
  launchConfetti('level');
  if (chosen) {
    grantBuddy(chosen.id);
    (isStoreBuddy(chosen) ? state.unlockedPets : state.unlockedSecrets).push(chosen.id);
    if (typeof soundBuddyCry === 'function') soundBuddyCry(chosen.id);
    checkEarnedGear();
    toast('🐣 Your ' + egg.element + ' Egg hatched into ' + chosen.name + ' ' + emojiOf(chosen) + '!');
    return chosen;
  }
  const xpBonus = (ECON.egg && ECON.egg.duplicateXp) || 25;
  awardBuddyXp(xpBonus);
  toast('🐣 Your ' + egg.element + ' Egg hatched! +' + xpBonus + ' Buddy XP!');
  return null;
}

