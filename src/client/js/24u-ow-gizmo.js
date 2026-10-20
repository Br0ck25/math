// =====================================================================
//  THE GIZMO, a key item from Prof. Pi (24h-ow-maps.js, hollow-house). One window, five tabs:
//  Map (travel back to a town you have stood in), Clock (weather and time of day), Quests (the daily quests, claimable here),
//  Calls (notes from people in the game, never real players) and Tips (a math tip a day, and more on tap).
// =====================================================================
const GIZMO_TABS = [['map', 'Map'], ['clock', 'Clock'], ['quests', 'Quests'], ['calls', 'Calls'], ['tips', 'Tips']];
let gizmoTab = 'map', gizmoTip = 0;

// Notes that unlock as the story goes on. `when` is a function of the save, so nothing here is stored.
const GIZMO_CALLS = [
  { from: 'Prof. Pi', text: 'Welcome to the team! Come and see me in Cozy Hollow any time. Every buddy you meet makes my Dex book better.', when: function () { return true; } },
  { from: 'Mum', text: 'Take your time, and eat something! Your buddies are always happy to see you home.', when: function () { return true; } },
  { from: 'Nurse Joy', text: 'Any Buddy Center will wake your sleepy buddies. The first visit each day is free!', when: function () { return state.badges.length > 0; } },
  { from: RIVAL, text: 'I fixed the Tide Bay ferry numbers before you did! Next time I will not be so quick. Race you to the next gym!', when: function () { return state.overworld.story.indexOf('tide-ferry') !== -1; } },
  { from: RIVAL, text: 'The lights are back on in Volt Valley. The Scramblers are running out of places to hide, I think.', when: function () { return state.overworld.story.indexOf('volt-blackout') !== -1; } },
  { from: 'Champion Nova', text: 'I hear you are a Champion now. Come back to the Hall any time for a friendly rematch.', when: function () { return isChampion(); } }
];

// A math tip a day.
const GIZMO_TIPS = {
  frac: 'Divide the number by the bottom of the fraction first, then multiply by the top.',
  mean: 'Add all the numbers up, then divide by how many numbers there are.',
  pow: 'The small number tells you how many times to multiply the big number by itself.',
  sqrt: 'Which number times itself gives this number?',
  order: 'Do brackets first, then × and ÷, and last + and −.',
  pct: 'Find 10% by moving the decimal one place, then build up from there.',
  dec: 'Line up the decimal points before you add or subtract.',
  neg: 'Same signs: add and keep the sign. Different signs: subtract and keep the sign of the bigger number.',
  alg: 'Do the opposite to both sides to get x alone.',
  log: 'Ask: what power of the small number gives the number in brackets?',
  quad: 'Find two numbers that multiply to the last number and add to the middle number.',
  deriv: 'Bring each power down in front and make the power one smaller.',
  integral: 'Raise each power by one, divide by the new power, then plug in the top number.',
  limit: 'Try factoring the top, or look at the biggest powers.'
};

function openGizmo() { showModal('gizmo-modal', renderGizmo); }
function closeGizmo() { hideModal('gizmo-modal'); }
function gizmoSetTab(t) { soundClick(); gizmoTab = t; renderGizmo(); }

function renderGizmo() {
  document.getElementById('gizmo-tabs').innerHTML = GIZMO_TABS.map(function (t) {
    return '<button type="button" class="hero-chip' + (gizmoTab === t[0] ? ' active' : '') + '" role="tab" aria-selected="' + (gizmoTab === t[0]) + '" onclick="gizmoSetTab(\'' + t[0] + '\')">' + t[1] + '</button>';
  }).join('');
  document.getElementById('gizmo-body').innerHTML = { map: gizmoMapHtml, clock: gizmoClockHtml, quests: gizmoQuestsHtml, calls: gizmoCallsHtml, tips: gizmoTipsHtml }[gizmoTab]();
}

function gizmoMapHtml() {
  const here = state.overworld.map;
  const rows = owTowns().filter(function (id) { return state.overworld.seen.indexOf(id) !== -1; }).map(function (id) {
    const m = OW_MAPS[id];
    return '<div class="gizmo-row"><div><b>' + escHtml(m.name) + '</b></div>' +
      (id === here ? '<span class="d">You are here</span>' : '<button type="button" class="claim-btn" onclick="gizmoTravel(\'' + id + '\')">Go</button>') + '</div>';
  }).join('');
  return '<p class="d" style="margin:8px 0">Travel to a town you have already visited.</p>' + rows;
}
// Stands the hero at the town's start (the road into town), exactly as if they had walked there.
function gizmoTravel(id) {
  const m = OW_MAPS[id], o = state.overworld;
  if (!m || owTowns().indexOf(id) === -1 || o.seen.indexOf(id) === -1 ) return;
  o.map = id; o.x = m.start.x; o.y = m.start.y; o.face = 'down';
  owTrail = null;
  owSetRegion(m);
  saveState();
  closeGizmo();
  renderOverworld();
}

function gizmoClockHtml() {
  const w = weatherToday(), part = owTimeOfDay();
  return '<div class="gizmo-row"><div><b>Weather today</b><div class="d">' + escHtml(w.name) + ': ' + escHtml(w.text) + ' in the tall grass.</div></div></div>' +
    '<div class="gizmo-row"><div><b>Time of day</b><div class="d">It is ' + part + '.</div></div></div>' +
    '<div class="gizmo-row"><div><b>Shake trees</b><div class="d">Each tree gives a rare buddy once a day. Come back tomorrow for a new one.</div></div></div>';
}

function gizmoQuestsHtml() {
  const qs = ensureQuests();
  const rows = qs.list.map(function (q, i) {
    const tail = q.claimed ? '<span class="d">Claimed</span>' : q.done ? '<button type="button" class="claim-btn" onclick="gizmoClaim(' + i + ')">Claim ' + q.reward + ' gems</button>' : '<span class="d">' + q.progress + ' / ' + q.target + '</span>';
    return '<div class="gizmo-row"><div>' + escHtml(q.text) + '</div>' + tail + '</div>';
  }).join('');
  const chest = qs.chestClaimed ? '<div class="gizmo-row"><span class="d">Daily chest opened. New quests tomorrow!</span></div>' :
    '<div class="gizmo-row"><div>Daily chest: ' + ECON.quest.chest + ' gems</div><button type="button" class="claim-btn"' + (qs.list.every(function (q) { return q.claimed; }) ? '' : ' disabled') + ' onclick="gizmoClaim(-1)">Open</button></div>';
  return rows + chest;
}
function gizmoClaim(i) { if (i < 0) claimQuestChest(); else claimQuest(i); renderGizmo(); }

function gizmoCallsHtml() {
  return GIZMO_CALLS.filter(function (c) { return c.when(); }).map(function (c) {
    return '<div class="gizmo-row"><div><b>' + escHtml(c.from) + '</b><div class="d">' + escHtml(c.text) + '</div></div></div>';
  }).join('');
}

function gizmoTipsHtml() {
  const tips = Object.keys(GIZMO_TIPS).map(function (k) { return GIZMO_TIPS[k]; });
  const text = tips[(dayHash('tip' + dayKey()) + gizmoTip) % tips.length];
  return '<div class="gizmo-row"><div>' + escHtml(text) + '</div></div><button type="button" class="claim-btn" onclick="gizmoTip += 1; soundClick(); renderGizmo()">Another tip</button>';
}
