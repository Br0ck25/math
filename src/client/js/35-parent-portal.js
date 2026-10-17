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

