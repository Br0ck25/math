// =====================================================================
//  BOSS RAIDS  (every 10 bosses: 3 phases, a new weak point each phase)
// =====================================================================
const RAID_STORY = [
  { title: 'The Gate Breaks', panels: [
      { icon: '🏰', text: 'The Number Kingdom was peaceful and bright...' },
      { icon: '💥', text: 'BOOM! A dark portal tears open above the castle!' },
      { icon: '👑', text: 'A giant Raid Boss storms the gates! Only you and your buddies can stop it!' }],
    outro: 'The gates hold! But the portal is still glowing...' },
  { title: 'The Missing Numbers', panels: [
      { icon: '🔢', text: 'Oh no! The royal numbers have vanished from the library!' },
      { icon: '🕵️', text: 'Clues lead to a huge shadow guarding the stolen digits.' },
      { icon: '⚔️', text: 'Defeat it and the numbers come home!' }],
    outro: 'The numbers are back on their shelves. The king cheers!' },
  { title: 'The Frozen Bridge', panels: [
      { icon: '🌉', text: 'The Great Bridge to the Equation Hills is frozen solid.' },
      { icon: '🥶', text: 'A towering beast blocks the way and laughs at your math!' },
      { icon: '🔥', text: 'Time to heat things up, hero!' }],
    outro: 'The ice melts and the bridge reopens. On to the hills!' },
  { title: 'The Clockwork Tower', panels: [
      { icon: '🕰️', text: 'The kingdom clock has stopped ticking!' },
      { icon: '🤖', text: 'A mighty machine has taken over the clock tower.' },
      { icon: '🔧', text: 'Solve fast and set time moving again!' }],
    outro: 'Tick-tock! The clock runs again. Almost there...' },
  { title: 'The Shadow King', panels: [
      { icon: '🌑', text: 'The darkness behind the portal finally shows itself.' },
      { icon: '👁️', text: 'The Shadow King rises. Every number you know is his weakness!' },
      { icon: '🌟', text: 'This is the final stand for the Number Kingdom!' }],
    outro: 'The Shadow King fades. The Number Kingdom is saved... for now!' }
];

function startRaid() {
  const ops = getActiveOps().slice();
  ops.sort(function () { return Math.random() - 0.5; });
  const weaks = [];
  for (let i = 0; i < ECON.raid.phases; i++) weaks.push(ops[i % ops.length]);
  state.lastRaidAt = state.monstersDefeated;
  state.raid = { phase: 0, total: ECON.raid.phases, weaks: weaks, chapter: state.raidsCleared % RAID_STORY.length, introSeen: false };
}
// One story window for raids and the map: {chapter, title, panels:[{icon,text}], note, btn, cleared}
function showStoryModal(o) {
  document.getElementById('raid-chapter').innerText = o.chapter;
  document.getElementById('raid-title').innerText = o.title;
  document.getElementById('raid-panels').innerHTML = o.panels.map(function (pn) {
    return '<div class="comic-panel"><span class="comic-icon">' + pn.icon + '</span><span class="comic-text">' + escHtml(pn.text) + '</span></div>';
  }).join('');
  document.getElementById('raid-note').innerText = o.note || '';
  document.getElementById('raid-btn').innerText = o.btn;
  soundFanfare(!!o.cleared);
  document.getElementById('raid-modal').style.display = 'flex';
}
function showRaidStory(mode, chapter) {
  const st = RAID_STORY[chapter % RAID_STORY.length];
  const intro = mode === 'intro';
  if (intro && state.raid) { state.raid.introSeen = true; saveState(); }
  showStoryModal({
    chapter: 'Chapter ' + (chapter + 1) + (intro ? ' · Raid!' : ' · Cleared!'),
    title: intro ? st.title : '🎉 Raid Cleared!',
    panels: intro ? st.panels : [{ icon: '🏆', text: st.outro }, { icon: '💎', text: 'Raid bonus: +' + ECON.raid.bonusGems + ' gems!' }],
    note: intro ? 'Raid bosses have 3 phases — and a new weak point each phase!' : 'Raids cleared: ' + state.raidsCleared,
    btn: intro ? '⚔️ To battle!' : 'Hooray!', cleared: !intro
  });
}
function closeRaidModal() {
  soundClick();
  document.getElementById('raid-modal').style.display = 'none';
  modalDone();
}
