// The Champion's Hall: opens after every gym badge (and stays open for a Champion), six buddies of six types that can swap, a big first reward and a small daily one.
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
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; state.storySeen.map = 1; });
});

const ALL = ['ember', 'tide', 'grove', 'volt', 'gloom', 'mystic'];
const beat = () => page.evaluate(async () => {
  monsterCurrentHp = 1; inputLocked = false; state.faintedPets = [];
  triggerMonsterDamage(99, false);
  await new Promise((res) => setTimeout(res, 3000));
  document.getElementById('raid-modal').style.display = 'none'; modalDone();
});
const closeStory = () => page.evaluate(() => { document.getElementById('raid-modal').style.display = 'none'; modalDone(); });

test('the Hall is locked until every badge is won; the map shows why', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    state.badges = ALL_7(); startChampion(); out.gym5 = state.gym;
    openMap(); out.locked = document.querySelector('#map-body .champion-row').className.includes('locked') && document.querySelector('#map-body .champion-row').innerText.includes('7/8'); closeMap();
    out.keeps = (state.storySeen.champion = 1, startChampion(), state.gym && state.gym.region); state.gym = null; state.storySeen.champion = 0;     // an old Champion keeps the Hall when gyms are added
    state.badges = gymRegions().map((x) => x.id); openMap();
    const btn = [...document.querySelectorAll('#map-body .champion-row .claim-btn')].map((b) => b.innerText).join();
    closeMap();
    return Object.assign(out, { btn });
    function ALL_7() { return gymRegions().map((x) => x.id).slice(0, 7); }
  });
  assert.equal(r.gym5, null);
  assert.equal(r.locked, true);
  assert.equal(r.keeps, 'champion', 'a Champion keeps the Hall');
  assert.match(r.btn, /Challenge/);
});

test('Nova has six buddies, one of each type, stronger than yours, that cannot be caught', async () => {
  const r = await page.evaluate(() => {
    state.badges = gymRegions().map((x) => x.id); state.buddyXp.dog = xpForLevel(30);
    const mine = getBuddyLevel(state.activePet), nets = state.nets;
    startChampion(); document.getElementById('raid-modal').style.display = 'none'; modalDone();
    const info = getBossInfo();
    return {
      types: CHAMPION_TEAM.map((id) => getSpecies(id).element).sort().join(), step: state.gym.step, region: state.gym.region, alive: championAlive().length,
      trainer: info.trainer, wild: info.wild, level: bossLevel - mine, chip: document.getElementById('weak-chip').innerText, nets: state.nets - nets,
      taunt: CHAMPION_LINES.some((t) => document.getElementById('boss-taunt-box').innerText.includes(t)), blocked: (travelTo('ember'), state.region !== 'ember')
    };
  });
  assert.equal(r.types, 'dark,electric,fire,magic,nature,water');
  assert.deepEqual({ step: r.step, region: r.region, alive: r.alive, trainer: r.trainer, wild: r.wild, level: r.level, nets: r.nets }, { step: 0, region: 'champion', alive: 6, trainer: 'Champion Nova', wild: true, level: 2, nets: 0 });
  assert.match(r.chip, /6 left/);
  assert.equal(r.taunt, true);
  assert.equal(r.blocked, true, 'no travelling mid-battle');
});

test('Nova swaps a hurt buddy (or one yours beats) for a clearly better one, never too often, and a fallen buddy never returns', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    state.badges = gymRegions().map((x) => x.id);
    startChampion(); document.getElementById('raid-modal').style.display = 'none'; modalDone();
    const pet = getActivePetDisplay(), cur = state.wild.id, max = getBossMaxHp();
    monsterCurrentHp = max; championAfterHit(pet); out.healthy = state.wild.id === cur || championMatchup(cur, pet) === -1;
    const c = state.gym.champ; c.cool = 0; c.swaps = 0;
    state.wild.id = cur; monsterCurrentHp = 1;               // nearly out of HP
    championAfterHit(pet);
    out.swapped = state.wild.id !== cur; out.swaps = c.swaps; out.savedHp = c.hp[cur]; out.cool = c.cool;
    const second = state.wild.id; monsterCurrentHp = 1; championAfterHit(pet);
    out.cooldown = state.wild.id === second;
    c.cool = 0; c.swaps = ECON.map.champion.maxSwaps; monsterCurrentHp = 1; championAfterHit(pet);
    out.capped = state.wild.id === second;
    c.fallen.push(cur); c.cool = 0; c.swaps = 0; state.wild.id = second; monsterCurrentHp = 1; championAfterHit(pet);
    out.neverFallen = state.wild.id !== cur;
    return out;
  });
  assert.equal(r.healthy, true);
  assert.equal(r.swapped, true);
  assert.equal(r.swaps, 1);
  assert.equal(r.savedHp, 1, 'the buddy that stepped out keeps its HP');
  assert.equal(r.cool, 3);
  assert.equal(r.cooldown, true);
  assert.equal(r.capped, true);
  assert.equal(r.neverFallen, true);
});

test('beating all of Nova\'s six buddies pays the big first reward once: gems, nets, held items, three gear pieces, and the Champion title', async () => {
  await page.evaluate(() => {
    state.badges = gymRegions().map((x) => x.id); state.gems = 0; state.nets = 0; state.heldOwned = ['berry']; state.storySeen.champion = 0;
    startChampion(); document.getElementById('raid-modal').style.display = 'none'; modalDone();
  });
  for (let i = 0; i < 5; i++) {
    await beat();
    const mid = await page.evaluate(() => ({ step: state.gym && state.gym.step, left: championAlive().length, champion: !!state.storySeen.champion }));
    assert.deepEqual(mid, { step: i + 1, left: 5 - i, champion: false });
  }
  const gems0 = await page.evaluate(() => state.gems);
  await beat();
  const r = await page.evaluate((gems0) => ({
    gym: state.gym, champion: state.storySeen.champion, wins: state.champ.wins, nets: state.nets, held: state.heldOwned.slice().sort().join(),
    gain: state.gems - gems0, gear: ['champlaurel', 'champtrophy'].every((id) => state.unlockedAccessories.indexOf(id) !== -1) && state.unlockedArmor.indexOf('champmantle') !== -1,
    title: document.getElementById('raid-title').innerText, text: document.getElementById('raid-panels').innerText, fainted: state.faintedPets.length
  }), gems0);
  assert.equal(r.gym, null);
  assert.equal(r.champion, 1);
  assert.equal(r.wins, 1);
  assert.equal(r.nets, 3);
  assert.equal(r.held, 'bait,berry,charm,lens,shell');
  assert.equal(r.gear, true);
  assert.ok(r.gain >= 500 + 40, 'the first win pays 500 gems, plus the shop price of the Oran Berry that was already owned (+ the last fight)');
  assert.match(r.title, /beat the Champion/);
  assert.match(r.text, /Laurel/);
  assert.equal(r.fainted, 0);
});

test('a repeat win pays a little once a day, and no gear again; the map then offers a rematch', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    state.badges = gymRegions().map((x) => x.id); state.storySeen.champion = 1; state.champ = { wins: 1, day: '2000-01-01' };
    state.gems = 0; state.nets = 0; state.heldOwned = [];
    state.gym = { region: 'champion', step: 5, champ: Object.assign(freshChampionRun(), { fallen: CHAMPION_TEAM.slice(0, 5) }) };
    state.wild.id = CHAMPION_TEAM[5];
    const a = championFell(); out.first = [a.first, a.gems, a.nets, a.held.length, state.champ.wins];
    state.gym = { region: 'champion', step: 5, champ: Object.assign(freshChampionRun(), { fallen: CHAMPION_TEAM.slice(0, 5) }) };
    state.wild.id = CHAMPION_TEAM[5];
    const b = championFell(); out.same = [b.gems, state.champ.wins];
    state.champ.day = '2000-01-01';
    openMap(); out.btn = [...document.querySelectorAll('#map-body .champion-row .claim-btn')].map((x) => x.innerText).join(); closeMap();
    return out;
  });
  assert.deepEqual(r.first, [false, 50, 0, 0, 2]);
  assert.deepEqual(r.same, [0, 3]);
  assert.match(r.btn, /Rematch/);
});

test('a fight in progress survives a reload with the same buddy, its HP and who has fallen; a broken or unearned save is repaired', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    state.badges = gymRegions().map((x) => x.id);
    startChampion(); document.getElementById('raid-modal').style.display = 'none'; modalDone();
    const c = state.gym.champ, cur = state.wild.id, other = c.team.find((id) => id !== cur);
    c.fallen = [other]; state.gym.step = 1; monsterCurrentHp = 2; c.hp[cur] = 2;
    saveState();
    out.saved = { cur, other };
    state.gym = { region: 'champion', step: 99, champ: { team: ['x'], fallen: ['x', 'dog', CHAMPION_TEAM[0], CHAMPION_TEAM[0]], hp: { [CHAMPION_TEAM[1]]: 'lots', [CHAMPION_TEAM[2]]: -4, [CHAMPION_TEAM[3]]: 7 }, swaps: 1e9, cool: -3, level: 'x' } };
    NORMALIZERS.forEach((fn) => fn(state));
    out.fixed = { team: state.gym.champ.team.join() === CHAMPION_TEAM.join(), fallen: state.gym.champ.fallen.join(), step: state.gym.step, hp: JSON.stringify(state.gym.champ.hp), swaps: state.gym.champ.swaps, cool: state.gym.champ.cool, level: state.gym.champ.level };
    state.gym = { region: 'champion', step: 0, champ: { fallen: CHAMPION_TEAM.slice() } }; NORMALIZERS.forEach((fn) => fn(state));
    out.allFallen = state.gym.champ.fallen.length;
    state.badges = ['ember']; state.gym = { region: 'champion', step: 0, champ: {} }; NORMALIZERS.forEach((fn) => fn(state));
    out.unearned = state.gym;
    state.champ = { wins: 'many', day: 5 }; NORMALIZERS.forEach((fn) => fn(state)); out.champ = JSON.stringify(state.champ);
    return out;
  });
  assert.equal(r.fixed.team, true);
  assert.equal(r.fixed.fallen, 'phoenix');
  assert.equal(r.fixed.step, 1);
  assert.equal(r.fixed.hp, JSON.stringify({ griffin: 7 }));
  assert.equal(r.fixed.swaps, 99);
  assert.equal(r.fixed.cool, 0);
  assert.equal(r.fixed.level, 0);
  assert.equal(r.allFallen, 0);
  assert.equal(r.unearned, null);
  assert.equal(r.champ, JSON.stringify({ wins: 0, day: '' }));

  // a real reload
  await page.evaluate(() => {
    localStorage.clear(); state.badges = gymRegions().map((x) => x.id);
    startChampion(); document.getElementById('raid-modal').style.display = 'none'; modalDone();
    const c = state.gym.champ, cur = state.wild.id; monsterCurrentHp = 2; c.hp[cur] = 2; window.__cur = cur; saveState();
  });
  const cur = await page.evaluate(() => window.__cur);
  await page.reload();
  const after = await page.evaluate(() => ({ id: state.wild.id, hp: monsterCurrentHp, inFight: inChampionBattle(), left: inChampionBattle() ? championAlive().length : 0, level: bossLevel === state.gym.champ.level }));
  assert.deepEqual(after, { id: cur, hp: 2, inFight: true, left: 6, level: true });
});

test('leaving the battle ends it without a reward, and a lost fight costs nothing', async () => {
  const r = await page.evaluate(() => {
    state.badges = gymRegions().map((x) => x.id); state.gems = 7;
    startChampion(); document.getElementById('raid-modal').style.display = 'none'; modalDone();
    leaveGym();
    return { gym: state.gym, gems: state.gems, wins: state.champ.wins, wild: !!state.wild.id };
  });
  assert.deepEqual(r, { gym: null, gems: 7, wins: 0, wild: true });
  assert.deepEqual(errors, []);
});
