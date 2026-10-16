// =====================================================================
//  OPTIONAL ACCOUNT  (progress is saved online so you can play on another device)
// =====================================================================
const ACCT_KEY = 'math_quest_account';
let acct = null;              // { name, token, version, dirty, lastSync }
let acctEnabled = null;       // null = unknown, true/false after /api/status
let acctMsg = { text: '', kind: '' };
let syncTimer = null;
let syncing = false;
let dirtySeq = 0;
let syncProblem = '';         // '', 'offline', 'error'
let pendingConflict = null;

(function loadAcct() {
  try {
    const a = JSON.parse(localStorage.getItem(ACCT_KEY));
    if (a && a.token && a.name) acct = a;
  } catch (e) {}
})();
function persistAcct() {
  try {
    if (acct) localStorage.setItem(ACCT_KEY, JSON.stringify(acct));
    else localStorage.removeItem(ACCT_KEY);
  } catch (e) {}
}

// `token` is for the parent page, which signs in as a parent rather than as the player (null = send none).
async function api(path, method, body, keepalive, token) {
  const headers = { 'content-type': 'application/json' };
  const tok = token === undefined ? (acct && acct.token) : token;
  if (tok) headers.authorization = 'Bearer ' + tok;
  const payload = body ? JSON.stringify(body) : undefined;
  const res = await fetch(path, {
    method: method || 'GET',
    headers: headers,
    body: payload,
    keepalive: !!(keepalive && payload && payload.length < 60000)
  });
  let data = {};
  try { data = await res.json(); } catch (e) {}
  return { status: res.status, data: data };
}

function hasProgress(s) {
  if (!s) return false;
  return (s.monstersDefeated || 0) > 0 || (s.gems || 0) > 0 || (s.unlockedPets || []).length > 1 ||
    (s.unlockedSecrets || []).length > 0 ||
    Object.keys(s.buddyXp || {}).some(function (k) { return s.buddyXp[k] > 0; });
}
function summarizeSave(s) {
  if (!s) return 'Empty';
  let best = 1;
  Object.keys(s.buddyXp || {}).forEach(function (k) { best = Math.max(best, levelFromXp(s.buddyXp[k] || 0)); });
  const buddies = (s.unlockedPets || []).length + (s.unlockedSecrets || []).length;
  return 'Best buddy Lv ' + best + ' • ' + buddies + ' buddies • ' + (s.monstersDefeated || 0) + ' bosses • ' + (s.gems || 0) + ' 💎';
}

function setAcctMsg(text, kind) {
  acctMsg = { text: text || '', kind: kind || '' };
  const el = document.getElementById('acct-msg');
  if (el) { el.innerText = acctMsg.text; el.className = 'acct-msg ' + acctMsg.kind; }
}
function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  return Math.round(s / 3600) + ' h ago';
}
function acctStatusText() {
  if (!acct) return '';
  if (syncing) return '⏳ Saving online…';
  if (syncProblem === 'offline') return '📴 Offline — will save when you are back online';
  if (syncProblem === 'error') return '⚠️ Could not save online — will retry';
  if (acct.dirty) return '⏳ Changes waiting to save';
  return '✅ Saved online ' + timeAgo(acct.lastSync);
}
function updateAcctStatus() {
  const el = document.getElementById('acct-sync');
  if (el) el.innerText = acctStatusText();
}

async function checkAcctEnabled() {
  if (acctEnabled !== null) return;
  try {
    const r = await api('/api/status');
    acctEnabled = !!(r.data && r.data.enabled);
  } catch (e) { acctEnabled = null; }
  renderAccount();
}

function renderAccount() {
  const box = document.getElementById('acct-box');
  if (!box) return;
  if (acct) {
    box.innerHTML =
      '<div class="acct-signed">✅ Signed in as ' + acct.name + '</div>' +
      '<div class="settings-hint" id="acct-sync">' + acctStatusText() + '</div>' +
      '<div class="acct-btns"><button class="grade-btn" onclick="acctSyncNow()">🔄 Save now</button>' +
      '<button class="grade-btn" onclick="acctLogout()">Sign out</button></div>' +
      '<div id="acct-delete-area"><button class="danger-btn" style="margin-top:8px;" onclick="acctShowDelete()">Delete account</button></div>' +
      '<div class="acct-msg ' + acctMsg.kind + '" id="acct-msg">' + acctMsg.text + '</div>';
    return;
  }
  if (acctEnabled === false) {
    box.innerHTML = '<div class="settings-hint">Online accounts are not turned on for this game yet. Everything still works and saves on this device.</div>';
    return;
  }
  box.innerHTML =
    '<div class="settings-hint" style="margin-top:0;">Save your progress online and keep playing on another phone or computer. You do not need an account to play — everything works without one.</div>' +
    '<input class="acct-input" id="acct-name" placeholder="Player name" maxlength="20" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false">' +
    '<input class="acct-input" id="acct-pass" type="password" placeholder="Password (6+ characters)" maxlength="100" autocomplete="current-password">' +
    '<div class="acct-btns"><button class="grade-btn" onclick="acctRegister()">Create account</button><button class="grade-btn" onclick="acctLogin()">Sign in</button></div>' +
    '<div class="acct-msg ' + acctMsg.kind + '" id="acct-msg">' + (acctEnabled === null ? 'Checking…' : acctMsg.text) + '</div>' +
    '<div class="settings-hint">Create account saves your current progress. Passwords cannot be recovered, so write yours down!</div>';
}

function readCreds() {
  const n = document.getElementById('acct-name');
  const p = document.getElementById('acct-pass');
  return { name: n ? n.value.trim().toLowerCase() : '', password: p ? p.value : '' };
}
function startSession(name, token, version) {
  acct = { name: name, token: token, version: version || 0, dirty: false, lastSync: Date.now() };
  persistAcct();
}

async function acctRegister() {
  const c = readCreds();
  if (!/^[a-z0-9_-]{3,20}$/.test(c.name)) return setAcctMsg('Player names are 3-20 letters, numbers, - or _.', 'err');
  if (c.password.length < 6) return setAcctMsg('Passwords need at least 6 characters.', 'err');
  setAcctMsg('Creating account…', '');
  try {
    const r = await api('/api/register', 'POST', { name: c.name, password: c.password, state: state });
    if (r.status !== 200) return setAcctMsg((r.data && r.data.error) || 'Could not create the account.', 'err');
    startSession(r.data.name, r.data.token, r.data.version);
    syncProblem = '';
    setAcctMsg('Account created! Your progress is saved online.', 'ok');
    renderAccount();
  } catch (e) { setAcctMsg('Could not reach the server. Check your internet and try again.', 'err'); }
}

async function acctLogin() {
  const c = readCreds();
  if (!c.name || !c.password) return setAcctMsg('Enter your player name and password.', 'err');
  setAcctMsg('Signing in…', '');
  try {
    const r = await api('/api/login', 'POST', { name: c.name, password: c.password });
    if (r.status !== 200) return setAcctMsg((r.data && r.data.error) || 'Could not sign in.', 'err');
    const save = r.data.save;
    startSession(r.data.name, r.data.token, save ? save.version : 0);
    setControls(r.data.controls);
    syncProblem = '';
    if (!save) {
      acct.dirty = true; persistAcct();
      await syncNow(false);
      setAcctMsg('Signed in! Your progress is now saved online.', 'ok');
    } else if (!hasProgress(state)) {
      applyCloud(save);
      setAcctMsg('Signed in! Your online progress was loaded.', 'ok');
    } else {
      pendingConflict = { cloud: save };
      openConflict();
      setAcctMsg('Signed in!', 'ok');
    }
    renderAccount();
  } catch (e) { setAcctMsg('Could not reach the server. Check your internet and try again.', 'err'); }
}

// While a parent's settings are on and the parent PIN is set, signing out or deleting the account needs the PIN first:
// otherwise it would be a way round them.
function acctNeedsParent() {
  if (!ctlActive() || !parentLocked()) return false;
  toast('🔒 A parent has settings on. Unlock the Parent Report with the PIN first.');
  return true;
}
function acctLogout() {
  if (acctNeedsParent()) return;
  const t = acct && acct.token;
  if (t) { try { api('/api/logout', 'POST', {}); } catch (e) {} }
  acct = null;
  persistAcct();
  setControls(null);
  clearTimeout(syncTimer);
  setAcctMsg('Signed out. Your progress is still saved on this device.', 'ok');
  renderAccount();
}

function acctShowDelete() {
  if (acctNeedsParent()) return;
  document.getElementById('acct-delete-area').innerHTML =
    '<div class="settings-hint">This deletes your online account and saved progress. Your progress on this device stays.</div>' +
    '<input class="acct-input" id="acct-del-pass" type="password" placeholder="Enter your password to confirm" autocomplete="current-password">' +
    '<div class="acct-btns"><button class="grade-btn" onclick="renderAccount()">Cancel</button><button class="danger-btn" style="margin-top:0;" onclick="acctDelete()">Delete</button></div>';
}
async function acctDelete() {
  const p = document.getElementById('acct-del-pass');
  if (!p || !p.value) return setAcctMsg('Enter your password to confirm.', 'err');
  try {
    const r = await api('/api/delete', 'POST', { password: p.value });
    if (r.status !== 200) return setAcctMsg((r.data && r.data.error) || 'Could not delete the account.', 'err');
    acct = null; persistAcct();
    setControls(null);
    setAcctMsg('Account deleted. Your progress is still on this device.', 'ok');
    renderAccount();
  } catch (e) { setAcctMsg('Could not reach the server.', 'err'); }
}

// ---- syncing -------------------------------------------------------
function acctMarkDirty() {
  if (!acct || !acct.token) return;
  dirtySeq += 1;
  acct.dirty = true;
  persistAcct();
  scheduleSync(5000);
}
function scheduleSync(ms) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(function () { syncNow(false); }, ms);
}
function acctSyncNow() { soundClick(); acct && (acct.dirty = true); syncNow(false); }

function acctExpired() {
  acct = null; persistAcct();
  setAcctMsg('Your sign-in expired. Please sign in again to keep saving online.', 'err');
  renderAccount();
}

async function syncNow(force) {
  if (!acct || syncing || pendingConflict || isPortal()) return;   // the parent page never loads a save, so it must never upload one
  syncing = true;
  updateAcctStatus();
  const seq = dirtySeq;
  try {
    const r = await api('/api/save', 'PUT', { state: state, baseVersion: acct.version, force: !!force }, true);
    if (r.status === 200) {
      acct.version = r.data.version;
      if (seq === dirtySeq) acct.dirty = false;
      acct.lastSync = Date.now();
      syncProblem = '';
      persistAcct();
      setControls(r.data.controls);
    } else if (r.status === 409) {
      pendingConflict = { cloud: r.data.save };
      openConflict();
    } else if (r.status === 401) {
      acctExpired();
    } else {
      syncProblem = 'error';
      scheduleSync(30000);
    }
  } catch (e) {
    syncProblem = 'offline';
  }
  syncing = false;
  updateAcctStatus();
  if (acct && acct.dirty && !syncProblem && !pendingConflict) scheduleSync(5000);
}

function applyCloud(save) {
  try { localStorage.setItem('math_quest_save', JSON.stringify(save.state)); } catch (e) {}
  loadState();
  ultimateCharge = 0;
  setBossTaunt();
  updateStatsUI();
  generateProblem();
  if (acct) {
    acct.version = save.version;
    acct.dirty = false;
    acct.lastSync = Date.now();
    persistAcct();
  }
}

function openConflict() {
  pauseClock();
  const cloud = pendingConflict && pendingConflict.cloud;
  document.getElementById('conflict-cloud').innerText = summarizeSave(cloud && cloud.state);
  document.getElementById('conflict-local').innerText = summarizeSave(state);
  document.getElementById('conflict-modal').style.display = 'flex';
}
function resolveConflict(choice) {
  soundClick();
  const cloud = pendingConflict && pendingConflict.cloud;
  pendingConflict = null;
  document.getElementById('conflict-modal').style.display = 'none';
  resumeClock();
  if (choice === 'cloud' && cloud) {
    applyCloud(cloud);
  } else {
    if (acct) { acct.version = cloud ? cloud.version : 0; acct.dirty = true; persistAcct(); }
    syncNow(true);
  }
  renderAccount();
}

async function acctStartup() {
  if (!acct) return;
  try {
    const r = await api('/api/save');
    if (r.status === 401) return acctExpired();
    if (r.status !== 200) return;
    setControls(r.data.controls);
    const save = r.data.save;
    if (!save) { acct.dirty = true; return syncNow(false); }
    if (save.version > acct.version) {
      if (!acct.dirty) { applyCloud(save); toast('☁️ Loaded your latest online progress'); }
      else { pendingConflict = { cloud: save }; openConflict(); }
    } else if (acct.dirty) {
      syncNow(false);
    }
  } catch (e) { syncProblem = 'offline'; }
}

document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'hidden' && acct && acct.dirty) { clearTimeout(syncTimer); syncNow(false); }
});
window.addEventListener('online', function () { if (acct && acct.dirty) syncNow(false); });
