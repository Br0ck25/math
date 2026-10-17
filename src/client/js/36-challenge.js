// =====================================================================
//  PARENT'S TIMED CHALLENGE  ("N correct answers in M minutes, N gems if you make it")
//  The server owns the clock and the rules (src/server/16-challenges.js). This device counts correct practice answers,
//  reports them, and adds the gems once per challenge id (state.challengePaid). Running out of time costs nothing.
//  The clock keeps running if the game is closed: it is real time, measured by the server.
// =====================================================================
const CHAL_KEY = 'math_quest_challenge';
let chal = null;          // { id, problems, minutes, gems, state, count, startedAt, endsAt, offset, told }
let chalTimer = null;
let chalBusy = false;
let chalSentAt = 0;
let chalClaimAt = 0;

(function loadChal() {
  try {
    const c = JSON.parse(localStorage.getItem(CHAL_KEY));
    if (c && typeof c.id === 'string' && ['ready', 'running', 'won', 'ended'].indexOf(c.state) !== -1) chal = c;
  } catch (e) {}
})();
function persistChal() {
  try { if (chal) localStorage.setItem(CHAL_KEY, JSON.stringify(chal)); else localStorage.removeItem(CHAL_KEY); } catch (e) {}
}
function chalLeftMs() { return chal ? chal.endsAt - (Date.now() + chal.offset) : 0; }
function chalClock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
}

// Everything the server says about this player's parents arrives together (sign-in, every save, start-up).
function applyParentData(d) {
  setControls(d && d.controls);
  setChallenge(d && d.challenge);
}
// `v` is the server's view of the challenge, or null (none, cancelled, or its parent is no longer linked).
function setChallenge(v) {
  if (!v) { chal = null; persistChal(); renderChal(); return; }
  const prev = chal && chal.id === v.id ? chal : null;
  chal = {
    id: v.id, problems: v.problems, minutes: v.minutes, gems: v.gems, state: v.state, startedAt: v.startedAt, endsAt: v.endsAt,
    count: v.state === 'running' && prev ? Math.max(v.count, prev.count) : v.count,       // answers counted here may be ahead of the last report
    offset: v.serverNow - Date.now(),                                                      // the server's clock, so a wrong device clock changes nothing
    told: prev ? prev.told : v.state === 'ended'                                          // only say "time is up" when it happens while playing
  };
  payChallenge();
  tellEnded();
  persistChal();
  renderChal();
}
function payChallenge() {
  if (!chal || chal.state !== 'won' || state.challengePaid.indexOf(chal.id) !== -1) return;
  state.challengePaid.push(chal.id);
  grantGems(chal.gems, '🎉 Challenge complete! +' + chal.gems + ' 💎', true);
}
function tellEnded() {
  if (!chal || chal.state !== 'ended' || chal.told) return;
  chal.told = true;
  toast('⏱️ Time is up. No gems this time and nothing is lost. Ask for another challenge!');
}

function renderChal() {
  const bar = document.getElementById('chal-bar');
  if (!bar) return;
  clearInterval(chalTimer); chalTimer = null;
  const show = !!chal && (chal.state === 'ready' || chal.state === 'running');
  bar.style.display = show ? 'flex' : 'none';
  if (!show) return;
  if (chal.state === 'ready') {
    bar.removeAttribute('aria-disabled');
    bar.innerText = '🎯 Parent challenge: ' + chal.problems + ' in ' + chal.minutes + ' min = ' + chal.gems + ' 💎. Tap to start!';
    return;
  }
  bar.setAttribute('aria-disabled', 'true');
  const tick = function () {
    if (chalLeftMs() <= 0 && chal.state === 'running' && !(chal.count >= chal.problems)) {
      chal.state = 'ended'; tellEnded(); persistChal(); renderChal(); return;
    }
    bar.innerText = '⏱️ ' + chalClock(chalLeftMs()) + '  ·  ✅ ' + chal.count + '/' + chal.problems + '  ·  ' + chal.gems + ' 💎';
    if (chal.count >= chal.problems && !chalBusy && Date.now() - chalClaimAt > 5000) chalClaim();                            // finished but the claim has not gone through yet
  };
  tick();
  chalTimer = setInterval(tick, 1000);
}

function openChal() {
  if (!chal || chal.state !== 'ready') return;
  document.getElementById('chal-text').innerText =
    'Answer ' + chal.problems + ' problems correctly within ' + chal.minutes + ' minutes and win ' + chal.gems + ' 💎. ' +
    'Only correct answers count. If the time runs out, nothing is lost and you can try again with a new challenge.';
  showModal('chal-modal');
}
function closeChal() { hideModal('chal-modal'); }
async function chalStart() {
  if (!chal || chal.state !== 'ready') return;
  closeChal();
  try {
    const r = await api('/api/challenge/start', 'POST', { id: chal.id });
    if (r.status === 200) { setChallenge(r.data.challenge); toast('⏱️ Go go go!'); }
    else { toast((r.data && r.data.error) || 'Could not start. Try again.'); if (r.status === 404) setChallenge(r.data.challenge || null); }
  } catch (e) { toast('You need to be online to start the challenge.'); }
}

// Called for every correct practice answer (duels, tournaments and the vault never count).
function challengeCorrect() {
  if (!chal || chal.state !== 'running' || chalLeftMs() <= 0 || chal.count >= chal.problems) return;
  chal.count += 1;
  persistChal();
  if (chal.count >= chal.problems) { renderChal(); chalClaim(); return; }
  document.getElementById('chal-bar').innerText = '⏱️ ' + chalClock(chalLeftMs()) + '  ·  ✅ ' + chal.count + '/' + chal.problems + '  ·  ' + chal.gems + ' 💎';
  if (Date.now() - chalSentAt > 10000) chalProgress();
}
async function chalProgress() {
  chalSentAt = Date.now();
  try {
    const r = await api('/api/challenge/progress', 'POST', { id: chal.id, count: chal.count });
    if (r.status === 200) setChallenge(r.data.challenge);
    else if (r.status === 404) setChallenge(r.data.challenge || null);
  } catch (e) { /* offline: the next report carries the count */ }
}
async function chalClaim() {
  if (!chal || chalBusy) return;
  chalBusy = true;
  chalClaimAt = Date.now();
  try {
    const r = await api('/api/challenge/claim', 'POST', { id: chal.id, count: chal.count });
    if (r.status === 200) setChallenge(r.data.challenge);
    else if (r.status === 404) setChallenge(r.data.challenge || null);
  } catch (e) { /* offline: tried again on the next tick */ }
  chalBusy = false;
}
