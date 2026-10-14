import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

let browser, page, errors;
before(async () => {
  browser = await launch();
  ({ page, errors } = await openGame(browser, await loadWorker(), { MATH_KV: fakeKV() }, { viewport: { width: 375, height: 667 } }));
});
after(async () => { await browser.close(); });
const inPage = (fn, arg) => page.evaluate(fn, arg);

const OPEN = {
  'shop-modal': 'openShop', 'settings-modal': 'openSettings', 'book-modal': 'openBook', 'parent-modal': 'openParent',
  'quest-modal': 'openQuests', 'cal-modal': 'openCal', 'hub-modal': 'openHub', 'report-modal': 'openReportModal', 'reset-modal': 'openResetModal'
};

test('every window that has a close action has a ✕ button, 44px, named, and it really closes the window', async () => {
  const r = await inPage((open) => {
    const out = [];
    document.querySelectorAll('.modal-overlay').forEach((m) => {
      const fn = m.dataset.close || m.dataset.esc;
      const box = m.querySelector('.modal-content');
      if (fn && box && !box.querySelector('.modal-x')) out.push(m.id + ' has no ✕');
    });
    Object.keys(open).forEach((id) => {
      window[open[id]]();
      const m = document.getElementById(id), x = m.querySelector('.modal-x');
      if (!x) { out.push(id + ': no ✕'); return; }
      const r = x.getBoundingClientRect();
      if (r.width < 44 || r.height < 44) out.push(id + ': ✕ is ' + Math.round(r.width) + 'x' + Math.round(r.height));
      if (x.getAttribute('aria-label') !== 'Close') out.push(id + ': ✕ has no name');
      x.click();
      if (m.style.display !== 'none') out.push(id + ': ✕ did not close it');
    });
    return out;
  }, OPEN);
  assert.deepEqual(r, []);
});

test('the ✕ stays in the top-right corner when the window is scrolled to the very bottom', async () => {
  const r = await inPage((open) => {
    const out = [];
    state.unlockedPets = ['dog', 'fox'];
    ['shop-modal', 'settings-modal', 'book-modal', 'parent-modal', 'hub-modal'].forEach((id) => {
      window[open[id]]();
      const m = document.getElementById(id), box = m.querySelector('.modal-content'), x = m.querySelector('.modal-x');
      box.scrollTop = box.scrollHeight;
      const rb = box.getBoundingClientRect(), rx = x.getBoundingClientRect();
      const tall = box.scrollHeight > box.clientHeight + 50;
      if (rx.top < rb.top + 1 || rx.top - rb.top > 24) out.push(id + ': ✕ is ' + Math.round(rx.top - rb.top) + 'px from the top after scrolling (tall: ' + tall + ')');
      if (rb.right - rx.right < 1 || rb.right - rx.right > 24) out.push(id + ': ✕ is not at the right edge');
      if (rx.bottom > window.innerHeight || rx.top < 0) out.push(id + ': ✕ is off screen');
      m.style.display = 'none';
    });
    return out;
  }, OPEN);
  assert.deepEqual(r, []);
});

test('the ✕ never covers a heading or a button at the top of a window', async () => {
  const r = await inPage((open) => {
    const out = [];
    state.unlockedPets = ['dog', 'fox'];
    Object.keys(open).forEach((id) => {
      window[open[id]]();
      const m = document.getElementById(id), box = m.querySelector('.modal-content'), x = m.querySelector('.modal-x').getBoundingClientRect();
      box.scrollTop = 0;
      const first = box.querySelector('.modal-x-row').nextElementSibling;
      const hits = (r) => r.width > 0 && r.left < x.right && r.right > x.left && r.top < x.bottom && r.bottom > x.top;
      const range = document.createRange(); range.selectNodeContents(first);
      [...range.getClientRects()].forEach((rc) => { if (rc.width < first.getBoundingClientRect().width - 2 && hits(rc)) out.push(id + ': ✕ covers text'); });
      first.querySelectorAll('button').forEach((b) => { if (hits(b.getBoundingClientRect())) out.push(id + ': ✕ covers a button'); });
      m.style.display = 'none';
    });
    return [...new Set(out)];
  }, OPEN);
  assert.deepEqual(r, []);
});

test('windows are never taller than the visible screen (iPhone toolbars included)', async () => {
  const r = await inPage((open) => {
    const out = [];
    Object.keys(open).forEach((id) => {
      window[open[id]]();
      const box = document.getElementById(id).querySelector('.modal-content').getBoundingClientRect();
      if (box.bottom > window.innerHeight - 4 || box.top < 4) out.push(id + ' spills off the screen');
      document.getElementById(id).style.display = 'none';
    });
    return out;
  }, OPEN);
  assert.deepEqual(r, []);
});

test('no errors', () => { assert.deepEqual(errors, []); });
