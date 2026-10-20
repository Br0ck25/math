// =====================================================================
//  UI REFRESH: the Adventure has no HUD. The Menu shows the gems, and short messages are toasts.
// =====================================================================
function updateStatsUI() {
  const g = document.getElementById('menu-gems');
  if (g) g.innerText = state.gems;
}
function showPopup(text) { toast(text); }
