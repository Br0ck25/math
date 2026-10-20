// The Adventure story: Riley, the Scramblers (two math puzzles and a hideout boss), the Champion's Walk and Hall, and what is there after you win.
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
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; state.storySeen.map = 1; state.hero.made = true; });
});
const put = (map, x, y, face = 'up') => page.evaluate(([m, px, py, f]) => {
  state.overworld.map = m; state.overworld.x = px; state.overworld.y = py; state.overworld.face = f;
  if (document.getElementById('overworld-modal').style.display !== 'flex') openAdventure();
  renderOverworld();
}, [map, x, y, face]);
const shown = (id) => page.evaluate((i) => document.getElementById(i).style.display === 'flex', id);
const wait = (ms) => page.waitForTimeout(ms);
// Wins the fight in progress: a trainer on the new battle screen, a boss on the Practice screen.
const win = () => page.evaluate(async () => {
  if (typeof ab !== 'undefined' && ab) {
    Math.random = () => 0.3;                                                                          // every move lands, no status, no critical hit
    const ready = async () => { for (let i = 0; i < 300 && ab && !(ab.phase === 'menu' && !ab.busy); i++) { if (ab.phase === 'learn' && !ab.busy) abLearnChoose(-1); await new Promise((res) => setTimeout(res, 100)); } };
    for (let k = 0; k < 12 && ab; k++) { await ready(); if (!ab) break; ab.foes.forEach((f) => { f.atk = 1; f.spc = 1; }); abFoe().hp = 1; abFight(); abAnswer(ab.q.ans); ab.party.forEach((m) => m.moves.forEach((mv) => { mv.left = mv.pp; })); abUseMove(0); await new Promise((res) => setTimeout(res, 300)); }
    for (let i = 0; i < 300 && ab; i++) await new Promise((res) => setTimeout(res, 100));
    return;
  }
  rollCatch = function () {}; checkForSecretLootDrop = function () {};
  monsterCurrentHp = 1; inputLocked = false; state.faintedPets = [];
  triggerMonsterDamage(99, false);
  await new Promise((res) => setTimeout(res, 3000));
});

test('the story data is sound: known beats, prizes only for real beats, every needs a real badge, scenes and bosses have what they need', async () => {
  const r = await page.evaluate(() => {
    const out = [], ids = allGymRegions().map((g) => g.id).concat('champion');
    Object.keys(OW_MAPS).forEach((k) => (OW_MAPS[k].npcs || []).forEach((n) => {
      if (n.needs && ids.indexOf(n.needs) === -1) out.push(n.id + ': needs ' + n.needs);
      if (n.story && OW_STORY.indexOf(n.story) === -1) out.push(n.id + ': unknown story ' + n.story);
      if (n.kind === 'scene' && (!n.lines || !n.lines.length)) out.push(n.id + ': a scene needs words');
      if (n.kind === 'boss' && !monstersList.some((m) => m.element === n.boss && !m.slays && !m.minLevel)) out.push(n.id + ': no boss of ' + n.boss);
      if (n.vanish && !(n.kind === 'trainer' || n.kind === 'boss' || n.story)) out.push(n.id + ': vanish needs a fight or a story');
    }));
    Object.keys(ECON.overworld.storyGems).forEach((s) => { if (OW_STORY.indexOf(s) === -1 || !(ECON.overworld.storyGems[s] > 0)) out.push('prize for ' + s); });
    Object.keys(OW_MAPS).forEach((k) => Object.keys(OW_MAPS[k].signs || {}).forEach((p) => { const s = OW_MAPS[k].signs[p]; if (s.story && (OW_STORY.indexOf(s.story) === -1 || !(s.rounds >= 2) || !owIds('trainer').includes(s.after))) out.push(s.id + ': a puzzle needs a beat, rounds and a trainer to beat first'); }));
    return { out, story: OW_STORY, ids: owIds('story') };
  });
  assert.deepEqual(r.out, []);
  assert.deepEqual(r.ids, r.story);
});

test('Riley meets you on Route 1: a "!", her words, a battle through the trainer path, and she is gone afterwards', async () => {
  await put('route1', 7, 21, 'up');
  await page.evaluate(() => owMove('up'));
  await wait(300);
  assert.equal(await page.evaluate(() => document.getElementById('talk-name').innerText), 'Rival Riley');
  assert.match(await page.evaluate(() => document.getElementById('talk-text').innerText), /I am Riley/);
  await page.click('#talk-next');
  await page.click('#talk-choices button');
  await page.waitForFunction(() => typeof ab !== 'undefined' && ab);
  assert.deepEqual(await page.evaluate(() => [ab.name, ab.npc.id]), ['Rival Riley', 'route1-riley']);
  await win();
  const r = await page.evaluate(() => ({ beat: state.overworld.beat.slice(), words: document.getElementById('talk-text').innerText, here: !!owNpcAt(OW_MAPS.route1, 10, 20), drawn: document.querySelectorAll('.ow-npc').length, ow: document.getElementById('overworld-modal').style.display }));
  assert.deepEqual(r.beat, ['route1-riley']);
  assert.match(r.words, /See you at the gyms/);
  assert.equal(r.here, false, 'she is gone');
  assert.equal(r.ow, 'flex');
});

test('Riley is only on Route 4 once you hold the Tide Badge, and on Route 6 after the Volt Badge; before that the road is empty and walkable', async () => {
  const r = await page.evaluate(() => {
    const at = (map, x, y) => !!owNpcAt(OW_MAPS[map], x, y);
    state.badges = ['meadow', 'ember']; const before = [at('route4', 10, 6), at('route6', 10, 5), owWalkable(OW_MAPS.route4, 10, 6)];
    state.badges = ['meadow', 'ember', 'tide']; const tide = [at('route4', 10, 6), at('route6', 10, 5)];
    state.badges = ['meadow', 'ember', 'tide', 'grove', 'volt']; const volt = [at('route4', 10, 6), at('route6', 10, 5)];
    state.overworld.beat = ['route4-riley', 'route6-riley']; const gone = [at('route4', 10, 6), at('route6', 10, 5)];
    return { before, tide, volt, gone };
  });
  assert.deepEqual(r.before, [false, false, true]);
  assert.deepEqual(r.tide, [true, false]);
  assert.deepEqual(r.volt, [true, true]);
  assert.deepEqual(r.gone, [false, false]);
});

test('Riley and the Ace trainers are a little stronger than a normal trainer (levelBonus)', async () => {
  const r = await page.evaluate(() => {
    state.region = 'meadow';
    const lv = (npc) => { const d = []; for (let i = 0; i < 24; i++) { ab = null; startTrainerFight(npc); d.push(Math.min(...ab.foes.map((f) => f.level))); ab = null; } return d; };
    const riley = lv(owNpcById('walk-riley')), ace = lv(owNpcById('walk-joule')), plain = lv(owNpcById('route2-brick'));
    return { rileyMin: Math.min(...riley), aceMin: Math.min(...ace), plainMax: Math.max(...plain), rb: owNpcById('walk-riley').levelBonus, ab: owNpcById('walk-joule').levelBonus };
  });
  assert.ok(r.rileyMin >= 2 + r.rb && r.aceMin >= 2 + r.ab && r.plainMax <= 5, JSON.stringify(r));
});

for (const [map, zig, story, gems, sx, sy, start] of [['tide', 'tide-zig', 'tide-ferry', 20, 5, 12, [7, 13]], ['volt', 'volt-zag', 'volt-blackout', 25, 5, 12, [7, 13]]]) {
  test('the ' + map + ' puzzle: a Scrambler guards it, then three questions in a row (wrong answers free) fix it for a one-time prize', async () => {
    await put(map, start[0], start[1], 'up');
    await page.evaluate(() => owMove('up'));                                                              // into the Scrambler\'s sight
    await wait(300);
    assert.match(await page.evaluate(() => document.getElementById('talk-name').innerText), /Scrambler/);
    await page.click('#talk-next');
    await page.click('#talk-choices button');                                                              // fight starts
    await page.waitForFunction(() => typeof ab !== 'undefined' && ab);
    assert.deepEqual(await page.evaluate(() => [ab.npc.id]), [zig]);
    await page.evaluate(() => { ab = null; document.getElementById('ab-modal').style.display = 'none'; state.overworld.beat = []; });
    await put(map, sx, sy + 1, 'up');
    const locked = await page.evaluate(() => { owMove('up'); const t = document.getElementById('talk-text').innerText; closeTalk(); return t; });
    assert.match(locked, /Scrambler named/);
    await page.evaluate((id) => { state.overworld.beat = [id]; state.gems = 0; }, zig);                  // beaten
    const r = await page.evaluate(async (sid) => {
      owMove('up');
      const out = { notes: [document.getElementById('talk-note').innerText] };
      const answer = (good) => { const q = talk.quiz.q, pick = good ? q.ans : q.opts.find((v) => v !== q.ans); document.querySelectorAll('#talk-opts button')[q.opts.indexOf(pick)].click(); };
      answer(false); out.wrong = [document.getElementById('talk-note').innerText, state.gems, talk.quiz.round];
      answer(true); out.notes.push(document.getElementById('talk-note').innerText);
      answer(true); out.notes.push(document.getElementById('talk-note').innerText);
      out.before = [state.gems, state.overworld.story.slice()];
      answer(true);
      out.after = [state.gems, state.overworld.story.slice(), document.getElementById('talk-note').innerText, Array.from(document.querySelectorAll('#talk-opts button')).every((b) => b.disabled)];
      closeTalk();
      owMove('up'); out.again = document.getElementById('talk-text').innerText; closeTalk();
      owMove('up'); out.gemsAfterAgain = state.gems;
      return out;
    }, story);
    assert.match(r.notes[0], /Question 1 of 3/);
    assert.deepEqual(r.wrong, ['Not quite. Try another one!', 0, 1]);
    assert.match(r.notes[1], /Question 2 of 3/);
    assert.match(r.notes[2], /Question 3 of 3/);
    assert.deepEqual(r.before, [0, []]);
    assert.deepEqual(r.after.slice(0, 2), [gems, [story]]);
    assert.equal(r.after[2], 'All fixed! Thank you!');
    assert.equal(r.after[3], true);
    assert.match(r.again, /back|on time|back on/);
    assert.equal(r.gemsAfterAgain, gems, 'the prize is paid once, ever');
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('math_quest_save')).overworld.story), [story]);
    assert.deepEqual(errors, []);
  });
}

test('the hideout in Gloom Marsh: a door in the rocks, two Scramblers, then Boss Scramble, a real boss from the boss list', async () => {
  await put('gloom', 14, 7, 'up');
  await page.evaluate(() => owMove('up'));
  assert.deepEqual(await page.evaluate(() => [state.overworld.map, state.overworld.x, state.overworld.y, document.getElementById('ow-title').innerText]), ['gloom-hideout', 4, 7, 'Scrambler Hideout']);
  await page.evaluate(() => { state.overworld.beat = ['gloom-pix', 'gloom-dab']; owMove('up'); owMove('up'); owMove('up'); });       // walk up the middle: the boss sees you at 4,4
  await wait(300);
  assert.equal(await page.evaluate(() => document.getElementById('talk-name').innerText), 'Boss Scramble');
  await page.click('#talk-next');
  await page.click('#talk-choices button');
  await page.waitForFunction(() => typeof ab !== 'undefined' && ab);
  const r = await page.evaluate(() => ({ kind: ab.kind, npc: ab.npc.id, foes: ab.foes.length, boss: ab.foes[0].element, name: ab.name === monstersList.find((m) => ab.name.endsWith(m.name)).name || /^(Elder|Alpha) /.test(ab.name), buddies: ab.foes.slice(1).every((f) => f.id && f.element === 'dark') }));
  assert.deepEqual(r, { kind: 'leader', npc: 'gloom-boss', foes: 3, boss: 'dark', name: true, buddies: true });
});

test('winning against Boss Scramble pays the story prize once, and the boss is gone', async () => {
  await put('gloom-hideout', 4, 3, 'up');
  await page.evaluate(() => { state.overworld.beat = ['gloom-pix', 'gloom-dab']; state.gems = 0; state.buddyXp[state.activePet] = xpForLevel(30); });
  await page.evaluate(() => owMove('up'));                                                                // 4,3 -> 4,2: the boss at 4,1 is next to the hero: a bump talks
  await page.evaluate(() => owMove('up'));
  await page.click('#talk-next').catch(() => {});
  if (!(await shown('talk-modal'))) throw new Error('no talk window');
  await page.click('#talk-choices button');
  await win();
  await page.waitForFunction(() => document.getElementById('talk-modal').style.display === 'flex');
  const r = await page.evaluate(() => ({ beat: state.overworld.beat.includes('gloom-boss'), story: state.overworld.story.slice(), gems: state.gems, here: !!owNpcAt(OW_MAPS['gloom-hideout'], 4, 1), ow: document.getElementById('overworld-modal').style.display, talk: document.getElementById('talk-text').innerText }));
  assert.ok(r.beat);
  assert.deepEqual(r.story, ['gloom-scramblers']);
  assert.ok(r.gems >= await page.evaluate(() => ECON.overworld.storyGems['gloom-scramblers']), 'the prize is paid');
  assert.equal(r.here, false);
  assert.equal(r.ow, 'flex');
  assert.match(r.talk, /my numbers|Counting is more fun|all back in order/i);
});

test('when the team faints against the boss, the hero wakes at the last Center with half the gems lost and the boss still waiting', async () => {
  await put('gloom-hideout', 4, 3, 'up');
  await page.evaluate(() => { state.overworld.beat = ['gloom-pix', 'gloom-dab']; owMove('up'); owMove('up'); });
  await page.click('#talk-next').catch(() => {});
  await page.click('#talk-choices button');
  await page.waitForFunction(() => typeof ab !== 'undefined' && ab && !ab.busy && ab.phase === 'menu', null, { timeout: 30000 });
  await page.evaluate(() => { state.overworld.center = { map: 'gloom', x: 4, y: 5 }; state.gems = 40; ab.party.forEach((m) => { m.hp = 1; state.advHp[m.id] = 1; }); ab.foes.forEach((f) => { f.level = 60; }); Math.random = () => 0.3; abFight(); abAnswer(ab.q.ans + 999); });
  await page.waitForFunction(() => !ab, null, { timeout: 30000 });
  const r = await page.evaluate(() => ({ pos: [state.overworld.map, state.overworld.x, state.overworld.y], gems: state.gems, beat: state.overworld.beat.includes('gloom-boss'), boss: !!owNpcAt(OW_MAPS['gloom-hideout'], 4, 1) }));
  assert.deepEqual(r.pos, ['gloom', 4, 5]);
  assert.deepEqual([r.gems, r.beat, r.boss], [20, false, true]);
});

test('Riley tells the truth in Skyreach once you hold its badge: four lines, then she is gone; after the Champion a different Riley is there', async () => {
  const r = await page.evaluate(() => {
    const at = (x, y) => !!owNpcAt(OW_MAPS.skyreach, x, y);
    state.badges = ['meadow']; const early = [at(9, 11), at(9, 10)];
    state.badges = gymRegions().map((g) => g.id); const withBadge = [at(9, 11), at(9, 10)];
    state.storySeen.champion = 1; const champ = [at(9, 11), at(9, 10)];
    state.storySeen.champion = 0;
    return { early, withBadge, champ };
  });
  assert.deepEqual(r.early, [false, false]);
  assert.deepEqual(r.withBadge, [true, false]);
  assert.deepEqual(r.champ, [true, true]);
  await put('skyreach', 10, 11, 'left');
  const lines = await page.evaluate(() => { state.badges = gymRegions().map((g) => g.id); renderOverworld(); owMove('left'); const out = []; for (let i = 0; i < 4; i++) { out.push(document.getElementById('talk-text').innerText); if (i < 3) document.getElementById('talk-next').click(); } return out; });
  assert.match(lines[0], /Skyreach Badge/);
  assert.match(lines[1], /not to beat you/);
  assert.match(lines[2], /Thank you, partner/);
  assert.match(lines[3], /Champion's Walk/);
  await page.click('#talk-next');
  const after = await page.evaluate(() => ({ story: state.overworld.story.slice(), here: !!owNpcAt(OW_MAPS.skyreach, 9, 11), gems: state.gems }));
  assert.deepEqual([after.story, after.here], [['riley-reveal'], false]);
  await page.evaluate(() => { state.storySeen.champion = 1; renderOverworld(); });
  await put('skyreach', 10, 10, 'left');
  await page.evaluate(() => owMove('left'));
  assert.match(await page.evaluate(() => document.getElementById('talk-text').innerText), /so proud of you/);
});

test('the road from Skyreach to the Champion\'s Walk opens with the Skyreach Badge; the Walk has three Ace trainers and Riley\'s last race', async () => {
  await put('skyreach', 7, 1, 'up');
  const blocked = await page.evaluate(() => { state.badges = []; renderOverworld(); owMove('up'); return { y: state.overworld.y, text: document.getElementById('talk-text').innerText }; });
  assert.equal(blocked.y, 1);
  assert.match(blocked.text, /Skyreach Badge/);
  await page.evaluate(() => { closeTalk(); state.badges = ['skyreach']; renderOverworld(); owMove('up'); });
  assert.deepEqual(await page.evaluate(() => [state.overworld.map, state.overworld.x, state.overworld.y, document.getElementById('ow-title').innerText]), ['champwalk', 6, 18, "Champion's Walk"]);
  const r = await page.evaluate(() => ({ trainers: OW_MAPS.champwalk.npcs.filter((n) => n.kind === 'trainer').map((n) => n.id), grass: OW_MAPS.champwalk.rows.join('').includes('"'), riley: !!owNpcAt(OW_MAPS.champwalk, 10, 6) }));
  assert.deepEqual(r.trainers, ['walk-joule', 'walk-brook', 'walk-sage', 'walk-riley']);
  assert.equal(r.grass, false, 'no wild fights on the Walk: only the trainers');
  assert.equal(r.riley, true);
  await put('champwalk', 6, 16, 'up');
  await page.evaluate(() => owMove('up'));                                                                // 6,15: Ace Joule at 3,15 sees along the row
  await wait(300);
  assert.equal(await page.evaluate(() => document.getElementById('talk-name').innerText), 'Ace Joule');
});

test('the Hall door: shut until every badge is won, then it offers the Hall run (Nova\'s six buddies); a Champion is offered a rematch', async () => {
  await put('champwalk', 6, 4, 'up');
  const shut = await page.evaluate(() => { state.badges = ['meadow', 'ember']; renderOverworld(); owMove('up'); const t = talk.lines.join(' '); const out = { t, choices: document.querySelectorAll('#talk-choices button').length, pos: [state.overworld.y] }; closeTalk(); return out; });
  assert.match(shut.t, /all 8 gym badges. You have 2/);
  assert.equal(shut.choices, 0);
  const open = await page.evaluate(() => { state.badges = gymRegions().map((g) => g.id); renderOverworld(); state.overworld.y = 4; owMove('up'); const name = document.getElementById('talk-name').innerText; document.getElementById('talk-next').click(); return { name, choices: Array.from(document.querySelectorAll('#talk-choices button')).map((b) => b.innerText) }; });
  assert.deepEqual(open, { name: "Champion's Hall", choices: ['Enter the Hall'] });
  await page.click('#talk-choices button');
  await page.waitForFunction(() => typeof ab !== 'undefined' && ab);
  const run = await page.evaluate(() => ({ rounds: ab.rounds.map((r) => r.name), ow: document.getElementById('overworld-modal').style.display }));
  assert.deepEqual(run, { rounds: ['Elite Sol', 'Elite Marin', 'Elite Volta', 'Elite Noct', 'Champion Nova'], ow: 'none' });
  await page.evaluate(() => { ab = null; document.getElementById('ab-modal').style.display = 'none'; state.champ.wins = 1; state.storySeen.champion = 1; });
  await put('champwalk', 6, 4, 'up');
  const again = await page.evaluate(() => { state.overworld.y = 4; owMove('up'); return Array.from(document.querySelectorAll('#talk-choices button')).map((b) => b.innerText); });
  assert.deepEqual(again, ['Rematch!']);
});

test('Nova stands by the road only after you are Champion, and talks about rematches and legends', async () => {
  const r = await page.evaluate(() => { const at = () => !!owNpcAt(OW_MAPS.champwalk, 8, 4); const before = at(); state.storySeen.champion = 1; return [before, at()]; });
  assert.deepEqual(r, [false, true]);
  await put('champwalk', 7, 4, 'right');
  await page.evaluate(() => owMove('right'));
  assert.equal(await page.evaluate(() => document.getElementById('talk-name').innerText), 'Champion Nova');
  assert.match(await page.evaluate(() => talk.lines.join(' ')), /rematch/);
});

test('saved story beats are repaired: only the real ones, once each', async () => {
  const r = await page.evaluate(() => {
    state.overworld = Object.assign({ map: 'hollow', x: 7, y: 9, face: 'down' }, { story: ['volt-blackout', 'volt-blackout', 'nope', 7, 'riley-reveal'] });
    NORMALIZERS.forEach((fn) => { if (fn.name === 'overworld') fn(state); });
    const a = state.overworld.story.slice();
    state.overworld = { map: 'hollow', x: 7, y: 9, story: 'all' }; NORMALIZERS.forEach((fn) => { if (fn.name === 'overworld') fn(state); });
    return [a, state.overworld.story.slice()];
  });
  assert.deepEqual(r, [['volt-blackout', 'riley-reveal'], []]);
});

for (const [w, h] of [[320, 568], [420, 800]]) {
  test('the puzzle and the Hall door fit a ' + w + 'x' + h + ' phone with 44px answers', async () => {
    await page.setViewportSize({ width: w, height: h });
    await put('tide', 5, 13, 'up');
    const r = await page.evaluate(() => {
      state.overworld.beat = ['tide-zig']; owMove('up');
      const c = document.querySelector('#talk-modal .modal-content').getBoundingClientRect();
      const btns = Array.from(document.querySelectorAll('#talk-opts button, #talk-next')).map((b) => { const q = b.getBoundingClientRect(); return q.width >= 44 && q.height >= 44 && q.bottom <= innerHeight; });
      return { inside: c.left >= 0 && c.right <= innerWidth && c.bottom <= innerHeight && document.documentElement.scrollWidth <= innerWidth, btns };
    });
    assert.ok(r.inside && r.btns.length === 4 && r.btns.every(Boolean), JSON.stringify(r));
    await page.setViewportSize({ width: 1280, height: 720 });
  });
}
