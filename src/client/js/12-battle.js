// =====================================================================
//  BATTLE
// =====================================================================
// ----- feedback copy and juice -----
const PRAISE = {
  base: ['Incredible!', 'Super Sharp!', 'Crushing It!', 'Bullseye!', 'Math Wizard!', 'Nailed it!', 'Brilliant!'],
  hot: ['Unstoppable!', 'On fire!', 'You cannot be stopped!', 'Legendary!', 'Math Machine!'],
  fast: ['Lightning quick!', 'Whoa, so fast!', 'Speedy genius!']
};
function praiseFor(streak, fast) {
  return pick(streak >= 5 ? PRAISE.hot : fast ? PRAISE.fast : PRAISE.base);
}
// A wrong answer shows what the player typed next to the right one, then a kind nudge. Never a scolding.
const MISS_NUDGES = ['Next one is yours! 💪', 'Mistakes help brains grow! 🌱', 'You are getting closer! ⭐', 'Shake it off, you got this! 😄'];
function missLine(said, answer) {
  return 'You said ' + fmtAns(said) + ' — the answer is ' + fmtAns(answer) + '. ' + pick(MISS_NUDGES);
}
// What a boss "says" when it takes a hit, by element, so bosses feel different from each other.
const BOSS_HIT_WORD = { fire: '🔥 SIZZLE!', water: '💦 SPLASH!', nature: '🌿 THWACK!', electric: '⚡ ZAP!', dark: '🌑 THUD!', magic: '✨ POOF!' };
// A short screen shake for big moments (skipped when motion is reduced).
function screenShake(strong) {
  if (motionReduced()) return;
  const el = document.getElementById('battle-header-arena');
  if (!el) return;
  const cls = strong ? 'screen-shake-big' : 'screen-shake';
  el.classList.remove('screen-shake', 'screen-shake-big');
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(function () { el.classList.remove(cls); }, strong ? 520 : 320);
}

function triggerMonsterDamage(extraDamage, weakHit, fast, dmgMult) {
  const weakened = hasStatus('weak');               // read now: the status may run out at the end of this answer
  extraDamage = extraDamage || 0;
  const petIconWrapper = document.getElementById('fighter-icon-wrapper');
  const monsterIcon = document.getElementById('monster-icon');
  const petFx = document.getElementById('pet-attack-fx');
  const pet = getActivePetDisplay();
  const boss = getBossInfo();

  petIconWrapper.classList.remove('tackle-right');
  void petIconWrapper.offsetWidth;
  petIconWrapper.classList.add('tackle-right');
  soundTackle();

  setTimeout(function () {
    petFx.classList.remove('slash-right');
    void petFx.offsetWidth;
    petFx.classList.add('slash-right');
  }, 100);

  setTimeout(function () {
    monsterIcon.classList.remove('hurt-flash');
    void monsterIcon.offsetWidth;
    monsterIcon.classList.add('hurt-flash');
    soundHitSlash();

    let damage = getPetAttack(pet.id) + extraDamage;
    const rel = getTypeRelation(battleElement(pet), boss.element);
    if (slaysBuddy(boss, pet)) {
      damage = Math.max(1, Math.floor(damage * ECON.boss.slayer.yourDamage));
      showPopup('☠️ ' + boss.name.replace(/^👑 /, '') + ' RESISTS YOU!');
    } else if (battleElement(pet) === 'shadow') {
      damage = Math.ceil(damage * 1.25);
    } else if (rel === 1) {
      damage = Math.ceil(damage * 1.5) + (activeHolds('charm') ? 1 : 0);
      showPopup('SUPER EFFECTIVE! 💥');
    } else if (rel === -1) {
      damage = Math.max(1, Math.floor(damage * 0.5));
      showPopup('NOT VERY EFFECTIVE... 💧');
    }

    if (weakHit) {
      damage = Math.max(damage + 1, Math.ceil(damage * 1.5));
      showPopup('🎯 WEAK POINT! 💥');
    }
    if (dmgMult && dmgMult < 1) damage = Math.max(1, Math.floor(damage * dmgMult));
    if (weakened) damage = Math.max(1, damage - 1);
    monsterCurrentHp -= damage;
    if (monsterCurrentHp > 0) bossReact(fast ? 'fast' : (weakHit || rel === 1) ? 'wow' : monsterCurrentHp <= boss.maxHp / 4 ? 'angry' : 'flinch');

    if (monsterCurrentHp <= 0 && state.raid && state.raid.phase < state.raid.total - 1) {
      state.raid.phase += 1;
      monsterCurrentHp = getBossMaxHp();
      soundSuperMove();
      launchConfetti('boss');
      screenShake(true);
      showPopup('⚠️ PHASE ' + (state.raid.phase + 1) + '!');
      toast('👑 The raid boss changes! Find its new weak point!');
      updateStatsUI();
      saveState();
    } else if (monsterCurrentHp <= 0) {
      const wild = !!boss.wild, wildId = state.wild.id;
      soundMonsterDefeated();
      launchConfetti(wild ? 'streak' : 'boss');
      screenShake(!wild);
      const leaderFight = !wild && inGymLeaderFight();
      if (wild) { if (!state.gym) state.wild.since += 1; }       // gym battles do not count toward the next boss
      else {
        questEvent('boss');
        if (bossMistakes === 0) questEvent('flawless');
        state.monstersDefeated += 1;
        markBossWin(currentMonsterIndex, boss.form);
        checkBossBuddy(currentMonsterIndex, boss.form);
      }
      buddyReact('win');
      let gemBonus = wild ? ECON.wild.gemBase + Math.floor(boss.level / ECON.wild.gemPerLevels)
        : ECON.boss.gemBase + Math.floor(boss.level / ECON.boss.gemPerLevels) + (boss.swapped ? ECON.boss.swap.bonusGems : 0);
      if (boss.trainer) gemBonus += ECON.map.trainerGems;
      if (boss.shiny) gemBonus += ECON.daily.gems;
      const wasRaid = state.raid ? state.raid.chapter : -1;
      if (wasRaid >= 0) { gemBonus += ECON.raid.bonusGems; state.raidsCleared += 1; state.raid = null; }
      checkEarnedGear();
      state.gems += gemBonus;

      // Pokémon-style: more XP for beating higher-level bosses
      const ratio = clamp(boss.level / getBuddyLevel(state.activePet), 0.5, 2);
      awardBuddyXp(Math.round(wild ? ECON.wild.xpBase + boss.level * ratio : 20 + boss.level * 2 * ratio));

      const hadCasualties = !wild && state.faintedPets.length > 0;      // fainted buddies come back only after a boss
      if (hadCasualties) {
        state.faintedPets = [];
        showPopup('✨ ALL BUDDIES REVIVED!');
      }

      const gymWin = state.gym ? advanceGym(leaderFight) : null;
      if (wild) { if (!boss.trainer) rollCatch(wildId, bossMistakes === 0); } else checkForSecretLootDrop(hadCasualties);
      showPopup(`VICTORY! +${gemBonus} 💎`);

      const shouldTriggerVault = !wild && (state.monstersDefeated % 2 === 0);
      setTimeout(function () {
        pickNextFoe();
        setBossTaunt();
        updateStatsUI();
        saveState();
        if (wasRaid >= 0) enqueueModal(function () { showRaidStory('outro', wasRaid); });
        const nb = getBossInfo();
        const lead = nb.trainer ? '🏟️ ' : nb.wild ? '' : state.gym ? '🏟️ GYM LEADER! ' : '⚠️ BOSS TIME! ';
        toast(lead + (nb.trainer ? `${nb.name} (Lv ${nb.level}) wants to battle!` : `A wild Lv ${nb.level} ${nb.name} appeared!`) + (nb.slays && nb.slays === state.activePet ? ' ☠️ Strong against ' + slayerTarget(nb) + '!' : ''));
        if (gymWin) enqueueModal(function () { showBadgeStory(gymWin); });
        if (shouldTriggerVault) enqueueModal(startGoldenVault);
        if (state.raid && !state.raid.introSeen) { const ch = state.raid.chapter; enqueueModal(function () { showRaidStory('intro', ch); }); }
      }, 650);
    } else if (!maybeBackupBoss(boss, pet)) {
      updateBattleUI();
    }
  }, 200);
}

function triggerSuperMove() {
  if (ultimateCharge < 3 || inputLocked) return;
  ultimateCharge = 0;
  questEvent('ult');
  soundSuperMove();
  launchConfetti('streak');
  screenShake(true);
  const pet = getActivePetDisplay();
  showPopup(`⚡ ${pet.superMove}!`);
  inputLocked = true;
  triggerMonsterDamage(2 + Math.floor(pet.level / 10));
  updateBattleUI();
  setTimeout(function () { inputLocked = false; }, 700);
}

function triggerBuddyDamage() {
  const boss = getBossInfo();
  const pet = getActivePetDisplay();
  const id = pet.id;
  const burned = hasStatus('burn');
  const shellBlock = holds(id, 'shell') && !heldUsed.shell;      // Hard Shell: the first hit of each battle                // read now: the status may run out at the end of this answer
  if (guardUp || shellBlock) {                     // Guard (or a Hard Shell) blocks this hit completely (the combo still ends)
    if (guardUp) guardUp = false; else heldUsed.shell = true;
    state.streak = 0;
    soundShieldBreak();
    showPopup('🛡️ BLOCKED! NO DAMAGE');
    document.getElementById('feedback-msg').innerText = 'Guard held! ' + missLine(parseFloat(userInput), currentProblem.answer);
    updateStatsUI();
    saveState();
    scheduleNextProblem(1300, 'Nice guard — try again!');
    return;
  }
  const monsterIcon = document.getElementById('monster-icon');
  const petIconWrapper = document.getElementById('fighter-icon-wrapper');
  const monsterFx = document.getElementById('monster-attack-fx');

  monsterIcon.classList.remove('tackle-left');
  void monsterIcon.offsetWidth;
  monsterIcon.classList.add('tackle-left');
  soundTackle();

  setTimeout(function () {
    monsterFx.classList.remove('slash-left');
    void monsterFx.offsetWidth;
    monsterFx.classList.add('slash-left');
  }, 100);

  setTimeout(function () {
    petIconWrapper.classList.remove('hurt-flash');
    void petIconWrapper.offsetWidth;
    petIconWrapper.classList.add('hurt-flash');
    soundHitSlash();
    screenShake(false);
    bossReact('laugh');

    let incoming = boss.atk + (burned ? 1 : 0);
    const rel = getTypeRelation(boss.element, battleElement(pet));
    if (rel === 1) incoming += 1;
    else if (rel === -1) incoming = Math.max(1, incoming - 1);
    // no single hit may take more than 40% of the buddy's max HP (a fair fight, not a one-shot)
    const slayer = slaysBuddy(boss, pet);
    if (slayer) incoming += ECON.boss.slayer.extraDamage;
    incoming = Math.max(1, Math.min(incoming, Math.ceil(getPetMaxHp(id) * (slayer ? ECON.boss.slayer.maxHpShare : 0.4))));
    if (roleOf(pet).name === 'Tank') incoming = Math.max(1, incoming - 1);
    showPopup(slayer ? `☠️ STRONG AGAINST ${pet.baseName.toUpperCase()}! -${incoming} HP 💔` : rel === 1 ? `SUPER EFFECTIVE ON BUDDY! -${incoming} HP 💔` : `OUCH! BUDDY HIT -${incoming} HP 💔`);

    setPetHp(id, getPetHp(id) - incoming);
    state.streak = 0;
    if (getPetHp(id) > 0) maybeInflictStatus(boss);
    if (getPetHp(id) > 0 && holds(id, 'berry') && !heldUsed.berry && getPetHp(id) <= getPetMaxHp(id) / 3) {
      heldUsed.berry = true;
      setPetHp(id, Math.min(getPetMaxHp(id), getPetHp(id) + ECON.held.berryHeal));
      toast('🫐 ' + pet.baseName + ' ate its Oran Berry!');
    }
    ultimateCharge = 0;

    if (getPetHp(id) > 0) {
      updateStatsUI();
      scheduleNextProblem(1100, 'Give this one your best shot!');
      return;
    }

    // Buddy fainted
    soundBuddyFaint();
    toast('💤 ' + pet.name + ' is sleepy and needs a rest');
    if (state.faintedPets.indexOf(id) === -1) state.faintedPets.push(id);

    const alive = getOwnedIds().filter(function (pid) { return state.faintedPets.indexOf(pid) === -1; });
    if (alive.length === 0) {
      state.faintedPets = [];
      partyHp = {};
      monsterCurrentHp = getBossMaxHp();
      showPopup('💀 ALL BUDDIES FAINTED! PARTY REVIVED!');
      document.getElementById('feedback-msg').innerText = 'All buddies fell in battle! Full team revived!';
      updateStatsUI();
      scheduleNextProblem(1500, 'Try again — you can do it!');
    } else {
      alive.sort(function (a, b) { return getBuddyLevel(b) - getBuddyLevel(a); });
      state.activePet = alive[0];
      const next = getActivePetDisplay();
      showPopup(`💔 ${pet.name} FAINTED! ${next.name} enters!`);
      document.getElementById('feedback-msg').innerText = `${pet.name} needs rest! ${next.name} enters!`;
      updateStatsUI();
      scheduleNextProblem(1400, 'Ready for the next one!');
    }
    saveState();
  }, 200);
}

function scheduleNextProblem(delay, msg) {
  const wait = Math.max(delay, explainHold);
  explainHold = 0;
  setTimeout(function () {
    generateProblem();
    document.getElementById('feedback-msg').innerText = currentProblem.easy ? 'Warm-up round — you can do this! 🌱' : currentProblem.challenge ? 'Challenge problem: +' + Math.round(ECON.adaptive.challengeXpBonus * 100) + '% XP if you get it! 💪' : msg;
  }, wait);
}

function checkAnswer() {
  if (inputLocked) return;
  if (userInput === '' || userInput === '-' || userInput === '.' || userInput === '-.') return;
  const numVal = parseFloat(userInput);
  if (isNaN(numVal)) return;

  inputLocked = true;
  const answerBox = document.getElementById('answer-box');
  const feedback = document.getElementById('feedback-msg');
  const streakBanner = document.getElementById('streak-msg');
  const solveTime = (Date.now() - questionStartTime) / 1000;

  sessionStats.attempts += 1;

  if (Math.abs(numVal - currentProblem.answer) < 0.0001) {
    soundCorrect(state.streak + 1);
    buddyReact(state.streak >= 2 && (state.streak + 1) % 3 === 0 ? 'streak' : 'cheer');
    if (answerBox) answerBox.className = 'answer-box correct';

    sessionStats.solved += 1;
    const opId = currentProblem.modeTag;
    sessionStats.byOp[opId] = (sessionStats.byOp[opId] || 0) + 1;
    questEvent('solve', opId);
    const wasChallenge = !!currentProblem.challenge;
    calDayEvent();
    recordStat(opId, true, solveTime, opId === getWeakOp());
    checkParentGoal();
    if (sessionStats.fastestTime === null || solveTime < sessionStats.fastestTime) sessionStats.fastestTime = solveTime;

    state.streak += 1;
    recordAllTime(opId, true, solveTime, hintUsed);
    questEvent('streak', state.streak);
    if (ultimateCharge < 3) ultimateCharge += 1;

    let speedLimit = (4 + state.grade * 2.5) * (HARD_OPS.indexOf(opId) !== -1 ? 1.6 : 1);
    if (pad.used) speedLimit *= 1.75;
    if (activeRole('Speedster')) speedLimit *= 1.25;
    const isFast = !hintUsed && solveTime <= speedLimit;
    answerBonuses(isFast);
    let speedBonusGems = 0;
    if (isFast) {
      speedBonusGems = ECON.solve.speedGem;
      questEvent('fast');
      showPopup('⚡ SPEED STRIKE! +1 💎');
    } else {
      showPopup(BOSS_HIT_WORD[getBossInfo().element] || 'HIT! 💥');
    }

    const cloverOn = state.cloverLeft > 0;
    let xpEarned = 8 + Math.min(state.streak, 10) + (isFast ? 4 : 0);
    if (wasChallenge) xpEarned = Math.round(xpEarned * (1 + ECON.adaptive.challengeXpBonus));
    if (cloverOn) xpEarned = Math.round(xpEarned * 1.5);
    recordAdaptive(opId, true, isFast);
    awardBuddyXp(xpEarned);

    const slowFrozen = hasStatus('frozen') && solveTime > speedLimit * 1.5;
    if (slowFrozen) showPopup('❄️ SLOW HIT... ANSWER FASTER TO THAW!');
    triggerMonsterDamage(isFast && activeRole('Attacker') ? 1 : 0, opId === getWeakOp(), isFast, slowFrozen ? 0.5 : 1);

    let gemsEarned = ECON.solve.gem + speedBonusGems + (state.streak % ECON.solve.streakEvery === 0 ? ECON.solve.streakBonus : 0);
    if (state.cloverLeft > 0) {
      gemsEarned *= 2;
      state.cloverLeft -= 1;
    }
    state.gems += gemsEarned;

    feedback.innerText = `${praiseFor(state.streak, isFast)} +${xpEarned} XP`;
    floatGain('+' + gemsEarned + ' 💎', 'gems-display', 0);
    floatGain('+' + xpEarned + ' XP', 'xp-text', 160);
    if (state.streak >= 3) streakBanner.innerText = `🔥 ${state.streak} IN A ROW!`;
    if (MILESTONES[state.streak]) streakMilestone(state.streak);
    else if (state.streak % 5 === 0) launchConfetti('streak');

    if (sessionStats.solved >= sessionStats.goal && !sessionStats.goalClaimed) {
      sessionStats.goalClaimed = true;
      const reached = sessionStats.goal;
      const goalReward = sessionGoalReward(reached);
      state.gems += goalReward;
      setTimeout(function () {
        enqueueModal(function () {
          soundSecretFound();
          launchConfetti('level');
          document.getElementById('goal-done-num').innerText = reached;
          document.getElementById('goal-reward-num').innerText = goalReward;
          document.getElementById('goal-modal').style.display = 'flex';
        });
      }, 800);
    }

    tickStatus();
    updateStatsUI();
    saveState();
    scheduleNextProblem(500, 'Ready for the next one!');

  } else {
    soundWrong();
    bossMistakes += 1;
    const missOp = currentProblem.modeTag;
    recordStat(missOp, false, solveTime, false);
    recordAllTime(missOp, false, solveTime, false);
    if (currentProblem.challenge) state.adapt.calm[missOp] = true;     // after a missed challenge the next one steps back
    recordAdaptive(missOp, false, false);
    if (!currentProblem.challenge) state.adapt.easy[missOp] = true;     // a quick win right after a miss (a missed challenge already steps back, above)
    buddyReact('wince');
    explainMistake();
    showMissCard(numVal);
    if (answerBox) answerBox.className = 'answer-box wrong';

    if (state.shields > 0) {
      state.shields -= 1;
      soundShieldBreak();
      showPopup('🛡️ STREAK SHIELD SAVED YOU!');
      feedback.innerText = 'Shield absorbed it! ' + missLine(numVal, currentProblem.answer);
      updateStatsUI();
      saveState();
      scheduleNextProblem(1300, 'Shield used up — stay sharp!');
    } else {
      feedback.innerText = missLine(numVal, currentProblem.answer);
      streakBanner.innerText = 'COMBO BROKEN!';
      triggerBuddyDamage();
      saveState();
    }
    tickStatus();
  }
}
