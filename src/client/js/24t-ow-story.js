// =====================================================================
//  THE STORY on the Adventure map (data; the rules are in 24g-ow-engine.js and 24k-ow-people.js):
//  Riley (the rival who turns out to be a partner), the Scramblers (three schemes with numbers: the ferry timetable, the Volt blackout and the Gloom hideout with its boss),
//  the Champion's Walk and the Hall, and what is there after you win. The kind voice rule holds everywhere: Riley cheers, the Scramblers give up gracefully, nobody is hurt.
// =====================================================================
function owAddNpc(mapId, npc) { OW_MAPS[mapId].npcs.push(npc); }
function owSetTile(mapId, x, y, ch) { const r = OW_MAPS[mapId].rows; r[y] = r[y].slice(0, x) + ch + r[y].slice(x + 1); }
const OW_RILEY_LOOK = { skin: 2, hair: 5, outfit: 1, style: 3 };

// ----- Riley: she meets you at the start, again after Tide Bay and after Volt Valley, tells you the truth in Skyreach, and races you once more before the Hall -----
owAddNpc('route1', { id: 'route1-riley', kind: 'trainer', name: RIVAL, x: 10, y: 20, face: 'left', look: OW_RILEY_LOOK, vanish: true,
  lines: ['Hi! I am Riley. I am starting my journey today too!', 'Let us see whose buddy is quicker. Ready?'], win: ['Wow, you are good! See you at the gyms, rival!'] });
owAddNpc('route4', { id: 'route4-riley', kind: 'trainer', name: RIVAL, x: 10, y: 6, face: 'left', look: OW_RILEY_LOOK, needs: 'tide', vanish: true, levelBonus: 1,
  lines: ['You have the Tide Badge too! I am right behind you!', 'I trained hard. Let us battle on the road!'], win: ['Okay, okay, you win this one. Next gym, I will be faster!'] });
owAddNpc('route6', { id: 'route6-riley', kind: 'trainer', name: RIVAL, x: 10, y: 5, face: 'left', look: OW_RILEY_LOOK, needs: 'volt', vanish: true, levelBonus: 1,
  lines: ['Volt Valley was shocking! I am not giving up, though.', 'My buddies learned new tricks. Ready?'], win: ['You are so strong. I am learning a lot from you, you know.'] });
owAddNpc('skyreach', { id: 'skyreach-riley', kind: 'scene', name: RIVAL, x: 9, y: 11, face: 'left', look: OW_RILEY_LOOK, needs: 'skyreach', story: 'riley-reveal', vanish: true,
  lines: ['You did it! The Skyreach Badge! Congratulations!', 'I have to tell you something. I trained so hard to stand here with you, not to beat you.', 'You made me a better trainer every time we met. Thank you, partner.', 'The Champion\'s Walk is up the road. I will meet you at the Hall. Do your best!'] });
owAddNpc('skyreach', { id: 'skyreach-riley-after', kind: 'scene', name: RIVAL, x: 9, y: 10, face: 'left', look: OW_RILEY_LOOK, needs: 'champion',
  lines: ['Champion! I am so proud of you.', 'Every week a legend buddy appears. Try the Legend row on the Map, and I will race you for it!', 'Any gym will battle you again too, with stronger trainers and better prizes.'] });

// ----- the Scramblers: they mix up numbers for fun. Beat one, then put the numbers right with a math puzzle (a few questions in a row; wrong answers are free). -----
const OW_SCRAMBLER_LOOK = { skin: 3, hair: 7, outfit: 7, style: 2 };
owAddNpc('tide', { id: 'tide-zig', kind: 'trainer', name: 'Scrambler Zig', x: 10, y: 12, face: 'left', look: OW_SCRAMBLER_LOOK,
  lines: ['Hee hee! I am a Scrambler! I mixed up the ferry timetable!', 'Beat me and I will let you fix it.'], win: ['Aww, no fair! Go on, fix the timetable at the board. I will behave.'] });
owSetTile('tide', 5, 12, 's');
OW_MAPS.tide.signs['5,12'] = { id: 'tide-ferry', text: 'The ferry timetable! All the numbers are scrambled. Put them right!', quiz: true, rounds: 3, story: 'tide-ferry', after: 'tide-zig',
  locked: 'The timetable is covered in scribbles. A Scrambler named Zig is guarding it.', done: 'The ferry timetable is back in order. The ferry runs on time again!' };
owAddNpc('volt', { id: 'volt-zag', kind: 'trainer', name: 'Scrambler Zag', x: 10, y: 12, face: 'left', look: OW_SCRAMBLER_LOOK,
  lines: ['Bzzt! The blackout was me! I tangled the wires of the power panel!', 'Beat me and I will let you untangle them.'], win: ['Fine, fine! The panel is over there. Untangle it. I will stand back.'] });
owSetTile('volt', 5, 12, 's');
OW_MAPS.volt.signs['5,12'] = { id: 'volt-panel', text: 'The power panel! The wires are all tangled. Solve the circuit to turn the lights back on!', quiz: true, rounds: 3, story: 'volt-blackout', after: 'volt-zag',
  locked: 'The panel is buzzing and a Scrambler named Zag is guarding it.', done: 'The lights are back on all over Volt Valley!' };

// The hideout in Gloom Marsh: a door in the rocks, two Scramblers, and their boss (a boss from the boss list, a little above your buddy).
owSetTile('gloom', 14, 6, 'D');
OW_MAPS.gloom.warps.push({ x: 14, y: 6, to: 'gloom-hideout', tx: 4, ty: 7 });
Object.assign(OW_MAPS, {
  'gloom-hideout': {
    id: 'gloom-hideout', name: 'Scrambler Hideout', region: 'gloom', start: { x: 4, y: 7 }, palette: OW_GLOOM_PALETTE,
    rows: ['wwwwwwwww', 'wSfffffSw', 'wfffffffw', 'wfrrrrrfw', 'wfffffffw', 'wfrrrrrfw', 'wfffffffw', 'wfffffffw', 'wwwwmwwww'],
    warps: [{ x: 4, y: 8, to: 'gloom', tx: 14, ty: 7 }],
    npcs: [
      { id: 'gloom-pix', kind: 'trainer', name: 'Scrambler Pix', x: 2, y: 5, face: 'right', look: OW_SCRAMBLER_LOOK, lines: ['Shh! This is the secret hideout! How did you find it?'], win: ['Oh no! Please do not tell Boss Scramble!'] },
      { id: 'gloom-dab', kind: 'trainer', name: 'Scrambler Dab', x: 6, y: 3, face: 'left', look: { skin: 1, hair: 6, outfit: 7, style: 0 }, lines: ['Halt! No one gets past me to see the boss!'], win: ['Alright, alright. You may pass. Be nice to the boss!'] },
      { id: 'gloom-boss', kind: 'boss', boss: 'dark', name: 'Boss Scramble', x: 4, y: 1, face: 'down', look: { skin: 4, hair: 7, outfit: 4, style: 2 }, story: 'gloom-scramblers', vanish: true,
        lines: ['So you are the one who put the ferry and the lights right!', 'I mix numbers up because it is fun. But fine, meet my strongest buddy!'],
        win: ['My numbers! They are all back in order. Okay, I give up.', 'Counting is more fun when it is right. Thank you for showing me.'] }
    ],
    objects: [{ id: 'gloom-hideout-gem', type: 'pickup', x: 1, y: 7, give: 'gems' }],
    signs: {}
  }
});

// ----- the Champion's Walk: a road of Ace trainers, Riley's last race, and the Hall door. After you win, Nova stands by the road. -----
owSetTile('skyreach', 7, 0, 'x');
OW_MAPS.skyreach.roads = Object.assign(OW_MAPS.skyreach.roads || {}, { '7,0': 'skyreach' });
OW_MAPS.skyreach.warps.push({ x: 7, y: 0, to: 'champwalk', tx: 6, ty: 18 });
const OW_ACE = { levelBonus: 1 };
Object.assign(OW_MAPS, {
  champwalk: {
    id: 'champwalk', name: "Champion's Walk", region: 'skyreach', start: { x: 6, y: 18 }, palette: OW_SKYREACH_PALETTE,
    rows: ['TTTTTTTTTTTTTT', 'T,,,RRRR,,,,,T', 'T,,,RRRR,,,,,T', 'T,,,WWGW,,,,,T', 'T,,,,s..,,,,,T', 'T,,,,,..,,,*,T', 'T,,,,,..,,,,,T', 'T,*,,,..,,,,,T', 'T,,,,,..,,,,,T', 'T,,,,,..,,,,,T',
      'T,,,,,..,,,,,T', 'T,,,,,..,,,,,T', 'T,,,,,..,,*,,T', 'T,,,,,..,,,,,T', 'T,,,,,..,,,,,T', 'T,,,,,..,,,,,T', 'T,,*,,..,,,,,T', 'T,,,,,..,,,,,T', 'T,,,,,..,,,,,T', 'TTTTTT..TTTTTT'],
    warps: [{ x: 6, y: 19, to: 'skyreach', tx: 7, ty: 1 }, { x: 7, y: 19, to: 'skyreach', tx: 7, ty: 1 }],
    npcs: [
      Object.assign({ id: 'walk-joule', kind: 'trainer', name: 'Ace Joule', x: 3, y: 15, face: 'right', look: { skin: 2, hair: 0, outfit: 4, style: 0 }, lines: ['This is the Champion\'s Walk. Only strong trainers get this far!'], win: ['Superb! Keep walking. The Hall is at the end.'] }, OW_ACE),
      Object.assign({ id: 'walk-brook', kind: 'trainer', name: 'Ace Brook', x: 10, y: 11, face: 'left', look: { skin: 1, hair: 3, outfit: 0, style: 1 }, lines: ['I have waited here all week for a worthy battle!'], win: ['What a match! I hope we meet again.'] }, OW_ACE),
      Object.assign({ id: 'walk-sage', kind: 'trainer', name: 'Ace Sage', x: 3, y: 8, face: 'right', look: { skin: 4, hair: 1, outfit: 2, style: 3 }, lines: ['Calm mind, quick answers. Let us see yours.'], win: ['Wise play. The Hall is close now.'] }, OW_ACE),
      { id: 'walk-riley', kind: 'trainer', name: RIVAL, x: 10, y: 6, face: 'left', look: OW_RILEY_LOOK, needs: 'skyreach', vanish: true, levelBonus: 2,
        lines: ['The Hall is right there. One last race, partner!'], win: ['That was the best battle ever. Go and meet Champion Nova!'] },
      { id: 'walk-nova', kind: 'scene', name: 'Champion Nova', x: 8, y: 4, face: 'left', look: { skin: 1, hair: 4, outfit: 4, style: 1 }, needs: 'champion',
        lines: ['Hello again, Champion. You earned your place in the Hall of Fame.', 'Come back for a rematch whenever you like. My buddies train every day!', 'There are still legends to hunt and gyms to beat again. The kingdom is yours.'] }
    ],
    objects: [],
    gyms: { '6,3': 'champion' },
    signs: { '5,4': "The Champion's Walk. The great golden Hall is straight ahead!" }
  }
});
