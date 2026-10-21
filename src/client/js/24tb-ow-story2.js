// =====================================================================
//  THE SECOND JOURNEY'S STORY: the Scramblers are back. They scramble a lighthouse code in Coral Reach and the big clock in Spark City, and hide in Duskhollow.
//  Riley turns up again at the Crossroads and the Citadel. Same pieces as the first journey (24t-ow-story.js): a trainer, a puzzle sign, a boss, a scene.
// =====================================================================
OW_STORY.push('coral-lighthouse', 'spark-clock', 'dusk-jumble', 'cross-riley');
owAddNpc('coral', { id: 'coral-zub', kind: 'trainer', name: 'Scrambler Zub', x: 10, y: 12, face: 'left', look: OW_SCRAMBLER_LOOK,
  lines: ['Hee hee! The Scramblers are back, and bigger! I scrambled the lighthouse code!', 'Beat me and I will let you fix it.'], win: ['Pooh! The code panel is over there. Fix it. I will watch.'] });
owSetTile('coral', 5, 12, 's');
OW_MAPS.coral.signs['5,12'] = { id: 'coral-lighthouse', text: 'The lighthouse code! The numbers are scrambled and the ships cannot see the way. Put them right!', quiz: true, rounds: 3, story: 'coral-lighthouse', after: 'coral-zub',
  locked: 'The code panel is covered in scribbles. A Scrambler named Zub is guarding it.', done: 'The lighthouse is shining again. The ships find their way home!' };
owAddNpc('spark', { id: 'spark-zop', kind: 'trainer', name: 'Scrambler Zop', x: 10, y: 12, face: 'left', look: OW_SCRAMBLER_LOOK,
  lines: ['Tick tock! I scrambled the big clock of Spark City! Nothing runs on time!', 'Beat me and I will let you set it right.'], win: ['Fine! The clock is by the sign. Set it right. I will not touch it.'] });
owSetTile('spark', 5, 12, 's');
OW_MAPS.spark.signs['5,12'] = { id: 'spark-clock', text: 'The big clock! All its numbers are scrambled. Put them in order!', quiz: true, rounds: 3, story: 'spark-clock', after: 'spark-zop',
  locked: 'The clock is ticking all wrong and a Scrambler named Zop is guarding it.', done: 'The big clock is right again. Every train runs on time!' };

// The hideout in Duskhollow: a door in the rocks, two Scramblers, and their new boss.
owSetTile('dusk', 14, 6, 'D');
OW_MAPS.dusk.warps.push({ x: 14, y: 6, to: 'dusk-hideout', tx: 4, ty: 8 });
Object.assign(OW_MAPS, {
  'dusk-hideout': {
    id: 'dusk-hideout', name: 'Scrambler Lair', room: true, region: 'dusk', start: { x: 4, y: 8 }, palette: OW_DUSK_PALETTE,
    rows: ['wwwwwwwwwwww', 'wSfffffSQQHw', 'wfffffffffPw', 'wfrrrrrffffw', 'wffffffffffw', 'wfrrrrrffffw', 'wffffffffffw', 'wffffffffffw', 'wffffffffffw', 'wwwwmwwwwwww'],
    warps: [{ x: 4, y: 9, to: 'dusk', tx: 14, ty: 7 }],
    npcs: [
      { id: 'dusk-fib', kind: 'trainer', name: 'Scrambler Fib', x: 2, y: 5, face: 'right', look: OW_SCRAMBLER_LOOK, lines: ['Shh! This is the new lair! Nobody finds us here!'], win: ['Oh no! Do not tell Boss Jumble!'] },
      { id: 'dusk-dot', kind: 'trainer', name: 'Scrambler Dot', x: 6, y: 3, face: 'left', look: { skin: 1, hair: 6, outfit: 7, style: 0 }, lines: ['Stop right there! The boss is busy!'], win: ['Alright, go on. Be kind to the boss!'] },
      { id: 'dusk-boss', kind: 'boss', boss: 'dark', name: 'Boss Jumble', x: 4, y: 1, face: 'down', look: { skin: 4, hair: 7, outfit: 4, style: 2 }, story: 'dusk-jumble', vanish: true,
        lines: ['You fixed the lighthouse and the clock? Impressive. I am Jumble, the boss of the Scramblers.', 'Numbers are funnier when they are wrong. Meet my strongest buddy!'],
        win: ['All my scrambles are undone. Even the funny ones.', 'Maybe getting it right feels better after all. Thank you, Champion.'] }
    ],
    objects: [{ id: 'dusk-lair-gem', type: 'pickup', x: 1, y: 7, give: 'gems' }],
    signs: {}
  }
});

// ----- Riley: she is at the Crossroads after you win there, and at the Citadel with news about Silver Peak -----
owAddNpc('cross', { id: 'cross-riley', kind: 'scene', name: RIVAL, x: 9, y: 11, face: 'left', look: OW_RILEY_LOOK, needs: 'cross', story: 'cross-riley', vanish: true,
  lines: ['The Crossroads Badge! You are on fire, partner!', 'I stopped racing you a while ago. Now I just want to see how far you can go.', 'They say the Citadel is the last gym, and above it is Silver Peak. Nobody has beaten the Master there.', 'I will be at the Citadel. Come and find me!'] });
owAddNpc('summit', { id: 'summit-riley', kind: 'scene', name: RIVAL, x: 9, y: 11, face: 'left', look: OW_RILEY_LOOK, needs: 'summit',
  lines: ['The Summit Badge! Then the road up to Silver Peak is yours.', 'The Master uses all six legends. Take a full team and plenty of Potions.', 'Whatever happens up there, I am proud to have raced you.'] });
