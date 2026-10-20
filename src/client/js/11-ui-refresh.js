// =====================================================================
//  UI REFRESH
// =====================================================================
function setStageClass(el, prefix, n) {
  el.classList.remove(prefix + '0', prefix + '1', prefix + '2');
  el.classList.add(prefix + n);
}

const REGION_BACKDROPS = {
  meadow: '<svg viewBox="0 0 400 130" preserveAspectRatio="none"><defs><linearGradient id="bg-m" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0ea5e9" stop-opacity="0.35"/><stop offset="100%" stop-color="#15803d" stop-opacity="0.5"/></linearGradient></defs><rect width="400" height="130" fill="url(#bg-m)"/><circle cx="340" cy="26" r="18" fill="#fde047" opacity="0.45"/><path d="M0 95 Q95 65 200 90 T400 80 L400 130 L0 130 Z" fill="#166534" opacity="0.55"/><ellipse cx="90" cy="112" rx="68" ry="14" fill="#22c55e" opacity="0.35"/><ellipse cx="310" cy="64" rx="64" ry="12" fill="#4ade80" opacity="0.32"/></svg>',
  ember: '<svg viewBox="0 0 400 130" preserveAspectRatio="none"><defs><linearGradient id="bg-e" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7f1d1d" stop-opacity="0.55"/><stop offset="100%" stop-color="#f97316" stop-opacity="0.45"/></linearGradient></defs><rect width="400" height="130" fill="url(#bg-e)"/><polygon points="40,130 110,38 180,130" fill="#450a0a" opacity="0.65"/><polygon points="220,130 295,28 370,130" fill="#7c2d12" opacity="0.6"/><path d="M100 38 Q110 55 120 38 Z" fill="#facc15" opacity="0.8"/><ellipse cx="90" cy="112" rx="68" ry="14" fill="#ea580c" opacity="0.4"/><ellipse cx="310" cy="64" rx="64" ry="12" fill="#fb923c" opacity="0.38"/></svg>',
  tide: '<svg viewBox="0 0 400 130" preserveAspectRatio="none"><defs><linearGradient id="bg-t" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0284c7" stop-opacity="0.45"/><stop offset="100%" stop-color="#0c4a6e" stop-opacity="0.65"/></linearGradient></defs><rect width="400" height="130" fill="url(#bg-t)"/><path d="M0 78 Q50 64 100 78 T200 78 T300 78 T400 78 L400 130 L0 130 Z" fill="#0369a1" opacity="0.5"/><path d="M0 98 Q60 86 120 98 T240 98 T360 98 T400 98 L400 130 L0 130 Z" fill="#38bdf8" opacity="0.3"/><ellipse cx="90" cy="112" rx="68" ry="14" fill="#38bdf8" opacity="0.38"/><ellipse cx="310" cy="64" rx="64" ry="12" fill="#7dd3fc" opacity="0.35"/></svg>',
  grove: '<svg viewBox="0 0 400 130" preserveAspectRatio="none"><defs><linearGradient id="bg-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#064e3b" stop-opacity="0.55"/><stop offset="100%" stop-color="#14532d" stop-opacity="0.65"/></linearGradient></defs><rect width="400" height="130" fill="url(#bg-g)"/><circle cx="60" cy="30" r="45" fill="#15803d" opacity="0.4"/><circle cx="340" cy="25" r="50" fill="#166534" opacity="0.4"/><ellipse cx="90" cy="112" rx="68" ry="14" fill="#4ade80" opacity="0.35"/><ellipse cx="310" cy="64" rx="64" ry="12" fill="#86efac" opacity="0.32"/></svg>',
  volt: '<svg viewBox="0 0 400 130" preserveAspectRatio="none"><defs><linearGradient id="bg-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1e1b4b" stop-opacity="0.65"/><stop offset="100%" stop-color="#713f12" stop-opacity="0.5"/></linearGradient></defs><rect width="400" height="130" fill="url(#bg-v)"/><polyline points="80,10 65,48 85,50 68,90" stroke="#fde047" stroke-width="3" fill="none" opacity="0.55"/><polyline points="320,8 305,42 325,44 308,82" stroke="#38bdf8" stroke-width="3" fill="none" opacity="0.5"/><ellipse cx="90" cy="112" rx="68" ry="14" fill="#facc15" opacity="0.35"/><ellipse cx="310" cy="64" rx="64" ry="12" fill="#fde047" opacity="0.32"/></svg>',
  gloom: '<svg viewBox="0 0 400 130" preserveAspectRatio="none"><defs><linearGradient id="bg-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#18181b" stop-opacity="0.7"/><stop offset="100%" stop-color="#3b0764" stop-opacity="0.55"/></linearGradient></defs><rect width="400" height="130" fill="url(#bg-d)"/><circle cx="330" cy="28" r="16" fill="#e9d5ff" opacity="0.35"/><path d="M0 95 Q110 80 220 96 T400 88 L400 130 L0 130 Z" fill="#2e1065" opacity="0.55"/><ellipse cx="90" cy="112" rx="68" ry="14" fill="#a855f7" opacity="0.35"/><ellipse cx="310" cy="64" rx="64" ry="12" fill="#c084fc" opacity="0.32"/></svg>',
  mystic: '<svg viewBox="0 0 400 130" preserveAspectRatio="none"><defs><linearGradient id="bg-y" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4c1d95" stop-opacity="0.6"/><stop offset="100%" stop-color="#831843" stop-opacity="0.55"/></linearGradient></defs><rect width="400" height="130" fill="url(#bg-y)"/><circle cx="70" cy="24" r="3" fill="#fff" opacity="0.8"/><circle cx="190" cy="18" r="2.5" fill="#fde047" opacity="0.8"/><circle cx="280" cy="30" r="3" fill="#f0abfc" opacity="0.8"/><ellipse cx="90" cy="112" rx="68" ry="14" fill="#ec4899" opacity="0.38"/><ellipse cx="310" cy="64" rx="64" ry="12" fill="#f472b6" opacity="0.35"/></svg>'
};
let lastBackdropRegion = '';
function renderArenaBackdrop(regionId) {
  const el = document.getElementById('arena-backdrop');
  if (!el) return;
  const key = REGION_BACKDROPS[regionId] ? regionId : 'meadow';
  if (lastBackdropRegion !== key) {
    lastBackdropRegion = key;
    el.innerHTML = REGION_BACKDROPS[key];
  }
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
  renderArenaBackdrop(region.id);
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
  if (typeof renderInlineMoves === 'function') renderInlineMoves();

  document.getElementById('comp-count-badge').innerText = getOwnedIds().length;
  document.getElementById('shield-display').innerText = state.shields;
  document.getElementById('shield-pill').style.display = state.shields > 0 ? '' : 'none';
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
      ? '🐾 You can unlock ' + nextBuddy.name + ' ' + emojiOf(nextBuddy) + ' in the Sanctuary!'
      : '🐾 ' + (nextBuddy.cost - state.gems) + ' 💎 to unlock ' + nextBuddy.name + ' ' + emojiOf(nextBuddy);
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
  const starsEl = document.getElementById('stars-display');
  if (starsEl) starsEl.innerText = state.stars || 0;
  const treeStarsEl = document.getElementById('tree-stars');
  if (treeStarsEl) treeStarsEl.innerText = state.stars || 0;
  const treeGemsEl = document.getElementById('tree-gems');
  if (treeGemsEl) treeGemsEl.innerText = state.gems;
  const miniAv = document.getElementById('trainer-mini-avatar');
  if (miniAv) miniAv.innerText = pet.emoji || '🐶';
  const titleEl = document.getElementById('trainer-title-display');
  if (titleEl && state.profile) titleEl.innerText = state.profile.title || 'Rookie Calculator';

  const xp = getBuddyXp(pet.id);
  const base = xpForLevel(pet.level);
  const next = xpForLevel(pet.level + 1);
  let pct = 100;
  if (pet.level >= MAX_LEVEL) {
    document.getElementById('xp-bar').style.width = '100%';
    document.getElementById('xp-text').innerText = 'MAX';
  } else {
    pct = Math.min(100, Math.round(((xp - base) / (next - base)) * 100));
    document.getElementById('xp-bar').style.width = `${pct}%`;
    document.getElementById('xp-text').innerText = `${xp - base}/${next - base}`;
  }
  const xpRing = document.getElementById('xp-ring');
  if (xpRing) {
    xpRing.value = pct;
    xpRing.style.setProperty('--xp-pct', pct + '%');
  }
  const eggBtn = document.getElementById('egg-pill');
  if (eggBtn) {
    if (state.egg) {
      const rem = Math.max(0, state.egg.target - state.egg.steps);
      const crack = state.egg.steps >= state.egg.target - 1 ? '🐣' : '🥚';
      eggBtn.style.display = 'inline-flex';
      eggBtn.innerText = crack + ' ' + state.egg.steps + '/' + state.egg.target;
      eggBtn.title = rem + ' more correct math answer' + (rem === 1 ? '' : 's') + ' to hatch your ' + state.egg.rarity + ' ' + state.egg.element + ' Egg!';
    } else {
      eggBtn.style.display = 'none';
    }
  }
  const starterBtn = document.getElementById('starter-pill');
  if (starterBtn) {
    starterBtn.style.display = (!state.storySeen || !state.storySeen.starter) && state.unlockedPets.length <= 1 ? 'inline-flex' : 'none';
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
