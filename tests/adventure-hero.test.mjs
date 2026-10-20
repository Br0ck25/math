// The Adventure hero (Who are you?), key items, the Bag and the Team window.
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
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; state.storySeen.map = 1; });
});
const shown = (id) => page.evaluate((i) => document.getElementById(i).style.display === 'flex', id);
const madeHero = () => page.evaluate(() => { state.hero.made = true; state.hero.name = 'Sam'; grantKeyItem('badge-case'); grantKeyItem('running-shoes'); });

test('the first walk starts with Who are you?, and finishing it gives the name, the look and two key items', async () => {
  await page.evaluate(() => openAdventure());
  assert.equal(await shown('hero-modal'), true);
  assert.equal(await shown('overworld-modal'), false, 'the map waits for the hero');
  assert.equal(await page.evaluate(() => document.getElementById('hero-title').innerText), 'Who are you?');
  await page.fill('#hero-name', 'Sam3!');
  assert.equal(await page.inputValue('#hero-name'), 'Sam', 'letters only, as you type');
  await page.click('.hero-chip >> text=Rowan');
  assert.equal(await page.inputValue('#hero-name'), 'Rowan');
  await page.click('[aria-label="Hair colour: Red"]');
  await page.click('[aria-label="Outfit: Green"]');
  await page.click('[aria-label="Skin: Deep brown"]');
  await page.click('[aria-label="Hair style: Spiky"]');
  const vars = await page.evaluate(() => { const h = document.querySelector('#hero-preview .w-hero'); return [h.style.getPropertyValue('--hero-skin'), h.style.getPropertyValue('--hero-hair'), h.style.getPropertyValue('--hero-outfit')]; });
  assert.deepEqual(vars.map((v) => v.toLowerCase()), ['#5c3a1e', '#c0392b', '#22c55e']);
  await page.click('#hero-go');
  const r = await page.evaluate(() => ({ hero: state.hero, keys: state.keyItems, saved: JSON.parse(localStorage.getItem('math_quest_save')).hero }));
  assert.deepEqual(r.hero, { name: 'Rowan', look: { skin: 5, hair: 5, outfit: 2, style: 2 }, made: true });
  assert.deepEqual(r.keys, ['badge-case', 'running-shoes']);
  assert.deepEqual(r.saved, r.hero);
  assert.equal(await shown('hero-modal'), false);
  assert.equal(await shown('overworld-modal'), true, 'then the walk begins');
  assert.equal(await page.evaluate(() => document.querySelector('#ow-view .w-hero').style.getPropertyValue('--hero-hair').toLowerCase()), '#c0392b', 'the hero on the map wears the look');
  assert.deepEqual(errors, []);
});

test('the second walk goes straight to the map, and an empty or odd name becomes a safe one', async () => {
  await page.evaluate(() => openAdventure());
  await page.fill('#hero-name', '');
  await page.click('#hero-go');
  assert.equal(await page.evaluate(() => state.hero.name), '');
  assert.equal(await page.evaluate(() => heroName()), 'Explorer');
  await page.evaluate(() => hideModal('overworld-modal'));
  await page.evaluate(() => openAdventure());
  assert.equal(await shown('hero-modal'), false);
  assert.equal(await shown('overworld-modal'), true);
  const names = await page.evaluate(() => ['  a  b  ', '<img onerror=x>', 'ABCDEFGHIJKLMNOP', 12, null, undefined, 'Zoë'].map(cleanHeroName));
  assert.deepEqual(names, ['a b', 'img onerro', 'ABCDEFGHIJ', '', '', '', 'Zo']);
});

test('closing the creator with Escape starts nothing and keeps no hero', async () => {
  await page.evaluate(() => openAdventure());
  await page.keyboard.press('Escape');
  assert.equal(await shown('hero-modal'), false);
  assert.equal(await shown('overworld-modal'), false);
  assert.equal(await page.evaluate(() => state.hero.made), false);
  assert.deepEqual(await page.evaluate(() => state.keyItems), []);
});

test('a bad or old save is repaired: look indexes, name, key items and duplicates', async () => {
  const r = await page.evaluate(() => {
    const run = (hero, keys) => { state.hero = hero; state.keyItems = keys; NORMALIZERS.forEach((fn) => { if (fn.name === 'hero' || fn.name === 'keyItems') fn(state); }); return { hero: JSON.parse(JSON.stringify(state.hero)), keys: state.keyItems.slice() }; };
    return [
      run({ name: '<b>Bob</b>!!', look: { skin: 99, hair: -4, outfit: 'x', style: 7.9 }, made: 'yes' }, ['badge-case', 'badge-case', 'laser', 5, 'running-shoes']),
      run(null, 'nope'), run({ name: 'Ann', look: null, made: true }, [])
    ];
  });
  assert.deepEqual(r[0], { hero: { name: 'bBobb', look: { skin: 5, hair: 0, outfit: 0, style: 3 }, made: false }, keys: ['badge-case', 'running-shoes'] });
  assert.deepEqual(r[1], { hero: { name: '', look: { skin: 0, hair: 0, outfit: 0, style: 0 }, made: false }, keys: [] });
  assert.deepEqual(r[2], { hero: { name: 'Ann', look: { skin: 0, hair: 0, outfit: 0, style: 0 }, made: true }, keys: [] });
});

test('the Running Shoes make a held D-pad key walk faster', async () => {
  const step = (shoes) => page.evaluate(async (has) => {
    state.keyItems = has ? ['running-shoes'] : [];
    ECON.overworld.holdMs = 400; ECON.overworld.shoeMs = 40;
    state.hero.made = true; openAdventure();
    const delays = [], real = window.setInterval;
    window.setInterval = function (f, ms) { delays.push(ms); return real(f, ms); };
    owHold('up');
    await new Promise((res) => setTimeout(res, 1200));
    owRelease();
    window.setInterval = real;
    hideModal('overworld-modal');
    return delays[0];
  }, shoes);
  assert.equal(await step(false), 400);
  assert.equal(await step(true), 40);
});

test('the Bag shows key items, badges, supplies, held items and the egg from the real save', async () => {
  await madeHero();
  const r = await page.evaluate(() => {
    state.badges = ['ember']; state.shields = 3; state.nets = 4; state.gems = 77; state.cloverLeft = 5;
    state.heldOwned = ['berry']; state.held = { dog: 'berry' }; state.egg = { element: 'fire', rarity: 'common', steps: 2, target: 5 };
    openAdventure(); openBag();
    return { title: document.getElementById('bag-title').innerText, text: document.getElementById('bag-body').innerText, art: document.querySelectorAll('#bag-body .bag-key-art use').length, over: document.getElementById('bag-modal').style.display };
  });
  assert.equal(r.title, "Sam's Bag");
  assert.match(r.text, /Badge Case/);
  assert.match(r.text, /Running Shoes/);
  assert.match(r.text, /Steam Boots/, 'the Ember badge brings its charm');
  assert.match(r.text, /Ember Hills/);
  assert.match(r.text, /Gems\s*77/);
  assert.match(r.text, /Streak Shields\s*3/);
  assert.match(r.text, /Catch Nets\s*4 of/);
  assert.match(r.text, /5 solves left/);
  assert.match(r.text, /Berry\s*held by/);
  assert.match(r.text, /fire · 2 of 5/);
  assert.equal(r.art, 3, 'each key item has its own picture');
  assert.equal(r.over, 'flex');
});

test('without the Badge Case the Bag does not list badges, and a hostile name is shown as text', async () => {
  const r = await page.evaluate(() => {
    state.hero.made = true; state.hero.name = 'x'; state.badges = ['ember'];
    openAdventure(); openBag();
    return document.getElementById('bag-body').innerText;
  });
  assert.match(r, /You need the Badge Case/);
  assert.doesNotMatch(r, /Ember Hills/);
  const safe = await page.evaluate(() => { state.hero.name = cleanHeroName('<img src=x onerror=alert(1)>'); renderBag(); return document.querySelectorAll('#bag-modal img, #bag-title img').length; });
  assert.equal(safe, 0);
});

test('Bag buttons: Shop leaves the walk for the shop; Change look edits without giving the items again', async () => {
  await madeHero();
  await page.evaluate(() => { openAdventure(); openBag(); });
  await page.evaluate(() => openHeroCreator());
  assert.equal(await page.evaluate(() => document.getElementById('hero-title').innerText), 'Change your look');
  await page.click('[aria-label="Hair colour: Blue"]');
  await page.evaluate(() => { state.keyItems = []; });
  await page.click('#hero-go');
  const r = await page.evaluate(() => ({ hair: state.hero.look.hair, keys: state.keyItems, bag: document.getElementById('bag-modal').style.display, creator: document.getElementById('hero-modal').style.display }));
  assert.equal(r.hair, 6);
  assert.deepEqual(r.keys, [], 'editing the look is not a first start');
  assert.equal(r.bag, 'flex');
  assert.notEqual(r.creator, 'flex');
  await page.click('#bag-body .claim-btn >> text=Shop');
  assert.equal(await shown('shop-modal'), true);
  assert.equal(await shown('overworld-modal'), true, 'the map stays underneath');
  assert.equal(await shown('bag-modal'), false);
});

test('Escape closes the Bag, and the map itself cannot be closed', async () => {
  await madeHero();
  await page.evaluate(() => { openAdventure(); openBag(); });
  await page.keyboard.press('Escape');
  assert.equal(await shown('bag-modal'), false);
  assert.equal(await shown('overworld-modal'), true);
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Escape');
  assert.equal(await shown('overworld-modal'), true);
});

test('arrow keys do not walk the hero while the Bag or Team window is open on top of the map', async () => {
  await madeHero();
  const y = await page.evaluate(() => { openAdventure(); openBag(); return state.overworld.y; });
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.evaluate(() => state.overworld.y), y);
});

const twoBuddies = () => page.evaluate(() => {
  const other = storePets[1].id;
  state.unlockedPets = ['dog', other]; state.buddyXp = { dog: 0, [other]: 0 }; state.team = ['dog', other]; state.activePet = 'dog';
  state.swapUsed = false; state.faintedPets = [];
  return other;
});

test('the Team window lists the team with level and HP, and Lead changes who goes first', async () => {
  await madeHero();
  const other = await twoBuddies();
  await page.evaluate(() => { openAdventure(); });
  await page.click('.ow-side.team');
  const rows = await page.evaluate(() => Array.from(document.querySelectorAll('#pad-body .pad-row')).map((r) => ({ text: r.innerText, hp: r.querySelector('.pad-hp').getAttribute('aria-label') })));
  assert.equal(rows.length, 2);
  assert.match(rows[0].text, /Leading/);
  assert.match(rows[1].text, /Lv \d+/);
  assert.match(rows[1].hp, /^HP \d+ of \d+$/);
  assert.equal(await page.evaluate(() => document.getElementById('pad-title').innerText), "Sam's team");
  await page.click('#pad-body .pad-row >> nth=1 >> button');
  assert.equal(await page.evaluate(() => state.activePet), other);
  assert.match(await page.evaluate(() => document.querySelector('#pad-body .pad-row:nth-child(2)').innerText), /Leading/);
  await page.click('#pad-body .pad-row >> nth=0 >> button');                                                          // the lead can change back any time
  assert.notEqual(await page.evaluate(() => state.activePet), other);
});

test('a resting buddy cannot be made the lead, and Change team opens the Hub on the team tab', async () => {
  await madeHero();
  const other = await twoBuddies();
  await page.evaluate((o) => { state.advHp = { [o]: 0 }; openAdventure(); openPad(); }, other);
  assert.equal(await page.evaluate(() => document.querySelectorAll('#pad-body .pad-row button').length), 0, 'no Lead button for a resting buddy');
  assert.match(await page.evaluate(() => document.querySelector('#pad-body .pad-row.resting').innerText), /Resting/);
  await page.click('#pad-body .bag-actions .claim-btn');
  assert.equal(await shown('hub-modal'), true);
  assert.equal(await shown('pad-modal'), false);
  assert.equal(await page.evaluate(() => hubTab), 'tour');
});

test('a team of one says there is room, and every window fits a 320x568 phone', async () => {
  await madeHero();
  await page.setViewportSize({ width: 320, height: 568 });
  const r = await page.evaluate(() => {
    const fits = (id) => { const c = document.querySelector('#' + id + ' .modal-content').getBoundingClientRect(); return c.left >= 0 && c.right <= innerWidth && c.bottom <= innerHeight && document.documentElement.scrollWidth <= innerWidth; };
    openAdventure();
    const side = Array.from(document.querySelectorAll('.ow-side')).map((b) => { const q = b.getBoundingClientRect(); return [q.width >= 44, q.height >= 44, q.bottom <= innerHeight]; });
    openPad(); const pad = fits('pad-modal'), note = document.getElementById('pad-body').innerText; closePad();
    openBag(); const bag = fits('bag-modal'); closeBag();
    hideModal('overworld-modal'); state.hero.made = false; openAdventure();
    const hero = fits('hero-modal'), swatches = Array.from(document.querySelectorAll('#hero-modal .hero-swatch')).every((b) => b.getBoundingClientRect().width >= 44 && b.getBoundingClientRect().height >= 44);
    const go = document.getElementById('hero-go'); go.scrollIntoView(); const goBox = go.getBoundingClientRect();
    return { side, pad, bag, hero, swatches, note, goReachable: goBox.bottom <= innerHeight && goBox.top >= 0, input: parseFloat(getComputedStyle(document.getElementById('hero-name')).fontSize) };
  });
  assert.deepEqual(r.side, [[true, true, true], [true, true, true]]);
  assert.ok(r.pad && r.bag && r.hero, 'each window stays inside the screen');
  assert.ok(r.swatches, 'swatches are tappable');
  assert.ok(r.goReachable, 'the Start button can be reached');
  assert.ok(r.input >= 16, 'the name field is 16px or more so iPhones do not zoom');
  assert.match(r.note, /Room for 5 more/);
});
