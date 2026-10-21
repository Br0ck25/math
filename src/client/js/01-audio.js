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

function soundCoinChirp() {
  if (isMuted) return;
  initAudio();
  playTone(987.77, 0.05, 'triangle');
  setTimeout(() => playTone(1318.51, 0.12, 'triangle'), 40);
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

function playNoiseBurst(duration, filterType, freqStart, freqEnd, vol) {
  if (isMuted) return;
  initAudio();
  try {
    const sampleRate = audioCtx.sampleRate || 44100;
    const len = Math.max(1, Math.floor(sampleRate * duration));
    const buf = audioCtx.createBuffer(1, len, sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const filter = audioCtx.createBiquadFilter();
    filter.type = filterType || 'bandpass';
    filter.frequency.setValueAtTime(freqStart || 600, audioCtx.currentTime);
    if (freqEnd && freqEnd !== freqStart) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), audioCtx.currentTime + duration);
    }
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol || 0.14, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    src.start();
    src.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

function soundElementHit(element) {
  if (isMuted) return;
  initAudio();
  const elem = element || 'fire';
  if (elem === 'fire') {
    // Whooshing flames: low-pass swept noise + warm sawtooth burst
    playNoiseBurst(0.24, 'bandpass', 900, 260, 0.18);
    playTone(220, 0.12, 'sawtooth');
    setTimeout(() => playTone(165, 0.16, 'triangle'), 65);
  } else if (elem === 'water') {
    // Splashy wave: resonant high-to-mid noise + bubbly sine arpeggio
    playNoiseBurst(0.22, 'bandpass', 1400, 480, 0.15);
    playTone(392, 0.08, 'sine');
    setTimeout(() => playTone(523.25, 0.1, 'sine'), 45);
    setTimeout(() => playTone(659.25, 0.12, 'sine'), 90);
  } else if (elem === 'electric') {
    // Crackling electricity: high-pass noise bursts + fast square zaps
    playNoiseBurst(0.16, 'highpass', 1800, 3200, 0.14);
    playTone(880, 0.05, 'square');
    setTimeout(() => playTone(1320, 0.05, 'square'), 35);
    setTimeout(() => playTone(660, 0.1, 'sawtooth'), 70);
  } else if (elem === 'nature') {
    // Vine whip snap: crisp bandpass snap + woody triangle notes
    playNoiseBurst(0.14, 'bandpass', 1200, 600, 0.16);
    playTone(293.66, 0.07, 'triangle');
    setTimeout(() => playTone(440, 0.11, 'triangle'), 50);
  } else if (elem === 'dark') {
    // Shadow pulse: deep sub-bass sweep + minor-second dissonance
    playNoiseBurst(0.25, 'lowpass', 360, 90, 0.16);
    playTone(130.81, 0.16, 'sawtooth');
    setTimeout(() => playTone(123.47, 0.2, 'sawtooth'), 60);
  } else {
    // Magic star chime: shimmering high-frequency harmonic cascade
    playNoiseBurst(0.18, 'highpass', 2400, 4800, 0.09);
    playTone(587.33, 0.08, 'sine');
    setTimeout(() => playTone(880, 0.09, 'sine'), 45);
    setTimeout(() => playTone(1174.66, 0.14, 'triangle'), 90);
  }
}

function soundBuddyCry(idOrElem) {
  if (isMuted) return;
  initAudio();
  const str = String(idOrElem || 'dog');
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  h = Math.abs(h);
  let elem = str;
  if (typeof getSpecies === 'function') {
    const sp = getSpecies(str);
    if (sp && sp.element) elem = sp.element;
  }
  const baseMap = { fire: 349.23, water: 392.0, nature: 329.63, electric: 523.25, dark: 220.0, magic: 440.0 };
  const waveMap = { fire: 'sawtooth', water: 'sine', nature: 'triangle', electric: 'square', dark: 'sawtooth', magic: 'sine' };
  const ratios = [1, 1.125, 1.25, 1.333, 1.5, 1.667, 1.875, 2];
  const base = baseMap[elem] || 392.0;
  const wave = waveMap[elem] || 'triangle';
  const n1 = base * ratios[h % ratios.length];
  const n2 = base * ratios[(h >> 3) % ratios.length];
  const n3 = base * ratios[(h >> 6) % ratios.length];
  playTone(n1, 0.07, wave);
  setTimeout(() => playTone(n2, 0.07, wave), 55);
  setTimeout(() => playTone(n3, 0.13, wave), 110);
}

function soundCatchWobble(step) {
  if (isMuted) return;
  initAudio();
  const base = 320 + (step || 0) * 65;
  playTone(base, 0.06, 'sine');
  setTimeout(() => playTone(base * 1.25, 0.08, 'triangle'), 45);
}

function soundCatchSuccess() {
  if (isMuted) return;
  initAudio();
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, idx) => {
    setTimeout(() => playTone(f, idx === 3 ? 0.28 : 0.09, 'triangle'), idx * 80);
  });
}

let bgmOn = false;
let bgmTimer = null;
let bgmStep = 0;
const BGM_MELODY = [
  523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 587.33,
  523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 392.0
];

// Area music (Gold's per-place tunes): the tune, its speed and its voice follow where you are: a fight, a cave, a room, a town or the open road.
const BGM_TUNES = {
  route:  { notes: BGM_MELODY, ms: 280, wave: 'triangle', vol: 0.035 },
  town:   { notes: [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 523.25, 659.25, 587.33, 739.99, 880.0, 739.99, 587.33, 739.99, 880.0, 987.77], ms: 250, wave: 'triangle', vol: 0.035 },
  room:   { notes: [392.0, 493.88, 587.33, 493.88, 392.0, 440.0, 523.25, 440.0, 349.23, 440.0, 523.25, 440.0, 392.0, 329.63, 392.0, 293.66], ms: 340, wave: 'sine', vol: 0.04 },
  cave:   { notes: [220.0, 261.63, 329.63, 261.63, 220.0, 196.0, 220.0, 261.63, 246.94, 293.66, 369.99, 293.66, 246.94, 220.0, 196.0, 164.81], ms: 420, wave: 'triangle', vol: 0.045 },
  battle: { notes: [392.0, 466.16, 392.0, 349.23, 392.0, 466.16, 523.25, 466.16, 440.0, 523.25, 440.0, 392.0, 440.0, 523.25, 587.33, 523.25], ms: 190, wave: 'square', vol: 0.02 }
};
let bgmCtx = 'route';
function bgmContext() {
  try {
    if (typeof ab !== 'undefined' && ab) return 'battle';
    const m = typeof OW_MAPS !== 'undefined' && state && state.overworld && OW_MAPS[state.overworld.map];
    if (!m) return 'route';
    if (m.dark) return 'cave';
    if (m.room) return 'room';
    return m.rows.length <= 20 && /^[a-z]+$/.test(m.id) && typeof owTowns === 'function' && owTowns().indexOf(m.id) !== -1 ? 'town' : 'route';
  } catch (e) { return 'route'; }
}
function stepBgm() {
  if (!bgmOn || isMuted) return;
  initAudio();
  const ctx = bgmContext();
  if (ctx !== bgmCtx) { bgmCtx = ctx; bgmStep = 0; if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = setInterval(stepBgm, BGM_TUNES[ctx].ms); } }
  const tune = BGM_TUNES[bgmCtx];
  try {
    const freq = tune.notes[bgmStep % tune.notes.length];
    bgmStep++;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = tune.wave;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(tune.vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + tune.ms / 1000 * 0.8);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + tune.ms / 1000 * 0.82);
  } catch (e) {}
}

function toggleMusic() {
  bgmOn = !bgmOn;
  if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
  if (bgmOn && !isMuted) {
    stepBgm();
    bgmCtx = bgmContext(); bgmTimer = setInterval(stepBgm, BGM_TUNES[bgmCtx].ms);
  }
  const btn = document.getElementById('music-icon');
  if (btn) btn.innerText = bgmOn ? '🎵' : '🔕';
}

function toggleMute() {
  isMuted = !isMuted;
  if (isMuted && typeof stopSpeech === 'function') stopSpeech();
  const el = document.getElementById('sound-icon');
  if (el) el.innerText = isMuted ? '🔇' : '🔊';
}

// 36 Bosses Total: Exactly 6 of each type (fire, water, nature, electric, dark, magic)
