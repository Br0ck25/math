import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { launch, loadWorker, fakeKV, openGame } from './helpers.mjs';

// iPhone Safari paints a colour emoji as a flat silhouette filled with the current fillStyle. A gradient or pattern
// there turned every buddy on a trading card into a grey ghost on iOS (Chrome on Android was fine). We cannot run
// Safari here, so this watches every emoji drawn on any canvas and demands a plain colour string fillStyle.
const WATCH_EMOJI_FILLS = () => {
  window.__emojiFills = [];
  const real = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, w) {
    if (/\p{Extended_Pictographic}/u.test(String(text))) {
      window.__emojiFills.push({ text: String(text).slice(0, 12), solid: typeof this.fillStyle === 'string', alpha: this.globalAlpha });
    }
    return real.call(this, text, x, y, w);
  };
};

let browser, page, errors;
before(async () => {
  browser = await launch();
  ({ page, errors } = await openGame(browser, await loadWorker(), { MATH_KV: fakeKV() }, { init: WATCH_EMOJI_FILLS }));
});
after(async () => { await browser.close(); });

test('every emoji on every kind of card is drawn with a plain colour fill (the iPhone grey-ghost bug)', async () => {
  const r = await page.evaluate(() => {
    window.__emojiFills.length = 0;
    // active buddy wearing an aura, a head item, a side item and armor, at every evolution stage, plus a sleepy one
    state.unlockedPets = ['dog', 'fox', 'toon_bluey'];
    const ids = ['dog', 'fox', 'toon_bluey', 'secret_janie', secretCompanions[0].id, mythicCompanions[0].id];
    [0, 20, 50, 90].forEach((lvl) => {
      state.activePet = 'fox'; state.buddyXp.fox = xpForLevel(lvl);
      ['sunshine', 'crown', 'balloon', 'wings', 'comet'].forEach((acc) => {
        state.activeAccessory = acc; state.activeArmor = 'dragon';
        const c = document.createElement('canvas'); drawCard(c, 'fox');
      });
    });
    state.advHp = { dog: 0 }; drawCard(document.createElement('canvas'), 'dog'); state.advHp = {};
    ids.forEach((id) => drawCard(document.createElement('canvas'), id));
    // bosses: plain, elder, alpha, raid
    monstersList.slice(0, 5).forEach((_, i) => [{}, { level: 30 }, { level: 60 }, { level: 60, raid: true }].forEach((o) => drawCardFromDesc(document.createElement('canvas'), bossCard(i, o))));
    const bad = window.__emojiFills.filter((f) => !f.solid);
    return { drawn: window.__emojiFills.length, bad: bad.slice(0, 5) };
  });
  assert.ok(r.drawn > 100, 'the watcher saw the emoji being drawn: ' + r.drawn);
  assert.deepEqual(r.bad, []);
});

test('the buddy picture itself is drawn at full strength unless the buddy is asleep', async () => {
  const r = await page.evaluate(() => {
    window.__emojiFills.length = 0;
    const dog = getSpecies('dog'); if (dog.emoji) { dog.icon = dog.emoji; delete dog.emoji; delete ART_URIS.dog; }   // the emoji path: dog now has a picture
    state.activePet = 'dog'; state.activeAccessory = 'none'; state.activeArmor = 'none'; state.advHp = {};
    drawCard(document.createElement('canvas'), 'dog');
    const awake = window.__emojiFills.find((f) => f.text === '🐶');
    window.__emojiFills.length = 0;
    state.advHp = { dog: 0 }; drawCard(document.createElement('canvas'), 'dog'); state.advHp = {};
    const asleep = window.__emojiFills.find((f) => f.text === '🐶');
    return { awake: awake && awake.alpha, asleep: asleep && asleep.alpha };
  });
  assert.deepEqual(r, { awake: 1, asleep: 0.55 });
});

test('no errors', () => { assert.deepEqual(errors, []); });
