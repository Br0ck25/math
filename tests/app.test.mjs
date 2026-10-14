import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

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
});
const solveCorrectly = () => page.evaluate(() => { inputLocked = false; userInput = String(currentProblem.answer); checkAnswer(); });

// ---------------------------------------------------------------- layout & accessibility
test('no errors and no sideways scrolling at small phone sizes', async () => {
  for (const viewport of [{ width: 360, height: 640 }, { width: 420, height: 800 }, { width: 320, height: 568 }]) {
    const g = await openGame(browser, worker, env, { viewport });
    const overflow = await g.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(overflow <= 1, 'horizontal overflow ' + overflow + 'px at ' + viewport.width);
    assert.deepEqual(g.errors, [], 'errors at ' + viewport.width);
    await g.context.close();
  }
});

test('main-screen buttons are at least 44px to tap', async () => {
  const g = await openGame(browser, worker, env, { viewport: { width: 360, height: 640 } });
  const measure = (sel, min) => g.page.evaluate(([s, m]) => {
    const out = [];
    document.querySelectorAll(s).forEach((b) => {
      const r = b.getBoundingClientRect();
      if (r.width < m || r.height < m) out.push((b.id || b.textContent.trim().slice(0, 14)) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    });
    return out;
  }, [sel, min]);
  assert.deepEqual(await measure('#hint-btn, #pad-open-btn, .bottom-bar button', 44), []);
  // the keypad shares a 640px-tall screen with the arena: keys are wide, so 36px tall is the floor there
  assert.deepEqual(await measure('.keypad button', 34), []);
  await g.context.close();
  const tall = await openGame(browser, worker, env, { viewport: { width: 420, height: 800 } });
  const tallSmall = await tall.page.evaluate(() => [...document.querySelectorAll('.keypad button')].filter((b) => b.getBoundingClientRect().height < 44).length);
  assert.equal(tallSmall, 0, 'on a normal phone every key is 44px tall');
  await tall.context.close();
});

test('every button has a name a screen reader can read, in every screen', async () => {
  const unnamed = await page.evaluate(() => {
    const out = [];
    const check = (where) => document.querySelectorAll('button').forEach((b) => {
      const name = (b.getAttribute('aria-label') || b.textContent || '').replace(/[\s​]/g, '');
      if (!name || /^[^\p{L}\p{N}]*$/u.test(name) && !b.getAttribute('aria-label')) out.push(where + ': ' + b.outerHTML.slice(0, 90));
    });
    check('main');
    state.unlockedPets = ['dog', 'fox'];
    [['openQuests', 'closeQuests'], ['openCal', 'closeCal'], ['openBook', 'closeBook'], ['openShop', 'closeShop'], ['openSettings', 'closeSettings'], ['openParent', 'closeParent']].forEach((p) => {
      window[p[0]](); check(p[0]); window[p[1]]();
    });
    openHub();
    ['care', 'card', 'tour', 'duel'].forEach((t) => { setHubTab(t); check('hub-' + t); });
    duelMode = 'online'; renderDuelTab(); check('hub-online');
    closeHub();
    return out;
  });
  assert.deepEqual([...new Set(unnamed.map((u) => u.replace(/^[^:]*: /, '')))], []);
});

test('dialogs are labelled and Escape closes them; game screens ignore backdrop taps', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    out.labelled = [...document.querySelectorAll('.modal-overlay')].every((m) => m.getAttribute('role') === 'dialog' && (m.getAttribute('aria-label') || m.getAttribute('aria-labelledby')));
    openQuests();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    out.escClosed = document.getElementById('quest-modal').style.display === 'none';
    openBook();
    document.getElementById('book-modal').click();
    out.tapClosed = document.getElementById('book-modal').style.display === 'none';
    duelSetup.n = 5; openHub(); duelStart(true);
    document.getElementById('duel-modal').click();
    out.gameSurvivedTap = document.getElementById('duel-modal').style.display === 'flex';
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    out.gameEscQuit = document.getElementById('duel-modal').style.display === 'none';
    return out;
  });
  assert.deepEqual(r, { labelled: true, escClosed: true, tapClosed: true, gameSurvivedTap: true, gameEscQuit: true });
});

test('reduced motion: setting is remembered and confetti stops', async () => {
  const r = await page.evaluate(() => {
    state.reduceMotion = false; applyMotionPref();
    const before = particles.length; launchConfetti(); const full = particles.length - before;
    toggleMotion();
    const b2 = particles.length; launchConfetti();
    return { full: full > 0, reducedClass: document.documentElement.classList.contains('reduce-motion'), reducedParticles: particles.length - b2, saved: state.reduceMotion };
  });
  assert.deepEqual(r, { full: true, reducedClass: true, reducedParticles: 0, saved: true });
});

test('colours used for small text have enough contrast', async () => {
  const bad = await page.evaluate(() => {
    const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const css = getComputedStyle(document.documentElement);
    const v = (n) => css.getPropertyValue(n).trim();
    const out = [];
    ['--text', '--text-muted', '--accent', '--success'].forEach((fg) => ['--bg-dark', '--card-bg'].forEach((bg) => {
      const a = lum(v(fg)), b = lum(v(bg));
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      if (ratio < 4.5) out.push(fg + ' on ' + bg + ' = ' + ratio.toFixed(2));
    }));
    return out;
  });
  assert.deepEqual(bad, []);
});

test('first-time players get a glow on the buddy that goes away after the hub is opened', async () => {
  const r = await page.evaluate(() => {
    const w = document.getElementById('fighter-icon-wrapper');
    const before = w.classList.contains('coach-glow');
    openHub(); closeHub();
    return { before, after: w.classList.contains('coach-glow'), seen: state.seen.hub };
  });
  assert.deepEqual(r, { before: true, after: false, seen: true });
});

// ---------------------------------------------------------------- buddy gear
test('every accessory has a slot and every armor a tier, so gear always has a place to sit', async () => {
  const bad = await page.evaluate(() => [
    ...accessoriesList.filter((a) => a.id !== 'none' && !GEAR_SLOTS[a.slot]).map((a) => 'accessory ' + a.id),
    ...armorList.filter((a) => a.id !== 'none' && !(a.tier >= 1 && a.tier <= 3 && ARMOR_TIER_COLORS[a.tier])).map((a) => 'armor ' + a.id)
  ]);
  assert.deepEqual(bad, []);
});

test('worn gear stays tidy on the battle screen: nothing piles on the armor badge, and the name row stays on one line', async () => {
  for (const viewport of [{ width: 360, height: 640 }, { width: 420, height: 800 }]) {
    const g = await openGame(browser, worker, env, { viewport });
    const messy = await g.page.evaluate(() => {
      const out = [];
      const area = (r) => Math.max(0, r.width) * Math.max(0, r.height);
      const overlap = (a, b) => area({ width: Math.min(a.right, b.right) - Math.max(a.left, b.left), height: Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) });
      const armors = ['tunic', 'chain', 'celestial'];
      accessoriesList.filter((a) => a.id !== 'none').forEach((acc) => armors.forEach((arm) => {
        state.activeAccessory = acc.id; state.activeArmor = arm; updateBattleUI();
        const wrap = document.getElementById('fighter-icon-wrapper').getBoundingClientRect();
        const gear = document.querySelector('#pet-gear .gear').getBoundingClientRect();
        const badge = document.querySelector('#pet-gear .armor-badge').getBoundingClientRect();
        const slot = acc.slot;
        if (slot !== 'back' && slot !== 'aura' && overlap(gear, badge) > 0.2 * area(gear)) out.push(acc.id + ' covers the armor badge (' + arm + ')');
        if (gear.left > wrap.right + wrap.width || gear.right < wrap.left - wrap.width) out.push(acc.id + ' floats away from the buddy');
        const tag = document.querySelector('.fighter-tag').getBoundingClientRect();
        if (tag.height > 22) out.push('name row wraps with ' + acc.id);
      }));
      return [...new Set(out)];
    });
    assert.deepEqual(messy, [], 'at ' + viewport.width);
    await g.context.close();
  }
});

test('the trading card draws gear in every slot without errors', async () => {
  const r = await page.evaluate(() => {
    state.activeArmor = 'crystal';
    const slots = {};
    accessoriesList.filter((a) => a.id !== 'none').forEach((a) => { slots[a.slot] = a.id; });
    Object.values(slots).forEach((accId) => { state.activeAccessory = accId; const c = document.createElement('canvas'); drawCard(c, state.activePet); });
    return Object.keys(slots).sort();
  });
  assert.deepEqual(r, ['aura', 'back', 'face', 'head', 'neck', 'side']);
});

test('arena fighter cards: no \"Buddy\" label, name above pills, nothing wraps or spills at any width or boss', async () => {
  for (const viewport of [{ width: 300, height: 560 }, { width: 360, height: 640 }, { width: 420, height: 800 }]) {
    const g = await openGame(browser, worker, env, { viewport });
    const r = await g.page.evaluate(() => {
      const out = [];
      const rows = () => ['pet', 'monster'].map((side) => {
        const name = document.getElementById(side === 'pet' ? 'pet-fighter-name' : 'monster-name');
        const tag = name.nextElementSibling;
        return { side, name, tag, info: name.parentElement };
      });
      state.unlockedPets = ['dog', 'fox'];
      out.push(document.querySelector('.versus-row').innerText.includes('BUDDY') || /\bbuddy\b/i.test(document.querySelector('.fighter-tag').innerText) ? 'still says Buddy' : null);
      monstersList.forEach((m, i) => [1, 20, 45].forEach((lvl) => {
        currentMonsterIndex = i; bossLevel = lvl; state.raid = lvl === 45 ? { phase: 0, total: 3, weaks: ['add', 'sub', 'mul'], chapter: 0, introSeen: true } : null;
        state.activePet = i % 2 ? 'fox' : 'dog';
        updateBattleUI();
        rows().forEach((x) => {
          if (x.tag.getBoundingClientRect().height > 22) out.push(x.side + ' pills wrap for ' + m.name + ' lv' + lvl);
          if (x.name.getBoundingClientRect().height > 24) out.push(x.side + ' name wraps for ' + m.name);
          const box = x.info.getBoundingClientRect(), kids = [x.name, x.tag].map((e) => e.getBoundingClientRect());
          if (kids.some((k) => k.left < box.left - 1 || k.right > box.right + 1)) out.push(x.side + ' spills out for ' + m.name + ' lv' + lvl);
        });
        const vs = document.querySelector('.vs-badge').getBoundingClientRect();
        const pr = document.getElementById('pet-fighter-name').parentElement.getBoundingClientRect();
        const mr = document.getElementById('monster-name').parentElement.getBoundingClientRect();
        if (pr.right > vs.left + 1 || mr.left < vs.right - 1) out.push('fighter text runs into the VS badge for ' + m.name);
      }));
      state.raid = null;
      return [...new Set(out.filter(Boolean))].slice(0, 6);
    });
    assert.deepEqual(r, [], 'at ' + viewport.width);
    await g.context.close();
  }
});

test('boss cards: tap the boss in the arena or a met boss in the book; every boss draws', async () => {
  const r = await page.evaluate(() => {
    const out = {};
    updateBattleUI();
    document.getElementById('monster-icon').click();
    const m = document.getElementById('bosscard-modal');
    out.arenaOpens = m.style.display === 'flex';
    out.arenaLevel = bossCard(currentMonsterIndex, { level: bossLevel }).levelText === 'Lv ' + bossLevel;
    closeBossCard();
    state.bossBook[3] = { wins: 4, form: 1 };
    openBook(); bookTab = 'boss'; renderBook();
    const met = [...document.querySelectorAll('#book-body .pet-card')].filter((c) => c.getAttribute('onclick'));
    out.metClickable = met.length === Object.keys(state.bossBook).length;     // every met boss is clickable, unmet ones are not
    met.find((c) => c.getAttribute('onclick') === 'openBossCard(3)').click();
    out.bookOpens = m.style.display === 'flex' && /Elder/.test(bossCard(3).name) && bossCard(3).stats[2][1] === 4;
    closeBossCard(); closeBook();
    const sizes = new Set();
    monstersList.forEach((_, i) => [{}, { level: 30 }, { level: 50, raid: true }].forEach((o) => { const c = document.createElement('canvas'); drawCardFromDesc(c, bossCard(i, o)); sizes.add(c.width + 'x' + c.height); }));
    out.sizes = [...sizes];
    out.labelled = !!document.getElementById('monster-icon').getAttribute('aria-label');
    return out;
  });
  assert.deepEqual(r, { arenaOpens: true, arenaLevel: true, metClickable: true, bookOpens: true, sizes: ['600x840'], labelled: true });
});

test('the buddy can be opened from the keyboard too', async () => {
  const opened = await page.evaluate(() => {
    const w = document.getElementById('fighter-icon-wrapper');
    w.focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    return document.getElementById('hub-modal').style.display === 'flex';
  });
  assert.equal(opened, true);
});

// ---------------------------------------------------------------- saves
test('an old or damaged save is repaired, versioned and keeps working', async () => {
  await page.evaluate(() => localStorage.setItem('math_quest_save', JSON.stringify({
    gems: 'lots', grade: 99, streakCal: 5, parentGoal: { minutes: -4 }, stats: 'x', duelFriends: ['ok_name', '<b>', 7],
    tour: null, raid: { phase: 9 }, unlockedPets: ['dog_evo'], activePet: 'ghost', adapt: 3
  })));
  await page.reload();
  const s = await page.evaluate(() => JSON.parse(JSON.stringify(state)));
  assert.equal(s.v, 1);
  assert.equal(s.gems, 0);
  assert.ok(s.grade >= 0 && s.grade <= 5);
  assert.equal(s.streakCal.count, 0);
  assert.equal(s.parentGoal.minutes, 5);
  assert.deepEqual(s.stats, { days: {} });
  assert.deepEqual(s.duelFriends, ['ok_name']);
  assert.equal(s.tour.trophies, 0);
  assert.equal(s.raid, null);
  assert.equal(s.activePet, 'dog');
  assert.deepEqual(s.adapt, { miss: {}, easy: {} });
  assert.deepEqual(errors, []);
});

test('an oversized save drops old history first', async () => {
  const r = await page.evaluate(() => {
    for (let i = 1; i <= 35; i++) state.stats.days['2026-01-' + String(i).padStart(2, '0')] = { s: 1, a: 1, ms: 1, h: 0, w: 0, ops: {} };
    for (let i = 0; i < 12000; i++) state.bossBook['pad' + i] = { wins: 1, form: 0, note: 'xxxxxxxxxxxxxxxxxxxx' };
    const json = serializeState();
    return { days: Object.keys(state.stats.days).length, small: json.length };
  });
  assert.equal(r.days, 14);
});

// ---------------------------------------------------------------- learning
test('two misses on a type queue an easier problem, and that survives a reload', async () => {
  await page.evaluate(() => { state.enabledOps = ['add', 'mul']; });
  let explained = '';
  for (let i = 0; i < 2; i++) {
    explained = await page.evaluate(() => {
      currentProblem = { layout: 'inline', expr: '14 × 7', answer: 98, modeTag: 'mul' };
      inputLocked = false; userInput = '1'; state.shields = 0; checkAnswer();
      return document.getElementById('hint-box').innerText;
    });
  }
  assert.equal(await page.evaluate(() => state.adapt.easy.mul), true);
  assert.match(explained, /How to/);
  await page.reload();
  // the game starts with the queued easy problem (saved with the game), then the queue is empty
  const easy = await page.evaluate(() => [currentProblem.easy, currentProblem.modeTag, state.adapt.easy.mul]);
  assert.deepEqual(easy, [true, 'mul', undefined]);
});

test('a wrong answer explains how, and the next problem waits long enough to read it', async () => {
  await page.evaluate(() => { currentProblem = { layout: 'inline', expr: '14 × 7', answer: 98, modeTag: 'mul' }; inputLocked = false; userInput = '5'; checkAnswer(); });
  assert.ok(await page.evaluate(() => explainHold >= 2000));
});

test('a hint costs a gem, is logged for the parent report and removes the speed bonus', async () => {
  const r = await page.evaluate(() => {
    state.gems = 5; useHint();
    return { gems: state.gems, hints: statDay().h, used: hintUsed, text: document.getElementById('hint-box').innerText.length > 5 };
  });
  assert.deepEqual(r, { gems: 4, hints: 1, used: true, text: true });
});

// ---------------------------------------------------------------- daily features
test('streak calendar: first answer counts, a missed day pauses, chests pay once, day 14 rolls over', async () => {
  await solveCorrectly();
  assert.equal(await page.evaluate(() => state.streakCal.count), 1);
  const r = await page.evaluate(() => {
    const out = {};
    state.streakCal = { count: 2, last: daysAgoKey(5), total: 2, claimed: [] };
    calDayEvent();
    out.afterPause = state.streakCal.count;
    state.gems = 0; claimCalChest(3); claimCalChest(3);
    out.chest = state.gems;
    state.streakCal = { count: 14, last: daysAgoKey(1), total: 14, claimed: [3] };
    state.gems = 0; calDayEvent();
    out.rolled = [state.streakCal.count, state.gems];
    return out;
  });
  assert.equal(r.afterPause, 3, 'a missed day never wipes the streak');
  assert.equal(r.chest, 40, 'a chest only pays once');
  assert.deepEqual(r.rolled, [1, 90 + 200]);
});

test('daily quests: three quests, claiming pays, the chest needs all three', async () => {
  const r = await page.evaluate(() => {
    const qs = ensureQuests();
    qs.list.forEach((q) => { q.done = true; q.progress = q.target; });
    state.gems = 0;
    const total = qs.list.reduce((a, q) => a + q.reward, 0);
    claimQuestChest();
    const tooEarly = state.gems;
    qs.list.forEach((_, i) => claimQuest(i));
    claimQuest(0);
    const afterClaims = state.gems;
    claimQuestChest(); claimQuestChest();
    return { n: qs.list.length, tooEarly, afterClaims: afterClaims === total, final: state.gems - afterClaims };
  });
  assert.deepEqual(r, { n: 3, tooEarly: 0, afterClaims: true, final: 35 });
});

// ---------------------------------------------------------------- battle features
test('boss weak point shows, glows and hits harder', async () => {
  await page.evaluate(() => { state.enabledOps = ['add', 'mul', 'sub']; updateBattleUI(); });
  assert.match(await page.evaluate(() => document.getElementById('weak-chip').innerText), /Weak point/);
  const r = await page.evaluate(async () => {
    const weak = getWeakOp();
    do { generateProblem(); } while (currentProblem.modeTag !== weak);
    const glow = document.getElementById('equation-mount').classList.contains('weak-glow');
    monsterCurrentHp = 50; const hp = monsterCurrentHp;
    inputLocked = false; userInput = String(currentProblem.answer); checkAnswer();
    await new Promise((res) => setTimeout(res, 400));
    return { glow, dealt: hp - monsterCurrentHp };
  });
  assert.equal(r.glow, true);
  assert.ok(r.dealt >= 2, 'weak-point hit does at least +1 damage');
});

test('raid: appears after the 10th boss, has phases with new weak points, pays a bonus', async () => {
  const r = await page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms * 6));   // game timers run 20x faster in tests
    startGoldenVault = function () { modalDone(); };      // keep the golden vault out of the way
    state.enabledOps = ['add', 'sub', 'mul', 'div'];
    state.monstersDefeated = 9; monsterCurrentHp = 1;
    generateProblem(); inputLocked = false; userInput = String(currentProblem.answer); checkAnswer();
    await wait(300);
    const out = { raid: !!state.raid, total: state.raid && state.raid.total, weaks: state.raid && new Set(state.raid.weaks).size > 1 };
    state.raid.introSeen = true;
    for (let phase = 0; phase < 2; phase++) {
      monsterCurrentHp = 1; generateProblem(); inputLocked = false; userInput = String(currentProblem.answer); checkAnswer();
      await wait(300);
    }
    out.phase = state.raid.phase;
    state.gems = 0; monsterCurrentHp = 1; generateProblem(); inputLocked = false; userInput = String(currentProblem.answer); checkAnswer();
    await wait(400);
    out.cleared = [state.raid, state.raidsCleared, state.gems >= ECON.raid.bonusGems];
    return out;
  });
  assert.equal(r.raid, true);
  assert.equal(r.total, 3);
  assert.equal(r.phase, 2);
  assert.deepEqual(r.cleared, [null, 1, true]);
});

// ---------------------------------------------------------------- buddies, cards, hub
test('care: limits, costs, bond and the XP perk', async () => {
  const r = await page.evaluate(() => {
    state.gems = 30; hubPet = 'dog';
    for (let i = 0; i < 5; i++) careAct('pet');
    careAct('treat'); careAct('treat'); careAct('fav'); careAct('fav');
    const c = state.care.dog;
    return { pets: c.pets, gems: state.gems, bond: c.bond, perk: Math.round(10 * (1 + ECON.care.bondXpBonus * getBond('dog'))) };
  });
  assert.deepEqual(r, { pets: 3, gems: 30 - 2 - 8, bond: 1, perk: 10 });
});

test('a sleepy (fainted) buddy cannot be fed; a trading card draws for every buddy kind', async () => {
  const r = await page.evaluate(() => {
    state.gems = 30; state.faintedPets = ['dog']; hubPet = 'dog'; careAct('treat');
    const fed = state.gems;
    state.faintedPets = [];
    const sizes = ['dog', 'secret_janie', secretCompanions[0].id, mythicCompanions[0].id].map((id) => { const c = document.createElement('canvas'); drawCard(c, id); return c.width + 'x' + c.height; });
    return { fed, sizes: [...new Set(sizes)] };
  });
  assert.deepEqual(r, { fed: 30, sizes: ['600x840'] });
});

test('collection book: rarity on every card, "missing only" hides what you own', async () => {
  const r = await page.evaluate(() => {
    openBook(); bookTab = 'buddy'; renderBook();
    const all = document.querySelectorAll('#book-body .pet-card').length;
    const badges = document.querySelectorAll('#book-body .pet-card .rar-badge').length;
    bookMissingOnly = true; renderBook();
    const missing = document.querySelectorAll('#book-body .pet-card').length;
    const ownedShown = [...document.querySelectorAll('#book-body .pet-card:not(.locked)')].length;
    return { allHaveBadge: all === badges, fewer: missing < all, ownedShown };
  });
  assert.deepEqual(r, { allHaveBadge: true, fewer: true, ownedShown: 0 });
});

// ---------------------------------------------------------------- tournament and room duel
test('tournament: win the cup, earn the rewards once per day limit', async () => {
  await page.evaluate(() => { state.unlockedPets = ['dog', 'fox', 'otter']; state.gems = 0; openHub(); tourStart(); });
  await page.waitForFunction(() => !tour || tour.over, null, { timeout: 60000, polling: 25 }).catch(() => {});
  for (let i = 0; i < 4000; i++) {
    const over = await page.evaluate(() => { if (!tour || tour.over) return true; if (!tour.busy) tourAnswer(tour.answer); return false; });
    if (over) break;
    await page.waitForTimeout(5);
  }
  const r = await page.evaluate(() => ({ trophies: state.tour.trophies, gems: state.gems, log: document.getElementById('tour-log').innerText }));
  assert.equal(r.trophies, 1);
  const expected = await page.evaluate(() => { let g = ECON.tournament.championGems; for (let n = 1; n <= ECON.tournament.rounds; n++) g += ECON.tournament.gemsPerRound * n; return g; });
  assert.equal(r.gems, expected);
});

test('same-room duel: winner, series score that carries over, swap seats', async () => {
  const r = await page.evaluate(async () => {
    const wait = (ms) => new Promise((res) => setTimeout(res, ms));
    state.unlockedPets = ['dog', 'fox'];
    duelSetup = { b: ['dog', 'fox'], n: 5, flip: false };
    const play = async (p1right, p2right) => {
      while (!duel.started) await wait(20);
      for (let i = 0; i < 5; i++) {
        duelAnswer(0, duel.qs[duel.p[0].i].ans);
        if (i < p2right) duelAnswer(1, duel.qs[duel.p[1].i].ans);
      }
      for (let k = 0; k < 40 && !duel.ended; k++) {
        if (!duel.p[1].done && !duel.p[1].lock) { const q = duel.qs[duel.p[1].i]; duelAnswer(1, q.opts.find((o) => o !== q.ans)); }   // finish with misses
        await wait(60);
      }
    };
    duelStart(true);
    await play(5, 3);
    const first = duel.series.slice();
    duelStart(false);
    await play(5, 4);
    const second = duel.series.slice();
    duelSwap();
    return { first, second, swapped: duel.series.slice(), xpGiven: state.duelStat.count };
  });
  assert.deepEqual(r.first, [1, 0]);
  assert.deepEqual(r.second, [2, 0]);
  assert.deepEqual(r.swapped, [0, 2]);
  assert.equal(r.xpGiven, 2);
});

// ---------------------------------------------------------------- parent report
test('parent PIN is stored hashed, locks the report, unlocks, and old plain PINs are converted', async () => {
  const r = await page.evaluate(async () => {
    const out = {};
    document.getElementById('par-pin-new').value = '4821';
    await parentSetPin();
    out.hashed = /^[0-9a-f]{64}$/.test(state.parentPinHash) && !JSON.stringify(state).includes('4821');
    closeParent(); openParent();
    out.locked = parentLocked();
    document.getElementById('par-pin-in').value = '0000'; await parentUnlock();
    out.stillLocked = parentLocked();
    document.getElementById('par-pin-in').value = '4821'; await parentUnlock();
    out.unlocked = !parentLocked();
    return out;
  });
  assert.deepEqual(r, { hashed: true, locked: true, stillLocked: true, unlocked: true });
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('math_quest_save')); delete s.parentPinHash; s.parentPin = '1234'; localStorage.setItem('math_quest_save', JSON.stringify(s)); });
  await page.reload();
  await page.waitForFunction(() => state.parentPinHash);
  const migrated = await page.evaluate(() => ({ plain: state.parentPin, hash: state.parentPinHash.length }));
  assert.deepEqual(migrated, { plain: undefined, hash: 64 });
});

test('parent report adds up the week, compares with last week and flags weak spots', async () => {
  const r = await page.evaluate(() => {
    state.stats.days[daysAgoKey(0)] = { s: 8, a: 10, ms: 600000, h: 2, w: 1, ops: { add: [4, 4], div: [6, 4] } };
    state.stats.days[daysAgoKey(9)] = { s: 5, a: 10, ms: 300000, h: 0, w: 0, ops: { add: [10, 5] } };
    parentUnlocked = true; renderParent();
    return {
      tiles: document.getElementById('par-tiles').innerText.replace(/\s+/g, ' '),
      compare: document.getElementById('par-compare').innerText,
      weak: document.getElementById('par-weak').innerText,
      summary: parentSummary()
    };
  });
  assert.match(r.tiles, /8Solved/);
  assert.match(r.tiles, /80%Accuracy/);
  assert.match(r.tiles, /10mTime played/);
  assert.match(r.compare, /solved ▲ \+3/);
  assert.match(r.weak, /Division/);
  assert.match(r.summary, /Needs practice: Division/);
});

// ---------------------------------------------------------------- shared code
test('modal helpers: every simple modal opens and closes through the shared helpers', async () => {
  const r = await page.evaluate(() => {
    const out = [];
    [['openQuests', 'closeQuests', 'quest-modal'], ['openCal', 'closeCal', 'cal-modal'], ['openBook', 'closeBook', 'book-modal'],
     ['openShop', 'closeShop', 'shop-modal'], ['openSettings', 'closeSettings', 'settings-modal'], ['openParent', 'closeParent', 'parent-modal'],
     ['openHub', 'closeHub', 'hub-modal'], ['openReportModal', 'closeReportModal', 'report-modal']].forEach((m) => {
      window[m[0]]();
      const opened = document.getElementById(m[2]).style.display === 'flex';
      window[m[1]]();
      const closed = document.getElementById(m[2]).style.display === 'none';
      if (!opened || !closed) out.push(m[2]);
    });
    return out;
  });
  assert.deepEqual(r, []);
});

test('the page finished every test without errors', () => { assert.deepEqual(errors, []); });
