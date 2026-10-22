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
  document.querySelectorAll('#ab-modal .ab-net').forEach(function (b) { b.remove(); });                    // nothing of the last catch stays on the field
  ['ab-foe-icon', 'ab-me-icon'].forEach(function (id) { const e = document.getElementById(id); if (e) e.classList.remove('ab-sucked', 'ab-burst'); });
  const party = getTeam().map(abPartyMon);
  const lead = party.findIndex(function (m) { return m.id === state.activePet && m.hp > 0; });          // the lead goes first, as the first slot does in Gold; if it is resting, the first one that can fight
  const first = lead !== -1 ? lead : party.findIndex(function (m) { return m.hp > 0; });
  if (first === -1) { toast('Your buddies are too tired. Rest at a Buddy Center first!'); return false; }
  const rounds = opts.rounds || [{ kind: opts.kind, name: opts.name || '', npc: opts.npc || null, foes: opts.foes }];
  ab = { fished: !!opts.fished, safari: opts.safari || null, tower: opts.tower || null, rematch: !!opts.rematch, contest: !!opts.contest, introMe: true, introFoe: false, after: [], rounds: rounds, r: 0, gymWeather: opts.gymWeather || '', onWin: opts.onWin || null, party: party, cur: first, queue: [], busy: false, phase: 'busy', q: null, forced: false, text: '' };
  abLoadRound();
  hideModal('overworld-modal');
  showModal('ab-modal', function () {
    abWipe();
    const intro = abIntro();
    abRender();
    abSteps(intro);
    abSteps([['Go! ' + abMe().name + '!', function () { ab.introMe = false; abRender(); soundBuddyCry(abMe().id); }, 800], abMenuStep()]);
  });
  return true;
}
// The start of a fight, as in Gold: the screen is wiped in from black bars (wild) or from the middle out (trainers). Reduced motion skips it.
function abWipe() {
  const c = document.querySelector('#ab-modal .ab-content');
  if (!c || motionReduced()) return;
  c.classList.remove('ab-wipe-wild', 'ab-wipe-trainer'); void c.offsetWidth;
  c.classList.add(ab.kind === 'wild' ? 'ab-wipe-wild' : 'ab-wipe-trainer');
}
function abLoadRound() {
  ab.party.forEach(function (m) { m.stg = {}; });                       // stat stages last one fight round
  const r = ab.rounds[ab.r];
  ab.kind = r.kind; ab.name = r.name; ab.npc = r.npc || null;
  ab.foes = r.foes.map(abFoeMon);
  ab.i = 0; ab.part = [abMe().id];
  if (ab.gymWeather) ab.weather = { k: ab.gymWeather, n: 5 };                        // a gym's own sky: it comes back with every round
  abSeen();
}
function abSeen() { const f = abFoe(); if (f.id) markDexSeen(f.id); }
// Gold shows the people first: you from behind, and the trainer in front of the foe's buddy until it is sent out.
function abIntro() {
  if (ab.gymWeather && ab.kind !== 'wild') return abGymSky().concat(abIntroSteps());
  return abIntroSteps();
}
function abGymSky() { return [[ab.gymWeather === 'rain' ? 'Rain falls inside the gym!' : 'The gym is blazing hot!', null, 1000]]; }
function abIntroSteps() {
  if (ab.kind === 'wild') return [['A wild ' + abFoe().name + ' appeared!', function () { soundBuddyCry(abFoe().id); }, 1100]];
  ab.introFoe = true;
  return [[ab.name + ' wants to battle!', function () { abRender(); }, 1300], [ab.name + ' sent out ' + abFoe().name + '!', function () { ab.introFoe = false; abRender(); soundBuddyCry(abFoe().id); }, 1000]];
}
// A look for a trainer with no map person (a gym trainer): fixed by the name.
function abTrainerLook() {
  if (ab.npc && ab.npc.look) return ab.npc.look;
  let h = 7; for (let i = 0; i < ab.name.length; i++) h = (h * 31 + ab.name.charCodeAt(i)) % 100003;
  return { skin: h % HERO_SKINS.length, hair: (h >> 3) % HERO_HAIRS.length, outfit: (h >> 5) % HERO_OUTFITS.length, style: (h >> 7) % HERO_STYLES.length };
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
  document.getElementById('ab-foe-lv').innerText = 'Lv' + f.level + abGenderTag(f) + (f.status ? ' ' + AB_STATUS_TAG[f.status] : '') + (f.conf > 0 ? ' CNF' : '');
  const fb = document.getElementById('ab-foe-hp');
  fb.style.width = Math.round(f.hp / f.max * 100) + '%'; fb.className = abHpClass(f);
  document.getElementById('ab-me-name').innerText = m.name;
  document.getElementById('ab-me-lv').innerText = 'Lv' + m.level + abGenderTag(m) + (m.status ? ' ' + AB_STATUS_TAG[m.status] : '') + (m.conf > 0 ? ' CNF' : '');
  const mb = document.getElementById('ab-me-hp');
  mb.style.width = Math.round(m.hp / m.max * 100) + '%'; mb.className = abHpClass(m);
  document.getElementById('ab-me-num').innerText = m.hp + ' / ' + m.max;
  const lo = xpForLevel(m.level), hi = xpForLevel(m.level + 1);
  document.getElementById('ab-me-xp').style.width = (m.level >= MAX_LEVEL ? 100 : clamp(Math.round((getBuddyXp(m.id) - lo) / Math.max(1, hi - lo) * 100), 0, 100)) + '%';
  setIconHtml(document.getElementById('ab-foe-icon'), ab.introFoe ? '<span class="ab-person">' + heroSprite(heroLookColors(abTrainerLook()), 'down', 0) + '</span>' : f.icon);
  setIconHtml(document.getElementById('ab-me-icon'), ab.introMe ? '<span class="ab-person">' + heroSprite(heroLookColors(), 'up', 0) + '</span>' : m.icon);
  document.getElementById('ab-foe-icon').classList.toggle('ab-gone', !ab.introFoe && (f.hp <= 0 || !!ab.caught));
  document.getElementById('ab-me-icon').classList.toggle('ab-gone', !ab.introMe && m.hp <= 0);
  document.querySelector('#ab-modal .ab-field').classList.toggle('ab-intro', !!(ab.introMe || ab.introFoe));
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
  if (ab.phase === 'menu' && ab.safari) {
    p.appendChild(abBtn('BALL <small>x' + state.safari.balls + '</small>', abSafariBall, '', state.safari.balls < 1));
    p.appendChild(abBtn('BAIT', abSafariBait));
    p.appendChild(abBtn('ROCK', abSafariRock));
    p.appendChild(abBtn('RUN', abRun));
  } else if (ab.phase === 'menu') {
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
    if (ab.contest) { p.appendChild(abBtn('Park Ball <small>x' + state.contest.balls + '</small>', abThrowPark, '', state.contest.balls < 1)); p.appendChild(abBtn('Back', function () { ab.phase = 'menu'; abRender(); }, 'ab-back')); return; }
    p.appendChild(abBtn('Catch Net <small>x' + state.nets + '</small>', function () { abThrowNet('net'); }, '', !wild || state.nets < 1));
    p.appendChild(abBtn('Potion <small>x' + state.potions + '</small>', abPotion, '', state.potions < 1 || (m.hp >= m.max && !m.status)));
    Object.keys(AB_CURES).forEach(function (k) { if (state.items[k]) p.appendChild(abBtn(AB_CURES[k][1] + ' <small>x' + state.items[k] + '</small>', function () { abUseItem(k); }, '', m.status !== AB_CURES[k][0])); });
    const carry = [['fullrestore', 'Full Restore', function () { return m.hp >= m.max && !m.status; }], ['maxpotion', 'Max Potion', function () { return m.hp >= m.max; }], ['hyperpotion', 'Hyper Potion', function () { return m.hp >= m.max && !m.status; }], ['superpotion', 'Super Potion', function () { return m.hp >= m.max && !m.status; }], ['fullheal', 'Full Heal', function () { return !m.status && !(m.conf > 0); }], ['revive', 'Revive', function () { return !ab.party.some(function (x) { return x.hp <= 0; }); }], ['maxrevive', 'Max Revive', function () { return !ab.party.some(function (x) { return x.hp <= 0; }); }],
      ['elixir', 'Elixir', function () { return m.moves.every(function (mv) { return mv.left >= mv.pp; }); }], ['xattack', 'X Attack', function () { return abStage(m, 'atk') >= 6; }], ['xdefend', 'X Defend', function () { return abStage(m, 'def') >= 6; }], ['xspeed', 'X Speed', function () { return abStage(m, 'spd') >= 6; }], ['ether', 'Ether', function () { return m.moves.every(function (mv) { return mv.left >= mv.pp; }); }]];
    carry.forEach(function (c) { if (state.items[c[0]]) p.appendChild(abBtn(c[1] + ' <small>x' + state.items[c[0]] + '</small>', function () { if (c[0] === 'ether') { ab.phase = 'ether'; abRender(); } else abUseItem(c[0]); }, '', c[2]())); });
    ['greatnet', 'ultranet', 'levelnet', 'fastnet', 'lurenet', 'friendnet'].forEach(function (k) { if (state.items[k]) p.appendChild(abBtn(ITEM_LOOKS[k][1] + ' <small>x' + state.items[k] + '</small>', function () { abThrowNet(k); }, '', !wild)); });
    p.appendChild(abBtn('Back', function () { ab.phase = 'menu'; abRender(); }, 'ab-back'));
  } else if (ab.phase === 'ether') {
    m.moves.forEach(function (mv, i) { p.appendChild(abBtn('<b>' + escHtml(mv.name) + '</b><small>PP ' + mv.left + '/' + mv.pp + '</small>', function () { abUseEther(i); }, 'ab-move t-' + mv.type, mv.left >= mv.pp)); });
    p.appendChild(abBtn('Back', function () { ab.phase = 'pack'; abRender(); }, 'ab-back'));
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
function abFight() { if (!ab.q || ab.q.done) ab.q = abQuestion();      // Back and Fight again keeps the same question until it is answered
   ab.phase = 'question'; abRender(); speakCurrentProblem(); }
function abAnswer(v) {
  if (ab.phase !== 'question') return;
  ab.q.done = true;
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
// Gold's obedience: a buddy you got in a trade will not always listen above a level set by your badges (10, plus 10 for each badge). Your own catches always do.
function abObeyLevel() { return Math.min(100, 10 + 10 * state.badges.length); }
function abDisobeys(m) { return !!state.fromTrade[m.id] && m.level > abObeyLevel() && Math.random() < 0.5; }
function abUseMove(i) {
  const me = abMe(), foe = abFoe(), forced = me.charging, mv = forced || (i < 0 ? AB_STRUGGLE : me.moves[i]);      // a move being charged is used next turn whatever is picked
  if (ab.phase !== 'moves' || (!forced && mv.left <= 0)) return;
  if (abDisobeys(me)) { ab.phase = 'busy'; abSteps([[me.name + ' is loafing around.', null, 1100]]); abFoeTurn(); return; }
  if (i >= 0 && !forced) { mv.left -= 1; abSavePp(me); }
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
function abSpeed(m) { return abStat(m, 'spd') * (m.status === 'paralysis' ? 0.25 : 1); }
function abSavePp(m) { state.advPp[m.id] = {}; m.moves.forEach(function (mv) { state.advPp[m.id][mv.id] = mv.left; }); }
// The sound of a hit: a plain thud for normal moves, the element's own sound for the others.
function abHitSound(att, mv) { if (mv.type === 'normal') soundTackle(); else soundElementHit(att.element); }
const AB_STATUS_TEXT = { burn: 'was burned!', poison: 'was poisoned!', paralysis: 'is paralyzed! It may not attack!', sleep: 'fell asleep!', freeze: 'was frozen solid!', confusion: 'became confused!' };
// One side attacks: asleep or paralyzed it may lose the turn, otherwise "X used Y!" and the hit. `down` runs if the target faints, `next` if not.
function abStrike(att, def, mv, down, next) {
  abSteps([['', function () {
    if (att.flinched) { att.flinched = false; abNow([[att.name + ' flinched!', null, 900], ['', next, 0]]); return; }
    att.moved = true;
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
  const play = function (el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(function () { el.classList.remove(cls); }, 900); };
  play(a, 'ab-lunge');
  if (!hit) return;
  // the attack: three bits fly from the attacker to the target, then an impact in the move's own style plays on the target
  const from = mine ? ['24%', '62%'] : ['72%', '28%'], to = mine ? ['72%', '28%'] : ['24%', '62%'];
  const fx = document.createElement('div');
  fx.className = 'ab-fx t-' + mv.type;
  fx.style.cssText = '--sx:' + from[0] + ';--sy:' + from[1] + ';--ex:' + to[0] + ';--ey:' + to[1];
  for (let k = 0; k < 3; k++) { const q = document.createElement('i'); q.className = 'ab-proj'; q.style.setProperty('--k', k); fx.appendChild(q); }
  const hitEl = document.createElement('b'); hitEl.className = 'ab-impact'; fx.appendChild(hitEl);
  field.appendChild(fx);
  setTimeout(function () { fx.remove(); }, 1100);
  play(d, 'ab-shake');
}
// A hard hit rattles the whole screen.
function abBump() { const f = document.querySelector('#ab-modal .ab-field'); if (!f) return; f.classList.remove('ab-bump'); void f.offsetWidth; f.classList.add('ab-bump'); setTimeout(function () { f.classList.remove('ab-bump'); }, 500); }
// A stat move: it moves one stat of the user or the target by stages, with Gold's messages when it cannot go further.
function abStatMove(att, def, mv, next) {
  const who = mv.fx.on === 'self' ? att : def, stat = mv.fx.stat;
  who.stg = who.stg || {};
  const now = abStage(who, stat), to = clamp(now + mv.fx.n, -6, 6);
  if (to === now) abSteps([[who.name + "'s " + AB_STAT_NAME[stat] + " won't go any " + (mv.fx.n > 0 ? 'higher' : 'lower') + '!', null, 1000]]);
  else {
    who.stg[stat] = to;
    abSteps([[who.name + "'s " + AB_STAT_NAME[stat] + ' ' + (mv.fx.n > 0 ? (mv.fx.n > 1 ? 'rose sharply!' : 'rose!') : (mv.fx.n < -1 ? 'fell sharply!' : 'fell!')), function () { abFx(att, def, mv, false); if (mv.fx.n > 0) soundLevelUp(); else soundWrong(); }, 1000]]);
  }
  next();
}
// One attack: accuracy, then damage with its messages and maybe a status. Used for both sides.
// Rain Dance and Sunny Day (five rounds: water or fire moves hit half as hard again, the other half as hard), Protect (the next attack this round fails; it gets less likely each time in a row) and Rest (heal fully, sleep two turns).
function abUtil(att, def, mv, next) {
  const u = mv.util;
  if (u === 'rain' || u === 'sun') abSteps([['', function () { ab.weather = { k: u, n: 5 }; soundLevelUp(); }, 500], [u === 'rain' ? 'It started to rain!' : 'The sunlight turned harsh!', null, 1000]]);
  else if (u === 'protect') { const ok = Math.random() < 1 / Math.pow(2, att.pn || 0); att.pn = (att.pn || 0) + 1; if (ok) att.protect = true; abSteps([[ok ? att.name + ' protected itself!' : 'But it failed!', null, 1000]]); }
  else if (u === 'rest') {
    if (att.hp >= att.max || att.status === 'sleep') abSteps([['But it failed!', null, 900]]);
    else abSteps([[att.name + ' went to sleep and became healthy!', function () { att.hp = att.max; att.status = 'sleep'; att.sleep = 2; att.conf = 0; if (ab.party.indexOf(att) !== -1) state.advHp[att.id] = att.hp; soundLevelUp(); }, 1300]]);
  }
  next();
}
// Gold's status-only moves (Thunder Wave, Sleep Powder, Toxic, Confuse Ray) and Leech Seed: they can miss, and fail on a buddy that already has the condition.
function abInflict(att, def, mv, next) {
  const miss = Math.random() * 100 >= mv.acc * AB_ACC_PCT[clamp(abStage(att, 'acc') - abStage(def, 'eva'), -6, 6) + 6] / 100;
  if (miss) { abSteps([[att.name + "'s attack missed!", null, 900]]); next(); return; }
  if (mv.seed) {
    if (def.seeded || def.element === 'nature') abSteps([['But it failed!', null, 900]]);
    else abSteps([[def.name + ' was seeded!', function () { def.seeded = true; }, 1000]]);
  } else if (mv.inflict === 'confusion') {
    if (def.conf > 0) abSteps([['But it failed!', null, 900]]);
    else abSteps([[def.name + ' ' + AB_STATUS_TEXT.confusion, function () { def.conf = rnd(2, 5) + 1; }, 1000]]);
  } else if (def.status) abSteps([['But it failed!', null, 900]]);
  else abSteps([[def.name + ' ' + AB_STATUS_TEXT[mv.inflict], function () { def.status = mv.inflict; def.sleep = rnd(2, 7); }, 1000]]);
  next();
}
function abHit(att, def, mv, down, next) {
  if (mv.util) { abUtil(att, def, mv, next); return; }
  if (mv.charge && !att.charging && !(mv.id === 'solarbeam' && ab.weather && ab.weather.k === 'sun')) { att.charging = mv; abSteps([[att.name + (mv.vanish ? (mv.id === 'dig' ? ' dug underground!' : ' flew up high!') : ' is gathering power!'), null, 1100]]); next(); return; }      // two-turn moves: charge now, hit next turn (Solar Beam skips the charge in the sun)
  att.charging = null;
  att.pn = 0;
  if (def.charging && def.charging.vanish) { abSteps([[def.name + ' is out of reach!', null, 900]]); next(); return; }
  if (def.protect && !(mv.fx && mv.fx.on === 'self')) { abSteps([[def.name + ' protected itself!', null, 1000]]); next(); return; }
  if (mv.fx) { abStatMove(att, def, mv, next); return; }
  if (mv.inflict || mv.seed) { abInflict(att, def, mv, next); return; }
  if (Math.random() * 100 >= mv.acc * AB_ACC_PCT[clamp(abStage(att, 'acc') - abStage(def, 'eva'), -6, 6) + 6] / 100 * (def.held === 'powder' ? 0.9 : 1)) { abSteps([['', function () { abFx(att, def, mv, false); }, 300], [att.name + "'s attack missed!", null, 900]]); next(); return; }
  const crit = Math.random() < (att.held === 'lens' ? AB_CRIT_LENS : AB_CRIT), r = abDamage(att, def, mv, crit);
  abSteps([['', function () {
    abFx(att, def, mv, true);
    def.hp = Math.max(0, def.hp - r.dmg);
    if (def.hp === 0 && def.held === 'focus' && Math.random() < 0.12) def.hp = 1;                       // a Focus Band: hangs on
    if (mv.recoil) att.hp = Math.max(1, att.hp - Math.max(1, Math.floor(r.dmg / 4)));
    abBerry(def);
    [def, att].forEach(function (m) { if (ab.party.indexOf(m) !== -1) state.advHp[m.id] = m.hp; });
    abHitSound(att, mv);
  }, 600]]);
  if (crit) abSteps([['A critical hit!', abBump, 800]]);
  if (r.eff > 1) abSteps([["It's super effective!", abBump, 900]]);
  else if (r.eff < 1) abSteps([["It's not very effective...", null, 900]]);
  abSteps([['', function () {
    if (def.hp <= 0) { down(); return; }
    const fl = mv.flinch || (att.held === 'kings' ? 10 : 0);                                       // a King's Rock: any hit may make a slower foe flinch
    if (fl && !def.moved && Math.random() * 100 < fl) def.flinched = true;
    if (mv.status === 'confusion' && !(def.conf > 0) && Math.random() < AB_STATUS_CHANCE) { def.conf = rnd(2, 5) + 1; abNow([[def.name + ' ' + AB_STATUS_TEXT.confusion, null, 1000]]); }
    else if (mv.status && mv.status !== 'confusion' && !def.status && Math.random() < AB_STATUS_CHANCE) { def.status = mv.status; def.sleep = rnd(2, 7); abNow([[def.name + ' ' + AB_STATUS_TEXT[mv.status], null, 1000]]); }
    next();
  }, 0]]);
}

// ----- the foe's turn (when you did not attack: a wrong answer, an item, a swap) -----
function abFoeTurn() { abStrike(abFoe(), abMe(), abPickMove(abFoe(), abMe()), abMeFainted, abEndRound); }
// The foe's move: a wild buddy picks any. A trainer's buddy usually takes the move that should do the most damage (power, accuracy, type luck and the same-type bonus) and sometimes tries another.
function abPickMove(foe, me) {
  if (foe.charging) return foe.charging;
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
    [abFoe(), abMe()].forEach(function (m) {
      const other = m === abMe() ? abFoe() : abMe();
      if (m.seeded && m.hp > 0 && other.hp > 0) list.push([m.name + "'s health is sapped by Leech Seed!", function () { const d = Math.max(1, Math.floor(m.max / 8)); m.hp = Math.max(0, m.hp - d); other.hp = Math.min(other.max, other.hp + d); [m, other].forEach(function (x) { if (ab.party.indexOf(x) !== -1) state.advHp[x.id] = x.hp; }); }, 900]);
    });
    ab.party.concat(ab.foes).forEach(function (m) { m.flinched = false; m.moved = false; });
    if (ab.weather) { ab.weather.n -= 1; if (ab.weather.n <= 0) { const k = ab.weather.k; list.push([k === 'rain' ? 'The rain stopped.' : 'The sunlight faded.', function () { ab.weather = null; }, 900]); } }
    ab.party.concat(ab.foes).forEach(function (m) { m.protect = false; });
    list.push(['', function () { if (abFoe().hp <= 0) abFoeFainted(); else if (abMe().hp <= 0) abMeFainted(); else abBackToMenu(); }, 0]);
    abNow(list);
  }, 0]]);
}
function abBackToMenu() { abSteps([abMenuStep()]); saveState(); }

// ----- a faint -----
function abFoeFainted() {
  const foe = abFoe(), trainer = ab.kind !== 'wild', part = ab.part.filter(function (id) { return ab.party.some(function (m) { return m.id === id && m.hp > 0; }); });
  abSteps([[foe.name + ' fainted!', null, 1000]]);
  const base = abXpYield(foe, trainer, part.length), sharers = ab.party.filter(function (m) { return m.held === 'share' && m.hp > 0 && part.indexOf(m.id) === -1; }).map(function (m) { return m.id; });      // an Exp. Share: the holder gets half as much without fighting
  part.concat(sharers).forEach(function (id) {
    const mon = ab.party.find(function (m) { return m.id === id; }), each = Math.floor((mon.held === 'egg' ? Math.floor(base * 3 / 2) : base) * (part.indexOf(id) === -1 ? 0.5 : 1) * (virusState(mon.id) === 'sick' ? ECON.virus.mult : 1));      // a Lucky Egg
    abSteps([[mon.name + ' gained ' + each + ' Exp. Points!', function () {
      abGainXp(mon, each);
      if (mon.leveled) abNow([[mon.name + ' grew to Lv' + mon.level + '!', function () { soundLevelUp(); }, 1200]].concat(mon.evolved ? [['What? ' + mon.evolved + ' evolved into ' + mon.name + '!', null, 1400]] : []).concat(mon.learned.map(function (n) { return [mon.name + ' learned ' + n + '!', null, 1200]; })));
    }, 1000]]);
  });
  abCatchVirus(part.map(function (id) { return ab.party.find(function (m) { return m.id === id; }); }), !trainer).forEach(function (t) { abSteps([[t, null, 1200]]); });
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
// Gold's Pokérus: 'sick' while within ECON.virus.days of the day it was caught, then 'cured' for good. Sick buddies earn extra Exp.; a win with a sick buddy beside others may spread it.
function virusState(id) {
  let v = state.virus[id];
  if (!v) return '';
  if (v !== 'cured' && dayNumber() - dayNumber(new Date(v + 'T12:00:00')) >= ECON.virus.days) state.virus[id] = v = 'cured';
  return v === 'cured' ? 'cured' : 'sick';
}
function abCatchVirus(part, wild) {
  const sick = part.some(function (m) { return virusState(m.id) === 'sick'; });
  return part.filter(function (m) { return !virusState(m.id) && (sick || (wild && Math.random() < ECON.virus.odds)); }).map(function (m) { state.virus[m.id] = dayKey(); return m.name + ' caught Pokerus!'; });
}
// Experience for one of your buddies; a level-up raises its stats and keeps its HP gain, and may change its form.
function abGainXp(mon, amt) {
  const before = getBuddyLevel(mon.id), knownBefore = abKnownMoves(mon.element, before, mon.type, mon.id).map(function (m) { return m.id; });
  addXpTo(mon.id, amt);
  const now = getBuddyLevel(mon.id);
  addHappy(mon.id, 3 + (now > before ? 5 : 0));
  mon.leveled = now > before; mon.evolved = ''; mon.learned = []; mon.pending = mon.pending || [];
  if (!mon.leveled) return;
  const fresh = abMon(mon.id, now), oldName = mon.sname || mon.name, hp = Math.min(fresh.max, mon.hp + fresh.max - mon.max);
  fresh.moves = mon.moves;                                        // it keeps the moves it has, with their PP
  Object.assign(mon, abBadgeBoost(fresh), { hp: hp, status: mon.status, sleep: mon.sleep, leveled: true, evolved: fresh.name !== oldName ? oldName : '', learned: [], pending: mon.pending });
  mon.sname = fresh.name; if (state.nicks[mon.id]) mon.name = state.nicks[mon.id];                  // a nickname stays through an evolution
  abKnownMoves(mon.element, now, mon.type, mon.id).filter(function (m) { return knownBefore.indexOf(m.id) === -1; }).forEach(function (m) {
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
  abSteps([[me.name + ' fainted!', function () { state.advHp[me.id] = 0; addHappy(me.id, -3); soundBuddyFaint(); }, 1200]]);
  abSteps([['', function () {
    if (ab.party.some(function (m) { return m.hp > 0; })) { ab.forced = true; ab.phase = 'team'; document.getElementById('ab-text').innerText = 'Choose your next buddy.'; abRender(); }
    else abLost();
  }, 0]]);
}
function abSwitch(i) {
  const mon = ab.party[i];
  if (ab.phase !== 'team' || mon.hp <= 0 || i === ab.cur) return;
  const forced = ab.forced, old = abMe(); old.charging = null; old.seeded = false;
  ab.phase = 'busy'; ab.forced = false;
  abSteps([[forced ? '' : 'Come back, ' + old.name + '!', null, forced ? 0 : 700], ['Go! ' + mon.name + '!', function () { old.conf = 0; old.stg = {}; ab.cur = i; if (ab.part.indexOf(mon.id) === -1) ab.part.push(mon.id); }, 800]]);
  if (forced) abBackToMenu(); else abSteps([['', abFoeTurn, 0]]);      // the foe strikes whoever came in, so it is worked out after the swap
}

// ----- the pack -----
// An Ether: 10 PP back on the move you choose.
function abUseEther(i) {
  const me = abMe(), mv = me.moves[i];
  if (!state.items.ether || ab.phase !== 'ether' || !mv || mv.left >= mv.pp) return;
  state.items.ether -= 1; if (!state.items.ether) delete state.items.ether;
  ab.phase = 'busy';
  abSteps([['You used an Ether!', function () { mv.left = Math.min(mv.pp, mv.left + 10); state.advPp[me.id] = state.advPp[me.id] || {}; state.advPp[me.id][mv.id] = mv.left; soundLevelUp(); }, 900], [mv.name + ' got 10 PP back.', null, 900]]);
  abFoeTurn();
}
// The other supplies of the pack: a Super Potion heals more, a Full Heal cures a status, a Revive wakes the first resting buddy with half its HP.
// The single-status cures (Gold's Antidote, Burn Heal, Ice Heal, Awakening and Parlyz Heal): item -> [the status it cures, its name].
const AB_CURES = { antidote: ['poison', 'Antidote'], burnheal: ['burn', 'Burn Heal'], iceheal: ['freeze', 'Ice Heal'], awakening: ['sleep', 'Awakening'], parlyzheal: ['paralysis', 'Parlyz Heal'] };
function abUseItem(kind) {
  const me = abMe(), n = state.items[kind] || 0;
  if (n < 1 || ab.phase !== 'pack') return;
  if ((kind === 'superpotion' || kind === 'hyperpotion' || kind === 'fullrestore') && me.hp >= me.max && !me.status) return;
  if (kind === 'maxpotion' && me.hp >= me.max) return;
  if (AB_CURES[kind] && me.status !== AB_CURES[kind][0]) return;
  if (kind === 'fullheal' && !me.status && !(me.conf > 0)) return;
  const down = ab.party.find(function (x) { return x.hp <= 0; });
  if ((kind === 'revive' || kind === 'maxrevive') && !down) return;
  if (kind === 'elixir' && me.moves.every(function (mv) { return mv.left >= mv.pp; })) return;
  const XS = { xattack: ['atk', 'Attack'], xdefend: ['def', 'Defense'], xspeed: ['spd', 'Speed'] }[kind];
  if (XS && abStage(me, XS[0]) >= 6) return;
  state.items[kind] = n - 1; if (!state.items[kind]) delete state.items[kind];
  ab.phase = 'busy';
  if (kind === 'elixir') abSteps([['You used an Elixir!', function () { me.moves.forEach(function (mv) { mv.left = Math.min(mv.pp, mv.left + 10); state.advPp[me.id] = state.advPp[me.id] || {}; state.advPp[me.id][mv.id] = mv.left; }); soundLevelUp(); }, 900], [me.name + "'s moves got 10 PP back.", null, 900]]);
  else if (XS) abSteps([['You used an ' + ITEM_LOOKS[kind][1] + '!', function () { me.stg = me.stg || {}; me.stg[XS[0]] = Math.min(6, abStage(me, XS[0]) + 1); soundLevelUp(); }, 900], [me.name + "'s " + XS[1] + ' rose!', null, 900]]);
  else if (kind === 'revive' || kind === 'maxrevive') abSteps([['You used a ' + ITEM_LOOKS[kind][1] + '!', function () { down.hp = kind === 'maxrevive' ? down.max : Math.max(1, Math.floor(down.max / 2)); state.advHp[down.id] = down.hp; soundLevelUp(); }, 900], [down.name + ' is back on its feet!', null, 900]]);
  else if (AB_CURES[kind]) abSteps([['You used ' + AB_CURES[kind][1] + '!', function () { me.status = ''; soundLevelUp(); }, 900], [me.name + ' is cured.', null, 900]]);
  else if (kind === 'fullheal') abSteps([['You used a Full Heal!', function () { me.status = ''; me.conf = 0; soundLevelUp(); }, 900], [me.name + ' feels fine again.', null, 900]]);
  else { const heal = Math.min({ hyperpotion: ECON.overworld.hyperPotionHeal, maxpotion: ECON.overworld.maxHeal, fullrestore: ECON.overworld.maxHeal }[kind] || ECON.overworld.superPotionHeal, me.max - me.hp); abSteps([['You used a ' + ITEM_LOOKS[kind][1] + '!', function () { me.hp += heal; if (kind !== 'maxpotion') { me.status = ''; me.conf = 0; } state.advHp[me.id] = me.hp; soundLevelUp(); }, 900], [me.name + ' got back ' + heal + ' HP.', null, 900]]); }
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
// A Park Ball in the Catching Contest: the same catch rule as a Catch Net, but the buddy only counts for the judge.
function abThrowPark() {
  if (!ab.contest || state.contest.balls < 1) return;
  const foe = abFoe(), got = Math.random() < abCatchChance(foe, 1);
  state.contest.balls -= 1; ab.phase = 'busy';
  abSteps([['You threw a Park Ball!', null, 1000]]);
  const shakes = got ? 3 : Math.min(2, abShakes(abCatchA(foe, 1)));
  for (let k = 0; k < shakes; k++) abSteps([['...', function () { soundCatchWobble(k); }, 700]]);
  if (!got) { abSteps([['Oh no! ' + foe.name + ' broke free!', null, 1100]]); abFoeTurn(); return; }
  abSteps([['Gotcha! ' + foe.name + ' was caught!', function () {
    ab.caught = true; soundCatchSuccess();
    const score = contestScore(foe);
    if (!state.contest.best || score > state.contest.best.score) state.contest.best = { name: foe.name, score: score };
    saveState();
  }, 1300], ['', function () { abFinish('caught'); }, 0]]);
}
// `kind`: 'net' (a Poke Ball), 'greatnet' or 'ultranet'; the better ones multiply the catch value (ECON.overworld.ballMult).
function abThrowNet(kind) {
  kind = kind || 'net';
  const have = kind === 'net' ? state.nets : (state.items[kind] || 0);
  if (ab.kind !== 'wild' || have < 1) return;
  const foe = abFoe(), ball = abNetMult(kind, foe), chance = abCatchChance(foe, ball), got = Math.random() < chance;
  if (kind === 'net') state.nets -= 1; else { state.items[kind] -= 1; if (!state.items[kind]) delete state.items[kind]; }
  ab.phase = 'busy';
  ab.lastNet = kind;
  abSteps([['You threw a ' + ITEM_LOOKS[kind][1] + '!', function () { abNetFx('toss', kind); }, 1300]]);
  const shakes = got ? 3 : Math.min(2, abShakes(abCatchA(foe, ball)));
  for (let k = 0; k < shakes; k++) abSteps([['...', function () { soundCatchWobble(k); abNetFx('wobble'); }, 700]]);
  if (!got) { abSteps([['Oh no! ' + foe.name + ' broke free!', function () { abNetFx('free'); }, 1100]]); abFoeTurn(); return; }
  abSteps([['Gotcha! ' + foe.name + ' was caught!', function () { ab.caught = true; soundCatchSuccess(); abKeepCaught(foe); }, 1300], ['', function () { abFinish('caught'); }, 0]]);
}
// The net's flight (Gold's ball): it arcs from you to the foe, the foe is drawn inside, the ball rocks once per shake, then it either clicks shut or the foe bursts out.
function abNetFx(step, kind) {
  const foeEl = document.getElementById('ab-foe-icon'); if (!foeEl) return;
  const field = foeEl.parentNode;
  if (step === 'toss') {
    const ball = document.createElement('div'); ball.className = 'ab-net k-' + kind; field.appendChild(ball); ab.netEl = ball;
    setTimeout(function () { foeEl.classList.add('ab-sucked'); }, 650);
  } else if (ab.netEl && step === 'wobble') { const b = ab.netEl; b.classList.remove('ab-rock'); void b.offsetWidth; b.classList.add('ab-rock'); }
  else if (ab.netEl && step === 'free') { ab.netEl.remove(); ab.netEl = null; foeEl.classList.remove('ab-sucked'); foeEl.classList.add('ab-burst'); setTimeout(function () { foeEl.classList.remove('ab-burst'); }, 700); }
}
// The caught buddy joins you (or becomes a spare if you already own one). The same rules as a catch on the Practice screen.
function abKeepCaught(foe) {
  const sp = getSpecies(foe.id);
  if (foe.shiny) state.shinies[sp.id] = 1;
  if (sp.id === legendOfWeek().id) legendState().caught = true; else if (legendTrio().some(function (x) { return x.id === sp.id; })) { const l = legendState(); if (l.ids.indexOf(sp.id) === -1) l.ids.push(sp.id); }
  if (getOwnedIds().indexOf(sp.id) !== -1) { state.spares[sp.id] = Math.min(99, (state.spares[sp.id] || 0) + 1); toast('A spare ' + sp.name + '! A Trader may want it.'); }
  else { if (foe.g) state.genders[sp.id] = foe.g; grantBuddy(sp.id); state.buddyXp[sp.id] = xpForLevel(foe.level); if (ab.lastNet === 'friendnet') addHappy(sp.id, 200 - happyOf(sp.id));      // Gold: a caught buddy keeps the level it had in the fight
    (isStoreBuddy(sp) ? state.unlockedPets : state.unlockedSecrets).push(sp.id); toast(sp.name + ' joined your collection!'); }
  saveState();
}
function abRun() {
  if (ab.kind !== 'wild') { ab.phase = 'busy'; abSteps([["No! There's no running from a trainer battle!", null, 1200], abMenuStep()]); return; }
  ab.phase = 'busy';
  ab.runs = (ab.runs || 0) + 1;                                           // Gold: the escape chance grows with your Speed over the foe's, and with every try
  if (abMe().held === 'smoke') { abSteps([['Got away safely!', function () { soundEscape(); }, 900], ['', function () { abFinish('run'); }, 0]]); return; }      // a Smoke Ball
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
  const round = ab.rounds[ab.r], prize = ab.kind === 'wild' ? 0 : abPrize({ kind: ab.kind, base: round.base, foes: ab.foes }) * (ab.party.some(function (m) { return m.held === 'amulet'; }) ? 2 : 1);
  if (round.bossIdx !== undefined) ab.after.push(function () { abBossBeaten(round.bossIdx, round.bossLevel); });
  return [[ab.kind === 'wild' ? '' : 'You defeated ' + ab.name + '!', function () { if (prize) { const kept = momKeeps(prize); grantGems(prize - kept, ab.name + ' paid you ' + prize + ' gems!' + (kept ? ' Mom saved ' + kept + '.' : ''), false); } }, ab.kind === 'wild' ? 0 : 1300]];
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
    if (a.tower) { state.advHp = a.tower.hp; state.advPp = a.tower.pp; if (result === 'lose') state.tower.best = Math.max(state.tower.best, a.r); }          // the Tower puts HP and PP back, and a defeat there costs nothing
    else if (result === 'lose') {
      state.advHp = {};
      state.gems = Math.floor(state.gems * (1 - ECON.overworld.blackoutShare));                  // Gold: you lose half your money
      o.map = o.center.map; o.x = o.center.x; o.y = o.center.y; o.face = 'down'; owTrail = null;
    }
    showAdventureWindow();
    if (a.safari && state.safari.active && state.safari.balls < 1) { safariEnd('You are out of Safari Balls. Please come back to the gate.'); }
    if (result === 'lose' && !a.tower) openTalk({ name: 'Buddy Center', art: worldSprite('t-center-sign'), lines: ['Oh no, you blacked out! You dropped half your gems.', 'Your buddies were taken to the Buddy Center and feel great again. Ready to try again?'] });
    else if (result === 'win' && a.onWin) a.onWin();
    else if (result === 'win' && a.npc) {
      if (a.rematch && state.phone.ready === a.npc.id) state.phone.ready = '';                         // the rematch is done for today
      if (o.beat.indexOf(a.npc.id) === -1) o.beat.push(a.npc.id);
      if (a.npc.story) owStoryReward(a.npc.story);
      saveState();
      owTrainerTalk(a.npc);
    }
  });
}
