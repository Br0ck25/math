const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Each kind of celebration looks different, so a level-up, a streak and a boss win do not all feel the same.
const CONFETTI_KINDS = {
  basic: { n: 45, colors: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#38bdf8'], from: [[0.5, 0.5]], spread: 12, up: 0.7, rect: false },
  streak: { n: 70, colors: ['#f97316', '#fbbf24', '#fde047', '#ef4444'], from: [[0.5, 0.55]], spread: 15, up: 0.85, rect: true },
  level: { n: 60, colors: ['#fde047', '#fbbf24', '#ffffff', '#a5b4fc'], from: [[0.2, 1], [0.8, 1]], spread: 9, up: 1.7, rect: true },
  boss: { n: 70, colors: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#38bdf8', '#ef4444'], from: [[0, 0.4], [1, 0.4]], spread: 14, up: 0.9, rect: true }
};
function launchConfetti(kind) {
  if (motionReduced()) return;
  const k = CONFETTI_KINDS[kind] || CONFETTI_KINDS.basic;
  k.from.forEach(function (pt) {
    for (let i = 0; i < k.n; i++) {
      const dir = pt[0] === 0 ? 1 : pt[0] === 1 ? -1 : 0;     // side bursts fly inward
      particles.push({
        x: canvas.width * pt[0],
        y: canvas.height * pt[1],
        vx: (Math.random() - 0.5) * k.spread + dir * Math.random() * k.spread * 0.5,
        vy: (Math.random() - k.up) * k.spread,
        size: Math.random() * 8 + 4,
        color: k.colors[Math.floor(Math.random() * k.colors.length)],
        rect: k.rect,
        spin: Math.random() * Math.PI,
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015
      });
    }
  });
}

function updateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.25;
    p.alpha -= p.decay;

    if (p.alpha <= 0) {
      particles.splice(i, 1);
    } else {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      if (p.rect) {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin + p.x * 0.05);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  requestAnimationFrame(updateConfetti);
}
requestAnimationFrame(updateConfetti);
