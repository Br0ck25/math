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

function renderHintUI() {
  const btn = document.getElementById('hint-btn');
  const box = document.getElementById('hint-box');
  if (!btn || !box) return;
  if (!hintUsed) box.innerText = '';
  btn.disabled = hintUsed || state.gems < ECON.hint.cost;
}
// After a wrong answer, show how to do it. The next problem waits long enough to read it.
let explainHold = 0;
function explainMistake() {
  const text = hintFor(currentProblem, false);
  if (!text) return;
  document.getElementById('hint-box').innerText = '📘 How to: ' + text;
  explainHold = 2600;
}
function useHint() {
  if (hintUsed || inputLocked) return;
  if (state.gems < ECON.hint.cost) { toast('You need ' + ECON.hint.cost + ' 💎 for a hint'); return; }
  state.gems -= ECON.hint.cost;
  hintUsed = true;
  statDay().h += 1;
  soundClick();
  document.getElementById('hint-box').innerText = '💡 ' + hintFor(currentProblem, true);
  saveState();
  updateStatsUI();
  renderHintUI();
}
