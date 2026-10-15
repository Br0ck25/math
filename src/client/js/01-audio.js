if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

let audioCtx = null;
let isMuted = false;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playTone(freq, duration, type = 'sine', decay = true) {
  if (isMuted) return;
  initAudio();
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    if (decay) {
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    }

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

function soundTackle() {
  if (isMuted) return;
  initAudio();
  playTone(140, 0.08, 'sawtooth');
  setTimeout(() => playTone(110, 0.12, 'square'), 70);
}

function soundHitSlash() {
  if (isMuted) return;
  initAudio();
  playTone(550, 0.06, 'triangle');
  setTimeout(() => playTone(300, 0.1, 'sawtooth'), 50);
  setTimeout(() => playTone(150, 0.14, 'square'), 110);
}

function soundCoinChirp() {
  if (isMuted) return;
  initAudio();
  playTone(987.77, 0.05, 'triangle');
  setTimeout(() => playTone(1318.51, 0.12, 'triangle'), 40);
}

function soundSuperMove() {
  const notes = [220, 330, 440, 550, 660, 880];
  notes.forEach((freq, idx) => {
    setTimeout(() => playTone(freq, 0.15, 'sawtooth'), idx * 50);
  });
}

function soundShieldBreak() {
  playTone(600, 0.1, 'sine');
  setTimeout(() => playTone(400, 0.2, 'triangle'), 80);
}

// The little "ding-ding-dong" climbs a semitone for every answer in the combo (up to an octave), so a streak sounds like it is building.
function comboPitch(streak) { return Math.pow(2, Math.min(12, Math.max(0, (streak || 1) - 1)) / 12); }
function soundCorrect(streak) {
  const k = comboPitch(streak);
  playTone(523.25 * k, 0.09, 'triangle');
  setTimeout(() => playTone(659.25 * k, 0.09, 'triangle'), 75);
  setTimeout(() => playTone(783.99 * k, 0.20, 'triangle'), 150);
}

function soundWrong() {
  playTone(196, 0.15, 'sawtooth');
  setTimeout(() => playTone(164.81, 0.25, 'sawtooth'), 120);
}

function soundBuddyFaint() {
  const notes = [260, 220, 180, 140];
  notes.forEach((freq, idx) => {
    setTimeout(() => playTone(freq, 0.25, 'sawtooth'), idx * 90);
  });
}

function soundLevelUp() {
  const notes = [440, 554.37, 659.25, 880];
  notes.forEach((freq, idx) => {
    setTimeout(() => playTone(freq, 0.25, 'triangle'), idx * 90);
  });
}

function soundMonsterDefeated() {
  const notes = [300, 450, 600, 750, 950];
  notes.forEach((freq, idx) => {
    setTimeout(() => playTone(freq, 0.18, 'square'), idx * 70);
  });
}

function soundSecretFound() {
  const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
  notes.forEach((freq, idx) => {
    setTimeout(() => playTone(freq, 0.3, 'sine'), idx * 110);
  });
}

function soundClick() {
  playTone(400, 0.04, 'square');
}

function soundEscape() {
  playTone(330, 0.08, 'sawtooth');
  setTimeout(() => playTone(247, 0.14, 'sawtooth'), 60);
}

function toggleMute() {
  isMuted = !isMuted;
  document.getElementById('sound-icon').innerText = isMuted ? '🔇' : '🔊';
}

// 36 Bosses Total: Exactly 6 of each type (fire, water, nature, electric, dark, magic)
