// =====================================================================
//  SPEECH SYNTHESIS / ACCESSIBILITY (Option C: Hybrid Read Aloud)
// =====================================================================
let speechActive = false;

function isSpeechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';
}

function setSpeechActive(active) {
  speechActive = !!active;
  const arenaBtn = document.getElementById('arena-speak-btn');
  if (arenaBtn) arenaBtn.classList.toggle('speaking', speechActive);
  const studyBtn = document.getElementById('study-speak-btn');
  if (studyBtn) studyBtn.classList.toggle('speaking', speechActive);
}

function stopSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
  setSpeechActive(false);
}

function speakText(text, onEnd) {
  if (isMuted || !isSpeechSupported()) return;
  if (!text || !String(text).trim()) return;
  stopSpeech();
  try {
    const utt = new window.SpeechSynthesisUtterance(String(text).trim());
    utt.rate = 0.92;
    utt.pitch = 1.0;
    setSpeechActive(true);
    utt.onend = function () {
      setSpeechActive(false);
      if (typeof onEnd === 'function') onEnd();
    };
    utt.onerror = function () {
      setSpeechActive(false);
    };
    window.speechSynthesis.speak(utt);
  } catch (e) {
    setSpeechActive(false);
  }
}

function mathToWords(p) {
  if (!p) return '';
  if (p.layout === 'vertical') {
    const opMap = { '+': 'plus', '-': 'minus', '−': 'minus', '×': 'times', '*': 'times', '÷': 'divided by', '/': 'divided by' };
    const op = opMap[p.operator] || p.operator || 'plus';
    return 'What is ' + p.num1 + ' ' + op + ' ' + p.num2 + '?';
  }
  if (p.expr) {
    let t = String(p.expr).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    t = t.replace(/√\s*(\d+)/g, 'square root of $1');
    t = t.replace(/(\d+)\s*\/\s*(\d+)\s+of\s+(\d+)/g, '$1 over $2 of $3');
    t = t.replace(/(\d+)\s*\/\s*(\d+)/g, '$1 over $2');
    t = t.replace(/(\d+)\^2/g, '$1 squared');
    t = t.replace(/(\d+)\^3/g, '$1 cubed');
    t = t.replace(/(\d+)\^(\d+)/g, '$1 to the power of $2');
    t = t.replace(/×/g, ' times ').replace(/÷/g, ' divided by ').replace(/−/g, ' minus ');
    t = t.replace(/\s+/g, ' ').trim();
    if (/^(what|how|find|solve|calculate|which)\b/i.test(t)) return t;
    t = t.replace(/\s*=\s*\??$/, '');
    return 'What is ' + t + '?';
  }
  return '';
}

function studyToWords(q, opts) {
  if (!q) return '';
  let str = 'Question: ' + (q.q || '');
  if (Array.isArray(opts) && opts.length > 0) {
    const optStrs = opts.map(function (o, i) {
      const label = typeof o === 'string' ? o : (typeof fmtAns === 'function' ? fmtAns(o) : o);
      return 'Choice ' + (i + 1) + ': ' + label;
    });
    str += '. ' + optStrs.join('. ') + '.';
  }
  return str;
}

function speakCurrentProblem(force) {
  if (!force && (!state || !state.readAloud)) return;
  if (typeof currentProblem === 'undefined' || !currentProblem) return;
  const words = mathToWords(currentProblem);
  if (words) speakText(words);
}

function speakCurrentStudy(force) {
  if (!force && (!state || !state.readAloud)) return;
  if (typeof studyRound === 'undefined' || !studyRound || typeof studyScreen === 'undefined' || studyScreen !== 'card') return;
  const q = studyRound.qs && studyRound.qs[studyRound.i];
  if (!q) return;
  if (studyRound.phase === 'reveal') {
    speakText('The answer is: ' + q.a + (q.x ? '. ' + q.x : ''));
  } else {
    speakText(studyToWords(q, studyRound.opts));
  }
}

function applyReadAloudPref() {
  const btn = document.getElementById('read-aloud-btn');
  if (btn && state) {
    btn.innerText = state.readAloud ? '🗣️ Read aloud: ON' : '🗣️ Read aloud: OFF';
    btn.classList.toggle('active', !!state.readAloud);
    btn.setAttribute('aria-pressed', state.readAloud ? 'true' : 'false');
  }
  const arenaBtn = document.getElementById('arena-speak-btn');
  if (arenaBtn && state) {
    arenaBtn.title = state.readAloud ? 'Read problem aloud (Auto-Read is ON)' : 'Read problem aloud';
  }
}

function toggleReadAloud() {
  soundClick();
  state.readAloud = !state.readAloud;
  saveState();
  applyReadAloudPref();
  if (state.readAloud) {
    toast('🗣️ Read aloud turned ON');
    if (studyOn && typeof studyRound !== 'undefined' && studyRound && studyScreen === 'card') {
      speakCurrentStudy(true);
    } else {
      speakCurrentProblem(true);
    }
  } else {
    stopSpeech();
    toast('🗣️ Read aloud turned OFF');
  }
}
