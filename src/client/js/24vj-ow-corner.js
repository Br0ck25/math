// =====================================================================
//  THE GAME CORNER (Gold's Celadon): a room in Spark City (through a gap in the west edge). Buy coins with gems (50 for 1000), play the slots (3 coins a spin) and swap coins for prizes.
//  The slots pay back about nine tenths of what they take. state.coins = coins held.
// =====================================================================
const CORNER_SYMBOLS = [['7', 3], ['bell', 5], ['cherry', 6], ['fish', 6], ['star', 6]];                 // symbol and its weight on a reel
const CORNER_PAYS = { '7': 300, bell: 150, cherry: 30, fish: 18, star: 12 };                                  // coins for three alike; a cherry on the first reel alone gives 2 back (about 90% comes back in all)
const CORNER_PRIZES = [['revive', 'Revive', 800], ['ultranet', 'Ultra Net', 1500], ['ppup', 'PP Up', 3000], ['stone', 'Evolution Stone', 4000], ['maxrevive', 'Max Revive', 5000], ['raindance', 'TM Rain Dance', 3500], ['sunnyday', 'TM Sunny Day', 3500], ['protect', 'TM Protect', 4000], ['rest', 'TM Rest', 4000], ['hyperbeam', 'TM Hyper Beam', 7500]];
function cornerReel() { let r = Math.random() * 26; for (let i = 0; i < CORNER_SYMBOLS.length; i++) { r -= CORNER_SYMBOLS[i][1]; if (r < 0) return CORNER_SYMBOLS[i][0]; } return 'star'; }
// One spin of the three reels: { reels, won } (the bet is already taken).
function cornerSpin() {
  const reels = [cornerReel(), cornerReel(), cornerReel()];
  const won = reels[0] === reels[1] && reels[1] === reels[2] ? CORNER_PAYS[reels[0]] : reels[0] === 'cherry' ? 2 : 0;
  return { reels: reels, won: won };
}
function owCornerTalk(npc, lines) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0), me = function () { owCornerTalk(npc, ['You have ' + state.coins + ' coins.']); };
  openTalk({ name: npc.name, art: art, lines: lines, choices: [
    { label: 'Buy 50 coins (1000 gems)', run: function () { closeTalk(); if (state.gems < 1000) { soundWrong(); toast('You need 1000 gems.'); return; } state.gems -= 1000; state.coins = Math.min(9999, state.coins + 50); saveState(); updateStatsUI(); me(); } },
    { label: 'Play the slots (3 coins)', run: function () { closeTalk(); owCornerPlay(npc, ['Three alike pay: 7 = 300, bell = 150, cherry = 30, fish = 18, star = 12. A cherry on the first reel gives 2 back.']); } },
    { label: 'Card Flip (3 coins)', run: function () { closeTalk(); owCornerFlip(npc); } },
    { label: 'Prizes', run: function () { closeTalk(); owCornerPrizes(npc); } }
  ] });
}
function owCornerPlay(npc, lines) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0);
  openTalk({ name: npc.name, art: art, lines: lines.concat(['You have ' + state.coins + ' coins.']), choices: [
    { label: 'Spin', run: function () {
      closeTalk();
      if (state.coins < 3) { soundWrong(); owCornerTalk(npc, ['You need 3 coins to play. Buy some!']); return; }
      state.coins -= 3; const s = cornerSpin(); state.coins = Math.min(9999, state.coins + s.won); saveState();
      soundCoinChirp();
      owCornerPlay(npc, [s.reels.join(' | ') + (s.won >= 12 ? '  JACKPOT! +' + s.won + ' coins!' : s.won ? '  +' + s.won + ' coins' : '  No luck.')]);
    } },
    { label: 'Done', run: function () { closeTalk(); owCornerTalk(npc, ['Welcome to the Game Corner!']); } }
  ] });
}
// Gold's Card Flip, small: six face-down cards hide three pairs; flip two, and if they match you win 13 coins (about 87 back for every 100 played).
const CORNER_FLIP_WIN = 13;
function owCornerFlip(npc) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0);
  if (state.coins < 3) { soundWrong(); owCornerTalk(npc, ['You need 3 coins to flip cards. Buy some!']); return; }
  state.coins -= 3; saveState();
  const faces = shuffled(['star', 'star', 'bell', 'bell', 'cherry', 'cherry']);
  const pick = function (first) {
    const open = [0, 1, 2, 3, 4, 5].filter(function (k) { return k !== first; });
    openTalk({ name: npc.name, art: art, lines: [first === undefined ? 'Six cards, three pairs. Flip two that match! Pick the first card.' : 'Card ' + (first + 1) + ' is a ' + faces[first] + '. Pick the second card.'], choices: open.map(function (k) {
      return { label: 'Card ' + (k + 1), run: function () {
        closeTalk();
        if (first === undefined) { pick(k); return; }
        const won = faces[k] === faces[first];
        if (won) { state.coins = Math.min(9999, state.coins + CORNER_FLIP_WIN); saveState(); soundCoinChirp(); }
        owCornerTalk(npc, [faces[first] + ' and ' + faces[k] + (won ? '! A pair! +' + CORNER_FLIP_WIN + ' coins!' : '. No pair.') + ' You have ' + state.coins + ' coins.']);
      } };
    }) });
  };
  pick();
}
function owCornerPrizes(npc) {
  const art = heroSprite(heroLookColors(npc.look), 'down', 0);
  openTalk({ name: npc.name, art: art, lines: ['Prizes! You have ' + state.coins + ' coins.'], choices: CORNER_PRIZES.map(function (p) {
    return { label: p[1] + ' (' + p[2] + ')', run: function () {
      closeTalk();
      if (state.coins < p[2]) { soundWrong(); owCornerTalk(npc, ['You need ' + p[2] + ' coins for ' + p[1] + '.']); return; }
      state.coins -= p[2];
      if (AB_TMS[p[0]]) state.tms[p[0]] = 1; else state.items[p[0]] = Math.min(99, (state.items[p[0]] || 0) + 1);
      saveState(); owCornerTalk(npc, ['Here is your ' + p[1] + '! You have ' + state.coins + ' coins left.']);
    } };
  }) });
}
OW_SERVICES.corner = function (npc) { owCornerTalk(npc, ['Welcome to the Game Corner! Coins are 50 for 1000 gems.']); };
OW_MAPS['spark-corner'] = owRoom('spark-corner', 'Game Corner', { to: 'spark', tx: 1, ty: 6 }, [
  { id: 'spark-corner-clerk', kind: 'corner', name: 'Clerk Jackie', x: 3, y: 2, face: 'down', look: { skin: 2, hair: 6, outfit: 1, style: 2 }, lines: ['The Game Corner.'] }
], [], ['wwwwwwwwwwww', 'wHHHfHHHHHHw', 'wffffffffffw', 'wffffffffffw', 'wHfHfHfHfHfw', 'wffffffffffw', 'wPfffffffffw', 'wffffffffffw', 'wffffffffffw', 'wwwwwmwwwwww']);      // a row of slot machines
OW_MAPS['spark-corner'].region = 'spark'; OW_MAPS['spark-corner'].palette = OW_SPARK_PALETTE;
owSetTile('spark', 0, 6, '.');
OW_MAPS.spark.warps.push({ x: 0, y: 6, to: 'spark-corner', tx: 5, ty: 8 });
