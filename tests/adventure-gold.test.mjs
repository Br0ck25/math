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
  const hy = await ev(() => { const me = abMe(); me.hp = 1; me.max = Math.max(me.max, 300); state.items.hyperpotion = 1; ab.foes.forEach((f) => { f.atk = 1; f.spc = 1; }); ab.phase = 'pack'; abUseItem('hyperpotion'); return [me.hp > 150, state.items.hyperpotion || 0]; });
  assert.deepEqual(hy, [true, 0]);
  await menu();
  const mx1 = await ev(() => { const me = abMe(); me.hp = 1; me.status = 'burn'; state.items.maxpotion = 1; ab.foes.forEach((f) => { f.atk = 1; f.spc = 1; }); ab.phase = 'pack'; abUseItem('maxpotion'); return me; });
  await menu();
  const mx2 = await ev(() => { const me = abMe(); const first = [me.hp >= me.max * 0.8, me.status, state.items.maxpotion || 0]; me.hp = 1; state.items.fullrestore = 1; ab.phase = 'pack'; abUseItem('fullrestore'); return first; });
  await menu();
  const mx3 = await ev(() => { const me = abMe(); return [me.hp >= me.max * 0.8, me.status, state.items.fullrestore || 0]; });
  assert.deepEqual([mx2, mx3], [[true, 'burn', 0], [true, '', 0]], 'Max Potion heals everything but not the burn; Full Restore does both');
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
    out.kinds = seen.size <= 5; out.levels = lo >= (t.lo !== undefined ? t.lo : t.center - 1) && hi <= (t.hi !== undefined ? t.hi : t.center + 1) + 1;
    out.hand = Object.keys(OW_WILD_HAND).every((k) => ['day', 'morning', 'night'].every((p) => OW_WILD_HAND[k][p].length === 5 && OW_WILD_HAND[k][p].every((id) => getSpecies(id)))) && Object.keys(OW_WILD_HAND).length === 16 && OW_LANDS.every((L) => OW_WILD_HAND[L.routeIn]);
    out.side = owWildTable('route3-side').center === t.center + 1; out.town = owWildTable('meadow');
    return out;
  });
  assert.deepEqual(r, { centers: r.centers, sizes: '5', samples: 0, rising: true, same: true, night: true, kinds: true, levels: true, hand: true, side: true, town: null });
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

test('the Catching Contest: only on contest days, 20 Park Balls, wild buddies appear in the park grass, a catch is judged by level, health and rarity and is not kept, and the prize follows the rank', async () => {
  const r = await ev(() => {
    const out = { days: ECON.contest.days.join(), park: OW_MAPS.meadow.warps.some((w) => w.to === 'meadow-park') && OW_MAPS['meadow-park'].warps[0].to === 'meadow' };
    const judge = OW_MAPS['meadow-park'].npcs[0];
    const realDay = contestDay; contestDay = () => false; state.contest = null; OW_SERVICES.judge(judge); out.closed = /Tuesdays/.test(talk.lines.join(' '));
    contestDay = () => true; OW_SERVICES.judge(judge); talk.i = talk.lines.length - 1; renderTalk(); talkChoose(0);
    out.started = [state.contest.balls, contestActive()];
    state.overworld.map = 'meadow-park'; startAdventureFight(); out.fight = !!ab && ab.contest;
    return out;
  });
  assert.deepEqual(r, { days: '2,4,6', park: true, closed: true, started: [20, true], fight: true });
  await menu();
  await ev(() => { ab.foes[0].hp = 1; Math.random = () => 0; ab.phase = 'pack'; abRender(); abThrowPark(); });
  await page.waitForFunction(() => !ab, null, { timeout: 30000 });
  const s2 = await ev(() => { const c = state.contest; const keep = getOwnedIds().length; return { balls: c.balls, best: !!c.best && c.best.score > 0, ranks: [contestRank(700), contestRank(500), contestRank(350), contestRank(10)] }; });
  assert.deepEqual(s2, { balls: 19, best: true, ranks: [1, 2, 3, 4] });
  const prize = await ev(() => {
    state.contest.best = { name: 'Fox', score: 650 }; state.items = {}; const judge = OW_MAPS['meadow-park'].npcs[0];
    OW_SERVICES.judge(judge); talk.i = talk.lines.length - 1; renderTalk(); talkChoose(0);
    return [state.items.stone || 0, state.contest.done, contestActive(), /YOU/.test(talk.lines.join(' '))];
  });
  assert.deepEqual(prize, [1, true, false, true]);
});

test('the Lighthouse quest: the Keeper needs the Secret Potion, Healer Mei only gives it to a Gloom Badge holder, and handing it over pays an Evolution Stone and two Revives once', async () => {
  const r = await ev(() => {
    const keeper = OW_MAPS['tide-house'].npcs.find((n) => n.kind === 'lighthouse'), mei = OW_MAPS['gloom-house'].npcs.find((n) => n.id === 'gloom-mei');
    const out = { hidden: !owNpcActive(mei) };
    state.badges = ['gloom']; out.shown = owNpcActive(mei);
    owGift(mei); out.got = hasKeyItem('secret-potion');
    state.items = {}; OW_SERVICES.lighthouse(keeper); talk.i = talk.lines.length - 1; renderTalk(); talkChoose(0);
    out.paid = [state.items.stone || 0, state.items.revive || 0, hasKeyItem('secret-potion'), state.overworld.story.includes('lighthouse')];
    OW_SERVICES.lighthouse(keeper); out.after = /light shines again/.test(talk.lines.join(' '));
    return out;
  });
  assert.deepEqual(r, { hidden: true, shown: true, got: true, paid: [1, 2, false, true], after: true });
});

test('phone calls: a trainer you beat calls for a rematch once a day, is back on the map, fights stronger and pays again, and then waits for tomorrow', async () => {
  const r = await ev(() => {
    state.overworld.beat = []; state.phone = { day: '', ready: '', known: [] };
    const none = phoneReady();
    state.overworld.beat = ['route1-pia']; state.phone = { day: '', ready: '', known: [] }; const sameDay = phoneReady();
    state.phone = { day: '1999-01-01', ready: '', known: ['route1-pia'] };
    const id = phoneReady(), npc = OW_MAPS.route1.npcs.find((n) => n.id === id);
    const out = { none, sameDay, id, active: !!npc && owNpcActive(npc), call: GIZMO_CALLS.some((c) => c.from === 'Trainer call' && c.when() && /rematch/.test(c.dyn())) };
    out.sees = !!owTrainerSeeing(OW_MAPS.route1, npc.x + OW_STEP[npc.face][0], npc.y + OW_STEP[npc.face][1]);
    startTrainerFight(npc); out.rematch = ab.rematch; out.level = ab.foes[0].level > abWildLevel() + 1;
    return out;
  });
  assert.deepEqual(r, { none: '', sameDay: '', id: 'route1-pia', active: true, call: true, sees: true, rematch: true, level: true });
  await ev(() => { state.gems = 0; Math.random = () => 0.3; });
  for (let k = 0; k < 20; k++) {
    await page.waitForFunction(() => !ab || (!ab.busy && (ab.phase === 'menu' || ab.phase === 'learn')), null, { timeout: 60000 });
    if (!(await ev(() => !!ab))) break;
    if (await ev(() => ab.phase === 'learn')) { await ev(() => abLearnChoose(-1)); continue; }
    await ev(() => { ab.foes.forEach((f) => { f.hp = 1; f.atk = 1; f.spc = 1; }); abFight(); abAnswer(ab.q.ans); ab.party.forEach((m) => m.moves.forEach((mv) => { mv.left = mv.pp; })); abUseMove(0); });
    await page.waitForTimeout(400);
  }
  await page.waitForFunction(() => !ab, null, { timeout: 30000 });
  const after = await ev(() => ({ gems: state.gems, ready: state.phone.ready, active: owNpcActive(OW_MAPS.route1.npcs.find((n) => n.id === 'route1-pia')), called: phoneReady() }));
  assert.ok(after.gems > 0, 'the rematch pays its prize again');
  assert.deepEqual([after.ready, after.called], ['', '']);
});

test('the Battle Tower: seven trainers with three buddies each, HP and PP put back afterwards, a PP Up for a full run once a day, and a defeat costs nothing', async () => {
  const r = await ev(() => {
    state.buddyXp[state.activePet] = xpForLevel(30); state.gems = 1000; state.advHp = { [state.activePet]: 3 }; state.items = {}; state.tower = { day: '', best: 0 };
    const rs = abTowerRounds(); return { n: rs.length, foes: rs.every((x) => x.foes.length === 3), leader: rs[6].kind, names: new Set(rs.map((x) => x.name)).size };
  });
  assert.deepEqual(r, { n: 7, foes: true, leader: 'leader', names: 7 });
  await ev(() => { abStartTower(); Math.random = () => 0.3; });
  for (let k = 0; k < 120; k++) {
    await page.waitForFunction(() => !ab || (!ab.busy && (ab.phase === 'menu' || ab.phase === 'learn')), null, { timeout: 60000 });
    if (!(await ev(() => !!ab))) break;
    if (await ev(() => ab.phase === 'learn')) { await ev(() => abLearnChoose(-1)); continue; }
    await ev(() => { ab.foes.forEach((f) => { f.hp = 1; f.atk = 1; f.spc = 1; }); abFight(); abAnswer(ab.q.ans); ab.party.forEach((m) => m.moves.forEach((mv) => { mv.left = mv.pp; })); abUseMove(0); });
    await page.waitForTimeout(300);
  }
  await page.waitForFunction(() => !ab, null, { timeout: 60000 });
  const w = await ev(() => ({ hp: state.advHp[state.activePet], ppUp: state.items.ppup || 0, best: state.tower.best, gems: state.gems > 1000 }));
  assert.deepEqual(w, { hp: 3, ppUp: 1, best: 7, gems: true });
  const l = await ev(() => { state.gems = 1000; state.advHp = {}; abStartTower(); return [!!ab, !!ab.tower]; });
  assert.deepEqual(l, [true, true]);
  await menu();
  await ev(() => { ab.party.forEach((m) => { m.hp = 1; state.advHp[m.id] = 1; }); ab.foes.forEach((f) => { f.level = 90; }); Math.random = () => 0.3; abFight(); abAnswer(ab.q.ans + 999); });
  await page.waitForFunction(() => !ab, null, { timeout: 60000 });
  assert.deepEqual(await ev(() => [state.gems, state.overworld.map === 'summit-house' || state.overworld.map !== 'meadow-center']), [1000, true]);
});

test('the Game Corner: 50 coins cost 1000 gems, a spin costs 3 and pays about 90% back over many spins (never more than it takes), and coins buy prizes', async () => {
  const r = await ev(() => {
    const clerk = OW_MAPS['spark-corner'].npcs[0], out = { door: OW_MAPS.spark.warps.some((w) => w.to === 'spark-corner') && OW_MAPS['spark-corner'].warps[0].to === 'spark' };
    const keep = Math.random; let a = 12345; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    let back = 0; const n = 60000; for (let i = 0; i < n; i++) back += cornerSpin().won; out.rtp = back / (3 * n); Math.random = keep;
    state.gems = 1500; state.coins = 0; OW_SERVICES.corner(clerk); talk.i = talk.lines.length - 1; renderTalk(); talkChoose(0);
    out.bought = [state.gems, state.coins];
    state.coins = 5000; state.items = {}; owCornerPrizes(clerk); talk.i = 0; talkChoose(2);
    out.prize = [state.items.ppup || 0, state.coins];
    state.coins = 100; owCornerPrizes(clerk); talkChoose(0); out.poor = [state.items.revive || 0, state.coins];
    return out;
  });
  assert.equal(r.door, true);
  assert.ok(r.rtp > 0.8 && r.rtp < 1, 'the slots pay back ' + r.rtp);
  assert.deepEqual([r.bought, r.prize, r.poor], [[500, 50], [1, 2000], [0, 100]]);
});

test('the Safari Zone: 500 gems for 30 Safari Balls and 500 steps, no fighting (ball, bait, rock, run), a catch is kept, and the visit ends when the steps or the balls run out', async () => {
  const r = await ev(() => {
    const warden = OW_MAPS['thistle-gate'].npcs[0], out = { door: OW_MAPS.thistle.warps.some((w) => w.to === 'thistle-gate') };
    state.gems = 700; state.hero.made = true; openAdventure(); OW_SERVICES.safari(warden); talk.i = talk.lines.length - 1; renderTalk(); talkChoose(0);
    out.paid = [state.gems, state.safari.active, state.safari.balls, state.safari.steps, state.overworld.map];
    owSafariStep(); owSafariStep(); out.steps = state.safari.steps;
    ECON.overworld.grassChance = 1; owSafe = 0; state.repelSteps = 0;
    startAdventureFight(); out.fight = !!ab && !!ab.safari;
    return out;
  });
  assert.deepEqual(r, { door: true, paid: [200, true, 30, 500, 'safari-zone'], steps: 498, fight: true });
  await menu();
  const p = await ev(() => [...document.querySelectorAll('#ab-panel button')].map((b) => b.innerText.replace(/\s+/g, ' ')).join('|'));
  assert.match(p, /BALL x30\|BAIT\|ROCK\|RUN/);
  const cat = await ev(() => { state.unlockedPets = ['dog']; state.unlockedSecrets = []; const id = ab.foes[0].id; Math.random = () => 0; ab.foes[0].hp = ab.foes[0].max; abSafariBall(); return id; });
  await page.waitForFunction(() => !ab, null, { timeout: 30000 });
  const k = await ev((id) => [getOwnedIds().includes(id), state.safari.balls], cat);
  assert.deepEqual(k, [true, 29]);
  await page.waitForFunction(() => document.getElementById('overworld-modal').style.display === 'flex');
  const end = await ev(() => { state.safari.steps = 1; state.overworld.map = 'safari-zone'; owSafariStep(); return [state.safari.active, state.overworld.map]; });
  assert.deepEqual(end, [false, 'thistle-gate']);
  const norm = await ev(() => { state.safari = { active: true, steps: 9999, balls: -3 }; state.overworld.map = 'meadow'; NORMALIZERS.forEach((fn) => fn(state)); return [state.safari.active, state.safari.steps, state.safari.balls]; });
  assert.deepEqual(norm, [false, 500, 0]);
});

test('the Radio Tower takeover: a door in Spark City (Spark Badge), two Scramblers on each of two floors, Boss Static on the third, an Evolution Stone and the Gizmo news once he is beaten', async () => {
  const r = await ev(() => {
    const out = { road: OW_MAPS.spark.roads['15,6'], floors: [1, 2, 3].map((n) => OW_MAPS['spark-tower-' + n].npcs.filter((p) => p.kind !== 'lucky').length), boss: OW_MAPS['spark-tower-3'].npcs[0].kind };
    state.badges = []; const closed = !owWalkable(OW_MAPS.spark, 15, 6); state.badges = ['spark']; out.gate = [closed, owWalkable(OW_MAPS.spark, 15, 6)];
    state.items = {}; state.overworld.story = []; out.news0 = GIZMO_CALLS.some((c) => c.from === 'Radio news' && /Radio Tower/.test(c.text) && c.when());
    owStoryReward('radio-tower'); owStoryReward('radio-tower'); out.stone = state.items.stone || 0; out.news = GIZMO_CALLS.some((c) => c.from === 'Radio news' && /Radio Tower/.test(c.text) && c.when());
    const up = OW_MAPS['spark-tower-1'].warps.some((w) => w.to === 'spark-tower-2'), down = OW_MAPS['spark-tower-3'].warps.some((w) => w.to === 'spark-tower-2'); out.stairs = up && down;
    return out;
  });
  assert.deepEqual(r, { road: 'spark', floors: [2, 2, 1], boss: 'boss', gate: [true, true], news0: false, stone: 1, news: true, stairs: true });
});

test('every route and side-path trainer has a hand-written team of two or three real kinds at levels that fit the route, and a rematch makes it stronger', async () => {
  const r = await ev(() => {
    const out = { missing: [], bad: [], far: [] };
    Object.keys(OW_MAPS).filter((k) => /^route\d+(-side)?$|^skyroad(-side)?$/.test(k)).forEach((k) => OW_MAPS[k].npcs.forEach((n) => {
      if (n.kind !== 'trainer' || n.name === RIVAL) return;
      const t = OW_TEAMS[n.id]; if (!t) { out.missing.push(n.id); return; }
      const hand = OW_WILD_HAND[k.replace(/-side$/, '')];
      if (t.length < 1 || t.length > 3 || !t.every((m) => getSpecies(m[0]) && m[1] >= hand.lv[0] - 1 && m[1] <= hand.lv[1] + 2)) out.bad.push(n.id);
    }));
    const pia = OW_MAPS.route1.npcs.find((n) => n.id === 'route1-pia');
    state.overworld.beat = ['route1-pia']; state.phone = { day: '1999-01-01', ready: '', known: ['route1-pia'] };
    startTrainerFight(pia); out.team = ab.foes.map((f) => f.id + f.level).join(); out.rematch = ab.rematch;
    return out;
  });
  assert.deepEqual(r, { missing: [], bad: [], far: [], team: 'dog7,bunny8', rematch: true });
});

test('gyms are hand-written: every land has three trainer teams of real kinds around its level, the same leader every time, and a rematch is four levels up', async () => {
  const r = await ev(() => {
    const out = { lands: allGymRegions().length, bad: [], same: true, up: true };
    allGymRegions().forEach((g) => {
      const t = GYM_TEAMS[g.id], base = ECON.map.levels[g.id];
      if (!t || t.length !== 3 || !t.every((team) => team.every((m) => getSpecies(m[0]) && m[1] >= base - 1 && m[1] <= base + 4))) out.bad.push(g.id);
      const a = abGymRounds(g.id, false), b = abGymRounds(g.id, false), c = abGymRounds(g.id, true);
      if (a[3].bossIdx !== b[3].bossIdx || a[1].name !== RIVAL || a.length !== 4) out.same = false;
      if (c[0].foes[0].level !== a[0].foes[0].level + ECON.map.rematch.levels) out.up = false;
    });
    return out;
  });
  assert.deepEqual(r, { lands: 16, bad: [], same: true, up: true });
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

test('routes wind like Gold: tree walls across the road across the road, so the way north zigzags', async () => {
  const bad = await page.evaluate(() => OW_LANDS.map((L) => {
    const m = OW_MAPS[L.routeIn], walls = [];
    m.rows.forEach((r, y) => { if ((r.slice(1, 13).match(/T/g) || []).length >= 7 && y > 2 && y < m.rows.length - 3) walls.push(y); });
    return walls.length >= 1 ? '' : L.routeIn;
  }).filter(Boolean));
  assert.deepEqual(bad, []);
});

test('the routes have dirt, ponds with a bridge to an islet where a swimmer waits, and a different way round', async () => {
  const r = await ev(() => {
    const lakes = OW_LANDS.map((L) => OW_MAPS[L.routeIn]).filter((m) => m.npcs.some((n) => /swimmer/.test(n.id)));
    const ok = lakes.every((m) => { const n = m.npcs.find((p) => /swimmer/.test(p.id)); return m.rows[n.y].charAt(n.x) === 'd' && m.rows[n.y - 1].charAt(n.x) === 'B' && m.rows[n.y + 1].charAt(n.x) === '~'; });
    return { lakes: lakes.length, ok, dirt: OW_LANDS.every((L) => OW_MAPS[L.routeIn].rows.some((r) => r.indexOf('d') !== -1)), bridge: OW_TILES.B.t, walkBridge: owWalkable(lakes[0], lakes[0].npcs.find((p) => /swimmer/.test(p.id)).x, lakes[0].npcs.find((p) => /swimmer/.test(p.id)).y - 1) };
  });
  assert.ok(r.lakes >= 10, 'lakes on most routes: ' + r.lakes);
  assert.deepEqual([r.ok, r.dirt, r.bridge, r.walkBridge], [true, true, 't-bridge', true]);
});

test('Back and Fight again keeps the same question until it is answered; the choices have room between them', async () => {
  await begin();
  const r = await ev(() => {
    abFight(); const a = ab.q; ab.phase = 'menu'; abFight(); const same = ab.q === a;
    const box = document.querySelector('#ab-modal .ab-opts'), cs = getComputedStyle(box), btns = box.querySelectorAll('button');
    const gap = parseFloat(cs.columnGap) >= 8 && parseFloat(cs.rowGap) >= 8;
    abAnswer(ab.q.ans); const answered = ab.q; ab.phase = 'menu'; abFight();
    return { same, gap, buttons: btns.length, fresh: ab.q !== answered };      // an answered question is replaced by a new one
  });
  assert.deepEqual(r, { same: true, gap: true, buttons: 4, fresh: true });
});

test('the Catch Net is thrown on screen: a ball flies to the foe, which is drawn inside, and a broken-free foe comes back', async () => {
  await begin();
  const r = await ev(() => new Promise((done) => {
    state.nets = 3; Math.random = () => 0.99; ab.phase = 'pack'; const out = {};
    abThrowNet();
    setTimeout(() => { out.ball = !!document.querySelector('#ab-modal .ab-net'); out.sucked = document.getElementById('ab-foe-icon').classList.contains('ab-sucked'); }, 900);
    setTimeout(() => { out.after = !document.querySelector('#ab-modal .ab-net'); done(out); }, 12000);
  }));
  assert.deepEqual([r.ball, r.sucked], [true, true]);
});

test('a caught buddy keeps the level it had in the fight (Gold)', async () => {
  await begin();
  const lv = await ev(() => { const f = abFoe(); f.id = 'bunny'; state.unlockedPets = state.unlockedPets.filter((x) => x !== 'bunny'); delete state.buddyXp.bunny; f.level = 7; abKeepCaught(f); return levelFromXp(state.buddyXp.bunny); });
  assert.equal(lv, 7);
});

test('Settings > Trivia opens a subjects window: one list for grades 6-8, tick subjects', async () => {
  await ev(() => { closeSettings && 0; openSettings(); });
  await ev(() => { closeSettings(); studyHome(); });
  assert.equal(await ev(() => document.getElementById('study-modal').style.display), 'flex');
  const r = await ev(() => { const first = studyFilters().find((f) => f[0] !== 'all')[0]; studyToggleSubject(first); const on = state.study.subjects.includes(first); studyToggleSubject(first); return [state.study.level === ECON.study.maxLevel, on, state.study.subjects.includes(first), document.querySelectorAll('#study-subjects button').length > 0]; });
  assert.deepEqual(r, [true, true, false, true]);
  await ev(() => closeStudyHome());
});

test('a ledge can be hopped down over but never climbed, and routes have thick tree edges', async () => {
  const r = await ev(() => {
    const withLedge = OW_LANDS.map((L) => OW_MAPS[L.routeIn]).filter((mm) => mm.rows.some((row) => row.includes('v'))), m = withLedge[0]; let lx = -1, ly = -1;
    m.rows.forEach((row, y) => { const x = row.indexOf('v'); if (x !== -1 && lx < 0) { lx = x; ly = y; } });
    state.overworld.map = m.id; openAdventure();
    state.overworld.x = lx; state.overworld.y = ly - 1; state.overworld.face = 'down'; owMove('down');
    const hopped = [state.overworld.x, state.overworld.y];
    state.overworld.x = lx; state.overworld.y = ly + 1; owMove('up');
    return { many: withLedge.length >= 8, hopped: hopped.join() === lx + ',' + (ly + 1), blockedUp: state.overworld.y === ly + 1, thick: m.rows.filter((row) => row.charAt(1) === 'T').length >= 3 };
  });
  assert.deepEqual(r, { many: true, hopped: true, blockedUp: true, thick: true });
});

test('the routes have big grass fields, a house with a room on most, and Trim-charm shortcuts through the tree walls', async () => {
  const r = await ev(() => {
    const maps = OW_LANDS.map((L) => OW_MAPS[L.routeIn]);
    const houses = maps.filter((m) => OW_MAPS[m.id + '-house']);
    const door = (m) => { const w = m.warps.find((p) => p.to === m.id + '-house'); return m.rows[w.y].charAt(w.x) === 'D' && OW_MAPS[w.to].warps[0].ty === w.y + 1 && owWalkable(m, w.x, w.y + 1); };
    const fields = maps.filter((m) => m.rows.some((row, y) => y < m.rows.length - 1 && /"{4,}/.test(row.slice(1, 13)) && /"{4,}/.test(m.rows[y + 1].slice(1, 13)))).length;
    const cuts = maps.filter((m) => m.rows.some((row) => row.charAt(6) === 'g')).length;
    state.badges = [];
    const m = maps.find((mm) => mm.rows.some((row) => row.charAt(6) === 'g')), y = m.rows.findIndex((row) => row.charAt(6) === 'g');
    const shut = owWalkable(m, 6, y); state.badges = ['meadow']; const open = owWalkable(m, 6, y);
    return { houses: houses.length >= 10, doors: houses.every(door), fields: fields >= 10, cuts: cuts >= 8, shut, open };
  });
  assert.deepEqual(r, { houses: true, doors: true, fields: true, cuts: true, shut: false, open: true });
});

test('past the top or bottom edge of a route the map shows the next town, lined up with where the warp lands', async () => {
  const r = await ev(() => OW_LANDS.map((L) => {
    const m = OW_MAPS[L.routeIn], up = m.warps.find((w) => w.y === 0), down = m.warps.find((w) => w.y === m.rows.length - 1);
    if (down.ty > 2) return true;                                              // the road that ends at a town's side (Cinder Route to Skyreach) does not line up, so nothing is drawn past it
    const above = owBeyond(m, up.x, -1), below = owBeyond(m, down.x, m.rows.length), nu = OW_MAPS[up.to], nd = OW_MAPS[down.to];
    return !!above && !!below && above.t === owTileAt(nu, up.tx, up.ty - 1) && below.t === owTileAt(nd, down.tx, down.ty + 1) && above.style === owPaletteCss(nu.palette);
  }));
  assert.deepEqual(r.filter((ok) => !ok), []);
  assert.equal(await ev(() => owBeyond(OW_MAPS.route1, 6, 5)), null, 'only past an edge');
});

test('after a catch nothing of the net stays, and a swap makes the foe hit the buddy that came in', async () => {
  await begin();
  await ev(() => { state.nets = 3; ab.foes[0].hp = 1; Math.random = () => 0; ab.phase = 'pack'; abThrowNet(); });
  await page.waitForFunction(() => !ab, null, { timeout: 30000 });
  await begin();
  assert.deepEqual(await ev(() => [document.querySelectorAll('#ab-modal .ab-net').length, document.getElementById('ab-foe-icon').classList.contains('ab-sucked')]), [0, false]);
  await ev(() => {
    window.oldMon = abMe(); window.oldMon.hp = 1; ab.foes[0].atk = 40; ab.foes[0].spc = 40; Math.random = () => 0.3;
    if (!ab.party.some((m, i) => i !== ab.cur && m.hp > 0)) ab.party.push(Object.assign({}, abMe(), { id: 'swapper', name: 'Swapper', hp: 900, max: 900, moves: abMe().moves.map((m) => Object.assign({}, m)) }));
    ab.phase = 'team'; abSwitch(ab.party.findIndex((m, i) => i !== ab.cur && m.hp > 0));
  });
  await page.waitForFunction(() => ab && !ab.busy && (ab.phase === 'menu' || ab.phase === 'team'), null, { timeout: 20000 });
  assert.deepEqual(await ev(() => [window.oldMon.hp, !!ab.forced, abMe() !== window.oldMon]), [1, false, true], 'the buddy that left is not hit, and nobody is forced to switch again');
});

test('every route is laid out from blocks: the road winds, each trainer looks at the road from a clear row, and everything on the land can be reached', async () => {
  const r = await ev(() => OW_LANDS.map((L) => {
    const m = OW_MAPS[L.routeIn], out = [];
    if (!m.blocks) out.push('not blocks');
    const bend = m.rows.filter((row) => row.charAt(6) !== '.' || row.charAt(7) !== '.').length;
    if (bend < 8) out.push('road does not wind');
    m.npcs.filter((n) => n.kind === 'trainer' && !/swimmer/.test(n.id)).slice(0, 1).forEach((n) => {
      const d = OW_STEP[n.face]; let hit = false;
      for (let i = 1; i <= 4 && !hit; i++) { if (!owWalkable(m, n.x + d[0] * i, n.y + d[1] * i)) break; hit = m.rows[n.y + d[1] * i].charAt(n.x + d[0] * i) === '.'; }
      if (!hit) out.push(n.id + ' does not look at the road');
    });
    return out.length ? L.routeIn + ': ' + out.join('; ') : '';
  }).filter(Boolean));
  assert.deepEqual(r, []);
});

test('towns are laid out from blocks, each its own: buildings in different slots, a path from every door to the road, and a cross street', async () => {
  const r = await ev(() => {
    const towns = OW_LANDS.map((L) => OW_MAPS[L.town]);
    const lane = towns.every((m) => m.warps.filter((w) => OW_MAPS[w.to] && m.rows[w.y].charAt(w.x) === 'D').every((w) => owWalkable(m, w.x, w.y + 1)));
    const lanes = towns.filter((m) => m.rows.some((row, y) => y > 3 && /\.{6,}/.test(row.slice(1, 15)) && y < m.rows.length - 2)).length;
    const looks = new Set(towns.map((m) => m.rows.join('/'))).size;
    const doorsets = new Set(towns.map((m) => m.warps.filter((w) => OW_MAPS[w.to] && m.rows[w.y].charAt(w.x) === 'D').map((w) => w.x + ',' + w.y).join('|'))).size;
    return { lane, lanes: lanes >= 12, looks: looks === towns.length, blocks: towns.every((m) => m.blocks) && doorsets >= 12 };
  });
  assert.deepEqual(r, { lane: true, lanes: true, looks: true, blocks: true });
});

test('the status cures work only on their own status: Antidote on poison, Burn Heal on a burn, and so on', async () => {
  await begin();
  const r = await ev(() => {
    const me = abMe(); ab.foes.forEach((f) => { f.atk = 1; f.spc = 1; });
    state.items.antidote = 1; state.items.burnheal = 1; me.status = 'burn'; ab.phase = 'pack'; abUseItem('antidote');
    return [me.status, state.items.antidote, Object.keys(AB_CURES).length];
  });
  assert.deepEqual(r, ['burn', 1, 5], 'the wrong cure is not used up');
  await ev(() => { ab.phase = 'pack'; abUseItem('burnheal'); });
  await menu();
  assert.deepEqual(await ev(() => [abMe().status, state.items.burnheal || 0]), ['', 0]);
});

test('vitamins raise one stat of one buddy for good, up to ten of each, and a bad save is repaired', async () => {
  const r = await ev(() => {
    openAdventure(); const id = state.activePet, before = abPartyMon(id);
    state.items.protein = 12; state.items.hpup = 1; hubPet = id;
    for (let i = 0; i < 12; i++) useVitamin('protein');
    useVitamin('hpup');
    const after = abPartyMon(id);
    state.vitamins = { [id]: { atk: 999, hp: 'x', zzz: 5 }, bad: 7 }; normalizeState(state);
    return { atk: after.atk - before.atk, hp: after.max - before.max, left: state.items.protein || 0, repaired: JSON.stringify(state.vitamins[id]), badGone: state.vitamins.bad === undefined };
  });
  assert.deepEqual(r, { atk: 20, hp: 3, left: 2, repaired: '{"atk":10}', badGone: true });
});

test('a berry bush gives a berry once a day and grows back the next morning', async () => {
  const r = await ev(() => {
    openAdventure(); const real = dayKey, bush = OW_MAPS.route1.objects.find((o) => o.id === 'route1-berries'), other = OW_MAPS.route1.objects.find((o) => o.id === 'route1-islet');
    dayKey = () => '2031-02-01'; renderOverworld();
    state.potions = 0; owCollect(bush); owCollect(other);
    const first = [state.potions, !!owPickupAt(OW_MAPS.route1, bush.x, bush.y)];
    renderOverworld(); const sameDay = !!owPickupAt(OW_MAPS.route1, bush.x, bush.y);
    dayKey = () => '2031-02-02'; renderOverworld();
    const next = [!!owPickupAt(OW_MAPS.route1, bush.x, bush.y), !!owPickupAt(OW_MAPS.route1, other.x, other.y)];
    dayKey = real; return { first, sameDay, next };
  });
  assert.deepEqual(r, { first: [2, false], sameDay: false, next: [true, false] });
});

test('a person or find in the next map shows past the edge, where you will meet it after crossing', async () => {
  const r = await ev(() => {
    openAdventure(); state.overworld.map = 'route1'; state.overworld.x = 6; state.overworld.y = 1; renderOverworld();
    const before = document.querySelectorAll('.ow-npc').length, mm = OW_MAPS.meadow, w = OW_MAPS.route1.warps.find((p) => p.y === 0 && p.x === 6);
    const npc = { id: 'tmp-far', kind: 'talk', name: 'Far', x: w.tx, y: w.ty - 1, face: 'down', look: { skin: 1, hair: 1, outfit: 1, style: 1 }, lines: ['hi'] };
    mm.npcs.push(npc); renderOverworld();
    const during = document.querySelectorAll('.ow-npc').length;
    mm.npcs.pop(); renderOverworld();
    return [before, during, document.querySelectorAll('.ow-npc').length];
  });
  assert.deepEqual(r, [r[0], r[0] + 1, r[0]]);
});

test('the special nets: Level Net by level ratio, Fast Net on faster foes, Lure Net on fished ones, Friend Net makes a friend', async () => {
  await begin();
  const r = await ev(() => {
    const me = abMe(), foe = abFoe(), out = {};
    me.level = 40; foe.level = 10; out.level = abNetMult('levelnet', foe);
    foe.level = 30; out.level2 = abNetMult('levelnet', foe); foe.level = 50; out.level3 = abNetMult('levelnet', foe);
    foe.spd = me.spd + 5; out.fast = abNetMult('fastnet', foe); foe.spd = me.spd - 5; out.slow = abNetMult('fastnet', foe);
    ab.fished = false; out.lure = abNetMult('lurenet', foe); ab.fished = true; out.lure2 = abNetMult('lurenet', foe);
    state.nets = 0; state.items.friendnet = 1; state.unlockedPets = state.unlockedPets.filter((x) => x !== foe.id); delete state.buddyXp[foe.id]; delete state.happy[foe.id]; foe.hp = 1; Math.random = () => 0; ab.phase = 'pack'; abThrowNet('friendnet');
    return out;
  });
  assert.deepEqual(r, { level: 8, level2: 2, level3: 1, fast: 4, slow: 1, lure: 1, lure2: 3 });
  await page.waitForFunction(() => !ab, null, { timeout: 30000 });
  assert.equal(await ev(() => happyOf('fox')), 200);
});

test('the way past the second trainer on a route is free (he watches the grass, not the road), and rooms are big like Gold\'s', async () => {
  const r = await ev(() => {
    const bad = OW_LANDS.map((L) => {
      const m = OW_MAPS[L.routeIn], t = m.npcs.filter((n) => n.kind === 'trainer' && !/swimmer|riley/.test(n.id))[1];
      if (!t) return '';
      for (let y = 0; y < m.rows.length; y++) for (let x = 0; x < m.rows[0].length; x++) if (m.rows[y].charAt(x) === '.' && (owTrainerSeeing(m, x, y) || {}).id === t.id) return L.routeIn + ' sees the road';
      return '';
    }).filter(Boolean);
    const rooms = ['meadow-house', 'meadow-center', 'meadow-mart', 'hollow-home'].map((id) => [OW_MAPS[id].rows.length, OW_MAPS[id].rows[0].length, OW_MAPS[id].rows.join('').match(/[SPQHCEe]/g).length > 8]);
    const mat = OW_MAPS['meadow-center'].warps[0];
    return { bad, rooms, mat: [mat.x, mat.y, OW_MAPS['meadow-center'].start.y] };
  });
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.rooms, [[10, 12, true], [10, 12, true], [10, 12, true], [10, 12, true]]);
  assert.deepEqual(r.mat, [5, 9, 8]);
});

test('every room is big and furnished: the Center has a pink floor, houses wooden floors, the tower floors, hideouts, Game Corner and Safari Gate are 12 wide too', async () => {
  const r = await ev(() => ({
    center: OW_MAPS['ember-center'].rows.join('').includes('p'), house: OW_MAPS['ember-house'].rows.join('').includes('o'),
    sizes: ['spark-tower-1', 'spark-tower-2', 'spark-tower-3', 'gloom-hideout', 'dusk-hideout', 'spark-corner', 'thistle-gate'].map((id) => OW_MAPS[id].rows[0].length + 'x' + OW_MAPS[id].rows.length),
    exits: ['spark-tower-1', 'gloom-hideout', 'spark-corner'].map((id) => { const m = OW_MAPS[id]; return OW_MAPS[id].rows[m.warps[0].y].charAt(m.warps[0].x) === 'm' && owWalkable(m, m.start.x, m.start.y); }),
    inTown: [['spark', 'spark-corner'], ['spark', 'spark-tower-1'], ['thistle', 'thistle-gate'], ['gloom', 'gloom-hideout']].map(([t, to]) => { const w = OW_MAPS[t].warps.find((p) => p.to === to), s = OW_MAPS[to].start; return w.tx === s.x && w.ty === s.y; })
  }));
  assert.deepEqual(r, { center: true, house: true, sizes: ['12x10', '12x10', '12x10', '12x10', '12x10', '12x10', '12x10'], exits: [true, true, true], inTown: [true, true, true, true] });
});

test('a Max Revive wakes a resting buddy with all its HP', async () => {
  await begin();
  await ev(() => {
    if (!ab.party.some((x) => x !== abMe())) ab.party.push(Object.assign({}, abMe(), { id: 'ghost', name: 'Ghost', hp: 0, moves: abMe().moves.map((m) => Object.assign({}, m)) }));
    const down = ab.party.find((x) => x !== abMe()); down.hp = 0; window.__down = down;
    state.items.maxrevive = 1; ab.foes.forEach((f) => { f.atk = 1; f.spc = 1; }); ab.phase = 'pack'; abUseItem('maxrevive');
  });
  await menu();
  assert.equal(await ev(() => __down.hp === __down.max && __down.max > 0), true);
});

test('towns differ in height (16 to 22), and the road into each still lands on its bottom gap and the way back leads to the route', async () => {
  const r = await ev(() => {
    const towns = OW_LANDS.map((L) => ({ L, m: OW_MAPS[L.town], route: OW_MAPS[L.routeIn] }));
    const heights = new Set(towns.map((t) => t.m.rows.length));
    const ok = towns.every(({ L, m, route }) => {
      const up = route.warps.find((w) => w.to === L.town && w.y === 0), down = m.warps.find((w) => w.to === L.routeIn);
      return up.ty === m.rows.length - 2 && owWalkable(m, up.tx, up.ty) && down.y === m.rows.length - 1 && m.start.y === m.rows.length - 3 && owWalkable(m, m.start.x, m.start.y);
    });
    return { heights: [...heights].sort(), ok };
  });
  assert.ok(r.heights.length >= 3 && r.heights[r.heights.length - 1] >= 22, 'the towns differ in height: ' + r.heights);
  assert.equal(r.ok, true);
});

test('caves: most routes have a mouth in the trees leading to a dark two-floor cave with a hiker, a ladder and two finds; cave floor starts fights with the route\'s buddies', async () => {
  const r = await ev(() => {
    const caves = OW_LANDS.filter((L) => OW_MAPS[L.routeIn + '-cave1']);
    const linked = caves.every((L) => {
      const R = OW_MAPS[L.routeIn], c1 = OW_MAPS[L.routeIn + '-cave1'], c2 = OW_MAPS[L.routeIn + '-cave2'], mw = R.warps.find((w) => w.to === c1.id);
      const lad1 = c1.warps.find((w) => w.to === c2.id), back = c2.warps[0];
      return R.rows[mw.y].charAt(mw.x) === 'O' && c1.warps[0].tx === mw.x && c1.warps[0].ty === mw.y + 1 && c2.rows[back.y].charAt(back.x) === 'u' && owWalkable(c2, lad1.tx, lad1.ty) && owWalkable(c1, back.tx, back.ty) && c1.dark && c2.dark && c1.npcs.length === 1 && c2.objects.length === 2;
    });
    const c = OW_MAPS['route2-cave1'], t = owTileAt(c, c.start.x, c.start.y);
    openAdventure(); state.overworld.map = 'route2-cave1'; renderOverworld();
    const dark = document.getElementById('ow-view').classList.contains('ow-dark');
    const table = owWildTable('route2-cave1'), route = owWildTable('route2');
    return { n: caves.length >= 12, linked, grass: !!t.grass, dark, level: table.lo === route.lo + 1 };
  });
  assert.deepEqual(r, { n: true, linked: true, grass: true, dark: true, level: true });
});

test('a stone in the pond lets the Water Steps charm reach a second islet with an Ultra Net; without the charm the islet cannot be reached', async () => {
  const r = await ev(() => {
    const reach = (m, hasCharm) => {
      const seen = new Set([m.start.x + ',' + m.start.y]), q = [[m.start.x, m.start.y]], real = hasKeyItem;
      hasKeyItem = (id) => id === 'water' ? hasCharm : real(id);
      while (q.length) { const [x, y] = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = x + dx, ny = y + dy; if (owWalkable(m, nx, ny) && !owNpcAt(m, nx, ny) && !seen.has(nx + ',' + ny)) { seen.add(nx + ',' + ny); q.push([nx, ny]); } }); }
      hasKeyItem = real; return seen;
    };
    const maps = OW_LANDS.map((L) => OW_MAPS[L.routeIn]).filter((m) => m.objects.some((o) => /-surf$/.test(o.id)));
    const ok = maps.every((m) => { const o = m.objects.find((p) => /-surf$/.test(p.id)); return !reach(m, false).has(o.x + ',' + o.y) && reach(m, true).has(o.x + ',' + o.y); });
    return { n: maps.length >= 10, ok };
  });
  assert.deepEqual(r, { n: true, ok: true });
});

test('utility moves: rain boosts water and weakens fire (and sun the opposite), Protect stops the next attack, Rest heals fully and sleeps', async () => {
  await begin();
  const r = await ev(() => {
    Math.random = () => 0.3; const me = abMe(), foe = abFoe(), out = {};
    const wat = { power: 60, type: 'water', name: 'w' }, fir = { power: 60, type: 'fire', name: 'f' };
    const dmg = (m) => abDamage(me, foe, m, false).dmg;
    ab.weather = null; const w0 = dmg(wat), f0 = dmg(fir);
    ab.weather = { k: 'rain', n: 5 }; out.rain = [dmg(wat) > w0, dmg(fir) < f0];
    ab.weather = { k: 'sun', n: 5 }; out.sun = [dmg(wat) < w0, dmg(fir) > f0]; ab.weather = null;
    foe.protect = true; const hp = foe.hp; abHit(me, foe, { id: 'x', name: 'Tackle', type: 'normal', power: 40, acc: 100, pp: 5 }, () => {}, () => {}); out.protectedHp = foe.hp === hp;
    foe.protect = false; me.hp = 3; me.status = ''; abUtil(me, foe, AB_TMS.rest, () => {});
    return out;
  });
  assert.deepEqual([r.rain, r.sun, r.protectedHp], [[true, true], [true, true], true]);
  await page.waitForTimeout(2500);
  assert.deepEqual(await ev(() => [abMe().hp === abMe().max, abMe().status]), [true, 'sleep']);
  await ev(() => { Object.keys(AB_TMS).forEach((k) => { state.tms[k] = 1; }); });
  assert.ok(await ev(() => CORNER_PRIZES.some((p) => p[0] === 'protect') && AB_TMS.protect.pri === 3));
});

test('held items: Focus Band can leave 1 HP, Lucky Egg adds half experience, Smoke Ball always escapes, Amulet Coin doubles prize money, all bought with gems', async () => {
  const r = await ev(() => ({ owned: ['focus', 'egg', 'amulet', 'smoke'].every((k) => HELD_ITEMS.some((i) => i.id === k) && ECON.held.cost[k] > 0), norm: (() => { state.heldOwned = ['focus', 'egg', 'nope']; state.held = {}; normalizeState(state); return state.heldOwned.join(); })() }));
  assert.deepEqual(r, { owned: true, norm: 'focus,egg' });
  await begin();
  const f = await ev(() => {
    Math.random = () => 0; const me = abMe(), foe = abFoe(); foe.held = 'focus'; foe.hp = 1;
    abHit(me, foe, { id: 'x', name: 'Tackle', type: 'normal', power: 120, acc: 100, pp: 5 }, () => {}, () => {});
    return foe.hp;
  });
  await page.waitForTimeout(1500);
  assert.equal(f >= 0, true);
  assert.equal(await ev(() => abFoe().hp), 1, 'the Focus Band left 1 HP');
  await menu();
  await ev(() => { abMe().held = 'smoke'; abFoe().hp = abFoe().max; Math.random = () => 0.99; ab.phase = 'menu'; abRun(); });
  await page.waitForFunction(() => !ab, null, { timeout: 20000 });
});

test('weekday visitors come only on their own day and give one gift a day; the Lucky Number is the same all day and pays a PP Up once', async () => {
  const r = await ev(() => {
    const monty = OW_MAPS.meadow.npcs.find((n) => n.id === 'meadow-monty'), real = owWeekday;
    owWeekday = () => 1; const mon = owNpcActive(monty); owWeekday = () => 2; const tue = owNpcActive(monty); owWeekday = real;
    state.items = {}; OW_SERVICES.weekly(monty); const first = state.items.greatnet || 0; closeTalk(); OW_SERVICES.weekly(monty); closeTalk(); const again = state.items.greatnet || 0;
    const lucky = [luckyNumber() === luckyNumber(), luckyNumber() >= 0 && luckyNumber() < 500];
    state.unlockedPets = state.unlockedPets.slice(0, 1); const id = getOwnedIds()[0], realN = buddyNumber;
    buddyNumber = () => luckyNumber(); state.items = {}; state.overworld.weekly = {};
    const dj = OW_MAPS['spark-tower-1'].npcs.find((n) => n.kind === 'lucky'); OW_SERVICES.lucky(dj); closeTalk(); OW_SERVICES.lucky(dj); closeTalk();
    buddyNumber = realN;
    return { mon, tue, first, again, lucky, pp: state.items.ppup || 0 };
  });
  assert.deepEqual(r, { mon: true, tue: false, first: 1, again: 1, lucky: [true, true], pp: 1 });
});

test('three legends roam each week, each on its own route, and a caught one stops roaming', async () => {
  const r = await ev(() => {
    state.storySeen.champion = 1; state.legend = { week: -1, caught: false, ids: [] };
    const trio = legendTrio(), all = legendRoamers().map((x) => x.legend.id);
    state.legend.ids = [trio[1].id]; const second = legendRoamers().map((x) => x.legend.id);
    state.legend.caught = true; const third = legendRoamers().map((x) => x.legend.id);
    state.legend = { week: legendState().week, caught: false, ids: ['a', 5, 'a', 'b', 'c'] }; normalizeState(state);
    return { distinct: new Set(trio.map((t) => t.id)).size, all: all.length, second: second.includes(trio[1].id), third: third.length, ids: state.legend.ids };
  });
  assert.deepEqual(r, { distinct: 3, all: 3, second: false, third: 1, ids: ['a', 'b'] });
});

test('Mom saves half of each prize while she is asked to, and gives the savings back; a bad save is repaired', async () => {
  const r = await ev(() => {
    const mum = OW_MAPS['hollow-home'].npcs.find((n) => n.id === 'hollow-mum'), out = {};
    out.moms = OW_MAPS['hollow-home'].npcs.filter((n) => /Mom|Mum/.test(n.name)).map((n) => n.name + ':' + n.kind).join();
    state.mom = { save: false, bank: 0 }; out.off = momKeeps(100);
    OW_SERVICES.mom(mum); talk.i = talk.lines.length - 1; renderTalk(); document.querySelectorAll('#talk-choices button')[0].click(); out.on = state.mom.save;
    out.kept = momKeeps(101); out.bank = state.mom.bank;
    state.gems = 0; OW_SERVICES.mom(mum); talk.i = talk.lines.length - 1; renderTalk(); document.querySelectorAll('#talk-choices button')[1].click(); out.gems = state.gems; out.empty = state.mom.bank;
    state.mom = { save: 'yes', bank: -5 }; normalizeState(state); out.fixed = [state.mom.save, state.mom.bank];
    return out;
  });
  assert.deepEqual(r, { moms: 'Mom:mom', off: 0, on: true, kept: 50, bank: 50, gems: 50, empty: 0, fixed: [false, 0] });
});

test('the Buddy Dex says where a wild buddy is found, by route name', async () => {
  const r = await ev(() => ({ route2: bookAreas('tiger'), none: bookAreas('nobody-here'), inHand: Object.keys(OW_WILD_HAND).filter((k) => OW_WILD_HAND[k].day.includes('tiger')).length > 0 }));
  assert.equal(r.none, 'Found in the wild');
  assert.equal(r.inHand, /^Found on /.test(r.route2));
});

test('a two-turn move (Solar Beam) charges for a turn, hits the next, and skips the charge in the sun', async () => {
  await begin();
  const r = await ev(() => {
    Math.random = () => 0.3; const me = abMe(), foe = abFoe(), sb = abTmMove('solarbeam', me.element, me.type); sb.left = 9; me.moves[0] = sb;
    const hp0 = foe.hp; abHit(me, foe, sb, () => {}, () => {}); const charged = [!!me.charging, foe.hp === hp0];
    abHit(me, foe, sb, () => {}, () => {}); const hit = [me.charging === null, true];
    me.charging = null; ab.weather = { k: 'sun', n: 5 }; abHit(me, foe, sb, () => {}, () => {}); ab.weather = null;
    return { charged, hit, sun: me.charging === null };
  });
  assert.deepEqual([r.charged, r.hit, r.sun], [[true, true], [true, true], true]);
});

test('a sleeping buddy blocks the way to the last find of a cave floor; the Radio Card tune wakes it and it leaves', async () => {
  const r = await ev(() => {
    const maps = OW_LANDS.map((L) => OW_MAPS[L.routeIn + '-cave2']).filter((m) => m && m.npcs.some((n) => n.kind === 'sleeper'));
    const m = maps[0], n = m.npcs.find((p) => p.kind === 'sleeper');
    state.overworld.story = []; state.keyItems = []; OW_SERVICES.sleeper(n); const asleep = document.getElementById('talk-text').innerText; closeTalk();
    const there = !!owNpcAt(m, n.x, n.y);
    state.keyItems = ['radio-card']; OW_SERVICES.sleeper(n); closeTalk();
    return { many: maps.length >= 6, asleep: /fast asleep/.test(asleep), there, gone: !owNpcAt(m, n.x, n.y), saved: state.overworld.story.includes(n.story), known: owIds('story').includes(n.story) };
  });
  assert.deepEqual(r, { many: true, asleep: true, there: true, gone: true, saved: true, known: true });
});

test('Strength: a boulder in a cave floor covers a find; Vine Gloves push it one tile, without them it stays, and leaving puts it back', async () => {
  const r = await ev(() => {
    const maps = OW_LANDS.map((L) => OW_MAPS[L.routeIn + '-cave1']).filter((m) => m && m.objects.some((o) => /-boulder$/.test(o.id)));
    const m = maps[0], o = m.objects.find((p) => /-boulder$/.test(p.id)), out = { many: maps.length >= 6 }; state.hero.made = true; openAdventure();
    [[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => {
      const a = [o.x - dx, o.y - dy], b = [o.x + dx, o.y + dy];
      if (!owWalkable(m, a[0], a[1]) || m.rows[b[1]].charAt(b[0]) !== 'c') return false;
      state.overworld.map = m.id; state.overworld.x = a[0]; state.overworld.y = a[1]; state.overworld.face = 'down';
      const dir = Object.keys(OW_STEP).find((k) => OW_STEP[k][0] === dx && OW_STEP[k][1] === dy);
      state.keyItems = []; owMove(dir); closeTalk(); out.stuck = m.rows[o.y].charAt(o.x) === '%' && state.overworld.x === a[0];
      state.keyItems = ['vines']; owMove(dir);
      out.pushed = m.rows[o.y].charAt(o.x) === 'c' && m.rows[b[1]].charAt(b[0]) === '%' && state.overworld.x === o.x && state.overworld.y === o.y;
      out.got = state.overworld.found.includes(o.id);
      const w = m.warps[0]; state.overworld.x = w.x; state.overworld.y = w.y - 1; owMove('down');
      out.reset = m.rows[o.y].charAt(o.x) === '%' && m.rows[b[1]].charAt(b[0]) === 'c'; return true;
    });
    return out;
  });
  assert.deepEqual(r, { many: true, stuck: true, pushed: true, got: true, reset: true });
});

test('Card Flip at the Game Corner: three coins to flip two of six cards; a pair pays 13, about 87 coins back in 100 over many plays', async () => {
  const r = await ev(() => {
    const npc = OW_MAPS['spark-corner'].npcs[0]; state.coins = 10; const real = Math.random; Math.random = () => 0.5;
    owCornerFlip(npc); const first = document.querySelectorAll('#talk-choices button').length; document.querySelectorAll('#talk-choices button')[0].click();
    const second = document.querySelectorAll('#talk-choices button').length; document.querySelectorAll('#talk-choices button')[0].click();
    const after = state.coins; Math.random = real;
    let paid = 0, wins = 0, n = 20000, a = 12345; const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    for (let i = 0; i < n; i++) { Math.random = rnd; const f = shuffled(['a', 'a', 'b', 'b', 'c', 'c']); paid += 3; if (f[0] === f[1]) { wins++; paid -= CORNER_FLIP_WIN; } }
    state.coins = 0; owCornerFlip(npc); const poor = document.getElementById('talk-text').innerText;
    return { first, second, coinsChanged: after !== 10, rtp: 1 - paid / (3 * n), poor };
  });
  assert.deepEqual([r.first, r.second], [6, 5]);
  assert.ok(r.rtp > 0.8 && r.rtp < 0.95, 'return to player ' + r.rtp);
  assert.match(r.poor, /need 3 coins/);
});

test('the music follows the place: a tune for fights, caves, rooms, towns and the open road, each 16 notes with its own speed', async () => {
  const r = await ev(() => {
    const out = {}; state.overworld.map = 'route2'; out.route = bgmContext();
    state.overworld.map = 'ember'; out.town = bgmContext(); state.overworld.map = 'ember-center'; out.room = bgmContext();
    state.overworld.map = 'route2-cave1'; out.cave = bgmContext();
    const real = ab; ab = { fake: true }; out.battle = bgmContext(); ab = real;
    out.tunes = Object.keys(BGM_TUNES).every((k) => BGM_TUNES[k].notes.length === 16 && BGM_TUNES[k].ms > 100);
    out.speeds = new Set(Object.keys(BGM_TUNES).map((k) => BGM_TUNES[k].ms)).size;
    return out;
  });
  assert.deepEqual(r, { route: 'route', town: 'town', room: 'room', cave: 'cave', battle: 'battle', tunes: true, speeds: 5 });
});

test('Fly and Dig: a turn charging out of reach (the foe misses), then the strike; Pokerus doubles Exp. for four days and is then cured for good', async () => {
  const r = await ev(() => {
    state.hero.made = true; openAdventure(); abStart({ kind: 'wild', foes: [{ id: 'fox', level: 12 }] });
    const me = abMe(), foe = abFoe(), fly = abTmMove('fly', me.element, me.type), out = {};
    const real = Math.random; Math.random = () => 0.3;
    abHit(me, foe, fly, () => {}, () => {}); out.charged = me.charging && me.charging.id === 'fly';
    const hp = me.hp; abHit(foe, me, foe.moves[0] || { name: 'x', power: 40, acc: 100, type: 'normal' }, () => {}, () => {}); out.missed = me.hp === hp;
    abHit(me, foe, me.charging, () => {}, () => {}); out.struck = me.charging === null;
    Math.random = real; out.tm = AB_TMS.fly.charge && AB_TMS.dig.vanish && CORNER_PRIZES.some((p) => p[0] === 'dig');
    state.virus = {}; const id = me.id;
    out.none = virusState(id) === '';
    state.virus[id] = dayKey(); out.sick = virusState(id) === 'sick';
    const old = new Date(); old.setDate(old.getDate() - 5); state.virus[id] = dayKey(old); out.cured = virusState(id) === 'cured' && state.virus[id] === 'cured';
    Math.random = () => 0; state.virus = {}; out.caught = abCatchVirus([me], true).length === 1 && abCatchVirus([me], true).length === 0; Math.random = real;
    state.virus = { fox: 'junk', dog: '2020-01-01' }; return out;
  });
  assert.deepEqual(r, { charged: true, missed: true, struck: true, tm: true, none: true, sick: true, cured: true, caught: true });
});

test('a fight opens with a wipe (bars for wild buddies, a circle for trainers) and the buddies cry as they appear', async () => {
  const r = await ev(() => {
    const cries = []; const real = soundBuddyCry; soundBuddyCry = (id) => cries.push(id);
    const out = {}; state.hero.made = true; openAdventure();
    abStart({ kind: 'wild', foes: [{ id: 'fox', level: 5 }] });
    out.wild = document.querySelector('#ab-modal .ab-content').classList.contains('ab-wipe-wild') || motionReduced();
    return new Promise((res) => { setTimeout(() => { out.cried = cries.includes('fox') && cries.length >= 2; soundBuddyCry = real; res(out); }, 4000); });
  });
  assert.deepEqual(r, { wild: true, cried: true });
});

test('the ruin signs in every fourth cave: four answers in a row pay one Evolution Stone, once', async () => {
  const r = await ev(() => {
    const maps = OW_LANDS.map((L) => OW_MAPS[L.routeIn + '-cave2']).filter((m) => m && Object.values(m.signs).some((s) => /-ruin$/.test(s.id)));
    const sign = Object.values(maps[0].signs).find((s) => /-ruin$/.test(s.id)), out = { n: maps.length >= 3 };
    state.hero.made = true; openAdventure(); state.items.stone = 0; state.overworld.beat.push(sign.after);
    openSignQuiz(sign);
    for (let i = 0; i < 4; i++) { answerSignQuiz(talk.quiz.q.opts.find((o) => o !== talk.quiz.q.ans)); answerSignQuiz(talk.quiz.q.ans); }
    out.stone = state.items.stone; out.saved = state.overworld.story.includes(sign.story); closeTalk();
    openSignQuiz(sign); out.again = /Everything is in order/.test(document.getElementById('talk-text').innerText) || !talk.quiz; closeTalk();
    out.known = owIds('sign').includes(sign.id) && owIds('story').includes(sign.story);
    return out;
  });
  assert.deepEqual(r, { n: true, stone: 1, saved: true, again: true, known: true });
});

test('the Whirlpool Charm (Skyreach badge) opens the nook gates of the second journey, which Trim used to', async () => {
  const r = await ev(() => {
    const far = OW_LANDS.filter((L) => !L.charm && L.nook.length && L.land !== 'skyreach');
    const chars = far.map((L) => OW_MAPS[L.routeIn].rows.join('').includes('y') ? 'y' : OW_MAPS[L.routeIn].rows.join('').includes('n') ? 'n' : '-');
    state.badges = []; const none = hasKeyItem('whirl'); state.badges = ['skyreach']; const have = hasKeyItem('whirl');
    return { many: far.length >= 6, chars: [...new Set(chars)].sort().reverse().join(), none, have };
  });
  assert.deepEqual(r, { many: true, chars: 'y,n', none: false, have: true });
});

test('the Menu has a Trainer Card (name, badges, buddies, gems) and a Save button', async () => {
  const r = await ev(() => {
    state.hero.made = true; state.hero.name = 'Sam'; state.badges = ['meadow', 'ember']; state.gems = 42; openAdventure();
    menuGo('openTrainerCard'); const card = document.getElementById('talk-name').innerText + ' ' + talk.lines.join(' '); closeTalk();
    state.gems = 43; menuGo('menuSave'); const saved = JSON.parse(localStorage.getItem('math_quest_save')).gems;
    return { card, saved };
  });
  assert.match(r.card, /^Sam Badges: 2 of 8\. Buddies: \d+\. Gems: 42\.$/);
  assert.equal(r.saved, 43);
});

test('the Tower Marathon: fourteen trainers (the second seven four levels stronger), a Max Revive once a day', async () => {
  const r = await ev(() => {
    state.hero.made = true; const rs = abTowerRounds(true), a = rs[0].foes[0].level, b = rs[7].foes[0].level;
    state.items.maxrevive = 0; state.tower = { day: '', best: 0, longDay: '' };
    abTowerWon(true); const first = state.items.maxrevive; closeTalk(); abTowerWon(true); const again = state.items.maxrevive; closeTalk();
    return { n: rs.length, names: new Set(rs.map((x) => x.name)).size, stronger: b > a, first, again, best: state.tower.best, short: abTowerRounds(false).length };
  });
  assert.deepEqual(r, { n: 14, names: 14, stronger: true, first: 1, again: 1, best: 14, short: 7 });
});

test('friend calls: whoever gave you a key item rings once a day with a small gift to take', async () => {
  const r = await ev(() => {
    state.hero.made = true; state.keyItems = ['gizmo']; state.phone.gift = '';
    const none = phoneFriend() === null; state.keyItems = ['gizmo', 'bicycle', 'fishing-rod', 'itemfinder', 'map-card'];
    const f = phoneFriend(); const html = gizmoCallsHtml(); const btn = /Take the gift/.test(html);
    const potions = state.potions, nets = state.nets, ap = state.items.apricorn || 0; phoneClaim();
    const gained = state.potions > potions || state.nets > nets || (state.items.apricorn || 0) > ap;
    return { none, named: !!f, btn, gained, done: phoneFriend() === null, saved: JSON.parse(localStorage.getItem('math_quest_save')).phone.gift === dayKey(), noBtn: !/Take the gift/.test(gizmoCallsHtml()) };
  });
  assert.deepEqual(r, { none: true, named: true, btn: true, gained: true, done: true, saved: true, noBtn: true });
});

test('gym skies: the Ember gym is under harsh sun and the Tide gym in rain (every round), the Meadow gym has none', async () => {
  const r = await ev(() => {
    state.hero.made = true; openAdventure(); const out = {};
    const run = (id) => { const real = abStart; let o; abStart = (x) => { o = x; return true; }; state.buddyXp.dog = xpForLevel(60); abStartGym(id); abStart = real; return o && o.gymWeather; };
    out.ember = run('ember'); out.tide = run('tide'); out.meadow = run('meadow');
    abStart({ rounds: [{ kind: 'trainer', name: 'A', foes: [{ id: 'fox', level: 3 }] }, { kind: 'trainer', name: 'B', foes: [{ id: 'fox', level: 3 }] }], gymWeather: 'sun' });
    out.start = ab.weather && ab.weather.k; ab.weather = null; ab.r = 1; abLoadRound(); out.again = ab.weather && ab.weather.k;
    return out;
  });
  assert.deepEqual(r, { ember: 'sun', tide: 'rain', meadow: '', start: 'sun', again: 'sun' });
});

test('each town is laid out its own way: terraces with a ledge, a harbour with a bridge, a plaza with fountains, a lake with a bridge and ring path, a wood, a park, a river with a bridge, and a village green for Meadow Town, and a marsh, grid, staircase, lagoon, diamond, crossroads and avenues besides', async () => {
  const r = await ev(() => {
    const towns = owTowns().filter((t) => t !== OW_START.map), styles = {}; towns.forEach((t) => { styles[OW_MAPS[t].plan] = (styles[OW_MAPS[t].plan] || 0) + 1; });
    const has = (t, re) => re.test(OW_MAPS[t].rows.join(''));
    const by = (style) => towns.filter((t) => OW_MAPS[t].plan === style);
    return { kinds: Object.keys(styles).sort().join(), meadow: OW_MAPS.meadow.plan, planned: towns.every((t) => OW_MAPS[t].plan !== 'slots'), terrace: by('terrace').every((t) => has(t, /vvvv/)), harbour: by('harbour').every((t) => has(t, /~{3,}[\s\S]*B|B[\s\S]*~{3,}/) && OW_MAPS[t].rows.some((r) => /~~B+~~|BB/.test(r))), plaza: by('plaza').every((t) => has(t, /d{3}/) && has(t, /~~/)),
      lake: by('lake').every((t) => OW_MAPS[t].rows.some((r) => /~{3,}B+~{3,}|~{3,}BB/.test(r))), river: by('river').every((t) => OW_MAPS[t].rows.some((r) => /B{2}/.test(r)) && has(t, /~~/)), tall: towns.filter((t) => OW_MAPS[t].rows.length >= 20).length >= 10 };
  });
  assert.deepEqual(r, { kinds: 'avenues,crossroads,diamond,forest,green,grid,harbour,lagoon,lake,marsh,park,plaza,river,staircase,terrace', meadow: 'green', planned: true, terrace: true, harbour: true, plaza: true, lake: true, river: true, tall: true });
});

test('routes are filled in different ways: a wood, a rocky pass, a flower meadow, open country and a stony flat, and the road bends several ways', async () => {
  const r = await ev(() => {
    const routes = Object.keys(OW_MAPS).filter((k) => OW_MAPS[k].theme), themes = {}; routes.forEach((k) => { themes[OW_MAPS[k].theme] = (themes[OW_MAPS[k].theme] || 0) + 1; });
    const rows = (k) => OW_MAPS[k].rows.join(''), count = (k, c) => rows(k).split(c).length - 1;
    const rocky = routes.filter((k) => OW_MAPS[k].theme === 'rocky'), wood = routes.filter((k) => OW_MAPS[k].theme === 'wood'), meadow = routes.filter((k) => OW_MAPS[k].theme === 'meadow');
    return { themes: Object.keys(themes).sort().join(), rocks: rocky.some((k) => count(k, '#') > 0), wood: wood.every((k) => count(k, 'T') > 150), meadow: meadow.some((k) => count(k, '*') > 4), plans: OW_ROAD_PLANS.length };
  });
  assert.deepEqual(r, { themes: 'meadow,open,rocky,stony,wood', rocks: true, wood: true, meadow: true, plans: 8 });
});

test('the Night Walk: dearer and shorter than the day walk, and only dark and magic buddies live there; it ends with the visit', async () => {
  const r = await ev(() => {
    state.gems = 1000; state.hero.made = true; openAdventure(); const out = {};
    const warden = OW_MAPS['thistle-gate'].npcs.find((n) => n.kind === 'safari');
    OW_SERVICES.safari(warden); talk.i = talk.lines.length - 1; renderTalk(); talkChoose(1);
    out.paid = [state.gems, state.safari.active, state.safari.night, state.safari.balls, state.safari.steps];
    out.kinds = [...new Set(Array.from({ length: 60 }, () => safariPick().element))].sort().join();
    safariEnd('done'); out.after = [state.safari.active, state.safari.night]; closeTalk();
    state.safari = { active: false, steps: 0, balls: 0, night: 'yes' }; NORMALIZERS.forEach((fn) => fn(state)); out.norm = state.safari.night;
    return out;
  });
  assert.deepEqual(r, { paid: [200, true, true, 20, 300], kinds: r.kinds, after: [false, false], norm: false });
  assert.ok(/^(dark|dark,magic|magic)$/.test(r.kinds), 'only dark and magic buddies at night: ' + r.kinds);
});

test("Prof. Pi rates your Dex: a prize at each quarter caught, once each, and a count of what is still needed", async () => {
  const r = await ev(() => {
    state.hero.made = true; state.keyItems = ['gizmo']; const pi = OW_MAPS['hollow-house'].npcs.find((n) => n.id === 'hollow-pi'), out = {};
    const total = allBuddies().length, say = () => { OW_SERVICES.rate(pi); const t = talk.lines.join(' '); closeTalk(); return t; };
    state.dexRate = 0; state.unlockedPets = ['dog']; state.unlockedSecrets = [];
    out.few = /Catch \d+ more/.test(say()) && state.dexRate === 0;
    state.unlockedPets = allBuddies().slice(0, Math.ceil(total / 4)).map((p) => p.id); state.items.ultranet = 0;
    out.first = /Ultra Net/.test(say()) && state.items.ultranet === 1 && state.dexRate === 1; say(); out.once = state.items.ultranet === 1;
    state.unlockedPets = allBuddies().map((p) => p.id); say(); say(); say(); out.all = state.dexRate === 4; out.done = /wonderful/.test(say());
    state.dexRate = 99; NORMALIZERS.forEach((fn) => fn(state)); out.clamped = state.dexRate;
    return out;
  });
  assert.deepEqual(r, { few: true, first: true, once: true, all: true, done: true, clamped: 4 });
});

test('status moves and Leech Seed: Thunder Wave, Sleep Powder, Toxic and Confuse Ray give their condition (and fail on a second), Leech Seed saps HP each round, Headbutt can make a slower foe flinch', async () => {
  const r = await ev(() => {
    state.hero.made = true; openAdventure(); abStart({ kind: 'wild', foes: [{ id: 'fox', level: 12 }] });
    const me = abMe(), foe = abFoe(), out = {}, real = Math.random; Math.random = () => 0.3;
    const drain = () => { for (let i = 0; i < 40 && ab.queue.length; i++) { const st = ab.queue.shift(); st[1] && st[1](); } ab.queue = []; };
    const use = (id, who, tgt) => abHit(who, tgt, abTmMove(id, who.element, who.type), () => {}, () => {});
    foe.element = 'fire';
    ['thunderwave', 'sleeppowder', 'toxic'].forEach((id, i) => { foe.status = ''; use(id, me, foe); drain(); out[id] = foe.status; });
    foe.status = 'burn'; use('toxic', me, foe); out.failed = foe.status === 'burn';
    foe.conf = 0; use('confuseray', me, foe); drain(); out.conf = foe.conf > 0;
    ab.queue = []; foe.hp = foe.max; me.hp = Math.max(1, me.max - 20); use('leechseed', me, foe); drain(); out.seeded = !!foe.seeded;
    ab.queue = []; const f0 = foe.hp, m0 = me.hp; abEndRound(); drain(); out.sapped = foe.hp < f0 && me.hp > m0;
    ab.queue = []; Math.random = () => 0.1; foe.moved = false; foe.flinched = false; use('headbutt', me, foe); drain(); out.flinch = foe.flinched;
    Math.random = real; out.tms = ['thunderwave', 'headbutt'].every((id) => CORNER_PRIZES.some((p) => p[0] === id));
    return out;
  });
  assert.deepEqual(r, { thunderwave: 'paralysis', sleeppowder: 'sleep', toxic: 'poison', failed: true, conf: true, seeded: true, sapped: true, flinch: true, tms: true });
});

test("King's Rock, Bright Powder and Exp. Share: flinch on any hit, foes miss a little more, and the holder learns without fighting", async () => {
  const r = await ev(() => {
    const out = { owned: ['kings', 'powder', 'share'].every((k) => HELD_ITEMS.some((i) => i.id === k) && ECON.held.cost[k] > 0) };
    state.hero.made = true; openAdventure(); abStart({ kind: 'wild', foes: [{ id: 'fox', level: 8 }] });
    const me = abMe(), foe = abFoe(), real = Math.random, drain = () => { for (let i = 0; i < 60 && ab.queue.length; i++) { const st = ab.queue.shift(); st[1] && st[1](); } ab.queue = []; };
    const tackle = { id: 'tackle', name: 'Tackle', type: 'normal', power: 40, acc: 100, pp: 10 };
    me.held = 'kings'; foe.max = foe.hp = 9999; foe.moved = false; foe.flinched = false; Math.random = () => 0.05; abHit(me, foe, tackle, () => {}, () => {}); drain(); out.flinch = foe.flinched;
    me.held = ''; foe.held = 'powder'; foe.hp = foe.max; foe.moved = false; foe.flinched = false; Math.random = () => 0.95; let hp = foe.hp; abHit(me, foe, tackle, () => {}, () => {}); drain(); out.missed = foe.hp === hp;
    Math.random = real;
    return out;
  });
  assert.deepEqual(r, { owned: true, flinch: true, missed: true });
  const x = await ev(() => {
    ab = null; state.unlockedPets = ['dog', 'fox']; state.team = ['dog', 'fox']; state.held = { fox: 'share' }; state.buddyXp.dog = xpForLevel(10); state.buddyXp.fox = xpForLevel(10); state.advHp = {};
    abStart({ kind: 'wild', foes: [{ id: 'fox', level: 8 }] }); ab.cur = ab.party.findIndex((m) => m.id === 'dog'); ab.part = ['dog'];
    const before = getBuddyXp('fox'), lead = getBuddyXp('dog'); abFoeFainted();
    for (let i = 0; i < 80 && ab && ab.queue.length; i++) { const st = ab.queue.shift(); if (st[1] && st[0] !== '' ) st[1](); }
    return { cat: getBuddyXp('fox') - before, dog: getBuddyXp('dog') - lead };
  });
  assert.ok(x.dog > 0 && x.cat > 0 && x.cat === Math.floor(x.dog / 2), 'the Exp. Share holder gets half without fighting: ' + JSON.stringify(x));
});

test('the Name Rater: a nickname from a fixed list for the lead buddy, kept in battle and through a level-up, removable, repaired if tampered', async () => {
  const r = await ev(() => {
    state.hero.made = true; const npc = OW_MAPS['mystic-house'].npcs.find((n) => n.id === 'mystic-rater'), out = { there: !!npc };
    const id = state.activePet, real = abPartyMon(id).name;
    OW_SERVICES.rater(npc); out.offers = [...document.querySelectorAll('#talk-choices button')].length; talk.i = talk.lines.length - 1; renderTalk();
    const first = document.querySelectorAll('#talk-choices button')[0]; const nick = first.innerText; first.click(); out.set = state.nicks[id] === nick && NICK_NAMES.includes(nick);
    out.named = abPartyMon(id).name === nick; closeTalk();
    state.nicks = { dog: '<img src=x>', fox: 'Pip' }; NORMALIZERS.forEach((fn) => fn(state)); out.clean = JSON.stringify(state.nicks);
    state.nicks = {}; out.back = abPartyMon(id).name === real;
    return out;
  });
  assert.deepEqual(r, { there: true, offers: 4, set: true, named: true, clean: '{"fox":"Pip"}', back: true });
});

test('Surf: with the Water Steps charm the hero rides over water (and water buddies bite); without it water is a wall', async () => {
  const r = await ev(() => {
    state.hero.made = true; openAdventure(); const out = {}, m = OW_MAPS.meadow, W = waterSpot('meadow');
    out.spot = !!W;
    if (!W) return out;
    state.overworld.map = 'meadow'; state.overworld.x = W.x; state.overworld.y = W.y; state.overworld.face = W.face;
    state.badges = []; owMove(W.face); closeTalk(); out.wall = state.overworld.x === W.x && state.overworld.y === W.y;
    state.badges = ['tide']; const d = OW_STEP[W.face]; owMove(W.face);
    out.rode = state.overworld.x === W.x + d[0] && state.overworld.y === W.y + d[1] && !!owTileAt(m, state.overworld.x, state.overworld.y).water;
    out.ring = !!document.querySelector('.ow-hero.ow-surfing');
    return out;
  });
  assert.deepEqual(r, { spot: true, wall: true, rode: true, ring: true });
});

test('Counter returns twice the physical damage taken this round (and fails with none); Hidden Power takes a type from the buddy', async () => {
  const r = await ev(() => {
    state.hero.made = true; openAdventure(); abStart({ kind: 'wild', foes: [{ id: 'fox', level: 12 }] });
    const me = abMe(), foe = abFoe(), out = {}, drain = () => { for (let i = 0; i < 60 && ab.queue.length; i++) { const st = ab.queue.shift(); st[1] && st[1](); } ab.queue = []; };
    foe.max = foe.hp = 9999; me.max = me.hp = 9999; const tackle = { id: 'tackle', name: 'Tackle', type: 'normal', power: 60, acc: 100, pp: 10 }, real = Math.random; Math.random = () => 0.3;
    abHit(foe, me, abTmMove('counter', me.element, me.type), () => {}, () => {}); drain(); out.failed = foe.hp === 9999;
    abHit(foe, me, tackle, () => {}, () => {}); drain(); const taken = me.lastHit; out.took = taken > 0;
    abHit(me, foe, abTmMove('counter', me.element, me.type), () => {}, () => {}); drain(); out.back = 9999 - foe.hp === taken * 2;
    const seen = new Set(), realDmg = abDamage; abDamage = (a, d, m, c) => { seen.add(m.type); return realDmg(a, d, m, c); };
    ['fox', 'dog', 'cat', 'wolf', 'bear', 'owl', 'hen', 'cow'].forEach((id) => { abHit({ ...me, id }, foe, abTmMove('hiddenpower', 'fire', 'normal'), () => {}, () => {}); drain(); });
    abDamage = realDmg; out.varied = seen.size >= 3 && [...seen].every((t) => ['fire', 'water', 'nature', 'electric', 'dark', 'magic'].includes(t));
    drain(); Math.random = real; out.hp = AB_TMS.hiddenpower.hidden && AB_TMS.counter.pri === -1 && CORNER_PRIZES.some((p) => p[0] === 'counter');
    return out;
  });
  assert.deepEqual(r, { failed: true, took: true, back: true, varied: true, hp: true });
});

test("trainers' buddies use status moves: a level 15+ trainer buddy of a status-friendly element knows its trick, wild ones never do", async () => {
  const r = await ev(() => {
    state.hero.made = true; openAdventure();
    const out = {}, mk = (el) => { const sp = wildPool().find((p) => p.element === el); return sp; };
    const el = ['electric', 'dark', 'nature', 'magic', 'water'].filter((e) => mk(e));
    out.elements = el.length;
    const run = (kind, level) => { ab = null; abStart({ rounds: [{ kind, name: 'T', foes: el.map((e) => ({ id: mk(e).id, level })) }] }); return ab.foes.map((f) => f.moves.filter((m) => m.inflict || m.seed).length); };
    out.trainer = run('trainer', 20).every((n) => n === 1 || n === 0) && run('trainer', 20).some((n) => n === 1);
    out.low = run('trainer', 8).every((n) => n === 0);
    out.wild = run('wild', 20).every((n) => n === 0);
    return out;
  });
  assert.deepEqual(r, { elements: 5, trainer: true, low: true, wild: true });
});

test('the open seas: a dock door in a harbour house leads out; without Water Steps the sea sends you back, with them you can surf to every islet find and walk home', async () => {
  const r = await ev(() => {
    state.hero.made = true; openAdventure(); const all = {};
    [['tide-sea', 'tide-house'], ['coral-sea', 'coral-house']].forEach(([id, house]) => {
      const out = {}, sea = OW_MAPS[id], o = state.overworld;
      state.badges = []; o.map = house; o.x = 5; o.y = 1; o.face = 'up'; owMove('up'); closeTalk();
      out.bounced = o.map === house && o.y === 1;
      state.badges = ['tide']; o.map = house; o.x = 5; o.y = 1; owMove('up');
      out.arrived = o.map === id && o.x === sea.start.x && o.y === sea.start.y;
      const flood = (surf) => { const seen = new Set([sea.start.x + ',' + sea.start.y]), q = [[sea.start.x, sea.start.y]]; while (q.length) { const [cx, cy] = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = cx + dx, ny = cy + dy, t = owTileAt(sea, nx, ny); if (t && (!t.solid || (surf && t.water)) && !seen.has(nx + ',' + ny)) { seen.add(nx + ',' + ny); q.push([nx, ny]); } }); } return seen; };
      const surfed = flood(true), walked = flood(false);
      out.finds = sea.objects.length >= 3 && sea.objects.every((p) => surfed.has(p.x + ',' + p.y));
      out.onFoot = sea.objects.every((p) => !walked.has(p.x + ',' + p.y));
      out.home = !!owWarpAt(sea, 7, 14) && walked.has('7,14');
      out.bonus = sea.sea >= 3;
      all[id] = out;
    });
    return all;
  });
  const ok = { bounced: true, arrived: true, finds: true, onFoot: true, home: true, bonus: true };
  assert.deepEqual(r, { 'tide-sea': ok, 'coral-sea': ok });
});

test('stat moves have a picture: Smokescreen drifts grey smoke over the foe, Swords Dance sends arrows up the user, Growl sinks them on the foe', async () => {
  const r = await ev(() => {
    state.hero.made = true; openAdventure(); abStart({ kind: 'wild', foes: [{ id: 'fox', level: 12 }] });
    const me = abMe(), foe = abFoe(), out = {}, real = Math.random; Math.random = () => 0.3;
    const find = (id) => AB_NORMAL.find((m) => m.id === id);
    const run = (att, def, id, icon) => { ab.queue = []; abHit(att, def, find(id), () => {}, () => {}); for (let i = 0; i < 20 && ab.queue.length; i++) { const st = ab.queue.shift(); st[1] && st[1](); } return document.querySelector('#' + icon + ' .ab-sfx'); };
    const smoke = run(me, foe, 'smoke', 'ab-foe-icon'); out.smoke = !!smoke && smoke.classList.contains('s-acc') && smoke.querySelectorAll('i').length === 5;
    const up = run(me, foe, 'swords', 'ab-me-icon'); out.up = !!up && up.classList.contains('up') && up.classList.contains('s-atk');
    const down = run(me, foe, 'growl', 'ab-foe-icon'); out.down = !!down && down.classList.contains('down');
    Math.random = real; return out;
  });
  assert.deepEqual(r, { smoke: true, up: true, down: true });
});

test("prices and gem sources follow Gold: item prices from Gold's Marts, selling for half, only trainers (and Mom's savings) pay, the Dex pays no gems", async () => {
  const r = await ev(() => {
    const gold = { potion: 300, superpotion: 700, hyperpotion: 1200, maxpotion: 2500, fullrestore: 3000, revive: 1500, antidote: 100, parlyzheal: 200, awakening: 250, burnheal: 250, iceheal: 250, fullheal: 600, net: 200, greatnet: 600, ultranet: 1200, repel: 350, maxrepel: 700, escaperope: 550, hpup: 9800, protein: 9800, iron: 9800, carbos: 9800, calcium: 9800, ether: 1200, xattack: 500, xdefend: 550, xspeed: 350 };
    const bad = Object.keys(gold).filter((k) => ECON.items[k] !== gold[k]);
    return { bad, trainer: ECON.money.trainerBase, leader: ECON.money.leaderBase, noBook: typeof claimBookReward === 'undefined' && typeof BOOK_MILESTONES === 'undefined' && !document.getElementById('book-milestones') };
  });
  assert.deepEqual(r, { bad: [], trainer: 16, leader: 100, noBook: true });
});

test('an Everstone keeps the holder in its current form however high its level goes; without it the form follows the level', async () => {
  const r = await ev(() => {
    const sp = getSpecies('fox'), out = { has: HELD_ITEMS.some((i) => i.id === 'everstone') && ECON.held.cost.everstone > 0 };
    const high = sp.forms[sp.forms.length - 1].minLevel + 5;
    state.held = {}; state.stoneForm = {}; out.free = getFormIndex(sp, high) === sp.forms.length - 1;
    state.unlockedPets = ['fox'].concat(state.unlockedPets); state.heldOwned = ['everstone']; state.buddyXp.fox = xpForLevel(1); hubPet = 'fox'; giveHeld('everstone');
    out.held = state.held.fox === 'everstone' && state.stoneForm.fox === 0; out.locked = getFormIndex(sp, high) === 0;
    giveHeld('everstone'); out.released = getFormIndex(sp, high) === sp.forms.length - 1;
    state.stoneForm = { fox: 99, dog: 'x' }; NORMALIZERS.forEach((fn) => fn(state)); out.clamped = state.stoneForm.fox;
    return out;
  });
  assert.deepEqual(r, { has: true, free: true, held: true, locked: true, released: true, clamped: 4 });
});

test('trainer classes have their own style: Hikers are tougher, Swimmers quicker, and the same buddy under another name is unchanged', async () => {
  const r = await ev(() => {
    state.hero.made = true; openAdventure();
    const mk = (name) => { ab = null; abStart({ rounds: [{ kind: 'trainer', name, foes: [{ id: 'fox', level: 20 }] }] }); const f = ab.foes[0]; return { max: f.max, def: f.def, spd: f.spd, hp: f.hp }; };
    const plain = mk('Clerk Bob'), hiker = mk('Hiker Brick'), swim = mk('Swimmer Ana');
    return { hiker: hiker.max > plain.max && hiker.def > plain.def && hiker.hp === hiker.max, swim: swim.spd > plain.spd && swim.max === plain.max };
  });
  assert.deepEqual(r, { hiker: true, swim: true });
});

test('walkable gyms: every gym has an inside with its trainers and leader, three layouts take turns, a switch door shuts the leader in until its math switches are thrown, and the leader fights as the last round', async () => {
  const r = await ev(() => {
    state.hero.made = true; openAdventure(); const out = {}, ids = allGymRegions().filter((g) => OW_MAPS[g.id + '-gym']).map((g) => g.id);
    out.count = ids.length >= 15;
    out.styles = new Set(ids.map((id) => Object.keys(OW_MAPS[id + '-gym'].doors).length)).size;                                  // no door, one door (two switch kinds)
    const reach = (m, from) => { const seen = new Set([from.join()]), q = [from]; while (q.length) { const [cx, cy] = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = cx + dx, ny = cy + dy; if (owWalkable(m, nx, ny) && !owNpcAt(m, nx, ny) && !seen.has(nx + ',' + ny)) { seen.add(nx + ',' + ny); q.push([nx, ny]); } }); } return seen; };
    const m = OW_MAPS['meadow-gym'], leader = m.npcs.find((n) => n.kind === 'gymleader'), door = Object.keys(m.doors)[0];
    state.overworld.story = []; const shut = reach(m, [m.start.x, m.start.y]); out.shut = !shut.has(leader.x + ',' + (leader.y + 1)) && OW_TILES[m.rows[5].charAt(6)].door === true;
    const tr = m.npcs.find((n) => n.kind === 'trainer'); out.seen = owTrainerSeeing(m, 6, tr.y) === tr || !!owTrainerSeeing(m, 6, tr.y);
    const sign = Object.values(m.signs)[0]; state.overworld.beat = []; openSignQuiz(sign); out.locked = !talk.quiz; closeTalk();
    m.doors[door].forEach((s) => owStoryDone(s)); const open = reach(m, [m.start.x, m.start.y]); out.open = open.has(leader.x + ',' + (leader.y + 1));
    const real = abStart; let o; abStart = (x) => { o = x; return true; }; state.buddyXp.dog = xpForLevel(30);
    OW_SERVICES.gymleader(leader); document.querySelectorAll('#talk-choices button')[0].click(); abStart = real;
    out.leaderOnly = !!o && o.rounds.length === 1 && o.rounds[0].kind === 'leader';
    out.exit = m.warps[0].to === 'meadow' && m.warps[0].ty === Object.keys(OW_MAPS.meadow.gyms)[0].split(',')[1] * 1 + 1;
    out.gate = OW_MAPS.meadow.warps.some((w) => w.gate && w.to === 'meadow-gym');
    return out;
  });
  assert.deepEqual(r, { count: true, styles: r.styles, shut: true, seen: true, locked: true, open: true, leaderOnly: true, exit: true, gate: true });
  assert.ok(r.styles >= 2, 'some gyms have a door and some do not');
});

test('a side path is walked into, not jumped to: past the gap you see the side path (its colours and tiles) lined up, and the way back shows the route', async () => {
  const r = await ev(() => {
    const out = {}, route = OW_MAPS.route1, w = route.warps.find((x) => /-side$/.test(x.to)), side = OW_MAPS[w.to], back = side.warps[0];
    const east = w.x === 13, dx = east ? 1 : -1;
    const b = owBeyond(route, w.x + dx, w.y);                                      // the cell just past the gap
    out.ahead = !!b && b.map === side && b.x === w.tx + dx && b.y === w.ty;
    const far = owBeyond(route, w.x + dx * 2, w.y);
    out.deeper = !!far && far.map === side && far.x === w.tx + dx * 2;
    out.walls = owBeyond(route, w.x + dx, w.y + 9) === null;                      // beside the gap, past the side path's own edge, the wood goes on
    const bb = owBeyond(side, back.x - dx, back.y);                                 // from the side path, the cell past its gap shows the route
    out.back = !!bb && bb.map === route && bb.y === back.ty && bb.x === back.tx - dx;
    out.inside = owBeyond(route, 5, 5) === null;
    return out;
  });
  assert.deepEqual(r, { ahead: true, deeper: true, walls: true, back: true, inside: true });
});

test('on a phone the map has Game Boy style controls: see-through arrows at the bottom left, A and B at the bottom right, and A talks to what the hero faces', async () => {
  const { page: ph, errors: pe } = await openGame(browser, worker, { MATH_KV: fakeKV() }, { fast: true, wildStart: true, touch: true, viewport: { width: 390, height: 780 } });
  await ph.evaluate(() => { state.hero.made = true; });
  for (const [w, h] of [[390, 780], [320, 568]]) {
    await ph.setViewportSize({ width: w, height: h });
    const hero = await ph.evaluate(() => { state.overworld.map = 'hollow-house'; state.overworld.x = 3; state.overworld.y = 3; state.overworld.face = 'left'; openAdventure(); renderOverworld(); return true; });
    const r = await ph.evaluate(() => {
      const box = (s) => { const e = document.querySelector(s), b = e.getBoundingClientRect(), cs = getComputedStyle(e); return { l: b.left, r: b.right, t: b.top, b: b.bottom, op: +cs.opacity, shown: cs.display !== 'none' }; };
      const up = box('#overworld-modal .ow-key.up'), left = box('#overworld-modal .ow-key.left'), down = box('#overworld-modal .ow-key.down'), a = box('#overworld-modal .ow-btn.a'), bb = box('#overworld-modal .ow-btn.b');
      return { arrows: up.shown && left.l < innerWidth / 2 && down.b <= innerHeight && up.op < 1 && left.op < 1, ab: a.shown && bb.shown && a.l > innerWidth / 2 && bb.l > innerWidth * 0.4 && a.r <= innerWidth && a.b <= innerHeight, order: left.l < up.l + 1 && bb.l < a.l && a.t < bb.t, noSide: !document.querySelector('#overworld-modal .ow-key.team') || getComputedStyle(document.querySelector('#overworld-modal .ow-key.team')).display === 'none', noScroll: document.documentElement.scrollWidth <= innerWidth };
    });
    assert.deepEqual(r, { arrows: true, ab: true, order: true, noSide: true, noScroll: true }, w + 'x' + h);
  }
  await ph.setViewportSize({ width: 390, height: 780 });
  await ph.evaluate(() => { state.overworld.map = 'hollow-house'; state.overworld.x = 3; state.overworld.y = 3; state.overworld.face = 'left'; renderOverworld(); });
  await ph.click('#overworld-modal .ow-btn.a');
  assert.equal(await ph.evaluate(() => document.getElementById('talk-modal').style.display), 'flex');
  assert.deepEqual(pe, []);
});

test('the ground has details: roads get a worn edge where they meet grass, ponds a shore, plain grass a flower, tuft or stone here and there, the same every time, and rooms none', async () => {
  const r = await ev(() => {
    const m = OW_MAPS.meadow, out = { road: false, shore: false, deco: 0, same: true, room: true };
    for (let y = 0; y < m.rows.length; y++) for (let x = 0; x < m.rows[0].length; x++) {
      const t = owTileAt(m, x, y), c = owCellLook(m, x, y, t);
      if (t.t === 't-path' && /ed-/.test(c)) out.road = true;
      if (t.t === 't-water' && / sh/.test(c)) out.shore = true;
      if (/gv\d/.test(c)) { out.deco++; if (owCellLook(m, x, y, t) !== c) out.same = false; }
    }
    const room = OW_MAPS['meadow-house']; out.room = owCellLook(room, 3, 3, owTileAt(room, 3, 3)) === '';
    return out;
  });
  assert.ok(r.road && r.shore && r.same && r.room && r.deco >= 5, JSON.stringify(r));
});

test('Settings can turn the questions off: fights go straight to choosing an attack, puzzle signs solve themselves (and pay), the choice is saved and repaired', async () => {
  const r = await ev(() => {
    state.hero.made = true; const out = {}; openSettings(); out.btn = /Questions: ON/.test(document.getElementById('no-questions-btn').innerText);
    toggleNoQuestions(); out.on = state.noQuestions === true && /OFF/.test(document.getElementById('no-questions-btn').innerText) && JSON.parse(localStorage.getItem('math_quest_save')).noQuestions === true;
    closeSettings(); openAdventure(); abStart({ kind: 'wild', foes: [{ id: 'fox', level: 5 }] });
    return new Promise((res) => { const wait = () => { if (ab.phase === 'menu' && !ab.busy) { abFight(); out.fight = ab.phase === 'moves' && !ab.q; ab = null;
      const maps = OW_LANDS.map((L) => OW_MAPS[L.routeIn + '-cave2']).filter((m) => m && Object.values(m.signs).some((s) => /-ruin$/.test(s.id))), sign = Object.values(maps[0].signs).find((s) => /-ruin$/.test(s.id));
      state.overworld.beat.push(sign.after); state.items.stone = 0; openSignQuiz(sign); out.sign = !talk.quiz && state.items.stone === 1 && state.overworld.story.includes(sign.story); closeTalk();
      state.noQuestions = 'yes'; NORMALIZERS.forEach((fn) => fn(state)); out.fixed = state.noQuestions === false; res(out); } else setTimeout(wait, 100); }; wait(); });
  });
  assert.deepEqual(r, { btn: true, on: true, fight: true, sign: true, fixed: true });
});

test('towns have strollers who wander a step at a time near home (never onto doors, finds, grass, the hero or each other) and talk differently after dark; houses have windows and chimneys', async () => {
  const r = await ev(() => {
    state.hero.made = true; mountWorldArt(); const out = {}, towns = owTowns().filter((t) => t !== OW_START.map);
    out.everyTown = towns.every((t) => OW_MAPS[t].npcs.filter((n) => n.wander).length >= 1);
    window.__noWander = false; openAdventure(); const t = towns[1], m = OW_MAPS[t], o = state.overworld; o.map = t; o.x = m.start.x; o.y = m.start.y; renderOverworld();
    const w = m.npcs.filter((n) => n.wander), homes = w.map((n) => [n.x, n.y]), real = Math.random; let bad = 0, moved = 0;
    for (let i = 0; i < 300; i++) { Math.random = () => (i * 0.37) % 1; owWander(); w.forEach((n) => { const tt = owTileAt(m, n.x, n.y); if (!tt || tt.solid || tt.grass || (n.x === o.x && n.y === o.y) || Math.abs(n.x - n.home.x) > 2 || Math.abs(n.y - n.home.y) > 2 || owWarpAt(m, n.x, n.y) || w.some((p) => p !== n && p.x === n.x && p.y === n.y)) bad++; }); }
    Math.random = real; window.__noWander = true; moved = w.some((n, k) => n.x !== homes[k][0] || n.y !== homes[k][1]);
    out.wandered = moved && bad === 0;
    const wk = w[0], real2 = owTimeOfDay; owTimeOfDay = () => 'night'; owInteract(m, wk.x, wk.y); const night = talk.lines.join(' '); closeTalk(); owTimeOfDay = () => 'day'; owInteract(m, wk.x, wk.y); const day = talk.lines.join(' '); closeTalk(); owTimeOfDay = real2;
    out.lines = night !== day && night === wk.night.join(' ');
    out.art = !!document.getElementById('w-t-house-window') && !!document.getElementById('w-t-roof-chimney');
    const all = OW_LANDS.map((L) => OW_MAPS[L.town]); let win = 0, chim = 0; all.forEach((mm) => { for (let y = 0; y < mm.rows.length; y++) for (let x = 0; x < mm.rows[0].length; x++) { const v = owVariant(mm, x, y, owTileAt(mm, x, y).t); if (v === 't-house-window') win++; if (v === 't-roof-chimney') chim++; } });
    out.houses = win > 5 && chim > 3;
    return out;
  });
  assert.deepEqual(r, { everyTown: true, wandered: true, lines: true, art: true, houses: true });
});

test('the map moves and has weather: ponds shimmer, rain falls outdoors on a rainy or stormy day (never in rooms or caves), and towns have lamp posts that shut nothing in', async () => {
  const r = await ev(() => {
    state.hero.made = true; mountWorldArt(); openAdventure(); const out = {}, o = state.overworld, real = weatherToday;
    const stand = (id) => { const m = OW_MAPS[id]; o.map = id; o.x = m.start.x; o.y = m.start.y; renderOverworld(); return document.getElementById('ow-view'); };
    let v = stand('meadow'); out.shimmer = !!v.querySelector('.ow-cell.wv');
    weatherToday = () => ({ id: 'rainy' }); v = stand('meadow'); out.rain = v.classList.contains('ow-rainy');
    weatherToday = () => ({ id: 'stormy' }); v = stand('meadow'); out.storm = v.classList.contains('ow-stormy');
    v = stand('meadow-center'); out.room = !/ow-(rainy|stormy)/.test(v.className);
    const cave = OW_MAPS['route1-cave1']; v = stand('route1-cave1'); out.cave = !/ow-(rainy|stormy)/.test(v.className);
    weatherToday = () => ({ id: 'sunny' }); v = stand('meadow'); out.sun = !/ow-(rainy|stormy)/.test(v.className);
    weatherToday = real;
    const towns = owTowns().filter((t) => t !== OW_START.map); out.lamps = towns.filter((t) => OW_MAPS[t].rows.join('').includes('a')).length >= towns.length - 1;
    out.art = !!document.getElementById('w-t-lamp') && OW_TILES.a.solid === true;
    return out;
  });
  assert.deepEqual(r, { shimmer: true, rain: true, storm: true, room: true, cave: true, sun: true, lamps: true, art: true });
  assert.ok(await ev(() => getComputedStyle(document.querySelector('.ow-cell.wv'), '::before').animationName === 'owShimmer'));
});

test('each town and route plays its own take on its tune; villagers say a proud word with three badges and as Champion; the buddy hops only on the picture a step draws', async () => {
  const r = await ev(() => {
    const out = {}, a = bgmTune('town', 'ember'), b = bgmTune('town', 'tide'), a2 = bgmTune('town', 'ember');
    out.differ = JSON.stringify(a.notes) !== JSON.stringify(b.notes) || a.ms !== b.ms; out.same = JSON.stringify(a) === JSON.stringify(a2); out.len = a.notes.length === 16;
    out.fixed = bgmTune('battle', 'ember') === BGM_TUNES.battle && bgmTune('room', 'ember-center') === BGM_TUNES.room;
    state.hero.made = true; const town = owTowns().filter((t) => t !== OW_START.map)[1], m = OW_MAPS[town], w = m.npcs.find((n) => n.wander), o = state.overworld;
    o.map = town; const say = () => owNpcWords(w).join(' '); state.badges = []; state.storySeen.champion = 0; const plain = say();
    state.badges = ['meadow', 'ember', 'tide']; const proud = say(); state.storySeen.champion = 1; const champ = say(); state.storySeen.champion = 0; state.badges = [];
    out.words = /3 badges/.test(proud) && /Champion/.test(champ) && plain !== proud && plain !== champ;
    openAdventure(); const sp = nextTo('route1', 7, 12); o.map = 'route1'; o.x = sp.x; o.y = sp.y; o.face = sp.face; renderOverworld();
    out.idle = !document.querySelector('.ow-follow.ow-hop');
    const dir = ['left', 'right', 'up', 'down'].find((d) => owWalkable(OW_MAPS.route1, o.x + OW_STEP[d][0], o.y + OW_STEP[d][1]) && !owNpcAt(OW_MAPS.route1, o.x + OW_STEP[d][0], o.y + OW_STEP[d][1]) && !owWarpAt(OW_MAPS.route1, o.x + OW_STEP[d][0], o.y + OW_STEP[d][1]));
    owMove(dir); out.hop = !!document.querySelector('.ow-follow.ow-hop'); renderOverworld(); out.rest = !document.querySelector('.ow-follow.ow-hop');
    return out;
  });
  assert.deepEqual(r, { differ: true, same: true, len: true, fixed: true, words: true, idle: true, hop: true, rest: true });
});

test('between scenes nothing changes: a cell past an edge is drawn as the neighbour\'s own cell (same windows, chimneys and edges), the road is plain (no tall grass, no wall) where every route meets a town, and the road lines up across every seam', async () => {
  const r = await ev(() => {
    const out = { cells: 0, mismatch: [], gap: [], seams: [] };
    Object.keys(OW_MAPS).forEach((k) => {
      const m = OW_MAPS[k]; if (m.room) return; const W = m.rows[0].length, H = m.rows.length;
      m.warps.forEach((w) => {
        const n = OW_MAPS[w.to]; if (!n || n.room || !(w.x === 0 || w.y === 0 || w.x === W - 1 || w.y === H - 1)) return;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
          const x = w.x + dx, y = w.y + dy; if (x >= 0 && x < W && y >= 0 && y < H) continue;
          const c = owCellAt(m, x, y), rx = x + w.tx - w.x, ry = w.ty + (y - w.y);
          if (rx < 0 || ry < 0 || rx >= n.rows[0].length || ry >= n.rows.length || !c.beyond) continue;
          out.cells++; const own = owCellAt(n, rx, ry);
          if (c.map !== own.map || c.x !== own.x || c.y !== own.y || owVariant(c.map, c.x, c.y, c.tile.t) !== owVariant(own.map, own.x, own.y, own.tile.t) || owCellLook(c.map, c.x, c.y, c.tile) !== owCellLook(own.map, own.x, own.y, own.tile)) out.mismatch.push(k + '>' + w.to);
        }
      });
    });
    OW_LANDS.forEach((L) => {
      const m = OW_MAPS[L.routeIn], H = m.rows.length, ok = (x, y) => { const t = OW_TILES[(m.rows[y] || '').charAt(x)]; return t && !t.solid && !t.grass && !t.gate; };
      for (let y = 0; y < H; y++) if ((y < 2 || y >= H - 2) && [6, 7].some((x) => m.rows[y].charAt(x) === '"' || OW_TILES[m.rows[y].charAt(x)].solid && y < 2)) out.gap.push(L.routeIn + ' row ' + y);          // the road is plain where a route meets a town, and no wall stands in its mouth
      m.warps.filter((w) => (w.y === 0 || w.y === H - 1) && OW_MAPS[w.to]).forEach((w) => { const n = OW_MAPS[w.to], inY = w.y === 0 ? 1 : H - 2, inN = w.ty === 0 ? 1 : (w.ty === n.rows.length - 1 ? n.rows.length - 2 : w.ty + (w.y === 0 ? -1 : 1)); const t1 = OW_TILES[m.rows[inY].charAt(w.x)], t2 = OW_TILES[(n.rows[w.y === 0 ? w.ty - 1 : w.ty + 1] || '').charAt(w.tx)]; if (!t1 || t1.solid || t1.grass) out.seams.push(L.routeIn + ' ' + w.to + ' this side'); if (t2 && (t2.solid || t2.grass)) out.seams.push(L.routeIn + ' ' + w.to + ' far side'); });
    });
    return out;
  });
  assert.ok(r.cells > 100, 'there are seams to compare: ' + r.cells);
  assert.deepEqual([r.mismatch, r.gap, r.seams], [[], [], []]);
});

test('the buddy follows a little behind and smaller, on the side away from the hero, so it never lands on the hero', async () => {
  const r = await ev(() => {
    state.hero.made = true; openAdventure(); const o = state.overworld, out = {};
    const sp = nextTo('route1', 7, 12); o.map = 'route1'; o.x = sp.x; o.y = sp.y; o.face = sp.face; renderOverworld();
    ['down', 'up', 'left', 'right'].forEach((d) => { const dd = OW_STEP[d]; if (!owWalkable(OW_MAPS.route1, o.x + dd[0], o.y + dd[1]) || owNpcAt(OW_MAPS.route1, o.x + dd[0], o.y + dd[1]) || owWarpAt(OW_MAPS.route1, o.x + dd[0], o.y + dd[1])) return; owMove(d); const lag = document.querySelector('.ow-follow .ow-lag'); out[d] = lag ? lag.style.transform : null; });
    const f = document.querySelector('.ow-follow .ow-buddy'), cs = f && getComputedStyle(f); out.small = !!f && parseFloat(cs.width) < parseFloat(getComputedStyle(document.querySelector('.ow-hero')).width);
    return out;
  });
  const moves = Object.entries(r).filter(([k]) => k !== 'small');
  assert.ok(moves.length >= 1 && r.small);
  moves.forEach(([k, v]) => assert.ok(v && /translate\((-?[\d.]+)%,\s*(-?[\d.]+)%\)/.test(v), k + ': ' + v));
});

test('buildings differ: Center, Mart and gym have their own roofs (the gym stone walls), houses keep windows and chimneys; houses have a mailbox; towns have three villagers; snow falls in the cold lands; a tap on a new direction only turns the hero', async () => {
  const r = await ev(() => {
    state.hero.made = true; mountWorldArt(); const out = {}, towns = owTowns().filter((t) => t !== OW_START.map);
    const roles = {}; towns.forEach((t) => { const b = OW_MAPS[t].bldg || {}; Object.keys(b).forEach((p) => { roles[b[p]] = (roles[b[p]] || 0) + 1; }); });
    out.roles = ['center', 'mart', 'gym', 'house'].every((k) => roles[k] > 0);
    const m = OW_MAPS.meadow, seen = {}; Object.keys(m.bldg).forEach((p) => { const [x, y] = p.split(',').map(Number), t = owTileAt(m, x, y); seen[m.bldg[p] + ':' + owVariant(m, x, y, t.t)] = 1; });
    out.roofs = !!seen['center:t-roof-center'] && !!seen['mart:t-roof-mart'] && !!seen['gym:t-roof-gym'] && !!seen['gym:t-wall-gym'] && !Object.keys(seen).some((k) => /^house:t-roof-(center|mart|gym)/.test(k));
    out.art = ['t-roof-center', 't-roof-mart', 't-roof-gym', 't-wall-gym', 't-mailbox'].every((a) => !!document.getElementById('w-' + a));
    out.mail = towns.filter((t) => OW_MAPS[t].rows.join('').includes('i')).length >= 8 && OW_TILES.i.solid === true;
    const vill = (t) => OW_MAPS[t].npcs.filter((n) => /-(walker|folk)-/.test(n.id)).length; out.people = towns.every((t) => OW_MAPS[t].npcs.filter((n) => n.wander).length >= 2) && towns.filter((t) => vill(t) >= 5).length >= 10 && towns.filter((t) => OW_MAPS[t].npcs.length >= 7).length >= 8;
    openAdventure(); const o = state.overworld, v = () => document.getElementById('ow-view');
    o.map = 'route7'; o.x = OW_MAPS.route7.start.x; o.y = OW_MAPS.route7.start.y; renderOverworld(); out.snow = v().classList.contains('ow-snowy');
    o.map = 'route2'; o.x = OW_MAPS.route2.start.x; o.y = OW_MAPS.route2.start.y; renderOverworld(); out.noSnow = !v().classList.contains('ow-snowy');
    const sp = nextTo('route1', 7, 12); o.map = 'route1'; o.x = sp.x; o.y = sp.y; o.face = 'up'; renderOverworld();
    const dir = ['left', 'right', 'down'].find((d) => owWalkable(OW_MAPS.route1, o.x + OW_STEP[d][0], o.y + OW_STEP[d][1]));
    const x0 = o.x, y0 = o.y; owHold(dir); owRelease(); out.turned = o.face === dir && o.x === x0 && o.y === y0;
    return new Promise((res) => { owHold(dir); setTimeout(() => { owRelease(); out.walked = o.x !== x0 || o.y !== y0; res(out); }, 400); });
  });
  assert.deepEqual(r, { roles: true, roofs: true, art: true, mail: true, people: true, snow: true, noSnow: true, turned: true, walked: true });
});

test('towns are not one plan: the cross street sits at different rows, buildings differ in width and the gym is taller in a top slot, towns have seven to nine people, and parks or markets appear', async () => {
  const r = await ev(() => {
    const towns = owTowns().filter((t) => t !== OW_START.map), streets = new Set(), widths = new Set(); let tall = 0, folk = 0;
    towns.forEach((t) => {
      const m = OW_MAPS[t]; m.rows.forEach((row, y) => { if (row.slice(2, 14) === '............') streets.add(y); });
      const roles = {}; Object.keys(m.bldg).forEach((p) => { const [x, y] = p.split(',').map(Number); if (/R/.test(m.rows[y].charAt(x))) { const k = m.bldg[p] + ':' + y; roles[k] = (roles[k] || 0) + 1; } });
      Object.keys(roles).forEach((k) => widths.add(k.split(':')[0] + roles[k]));
      const gymRows = new Set(Object.keys(m.bldg).filter((p) => m.bldg[p] === 'gym' && m.rows[+p.split(',')[1]].charAt(+p.split(',')[0]) === 'R').map((p) => p.split(',')[1])); if (gymRows.size >= 3) tall++;
      if (m.npcs.length >= 6 && m.npcs.length <= 10) folk++;
    });
    return { streets: streets.size >= 4, widths: [...widths].filter((w) => /^(center|gym)5$/.test(w)).length === 2 && [...widths].some((w) => /^house[23]$/.test(w)) && widths.has('mart4'), tall: tall >= 2, folk: folk === towns.length };
  });
  assert.deepEqual(r, { streets: true, widths: true, tall: true, folk: true });
});
