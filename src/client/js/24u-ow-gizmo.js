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
const GIZMO_NODES = {
  hollow: [10, 78], meadow: [28, 78], ember: [28, 62], tide: [46, 62], grove: [46, 78], volt: [64, 78], gloom: [64, 62], mystic: [82, 62], skyreach: [82, 46],
  cinder: [64, 46], coral: [46, 46], thistle: [28, 46], spark: [10, 46], dusk: [10, 30], prism: [28, 30], cross: [46, 30], summit: [64, 30], peak: [82, 30]
};
function gizmoNodeOf(mapId) {
  if (GIZMO_NODES[mapId]) return { id: mapId };
  const m = OW_MAPS[mapId]; if (!m) return { id: 'hollow' };
  if (m.link) return { id: m.link.to, from: m.link.from };
  const base = mapId.replace(/-side$/, ''), i = OW_LANDS.findIndex(function (L) { return L.routeIn === base; });
  if (i >= 0) { const to = OW_LANDS[i].town, from = i ? OW_LANDS[i - 1].town : 'hollow'; return { id: to, from: from }; }
  if (mapId === 'peak') return { id: 'peak' };
  const land = OW_LANDS.find(function (L) { return mapId.indexOf(L.town + '-') === 0; });
  if (land) return { id: land.town };
  if (mapId.indexOf('hollow') === 0) return { id: 'hollow' };
  const byRegion = OW_LANDS.find(function (L) { return L.land === m.region; });
  return { id: byRegion ? byRegion.town : 'hollow' };
}
// The land under the roads: sea with waves round a green coast, brown mountain country, a river the roads bridge, lakes and woods, as on Gold's Pokégear map.
function gizmoTerrain() {
  const tri = function (x, y, c) { return '<polygon class="' + c + '" points="' + (x - 2.6) + ',' + (y + 2.2) + ' ' + x + ',' + (y - 2.4) + ' ' + (x + 2.6) + ',' + (y + 2.2) + '"/>'; };
  const ridges = [[66, 20], [72, 18], [80, 21], [86, 19], [14, 20], [20, 18], [62, 38], [70, 40], [78, 39], [86, 42], [12, 64], [17, 68], [14, 73], [80, 74], [86, 72]].map(function (p) { return tri(p[0], p[1], 'gm-peak'); }).join('');
  const woods = [[32, 68], [36, 66], [40, 70], [34, 73], [39, 75], [31, 76], [22, 40], [26, 37], [30, 41], [34, 38], [40, 36], [52, 38], [56, 41], [50, 73], [57, 74], [60, 68]].map(function (p) { return '<circle class="gm-tree" cx="' + p[0] + '" cy="' + p[1] + '" r="1.6"/>'; }).join('');
  return '<defs><pattern id="gm-wave" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#2f5fd8"/><path d="M0,4 L3,1 L6,4" fill="none" stroke="#9ec1ff" stroke-width="0.7"/></pattern></defs><rect x="0" y="0" width="94" height="94" rx="2" fill="url(#gm-wave)"/>' +
    '<path class="gm-land" d="M6,16 Q14,11 40,13 T86,15 Q92,22 91,48 Q92.5,78 85,86 Q60,91 30,89 Q9,91 5,80 Q2,50 6,16Z"/>' +
    '<path class="gm-mtn" d="M5,17 Q18,12 32,15 L28,24 L16,26 L6,31Z"/><path class="gm-mtn" d="M58,14 L90,15 L91,45 L77,42 L66,38 L60,28Z"/><path class="gm-mtn" d="M5,57 L24,58 L23,76 L9,75 L5,70Z"/><path class="gm-mtn" d="M70,70 L90,69 L88,84 L72,84Z"/>' +
    '<path class="gm-river" d="M5,55 Q16,50 28,54 T52,55 T74,53 T92,55"/>' +
    '<ellipse class="gm-water" cx="19" cy="38" rx="6" ry="3"/><ellipse class="gm-water" cx="56" cy="68" rx="5" ry="3"/><ellipse class="gm-water" cx="92" cy="66" rx="4" ry="9"/><ellipse class="gm-water" cx="46" cy="22" rx="9" ry="2.6"/>' +
    '<path class="gm-sand" d="M91,52 Q92.5,78 85,86"/>' + ridges + woods;
}
function gizmoMapHtml() {
  if (!hasKeyItem('map-card')) return '<p class="d" style="margin:10px 0">The Gizmo has no map yet. Guide Ivy in Meadow Town gives you a Map Card after her tour of the town.</p>';
  const o = state.overworld, here = gizmoNodeOf(o.map), seen = function (id) { return o.seen.indexOf(id) !== -1 || id === here.id; };
  const towns = ['hollow'].concat(OW_LANDS.map(function (L) { return L.town; })), line = [];
  for (let i = 1; i < towns.length; i++) {
    const a = GIZMO_NODES[towns[i - 1]], b = GIZMO_NODES[towns[i]];
    line.push('<polyline class="gm-road" points="' + a[0] + ',' + a[1] + ' ' + (a[0] === b[0] ? b[0] : b[0]) + ',' + (a[0] === b[0] ? b[1] : a[1]) + ' ' + b[0] + ',' + b[1] + '"/>');
  }
  OW_LINKS.forEach(function (d) {                                                                  // the second roads (24vr), drawn once you have stood in both towns; one beside a main road bows out so the two stay apart
    if (!OW_MAPS[d.id] || !seen(d.from) || !seen(d.to)) return;
    const a = GIZMO_NODES[d.from], b = GIZMO_NODES[d.to], near = Math.abs(towns.indexOf(d.from) - towns.indexOf(d.to)) === 1;
    line.push(near ? '<path class="gm-road" d="M' + a[0] + ',' + a[1] + ' Q' + (a[0] + 7) + ',' + ((a[1] + b[1]) / 2) + ' ' + b[0] + ',' + b[1] + '"/>' : '<polyline class="gm-road" points="' + a[0] + ',' + a[1] + ' ' + b[0] + ',' + b[1] + '"/>');
  });
  const caves = OW_LANDS.map(function (L, i) {                                                     // a cave mouth by each route that has one (a dark arch, as Gold marks them), once you know the town it leads to
    if (!OW_MAPS[L.routeIn + '-cave1'] || !seen(L.town)) return '';
    const a = GIZMO_NODES[i ? OW_LANDS[i - 1].town : 'hollow'], b = GIZMO_NODES[L.town], c = a[0] === b[0] ? [a[0] + 3.4, (a[1] + b[1]) / 2] : [(a[0] + b[0]) / 2, a[1] - 3.4];
    return '<path class="gm-cave" d="M' + (c[0] - 1.9) + ',' + (c[1] + 1.5) + ' A1.9,1.9 0 0 1 ' + (c[0] + 1.9) + ',' + (c[1] + 1.5) + 'Z"><title>Cave on ' + escHtml(OW_MAPS[L.routeIn].name) + '</title></path>';
  }).join('');
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
  return '<svg class="gm-map" viewBox="0 0 94 94" role="img" aria-label="Town map. The red dot is you.">' + gizmoTerrain() + '<text class="gm-label" x="4" y="9">BEYOND THE PEAK</text><text class="gm-label" x="4" y="90">THE FIRST JOURNEY</text>' + line.join('') + caves + nodes + dot + '</svg>' +
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
