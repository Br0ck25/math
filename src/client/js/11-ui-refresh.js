// =====================================================================
//  UI REFRESH
// =====================================================================
function setStageClass(el, prefix, n) {
  el.classList.remove(prefix + '0', prefix + '1', prefix + '2');
  el.classList.add(prefix + n);
}

function updateBattleUI() {
  const boss = getBossInfo();
  const pet = getActivePetDisplay();
  const petMax = getPetMaxHp(pet.id);
  const petHp = getPetHp(pet.id);

  document.getElementById('monster-name').innerText = boss.name;
  updateWeakChip();
  const mIcon = document.getElementById('monster-icon');
  mIcon.innerText = boss.icon;
  setStageClass(mIcon, 'boss-stage-', boss.form);
  document.getElementById('monster-level').innerText = boss.level;
  const bossHpNow = Math.max(0, monsterCurrentHp);
  document.getElementById('monster-hp-text').innerText = `HP: ${bossHpNow}/${boss.maxHp}`;
  document.getElementById('monster-hp-bar').style.width = `${Math.round((bossHpNow / boss.maxHp) * 100)}%`;

  document.getElementById('pet-hp-text').innerText = `HP: ${petHp}/${petMax}`;
  document.getElementById('pet-hp-bar').style.width = `${Math.round((petHp / petMax) * 100)}%`;

  const pIcon = document.getElementById('pet-fighter-icon');
  pIcon.innerHTML = pet.icon;
  setStageClass(pIcon, 'stage-', pet.stage);
  document.getElementById('pet-fighter-name').innerText = pet.name;
  document.getElementById('pet-level').innerText = pet.level;

  const gear = activeGear();
  document.getElementById('pet-gear').innerHTML = gearMarkup(gear.acc, gear.armor);

  const candyBtn = document.getElementById('candy-btn');
  if (candyBtn) candyBtn.innerText = getCandyCost() + ' 💎 Eat';

  const petElemBadge = document.getElementById('pet-elem-badge');
  petElemBadge.innerText = pet.element;
  petElemBadge.className = `element-pill elem-${pet.element}`;
  const monsterElemBadge = document.getElementById('monster-elem-badge');
  monsterElemBadge.innerText = boss.element;
  monsterElemBadge.className = `element-pill elem-${boss.element}`;

  const rel = getTypeRelation(pet.element, boss.element);
  const hint = document.getElementById('type-match-hint');
  if (pet.element === 'shadow') {
    hint.innerText = '🌟 Shadow Mastery: x1.25 damage vs everything!';
    hint.style.color = '#d946ef';
  } else if (rel === 1) {
    hint.innerText = '⚡ Super effective! (x1.5 damage)';
    hint.style.color = '#4ade80';
  } else if (rel === -1) {
    hint.innerText = '⚠️ Not very effective... (x0.5 damage)';
    hint.style.color = '#f87171';
  } else {
    hint.innerText = 'Elemental Match: Neutral';
    hint.style.color = 'var(--text-muted)';
  }

  document.getElementById('ult-bar').style.width = `${Math.round((ultimateCharge / 3) * 100)}%`;
  const ultBtn = document.getElementById('ult-btn');
  if (ultimateCharge >= 3) {
    ultBtn.className = 'ult-btn ready';
    ultBtn.innerText = `🔥 ${pet.superMove}!`;
  } else {
    ultBtn.className = 'ult-btn';
    ultBtn.innerText = `CHARGING (${ultimateCharge}/3)`;
  }

  document.getElementById('comp-count-badge').innerText = getOwnedIds().length;
  document.getElementById('shield-display').innerText = state.shields;
  document.getElementById('session-count-text').innerText = sessionStats.solved;
  document.getElementById('session-goal-text').innerText = sessionStats.goal;
  document.getElementById('session-badge').innerText = `🎁 Reward at ${sessionStats.goal}`;

  const cloverTag = document.getElementById('clover-status');
  if (state.cloverLeft > 0) {
    cloverTag.style.display = 'inline';
    cloverTag.innerText = `🍀 2x Gems (${state.cloverLeft})`;
  } else {
    cloverTag.style.display = 'none';
  }
}

function updatePracticeRow() {
  document.getElementById('grade-chip').innerText = '📚 ' + GRADES[state.grade].long;
  const icons = getActiveOps().map(function (id) { return OP_BY_ID[id].icon; });
  document.getElementById('ops-chip').innerText = icons.slice(0, 5).join(' ') + (icons.length > 5 ? ' +' + (icons.length - 5) : '');
}

function updateStatsUI() {
  document.getElementById('fighter-icon-wrapper').classList.toggle('coach-glow', !state.seen.hub);
  updateQuestBadge();
  updateCalBadge();
  if (typeof renderHintUI === 'function') renderHintUI();
  const pet = getActivePetDisplay();
  document.getElementById('lvl-display').innerText = pet.level;
  document.getElementById('gems-display').innerText = state.gems;
  document.getElementById('streak-display').innerText = state.streak;
  document.getElementById('shop-gems').innerText = state.gems;

  const xp = getBuddyXp(pet.id);
  const base = xpForLevel(pet.level);
  const next = xpForLevel(pet.level + 1);
  if (pet.level >= MAX_LEVEL) {
    document.getElementById('xp-bar').style.width = '100%';
    document.getElementById('xp-text').innerText = 'MAX';
  } else {
    document.getElementById('xp-bar').style.width = `${Math.min(100, Math.round(((xp - base) / (next - base)) * 100))}%`;
    document.getElementById('xp-text').innerText = `${xp - base}/${next - base}`;
  }
  document.getElementById('rank-display').innerText = pet.name + (pet.stage > 0 ? '  ' + (pet.stage === 1 ? '★' : '★★') : '');
  updatePracticeRow();
  updateBattleUI();
}

function setBossTaunt() {
  const boss = getBossInfo();
  document.getElementById('boss-taunt-box').innerText = `${boss.name}: "${pick(boss.taunts)}"`;
}

function showPopup(text) {
  const popup = document.getElementById('floating-popup');
  popup.innerText = text;
  popup.classList.add('show');
  setTimeout(function () { popup.classList.remove('show'); }, 850);
}
