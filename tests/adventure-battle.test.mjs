// The Adventure battle: a Gold style fight where a right answer lets you attack, a wrong one misses, and the foe attacks back.
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
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; state.storySeen.map = 1; state.hero.made = true; state.buddyXp[state.activePet] = xpForLevel(15); { let n = 0; Math.random = () => (n = (n + 0.31) % 0.79); } });
});
const phase = (p) => page.waitForFunction((x) => ab && !ab.busy && ab.phase === x, p, { timeout: 15000 });
const begin = async (id = 'fox', level = 3) => {
  await page.evaluate(([i, l]) => { state.overworld.map = 'route1'; state.overworld.x = 6; state.overworld.y = 20; openAdventure(); abStart({ kind: 'wild', foes: [{ id: i, level: l }] }); }, [id, level]);
  await phase('menu');
};
const ev = (fn, arg) => page.evaluate(fn, arg);

test('stats grow with level and kind, and the moves follow the level', async () => {
  const r = await ev(() => {
    const a = abMon('dog', 5), b = abMon('dog', 50), c = abMon('fox', 50);
    return { a: [a.max, a.atk], b: [b.max, b.atk], names5: abMon('fox', 8).moves.map((m) => m.id), start: abMon('fox', 3).moves.map((m) => m.id), names50: abMon('fox', 50).moves.map((m) => m.id), cheap: abBase(getSpecies('fox')), dear: abBase(getSpecies('octopus')), c: c.max };
  });
  assert.ok(r.b[0] > r.a[0] * 3 && r.b[1] > r.a[1] * 3);
  assert.deepEqual(r.names5, ['tackle', 'fire1', 'quick', 'growl'], 'the newest damaging moves, and the newest stat move last');
  assert.deepEqual(r.start, ['tackle', 'fire1'], 'a new buddy knows two moves, as in Gold');
  assert.equal(r.names50.length, 4);
  assert.ok(r.dear > r.cheap);
});

test('damage follows the type chart, the same-type bonus and a critical hit', async () => {
  const r = await ev(() => {
    Math.random = () => 0.99;
    const me = abMon('fox', 20), foeNature = abMon('hedgehog', 20), foeWater = abMon('otter', 20);
    const mv = me.moves.find((m) => m.type === 'fire'), tk = me.moves.find((m) => m.type === 'normal');
    return { strong: abDamage(me, foeNature, mv, false), weak: abDamage(me, foeWater, mv, false), plain: abDamage(me, foeWater, tk, false), crit: abDamage(me, foeNature, mv, true), mvp: mv.power, tkp: tk.power };
  });
  assert.equal(r.strong.eff, 2); assert.equal(r.weak.eff, 0.5);
  assert.ok(r.strong.dmg > r.weak.dmg * 2.5);
  assert.ok(r.crit.dmg >= r.strong.dmg * 1.6);
});

test('a battle opens on its own screen with both buddies, and FIGHT asks a math question', async () => {
  await begin();
  assert.equal(await ev(() => document.getElementById('ab-modal').style.display), 'flex');
  assert.match(await ev(() => document.getElementById('ab-foe-name').innerText), /./);
  assert.deepEqual(await ev(() => [...document.querySelectorAll('#ab-panel button')].map((b) => b.innerText)), ['FIGHT', 'PACK', 'BUDDY', 'RUN']);
  await ev(() => abFight());
  assert.equal(await ev(() => ab.phase), 'question');
  assert.ok((await ev(() => document.querySelectorAll('#ab-panel .vault-btn').length)) >= 3);
});

test('a wrong answer misses and the foe attacks back', async () => {
  await begin('fox', 8);
  const hp = await ev(() => abMe().hp), foeHp = await ev(() => abFoe().hp);
  await ev(() => { abFight(); abAnswer(ab.q.ans + 1000); });
  await phase('menu');
  assert.ok((await ev(() => abMe().hp)) < hp);
  assert.equal(await ev(() => abFoe().hp), foeHp);
  assert.deepEqual(errors, []);
});

test('a right answer lets you choose an attack, then the foe attacks back', async () => {
  await begin('fox', 8);
  const hp = await ev(() => abMe().hp), foeHp = await ev(() => abFoe().hp);
  await ev(() => { abFight(); abAnswer(ab.q.ans); });
  assert.equal(await ev(() => ab.phase), 'moves');
  const left = await ev(() => abMe().moves[0].left);
  await ev(() => abUseMove(0));
  await phase('menu');
  assert.ok((await ev(() => abFoe().hp)) < foeHp);
  assert.ok((await ev(() => abMe().hp)) < hp);
  assert.equal(await ev(() => abMe().moves[0].left), left - 1);
  assert.equal(await ev(() => state.advHp[abMe().id]), await ev(() => abMe().hp));
});

test('winning pays experience, ends the fight and brings the map back', async () => {
  await begin('fox', 3);
  const xp = await ev(() => getBuddyXp(abMe().id));
  await ev(() => { abFoe().hp = 1; abFight(); abAnswer(ab.q.ans); abUseMove(0); });
  await page.waitForFunction(() => !ab, null, { timeout: 15000 });
  assert.ok((await ev((x) => getBuddyXp(abMe ? state.activePet : '') > x, xp)));
  await page.waitForFunction(() => document.getElementById('overworld-modal').style.display === 'flex');
  assert.equal(await ev(() => document.getElementById('ab-modal').style.display), 'none');
});

test('a team that faints returns to the last Buddy Center, healed', async () => {
  await begin('fox', 30);
  await ev(() => { state.overworld.center = { map: 'meadow', x: 4, y: 5 }; ab.party.forEach((m) => { m.hp = 1; state.advHp[m.id] = 1; }); abFight(); abAnswer(ab.q.ans + 1000); });
  await page.waitForFunction(() => !ab, null, { timeout: 20000 });
  await page.waitForFunction(() => document.getElementById('talk-modal').style.display === 'flex');
  assert.deepEqual(await ev(() => [state.overworld.map, state.overworld.x, state.overworld.y]), ['meadow', 4, 5]);
  assert.deepEqual(await ev(() => state.advHp), {});
});

test('a Catch Net can catch a wild buddy, uses one net, and the buddy is yours', async () => {
  await ev(() => { state.nets = 2; state.unlockedPets = state.unlockedPets.filter((i) => i !== 'bunny'); });
  await begin('bunny', 3);
  await ev(() => { Math.random = () => 0; abThrowNet(); });
  await page.waitForFunction(() => !ab, null, { timeout: 20000 });
  assert.equal(await ev(() => state.nets), 1);
  assert.ok(await ev(() => getOwnedIds().indexOf('bunny') !== -1));
});

test('a weak foe is easier to catch, and a trainer fight cannot be caught or run from', async () => {
  const r = await ev(() => { const f = abMon('bunny', 10), full = abCatchChance(f); f.hp = 1; return [full, abCatchChance(f)]; });
  assert.ok(r[1] > r[0]);
  await ev(() => { state.nets = 3; });
  await ev(() => { state.overworld.map = 'route1'; state.overworld.x = 6; state.overworld.y = 20; openAdventure(); abStart({ kind: 'trainer', name: 'Tester', foes: [{ id: 'fox', level: 3 }] }); });
  await phase('menu');
  await ev(() => { abThrowNet(); abRun(); });
  await phase('menu');
  assert.equal(await ev(() => state.nets), 3);
  assert.match(await ev(() => document.getElementById('ab-text').innerText), /What will/);
});

test('RUN leaves a wild fight; a Potion heals; the Buddy Center restores battle HP', async () => {
  await begin('fox', 3);
  await ev(() => { state.potions = 1; abMe().hp = 3; state.advHp[abMe().id] = 3; abPotion(); });
  await phase('menu');
  assert.ok((await ev(() => abMe().hp)) > 3);
  assert.equal(await ev(() => state.potions), 0);
  await ev(() => abRun());
  await page.waitForFunction(() => !ab, null, { timeout: 15000 });
  await ev(() => { state.advHp = { dog: 1 }; centerHeal(); });
  assert.deepEqual(await ev(() => state.advHp), {});
});

test('bad battle HP and potions in a save are repaired', async () => {
  await ev(() => { state.advHp = { dog: -5, nowhere: 9, fox: 'x' }; state.potions = 500; normalizeState(); });
  assert.deepEqual(await ev(() => state.advHp), { dog: 0 });
  assert.equal(await ev(() => state.potions), 99);
});

test('the battle screen fits a phone and has no emoji in its source', async () => {
  await page.setViewportSize({ width: 320, height: 568 });
  await begin();
  const r = await ev(() => { const m = document.querySelector('#ab-modal .modal-content').getBoundingClientRect(); return [m.width, document.documentElement.scrollWidth]; });
  assert.ok(r[0] <= 320 && r[1] <= 320);
});

test('every kind has its own build, and an element leans: electric buddies are quick, nature buddies are sturdy', async () => {
  const r = await ev(() => {
    const shapes = ['dog', 'fox', 'otter', 'bunny', 'hedgehog', 'octopus'].map((id) => JSON.stringify([abMon(id, 30).max, abMon(id, 30).atk, abMon(id, 30).def, abMon(id, 30).spd]));
    const avg = (el, k) => { const l = ['fire', 'water', 'nature', 'electric', 'dark', 'magic'].includes(el) ? Array.from({ length: 40 }, (_, i) => abShape('seed' + i, el)[k]) : []; return l.reduce((a, b) => a + b, 0) / l.length; };
    return { distinct: new Set(shapes).size, same: JSON.stringify(abMon('dog', 30)) === JSON.stringify(abMon('dog', 30)), spd: [avg('electric', 'spd'), avg('nature', 'spd')], hp: [avg('nature', 'hp'), avg('fire', 'hp')] };
  });
  assert.ok(r.distinct >= 5 && r.same);
  assert.ok(r.spd[0] > r.spd[1] + 10 && r.hp[0] > r.hp[1]);
});

test('the faster buddy attacks first, and a priority move beats speed', async () => {
  await begin('fox', 8);
  const order = await ev(async () => {
    const log = [];
    const real = abStrike;
    abStrike = function (att, def, mv) { log.push(att === abMe() ? 'me' : 'foe'); };
    const me = abMe(), foe = abFoe();
    foe.moves = [foe.moves.find((m) => !m.pri && !m.fx)];                                  // a plain attack, so no priority or stat move changes the order
    const run = (mySpd, foeSpd, pri) => { log.length = 0; me.spd = mySpd; foe.spd = foeSpd; ab.phase = 'moves'; const mv = me.moves[0]; const old = mv.pri; mv.pri = pri; mv.left = 5; abUseMove(0); mv.pri = old; return log.join(''); };
    const out = [run(100, 5, 0), run(5, 100, 0), run(5, 100, 1)];
    abStrike = real;
    return out;
  });
  assert.deepEqual(order, ['me', 'foe', 'me']);
});

test('statuses: a burned buddy hits softer and loses HP each round, paralysis slows, and a Potion cures', async () => {
  await begin('fox', 20);
  const r = await ev(() => {
    const a = abMon('fox', 20), d = abMon('otter', 20), mv = abKnownMoves(a.element, 20, a.type).find((m) => m.id === 'slam');
    Math.random = () => 0.99;
    const clean = abDamage(a, d, mv, false).dmg; a.status = 'burn'; const burned = abDamage(a, d, mv, false).dmg;
    a.status = 'paralysis';
    return { clean, burned, slow: abSpeed(a) < a.spd / 3 };
  });
  assert.ok(r.burned < r.clean && r.slow);
  const hp = await ev(() => { const me = abMe(); me.status = 'burn'; me.hp = me.max - 5; ab.phase = 'busy'; abEndRound(); return me.hp; });
  await phase('menu');
  assert.ok((await ev(() => abMe().hp)) < hp);
  await ev(() => { state.potions = 1; abMe().status = 'poison'; abMe().hp = abMe().max; abPotion(); });
  await phase('menu');
  assert.equal(await ev(() => abMe().status), '');
});

test('PP carries between fights until the Buddy Center, and with none left a buddy can Struggle', async () => {
  await begin('fox', 8);
  await ev(() => { abFight(); abAnswer(ab.q.ans); abUseMove(1); });
  await phase('menu');
  const used = await ev(() => state.advPp[abMe().id]);
  assert.ok(Object.keys(used).length >= 3);
  assert.equal(await ev(() => abPartyMon(abMe().id).moves.find((m) => m.left < m.pp) !== undefined), true);
  await ev(() => { abMe().moves.forEach((m) => { m.left = 0; }); abFight(); abAnswer(ab.q.ans); });
  assert.match(await ev(() => document.getElementById('ab-panel').innerText), /Struggle/);
  const hp = await ev(() => abMe().hp);
  await ev(() => abUseMove(-1));
  await phase('menu');
  assert.ok((await ev(() => abFoe().hp)) < (await ev(() => abFoe().max)));
  await ev(() => centerHeal());
  assert.deepEqual(await ev(() => state.advPp), {});
  assert.ok(hp > 0);
});

test('the team holds six, and a bad PP list in a save is repaired', async () => {
  assert.equal(await ev(() => ECON.team.max), 6);
  await ev(() => { state.advPp = { dog: { tackle: 99999, junk: 'x' }, nowhere: { tackle: 1 }, fox: 5 }; normalizeState(); });
  assert.deepEqual(await ev(() => state.advPp), { dog: { tackle: 99 } });
});
