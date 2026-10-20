// =====================================================================
//  THE ADVENTURE BATTLE: a Pokemon Gold style fight on its own screen (#ab-modal). Your buddy is at the bottom, the foe at the top, with HP bars.
//  A turn: FIGHT asks a math question. A right answer lets you choose an attack (type, power, accuracy and PP decide the damage); a wrong answer is a miss.
//  Then the foe attacks back. PACK has Catch Nets (wild buddies only) and Potions, BUDDY swaps, RUN leaves a wild fight. Trainers send out one to three buddies.
//  The fight is not saved: HP is (state.advHp), and winning pays experience. The old Practice battle is untouched.
//  Everything that happens is a queue of steps ([text, run, ms]) played one after another; the menus only open when the queue is empty.
// =====================================================================
let ab = null;
const AB_BAR = { low: 0.5, danger: 0.2 };
function abOpen() { return !!ab; }
function abFoe() { return ab.foes[ab.i]; }
function abMe() { return ab.party[ab.cur]; }

// opts: kind ('wild' or 'trainer'), name (the trainer), foes ([{id, level}]), npc (the map person, for a trainer).
function abStart(opts) {
  if (ab) return false;
  const party = getTeam().map(abPartyMon);
  const first = party.findIndex(function (m) { return m.hp > 0; });
  if (first === -1) { toast('Your buddies are too tired. Rest at a Buddy Center first!'); return false; }
  ab = { kind: opts.kind, name: opts.name || '', npc: opts.npc || null, foes: opts.foes.map(function (f) { return abMon(f.id, f.level); }), i: 0, party: party, cur: first, part: [party[first].id], queue: [], busy: false, phase: 'busy', q: null, forced: false, text: '' };
  abFoe().seen = true;
  markDexSeen(abFoe().id);
  hideModal('overworld-modal');
  showModal('ab-modal', function () {
    abRender();
    abSteps(opts.kind === 'wild' ? [['A wild ' + abFoe().name + ' appeared!', null, 1100]] : [[ab.name + ' wants to battle!', null, 1100], [ab.name + ' sent out ' + abFoe().name + '!', null, 1000]]);
    abSteps([['Go! ' + abMe().name + '!', null, 800], abMenuStep()]);
  });
  return true;
}
function abMenuStep() { return [null, function () { ab.phase = 'menu'; document.getElementById('ab-text').innerText = 'What will ' + abMe().name + ' do?'; }, 0]; }
// Steps that must come right after the current one (a level-up message after the experience).
function abNow(list) { ab.queue = list.concat(ab.queue); }

// ----- the step queue -----
function abSteps(list) { ab.queue = ab.queue.concat(list); if (!ab.busy) abPump(); }
function abPump() {
  if (!ab) return;
  const s = ab.queue.shift();
  if (!s) { ab.busy = false; return; }
  ab.busy = true;
  if (s[0]) { ab.text = s[0]; document.getElementById('ab-text').innerText = s[0]; }
  if (s[1]) s[1]();
  abRender();
  setTimeout(abPump, s[2] === undefined ? 900 : s[2]);
}

// ----- drawing -----
function abHpClass(m) { return m.hp / m.max <= AB_BAR.danger ? 'danger' : m.hp / m.max <= AB_BAR.low ? 'low' : ''; }
function abRender() {
  if (!ab) return;
  const f = abFoe(), m = abMe();
  document.getElementById('ab-foe-name').innerText = f.name;
  document.getElementById('ab-foe-lv').innerText = 'Lv' + f.level;
  const fb = document.getElementById('ab-foe-hp');
  fb.style.width = Math.round(f.hp / f.max * 100) + '%'; fb.className = abHpClass(f);
  document.getElementById('ab-me-name').innerText = m.name;
  document.getElementById('ab-me-lv').innerText = 'Lv' + m.level;
  const mb = document.getElementById('ab-me-hp');
  mb.style.width = Math.round(m.hp / m.max * 100) + '%'; mb.className = abHpClass(m);
  document.getElementById('ab-me-num').innerText = m.hp + ' / ' + m.max;
  const lo = xpForLevel(m.level), hi = xpForLevel(m.level + 1);
  document.getElementById('ab-me-xp').style.width = (m.level >= MAX_LEVEL ? 100 : clamp(Math.round((getBuddyXp(m.id) - lo) / Math.max(1, hi - lo) * 100), 0, 100)) + '%';
  setIconHtml(document.getElementById('ab-foe-icon'), f.icon);
  setIconHtml(document.getElementById('ab-me-icon'), m.icon);
  document.getElementById('ab-foe-icon').classList.toggle('ab-gone', f.hp <= 0 || !!ab.caught);
  document.getElementById('ab-me-icon').classList.toggle('ab-gone', m.hp <= 0);
  abPanel();
}
function abBtn(label, fn, cls, disabled) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'ab-btn' + (cls ? ' ' + cls : ''); b.innerHTML = label; b.disabled = !!disabled;
  b.onclick = function () { soundClick(); fn(); };
  return b;
}
function abPanel() {
  const p = document.getElementById('ab-panel'), m = abMe();
  p.innerHTML = '';
  p.className = 'ab-panel ' + ab.phase;
  if (ab.phase === 'menu') {
    p.appendChild(abBtn('FIGHT', abFight));
    p.appendChild(abBtn('PACK', function () { ab.phase = 'pack'; abRender(); }));
    p.appendChild(abBtn('BUDDY', function () { ab.forced = false; ab.phase = 'team'; abRender(); }));
    p.appendChild(abBtn('RUN', abRun));
  } else if (ab.phase === 'question') {
    const q = document.createElement('div');
    q.className = 'ab-q'; q.innerHTML = ab.q.html;
    const box = document.createElement('div');
    box.className = 'vault-opts ab-opts';
    p.appendChild(q); p.appendChild(box);
    fillOptButtons(box, ab.q.opts, abAnswer);
    p.appendChild(abBtn('Back', function () { ab.phase = 'menu'; abRender(); }, 'ab-back'));
  } else if (ab.phase === 'moves') {
    m.moves.forEach(function (mv, i) {
      p.appendChild(abBtn('<b>' + escHtml(mv.name) + '</b><small>' + escHtml(mv.type.toUpperCase()) + ' &middot; PP ' + mv.left + '/' + mv.pp + '</small>', function () { abUseMove(i); }, 'ab-move t-' + mv.type, mv.left <= 0));
    });
  } else if (ab.phase === 'pack') {
    const wild = ab.kind === 'wild';
    p.appendChild(abBtn('Catch Net <small>x' + state.nets + '</small>', abThrowNet, '', !wild || state.nets < 1));
    p.appendChild(abBtn('Potion <small>x' + state.potions + '</small>', abPotion, '', state.potions < 1 || m.hp >= m.max));
    p.appendChild(abBtn('Back', function () { ab.phase = 'menu'; abRender(); }, 'ab-back'));
  } else if (ab.phase === 'team') {
    ab.party.forEach(function (mon, i) {
      p.appendChild(abBtn('<b>' + escHtml(mon.name) + '</b><small>Lv' + mon.level + ' &middot; ' + mon.hp + '/' + mon.max + '</small>', function () { abSwitch(i); }, '', mon.hp <= 0 || i === ab.cur));
    });
    if (!ab.forced) p.appendChild(abBtn('Back', function () { ab.phase = 'menu'; abRender(); }, 'ab-back'));
  }
}
function abEscape() { if (ab && !ab.busy && ab.phase !== 'menu' && !(ab.phase === 'team' && ab.forced) && ab.phase !== 'moves') { ab.phase = 'menu'; abRender(); } }

// ----- your turn -----
function abFight() { ab.q = makeMcq({ count: 4 }); ab.phase = 'question'; abRender(); }
function abAnswer(v) {
  if (ab.phase !== 'question') return;
  if (v !== ab.q.ans) {
    soundWrong();
    ab.phase = 'busy';
    abSteps([['Wrong! The answer was ' + fmtAns(ab.q.ans) + '. ' + abMe().name + "'s attack missed!", null, 1300]]);
    abFoeTurn();
    return;
  }
  soundCorrect(1);
  ab.phase = 'moves';
  document.getElementById('ab-text').innerText = 'Correct! Choose an attack.';
  abRender();
}
function abUseMove(i) {
  const me = abMe(), foe = abFoe(), mv = me.moves[i];
  if (ab.phase !== 'moves' || mv.left <= 0) return;
  mv.left -= 1;
  ab.phase = 'busy';
  abSteps([[me.name + ' used ' + mv.name + '!', null, 800]]);
  abHit(me, foe, mv, function () { abFoeFainted(); }, abFoeTurn);
}
// One attack: accuracy, then damage with its messages. `down` runs when the target faints, `next` when it does not. Used for both sides.
function abHit(att, def, mv, down, next) {
  if (Math.random() * 100 >= mv.acc) { abSteps([[att.name + "'s attack missed!", null, 900]]); next(); return; }
  const crit = Math.random() < 1 / 16, r = abDamage(att, def, mv, crit);
  abSteps([['', function () { def.hp = Math.max(0, def.hp - r.dmg); if (state.advHp && ab.party.indexOf(def) !== -1) state.advHp[def.id] = def.hp; soundClick(); }, 600]]);
  if (crit) abSteps([['A critical hit!', null, 800]]);
  if (r.eff > 1) abSteps([["It's super effective!", null, 900]]);
  else if (r.eff < 1) abSteps([["It's not very effective...", null, 900]]);
  abSteps([['', function () { if (def.hp <= 0) down(); else next(); }, 0]]);
}

// ----- the foe's turn -----
function abFoeTurn() {
  abSteps([['', function () {
    const foe = abFoe(), me = abMe(), mv = pick(foe.moves);
    abSteps([[foe.name + ' used ' + mv.name + '!', null, 800]]);
    abHit(foe, me, mv, abMeFainted, abBackToMenu);
  }, 0]]);
}
function abBackToMenu() { abSteps([abMenuStep()]); saveState(); }

// ----- a faint -----
function abFoeFainted() {
  const foe = abFoe(), trainer = ab.kind === 'trainer', xp = abXpYield(foe, trainer), part = ab.part.filter(function (id) { return ab.party.some(function (m) { return m.id === id && m.hp > 0; }); });
  abSteps([[foe.name + ' fainted!', null, 1000]]);
  const each = Math.max(1, Math.floor(xp / Math.max(1, part.length)));
  part.forEach(function (id) {
    const mon = ab.party.find(function (m) { return m.id === id; });
    abSteps([[mon.name + ' gained ' + each + ' Exp. Points!', function () {
      abGainXp(mon, each);
      if (mon.leveled) abNow([[mon.name + ' grew to Lv' + mon.level + '!', function () { soundLevelUp(); }, 1200]].concat(mon.evolved ? [['What? ' + mon.evolved + ' evolved into ' + mon.name + '!', null, 1400]] : []));
    }, 1000]]);
  });
  abSteps([['', function () {
    if (ab.i + 1 < ab.foes.length) {
      ab.i += 1; markDexSeen(abFoe().id); ab.part = [abMe().id];
      abSteps([[ab.name + ' sent out ' + abFoe().name + '!', null, 1000], abMenuStep()]);
    } else abWon();
  }, 0]]);
}
// Experience for one of your buddies; a level-up raises its stats and keeps its HP gain, and may change its form.
function abGainXp(mon, amt) {
  const before = getBuddyLevel(mon.id);
  addXpTo(mon.id, amt);
  const now = getBuddyLevel(mon.id);
  mon.leveled = now > before; mon.evolved = '';
  if (!mon.leveled) return;
  const fresh = abMon(mon.id, now), oldName = mon.name, hp = Math.min(fresh.max, mon.hp + fresh.max - mon.max);
  fresh.moves = fresh.moves.map(function (m) { return mon.moves.find(function (o) { return o.id === m.id; }) || m; });
  Object.assign(mon, fresh, { hp: hp, leveled: true, evolved: fresh.name !== oldName ? oldName : '' });
  state.advHp[mon.id] = mon.hp;
}
function abMeFainted() {
  const me = abMe();
  abSteps([[me.name + ' fainted!', function () { state.advHp[me.id] = 0; }, 1200]]);
  abSteps([['', function () {
    if (ab.party.some(function (m) { return m.hp > 0; })) { ab.forced = true; ab.phase = 'team'; document.getElementById('ab-text').innerText = 'Choose your next buddy.'; abRender(); }
    else abLost();
  }, 0]]);
}
function abSwitch(i) {
  const mon = ab.party[i];
  if (ab.phase !== 'team' || mon.hp <= 0 || i === ab.cur) return;
  const forced = ab.forced, old = abMe();
  ab.phase = 'busy'; ab.forced = false;
  abSteps([[forced ? '' : 'Come back, ' + old.name + '!', null, forced ? 0 : 700], ['Go! ' + mon.name + '!', function () { ab.cur = i; if (ab.part.indexOf(mon.id) === -1) ab.part.push(mon.id); }, 800]]);
  if (forced) abBackToMenu(); else abFoeTurn();
}

// ----- the pack -----
function abPotion() {
  const me = abMe();
  if (state.potions < 1 || me.hp >= me.max) return;
  state.potions -= 1; ab.phase = 'busy';
  const heal = Math.min(ECON.overworld.potionHeal, me.max - me.hp);
  abSteps([['You used a Potion!', function () { me.hp += heal; state.advHp[me.id] = me.hp; soundLevelUp(); }, 900], [me.name + ' got back ' + heal + ' HP.', null, 900]]);
  abFoeTurn();
}
function abThrowNet() {
  if (ab.kind !== 'wild' || state.nets < 1) return;
  const foe = abFoe(), chance = abCatchChance(foe), got = Math.random() < chance;
  state.nets -= 1; ab.phase = 'busy';
  abSteps([['You threw a Catch Net!', null, 1000]]);
  const shakes = got ? 3 : rnd(0, 2);
  for (let k = 0; k < shakes; k++) abSteps([['...', null, 700]]);
  if (!got) { abSteps([['Oh no! ' + foe.name + ' broke free!', null, 1100]]); abFoeTurn(); return; }
  abSteps([['Gotcha! ' + foe.name + ' was caught!', function () { ab.caught = true; abKeepCaught(foe); }, 1300], ['', function () { abFinish('caught'); }, 0]]);
}
// The caught buddy joins you (or becomes a spare if you already own one). The same rules as a catch on the Practice screen.
function abKeepCaught(foe) {
  const sp = getSpecies(foe.id);
  if (getOwnedIds().indexOf(sp.id) !== -1) { state.spares[sp.id] = Math.min(99, (state.spares[sp.id] || 0) + 1); toast('A spare ' + sp.name + '! Sell it in the buddy hub.'); }
  else { grantBuddy(sp.id); (isStoreBuddy(sp) ? state.unlockedPets : state.unlockedSecrets).push(sp.id); checkEarnedGear(); toast(sp.name + ' joined your collection!'); }
  saveState();
}
function abRun() {
  if (ab.kind === 'trainer') { ab.phase = 'busy'; abSteps([["No! There's no running from a trainer battle!", null, 1200], abMenuStep()]); return; }
  ab.phase = 'busy';
  abSteps([['Got away safely!', null, 900], ['', function () { abFinish('run'); }, 0]]);
}

// ----- the end -----
function abWon() {
  const trainer = ab.kind === 'trainer';
  abSteps([[trainer ? 'You defeated ' + ab.name + '!' : '', function () { if (trainer) grantGems(ECON.map.trainerGems, '+' + ECON.map.trainerGems + ' gems!', false); }, trainer ? 1300 : 0], ['', function () { abFinish('win'); }, 0]]);
}
function abLost() {
  abSteps([['You have no buddies left that can fight...', null, 1500], ['', function () { abFinish('lose'); }, 0]]);
}
function abFinish(result) {
  const a = ab;
  ab = null;
  saveState();
  updateStatsUI();
  hideModal('ab-modal', function () {
    const o = state.overworld;
    if (result === 'lose') {
      state.advHp = {};
      o.map = o.center.map; o.x = o.center.x; o.y = o.center.y; o.face = 'down'; owTrail = null;
    }
    showAdventureWindow();
    if (result === 'lose') openTalk({ name: 'Buddy Center', art: worldSprite('t-center-sign'), lines: ['Oh no, your buddies got very tired.', 'They rested at the Buddy Center and feel great again. Ready to try again?'] });
    else if (result === 'win' && a.npc) {
      if (o.beat.indexOf(a.npc.id) === -1) o.beat.push(a.npc.id);
      if (a.npc.story) owStoryReward(a.npc.story);
      saveState();
      owTrainerTalk(a.npc);
    }
  });
}
