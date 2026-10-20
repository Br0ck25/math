// =====================================================================
//  TOASTS + MODAL QUEUE (so popups never stack on top of each other)
// =====================================================================
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2400);
}

const modalQueue = [];
let modalBusy = false;
let clockPausedAt = null;
function pauseClock() { if (clockPausedAt === null) clockPausedAt = Date.now(); }
function resumeClock() {
  if (studyOn) return;                                         // the math question is not on screen while studying
  if (clockPausedAt !== null) { questionStartTime += Date.now() - clockPausedAt; clockPausedAt = null; }
}

// Simple modals: show/hide share one implementation. Overlay taps and Escape are handled in one place
// (see 32-keyboard.js) through the data-close attribute on each .modal-overlay in index.html.
function showModal(id, before) {
  soundClick();
  pauseClock();
  if (before) before();
  document.getElementById(id).style.display = 'flex';
}
function hideModal(id, after) {
  soundClick();
  document.getElementById(id).style.display = 'none';
  if (!openOverlays().length) resumeClock();               // a window opened on top of another (the buy confirmation) must not restart the question timer
  if (after) after();
}

function enqueueModal(openFn) {
  modalQueue.push(openFn);
  if (!modalBusy) nextModal();
}
function nextModal() {
  if (modalQueue.length === 0) { modalBusy = false; return; }
  modalBusy = true;
  pauseClock();
  const fn = modalQueue.shift();
  fn();
}
function modalDone() {
  modalBusy = false;
  resumeClock();
  setTimeout(function () { if (!modalBusy) nextModal(); }, 250);
}
