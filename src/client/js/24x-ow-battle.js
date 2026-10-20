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

// opts: kind ('wild', 'trainer' or 'leader'), name, foes ([{id, level}] or {boss, level}), npc (the map person) for one fight; or `rounds`, a list of those
// ({kind, name, npc, foes}) fought one after another with the same team (a gym, the Hall). onWin runs on the map after the last round is won.
function abStart(opts) {
  if (ab) return false;
  const party = getTeam().map(abPartyMon);
  const lead = party.findIndex(function (m) { return m.id === state.activePet && m.hp > 0; });          // the lead goes first, as the first slot does in Gold; if it is resting, the first one that can fight
  const first = lead !== -1 ? lead : party.findIndex(function (m) { return m.hp > 0; });
  if (first === -1) { toast('Your buddies are too tired. Rest at a Buddy Center first!'); return false; }
  const rounds = opts.rounds || [{ kind: opts.kind, name: opts.name || '', npc: opts.npc || null, foes: opts.foes }];
  ab = { after: [], rounds: rounds, r: 0, onWin: opts.onWin || null, party: party, cur: first, queue: [], busy: false, phase: 'busy', q: null, forced: false, text: '' };
  abLoadRound();
  hideModal('overworld-modal');
  showModal('ab-modal', function () {
    abRender();
    abSteps(abIntro());
    abSteps([['Go! ' + abMe().name + '!', null, 800], abMenuStep()]);
  });
  return true;
}
function abLoadRound() {
  const r = ab.rounds[ab.r];
  ab.kind = r.kind; ab.name = r.name; ab.npc = r.npc || null;
  ab.foes = r.foes.map(abFoeMon);
  ab.i = 0; ab.part = [abMe().id];
  abSeen();
}
function abSeen() { const f = abFoe(); if (f.id) markDexSeen(f.id); }
function abIntro() {
  return ab.kind === 'wild' ? [['A wild ' + abFoe().name + ' appeared!', null, 1100]] : [[ab.name + ' wants to battle!', null, 1100], [ab.name + ' sent out ' + abFoe().name + '!', null, 1000]];
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
  document.getElementById('ab-foe-lv').innerText = 'Lv' + f.level + (f.status ? ' ' + AB_STATUS_TAG[f.status] : '') + (f.conf > 0 ? ' CNF' : '');
  const fb = document.getElementById('ab-foe-hp');
  fb.style.width = Math.round(f.hp / f.max * 100) + '%'; fb.className = abHpClass(f);
  document.getElementById('ab-me-name').innerText = m.name;
  document.getElementById('ab-me-lv').innerText = 'Lv' + m.level + (m.status ? ' ' + AB_STATUS_TAG[m.status] : '') + (m.conf > 0 ? ' CNF' : '');
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
    p.appendChild(abBtn('Read aloud', function () { speakCurrentProblem(true); }, 'ab-back'));
    p.appendChild(abBtn('Back', function () { ab.phase = 'menu'; abRender(); }, 'ab-back'));
  } else if (ab.phase === 'moves') {
    if (m.moves.every(function (mv) { return mv.left <= 0; })) p.appendChild(abBtn('<b>Struggle</b><small>NORMAL &middot; no PP left</small>', function () { abUseMove(-1); }, 'ab-move t-normal'));
    m.moves.forEach(function (mv, i) {
      p.appendChild(abBtn('<b>' + escHtml(mv.name) + '</b><small>' + escHtml(mv.type.toUpperCase()) + ' &middot; PP ' + mv.left + '/' + mv.pp + '</small>', function () { abUseMove(i); }, 'ab-move t-' + mv.type, mv.left <= 0));
    });
  } else if (ab.phase === 'pack') {
    const wild = ab.kind === 'wild';
    p.appendChild(abBtn('Catch Net <small>x' + state.nets + '</small>', abThrowNet, '', !wild || state.nets < 1));
    p.appendChild(abBtn('Potion <small>x' + state.potions + '</small>', abPotion, '', state.potions < 1 || (m.hp >= m.max && !m.status)));
    p.appendChild(abBtn('Super Potion <small>x' + (state.items.superpotion || 0) + '</small>', function () { abUseItem('superpotion'); }, '', !state.items.superpotion || (m.hp >= m.max && !m.status)));
    p.appendChild(abBtn('Full Heal <small>x' + (state.items.fullheal || 0) + '</small>', function () { abUseItem('fullheal'); }, '', !state.items.fullheal || (!m.status && !(m.conf > 0))));
    p.appendChild(abBtn('Revive <small>x' + (state.items.revive || 0) + '</small>', function () { abUseItem('revive'); }, '', !state.items.revive || !ab.party.some(function (x) { return x.hp <= 0; })));
    p.appendChild(abBtn('Back', function () { ab.phase = 'menu'; abRender(); }, 'ab-back'));
  } else if (ab.phase === 'learn') {
    ab.learn.mon.moves.forEach(function (mv, i) { p.appendChild(abBtn('Forget <b>' + escHtml(mv.name) + '</b>', function () { abLearnChoose(i); }, 'ab-move t-' + mv.type)); });
    p.appendChild(abBtn('Keep my moves', function () { abLearnChoose(-1); }, 'ab-back'));
  } else if (ab.phase === 'team') {
    ab.party.forEach(function (mon, i) {
      p.appendChild(abBtn('<b>' + escHtml(mon.name) + '</b><small>Lv' + mon.level + ' &middot; ' + mon.hp + '/' + mon.max + '</small>', function () { abSwitch(i); }, '', mon.hp <= 0 || i === ab.cur));
    });
    if (!ab.forced) p.appendChild(abBtn('Back', function () { ab.phase = 'menu'; abRender(); }, 'ab-back'));
  }
}
function abEscape() { if (ab && !ab.busy && ab.phase !== 'menu' && !(ab.phase === 'team' && ab.forced) && ab.phase !== 'moves' && ab.phase !== 'learn') { ab.phase = 'menu'; abRender(); } }

// ----- your turn -----
// The next battle question: the adaptive math problem (07b-adaptive.js decides the type and level), or a study question in trivia mode.
let abLastOp = null;
function abQuestion() {
  if (studyOn) return Object.assign(makeMcq({ count: 4 }), { t0: Date.now() });
  const next = pickNextProblem(abLastOp), p = next.make();
  abLastOp = next.op;
  noteServed(next.kind === 'challenge');
  const q = makeMcq({ op: next.op, problem: function () { return p; }, count: 4 });
  q.kind = next.kind; q.t0 = Date.now();
  return q;
}
// A right or wrong answer teaches the adaptive levels (a quick right answer counts most).
function abRecordAnswer(ok) {
  const q = ab.q, secs = (Date.now() - q.t0) / 1000;
  if (q.op === 'study') return;
  const fast = ok && secs <= (4 + state.grade * 2.5) * (HARD_OPS.indexOf(q.op) !== -1 ? 1.6 : 1);
  recordAdaptive(q.op, ok, fast);
  if (ok) return;
  if (q.kind === 'challenge') state.adapt.calm[q.op] = true; else state.adapt.easy[q.op] = true;       // after a miss the next one is a gentler warm-up
}
function abFight() { ab.q = abQuestion(); ab.phase = 'question'; abRender(); speakCurrentProblem(); }
function abAnswer(v) {
  if (ab.phase !== 'question') return;
  const right = v === ab.q.ans;
  abRecordAnswer(right);
  if (!right) {
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
// FIGHT's attack, after a right answer. The faster buddy moves first (a priority move beats speed); the foe's move is picked now so the order is fair.
function abUseMove(i) {
  const me = abMe(), foe = abFoe(), mv = i < 0 ? AB_STRUGGLE : me.moves[i];
  if (ab.phase !== 'moves' || mv.left <= 0) return;
  if (i >= 0) { mv.left -= 1; abSavePp(me); }
  ab.phase = 'busy';
  const fm = abPickMove(foe, me), mp = mv.pri || 0, fp = fm.pri || 0;
  const claw = me.held === 'claw' && Math.random() < 60 / 256;                                        // a Quick Claw sometimes goes first
  const first = mp !== fp ? mp > fp : claw || (abSpeed(me) !== abSpeed(foe) ? abSpeed(me) > abSpeed(foe) : Math.random() < 0.5);
  const mine = function (next) { abStrike(me, foe, mv, abFoeFainted, next); }, theirs = function (next) { abStrike(foe, me, fm, abMeFainted, next); };
  if (first) mine(function () { theirs(abEndRound); }); else theirs(function () { mine(abEndRound); });
}
// A Berry is eaten when a buddy is at half its HP or less (and still up): it heals and is used up.
function abBerry(m) {
  if (m.held !== 'berry' || m.hp <= 0 || m.hp * 2 > m.max || ab.party.indexOf(m) === -1) return;
  m.held = ''; delete state.held[m.id];
  state.heldOwned = state.heldOwned.filter(function (i) { return i !== 'berry'; });
  const heal = Math.min(ECON.held.berryHeal, m.max - m.hp);
  m.hp += heal;
  abNow([[m.name + ' ate its Berry and restored ' + heal + ' HP!', null, 1100]]);
}
function abSpeed(m) { return m.spd * (m.status === 'paralysis' ? 0.25 : 1); }
function abSavePp(m) { state.advPp[m.id] = {}; m.moves.forEach(function (mv) { state.advPp[m.id][mv.id] = mv.left; }); }
// The sound of a hit: a plain thud for normal moves, the element's own sound for the others.
function abHitSound(att, mv) { if (mv.type === 'normal') soundTackle(); else soundElementHit(att.element); }
const AB_STATUS_TEXT = { burn: 'was burned!', poison: 'was poisoned!', paralysis: 'is paralyzed! It may not attack!', sleep: 'fell asleep!', freeze: 'was frozen solid!', confusion: 'became confused!' };
// One side attacks: asleep or paralyzed it may lose the turn, otherwise "X used Y!" and the hit. `down` runs if the target faints, `next` if not.
function abStrike(att, def, mv, down, next) {
  abSteps([['', function () {
    if (att.status === 'sleep') {
      if (att.sleep > 0) { att.sleep -= 1; abNow([[att.name + ' is fast asleep.', null, 900], ['', next, 0]]); return; }
      att.status = ''; abNow([[att.name + ' woke up!', null, 800]]);
    }
    if (att.status === 'freeze') {                                                                      // Gold: frozen solid, a tenth chance to thaw each turn
      if (Math.random() >= 0.1) { abNow([[att.name + ' is frozen solid!', null, 900], ['', next, 0]]); return; }
      att.status = ''; abNow([[att.name + ' thawed out!', null, 800]]);
    }
    if (att.conf > 0) {                                                                                 // Gold: confused for 2-5 turns, half the time it hurts itself instead
      att.conf -= 1;
      if (att.conf === 0) abNow([[att.name + ' snapped out of its confusion!', null, 800]]);
      else if (Math.random() < 0.5) {
        const hurt = abDamage(att, att, { power: 40, type: 'normal', name: 'confusion' }, false).dmg, mine = ab.party.indexOf(att) !== -1;
        abNow([[att.name + ' is confused!', null, 800], ['It hurt itself in its confusion!', function () { att.hp = Math.max(0, att.hp - hurt); if (mine) state.advHp[att.id] = att.hp; }, 900], ['', function () { if (att.hp <= 0) (mine ? abMeFainted : abFoeFainted)(); else next(); }, 0]]);
        return;
      }
    }
    if (att.status === 'paralysis' && Math.random() < 0.25) { abNow([[att.name + " is paralyzed! It can't move!", null, 1000], ['', next, 0]]); return; }
    abSteps([[att.name + ' used ' + mv.name + '!', null, 800]]);
    abHit(att, def, mv, down, next);
  }, 0]]);
}
// The attack picture: the attacker lunges, a burst in the move's colour flies at the target and it shakes. Skipped when the player asks for less motion.
function abFx(att, def, mv, hit) {
  if (typeof motionReduced === 'function' && motionReduced()) return;
  const mine = ab.party.indexOf(att) !== -1, fid = function (me) { return document.getElementById(me ? 'ab-me-icon' : 'ab-foe-icon'); };
  const a = fid(mine), d = fid(!mine), field = a.parentNode;
  const play = function (el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(function () { el.classList.remove(cls); }, 700); };
  play(a, 'ab-lunge');
  if (!hit) return;
  const fx = document.createElement('div');
  fx.className = 'ab-fx t-' + mv.type + (mine ? ' ab-fx-up' : ' ab-fx-down');
  field.appendChild(fx);
  setTimeout(function () { fx.remove(); }, 700);
  play(d, 'ab-shake');
}
// One attack: accuracy, then damage with its messages and maybe a status. Used for both sides.
function abHit(att, def, mv, down, next) {
  if (Math.random() * 100 >= mv.acc) { abSteps([['', function () { abFx(att, def, mv, false); }, 300], [att.name + "'s attack missed!", null, 900]]); next(); return; }
  const crit = Math.random() < (att.held === 'lens' ? AB_CRIT_LENS : AB_CRIT), r = abDamage(att, def, mv, crit);
  abSteps([['', function () {
    abFx(att, def, mv, true);
    def.hp = Math.max(0, def.hp - r.dmg);
    if (mv.recoil) att.hp = Math.max(1, att.hp - Math.max(1, Math.floor(r.dmg / 4)));
    abBerry(def);
    [def, att].forEach(function (m) { if (ab.party.indexOf(m) !== -1) state.advHp[m.id] = m.hp; });
    abHitSound(att, mv);
  }, 600]]);
  if (crit) abSteps([['A critical hit!', null, 800]]);
  if (r.eff > 1) abSteps([["It's super effective!", null, 900]]);
  else if (r.eff < 1) abSteps([["It's not very effective...", null, 900]]);
  abSteps([['', function () {
    if (def.hp <= 0) { down(); return; }
    if (mv.status === 'confusion' && !(def.conf > 0) && Math.random() < AB_STATUS_CHANCE) { def.conf = rnd(2, 5) + 1; abNow([[def.name + ' ' + AB_STATUS_TEXT.confusion, null, 1000]]); }
    else if (mv.status && mv.status !== 'confusion' && !def.status && Math.random() < AB_STATUS_CHANCE) { def.status = mv.status; def.sleep = rnd(2, 7); abNow([[def.name + ' ' + AB_STATUS_TEXT[mv.status], null, 1000]]); }
    next();
  }, 0]]);
}

// ----- the foe's turn (when you did not attack: a wrong answer, an item, a swap) -----
function abFoeTurn() { abStrike(abFoe(), abMe(), abPickMove(abFoe(), abMe()), abMeFainted, abEndRound); }
// The foe's move: a wild buddy picks any. A trainer's buddy usually takes the move that should do the most damage (power, accuracy, type luck and the same-type bonus) and sometimes tries another.
function abPickMove(foe, me) {
  if (ab.kind === 'wild' || Math.random() < 0.2) return pick(foe.moves);
  const score = function (m) { const rel = getTypeRelation(m.type, me.type); return m.power * (m.acc / 100) * (rel === 1 ? 2 : rel === -1 ? 0.5 : 1) * (m.type === foe.type ? 1.5 : 1); };
  const best = Math.max.apply(null, foe.moves.map(score));
  return pick(foe.moves.filter(function (m) { return score(m) === best; }));
}
// After both have acted: burn and poison hurt a little, then the menu (or a faint).
function abEndRound() {
  abSteps([['', function () {
    const list = [];
    const me = abMe();
    if (me.held === 'leftovers' && me.hp > 0 && me.hp < me.max) list.push([me.name + ' restored a little HP with its Leftovers.', function () { me.hp = Math.min(me.max, me.hp + Math.max(1, Math.floor(me.max / 16))); state.advHp[me.id] = me.hp; }, 900]);
    [abFoe(), abMe()].forEach(function (m) {
      if (m.hp > 0 && (m.status === 'burn' || m.status === 'poison')) list.push([m.name + ' is hurt by its ' + (m.status === 'burn' ? 'burn' : 'poison') + '!', function () { m.hp = Math.max(0, m.hp - Math.max(1, Math.floor(m.max / 8))); if (ab.party.indexOf(m) !== -1) state.advHp[m.id] = m.hp; }, 900]);
    });
    list.push(['', function () { if (abFoe().hp <= 0) abFoeFainted(); else if (abMe().hp <= 0) abMeFainted(); else abBackToMenu(); }, 0]);
    abNow(list);
  }, 0]]);
}
function abBackToMenu() { abSteps([abMenuStep()]); saveState(); }

// ----- a faint -----
function abFoeFainted() {
  const foe = abFoe(), trainer = ab.kind !== 'wild', part = ab.part.filter(function (id) { return ab.party.some(function (m) { return m.id === id && m.hp > 0; }); });
  abSteps([[foe.name + ' fainted!', null, 1000]]);
  const each = abXpYield(foe, trainer, part.length);
  part.forEach(function (id) {
    const mon = ab.party.find(function (m) { return m.id === id; });
    abSteps([[mon.name + ' gained ' + each + ' Exp. Points!', function () {
      abGainXp(mon, each);
      if (mon.leveled) abNow([[mon.name + ' grew to Lv' + mon.level + '!', function () { soundLevelUp(); }, 1200]].concat(mon.evolved ? [['What? ' + mon.evolved + ' evolved into ' + mon.name + '!', null, 1400]] : []).concat(mon.learned.map(function (n) { return [mon.name + ' learned ' + n + '!', null, 1200]; })));
    }, 1000]]);
  });
  abSteps([['', function () {
    abLearnThen(function () {
      if (ab.i + 1 < ab.foes.length) {
        ab.i += 1; abSeen(); ab.part = [abMe().id];
        abSteps([[ab.name + ' sent out ' + abFoe().name + '!', null, 1000], abMenuStep()]);
      } else if (ab.r + 1 < ab.rounds.length) abNextRound();
      else abWon();
    });
  }, 0]]);
}
// Experience for one of your buddies; a level-up raises its stats and keeps its HP gain, and may change its form.
function abGainXp(mon, amt) {
  const before = getBuddyLevel(mon.id), knownBefore = abKnownMoves(mon.element, before, mon.type).map(function (m) { return m.id; });
  addXpTo(mon.id, amt);
  const now = getBuddyLevel(mon.id);
  mon.leveled = now > before; mon.evolved = ''; mon.learned = []; mon.pending = mon.pending || [];
  if (!mon.leveled) return;
  const fresh = abMon(mon.id, now), oldName = mon.name, hp = Math.min(fresh.max, mon.hp + fresh.max - mon.max);
  fresh.moves = mon.moves;                                        // it keeps the moves it has, with their PP
  Object.assign(mon, fresh, { hp: hp, status: mon.status, sleep: mon.sleep, leveled: true, evolved: fresh.name !== oldName ? oldName : '', learned: [], pending: mon.pending });
  abKnownMoves(mon.element, now, mon.type).filter(function (m) { return knownBefore.indexOf(m.id) === -1; }).forEach(function (m) {
    if (mon.moves.length < 4) { mon.moves.push(Object.assign({}, m, { left: m.pp })); mon.learned.push(m.name); } else mon.pending.push(m);     // with four moves it asks which to forget
  });
  state.advMoves[mon.id] = mon.moves.map(function (m) { return m.id; });
  state.advHp[mon.id] = mon.hp;
}
// Moves a full buddy could learn: ask which move to forget, one question at a time, then go on.
function abLearnThen(next) {
  const mon = ab.party.find(function (m) { return m.pending && m.pending.length; });
  if (!mon) { next(); return; }
  ab.learn = { mon: mon, move: mon.pending.shift(), next: next };
  ab.phase = 'learn';
  document.getElementById('ab-text').innerText = mon.name + ' wants to learn ' + ab.learn.move.name + ', but it knows four moves. Forget one?';
  abRender();
}
function abLearnChoose(i) {
  const L = ab.learn;
  if (!L || ab.phase !== 'learn') return;
  ab.phase = 'busy'; ab.learn = null;
  if (i >= 0) {
    const old = L.mon.moves[i].name;
    L.mon.moves[i] = Object.assign({}, L.move, { left: L.move.pp });
    state.advMoves[L.mon.id] = L.mon.moves.map(function (m) { return m.id; });
    saveState();
    abSteps([['1, 2 and... Poof! ' + L.mon.name + ' forgot ' + old + ' and learned ' + L.move.name + '!', null, 1500]]);
  } else abSteps([[L.mon.name + ' did not learn ' + L.move.name + '.', null, 1000]]);
  abSteps([['', function () { abLearnThen(L.next); }, 0]]);
}
function abMeFainted() {
  const me = abMe();
  abSteps([[me.name + ' fainted!', function () { state.advHp[me.id] = 0; soundBuddyFaint(); }, 1200]]);
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
  abSteps([[forced ? '' : 'Come back, ' + old.name + '!', null, forced ? 0 : 700], ['Go! ' + mon.name + '!', function () { old.conf = 0; ab.cur = i; if (ab.part.indexOf(mon.id) === -1) ab.part.push(mon.id); }, 800]]);
  if (forced) abBackToMenu(); else abFoeTurn();
}

// ----- the pack -----
// The other supplies of the pack: a Super Potion heals more, a Full Heal cures a status, a Revive wakes the first resting buddy with half its HP.
function abUseItem(kind) {
  const me = abMe(), n = state.items[kind] || 0;
  if (n < 1 || ab.phase !== 'pack') return;
  if (kind === 'superpotion' && me.hp >= me.max && !me.status) return;
  if (kind === 'fullheal' && !me.status && !(me.conf > 0)) return;
  const down = ab.party.find(function (x) { return x.hp <= 0; });
  if (kind === 'revive' && !down) return;
  state.items[kind] = n - 1; if (!state.items[kind]) delete state.items[kind];
  ab.phase = 'busy';
  if (kind === 'revive') abSteps([['You used a Revive!', function () { down.hp = Math.max(1, Math.floor(down.max / 2)); state.advHp[down.id] = down.hp; soundLevelUp(); }, 900], [down.name + ' is back on its feet!', null, 900]]);
  else if (kind === 'fullheal') abSteps([['You used a Full Heal!', function () { me.status = ''; me.conf = 0; soundLevelUp(); }, 900], [me.name + ' feels fine again.', null, 900]]);
  else { const heal = Math.min(ECON.overworld.superPotionHeal, me.max - me.hp); abSteps([['You used a Super Potion!', function () { me.hp += heal; me.status = ''; me.conf = 0; state.advHp[me.id] = me.hp; soundLevelUp(); }, 900], [me.name + ' got back ' + heal + ' HP.', null, 900]]); }
  abFoeTurn();
}
function abPotion() {
  const me = abMe();
  if (state.potions < 1 || (me.hp >= me.max && !me.status)) return;
  state.potions -= 1; ab.phase = 'busy';
  const heal = Math.min(ECON.overworld.potionHeal, me.max - me.hp);
  abSteps([['You used a Potion!', function () { me.hp += heal; me.status = ''; me.conf = 0; state.advHp[me.id] = me.hp; soundLevelUp(); }, 900], [me.name + ' got back ' + heal + ' HP.', null, 900]]);
  abFoeTurn();
}
function abThrowNet() {
  if (ab.kind !== 'wild' || state.nets < 1) return;
  const foe = abFoe(), chance = abCatchChance(foe), got = Math.random() < chance;
  state.nets -= 1; ab.phase = 'busy';
  abSteps([['You threw a Catch Net!', null, 1000]]);
  const shakes = got ? 3 : Math.min(2, abShakes(abCatchA(foe)));
  for (let k = 0; k < shakes; k++) abSteps([['...', function () { soundCatchWobble(k); }, 700]]);
  if (!got) { abSteps([['Oh no! ' + foe.name + ' broke free!', null, 1100]]); abFoeTurn(); return; }
  abSteps([['Gotcha! ' + foe.name + ' was caught!', function () { ab.caught = true; soundCatchSuccess(); abKeepCaught(foe); }, 1300], ['', function () { abFinish('caught'); }, 0]]);
}
// The caught buddy joins you (or becomes a spare if you already own one). The same rules as a catch on the Practice screen.
function abKeepCaught(foe) {
  const sp = getSpecies(foe.id);
  if (foe.shiny) state.shinies[sp.id] = 1;
  if (sp.id === legendOfWeek().id) legendState().caught = true;
  if (getOwnedIds().indexOf(sp.id) !== -1) { state.spares[sp.id] = Math.min(99, (state.spares[sp.id] || 0) + 1); toast('A spare ' + sp.name + '! Sell it in the buddy hub.'); }
  else { grantBuddy(sp.id); (isStoreBuddy(sp) ? state.unlockedPets : state.unlockedSecrets).push(sp.id); toast(sp.name + ' joined your collection!'); }
  saveState();
}
function abRun() {
  if (ab.kind !== 'wild') { ab.phase = 'busy'; abSteps([["No! There's no running from a trainer battle!", null, 1200], abMenuStep()]); return; }
  ab.phase = 'busy';
  ab.runs = (ab.runs || 0) + 1;                                           // Gold: the escape chance grows with your Speed over the foe's, and with every try
  const f = Math.floor(abMe().spd * 32 / Math.max(1, Math.floor(abFoe().spd / 4) % 256)) + 30 * ab.runs;
  if (f <= 255 && Math.floor(Math.random() * 256) >= f) { abSteps([["Can't escape!", null, 900]]); abFoeTurn(); return; }
  abSteps([['Got away safely!', function () { soundEscape(); }, 900], ['', function () { abFinish('run'); }, 0]]);
}

// ----- the end -----
// Gold's prize money: a trainer pays its class base x the level of its last buddy (a leader, the Elite Four, the Champion and the Master pay the big base); wild buddies pay nothing.
function abPrize(round) {
  const base = round.base || (round.kind === 'leader' ? ECON.money.leaderBase : ECON.money.trainerBase), last = round.foes[round.foes.length - 1];
  return base * last.level;
}
function abRoundWon() {
  const round = ab.rounds[ab.r], prize = ab.kind === 'wild' ? 0 : abPrize({ kind: ab.kind, base: round.base, foes: ab.foes });
  if (round.bossIdx !== undefined) ab.after.push(function () { abBossBeaten(round.bossIdx, round.bossLevel); });
  return [[ab.kind === 'wild' ? '' : 'You defeated ' + ab.name + '!', function () { if (prize) grantGems(prize, ab.name + ' paid you ' + prize + ' gems!', false); }, ab.kind === 'wild' ? 0 : 1300]];
}
// A boss or gym leader beaten: the Dex book, an Alpha win toward its buddy, a chance at a rare buddy. Run once the battle screen is gone (their windows open above the map).
function abBossBeaten(idx, level) {
  const form = getBossFormIndex(level);
  markBossWin(idx, form);
  state.monstersDefeated += 1;
  checkBossBuddy(idx, form);
  checkForSecretLootDrop();
  saveState();
}
function abNextRound() {
  abSteps(abRoundWon());
  abSteps([['', function () { ab.r += 1; abLoadRound(); abSteps(abIntro()); abSteps([abMenuStep()]); }, 0]]);
}
function abWon() {
  abSteps(abRoundWon());
  abSteps([['', function () { abFinish('win'); }, 0]]);
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
    a.after.forEach(function (fn) { fn(); });
    if (result === 'lose') {
      state.advHp = {};
      state.gems = Math.floor(state.gems * (1 - ECON.overworld.blackoutShare));                  // Gold: you lose half your money
      o.map = o.center.map; o.x = o.center.x; o.y = o.center.y; o.face = 'down'; owTrail = null;
    }
    showAdventureWindow();
    if (result === 'lose') openTalk({ name: 'Buddy Center', art: worldSprite('t-center-sign'), lines: ['Oh no, you blacked out! You dropped half your gems.', 'Your buddies were taken to the Buddy Center and feel great again. Ready to try again?'] });
    else if (result === 'win' && a.onWin) a.onWin();
    else if (result === 'win' && a.npc) {
      if (o.beat.indexOf(a.npc.id) === -1) o.beat.push(a.npc.id);
      if (a.npc.story) owStoryReward(a.npc.story);
      saveState();
      owTrainerTalk(a.npc);
    }
  });
}
