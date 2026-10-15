// Layout and readability: nothing scrolls sideways, shop buttons show what is affordable, text is readable.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

let browser, worker, env;
before(async () => { browser = await launch(); worker = await loadWorker(); env = { MATH_KV: fakeKV() }; });
after(async () => { await browser.close(); });

const WINDOWS = ['openShop', 'openSettings', 'openQuests', 'openCal', 'openBook', 'openHub', 'openParent', 'openReportModal'];
const closeAll = (page) => page.evaluate(() => document.querySelectorAll('.modal-overlay').forEach((m) => { m.style.display = 'none'; }));

test('no window scrolls or clips sideways, even with every gear piece owned', async () => {
  for (const width of [320, 360, 375, 420]) {
    const g = await openGame(browser, worker, env, { viewport: { width, height: 700 } });
    await g.page.evaluate(() => {
      state.unlockedArmor = armorList.map((a) => a.id); state.unlockedAccessories = accessoriesList.map((a) => a.id);
      state.unlockedPets = storePets.map((p) => p.id); state.gems = 5000;
    });
    for (const fn of WINDOWS) {
      await closeAll(g.page);
      const bad = await g.page.evaluate((f) => {
        window[f]();
        const m = [...document.querySelectorAll('.modal-overlay')].find((o) => o.style.display === 'flex');
        const box = m.querySelector('.modal-content');
        const b = box.getBoundingClientRect();
        const out = [];
        if (box.scrollWidth > box.clientWidth + 1) out.push('content scrolls sideways by ' + (box.scrollWidth - box.clientWidth));
        box.querySelectorAll('*').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (!r.width || getComputedStyle(el).position === 'sticky') return;
          if (r.right > b.right + 1 || r.left < b.left - 1) out.push((el.id || el.className || el.tagName) + ' sticks out ' + Math.round(Math.max(r.right - b.right, b.left - r.left)) + 'px');
          const ox = getComputedStyle(el).overflowX;
          if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 1) out.push((el.id || el.className) + ' scrolls sideways');
        });
        return out.slice(0, 6);
      }, fn);
      assert.deepEqual(bad, [], fn + ' at ' + width + 'px');
    }
    assert.deepEqual(g.errors, []);
    await g.context.close();
  }
});

test('shop buttons show the price when affordable and how many more gems when not', async () => {
  const g = await openGame(browser, worker, env, { viewport: { width: 375, height: 700 } });
  const poor = await g.page.evaluate(() => { state.gems = 10; updateStatsUI(); return ['shield', 'candy', 'ult', 'clover'].map((t) => { const b = document.getElementById('item-' + t); return [b.innerText, b.classList.contains('cant-afford'), b.getAttribute('aria-disabled')]; }); });
  poor.forEach(([text, dim, aria]) => { assert.match(text, /^Need \d+ more 💎$/); assert.equal(dim, true); assert.equal(aria, 'true'); });
  assert.equal(poor[0][0], 'Need 90 more 💎');
  const rich = await g.page.evaluate(() => { state.gems = 10000; updateStatsUI(); return ['shield', 'ult', 'clover'].map((t) => { const b = document.getElementById('item-' + t); return [b.innerText, b.classList.contains('cant-afford')]; }); });
  assert.deepEqual(rich, [['100 💎 Buy', false], ['33 💎 Charge', false], ['25 💎 Use', false]]);
  await g.page.evaluate(() => openShop());
  const small = await g.page.evaluate(() => [...document.querySelectorAll('.item-btn')].filter((b) => b.getBoundingClientRect().height < 44).length);
  assert.equal(small, 0, 'every shop button is at least 44px tall');
  const wallet = await g.page.evaluate(() => document.querySelector('.shop-wallet').innerText);
  assert.match(wallet, /You have/);
  await g.context.close();
});

test('the header is one tidy row: session progress on the left, practice settings chip on the right', async () => {
  for (const [width, height] of [[360, 700], [420, 800]]) {
    const g = await openGame(browser, worker, env, { viewport: { width, height } });
    assert.equal(await g.page.evaluate(() => document.querySelector('.practice-row')), null);
    const r = await g.page.evaluate(() => {
      const row = document.querySelector('.session-info-row').getBoundingClientRect();
      const chip = document.querySelector('.practice-chip').getBoundingClientRect();
      return { sameRow: chip.height >= 44 && chip.top >= row.top - 1 && chip.bottom <= row.bottom + 1, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    assert.equal(r.sameRow, true);
    assert.ok(r.overflow <= 1);
    await g.page.click('.practice-chip');
    assert.equal(await g.page.evaluate(() => document.getElementById('settings-modal').style.display), 'flex');
    await g.context.close();
  }
});

test('HP numbers sit inside readable bars on both fighters', async () => {
  const g = await openGame(browser, worker, env, { viewport: { width: 360, height: 700 } });
  const r = await g.page.evaluate(() => ['pet', 'monster'].map((k) => {
    const t = document.getElementById(k + '-hp-text'), bar = t.parentElement.getBoundingClientRect(), n = t.getBoundingClientRect();
    return { inside: t.parentElement.classList.contains('hp-bar-bg') && n.left >= bar.left - 1 && n.right <= bar.right + 1, height: bar.height };
  }));
  r.forEach((x) => { assert.equal(x.inside, true); assert.ok(x.height >= 12, 'bar height ' + x.height); });
  await g.context.close();
});

test('settings sections fold away: the everyday ones start open, the rest closed', async () => {
  const g = await openGame(browser, worker, env, { viewport: { width: 375, height: 667 } });
  await g.page.evaluate(() => openSettings());
  const names = await g.page.evaluate(() => [...document.querySelectorAll('#settings-modal .set-sec')].map((d) => [d.querySelector('summary').textContent, d.open]));
  const open = Object.fromEntries(names.map(([n, o]) => [n.replace(/^\S+\s/, ''), o]));
  assert.equal(open['Grade level'], true);
  assert.equal(open['Options'], true);
  assert.equal(open['Type chart'], false);
  assert.equal(open['Reset'], false);
  await g.page.click('#settings-modal summary:has-text("Type chart")');
  assert.equal(await g.page.evaluate(() => [...document.querySelectorAll('#settings-modal .set-sec')].find((d) => d.textContent.includes('Fire')).open), true);
  await g.context.close();
});
