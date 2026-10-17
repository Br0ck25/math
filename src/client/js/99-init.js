if (isPortal()) {
  openPortal();
} else {
  loadState();
  migratePin();
  checkEarnedGear();
  addCloseButtons();
  initAccessibility();
  applyMotionPref();
  setBossTaunt();
  updateStatsUI();
  generateProblem();
  applyControls();
  renderChal();
  if (state.raid && !state.raid.introSeen) { const ch = state.raid.chapter; enqueueModal(function () { showRaidStory('intro', ch); }); }
  // First-time players: a glow on the buddy plus one short tip about what tapping it does.
  if (!state.seen.hub) setTimeout(function () { toast('💡 Tap your buddy for care, trading cards and duels!'); }, 2500);
  maybeWelcomeBack();
  acctStartup();
}
