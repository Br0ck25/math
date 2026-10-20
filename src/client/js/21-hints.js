// =====================================================================
//  HINTS  (1 gem shows the first step; no speed bonus on that problem)
// =====================================================================
let hintUsed = false;
const HINT_TIPS = {
  frac: 'Divide the number by the bottom of the fraction first, then multiply by the top.',
  mean: 'Add all the numbers up, then divide by how many numbers there are.',
  pow: 'The small number tells you how many times to multiply the big number by itself.',
  sqrt: 'Which number times itself gives this number?',
  order: 'Do brackets first, then × and ÷, and last + and −.',
  pct: 'Find 10% by moving the decimal one place, then build up from there.',
  dec: 'Line up the decimal points before you add or subtract.',
  neg: 'Same signs: add and keep the sign. Different signs: subtract and keep the sign of the bigger number.',
  alg: 'Do the opposite to both sides to get x alone.',
  log: 'Ask: what power of the small number gives the number in brackets?',
  quad: 'Find two numbers that multiply to the last number and add to the middle number.',
  deriv: 'Bring each power down in front and make the power one smaller.',
  integral: 'Raise each power by one, divide by the new power, then plug in the top number.',
  limit: 'Try factoring the top, or look at the biggest powers.'
};

// Short "how to" for a problem. withClue adds a hint about the answer itself (only for paid hints).
function hintFor(p, withClue) {
  const id = p.modeTag;
  const ones = function (n) { return Math.abs(n) % 10; };
  if (p.layout === 'vertical' && (id === 'add' || id === 'sub')) {
    const word = id === 'add' ? 'add' : 'subtract';
    const note = id === 'sub' && ones(p.num1) < ones(p.num2) ? ' (the top digit is smaller, so borrow from the next column!)' : '';
    return 'Start with the ones column: ' + word + ' ' + ones(p.num1) + ' and ' + ones(p.num2) + note + '.';
  }
  if (id === 'mul') {
    const m = p.expr.split(' × ');
    const a = parseInt(m[0], 10), b = parseInt(m[1], 10);
    const big = Math.max(a, b), small = Math.min(a, b);
    if (big > 10) {
      const tens = Math.floor(big / 10) * 10;
      return 'Split ' + big + ' into ' + tens + ' + ' + (big - tens) + '. First do ' + tens + ' × ' + small + ' = ' + (tens * small) + '.';
    }
    return 'Count by ' + big + 's, ' + small + ' times: ' + big + ', ' + (big * 2) + ', ' + (big * 3) + '…';
  }
  if (id === 'div') {
    const m = p.expr.split(' ÷ ');
    return 'Ask yourself: what times ' + m[1] + ' makes ' + m[0] + '? Try counting by ' + m[1] + 's.';
  }
  if (withClue === false) return HINT_TIPS[id] || '';
  const digits = String(Math.abs(p.answer)).replace('.', '').length;
  const clue = 'The answer ' + (p.answer < 0 ? 'is negative, ' : '') + 'has ' + digits + ' digit' + (digits === 1 ? '' : 's') + ' and starts with ' + String(Math.abs(p.answer)).charAt(0) + '.';
  return (HINT_TIPS[id] || 'Take it one small step at a time.') + ' ' + clue;
}

// Visual math manipulative generator for hints and the 5-second miss card
function mathManipulativeHtml(p) {
  if (!p) return '';
  const id = p.modeTag;
  if ((id === 'add' || id === 'sub') && typeof p.num1 === 'number' && typeof p.num2 === 'number') {
    const a = Math.abs(p.num1), b = Math.abs(p.num2);
    if (a <= 10 && b <= 10 && a + b <= 20) {
      let frames = '<div class="manip-box"><div class="ten-frame-wrap">';
      const totalSlots = (id === 'add' && a + b > 10) ? 20 : 10;
      for (let f = 0; f < totalSlots / 10; f++) {
        frames += '<div class="ten-frame">';
        for (let s = 0; s < 10; s++) {
          const idx = f * 10 + s;
          let cls = 'tf-dot';
          if (id === 'add') {
            if (idx < a) cls += ' a';
            else if (idx < a + b) cls += ' b';
          } else {
            if (idx < a - b) cls += ' a';
            else if (idx < a) cls += ' a cross';
          }
          frames += '<span class="' + cls + '"></span>';
        }
        frames += '</div>';
      }
      const cap = id === 'add' ? ('🔵 ' + a + ' + 🟡 ' + b + ' on Ten-Frame') : ('🔵 Start with ' + a + ', cross out ' + b);
      return frames + '</div><div class="manip-caption">' + cap + '</div></div>';
    }
    if (p.layout === 'vertical') {
      const o1 = a % 10, o2 = b % 10, t1 = Math.floor(a / 10), t2 = Math.floor(b / 10);
      const borrow = id === 'sub' && o1 < o2;
      const carry = id === 'add' && (o1 + o2 >= 10);
      return '<div class="manip-box"><div class="manip-cols">' +
        '<div class="manip-col"><span class="manip-col-lbl">TENS</span>' +
          (borrow ? '<span class="manip-borrow">' + (t1 - 1) + '</span><s style="opacity:0.5">' + t1 + '</s>' : (carry ? '<span class="manip-borrow">+1</span>' + t1 : String(t1))) +
          '<span>' + (id === 'add' ? '+' : '−') + (t2 || 0) + '</span></div>' +
        '<div class="manip-col hl"><span class="manip-col-lbl">ONES ★</span>' +
          (borrow ? '<span class="manip-borrow">' + (o1 + 10) + '</span>' : String(o1)) +
          '<span>' + (id === 'add' ? '+' : '−') + o2 + '</span></div>' +
        '</div><div class="manip-caption">' + (borrow ? 'Borrow 1 ten → ' + (o1 + 10) + ' − ' + o2 + ' in Ones column' : (carry ? 'Ones make ' + (o1 + o2) + ' → carry 1 ten!' : 'Step 1: Solve Ones column (' + o1 + (id === 'add' ? ' + ' : ' − ') + o2 + ')')) + '</div></div>';
    }
  }
  if (id === 'mul' && p.expr) {
    const m = p.expr.split(' × ');
    const a = parseInt(m[0], 10), b = parseInt(m[1], 10);
    if (a > 0 && b > 0 && a <= 10 && b <= 10) {
      let grid = '<div class="manip-box"><div class="manip-array">';
      const rows = Math.min(a, b), cols = Math.max(a, b);
      for (let r = 0; r < rows; r++) {
        grid += '<div class="manip-array-row">';
        for (let c = 0; c < cols; c++) grid += '<span class="manip-array-dot"></span>';
        grid += '</div>';
      }
      return grid + '</div><div class="manip-caption">' + rows + ' rows × ' + cols + ' dots in each row</div></div>';
    }
  }
  if (id === 'frac' && p.expr) {
    const fm = p.expr.match(/(\d+)\s*\/\s*(\d+)/);
    if (fm) {
      const num = parseInt(fm[1], 10), den = Math.min(12, Math.max(2, parseInt(fm[2], 10)));
      let slices = '';
      for (let i = 0; i < den; i++) {
        const a0 = (i / den) * Math.PI * 2 - Math.PI / 2;
        const a1 = ((i + 1) / den) * Math.PI * 2 - Math.PI / 2;
        const x0 = (21 + 18 * Math.cos(a0)).toFixed(1), y0 = (21 + 18 * Math.sin(a0)).toFixed(1);
        const x1 = (21 + 18 * Math.cos(a1)).toFixed(1), y1 = (21 + 18 * Math.sin(a1)).toFixed(1);
        const fill = i < num ? '#38bdf8' : 'rgba(148,163,184,0.22)';
        slices += '<path d="M21,21 L' + x0 + ',' + y0 + ' A18,18 0 0,1 ' + x1 + ',' + y1 + ' Z" fill="' + fill + '" stroke="#0f172a" stroke-width="1.2"/>';
      }
      return '<div class="manip-box"><div class="manip-pie-row"><svg class="manip-pie" viewBox="0 0 42 42">' + slices + '</svg>' +
        '<div class="manip-caption">' + num + ' of ' + den + ' equal slices shaded (' + num + '/' + den + ')</div></div></div>';
    }
  }
  return '';
}

let battleHintUsed = false;

function hintCost() {
  return (typeof hasTech === 'function' && hasTech('gentle_guide') && !battleHintUsed) ? 0 : ECON.hint.cost;
}

function renderHintUI() {
  const btn = document.getElementById('hint-btn');
  const box = document.getElementById('hint-box');
  const vis = document.getElementById('hint-visual');
  if (!btn || !box) return;
  if (!hintUsed) {
    box.innerText = '';
    if (vis) vis.innerHTML = '';
  }
  const cost = hintCost();
  btn.disabled = hintUsed || (cost > 0 && state.gems < cost);
  const costSpan = btn.querySelector('.hint-cost');
  if (costSpan) costSpan.innerText = cost === 0 ? 'Free' : cost + '💎';
}
// After a wrong answer, show how to do it. The next problem waits long enough to read it.
let explainHold = 0;
function explainMistake() {
  const text = hintFor(currentProblem, false);
  if (!text) return;
  document.getElementById('hint-box').innerText = '📘 How to: ' + text;
  explainHold = 2600;
}
// The "not quite" card: the right answer for 10 seconds, over the math area (equation and keypad) so the buddy stage stays in view, or until the player taps the ✕ / Got it / Escape or starts typing.
// It does not use showModal() on purpose: that pauses the problem clock, and the next problem is already running.
const MISS_CARD_MS = 10000;
let missCardTimer = null;
function showMissCard(said) {
  const p = currentProblem;
  const eq = p.expr ? p.expr.replace(/<[^>]+>/g, '') : p.num1 + ' ' + p.operator + ' ' + p.num2;
  document.getElementById('miss-eq').innerText = eq + ' = ?';
  document.getElementById('miss-said').innerText = 'You said ' + fmtAns(said);
  document.getElementById('miss-answer').innerText = fmtAns(p.answer);
  const how = hintFor(p, false);
  document.getElementById('miss-how').innerText = how ? '📘 ' + how : '';
  const mvis = document.getElementById('miss-visual');
  if (mvis) mvis.innerHTML = mathManipulativeHtml(p);
  const bar = document.getElementById('miss-bar');
  bar.style.animation = 'none';
  void bar.offsetWidth;
  bar.style.animation = '';
  bar.style.animationDuration = MISS_CARD_MS / 1000 + 's';
  const modal = document.getElementById('miss-modal');
  modal.style.display = 'flex';
  const top = Math.floor(document.querySelector('.arena').getBoundingClientRect().top);          // the card starts where the math area starts, below the buddy stage
  const room = window.innerHeight - top - 12;
  modal.style.setProperty('--miss-top', top + 'px');
  modal.style.setProperty('--miss-max', Math.max(120, room) + 'px');
  modal.classList.toggle('tight', room < 300);
  clearTimeout(missCardTimer);
  missCardTimer = setTimeout(closeMissCard, MISS_CARD_MS);
}
function closeMissCard() {
  clearTimeout(missCardTimer);
  document.getElementById('miss-modal').style.display = 'none';
}
function useHint() {
  if (hintUsed || inputLocked) return;
  const cost = hintCost();
  if (cost > 0 && state.gems < cost) { toast('You need ' + cost + ' 💎 for a hint'); return; }
  if (cost > 0) state.gems -= cost;
  battleHintUsed = true;
  hintUsed = true;
  statDay().h += 1;
  soundClick();
  document.getElementById('hint-box').innerText = '💡 ' + hintFor(currentProblem, true);
  const vis = document.getElementById('hint-visual');
  if (vis) vis.innerHTML = mathManipulativeHtml(currentProblem);
  saveState();
  updateStatsUI();
  renderHintUI();
}
