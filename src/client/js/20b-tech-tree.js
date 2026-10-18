// =====================================================================
//  TREE OF KNOWLEDGE: Tech tree progression system
//  Earn Star Sparks (★) by solving math, beating gym leaders, and hitting goals.
// =====================================================================
let treeBranch = 'mind';

function hasTech(id) {
  return !!(state.techUnlocked && state.techUnlocked.indexOf(id) !== -1);
}

const TREE_BRANCHES = [
  { id: 'mind',  label: '🧠 Mind' },
  { id: 'valor', label: '⚔️ Valor' },
  { id: 'wild',  label: '🧭 Wild' },
  { id: 'care',  label: '💖 Care' }
];

const TREE_TIERS = [
  { tier: 1, name: 'Tier 1: Apprentice', badgeReq: 0 },
  { tier: 2, name: 'Tier 2: Explorer',   badgeReq: 2 },
  { tier: 3, name: 'Tier 3: Master',     badgeReq: 4 },
  { tier: 4, name: 'Tier 4: Grandmaster', badgeReq: 6 }
];

function getTechNode(id) {
  return ((ECON.tech && ECON.tech.nodes) || []).find(function (n) { return n.id === id; }) || null;
}

function checkTechReqs(node) {
  if (hasTech(node.id)) return { ok: false, active: true, reason: 'Active' };
  if (node.pre) {
    const pre = getTechNode(node.pre);
    if (!hasTech(node.pre)) {
      return { ok: false, locked: true, reason: 'Requires ' + (pre ? pre.name : node.pre) };
    }
  }
  const tierDef = TREE_TIERS.find(function (t) { return t.tier === node.tier; });
  if (tierDef && tierDef.badgeReq > 0) {
    const badges = (state.badges || []).length;
    if (badges < tierDef.badgeReq) {
      return { ok: false, locked: true, reason: 'Requires ' + tierDef.badgeReq + ' Gym Badges (' + badges + '/' + tierDef.badgeReq + ')' };
    }
  }
  const stars = state.stars || 0;
  if (stars < node.stars) {
    return { ok: false, cost: true, reason: 'Need ' + (node.stars - stars) + ' more ★' };
  }
  if (state.gems < node.gems) {
    return { ok: false, cost: true, reason: 'Need ' + (node.gems - state.gems) + ' more 💎' };
  }
  return { ok: true, reason: 'Ready to unlock' };
}

function unlockTech(id) {
  const node = getTechNode(id);
  if (!node) return;
  const status = checkTechReqs(node);
  if (!status.ok) {
    if (status.active) return;
    soundWrong();
    toast(status.reason);
    return;
  }
  state.stars = Math.max(0, (state.stars || 0) - node.stars);
  state.gems = Math.max(0, state.gems - node.gems);
  if (!state.techUnlocked) state.techUnlocked = [];
  state.techUnlocked.push(node.id);
  soundSecretFound();
  launchConfetti('level');
  toast('🌟 Unlocked ' + node.name + '!');
  saveState();
  updateStatsUI();
  renderTree();
}

function setTreeBranch(b) {
  soundClick();
  treeBranch = b;
  renderTree();
}

function openTree() {
  if (inputLocked) return;
  showModal('tree-modal', renderTree);
}

function closeTree() {
  hideModal('tree-modal');
}

function renderTree() {
  const starsEl = document.getElementById('tree-stars');
  if (starsEl) starsEl.innerText = state.stars || 0;
  const gemsEl = document.getElementById('tree-gems');
  if (gemsEl) gemsEl.innerText = state.gems || 0;

  const tabsEl = document.getElementById('tree-branch-tabs');
  if (tabsEl) {
    let th = '';
    TREE_BRANCHES.forEach(function (b) {
      const active = treeBranch === b.id;
      th += '<button type="button" class="grade-btn' + (active ? ' active' : '') + '" onclick="setTreeBranch(\'' + b.id + '\')">' + b.label + '</button>';
    });
    tabsEl.innerHTML = th;
  }

  const container = document.getElementById('tree-branch-container');
  if (!container) return;

  const allNodes = (ECON.tech && ECON.tech.nodes) || [];
  const filtered = treeBranch === 'all' ? allNodes : allNodes.filter(function (n) { return n.branch === treeBranch; });

  let h = '';
  TREE_TIERS.forEach(function (tDef) {
    const tierNodes = filtered.filter(function (n) { return n.tier === tDef.tier; });
    if (!tierNodes.length) return;

    const badges = (state.badges || []).length;
    const tierLocked = tDef.badgeReq > 0 && badges < tDef.badgeReq;

    h += '<div class="tree-tier-header" style="display:flex; justify-content:space-between; align-items:center; margin:10px 0 4px; padding-bottom:2px; border-bottom:1px solid var(--card-border);">';
    h += '<span style="font-weight:900; font-size:0.85rem; color:#facc15;">' + tDef.name + '</span>';
    if (tDef.badgeReq > 0) {
      h += '<span style="font-size:0.7rem; color:' + (tierLocked ? '#f87171' : '#4ade80') + ';">' + (tierLocked ? '🔒 ' : '✅ ') + badges + '/' + tDef.badgeReq + ' Badges</span>';
    }
    h += '</div>';

    h += '<div class="tree-node-grid" style="display:grid; grid-template-columns:1fr; gap:6px;">';
    tierNodes.forEach(function (node) {
      const st = checkTechReqs(node);
      const isUnlocked = hasTech(node.id);
      let btnHtml = '';
      if (isUnlocked) {
        btnHtml = '<button type="button" class="claim-btn" disabled style="background:#15803d; color:#fff; border:none;">✅ Active</button>';
      } else if (st.ok) {
        btnHtml = '<button type="button" class="claim-btn" onclick="unlockTech(\'' + node.id + '\')" style="background:#eab308; color:#0f172a; font-weight:900;">Unlock ' + node.stars + '★ ' + node.gems + '💎</button>';
      } else {
        btnHtml = '<button type="button" class="claim-btn" disabled style="opacity:0.6; font-size:0.65rem;">' + escHtml(st.reason) + '</button>';
      }

      const branchColors = { mind: '#38bdf8', valor: '#f97316', wild: '#4ade80', care: '#ec4899' };
      const bColor = branchColors[node.branch] || '#a855f7';

      h += '<div class="care-row" style="background:#1e293b; border-left:3px solid ' + bColor + '; padding:6px 8px; border-radius:6px;">';
      h += '<div>';
      h += '<div class="t" style="font-size:0.85rem; font-weight:800;">' + node.icon + ' ' + escHtml(node.name) + '</div>';
      h += '<div class="d" style="font-size:0.72rem; color:var(--text-muted);">' + escHtml(node.desc) + '</div>';
      h += '</div>';
      h += '<div>' + btnHtml + '</div>';
      h += '</div>';
    });
    h += '</div>';
  });

  if (!filtered.length) {
    h = '<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.8rem;">No upgrades found in this branch.</div>';
  }

  container.innerHTML = h;
}
