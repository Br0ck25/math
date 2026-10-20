import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

let browser, page, errors;
before(async () => {
  browser = await launch();
  ({ page, errors } = await openGame(browser, await loadWorker(), { MATH_KV: fakeKV() }));
});
after(async () => { await browser.close(); });
const inPage = (fn, arg) => page.evaluate(fn, arg);

test('the collection has the planned size: 353 buddies, 55 bosses', async () => {
  const c = await inPage(() => ({
    buddies: bookCounts().buddy.total, bosses: monstersList.length,
    store: storePets.length, mythic: mythicCompanions.length, secret: secretCompanions.length, legend: legendPets.length
  }));
  assert.deepEqual(c, { buddies: 353, bosses: 55, store: 44, mythic: 36, secret: 209, legend: 6 });
});

test('every buddy and boss is an animal, creature or monster, never an object; only show and storybook characters may be people', async () => {
  const r = await inPage(() => ({
    buddies: allBuddies().map((b) => ({ id: b.id, name: b.name, icon: b.emoji || b.icon, person: !!(b.show || b.mythic || b.legend) })),
    bosses: monstersList.map((m) => ({ name: m.name, icon: m.emoji || m.icon }))
  }));
  const cp = (icon) => icon.codePointAt(0);
  const animal = (c) => (c >= 0x1F400 && c <= 0x1F43D) || c === 0x1F43F || (c >= 0x1F980 && c <= 0x1F9AE) || c === 0x1F577 || c === 0x1F54A || (c >= 0x1FAB0 && c <= 0x1FAB3);
  const creature = new Set([0x1F479, 0x1F47A, 0x1F47B, 0x1F47D, 0x1F47E, 0x1F916, 0x1F480, 0x2620, 0x1F47F, 0x1F608, 0x1F9DE, 0x1F9DC, 0x1F9DA, 0x1F9DD, 0x1F9DB, 0x1F9DF, 0x26C4, 0x1F409, 0x1F432, 0x1F995, 0x1F996]);    // monsters, ghosts, aliens, robots, fairies, elves, snowman
  const person = (c) => (c >= 0x1F466 && c <= 0x1F469) || c === 0x1F471 || c === 0x1F474 || c === 0x1F475 || c === 0x1F476 || c === 0x1F478 || c === 0x1F934 || c === 0x1F9D4 || c === 0x1F9D9 || c === 0x1F9B8 || c === 0x1F9D1;
  const exceptions = { toon_spongebob: 'a sea sponge', mythic_patrick: 'a sea star', secret_papaw: 'a family buddy: the owner decides' };    // no emoji exists for these animals
  const bad = [];
  r.buddies.forEach((b) => {
    const c = cp(b.icon);
    if (animal(c) || creature.has(c) || exceptions[b.id] || (b.person && person(c))) return;
    bad.push(b.name + ' ' + b.icon);
  });
  r.bosses.forEach((m) => { const c = cp(m.icon); if (!animal(c) && !creature.has(c)) bad.push('boss ' + m.name + ' ' + m.icon); });
  assert.deepEqual(bad, [], 'these look like objects or people: pick an animal or creature');
});

test('every buddy has what it needs: unique id, valid type, a move, and three forms that still look like it', async () => {
  const bad = await inPage(() => {
    const out = [], seen = new Set();
    const elems = ['fire', 'water', 'nature', 'electric', 'dark', 'magic', 'shadow'];
    storePets.concat(mythicCompanions, secretCompanions, ultraPets, bossBuddies, legendPets).forEach((p) => {
      if (seen.has(p.id)) out.push('duplicate id ' + p.id);
      seen.add(p.id);
      if (elems.indexOf(p.element) === -1) out.push(p.id + ' element ' + p.element);
      if (!p.name || !p.icon || !p.superMove) out.push(p.id + ' missing name/icon/move');
      if (!p.forms || p.forms.length !== 3) { out.push(p.id + ' forms'); return; }
      p.forms.forEach((f, i) => {
        if (!f.name || !f.icon) out.push(p.id + ' form ' + i + ' incomplete');
        const fi = f.emoji || f.icon;                       // a buddy with licensed art keeps its emoji here
        if (typeof fi === 'string' && !fi.trim().startsWith('<svg') && /\s/.test(fi.trim())) out.push(p.id + ' form ' + i + ' icon has extra pieces: ' + fi);
        if (i && f.minLevel <= p.forms[i - 1].minLevel) out.push(p.id + ' forms out of order');
      });
      if (p.forms[2].minLevel > 100) out.push(p.id + ' final form beyond level 100');
    });
    return out;
  });
  assert.deepEqual(bad, []);
});

test('evolved forms keep the buddy recognisable: the base animal is never replaced by a bare symbol', async () => {
  const bad = await inPage(() => {
    const symbols = /^(🔥|🌙|🌊|🌵|👑|❄️|⚡|🌈|☀️|✨)$/;
    return storePets.filter((p) => p.forms.some((f) => symbols.test(f.emoji || f.icon))).map((p) => p.id + ' → ' + p.forms.map((f) => f.emoji || f.icon).join(' '));
  });
  assert.deepEqual(bad, []);
});

test('every boss is complete: unique name and icon slot, valid type, 3-6 HP and two taunts; new bosses are appended', async () => {
  const bad = await inPage(() => {
    const out = [], names = new Set();
    const elems = ['fire', 'water', 'nature', 'electric', 'dark', 'magic'];
    monstersList.forEach((m, i) => {
      if (names.has(m.name)) out.push('duplicate ' + m.name);
      names.add(m.name);
      if (elems.indexOf(m.element) === -1) out.push(m.name + ' element');
      if (!(m.baseHp >= 3 && m.baseHp <= (m.name === 'Rocky' ? 9 : 6))) out.push(m.name + ' hp');
      if (!m.icon || !Array.isArray(m.taunts) || m.taunts.length < 2) out.push(m.name + ' incomplete');
    });
    const per = {}; monstersList.forEach((m) => { per[m.element] = (per[m.element] || 0) + 1; });
    if (Object.values(per).some((n) => n < 6)) out.push('uneven types ' + JSON.stringify(per));
    if (monstersList[35].name !== 'Arcane Peacock') out.push('old boss numbers changed');
    return out;
  });
  assert.deepEqual(bad, []);
});

test('new store buddies sit in price order before the Bandit', async () => {
  const r = await inPage(() => {
    const costs = storePets.map((p) => p.cost);
    return { sorted: costs.every((c, i) => !i || c >= costs[i - 1]), last: storePets[storePets.length - 1].id };
  });
  assert.deepEqual(r, { sorted: true, last: 'bandit' });
});

test('loot can drop the new mythics and secrets, and old saves keep their buddies', async () => {
  const r = await inPage(() => ({
    mythicIds: mythicCompanions.slice(22, 28).map((p) => p.id),
    secretIds: [secretCompanions[153].id, secretCompanions[154].id, secretCompanions[183].id],
    oldIdsStable: secretCompanions[0].id === 'secret_1' && secretCompanions[153].id === 'secret_154'
  }));
  assert.deepEqual(r.mythicIds, ['mythic_arthur', 'mythic_robin', 'mythic_alice', 'mythic_sinbad', 'mythic_aladdin', 'mythic_dorothy']);
  assert.deepEqual(r.secretIds, ['secret_154', 'secret_155', 'secret_184']);
  assert.equal(r.oldIdsStable, true);
});

test('cartoon cast: kid-friendly shows only, every character complete, and the tiers add up', async () => {
  const r = await inPage(() => {
    const toons = storePets.concat(mythicCompanions, secretCompanions).filter((p) => p.show);
    const byShow = {};
    toons.forEach((p) => { byShow[p.show] = (byShow[p.show] || 0) + 1; });
    return {
      total: toons.length, byShow,
      tiers: { store: storePets.filter((p) => p.show).length, mythic: mythicCompanions.filter((p) => p.show).length, secret: secretCompanions.filter((p) => p.show).length },
      incomplete: toons.filter((p) => !p.name || !p.icon || !p.superMove || !p.element).map((p) => p.id),
      oneHeadlinerPerShow: [...new Set(storePets.filter((p) => p.show).map((p) => p.show))].length
    };
  });
  assert.deepEqual(r.byShow, { 'Bluey': 6, 'SpongeBob': 7, 'Paw Patrol': 8, 'Peppa Pig': 5, 'The Simpsons': 5, 'Looney Tunes': 8 });
  assert.equal(r.total, 39);
  assert.deepEqual(r.tiers, { store: 6, mythic: 8, secret: 25 });
  assert.deepEqual(r.incomplete, []);
  assert.equal(r.oneHeadlinerPerShow, 6);
  assert.ok(!Object.keys(r.byShow).some((s) => /south park|rick and morty|family guy/i.test(s)), 'adult-rated shows do not belong in a kids game');
});

test('no errors', () => { assert.deepEqual(errors, []); });

test('four slayer bosses: a cow, a Harpy Eagle, Māra and Rocky, each strong against one buddy', async () => {
  const r = await inPage(() => {
    const list = monstersList.map((m, i) => ({ i, m })).filter((x) => x.m.slays);
    return list.map((x) => ({ i: x.i, name: x.m.name, icon: x.m.emoji || x.m.icon, element: x.m.element, slays: x.m.slays, ultra: ultraPets.some((u) => u.id === x.m.slays), hp: x.m.baseHp, taunts: x.m.taunts.length }));
  });
  assert.deepEqual(r.map((b) => [b.i, b.slays, b.ultra]), [[50, 'secret_janie', true], [51, 'secret_amber', true], [52, 'secret_papaw', true], [53, 'bandit', false]], 'appended after the old bosses, so saved boss positions still match');
  assert.deepEqual(r.map((b) => b.icon), ['🐄', '🦅', '😈', '🐕']);
  assert.match(r[1].name, /Harpy Eagle/);
  assert.equal(r[2].name, 'Māra');
  r.slice(0, 3).forEach((b) => { assert.ok(b.hp >= 5 && b.hp <= 6, 'plays like a normal boss'); assert.equal(b.taunts, 2); });
  assert.equal(r[3].name, 'Rocky');
  assert.equal(r[3].taunts, 2);
});

