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

test('the collection has the planned size: 351 buddies, 54 bosses, 118 pieces of gear', async () => {
  const c = await inPage(() => ({
    buddies: bookCounts().buddy.total, bosses: monstersList.length,
    gear: (accessoriesList.length - 1) + (armorList.length - 1),
    store: storePets.length, mythic: mythicCompanions.length, secret: secretCompanions.length, legend: legendPets.length
  }));
  assert.deepEqual(c, { buddies: 351, bosses: 54, gear: 118, store: 43, mythic: 36, secret: 209, legend: 6 });
});

test('every buddy and boss is an animal, creature or monster, never an object; only show and storybook characters may be people', async () => {
  const r = await inPage(() => ({
    buddies: allBuddies().map((b) => ({ id: b.id, name: b.name, icon: b.emoji || b.icon, person: !!(b.show || b.mythic || b.legend) })),
    bosses: monstersList.map((m) => ({ name: m.name, icon: m.icon }))
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

test('Rocky the pitbull is the strongest boss, hits harder, and is a slayer of the Bandit', async () => {
  const r = await inPage(() => {
    const i = monstersList.findIndex((m) => m.name === 'Rocky');
    const others = monstersList.filter((m, j) => j !== i);
    state.wild.id = ''; currentMonsterIndex = i; bossLevel = 20; state.bossSwapped = false; state.raid = null;
    const b = getBossInfo();
    const o = (() => { currentMonsterIndex = 0; return getBossInfo(); })();
    currentMonsterIndex = i;
    return {
      i, mostHp: others.every((m) => m.baseHp < monstersList[i].baseHp), slays: monstersList[i].slays, target: slayerTarget(b),
      atk: b.atk, otherAtk: o.atk, maxHp: b.maxHp, otherHp: o.maxHp, buddy: getSpecies('boss_rocky').name, last: i === monstersList.length - 1,
      cardAtk: bossCard(i, { level: 20 }).stats[1][1]
    };
  });
  assert.equal(r.last, true, 'appended after the old bosses');
  assert.equal(r.mostHp, true);
  assert.equal(r.slays, 'bandit');
  assert.equal(r.target, 'Bandit');
  assert.equal(r.atk, r.otherAtk + 1);
  assert.ok(r.maxHp > r.otherHp);
  assert.equal(r.buddy, 'Rocky');
  assert.equal(r.cardAtk, r.atk, 'the card shows the same attack');
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
      if (!bossCard(i).name) out.push(m.name + ' card');
    });
    const per = {}; monstersList.forEach((m) => { per[m.element] = (per[m.element] || 0) + 1; });
    if (Object.values(per).some((n) => n < 6)) out.push('uneven types ' + JSON.stringify(per));
    if (monstersList[35].name !== 'Arcane Peacock') out.push('old boss numbers changed');
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

test('Janie, Amber and Papaw: three ultra-rare buddies, equally rare and equally strong, each with a favorite food', async () => {
  const r = await inPage(() => {
    const out = {};
    out.ids = ultraPets.map((p) => p.id + ':' + p.name + ':' + p.icon);
    out.food = ultraPets.map((p) => favSnack(p.id).icon + ' ' + favSnack(p.id).name);
    // same stats at the same level, and the same damage against every boss element, whatever the element badge says
    const dmg = ultraPets.map((p) => ['fire', 'water', 'nature', 'electric', 'dark', 'magic'].map((e) => tourDamage({ element: p.element, ultra: p.ultra, atk: 4 }, { element: e, ultra: false })));
    out.sameDamage = dmg.every((d) => JSON.stringify(d) === JSON.stringify(dmg[0]));
    out.shadow = ultraPets.map((p) => battleElement(p));
    out.incoming = ultraPets.map((p) => ['fire', 'water', 'nature', 'electric', 'dark', 'magic'].map((e) => getTypeRelation(e, battleElement(p))).join(''));
    out.elements = ultraPets.map((p) => p.element);
    out.rarity = ultraPets.map((p) => rarityOf(p.id).name);
    out.pack = ultraPets.map((p) => packOf(p).id);
    // one 0.5% slice of the drop roll each
    out.drops = [0.001, 0.006, 0.011, 0.016].map((roll) => {
      state.unlockedSecrets = []; state.streak = 5; state.faintedPets = [];
      const real = Math.random; Math.random = () => roll;
      checkForSecretLootDrop(false);
      Math.random = real;
      return state.unlockedSecrets.filter((id) => ultraPets.some((p) => p.id === id)).join(',');
    });
    state.unlockedSecrets = ['secret_janie']; state.streak = 5;
    const real = Math.random; Math.random = () => 0.001; checkForSecretLootDrop(false); Math.random = real;
    out.ownedStaysOwned = state.unlockedSecrets.filter((id) => ultraPets.some((p) => p.id === id)).join(',');
    return out;
  });
  assert.deepEqual(r.ids, ['secret_janie:Janie:👽', 'secret_amber:Amber:🦥', 'secret_papaw:Papaw:🧘']);
  assert.deepEqual(r.food, ['🍞 Hawaiian rolls', '🍟 air fried potatoes', '🍔 hamburgers']);
  assert.equal(r.sameDamage, true);
  assert.deepEqual(r.shadow, ['shadow', 'shadow', 'shadow']);
  assert.deepEqual(r.incoming, ['000000', '000000', '000000'], 'no type weaknesses');
  assert.deepEqual(r.elements.slice(1), ['nature', 'magic']);
  assert.deepEqual(r.rarity, ['COSMIC', 'COSMIC', 'COSMIC']);
  assert.equal(r.pack[1], 'safari');
  assert.equal(r.pack[2], 'fantasy');
  assert.deepEqual(r.drops, ['secret_janie', 'secret_amber', 'secret_papaw', ''], 'each ultra has its own 0.5% slice');
  assert.equal(r.ownedStaysOwned, 'secret_janie', 'an owned ultra is never given twice');
});

test('the care window shows each ultra buddy\'s own favorite food', async () => {
  const r = await inPage(() => ultraPets.map((p) => { hubPet = p.id; renderCare(); return document.getElementById('hub-body').innerText; }));
  assert.match(r[0], /Hawaiian rolls/);
  assert.match(r[1], /air fried potatoes/);
  assert.match(r[2], /hamburgers/);
});

test('found ultra buddies appear in their own shop section and not among the ordinary secrets', async () => {
  const r = await inPage(() => {
    state.unlockedSecrets = ['secret_amber', 'secret_papaw']; state.buddyXp.secret_amber = 0; state.buddyXp.secret_papaw = 0;
    renderSecretPets();
    return { found: document.getElementById('ultra-found-count').innerText, total: document.getElementById('ultra-total-count').innerText, cards: document.querySelectorAll('#ultra-pet-grid .pet-card').length, regular: document.getElementById('secret-found-count').innerText };
  });
  assert.deepEqual(r, { found: '2', total: '3', cards: 2, regular: '0' });
});

test('four slayer bosses: a cow, a Harpy Eagle, Māra and Rocky, each strong against one buddy', async () => {
  const r = await inPage(() => {
    const list = monstersList.map((m, i) => ({ i, m })).filter((x) => x.m.slays);
    return list.map((x) => ({ i: x.i, name: x.m.name, icon: x.m.icon, element: x.m.element, slays: x.m.slays, ultra: ultraPets.some((u) => u.id === x.m.slays), hp: x.m.baseHp, taunts: x.m.taunts.length }));
  });
  assert.deepEqual(r.map((b) => [b.i, b.slays, b.ultra]), [[50, 'secret_janie', true], [51, 'secret_amber', true], [52, 'secret_papaw', true], [53, 'bandit', false]], 'appended after the old bosses, so saved boss positions still match');
  assert.deepEqual(r.map((b) => b.icon), ['🐄', '🦅', '😈', '🐕']);
  assert.match(r[1].name, /Harpy Eagle/);
  assert.equal(r[2].name, 'Māra');
  r.slice(0, 3).forEach((b) => { assert.ok(b.hp >= 5 && b.hp <= 6, 'plays like a normal boss'); assert.equal(b.taunts, 2); });
  assert.equal(r[3].name, 'Rocky');
  assert.equal(r[3].taunts, 2);
});

test('a slayer boss hits its buddy harder and takes less damage from it; other bosses are unchanged', async () => {
  const r = await inPage(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const out = {};
    ultraPets.forEach((u) => { state.unlockedSecrets.push(u.id); state.buddyXp[u.id] = xpForLevel(40); });
    const run = async (buddy, bossIdx) => {
      state.activePet = buddy; currentMonsterIndex = bossIdx; bossLevel = 1; partyHp = {};
      monsterCurrentHp = 1000;
      const maxHp = getPetMaxHp(buddy);
      setPetHp(buddy, maxHp);
      triggerMonsterDamage(0, false); await wait(450);
      const dealt = 1000 - monsterCurrentHp;
      monsterCurrentHp = 1000;
      triggerBuddyDamage(); await wait(450);
      return { dealt, taken: maxHp - getPetHp(buddy) };
    };
    out.janieVsCow = await run('secret_janie', 50);
    out.janieVsDrake = await run('secret_janie', 0);
    out.amberVsHarpy = await run('secret_amber', 51);
    out.amberVsCow = await run('secret_amber', 50);
    out.papawVsMara = await run('secret_papaw', 52);
    out.papawVsHarpy = await run('secret_papaw', 51);
    out.hint = (() => { state.activePet = 'secret_papaw'; currentMonsterIndex = 52; updateBattleUI(); return document.getElementById('type-match-hint').innerText; })();
    return out;
  });
  const slay = [r.janieVsCow, r.amberVsHarpy, r.papawVsMara], normal = [r.janieVsDrake, r.amberVsCow, r.papawVsHarpy];
  slay.forEach((s, i) => { assert.ok(s.taken > normal[i].taken, 'slayer hits harder ' + JSON.stringify([s, normal[i]])); assert.ok(s.dealt < normal[i].dealt, 'slayer takes less ' + JSON.stringify([s, normal[i]])); });
  assert.match(r.hint, /Strong against Papaw/);
});

test('boss cards and the book say which buddy a slayer is strong against', async () => {
  const r = await inPage(() => ({ card: bossCard(52, {}).foot, cow: bossCard(50, {}).foot }));
  assert.equal(r.card, '☠️ Strong against Papaw');
  assert.equal(r.cow, '☠️ Strong against Janie');
});

test('the arrival message warns when the new boss is a slayer of your active buddy', async () => {
  const arrive = (buddy, roll) => inPage(async ([buddy, roll]) => {
    if (!state.unlockedSecrets.includes(buddy) && !state.unlockedPets.includes(buddy)) { (buddy === 'bandit' ? state.unlockedPets : state.unlockedSecrets).push(buddy); grantBuddy(buddy); }
    state.activePet = buddy; partyHp = {}; state.monstersDefeated = 0;
    if (buddy === 'bandit') state.buddyXp.bandit = xpForLevel(60);          // Rocky only appears for a strong buddy
    state.wild.id = ''; state.wild.since = 99;                  // a boss comes next
    state.recentBossTypes = []; const real = Math.random; Math.random = () => roll;
    currentMonsterIndex = 0; monsterCurrentHp = 1; inputLocked = false;
    triggerMonsterDamage(50, false);
    await new Promise((res) => setTimeout(res, 1300));
    Math.random = real;
    return document.getElementById('toast').innerText;
  }, [buddy, roll]);
  assert.match(await arrive('secret_papaw', 0.9999), /Māra appeared! ☠️ Strong against Papaw!/);       // the last boss a low-level buddy can meet
  assert.match(await arrive('bandit', 0.9999), /Rocky appeared! ☠️ Strong against Bandit!/);           // the last boss
});

test('beat a boss 3 times in its Alpha form and it joins you at half your strongest buddy\'s level', async () => {
  const r = await inPage(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    const win = async (form) => {
      state.wild.id = ''; state.activePet = 'dog'; currentMonsterIndex = 50; bossLevel = form === 2 ? 50 : 10; partyHp = {};
      monsterCurrentHp = 1; state.faintedPets = [];
      triggerMonsterDamage(50, false); await wait(900);
    };
    state.buddyXp.dog = xpForLevel(60);                       // strongest buddy: level 60
    state.unlockedSecrets = []; state.bossBook = {};
    const out = { steps: [] };
    await win(1); await win(0);                               // Elder and normal wins do not count
    out.alphaAfterOthers = state.bossBook[50].alpha;
    await win(2); out.steps.push([state.bossBook[50].alpha, state.unlockedSecrets.includes('boss_cow')]);
    await win(2); out.steps.push([state.bossBook[50].alpha, state.unlockedSecrets.includes('boss_cow')]);
    await win(2); out.steps.push([state.bossBook[50].alpha, state.unlockedSecrets.includes('boss_cow')]);
    out.level = getBuddyLevel('boss_cow');
    out.best = getBuddyLevel('dog');
    await win(2);
    out.owned = state.unlockedSecrets.filter((id) => id === 'boss_cow').length;
    return out;
  });
  assert.equal(r.alphaAfterOthers, 0);
  assert.deepEqual(r.steps, [[1, false], [2, false], [3, true]]);
  assert.equal(r.level, Math.floor(r.best / 2), 'half of the strongest buddy');
  assert.equal(r.owned, 1, 'never given twice');
});

test('boss buddies: ordinary strength, own shop section, boss card progress, and a safe saved book', async () => {
  const r = await inPage(() => {
    const out = {};
    out.notUltra = bossBuddies.every((b) => !b.ultra && battleElement(b) === b.element);
    out.packs = bossBuddies.slice(-3).map((b) => packOf(b).id);
    out.all = bossBuddies.length === monstersList.length && monstersList.every((m, i) => getSpecies(m.buddy) && getSpecies(m.buddy).name === m.name);
    out.moves = new Set(bossBuddies.map((b) => b.superMove)).size;
    out.moveSample = bossBuddies[0].superMove + ' / ' + bossBuddies[50].superMove;
    out.rarity = rarityOf('boss_mara').name;
    state.unlockedSecrets = ['boss_harpy']; state.buddyXp.boss_harpy = 0;
    renderSecretPets();
    out.shop = [document.getElementById('bossbuddy-found-count').innerText, document.getElementById('bossbuddy-total-count').innerText, document.querySelectorAll('#bossbuddy-pet-grid .pet-card').length, document.getElementById('secret-found-count').innerText];
    state.bossBook = { 50: { wins: 'x', form: 99, alpha: -4 }, 999: { wins: 1 }, 51: 7 };
    NORMALIZERS.forEach((fn) => fn(state));
    out.book = JSON.stringify(state.bossBook);
    state.bossBook = { 50: { wins: 5, form: 2, alpha: 2 } };
    bookTab = 'boss'; renderBook();
    out.progress = document.getElementById('book-body') ? document.getElementById('book-body').innerText : document.body.innerText;
    return out;
  });
  assert.equal(r.notUltra, true);
  assert.equal(r.all, true, 'every boss has a buddy of the same name');
  assert.ok(r.moves >= 45, 'buddies have their own ultimates, not one shared move: ' + r.moves);
  assert.equal(r.moveSample, 'Drake Blaze / Stampede Slam');
  assert.deepEqual(r.packs, ['boss-electric', 'boss-dark', 'boss-fire']);
  assert.equal(r.rarity, 'BOSS');
  assert.deepEqual(r.shop, ['1', '54', 1, '0'], 'boss buddies are not counted as ordinary secrets');
  assert.equal(r.book, '{"50":{"wins":0,"form":2,"alpha":0}}');
  assert.match(r.progress, /Alpha wins: 2\/3/);
  assert.doesNotMatch(r.progress, /Beaten x5/);
});

test('bosses you have started on come back more often once your buddy can reach Alpha bosses', async () => {
  const r = await inPage(() => {
    const all = monstersList.map((_, i) => i);
    state.unlockedSecrets = [];
    state.activePet = 'dog';
    state.bossBook = { 0: { wins: 1, form: 2, alpha: 1 }, 7: { wins: 2, form: 2, alpha: 2 }, 9: { wins: 1, form: 0, alpha: 0 }, 11: { wins: 5, form: 2, alpha: 3 } };
    state.buddyXp.dog = xpForLevel(10); const low = wantedBossCopies(all).length;
    state.buddyXp.dog = xpForLevel(60); const high = wantedBossCopies(all);
    const count = (i) => high.filter((x) => x === i).length;
    const per = [count(0), count(7), count(9), count(11), count(20)];
    state.unlockedSecrets = ['boss_11', 'boss_0']; const afterWin = wantedBossCopies(all).filter((x) => x === 0).length;
    return { low, per, afterWin, weight: ECON.bossBuddy.weight };
  });
  assert.equal(r.low, 0);
  assert.deepEqual(r.per, [r.weight - 1, r.weight - 1, 0, 0, 0], 'only bosses with 1-2 Alpha wins');
  assert.equal(r.afterWin, 0, 'a boss you already won stops being favoured');
});

test('any boss can be won as a buddy after 3 Alpha victories, not just the slayers', async () => {
  const r = await inPage(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    state.buddyXp.dog = xpForLevel(60); state.unlockedSecrets = []; state.bossBook = {}; state.activePet = 'dog';
    const out = { steps: [] };
    for (let n = 0; n < 3; n++) {
      state.wild.id = ''; currentMonsterIndex = 0; bossLevel = 50; partyHp = {}; monsterCurrentHp = 1; state.faintedPets = [];
      triggerMonsterDamage(50, false); await wait(900);
      out.steps.push([state.bossBook[0].alpha, state.unlockedSecrets.includes('boss_0')]);
    }
    out.name = getSpecies('boss_0').name; out.level = getBuddyLevel('boss_0');
    return out;
  });
  assert.deepEqual(r.steps, [[1, false], [2, false], [3, true]]);
  assert.equal(r.name, 'Fire Drake');
  assert.equal(r.level, 30);
});
