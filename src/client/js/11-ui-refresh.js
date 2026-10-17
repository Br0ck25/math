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
  setIconHtml(mIcon, boss.icon);                                    // an emoji, or an <img> when the foe has licensed art
  setStageClass(mIcon, 'boss-stage-', boss.form);
  mIcon.parentNode.setAttribute('data-element', boss.element);       // each element gives its boss a different glow
  document.getElementById('monster-level').innerText = boss.level;
  const bossHpNow = Math.max(0, monsterCurrentHp);
  document.getElementById('monster-hp-text').innerText = `HP ${bossHpNow}/${boss.maxHp}`;
  document.getElementById('monster-hp-bar').style.width = `${Math.round((bossHpNow / boss.maxHp) * 100)}%`;

  document.getElementById('pet-hp-text').innerText = `HP ${petHp}/${petMax}`;
  document.getElementById('pet-hp-bar').style.width = `${Math.round((petHp / petMax) * 100)}%`;

  const pIcon = document.getElementById('pet-fighter-icon');
  setIconHtml(pIcon, pet.icon);
  setStageClass(pIcon, 'stage-', pet.stage);
  document.getElementById('pet-fighter-name').innerText = pet.name;
  document.getElementById('pet-level').innerText = pet.level;

  const gear = activeGear();
  document.getElementById('pet-gear').innerHTML = formMarkup(pet.stage, pet.element) + gearMarkup(gear.acc, gear.armor);
  const fw = document.getElementById('fighter-icon-wrapper');
  fw.style.setProperty('--evo', elemColor(pet.element));
  pIcon.classList.toggle('buddy-worried', petHp > 0 && petHp / petMax <= 0.34);     // a nervous shiver when health is low
  fw.classList.toggle('combo-hot', state.streak >= 5);                          // a fiery glow while the combo is hot

  renderItemButtons();
  updateTeamBar();
  renderStatus();

  const petElemBadge = document.getElementById('pet-elem-badge');
  petElemBadge.innerText = pet.element;
  petElemBadge.className = `element-pill elem-${pet.element}`;
  const monsterElemBadge = document.getElementById('monster-elem-badge');
  monsterElemBadge.innerText = boss.element;
  monsterElemBadge.className = `element-pill elem-${boss.element}`;

  const rel = getTypeRelation(battleElement(pet), boss.element);
  const hint = document.getElementById('type-match-hint');
  if (slaysBuddy(boss, pet)) {
    hint.innerText = '☠️ Strong against ' + pet.baseName + '!';
    hint.style.color = '#f87171';
  } else if (battleElement(pet) === 'shadow') {
    hint.innerText = '🌟 Shadow: x1.25 damage';
    hint.style.color = '#d946ef';
  } else if (rel === 1) {
    hint.innerText = '⚡ Super effective! x1.5';
    hint.style.color = '#4ade80';
  } else if (rel === -1) {
    hint.innerText = '⚠️ Not very effective x0.5';
    hint.style.color = '#f87171';
  } else {
    hint.innerText = 'Neutral matchup';
    hint.style.color = 'var(--text-muted)';
  }

  document.getElementById('boss-box').classList.toggle('shiny', !!(boss.shiny || boss.legend));
  const region = currentRegion();
  document.getElementById('battle-header-arena').style.setProperty('--region', region.element ? elemColor(region.element) : '');
  if (region.element) hint.innerText = region.icon + ' ' + hint.innerText;           // the land you are in

  document.getElementById('ult-bar').style.width = `${Math.round((ultimateCharge / 3) * 100)}%`;
  const ultBtn = document.getElementById('ult-btn');
  if (ultimateCharge >= 3) {
    ultBtn.className = 'ult-btn ready';
    ultBtn.innerHTML = '<span class="ult-word">MOVES </span>⚡3/3';
  } else {
    ultBtn.className = 'ult-btn';
    ultBtn.innerHTML = `<span class="ult-word">MOVES </span>⚡${ultimateCharge}/3`;       // the word steps aside on narrow phones
  }

  document.getElementById('comp-count-badge').innerText = getOwnedIds().length;
  document.getElementById('shield-display').innerText = state.shields;
  document.getElementById('session-count-text').innerText = sessionStats.solved;
  document.getElementById('session-goal-text').innerText = sessionStats.goal;
  document.getElementById('goal-pill-text').innerText = sessionStats.solved + '/' + sessionStats.goal;
  document.getElementById('session-badge').innerText = `🎁 ${sessionStats.goal}`;       // the gem reward arrives at this many solves

  const cloverTag = document.getElementById('clover-status');
  if (state.cloverLeft > 0) {
    cloverTag.style.display = 'inline';
    cloverTag.innerText = `🍀 2x Gems (${state.cloverLeft})`;
  } else {
    cloverTag.style.display = 'none';
  }
}

function updatePracticeRow() {
  if (studyOn) {                                                                       // trivia mode: the chip shows the subjects instead of the grade and math types
    const sel = studySelected();
    document.getElementById('grade-chip').innerText = '🎓 Trivia';
    document.getElementById('ops-chip').innerText = sel[0] === 'all' ? '🌎 🔬 📚 🎨 🧮' : sel.map(function (id) { const s = STUDY_SUBJECTS.filter(function (x) { return x.id === id; })[0]; return s ? s.icon : (id === 'ky' ? '🏇' : '👪'); }).join(' ');
    return;
  }
  document.getElementById('grade-chip').innerText = '📚 ' + GRADES[state.grade].label;
  const icons = getActiveOps().map(function (id) { return OP_BY_ID[id].icon; });
  document.getElementById('ops-chip').innerText = icons.slice(0, 5).join(' ') + (icons.length > 5 ? ' +' + (icons.length - 5) : '');
}

// One friendly line about what is close: the next evolution, or the next buddy in the Sanctuary.
function nextGoalText() {
  const pet = getActivePetDisplay();
  const sp = getSpecies(pet.id);
  const nextForm = sp && sp.forms[pet.stage + 1];
  const toEvolve = nextForm ? nextForm.minLevel - pet.level : 0;
  const owned = getOwnedIds();
  const nextBuddy = storePets.find(function (b) { return b.cost > 0 && owned.indexOf(b.id) === -1; });
  if (nextForm && toEvolve > 0 && (toEvolve <= 5 || !nextBuddy)) {
    return '✨ ' + (toEvolve === 1 ? '1 level' : toEvolve + ' levels') + ' to evolve';
  }
  if (nextBuddy) {
    return state.gems >= nextBuddy.cost
      ? '🐾 You can unlock ' + nextBuddy.name + ' ' + nextBuddy.icon + ' in the Sanctuary!'
      : '🐾 ' + (nextBuddy.cost - state.gems) + ' 💎 to unlock ' + nextBuddy.name + ' ' + nextBuddy.icon;
  }
  return '';
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
  document.getElementById('next-goal').innerText = nextGoalText();
  document.getElementById('rank-display').innerText = pet.name + (pet.stage > 0 ? '  ' + (pet.stage === 1 ? '★' : '★★') : '');
  updatePracticeRow();
  updateBattleUI();
}

function setBossTaunt() {
  const boss = getBossInfo();
  document.getElementById('boss-taunt-box').innerText = `${boss.name}: "${pick(boss.taunts)}"`;
}

// A small "+5 💎" that floats up from a stat so players see where their reward went. Skipped when motion is reduced.
function floatGain(text, anchorId, delay) {
  if (motionReduced()) return;
  const anchor = document.getElementById(anchorId);
  if (!anchor) return;
  setTimeout(function () {
    const r = anchor.getBoundingClientRect();
    if (!r.width) return;
    const el = document.createElement('div');
    el.className = 'float-gain';
    el.setAttribute('aria-hidden', 'true');
    el.innerText = text;
    el.style.left = Math.round(r.left + r.width / 2) + 'px';
    el.style.top = Math.round(r.top) + 'px';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 1000);
  }, delay || 0);
}

function showPopup(text) {
  const popup = document.getElementById(studyOn ? 'study-popup' : 'floating-popup');         // the math area (and its popup) is hidden while studying
  popup.innerText = text;
  popup.classList.add('show');
  setTimeout(function () { popup.classList.remove('show'); }, 850);
}
