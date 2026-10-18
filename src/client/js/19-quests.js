// =====================================================================
//  DAILY QUESTS
// =====================================================================
const QUEST_MAKERS = {
  solve:    function () { const n = pick([15, 20, 30]); return { type: 'solve', text: 'Solve ' + n + ' problems', target: n, reward: ECON.quest.solveBase + n }; },
  op:       function () {
    const id = pick(getActiveOps()); const n = pick([5, 6, 8]);
    return { type: 'op', op: id, text: 'Solve ' + n + ' ' + OP_BY_ID[id].icon + ' ' + OP_BY_ID[id].label + ' problems', target: n, reward: ECON.quest.opBase + n * ECON.quest.opPer };
  },
  streak:   function () { const n = pick([5, 8]); return { type: 'streak', text: 'Reach a streak of ' + n, target: n, reward: ECON.quest.streak[n] }; },
  boss:     function () { const n = pick([2, 3]); return { type: 'boss', text: 'Defeat ' + n + ' bosses', target: n, reward: ECON.quest.boss[n] }; },
  flawless: function () { return { type: 'flawless', text: 'Beat a boss without a single mistake', target: 1, reward: ECON.quest.flawless }; },
  fast:     function () { const n = pick([5, 8]); return { type: 'fast', text: 'Get ' + n + ' ⚡ Speed Strikes', target: n, reward: ECON.quest.fast[n] }; },
  ult:      function () { const n = pick([2, 3]); return { type: 'ult', text: 'Use your Ultimate ' + n + ' times', target: n, reward: ECON.quest.ult[n] }; }
};

function makeQuests() {
  const pool = ['op', 'streak', 'boss', 'flawless', 'fast', 'ult'];
  pool.sort(function () { return Math.random() - 0.5; });
  const list = [QUEST_MAKERS.solve(), QUEST_MAKERS[pool[0]](), QUEST_MAKERS[pool[1]]()];
  list.forEach(function (q, i) { q.id = 'q' + i; q.progress = 0; q.done = false; q.claimed = false; });
  return list;
}
function ensureQuests() {
  const today = dayKey();
  if (!state.quests || state.quests.day !== today || !Array.isArray(state.quests.list)) {
    state.quests = { day: today, list: makeQuests(), chestClaimed: false };
    saveState();
  }
  return state.quests;
}

function questEvent(kind, val) {
  const qs = ensureQuests();
  let changed = false;
  qs.list.forEach(function (q) {
    if (q.done) return;
    let p = q.progress;
    if (kind === 'solve') {
      if (q.type === 'solve') p += 1;
      else if (q.type === 'op' && q.op === val) p += 1;
    } else if (kind === 'streak') {
      if (q.type === 'streak') p = Math.max(p, val);
    } else if (q.type === kind) {
      p += 1;
    }
    if (p !== q.progress) {
      q.progress = Math.min(q.target, p);
      changed = true;
      if (q.progress >= q.target) {
        q.done = true;
        toast('📜 Quest complete: ' + q.text);
      }
    }
  });
  if (changed) { saveState(); updateQuestBadge(); }
}

function questClaimable() {
  const qs = ensureQuests();
  let n = qs.list.filter(function (q) { return q.done && !q.claimed; }).length;
  if (qs.list.every(function (q) { return q.claimed; }) && !qs.chestClaimed) n += 1;
  return n;
}
function updateQuestBadge() {
  const el = document.getElementById('quest-badge');
  if (!el) return;
  const n = questClaimable();
  el.innerText = n;
  el.style.display = n > 0 ? 'inline' : 'none';
}

function claimQuest(i) {
  const qs = ensureQuests();
  const q = qs.list[i];
  if (!q || !q.done || q.claimed) return;
  q.claimed = true;
  grantGems(q.reward, '+' + q.reward + ' 💎 quest reward!');
  if (!state.egg) awardEgg(currentRegion().element || pick(['fire', 'water', 'nature', 'electric', 'dark', 'magic']), 'common');
  renderQuests();
}
function claimQuestChest() {
  const qs = ensureQuests();
  if (qs.chestClaimed || !qs.list.every(function (q) { return q.claimed; })) return;
  qs.chestClaimed = true;
  grantGems(ECON.quest.chest, '🎁 Daily chest! +' + ECON.quest.chest + ' 💎', true);
  if (!state.egg) awardEgg(currentRegion().element || pick(['fire', 'water', 'nature', 'electric', 'dark', 'magic']), 'rare');
  renderQuests();
}

function renderQuests() {
  const qs = ensureQuests();
  const activeOps = getActiveOps();
  const list = document.getElementById('quest-list');
  list.innerHTML = '';
  qs.list.forEach(function (q, i) {
    const pct = Math.round((q.progress / q.target) * 100);
    const blocked = q.type === 'op' && activeOps.indexOf(q.op) === -1 && !q.done;
    let btn;
    if (q.claimed) btn = '<span style="color:#6ee7b7;">✅ Claimed</span>';
    else if (q.done) btn = '<button class="claim-btn" onclick="claimQuest(' + i + ')">Claim +' + q.reward + ' 💎</button>';
    else btn = '<span style="color:#fde047;">Reward: +' + q.reward + ' 💎</span>';
    const card = document.createElement('div');
    card.className = 'quest-card' + (q.done ? ' done' : '') + (q.claimed ? ' claimed' : '');
    card.innerHTML =
      '<div class="quest-title">' + q.text + '</div>' +
      '<div class="quest-bar"><div class="quest-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="quest-row"><span>' + q.progress + ' / ' + q.target + (blocked ? ' • turn this type on in Settings' : '') + '</span>' + btn + '</div>';
    list.appendChild(card);
  });

  const allClaimed = qs.list.every(function (q) { return q.claimed; });
  const chest = document.getElementById('quest-chest');
  if (qs.chestClaimed) {
    chest.innerHTML = '<div class="chest-card" style="text-align:center;">🎁 Daily chest opened! Come back tomorrow for new quests.</div>';
  } else {
    chest.innerHTML = '<div class="chest-card"><div class="quest-row" style="color:#fde68a;"><span>🎁 Finish &amp; claim all 3 quests for a bonus chest: +' + ECON.quest.chest + ' 💎</span>' +
      '<button class="claim-btn" ' + (allClaimed ? '' : 'disabled') + ' onclick="claimQuestChest()">Open</button></div></div>';
  }

  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const hrs = Math.max(1, Math.ceil((midnight - now) / 3600000));
  document.getElementById('quest-reset-note').innerText = 'New quests in about ' + hrs + ' hour' + (hrs === 1 ? '' : 's') + '.';
}
function openQuests() { showModal('quest-modal', renderQuests); }
function closeQuests() { hideModal('quest-modal', updateStatsUI); }
