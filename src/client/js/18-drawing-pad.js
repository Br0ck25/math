// =====================================================================
//  DRAWING PAD  (docks above the keypad; strokes clear on a new problem)
// =====================================================================
const PAD_COLORS = ['#f8fafc', '#fde047', '#38bdf8', '#f472b6', '#4ade80', '#fb923c'];
const PAD_COLOR_NAMES = ['white', 'yellow', 'blue', 'pink', 'green', 'orange'];
const PAD_SIZES = [{ w: 2, t: 'S' }, { w: 4, t: 'M' }, { w: 8, t: 'L' }];
const pad = { open: false, strokes: [], cur: null, color: PAD_COLORS[0], sizeIdx: 1, eraser: false, used: false };

function padCanvas() { return document.getElementById('pad-canvas'); }

function padBuildTools() {
  const box = document.getElementById('pad-colors');
  box.innerHTML = '';
  PAD_COLORS.forEach(function (c, i) {
    const b = document.createElement('button');
    b.setAttribute('aria-label', 'Pen colour ' + PAD_COLOR_NAMES[i]);
    b.className = 'pad-color' + (c === pad.color && !pad.eraser ? ' active' : '');
    b.style.background = c;
    b.onclick = function () { pad.color = c; pad.eraser = false; padBuildTools(); padRefreshButtons(); };
    box.appendChild(b);
  });
  padRefreshButtons();
}
function padRefreshButtons() {
  document.getElementById('pad-eraser-btn').className = 'pad-btn' + (pad.eraser ? ' active' : '');
  document.getElementById('pad-size-btn').innerText = '● ' + PAD_SIZES[pad.sizeIdx].t;
}
function padCycleSize() { soundClick(); pad.sizeIdx = (pad.sizeIdx + 1) % PAD_SIZES.length; padRefreshButtons(); }
function padToggleEraser() { soundClick(); pad.eraser = !pad.eraser; padBuildTools(); }
function padToggleGrid() {
  soundClick();
  const w = document.getElementById('pad-wrap');
  const on = w.classList.toggle('grid');
  document.getElementById('pad-grid-btn').className = 'pad-btn' + (on ? ' active' : '');
}

function padLayout() {
  const sheet = document.getElementById('pad-sheet');
  const cont = document.querySelector('.game-container').getBoundingClientRect();
  const keys = document.querySelector('.keypad').getBoundingClientRect();
  sheet.style.left = cont.left + 'px';
  sheet.style.top = cont.top + 'px';
  sheet.style.width = cont.width + 'px';
  sheet.style.height = Math.max(150, keys.top - cont.top - 4) + 'px';
  padResize();
}
function padResize() {
  const c = padCanvas();
  const r = c.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  c.width = Math.max(1, Math.round(r.width * dpr));
  c.height = Math.max(1, Math.round(r.height * dpr));
  padRedraw();
}

function padStyle(ctx, s) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = s.w;
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
}
function padDrawStroke(ctx, s) {
  ctx.save();
  const dpr = window.devicePixelRatio || 1;
  ctx.scale(dpr, dpr);
  padStyle(ctx, s);
  const pts = s.points;
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], s.w / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  }
  ctx.restore();
}
function padRedraw() {
  const c = padCanvas();
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  pad.strokes.forEach(function (s) { padDrawStroke(ctx, s); });
}

function padPos(e) {
  const r = padCanvas().getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}
function padDown(e) {
  if (!pad.open) return;
  e.preventDefault();
  try { padCanvas().setPointerCapture(e.pointerId); } catch (err) {}
  const w = PAD_SIZES[pad.sizeIdx].w;
  pad.cur = { color: pad.color, w: pad.eraser ? w * 5 : w, erase: pad.eraser, points: [padPos(e)], pid: e.pointerId };
  pad.strokes.push(pad.cur);
  pad.used = true;
  padDrawStroke(padCanvas().getContext('2d'), pad.cur);
}
function padMove(e) {
  const s = pad.cur;
  if (!s || e.pointerId !== s.pid) return;
  e.preventDefault();
  const p = padPos(e);
  const last = s.points[s.points.length - 1];
  if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 0.6) return;
  s.points.push(p);
  const ctx = padCanvas().getContext('2d');
  ctx.save();
  const dpr = window.devicePixelRatio || 1;
  ctx.scale(dpr, dpr);
  padStyle(ctx, s);
  ctx.beginPath();
  ctx.moveTo(last[0], last[1]);
  ctx.lineTo(p[0], p[1]);
  ctx.stroke();
  ctx.restore();
}
function padUp(e) {
  if (pad.cur && e.pointerId === pad.cur.pid) pad.cur = null;
}

function padUndo() { soundClick(); pad.strokes.pop(); padRedraw(); }
function padClear() { soundClick(); pad.strokes = []; padRedraw(); }
// called when a new problem appears
function padReset() {
  pad.strokes = [];
  pad.cur = null;
  pad.used = false;
  if (pad.open) padRedraw();
  syncPad();
}

function syncPad() {
  const pe = document.getElementById('pad-problem');
  if (!pe) return;
  const p = currentProblem;
  let txt = '';
  if (p) {
    if (p.layout === 'vertical') txt = p.num1 + ' ' + p.operator + ' ' + p.num2 + ' = ?';
    else txt = p.expr + '  ' + (p.lead || '=') + ' ?';
  }
  pe.innerHTML = txt;
  document.getElementById('pad-answer').innerText = userInput === '' ? '?' : userInput;
}

function togglePad() {
  soundClick();
  pad.open = !pad.open;
  const sheet = document.getElementById('pad-sheet');
  sheet.classList.toggle('open', pad.open);
  document.getElementById('pad-open-btn').classList.toggle('on', pad.open);
  if (pad.open) { padLayout(); syncPad(); }
}

(function initPad() {
  const c = padCanvas();
  c.addEventListener('pointerdown', padDown);
  c.addEventListener('pointermove', padMove);
  c.addEventListener('pointerup', padUp);
  c.addEventListener('pointercancel', padUp);
  c.addEventListener('pointerleave', padUp);
  window.addEventListener('resize', function () { if (pad.open) padLayout(); });
  padBuildTools();
})();
