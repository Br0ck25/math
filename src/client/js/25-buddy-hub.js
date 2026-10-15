// =====================================================================
//  BUDDY HUB: CARE, TRADING CARDS, TOURNAMENT
// =====================================================================
const SNACKS = [
  { icon: '🥩', name: 'juicy steak' }, { icon: '🍓', name: 'sweet berries' }, { icon: '🥕', name: 'crunchy carrots' },
  { icon: '🐟', name: 'fresh fish' }, { icon: '🍯', name: 'golden honey' }, { icon: '🧀', name: 'stinky cheese' },
  { icon: '🍉', name: 'watermelon' }, { icon: '🌰', name: 'toasty nuts' }
];
const ELEM_COLORS = { fire: '#ef4444', water: '#38bdf8', nature: '#22c55e', electric: '#facc15', dark: '#8b5cf6', magic: '#ec4899', shadow: '#a855f7' };

function favSnack(id) {
  const sp = getSpecies(id);
  if (sp && sp.snack) return sp.snack;              // some buddies have a favorite of their own
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
  return SNACKS[h % SNACKS.length];
}
function getCare(id) {
  const today = dayKey();
  let c = state.care[id];
  if (!c) c = state.care[id] = { day: today, pets: 0, treat: false, fav: false, bond: 0, last: '' };
  if (c.day !== today) { c.day = today; c.pets = 0; c.treat = false; c.fav = false; }
  return c;
}
function getBond(id) {
  const c = state.care && state.care[id];
  return c ? clamp(parseInt(c.bond, 10) || 0, 0, ECON.care.maxBond) : 0;
}
function addXpTo(id, amt) {
  state.buddyXp[id] = Math.min(xpForLevel(MAX_LEVEL), getBuddyXp(id) + amt);
}
function isSleepy(id) { return state.faintedPets.indexOf(id) !== -1; }
function moodOf(id) {
  if (isSleepy(id)) return { icon: '😴', text: 'Sleepy — wakes up after your next boss win' };
  const c = getCare(id);
  if (c.treat || c.fav) return { icon: '😄', text: 'Happy and full!' };
  const gap = c.last ? daysSince(c.last) : 9;
  if (gap >= 2) return { icon: '🥺', text: 'Feeling a bit hungry...' };
  return { icon: '🙂', text: 'Doing fine' };
}

// arena reactions
// kind: 'win' (boss beaten), 'cheer' (a right answer: a small hop), 'wince' (a wrong answer).
const BUDDY_REACTIONS = {
  win: { el: 'fighter-icon-wrapper', cls: 'happy-bounce', ms: 1000, bubbles: ['🥳', '❤️', '✨'] },
  cheer: { el: 'pet-fighter-icon', cls: 'buddy-hop', ms: 420, bubbles: null },      // inner icon: the wrapper is busy tackling
  wince: { el: 'pet-fighter-icon', cls: 'buddy-wince', ms: 500, bubbles: ['😣', '😵', '🥴'] },
  streak: { el: 'fighter-icon-wrapper', cls: 'happy-bounce', ms: 900, bubbles: ['🔥', '🎉', '💪', '⭐'] },   // every third answer in a row
  wake: { el: 'pet-fighter-icon', cls: 'buddy-hop', ms: 420, bubbles: ['😄', '👋'] }
};
function buddyReact(kind) {
  const r = BUDDY_REACTIONS[kind];
  const w = r && document.getElementById(r.el);
  const b = document.getElementById('mood-bubble');
  if (!w || !b) return;
  w.classList.remove(r.cls);
  void w.offsetWidth;
  w.classList.add(r.cls);
  setTimeout(function () { w.classList.remove(r.cls); }, r.ms);
  if (r.bubbles) {
    b.innerText = pick(r.bubbles);
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
  }
}

// ----- hub shell -----
let hubPet = 'dog';
let hubTab = 'care';
function openHub() { showModal('hub-modal', function () { state.seen.hub = true; hubPet = getOwnedIds().indexOf(state.activePet) !== -1 ? state.activePet : 'dog'; renderHub(); }); }
function closeHub() { hideModal('hub-modal', function () { saveState(); updateStatsUI(); }); }
// ‹ › in the hub header: previous / next buddy you own
function hubStep(dir) {
  const ids = getOwnedIds();
  hubPet = ids[(ids.indexOf(hubPet) + dir + ids.length) % ids.length];
  soundClick();
  renderHub();
}
function setHubTab(t) { soundClick(); hubTab = t; renderHub(); }
function renderHub() {
  const d = getPetById(hubPet);
  const sleepy = isSleepy(hubPet);
  const ic = document.getElementById('hub-icon');
  ic.className = 'hub-icon' + (sleepy ? ' sleepy' : '');
  const gear = hubPet === state.activePet ? activeGear() : { acc: null, armor: null };
  ic.innerHTML = avatarHtml(d, 56, gearMarkup(gear.acc, gear.armor)) + (sleepy ? '<span style="font-size:1.2rem;">💤</span>' : '');
  document.getElementById('hub-name').innerText = d.name;
  document.getElementById('hub-sub').innerText = 'Lv ' + d.level + ' · ' + d.element + ' ' + roleOf(d).name + ' · ' + moodOf(hubPet).icon + ' ' + moodOf(hubPet).text;
  const tabs = [['care', '💖 Care'], ['card', '🃏 Card'], ['tour', '🏆 Cup'], ['duel', '⚔️ Duel'], ['hold', '🎒 Hold']];
  const tb = document.getElementById('hub-tabs');
  tb.innerHTML = '';
  tabs.forEach(function (t) {
    const b = document.createElement('button');
    b.className = 'grade-btn' + (hubTab === t[0] ? ' active' : '');
    b.innerText = t[1];
    b.onclick = function () { setHubTab(t[0]); };
    tb.appendChild(b);
  });
  if (hubTab === 'care') renderCare();
  else if (hubTab === 'card') renderCardTab();
  else if (hubTab === 'duel') renderDuelTab();
  else if (hubTab === 'hold') renderHoldTab();
  else renderTourTab();
}

// ----- care -----
function heartsHtml(n) {
  let h = '';
  for (let i = 0; i < ECON.care.maxBond; i++) h += i < n ? '❤️' : '🤍';
  return h;
}
function name0(id) { return getPetById(id).baseName; }
function renderCare() {
  const id = hubPet;
  const c = getCare(id);
  const sleepy = isSleepy(id);
  const fav = favSnack(id);
  const bond = getBond(id);
  const row = function (title, desc, btn) {
    return '<div class="care-row"><div><div class="t">' + title + '</div><div class="d">' + desc + '</div></div>' + btn + '</div>';
  };
  const btn = function (label, fn, off) {
    return '<button class="claim-btn" ' + (off ? 'disabled' : '') + ' onclick="' + fn + '">' + label + '</button>';
  };
  let h = '<div class="hearts" title="Bond">' + heartsHtml(bond) + '</div>' +
    '<div style="font-size:0.68rem; color:var(--text-muted);">Bond ' + bond + '/' + ECON.care.maxBond + (bond ? ' · +' + Math.round(bond * ECON.care.bondXpBonus * 100) + '% XP for this buddy' : ' · feed the favorite snack to grow it') + '</div>';
  if (sleepy) h += '<div class="care-row" style="justify-content:center;">😴 Shhh... resting. Beat a boss to wake everyone up!</div>';
  h += row('🤚 Pet', 'Cuddles today: ' + c.pets + '/' + ECON.care.petsPerDay + ' · +' + ECON.care.petXp + ' XP each', btn('Pet', 'careAct(&quot;pet&quot;)', sleepy || c.pets >= ECON.care.petsPerDay));
  h += row('🍪 Biscuit', 'A tasty treat · +' + ECON.care.treatXp + ' XP · once a day', btn(c.treat ? 'Eaten' : ECON.care.treatCost + ' 💎', 'careAct(&quot;treat&quot;)', sleepy || c.treat));
  h += row(fav.icon + ' Favorite: ' + fav.name, 'Their very favorite! +1 bond · +' + ECON.care.favXp + ' XP · once a day', btn(c.fav ? 'Eaten' : ECON.care.favCost + ' 💎', 'careAct(&quot;fav&quot;)', sleepy || c.fav));
  const mine = spareCount(id), all = Object.keys(state.spares).reduce(function (a, k) { return a + state.spares[k]; }, 0);
  if (mine) h += row('🎒 Spare ' + name0(id) + ' x' + mine, 'Extra copies from wild battles. Your buddy stays safe!', btn('Sell +' + spareValueOf(id) + ' 💎', 'sellSpare(&quot;' + id + '&quot;)'));
  if (all > mine) h += row('🎒 All spares (' + all + ')', 'Sell every extra copy at once.', btn('Sell all', 'sellAllSpares()'));
  h += '<div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px;">You have 💎 ' + state.gems + '</div>';
  document.getElementById('hub-body').innerHTML = h;
}
function hubBounce(emoji) {
  const ic = document.getElementById('hub-icon');
  ic.classList.remove('bounce');
  void ic.offsetWidth;
  ic.classList.add('bounce');
  if (emoji) toast(emoji);
}
function careAct(kind) {
  const id = hubPet;
  if (isSleepy(id)) return;
  const c = getCare(id);
  const name = getPetById(id).baseName;
  if (kind === 'pet') {
    if (c.pets >= ECON.care.petsPerDay) return;
    c.pets += 1;
    addXpTo(id, ECON.care.petXp);
    soundClick();
    hubBounce('💕 ' + name + ' loves it!');
  } else if (kind === 'treat') {
    if (c.treat || state.gems < ECON.care.treatCost) { if (!c.treat) toast('Not enough 💎'); return; }
    state.gems -= ECON.care.treatCost;
    c.treat = true;
    addXpTo(id, ECON.care.treatXp);
    soundCoinChirp();
    hubBounce('🍪 Yum! ' + name + ' is happy!');
  } else if (kind === 'fav') {
    if (c.fav || state.gems < ECON.care.favCost) { if (!c.fav) toast('Not enough 💎'); return; }
    state.gems -= ECON.care.favCost;
    c.fav = true;
    addXpTo(id, ECON.care.favXp);
    const before = c.bond;
    c.bond = Math.min(ECON.care.maxBond, c.bond + 1);
    soundSecretFound();
    if (c.bond > before) launchConfetti();
    hubBounce(favSnack(id).icon + ' ' + name + ' LOVES ' + favSnack(id).name + '!' + (c.bond > before ? ' Bond up! ❤️' : ''));
  }
  c.last = dayKey();
  saveState();
  updateStatsUI();
  renderHub();
}
