import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

let browser, page, errors;
before(async () => {
  browser = await launch();
  ({ page, errors } = await openGame(browser, await loadWorker(), { MATH_KV: fakeKV() }));
});
after(async () => { await browser.close(); });

test('every generator, at every grade it supports, makes clean problems', async () => {
  const bad = await page.evaluate(() => {
    const out = [];
    MATH_OPS.forEach((op) => {
      for (let g = op.minGrade; g <= 5; g++) {
        for (let i = 0; i < 300; i++) {
          const p = op.gen(g);
          const text = String(p.expr || p.num1 + ' ' + p.operator + ' ' + p.num2);
          const a = p.answer;
          const decimals = Math.abs(a * 100 - Math.round(a * 100)) > 1e-6;
          if (!isFinite(a) || Math.abs(a) > 1e7 || decimals || !text.trim() || /NaN|undefined|Infinity|null/.test(text)) {
            out.push(op.id + ' grade ' + g + ': ' + text + ' = ' + a);
          }
        }
      }
    });
    return out.slice(0, 10);
  });
  assert.deepEqual(bad, []);
});

test('multiple choice always contains the answer once, with distinct options', async () => {
  const bad = await page.evaluate(() => {
    const out = [];
    for (let i = 0; i < 600; i++) {
      const count = i % 2 ? 4 : 3;
      const q = makeMcq({ count });
      const hits = q.opts.filter((v) => Math.abs(v - q.ans) < 1e-9).length;
      if (hits !== 1 || new Set(q.opts).size !== q.opts.length || q.opts.length !== count) out.push(q.expr + ' ' + JSON.stringify(q.opts));
    }
    return out.slice(0, 5);
  });
  assert.deepEqual(bad, []);
});

test('the page loaded without errors', () => { assert.deepEqual(errors, []); });
