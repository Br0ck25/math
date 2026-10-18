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
  if (FAV_SNACKS[id]) return FAV_SNACKS[id];
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
function maxBondLimit() {
  return (typeof hasTech === 'function' && hasTech('deep_harmony')) ? 7 : ECON.care.maxBond;
}
function maxPetsLimit() {
  return (typeof hasTech === 'function' && hasTech('warm_hearth')) ? 5 : ECON.care.petsPerDay;
}
function getBond(id) {
  const c = state.care && state.care[id];
  return c ? clamp(parseInt(c.bond, 10) || 0, 0, maxBondLimit()) : 0;
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
  const tabs = [['care', '💖 Care'], ['room', '🏠 Room'], ['tree', '🌳 Tree'], ['card', '🃏 Card'], ['tour', '🏆 Cup'], ['duel', '⚔️ Duel'], ['hold', '🎒 Hold']];
  const tb = document.getElementById('hub-tabs');
  tb.innerHTML = '';
  tabs.forEach(function (t) {
    const b = document.createElement('button');
    b.className = 'grade-btn' + (hubTab === t[0] ? ' active' : '');
    b.innerText = t[1];
    b.onclick = function () {
      if (t[0] === 'tree') { closeHub(); openTree(); return; }
      setHubTab(t[0]);
    };
    tb.appendChild(b);
  });
  if (hubTab === 'care') renderCare();
  else if (hubTab === 'room') renderRoomTab();
  else if (hubTab === 'card') renderCardTab();
  else if (hubTab === 'duel') renderDuelTab();
  else if (hubTab === 'hold') renderHoldTab();
  else renderTourTab();
}

// ----- Trainer Profile & Showcase Sanctuary Room -----
const PROFILE_TITLES = [
  { id: 'Rookie Calculator', label: 'Rookie Calculator', icon: '🌱', desc: 'Your starting trainer title', cost: 0, req: 'Starting title' },
  { id: 'Number Knight', label: 'Number Knight', icon: '⚔️', desc: 'Complete all 5 raid chapters', cost: (ECON.profile && ECON.profile.titles && ECON.profile.titles.knight) || 20, req: 'Complete all raids' },
  { id: 'Gem Defender', label: 'Gem Defender', icon: '🛡️', desc: 'Train any buddy to Level 20', cost: (ECON.profile && ECON.profile.titles && ECON.profile.titles.defender) || 45, req: 'Reach Buddy Lv 20' },
  { id: 'Kingdom Explorer', label: 'Kingdom Explorer', icon: '🧭', desc: 'Visit all 7 Number Kingdom lands', cost: (ECON.profile && ECON.profile.titles && ECON.profile.titles.explorer) || 60, req: 'Visit all 7 kingdoms' },
  { id: 'Buddy Tamer', label: 'Buddy Tamer', icon: '🐾', desc: 'Befriend 50 unique buddies', cost: (ECON.profile && ECON.profile.titles && (ECON.profile.titles.tamer || ECON.profile.titles.dragon)) || 90, req: 'Own 50 unique buddies' },
  { id: 'Grand Arithmancer', label: 'Grand Arithmancer', icon: '👑', desc: 'Train any buddy to Level 60', cost: (ECON.profile && ECON.profile.titles && ECON.profile.titles.arithmancer) || 150, req: 'Reach Buddy Lv 60+' }
];
const PROFILE_FRAMES = [
  { id: 'classic', label: 'Classic', border: '#94a3b8', desc: 'Standard element-colored trading card border', cost: 0 },
  { id: 'gold', label: 'Golden Foil', border: '#facc15', desc: 'Gleaming championship gold card border', cost: ECON.profile.frames.gold },
  { id: 'neon', label: 'Neon Cyber', border: '#22d3ee', desc: 'Electric cyan glow around every trading card', cost: ECON.profile.frames.neon },
  { id: 'cosmic', label: 'Cosmic Void', border: '#e879f9', desc: 'Starlight magenta nebula card frame', cost: ECON.profile.frames.cosmic },
  { id: 'crystal', label: 'Crystal Prism', border: '#a5b4fc', desc: 'Diamond-cut prism border for your cards', cost: ECON.profile.frames.crystal }
];
function ensureProfile() {
  if (!state.profile || typeof state.profile !== 'object') {
    state.profile = defaultProfile();
  }
  return state.profile;
}

function titleRequirementMet(id) {
  if (id === 'Rookie Calculator') return true;
  if (id === 'Number Knight') return (state.raidsCleared || 0) >= 5;
  if (id === 'Gem Defender') return getBestLevel() >= 20;
  if (id === 'Kingdom Explorer') return (typeof getVisitedKingdomsCount === 'function' ? getVisitedKingdomsCount() : 0) >= 7;
  if (id === 'Buddy Tamer' || id === 'Dragon Tamer') return (typeof getOwnedIds === 'function' ? getOwnedIds().length : 0) >= 50;
  if (id === 'Grand Arithmancer') return getBestLevel() >= 60;
  return false;
}

function titleProgress(id) {
  if (id === 'Rookie Calculator') return 'Default';
  if (id === 'Number Knight') return 'Raids: ' + Math.min(5, state.raidsCleared || 0) + '/5';
  if (id === 'Gem Defender') return 'Best Lv: ' + Math.min(20, getBestLevel()) + '/20';
  if (id === 'Kingdom Explorer') return 'Lands: ' + Math.min(7, typeof getVisitedKingdomsCount === 'function' ? getVisitedKingdomsCount() : 1) + '/7';
  if (id === 'Buddy Tamer' || id === 'Dragon Tamer') return 'Buddies: ' + Math.min(50, typeof getOwnedIds === 'function' ? getOwnedIds().length : 0) + '/50';
  if (id === 'Grand Arithmancer') return 'Best Lv: ' + Math.min(60, getBestLevel()) + '/60';
  return '';
}

function checkTitleUnlocks() {
  const prof = ensureProfile();
  if (prof.title === 'Dragon Tamer') prof.title = 'Buddy Tamer';
  const dtIdx = prof.unlockedTitles.indexOf('Dragon Tamer');
  if (dtIdx !== -1) prof.unlockedTitles[dtIdx] = 'Buddy Tamer';
}

function tapRoomBuddy(id) {
  const sp = getPetById(id);
  if (!sp) return;
  if (typeof soundBuddyCry === 'function') soundBuddyCry(id, sp.element);
  const icon = (sp.icon && sp.icon.indexOf('<') === -1) ? sp.icon + ' ' : '💖 ';
  toast(icon + sp.baseName + ' waves happily from the Sanctuary! 💖');
}
function toggleShowcaseBuddy(id) {
  const prof = ensureProfile();
  const idx = prof.showcase.indexOf(id);
  if (idx !== -1) {
    if (prof.showcase.length <= 1) { toast('Keep at least 1 buddy in your Sanctuary Room!'); return; }
    prof.showcase.splice(idx, 1);
  } else {
    if (prof.showcase.length >= ECON.profile.maxShowcase) prof.showcase.pop();
    prof.showcase.unshift(id);
  }
  soundClick();
  saveState();
  renderRoomTab();
}
function selectProfileTitle(id) {
  checkTitleUnlocks();
  const prof = ensureProfile();
  const def = PROFILE_TITLES.find(function (t) { return t.id === id || (id === 'Dragon Tamer' && t.id === 'Buddy Tamer'); });
  if (!def) return;
  const targetId = def.id;
  const alreadyBought = prof.unlockedTitles.indexOf(targetId) !== -1;
  const reqMet = titleRequirementMet(targetId);

  if (!alreadyBought && !reqMet) {
    soundWrong();
    toast('🔒 Locked! ' + def.desc + ' (' + titleProgress(targetId) + ')');
    return;
  }

  if (!alreadyBought) {
    if (state.gems < def.cost) {
      soundWrong();
      toast('Need ' + (def.cost - state.gems) + ' more 💎 to buy ' + def.label + '!');
      return;
    }
    state.gems -= def.cost;
    prof.unlockedTitles.push(targetId);
    soundCoinChirp();
    toast('🏅 Purchased Trainer Title: ' + def.icon + ' ' + def.label + '!');
  } else {
    soundClick();
    toast('Equipped title: ' + def.label);
  }

  prof.title = targetId;
  saveState();
  updateStatsUI();
  renderRoomTab();
}
function selectProfileFrame(id) {
  const prof = ensureProfile();
  const def = PROFILE_FRAMES.find(function (f) { return f.id === id; });
  if (!def) return;
  if (prof.unlockedFrames.indexOf(id) === -1) {
    if (state.gems < def.cost) { toast('Need ' + def.cost + ' 💎 to unlock ' + def.label + ' Frame'); return; }
    state.gems -= def.cost;
    prof.unlockedFrames.push(id);
    soundCoinChirp();
    toast('🖼️ Unlocked Card Frame: ' + def.label + '!');
  } else {
    soundClick();
  }
  prof.frame = id;
  saveState();
  renderRoomTab();
}
function getSanctuaryIds() {
  const prof = ensureProfile();
  const owned = getOwnedIds();
  const valid = (prof.showcase || []).filter(function (id) { return owned.indexOf(id) !== -1; }).slice(0, ECON.profile.maxShowcase);
  if (!valid.length && state.activePet) valid.push(state.activePet);
  return valid;
}
function getSanctuaryXpShare() {
  return getSanctuaryIds().length * ECON.profile.roomXpPerBuddy;
}

let sanctuarySections = {
  room: true,
  titles: true,
  frames: true
};

function toggleSanctuarySection(sec) {
  soundClick();
  sanctuarySections[sec] = !sanctuarySections[sec];
  renderRoomTab();
}

function renderRoomTab() {
  checkTitleUnlocks();
  const prof = ensureProfile();
  const spots = [
    { left: '16%', top: '26%', dur: '3.6s' },
    { left: '46%', top: '22%', dur: '4.2s' },
    { left: '74%', top: '28%', dur: '3.9s' },
    { left: '24%', top: '58%', dur: '4.4s' },
    { left: '54%', top: '56%', dur: '3.7s' },
    { left: '78%', top: '60%', dur: '4.1s' }
  ];
  const validShow = getSanctuaryIds();
  const xpBonusPct = Math.round(getSanctuaryXpShare() * 100);

  let h = '';

  // Section 1: Companion Sanctuary Room Showcase
  const inRoom = validShow.indexOf(hubPet) !== -1;
  const curPet = getPetById(hubPet);
  h += '<button type="button" class="sanctuary-section-header" onclick="toggleSanctuarySection(\'room\')">' +
    '<span>🏠 Companion Sanctuary (' + validShow.length + '/' + ECON.profile.maxShowcase + ' · +' + xpBonusPct + '% XP)</span>' +
    '<span>' + (sanctuarySections.room ? '▼' : '▶') + '</span></button>';

  if (sanctuarySections.room) {
    let stage = '<div class="sanctuary-stage">';
    validShow.slice(0, ECON.profile.maxShowcase).forEach(function (id, idx) {
      const p = getPetById(id);
      const sp = spots[idx % spots.length];
      stage += '<button type="button" class="sanctuary-buddy" style="left:' + sp.left + '; top:' + sp.top + '; --wander-dur:' + sp.dur + '; background:none; border:none;" onclick="tapRoomBuddy(&quot;' + id + '&quot;)" aria-label="Pet ' + p.name + ' in Sanctuary">' +
        avatarHtml(p, 36) + '<span class="sanctuary-buddy-lbl">' + p.baseName + '</span></button>';
    });
    stage += '<span class="sanctuary-decor">🪴 🛋️ ⭐ Sanctuary (' + validShow.length + '/' + ECON.profile.maxShowcase + ' · +' + xpBonusPct + '% XP)</span></div>';
    h += stage +
      '<div class="care-row"><div><div class="t">' + curPet.icon + ' ' + curPet.baseName + ' in Sanctuary</div><div class="d">Pick up to ' + ECON.profile.maxShowcase + ' buddies (+1% battle XP per buddy — currently +' + xpBonusPct + '% XP!)</div></div>' +
      '<button type="button" class="claim-btn" onclick="toggleShowcaseBuddy(&quot;' + hubPet + '&quot;)">' + (inRoom ? 'Remove' : 'Add to Room') + '</button></div>';
  }

  // Section 2: Trainer Titles
  h += '<button type="button" class="sanctuary-section-header" onclick="toggleSanctuarySection(\'titles\')">' +
    '<span>🏅 Trainer Titles (Active: ' + prof.title + ')</span>' +
    '<span>' + (sanctuarySections.titles ? '▼' : '▶') + '</span></button>';

  if (sanctuarySections.titles) {
    PROFILE_TITLES.forEach(function (t) {
      const alreadyBought = prof.unlockedTitles.indexOf(t.id) !== -1;
      const reqMet = titleRequirementMet(t.id);
      const eq = prof.title === t.id;
      const prog = titleProgress(t.id);

      let sub = '';
      let btnLabel = '';
      let btnCls = 'claim-btn';
      let btnDisabled = false;

      if (eq) {
        sub = 'Active title';
        btnLabel = 'Active';
        btnDisabled = true;
      } else if (alreadyBought) {
        sub = 'Owned · Tap to equip';
        btnLabel = 'Equip';
      } else if (reqMet) {
        sub = '<span style="color:#38bdf8;">✅ Unlocked · Ready to buy for ' + t.cost + ' 💎</span>';
        btnLabel = t.cost + ' 💎 Buy';
        if (state.gems < t.cost) btnCls += ' cant-afford';
      } else {
        sub = '<span style="color:#f87171;">🔒 ' + prog + '</span>';
        btnLabel = '🔒 Locked';
        btnCls += ' cant-afford';
      }

      h += '<div class="care-row"><div><div class="t">' + t.icon + ' ' + t.label + (eq ? ' ✅' : '') + '</div><div class="d">' + t.desc + ' · ' + sub + '</div></div>' +
        '<button type="button" class="' + btnCls + '" ' + (btnDisabled ? 'disabled' : '') + ' onclick="selectProfileTitle(&quot;' + t.id + '&quot;)">' + btnLabel + '</button></div>';
    });
  }

  // Section 3: Trading Card Frames
  h += '<button type="button" class="sanctuary-section-header" onclick="toggleSanctuarySection(\'frames\')">' +
    '<span>🖼️ Trading Card Frames (Active: ' + prof.frame + ')</span>' +
    '<span>' + (sanctuarySections.frames ? '▼' : '▶') + '</span></button>';

  if (sanctuarySections.frames) {
    PROFILE_FRAMES.forEach(function (f) {
      const owned = prof.unlockedFrames.indexOf(f.id) !== -1;
      const eq = prof.frame === f.id;
      h += '<div class="care-row"><div><div class="t" style="color:' + f.border + ';">◆ ' + f.label + (eq ? ' ✅' : '') + '</div><div class="d">' + f.desc + '</div></div>' +
        '<button type="button" class="claim-btn" ' + (eq ? 'disabled' : '') + ' onclick="selectProfileFrame(&quot;' + f.id + '&quot;)">' + (eq ? 'Active' : owned ? 'Use' : f.cost + ' 💎') + '</button></div>';
    });
  }

  h += '<div style="font-size:0.7rem; color:var(--text-muted); margin-top:6px;">You have 💎 ' + state.gems + '</div>';
  document.getElementById('hub-body').innerHTML = h;
}

// ----- care -----
function heartsHtml(n) {
  let h = '';
  const max = maxBondLimit();
  for (let i = 0; i < max; i++) h += i < n ? '❤️' : '🤍';
  return h;
}
function name0(id) { return getPetById(id).baseName; }
function renderCare() {
  const id = hubPet;
  const c = getCare(id);
  const sleepy = isSleepy(id);
  const fav = favSnack(id);
  const bond = getBond(id);
  const maxB = maxBondLimit();
  const maxP = maxPetsLimit();
  const row = function (title, desc, btn) {
    return '<div class="care-row"><div><div class="t">' + title + '</div><div class="d">' + desc + '</div></div>' + btn + '</div>';
  };
  const btn = function (label, fn, off) {
    return '<button class="claim-btn" ' + (off ? 'disabled' : '') + ' onclick="' + fn + '">' + label + '</button>';
  };
  let h = '<div class="hearts" title="Bond">' + heartsHtml(bond) + '</div>' +
    '<div style="font-size:0.68rem; color:var(--text-muted);">Bond ' + bond + '/' + maxB + (bond ? ' · +' + Math.round(bond * ECON.care.bondXpBonus * 100) + '% XP for this buddy' : ' · feed the favorite snack to grow it') + '</div>';
  if (sleepy) h += '<div class="care-row" style="justify-content:center;">😴 Shhh... resting. Beat a boss to wake everyone up!</div>';
  h += row('🤚 Pet', 'Cuddles today: ' + c.pets + '/' + maxP + ' · +' + ECON.care.petXp + ' XP each', btn('Pet', 'careAct(&quot;pet&quot;)', sleepy || c.pets >= maxP));
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
  const maxP = maxPetsLimit();
  const xpMult = (typeof hasTech === 'function' && hasTech('chefs_touch')) ? 1.25 : 1;
  if (kind === 'pet') {
    if (c.pets >= maxP) return;
    c.pets += 1;
    addXpTo(id, ECON.care.petXp);
    soundClick();
    hubBounce('💕 ' + name + ' loves it!');
  } else if (kind === 'treat') {
    if (c.treat || state.gems < ECON.care.treatCost) { if (!c.treat) toast('Not enough 💎'); return; }
    state.gems -= ECON.care.treatCost;
    c.treat = true;
    addXpTo(id, Math.round(ECON.care.treatXp * xpMult));
    soundCoinChirp();
    hubBounce('🍪 Yum! ' + name + ' is happy!');
  } else if (kind === 'fav') {
    if (c.fav || state.gems < ECON.care.favCost) { if (!c.fav) toast('Not enough 💎'); return; }
    state.gems -= ECON.care.favCost;
    c.fav = true;
    addXpTo(id, Math.round(ECON.care.favXp * xpMult));
    const before = c.bond;
    c.bond = Math.min(maxBondLimit(), c.bond + 1);
    soundSecretFound();
    if (c.bond > before) launchConfetti();
    hubBounce(favSnack(id).icon + ' ' + name + ' LOVES ' + favSnack(id).name + '!' + (c.bond > before ? ' Bond up! ❤️' : ''));
  }
  c.last = dayKey();
  saveState();
  updateStatsUI();
  renderHub();
}
