// The parent page at /parent (sign-in, per-child controls, challenges). The child-side link section is in 35-parent-portal.js.
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
// The settings form for one child. Only the first linked parent (primary) can change them; anyone else just sees them.
function ctlOf(k) { return cleanCtl(k.controls) || { minGrade: 0, ops: null, duelsOnline: true, goalMinutes: null, goalReward: '', adaptive: null, boost: {} }; }
function controlsBox(k, i) {
  const c = ctlOf(k);
  if (!k.primary) {
    return '<div class="portal-sub">Settings (set by the first parent linked): lowest level ' + escHtml(GRADES[c.minGrade].long) + (c.ops ? ', ' + c.ops.length + ' math types' : ', all math types') + ', online duels ' + (c.duelsOnline ? 'on' : 'off') +
      (c.goalMinutes ? ', daily goal ' + c.goalMinutes + ' min' : '') + (c.adaptive === null ? '' : ', difficulty matching ' + (c.adaptive ? 'on' : 'off')) + '.</div>';
  }
  const goals = [null, 10, 15, 20, 30, 45, 60].concat(c.goalMinutes && [10, 15, 20, 30, 45, 60].indexOf(c.goalMinutes) === -1 ? [c.goalMinutes] : []).map(function (m) {
    return '<option value="' + (m === null ? '' : m) + '"' + (m === c.goalMinutes ? ' selected' : '') + '>' + (m === null ? escHtml(k.child) + ' decides' : m + ' minutes') + '</option>';
  }).join('');
  const adapt = [['', escHtml(k.child) + ' decides'], ['on', 'On'], ['off', 'Off']].map(function (o) {
    return '<option value="' + o[0] + '"' + (o[0] === (c.adaptive === null ? '' : (c.adaptive ? 'on' : 'off')) ? ' selected' : '') + '>' + o[1] + '</option>';
  }).join('');
  const grades = GRADES.map(function (g) { return '<option value="' + g.id + '"' + (g.id === c.minGrade ? ' selected' : '') + '>' + escHtml(g.long) + '</option>'; }).join('');
  const ops = MATH_OPS.map(function (o) {
    const on = !c.ops || c.ops.indexOf(o.id) !== -1;
    const above = o.minGrade > k.grade;
    return '<label class="portal-op"><input type="checkbox" data-op="' + escHtml(o.id) + '"' + (on ? ' checked' : '') + '> ' + o.icon + ' ' + escHtml(o.label) + (above ? ' <span class="portal-up" title="Above ' + escHtml(k.child) + '\'s current level">↑</span>' : '') + '</label>';
  }).join('');
  return '<details class="portal-ctl" id="ctl-' + i + '" open><summary>⚙️ Settings for ' + escHtml(k.child) + '</summary>' +
    '<div class="settings-label">🔒 Lowest grade level</div>' +
    '<select class="acct-input" data-ctl="grade" aria-label="Lowest grade level">' + grades + '</select>' +
    '<div class="portal-sub">' + escHtml(k.child) + ' can play this level or higher, never lower, so easy problems cannot be used to farm gems. Tap Save settings to lock it.</div>' +
    '<div class="settings-label">🧮 Which math types</div>' +
    '<div class="portal-sub">Choose what ' + escHtml(k.child) + ' practises: addition, multiplication, percents and so on. ' + (c.ops ? 'Only the ticked types are asked.' : 'Nothing is chosen yet, so ' + escHtml(k.child) + ' picks their own.') + ' Tick every type to give the choice back to ' + escHtml(k.child) + '.</div>' +
    '<div class="acct-btns"><button class="grade-btn" onclick="portalOpsPreset(' + i + ', \'all\')">Tick all</button><button class="grade-btn" onclick="portalOpsPreset(' + i + ', \'basic\')">Just + − × ÷</button></div>' +
    '<div class="portal-ops">' + ops + '</div>' +
    '<div class="portal-sub">↑ = above ' + escHtml(k.child) + '\'s current level. If you tick it, they get that type\'s easiest problems.</div>' +
    '<div class="settings-label">⏳ Daily math time goal</div>' +
    '<select class="acct-input" data-ctl="goal" aria-label="Daily math time goal">' + goals + '</select>' +
    '<input class="acct-input" data-ctl="reward" type="text" maxlength="' + ECON.parents.goal.maxRewardChars + '" placeholder="Reward, e.g. ice cream trip" value="' + escHtml(c.goalReward) + '" aria-label="Reward for reaching the goal">' +
    '<div class="settings-label">🎚️ Match difficulty to each math type</div>' +
    '<select class="acct-input" data-ctl="adaptive" aria-label="Match difficulty to each math type">' + adapt + '</select>' +
    '<div class="portal-sub">Picking a value locks it on ' + escHtml(k.child) + '\'s device; "' + escHtml(k.child) + ' decides" leaves it free.</div>' +
    '<div class="settings-label">🌍 Online duels</div>' +
    '<label class="portal-op"><input type="checkbox" data-ctl="duels"' + (c.duelsOnline ? ' checked' : '') + '> Let ' + escHtml(k.child) + ' challenge friends by player name</label>' +
    '<button class="grade-btn" style="width:100%; margin-top:10px;" onclick="portalSaveControls(' + i + ')">Save settings</button>' +
    '<div class="portal-sub">They reach ' + escHtml(k.child) + '\'s device the next time the game opens or saves. Tip: set a Parent PIN on that device (Parent Report) so settings cannot be undone by unlinking or signing out.</div></details>';
}
// Quick picks for the math types list on a child's settings form.
function portalOpsPreset(i, kind) {
  const box = document.getElementById('ctl-' + i);
  if (!box) return;
  Array.prototype.forEach.call(box.querySelectorAll('input[data-op]'), function (el) {
    el.checked = kind === 'all' || ['add', 'sub', 'mul', 'div'].indexOf(el.dataset.op) !== -1;
  });
}
// Sends a child's full settings to the server and reloads the page's list. `done` is the message shown on success.
async function portalSendControls(k, ctl, done) {
  try {
    const r = await portalApi('/api/parent/controls', 'POST', Object.assign({ child: k.child }, ctl));
    if (r.status !== 200) return setPortalMsg((r.data && r.data.error) || 'Could not save the settings.', 'err');
    setPortalMsg(done, 'ok');
    await portalLoad();
  } catch (e) { setPortalMsg('Could not reach the server.', 'err'); }
}
async function portalSaveControls(i) {
  const k = portalKids && portalKids[i];
  const box = document.getElementById('ctl-' + i);
  if (!k || !box) return;
  const checked = Array.prototype.filter.call(box.querySelectorAll('input[data-op]'), function (el) { return el.checked; }).map(function (el) { return el.dataset.op; });
  if (!checked.length) return setPortalMsg('Pick at least one math type.', 'err');
  const goal = box.querySelector('select[data-ctl="goal"]').value;
  await portalSendControls(k, {
    minGrade: parseInt(box.querySelector('select[data-ctl="grade"]').value, 10),
    ops: checked.length === MATH_OPS.length ? null : checked,
    duelsOnline: box.querySelector('input[data-ctl="duels"]').checked,
    goalMinutes: goal === '' ? null : parseInt(goal, 10),
    goalReward: box.querySelector('input[data-ctl="reward"]').value.trim(),
    adaptive: { '': null, on: true, off: false }[box.querySelector('select[data-ctl="adaptive"]').value],
    boost: ctlOf(k).boost
  }, 'Saved settings for ' + k.child + '.');
}

// "Extra practice" quick buttons: each tap moves another 10% of all problems to a weak math type (30% at most for one type, 40% in all).
function boostBox(k, i, weakIds) {
  const B = ECON.parents.boost, boost = ctlOf(k).boost;
  const total = Object.keys(boost).reduce(function (s, id) { return s + boost[id]; }, 0);
  const label = function (id) { return OP_BY_ID[id] ? OP_BY_ID[id].icon + ' ' + escHtml(OP_BY_ID[id].label) : escHtml(id); };
  const ids = weakIds.concat(Object.keys(boost).filter(function (id) { return weakIds.indexOf(id) === -1; }));
  if (!ids.length) return '';
  const rows = ids.map(function (id) {
    const now = boost[id] || 0;
    const canAdd = k.primary && now < B.maxPerType && total + B.step <= B.maxTotal;
    return '<div class="par-row"><span style="flex:1; white-space:normal;">' + label(id) + (now ? ' · <b>+' + now + '% practice</b>' : '') + '</span>' +
      (k.primary ? '<button class="grade-btn boost-btn" data-boost="' + escHtml(id) + '" onclick="portalBoost(' + i + ', \'' + escHtml(id) + '\', ' + B.step + ')"' + (canAdd ? '' : ' disabled') + ' aria-label="Add ' + B.step + '% extra practice on ' + escHtml(OP_BY_ID[id] ? OP_BY_ID[id].label : id) + '">+' + B.step + '%</button>' +
        (now ? '<button class="grade-btn boost-btn" onclick="portalBoost(' + i + ', \'' + escHtml(id) + '\', ' + -B.step + ')" aria-label="Remove ' + B.step + '% extra practice on ' + escHtml(OP_BY_ID[id] ? OP_BY_ID[id].label : id) + '">−</button>' : '') : '') + '</div>';
  }).join('');
  return '<div class="settings-label">🚀 Extra practice</div>' + rows +
    '<div class="portal-sub">' + (k.primary ? 'Each tap moves ' + B.step + '% of ' + escHtml(k.child) + '\'s problems to that type (up to ' + B.maxPerType + '% for one type, ' + B.maxTotal + '% in all). ' : '') + 'It reaches their device the next time the game opens or saves.</div>';
}
async function portalBoost(i, id, delta) {
  const k = portalKids && portalKids[i];
  if (!k || !k.primary) return;
  const c = ctlOf(k), boost = Object.assign({}, c.boost);
  boost[id] = Math.max(0, (boost[id] || 0) + delta);
  if (!boost[id]) delete boost[id];
  await portalSendControls(k, Object.assign({}, c, { boost: boost }), (OP_BY_ID[id] ? OP_BY_ID[id].label : id) + ': ' + (boost[id] ? '+' + boost[id] + '% extra practice' : 'no extra practice') + '.');
}

// The timed challenge for one child: where it stands, and (first parent only) a form to start one or a button to cancel it.
function challengeBox(k, i) {
  const ch = k.challenge;
  const who = escHtml(k.child);
  let status = '<div class="portal-sub">No challenge right now.</div>';
  if (ch) {
    const goal = ch.problems + ' correct in ' + ch.minutes + ' min = ' + ch.gems + ' 💎';
    if (ch.state === 'ready') status = '<div class="portal-sub">⏳ Waiting for ' + who + ' to tap Start (' + goal + ').</div>';
    else if (ch.state === 'running') status = '<div class="portal-sub">⏱️ <b>' + ch.count + '/' + ch.problems + '</b> done, about ' + Math.max(0, Math.ceil((ch.endsAt - ch.serverNow) / 60000)) + ' min left (' + goal + '). Use Refresh to update.</div>';
    else if (ch.state === 'won') status = '<div class="portal-sub">🏆 ' + who + ' finished it and won ' + ch.gems + ' 💎 (' + goal + ').</div>';
    else status = '<div class="portal-sub">⏱️ Time ran out at ' + ch.count + '/' + ch.problems + '. No gems this time, nothing lost (' + goal + ').</div>';
  }
  let act = '';
  if (k.primary) {
    const busy = ch && (ch.state === 'ready' || ch.state === 'running');
    act = busy
      ? '<button class="grade-btn" style="width:100%;" onclick="portalChallenge(' + i + ', true)">Cancel this challenge</button>'
      : '<div class="portal-fields"><label>Correct answers <input class="acct-input" type="number" inputmode="numeric" min="1" max="' + ECON.parents.challenge.maxProblems + '" value="20" data-chal="problems" oninput="portalChalPreview(' + i + ')"></label>' +
        '<label>Minutes <input class="acct-input" type="number" inputmode="numeric" min="' + ECON.parents.challenge.minMinutes + '" max="' + ECON.parents.challenge.maxMinutes + '" value="15" data-chal="minutes"></label>' +
        '<label>💎 per answer <input class="acct-input" type="number" inputmode="numeric" min="1" max="' + ECON.parents.challenge.maxGemPerProblem + '" value="' + ECON.parents.challenge.gemPerProblem + '" data-chal="gems" oninput="portalChalPreview(' + i + ')"></label></div>' +
        '<div class="portal-sub" id="chal-preview-' + i + '" aria-live="polite"></div>' +
        '<div class="portal-sub">' + who + ' only wins if they get them all in time. Wrong answers do not count. If time runs out nothing is lost. The most for one challenge is ' + ECON.parents.challenge.maxGems + ' 💎.</div>' +
        '<button class="grade-btn" style="width:100%;" onclick="portalChallenge(' + i + ', false)">Start a challenge</button>';
  }
  return '<div class="settings-label">🏆 Timed challenge</div><div id="chal-' + i + '">' + status + act + '</div>';
}
// Shows what the challenge form would pay, and warns when it is over the limit.
function portalChalPreview(i) {
  const box = document.getElementById('chal-' + i), out = document.getElementById('chal-preview-' + i);
  if (!box || !out) return;
  const n = parseInt(box.querySelector('input[data-chal="problems"]').value, 10) || 0;
  const g = parseInt(box.querySelector('input[data-chal="gems"]').value, 10) || 0;
  const total = n * g;
  out.innerText = total > ECON.parents.challenge.maxGems ? '⚠️ ' + total + ' 💎 is too many. The most is ' + ECON.parents.challenge.maxGems + '.' : 'Total prize: ' + total + ' 💎';
}
async function portalChallenge(i, cancel) {
  const k = portalKids && portalKids[i];
  const box = document.getElementById('chal-' + i);
  if (!k || !box) return;
  const body = { child: k.child };
  if (cancel) body.cancel = true;
  else {
    body.problems = parseInt(box.querySelector('input[data-chal="problems"]').value, 10);
    body.minutes = parseInt(box.querySelector('input[data-chal="minutes"]').value, 10);
    body.gemsPer = parseInt(box.querySelector('input[data-chal="gems"]').value, 10);
  }
  try {
    const r = await portalApi('/api/parent/challenge', 'POST', body);
    if (r.status !== 200) return setPortalMsg((r.data && r.data.error) || 'Could not save the challenge.', 'err');
    setPortalMsg(cancel ? 'Challenge cancelled.' : 'Challenge ready. ' + k.child + ' will see it the next time the game opens or saves.', 'ok');
    await portalLoad();
  } catch (e) { setPortalMsg('Could not reach the server.', 'err'); }
}
// Each child has their own colour (the same one on their card, their name bar and their button at the top).
function kidAccent(i) { return 'var(--kid-' + (i % 6 + 1) + ')'; }
// The name bar at the top of a child's card; it stays on screen while that child's stats scroll.
function kidHead(k, i, note) {
  const total = portalKids ? portalKids.length : 1;
  return '<div class="portal-kid-head"><span class="portal-avatar" aria-hidden="true">' + escHtml(k.child.charAt(0).toUpperCase()) + '</span>' +
    '<div class="portal-kid-title"><h2>' + escHtml(k.child) + '</h2><small>' + (total > 1 ? 'Child ' + (i + 1) + ' of ' + total + ' · ' : '') + note + '</small></div></div>';
}
function portalJump(i) {
  const el = document.getElementById('kid-' + i);
  if (el) el.scrollIntoView({ behavior: motionReduced() ? 'auto' : 'smooth', block: 'start' });
}
function kidNav(kids) {
  if (kids.length < 2) return '';
  return '<div class="portal-nav" role="navigation" aria-label="Jump to a child"><span class="portal-nav-label">Jump to:</span>' + kids.map(function (k, i) {
    return '<button class="portal-nav-btn" style="--kid:' + kidAccent(i) + '" onclick="portalJump(' + i + ')"><i aria-hidden="true"></i>' + escHtml(k.child) + '</button>';
  }).join('') + '</div>';
}
function kidCard(k, i) {
  const open = '<div class="portal-kid" id="kid-' + i + '" style="--kid:' + kidAccent(i) + '">';
  if (k.revoked) {
    return open + kidHead(k, i, 'unlinked') + '<div class="portal-sub">This player unlinked you, or the account was deleted.</div>' +
      '<button class="grade-btn" onclick="portalUnlink(' + i + ')">Remove from my list</button></div>';
  }
  const r = reportParts(k.days, { streak: k.streak, raids: k.raids, trophies: k.trophies });
  return open + kidHead(k, i, k.primary ? 'you can change settings' : 'view only') +
    '<div class="portal-sub">' + (GRADES[k.grade] ? escHtml(GRADES[k.grade].long) : 'Grade ' + k.grade) + ' · ' + k.gems + ' 💎 · ' + (k.updatedAt ? 'saved ' + timeAgo(k.updatedAt) : 'nothing saved online yet') + '</div>' +
    challengeBox(k, i) + controlsBox(k, i) +
    '<div class="par-tiles">' + r.tiles + '</div>' +
    '<div style="font-size:0.74rem; font-weight:700; margin-bottom:2px;">' + r.compare + '</div>' +
    '<div class="settings-label">📅 Minutes per day</div><div class="par-days">' + r.days + '</div>' +
    '<div class="settings-label">🎯 Accuracy by math type</div>' + r.types +
    '<div class="settings-label">🔍 Weak spots</div><div style="font-size:0.8rem; margin-bottom:4px;">' + r.strong + '</div><div style="font-size:0.8rem;">' + r.weak + '</div>' + boostBox(k, i, r.weakIds) +
    '<button class="grade-btn" style="margin-top:10px;" onclick="portalUnlink(' + i + ')">Stop watching ' + escHtml(k.child) + '</button></div>';
}
function renderPortal() {
  if (!portal) return portalSignedOut();
  const kids = portalKids || [];
  document.getElementById('portal').innerHTML =
    '<div class="portal-inner"><h1>👨‍👩‍👧 Parent page</h1>' +
    '<div class="acct-signed">✅ Signed in as ' + escHtml(portal.name) + '</div>' +
    '<div class="settings-label">' + (kids.length ? 'Add another child' : 'Add a child') + '</div>' +
    '<div class="portal-sub">You can watch up to ' + ECON.parents.maxKids + ' children. On each child\'s device: Parent Report → See stats on a parent\'s phone → Get a link code, then type it here.</div>' +
    '<input class="acct-input" id="portal-code" placeholder="Code, like ABCD-EFGH" maxlength="12" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" aria-label="Link code">' +
    '<div class="acct-btns"><button class="grade-btn" onclick="portalClaim()">' + (kids.length ? 'Add another child' : 'Add child') + '</button><button class="grade-btn" onclick="portalLogout()">Sign out</button></div>' +
    '<button class="grade-btn" style="width:100%; margin-top:6px;" onclick="portalLoad()">🔄 Refresh</button>' +
    '<div class="acct-msg ' + portalMsg.kind + '" id="portal-msg" role="status">' + escHtml(portalMsg.text) + '</div>' +
    kidNav(kids) +
    (portalKids === null ? '<div class="portal-sub">Loading…</div>' : (kids.length ? kids.map(kidCard).join('') : '<div class="portal-sub">No children yet. Add one with a code.</div>')) +
    '<div id="portal-delete-area"><button class="danger-btn" style="margin-top:12px;" onclick="portalShowDelete()">Delete my parent account</button></div>' +
    '<p class="portal-sub"><a href="/">← Back to the game</a></p></div>';
}
function portalShowDelete() {
  document.getElementById('portal-delete-area').innerHTML =
    '<div class="settings-hint">This deletes your parent account and ends your link to every child, along with the settings and challenges you set for them. Your children\'s game progress is not touched.</div>' +
    '<input class="acct-input" id="portal-del-pass" type="password" placeholder="Enter your password to confirm" autocomplete="current-password">' +
    '<div class="acct-btns"><button class="grade-btn" onclick="renderPortal()">Cancel</button><button class="danger-btn" style="margin-top:0;" onclick="portalDelete()">Delete</button></div>';
}
async function portalDelete() {
  const p = document.getElementById('portal-del-pass');
  if (!p || !p.value) return setPortalMsg('Enter your password to confirm.', 'err');
  try {
    const r = await portalApi('/api/parent/delete', 'POST', { password: p.value });
    if (r.status !== 200) return setPortalMsg((r.data && r.data.error) || 'Could not delete the account.', 'err');
    portalLogout();
    setPortalMsg('Your parent account was deleted.', 'ok');
  } catch (e) { setPortalMsg('Could not reach the server.', 'err'); }
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
