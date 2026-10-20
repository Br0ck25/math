{
  loadState();
  addCloseButtons();
  initAccessibility();
  applyMotionPref();
  if (typeof applyReadAloudPref === 'function') applyReadAloudPref();
  updateStatsUI();
  adventureBoot();
  acctStartup();
}
