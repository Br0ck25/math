// =====================================================================
//  MOVES: correct answers charge energy (the old ultimate charge, 0-3); spend it on a move from the Moves sheet.
//  A buddy learns moves as it levels. The names of the two damage moves come from its element.
// =====================================================================
const MOVE_NAMES = {
  fire: ['Ember', 'Flame Wheel'], water: ['Bubble Shot', 'Tidal Crash'], nature: ['Vine Whip', 'Leaf Storm'],
  electric: ['Static Zap', 'Thunder Bolt'], dark: ['Shadow Claw', 'Night Slash'], magic: ['Sparkle', 'Star Burst'], shadow: ['Shadow Claw', 'Night Slash']
};
// kind: damage (extra damage that uses the type chart), guard (blocks the next hit), heal, ult (the buddy's own super move)
const MOVES = [
  { id: 'strike', cost: 1, minLevel: 1, kind: 'damage', icon: '💥' },
  { id: 'guard', cost: 1, minLevel: 8, kind: 'guard', icon: '🛡️', name: 'Guard' },
  { id: 'power', cost: 2, minLevel: 18, kind: 'damage', icon: '🔥' },
  { id: 'heal', cost: 2, minLevel: 30, kind: 'heal', icon: '💚', name: 'Recover' },
  { id: 'ult', cost: 3, minLevel: 1, kind: 'ult', icon: '⚡' }
];
let guardUp = false;                       // Guard is up: the next hit on your buddy is blocked

function moveName(m, pet) {
  if (m.kind === 'ult') return pet.superMove;
  if (m.name) return m.name;
  const names = MOVE_NAMES[pet.element] || MOVE_NAMES.magic;
  return names[m.id === 'power' ? 1 : 0];
}
// Extra damage of a damage move at a level: kept near the ultimate's damage per energy, so moves are a choice and not a free speed-up.
function moveDamage(m, level) {
  return m.id === 'power' ? 1 + Math.floor(level / 12) : m.id === 'strike' ? 1 : 2 + Math.floor(level / 10);
}
function moveDesc(m, pet) {
  if (m.kind === 'guard') return 'Blocks the next hit on your buddy';
  if (m.kind === 'heal') return 'Heals ' + Math.round(ECON.moves.healShare * 100) + '% of your buddy\'s HP';
  return '+' + moveDamage(m, pet.level) + ' damage, ' + pet.element + ' type';
}
function movesLearned(level) { return MOVES.filter(function (m) { return m.minLevel <= level; }); }
// Moves a buddy picks up between two levels (shown on a level-up and in the evolution window).
function movesBetween(fromLevel, toLevel) {
  return MOVES.filter(function (m) { return m.kind !== 'ult' && m.minLevel > fromLevel && m.minLevel <= toLevel; });
}

function openMoves() {
  if (inputLocked) return;
  showModal('moves-modal', renderMoves);
}
function closeMoves() { hideModal('moves-modal'); }
function renderMoves() {
  const pet = getActivePetDisplay();
  document.getElementById('moves-head').innerText = pet.name + ' · Energy ' + '⚡'.repeat(ultimateCharge) + '▫️'.repeat(3 - ultimateCharge);
  const list = document.getElementById('moves-list');
  list.innerHTML = '';
  MOVES.forEach(function (m) {
    const known = m.minLevel <= pet.level;
    const can = known && ultimateCharge >= m.cost && !(m.kind === 'heal' && getPetHp(pet.id) >= getPetMaxHp(pet.id));
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'move-btn' + (can ? '' : ' off');
    b.disabled = !can;
    const name = escHtml(moveName(m, pet));
    b.innerHTML = '<span class="mv-icon">' + m.icon + '</span><span class="mv-main"><b>' + name + '</b><small>' +
      (known ? escHtml(moveDesc(m, pet)) : 'Learned at Lv ' + m.minLevel) + '</small></span><span class="mv-cost">' + (known ? '⚡' + m.cost : '🔒') + '</span>';
    b.setAttribute('aria-label', known ? name + ', costs ' + m.cost + ' energy. ' + moveDesc(m, pet) : name + ', learned at level ' + m.minLevel);
    b.onclick = function () { useMove(m.id); };
    list.appendChild(b);
  });
}

function useMove(id) {
  const m = MOVES.find(function (x) { return x.id === id; });
  const pet = getActivePetDisplay();
  if (!m || m.minLevel > pet.level || ultimateCharge < m.cost || inputLocked) return;
  closeMoves();
  if (m.kind === 'ult') { triggerSuperMove(); return; }
  ultimateCharge -= m.cost;
  if (m.kind === 'guard') {
    guardUp = true;
    soundShieldBreak();
    showPopup('🛡️ GUARD UP!');
    buddyReact('cheer');
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
    setTimeout(function () { inputLocked = false; }, 600);
  }
  updateBattleUI();
}
