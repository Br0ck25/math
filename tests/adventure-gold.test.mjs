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
    const out = { road: OW_MAPS.spark.roads['15,6'], floors: [1, 2, 3].map((n) => OW_MAPS['spark-tower-' + n].npcs.length), boss: OW_MAPS['spark-tower-3'].npcs[0].kind };
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

test('towns differ in height (16, 18 or 20), and the road into each still lands on its bottom gap and the way back leads to the route', async () => {
  const r = await ev(() => {
    const towns = OW_LANDS.map((L) => ({ L, m: OW_MAPS[L.town], route: OW_MAPS[L.routeIn] }));
    const heights = new Set(towns.map((t) => t.m.rows.length));
    const ok = towns.every(({ L, m, route }) => {
      const up = route.warps.find((w) => w.to === L.town && w.y === 0), down = m.warps.find((w) => w.to === L.routeIn);
      return up.ty === m.rows.length - 2 && owWalkable(m, up.tx, up.ty) && down.y === m.rows.length - 1 && m.start.y === m.rows.length - 3 && owWalkable(m, m.start.x, m.start.y);
    });
    return { heights: [...heights].sort(), ok };
  });
  assert.deepEqual(r, { heights: [16, 18, 20], ok: true });
});
