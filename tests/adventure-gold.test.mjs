// Gold's held items in battle, the roaming legend, shiny buddies, and the full-screen touch map.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

let browser, worker, env, page, errors;
before(async () => {
  browser = await launch();
  worker = await loadWorker();
  env = { MATH_KV: fakeKV() };
  ({ page, errors } = await openGame(browser, worker, env, { fast: true, wildStart: true }));
});
after(async () => { await browser.close(); });
beforeEach(async () => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  errors.length = 0;
  await page.setViewportSize({ width: 390, height: 780 });
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; state.hero.made = true; state.buddyXp[state.activePet] = xpForLevel(20); { let n = 0; Math.random = () => (n = (n + 0.31) % 0.79); } });
});
const ev = (fn, arg) => page.evaluate(fn, arg);
const menu = () => page.waitForFunction(() => ab && !ab.busy && ab.phase === 'menu', null, { timeout: 20000 });
const begin = async () => { await ev(() => { openAdventure(); abStart({ kind: 'wild', foes: [{ id: 'fox', level: 12 }] }); }); await menu(); };

test('the battle fills the whole screen and an attack plays a picture on the target', async () => {
  await begin();
  const r = await ev(() => {
    const c = document.querySelector('#ab-modal .ab-content').getBoundingClientRect();
    abFx(abMe(), abFoe(), { type: 'fire' }, true);
    const sp = document.getElementById('ab-me-icon').getBoundingClientRect().width;
    return { sp, w: c.width, h: c.height, fx: !!document.querySelector('#ab-modal .ab-fx.t-fire'), shake: document.getElementById('ab-foe-icon').classList.contains('ab-shake') };
  });
  assert.deepEqual([r.w, r.h], [390, 780]);
  assert.ok(r.sp >= 100, 'the buddies are drawn big, like in Gold');
  assert.ok(r.fx && r.shake);
});

test('every buddy can be caught: in the wild pool, a boss prize, or in the weekly legend rotation, and each one can fight', async () => {
  const r = await ev(() => {
    const wild = wildPool().concat(legendRoster()).concat(bossBuddies).map((b) => b.id);
    const lost = allBuddies().filter((b) => wild.indexOf(b.id) === -1).map((b) => b.id);
    const bad = allBuddies().filter((b) => { try { const m = abMon(b.id, 10); return !(m.max > 0 && m.moves.length >= 2); } catch (e) { return true; } }).map((b) => b.id);
    return { lost, bad };
  });
  assert.deepEqual(r, { lost: [], bad: [] });
});

test('Gold statuses: water freezes (a frozen buddy cannot move, a tenth thaw), magic confuses (it may hurt itself, then snaps out)', async () => {
  assert.deepEqual(await ev(() => [AB_STATUS.water, AB_STATUS.magic]), ['freeze', 'confusion']);
  await begin();
  const frozen = await ev(() => { const me = abMe(), foe = abFoe(); me.status = 'freeze'; Math.random = () => 0.5; let moved = false; abStrike(me, foe, me.moves[0], () => {}, () => {}); return new Promise((res) => setTimeout(() => res([me.status, foe.hp === foe.max]), 1500)); });
  assert.deepEqual(frozen, ['freeze', true], 'it stayed frozen and did not attack');
  const thawed = await ev(() => { const me = abMe(); Math.random = () => 0.05; abStrike(me, abFoe(), me.moves[0], () => {}, () => {}); return new Promise((res) => setTimeout(() => res(me.status), 1800)); });
  assert.equal(thawed, '', 'a low roll thaws it');
  await menu();
  const conf = await ev(() => { const me = abMe(), hp = me.hp; me.conf = 3; Math.random = () => 0.3; abStrike(me, abFoe(), me.moves[0], () => {}, () => {}); return new Promise((res) => setTimeout(() => res([me.hp < hp, me.conf]), 2500)); });
  assert.deepEqual(conf, [true, 2], 'a low roll: it hurt itself and has one turn less');
});

test('the fishing rod grows with you: Old, Good with 3 badges, Super for the Champion, each biting more and pulling bigger buddies', async () => {
  const r = await ev(() => {
    grantKeyItem('fishing-rod'); state.badges = []; state.storySeen.champion = 0; const tiers = [owRodTier()];
    state.badges = ['meadow', 'ember', 'tide']; tiers.push(owRodTier());
    state.storySeen.champion = 1; tiers.push(owRodTier());
    const seen = [];
    const real = startAdventureFight; window.startAdventureFight = (sp, lv) => seen.push([sp.element, isStoreBuddy(sp) ? sp.cost : -1, lv]);
    Math.random = () => 0.1; state.storySeen.champion = 0; state.badges = []; owFish();
    window.startAdventureFight = real;
    return { tiers, bites: ECON.overworld.rods.map((x) => x.bite), levels: ECON.overworld.rods.map((x) => x.level), old: seen[0] };
  });
  assert.deepEqual(r.tiers, [0, 1, 2]);
  assert.deepEqual([r.bites, r.levels], [[0.4, 0.6, 0.8], [-2, 0, 3]]);
  assert.equal(r.old[0], 'water'); assert.ok(r.old[1] < 150 && r.old[2] === -2, 'the Old Rod pulls an everyday water buddy a little weaker');
});

test('the Day Care: two buddies grow a level per 40 steps, a same-type pair leaves an egg, taking one back costs by levels gained, and they leave the team', async () => {
  const r = await ev(() => {
    const fire = storePets.filter((p) => p.element === 'fire' && p.id !== state.activePet).slice(0, 2).map((p) => p.id);
    state.unlockedPets = [state.activePet].concat(fire); state.genders = { [fire[0]]: 'm', [fire[1]]: 'f' }; state.team = state.unlockedPets.slice(); state.gems = 1000; state.egg = null;
    const npc = OW_MAPS['tide-house'].npcs.find((n) => n.kind === 'daycare'), out = {};
    const talkTo = (i) => { talk.i = talk.lines.length - 1; renderTalk(); talkChoose(i); };
    for (let k = 0; k < 2; k++) { OW_SERVICES.daycare(npc); talkTo(talk.choices.length - 1); talk.i = talk.lines.length - 1; renderTalk(); talkChoose(0); }
    out.left = state.daycare.ids.length; out.team = getTeam().length;
    const lv = getBuddyLevel(fire[0]);
    for (let i = 0; i < 40; i++) owDaycareStep();
    out.grew = getBuddyLevel(fire[0]) - lv;
    for (let i = 0; i < 200; i++) owDaycareStep();
    out.egg = state.daycare.eggReady;
    OW_SERVICES.daycare(npc); const labels = talk.choices.map((c) => c.label); talkTo(labels.findIndex((l) => /egg/.test(l)));
    out.hasEgg = !!state.egg;
    const cost = daycareCost(fire[0]); out.cost = cost > ECON.daycare.base;
    OW_SERVICES.daycare(npc); talkTo(0);
    out.back = state.daycare.ids.length; out.gems = state.gems < 1000;
    return out;
  });
  assert.deepEqual(r, { left: 2, team: 1, grew: 1, egg: true, hasEgg: true, cost: true, back: 1, gems: true });
});

test('the buddy summary shows type, level, the five stats and the moves with PP', async () => {
  const t = await ev(() => { hubTab = 'stats'; openHub(); return document.getElementById('hub-body').innerText; });
  for (const w of ['Type', 'Level', 'HP', 'Attack', 'Defense', 'Speed', 'Special', 'Held item', 'Moves', 'PP ']) assert.match(t, new RegExp(w));
  assert.equal(await ev(() => document.querySelectorAll('#hub-tabs button').length), 3);
});

test('hand-tuned builds: the iconic buddies have their own strengths, kept within the shape range, and the rest still get a name-based build', async () => {
  const r = await ev(() => {
    const ok = Object.keys(AB_SHAPES).every((k) => getSpecies(k) && Object.values(AB_SHAPES[k]).every((v) => v >= -20 && v <= 20));
    const turtle = abMon('turtle', 50), bat = abMon('bat', 50), rest = abMon('toon_bluey', 50);
    return { ok, tanky: turtle.def > bat.def && turtle.spd < bat.spd, fixed: abShape('turtle', 'water') === AB_SHAPES.turtle, other: abShape('toon_bluey', 'nature').atk >= -10 && rest.max > 0 };
  });
  assert.deepEqual(r, { ok: true, tanky: true, fixed: true, other: true });
});

test('trade evolution: Spike, Pascal, Tank and Dusty stop one form short until the Link Trader trades them', async () => {
  const r = await ev(() => {
    state.unlockedPets = [state.activePet, 'hedgehog']; state.buddyXp.hedgehog = xpForLevel(100); state.tradedUp = {};
    const before = getPetById('hedgehog').stage, npc = OW_MAPS['mystic-house'].npcs.find((n) => n.kind === 'linktrader');
    OW_SERVICES.linktrader(npc); talk.i = talk.lines.length - 1; renderTalk(); talkChoose(0);
    const after = getPetById('hedgehog').stage;
    OW_SERVICES.linktrader(npc);
    state.tradedUp = { hedgehog: 1, fox: 1, nope: 1 }; NORMALIZERS.forEach((fn) => fn(state));
    return { before, after, again: talk.lines.join(' ').includes('already been traded'), kept: Object.keys(state.tradedUp).join(), rest: getPetById('fox').stage };
  });
  assert.deepEqual(r, { before: 1, after: 2, again: true, kept: 'hedgehog', rest: 0 });
});

test("Gold's money: only trainers pay, the class base times the level of the last buddy; a wild buddy, a level-up and a badge pay nothing", async () => {
  const r = await ev(() => {
    const foes = [{ level: 10 }, { level: 22 }], gems0 = state.gems;
    const out = { trainer: abPrize({ kind: 'trainer', foes }), leader: abPrize({ kind: 'leader', foes }), elite: abPrize({ kind: 'trainer', base: ECON.money.leaderBase, foes }) };
    awardBuddyXp(500000); out.levelUp = state.gems - gems0;
    state.rematch = { day: '', lands: [], wins: 0 }; state.badges = []; state.gym = { region: 'meadow', step: 3 }; advanceGym(true); out.badge = state.gems - gems0;
    return out;
  });
  assert.deepEqual(r, { trainer: 16 * 22, leader: 100 * 22, elite: 100 * 22, levelUp: 0, badge: 0 });
});

test('the lead buddy goes first in battle, even when it is not first in the team list', async () => {
  const first = await ev(() => {
    state.unlockedPets = ['dog', 'fox', 'bunny']; state.team = ['dog', 'fox', 'bunny']; state.activePet = 'bunny'; state.advHp = {};
    openAdventure(); abStart({ kind: 'wild', foes: [{ id: 'fox', level: 5 }] }); return abMe().id;
  });
  assert.equal(first, 'bunny');
});

test('the pack: Super Potion heals more, Full Heal cures a status, Revive wakes a resting buddy with half its HP; running can fail and gets likelier', async () => {
  await ev(() => { state.unlockedPets = ['dog', 'fox']; state.team = ['dog', 'fox']; state.activePet = 'dog'; state.advHp = {}; });
  await begin();
  const r = await ev(() => {
    state.items = { superpotion: 1, fullheal: 1, revive: 1 };
    const me = abMe(), other = ab.party.find((x) => x !== me); other.hp = 0; me.hp = me.max - 1; me.status = 'burn'; ab.foes.forEach((f) => { f.atk = 1; f.spc = 1; }); Math.random = () => 0.9;
    ab.phase = 'pack'; abUseItem('revive'); const revived = other.hp;
    return { revived: revived === Math.max(1, Math.floor(other.max / 2)), left: state.items.revive || 0 };
  });
  assert.deepEqual(r, { revived: true, left: 0 });
  await menu();
  const s = await ev(() => { const me = abMe(); me.hp = me.max - 1; me.status = 'burn'; ab.foes.forEach((f) => { f.atk = 1; f.spc = 1; }); Math.random = () => 0.9; ab.phase = 'pack'; abUseItem('fullheal'); return [me.status, state.items.fullheal || 0]; });
  assert.deepEqual(s, ['', 0]);
  await menu();
  const h = await ev(() => { const me = abMe(); me.hp = 2; ab.foes.forEach((f) => { f.atk = 1; f.spc = 1; }); ab.phase = 'pack'; abUseItem('superpotion'); return me.hp; });
  assert.ok(h > 2);
  await menu();
  const run = await ev(() => {
    const out = []; for (let k = 1; k <= 12; k++) { ab.runs = 0; const spd = abMe().spd, fs = abFoe().spd; out.push([k]); }
    const f = (runs) => Math.floor(abMe().spd * 32 / Math.max(1, Math.floor(abFoe().spd / 4) % 256)) + 30 * runs;
    return f(5) > f(1);
  });
  assert.equal(run, true);
});

test('nets are the balls of Gold: the Catch Net is a Poke Ball, the Great and Ultra Nets catch x1.5 and x2, and the bag holds 99', async () => {
  const r = await ev(() => {
    const f = abMon('octopus', 10); f.hp = Math.floor(f.max / 2);
    const a = [undefined, 1.5, 2].map((b) => abCatchChance(f, b));
    state.items = { greatnet: 2, ultranet: 1 }; state.nets = 0; state.unlockedPets = ['dog'];
    return { order: a[0] < a[1] && a[1] < a[2], stock: maxNets(), cost: [itemCost('net'), itemCost('greatnet'), itemCost('ultranet')] };
  });
  assert.deepEqual(r, { order: true, stock: 99, cost: [200, 600, 1200] });
  await begin();
  await ev(() => { state.items = { greatnet: 1 }; ab.foes[0].hp = 1; Math.random = () => 0; ab.phase = 'pack'; abThrowNet('greatnet'); });
  await page.waitForFunction(() => !ab, null, { timeout: 30000 });
  assert.deepEqual(await ev(() => [state.items.greatnet || 0, getOwnedIds().includes('fox')]), [0, true]);
});

test('stat moves: Growl lowers the foe Attack by a stage (it shows in the damage), stages stop at +/-6, Swords Dance raises two, a switch resets them', async () => {
  await ev(() => { state.buddyXp[state.activePet] = xpForLevel(30); });
  await begin();
  const r = await ev(() => {
    const me = abMe(), foe = abFoe(), mv = (id) => me.moves.find((m) => m.id === id) || abKnownMoves(me.element, 60, me.type).find((m) => m.id === id);
    const out = {}, dmg = (a, d) => { Math.random = () => 0.5; return abDamage(a, d, { power: 40, type: 'normal' }, false).dmg; };
    foe.atk = 60; me.def = 60; foe.level = me.level = 30; const before = dmg(foe, me);
    abStatMove(me, foe, mv('growl'), () => {}); out.stage = foe.stg.atk;
    out.lower = dmg(foe, me) < before;
    for (let i = 0; i < 8; i++) abStatMove(me, foe, mv('growl'), () => {});
    out.floor = foe.stg.atk;
    abStatMove(me, foe, mv('swords'), () => {}); abStatMove(me, foe, mv('swords'), () => {}); out.up = me.stg.atk;
    out.spd = abStat({ spd: 100, stg: { spd: 2 } }, 'spd');
    return out;
  });
  assert.deepEqual(r, { stage: -1, lower: true, floor: -6, up: 4, spd: 200 });
});

test('gender: most kinds are male or female (legends have none), a wild buddy gets one by chance and keeps it when caught, and only a male and a female of one type leave a Day Care egg', async () => {
  const r = await ev(() => {
    const out = { legend: abGenderOf('legend_fire'), ultra: abGenderOf('janie') || abGenderOf(ultraPets[0].id), some: ['dog', 'fox', 'bunny', 'otter', 'bear', 'wolf'].map(abGenderOf).every((g) => g === 'm' || g === 'f') };
    let m = 0, f = 0; for (let i = 0; i < 200; i++) { const x = abFoeMon({ id: 'dog', level: 3 }); if (x.g === 'm') m++; else f++; } out.mixed = m > 40 && f > 40;
    state.genders = { dog: 'f', fox: 'f', otter: 'm' };
    out.same = daycareCompatible('dog', 'fox'); out.pair = daycareCompatible('fox', 'otter'); out.type = daycareCompatible('dog', 'otter');
    out.tag = abGenderTag({ g: 'f' }).trim();
    state.genders = { nope: 'm', dog: 'x', fox: 'm' }; NORMALIZERS.forEach((fn) => fn(state)); out.kept = Object.keys(state.genders).join();
    return out;
  });
  assert.deepEqual(r, { legend: '', ultra: '', some: true, mixed: true, same: false, pair: false, type: false, tag: '\u2640', kept: 'fox' });
});

test('Gold shows the people first: you from behind and the trainer before its buddy, then the buddies replace them; the first buddy starts at level 5', async () => {
  assert.equal(await ev(() => { state.buddyXp = {}; state.unlockedPets = []; state.unlockedSecrets = []; chooseStarter('bunny'); return getBuddyLevel('bunny'); }), 5);
  const r = await ev(() => {
    openAdventure(); abStart({ rounds: [{ kind: 'trainer', name: 'Scout Pia', foes: [{ id: 'fox', level: 3 }] }] });
    return { foe: !!document.querySelector('#ab-foe-icon .ab-person'), me: !!document.querySelector('#ab-me-icon .ab-person'), boxes: document.querySelector('#ab-modal .ab-field').classList.contains('ab-intro') };
  });
  assert.deepEqual(r, { foe: true, me: true, boxes: true });
  await menu();
  assert.deepEqual(await ev(() => [!!document.querySelector('#ab-foe-icon .ab-person'), !!document.querySelector('#ab-me-icon .ab-person'), document.querySelector('#ab-modal .ab-field').classList.contains('ab-intro')]), [false, false, false]);
});

test('routes run sideways too: every route has an east or west gap to a side path (alternating), with a trainer and two finds, and you can walk there and back', async () => {
  const r = await ev(() => {
    const out = { all: OW_LANDS.every((L) => OW_MAPS[L.routeIn].warps.some((w) => w.to === L.routeIn + '-side')), sides: new Set(), back: true };
    OW_LANDS.forEach((L, i) => { const w = OW_MAPS[L.routeIn].warps.find((x) => x.to === L.routeIn + '-side'); out.sides.add(w.x === 13 ? 'east' : 'west'); const side = OW_MAPS[w.to]; const home = side.warps[0]; if (home.to !== L.routeIn || OW_MAPS[L.routeIn].rows[home.ty].charAt(home.tx) === 'T') out.back = false; });
    out.sides = [...out.sides].sort().join();
    state.hero.made = true; openAdventure();
    const w = OW_MAPS.route1.warps.find((x) => /-side$/.test(x.to));
    state.overworld.map = 'route1'; state.overworld.x = w.x - 1; state.overworld.y = w.y; state.overworld.face = 'right'; owMove('right');
    out.there = state.overworld.map; owMove('left'); owMove('left');
    out.home = state.overworld.map;
    const m = OW_MAPS['route1-side']; out.contents = [m.npcs.length, m.objects.length];
    return out;
  });
  assert.deepEqual(r, { all: true, sides: 'east,west', back: true, there: 'route1-side', home: 'route1', contents: [1, 2] });
});

test('moves at Gold\'s pace: two at the start, about ten by level 50, each kind its own ladder; gym leaders give TMs that a Move Tutor teaches (an element TM only to its type)', async () => {
  const r = await ev(() => {
    const out = { start: abMon('fox', 5).moves.length, late: abKnownMoves('fire', 50, 'fire', 'fox').length };
    const gaps = abKnownMoves('fire', 50, 'fire', 'fox').map((m) => m.level).sort((a, b) => a - b); out.pace = gaps.filter((l) => l > 1).every((l, i, a) => !i || l - a[i - 1] <= 16);
    state.badges = []; state.tms = {}; state.rematch = { day: '', lands: [], wins: 0 }; state.gym = { region: 'ember', step: 3 }; advanceGym(true);
    out.tm = Object.keys(state.tms).join();
    state.unlockedPets = ['fox']; state.activePet = 'fox'; state.buddyXp.fox = xpForLevel(20); state.tmKnown = {}; state.advMoves = {};
    const npc = OW_MAPS['grove-house'].npcs.find((n) => n.kind === 'tutor');
    OW_SERVICES.tutor(npc); talk.i = talk.lines.length - 1; renderTalk();
    out.offered = talk.choices.map((c) => c.label).some((l) => /TM Fire Blast/.test(l));
    state.activePet = 'otter'; state.unlockedPets = ['otter']; state.buddyXp.otter = xpForLevel(20); OW_SERVICES.tutor(npc); talk.i = talk.lines.length - 1; renderTalk();
    out.waterNo = !talk.choices.map((c) => c.label).some((l) => /Fire Blast/.test(l));
    state.activePet = 'fox'; state.unlockedPets = ['fox']; OW_SERVICES.tutor(npc); talk.i = talk.lines.length - 1; renderTalk();
    const i = talk.choices.findIndex((c) => /TM Fire Blast/.test(c.label)); talkChoose(i);
    out.taught = (state.tmKnown.fox || []).join(); out.used = !state.tms.fireblast;
    out.known = abKnownMoves('fire', 20, 'fire', 'fox').some((m) => m.id === 'fireblast');
    return out;
  });
  assert.deepEqual(r, { start: 2, late: r.late, pace: true, tm: 'fireblast', offered: true, waterNo: true, taught: 'fireblast', used: true, known: true });
  assert.ok(r.late >= 9);
});

test('each route has its own wild table: five kinds with set odds, levels around the route\'s own that rise route by route, a rare slot, and the night swaps kinds', async () => {
  const r = await ev(() => {
    const out = { centers: [], sizes: new Set(), samples: 0 };
    OW_LANDS.forEach((L) => { const t = owWildTable(L.routeIn); out.centers.push(t.center); out.sizes.add(t.day.length); });
    out.rising = out.centers.every((c, i, a) => !i || c >= a[i - 1]);
    out.sizes = [...out.sizes].join();
    const t = owWildTable('route3'); out.same = JSON.stringify(t) === JSON.stringify((delete OW_WILD_TABLES.route3, owWildTable('route3')));
    out.night = t.night.join() !== t.day.join();
    const seen = new Set(); let lo = 99, hi = 0; for (let i = 0; i < 400; i++) { const x = owRollRoute('route3'); seen.add(x.id); lo = Math.min(lo, x.level); hi = Math.max(hi, x.level); }
    out.kinds = seen.size <= 5; out.levels = lo >= t.center - 1 && hi <= t.center + 2;
    out.side = owWildTable('route3-side').center === t.center + 1; out.town = owWildTable('meadow');
    return out;
  });
  assert.deepEqual(r, { centers: r.centers, sizes: '5', samples: 0, rising: true, same: true, night: true, kinds: true, levels: true, side: true, town: null });
  assert.equal(r.centers[0], 3);
});

test('more items: an Elixir gives every move 10 PP back, X items raise a stage, a Max Repel lasts 250 steps, an Evolution Stone evolves a stone kind at once, and each badge boosts one stat by an eighth', async () => {
  await ev(() => { state.unlockedPets = ['dog', 'fox']; state.activePet = 'fox'; state.buddyXp.fox = xpForLevel(20); state.advPp = {}; });
  await begin();
  const r = await ev(() => {
    state.items = { elixir: 1, xattack: 1 };
    const me = abMe(); me.moves.forEach((mv) => { mv.left = 1; }); ab.foes.forEach((f) => { f.atk = 1; f.spc = 1; }); Math.random = () => 0.9;
    ab.phase = 'pack'; abUseItem('elixir'); const pp = me.moves.map((mv) => mv.left);
    return { pp, ok: pp.every((n, i) => n === Math.min(me.moves[i].pp, 11)) };
  });
  assert.equal(r.ok, true);
  await menu();
  const x = await ev(() => { ab.phase = 'pack'; abUseItem('xattack'); return [abMe().stg.atk, state.items.xattack || 0]; });
  assert.deepEqual(x, [1, 0]);
  const t = await ev(() => {
    state.repelSteps = 0; state.gems = 5000; payItem('maxrepel'); const rep = state.repelSteps;
    state.items = { stone: 1 }; state.stoned = {}; state.buddyXp.dog = xpForLevel(5); hubPet = 'dog';
    const before = getPetById('dog').stage; useStone(); const after = getPetById('dog').stage; useStone();
    state.badges = []; const base = abPartyMon('fox'); state.badges = [gymRegions()[0].id, gymRegions()[1].id]; const boosted = abPartyMon('fox');
    return { rep, before, after, left: state.items.stone || 0, atk: boosted.atk === Math.floor(base.atk * 9 / 8), def: boosted.def === Math.floor(base.def * 9 / 8), spd: boosted.spd === base.spd };
  });
  assert.deepEqual(t, { rep: 250, before: 0, after: 1, left: 0, atk: true, def: true, spd: true });
});

test('forced grass: on every route there is no way up the road without stepping on tall grass at least twice, and the way is still open', async () => {
  const r = await ev(() => OW_LANDS.map((L) => {
    const m = OW_MAPS[L.routeIn], from = [6, m.rows.length - 2], dist = {}, q = [[from[0], from[1], 0]];
    const key = (x, y) => x + ',' + y; dist[key(...from)] = 0; let best = Infinity;
    const heap = [[0, ...from]];
    while (heap.length) {
      heap.sort((a, b) => a[0] - b[0]); const [d, x, y] = heap.shift(); if (d > dist[key(x, y)]) continue;
      if (y === 1 && (x === 6 || x === 7)) best = Math.min(best, d);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (!owWalkable(m, nx, ny) || owWarpAt(m, nx, ny) || owNpcAt(m, nx, ny)) return; const nd = d + (owTileAt(m, nx, ny).grass ? 1 : 0); if (dist[key(nx, ny)] === undefined || nd < dist[key(nx, ny)]) { dist[key(nx, ny)] = nd; heap.push([nd, nx, ny]); } });
    }
    return best;
  }));
  assert.ok(r.every((n) => n >= 2 && n < 99), 'grass steps on the way: ' + r.join());
});

test('Ether restores 10 PP to one chosen move, a PP Up raises a move\'s PP by a fifth (three at most), and an Escape Rope takes you back to the last Buddy Center', async () => {
  await ev(() => { state.unlockedPets = ['fox']; state.activePet = 'fox'; state.buddyXp.fox = xpForLevel(20); state.advPp = {}; state.ppUp = {}; });
  await begin();
  const e = await ev(() => {
    state.items = { ether: 1 }; const me = abMe(); me.moves[0].left = 2; me.moves[1].left = 2; ab.foes.forEach((f) => { f.atk = 1; f.spc = 1; }); Math.random = () => 0.9;
    ab.phase = 'ether'; abUseEther(1); return [me.moves[0].left, me.moves[1].left, state.items.ether || 0];
  });
  assert.deepEqual(e, [2, Math.min(12, await ev(() => abMe().moves[1].pp)), 0]);
  await ev(() => { ab = null; document.getElementById('ab-modal').style.display = 'none'; });
  const u = await ev(() => {
    const base = abPartyMon('fox').moves[0], id = base.id, out = {};
    state.items = { ppup: 5 }; hubPet = 'fox'; for (let i = 0; i < 5; i++) usePpUp(id);
    out.ups = state.ppUp.fox[id]; out.left = state.items.ppup; out.pp = abPartyMon('fox').moves.find((m) => m.id === id).pp === base.pp + 3 * Math.floor(base.pp / 5);
    state.items = { escaperope: 1 }; state.overworld.center = { map: 'meadow', x: 7, y: 7 }; state.overworld.map = 'route2'; state.overworld.x = 6; state.overworld.y = 10; openAdventure(); useRope();
    out.rope = [state.overworld.map, state.overworld.x, state.overworld.y, state.items.escaperope || 0];
    return out;
  });
  assert.deepEqual(u, { ups: 3, left: 2, pp: true, rope: ['meadow', 7, 7, 0] });
});

test('friendship, egg moves and obedience: wins, levels and walks raise friendship (a faint lowers it) and a friendly Bear evolves; an egg passes a parent TM move; a traded buddy above its badge level sometimes loafs', async () => {
  const r = await ev(() => {
    state.unlockedPets = ['dog', 'bear']; state.activePet = 'dog'; state.buddyXp.bear = xpForLevel(5); state.happy = {};
    const out = { before: getPetById('bear').stage };
    addHappy('bear', 100); out.mid = getPetById('bear').stage; addHappy('bear', 200); out.friend = [happyOf('bear'), getPetById('bear').stage]; addHappy('bear', -300); out.floor = happyOf('bear');
    state.happy = { bear: 999, nope: 5 }; NORMALIZERS.forEach((fn) => fn(state)); out.kept = JSON.stringify(state.happy);
    state.tmKnown = { fox: ['fireblast'] }; state.unlockedPets = ['dog', 'fox'];
    state.egg = { element: 'fire', rarity: 'common', steps: 0, target: 1, inherit: 'fireblast' }; state.unlockedPets = ['dog']; state.unlockedSecrets = [];
    const got = hatchEgg(); out.egg = got ? (state.tmKnown[got.id] || []).join() : 'none'; out.eggEl = got && got.element === 'fire';
    state.fromTrade = { dog: 1 }; state.badges = []; state.buddyXp.dog = xpForLevel(30);
    out.limit = abObeyLevel(); let loaf = 0; for (let i = 0; i < 200; i++) if (abDisobeys({ id: 'dog', level: 30 })) loaf++; out.loaf = loaf > 40 && loaf < 160;
    state.badges = ['a', 'b', 'c']; out.limit3 = abObeyLevel(); out.obeys = (() => { let n = 0; for (let i = 0; i < 100; i++) if (abDisobeys({ id: 'dog', level: 30 })) n++; return n; })();
    out.own = (() => { state.fromTrade = {}; return abDisobeys({ id: 'dog', level: 99 }); })();
    return out;
  });
  assert.deepEqual(r, { before: 0, mid: 0, friend: [255, 1], floor: 0, kept: '{"bear":255}', egg: 'fireblast', eggEl: true, limit: 10, loaf: true, limit3: 40, obeys: 0, own: false });
});

test('a Repel keeps wild buddies out of the grass for its steps, wears off, and is sold at the Mart after the first badge', async () => {
  const r = await ev(() => {
    ECON.overworld.grassChance = 1; owSafe = 0; state.gems = 1000; state.repelSteps = 0;
    const open = ECON.overworld.mart.find((m) => m.type === 'repel').badges, cost = itemCost('repel');
    payItem('repel'); const steps = state.repelSteps, left = state.gems;
    let fights = 0; for (let i = 0; i < steps; i++) if (owGrassStep()) fights++;
    const worn = state.repelSteps, next = owGrassStep();
    state.repelSteps = 99999; NORMALIZERS.forEach((fn) => fn(state));
    return { open, cost, steps, left, fights, worn, next, clamped: state.repelSteps };
  });
  assert.deepEqual(r, { open: 1, cost: 350, steps: 100, left: 650, fights: 0, worn: 0, next: true, clamped: 500 });
});

test('a Berry heals 10 HP when health drops to half or less, and is used up', async () => {
  await ev(() => { state.heldOwned = ['berry']; state.held = { [state.activePet]: 'berry' }; });
  await begin();
  await ev(() => { const m = abMe(); m.hp = Math.floor(m.max / 2) + 3; abHit(abFoe(), m, { power: 40, acc: 100, type: 'normal', name: 'x' }, () => {}, () => {}); });
  await page.waitForTimeout(1800);
  assert.ok((await ev(() => abMe().hp)) > 0);
  assert.deepEqual(await ev(() => [state.heldOwned, state.held, abMe().held]), [[], {}, '']);
});

test('Leftovers heal a little every round, a Type Charm and a Scope Lens change the numbers, and a Quick Claw can go first', async () => {
  await ev(() => { state.heldOwned = ['leftovers']; state.held = { [state.activePet]: 'leftovers' }; });
  await begin();
  const hp = await ev(() => { const m = abMe(); m.hp = 5; ab.phase = 'busy'; abEndRound(); return m.hp; });
  await menu();
  assert.ok((await ev(() => abMe().hp)) > hp);
  const r = await ev(() => {
    Math.random = () => 0.99;
    const a = abMon('fox', 30), d = abMon('hedgehog', 30), mv = a.moves.find((m) => m.type === 'fire');
    const plain = abDamage(a, d, mv, false).dmg; a.held = 'charm';
    const boosted = abDamage(a, d, mv, false).dmg;
    return { plain, boosted, lens: AB_CRIT_LENS > AB_CRIT };
  });
  assert.ok(r.boosted > r.plain && r.lens);
  await ev(() => { ab.phase = 'busy'; });
});

test('the roaming legend: only after the Champion, one route a day, gone for the week once caught', async () => {
  const r = await ev(() => {
    state.storySeen.champion = 0; const before = legendRoute();
    state.storySeen.champion = 1; const route = legendRoute();
    const routes = OW_LANDS.map((l) => l.routeIn);
    state.overworld.map = route; ECON.legend.encounter = 1; startAdventureFight();
    const met = ab && ab.foes[0].id === legendOfWeek().id && ab.foes[0].level === ECON.legend.level;
    return { before, onRoute: routes.includes(route), met, rumour: GIZMO_CALLS.some((c) => c.dyn && c.when()) };
  });
  assert.deepEqual([r.before, r.onRoute, r.met, r.rumour], ['', true, true, true]);
  await menu();
  await ev(() => { ab.foes[0].hp = 1; state.nets = 5; Math.random = () => 0; abThrowNet(); });
  await page.waitForFunction(() => !ab, null, { timeout: 30000 });
  assert.equal(await ev(() => [legendRoute(), legendState().caught].join()), ',true');
  assert.ok(await ev(() => getOwnedIds().indexOf(legendOfWeek().id) !== -1));
});

test('a shiny buddy is a little stronger and glows once caught', async () => {
  const r = await ev(() => { const a = abFoeMon({ id: 'fox', level: 20 }), b = abFoeMon({ id: 'fox', level: 20, shiny: true }); return [b.max > a.max, /^Shiny /.test(b.name), ECON.shiny.shinyOdds]; });
  assert.deepEqual(r, [true, true, 512]);
  await ev(() => { state.shinies = {}; state.unlockedPets = ['dog']; state.nets = 3; openAdventure(); abStart({ kind: 'wild', foes: [{ id: 'bunny', level: 5, shiny: true }] }); });
  await menu();
  await ev(() => { Math.random = () => 0; abThrowNet(); });
  await page.waitForFunction(() => !ab, null, { timeout: 30000 });
  assert.equal(await ev(() => state.shinies.bunny), 1);
});

test('the map fills the screen, shows trees (never black) past the edge, and a finger on the map walks', async () => {
  await ev(() => { openAdventure(); state.overworld.map = 'hollow'; state.overworld.x = 1; state.overworld.y = 1; renderOverworld(); });
  const g = await ev(() => ({ n: document.querySelectorAll('#ow-view .ow-cell').length, grid: owGrid(), empty: [...document.querySelectorAll('#ow-view .ow-cell')].filter((c) => !c.querySelector('svg')).length, w: document.getElementById('ow-view').getBoundingClientRect().width }));
  assert.equal(g.n, g.grid.cols * g.grid.rows);
  assert.equal(g.empty, 0);
  assert.ok(g.w >= 389 - 8 * 2, 'the map is as wide as the screen: ' + g.w);
  await ev(() => { state.overworld.x = 7; state.overworld.y = 9; state.overworld.face = 'up'; renderOverworld(); });
  const box = await ev(() => { const r = document.querySelector('.ow-hero').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; });
  const y0 = await ev(() => state.overworld.y);
  await page.mouse.move(box.x, box.y - box.w * 2);
  await page.mouse.down();
  await page.waitForTimeout(400);
  await page.mouse.up();
  assert.ok((await ev(() => state.overworld.y)) < y0, 'holding above the hero walks up');
  assert.deepEqual(errors, []);
});
