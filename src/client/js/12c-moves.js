// =====================================================================
//  MOVES: correct answers charge energy (the old ultimate charge, 0-3); spend it on a move from the Moves sheet.
//  A buddy learns moves as it levels. The names of the two damage moves come from its element.
// =====================================================================
const MOVE_NAMES = {
  fire: ['Ember', 'Flame Wheel'], water: ['Bubble Shot', 'Tidal Crash'], nature: ['Vine Whip', 'Leaf Storm'],
  electric: ['Static Zap', 'Thunder Bolt'], dark: ['Shadow Claw', 'Night Slash'], magic: ['Sparkle', 'Star Burst'], shadow: ['Shadow Claw', 'Night Slash']
};
// kind: damage (extra damage that uses the type chart), guard (blocks the next hit), heal, cleanse (clears a status effect), ult (the buddy's own super move)
// A buddy knows every move of its level, but takes only ECON.moves.slots of them (plus its ultimate) into battle: the player chooses (state.moveSet).
// Until the player chooses, the default set is every learned move that is not `optional`.
const MOVES = [
  { id: 'strike', cost: 1, minLevel: 1, kind: 'damage', icon: '💥' },
  { id: 'guard', cost: 1, minLevel: 8, kind: 'guard', icon: '🛡️', name: 'Guard' },
  { id: 'power', cost: 2, minLevel: 18, kind: 'damage', icon: '🔥' },
  { id: 'cleanse', cost: 1, minLevel: 24, kind: 'cleanse', icon: '🧼', name: 'Cleanse', optional: true },
  { id: 'heal', cost: 2, minLevel: 30, kind: 'heal', icon: '💚', name: 'Recover' },
  { id: 'drain', cost: 2, minLevel: 36, kind: 'damage', icon: '🌿', name: 'Absorb', drain: true, optional: true },
  { id: 'ult', cost: 3, minLevel: 1, kind: 'ult', icon: '⚡' }
];
let guardUp = false;                       // Guard is up: the next hit on your buddy is blocked

function moveCost(m) {
  return (m && m.id === 'heal' && typeof hasTech === 'function' && hasTech('swift_recovery')) ? 1 : (m ? m.cost : 0);
}

function moveName(m, pet) {
  if (m.kind === 'ult') return pet.superMove;
  if (m.name) return m.name;
  const names = MOVE_NAMES[pet.element] || MOVE_NAMES.magic;
  return names[m.id === 'power' ? 1 : 0];
}
// Extra damage of a damage move at a level: kept near the ultimate's damage per energy, so moves are a choice and not a free speed-up.
function moveDamage(m, level) {
  return m.id === 'power' ? 1 + Math.floor(level / 12) : m.id === 'strike' ? 1 : m.id === 'drain' ? 1 + Math.floor(level / 20) : 2 + Math.floor(level / 10);
}
function moveDesc(m, pet) {
  if (m.kind === 'guard') return 'Blocks the next hit on your buddy';
  if (m.kind === 'cleanse') return 'Clears a status effect from your buddy';
  if (m.drain) return '+' + moveDamage(m, pet.level) + ' damage and heals 1 HP, ' + pet.element + ' type';
  if (m.kind === 'heal') return 'Heals ' + Math.round(ECON.moves.healShare * 100) + '% of your buddy\'s HP';
  return '+' + moveDamage(m, pet.level) + ' damage, ' + pet.element + ' type';
}
function movesLearned(level) { return MOVES.filter(function (m) { return m.minLevel <= level; }); }
// Moves a buddy picks up between two levels (shown on a level-up and in the evolution window).
function movesBetween(fromLevel, toLevel) {
  return MOVES.filter(function (m) { return m.kind !== 'ult' && m.minLevel > fromLevel && m.minLevel <= toLevel; });
}

// The moves a buddy takes into battle: its chosen set (only moves it has learned), else the first ones it learned. The ultimate is always there.
function equippedMoves(pet) {
  const known = movesLearned(pet.level).filter(function (m) { return m.kind !== 'ult'; }).map(function (m) { return m.id; });
  const saved = state.moveSet[pet.id];
  const ids = (saved ? saved.filter(function (id) { return known.indexOf(id) !== -1; }) : known.filter(function (id) { return !MOVES.find(function (m) { return m.id === id; }).optional; })).slice(0, ECON.moves.slots);
  return MOVES.filter(function (m) { return m.kind === 'ult' || ids.indexOf(m.id) !== -1; });
}
function isEquipped(pet, id) { return equippedMoves(pet).some(function (m) { return m.id === id; }); }
let movesEditing = false;
function toggleMovesEdit() { soundClick(); movesEditing = !movesEditing; renderMoves(); }
// Equip or take away one move (edit mode). The set is saved per buddy.
function toggleEquip(id) {
  const pet = getActivePetDisplay(), now = equippedMoves(pet).filter(function (m) { return m.kind !== 'ult'; }).map(function (m) { return m.id; });
  const at = now.indexOf(id);
  if (at !== -1) now.splice(at, 1);
  else if (now.length >= ECON.moves.slots) { soundWrong(); toast('Your buddy can take ' + ECON.moves.slots + ' moves into battle. Take one away first.'); return; }
  else now.push(id);
  state.moveSet[pet.id] = now;
  soundClick();
  saveState();
  renderMoves();
}

function openMoves() {
  if (inputLocked) return;
  movesEditing = false;
  showModal('moves-modal', renderMoves);
}
function closeMoves() { hideModal('moves-modal'); }
function renderMoves() {
  const pet = getActivePetDisplay();
  document.getElementById('moves-head').innerText = pet.name + ' · Energy ' + '⚡'.repeat(ultimateCharge) + '▫️'.repeat(3 - ultimateCharge);
  const list = document.getElementById('moves-list');
  list.innerHTML = '';
  const equipped = equippedMoves(pet), slotsUsed = equipped.filter(function (m) { return m.kind !== 'ult'; }).length;
  const edit = document.getElementById('moves-edit');
  edit.innerText = movesEditing ? '✅ Done (' + slotsUsed + '/' + ECON.moves.slots + ' moves)' : '✏️ Choose moves (' + slotsUsed + '/' + ECON.moves.slots + ')';
  edit.setAttribute('aria-pressed', movesEditing ? 'true' : 'false');
  document.getElementById('moves-note').innerText = movesEditing
    ? 'Tap a move to take it into battle or leave it out. ' + ECON.moves.slots + ' at a time, plus your ultimate.'
    : 'Every correct answer charges 1 energy. Your buddy learns more moves as it levels up!';
  MOVES.forEach(function (m) {
    const known = m.minLevel <= pet.level, on = equipped.indexOf(m) !== -1;
    if (!movesEditing && !on && known) return;                       // in battle only the equipped moves show
    if (!movesEditing && !known && m.kind !== 'ult' && !isNextToLearn(pet, m)) return;
    const can = !movesEditing && known && ultimateCharge >= moveCost(m) && !(m.kind === 'heal' && getPetHp(pet.id) >= getPetMaxHp(pet.id));
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'move-btn' + (can || (movesEditing && known) ? '' : ' off');
    b.disabled = movesEditing ? !known || m.kind === 'ult' : !can;
    const name = escHtml(moveName(m, pet));
    const tail = movesEditing ? (m.kind === 'ult' ? '⭐' : known ? (on ? '✅' : '➕') : '🔒') : (known ? '⚡' + moveCost(m) : '🔒');
    b.innerHTML = '<span class="mv-icon">' + m.icon + '</span><span class="mv-main"><b>' + name + '</b><small>' +
      (known ? escHtml(moveDesc(m, pet)) : 'Learned at Lv ' + m.minLevel) + '</small></span><span class="mv-cost">' + tail + '</span>';
    b.setAttribute('aria-label', known ? name + ', costs ' + moveCost(m) + ' energy. ' + moveDesc(m, pet) + (movesEditing && m.kind !== 'ult' ? (on ? '. Equipped, tap to remove' : '. Not equipped, tap to equip') : '') : name + ', learned at level ' + m.minLevel);
    b.onclick = function () { movesEditing ? toggleEquip(m.id) : useMove(m.id); };
    list.appendChild(b);
  });
}
// In battle one locked move is teased (the next one to learn), so there is something to look forward to.
function isNextToLearn(pet, m) {
  const next = MOVES.filter(function (x) { return x.minLevel > pet.level; }).sort(function (a, b) { return a.minLevel - b.minLevel; })[0];
  return next === m;
}

function useMove(id) {
  const m = MOVES.find(function (x) { return x.id === id; });
  const pet = getActivePetDisplay();
  if (!m || m.minLevel > pet.level || ultimateCharge < moveCost(m) || inputLocked || !isEquipped(pet, id)) return;
  closeMoves();
  if (m.kind === 'ult') { triggerSuperMove(); return; }
  ultimateCharge -= moveCost(m);
  if (m.kind === 'guard') {
    guardUp = true;
    soundShieldBreak();
    showPopup('🛡️ GUARD UP!');
    buddyReact('cheer');
  } else if (m.kind === 'cleanse') {
    soundCoinChirp();
    showPopup('🧼 ' + moveName(m, pet).toUpperCase() + '!');
    buddyReact('cheer');
    clearBuddyStatus();
  } else if (m.kind === 'heal') {
    const max = getPetMaxHp(pet.id);
    setPetHp(pet.id, Math.min(max, getPetHp(pet.id) + Math.max(1, Math.ceil(max * ECON.moves.healShare))));
    soundCoinChirp();
    showPopup('💚 ' + moveName(m, pet).toUpperCase() + '!');
    buddyReact('cheer');
    clearBuddyStatus();
  } else {
    soundSuperMove();
    screenShake(false);
    showPopup('💥 ' + moveName(m, pet).toUpperCase() + '!');
    inputLocked = true;
    triggerMonsterDamage(moveDamage(m, pet.level));
    if (m.drain) setPetHp(pet.id, Math.min(getPetMaxHp(pet.id), getPetHp(pet.id) + 1));
    setTimeout(function () { inputLocked = false; }, 600);
  }
  updateBattleUI();
}

function renderInlineMoves() {
  const bar = document.getElementById('inline-moves-bar');
  if (!bar) return;
  const pet = getActivePetDisplay();
  const moves = equippedMoves(pet).filter(function (m) { return m.minLevel <= pet.level; }).slice(0, 3);
  if (armedMove && !moves.some(function (m) { return m.id === armedMove; })) armedMove = '';
  const eq = document.getElementById('equation-mount');
  if (eq) eq.classList.toggle('move-armed', !!armedMove);
  bar.innerHTML = moves.map(function (m) {
    const nm = moveName(m, pet);
    const shortNm = nm.length > 22 ? nm.slice(0, 20) + '…' : nm;
    const isArmed = armedMove === m.id;
    const canArm = (ultimateCharge + 1) >= moveCost(m);
    const cls = 'inline-move-pill' + (isArmed ? ' armed' : '') + (!canArm ? ' dim' : '');
    return '<button type="button" class="' + cls + '" onclick="armMove(\'' + m.id + '\')" aria-pressed="' + (isArmed ? 'true' : 'false') + '" aria-label="Arm ' + escHtml(nm) + ' (' + moveCost(m) + ' energy)" title="' + escHtml(nm) + ': ' + escHtml(moveDesc(m, pet)) + ' (tap to arm for next math answer)">' +
      m.icon + ' ' + escHtml(shortNm) + ' ⚡' + moveCost(m) + '</button>';
  }).join('');
}

function armMove(id) {
  if (inputLocked) return;
  const pet = getActivePetDisplay();
  const m = MOVES.find(function (x) { return x.id === id; });
  if (!m || m.minLevel > pet.level || !isEquipped(pet, id)) return;
  soundClick();
  if (armedMove === id) {
    armedMove = '';
    toast('Move disarmed');
  } else {
    armedMove = id;
    const nm = moveName(m, pet);
    const need = Math.max(0, moveCost(m) - (ultimateCharge + 1));
    toast(need > 0 ? ('⚡ ' + nm + ' queued! Solve ' + (need + 1) + ' problems to cast!') : ('⚡ ' + nm + ' armed! Solve this problem to unleash it!'));
  }
  renderInlineMoves();
}

function consumeArmedMove() {
  if (!armedMove) return 0;
  const pet = getActivePetDisplay();
  const m = MOVES.find(function (x) { return x.id === armedMove; });
  if (!m || m.minLevel > pet.level || !isEquipped(pet, armedMove)) {
    armedMove = '';
    return 0;
  }
  if (ultimateCharge < moveCost(m)) return 0;
  armedMove = '';
  ultimateCharge -= moveCost(m);
  if (m.kind === 'ult') questEvent('ult');
  if (m.kind === 'guard') {
    guardUp = true;
    soundShieldBreak();
    showPopup('🛡️ ' + moveName(m, pet).toUpperCase() + ' ARMED!');
    return 0;
  }
  if (m.kind === 'cleanse') {
    clearBuddyStatus();
    soundCoinChirp();
    showPopup('🧼 ' + moveName(m, pet).toUpperCase() + '!');
    return 0;
  }
  if (m.kind === 'heal') {
    const max = getPetMaxHp(pet.id);
    setPetHp(pet.id, Math.min(max, getPetHp(pet.id) + Math.max(1, Math.ceil(max * ECON.moves.healShare))));
    clearBuddyStatus();
    soundCoinChirp();
    showPopup('💚 ' + moveName(m, pet).toUpperCase() + '!');
    return 0;
  }
  soundSuperMove();
  showPopup(m.icon + ' ' + moveName(m, pet).toUpperCase() + '!');
  if (m.drain) setPetHp(pet.id, Math.min(getPetMaxHp(pet.id), getPetHp(pet.id) + 1));
  return moveDamage(m, pet.level);
}
