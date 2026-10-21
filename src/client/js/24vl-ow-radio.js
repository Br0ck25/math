// =====================================================================
//  THE RADIO TOWER TAKEOVER (Gold's Team Rocket at the Radio Tower): the Scramblers have seized the tower in Spark City and fill the radio with scrambled numbers.
//  A door in the east edge of Spark City (it opens with the Spark Badge) leads up three floors: two Scramblers on each of the first two, Boss Static on the top. Beating the boss ends the takeover.
// =====================================================================
OW_STORY.push('radio-tower');
const OW_STORY_ITEMS = { 'radio-tower': 'stone' };                  // a story beat that hands over an item the first time
(function () {
  const stairs = function (up, down) { return ['wwwwwwww', 'w' + (down ? 'm' : 'f') + 'ffff' + (up ? 'm' : 'f') + 'w', 'wffffffw', 'wfrrrrfw', 'wffffffw', 'wffffffw', 'wwwmwwww']; };
  const look = OW_SCRAMBLER_LOOK;
  const floor = function (n, up, down, npcs) {
    const m = owRoom('spark-tower-' + n, 'Radio Tower, floor ' + n, { to: 'spark', tx: 14, ty: 6 }, npcs, [], stairs(up, down));
    m.region = 'spark'; m.palette = OW_SPARK_PALETTE; m.warps = n === 1 ? m.warps : [];
    if (up) m.warps.push({ x: 6, y: 1, to: 'spark-tower-' + (n + 1), tx: 1, ty: 2 });
    if (down) m.warps.push({ x: 1, y: 1, to: 'spark-tower-' + (n - 1), tx: 6, ty: 2 });
    return m;
  };
  OW_MAPS['spark-tower-1'] = floor(1, true, false, [
    { id: 'tower-zim', kind: 'trainer', name: 'Scrambler Zim', x: 2, y: 4, face: 'right', look: look, lines: ['This is our tower now! The radio says what WE want!'], win: ['Fine, fine. Go on up.'] },
    { id: 'tower-zam', kind: 'trainer', name: 'Scrambler Zam', x: 6, y: 3, face: 'left', look: look, lines: ['Nobody gets past the first floor!'], win: ['Ugh! The stairs are over there.'] }]);
  OW_MAPS['spark-tower-2'] = floor(2, true, true, [
    { id: 'tower-zeb', kind: 'trainer', name: 'Scrambler Zeb', x: 2, y: 3, face: 'right', look: look, lines: ['I read the news. All of it scrambled!'], win: ['The numbers were so pretty that way...'] },
    { id: 'tower-zil', kind: 'trainer', name: 'Scrambler Zil', x: 5, y: 4, face: 'left', look: look, lines: ['Boss Static is waiting upstairs. You will not reach him!'], win: ['He is up there. Be careful!'] }]);
  OW_MAPS['spark-tower-3'] = floor(3, false, true, [
    { id: 'tower-boss', kind: 'boss', boss: 'electric', name: 'Boss Static', x: 3, y: 2, face: 'down', look: { skin: 4, hair: 7, outfit: 4, style: 2 }, story: 'radio-tower', vanish: true,
      lines: ['Bzzzt! You came all the way up? Listen to my station: every number is wrong and everybody loves it!', 'Well, nearly everybody. Let us see your buddies!'],
      win: ['Static! All static! Okay, okay. I will play the right numbers.', 'Take this Evolution Stone. I found it in the studio. The tower is yours again.'] }]);
  owSetTile('spark', 15, 6, 'x');
  OW_MAPS.spark.roads = Object.assign(OW_MAPS.spark.roads || {}, { '15,6': 'spark' });
  OW_MAPS.spark.warps.push({ x: 15, y: 6, to: 'spark-tower-1', tx: 3, ty: 5 });
})();
GIZMO_CALLS.push({ from: 'Radio news', text: 'Good news from Spark City: the Radio Tower is back on the air, and every number it reads out is right again!', when: function () { return state.overworld.story.indexOf('radio-tower') !== -1; } });
