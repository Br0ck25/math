// Licensed buddy art: art/buddies/<id>.png replaces the emoji everywhere, with the emoji as the fallback.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';
import { artFiles, assemble, sizeSvg } from '../scripts/build.mjs';

const artDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../art/buddies');
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

// A small picture made in the page, so the tests need no files.
const withArt = () => page.evaluate(async () => {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 48;
  const c = cv.getContext('2d'); c.fillStyle = '#3b82f6'; c.fillRect(0, 0, 64, 48);
  window.__uri = cv.toDataURL('image/png');
  applyBuddyArt({ toon_bluey: window.__uri, toon_homer: window.__uri });
  await new Promise((res) => { const im = new Image(); im.onload = res; im.src = window.__uri; setTimeout(res, 500); });
  await new Promise((res) => setTimeout(res, 100));
});

test('a buddy with art shows the picture where its emoji was; the emoji stays for text; buddies without art are untouched; applying twice changes nothing', async () => {
  await withArt();
  const r = await page.evaluate(() => {
    const out = {}, sp = getSpecies('toon_bluey'), plain = getSpecies('fox');
    out.icon = [sp.icon.startsWith('<img class="buddy-img"'), sp.emoji, sp.forms.every((f) => f.icon === sp.icon && f.emoji)];
    const d = getPetById('toon_bluey');
    out.pet = [d.icon === sp.icon, d.emoji];
    out.plain = [plain.icon, plain.emoji === undefined];
    out.avatar = avatarHtml(d, 40).includes('<img class="buddy-img"') && !avatarHtml(getPetById('fox'), 40).includes('<img');
    const before = sp.icon; applyBuddyArt({ toon_bluey: window.__uri }); out.twice = sp.icon === before && sp.emoji === '🐕';
    out.pack = packOf(sp).id;
    out.emojiOf = [emojiOf(sp), emojiOf(plain)];
    return out;
  });
  assert.deepEqual(r.icon, [true, '🐕', true]);
  assert.deepEqual(r.pet, [true, '🐕']);
  assert.deepEqual(r.plain, ['🦊', true], 'untouched: no emoji copy needed');
  assert.equal(r.avatar, true);
  assert.equal(r.twice, true);
  assert.equal(r.pack, 'bluey', 'packs are still placed by show/id/emoji, not by the picture');
  assert.deepEqual(r.emojiOf, ['🐕', '🦊']);
});

test('the art shows on the battle screen, hub, Dex, shop and legend story, and no picture data ever leaks into visible text', async () => {
  await withArt();
  const r = await page.evaluate(() => {
    const out = {};
    state.unlockedPets = ['dog', 'toon_bluey']; state.activePet = 'toon_bluey'; state.buddyXp.toon_bluey = xpForLevel(20); state.gems = 9999;
    updateStatsUI(); updateBattleUI();
    out.battle = document.querySelector('#pet-box .buddy-img, #battle-header-arena .buddy-img') !== null;
    const leaks = [];
    const scan = (where) => { const t = document.body.innerText; if (/data:image|<img|buddy-img|base64/.test(t)) leaks.push(where); };
    scan('battle');
    openHub(); hubPet = 'toon_bluey'; renderHub(); out.hub = document.querySelector('#hub-modal .buddy-img') !== null; scan('hub'); closeHub();
    bookTab = 'buddy'; openBook(); out.dexOwned = document.querySelector('#book-body .buddy-img') !== null;
    state.unlockedPets = ['dog']; renderBook(); out.dexLocked = [...document.querySelectorAll('#book-body .silhouette .buddy-img')].length > 0; scan('dex'); closeBook();
    openShop(); out.shop = document.querySelector('#shop-modal .buddy-img') !== null; scan('shop'); closeShop();
    // a duel win line and the legend story are text: they use the emoji
    out.emojiText = emojiOf(getSpecies('toon_homer')) === '👨‍🦲';
    out.leaks = leaks;
    return out;
  });
  assert.equal(r.battle, true, 'battle screen');
  assert.equal(r.hub, true, 'hub');
  assert.equal(r.dexOwned, true);
  assert.equal(r.dexLocked, true, 'a buddy you have not caught is a dark silhouette of its picture');
  assert.equal(r.shop, true, 'shop');
  assert.equal(r.emojiText, true);
  assert.deepEqual(r.leaks, [], 'no picture data in visible text');
  assert.deepEqual(errors, []);
});

test('the trading card draws the picture, scaled to fit, and falls back to the emoji without it', async () => {
  await withArt();
  const r = await page.evaluate(() => {
    const out = {};
    const cv = document.createElement('canvas');
    const real = CanvasRenderingContext2D.prototype.drawImage, realText = CanvasRenderingContext2D.prototype.fillText;
    const calls = [], emoji = [];
    CanvasRenderingContext2D.prototype.drawImage = function (img, x, y, w, h) { calls.push([x, y, w, h]); return real.apply(this, arguments); };
    CanvasRenderingContext2D.prototype.fillText = function (t) { emoji.push(String(t)); return realText.apply(this, arguments); };
    state.unlockedPets = ['dog', 'toon_bluey', 'fox'];
    drawCard(cv, 'toon_bluey'); out.art = [calls.length, calls[0] && Math.round(calls[0][2]) <= 380, calls[0] && Math.round(calls[0][2] / calls[0][3] * 100)];
    out.noEmoji = !emoji.includes('🐕');
    calls.length = 0; emoji.length = 0;
    drawCard(cv, 'fox'); out.plain = [calls.length, emoji.includes('🦊')];
    CanvasRenderingContext2D.prototype.drawImage = real; CanvasRenderingContext2D.prototype.fillText = realText;
    return out;
  });
  assert.equal(r.art[0], 1, 'one picture drawn');
  assert.equal(r.art[1], true);
  assert.equal(r.art[2], 133, 'the 64x48 picture keeps its proportions');
  assert.equal(r.noEmoji, true);
  assert.deepEqual(r.plain, [0, true]);
});

test('the build embeds art/buddies/<id>.png and refuses bad names, oversized files and svg scripts', async () => {
  const made = [];
  const put = (name, bytes) => { fs.mkdirSync(artDir, { recursive: true }); const f = path.join(artDir, name); fs.writeFileSync(f, bytes); made.push(f); };
  try {
    put('zz_test_buddy.png', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
    const js = assemble().js;
    assert.match(js, /const BUDDY_ART = \{[^}]*"zz_test_buddy":"data:image\/png;base64,/);
    assert.deepEqual(artFiles().map((a) => a.id).filter((id) => id === 'zz_test_buddy'), ['zz_test_buddy']);
    put('Bad Name.png', 'x'); assert.throws(() => artFiles(), /name it <buddy id>/); fs.unlinkSync(made.pop());
    put('zz_big.png', Buffer.alloc(151 * 1024)); assert.throws(() => artFiles(), /shrink it below 150 KB/); fs.unlinkSync(made.pop());
    put('zz_evil.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'); assert.throws(() => artFiles(), /may not contain scripts/); fs.unlinkSync(made.pop());
    put('zz_evil2.svg', '<svg xmlns="http://www.w3.org/2000/svg" onload="x()"></svg>'); assert.throws(() => artFiles(), /may not contain scripts/); fs.unlinkSync(made.pop());
    put('zz_ok.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4"/></svg>'); assert.doesNotThrow(() => artFiles());
  } finally { made.forEach((f) => { try { fs.unlinkSync(f); } catch (e) { /* gone */ } }); }
  assert.ok(!fs.existsSync(path.join(artDir, 'zz_test_buddy.png')), 'the test cleaned up');
});

test('svg art: a viewBox-only svg gets its size from the viewBox so every browser can draw it; sized ones are untouched; and it works in the page and on the card', async () => {
  assert.match(sizeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect/></svg>'), /^<svg width="200" height="100" xmlns=/);
  assert.match(sizeSvg('<svg viewBox="-10 -10 64.5 48">'), /^<svg width="64.5" height="48" /);
  const sized = '<svg width="10" height="20" viewBox="0 0 200 100">';
  assert.equal(sizeSvg(sized), sized);
  assert.equal(sizeSvg('<svg height="20" viewBox="0 0 200 100">'), '<svg height="20" viewBox="0 0 200 100">');
  assert.equal(sizeSvg('<svg xmlns="x">'), '<svg xmlns="x">', 'no viewBox: nothing to add');
  const f = path.join(artDir, 'zz_vb.svg');
  fs.mkdirSync(artDir, { recursive: true });
  fs.writeFileSync(f, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80"><rect width="160" height="80" fill="#22c55e"/></svg>');
  let js;
  try { js = assemble().js; } finally { fs.unlinkSync(f); }
  const uri = /"zz_vb":"(data:image\/svg\+xml;base64,[^"]+)"/.exec(js)[1];
  assert.match(Buffer.from(uri.split(',')[1], 'base64').toString(), /width="160" height="80"/);
  const r = await page.evaluate(async (uri) => {
    applyBuddyArt({ toon_bluey: uri });
    await new Promise((res) => setTimeout(res, 300));
    const im = ART_IMGS.toon_bluey, calls = [], real = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (i, x, y, w, h) { calls.push([w, h]); return real.apply(this, arguments); };
    state.unlockedPets = ['dog', 'toon_bluey']; drawCard(document.createElement('canvas'), 'toon_bluey');
    CanvasRenderingContext2D.prototype.drawImage = real;
    return { size: [im.naturalWidth, im.naturalHeight], drawn: calls.length, ratio: calls[0] && Math.round(calls[0][0] / calls[0][1] * 100), avatar: avatarHtml(getPetById('toon_bluey'), 40).includes('<img') };
  }, uri);
  assert.deepEqual(r.size, [160, 80]);
  assert.equal(r.drawn, 1);
  assert.equal(r.ratio, 200);
  assert.equal(r.avatar, true);
});

test('every file in art/buddies belongs to a real buddy', async () => {
  const ids = await page.evaluate(() => allBuddies().map((b) => b.id));
  const orphans = artFiles().map((a) => a.id).filter((id) => ids.indexOf(id) === -1);
  assert.deepEqual(orphans, [], 'no buddy has these ids (run `npm run art` for the list)');
});

test('no errors', () => { assert.deepEqual(errors, []); });
