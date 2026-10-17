// Everyday emoji are replaced by custom pictures (98-icons.js) without losing the text.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

let browser, page, errors;
before(async () => {
  browser = await launch();
  ({ page, errors } = await openGame(browser, await loadWorker(), { MATH_KV: fakeKV() }, { viewport: { width: 375, height: 667 } }));
});
after(async () => { await browser.close(); });

test('every picture is a valid SVG and a late text change is picked up', async () => {
  const r = await page.evaluate(async () => {
    const out = [];
    for (const e of Object.keys(ICON_BODIES)) {
      const doc = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + ICON_BODIES[e] + '</svg>', 'image/svg+xml');
      if (doc.querySelector('parsererror')) out.push(e + ' is not valid SVG');
    }
    const d = document.createElement('div');
    document.body.appendChild(d);
    d.textContent = 'Win 💎 and 🏆 today';
    await new Promise((res) => setTimeout(res, 50));
    const icos = d.querySelectorAll('.ico');
    if (icos.length !== 2) out.push('expected 2 pictures, got ' + icos.length);
    if (d.textContent !== 'Win 💎 and 🏆 today') out.push('text changed: ' + d.textContent);
    if (icos[0] && !icos[0].style.backgroundImage.includes('svg')) out.push('no picture set');
    const r = icos[0].getBoundingClientRect();
    if (r.width < 8 || r.height < 8) out.push('picture has no size');
    d.remove();
    return out;
  });
  assert.deepEqual(r, []);
});

test('the page shows pictures and has no errors', async () => {
  assert.ok(await page.evaluate(() => document.querySelectorAll('.ico').length > 0));
  assert.deepEqual(errors, []);
});

test('emoji inside a joined sequence stay emoji, and flex parents keep one text box', async () => {
  const r = await page.evaluate(async () => {
    const d = document.createElement('div');
    d.style.display = 'flex';
    document.body.appendChild(d);
    d.textContent = '🧑‍🚀 and 👩‍🚒 and 🍕';
    await new Promise((res) => setTimeout(res, 50));
    const out = [];
    if (d.querySelectorAll('.ico').length !== 1) out.push('expected only the pizza, got ' + d.querySelectorAll('.ico').length);
    if (d.children.length !== 1) out.push('flex parent has ' + d.children.length + ' items');
    d.remove();
    return out;
  });
  assert.deepEqual(r, []);
});

test('a buddy emoji in text shows that buddy\'s picture', async () => {
  const r = await page.evaluate(async () => {
    const d = document.createElement('div');
    document.body.appendChild(d);
    d.textContent = 'You caught a 🐺!';
    await new Promise((res) => setTimeout(res, 50));
    const ico = d.querySelector('.ico');
    d.remove();
    return ico ? [ico.style.backgroundImage.includes('data:image/svg+xml;base64'), ico.textContent] : null;
  });
  assert.deepEqual(r, [true, '🐺']);
});
