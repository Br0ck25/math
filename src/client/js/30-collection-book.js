// =====================================================================
//  COLLECTION BOOK
// =====================================================================
function markBossSeen(i) {
  if (i === undefined || i < 0 || !state.bossBook) return;
  if (!state.bossBook[i]) state.bossBook[i] = { wins: 0, form: -1, alpha: 0 };
}
function markBossWin(i, form) {
  if (i === undefined || i < 0) return;
  markBossSeen(i);
  const b = state.bossBook[i];
  b.wins += 1;
  b.form = Math.max(b.form, form || 0);
  if (form === 2) b.alpha = (b.alpha || 0) + 1;
}
// After a boss win: counts Alpha wins toward the boss's buddy and hands it over at the target. Returns the buddy when it just joined.
function checkBossBuddy(idx, form) {
  const m = monstersList[idx];
  if (!m || !m.buddy || form !== 2) return null;
  const sp = getSpecies(m.buddy);
  if (!sp || state.unlockedSecrets.indexOf(sp.id) !== -1) return null;
  const n = state.bossBook[idx].alpha, need = ECON.bossBuddy.alphaWins;
  if (n < need) { toast('🏆 Alpha ' + m.name + ' beaten ' + n + '/' + need + ': ' + (need - n) + ' more and it joins you!'); return null; }
  grantBuddy(sp.id);
  state.unlockedSecrets.push(sp.id);
  checkEarnedGear();
  saveState();
  enqueueModal(function () { showLootModal(sp, 'boss'); });
  return sp;
}

// A boss joins you only through wins against its Alpha form, so that is the one number the card shows.
function bossHint(m, e) {
  if (!m.buddy) return e.wins > 0 ? 'Beaten x' + e.wins : 'Met • not beaten yet';
  if (state.unlockedSecrets.indexOf(m.buddy) !== -1) return '🏆 Won as buddy';
  if (e.form < 2) return 'Reach Alpha form to start';
  return '🏆 Alpha wins: ' + Math.min(e.alpha || 0, ECON.bossBuddy.alphaWins) + '/' + ECON.bossBuddy.alphaWins;
}
function bossHintColor(m, e) {
  if (m.buddy) return state.unlockedSecrets.indexOf(m.buddy) !== -1 || e.form >= 2 ? '#fde047' : '#94a3b8';
  return e.wins > 0 ? '#6ee7b7' : '#fbbf24';
}

const BOOK_MILESTONES = [
  { at: 10, gems: 20 }, { at: 25, gems: 40 }, { at: 50, gems: 75 }, { at: 100, gems: 150 },
  { at: 150, gems: 250 }, { at: 200, gems: 400 }, { at: 250, gems: 600 }
];
let bookTab = 'buddy';
let bookMissingOnly = false;
function toggleBookFilter() { soundClick(); bookMissingOnly = !bookMissingOnly; renderBook(); }
function bookOpenBuddy(id) { closeBook(); openHub(); hubPet = id; renderHub(); }

function bookCounts() {
  const buddyTotal = allBuddies().length;
  const buddyFound = getOwnedIds().length;
  const bossFound = Object.keys(state.bossBook).filter(function (k) { return monstersList[k]; }).length;
  const gearTotal = (accessoriesList.length - 1) + (armorList.length - 1);
  const gearFound = (state.unlockedAccessories.length - 1) + (state.unlockedArmor.length - 1);
  return {
    buddy: { found: buddyFound, total: buddyTotal },
    boss: { found: bossFound, total: monstersList.length },
    gear: { found: Math.max(0, gearFound), total: gearTotal },
    all: { found: buddyFound + bossFound + Math.max(0, gearFound), total: buddyTotal + monstersList.length + gearTotal }
  };
}

function claimBookReward(i) {
  const m = BOOK_MILESTONES[i];
  const c = bookCounts();
  if (!m || c.all.found < m.at || state.bookClaims.indexOf(m.at) !== -1) return;
  state.bookClaims.push(m.at);
  grantGems(m.gems, '📖 Collection reward! +' + m.gems + ' 💎', true);
  renderBook();
}

function setBookTab(t) { soundClick(); bookTab = t; renderBook(); }

function bookCard(o) {
  return '<div class="pet-card' + (o.locked ? ' locked' : '') + '"' + (o.style ? ' style="' + o.style + '"' : '') + (o.click ? ' onclick="' + o.click + '"' : '') + '>' +
    (o.rarity ? '<div class="rar-badge" style="color:' + o.rarity.col + '; border-color:' + o.rarity.col + ';">' + o.rarity.name + '</div>' : '') +
    '<div class="card-pic ' + (o.locked ? 'silhouette' : '') + '" style="font-size: 1.9rem; min-height: 36px; display: flex; align-items: center; justify-content: center;">' + o.icon + '</div>' +
    '<div class="card-name">' + o.name + '</div>' +
    (o.elem ? '<div style="margin: 1px 0;"><span class="element-pill elem-' + o.elem + '">' + o.elem + '</span></div>' : '') +
    (o.extra || '') +
    '<div style="font-size: 0.64rem; color: ' + (o.hintColor || '#a5b4fc') + '; font-weight: 700;">' + o.hint + '</div>' +
    '</div>';
}

function bookBuddy(sp, lockedHint) {
  const owned = getOwnedIds().indexOf(sp.id) !== -1;
  const rar = rarityOf(sp.id);
  if (!owned) return bookCard({ locked: true, icon: sp.icon, name: '???', hint: lockedHint, hintColor: '#94a3b8', rarity: rar });
  const d = getPetById(sp.id);
  const bond = getBond(sp.id);
  const extra = '<div class="forms-row" title="Evolution stage">' + sp.forms.map(function (f, i) { return '<span class="' + (i <= d.stage ? '' : 'silhouette') + '">⭐</span>'; }).join('') + '</div>' +
    '<div style="font-size:0.6rem;">' + heartsHtml(bond) + '</div>' +
    '<div style="font-size:0.6rem; color:#fcd34d;">Likes ' + favSnack(sp.id).icon + '</div>';
  return bookCard({ icon: avatarHtml(d, 40), name: d.name, elem: d.element, extra: extra, rarity: rar, click: 'bookOpenBuddy(&quot;' + sp.id + '&quot;)', hint: (sp.show ? sp.show + ' · ' : '') + 'Lv ' + d.level + (d.stage >= 2 ? ' • Final form ⭐' : '') + (isSleepy(sp.id) ? ' 😴' : '') });
}

function renderBook() {
  const c = bookCounts();
  document.getElementById('book-progress').innerText = c.all.found + ' / ' + c.all.total + ' discovered';

  const ms = document.getElementById('book-milestones');
  ms.innerHTML = '';
  BOOK_MILESTONES.forEach(function (m, i) {
    const claimed = state.bookClaims.indexOf(m.at) !== -1;
    const ready = !claimed && c.all.found >= m.at;
    const b = document.createElement('button');
    b.className = 'ms' + (ready ? ' ready' : '') + (claimed ? ' claimed' : '');
    b.innerHTML = (claimed ? '✅' : (ready ? '🎁' : '🔒')) + ' ' + m.at + '<br>+' + m.gems + ' 💎';
    if (ready) b.onclick = function () { claimBookReward(i); };
    ms.appendChild(b);
  });

  const tabs = [['buddy', '🐾 Buddies'], ['boss', '👾 Bosses'], ['gear', '🎩 Gear']];
  const tb = document.getElementById('book-tabs');
  tb.innerHTML = '';
  tabs.forEach(function (t) {
    const b = document.createElement('button');
    b.className = 'grade-btn' + (bookTab === t[0] ? ' active' : '');
    b.innerHTML = t[1] + '<br><span style="font-size:0.66rem; font-weight:700;">' + c[t[0]].found + '/' + c[t[0]].total + '</span>';
    b.onclick = function () { setBookTab(t[0]); };
    tb.appendChild(b);
  });

  const body = document.getElementById('book-body');
  let h = '<button class="grade-btn' + (bookMissingOnly ? ' active' : '') + '" style="width:100%; margin-bottom:6px; padding:5px;" onclick="toggleBookFilter()">' + (bookMissingOnly ? '👀 Showing only what is missing — tap for all' : '👀 Show only what I am missing') + '</button>';
  if (bookTab === 'buddy') {
    const sec = function (title, arr, hint, icoCount) {
      const found = arr.filter(function (sp) { return getOwnedIds().indexOf(sp.id) !== -1; }).length;
      const shown = bookMissingOnly ? arr.filter(function (sp) { return getOwnedIds().indexOf(sp.id) === -1; }) : arr;
      if (!shown.length) return '';
      return '<div class="mystery-section-title">' + title + ' (' + found + ' / ' + arr.length + ')</div><div class="pet-grid">' +
        shown.map(function (sp) { return bookBuddy(sp, typeof hint === 'function' ? hint(sp) : hint); }).join('') + '</div>';
    };
    // one section per pack; the card look is unchanged (rarity badge, bond, evolution stars)
    const tierHint = function (sp) {
      return storePets.indexOf(sp) !== -1 ? '💎 ' + sp.cost + ' in the Sanctuary' : (sp.ultra ? 'Rarest of all...' : sp.bossBuddy ? 'Beat it 3x as Alpha' : (sp.mythic ? 'Ultra rare boss rescue' : 'Rescued from bosses'));
    };
    buddyPacks().forEach(function (g) { h += sec(g.pack.icon + ' ' + g.pack.name, g.members, tierHint); });
  } else if (bookTab === 'boss') {
    h += '<div class="book-sub">Meet a boss to add it to your book. Beat bigger forms to earn titles! 👑 Raids cleared: ' + state.raidsCleared + '</div><div class="pet-grid">';
    monstersList.forEach(function (m, i) {
      const e = state.bossBook[i];
      if (bookMissingOnly && e) return;
      if (!e) { h += bookCard({ locked: true, icon: m.icon, name: '???', hint: 'Not met yet', hintColor: '#94a3b8' }); return; }
      const wk = weakOpForBoss(i);
      h += bookCard({
        icon: m.icon, name: m.name, elem: m.element,
        extra: (wk ? '<div style="font-size:0.62rem; color:#fca5a5; font-weight:800;">🎯 Weak: ' + OP_BY_ID[wk].icon + ' ' + OP_BY_ID[wk].label + '</div>' : '') +
          (m.slays ? '<div style="font-size:0.62rem; color:#fca5a5; font-weight:800;">☠️ Beats ' + slayerTarget(m) + '</div>' : '') +
          '',
        hint: bossHint(m, e), hintColor: bossHintColor(m, e),
        click: 'openBossCard(' + i + ')'
      });
    });
    h += '</div>';
  } else {
    h += '<div class="mystery-section-title">Body Armor (' + (state.unlockedArmor.length - 1) + ' / ' + (armorList.length - 1) + ')</div><div class="pet-grid">';
    armorList.filter(function (a) { return a.id !== 'none'; }).forEach(function (a) {
      const own = state.unlockedArmor.indexOf(a.id) !== -1;
      if (bookMissingOnly && own) return;
      h += own ? bookCard({ icon: a.icon, name: a.name, hint: '+' + a.hp + ' HP', hintColor: '#7dd3fc' })
               : bookCard({ locked: true, icon: a.icon, name: a.earn ? '🔒 Secret' : '???', hint: gearLockText(a), hintColor: '#f59e0b' });
    });
    h += '</div><div class="mystery-section-title">Accessories (' + (state.unlockedAccessories.length - 1) + ' / ' + (accessoriesList.length - 1) + ')</div><div class="pet-grid">';
    accessoriesList.filter(function (a) { return a.id !== 'none'; }).forEach(function (a) {
      const own = state.unlockedAccessories.indexOf(a.id) !== -1;
      if (bookMissingOnly && own) return;
      h += own ? bookCard({ icon: a.icon, name: a.name, hint: 'Collected', hintColor: '#10b981' })
               : bookCard({ locked: true, icon: a.icon, name: a.earn ? '🔒 Secret' : '???', hint: gearLockText(a), hintColor: '#f59e0b' });
    });
    h += '</div>';
  }
  body.innerHTML = h;
}
function openBook() { showModal('book-modal', renderBook); }
function closeBook() { hideModal('book-modal', updateStatsUI); }
