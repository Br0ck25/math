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

test('every buddy is in exactly one pack and nothing falls into the catch-all', async () => {
  const r = await inPage(() => {
    const seen = {}, out = { twice: [], mystery: [], total: 0 };
    buddyPacks().forEach((g) => g.members.forEach((m) => {
      out.total += 1;
      if (seen[m.id]) out.twice.push(m.id);
      seen[m.id] = true;
      if (g.pack.id === 'mystery') out.mystery.push(m.name);
    }));
    out.all = allBuddies().length;
    out.every = allBuddies().every((b) => seen[b.id]);
    return out;
  });
  assert.deepEqual(r.twice, []);
  assert.deepEqual(r.mystery, [], 'give the new buddy a pack (see 04b-packs.js)');
  assert.equal(r.total, r.all);
  assert.equal(r.every, true);
});

test('packs are a sensible size and the cartoon packs match their shows', async () => {
  const r = await inPage(() => {
    const out = { small: [], big: [], wrongShow: [], names: new Set(), ids: new Set(), dupe: [] };
    buddyPacks().forEach((g) => {
      if (g.members.length < 3) out.small.push(g.pack.name);
      if (g.members.length > 25) out.big.push(g.pack.name + ' ' + g.members.length);
      if (out.ids.has(g.pack.id) || out.names.has(g.pack.name)) out.dupe.push(g.pack.id);
      out.ids.add(g.pack.id); out.names.add(g.pack.name);
      if (g.pack.shows) g.members.forEach((m) => { if (g.pack.shows.indexOf(m.show) === -1) out.wrongShow.push(m.name); });
    });
    // a cartoon character is never in a non-cartoon pack
    allBuddies().filter((b) => b.show).forEach((b) => { if (!packOf(b).shows) out.wrongShow.push(b.name + ' left its show'); });
    return { small: out.small, big: out.big, wrongShow: out.wrongShow, dupe: out.dupe, count: buddyPacks().length };
  });
  assert.deepEqual(r, { small: [], big: [], wrongShow: [], dupe: [], count: 33 });
});

test('the book groups buddies by pack with found / total counts, keeping the same cards', async () => {
  const r = await inPage(() => {
    state.unlockedPets = ['dog', 'fox', 'toon_bluey'];
    openBook(); bookTab = 'buddy'; bookMissingOnly = false; renderBook();
    const titles = [...document.querySelectorAll('#book-body .mystery-section-title')].map((t) => t.innerText.toLowerCase());   // the page shows them in capitals
    const cards = document.querySelectorAll('#book-body .pet-card').length;
    const badges = document.querySelectorAll('#book-body .pet-card .rar-badge').length;
    const pets = titles.find((t) => t.includes('pet shop pack')), woods = titles.find((t) => t.includes('woodland pack')), bluey = titles.find((t) => t.includes('bluey pack'));
    return { sections: titles.length, cards, allCardsHaveBadge: cards === badges, pets, woods, bluey, first: titles[0] };
  });
  assert.equal(r.sections, 33);
  assert.equal(r.cards, 344);
  assert.equal(r.allCardsHaveBadge, true);
  assert.match(r.pets, /\(1 \/ 13\)/);
  assert.match(r.woods, /\(1 \/ 22\)/);
  assert.match(r.bluey, /\(1 \/ 6\)/);
  assert.match(r.first, /pet shop pack/);
});

test('"missing only" hides a pack you have completed and keeps the rest', async () => {
  const r = await inPage(() => {
    const bluey = buddyPacks().find((g) => g.pack.id === 'bluey').members;
    bluey.forEach((m) => { (m.secret ? state.unlockedSecrets : state.unlockedPets).push(m.id); });
    bookMissingOnly = true; renderBook();
    const titles = [...document.querySelectorAll('#book-body .mystery-section-title')].map((t) => t.innerText.toLowerCase());
    const ownedShown = document.querySelectorAll('#book-body .pet-card:not(.locked)').length;
    bookMissingOnly = false;
    return { hidden: !titles.some((t) => t.includes('bluey pack')), others: titles.length > 20, ownedShown };
  });
  assert.deepEqual(r, { hidden: true, others: true, ownedShown: 0 });
});

test('the pack sections fit a 375px phone without sideways scroll', async () => {
  const over = await inPage(() => { openBook(); renderBook(); const b = document.querySelector('#book-modal .modal-content'); return b.scrollWidth - b.clientWidth; });
  assert.ok(over <= 1, 'overflow ' + over);
});

test('safe areas: the page keeps clear of the iPhone status bar and home bar', async () => {
  const css = await inPage(() => [...document.styleSheets].flatMap((s) => [...s.cssRules]).map((r) => r.cssText).join('\n'));
  assert.match(css, /\.game-container[^{]*\{[^}]*safe-area-inset-top/);
  assert.match(css, /\.game-container[^{]*\{[^}]*safe-area-inset-bottom/);
  assert.match(css, /\.modal-overlay[^{]*\{[^}]*safe-area-inset-top/);
});

test('no errors', () => { assert.deepEqual(errors, []); });
