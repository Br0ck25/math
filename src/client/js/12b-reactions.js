// =====================================================================
//  REACTIONS: bosses flinch, laugh and get angry; the buddy cheers streaks, naps when idle; the team bar swaps buddies
// =====================================================================
// Each element has its own bubble and line per mood. Kinds: flinch (any hit), wow (super effective / weak point),
// fast (Speed Strike), laugh (the boss hit your buddy), angry (boss under a quarter of its health).
const BOSS_MOODS = {
  fire:     { flinch: '🔥', wow: '😲', fast: '💨', laugh: '😈', angry: '🌋', say: { wow: 'Ouch! That was my weak spot!', fast: 'Too fast, even for flames!', laugh: 'Hot hot hot! Hahaha!', angry: 'Now I am REALLY blazing!' } },
  water:    { flinch: '💦', wow: '😲', fast: '💨', laugh: '😆', angry: '🌊', say: { wow: 'Glub! You found my weak spot!', fast: 'You zoomed right through my waves!', laugh: 'Splash! Gotcha!', angry: 'A big wave is coming!' } },
  nature:   { flinch: '🍃', wow: '😲', fast: '💨', laugh: '😄', angry: '🌵', say: { wow: 'Oof! My leaves are wilting!', fast: 'You grew faster than my vines!', laugh: 'Tangled you up! Hee hee!', angry: 'Now my thorns are out!' } },
  electric: { flinch: '⚡', wow: '😲', fast: '💨', laugh: '😜', angry: '⛈️', say: { wow: 'Zzzap! You found my weak spot!', fast: 'Faster than lightning!', laugh: 'Shocking, right? Ha ha!', angry: 'Storm power rising!' } },
  dark:     { flinch: '🌑', wow: '😲', fast: '💨', laugh: '😏', angry: '👿', say: { wow: 'Argh! The light hurts!', fast: 'You moved faster than my shadows!', laugh: 'Mwahaha! Shadows strike!', angry: 'The darkness grows...' } },
  magic:    { flinch: '✨', wow: '😲', fast: '💨', laugh: '🤪', angry: '🔮', say: { wow: 'Poof! My spell fizzled!', fast: 'Quick as a wink!', laugh: 'Abra-cadabra! Gotcha!', angry: 'Now I cast a BIG spell!' } }
};
const BOSS_FLASH = { flinch: 'boss-flinch', wow: 'boss-flinch', fast: 'boss-flinch', laugh: 'boss-laugh', angry: 'boss-angry' };
let bossReactTimer = null;
function bossReact(kind) {
  const boss = getBossInfo();
  const m = BOSS_MOODS[boss.element] || BOSS_MOODS.magic;
  const box = document.getElementById('boss-box');
  const bubble = document.getElementById('boss-bubble');
  if (!box || !bubble || !m[kind]) return;
  Object.keys(BOSS_FLASH).forEach(function (k) { box.classList.remove(BOSS_FLASH[k]); });
  void box.offsetWidth;
  box.classList.add(BOSS_FLASH[kind]);
  clearTimeout(bossReactTimer);
  bossReactTimer = setTimeout(function () { box.classList.remove(BOSS_FLASH[kind]); }, 700);
  bubble.innerText = m[kind];
  bubble.classList.remove('show');
  void bubble.offsetWidth;
  bubble.classList.add('show');
  if (m.say[kind]) document.getElementById('boss-taunt-box').innerText = boss.name + ': "' + m.say[kind] + '"';
}

// ----- the buddy naps when the player is idle, and wakes at the first tap or key -----
const IDLE_NAP_MS = 25000;
let napTimer = null;
function wakeBuddy() {
  clearTimeout(napTimer);
  const w = document.getElementById('fighter-icon-wrapper');
  if (w && w.classList.contains('napping')) {
    w.classList.remove('napping');
    buddyReact('wake');
  }
  napTimer = setTimeout(napBuddy, IDLE_NAP_MS);
}
function napBuddy() {
  const w = document.getElementById('fighter-icon-wrapper');
  if (!w) return;
  if (isModalOpen() || inputLocked) { napTimer = setTimeout(napBuddy, IDLE_NAP_MS); return; }
  w.classList.add('napping');
}
['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, wakeBuddy, true); });
napTimer = setTimeout(napBuddy, IDLE_NAP_MS);

// ----- the team bar: your team's matchups against this boss, tap one to swap it in -----
function teamMatchup(id, boss) {
  const p = getPetById(id);
  if (slaysBuddy(boss, p)) return { icon: '☠️', mult: 'x0.5', cls: 'bad' };
  const rel = battleElement(p) === 'shadow' ? 0 : getTypeRelation(battleElement(p), boss.element);
  if (rel === 1) return { icon: '⚡', mult: 'x1.5', cls: 'good' };
  if (rel === -1) return { icon: '⚠️', mult: 'x0.5', cls: 'bad' };
  return { icon: '', mult: 'x1', cls: '' };
}
// ----- a fainted fighter must be replaced by a teammate who can still fight -----
function needsSwitch() { return state.faintedPets.indexOf(state.activePet) !== -1; }
function aliveTeamIds() { return getTeam().filter(function (id) { return state.faintedPets.indexOf(id) === -1; }); }
function sendInReplacement(id) {
  state.activePet = id;
  const p = getPetById(id);
  soundClick();
  showPopup('🎒 ' + p.name.toUpperCase() + ', GO!');
  inputLocked = false;
  generateProblem();
  document.getElementById('feedback-msg').innerText = 'Go, ' + p.name + '!';
  buddyReact('cheer');
  saveState();
  updateStatsUI();
}
// Called whenever a new problem is made: if the fighter is fainted, wait for a teammate, or (no teammate left) revive the team.
function holdForSwitch() {
  if (!needsSwitch()) return;
  if (aliveTeamIds().length) {
    inputLocked = true;
    document.getElementById('feedback-msg').innerText = getActivePetDisplay().name + ' needs rest! Tap a teammate to send in.';
    return;
  }
  state.faintedPets = [];                                        // the whole team has fainted: everyone is revived
  partyHp = {};
}
const LONG_PRESS_MS = 500;
// The team picker is the Cup tab of the buddy hub.
function openTeamPicker() {
  if (isModalOpen()) return;
  hubTab = 'tour';
  openHub();
}
function updateTeamBar() {
  const bar = document.getElementById('team-bar');
  if (!bar) return;
  const ids = getTeam();
  if (ids.length < 2) { bar.innerHTML = ''; return; }
  const boss = getBossInfo();
  const picking = needsSwitch();
  bar.classList.toggle('pick', picking);
  if (getOwnedIds().length >= 4 && !state.storySeen.teamHint) {          // one-time tip
    state.storySeen.teamHint = 1;
    toast('💡 Tip: press and hold a buddy under the arena to change your team');
  }
  bar.innerHTML = '';
  ids.forEach(function (id) {
    const p = getPetById(id), mu = teamMatchup(id, boss);
    const resting = state.faintedPets.indexOf(id) !== -1;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swap-chip ' + mu.cls + (id === state.activePet ? ' active' : '') + (resting || (!picking && state.swapUsed && id !== state.activePet) ? ' resting' : '');
    const label = 'Swap to ' + p.name + ', ' + (resting ? 'resting' : picking ? 'send it in' : state.swapUsed ? 'swap already used this battle' : mu.mult + ' damage against ' + boss.name);
    b.setAttribute('aria-label', label);
    b.title = label + ' (press and hold to change your team)';
    b.innerHTML = '<span class="tc-icon">' + p.icon + '</span><span class="tc-badge" aria-hidden="true">' + (resting ? '💤' : mu.icon) + '</span>';
    // a quick tap swaps; pressing and holding opens the team picker
    let pressTimer = null, held = false;
    const stop = function () { clearTimeout(pressTimer); };
    b.addEventListener('pointerdown', function () { held = false; stop(); pressTimer = setTimeout(function () { held = true; openTeamPicker(); }, LONG_PRESS_MS); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, stop); });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    b.onclick = function () { if (held) { held = false; return; } swapBuddy(id); };
    bar.appendChild(b);
  });
}
// Every way of changing your fighter (team chips, the Sanctuary, a new catch) shares the one free swap of each battle.
// Returns true when the swap happened; a refusal says why.
function useSwap(id) {
  if (id === state.activePet) return false;
  if (getTeam().indexOf(id) === -1) { soundWrong(); toast('Only your team can fight. Add it to your team first (press and hold a team buddy).'); return false; }
  if (needsSwitch()) {                                           // your fighter fainted: a teammate must take over (this is not the battle's free swap)
    if (aliveTeamIds().indexOf(id) === -1) { soundWrong(); toast('Pick a buddy from your team to send in.'); return false; }
    sendInReplacement(id);
    return true;
  }
  if (state.swapUsed) { soundWrong(); toast('You already swapped buddies in this battle.'); return false; }
  state.activePet = id;
  state.swapUsed = true;
  return true;
}
function swapBuddy(id) {
  if (id === state.activePet) return;
  if (getTeam().indexOf(id) === -1) { soundWrong(); return; }               // only team buddies can fight
  if (state.faintedPets.indexOf(id) !== -1) { soundWrong(); toast(getPetById(id).name + ' is resting! Beat a boss to revive your team.'); return; }
  if (needsSwitch()) { useSwap(id); return; }
  if (state.swapUsed) { soundWrong(); toast('You already swapped buddies in this battle.'); return; }
  state.activePet = id;
  state.swapUsed = true;
  soundClick();
  const mu = teamMatchup(id, getBossInfo());
  if (mu.cls === 'good') { soundCorrect(1); showPopup('⚡ GREAT PICK! x1.5 DAMAGE'); }
  else if (mu.cls === 'bad') showPopup('Hmm, a better match might help! ' + mu.icon);
  saveState();
  updateStatsUI();
  buddyReact('cheer');
}
