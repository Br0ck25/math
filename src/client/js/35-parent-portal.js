// =====================================================================
//  PARENTS: the child's "link a parent" section, and the parent page at /parent
//  A parent has their own account (no email, so no password recovery). The child, from a PIN-protected
//  screen on their own device, creates a short code; the parent types it on the parent page and sees the
//  child's report. The child can unlink at any time. See src/server/15-parents.js for the rules.
// =====================================================================
const PORTAL_KEY = 'math_quest_parent';
let portal = null;               // { name, token } while a parent is signed in on this device
let portalKids = null;           // the children the server listed last
let portalMsg = { text: '', kind: '' };
let parentLinks = [];            // the child's side: links to parents
let linkLoaded = false;
let linkCode = '';               // the code just made (kept in memory only)
let linkMsg = '';

(function loadPortalLogin() {
  try {
    const p = JSON.parse(localStorage.getItem(PORTAL_KEY));
    if (p && p.token && p.name) portal = p;
  } catch (e) {}
})();
function isPortal() { return /^\/parent\/?$/.test(location.pathname); }

// ---- the child's side (inside the Parent Report window) ------------------------
function linkRows() {
  return parentLinks.map(function (l) {
    const label = l.parent ? '👤 ' + escHtml(l.parent) + (l.primary ? ' · can change settings' : ' · view only') : '⏳ Waiting for a parent to type the code';
    return '<div class="par-row"><span style="flex:1; white-space:normal;">' + label + '</span>' +
      '<button class="grade-btn" style="padding:6px 12px; min-height:44px;" onclick="linkUnlink(\'' + escHtml(l.id) + '\')">Unlink</button></div>';
  }).join('');
}
function renderParentLink() {
  const box = document.getElementById('par-link');
  if (!box) return;
  if (!acct) {
    box.innerHTML = '<div class="settings-hint" style="margin-top:0;">Sign in to your online account (Settings → Account) first. Then a parent can see this player\'s stats on their own phone, without using this device.</div>';
    return;
  }
  if (!linkLoaded) { linkLoaded = true; linkRefresh(); }
  box.innerHTML =
    '<div class="settings-hint" style="margin-top:0;">A parent opens <b>' + escHtml(location.host) + '/parent</b> on their own phone, makes a parent account and types a code from here.</div>' +
    (linkCode ? '<div class="link-code" aria-live="polite">' + escHtml(linkCode.slice(0, 4) + '-' + linkCode.slice(4)) + '</div><div class="settings-hint" style="margin-top:0;">Works once, for ' + ECON.parents.codeMinutes + ' minutes.</div>' : '') +
    linkRows() +
    '<button class="grade-btn" style="width:100%; margin-top:6px;" onclick="linkNewCode()">' + (parentLinks.length ? '➕ Link another parent' : '🔗 Get a link code') + '</button>' +
    '<div class="acct-msg err" id="link-msg">' + escHtml(linkMsg) + '</div>';
}
async function linkRefresh() {
  try {
    const r = await api('/api/link/list');
    if (r.status === 200) parentLinks = r.data.links || [];
    else if (r.status === 401) { acctExpired(); return; }
  } catch (e) { linkMsg = 'Could not reach the server.'; }
  renderParentLink();
}
async function linkNewCode() {
  soundClick();
  linkMsg = '';
  try {
    const r = await api('/api/link/code', 'POST', {});
    if (r.status === 200) { linkCode = r.data.code; linkLoaded = false; }
    else linkMsg = (r.data && r.data.error) || 'Could not make a code.';
  } catch (e) { linkMsg = 'Could not reach the server.'; }
  renderParentLink();
}
async function linkUnlink(id) {
  soundClick();
  linkMsg = '';
  try {
    const r = await api('/api/link/unlink', 'POST', { id: id });
    if (r.status === 200) { parentLinks = r.data.links || []; linkCode = ''; }
    else linkMsg = (r.data && r.data.error) || 'Could not unlink.';
  } catch (e) { linkMsg = 'Could not reach the server.'; }
  renderParentLink();
}

// ---- the parent page --------------------------------------------------------
function portalApi(path, method, body) { return api(path, method, body, false, portal ? portal.token : null); }
function setPortalMsg(text, kind) { portalMsg = { text: text || '', kind: kind || '' }; const el = document.getElementById('portal-msg'); if (el) { el.innerText = portalMsg.text; el.className = 'acct-msg ' + portalMsg.kind; } }
function openPortal() {
  document.body.classList.add('portal-mode');
  document.title = 'Math Quest - Parents';
  document.getElementById('portal').style.display = 'block';
  renderPortal();
  if (portal) portalLoad();
}
function portalSignedOut() {
  document.getElementById('portal').innerHTML =
    '<div class="portal-inner"><h1>👨‍👩‍👧 Parent page</h1>' +
    '<div class="portal-sub">See your child\'s Math Quest stats on your own phone. Your child makes a link code in the game (Parent Report → See stats on a parent\'s phone) and you type it here.</div>' +
    '<input class="acct-input" id="portal-name" placeholder="Your parent name" maxlength="20" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false">' +
    '<input class="acct-input" id="portal-pass" type="password" placeholder="Password (6+ characters)" maxlength="100" autocomplete="current-password">' +
    '<div class="acct-btns"><button class="grade-btn" onclick="portalAuth(\'register\')">Create parent account</button><button class="grade-btn" onclick="portalAuth(\'login\')">Sign in</button></div>' +
    '<div class="acct-msg ' + portalMsg.kind + '" id="portal-msg" role="status">' + escHtml(portalMsg.text) + '</div>' +
    '<div class="settings-hint">No email is needed, so a lost password cannot be recovered: write it down. Pick a name that is different from your child\'s player name.</div>' +
    '<p class="portal-sub"><a href="/">← Back to the game</a></p></div>';
}
function kidCard(k, i) {
  if (k.revoked) {
    return '<div class="portal-kid"><h2>' + escHtml(k.child) + '</h2><div class="portal-sub">This player unlinked you, or the account was deleted.</div>' +
      '<button class="grade-btn" onclick="portalUnlink(' + i + ')">Remove from my list</button></div>';
  }
  const r = reportParts(k.days, { streak: k.streak, raids: k.raids, trophies: k.trophies });
  return '<div class="portal-kid"><h2>' + escHtml(k.child) + ' <small>' + (k.primary ? 'you can change settings' : 'view only') + '</small></h2>' +
    '<div class="portal-sub">' + (GRADES[k.grade] ? escHtml(GRADES[k.grade].long) : 'Grade ' + k.grade) + ' · ' + k.gems + ' 💎 · ' + (k.updatedAt ? 'saved ' + timeAgo(k.updatedAt) : 'nothing saved online yet') + '</div>' +
    '<div class="par-tiles">' + r.tiles + '</div>' +
    '<div style="font-size:0.74rem; font-weight:700; margin-bottom:2px;">' + r.compare + '</div>' +
    '<div class="settings-label">📅 Minutes per day</div><div class="par-days">' + r.days + '</div>' +
    '<div class="settings-label">🎯 Accuracy by math type</div>' + r.types +
    '<div class="settings-label">🔍 Weak spots</div><div style="font-size:0.8rem; margin-bottom:4px;">' + r.strong + '</div><div style="font-size:0.8rem;">' + r.weak + '</div>' +
    '<button class="grade-btn" style="margin-top:10px;" onclick="portalUnlink(' + i + ')">Stop watching ' + escHtml(k.child) + '</button></div>';
}
function renderPortal() {
  if (!portal) return portalSignedOut();
  const kids = portalKids || [];
  document.getElementById('portal').innerHTML =
    '<div class="portal-inner"><h1>👨‍👩‍👧 Parent page</h1>' +
    '<div class="acct-signed">✅ Signed in as ' + escHtml(portal.name) + '</div>' +
    '<div class="settings-label">Add a child</div>' +
    '<div class="portal-sub">On your child\'s device: Parent Report → See stats on a parent\'s phone → Get a link code.</div>' +
    '<input class="acct-input" id="portal-code" placeholder="Code, like ABCD-EFGH" maxlength="12" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" aria-label="Link code">' +
    '<div class="acct-btns"><button class="grade-btn" onclick="portalClaim()">Add child</button><button class="grade-btn" onclick="portalLogout()">Sign out</button></div>' +
    '<div class="acct-msg ' + portalMsg.kind + '" id="portal-msg" role="status">' + escHtml(portalMsg.text) + '</div>' +
    (portalKids === null ? '<div class="portal-sub">Loading…</div>' : (kids.length ? kids.map(kidCard).join('') : '<div class="portal-sub">No children yet. Add one with a code.</div>')) +
    '<p class="portal-sub"><a href="/">← Back to the game</a></p></div>';
}
async function portalAuth(kind) {
  const name = document.getElementById('portal-name').value.trim().toLowerCase();
  const password = document.getElementById('portal-pass').value;
  if (!name || !password) return setPortalMsg('Enter a parent name and password.', 'err');
  setPortalMsg(kind === 'register' ? 'Creating account…' : 'Signing in…', '');
  try {
    const r = await portalApi('/api/parent/' + kind, 'POST', { name: name, password: password });
    if (r.status !== 200) return setPortalMsg((r.data && r.data.error) || 'Something went wrong.', 'err');
    portal = { name: r.data.name, token: r.data.token };
    try { localStorage.setItem(PORTAL_KEY, JSON.stringify(portal)); } catch (e) {}
    portalMsg = { text: '', kind: '' };
    portalKids = null;
    renderPortal();
    portalLoad();
  } catch (e) { setPortalMsg('Could not reach the server. Check your internet and try again.', 'err'); }
}
async function portalLoad() {
  try {
    const r = await portalApi('/api/parent/kids');
    if (r.status === 401) return portalLogout();
    if (r.status === 200) portalKids = r.data.kids || [];
    else setPortalMsg((r.data && r.data.error) || 'Could not load.', 'err');
  } catch (e) { setPortalMsg('Could not reach the server.', 'err'); if (portalKids === null) portalKids = []; }
  renderPortal();
}
async function portalClaim() {
  const code = document.getElementById('portal-code').value;
  if (!code.trim()) return setPortalMsg('Type the code from your child\'s device.', 'err');
  try {
    const r = await portalApi('/api/parent/claim', 'POST', { code: code });
    if (r.status !== 200) return setPortalMsg((r.data && r.data.error) || 'Could not add the child.', 'err');
    setPortalMsg('Added ' + r.data.child + '!', 'ok');
    await portalLoad();
  } catch (e) { setPortalMsg('Could not reach the server.', 'err'); }
}
async function portalUnlink(i) {
  const k = portalKids && portalKids[i];
  if (!k) return;
  try {
    const r = await portalApi('/api/parent/unlink', 'POST', { child: k.child });
    if (r.status !== 200) return setPortalMsg((r.data && r.data.error) || 'Could not remove.', 'err');
    setPortalMsg('Stopped watching ' + k.child + '.', 'ok');
    await portalLoad();
  } catch (e) { setPortalMsg('Could not reach the server.', 'err'); }
}
function portalLogout() {
  portal = null; portalKids = null;
  try { localStorage.removeItem(PORTAL_KEY); } catch (e) {}
  renderPortal();
}
