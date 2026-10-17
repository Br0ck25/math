// Buying anything with gems asks first (askBuy): shop items, buddies, gear, armor and held items.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

let browser, worker, env, page, errors;
before(async () => {
  browser = await launch();
  worker = await loadWorker();
  env = { MATH_KV: fakeKV() };
  ({ page, errors } = await openGame(browser, worker, env, { fast: true }));
});
after(async () => { await browser.close(); });
beforeEach(async () => {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  errors.length = 0;
  await page.evaluate(() => { startGoldenVault = function () { modalDone(); }; });
});

test('every purchase asks first: nothing is spent until "Buy", and "Not now", Escape and the close button all cancel', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    const shown = () => document.getElementById('confirm-modal').style.display === 'flex';
    const cheapPet = storePets.filter((p) => p.cost > 0 && !p.requiresAllStorePets)[0];
    const armor = armorList.find((a) => a.cost > 0 && !a.earn), gear = accessoriesList.find((a) => a.cost > 0 && !a.earn);
    const buys = {
      shield: () => buyItem('shield'), candy: () => buyItem('candy'), ult: () => buyItem('ult'), clover: () => buyItem('clover'), net: () => buyItem('net'),
      held: () => buyHeld('berry'), pet: () => selectOrBuyPet(cheapPet), armor: () => selectOrBuyArmor(armor), gear: () => selectOrBuyAccessory(gear)
    };
    state.buddyXp.dog = xpForLevel(10); state.nets = 0;
    Object.keys(buys).forEach((k) => {
      state.gems = 5000; const before = JSON.stringify([state.shields, state.nets, state.cloverLeft, state.heldOwned, state.unlockedPets, state.unlockedArmor, state.unlockedAccessories, getBuddyXp('dog')]);
      buys[k]();
      const asked = shown(), title = document.getElementById('confirm-title').innerText;
      const same = state.gems === 5000 && JSON.stringify([state.shields, state.nets, state.cloverLeft, state.heldOwned, state.unlockedPets, state.unlockedArmor, state.unlockedAccessories, getBuddyXp('dog')]) === before;
      closeConfirm();
      out[k] = [asked, same, shown(), state.gems, title];
    });
    // the other ways to say no
    state.gems = 5000; buyItem('shield'); document.querySelector('#confirm-modal .action-btn').click(); out.notNow = [shown(), state.gems, state.shields];
    buyItem('shield'); closeTopOverlay(); out.escape = [shown(), state.gems];
    buyItem('shield'); document.querySelector('#confirm-modal .modal-x').click(); out.x = [shown(), state.gems];
    buyItem('shield'); document.getElementById('confirm-modal').click(); out.backdrop = [shown(), state.gems];
    return out;
  });
  ['shield', 'candy', 'ult', 'clover', 'net', 'held', 'pet', 'armor', 'gear'].forEach((k) => {
    assert.equal(r[k][0], true, k + ' asks first');
    assert.equal(r[k][1], true, k + ' spent nothing and gave nothing before the answer');
    assert.equal(r[k][2], false, k + ' closes on cancel');
    assert.equal(r[k][3], 5000, k + ' costs nothing when cancelled');
    assert.match(r[k][4], /^Buy .+\?$/);
  });
  assert.deepEqual(r.notNow, [false, 5000, 0]);
  assert.deepEqual(r.escape, [false, 5000]);
  assert.deepEqual(r.x, [false, 5000]);
  assert.deepEqual(r.backdrop, [false, 5000]);
});

test('"Buy" pays once and gives the item; the window shows the price, your gems and what is left', async () => {
  const r = await page.evaluate(() => {
    const out = {}, price = ECON.items.shield;
    state.gems = price + 30; state.shields = 0;
    buyItem('shield');
    out.text = [document.getElementById('confirm-wallet').innerText, document.getElementById('confirm-yes').innerText, document.getElementById('confirm-title').innerText];
    confirmBuy(); confirmBuy();                                  // a second tap does nothing
    out.paid = [state.shields, state.gems, document.getElementById('confirm-modal').style.display];
    const armor = armorList.find((a) => a.cost > 0 && !a.earn);
    state.gems = armor.cost; selectOrBuyArmor(armor); confirmBuy();
    out.armor = [state.unlockedArmor.includes(armor.id), state.activeArmor === armor.id, state.gems];
    const gear = accessoriesList.find((a) => a.cost > 0 && !a.earn);
    state.gems = gear.cost; selectOrBuyAccessory(gear); confirmBuy();
    out.gear = [state.unlockedAccessories.includes(gear.id), state.activeAccessory === gear.id, state.gems];
    const pet = storePets.find((p) => p.cost > 0 && !p.requiresAllStorePets);
    state.gems = pet.cost; selectOrBuyPet(pet); confirmBuy();
    out.pet = [state.unlockedPets.includes(pet.id), state.gems];
    state.gems = ECON.held.cost.shell; buyHeld('shell'); confirmBuy();
    out.held = [state.heldOwned.includes('shell'), state.gems];
    out.price = price;
    return out;
  });
  assert.equal(r.text[0], 'Costs 💎 ' + r.price + '\nYou have 💎 ' + (r.price + 30) + ' · left 💎 30');
  assert.equal(r.text[1], 'Buy for ' + r.price + ' 💎');
  assert.equal(r.text[2], 'Buy Streak Shield?');
  assert.deepEqual(r.paid, [1, 30, 'none'], 'paid once');
  assert.deepEqual(r.armor, [true, true, 0]);
  assert.deepEqual(r.gear, [true, true, 0]);
  assert.deepEqual(r.pet, [true, 0]);
  assert.deepEqual(r.held, [true, 0]);
});

test('no window when there is nothing to buy: too poor, already owned, max level, nets full, a locked secret', async () => {
  const r = await page.evaluate(() => {
    const out = {}, shown = () => document.getElementById('confirm-modal').style.display === 'flex';
    state.gems = 0; buyItem('shield'); out.poor = shown();
    state.gems = 5000; state.nets = ECON.wild.net.stock; buyItem('net'); out.full = shown();
    state.buddyXp.dog = xpForLevel(MAX_LEVEL); buyItem('candy'); out.max = shown();
    state.heldOwned = ['berry']; buyHeld('berry'); out.owned = shown();
    state.unlockedArmor = ['none', 'tunic']; selectOrBuyArmor(getArmor('tunic')); out.equip = [shown(), state.activeArmor];      // equipping what you own is free
    selectOrBuyPet(getSpecies('dog')); out.pet = shown();
    const secret = accessoriesList.find((a) => a.earn); selectOrBuyAccessory(secret); out.secret = shown();
    return out;
  });
  assert.deepEqual(r, { poor: false, full: false, max: false, owned: false, equip: [false, 'tunic'], pet: false, secret: false });
});

test('the buy window opens over the shop without restarting the question timer, and the shop stays open', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    state.gems = 5000;
    openShop(); out.paused = clockPausedAt !== null;
    buyItem('shield'); closeConfirm();
    out.stillPaused = clockPausedAt !== null;
    out.shopOpen = document.getElementById('shop-modal').style.display === 'flex';
    closeShop(); out.resumed = clockPausedAt === null;
    return out;
  });
  assert.deepEqual(r, { paused: true, stillPaused: true, shopOpen: true, resumed: true });
});

test('the buy window fits a small phone and its buttons are big enough to tap', async () => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => { state.gems = 5000; openShop(); buyItem('shield'); });
  const r = await page.evaluate(() => {
    const m = document.querySelector('#confirm-modal .modal-content').getBoundingClientRect();
    const yes = document.getElementById('confirm-yes').getBoundingClientRect(), no = document.querySelector('#confirm-modal .action-btn').getBoundingClientRect();
    return { inside: m.left >= 0 && m.right <= innerWidth && m.top >= 0 && m.bottom <= innerHeight, yes: yes.height, no: no.height, sideways: document.documentElement.scrollWidth > innerWidth };
  });
  assert.equal(r.inside, true);
  assert.ok(r.yes >= 44 && r.no >= 44, 'tap targets ' + r.yes + ' / ' + r.no);
  assert.equal(r.sideways, false);
  await page.setViewportSize({ width: 420, height: 800 });
});

test('no errors', () => { assert.deepEqual(errors, []); });

test('the buy confirmation opens on top of the buddy hub, not behind it', async () => {
  const r = await page.evaluate(() => {
    state.gems = 999;
    openHub(); setHubTab('hold');
    buyHeld('berry');
    const box = document.querySelector('#confirm-modal .modal-content').getBoundingClientRect();
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return { onTop: !!top && !!top.closest('#confirm-modal'), shown: document.getElementById('confirm-modal').style.display };
  });
  assert.equal(r.shown, 'flex');
  assert.ok(r.onTop, 'the window the player must answer is the one on top');
});
