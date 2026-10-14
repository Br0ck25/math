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

test('the collection has the planned size: 289 buddies, 50 bosses, 118 pieces of gear', async () => {
  const c = await inPage(() => ({
    buddies: bookCounts().buddy.total, bosses: monstersList.length,
    gear: (accessoriesList.length - 1) + (armorList.length - 1),
    store: storePets.length, mythic: mythicCompanions.length, secret: secretCompanions.length
  }));
  assert.deepEqual(c, { buddies: 289, bosses: 50, gear: 118, store: 43, mythic: 36, secret: 209 });
});

test('every buddy has what it needs: unique id, valid type, a move, and three forms that still look like it', async () => {
  const bad = await inPage(() => {
    const out = [], seen = new Set();
    const elems = ['fire', 'water', 'nature', 'electric', 'dark', 'magic', 'shadow'];
    storePets.concat(mythicCompanions, secretCompanions, [janiePet]).forEach((p) => {
      if (seen.has(p.id)) out.push('duplicate id ' + p.id);
      seen.add(p.id);
      if (elems.indexOf(p.element) === -1) out.push(p.id + ' element ' + p.element);
      if (!p.name || !p.icon || !p.superMove) out.push(p.id + ' missing name/icon/move');
      if (!p.forms || p.forms.length !== 3) { out.push(p.id + ' forms'); return; }
      p.forms.forEach((f, i) => {
        if (!f.name || !f.icon) out.push(p.id + ' form ' + i + ' incomplete');
        if (typeof f.icon === 'string' && !f.icon.trim().startsWith('<svg') && /\s/.test(f.icon.trim())) out.push(p.id + ' form ' + i + ' icon has extra pieces: ' + f.icon);
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
    return storePets.filter((p) => p.forms.some((f) => symbols.test(f.icon))).map((p) => p.id + ' → ' + p.forms.map((f) => f.icon).join(' '));
  });
  assert.deepEqual(bad, []);
});

test('evolution look: stage 0 has none, stage 1 a badge and glow, stage 2 adds aura and sparkle; cards and menus use it', async () => {
  const r = await inPage(() => {
    const out = { s0: formMarkup(0, 'fire') === '', s1: /evo-badge/.test(formMarkup(1, 'fire')) && !/evo-aura/.test(formMarkup(1, 'fire')), s2: /evo-aura/.test(formMarkup(2, 'fire')) && /evo-spark/.test(formMarkup(2, 'fire')) };
    state.unlockedPets = ['dog', 'fox']; state.activePet = 'fox'; state.buddyXp.fox = xpForLevel(60);
    updateBattleUI();
    out.arenaBadge = !!document.querySelector('#pet-gear .evo-badge');
    out.glow = document.getElementById('pet-fighter-icon').className.indexOf('stage-2') !== -1;
    out.avatar = /stage-2/.test(avatarHtml(getPetById('fox'), 56));
    const c = document.createElement('canvas'); drawCard(c, 'fox'); out.card = c.width === 600;
    return out;
  });
  assert.deepEqual(r, { s0: true, s1: true, s2: true, arenaBadge: true, glow: true, avatar: true, card: true });
});

test('every boss is complete: unique name and icon slot, valid type, 3-6 HP and two taunts; new bosses are appended', async () => {
  const bad = await inPage(() => {
    const out = [], names = new Set();
    const elems = ['fire', 'water', 'nature', 'electric', 'dark', 'magic'];
    monstersList.forEach((m, i) => {
      if (names.has(m.name)) out.push('duplicate ' + m.name);
      names.add(m.name);
      if (elems.indexOf(m.element) === -1) out.push(m.name + ' element');
      if (!(m.baseHp >= 3 && m.baseHp <= 6)) out.push(m.name + ' hp');
      if (!m.icon || !Array.isArray(m.taunts) || m.taunts.length < 2) out.push(m.name + ' incomplete');
      if (!bossCard(i).name) out.push(m.name + ' card');
    });
    const per = {}; monstersList.forEach((m) => { per[m.element] = (per[m.element] || 0) + 1; });
    if (Object.values(per).some((n) => n < 6)) out.push('uneven types ' + JSON.stringify(per));
    if (monstersList[35].name !== 'Arcane Archmage') out.push('old boss numbers changed');
    return out;
  });
  assert.deepEqual(bad, []);
});

test('every piece of gear is complete and unique; earned pieces say how to get them', async () => {
  const bad = await inPage(() => {
    const out = [], ids = new Set(), icons = new Set();
    accessoriesList.concat(armorList).filter((g) => g.id !== 'none').forEach((g) => {
      if (ids.has(g.id)) out.push('duplicate id ' + g.id);
      ids.add(g.id);
      if (!g.name || !g.icon || !g.renderIcon) out.push(g.id + ' incomplete');
      if (g.earn) {
        if (g.cost !== 0 || !EARN_COUNTERS[g.earn.key] || !(g.earn.n >= 1) || !g.earn.text) out.push(g.id + ' bad earn rule');
      } else if (!(g.cost > 0)) out.push(g.id + ' has no price');
    });
    accessoriesList.filter((g) => g.id !== 'none' && ids.has(g.id)).forEach((g) => { if (icons.has(g.renderIcon + g.slot)) out.push('same look twice: ' + g.id); icons.add(g.renderIcon + g.slot); });
    return out;
  });
  assert.deepEqual(bad, []);
});

test('earned gear: locked until the achievement, then awarded once, never for sale', async () => {
  const r = await inPage(() => {
    const out = {};
    state.gems = 9999;
    const crown = accessoriesList.find((a) => a.id === 'raidcrown');
    selectOrBuyAccessory(crown);
    out.notBought = state.unlockedAccessories.indexOf('raidcrown') === -1 && state.gems === 9999;
    out.lockText = gearLockText(crown);
    state.raidsCleared = 1; out.early = checkEarnedGear();
    state.raidsCleared = 2; out.awarded = checkEarnedGear();
    out.again = checkEarnedGear();
    state.tour.wins = 1; state.monstersDefeated = 100; state.streakCal.count = 14;
    out.rest = checkEarnedGear();
    out.all = ['raidcrown', 'champmedal', 'sunshine'].every((id) => state.unlockedAccessories.indexOf(id) !== -1) && state.unlockedArmor.indexOf('centurion') !== -1;
    return out;
  });
  assert.deepEqual(r, { notBought: true, lockText: '🏆 Clear 2 raid bosses', early: 0, awarded: 1, again: 0, rest: 3, all: true });
});

test('cartoon cast gear is earned by collecting the cartoon buddies', async () => {
  const r = await inPage(() => {
    state.raidsCleared = 0; state.tour.wins = 0; state.monstersDefeated = 0; state.streakCal.count = 0;      // only the cast counters matter here
    const reset = () => { state.unlockedAccessories = ['none']; state.unlockedArmor = ['none']; state.unlockedPets = ['dog']; state.unlockedSecrets = []; };
    const secrets = secretCompanions.filter((p) => p.show), headliners = storePets.filter((p) => p.id.indexOf('toon_') === 0);
    const all = headliners.concat(mythicCompanions.filter((p) => p.show), secrets);
    const give = (list) => { list.forEach((p) => { (p.secret ? state.unlockedSecrets : state.unlockedPets).push(p.id); }); return checkEarnedGear(); };
    const out = {};
    reset(); out.none = checkEarnedGear();
    reset(); out.nine = give(secrets.slice(0, 9));
    reset(); out.ten = give(secrets.slice(0, 10));
    out.pass = state.unlockedAccessories.indexOf('fanpass') !== -1 && state.unlockedAccessories.indexOf('goldspatula') === -1;
    reset(); out.fiveHeadliners = give(headliners.slice(0, 5));
    out.coat = give(headliners.slice(5)) === 1 && state.unlockedArmor.indexOf('circuscoat') !== -1;
    reset(); give(all);
    out.spatula = state.unlockedAccessories.indexOf('goldspatula') !== -1 && state.unlockedAccessories.indexOf('fanpass') !== -1;
    return out;
  });
  assert.deepEqual(r, { none: 0, nine: 0, ten: 1, pass: true, fiveHeadliners: 0, coat: true, spatula: true });
});

test('earned gear shows as a secret in the shop and the book', async () => {
  const r = await inPage(() => {
    state.unlockedAccessories = ['none']; state.unlockedArmor = ['none'];
    renderAccessories();
    const shop = document.getElementById('accessories-grid').innerText;
    openBook(); bookTab = 'gear'; renderBook();
    const book = document.getElementById('book-body').innerText;
    closeBook();
    return { shop: shop.includes('Clear 2 raid bosses'), book: book.includes('Secret') && book.includes('Win a tournament cup') };
  });
  assert.deepEqual(r, { shop: true, book: true });
});

test('new store buddies sit in price order before the Bandit, who still needs all of them', async () => {
  const r = await inPage(() => {
    const costs = storePets.map((p) => p.cost);
    return { sorted: costs.every((c, i) => !i || c >= costs[i - 1]), last: storePets[storePets.length - 1].id, needsAll: !!storePets[storePets.length - 1].requiresAllStorePets };
  });
  assert.deepEqual(r, { sorted: true, last: 'bandit', needsAll: true });
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
