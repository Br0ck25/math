// =====================================================================
//  THE GIZMO, a key item from Prof. Pi (24h-ow-maps.js, hollow-house). One window, five tabs:
//  Map (travel back to a town you have stood in), Clock (weather and time of day),
//  Calls (notes from people in the game, never real players) and Tips (a math tip a day, and more on tap).
// =====================================================================
const GIZMO_TABS = [['map', 'Map'], ['clock', 'Clock'], ['phone', 'Phone'], ['calls', 'Calls'], ['tips', 'Tips']];
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
  document.getElementById('gizmo-body').innerHTML = { map: gizmoMapHtml, clock: gizmoClockHtml, phone: gizmoPhoneHtml, calls: gizmoCallsHtml, tips: gizmoTipsHtml }[gizmoTab]();
}

// The Town Map (Gold's Pokegear map): every town is a square on a winding road, in the order you meet them; the routes join them, you are the red dot, and a visited town can be tapped to travel there.
// The Town Map is laid out like Gold's Johto map: the first journey's towns stand where Gold's do (the start at the east end, the first gym north of it, the gyms winding west and north round the land,
// the last in the north-east), and the second journey is a ring of its own on the right. Each road lists the corners it turns, so it runs as it does in the game.
const GIZMO_NODES = {
  hollow: [76, 68], meadow: [44, 43], ember: [35, 84], tide: [26, 64], grove: [35, 31], volt: [18, 43], gloom: [13, 69], mystic: [58, 34], skyreach: [75, 34],
  cinder: [88, 82], coral: [88, 66], thistle: [88, 50], spark: [88, 34], dusk: [98, 22], prism: [108, 34], cross: [98, 52], summit: [108, 66], peak: [108, 82]
};
const GIZMO_ROADS = [                                                                              // [from, to, corners, kind]: the main road of the story
  ['hollow', 'meadow', [[52, 68], [52, 43]]], ['meadow', 'ember', [[44, 84]]], ['ember', 'tide', [[26, 84]]], ['tide', 'grove', [[26, 31]]], ['grove', 'volt', [[18, 31]]], ['volt', 'gloom', [[13, 43]]],
  ['gloom', 'mystic', [[13, 90], [58, 90]], 'far'], ['mystic', 'skyreach', []], ['skyreach', 'cinder', [[84, 34], [84, 82]]], ['cinder', 'coral', []], ['coral', 'thistle', []], ['thistle', 'spark', []],
  ['spark', 'dusk', [[88, 22]]], ['dusk', 'prism', [[108, 22]]], ['prism', 'cross', []], ['cross', 'summit', []], ['summit', 'peak', []]
];
const GIZMO_LINK_CORNERS = { 'link-meadow-grove': [[44, 31]], 'link-grove-mystic': [[58, 31]], 'link-skyreach-hollow': [[66, 34], [66, 56], [76, 56]] };      // the other second roads run straight
function gizmoNodeOf(mapId) {
  if (GIZMO_NODES[mapId]) return { id: mapId };
  const m = OW_MAPS[mapId]; if (!m) return { id: 'hollow' };
  if (m.link) return { id: m.link.to, from: m.link.from };
  if (m.annex) return { id: m.annex.near };
  const base = mapId.replace(/-side$/, ''), i = OW_LANDS.findIndex(function (L) { return L.routeIn === base; });
  if (i >= 0) { const to = OW_LANDS[i].town, from = i ? OW_LANDS[i - 1].town : 'hollow'; return { id: to, from: from }; }
  if (mapId === 'peak') return { id: 'peak' };
  const land = OW_LANDS.find(function (L) { return mapId.indexOf(L.town + '-') === 0; });
  if (land) return { id: land.town };
  if (mapId.indexOf('hollow') === 0) return { id: 'hollow' };
  const byRegion = OW_LANDS.find(function (L) { return L.land === m.region; });
  return { id: byRegion ? byRegion.town : 'hollow' };
}
// The land under the roads: sea with waves round a green coast, brown mountain country, lakes and woods, as on Gold's Pokégear map.
function gizmoTerrain() {
  const tri = function (x, y, c) { return '<polygon class="' + c + '" points="' + (x - 2.6) + ',' + (y + 2.2) + ' ' + x + ',' + (y - 2.4) + ' ' + (x + 2.6) + ',' + (y + 2.2) + '"/>'; };
  const ridges = [[8, 22], [14, 20], [22, 22], [52, 22], [60, 20], [68, 22], [76, 20], [92, 16], [104, 14], [116, 20], [62, 40], [78, 44], [38, 88]].map(function (p) { return tri(p[0], p[1], 'gm-peak'); }).join('');
  const woods = [[30, 76], [34, 72], [30, 68], [39, 60], [42, 66], [28, 50], [24, 36], [30, 24], [47, 52], [50, 60], [96, 56], [100, 68], [104, 40], [100, 88]].map(function (p) { return '<circle class="gm-tree" cx="' + p[0] + '" cy="' + p[1] + '" r="1.6"/>'; }).join('');
  return '<defs><pattern id="gm-wave" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#2f5fd8"/><path d="M0,4 L3,1 L6,4" fill="none" stroke="#9ec1ff" stroke-width="0.7"/></pattern></defs><rect x="0" y="0" width="120" height="94" rx="2" fill="url(#gm-wave)"/>' +
    '<path class="gm-land" d="M14,18 L80,18 Q82,40 80,60 Q82,80 76,88 L24,90 Q14,92 12,84 L16,76 Q22,70 18,62 L12,58 Q6,50 10,44 L14,36Z"/>' +
    '<path class="gm-land" d="M84,12 L118,12 L118,90 L84,90Z"/>' +
    '<path class="gm-mtn" d="M14,18 L34,18 L30,26 L18,28 L12,34Z"/><path class="gm-mtn" d="M50,18 L80,18 L80,30 L66,28 L58,26Z"/><path class="gm-mtn" d="M60,36 L80,36 L80,56 L72,52 L64,44Z"/><path class="gm-mtn" d="M86,14 L108,14 L106,26 L92,28Z"/><path class="gm-mtn" d="M30,82 L46,86 L40,90 L30,90Z"/>' +
    '<ellipse class="gm-water" cx="58" cy="22" rx="6" ry="3"/><ellipse class="gm-water" cx="22" cy="52" rx="4" ry="2.5"/><ellipse class="gm-water" cx="96" cy="72" rx="5" ry="3"/><ellipse class="gm-water" cx="104" cy="58" rx="3" ry="6"/>' +
    '<path class="gm-river" d="M44,50 Q46,60 52,64 T66,70"/><path class="gm-sand" d="M76,88 Q82,80 80,60"/>' + ridges + woods;
}
// A road as points: from a town through its corners to the next.
function gizmoPts(a, b, corners) { return [GIZMO_NODES[a]].concat(corners || [], [GIZMO_NODES[b]]); }
function gizmoMapHtml() {
  if (!hasKeyItem('map-card')) return '<p class="d" style="margin:10px 0">The Gizmo has no map yet. Guide Ivy in Meadow Town gives you a Map Card after her tour of the town.</p>';
  const o = state.overworld, here = gizmoNodeOf(o.map), seen = function (id) { return o.seen.indexOf(id) !== -1 || id === here.id; };
  const towns = ['hollow'].concat(OW_LANDS.map(function (L) { return L.town; })), line = [], pair = {};
  const poly = function (pts, cls) { return '<polyline class="gm-road' + (cls ? ' ' + cls : '') + '" points="' + pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' ') + '"/>'; };
  GIZMO_ROADS.forEach(function (r) { pair[r[0] + '>' + r[1]] = pair[r[1] + '>' + r[0]] = 1; line.push(poly(gizmoPts(r[0], r[1], r[2]), r[3] === 'far' ? 'gm-far' : '')); });
  OW_LINKS.forEach(function (d) {                                                                  // the second roads (24vr), drawn once you have stood in both towns; one beside a main road bows out so the two stay apart
    if (!OW_MAPS[d.id] || !seen(d.from) || !seen(d.to)) return;
    const a = GIZMO_NODES[d.from], b = GIZMO_NODES[d.to];
    line.push(pair[d.from + '>' + d.to] ? '<path class="gm-road" d="M' + a[0] + ',' + a[1] + ' Q' + ((a[0] + b[0]) / 2 + 6) + ',' + ((a[1] + b[1]) / 2 + 6) + ' ' + b[0] + ',' + b[1] + '"/>' : poly(gizmoPts(d.from, d.to, GIZMO_LINK_CORNERS[d.id])));
  });
  const caves = OW_LANDS.map(function (L, i) {                                                     // a cave mouth by each route that has one (a dark arch, as Gold marks them), once you know the town it leads to
    if (!OW_MAPS[L.routeIn + '-cave1'] || !seen(L.town)) return '';
    const from = i ? OW_LANDS[i - 1].town : 'hollow', road = GIZMO_ROADS.find(function (r) { return r[0] === from && r[1] === L.town; }), pts = gizmoPts(from, L.town, road && road[2]);
    let best = 0, c = pts[0];
    for (let k = 0; k + 1 < pts.length; k++) { const len = Math.abs(pts[k + 1][0] - pts[k][0]) + Math.abs(pts[k + 1][1] - pts[k][1]); if (len > best) { best = len; c = [(pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2 - 3.4]; } }
    return '<path class="gm-cave" d="M' + (c[0] - 1.9) + ',' + (c[1] + 1.5) + ' A1.9,1.9 0 0 1 ' + (c[0] + 1.9) + ',' + (c[1] + 1.5) + 'Z"><title>Cave on ' + escHtml(OW_MAPS[L.routeIn].name) + '</title></path>';
  }).join('');
  const nodes = towns.concat(['peak']).map(function (id) {
    const p = GIZMO_NODES[id], open = seen(id), name = id === 'peak' ? 'Silver Peak' : OW_MAPS[id].name;
    const tap = open && id !== 'peak' ? ' onclick="gizmoTravel(\'' + id + '\')" style="cursor:pointer"' : '';
    return '<g' + tap + '><rect class="gm-town' + (open ? '' : ' gm-dim') + '" x="' + (p[0] - 3) + '" y="' + (p[1] - 3) + '" width="6" height="6" rx="0.8"/>' + (open ? '<text class="gm-name" x="' + p[0] + '" y="' + (p[1] + 7.5) + '" text-anchor="middle">' + escHtml(name) + '</text>' : '<text class="gm-name gm-dimtxt" x="' + p[0] + '" y="' + (p[1] + 1.2) + '" text-anchor="middle">?</text>') + '</g>';
  }).join('');
  let me = GIZMO_NODES[here.id] || GIZMO_NODES.hollow;
  if (here.from) { const f = GIZMO_NODES[here.from]; me = [(f[0] + me[0]) / 2, (f[1] + me[1]) / 2]; }
  const dot = '<circle class="gm-me" cx="' + me[0] + '" cy="' + (me[1] - 0.5) + '" r="2.4"/>';
  const rows = owTowns().filter(function (id) { return o.seen.indexOf(id) !== -1; }).map(function (id) {
    return '<div class="gizmo-row"><div><b>' + escHtml(OW_MAPS[id].name) + '</b></div>' + (id === o.map ? '<span class="d">You are here</span>' : '<button type="button" class="claim-btn" onclick="gizmoTravel(\'' + id + '\')">Go</button>') + '</div>';
  }).join('');
  return '<svg class="gm-map" viewBox="0 0 120 94" role="img" aria-label="Town map. The red dot is you.">' + gizmoTerrain() + '<text class="gm-label" x="86" y="9">BEYOND THE PEAK</text><text class="gm-label" x="4" y="92">THE FIRST JOURNEY</text>' + line.join('') + caves + nodes + dot + '</svg>' +
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


// Gold's phone: everyone whose number you have, with a Call button. Mom and Prof. Pi are there from the start, friends once they have given you a key item, trainers once you have beaten them.
function gizmoContacts() {
  const list = [{ name: 'Mom', look: { skin: 1, hair: 3, outfit: 4, style: 2 }, lines: function () { return ['Hello, dear! Are you eating well? You have ' + state.gems + ' gems, and I am keeping some safe at home.']; } },
    { name: 'Prof. Pi', look: { skin: 2, hair: 6, outfit: 7, style: 1 }, lines: function () { return ['You have caught ' + getOwnedIds().length + ' buddies so far. Come by the lab and I will rate your Dex!']; } }];
  PHONE_FRIENDS.forEach(function (f) { if (hasKeyItem(f.key)) list.push({ name: f.name, look: { skin: (f.name.length + 1) % 6, hair: f.name.length % 8, outfit: (f.name.length * 3) % 8, style: 0 }, lines: function () { return [f.text]; }, gift: f }); });
  phoneTrainers().slice(-12).reverse().forEach(function (t) {
    list.push({ name: t.npc.name, look: t.npc.look || { skin: 0, hair: 0, outfit: 0, style: 0 }, lines: function () { return phoneReady() === t.npc.id ? ['I have been training since our battle! Meet me on ' + OW_MAPS[t.map].name + ' for a rematch!'] : ['Hello! I am on ' + OW_MAPS[t.map].name + '. Come back when you are stronger and we will battle again.']; } });
  });
  return list;
}
function gizmoPhoneHtml() {
  return gizmoContacts().map(function (c, i) { return '<div class="gizmo-row"><div><b>' + escHtml(c.name) + '</b></div><button type="button" class="claim-btn" onclick="gizmoCall(' + i + ')">Call</button></div>'; }).join('');
}
function gizmoCall(i) {
  const c = gizmoContacts()[i]; if (!c) return;
  const lines = c.lines();
  if (c.gift && phoneFriend() === c.gift) { phoneClaim(); lines.push('I sent you a little gift!'); }
  openTalk({ name: c.name, art: heroSprite(heroLookColors(c.look), 'down', 0), lines: lines });
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
