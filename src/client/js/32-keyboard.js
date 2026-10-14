// =====================================================================
//  KEYBOARD, OVERLAY TAPS AND ACCESSIBILITY
// =====================================================================
// A .modal-overlay with data-close="fnName" closes when its backdrop is tapped AND on Escape.
// data-esc="fnName" closes on Escape only (game screens, where a stray tap must not quit).
function openOverlays() {
  return Array.prototype.filter.call(document.querySelectorAll('.modal-overlay'), function (m) { return m.style.display === 'flex'; });
}
function closeTopOverlay() {
  const open = openOverlays();
  const top = open[open.length - 1];
  const fn = top && (top.dataset.close || top.dataset.esc);
  if (!fn || typeof window[fn] !== 'function') return false;
  window[fn]();
  return true;
}
document.addEventListener('click', function (e) {
  const t = e.target;
  if (t.classList && t.classList.contains('modal-overlay') && t.dataset.close && typeof window[t.dataset.close] === 'function') window[t.dataset.close]();
});
window.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && closeTopOverlay()) return;
  if (isModalOpen()) return;
  if (e.key >= '0' && e.key <= '9') pressKey(e.key);
  else if (e.key === 'Backspace') pressKey('backspace');
  else if (e.key === 'Enter') checkAnswer();
  else if (e.key === '-') pressKey('neg');
  else if (e.key === '.') pressKey('dot');
  else if (e.key === 'u' || e.key === 'U') triggerSuperMove();
  else if (e.key === 'p' || e.key === 'P') togglePad();
  else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') pressKey('clear');
});

// Dialog semantics for screen readers, plus live regions for the messages that change during play.
function initAccessibility() {
  Array.prototype.forEach.call(document.querySelectorAll('.modal-overlay'), function (m) {
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    const h = m.querySelector('h1, h2, h3');
    if (h) { if (!h.id) h.id = m.id + '-title'; m.setAttribute('aria-labelledby', h.id); }
    else m.setAttribute('aria-label', m.id.replace(/-modal$/, '').replace(/-/g, ' '));
  });
  ['toast', 'feedback-msg', 'streak-msg', 'hint-box', 'floating-popup'].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) { el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); }
  });
}

// Reduced motion: follows the device setting until the player picks one in Settings.
function motionReduced() {
  if (typeof state.reduceMotion === 'boolean') return state.reduceMotion;
  return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function applyMotionPref() {
  document.documentElement.classList.toggle('reduce-motion', motionReduced());
  const b = document.getElementById('motion-btn');
  if (b) b.innerText = motionReduced() ? '🐢 Motion: Reduced' : '✨ Motion: Full';
}
function toggleMotion() {
  soundClick();
  state.reduceMotion = !motionReduced();
  saveState();
  applyMotionPref();
}
