// Small text must have 4.5:1 contrast (3:1 for large text), on the main screen and in every window.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

let browser, worker, env;
before(async () => { browser = await launch(); worker = await loadWorker(); env = { MATH_KV: fakeKV() }; });
after(async () => { await browser.close(); });

// Runs in the page: returns the text elements below the ratio, as "ratio selector 'text'".
const findLowContrast = () => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const background = (el) => {                       // flat colour behind an element, or null when a gradient/image is in the way
    const chain = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage !== 'none') return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { chain.push(c); if (c.a === 1) break; }
    }
    let base = { r: 15, g: 23, b: 42, a: 1 };
    for (let i = chain.length - 1; i >= 0; i--) base = over(chain[i], base);
    return base;
  };
  const fades = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };
  const out = [];
  document.querySelectorAll('body *').forEach((el) => {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    if (!own || el.disabled || el.closest('[aria-hidden="true"], canvas, .float-gain')) return;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none') return;
    const modal = el.closest('.modal-overlay');
    if (modal && modal.style.display !== 'flex') return;
    if (!modal && [...document.querySelectorAll('.modal-overlay')].some((m) => m.style.display === 'flex')) return;
    const bg = background(el), fg = parse(cs.color);
    if (!bg || !fg) return;
    const o = fades(el);
    if (o < 0.1) return;                               // invisible effects (popups, flashes)
    const text = over({ ...fg, a: fg.a * o }, bg);
    const solidBg = over({ ...bg, a: 1 }, { r: 15, g: 23, b: 42, a: 1 });
    const ratio = (Math.max(lum(text), lum(solidBg)) + 0.05) / (Math.min(lum(text), lum(solidBg)) + 0.05);
    const px = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
    const need = px >= 24 || (px >= 18.66 && bold) ? 3 : 4.5;
    if (ratio < need) out.push(ratio.toFixed(2) + ' ' + (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ').join('.')) + " '" + own.slice(0, 24) + "'");
  });
  return [...new Set(out)];
};

const WINDOWS = ['openShop', 'openSettings', 'openQuests', 'openCal', 'openBook', 'openHub', 'openParent', 'openReportModal'];
test('text on the main screen and in every window is readable', async () => {
  const g = await openGame(browser, worker, env, { viewport: { width: 375, height: 700 } });
  await g.page.evaluate(() => { document.getElementById('foe-intro').style.transition = 'none'; state.gems = 50; updateStatsUI(); });      // the new-foe banner fades by itself: measure it fully on or fully off, never half way
  const failures = { main: await g.page.evaluate(findLowContrast) };
  for (const fn of WINDOWS) {
    await g.page.evaluate(() => document.querySelectorAll('.modal-overlay').forEach((m) => { m.style.display = 'none'; }));
    await g.page.evaluate((f) => window[f](), fn);
    failures[fn] = await g.page.evaluate(findLowContrast);
  }
  const summary = Object.entries(failures).filter(([, v]) => v.length).map(([k, v]) => k + ':\n   ' + v.join('\n   ')).join('\n');
  assert.equal(summary, '', 'low contrast text:\n' + summary);
  await g.context.close();
});
