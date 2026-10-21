// =====================================================================
//  THE GIZMO, a key item from Prof. Pi (24h-ow-maps.js, hollow-house). One window, five tabs:
//  Map (travel back to a town you have stood in), Clock (weather and time of day),
//  Calls (notes from people in the game, never real players) and Tips (a math tip a day, and more on tap).
// =====================================================================
const GIZMO_TABS = [['map', 'Map'], ['clock', 'Clock'], ['calls', 'Calls'], ['tips', 'Tips']];
let gizmoTab = 'map', gizmoTip = 0;

// Notes that unlock as the story goes on. `when` is a function of the save, so nothing here is stored.
const GIZMO_CALLS = [
  { from: 'Radio news', text: '', when: function () { return legendRoamers().length > 0; }, dyn: function () { return legendRoamers().map(function (x) { return x.legend.name + ' on ' + OW_MAPS[x.route].name; }).join(', ') + ' today. Walk in the tall grass there!'; } },
  { from: 'Prof. Pi', text: 'Welcome to the team! Come and see me in Cozy Hollow any time. Every buddy you meet makes my Dex book better.', when: function () { return true; } },
  { from: 'Mom', text: 'Take your time, and eat something! Your buddies are always happy to see you home.', when: function () { return true; } },
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
  document.getElementById('gizmo-body').innerHTML = { map: gizmoMapHtml, clock: gizmoClockHtml, calls: gizmoCallsHtml, tips: gizmoTipsHtml }[gizmoTab]();
}

// The Town Map (Gold's Pokegear map): every town is a square on a winding road, in the order you meet them; the routes join them, you are the red dot, and a visited town can be tapped to travel there.
const GIZMO_NODES = {
  hollow: [10, 78], meadow: [28, 78], ember: [28, 62], tide: [46, 62], grove: [46, 78], volt: [64, 78], gloom: [64, 62], mystic: [82, 62], skyreach: [82, 46],
  cinder: [64, 46], coral: [46, 46], thistle: [28, 46], spark: [10, 46], dusk: [10, 30], prism: [28, 30], cross: [46, 30], summit: [64, 30], peak: [82, 30]
};
function gizmoNodeOf(mapId) {
  if (GIZMO_NODES[mapId]) return { id: mapId };
  const m = OW_MAPS[mapId]; if (!m) return { id: 'hollow' };
  const base = mapId.replace(/-side$/, ''), i = OW_LANDS.findIndex(function (L) { return L.routeIn === base; });
  if (i >= 0) { const to = OW_LANDS[i].town, from = i ? OW_LANDS[i - 1].town : 'hollow'; return { id: to, from: from }; }
  if (mapId === 'peak') return { id: 'peak' };
  const land = OW_LANDS.find(function (L) { return mapId.indexOf(L.town + '-') === 0; });
  if (land) return { id: land.town };
  if (mapId.indexOf('hollow') === 0) return { id: 'hollow' };
  const byRegion = OW_LANDS.find(function (L) { return L.land === m.region; });
  return { id: byRegion ? byRegion.town : 'hollow' };
}
function gizmoMapHtml() {
  if (!hasKeyItem('map-card')) return '<p class="d" style="margin:10px 0">The Gizmo has no map yet. Guide Ivy in Meadow Town gives you a Map Card after her tour of the town.</p>';
  const o = state.overworld, here = gizmoNodeOf(o.map), seen = function (id) { return o.seen.indexOf(id) !== -1 || id === here.id; };
  const towns = ['hollow'].concat(OW_LANDS.map(function (L) { return L.town; })), line = [];
  for (let i = 1; i < towns.length; i++) {
    const a = GIZMO_NODES[towns[i - 1]], b = GIZMO_NODES[towns[i]];
    line.push('<polyline class="gm-road" points="' + a[0] + ',' + a[1] + ' ' + (a[0] === b[0] ? b[0] : b[0]) + ',' + (a[0] === b[0] ? b[1] : a[1]) + ' ' + b[0] + ',' + b[1] + '"/>');
  }
  const sk = GIZMO_NODES.summit, pk = GIZMO_NODES.peak;
  line.push('<polyline class="gm-road" points="' + sk[0] + ',' + sk[1] + ' ' + pk[0] + ',' + pk[1] + '"/>');
  const nodes = towns.concat(['peak']).map(function (id) {
    const p = GIZMO_NODES[id], open = id === 'peak' ? seen('peak') : seen(id), name = id === 'peak' ? 'Silver Peak' : OW_MAPS[id].name;
    const tap = open && id !== 'peak' ? ' onclick="gizmoTravel(\'' + id + '\')" style="cursor:pointer"' : '';
    return '<g' + tap + '><rect class="gm-town' + (open ? '' : ' gm-dim') + '" x="' + (p[0] - 3) + '" y="' + (p[1] - 3) + '" width="6" height="6" rx="0.8"/>' + (open ? '<text class="gm-name" x="' + p[0] + '" y="' + (p[1] + 7.5) + '" text-anchor="middle">' + escHtml(name) + '</text>' : '<text class="gm-name gm-dimtxt" x="' + p[0] + '" y="' + (p[1] + 1.2) + '" text-anchor="middle">?</text>') + '</g>';
  }).join('');
  let me = GIZMO_NODES[here.id] || GIZMO_NODES.hollow;
  if (here.from) { const f = GIZMO_NODES[here.from]; me = [(f[0] + me[0]) / 2, (f[1] + me[1]) / 2]; }
  const dot = '<circle class="gm-me" cx="' + me[0] + '" cy="' + (me[1] - 0.5) + '" r="2.4"/>';
  const rows = owTowns().filter(function (id) { return o.seen.indexOf(id) !== -1; }).map(function (id) {
    return '<div class="gizmo-row"><div><b>' + escHtml(OW_MAPS[id].name) + '</b></div>' + (id === o.map ? '<span class="d">You are here</span>' : '<button type="button" class="claim-btn" onclick="gizmoTravel(\'' + id + '\')">Go</button>') + '</div>';
  }).join('');
  return '<svg class="gm-map" viewBox="0 0 94 94" role="img" aria-label="Town map. The red dot is you."><rect class="gm-sea" x="0" y="0" width="94" height="94" rx="2"/><text class="gm-label" x="4" y="9">BEYOND THE PEAK</text><text class="gm-label" x="4" y="90">THE FIRST JOURNEY</text>' + line.join('') + nodes + dot + '</svg>' +
    '<p class="d" style="margin:6px 0">Tap a town you have visited to travel there. The red dot is you.</p>' + rows;
}
// Stands the hero at the town's start (the road into town), exactly as if they had walked there.
function gizmoTravel(id) {
  const m = OW_MAPS[id], o = state.overworld;
  if (!hasKeyItem('map-card') || !m || owTowns().indexOf(id) === -1 || o.seen.indexOf(id) === -1 ) return;
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
    '<div class="gizmo-row"><div><b>Time of day</b><div class="d">It is ' + (part === 'day' ? 'daytime' : part) + '.</div></div></div>' +
    '<div class="gizmo-row"><div><b>Shake trees</b><div class="d">Each tree gives a rare buddy once a day. Come back tomorrow for a new one.</div></div></div>';
}


function gizmoCallsHtml() {
  return GIZMO_CALLS.filter(function (c) { return c.when(); }).map(function (c) {
    return '<div class="gizmo-row"><div><b>' + escHtml(c.from) + '</b><div class="d">' + escHtml(c.dyn ? c.dyn() : c.text) + '</div></div>' + (c.claim ? '<button type="button" class="claim-btn" onclick="phoneClaim()">Take the gift</button>' : '') + '</div>';
  }).join('');
}

function gizmoTipsHtml() {
  if (!hasKeyItem('radio-card')) return '<p class="d" style="margin:10px 0">The radio is not tuned yet. Win a Radio Card with the quiz at the Radio Tower in Spark City.</p>';
  const tips = Object.keys(GIZMO_TIPS).map(function (k) { return GIZMO_TIPS[k]; });
  const text = tips[(dayHash('tip' + dayKey()) + gizmoTip) % tips.length];
  return '<div class="gizmo-row"><div>' + escHtml(text) + '</div></div><button type="button" class="claim-btn" onclick="gizmoTip += 1; soundClick(); renderGizmo()">Another tip</button>';
}
