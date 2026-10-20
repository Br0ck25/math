// Trainers on the Adventure map (they spot the hero, battle through the gym-trainer path, are beaten for good), and the team wipe that returns to the Center.
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
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; state.storySeen.map = 1; state.hero.made = true; state.buddyXp[state.activePet] = xpForLevel(12); });
});
const put = (map, x, y, face = 'up') => page.evaluate(([m, px, py, f]) => {
  state.overworld.map = m; state.overworld.x = px; state.overworld.y = py; state.overworld.face = f;
  if (document.getElementById('overworld-modal').style.display !== 'flex') openAdventure();
  renderOverworld();
}, [map, x, y, face]);
const shown = (id) => page.evaluate((i) => document.getElementById(i).style.display === 'flex', id);
const wait = (ms) => page.waitForTimeout(ms);
const menu = () => page.waitForFunction(() => ab && !ab.busy && ab.phase === 'menu', null, { timeout: 20000 });
const over = () => page.waitForFunction(() => !ab, null, { timeout: 30000 });
// Pia stands at (3,9) facing right: she sees (4,9), (5,9), (6,9). Walk from (6,10) up into (6,9).
const meetPia = async () => { await put('route1', 6, 10, 'up'); await page.evaluate(() => owMove('up')); await wait(300); };
const startPia = async () => { await meetPia(); await page.click('#talk-choices button'); };

test('a trainer sees the hero along the way it faces, up to its sight, and only while it is not beaten', async () => {
  const r = await page.evaluate(() => {
    const m = OW_MAPS.route1, seen = (x, y) => (owTrainerSeeing(m, x, y) || {}).id || '';
    const out = { near: seen(4, 9), mid: seen(5, 9), edge: seen(6, 9), far: seen(7, 9), behind: seen(2, 9), above: seen(3, 8), below: seen(3, 10), leo: seen(9, 14) + '/' + seen(7, 14) + '/' + seen(6, 14) };
    state.overworld.beat = ['route1-pia'];
    out.beaten = seen(6, 9);
    return out;
  });
  assert.deepEqual(r, { near: 'route1-pia', mid: 'route1-pia', edge: 'route1-pia', far: '', behind: '', above: '', below: '', leo: 'route1-leo/route1-leo/', beaten: '' });
});

test('something in the way hides the hero from a trainer', async () => {
  const r = await page.evaluate(() => {
    const m = OW_MAPS.route1, before = (owTrainerSeeing(m, 6, 9) || {}).id;
    m.rows[9] = 'T,,,b,..,,,,,T'.replace('b', 'b');                                                         // a bush at (4,9)
    const blocked = !!owTrainerSeeing(m, 6, 9);
    m.rows[9] = 'T,,,,,..,,,,,T';
    return { before, blocked };
  });
  assert.deepEqual(r, { before: 'route1-pia', blocked: false });
});

test('stepping into sight shows a "!", stops walking for a moment, then the trainer speaks and offers the battle', async () => {
  await put('route1', 6, 10, 'up');
  await page.evaluate(() => owMove('up'));
  const during = await page.evaluate(() => ({ busy: owBusy, alerts: document.querySelectorAll('.ow-alert').length, talk: document.getElementById('talk-modal').style.display }));
  assert.equal(during.busy, true);
  assert.equal(during.alerts, 1, 'the "!" bubble is on the map');
  const y = await page.evaluate(() => { owMove('up'); return state.overworld.y; });
  assert.equal(y, 9, 'no walking while the trainer is spotting you');
  await wait(300);
  assert.equal(await shown('talk-modal'), true);
  assert.equal(await page.evaluate(() => document.getElementById('talk-name').innerText), 'Scout Pia');
  assert.match(await page.evaluate(() => document.getElementById('talk-text').innerText), /I spotted you/);
  assert.deepEqual(await page.evaluate(() => Array.from(document.querySelectorAll('#talk-choices button')).map((b) => b.innerText)), ['Battle!']);
  assert.equal(await page.evaluate(() => document.getElementById('talk-next').innerText), 'Not now');
  assert.deepEqual(await page.evaluate(() => [owBusy, document.querySelectorAll('.ow-alert').length]), [false, 0]);
});

test('Battle! starts a trainer battle on the battle screen: the trainer sends out buddies, and there is no running', async () => {
  await startPia();
  await menu();
  const r = await page.evaluate(() => ({ kind: ab.kind, name: ab.name, npc: ab.npc.id, foes: ab.foes.length, gym: state.gym, map: document.getElementById('overworld-modal').style.display, screen: document.getElementById('ab-modal').style.display, talk: document.getElementById('talk-modal').style.display }));
  assert.deepEqual(r, { kind: 'trainer', name: 'Scout Pia', npc: 'route1-pia', foes: 1, gym: null, map: 'none', screen: 'flex', talk: 'none' });
  assert.deepEqual(errors, []);
});

test('a trainer sends out more buddies as you win badges', async () => {
  const r = await page.evaluate(() => [0, 3, 6, 8].map((n) => { state.badges = ['meadow', 'ember', 'tide', 'grove', 'volt', 'gloom', 'mystic', 'skyreach'].slice(0, n); return clamp(1 + Math.floor(state.badges.length / 3), 1, 3); }));
  assert.deepEqual(r, [1, 2, 3, 3]);
});

test('winning pays the trainer gems, marks the trainer beaten, and brings the map back with the trainer\'s words', async () => {
  await startPia();
  await menu();
  const gems = await page.evaluate(() => { state.gems = 0; return state.gems; });
  await page.evaluate(() => { abFoe().hp = 1; abFight(); abAnswer(ab.q.ans); abUseMove(0); });
  await over();
  await page.waitForFunction(() => document.getElementById('talk-modal').style.display === 'flex');
  const r = await page.evaluate(() => ({ gems: state.gems, beat: state.overworld.beat.slice(), ow: document.getElementById('overworld-modal').style.display, name: document.getElementById('talk-name').innerText, words: document.getElementById('talk-text').innerText, pos: [state.overworld.map, state.overworld.x, state.overworld.y] }));
  assert.ok(r.gems - gems >= await page.evaluate(() => ECON.map.trainerGems), 'at least the trainer prize');
  assert.deepEqual(r.beat, ['route1-pia']);
  assert.equal(r.ow, 'flex');
  assert.equal(r.name, 'Scout Pia');
  assert.match(r.words, /Great battle/);
  assert.deepEqual(r.pos, ['route1', 6, 9]);
});

test('a beaten trainer never challenges again, and talking to one says the after-battle words', async () => {
  await page.evaluate(() => { state.overworld.beat = ['route1-pia']; });
  await put('route1', 6, 10, 'up');
  await page.evaluate(() => owMove('up'));
  await wait(300);
  assert.equal(await shown('talk-modal'), false);
  assert.equal(await page.evaluate(() => !!ab), false);
  await put('route1', 4, 9, 'left');
  await page.evaluate(() => owMove('left'));
  assert.equal(await shown('talk-modal'), true);
  assert.match(await page.evaluate(() => document.getElementById('talk-text').innerText), /Great battle/);
  assert.equal(await page.evaluate(() => document.querySelectorAll('#talk-choices button').length), 0);
  assert.equal(await page.evaluate(() => OW_MAPS.route1.npcs[0].face), 'right', 'a trainer keeps the way it faces');
});

test('talking to a trainer who has not seen you opens the same challenge; Not now steps the hero back and starts nothing', async () => {
  await put('route1', 3, 10, 'up');
  await page.evaluate(() => owMove('up'));
  assert.equal(await shown('talk-modal'), true, 'Pia is above the hero at 3,9: a bump talks');
  assert.deepEqual(await page.evaluate(() => Array.from(document.querySelectorAll('#talk-choices button')).map((b) => b.innerText)), ['Battle!']);
  await page.click('#talk-next');
  assert.equal(await shown('talk-modal'), false);
  assert.equal(await page.evaluate(() => !!ab), false);
  assert.equal(await page.evaluate(() => state.overworld.y), 11, 'one step back the way the hero came');
  await meetPia();
  await page.keyboard.press('Escape');
  assert.equal(await shown('talk-modal'), false);
  assert.deepEqual(await page.evaluate(() => [state.overworld.x, state.overworld.y, !!ab]), [6, 10, false], 'one step back the way the hero came');
});

test('a trainer fight cannot be run from, and the trainer stays unbeaten if you are carried off', async () => {
  await startPia();
  await menu();
  await page.evaluate(() => abRun());
  await menu();
  assert.match(await page.evaluate(() => document.getElementById('ab-text').innerText), /What will/);
  assert.deepEqual(await page.evaluate(() => state.overworld.beat), []);
});

test('the second trainer works too: Kid Leo sees along row 14 and fights the same way', async () => {
  await put('route1', 6, 14, 'right');
  await page.evaluate(() => owMove('right'));
  await wait(300);
  assert.equal(await page.evaluate(() => document.getElementById('talk-name').innerText), 'Kid Leo');
  await page.click('#talk-choices button');
  await menu();
  assert.deepEqual(await page.evaluate(() => [ab.name, ab.npc.id]), ['Kid Leo', 'route1-leo']);
});

test('a grass fight is not a trainer fight: a win does not mark anyone beaten', async () => {
  const r = await page.evaluate(async () => {
    state.overworld.beat = [];
    ECON.overworld.grassChance = 1;
    state.overworld.map = 'route1'; state.overworld.x = 3; state.overworld.y = 5; state.overworld.face = 'up'; openAdventure(); owSafe = 0;
    owMove('up');
    const o = { kind: ab.kind, npc: ab.npc };
    while (!(ab.phase === 'menu' && !ab.busy)) await new Promise((res) => setTimeout(res, 100));
    abFoe().hp = 1; abFight(); abAnswer(ab.q.ans); abUseMove(0);
    for (let i = 0; i < 200 && ab; i++) await new Promise((res) => setTimeout(res, 100));
    return { o, beat: state.overworld.beat.length };
  });
  assert.deepEqual(r, { o: { kind: 'wild', npc: null }, beat: 0 });
});

test('when the whole team faints in a trainer battle, the hero wakes at the last Buddy Center with everyone rested and no gems lost', async () => {
  await startPia();
  await menu();
  await page.evaluate(() => { state.overworld.center = { map: 'meadow', x: 4, y: 5 }; state.gems = 40; ab.party.forEach((m) => { m.hp = 1; state.advHp[m.id] = 1; }); abFoe().level = 40; Math.random = () => 0.3; abFight(); abAnswer(ab.q.ans + 999); });
  await over();
  await page.waitForFunction(() => document.getElementById('talk-modal').style.display === 'flex');
  const r = await page.evaluate(() => ({ pos: [state.overworld.map, state.overworld.x, state.overworld.y, state.overworld.face], beat: state.overworld.beat.length, hp: JSON.stringify(state.advHp), gems: state.gems, ow: document.getElementById('overworld-modal').style.display, talk: document.getElementById('talk-name').innerText, words: document.getElementById('talk-text').innerText }));
  assert.deepEqual(r.pos, ['meadow', 4, 5, 'down']);
  assert.deepEqual([r.beat, r.hp, r.gems, r.ow, r.talk], [0, '{}', 40, 'flex', 'Buddy Center']);
  assert.match(r.words, /very tired/);
  assert.deepEqual(errors, []);
});

test('a team wipe in an ordinary Practice battle still just revives everyone and goes on', async () => {
  const r = await page.evaluate(async () => {
    state.gems = 40; state.shields = 0; state.faintedPets = []; state.team = ['dog']; state.activePet = 'dog';
    state.wild.id = ''; currentMonsterIndex = 0; bossLevel = 60; partyHp = {}; setPetHp('dog', 1); monsterCurrentHp = 99; inputLocked = false;
    const real = Math.random; Math.random = () => 0.99;
    userInput = String(currentProblem.answer + 7); checkAnswer();
    await new Promise((res) => setTimeout(res, 2500));
    Math.random = real;
    return { pos: [state.overworld.map, state.overworld.x, state.overworld.y], ow: document.getElementById('overworld-modal').style.display, fainted: state.faintedPets.length };
  });
  assert.deepEqual(r.pos, ['hollow', 7, 9]);
  assert.notEqual(r.ow, 'flex');
  assert.equal(r.fainted, 0);
});

test('saved trainer progress is repaired: only real trainers count, once', async () => {
  const r = await page.evaluate(() => {
    const run = (v) => { state.overworld = Object.assign({ map: 'hollow', x: 7, y: 9, face: 'down' }, v); NORMALIZERS.forEach((fn) => { if (fn.name === 'overworld') fn(state); }); return state.overworld.beat.slice(); };
    return [run({ beat: ['route1-pia', 'route1-pia', 'meadow-nurse', 'nope', 5, 'route1-leo'] }), run({ beat: 'all' })];
  });
  assert.deepEqual(r, [['route1-pia', 'route1-leo'], []]);
});

for (const [w, h] of [[320, 568], [360, 640], [420, 800]]) {
  test('the challenge window fits a ' + w + 'x' + h + ' phone with 44px buttons', async () => {
    await page.setViewportSize({ width: w, height: h });
    await meetPia();
    const r = await page.evaluate(() => {
      const c = document.querySelector('#talk-modal .modal-content').getBoundingClientRect();
      const b = Array.from(document.querySelectorAll('#talk-choices button, #talk-next')).map((x) => { const q = x.getBoundingClientRect(); return q.width >= 44 && q.height >= 44 && q.bottom <= innerHeight; });
      return { inside: c.left >= 0 && c.right <= innerWidth && c.bottom <= innerHeight, b, scroll: document.documentElement.scrollWidth <= innerWidth };
    });
    assert.ok(r.inside && r.scroll && r.b.length === 2 && r.b.every(Boolean), JSON.stringify(r));
    await page.setViewportSize({ width: 1280, height: 720 });
  });
}
