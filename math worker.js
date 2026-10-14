const MANIFEST = {
  name: "Math Quest - Gem Defender",
  short_name: "Math Quest",
  start_url: "/",
  display: "standalone",
  background_color: "#0f172a",
  theme_color: "#6366f1",
  orientation: "portrait",
  icons: [
    {
      src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%236366f1'/><text x='50%' y='68%' font-size='55' text-anchor='middle'>⚔️</text></svg>",
      sizes: "192x192 512x512",
      type: "image/svg+xml"
    }
  ]
};

const SW = `
const CACHE_NAME = 'math-quest-v28';
self.addEventListener('install', (e) => {
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).pathname.indexOf('/api/') === 0) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
`;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="theme-color" content="#0f172a" />
  <link rel="manifest" href="/manifest.json" />
  <title>Math Quest - Gem Defender</title>
  <style>
    :root {
      --bg-dark: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --accent: #f59e0b;
      --success: #10b981;
      --danger: #ef4444;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      user-select: none;
      -webkit-user-select: none;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      touch-action: manipulation;
    }

    html, body {
      height: 100%;
      height: 100dvh;
      overflow: hidden;
      margin: 0;
      padding: 0;
      background: radial-gradient(circle at top, #1e1b4b, var(--bg-dark));
      color: var(--text);
    }

    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    #confetti-canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 100;
    }

    /* Zero-Scroll Main Container */
    .game-container {
      width: 100%;
      max-width: 490px;
      height: 100%;
      height: 100dvh;
      max-height: 100dvh;
      background: var(--card-bg);
      border: 2px solid var(--card-border);
      border-radius: 20px;
      padding: 10px 14px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }

    .top-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: 6px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .stat-pill {
      background: #0f172a;
      border: 1px solid var(--card-border);
      padding: 5px 3px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      font-size: 0.8rem;
      white-space: nowrap;
    }

    .session-info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .xp-section {
      margin-bottom: 8px;
      flex-shrink: 0;
    }

    .xp-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.72rem;
      color: var(--text-muted);
      margin-bottom: 3px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .xp-bar-bg {
      height: 8px;
      background: #0f172a;
      border-radius: 999px;
      overflow: hidden;
      border: 1px solid var(--card-border);
    }

    .xp-bar-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #6366f1, #ec4899);
      transition: width 0.3s ease;
    }

    .mode-selector {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 5px;
      margin-bottom: 8px;
      flex-shrink: 0;
    }

    .mode-btn {
      background: #0f172a;
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      padding: 7px 2px;
      border-radius: 10px;
      font-size: 0.82rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
    }

    .mode-btn.active {
      background: var(--primary);
      border-color: #818cf8;
      color: #ffffff;
      box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
    }

    .battle-header {
      background: #0b1120;
      border: 1.5px solid var(--card-border);
      border-radius: 14px;
      padding: 8px 10px;
      margin-bottom: 8px;
      position: relative;
      overflow: hidden;
      flex-shrink: 0;
    }

    .battle-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .battle-title-badge {
      background: #1e1b4b;
      border: 1px solid #6366f1;
      color: #a5b4fc;
      font-size: 0.68rem;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 5px;
      letter-spacing: 0.6px;
      text-transform: uppercase;
    }

    .battle-goal-hint {
      font-size: 0.68rem;
      color: var(--text-muted);
      font-weight: 600;
    }

    .boss-taunt-box {
      background: #1e1b4b;
      border: 1px solid #4338ca;
      border-radius: 6px;
      padding: 3px 6px;
      font-size: 0.72rem;
      color: #fde047;
      text-align: center;
      margin-bottom: 5px;
      font-weight: 700;
      animation: fadeIn 0.3s ease;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .versus-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      position: relative;
      min-height: 44px;
    }

    .fighter {
      display: flex;
      align-items: center;
      gap: 6px;
      position: relative;
    }

    .fighter-icon-wrapper {
      position: relative;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .fighter-icon {
      font-size: 2.1rem;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      position: relative;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
    }

    .accessory-overlay {
      position: absolute;
      pointer-events: none;
      z-index: 5;
    }

    /* Head, Body, & Back Gear Styling */
    .acc-shades     { top: 13px; left: 7px; font-size: 1.25rem; }
    .acc-party      { top: -16px; left: 11px; font-size: 1.35rem; }
    .acc-tophat     { top: -14px; left: 9px; font-size: 1.35rem; }
    .acc-bowtie     { top: 22px; left: 14px; font-size: 1rem; }
    .acc-scarf      { top: 17px; left: 10px; font-size: 1.15rem; }
    .acc-pirate     { top: -12px; left: 8px; font-size: 1.35rem; }
    .acc-flower     { top: -14px; left: 8px; font-size: 1.3rem; }
    .acc-chef       { top: -15px; left: 9px; font-size: 1.35rem; }
    .acc-chain      { top: 20px; left: 13px; font-size: 1rem; }
    .acc-detective  { top: -14px; left: 8px; font-size: 1.35rem; }
    .acc-ninja      { top: 2px; left: 7px; font-size: 1.15rem; }
    .acc-scuba      { top: 11px; left: 9px; font-size: 1.25rem; }
    .acc-backpack   { top: 10px; left: -13px; font-size: 1.15rem; }
    .acc-wizard     { top: -15px; left: 9px; font-size: 1.35rem; }
    .acc-visor      { top: 12px; left: 8px; font-size: 1.25rem; }
    .acc-viking     { top: -14px; left: 8px; font-size: 1.3rem; }
    .acc-gloves     { top: 16px; left: -12px; font-size: 1.15rem; }
    .acc-headset    { top: -6px; left: 6px; font-size: 1.3rem; }
    .acc-medal      { top: 20px; left: 14px; font-size: 1rem; }
    .acc-armor      { top: 14px; left: 18px; font-size: 1.15rem; }
    .acc-tiara      { top: -12px; left: 10px; font-size: 1.2rem; }
    .acc-wand       { top: 12px; left: 22px; font-size: 1.25rem; transform: rotate(15deg); }
    .acc-crown      { top: -14px; left: 9px; font-size: 1.3rem; }
    .acc-halo       { top: -18px; left: 11px; font-size: 1.25rem; }
    .acc-space      { top: -13px; left: 8px; font-size: 1.35rem; }
    .acc-wings      { top: 6px; left: 24px; font-size: 1.35rem; }
    .acc-sword      { top: 12px; left: -15px; font-size: 1.25rem; transform: rotate(-30deg); }
    .acc-butterfly  { top: 6px; left: 22px; font-size: 1.35rem; }
    .acc-cape       { top: 16px; left: -14px; font-size: 1.35rem; transform: rotate(-15deg); }
    .acc-trophy     { top: 14px; left: -15px; font-size: 1.2rem; }
    .acc-flame      { top: -4px; left: -10px; font-size: 1.5rem; opacity: 0.85; }
    .acc-spark      { top: -6px; left: 22px; font-size: 1.35rem; }
    .acc-rainbow    { top: 14px; left: -16px; font-size: 1.3rem; transform: rotate(-25deg); }

    .acc-potterglass{ top: 11px; left: 6px; font-size: 1.25rem; }
    .acc-sortinghat { top: -16px; left: 8px; font-size: 1.45rem; }
    .acc-snitch     { top: -13px; left: 24px; font-size: 1.2rem; filter: drop-shadow(0 0 6px #facc15); }
    .acc-broom      { top: 16px; left: -16px; font-size: 1.35rem; transform: rotate(-25deg); }
    .acc-icecrown   { top: -12px; left: 7px; font-size: 1.15rem; filter: drop-shadow(0 0 6px #38bdf8); }
    .acc-rose       { top: 13px; left: 20px; font-size: 1.15rem; filter: drop-shadow(0 0 5px #ef4444); }
    .acc-slipper    { top: 18px; left: -14px; font-size: 1.15rem; filter: drop-shadow(0 0 6px #67e8f9); }
    .acc-lei        { top: 19px; left: 8px; font-size: 1.2rem; }
    .acc-fairywand  { top: 10px; left: 22px; font-size: 1.15rem; filter: drop-shadow(0 0 6px #a855f7); }

    .element-pill {
      font-size: 0.62rem;
      padding: 1px 5px;
      border-radius: 4px;
      font-weight: 800;
      margin-left: 3px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .elem-fire     { background: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444; }
    .elem-water    { background: #0c4a6e; color: #7dd3fc; border: 1px solid #0284c7; }
    .elem-electric { background: #713f12; color: #fef08a; border: 1px solid #eab308; }
    .elem-nature   { background: #14532d; color: #86efac; border: 1px solid #22c55e; }
    .elem-dark     { background: #27272a; color: #e4e4e7; border: 1px solid #71717a; }
    .elem-shadow   { background: linear-gradient(135deg, #4c1d95, #000000); color: #f5d0fe; border: 1px solid #c084fc; text-shadow: 0 0 4px #a855f7; }

    .battle-fx {
      position: absolute;
      font-size: 1.6rem;
      pointer-events: none;
      z-index: 20;
      opacity: 0;
    }

    .battle-fx.slash-right { animation: slashToMonster 0.4s ease-out forwards; }
    .battle-fx.slash-left  { animation: slashToPet 0.4s ease-out forwards; }
    .tackle-right          { animation: gbcTackleRight 0.45s steps(3, end); }
    .tackle-left           { animation: gbcTackleLeft 0.45s steps(3, end); }
    .hurt-flash            { animation: gbcHurtFlash 0.45s steps(2, start); }

    .fighter-info { text-align: left; }
    .fighter-tag {
      font-size: 0.65rem;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.4px;
    }
    .fighter-name {
      font-size: 0.9rem;
      font-weight: 800;
      color: var(--text);
    }

    .vs-badge {
      font-size: 0.8rem;
      font-weight: 900;
      color: #ef4444;
      background: #18181b;
      border: 1px solid #3f3f46;
      border-radius: 999px;
      padding: 2px 6px;
    }

    .battle-bars-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 6px;
    }

    .hp-label-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-muted);
      margin-bottom: 2px;
    }

    .hp-bar-bg {
      height: 7px;
      background: #1e293b;
      border-radius: 999px;
      overflow: hidden;
      border: 1px solid var(--card-border);
    }

    .hp-bar-fill {
      height: 100%;
      width: 100%;
      transition: width 0.25s ease;
    }
    .hp-bar-pet     { background: linear-gradient(90deg, #10b981, #38bdf8); }
    .hp-bar-monster { background: linear-gradient(90deg, #ef4444, #f59e0b); }

    .ultimate-container {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
      background: #090e1a;
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 4px 8px;
    }

    .ult-bar-bg {
      flex: 1;
      height: 8px;
      background: #1e293b;
      border-radius: 999px;
      overflow: hidden;
      border: 1px solid #334155;
    }

    .ult-bar-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #f59e0b, #ec4899);
      transition: width 0.25s ease;
    }

    .ult-btn {
      background: #374151;
      color: #9ca3af;
      border: 1px solid #4b5563;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 0.72rem;
      font-weight: 900;
      letter-spacing: 0.4px;
      cursor: not-allowed;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .ult-btn.ready {
      background: linear-gradient(90deg, #f59e0b, #ef4444);
      color: #ffffff;
      border-color: #fbbf24;
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.7);
      cursor: pointer;
      animation: pulseGlow 1s infinite alternate;
    }

    /* Compact Dynamic Arena */
    .arena {
      background: #0f172a;
      border: 2px solid var(--card-border);
      border-radius: 16px;
      padding: 6px 12px;
      text-align: center;
      position: relative;
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }

    .streak-banner {
      min-height: 18px;
      font-size: 0.78rem;
      font-weight: 800;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 2px;
    }

    .floating-popup {
      position: absolute;
      top: 20%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 1.3rem;
      font-weight: 900;
      color: #facc15;
      text-shadow: 0 0 10px rgba(245, 158, 11, 0.8);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s, transform 0.5s ease-out;
      z-index: 10;
    }

    .floating-popup.show {
      opacity: 1;
      transform: translate(-50%, -100%) scale(1.15);
    }

    #equation-mount {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      flex: 1;
      min-height: 0;
    }

    /* Horizontal Inline Equation (Multiplication) */
    .equation-inline {
      font-size: clamp(1.8rem, 4.5vh, 2.5rem);
      font-weight: 900;
      letter-spacing: 2px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
    }

    /* Vertical Column Stack Equation (Addition & Subtraction) */
    .equation-vertical {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-end;
      font-size: clamp(1.6rem, 4.2vh, 2.5rem);
      font-weight: 900;
      letter-spacing: 3px;
      line-height: 1.05;
      margin: auto 0;
    }

    .vertical-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      width: 100%;
    }

    .vertical-row.bottom-row {
      border-bottom: 3.5px solid #64748b;
      padding-bottom: 2px;
      margin-bottom: 3px;
      display: flex;
      justify-content: space-between;
      gap: 14px;
    }

    .vertical-op {
      font-size: clamp(1.4rem, 3.8vh, 2.2rem);
      color: #94a3b8;
    }

    .answer-box {
      min-width: 95px;
      height: clamp(34px, 5vh, 46px);
      border-bottom: 3.5px solid var(--primary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: clamp(1.6rem, 4.2vh, 2.3rem);
      color: #38bdf8;
      padding: 0 8px;
      transition: all 0.15s ease;
    }

    .answer-box.correct {
      border-bottom-color: var(--success);
      color: var(--success);
      animation: pop 0.25s ease;
    }

    .answer-box.wrong {
      border-bottom-color: var(--danger);
      color: var(--danger);
      animation: shake 0.3s ease;
    }

    .feedback-msg {
      font-size: 0.82rem;
      font-weight: 700;
      min-height: 16px;
      color: var(--text-muted);
      margin-top: 1px;
    }

    /* Large Tap Keypad Filling Viewport Proportions */
    .keypad {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(4, 1fr);
      gap: 6px;
      height: clamp(165px, 26vh, 220px);
      flex-shrink: 0;
    }

    .key-btn {
      background: #0f172a;
      border: 1px solid var(--card-border);
      color: var(--text);
      font-size: 1.55rem;
      font-weight: 800;
      border-radius: 12px;
      cursor: pointer;
      transition: background 0.08s, transform 0.05s;
      box-shadow: 0 4px 0 #090d16;
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: manipulation;
    }

    .key-btn:active {
      transform: translateY(2px);
      box-shadow: 0 2px 0 #090d16;
    }

    .key-btn.action-btn {
      background: #334155;
      font-size: 1.4rem;
    }

    .key-btn.submit-btn {
      background: var(--primary);
      color: #fff;
      font-size: 1.3rem;
      box-shadow: 0 4px 0 #3730a3;
    }

    .bottom-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      margin-top: 8px;
      gap: 5px;
      flex-shrink: 0;
    }

    .btn-secondary {
      background: transparent;
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      border-radius: 8px;
      padding: 7px 2px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      white-space: nowrap;
      touch-action: manipulation;
    }

    .btn-secondary:hover { color: var(--text); border-color: #64748b; }
    .btn-secondary.danger:hover { color: var(--danger); border-color: var(--danger); }

    @media (max-height: 720px) {
      .game-container { padding: 6px 10px; border-radius: 14px; }
      .top-bar { margin-bottom: 3px; gap: 4px; }
      .stat-pill { padding: 3px 2px; font-size: 0.72rem; }
      .session-info-row { margin-bottom: 3px; font-size: 0.68rem; }
      .xp-section { margin-bottom: 4px; }
      .xp-bar-bg { height: 6px; }
      .mode-selector { margin-bottom: 4px; gap: 4px; }
      .mode-btn { padding: 4px 2px; font-size: 0.75rem; border-radius: 8px; }
      .battle-header { padding: 5px 8px; margin-bottom: 5px; }
      .battle-title-row { margin-bottom: 2px; }
      .boss-taunt-box { padding: 2px 4px; font-size: 0.68rem; margin-bottom: 3px; }
      .versus-row { min-height: 38px; }
      .fighter-icon-wrapper { width: 38px; height: 38px; }
      .fighter-icon { font-size: 1.8rem; width: 36px; height: 36px; }
      .fighter-name { font-size: 0.82rem; }
      .fighter-tag { font-size: 0.6rem; }
      .battle-bars-container { margin-top: 3px; gap: 6px; }
      .hp-label-row { font-size: 0.68rem; }
      .hp-bar-bg { height: 6px; }
      .ultimate-container { margin-top: 3px; padding: 2px 6px; }
      .ult-bar-bg { height: 6px; }
      .ult-btn { font-size: 0.68rem; padding: 2px 6px; }
      .arena { padding: 4px 8px; margin-bottom: 5px; }
      .streak-banner { min-height: 14px; font-size: 0.7rem; }
      .feedback-msg { min-height: 14px; font-size: 0.72rem; }
      .equation-vertical { font-size: clamp(1.4rem, 3.8vh, 1.9rem); line-height: 1.05; letter-spacing: 2px; }
      .equation-inline { font-size: clamp(1.4rem, 3.8vh, 1.9rem); }
      .vertical-op { font-size: clamp(1.2rem, 3.4vh, 1.7rem); }
      .answer-box { min-width: 80px; height: clamp(30px, 4.5vh, 36px); font-size: clamp(1.3rem, 3.6vh, 1.7rem); border-bottom-width: 3px; }
      .vertical-row.bottom-row { border-bottom-width: 2.5px; padding-bottom: 1px; margin-bottom: 2px; gap: 10px; }
      .keypad { height: clamp(140px, 24vh, 175px); gap: 5px; }
      .key-btn { font-size: 1.35rem; border-radius: 10px; box-shadow: 0 3px 0 #090d16; }
      .key-btn.action-btn { font-size: 1.2rem; }
      .key-btn.submit-btn { font-size: 1.15rem; }
      .bottom-bar { margin-top: 4px; gap: 4px; }
      .btn-secondary { padding: 4px 2px; font-size: 0.72rem; border-radius: 6px; }

      .acc-shades     { top: 11px; left: 5px; font-size: 1.1rem; }
      .acc-tophat     { top: -12px; left: 7px; font-size: 1.15rem; }
      .acc-pirate     { top: -10px; left: 6px; font-size: 1.15rem; }
      .acc-ninja      { top: 1px; left: 5px; font-size: 1rem; }
      .acc-wizard     { top: -13px; left: 7px; font-size: 1.2rem; }
      .acc-headset    { top: -5px; left: 4px; font-size: 1.1rem; }
      .acc-crown      { top: -12px; left: 7px; font-size: 1.15rem; }
      .acc-wings      { top: 4px; left: 20px; font-size: 1.15rem; }
      .acc-cape       { top: 12px; left: -12px; font-size: 1.15rem; }
      .acc-bowtie     { top: 18px; left: 11px; font-size: 0.85rem; }
      .acc-armor      { top: 12px; left: 15px; font-size: 1rem; }
      .acc-jetpack    { top: 4px; left: -12px; font-size: 1.05rem; }
      .acc-chain      { top: 16px; left: 11px; font-size: 0.85rem; }
      .acc-gloves     { top: 12px; left: -10px; font-size: 1rem; }
      .acc-scarf      { top: 14px; left: 8px; font-size: 1rem; }
      .acc-halo       { top: -15px; left: 9px; font-size: 1.1rem; }
      .acc-backpack   { top: 8px; left: -11px; font-size: 1rem; }
      .acc-viking     { top: -12px; left: 6px; font-size: 1.1rem; }
      .acc-chef       { top: -13px; left: 7px; font-size: 1.15rem; }
      .acc-party      { top: -14px; left: 9px; font-size: 1.15rem; }
      .acc-tiara      { top: -10px; left: 8px; font-size: 1.05rem; }
      .acc-scuba      { top: 9px; left: 7px; font-size: 1.05rem; }
      .acc-medal      { top: 16px; left: 12px; font-size: 0.85rem; }
      .acc-guitar     { top: 10px; left: 16px; font-size: 1.05rem; }
      .acc-flame      { top: -3px; left: -8px; font-size: 1.25rem; }
      .acc-spark      { top: -5px; left: 18px; font-size: 1.15rem; }
      .acc-rainbow    { top: 12px; left: -13px; font-size: 1.1rem; }
      .acc-visor      { top: 10px; left: 6px; font-size: 1.1rem; }
      .acc-flower     { top: -12px; left: 6px; font-size: 1.15rem; }
      .acc-space      { top: -11px; left: 6px; font-size: 1.2rem; }
      .acc-sword      { top: 10px; left: -13px; font-size: 1.1rem; }
      .acc-wand       { top: 10px; left: 18px; font-size: 1.1rem; }
      .acc-butterfly  { top: 4px; left: 18px; font-size: 1.15rem; }
      .acc-trophy     { top: 12px; left: -13px; font-size: 1.05rem; }
      .acc-detective  { top: -12px; left: 6px; font-size: 1.15rem; }
      .acc-potterglass{ top: 10px; left: 5px; font-size: 1.1rem; }
      .acc-sortinghat { top: -14px; left: 6px; font-size: 1.25rem; }
      .acc-snitch     { top: -10px; left: 20px; font-size: 1.05rem; }
      .acc-broom      { top: 13px; left: -13px; font-size: 1.15rem; }
      .acc-icecrown   { top: -12px; left: 7px; font-size: 1.15rem; }
      .acc-rose       { top: 11px; left: 16px; font-size: 1rem; }
      .acc-slipper    { top: 15px; left: -11px; font-size: 1rem; }
      .acc-lei        { top: 16px; left: 7px; font-size: 1.05rem; }
      .acc-fairywand  { top: 10px; left: 18px; font-size: 1.15rem; }
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.75);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 200;
      padding: 12px;
      touch-action: manipulation;
    }

    .modal-content {
      background: var(--card-bg);
      border: 2px solid var(--card-border);
      border-radius: 18px;
      padding: 18px;
      width: 100%;
      max-width: 440px;
      text-align: center;
      max-height: 88vh;
      overflow-y: auto;
    }

    .pet-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin: 10px 0;
    }

    .pet-card {
      background: #0f172a;
      border: 2px solid var(--card-border);
      border-radius: 12px;
      padding: 8px 3px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      transition: all 0.2s;
      touch-action: manipulation;
    }

    .pet-card.selected { border-color: #6366f1; background: #1e1b4b; }
    .pet-card.locked   { opacity: 0.55; }
    .pet-card.fainted  { opacity: 0.38; filter: grayscale(1); border-color: #ef4444; }

    .mystery-section-title {
      font-size: 0.8rem;
      font-weight: 800;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 14px;
      margin-bottom: 6px;
      text-align: left;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 3px;
    }

    .loot-card {
      background: linear-gradient(135deg, #1e1b4b, #312e81);
      border: 2px solid #818cf8;
      border-radius: 16px;
      padding: 16px 12px;
      margin: 12px 0;
      box-shadow: 0 0 25px rgba(99, 102, 241, 0.5);
      animation: lootPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .loot-icon {
      font-size: 3.2rem;
      margin-bottom: 6px;
      filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
    }

    .stats-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 0.85rem;
      text-align: left;
    }

    .stats-table td {
      padding: 6px 4px;
      border-bottom: 1px solid var(--card-border);
    }

    .stats-table td:last-child {
      text-align: right;
      font-weight: 800;
      color: #38bdf8;
    }

    #vault-modal .modal-content {
      background: radial-gradient(circle at center, #78350f, #1e1b4b);
      border: 3px solid #f59e0b;
      box-shadow: 0 0 35px rgba(245, 158, 11, 0.6);
    }

    .vault-timer-display {
      font-size: 2rem;
      font-weight: 900;
      color: #fbbf24;
      text-shadow: 0 0 12px rgba(245, 158, 11, 0.8);
      margin-bottom: 6px;
    }

    .vault-equation {
      font-size: 2.2rem;
      font-weight: 900;
      color: #ffffff;
      margin: 10px 0;
      text-shadow: 0 2px 8px rgba(0,0,0,0.6);
    }

    .vault-answers-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 10px;
    }

    .vault-btn {
      background: #b45309;
      color: #fff;
      border: 2px solid #fde047;
      border-radius: 12px;
      padding: 14px 4px;
      font-size: 1.5rem;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 0 4px 0 #78350f;
      transition: all 0.08s ease;
      touch-action: manipulation;
    }

    .vault-btn:active {
      transform: translateY(2px);
      box-shadow: 0 2px 0 #78350f;
    }

    @keyframes lootPop {
      0%   { transform: scale(0.4) rotate(-10deg); opacity: 0; }
      70%  { transform: scale(1.1) rotate(4deg); opacity: 1; }
      100% { transform: scale(1) rotate(0deg); }
    }
    @keyframes pop {
      0%   { transform: scale(1); }
      50%  { transform: scale(1.15); }
      100% { transform: scale(1); }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-6px); }
      40%, 80% { transform: translateX(6px); }
    }
    @keyframes pulseGlow {
      from { transform: scale(1); filter: brightness(1); }
      to   { transform: scale(1.05); filter: brightness(1.2); }
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes gbcTackleRight {
      0%   { transform: translate(0, 0); }
      30%  { transform: translate(-8px, 4px); }
      60%  { transform: translate(32px, -8px); }
      80%  { transform: translate(16px, -4px); }
      100% { transform: translate(0, 0); }
    }
    @keyframes gbcTackleLeft {
      0%   { transform: translate(0, 0); }
      30%  { transform: translate(8px, -4px); }
      60%  { transform: translate(-32px, 8px); }
      80%  { transform: translate(-16px, 4px); }
      100% { transform: translate(0, 0); }
    }
    @keyframes gbcHurtFlash {
      0%   { opacity: 1; transform: translate(0, 0); filter: brightness(1); }
      15%  { opacity: 0; transform: translate(-6px, 0); filter: brightness(3); }
      30%  { opacity: 1; transform: translate(6px, -4px); }
      45%  { opacity: 0; transform: translate(-4px, 2px); filter: brightness(3); }
      60%  { opacity: 1; transform: translate(4px, 0); }
      80%  { opacity: 0.4; transform: translate(-2px, 0); }
      100% { opacity: 1; transform: translate(0, 0); filter: brightness(1); }
    }
    @keyframes slashToMonster {
      0%   { opacity: 0; transform: translate(40px, -10px) scale(0.6) rotate(-20deg); }
      40%  { opacity: 1; transform: translate(180px, 0px) scale(1.3) rotate(15deg); }
      80%  { opacity: 1; transform: translate(220px, 6px) scale(1.4) rotate(40deg); }
      100% { opacity: 0; transform: translate(240px, 10px) scale(0.8) rotate(45deg); }
    }
    @keyframes slashToPet {
      0%   { opacity: 0; transform: translate(-40px, 10px) scale(0.6) rotate(20deg); }
      40%  { opacity: 1; transform: translate(-180px, 0px) scale(1.3) rotate(-15deg); }
      80%  { opacity: 1; transform: translate(-220px, -6px) scale(1.4) rotate(-40deg); }
      100% { opacity: 0; transform: translate(-240px, -10px) scale(0.8) rotate(-45deg); }
    }

    /* ===== v2 additions ===== */
    .elem-magic    { background: #581c87; color: #f0abfc; border: 1px solid #d946ef; text-shadow: 0 0 4px #c026d3; }

    .practice-row {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 6px;
      align-items: center;
      margin-bottom: 8px;
      flex-shrink: 0;
      background: #0f172a;
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 7px 10px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 800;
    }
    .practice-row:active { background: #1e1b4b; }
    #grade-chip { color: #a5b4fc; }
    #ops-chip { color: #fde047; letter-spacing: 1px; }
    .practice-gear { color: var(--text-muted); }

    .lv-tag { font-size: 0.62rem; color: #fde047; font-weight: 800; margin-left: 3px; }
    .fighter-info { max-width: 112px; }
    .fighter-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .card-name { font-weight: 800; font-size: 0.78rem; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 0 2px; }
    .empty-note { grid-column: span 3; font-size: 0.75rem; color: var(--text-muted); padding: 8px 4px; font-style: italic; }

    /* evolution glow */
    .fighter-icon.stage-1, .icon-wrap.stage-1 { filter: drop-shadow(0 0 5px rgba(250, 204, 21, 0.95)); }
    .fighter-icon.stage-2, .icon-wrap.stage-2 { filter: drop-shadow(0 0 8px rgba(236, 72, 153, 0.95)) drop-shadow(0 0 3px #ffffff); }
    .fighter-icon.boss-stage-1 { filter: drop-shadow(0 0 6px rgba(249, 115, 22, 0.95)); }
    .fighter-icon.boss-stage-2 { filter: drop-shadow(0 0 9px rgba(239, 68, 68, 1)) drop-shadow(0 0 3px #fff); font-size: 2.4rem; }

    /* keypad: 4 columns with +/- and decimal point */
    .keypad { grid-template-columns: repeat(4, 1fr); }
    .key-btn.wide { grid-column: span 2; }

    /* generic equation layout (algebra, calculus...) */
    .equation-stack { display: flex; flex-direction: column; align-items: center; gap: 6px; max-width: 100%; }
    .eq-expr { font-size: clamp(1.1rem, 3.4vh, 1.7rem); font-weight: 800; letter-spacing: 1px; line-height: 1.25; text-align: center; max-width: 100%; word-break: break-word; }
    .eq-ans { display: flex; align-items: center; gap: 8px; font-size: clamp(1.1rem, 3.4vh, 1.6rem); font-weight: 900; }
    .eq-lead { color: #94a3b8; font-size: 0.85em; }
    sup, sub { font-size: 0.6em; line-height: 0; }

    /* settings */
    .settings-label { font-size: 0.78rem; font-weight: 800; color: #38bdf8; text-align: left; text-transform: uppercase; margin: 12px 0 6px; letter-spacing: 0.4px; }
    .settings-hint { font-size: 0.68rem; color: var(--text-muted); text-align: left; line-height: 1.35; margin-top: 4px; }
    .grade-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .grade-btn { background: #0f172a; border: 2px solid var(--card-border); color: var(--text-muted); border-radius: 10px; padding: 10px 2px; font-weight: 800; font-size: 0.85rem; cursor: pointer; }
    .grade-btn.active { background: var(--primary); border-color: #818cf8; color: #fff; box-shadow: 0 0 10px rgba(99, 102, 241, 0.45); }
    .ops-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .op-toggle { display: flex; align-items: center; gap: 6px; background: #0f172a; border: 2px solid var(--card-border); border-radius: 10px; padding: 7px 8px; color: var(--text-muted); cursor: pointer; text-align: left; }
    .op-toggle.on { border-color: #10b981; background: #052e22; color: #fff; }
    .op-ic { font-weight: 900; min-width: 30px; text-align: center; color: #fde047; font-size: 0.85rem; }
    .op-lb { flex: 1; font-size: 0.7rem; font-weight: 700; line-height: 1.1; }
    .op-sw { font-size: 0.62rem; font-weight: 900; padding: 2px 5px; border-radius: 999px; background: #334155; }
    .op-toggle.on .op-sw { background: #10b981; color: #fff; }
    .danger-btn { width: 100%; margin-top: 14px; padding: 10px; border-radius: 10px; border: 1px solid #7f1d1d; background: #450a0a; color: #fca5a5; font-weight: 800; font-size: 0.85rem; cursor: pointer; }
    .type-chart { font-size: 0.68rem; color: var(--text-muted); text-align: left; line-height: 1.6; }

    /* toast */
    #toast { position: fixed; top: calc(env(safe-area-inset-top, 0px) + 10px); left: 50%; transform: translate(-50%, -20px); background: #1e1b4b; border: 1px solid #818cf8; color: #fff; padding: 8px 14px; border-radius: 999px; font-size: 0.8rem; font-weight: 800; z-index: 400; opacity: 0; pointer-events: none; transition: opacity 0.2s, transform 0.2s; max-width: 92%; text-align: center; }
    #toast.show { opacity: 1; transform: translate(-50%, 0); }

    /* evolution modal */
    #evo-modal .modal-content { background: radial-gradient(circle at center, #3b0764, #0f172a); border: 3px solid #a78bfa; box-shadow: 0 0 40px rgba(167, 139, 250, 0.6); }
    .evo-title { font-size: 1.15rem; font-weight: 900; color: #f5d0fe; margin-bottom: 12px; }
    .evo-row { display: flex; align-items: center; justify-content: center; gap: 14px; margin: 14px 0; min-height: 80px; }
    .evo-icon { font-size: 3.4rem; line-height: 1; display: flex; align-items: center; justify-content: center; min-width: 70px; }
    .evo-arrow { font-size: 1.6rem; color: #fde047; }
    .evo-row .evo-new { opacity: 0; }
    .evo-row.go .evo-from-wrap { animation: evoFlash 1.1s ease-in-out forwards; }
    .evo-row.go .evo-new { animation: evoReveal 0.8s ease-out 1s forwards; }
    @keyframes evoFlash { 0% { filter: brightness(1); } 50% { filter: brightness(6) drop-shadow(0 0 14px #fff); } 100% { filter: brightness(6); opacity: 0.25; } }
    @keyframes evoReveal { 0% { opacity: 0; transform: scale(0.3); filter: brightness(6); } 70% { opacity: 1; transform: scale(1.3); } 100% { opacity: 1; transform: scale(1); filter: brightness(1) drop-shadow(0 0 10px #facc15); } }

    /* ===== v3 additions: gear slots, armor, drawing pad ===== */
    .slot-head { top: -14px; left: 9px;  font-size: 1.3rem; }
    .slot-face { top: 12px;  left: 8px;  font-size: 1.2rem; }
    .slot-neck { top: 20px;  left: 13px; font-size: 1rem; }
    .slot-back { top: 8px;   left: -8px; font-size: 1.2rem; }
    .slot-side { top: 12px;  left: 22px; font-size: 1.2rem; }
    .slot-aura { top: -4px;  left: -4px; font-size: 1.4rem; opacity: 0.85; }
    .armor-overlay { position: absolute; pointer-events: none; z-index: 4; top: 17px; left: 12px; font-size: 1.05rem; opacity: 0.95; }
    .armor-overlay.t2 { filter: drop-shadow(0 0 3px #60a5fa); }
    .armor-overlay.t3 { filter: drop-shadow(0 0 5px #facc15) drop-shadow(0 0 2px #fff); }
    .armor-hp { font-size: 0.62rem; color: #7dd3fc; font-weight: 800; }
    @media (max-height: 720px) {
      .slot-head { top: -12px; left: 7px;  font-size: 1.1rem; }
      .slot-face { top: 10px;  left: 6px;  font-size: 1.05rem; }
      .slot-neck { top: 16px;  left: 11px; font-size: 0.85rem; }
      .slot-back { top: 6px;   left: -7px; font-size: 1.05rem; }
      .slot-side { top: 10px;  left: 18px; font-size: 1.05rem; }
      .slot-aura { top: -3px;  left: -3px; font-size: 1.2rem; }
      .armor-overlay { top: 14px; left: 10px; font-size: 0.9rem; }
    }

    .pad-open-btn { position: absolute; top: 4px; right: 6px; z-index: 6; background: #1e1b4b; border: 1px solid #6366f1; color: #fff; border-radius: 999px; width: 34px; height: 34px; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .pad-open-btn.on { background: var(--primary); }
    .pad-sheet { position: fixed; z-index: 150; display: none; flex-direction: column; background: #0b1120; border: 2px solid #6366f1; border-radius: 14px; overflow: hidden; touch-action: none; }
    .pad-sheet.open { display: flex; }
    .pad-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 10px; background: #1e1b4b; font-weight: 800; flex-shrink: 0; }
    .pad-problem { font-size: 1.05rem; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
    .pad-answer { font-size: 0.85rem; color: #38bdf8; white-space: nowrap; }
    .pad-canvas-wrap { flex: 1; min-height: 0; position: relative; background-color: #0b1120; }
    .pad-canvas-wrap.grid { background-image: linear-gradient(rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.14) 1px, transparent 1px); background-size: 28px 28px; }
    #pad-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; touch-action: none; cursor: crosshair; }
    .pad-tools { display: flex; flex-wrap: wrap; gap: 5px; padding: 6px; background: #0f172a; border-top: 1px solid var(--card-border); align-items: center; justify-content: center; flex-shrink: 0; }
    .pad-color { width: 24px; height: 24px; border-radius: 50%; border: 3px solid transparent; cursor: pointer; padding: 0; }
    .pad-color.active { border-color: #fff; }
    .pad-btn { background: #1e293b; border: 1px solid var(--card-border); color: #e2e8f0; border-radius: 8px; padding: 5px 8px; font-size: 0.76rem; font-weight: 800; cursor: pointer; }
    .pad-btn.active { background: var(--primary); border-color: #818cf8; color: #fff; }

    /* ===== v5 additions: streak calendar + hints ===== */
    .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin: 10px 0; }
    .cal-cell { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 10px; background: #0f172a; border: 2px solid var(--card-border); font-size: 0.8rem; font-weight: 800; color: var(--text-muted); }
    .cal-cell.filled { background: #422006; border-color: #f59e0b; color: #fde047; }
    .cal-cell.today { box-shadow: 0 0 0 2px #fff; }
    .cal-cell.chest { font-size: 1.15rem; }
    .cal-cell.chest.ready { background: #78350f; border-color: #fbbf24; cursor: pointer; animation: pulseGlow 1s infinite alternate; }
    .cal-cell.chest.opened { opacity: 0.5; border-color: #10b981; }
    .cal-cell small { font-size: 0.55rem; line-height: 1; }
    .hint-btn { position: absolute; top: 4px; left: 6px; z-index: 6; background: #1e1b4b; border: 1px solid #fbbf24; color: #fde047; border-radius: 999px; width: 34px; height: 34px; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .hint-btn .hint-cost { position: absolute; bottom: -5px; right: -6px; background: #0f172a; border: 1px solid #fbbf24; border-radius: 999px; font-size: 0.5rem; font-weight: 900; line-height: 1; padding: 2px 3px; }
    .arena .streak-banner { padding: 0 44px; text-align: center; }
    .hint-btn:disabled { opacity: 0.45; cursor: default; }
    .hint-box { min-height: 0; font-size: 0.8rem; font-weight: 700; color: #fde68a; text-align: center; padding: 0 12px; }
    .hint-box:empty { display: none; }

    .bottom-bar { grid-template-columns: repeat(5, 1fr); gap: 3px; }
    .bottom-bar .btn-secondary { font-size: 0.64rem; padding: 6px 1px; gap: 2px; }
    .fighter-icon-wrapper { cursor: pointer; }
    .mood-bubble { position: absolute; top: -12px; right: -8px; font-size: 1.1rem; pointer-events: none; opacity: 0; z-index: 4; }
    .mood-bubble.show { animation: moodFloat 1.8s ease-out forwards; }
    @keyframes moodFloat { 0% { opacity: 0; transform: translateY(6px) scale(0.5); } 20% { opacity: 1; transform: translateY(-2px) scale(1.2); } 80% { opacity: 1; } 100% { opacity: 0; transform: translateY(-14px) scale(1); } }
    @keyframes happyBounce { 0%, 100% { transform: translateY(0) scale(1); } 25% { transform: translateY(-12px) scale(1.12, 0.92); } 50% { transform: translateY(0) scale(0.94, 1.06); } 75% { transform: translateY(-6px) scale(1.05); } }
    .happy-bounce { animation: happyBounce 0.9s ease-out; }
    @keyframes sleepySway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
    .hub-head { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .hub-head .nav { background: #1e293b; border: 1px solid var(--card-border); color: var(--text); border-radius: 10px; width: 40px; height: 54px; font-size: 1.4rem; cursor: pointer; }
    .hub-icon { font-size: 3rem; line-height: 1.1; transition: transform 0.2s; }
    .hub-icon.sleepy { opacity: 0.55; filter: grayscale(0.6); animation: sleepySway 2.4s ease-in-out infinite; }
    .hub-icon.bounce { animation: happyBounce 0.9s ease-out; }
    .hub-tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin: 8px 0; }
    .hearts { font-size: 1rem; letter-spacing: 2px; }
    .care-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; background: #0f172a; border: 1px solid var(--card-border); border-radius: 10px; padding: 7px 9px; margin: 5px 0; text-align: left; }
    .care-row .t { font-weight: 800; font-size: 0.82rem; }
    .care-row .d { font-size: 0.66rem; color: var(--text-muted); }
    .card-canvas { width: 100%; max-width: 300px; border-radius: 14px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5); display: block; margin: 6px auto; }
    .team-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin: 6px 0; }
    .team-chip { background: #0f172a; border: 2px solid var(--card-border); border-radius: 10px; padding: 4px 2px; cursor: pointer; font-size: 0.6rem; color: var(--text-muted); font-weight: 700; }
    .team-chip b { display: block; font-size: 1.5rem; }
    .team-chip.on { border-color: #fbbf24; background: #422006; color: #fde047; }
    .tour-side { flex: 1; background: #0f172a; border: 1px solid var(--card-border); border-radius: 12px; padding: 6px; font-size: 0.7rem; font-weight: 800; }
    .tour-side .ic { font-size: 2.2rem; line-height: 1.1; }
    .tour-side.hit { animation: shake 0.3s; border-color: #ef4444; }
    .tour-hp { height: 7px; background: #1e293b; border-radius: 999px; overflow: hidden; margin-top: 3px; }
    .tour-hp i { display: block; height: 100%; background: #10b981; transition: width 0.3s; }
    .tour-hp.foe i { background: #ef4444; }
    .tour-eq { font-size: 1.7rem; font-weight: 900; margin: 10px 0 6px; min-height: 40px; }
    .tour-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    #duel-modal { padding: 8px; }
    .duel-wrap { width: 100%; max-width: 460px; height: min(96vh, 780px); display: flex; flex-direction: column; gap: 6px; position: relative; }
    .duel-half { flex: 1; min-height: 0; background: #0f172a; border: 3px solid var(--card-border); border-radius: 16px; padding: 8px 10px; display: flex; flex-direction: column; justify-content: space-between; text-align: center; transition: border-color 0.2s; }
    .duel-half.p1 { border-color: #38bdf8; }
    .duel-half.p2 { border-color: #f472b6; }
    .duel-half.flip { transform: rotate(180deg); }
    .duel-half.wrong { border-color: #ef4444; animation: shake 0.3s; }
    .duel-head { display: flex; align-items: center; justify-content: space-between; font-weight: 900; font-size: 0.85rem; }
    .duel-bar { height: 6px; background: #1e293b; border-radius: 999px; overflow: hidden; }
    .duel-bar i { display: block; height: 100%; background: linear-gradient(90deg, #6366f1, #10b981); transition: width 0.2s; }
    .duel-eq { font-size: 1.9rem; font-weight: 900; min-height: 46px; display: flex; align-items: center; justify-content: center; }
    .duel-half .tour-opts .vault-btn { padding: 10px 4px; font-size: 1.15rem; }
    .duel-mid { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 5; background: #1e1b4b; border: 2px solid #fbbf24; color: #fde047; border-radius: 999px; font-weight: 900; font-size: 0.75rem; padding: 3px 12px; cursor: pointer; }
    .duel-cover { position: absolute; inset: 0; z-index: 8; background: rgba(2, 6, 23, 0.94); border-radius: 16px; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 14px; text-align: center; }
    .duel-cover.show { display: flex; }
    .duel-count { font-size: 5rem; font-weight: 900; color: #fde047; }
    .rar-badge { font-size: 0.5rem; font-weight: 900; letter-spacing: 0.5px; border: 1px solid; border-radius: 999px; padding: 0 5px; margin: 0 auto 2px; width: fit-content; }
    .pet-card[onclick] { cursor: pointer; }
    .raid-chapter { font-size: 0.7rem; font-weight: 900; color: #fca5a5; letter-spacing: 1px; text-transform: uppercase; }
    .comic-grid { display: grid; grid-template-columns: 1fr; gap: 6px; }
    .comic-panel { display: flex; align-items: center; gap: 10px; background: #fef9c3; color: #1c1917; border: 3px solid #1c1917; border-radius: 6px; padding: 6px 10px; text-align: left; box-shadow: 3px 3px 0 #000; animation: fadeIn 0.4s both; }
    .comic-panel:nth-child(2) { margin-left: 14px; animation-delay: 0.35s; }
    .comic-panel:nth-child(3) { animation-delay: 0.7s; }
    .comic-icon { font-size: 2rem; flex-shrink: 0; }
    .comic-text { font-size: 0.82rem; font-weight: 800; line-height: 1.25; }
    .par-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin: 6px 0; }
    .par-tile { background: #0f172a; border: 1px solid var(--card-border); border-radius: 10px; padding: 6px 2px; text-align: center; }
    .par-tile b { display: block; font-size: 1.1rem; color: #fde047; }
    .par-tile span { font-size: 0.6rem; color: var(--text-muted); font-weight: 700; }
    .par-days { display: flex; align-items: flex-end; gap: 4px; height: 70px; margin: 4px 0; }
    .par-day { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; font-size: 0.55rem; color: var(--text-muted); font-weight: 700; }
    .par-day i { display: block; width: 100%; background: linear-gradient(0deg, #6366f1, #10b981); border-radius: 4px 4px 0 0; min-height: 2px; }
    .par-row { display: flex; align-items: center; gap: 6px; font-size: 0.74rem; margin: 3px 0; font-weight: 700; text-align: left; }
    .par-row .lbl { width: 42%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .par-row .bar { flex: 1; height: 8px; background: #1e293b; border-radius: 999px; overflow: hidden; border: 1px solid var(--card-border); }
    .par-row .bar i { display: block; height: 100%; }
    .par-row .pct { width: 64px; text-align: right; font-size: 0.68rem; }
    .par-goal { background: #0f172a; border: 1px solid var(--card-border); border-radius: 10px; padding: 8px; display: flex; flex-direction: column; gap: 6px; text-align: left; }
    .par-goal input, .par-goal select { background: #1e293b; color: var(--text); border: 1px solid var(--card-border); border-radius: 6px; padding: 5px 6px; font-size: 0.8rem; }
    .weak-chip { text-align: center; font-size: 0.72rem; font-weight: 900; color: #fecaca; margin: 2px 0 4px; animation: pulseGlow 1s infinite alternate; }
    .weak-chip:empty { display: none; }
    #equation-mount.weak-glow { border-radius: 14px; box-shadow: 0 0 0 2px #ef4444, 0 0 16px 3px rgba(239, 68, 68, 0.65); }
    .milestone-overlay { position: fixed; inset: 0; z-index: 90; display: none; align-items: center; justify-content: center; flex-direction: column; pointer-events: none; background: radial-gradient(circle, rgba(250, 204, 21, 0.25), transparent 65%); }
    .milestone-overlay.show { display: flex; animation: milestonePop 1.9s ease-out forwards; }
    .milestone-big { font-size: clamp(2rem, 9vw, 3.4rem); font-weight: 900; color: #fde047; text-shadow: 0 0 18px #f59e0b, 0 3px 0 #92400e; text-align: center; }
    .milestone-sub { font-size: 1.1rem; font-weight: 800; color: #fff; margin-top: 4px; }
    @keyframes milestonePop { 0% { opacity: 0; transform: scale(0.4); } 15% { opacity: 1; transform: scale(1.15); } 25% { transform: scale(1); } 80% { opacity: 1; } 100% { opacity: 0; transform: scale(1.05); } }
    @keyframes buddyDance { 0%, 100% { transform: translateY(0) rotate(0); } 20% { transform: translateY(-14px) rotate(-14deg); } 40% { transform: translateY(0) rotate(12deg); } 60% { transform: translateY(-12px) rotate(-10deg); } 80% { transform: translateY(0) rotate(8deg); } }
    .buddy-dance { animation: buddyDance 1.2s ease-in-out; }

    /* ===== v4 additions: daily quests + collection book ===== */
    .notif-dot { background: #ef4444; color: #fff; border-radius: 999px; padding: 0 5px; font-size: 0.62rem; font-weight: 900; margin-left: 3px; display: none; }
    .quest-card { background: #0f172a; border: 2px solid var(--card-border); border-radius: 12px; padding: 8px 10px; margin: 8px 0; text-align: left; }
    .quest-card.done { border-color: #10b981; background: #052e22; }
    .quest-card.claimed { opacity: 0.5; }
    .quest-title { font-weight: 800; font-size: 0.88rem; }
    .quest-bar { height: 8px; background: #1e293b; border-radius: 999px; overflow: hidden; margin: 6px 0 4px; border: 1px solid var(--card-border); }
    .quest-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #10b981); transition: width 0.3s; }
    .quest-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 0.72rem; color: var(--text-muted); font-weight: 700; }
    .claim-btn { background: linear-gradient(90deg, #f59e0b, #ef4444); color: #fff; border: 1px solid #fbbf24; border-radius: 8px; padding: 5px 10px; font-weight: 900; font-size: 0.78rem; cursor: pointer; animation: pulseGlow 1s infinite alternate; }
    .claim-btn:disabled { background: #334155; border-color: #475569; color: #94a3b8; animation: none; cursor: default; }
    .chest-card { background: linear-gradient(135deg, #78350f, #1e1b4b); border: 2px solid #f59e0b; border-radius: 12px; padding: 10px; margin: 10px 0; }

    .book-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 8px 0; }
    .book-progress { font-size: 0.78rem; font-weight: 800; color: #a5b4fc; margin: 2px 0 6px; }
    .ms-row { display: flex; gap: 5px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 4px; }
    .ms { flex: 0 0 auto; min-width: 66px; background: #0f172a; border: 1px solid var(--card-border); color: var(--text-muted); border-radius: 8px; padding: 4px 6px; font-size: 0.66rem; font-weight: 800; text-align: center; line-height: 1.25; cursor: default; }
    .ms.ready { border-color: #fbbf24; color: #fde047; background: #422006; cursor: pointer; animation: pulseGlow 1s infinite alternate; }
    .ms.claimed { border-color: #10b981; color: #6ee7b7; }
    .silhouette { filter: brightness(0) invert(0.3); opacity: 0.8; }
    .forms-row { display: flex; gap: 3px; justify-content: center; font-size: 0.85rem; min-height: 18px; }
    .book-sub { font-size: 0.72rem; color: var(--text-muted); text-align: left; margin: 2px 0 4px; }
    .btn-secondary { white-space: nowrap; }

    /* ===== v5: optional accounts ===== */
    input { -webkit-user-select: text; user-select: text; }
    .acct-input { width: 100%; background: #0f172a; border: 2px solid var(--card-border); color: #fff; border-radius: 10px; padding: 10px; font-size: 16px; margin-top: 6px; }
    .acct-input:focus { outline: none; border-color: #818cf8; }
    .acct-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
    .acct-signed { text-align: left; font-size: 0.9rem; font-weight: 800; color: #6ee7b7; }
    .acct-msg { font-size: 0.74rem; text-align: left; margin-top: 6px; line-height: 1.35; min-height: 14px; }
    .acct-msg.err { color: #fca5a5; }
    .acct-msg.ok { color: #6ee7b7; }
    .conflict-opt { background: #0f172a; border: 2px solid var(--card-border); border-radius: 12px; padding: 10px; margin: 8px 0; text-align: left; }
    .conflict-sum { font-size: 0.82rem; color: #cbd5e1; margin: 4px 0 8px; font-weight: 700; }
  </style>
</head>
<body>

  <canvas id="confetti-canvas"></canvas>

  <div class="game-container">
    <div class="top-bar">
      <div class="stat-pill" title="Active buddy level">
        <span>⭐ Lv <span id="lvl-display">1</span></span>
      </div>
      <div class="stat-pill" title="Math Gems">
        <span>💎 <span id="gems-display">0</span></span>
      </div>
      <div class="stat-pill" title="Current Streak">
        <span>🔥 <span id="streak-display">0</span></span>
      </div>
      <div class="stat-pill" title="Streak Shields Owned">
        <span>🛡️ <span id="shield-display">0</span></span>
      </div>
    </div>

    <!-- Active Session Tracker -->
    <div class="session-info-row">
      <span style="color:#38bdf8;">🎯 Session: <span id="session-count-text">0</span> / <span id="session-goal-text">25</span> Solved</span>
      <span id="clover-status" style="color:#4ade80; display:none;">🍀 2x Gems (0)</span>
      <span id="session-badge" style="color:var(--accent);">🎁 Reward at 25</span>
    </div>

    <div class="xp-section">
      <div class="xp-header">
        <span id="rank-display">Pup</span>
        <span>XP: <span id="xp-text">0/100</span></span>
      </div>
      <div class="xp-bar-bg">
        <div id="xp-bar" class="xp-bar-fill"></div>
      </div>
    </div>

    <!-- Practice settings shortcut -->
    <div class="practice-row" onclick="openSettings()">
      <span id="grade-chip">📚 Grades 3–5</span>
      <span id="ops-chip">➕ ➖ ✖️ ➗</span>
      <span class="practice-gear">⚙️</span>
    </div>

    <!-- Battle Arena -->
    <div class="battle-header" id="battle-header-arena">
      <div class="battle-title-row">
        <span class="battle-title-badge">⚔️ Monster Arena</span>
        <span class="battle-goal-hint" id="type-match-hint">Elemental Match: Normal</span>
      </div>

      <div class="boss-taunt-box" id="boss-taunt-box">
        Fire Drake: "You cannot calculate my flames!"
      </div>

      <div class="weak-chip" id="weak-chip"></div>

      <div class="versus-row">
        <div class="fighter">
          <div class="fighter-icon-wrapper" id="fighter-icon-wrapper" onclick="openHub()" title="Tap your buddy: care, trading card, tournament">
            <span class="fighter-icon" id="pet-fighter-icon">🐶</span>
            <span class="mood-bubble" id="mood-bubble"></span>
            <span class="armor-overlay" id="pet-armor-overlay"></span>
            <span class="accessory-overlay" id="pet-accessory-overlay"></span>
          </div>
          <div class="fighter-info">
            <div class="fighter-tag">Buddy <span id="pet-elem-badge" class="element-pill elem-nature">Nature</span><span class="lv-tag">Lv <span id="pet-level">1</span></span></div>
            <div class="fighter-name" id="pet-fighter-name">Pup</div>
          </div>
          <div class="battle-fx" id="pet-attack-fx">⚡</div>
        </div>
        <div class="vs-badge">VS</div>
        <div class="fighter" style="flex-direction: row-reverse; text-align: right;">
          <span class="fighter-icon" id="monster-icon">🐲</span>
          <div class="fighter-info" style="text-align: right;">
            <div class="fighter-tag"><span id="monster-elem-badge" class="element-pill elem-fire">Fire</span><span class="lv-tag">Lv <span id="monster-level">1</span></span></div>
            <div class="fighter-name" id="monster-name">Fire Drake</div>
          </div>
          <div class="battle-fx" id="monster-attack-fx">💥</div>
        </div>
      </div>

      <div class="battle-bars-container">
        <div>
          <div class="hp-label-row">
            <span style="color: #34d399;">Buddy HP</span>
            <span id="pet-hp-text">HP: 3/3</span>
          </div>
          <div class="hp-bar-bg">
            <div id="pet-hp-bar" class="hp-bar-fill hp-bar-pet"></div>
          </div>
        </div>
        <div>
          <div class="hp-label-row">
            <span style="color: #f87171;">Boss HP</span>
            <span id="monster-hp-text">HP: 4/4</span>
          </div>
          <div class="hp-bar-bg">
            <div id="monster-hp-bar" class="hp-bar-fill hp-bar-monster"></div>
          </div>
        </div>
      </div>

      <div class="ultimate-container">
        <div style="font-size:0.72rem; font-weight:800; color:#f59e0b;">ULTIMATE</div>
        <div class="ult-bar-bg">
          <div id="ult-bar" class="ult-bar-fill"></div>
        </div>
        <button id="ult-btn" class="ult-btn" onclick="triggerSuperMove()">LOCKED (0/3)</button>
      </div>
    </div>

    <!-- Arena Container (Zero-Scroll Flex Mount) -->
    <div class="arena">
      <button class="pad-open-btn" id="pad-open-btn" onclick="togglePad()" title="Drawing pad (P)">✏️</button>
      <button class="hint-btn" id="hint-btn" onclick="useHint()" title="Hint: spend 1 gem to see the first step">💡<span class="hint-cost">1💎</span></button>
      <div class="streak-banner" id="streak-msg">READY TO SOLVE?</div>
      <div class="floating-popup" id="floating-popup">CRITICAL HIT! 💥</div>
      
      <div id="equation-mount">
        <!-- Injected via renderEquationUI() -->
      </div>
      
      <div class="hint-box" id="hint-box"></div>
      <div class="feedback-msg" id="feedback-msg">Type your answer or use keypad!</div>
    </div>

    <!-- Keypad (4 columns: includes +/- and decimal point) -->
    <div class="keypad">
      <button class="key-btn" onclick="pressKey('7')">7</button>
      <button class="key-btn" onclick="pressKey('8')">8</button>
      <button class="key-btn" onclick="pressKey('9')">9</button>
      <button class="key-btn action-btn" onclick="pressKey('backspace')">⌫</button>

      <button class="key-btn" onclick="pressKey('4')">4</button>
      <button class="key-btn" onclick="pressKey('5')">5</button>
      <button class="key-btn" onclick="pressKey('6')">6</button>
      <button class="key-btn action-btn" onclick="pressKey('neg')">±</button>

      <button class="key-btn" onclick="pressKey('1')">1</button>
      <button class="key-btn" onclick="pressKey('2')">2</button>
      <button class="key-btn" onclick="pressKey('3')">3</button>
      <button class="key-btn action-btn" onclick="pressKey('dot')">.</button>

      <button class="key-btn wide" onclick="pressKey('0')">0</button>
      <button class="key-btn submit-btn wide" onclick="checkAnswer()">GO ➔</button>
    </div>

    <div class="bottom-bar">
      <button class="btn-secondary" onclick="openShop()">
        🐾 Sanctuary <span id="comp-count-badge" style="background:#6366f1;color:#fff;border-radius:999px;padding:0 4px;font-size:0.65rem;">1</span>
      </button>
      <button class="btn-secondary" onclick="openQuests()">
        📜 Quests<span class="notif-dot" id="quest-badge">0</span>
      </button>
      <button class="btn-secondary" onclick="openCal()">
        🔥 Days<span class="notif-dot" id="cal-badge">0</span>
      </button>
      <button class="btn-secondary" onclick="openBook()">
        📖 Book
      </button>
      <button class="btn-secondary" onclick="openSettings()">
        ⚙️ Settings
      </button>
    </div>
  </div>

  <!-- Sanctuary Modal with Expanded Gear & Elemental Badges -->
  <div class="modal-overlay" id="shop-modal" onclick="closeShopOnOverlay(event)">
    <div class="modal-content">
      <h2 style="margin-bottom: 4px; font-size: 1.3rem;">🐾 Companion Sanctuary</h2>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 10px;">
        Adopt companions, customize body gear, or buy boosters! You have <b style="color:#38bdf8;">💎 <span id="shop-gems">0</span></b>
      </p>

      <button class="grade-btn" style="width:100%; margin-bottom:8px;" onclick="closeShop(); openHub()">💖 Buddy care · 🃏 Trading cards · 🏆 Tournament</button>

      <!-- Consumables (All Increased by 30%) -->
      <div style="font-size:0.75rem; font-weight:800; color:#38bdf8; text-align:left; text-transform:uppercase; margin-bottom:4px;">🧪 Battle Supplies &amp; Items</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px;">
        <div style="background:#0f172a; border:1px solid #334155; border-radius:10px; padding:6px; text-align:left; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="font-weight:800; font-size:0.8rem;">🛡️ Streak Shield</div>
            <div style="font-size:0.68rem; color:var(--text-muted);">Blocks 1 mistake</div>
          </div>
          <button class="key-btn submit-btn" style="padding:4px; font-size:0.8rem; height:36px; margin-top:4px;" onclick="buyItem('shield', 20)">20 💎 Buy</button>
        </div>

        <div style="background:#0f172a; border:1px solid #334155; border-radius:10px; padding:6px; text-align:left; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="font-weight:800; font-size:0.8rem;">🍬 Rare Candy</div>
            <div style="font-size:0.68rem; color:var(--text-muted);">Active buddy gains +1 level</div>
          </div>
          <button class="key-btn submit-btn" style="padding:4px; font-size:0.8rem; height:36px; margin-top:4px;" id="candy-btn" onclick="buyItem('candy', 0)">-- 💎 Eat</button>
        </div>

        <div style="background:#0f172a; border:1px solid #334155; border-radius:10px; padding:6px; text-align:left; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="font-weight:800; font-size:0.8rem;">⚡ Ult Battery</div>
            <div style="font-size:0.68rem; color:var(--text-muted);">Fills Ultimate (3/3) instantly</div>
          </div>
          <button class="key-btn submit-btn" style="padding:4px; font-size:0.8rem; height:36px; margin-top:4px;" onclick="buyItem('ult', 33)">33 💎 Charge</button>
        </div>

        <div style="background:#0f172a; border:1px solid #334155; border-radius:10px; padding:6px; text-align:left; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="font-weight:800; font-size:0.8rem;">🍀 Lucky Clover</div>
            <div style="font-size:0.68rem; color:var(--text-muted);">2x Gems + 50% XP for 8 solves</div>
          </div>
          <button class="key-btn submit-btn" style="padding:4px; font-size:0.8rem; height:36px; margin-top:4px;" onclick="buyItem('clover', 25)">25 💎 Use</button>
        </div>
      </div>

      <!-- Body Armor (adds bonus HP) -->
      <div style="font-size:0.75rem; font-weight:800; color:#7dd3fc; text-align:left; text-transform:uppercase;">🛡️ Body Armor (bonus HP for every buddy)</div>
      <div class="pet-grid" id="armor-grid"></div>

      <!-- Wearable Gear & Body Accessories Grid -->
      <div style="font-size:0.75rem; font-weight:800; color:#fbbf24; text-align:left; text-transform:uppercase;">🎩 Accessories (cosmetic)</div>
      <div class="pet-grid" id="accessories-grid"></div>

      <!-- Exactly 25 Store Buddies with Rebuy Support -->
      <div style="font-size:0.75rem; font-weight:800; color:#a5b4fc; text-align:left; text-transform:uppercase; margin-top:12px;">Store Buddies (<span id="store-owned-count">0</span> / <span id="store-total-count">25</span>)</div>
      <div class="pet-grid" id="pet-grid"></div>

      <!-- Super-Rare Mythic Lore Section -->
      <div class="mystery-section-title" style="color:#d946ef;">
        ⚡ Mythic Legends: Potter &amp; Storybook (<span id="mythic-found-count">0</span> / <span id="mythic-total-count">22</span> Found)
      </div>
      <div style="font-size:0.68rem; color:var(--text-muted); text-align:left; margin-bottom:6px; line-height:1.3;">
        🌟 <em>Ultra Rare (4% rate)! Rescued with clean boss victories, 5+ streaks, and milestone achievements!</em>
      </div>
      <div class="pet-grid" id="mythic-pet-grid"></div>

      <!-- Ultra-Rare Anomaly: Janie -->
      <div class="mystery-section-title" style="color:#10b981;">
        🛸 Cosmic Anomaly: Janie (<span id="janie-found-count">0</span> / 1 Found)
      </div>
      <div style="font-size:0.68rem; color:var(--text-muted); text-align:left; margin-bottom:6px; line-height:1.3;">
        👽 <em>Lowest drop rate in the game (0.5% rate)! The ultimate extraterrestrial secret!</em>
      </div>
      <div class="pet-grid" id="janie-pet-grid"></div>

      <div class="mystery-section-title">
        ✨ Secret Rescued Companions (<span id="secret-found-count">0</span> / <span id="secret-total-count">150</span> Found)
      </div>
      <div style="font-size:0.68rem; color:var(--text-muted); text-align:left; margin-bottom:6px; line-height:1.3;">
        🏆 <em>Rescued rarely (12% rate) with clean flawless boss victories &amp; 5+ streaks!</em>
      </div>
      <div class="pet-grid" id="secret-pet-grid"></div>

      <button class="key-btn submit-btn" style="width: 100%; padding: 8px; margin-top: 8px; height: 44px; font-size:1rem;" onclick="closeShop()">Back to Game</button>
    </div>
  </div>

  <!-- Golden Vault Modal -->
  <div class="modal-overlay" id="vault-modal">
    <div class="modal-content">
      <div style="font-size: 2.2rem; margin-bottom: 2px;">🏆</div>
      <h2 style="color: #facc15; margin-bottom: 2px; font-size: 1.3rem;">THE GOLDEN VAULT!</h2>
      <p style="font-size: 0.8rem; color: #fef08a; margin-bottom: 6px;">
        Rapid-Fire Frenzy! Tap correct answers to harvest gems!
      </p>

      <div class="vault-timer-display" id="vault-timer">20s</div>
      <div style="font-size: 0.9rem; font-weight: 800; color: #38bdf8;">
        Gems Collected: +<span id="vault-gem-tally">0</span> 💎
      </div>

      <div class="vault-equation" id="vault-eq">5 + 4</div>

      <div class="vault-answers-grid" id="vault-options">
        <button class="vault-btn" onclick="vaultPick(0)">8</button>
        <button class="vault-btn" onclick="vaultPick(1)">9</button>
        <button class="vault-btn" onclick="vaultPick(2)">10</button>
      </div>
    </div>
  </div>

  <!-- Session Report Card Modal -->
  <div class="modal-overlay" id="report-modal">
    <div class="modal-content">
      <div style="font-size: 2.2rem; margin-bottom: 4px;">📊</div>
      <h2 style="margin-bottom: 2px; font-size: 1.3rem;">Session Report Card</h2>
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 10px;">Here is how you performed this session!</p>

      <table class="stats-table">
        <tr><td>Total Problems Solved</td><td id="rep-solved">0</td></tr>
        <tr><td>Correct Accuracy</td><td id="rep-accuracy">100%</td></tr>
        <tr><td>Fastest Solve Time</td><td id="rep-fastest">--</td></tr>
        <tbody id="rep-ops"></tbody>
        <tr><td>Secret Creatures Found</td><td id="rep-secrets">0</td></tr>
        <tr><td>Bosses Defeated</td><td id="rep-bosses">0</td></tr>
        <tr><td>Highest Buddy Level</td><td id="rep-best">1</td></tr>
      </table>

      <button class="key-btn submit-btn" style="width: 100%; padding: 8px; height: 44px; font-size:1rem;" onclick="closeReportModal()">Keep Practicing!</button>
    </div>
  </div>

  <!-- Session Goal Milestones Chest Modal -->
  <div class="modal-overlay" id="goal-modal">
    <div class="modal-content" style="border-color:#f59e0b;">
      <div style="font-size:2.6rem; margin-bottom:4px;">🎁</div>
      <h2 style="color:#facc15; margin-bottom:4px; font-size: 1.3rem;">Session Goal Reached!</h2>
      <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.3;">
        Amazing focus! You solved <span id="goal-done-num">25</span> math problems in this session!
      </p>

      <div class="loot-card">
        <div style="font-size:1.3rem; font-weight:800; color:#38bdf8; margin-bottom:4px;">+<span id="goal-reward-num">25</span> 💎 Bonus Gems</div>
        <div style="font-size:0.8rem; color:#a5b4fc;" id="goal-pet-reward-text">Bonus Milestone Reward Unlocked!</div>
      </div>

      <button class="key-btn submit-btn" style="width:100%; padding:8px; height: 44px; font-size:1rem;" onclick="closeGoalModal()">Awesome!</button>
    </div>
  </div>

  <!-- Rare Companion Loot Drop Modal -->
  <div class="modal-overlay" id="loot-modal">
    <div class="modal-content" id="loot-modal-border" style="border-color: #818cf8;">
      <span id="loot-modal-tag" style="font-size:0.7rem; font-weight:800; background:#312e81; color:#c7d2fe; padding:2px 8px; border-radius:999px; text-transform:uppercase;">🌟 Rare Encounter!</span>
      <h2 style="margin: 8px 0 2px; color: #facc15; font-size: 1.3rem;" id="loot-modal-title">New Companion Rescued!</h2>
      <p style="font-size: 0.8rem; color: var(--text-muted);">
        A secret creature followed you home after defeating the boss!
      </p>

      <div class="loot-card">
        <div class="loot-icon" id="loot-modal-icon">🦁</div>
        <div style="font-size:1.25rem; font-weight:800;" id="loot-modal-name">Leo</div>
        <div style="font-size:0.75rem; color:#a5b4fc; margin-top:3px;" id="loot-modal-subtitle">✨ Cannot be bought in store!</div>
      </div>

      <div style="display:flex; gap:8px;">
        <button class="key-btn action-btn" style="flex:1; padding:8px; height: 44px; font-size:0.9rem;" onclick="closeLootModal(false)">Keep Current</button>
        <button class="key-btn submit-btn" style="flex:1; padding:8px; height: 44px; font-size:0.9rem;" onclick="closeLootModal(true)">Equip Now!</button>
      </div>
    </div>
  </div>

  <!-- Drawing Pad (docked above the keypad so you can write, then type the answer) -->
  <div class="pad-sheet" id="pad-sheet">
    <div class="pad-head">
      <div class="pad-problem" id="pad-problem">--</div>
      <div class="pad-answer">Answer: <span id="pad-answer">?</span></div>
    </div>
    <div class="pad-canvas-wrap grid" id="pad-wrap">
      <canvas id="pad-canvas"></canvas>
    </div>
    <div class="pad-tools" id="pad-tools">
      <span id="pad-colors"></span>
      <button class="pad-btn" id="pad-size-btn" onclick="padCycleSize()">● M</button>
      <button class="pad-btn" id="pad-eraser-btn" onclick="padToggleEraser()">🧽 Erase</button>
      <button class="pad-btn" onclick="padUndo()">↩️ Undo</button>
      <button class="pad-btn" onclick="padClear()">🗑️ Clear</button>
      <button class="pad-btn active" id="pad-grid-btn" onclick="padToggleGrid()">▦ Grid</button>
      <button class="pad-btn" onclick="togglePad()">✕ Close</button>
    </div>
  </div>

  <!-- Settings Modal -->
  <div class="modal-overlay" id="settings-modal" onclick="closeSettingsOnOverlay(event)">
    <div class="modal-content">
      <h2 style="font-size: 1.3rem;">⚙️ Settings</h2>

      <div class="settings-label">📚 Grade level</div>
      <div class="grade-grid" id="grade-grid"></div>
      <div class="settings-hint">Picking a grade also switches on the math types that fit that level. You can change them below.</div>

      <div class="settings-label">🧮 Math types</div>
      <div class="ops-grid" id="ops-grid"></div>
      <div class="settings-hint">Tap a type to turn it on or off. Higher grades unlock more types.</div>

      <div class="settings-label">🔧 Options</div>
      <div class="grade-grid" style="grid-template-columns: 1fr 1fr;">
        <button class="grade-btn" onclick="toggleMute()"><span id="sound-icon">🔊</span> Sound</button>
        <button class="grade-btn" onclick="closeSettings(); openReportModal()">📊 Session report</button>
      </div>
      <button class="grade-btn" style="width:100%; margin-top:6px;" onclick="closeSettings(); openParent()">👨‍👩‍👧 Parent report &amp; goals</button>

      <div class="settings-label">☁️ Account (optional)</div>
      <div id="acct-box"></div>

      <div class="settings-label">⚔️ Type chart</div>
      <div class="type-chart">
        🔥 Fire &gt; 🌿 Nature &nbsp;•&nbsp; 💧 Water &gt; 🔥 Fire<br>
        🌿 Nature &gt; 💧 Water, ⚡ Electric &nbsp;•&nbsp; ⚡ Electric &gt; 💧 Water, 🔮 Magic<br>
        🌑 Dark &gt; 🌿 Nature &nbsp;•&nbsp; 🔮 Magic &gt; 🌑 Dark, 🔥 Fire<br>
        🌟 Shadow deals x1.25 damage to everything<br>🛡️ Resisted hits do less damage; super-effective hits do +1 (never more than 40% of max HP)
      </div>

      <button class="danger-btn" onclick="openResetModal()">🔄 Reset All Progress</button>
      <button class="key-btn submit-btn" style="width: 100%; padding: 8px; margin-top: 10px; height: 44px; font-size:1rem;" onclick="closeSettings()">Done</button>
    </div>
  </div>

  <!-- Evolution Modal -->
  <div class="modal-overlay" id="evo-modal">
    <div class="modal-content">
      <div class="evo-title" id="evo-title">What? Your buddy is evolving!</div>
      <div class="evo-row">
        <div class="evo-from-wrap"><div class="evo-icon" id="evo-from">🐶</div></div>
        <div class="evo-arrow">➜</div>
        <div class="evo-icon evo-new" id="evo-to">🐺</div>
      </div>
      <div style="font-size:1rem; font-weight:800; color:#fde047;" id="evo-text">Pup evolved!</div>
      <div style="font-size:0.75rem; color:#c4b5fd; margin:8px 0 14px;" id="evo-stats"></div>
      <button class="key-btn submit-btn" style="width:100%; padding:8px; height: 44px; font-size:1rem;" onclick="closeEvoModal()">Awesome!</button>
    </div>
  </div>

  <div id="toast"></div>

  <div class="milestone-overlay" id="milestone-overlay"><div class="milestone-big" id="milestone-big"></div><div class="milestone-sub" id="milestone-sub"></div></div>

  <!-- Buddy hub: care / trading card / tournament -->
  <div class="modal-overlay" id="hub-modal" onclick="closeHubOnOverlay(event)">
    <div class="modal-content">
      <div class="hub-head">
        <button class="nav" onclick="hubStep(-1)">‹</button>
        <div>
          <div class="hub-icon" id="hub-icon"></div>
          <div style="font-weight:900; font-size:1.05rem;" id="hub-name"></div>
          <div style="font-size:0.7rem; color:var(--text-muted);" id="hub-sub"></div>
        </div>
        <button class="nav" onclick="hubStep(1)">›</button>
      </div>
      <div class="hub-tabs" id="hub-tabs"></div>
      <div id="hub-body"></div>
      <button class="key-btn submit-btn" style="width:100%; padding:8px; margin-top:8px; height:44px; font-size:1rem;" onclick="closeHub()">Back to Game</button>
    </div>
  </div>

  <!-- Same-room duel (split screen) -->
  <div class="modal-overlay" id="duel-modal">
    <div class="duel-wrap">
      <div class="duel-half p2" id="duel-p2"></div>
      <button class="duel-mid" id="duel-mid" onclick="duelQuit()">✕ Quit</button>
      <div class="duel-half p1" id="duel-p1"></div>
      <div class="duel-cover" id="duel-cover"></div>
    </div>
  </div>

  <!-- Tournament battle -->
  <div class="modal-overlay" id="tour-modal">
    <div class="modal-content" style="border-color:#fbbf24;">
      <div class="raid-chapter" style="color:#fde047;" id="tour-title"></div>
      <div style="font-size:0.8rem; font-weight:800; margin:2px 0 6px;" id="tour-trainer"></div>
      <div style="display:flex; gap:6px;">
        <div class="tour-side" id="tour-me"></div>
        <div class="tour-side" id="tour-foe"></div>
      </div>
      <div id="tour-play">
        <div class="tour-eq" id="tour-eq"></div>
        <div class="tour-opts" id="tour-opts"></div>
      </div>
      <p style="font-size:0.78rem; min-height:34px; margin:8px 0; font-weight:700;" id="tour-log"></p>
      <button class="key-btn" style="width:100%; height:38px; font-size:0.85rem;" id="tour-close" onclick="tourQuit()">Give up</button>
    </div>
  </div>

  <!-- Raid story modal -->
  <div class="modal-overlay" id="raid-modal">
    <div class="modal-content" style="border-color:#ef4444;">
      <div class="raid-chapter" id="raid-chapter"></div>
      <h2 style="font-size:1.25rem; margin-bottom:6px;" id="raid-title"></h2>
      <div class="comic-grid" id="raid-panels"></div>
      <p style="font-size:0.78rem; color:var(--text-muted); margin:6px 0;" id="raid-note"></p>
      <button class="key-btn submit-btn" style="width:100%; padding:8px; height:44px; font-size:1rem;" id="raid-btn" onclick="closeRaidModal()">To battle!</button>
    </div>
  </div>

  <!-- Parent report modal -->
  <div class="modal-overlay" id="parent-modal" onclick="closeParentOnOverlay(event)">
    <div class="modal-content">
      <h2 style="font-size:1.3rem;">👨‍👩‍👧 Parent Report</h2>
      <div id="par-lock" style="display:none;">
        <p style="font-size:0.85rem; margin:10px 0;">🔒 Grown-ups only. Enter the 4-digit PIN.</p>
        <input id="par-pin-in" type="password" inputmode="numeric" maxlength="4" placeholder="••••" style="text-align:center; font-size:1.4rem; letter-spacing:8px; width:140px; background:#1e293b; color:var(--text); border:1px solid var(--card-border); border-radius:8px; padding:6px;" />
        <div><button class="key-btn submit-btn" style="padding:8px 18px; margin-top:8px; height:40px;" onclick="parentUnlock()">Unlock</button></div>
        <div style="font-size:0.7rem; color:#f87171; min-height:16px; margin-top:4px;" id="par-lock-msg"></div>
      </div>
      <div id="par-content">
      <p style="font-size:0.72rem; color:var(--text-muted);">Last 7 days on this device or account.</p>
      <div class="par-tiles" id="par-tiles"></div>
      <div style="font-size:0.74rem; font-weight:700; margin-bottom:2px;" id="par-compare"></div>
      <div class="settings-label">📅 Minutes per day</div>
      <div class="par-days" id="par-days"></div>
      <div class="settings-label">🎯 Accuracy by math type</div>
      <div id="par-types"></div>
      <div class="settings-label">🔍 Weak spots</div>
      <div id="par-weak" style="font-size:0.8rem; text-align:left;"></div>
      <div class="settings-label">🏆 Daily reward goal</div>
      <div class="par-goal">
        <div style="font-size:0.78rem;">Math time goal per day:
          <select id="par-minutes" onchange="setParentGoal()"></select>
        </div>
        <input id="par-reward" type="text" maxlength="60" placeholder="Reward, e.g. ice cream trip" onchange="setParentGoal()" />
        <div class="quest-bar"><div class="quest-fill" id="par-goal-fill" style="width:0%"></div></div>
        <div style="font-size:0.74rem; font-weight:700;" id="par-goal-text"></div>
      </div>
      <div class="settings-label">🔒 Parent PIN</div>
      <div class="par-goal" style="flex-direction:row; align-items:center; flex-wrap:wrap;">
        <input id="par-pin-new" type="password" inputmode="numeric" maxlength="4" placeholder="New PIN" style="width:90px;" />
        <button class="grade-btn" style="padding:6px 10px;" onclick="parentSetPin()">Set PIN</button>
        <button class="grade-btn" style="padding:6px 10px;" onclick="parentClearPin()" id="par-pin-clear">Remove</button>
        <span style="font-size:0.66rem; color:var(--text-muted); flex-basis:100%;" id="par-pin-note"></span>
      </div>
      <button class="grade-btn" style="width:100%; margin-top:8px;" onclick="parentShare()">📋 Share weekly summary</button>
      </div>
      <button class="key-btn submit-btn" style="width:100%; padding:8px; margin-top:8px; height:44px; font-size:1rem;" onclick="closeParent()">Close</button>
    </div>
  </div>

  <!-- Streak Calendar Modal -->
  <div class="modal-overlay" id="cal-modal" onclick="closeCalOnOverlay(event)">
    <div class="modal-content">
      <h2 style="font-size: 1.3rem;">🔥 Daily Streak</h2>
      <p style="font-size: 0.78rem; color: var(--text-muted);" id="cal-status"></p>
      <div class="cal-grid" id="cal-grid"></div>
      <p style="font-size: 0.7rem; color: var(--text-muted);" id="cal-foot"></p>
      <button class="key-btn submit-btn" style="width: 100%; padding: 8px; margin-top: 8px; height: 44px; font-size:1rem;" onclick="closeCal()">Back to Game</button>
    </div>
  </div>

  <!-- Daily Quests Modal -->
  <div class="modal-overlay" id="quest-modal" onclick="closeQuestsOnOverlay(event)">
    <div class="modal-content">
      <h2 style="font-size: 1.3rem;">📜 Daily Quests</h2>
      <p style="font-size: 0.75rem; color: var(--text-muted);" id="quest-reset-note">New quests every day!</p>
      <div id="quest-list"></div>
      <div id="quest-chest"></div>
      <button class="key-btn submit-btn" style="width: 100%; padding: 8px; margin-top: 8px; height: 44px; font-size:1rem;" onclick="closeQuests()">Back to Game</button>
    </div>
  </div>

  <!-- Collection Book Modal -->
  <div class="modal-overlay" id="book-modal" onclick="closeBookOnOverlay(event)">
    <div class="modal-content">
      <h2 style="font-size: 1.3rem;">📖 Collection Book</h2>
      <div class="book-progress" id="book-progress">0 / 0 discovered</div>
      <div class="ms-row" id="book-milestones"></div>
      <div class="book-tabs" id="book-tabs"></div>
      <div id="book-body"></div>
      <button class="key-btn submit-btn" style="width: 100%; padding: 8px; margin-top: 10px; height: 44px; font-size:1rem;" onclick="closeBook()">Back to Game</button>
    </div>
  </div>

  <!-- Save conflict (cloud vs this device) -->
  <div class="modal-overlay" id="conflict-modal">
    <div class="modal-content">
      <div style="font-size: 2.2rem;">☁️</div>
      <h2 style="font-size: 1.3rem; margin-bottom: 4px;">Two saves found</h2>
      <p style="font-size: 0.8rem; color: var(--text-muted);">Pick the one to keep. The other one will be replaced.</p>
      <div class="conflict-opt">
        <b>☁️ Online save</b>
        <div class="conflict-sum" id="conflict-cloud"></div>
        <button class="key-btn submit-btn" style="width:100%; height:42px; font-size:0.95rem;" onclick="resolveConflict('cloud')">Use online save</button>
      </div>
      <div class="conflict-opt">
        <b>📱 This device</b>
        <div class="conflict-sum" id="conflict-local"></div>
        <button class="key-btn action-btn" style="width:100%; height:42px; font-size:0.95rem;" onclick="resolveConflict('local')">Keep this device's save</button>
      </div>
    </div>
  </div>

  <!-- Reset Confirmation Modal -->
  <div class="modal-overlay" id="reset-modal" onclick="closeResetOnOverlay(event)">
    <div class="modal-content">
      <div style="font-size: 2.2rem; margin-bottom: 6px;">⚠️</div>
      <h2 style="margin-bottom: 4px; font-size: 1.3rem;">Reset All Progress?</h2>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px; line-height: 1.3;">
        This will restart your level back to 1, reset your XP, streaks, and unlocked companions. Are you sure?
      </p>
      <p id="reset-cloud-note" style="display:none; font-size:0.8rem; color:#fca5a5; margin:-8px 0 14px; line-height:1.3;">☁️ You're signed in, so this also resets your saved online progress.</p>
      <div style="display: flex; gap: 8px;">
        <button class="key-btn action-btn" style="flex: 1; padding: 8px; height: 44px; font-size:0.9rem;" onclick="closeResetModal()">Cancel</button>
        <button class="key-btn" style="flex: 1; padding: 8px; height: 44px; font-size:0.9rem; background: var(--danger); box-shadow: 0 4px 0 #991b1b;" onclick="confirmReset()">Yes, Reset</button>
      </div>
    </div>
  </div>

  <script>
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

    function soundCorrect() {
      playTone(523.25, 0.09, 'triangle');
      setTimeout(() => playTone(659.25, 0.09, 'triangle'), 75);
      setTimeout(() => playTone(783.99, 0.20, 'triangle'), 150);
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
    const monstersList = [
      // 6 Fire Bosses
      { name: "Fire Drake", icon: "🐲", baseHp: 4, element: "fire", taunts: ["You cannot calculate my flames!", "Feel the blazing inferno!"] },
      { name: "Magma Golem", icon: "🌋", baseHp: 5, element: "fire", taunts: ["I am forged in molten rock!", "Crushing your numbers!"] },
      { name: "Inferno Phoenix", icon: "🦅", baseHp: 5, element: "fire", taunts: ["From the ash I rise!", "Burn away your math skills!"] },
      { name: "Blazing Cerberus", icon: "🐕‍🦺", baseHp: 5, element: "fire", taunts: ["Three heads, triple the flame!", "No escape from my fire!"] },
      { name: "Sun Titan", icon: "☀️", baseHp: 6, element: "fire", taunts: ["I burn brighter than a thousand stars!", "Solar flare unleashed!"] },
      { name: "Cinder Djinn", icon: "🧞", baseHp: 5, element: "fire", taunts: ["Your answers turn to smoke!", "A wish for defeat granted!"] },

      // 6 Water Bosses
      { name: "Giggle Slime", icon: "👾", baseHp: 3, element: "water", taunts: ["Three digits are too big for you!", "Giggle-giggle! Bet you miss!"] },
      { name: "Cosmic Yeti", icon: "🦍", baseHp: 5, element: "water", taunts: ["Brrr! Freeze your brain!", "Subtractions leave you cold!"] },
      { name: "Leviathan Kraken", icon: "🦑", baseHp: 6, element: "water", taunts: ["Drown in the deep ocean depths!", "Eight arms to crush your streak!"] },
      { name: "Frost Mammoth", icon: "🦣", baseHp: 5, element: "water", taunts: ["I will freeze your calculations!", "Permafrost charge!"] },
      { name: "Abyssal Serpent", icon: "🐉", baseHp: 6, element: "water", taunts: ["The deep ocean crushes all!", "Tidal wave incoming!"] },
      { name: "Glacier Crab", icon: "🦀", baseHp: 5, element: "water", taunts: ["Cold as ice, sharp as pincers!", "Snap your numbers in half!"] },

      // 6 Nature Bosses
      { name: "Sneaky Goblin", icon: "👺", baseHp: 3, element: "nature", taunts: ["I'll steal your gems!", "Think fast, math cadet!"] },
      { name: "Bramble Treant", icon: "🌲", baseHp: 4, element: "nature", taunts: ["My roots hold deep!", "Tangle your calculations!"] },
      { name: "Venom Hydrak", icon: "🐍", baseHp: 5, element: "nature", taunts: ["Hiss! Toxic subtraction!", "Poison fangs strike hard!"] },
      { name: "Jungle Behemoth", icon: "🦏", baseHp: 5, element: "nature", taunts: ["Heavy footfalls shake the jungle!", "Nature's unstoppable force!"] },
      { name: "Spore Mantis", icon: "🦗", baseHp: 5, element: "nature", taunts: ["Fast strikes from the canopy!", "Blades of the forest!"] },
      { name: "Thorn Dragon", icon: "🐲", baseHp: 6, element: "nature", taunts: ["Sharp thorns defend the ancient grove!", "Entangling vines trap you!"] },

      // 6 Electric Bosses
      { name: "Robo-Glitch", icon: "🤖", baseHp: 4, element: "electric", taunts: ["Syntax Error in human brain!", "Multiplication overload!"] },
      { name: "Thunder Griffin", icon: "⚡", baseHp: 5, element: "electric", taunts: ["Lightning speed arithmetic!", "Shockwaves incoming!"] },
      { name: "Plasma Core", icon: "🛸", baseHp: 5, element: "electric", taunts: ["Voltage surge exceeding limit!", "Alien calculation protocol!"] },
      { name: "Volt Dynamo", icon: "🔋", baseHp: 5, element: "electric", taunts: ["High voltage overload!", "Batteries fully charged!"] },
      { name: "Storm Falcon", icon: "🦅", baseHp: 5, element: "electric", taunts: ["Lightning rides on my wings!", "Thunder crack in the sky!"] },
      { name: "Cyber Mecha", icon: "🦾", baseHp: 6, element: "electric", taunts: ["Target locked, human computation failing!", "Laser grid activated!"] },

      // 6 Dark Bosses
      { name: "Shadow Sphinx", icon: "🦁", baseHp: 5, element: "dark", taunts: ["None solve my ancient riddles!", "Step into the shadow realm!"] },
      { name: "Nightmare Bat", icon: "🦇", baseHp: 4, element: "dark", taunts: ["Blind in the pitch black!", "Screeching frequencies!"] },
      { name: "Void Reaper", icon: "💀", baseHp: 6, element: "dark", taunts: ["Your streak belongs to me!", "Fade into nothingness!"] },
      { name: "Phantom Ghost", icon: "👻", baseHp: 5, element: "dark", taunts: ["You cannot touch what is in the dark!", "Spectral chill down your spine!"] },
      { name: "Eclipse Wolf", icon: "🐺", baseHp: 5, element: "dark", taunts: ["The moon darkens when I hunt!", "Howl in the midnight void!"] },
      { name: "Cursed Mummy", icon: "🧟", baseHp: 6, element: "dark", taunts: ["Ancient math curses upon you!", "Sealed in dark tombs forever!"] },

      // 6 Magic Bosses
      { name: "Hex Witch", icon: "🧙‍♀️", baseHp: 5, element: "magic", taunts: ["Your numbers are bewitched!", "Eye of newt, tail of math!"] },
      { name: "Rune Golem", icon: "🗿", baseHp: 6, element: "magic", taunts: ["Ancient runes guard my answers!", "Stone and spell, you shall not pass!"] },
      { name: "Tome Mimic", icon: "📖", baseHp: 4, element: "magic", taunts: ["I am the book that bites back!", "Turn the page... if you dare!"] },
      { name: "Mirror Wraith", icon: "🪞", baseHp: 5, element: "magic", taunts: ["I reflect your every mistake!", "Which answer is real?"] },
      { name: "Chaos Jester", icon: "🤡", baseHp: 4, element: "magic", taunts: ["Abra-cadabra, you are wrong!", "Tricks and spells, no treats!"] },
      { name: "Arcane Archmage", icon: "🧙‍♂️", baseHp: 6, element: "magic", taunts: ["Behold my forbidden formulas!", "Mathematics is the oldest magic!"] }
    ];

    const GRADES = [
      { id: 0, label: 'K–2',      long: 'Grades K–2' },
      { id: 1, label: '3–5',      long: 'Grades 3–5' },
      { id: 2, label: '6–8',      long: 'Grades 6–8' },
      { id: 3, label: '9–12',     long: 'Grades 9–12' },
      { id: 4, label: 'College',  long: 'College' },
      { id: 5, label: 'Calculus', long: 'Calculus' }
    ];

    // Math types switched on by default when you pick a grade
    const GRADE_DEFAULT_OPS = [
      ['add', 'sub'],
      ['add', 'sub', 'mul', 'div'],
      ['add', 'sub', 'mul', 'div', 'pct', 'neg'],
      ['mul', 'div', 'pow', 'sqrt', 'alg', 'neg', 'quad'],
      ['alg', 'quad', 'log', 'pow', 'deriv'],
      ['deriv', 'integral', 'limit']
    ];

    const sessionStats = {
      solved: 0,
      attempts: 0,
      goal: 25,
      goalClaimed: false,
      fastestTime: null,
      byOp: {}
    };

    function freshState() {
      return {
        grade: 1,
        enabledOps: GRADE_DEFAULT_OPS[1].slice(),
        gems: 0,
        streak: 0,
        shields: 0,
        cloverLeft: 0,
        monstersDefeated: 0,
        currentMonsterIndex: -1,
        bossLevel: 1,
        activePet: 'dog',
        unlockedPets: ['dog'],
        unlockedSecrets: [],
        buddyXp: { dog: 0 },
        unlockedAccessories: ['none'],
        activeAccessory: 'none',
        unlockedArmor: ['none'],
        activeArmor: 'none',
        faintedPets: [],
        recentBossTypes: [],
        quests: null,
        streakCal: { count: 0, last: '', total: 0, claimed: [] },
        stats: { days: {} },
        parentGoal: { minutes: 20, reward: '', notified: '' },
        parentPin: '',
        care: {},
        duelStat: { day: '', count: 0 },
        team: [],
        tour: { day: '', runs: 0, trophies: 0, wins: 0 },
        raid: null,
        raidsCleared: 0,
        lastRaidAt: 0,
        bossBook: {},
        bookClaims: []
      };
    }

    let state = freshState();
    let pendingLootPet = null;
    let ultimateCharge = 0;
    let currentMonsterIndex = 0;
    let monsterCurrentHp = 4;
    let bossLevel = 1;
    let partyHp = {};
    let bossMistakes = 0;

    const banditSvg = \`
      <svg viewBox="0 0 36 36" width="36" height="36" style="display: block; margin: 0 auto;">
        <polygon fill="#18181b" stroke="#818cf8" stroke-width="1.2" points="7,12 2,1 13,6"/>
        <polygon fill="#18181b" stroke="#818cf8" stroke-width="1.2" points="29,12 34,1 23,6"/>
        <polygon fill="#fb7185" points="7,10 4,3 12,7"/>
        <polygon fill="#fb7185" points="29,10 32,3 24,7"/>
        <circle cx="18" cy="18" r="12" fill="#18181b" stroke="#818cf8" stroke-width="1.2"/>
        <path d="M12 18 C12 13 24 13 24 18 C24 24 12 24 12 18 Z" fill="#ffffff"/>
        <ellipse cx="13.5" cy="15" rx="2.4" ry="2.8" fill="#10b981"/>
        <ellipse cx="22.5" cy="15" rx="2.4" ry="2.8" fill="#10b981"/>
        <circle cx="13.5" cy="15" r="1.2" fill="#000000"/>
        <circle cx="22.5" cy="15" r="1.2" fill="#000000"/>
        <circle cx="12.8" cy="14.3" r="0.6" fill="#ffffff"/>
        <circle cx="21.8" cy="14.3" r="0.6" fill="#ffffff"/>
        <polygon fill="#f43f5e" points="18,19.5 16.5,17.5 19.5,17.5"/>
        <path d="M16 20.5 Q18 22.5 20 20.5" stroke="#18181b" stroke-width="1.1" fill="none"/>
        <line x1="10" y1="18" x2="4" y2="17" stroke="#e2e8f0" stroke-width="1.1"/>
        <line x1="10" y1="20" x2="4" y2="21" stroke="#e2e8f0" stroke-width="1.1"/>
        <line x1="26" y1="18" x2="32" y2="17" stroke="#e2e8f0" stroke-width="1.1"/>
        <line x1="26" y1="20" x2="32" y2="21" stroke="#e2e8f0" stroke-width="1.1"/>
      </svg>
    \`;

    const banditEvoSvg = \`
      <svg viewBox="0 0 36 36" width="36" height="36" style="display: block; margin: 0 auto;">
        <polygon fill="#312e81" stroke="#a5b4fc" stroke-width="1.2" points="7,12 2,1 13,6"/>
        <polygon fill="#312e81" stroke="#a5b4fc" stroke-width="1.2" points="29,12 34,1 23,6"/>
        <circle cx="18" cy="18" r="12" fill="#09090b" stroke="#a5b4fc" stroke-width="1.2"/>
        <rect x="5" y="12" width="26" height="7" fill="#6366f1" rx="2"/>
        <ellipse cx="13" cy="15.5" rx="2.6" ry="2.8" fill="#facc15"/>
        <ellipse cx="23" cy="15.5" rx="2.6" ry="2.8" fill="#facc15"/>
        <circle cx="13" cy="15.5" r="1.3" fill="#000000"/>
        <circle cx="23" cy="15.5" r="1.3" fill="#000000"/>
        <polygon fill="#f43f5e" points="18,22 16.5,20 19.5,20"/>
        <path d="M16 23 Q18 25 20 23" stroke="#ffffff" stroke-width="1.2" fill="none"/>
      </svg>
    \`;

    // Store Companions: All unique names
    const storePets = [
      { id: 'dog', name: 'Pup', icon: '🐶', cost: 0, element: 'nature', superMove: 'Bark Strike', evoLevel: 30, evoName: 'Thunder Wolf', evoIcon: '🐺' },
      { id: 'fox', name: 'Sparky', icon: '🦊', cost: 52, element: 'fire', superMove: 'Flame Tail', evoLevel: 40, evoName: 'Blaze Fox', evoIcon: '🔥' },
      { id: 'bunny', name: 'Hops', icon: '🐰', cost: 75, element: 'magic', superMove: 'Carrot Cannon', evoLevel: 40, evoName: 'Moon Rabbit', evoIcon: '🌙' },
      { id: 'otter', name: 'Pip', icon: '🦦', cost: 104, element: 'water', superMove: 'River Splash', evoLevel: 40, evoName: 'Frost Otter', evoIcon: '🌊' },
      { id: 'hedgehog', name: 'Spike', icon: '🦔', cost: 145, element: 'nature', superMove: 'Needle Barrage', evoLevel: 45, evoName: 'Thorn King', evoIcon: '🌵' },
      { id: 'ignis', name: 'Ignis', icon: '🐲', cost: 182, element: 'fire', superMove: 'Inferno Blast', evoLevel: 50, evoName: 'Ancient Drake', evoIcon: '🐉' },
      { id: 'penguin', name: 'Pebble', icon: '🐧', cost: 220, element: 'water', superMove: 'Blizzard Slide', evoLevel: 50, evoName: 'Emperor Penguin', evoIcon: '👑' },
      { id: 'bear', name: 'Barnaby', icon: '🐻', cost: 260, element: 'nature', superMove: 'Mega Maul', evoLevel: 50, evoName: 'Grizzly King', evoIcon: '👑' },
      { id: 'olaf', name: 'Olaf', icon: '⛄', cost: 290, element: 'water', superMove: 'Warm Hug Avalanche', evoLevel: 50, evoName: 'Frost Olaf', evoIcon: '❄️' },
      { id: 'hedwig', name: 'Hedwig', icon: '🦉', cost: 320, element: 'magic', superMove: 'Letter Dive Strike', evoLevel: 50, evoName: 'Royal Hedwig', evoIcon: '⚡' },
      { id: 'dolphin', name: 'Splash', icon: '🐬', cost: 345, element: 'water', superMove: 'Hydro Jet', evoLevel: 50, evoName: 'Tidal Dolphin', evoIcon: '🌊' },
      { id: 'pascal', name: 'Pascal', icon: '🦎', cost: 380, element: 'nature', superMove: 'Camo Whip Strike', evoLevel: 55, evoName: 'Rainbow Chameleon', evoIcon: '🌈' },
      { id: 'byte', name: 'Byte', icon: '🤖', cost: 410, element: 'electric', superMove: 'Overclock Shock', evoLevel: 60, evoName: 'Cyber Mecha', evoIcon: '🦾' },
      { id: 'crookshanks', name: 'Crookshanks', icon: '🐱', cost: 440, element: 'magic', superMove: 'Kneazle Pounce', evoLevel: 60, evoName: 'Shadow Kneazle', evoIcon: '🐈' },
      { id: 'rhino', name: 'Tank', icon: '🦏', cost: 470, element: 'electric', superMove: 'Volt Charge', evoLevel: 65, evoName: 'Thunder Rhino', evoIcon: '⚡' },
      { id: 'tiger', name: 'Blaze', icon: '🐯', cost: 510, element: 'fire', superMove: 'Tiger Claw', evoLevel: 60, evoName: 'Saber Tiger', evoIcon: '🐅' },
      { id: 'panther', name: 'Nyx', icon: '🐆', cost: 560, element: 'dark', superMove: 'Shadow Pounce', evoLevel: 70, evoName: 'Night Panther', evoIcon: '🐈‍⬛' },
      { id: 'bat', name: 'Echo', icon: '🦇', cost: 610, element: 'dark', superMove: 'Sonic Shriek', evoLevel: 70, evoName: 'Vampire Lord', evoIcon: '🧛' },
      { id: 'griffin', name: 'Zeus', icon: '🦅', cost: 690, element: 'electric', superMove: 'Thunderstorm', evoLevel: 80, evoName: 'Sky King', evoIcon: '⚡' },
      { id: 'cosmo', name: 'Cosmo', icon: '⭐', cost: 780, element: 'magic', superMove: 'Supernova Wave', evoLevel: 75, evoName: 'Nova Astral', evoIcon: '🌟' },
      { id: 'lion', name: 'Aslan', icon: '🦁', cost: 870, element: 'nature', superMove: 'Solar Roar', evoLevel: 80, evoName: 'Golden Monarch', evoIcon: '👑' },
      { id: 'phoenix', name: 'Solaris', icon: '🦅', cost: 975, element: 'fire', superMove: 'Solar Rebirth', evoLevel: 80, evoName: 'Sun Emperor', evoIcon: '☀️' },
      { id: 'frostfang', name: 'Frostfang', icon: '🐉', cost: 1105, element: 'water', superMove: 'Glacial Frost', evoLevel: 85, evoName: 'Ice Dragon', evoIcon: '❄️' },
      { id: 'pegasus', name: 'Aero', icon: '🦄', cost: 1450, element: 'magic', superMove: 'Starlight Gallop', evoLevel: 90, evoName: 'Celestial Pegasus', evoIcon: '✨' },
      { id: 'bandit', name: 'Bandit', icon: banditSvg, cost: 3250, element: 'shadow', superMove: 'Shadow Swipe', evoLevel: 100, evoName: 'Ninja Bandit', evoIcon: banditEvoSvg, requiresAllStorePets: true }
    ];

    // Wearable Gear & Accessories
    const accessoriesList = [
      { id: 'none',        name: 'None',          icon: '❌', cost: 0,   cssClass: '',               renderIcon: '' },
      { id: 'shades',      name: 'Cool Shades',   icon: '🕶️', cost: 33,  cssClass: 'acc-shades',     renderIcon: '🕶️' },
      { id: 'potterglass', name: 'Wizard Glasses',icon: '👓', cost: 42,  cssClass: 'acc-potterglass',renderIcon: '👓' },
      { id: 'party',       name: 'Party Hat',     icon: '🥳', cost: 46,  cssClass: 'acc-party',      renderIcon: '🎉' },
      { id: 'tophat',      name: 'Fancy Top Hat', icon: '🎩', cost: 52,  cssClass: 'acc-tophat',     renderIcon: '🎩' },
      { id: 'bowtie',      name: 'Red Bowtie',    icon: '🎀', cost: 59,  cssClass: 'acc-bowtie',     renderIcon: '🎀' },
      { id: 'scarf',       name: 'House Scarf',   icon: '🧣', cost: 65,  cssClass: 'acc-scarf',      renderIcon: '🧣' },
      { id: 'pirate',      name: 'Pirate Hat',    icon: '🏴‍☠️', cost: 72,  cssClass: 'acc-pirate',     renderIcon: '🏴‍☠️' },
      { id: 'flower',      name: 'Flower Wreath', icon: '🌸', cost: 75,  cssClass: 'acc-flower',     renderIcon: '🌸' },
      { id: 'lei',         name: 'Tropical Lei',  icon: '🌺', cost: 78,  cssClass: 'acc-lei',        renderIcon: '🌺' },
      { id: 'detective',   name: 'Sleuth Hat',    icon: '🕵️', cost: 88,  cssClass: 'acc-detective',  renderIcon: '🕵️' },
      { id: 'ninja',       name: 'Ninja Band',    icon: '🥷', cost: 91,  cssClass: 'acc-ninja',      renderIcon: '🥷' },
      { id: 'sortinghat',  name: 'Sorting Hat',   icon: '🧙', cost: 105, cssClass: 'acc-sortinghat', renderIcon: '🧙' },
      { id: 'wizard',      name: 'Wizard Cap',    icon: '🧙‍♂️', cost: 111, cssClass: 'acc-wizard',     renderIcon: '✨' },
      { id: 'rose',        name: 'Magic Rose',    icon: '🌹', cost: 115, cssClass: 'acc-rose',       renderIcon: '🌹' },
      { id: 'viking',      name: 'Viking Horns',  icon: '🪖', cost: 117, cssClass: 'acc-viking',     renderIcon: '🪖' },
      { id: 'broom',       name: 'Nimbus Broom',  icon: '🧹', cost: 125, cssClass: 'acc-broom',      renderIcon: '🧹' },
      { id: 'headset',     name: 'Gamer Headset', icon: '🎧', cost: 130, cssClass: 'acc-headset',    renderIcon: '🎧' },
      { id: 'armor',       name: 'Knight Shield', icon: '🛡️', cost: 143, cssClass: 'acc-armor',      renderIcon: '🛡️' },
      { id: 'slipper',     name: 'Glass Slipper', icon: '👠', cost: 150, cssClass: 'acc-slipper',    renderIcon: '👠' },
      { id: 'snitch',      name: 'Golden Snitch', icon: '🟡', cost: 160, cssClass: 'acc-snitch',     renderIcon: '🟡' },
      { id: 'wand',        name: 'Elder Wand',    icon: '🪄', cost: 165, cssClass: 'acc-wand',       renderIcon: '🪄' },
      { id: 'crown',       name: 'Royal Crown',   icon: '👑', cost: 169, cssClass: 'acc-crown',      renderIcon: '👑' },
      { id: 'fairywand',   name: 'Pixie Wand',    icon: '🧚', cost: 175, cssClass: 'acc-fairywand',  renderIcon: '✨' },
      { id: 'halo',        name: 'Angel Halo',    icon: '😇', cost: 182, cssClass: 'acc-halo',       renderIcon: '😇' },
      { id: 'icecrown',    name: 'Ice Crystal',   icon: '❄️', cost: 195, cssClass: 'acc-icecrown',   renderIcon: '❄️' },
      { id: 'wings',       name: 'Angel Wings',   icon: '🪽', cost: 208, cssClass: 'acc-wings',      renderIcon: '🪽' },
      { id: 'sword',       name: 'Knight Blade',  icon: '🗡️', cost: 215, cssClass: 'acc-sword',      renderIcon: '🗡️' },
      { id: 'butterfly',   name: 'Fairy Wings',   icon: '🦋', cost: 220, cssClass: 'acc-butterfly',  renderIcon: '🦋' },
      { id: 'cape',        name: 'Hero Cape',     icon: '🦸', cost: 247, cssClass: 'acc-cape',       renderIcon: '🧣' },
      { id: 'trophy',      name: 'Gold Trophy',   icon: '🏆', cost: 260, cssClass: 'acc-trophy',     renderIcon: '🏆' },
      { id: 'flame',       name: 'Flame Aura',    icon: '🔥', cost: 273, cssClass: 'acc-flame',      renderIcon: '🔥' },
      { id: 'spark',       name: 'Storm Sparks',  icon: '⚡', cost: 286, cssClass: 'acc-spark',      renderIcon: '⚡' },
      { id: 'rainbow',     name: 'Rainbow Trail', icon: '🌈', cost: 325, cssClass: 'acc-rainbow',    renderIcon: '🌈' },
      // ---- v3 additions ----
      { id: 'gradcap',    name: 'Graduation Cap', icon: '🎓', cost: 54,  cssClass: 'slot-head', renderIcon: '🎓' },
      { id: 'coolcap',    name: 'Cool Cap',       icon: '🧢', cost: 56,  cssClass: 'slot-head', renderIcon: '🧢' },
      { id: 'sunhat',     name: 'Sun Hat',        icon: '👒', cost: 62,  cssClass: 'slot-head', renderIcon: '👒' },
      { id: 'sunflower',  name: 'Sunflower Crown',icon: '🌻', cost: 85,  cssClass: 'slot-head', renderIcon: '🌻' },
      { id: 'rescue',     name: 'Rescue Helmet',  icon: '⛑️', cost: 96,  cssClass: 'slot-head', renderIcon: '⛑️' },
      { id: 'mushroom',   name: 'Mushroom Cap',   icon: '🍄', cost: 99,  cssClass: 'slot-head', renderIcon: '🍄' },
      { id: 'pumpkin',    name: 'Pumpkin Hat',    icon: '🎃', cost: 120, cssClass: 'slot-head', renderIcon: '🎃' },
      { id: 'neptune',    name: 'Neptune Crown',  icon: '🔱', cost: 188, cssClass: 'slot-head', renderIcon: '🔱' },
      { id: 'starcrown',  name: 'Star Crown',     icon: '🌟', cost: 230, cssClass: 'slot-head', renderIcon: '🌟' },

      { id: 'goggles',    name: 'Swim Goggles',   icon: '🥽', cost: 70,  cssClass: 'slot-face', renderIcon: '🥽' },
      { id: 'clownnose',  name: 'Clown Nose',     icon: '🔴', cost: 48,  cssClass: 'slot-face', renderIcon: '🔴' },
      { id: 'monocle',    name: 'Fancy Monocle',  icon: '🧐', cost: 82,  cssClass: 'slot-face', renderIcon: '🔍' },

      { id: 'bell',       name: 'Jingle Bell',    icon: '🔔', cost: 74,  cssClass: 'slot-neck', renderIcon: '🔔' },
      { id: 'pearls',     name: 'Pearl Beads',    icon: '📿', cost: 95,  cssClass: 'slot-neck', renderIcon: '📿' },
      { id: 'medal',      name: 'Gold Medal',     icon: '🏅', cost: 110, cssClass: 'slot-neck', renderIcon: '🏅' },
      { id: 'ribbon',     name: 'Hero Ribbon',    icon: '🎗️', cost: 130, cssClass: 'slot-neck', renderIcon: '🎗️' },
      { id: 'charm',      name: 'Lucky Charm',    icon: '🧿', cost: 140, cssClass: 'slot-neck', renderIcon: '🧿' },
      { id: 'pendant',    name: 'Gem Pendant',    icon: '💎', cost: 205, cssClass: 'slot-neck', renderIcon: '💎' },
      { id: 'honor',      name: 'Medal of Honor', icon: '🎖️', cost: 240, cssClass: 'slot-neck', renderIcon: '🎖️' },

      { id: 'backpack',   name: 'School Backpack',icon: '🎒', cost: 99,  cssClass: 'slot-back', renderIcon: '🎒' },
      { id: 'kite',       name: 'Kite Wings',     icon: '🪁', cost: 126, cssClass: 'slot-back', renderIcon: '🪁' },
      { id: 'guitar',     name: 'Rock Guitar',    icon: '🎸', cost: 150, cssClass: 'slot-back', renderIcon: '🎸' },
      { id: 'bow',        name: 'Archer Bow',     icon: '🏹', cost: 168, cssClass: 'slot-back', renderIcon: '🏹' },
      { id: 'telescope',  name: 'Telescope',      icon: '🔭', cost: 177, cssClass: 'slot-back', renderIcon: '🔭' },
      { id: 'rocket',     name: 'Rocket Pack',    icon: '🚀', cost: 232, cssClass: 'slot-back', renderIcon: '🚀' },

      { id: 'lollipop',   name: 'Giant Lollipop', icon: '🍭', cost: 58,  cssClass: 'slot-side', renderIcon: '🍭' },
      { id: 'pizza',      name: 'Pizza Slice',    icon: '🍕', cost: 66,  cssClass: 'slot-side', renderIcon: '🍕' },
      { id: 'soccer',     name: 'Soccer Ball',    icon: '⚽', cost: 77,  cssClass: 'slot-side', renderIcon: '⚽' },
      { id: 'hammer',     name: 'Builder Hammer', icon: '🔨', cost: 100, cssClass: 'slot-side', renderIcon: '🔨' },
      { id: 'potion',     name: 'Potion Flask',   icon: '🧪', cost: 112, cssClass: 'slot-side', renderIcon: '🧪' },
      { id: 'mic',        name: 'Mic Drop',       icon: '🎤', cost: 119, cssClass: 'slot-side', renderIcon: '🎤' },
      { id: 'controller', name: 'Game Controller',icon: '🎮', cost: 135, cssClass: 'slot-side', renderIcon: '🎮' },
      { id: 'spellbook',  name: 'Spellbook',      icon: '📖', cost: 138, cssClass: 'slot-side', renderIcon: '📖' },
      { id: 'axe',        name: 'Battle Axe',     icon: '🪓', cost: 196, cssClass: 'slot-side', renderIcon: '🪓' },
      { id: 'trident',    name: 'Sea Trident',    icon: '🔱', cost: 252, cssClass: 'slot-side', renderIcon: '🔱' },

      { id: 'leafswirl',  name: 'Leaf Swirl',     icon: '🍃', cost: 240, cssClass: 'slot-aura', renderIcon: '🍃' },
      { id: 'stardust',   name: 'Star Dust',      icon: '💫', cost: 262, cssClass: 'slot-aura', renderIcon: '💫' },
      { id: 'cyclone',    name: 'Cyclone',        icon: '🌀', cost: 290, cssClass: 'slot-aura', renderIcon: '🌀' },
      { id: 'tidewrap',   name: 'Tide Wrap',      icon: '🌊', cost: 300, cssClass: 'slot-aura', renderIcon: '🌊' },
      { id: 'cloudrider', name: 'Cloud Rider',    icon: '☁️', cost: 310, cssClass: 'slot-aura', renderIcon: '☁️' },
      { id: 'supernova',  name: 'Super Nova',     icon: '🌠', cost: 350, cssClass: 'slot-aura', renderIcon: '🌠' },
      { id: 'fireworks',  name: 'Fireworks',      icon: '🎆', cost: 380, cssClass: 'slot-aura', renderIcon: '🎆' },
      { id: 'orbit',      name: 'Orbit Ring',     icon: '🪐', cost: 420, cssClass: 'slot-aura', renderIcon: '🪐' }
    ];

    // Body armor: bonus max HP for the active buddy (tiers get pricier; higher tiers glow)
    const armorList = [
      { id: 'none',      name: 'No Armor',        icon: '❌', cost: 0,    hp: 0, tier: 0, renderIcon: '' },
      { id: 'tunic',     name: 'Cloth Tunic',     icon: '👕', cost: 75,   hp: 1, tier: 1, renderIcon: '👕' },
      { id: 'vest',      name: 'Safety Vest',     icon: '🦺', cost: 110,  hp: 1, tier: 1, renderIcon: '🦺' },
      { id: 'labcoat',   name: 'Scholar Coat',    icon: '🥼', cost: 140,  hp: 1, tier: 1, renderIcon: '🥼' },
      { id: 'gi',        name: 'Martial Gi',      icon: '🥋', cost: 220,  hp: 2, tier: 1, renderIcon: '🥋' },
      { id: 'chain',     name: 'Chain Mail',      icon: '⛓️', cost: 280,  hp: 2, tier: 2, renderIcon: '⛓️' },
      { id: 'parka',     name: 'Frost Parka',     icon: '🧥', cost: 320,  hp: 2, tier: 2, renderIcon: '🧥' },
      { id: 'ironplate', name: 'Iron Plate',      icon: '⚙️', cost: 450,  hp: 3, tier: 2, renderIcon: '⚙️' },
      { id: 'dragon',    name: 'Dragon Scale',    icon: '🐉', cost: 560,  hp: 3, tier: 2, renderIcon: '🐉' },
      { id: 'crystal',   name: 'Crystal Armor',   icon: '💠', cost: 750,  hp: 4, tier: 3, renderIcon: '💠' },
      { id: 'mythril',   name: 'Mythril Aegis',   icon: '🔷', cost: 950,  hp: 4, tier: 3, renderIcon: '🔷' },
      { id: 'celestial', name: 'Celestial Plate', icon: '✨', cost: 1300, hp: 5, tier: 3, renderIcon: '✨' }
    ];
    accessoriesList.sort(function (a, b) { return a.cost - b.cost; });
    function getArmor(id) { return armorList.find(function (a) { return a.id === id; }) || armorList[0]; }


    // Ultra-Rare Mythic Lore Legends (Harry Potter & Storybook Movie Royalty) - 4% Drop Rate
    const mythicSpecies = [
      { id: 'mythic_harry',      name: 'Harry',        icon: '⚡',  elem: 'magic', superMove: 'Expelliarmus Burst', mythic: true },
      { id: 'mythic_hermione',   name: 'Hermione',     icon: '📚',  elem: 'magic',   superMove: 'Wingardium Leviosa', mythic: true },
      { id: 'mythic_ron',        name: 'Ron',          icon: '🍗',  elem: 'magic',     superMove: 'Wizard Chess Slam',  mythic: true },
      { id: 'mythic_dumbledore', name: 'Dumbledore',   icon: '🧙‍♂️', elem: 'magic',     superMove: 'Fawkes Inferno Fire',mythic: true },
      { id: 'mythic_dobby',      name: 'Dobby',        icon: '🧦',  elem: 'magic',   superMove: 'Free Elf Sock Strike',mythic: true },
      { id: 'mythic_fawkes',     name: 'Fawkes',       icon: '🔥',  elem: 'fire',     superMove: 'Phoenix Firestorm',  mythic: true },
      { id: 'mythic_buckbeak',   name: 'Buckbeak',     icon: '🦅',  elem: 'nature',   superMove: 'Hippogriff Talon Dive',mythic: true },
      { id: 'mythic_niffler',    name: 'Niffler',      icon: '🪙',  elem: 'dark',     superMove: 'Shiny Coin Whirlwind',mythic: true },
      { id: 'mythic_luna',       name: 'Luna',         icon: '🦁',  elem: 'magic',    superMove: 'Spectrespec Beam',   mythic: true },
      { id: 'mythic_sirius',     name: 'Sirius',       icon: '🐺',  elem: 'dark',     superMove: 'Padfoot Shadow Leap',mythic: true },
      { id: 'mythic_elsa',       name: 'Elsa',         icon: '❄️',  elem: 'water',    superMove: 'Let It Go Frostwave', mythic: true },
      { id: 'mythic_anna',       name: 'Anna',         icon: '🌻',  elem: 'nature',   superMove: 'True Love Warmth',   mythic: true },
      { id: 'mythic_rapunzel',   name: 'Rapunzel',     icon: '☀️',  elem: 'magic', superMove: 'Sundrop Healing Ray',mythic: true },
      { id: 'mythic_moana',      name: 'Moana',        icon: '🌊',  elem: 'water',    superMove: 'Ocean Crest Surge',  mythic: true },
      { id: 'mythic_mirabel',    name: 'Mirabel',      icon: '🦋',  elem: 'magic',   superMove: 'Casita Butterfly Swarm',mythic: true },
      { id: 'mythic_ariel',      name: 'Ariel',        icon: '🧜‍♀️', elem: 'water',    superMove: 'Part of That World Wave',mythic: true },
      { id: 'mythic_belle',      name: 'Belle',        icon: '🌹',  elem: 'magic',   superMove: 'Enchanted Rose Petals',mythic: true },
      { id: 'mythic_cinderella', name: 'Cinderella',   icon: '👠',  elem: 'magic',    superMove: 'Midnight Glass Magic',mythic: true },
      { id: 'mythic_barbie',     name: 'Barbie',       icon: '💖',  elem: 'fire',     superMove: 'Dreamhouse Sparkle', mythic: true },
      { id: 'mythic_tinkerbell', name: 'Tinkerbell',   icon: '🧚',  elem: 'magic', superMove: 'Pixie Dust Nova',    mythic: true },
      { id: 'mythic_mulan',      name: 'Mulan',        icon: '🗡️',  elem: 'fire',     superMove: 'Imperial Dragon Slash',mythic: true },
      { id: 'mythic_stitch',     name: 'Stitch',       icon: '💙',  elem: 'electric', superMove: 'Experiment 626 Havoc',mythic: true }
    ];

    const mythicCompanions = mythicSpecies.map(m => ({ ...m, element: m.elem, secret: true }));

    // Ultra-Rare Cosmic Alien Janie (Lowest Drop Rate: 0.5%)
    const janiePet = {
      id: 'secret_janie',
      name: 'Janie',
      icon: '👽',
      element: 'shadow',
      superMove: 'Cosmic Abduction',
      secret: true,
      isJanie: true
    };

    // Completely Unique Secret Companions
    const secretSpecies = [
      { name: 'Leo', icon: '🦁', elem: 'nature', superMove: 'Sovereign Roar' },
      { name: 'Stripes', icon: '🐯', elem: 'fire', superMove: 'Tiger Blitz' },
      { name: 'Bao', icon: '🐼', elem: 'nature', superMove: 'Bamboo Tempest' },
      { name: 'Eucalyptus', icon: '🐨', elem: 'nature', superMove: 'Forest Dream' },
      { name: 'Hoppy', icon: '🐸', elem: 'water', superMove: 'Hydro Leap' },
      { name: 'Kip', icon: '🐵', elem: 'nature', superMove: 'Primate Havoc' },
      { name: 'Celeste', icon: '🦄', elem: 'magic', superMove: 'Starlight Horn' },
      { name: 'Talon', icon: '🦅', elem: 'nature', superMove: 'Sky Dive' },
      { name: 'Athena', icon: '🦉', elem: 'electric', superMove: 'Wisdom Storm' },
      { name: 'Shadow', icon: '🦇', elem: 'dark', superMove: 'Night Screech' },
      { name: 'Ghost', icon: '🐺', elem: 'dark', superMove: 'Phantom Howl' },
      { name: 'Tusker', icon: '🐗', elem: 'nature', superMove: 'Boar Stampede' },
      { name: 'Thunder', icon: '🐴', elem: 'electric', superMove: 'Sonic Gallop' },
      { name: 'Zigzag', icon: '🦓', elem: 'nature', superMove: 'Dazzle Dash' },
      { name: 'Twigs', icon: '🦒', elem: 'nature', superMove: 'High Reach' },
      { name: 'Roo', icon: '🦘', elem: 'nature', superMove: 'Cyclone Kick' },
      { name: 'Paco', icon: '🦙', elem: 'nature', superMove: 'Llama Spitfire' },
      { name: 'Quill', icon: '🦔', elem: 'nature', superMove: 'Needle Burst' },
      { name: 'River', icon: '🦦', elem: 'water', superMove: 'River Whirlpool' },
      { name: 'Snooze', icon: '🦥', elem: 'nature', superMove: 'Sloth Slumber' },
      { name: 'Pepper', icon: '🦨', elem: 'dark', superMove: 'Skunk Fume' },
      { name: 'Brock', icon: '🦡', elem: 'nature', superMove: 'Earth Digger' },
      { name: 'Peanut', icon: '🐘', elem: 'water', superMove: 'Tusk Tremor' },
      { name: 'Woolly', icon: '🦣', elem: 'water', superMove: 'Glacial Tusk' },
      { name: 'Boulder', icon: '🦏', elem: 'nature', superMove: 'Horn Breaker' },
      { name: 'Bubbles', icon: '🦛', elem: 'water', superMove: 'River Maw' },
      { name: 'Squeak', icon: '🐁', elem: 'electric', superMove: 'Spark Nibble' },
      { name: 'Cotton', icon: '🐇', elem: 'nature', superMove: 'Quick Dash' },
      { name: 'Acorn', icon: '🐿️', elem: 'nature', superMove: 'Nut Barrage' },
      { name: 'Chippy', icon: '🦫', elem: 'water', superMove: 'Dam Breaker' },
      { name: 'Ziggy', icon: '🦎', elem: 'nature', superMove: 'Tail Whip' },
      { name: 'Chomp', icon: '🐊', elem: 'water', superMove: 'Death Roll' },
      { name: 'Shelly', icon: '🐢', elem: 'water', superMove: 'Fortress Shell' },
      { name: 'Sly', icon: '🐍', elem: 'nature', superMove: 'Venom Strike' },
      { name: 'Rex', icon: '🦖', elem: 'fire', superMove: 'Meteor Chomp' },
      { name: 'Bronto', icon: '🦕', elem: 'nature', superMove: 'Titan Stomp' },
      { name: 'Inky', icon: '🐙', elem: 'water', superMove: 'Abyssal Ink' },
      { name: 'Kraken', icon: '🦑', elem: 'water', superMove: 'Tentacle Slam' },
      { name: 'Prawny', icon: '🦐', elem: 'water', superMove: 'Aqua Snap' },
      { name: 'Pinchy', icon: '🦞', elem: 'water', superMove: 'Crushing Claw' },
      { name: 'Crabby', icon: '🦀', elem: 'water', superMove: 'Pincer Slam' },
      { name: 'Puff', icon: '🐡', elem: 'water', superMove: 'Spike Balloon' },
      { name: 'Fin', icon: '🐠', elem: 'water', superMove: 'Coral Dart' },
      { name: 'Gill', icon: '🐟', elem: 'water', superMove: 'Tidal Swarm' },
      { name: 'Sonar', icon: '🐬', elem: 'water', superMove: 'Sonar Pulse' },
      { name: 'Geyser', icon: '🐳', elem: 'water', superMove: 'Whale Geyser' },
      { name: 'Jaws', icon: '🦈', elem: 'water', superMove: 'Apex Frenzy' },
      { name: 'Flipper', icon: '🦭', elem: 'water', superMove: 'Ice Splash' },
      { name: 'Gator', icon: '🐊', elem: 'water', superMove: 'Swamp Ambush' },
      { name: 'Plume', icon: '🦚', elem: 'nature', superMove: 'Feather Burst' },
      { name: 'Flamingo', icon: '🦩', elem: 'water', superMove: 'Crimson Flutter' },
      { name: 'Ducky', icon: '🦆', elem: 'water', superMove: 'Quack Torrent' },
      { name: 'Grace', icon: '🦢', elem: 'water', superMove: 'Swan Glide' },
      { name: 'Pippin', icon: '🐧', elem: 'water', superMove: 'Ice Surfer' },
      { name: 'Gobble', icon: '🦃', elem: 'nature', superMove: 'Feather Storm' },
      { name: 'Rooster', icon: '🐓', elem: 'fire', superMove: 'Dawn Crow' },
      { name: 'Peep', icon: '🐣', elem: 'nature', superMove: 'Chirp Shock' },
      { name: 'Sky', icon: '🦅', elem: 'electric', superMove: 'Thunder Talon' },
      { name: 'Midnight', icon: '🦇', elem: 'dark', superMove: 'Vampire Swarm' },
      { name: 'Buzzer', icon: '🐝', elem: 'electric', superMove: 'Stinger Barrage' },
      { name: 'Cater', icon: '🐛', elem: 'nature', superMove: 'Silk Trap' },
      { name: 'Flutter', icon: '🦋', elem: 'nature', superMove: 'Prism Powder' },
      { name: 'Turbo', icon: '🐌', elem: 'water', superMove: 'Shell Slam' },
      { name: 'Dot', icon: '🐞', elem: 'nature', superMove: 'Lucky Shell' },
      { name: 'Anty', icon: '🐜', elem: 'nature', superMove: 'Colony March' },
      { name: 'Chirp', icon: '🦗', elem: 'nature', superMove: 'Sonic Chirp' },
      { name: 'Webby', icon: '🕷️', elem: 'dark', superMove: 'Spider Snare' },
      { name: 'Sting', icon: '🦂', elem: 'dark', superMove: 'Venom Puncture' },
      { name: 'Zippy', icon: '🦟', elem: 'nature', superMove: 'Swarm Sting' },
      { name: 'Nano', icon: '🦠', elem: 'electric', superMove: 'Cell Division' },
      { name: 'Spore', icon: '🍄', elem: 'nature', superMove: 'Spore Cloud' },
      { name: 'Cactus', icon: '🌵', elem: 'nature', superMove: 'Desert Prick' },
      { name: 'Evergreen', icon: '🌲', elem: 'nature', superMove: 'Pine Needles' },
      { name: 'Maple', icon: '🍁', elem: 'nature', superMove: 'Autumn Gale' },
      { name: 'Saturn', icon: '🪐', elem: 'dark', superMove: 'Cosmic Rings' },
      { name: 'Comet', icon: '☄️', elem: 'fire', superMove: 'Meteor Trail' },
      { name: 'Sunny', icon: '☀️', elem: 'fire', superMove: 'Solar Flare' },
      { name: 'Selene', icon: '🌙', elem: 'dark', superMove: 'Eclipse Ray' },
      { name: 'Volt', icon: '⚡', elem: 'electric', superMove: 'Volt Cannon' },
      { name: 'Ember', icon: '🔥', elem: 'fire', superMove: 'Inferno Wave' },
      { name: 'Aqua', icon: '💧', elem: 'water', superMove: 'Tsunami Crash' },
      { name: 'Frost', icon: '❄️', elem: 'water', superMove: 'Absolute Zero' },
      { name: 'Twister', icon: '🌪️', elem: 'electric', superMove: 'Vortex Surge' },
      { name: 'Prism', icon: '🌈', elem: 'electric', superMove: 'Spectrum Laser' },
      { name: 'Jewel', icon: '💎', elem: 'water', superMove: 'Diamond Armor' },
      { name: 'Monarch', icon: '👑', elem: 'fire', superMove: 'Royal Decree' },
      { name: 'Aegis', icon: '🛡️', elem: 'nature', superMove: 'Shield Bash' },
      { name: 'Blade', icon: '⚔️', elem: 'dark', superMove: 'Sword Dance' },
      { name: 'Invader', icon: '🛸', elem: 'dark', superMove: 'UFO Abduction' },
      { name: 'Apollo', icon: '🚀', elem: 'fire', superMove: 'Rocket Blast' },
      { name: 'Mystic', icon: '🔮', elem: 'magic', superMove: 'Arcane Nova' },
      { name: 'Oracle', icon: '🧿', elem: 'magic', superMove: 'Evil Eye' },
      { name: 'Teddy', icon: '🧸', elem: 'nature', superMove: 'Cuddle Crash' },
      { name: 'Spooky', icon: '🎃', elem: 'dark', superMove: 'Jack-o-Lantern' },
      { name: 'Boo', icon: '👻', elem: 'dark', superMove: 'Spooky Haunt' },
      { name: 'Zorblax', icon: '👽', elem: 'dark', superMove: 'Alien Ray' },
      { name: 'Ryu', icon: '🐲', elem: 'fire', superMove: 'Dragon Rage' },
      { name: 'Badger', icon: '🦡', elem: 'nature', superMove: 'Burrow Ambush' },
      { name: 'Castor', icon: '🦫', elem: 'water', superMove: 'River Lodge' },
      { name: 'Skunk', icon: '🦨', elem: 'dark', superMove: 'Stench Blast' },
      { name: 'Joey', icon: '🦘', elem: 'nature', superMove: 'Bounce Slam' },
      { name: 'Alpaca', icon: '🦙', elem: 'nature', superMove: 'Fleece Guard' },
      { name: 'Rhinoceros', icon: '🦏', elem: 'electric', superMove: 'Thunder Charge' },
      { name: 'Hippo', icon: '🦛', elem: 'water', superMove: 'Mud Cannon' },
      { name: 'Mammoth', icon: '🐘', elem: 'water', superMove: 'Ice Quake' },
      { name: 'Giraffe', icon: '🦒', elem: 'nature', superMove: 'Stomp Wave' },
      { name: 'Peacock', icon: '🦚', elem: 'nature', superMove: 'Tail Mirage' },
      { name: 'Parrot', icon: '🦜', elem: 'nature', superMove: 'Mimic Strike' },
      { name: 'Cygnus', icon: '🦢', elem: 'water', superMove: 'Wing Shield' },
      { name: 'Phoenic', icon: '🦩', elem: 'water', superMove: 'Pink Geyser' },
      { name: 'Selkie', icon: '🦭', elem: 'water', superMove: 'Tide Cry' },
      { name: 'Lutra', icon: '🦦', elem: 'water', superMove: 'Stream Whirl' },
      { name: 'Nocturne', icon: '🦇', elem: 'dark', superMove: 'Shadow Wings' },
      { name: 'Noctis', icon: '🦉', elem: 'electric', superMove: 'Moon Lightning' },
      { name: 'Aquila', icon: '🦅', elem: 'nature', superMove: 'Sky Piercer' },
      { name: 'Fenrir', icon: '🐺', elem: 'dark', superMove: 'Winter Howl' },
      { name: 'Kitsune', icon: '🦊', elem: 'magic', superMove: 'Fox Fire' },
      { name: 'Simba', icon: '🦁', elem: 'nature', superMove: 'Prideland Roar' },
      { name: 'Tora', icon: '🐯', elem: 'fire', superMove: 'Blaze Pounce' },
      { name: 'Pardus', icon: '🐆', elem: 'dark', superMove: 'Stealth Slash' },
      { name: 'Ursa', icon: '🐻', elem: 'nature', superMove: 'Claw Slam' },
      { name: 'Bamboo', icon: '🐼', elem: 'nature', superMove: 'Bao Roll' },
      { name: 'Koala', icon: '🐨', elem: 'nature', superMove: 'Gumtree Guard' },
      { name: 'Sloth', icon: '🦥', elem: 'nature', superMove: 'Snooze Barrier' },
      { name: 'Chipmunk', icon: '🐿️', elem: 'nature', superMove: 'Nut Cannon' },
      { name: 'Clover', icon: '🐇', elem: 'nature', superMove: 'Hop Barrage' },
      { name: 'Mouse', icon: '🐁', elem: 'electric', superMove: 'Static Zap' },
      { name: 'Rat', icon: '🐀', elem: 'dark', superMove: 'Shadow Nibble' },
      { name: 'Bristle', icon: '🦔', elem: 'nature', superMove: 'Quill Shield' },
      { name: 'Gecko', icon: '🦎', elem: 'nature', superMove: 'Camouflage' },
      { name: 'Viper', icon: '🐍', elem: 'nature', superMove: 'Poison Fang' },
      { name: 'Tortoise', icon: '🐢', elem: 'water', superMove: 'Ancient Guard' },
      { name: 'Caiman', icon: '🐊', elem: 'water', superMove: 'River Jaw' },
      { name: 'Toad', icon: '🐸', elem: 'water', superMove: 'Toxic Bubble' },
      { name: 'Megalodon', icon: '🦈', elem: 'water', superMove: 'Ocean Terror' },
      { name: 'Orca', icon: '🐬', elem: 'water', superMove: 'Deep Crest' },
      { name: 'Baleen', icon: '🐳', elem: 'water', superMove: 'Baleen Tidal' },
      { name: 'Octo', icon: '🐙', elem: 'water', superMove: 'Eightfold Wrap' },
      { name: 'Cuttle', icon: '🦑', elem: 'water', superMove: 'Ink Flash' },
      { name: 'Homarus', icon: '🦞', elem: 'water', superMove: 'Armored Pinch' },
      { name: 'Kani', icon: '🦀', elem: 'water', superMove: 'Sidestep Chop' },
      { name: 'Krill', icon: '🦐', elem: 'water', superMove: 'Snap Shock' },
      { name: 'Fugu', icon: '🐡', elem: 'water', superMove: 'Poison Spikes' },
      { name: 'Tang', icon: '🐠', elem: 'water', superMove: 'Blue Fin Slash' },
      { name: 'Salmon', icon: '🐟', elem: 'water', superMove: 'Upstream Leap' },
      { name: 'Papillon', icon: '🦋', elem: 'nature', superMove: 'Flutter Gale' },
      { name: 'Hornet', icon: '🐝', elem: 'electric', superMove: 'Plasma Sting' },
      { name: 'Ladybird', icon: '🐞', elem: 'nature', superMove: 'Lucky Shell' },
      { name: 'Locust', icon: '🦗', elem: 'nature', superMove: 'Swarm Devour' },
      { name: 'Tarantula', icon: '🕷️', elem: 'dark', superMove: 'Poison Web' },
      { name: 'Scorpio', icon: '🦂', elem: 'dark', superMove: 'Stinger Guillotine' },
      { name: 'Carnotaur', icon: '🦖', elem: 'fire', superMove: 'Horn Rampage' },
      { name: 'Diplodocus', icon: '🦕', elem: 'nature', superMove: 'Tail Whip Slam' },
      { name: 'Alicorn', icon: '🦄', elem: 'magic', superMove: 'Holy Thunder' }
    ];

    const secretCompanions = secretSpecies.map((s, idx) => ({
      id: 'secret_' + (idx + 1),
      name: s.name,
      icon: s.icon,
      element: s.elem,
      superMove: s.superMove,
      secret: true
    }));

    // =====================================================================
    //  SHARED HELPERS
    // =====================================================================
    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    const rnd = getRandomInt;
    function pick(arr) { return arr[rnd(0, arr.length - 1)]; }
    function gcd(a, b) { return b ? gcd(b, a % b) : a; }
    function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
    function sgnStr(n) { return n < 0 ? '− ' + (-n) : '+ ' + n; }
    function negFirst(n) { return n < 0 ? '−' + (-n) : '' + n; }
    function negParen(n) { return n < 0 ? '(−' + (-n) + ')' : '' + n; }
    function fmtAns(a) { return Number.isInteger(a) ? String(a) : String(+a.toFixed(2)); }

    function polyStr(terms) {
      let s = '';
      terms.forEach(function (t) {
        const c = t[0], e = t[1];
        if (c === 0) return;
        const abs = Math.abs(c);
        let body;
        if (e === 0) body = '' + abs;
        else body = (abs === 1 ? '' : abs) + 'x' + (e === 1 ? '' : '<sup>' + e + '</sup>');
        if (s === '') s = (c < 0 ? '−' : '') + body;
        else s += ' ' + (c < 0 ? '−' : '+') + ' ' + body;
      });
      return s || '0';
    }

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
      if (clockPausedAt !== null) { questionStartTime += Date.now() - clockPausedAt; clockPausedAt = null; }
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
    function isModalOpen() {
      return Array.prototype.some.call(document.querySelectorAll('.modal-overlay'), function (m) {
        return m.style.display === 'flex';
      });
    }

    // =====================================================================
    //  MATH PROBLEM GENERATORS  (grade 0=K-2 ... 5=Calculus)
    // =====================================================================
    function vert(n1, n2, op, ans) {
      return { layout: 'vertical', num1: n1, num2: n2, operator: op, answer: ans };
    }

    function genAdd(g) {
      let n1, n2;
      if (g === 0) { n1 = rnd(2, 15); n2 = rnd(1, 12); }
      else if (g === 1) {
        if (Math.random() > 0.4) { n1 = rnd(100, 750); n2 = rnd(50, 240); }
        else { n1 = rnd(15, 99); n2 = rnd(10, 89); }
      }
      else if (g === 2) { n1 = rnd(120, 9999); n2 = rnd(100, 5999); }
      else { n1 = rnd(1000, 59999); n2 = rnd(1000, 39999); }
      return vert(n1, n2, '+', n1 + n2);
    }

    function genSub(g) {
      let big, small;
      if (g === 0) { big = rnd(5, 20); small = rnd(1, big - 1); }
      else if (g === 1) {
        if (Math.random() > 0.4) { big = rnd(100, 950); small = rnd(25, big - 10); }
        else { big = rnd(20, 99); small = rnd(5, big - 5); }
      }
      else if (g === 2) { big = rnd(200, 9999); small = rnd(50, big - 10); }
      else { big = rnd(2000, 99999); small = rnd(1000, big - 100); }
      return vert(big, small, '−', big - small);
    }

    function genMul(g) {
      let a, b;
      if (g === 0) { a = rnd(2, 5); b = rnd(1, 5); }
      else if (g === 1) { a = rnd(2, 12); b = rnd(2, 12); }
      else if (g === 2) { a = rnd(11, 30); b = rnd(3, 12); }
      else if (g === 3) { a = rnd(11, 49); b = rnd(11, 29); }
      else { a = rnd(21, 99); b = rnd(11, 60); }
      return { layout: 'inline', expr: a + ' × ' + b, answer: a * b };
    }

    function genDiv(g) {
      let d, q;
      if (g === 0) { d = rnd(2, 5); q = rnd(1, 5); }
      else if (g === 1) { d = rnd(2, 12); q = rnd(2, 12); }
      else if (g === 2) { d = rnd(3, 15); q = rnd(5, 25); }
      else if (g === 3) { d = rnd(6, 25); q = rnd(12, 60); }
      else { d = rnd(11, 45); q = rnd(15, 99); }
      return { layout: 'inline', expr: (d * q) + ' ÷ ' + d, answer: q };
    }

    function genFrac(g) {
      const dens = g === 1 ? [2, 3, 4, 5, 10] : [2, 3, 4, 5, 6, 8, 10, 12];
      const d = pick(dens);
      const n = rnd(1, d - 1);
      const whole = d * rnd(2, g === 1 ? 8 : 15);
      return { expr: n + '/' + d + ' of ' + whole, answer: whole / d * n };
    }

    function genMean(g) {
      const count = rnd(4, 5);
      const m = rnd(5, g === 1 ? 20 : 60);
      let nums, last;
      do {
        nums = [];
        for (let i = 0; i < count - 1; i++) nums.push(rnd(Math.max(1, m - 8), m + 8));
        last = m * count - nums.reduce(function (a, b) { return a + b; }, 0);
      } while (last < 1 || last > m + 20);
      nums.push(last);
      return { layout: 'stack', expr: 'Average of ' + nums.join(', '), lead: 'Mean =', answer: m };
    }

    function genPow(g) {
      let b, e;
      if (g === 1) { b = rnd(2, 12); e = 2; }
      else if (g === 2) {
        if (Math.random() < 0.6) { b = rnd(2, 15); e = 2; } else { b = rnd(2, 6); e = 3; }
      } else {
        const t = rnd(0, 2);
        if (t === 0) { b = rnd(2, 9); e = rnd(2, 4); }
        else if (t === 1) { b = 2; e = rnd(5, 12); }
        else { b = rnd(3, 5); e = rnd(3, 5); }
      }
      return { layout: 'inline', expr: b + '<sup>' + e + '</sup>', answer: Math.pow(b, e) };
    }

    function genSqrt(g) {
      const useCube = g >= 2 && Math.random() < 0.3;
      if (useCube) {
        const r = rnd(2, g >= 3 ? 12 : 10);
        return { layout: 'inline', expr: '∛' + (r * r * r), answer: r };
      }
      const max = g === 1 ? 12 : (g === 2 ? 20 : (g === 3 ? 30 : 40));
      const r = rnd(2, max);
      return { layout: 'inline', expr: '√' + (r * r), answer: r };
    }

    function genOrder(g) {
      let expr, ans, a, b, c, d;
      if (g <= 1) {
        const t = rnd(0, 2);
        a = rnd(2, 9); b = rnd(2, 9); c = rnd(2, 9);
        if (t === 0) { expr = a + ' + ' + b + ' × ' + c; ans = a + b * c; }
        else if (t === 1) { c = rnd(1, Math.min(9, a * b - 1)); expr = a + ' × ' + b + ' − ' + c; ans = a * b - c; }
        else { expr = a + ' × ' + b + ' + ' + c; ans = a * b + c; }
      } else if (g === 2) {
        const t = rnd(0, 2);
        if (t === 0) { a = rnd(2, 12); b = rnd(2, 12); c = rnd(2, 9); expr = '(' + a + ' + ' + b + ') × ' + c; ans = (a + b) * c; }
        else if (t === 1) { a = rnd(10, 30); b = rnd(2, 9); c = rnd(2, 9); d = rnd(1, 15); expr = a + ' + ' + b + ' × ' + c + ' − ' + d; ans = a + b * c - d; }
        else { a = rnd(10, 30); b = rnd(2, a - 1); c = rnd(2, 9); d = rnd(1, 20); expr = '(' + a + ' − ' + b + ') × ' + c + ' + ' + d; ans = (a - b) * c + d; }
      } else {
        const t = rnd(0, 2);
        if (t === 0) { a = rnd(5, 30); b = rnd(2, 9); c = rnd(2, 9); d = rnd(2, 9); expr = a + ' + ' + b + '<sup>2</sup> − ' + c + ' × ' + d; ans = a + b * b - c * d; }
        else if (t === 1) { a = rnd(1, 9); b = rnd(1, 9); c = rnd(1, 40); expr = '(' + a + ' + ' + b + ')<sup>2</sup> − ' + c; ans = (a + b) * (a + b) - c; }
        else { a = rnd(2, 9); b = rnd(2, 12); c = rnd(2, 12); d = rnd(2, 9); expr = a + ' × (' + b + ' − ' + c + ') + ' + d + '<sup>2</sup>'; ans = a * (b - c) + d * d; }
      }
      return { layout: 'stack', expr: expr, lead: '=', answer: ans };
    }

    function genPct(g) {
      const pcts = g === 2 ? [10, 20, 25, 50, 75] : [5, 10, 15, 20, 25, 30, 40, 60, 75, 80, 90, 120, 150];
      const p = pick(pcts);
      const step = 100 / gcd(p, 100);
      const base = step * rnd(1, g === 2 ? 8 : 20);
      return { layout: 'inline', expr: p + '% of ' + base, answer: base * p / 100 };
    }

    function genDec(g) {
      const dp = g >= 3 ? 2 : 1;
      const sc = Math.pow(10, dp);
      const a = rnd(11, g >= 3 ? 3999 : 399) / sc;
      const b = rnd(11, g >= 3 ? 2999 : 299) / sc;
      const t = rnd(0, 2);
      if (t === 0) return { expr: a.toFixed(dp) + ' + ' + b.toFixed(dp), answer: a + b };
      if (t === 1) {
        const hi = Math.max(a, b), lo = Math.min(a, b);
        return { expr: hi.toFixed(dp) + ' − ' + lo.toFixed(dp), answer: hi - lo };
      }
      const m = rnd(2, 9);
      return { expr: a.toFixed(dp) + ' × ' + m, answer: a * m };
    }

    function genNeg(g) {
      const R = g >= 3 ? 60 : 20;
      const sign = function () { return Math.random() < 0.5 ? -1 : 1; };
      const t = rnd(0, 3);
      let a, b;
      if (t === 2) {
        a = rnd(2, 12) * sign(); b = rnd(2, 12) * sign();
        if (a > 0 && b > 0) a = -a;
        return { layout: 'inline', expr: negFirst(a) + ' × ' + negParen(b), answer: a * b };
      }
      if (t === 3) {
        b = rnd(2, 12) * sign(); const q = rnd(2, 12) * sign();
        if (b > 0 && q > 0) b = -b;
        return { layout: 'inline', expr: negFirst(b * q) + ' ÷ ' + negParen(b), answer: q };
      }
      a = rnd(2, R) * sign(); b = rnd(2, R) * sign();
      if (a > 0 && b > 0) b = -b;
      if (t === 0) return { layout: 'stack', expr: negFirst(a) + ' + ' + negParen(b), lead: '=', answer: a + b };
      return { layout: 'stack', expr: negFirst(a) + ' − ' + negParen(b), lead: '=', answer: a - b };
    }

    function genAlg(g) {
      let expr, x;
      if (g === 2) {
        x = rnd(2, 20);
        if (Math.random() < 0.5) { const a = rnd(2, 20); expr = 'x + ' + a + ' = ' + (x + a); }
        else { const a = rnd(2, 9); x = rnd(2, 12); expr = a + 'x = ' + (a * x); }
      } else if (g === 3) {
        const a = rnd(2, 9), b = rnd(-20, 20) || 5;
        x = rnd(-10, 12) || 3;
        const c = a * x + b;
        expr = a + 'x ' + sgnStr(b) + ' = ' + negFirst(c);
      } else {
        let a, b, c, d;
        do {
          a = rnd(3, 12); c = rnd(1, a - 1); x = rnd(-9, 12) || 4; b = rnd(-15, 15);
          d = a * x + b - c * x;
        } while (b === 0 || d === 0);
        expr = a + 'x ' + sgnStr(b) + ' = ' + c + 'x ' + sgnStr(d);
      }
      return { layout: 'stack', expr: expr, lead: 'x =', answer: x };
    }

    function genLog(g) {
      if (g >= 4 && Math.random() < 0.3) {
        const k = rnd(2, 9);
        return { layout: 'inline', expr: 'ln(e<sup>' + k + '</sup>)', answer: k };
      }
      const opts = [[2, 2, 10], [3, 2, 6], [4, 2, 5], [5, 2, 4], [10, 2, 6]];
      const o = pick(opts);
      const k = rnd(o[1], o[2]);
      return { layout: 'inline', expr: 'log<sub>' + o[0] + '</sub>(' + Math.pow(o[0], k) + ')', answer: k };
    }

    function genQuad(g) {
      let r, s;
      do {
        r = g === 3 ? rnd(1, 9) : rnd(-9, 9);
        s = g === 3 ? rnd(1, 9) : rnd(-9, 9);
      } while (r === s || r === 0 || s === 0);
      const expr = polyStr([[1, 2], [-(r + s), 1], [r * s, 0]]) + ' = 0';
      return { layout: 'stack', expr: expr, lead: 'Larger root x =', answer: Math.max(r, s) };
    }

    function genDeriv(g) {
      const deg = g >= 5 ? rnd(3, 4) : rnd(2, 3);
      const terms = [];
      for (let e = deg; e >= 0; e--) {
        const c = e === deg ? rnd(1, 5) * (Math.random() < 0.3 ? -1 : 1) : (Math.random() < 0.7 ? rnd(-6, 6) : 0);
        terms.push([c, e]);
      }
      const x0 = rnd(-3, 4);
      let val = 0;
      terms.forEach(function (t) { if (t[1] > 0) val += t[0] * t[1] * Math.pow(x0, t[1] - 1); });
      return { layout: 'stack', expr: 'f(x) = ' + polyStr(terms), lead: 'f′(' + negFirst(x0) + ') =', answer: val };
    }

    function genIntegral(g) {
      const d = rnd(2, g >= 5 ? 4 : 3);
      const k = rnd(1, g >= 5 ? 4 : 3);
      const anti = [];
      for (let i = 0; i < d; i++) {
        anti.push(i === d - 1 ? rnd(1, 3) * (Math.random() < 0.3 ? -1 : 1) : rnd(-3, 3));
      }
      const terms = [];
      let val = 0;
      for (let i = d - 1; i >= 0; i--) {
        terms.push([(i + 1) * anti[i], i]);
        val += anti[i] * Math.pow(k, i + 1);
      }
      return {
        layout: 'stack',
        expr: '∫<sub>0</sub><sup>' + k + '</sup> (' + polyStr(terms) + ') dx',
        lead: '=',
        answer: val
      };
    }

    function genLimit() {
      const t = rnd(0, 2);
      if (t === 0) {
        let r = rnd(-4, 6); if (r === 0) r = 3;
        const s = rnd(-5, 8);
        const num = polyStr([[1, 2], [s - r, 1], [-r * s, 0]]);
        const den = r > 0 ? 'x − ' + r : 'x + ' + (-r);
        return { layout: 'stack', expr: 'lim<sub>x→' + r + '</sub> (' + num + ') / (' + den + ')', lead: '=', answer: r + s };
      }
      if (t === 1) {
        const a = rnd(1, 4), k = rnd(2, 6), b = rnd(-5, 5), c = rnd(1, 9);
        const num = polyStr([[k * a, 2], [b, 1]]);
        const den = polyStr([[a, 2], [c, 0]]);
        return { layout: 'stack', expr: 'lim<sub>x→∞</sub> (' + num + ') / (' + den + ')', lead: '=', answer: k };
      }
      const a = rnd(2, 9);
      return { layout: 'stack', expr: 'lim<sub>x→0</sub> sin(' + a + 'x) / x', lead: '=', answer: a };
    }

    const HARD_OPS = ['mean', 'order', 'alg', 'log', 'quad', 'deriv', 'integral', 'limit', 'dec'];

    const MATH_OPS = [
      { id: 'add',      icon: '➕',   label: 'Addition',             minGrade: 0, gen: genAdd },
      { id: 'sub',      icon: '➖',   label: 'Subtraction',          minGrade: 0, gen: genSub },
      { id: 'mul',      icon: '✖️',   label: 'Multiplication',       minGrade: 0, gen: genMul },
      { id: 'div',      icon: '➗',   label: 'Division',             minGrade: 0, gen: genDiv },
      { id: 'frac',     icon: '🍕',   label: 'Fractions of a number', minGrade: 1, gen: genFrac },
      { id: 'mean',     icon: '📊',   label: 'Averages (mean)',      minGrade: 1, gen: genMean },
      { id: 'pow',      icon: 'xⁿ',   label: 'Exponents',            minGrade: 1, gen: genPow },
      { id: 'sqrt',     icon: '√',    label: 'Roots',                minGrade: 1, gen: genSqrt },
      { id: 'order',    icon: '🧮',   label: 'Order of operations',  minGrade: 1, gen: genOrder },
      { id: 'pct',      icon: '%',    label: 'Percents',             minGrade: 2, gen: genPct },
      { id: 'dec',      icon: '0.5',  label: 'Decimals',             minGrade: 2, gen: genDec },
      { id: 'neg',      icon: '±',    label: 'Negative numbers',     minGrade: 2, gen: genNeg },
      { id: 'alg',      icon: '𝑥',    label: 'Solve for x',          minGrade: 2, gen: genAlg },
      { id: 'log',      icon: 'log',  label: 'Logarithms',           minGrade: 3, gen: genLog },
      { id: 'quad',     icon: 'x²',   label: 'Quadratics',           minGrade: 3, gen: genQuad },
      { id: 'deriv',    icon: 'd/dx', label: 'Derivatives',          minGrade: 4, gen: genDeriv },
      { id: 'integral', icon: '∫',    label: 'Integrals',            minGrade: 4, gen: genIntegral },
      { id: 'limit',    icon: 'lim',  label: 'Limits',               minGrade: 5, gen: genLimit }
    ];
    const OP_BY_ID = {};
    MATH_OPS.forEach(function (o) { OP_BY_ID[o.id] = o; });

    function getActiveOps() {
      const g = state.grade;
      let ops = (state.enabledOps || []).filter(function (id) {
        return OP_BY_ID[id] && OP_BY_ID[id].minGrade <= g;
      });
      if (ops.length === 0) {
        ops = GRADE_DEFAULT_OPS[g].filter(function (id) { return OP_BY_ID[id] && OP_BY_ID[id].minGrade <= g; });
      }
      return ops.length ? ops : ['add'];
    }

    let currentProblem = { layout: 'inline', expr: '', answer: 0, modeTag: 'add' };
    let userInput = '';
    let questionStartTime = Date.now();
    let lastOpId = null;
    let inputLocked = false;

    let lastSig = '';
    function sigOf(p) { return (p.expr || (p.num1 + p.operator + p.num2)) + '|' + p.answer; }

    // ----- streak milestone celebrations -----
    const MILESTONES = {
      5: { text: '🔥 5 IN A ROW!', sub: 'Nice combo! +2 💎', gems: 2 },
      10: { text: '⚡ 10 IN A ROW!', sub: 'Unstoppable! +5 💎', gems: 5 },
      25: { text: '👑 25 IN A ROW!', sub: 'LEGENDARY! +15 💎', gems: 15 }
    };
    function soundFanfare(big) {
      const notes = big ? [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51, 1567.98] : [523.25, 659.25, 783.99, 1046.5];
      notes.forEach(function (f, i) { setTimeout(function () { playTone(f, 0.22, 'triangle'); }, i * 95); });
    }
    function streakMilestone(n) {
      const m = MILESTONES[n];
      state.gems += m.gems;
      soundFanfare(n >= 10);
      for (let i = 0; i < (n >= 25 ? 4 : n >= 10 ? 2 : 1); i++) setTimeout(launchConfetti, i * 220);
      const ov = document.getElementById('milestone-overlay');
      document.getElementById('milestone-big').innerText = m.text;
      document.getElementById('milestone-sub').innerText = m.sub;
      ov.classList.remove('show');
      void ov.offsetWidth;
      ov.classList.add('show');
      setTimeout(function () { ov.classList.remove('show'); }, 1900);
      const w = document.getElementById('fighter-icon-wrapper');
      w.classList.remove('buddy-dance');
      void w.offsetWidth;
      w.classList.add('buddy-dance');
      setTimeout(function () { w.classList.remove('buddy-dance'); }, 1300);
    }

    // ----- boss weak points: one math type hits this boss extra hard -----
    const ELEM_WEAK_OPS = {
      fire: ['mul', 'pow', 'pct'],
      water: ['sub', 'div', 'frac'],
      nature: ['add', 'mean', 'order'],
      electric: ['mul', 'div', 'sqrt', 'alg'],
      dark: ['sub', 'neg', 'log'],
      magic: ['alg', 'order', 'frac', 'quad', 'limit']
    };
    function weakOpForBoss(idx) {
      const ops = getActiveOps();
      if (ops.length < 2 || idx < 0 || !monstersList[idx]) return null;
      const pref = (ELEM_WEAK_OPS[monstersList[idx].element] || []).filter(function (o) { return ops.indexOf(o) !== -1; });
      const pool = pref.length ? pref : ops;
      return pool[idx % pool.length];
    }
    function getWeakOp() {
      const r = state.raid;
      if (r) {
        const ops = getActiveOps();
        const w = r.weaks[r.phase];
        return ops.length >= 2 && ops.indexOf(w) !== -1 ? w : null;
      }
      return weakOpForBoss(currentMonsterIndex);
    }
    function updateWeakChip() {
      const chip = document.getElementById('weak-chip');
      if (!chip) return;
      const w = getWeakOp();
      const r = state.raid;
      const head = r ? '👑 RAID phase ' + (r.phase + 1) + '/' + r.total + (w ? ' · ' : '') : '';
      chip.innerText = (w || r) ? head + (w ? '🎯 Weak point: ' + OP_BY_ID[w].icon + ' ' + OP_BY_ID[w].label : '') : '';
    }

    // ----- adaptive difficulty: two misses in a row on one type -> a gentler problem next -----
    const missStreak = {};
    const easyQueue = {};
    function easyScore(p) {
      const plain = (p.expr || (p.num1 + ' ' + p.num2)).replace(/<[^>]+>/g, '');
      return plain.length + String(Math.abs(p.answer)).length * 2;
    }
    function genEasy(id) {
      const op = OP_BY_ID[id];
      const g = Math.max(op.minGrade, state.grade - 1);
      let best = null;
      for (let i = 0; i < 5; i++) {
        const c = op.gen(g);
        if (!best || easyScore(c) < easyScore(best)) best = c;
      }
      return best;
    }

    function generateProblem() {
      const ops = getActiveOps();
      const queued = ops.filter(function (o) { return easyQueue[o]; });
      const weak = getWeakOp();
      let id = queued.length ? queued[0] : pick(ops);
      if (!queued.length && weak && weak !== lastOpId && Math.random() < 0.4) id = weak;
      else if (!queued.length && ops.length > 1 && id === lastOpId) {
        id = pick(ops.filter(function (o) { return o !== lastOpId; }));
      }
      lastOpId = id;
      const wantEasy = !!easyQueue[id];
      delete easyQueue[id];
      const make = function () { return wantEasy ? genEasy(id) : OP_BY_ID[id].gen(state.grade); };
      let p = make();
      for (let tries = 0; tries < 6 && lastSig && sigOf(p) === lastSig; tries++) p = make();
      p.easy = wantEasy;
      lastSig = sigOf(p);
      p.modeTag = id;
      if (!p.layout) {
        const plain = p.expr.replace(/<[^>]+>/g, '');
        p.layout = plain.length > 13 ? 'stack' : 'inline';
      }
      p.answer = Math.round(p.answer * 100) / 100;
      currentProblem = p;
      userInput = '';
      inputLocked = false;
      hintUsed = false;
      renderHintUI();
      updateWeakChip();
      questionStartTime = Date.now();
      padReset();
      renderEquationUI();
    }

    function renderEquationUI() {
      const mount = document.getElementById('equation-mount');
      const valText = userInput === '' ? '?' : userInput;
      const p = currentProblem;
      mount.classList.toggle('weak-glow', !!p.modeTag && p.modeTag === getWeakOp());

      if (p.layout === 'vertical') {
        mount.innerHTML = \`
          <div class="equation-vertical">
            <div class="vertical-row"><span>\${p.num1}</span></div>
            <div class="vertical-row bottom-row">
              <span class="vertical-op">\${p.operator}</span>
              <span>\${p.num2}</span>
            </div>
            <div class="vertical-row">
              <div class="answer-box" id="answer-box">\${valText}</div>
            </div>
          </div>\`;
      } else if (p.layout === 'inline') {
        mount.innerHTML = \`
          <div class="equation-inline">
            <span>\${p.expr}</span>
            <span>=</span>
            <div class="answer-box" id="answer-box">\${valText}</div>
          </div>\`;
      } else {
        mount.innerHTML = \`
          <div class="equation-stack">
            <div class="eq-expr">\${p.expr}</div>
            <div class="eq-ans">
              <span class="eq-lead">\${p.lead || '='}</span>
              <div class="answer-box" id="answer-box">\${valText}</div>
            </div>
          </div>\`;
      }
    }

    function pressKey(key) {
      if (inputLocked) return;
      soundClick();
      if (key === 'backspace') {
        userInput = userInput.slice(0, -1);
      } else if (key === 'clear') {
        userInput = '';
      } else if (key === 'neg') {
        userInput = userInput.charAt(0) === '-' ? userInput.slice(1) : '-' + userInput;
      } else if (key === 'dot') {
        if (userInput.indexOf('.') === -1) {
          const body = userInput.replace('-', '');
          userInput = body === '' ? userInput + '0.' : userInput + '.';
        }
      } else {
        if (userInput.replace('-', '').length < 7) {
          if (userInput === '0') userInput = key;
          else if (userInput === '-0') userInput = '-' + key;
          else userInput += key;
        }
      }
      const answerBox = document.getElementById('answer-box');
      if (answerBox) answerBox.innerText = userInput === '' ? '?' : userInput;
      syncPad();
    }

    // =====================================================================
    //  BUDDIES: LEVELS, XP, EVOLUTION LINES  (Pokémon style)
    // =====================================================================
    const MAX_LEVEL = 100;
    function xpForLevel(L) { return L <= 1 ? 0 : Math.floor(2.4 * Math.pow(L, 2.3)); }
    function levelFromXp(xp) {
      let L = 1;
      while (L < MAX_LEVEL && xp >= xpForLevel(L + 1)) L++;
      return L;
    }

    // Store buddies: 3 forms (base -> evolved -> Mega)
    storePets.forEach(function (p) {
      const e1 = 16 + Math.round(((p.evoLevel || 30) - 30) / 3.5);
      p.forms = [
        { name: p.name, icon: p.icon, minLevel: 1 },
        { name: p.evoName, icon: p.evoIcon, minLevel: e1 },
        { name: 'Mega ' + p.evoName, icon: p.evoIcon, minLevel: Math.max(e1 + 20, 55) }
      ];
    });
    // Rescued buddies: base -> Solar -> Cosmic
    function secretForms(p) {
      return [
        { name: p.name, icon: p.icon, minLevel: 1 },
        { name: 'Solar ' + p.name, icon: '👑 ' + p.icon, minLevel: 30 },
        { name: 'Cosmic ' + p.name, icon: '🌌 ' + p.icon, minLevel: 65 }
      ];
    }
    janiePet.forms = secretForms(janiePet);
    mythicCompanions.forEach(function (p) { p.forms = secretForms(p); });
    secretCompanions.forEach(function (p) { p.forms = secretForms(p); });

    function getSpecies(id) {
      if (id === 'secret_janie') return janiePet;
      return storePets.find(function (p) { return p.id === id; }) ||
             mythicCompanions.find(function (p) { return p.id === id; }) ||
             secretCompanions.find(function (p) { return p.id === id; }) || null;
    }
    function getBuddyXp(id) { return (state.buddyXp && state.buddyXp[id]) || 0; }
    function getBuddyLevel(id) { return levelFromXp(getBuddyXp(id)); }
    function getFormIndex(sp, level) {
      let idx = 0;
      sp.forms.forEach(function (f, i) { if (level >= f.minLevel) idx = i; });
      return idx;
    }

    function getPetById(id) {
      const sp = getSpecies(id) || storePets[0];
      const level = getBuddyLevel(sp.id);
      const stage = getFormIndex(sp, level);
      const form = sp.forms[stage];
      const suffix = stage === 1 ? ' EX' : (stage === 2 ? ' MAX' : '');
      return {
        id: sp.id,
        name: form.name,
        baseName: sp.name,
        icon: form.icon,
        element: sp.element,
        superMove: sp.superMove + suffix,
        stage: stage,
        level: level,
        isEvolved: stage > 0,
        secret: !!sp.secret,
        mythic: !!sp.mythic,
        isJanie: !!sp.isJanie
      };
    }
    function getActivePetDisplay() { return getPetById(state.activePet); }

    function getArmorHp() { return getArmor(state.activeArmor).hp; }
    function getPetMaxHp(id) { const p = getPetById(id); return 3 + Math.floor(p.level / 8) + p.stage + getArmorHp(); }
    function getPetAttack(id) { const p = getPetById(id); return 1 + Math.floor(p.level / 12) + p.stage; }

    function getPetHp(id) { return partyHp[id] === undefined ? getPetMaxHp(id) : Math.min(partyHp[id], getPetMaxHp(id)); }
    function setPetHp(id, v) { partyHp[id] = Math.max(0, v); }

    function getOwnedIds() { return state.unlockedPets.concat(state.unlockedSecrets); }
    function getBestLevel() {
      let best = 1;
      getOwnedIds().forEach(function (id) { best = Math.max(best, getBuddyLevel(id)); });
      return best;
    }
    // New buddies join at half the level of your strongest buddy
    function grantBuddy(id) {
      if (state.buddyXp[id] === undefined) {
        state.buddyXp[id] = xpForLevel(Math.max(1, Math.floor(getBestLevel() * 0.5)));
      }
    }

    function awardBuddyXp(amount) {
      const id = state.activePet;
      amount = Math.round(amount * (1 + 0.04 * getBond(id)));
      const before = getPetById(id);
      const oldMax = getPetMaxHp(id);
      const curHp = getPetHp(id);
      state.buddyXp[id] = Math.min(xpForLevel(MAX_LEVEL), getBuddyXp(id) + amount);
      const after = getPetById(id);
      if (after.level > before.level) {
        state.gems += 3 * (after.level - before.level);
        const newMax = getPetMaxHp(id);
        partyHp[id] = Math.min(newMax, curHp + (newMax - oldMax));
        soundLevelUp();
        toast('⬆️ ' + after.baseName + ' grew to Lv ' + after.level + '!');
        if (after.stage > before.stage) {
          state.gems += 25;
          enqueueModal(function () { openEvoModal(before, after); });
        }
      }
      return after;
    }

    function openEvoModal(before, after) {
      soundSecretFound();
      launchConfetti();
      document.getElementById('evo-title').innerText = 'What? ' + before.name + ' is evolving!';
      document.getElementById('evo-from').innerHTML = before.icon;
      document.getElementById('evo-to').innerHTML = after.icon;
      document.getElementById('evo-text').innerText = before.name + ' evolved into ' + after.name + '!  (+25 💎)';
      document.getElementById('evo-stats').innerText =
        'Lv ' + after.level + '  •  ❤️ HP ' + getPetMaxHp(after.id) + '  •  ⚔️ ATK ' + getPetAttack(after.id) + '  •  Ult: ' + after.superMove;
      const m = document.getElementById('evo-modal');
      const row = m.querySelector('.evo-row');
      row.classList.remove('go'); void row.offsetWidth; row.classList.add('go');
      m.style.display = 'flex';
    }
    function closeEvoModal() {
      soundClick();
      document.getElementById('evo-modal').style.display = 'none';
      updateStatsUI();
      saveState();
      modalDone();
    }

    // =====================================================================
    //  BOSSES: LEVELS + EVOLVED FORMS
    // =====================================================================
    function getBossFormIndex(lvl) { return lvl >= 45 ? 2 : (lvl >= 20 ? 1 : 0); }
    function getBossInfo() {
      const base = monstersList[currentMonsterIndex];
      const form = getBossFormIndex(bossLevel);
      const name = form === 2 ? 'Alpha ' + base.name : (form === 1 ? 'Elder ' + base.name : base.name);
      return {
        name: state.raid ? '👑 ' + name : name, icon: base.icon, element: base.element, taunts: base.taunts,
        form: form, level: bossLevel,
        maxHp: base.baseHp + Math.floor(bossLevel / 3) + form * 2 + (state.raid ? 2 : 0),
        atk: 1 + (form === 2 ? 1 : 0)
      };
    }
    function getBossMaxHp() { return getBossInfo().maxHp; }

    const TYPE_STRONG = {
      fire: ['nature'],
      water: ['fire'],
      nature: ['water', 'electric'],
      electric: ['water', 'magic'],
      dark: ['nature'],
      magic: ['dark', 'fire']
    };
    function getTypeRelation(att, def) {
      if (att === 'shadow' || def === 'shadow') return 0;
      if ((TYPE_STRONG[att] || []).indexOf(def) !== -1) return 1;
      if ((TYPE_STRONG[def] || []).indexOf(att) !== -1) return -1;
      return 0;
    }

    function pickNextBoss() {
      if (!state.recentBossTypes) state.recentBossTypes = [];
      let excludedType = null;
      const len = state.recentBossTypes.length;
      if (len >= 2 && state.recentBossTypes[len - 1] === state.recentBossTypes[len - 2]) {
        excludedType = state.recentBossTypes[len - 1];
      }
      let candidates = [];
      for (let i = 0; i < monstersList.length; i++) {
        if (excludedType && monstersList[i].element === excludedType) continue;
        if (i !== currentMonsterIndex) candidates.push(i);
      }
      if (candidates.length === 0) candidates = monstersList.map(function (_, idx) { return idx; });

      const nextIdx = candidates[rnd(0, candidates.length - 1)];
      currentMonsterIndex = nextIdx;
      state.currentMonsterIndex = nextIdx;
      state.recentBossTypes.push(monstersList[nextIdx].element);
      if (state.recentBossTypes.length > 10) state.recentBossTypes = state.recentBossTypes.slice(-10);

      bossLevel = clamp(getBuddyLevel(state.activePet) + rnd(-2, 3), 1, MAX_LEVEL);
      state.raid = null;
      if (state.monstersDefeated > 0 && state.monstersDefeated % 10 === 0 && state.lastRaidAt !== state.monstersDefeated) {
        startRaid();
        bossLevel = clamp(bossLevel + 3, 1, MAX_LEVEL);
      }
      state.bossLevel = bossLevel;
      monsterCurrentHp = getBossMaxHp();
      partyHp = {};
      bossMistakes = 0;
      markBossSeen(currentMonsterIndex);
    }

    // =====================================================================
    //  SAVE / LOAD (+ migration from the old solve-count system)
    // =====================================================================
    function migrateState(old) {
      state.buddyXp = state.buddyXp || {};
      const fixList = function (list) {
        const out = [];
        (list || []).forEach(function (id) {
          let base = id;
          if (typeof id === 'string' && id.slice(-4) === '_evo') {
            base = id.slice(0, -4);
            const sp = getSpecies(base);
            if (sp) state.buddyXp[base] = Math.max(state.buddyXp[base] || 0, xpForLevel(sp.forms[1].minLevel));
          }
          if (getSpecies(base) && out.indexOf(base) === -1) out.push(base);
        });
        return out;
      };
      state.unlockedPets = fixList(state.unlockedPets);
      state.unlockedSecrets = fixList(state.unlockedSecrets);
      state.faintedPets = fixList(state.faintedPets);
      if (typeof state.activePet === 'string' && state.activePet.slice(-4) === '_evo') state.activePet = state.activePet.slice(0, -4);

      if (old && old.companionSolves) {
        Object.keys(old.companionSolves).forEach(function (id) {
          const base = id.replace('_evo', '');
          state.buddyXp[base] = Math.max(state.buddyXp[base] || 0, old.companionSolves[id] * 14);
        });
      }
      delete state.companionSolves;
      delete state.mode;
      delete state.level;
      delete state.xp;
    }

    function loadState() {
      const saved = localStorage.getItem('math_quest_save');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          state = Object.assign(freshState(), parsed);
          migrateState(parsed);
        } catch (e) {
          state = freshState();
        }
      }
      if (state.unlockedPets.indexOf('dog') === -1) state.unlockedPets.unshift('dog');
      if (!state.unlockedAccessories || !state.unlockedAccessories.length) state.unlockedAccessories = ['none'];
      if (!state.activeAccessory) state.activeAccessory = 'none';
      if (!Array.isArray(state.unlockedArmor) || !state.unlockedArmor.length) state.unlockedArmor = ['none'];
      if (!state.activeArmor || state.unlockedArmor.indexOf(state.activeArmor) === -1) state.activeArmor = 'none';
      if (!state.recentBossTypes) state.recentBossTypes = [];
      if (!state.bossBook || typeof state.bossBook !== 'object') state.bossBook = {};
      if (!Array.isArray(state.bookClaims)) state.bookClaims = [];
      if (!state.buddyXp) state.buddyXp = {};
      const sc = state.streakCal;
      if (!sc || typeof sc !== 'object') state.streakCal = { count: 0, last: '', total: 0, claimed: [] };
      else {
        sc.count = clamp(parseInt(sc.count, 10) || 0, 0, CAL_LEN);
        sc.total = Math.max(0, parseInt(sc.total, 10) || 0);
        if (typeof sc.last !== 'string') sc.last = '';
        if (!Array.isArray(sc.claimed)) sc.claimed = [];
      }
      if (!state.stats || typeof state.stats.days !== 'object' || !state.stats.days) state.stats = { days: {} };
      if (!state.parentGoal || typeof state.parentGoal !== 'object') state.parentGoal = { minutes: 20, reward: '', notified: '' };
      state.parentGoal.minutes = clamp(parseInt(state.parentGoal.minutes, 10) || 20, 5, 240);
      state.parentGoal.reward = String(state.parentGoal.reward || '').slice(0, 60);
      if (typeof state.parentGoal.notified !== 'string') state.parentGoal.notified = '';
      if (typeof state.parentPin !== 'string' || !/^[0-9]{4}$/.test(state.parentPin)) state.parentPin = '';
      state.raidsCleared = Math.max(0, parseInt(state.raidsCleared, 10) || 0);
      state.lastRaidAt = Math.max(0, parseInt(state.lastRaidAt, 10) || 0);
      if (!state.care || typeof state.care !== 'object' || Array.isArray(state.care)) state.care = {};
      if (!Array.isArray(state.team)) state.team = [];
      if (!state.duelStat || typeof state.duelStat !== 'object') state.duelStat = { day: '', count: 0 };
      state.duelStat.count = Math.max(0, parseInt(state.duelStat.count, 10) || 0);
      if (typeof state.duelStat.day !== 'string') state.duelStat.day = '';
      if (!state.tour || typeof state.tour !== 'object') state.tour = { day: '', runs: 0, trophies: 0, wins: 0 };
      state.tour.trophies = Math.max(0, parseInt(state.tour.trophies, 10) || 0);
      state.tour.wins = Math.max(0, parseInt(state.tour.wins, 10) || 0);
      state.tour.runs = Math.max(0, parseInt(state.tour.runs, 10) || 0);
      if (typeof state.tour.day !== 'string') state.tour.day = '';
      const rd = state.raid;
      if (!rd || typeof rd !== 'object' || !Array.isArray(rd.weaks) || !(rd.total >= 2) || !(rd.phase >= 0 && rd.phase < rd.total)) state.raid = null;
      state.grade = clamp(parseInt(state.grade, 10) || 0, 0, GRADES.length - 1);
      if (!Array.isArray(state.enabledOps) || state.enabledOps.length === 0) state.enabledOps = GRADE_DEFAULT_OPS[state.grade].slice();
      if (!getSpecies(state.activePet) || getOwnedIds().indexOf(state.activePet) === -1) state.activePet = 'dog';

      partyHp = {};
      if (state.currentMonsterIndex >= 0 && state.currentMonsterIndex < monstersList.length && state.recentBossTypes.length > 0 && state.bossLevel) {
        currentMonsterIndex = state.currentMonsterIndex;
        bossLevel = clamp(state.bossLevel, 1, MAX_LEVEL);
        monsterCurrentHp = getBossMaxHp();
      } else {
        currentMonsterIndex = -1;
        pickNextBoss();
      }
      bossMistakes = 0;
      markBossSeen(currentMonsterIndex);
    }

    function saveState() {
      try { localStorage.setItem('math_quest_save', JSON.stringify(state)); } catch (e) {}
      if (typeof acctMarkDirty === 'function') acctMarkDirty();
    }

    // =====================================================================
    //  UI REFRESH
    // =====================================================================
    function setStageClass(el, prefix, n) {
      el.classList.remove(prefix + '0', prefix + '1', prefix + '2');
      el.classList.add(prefix + n);
    }

    function updateBattleUI() {
      const boss = getBossInfo();
      const pet = getActivePetDisplay();
      const petMax = getPetMaxHp(pet.id);
      const petHp = getPetHp(pet.id);

      document.getElementById('monster-name').innerText = boss.name;
      updateWeakChip();
      const mIcon = document.getElementById('monster-icon');
      mIcon.innerText = boss.icon;
      setStageClass(mIcon, 'boss-stage-', boss.form);
      document.getElementById('monster-level').innerText = boss.level;
      const bossHpNow = Math.max(0, monsterCurrentHp);
      document.getElementById('monster-hp-text').innerText = \`HP: \${bossHpNow}/\${boss.maxHp}\`;
      document.getElementById('monster-hp-bar').style.width = \`\${Math.round((bossHpNow / boss.maxHp) * 100)}%\`;

      document.getElementById('pet-hp-text').innerText = \`HP: \${petHp}/\${petMax}\`;
      document.getElementById('pet-hp-bar').style.width = \`\${Math.round((petHp / petMax) * 100)}%\`;

      const pIcon = document.getElementById('pet-fighter-icon');
      pIcon.innerHTML = pet.icon;
      setStageClass(pIcon, 'stage-', pet.stage);
      document.getElementById('pet-fighter-name').innerText = pet.name;
      document.getElementById('pet-level').innerText = pet.level;

      const accOverlay = document.getElementById('pet-accessory-overlay');
      const curAcc = accessoriesList.find(function (a) { return a.id === state.activeAccessory; }) || accessoriesList[0];
      if (curAcc && curAcc.id !== 'none') {
        accOverlay.innerText = curAcc.renderIcon;
        accOverlay.className = \`accessory-overlay \${curAcc.cssClass}\`;
      } else {
        accOverlay.innerText = '';
        accOverlay.className = 'accessory-overlay';
      }

      const armorOv = document.getElementById('pet-armor-overlay');
      const curArmor = getArmor(state.activeArmor);
      if (curArmor.id !== 'none') {
        armorOv.innerText = curArmor.renderIcon;
        armorOv.className = 'armor-overlay t' + curArmor.tier;
      } else {
        armorOv.innerText = '';
        armorOv.className = 'armor-overlay';
      }
      const candyBtn = document.getElementById('candy-btn');
      if (candyBtn) candyBtn.innerText = getCandyCost() + ' 💎 Eat';

      const petElemBadge = document.getElementById('pet-elem-badge');
      petElemBadge.innerText = pet.element;
      petElemBadge.className = \`element-pill elem-\${pet.element}\`;
      const monsterElemBadge = document.getElementById('monster-elem-badge');
      monsterElemBadge.innerText = boss.element;
      monsterElemBadge.className = \`element-pill elem-\${boss.element}\`;

      const rel = getTypeRelation(pet.element, boss.element);
      const hint = document.getElementById('type-match-hint');
      if (pet.element === 'shadow') {
        hint.innerText = '🌟 Shadow Mastery: x1.25 damage vs everything!';
        hint.style.color = '#d946ef';
      } else if (rel === 1) {
        hint.innerText = '⚡ Super effective! (x1.5 damage)';
        hint.style.color = '#4ade80';
      } else if (rel === -1) {
        hint.innerText = '⚠️ Not very effective... (x0.5 damage)';
        hint.style.color = '#f87171';
      } else {
        hint.innerText = 'Elemental Match: Neutral';
        hint.style.color = 'var(--text-muted)';
      }

      document.getElementById('ult-bar').style.width = \`\${Math.round((ultimateCharge / 3) * 100)}%\`;
      const ultBtn = document.getElementById('ult-btn');
      if (ultimateCharge >= 3) {
        ultBtn.className = 'ult-btn ready';
        ultBtn.innerText = \`🔥 \${pet.superMove}!\`;
      } else {
        ultBtn.className = 'ult-btn';
        ultBtn.innerText = \`CHARGING (\${ultimateCharge}/3)\`;
      }

      document.getElementById('comp-count-badge').innerText = getOwnedIds().length;
      document.getElementById('shield-display').innerText = state.shields;
      document.getElementById('session-count-text').innerText = sessionStats.solved;
      document.getElementById('session-goal-text').innerText = sessionStats.goal;
      document.getElementById('session-badge').innerText = \`🎁 Reward at \${sessionStats.goal}\`;

      const cloverTag = document.getElementById('clover-status');
      if (state.cloverLeft > 0) {
        cloverTag.style.display = 'inline';
        cloverTag.innerText = \`🍀 2x Gems (\${state.cloverLeft})\`;
      } else {
        cloverTag.style.display = 'none';
      }
    }

    function updatePracticeRow() {
      document.getElementById('grade-chip').innerText = '📚 ' + GRADES[state.grade].long;
      const icons = getActiveOps().map(function (id) { return OP_BY_ID[id].icon; });
      document.getElementById('ops-chip').innerText = icons.slice(0, 5).join(' ') + (icons.length > 5 ? ' +' + (icons.length - 5) : '');
    }

    function updateStatsUI() {
      updateQuestBadge();
      updateCalBadge();
      if (typeof renderHintUI === 'function') renderHintUI();
      const pet = getActivePetDisplay();
      document.getElementById('lvl-display').innerText = pet.level;
      document.getElementById('gems-display').innerText = state.gems;
      document.getElementById('streak-display').innerText = state.streak;
      document.getElementById('shop-gems').innerText = state.gems;

      const xp = getBuddyXp(pet.id);
      const base = xpForLevel(pet.level);
      const next = xpForLevel(pet.level + 1);
      if (pet.level >= MAX_LEVEL) {
        document.getElementById('xp-bar').style.width = '100%';
        document.getElementById('xp-text').innerText = 'MAX';
      } else {
        document.getElementById('xp-bar').style.width = \`\${Math.min(100, Math.round(((xp - base) / (next - base)) * 100))}%\`;
        document.getElementById('xp-text').innerText = \`\${xp - base}/\${next - base}\`;
      }
      document.getElementById('rank-display').innerText = pet.name + (pet.stage > 0 ? '  ' + (pet.stage === 1 ? '★' : '★★') : '');
      updatePracticeRow();
      updateBattleUI();
    }

    function setBossTaunt() {
      const boss = getBossInfo();
      document.getElementById('boss-taunt-box').innerText = \`\${boss.name}: "\${pick(boss.taunts)}"\`;
    }

    function showPopup(text) {
      const popup = document.getElementById('floating-popup');
      popup.innerText = text;
      popup.classList.add('show');
      setTimeout(function () { popup.classList.remove('show'); }, 850);
    }

    // =====================================================================
    //  BATTLE
    // =====================================================================
    function triggerMonsterDamage(extraDamage, weakHit) {
      extraDamage = extraDamage || 0;
      const petIconWrapper = document.getElementById('fighter-icon-wrapper');
      const monsterIcon = document.getElementById('monster-icon');
      const petFx = document.getElementById('pet-attack-fx');
      const pet = getActivePetDisplay();
      const boss = getBossInfo();

      petIconWrapper.classList.remove('tackle-right');
      void petIconWrapper.offsetWidth;
      petIconWrapper.classList.add('tackle-right');
      soundTackle();

      setTimeout(function () {
        petFx.classList.remove('slash-right');
        void petFx.offsetWidth;
        petFx.classList.add('slash-right');
      }, 100);

      setTimeout(function () {
        monsterIcon.classList.remove('hurt-flash');
        void monsterIcon.offsetWidth;
        monsterIcon.classList.add('hurt-flash');
        soundHitSlash();

        let damage = getPetAttack(pet.id) + extraDamage;
        const rel = getTypeRelation(pet.element, boss.element);
        if (pet.element === 'shadow') {
          damage = Math.ceil(damage * 1.25);
        } else if (rel === 1) {
          damage = Math.ceil(damage * 1.5);
          showPopup('SUPER EFFECTIVE! 💥');
        } else if (rel === -1) {
          damage = Math.max(1, Math.floor(damage * 0.5));
          showPopup('NOT VERY EFFECTIVE... 💧');
        }

        if (weakHit) {
          damage = Math.max(damage + 1, Math.ceil(damage * 1.5));
          showPopup('🎯 WEAK POINT! 💥');
        }
        monsterCurrentHp -= damage;

        if (monsterCurrentHp <= 0 && state.raid && state.raid.phase < state.raid.total - 1) {
          state.raid.phase += 1;
          monsterCurrentHp = getBossMaxHp();
          soundSuperMove();
          launchConfetti();
          showPopup('⚠️ PHASE ' + (state.raid.phase + 1) + '!');
          toast('👑 The raid boss changes! Find its new weak point!');
          updateStatsUI();
          saveState();
        } else if (monsterCurrentHp <= 0) {
          soundMonsterDefeated();
          launchConfetti();
          state.monstersDefeated += 1;
          questEvent('boss');
          if (bossMistakes === 0) questEvent('flawless');
          markBossWin(currentMonsterIndex, boss.form);
          buddyReact('win');
          let gemBonus = 8 + Math.floor(boss.level / 5);
          const wasRaid = state.raid ? state.raid.chapter : -1;
          if (wasRaid >= 0) { gemBonus += 40; state.raidsCleared += 1; state.raid = null; }
          state.gems += gemBonus;

          // Pokémon-style: more XP for beating higher-level bosses
          const ratio = clamp(boss.level / getBuddyLevel(state.activePet), 0.5, 2);
          awardBuddyXp(Math.round(20 + boss.level * 2 * ratio));

          const hadCasualties = state.faintedPets.length > 0;
          if (hadCasualties) {
            state.faintedPets = [];
            showPopup('✨ ALL BUDDIES REVIVED!');
          }

          checkForSecretLootDrop(hadCasualties);
          showPopup(\`VICTORY! +\${gemBonus} 💎\`);

          const shouldTriggerVault = (state.monstersDefeated % 2 === 0);
          setTimeout(function () {
            pickNextBoss();
            setBossTaunt();
            updateStatsUI();
            saveState();
            if (wasRaid >= 0) enqueueModal(function () { showRaidStory('outro', wasRaid); });
            const nb = getBossInfo();
            toast(\`A wild Lv \${nb.level} \${nb.name} appeared!\`);
            if (shouldTriggerVault) enqueueModal(startGoldenVault);
            if (state.raid && !state.raid.introSeen) { const ch = state.raid.chapter; enqueueModal(function () { showRaidStory('intro', ch); }); }
          }, 650);
        } else {
          updateBattleUI();
        }
      }, 200);
    }

    function triggerSuperMove() {
      if (ultimateCharge < 3 || inputLocked) return;
      ultimateCharge = 0;
      questEvent('ult');
      soundSuperMove();
      launchConfetti();
      const pet = getActivePetDisplay();
      showPopup(\`⚡ \${pet.superMove}!\`);
      inputLocked = true;
      triggerMonsterDamage(2 + Math.floor(pet.level / 10));
      updateBattleUI();
      setTimeout(function () { inputLocked = false; }, 700);
    }

    function triggerBuddyDamage() {
      const boss = getBossInfo();
      const pet = getActivePetDisplay();
      const id = pet.id;
      const monsterIcon = document.getElementById('monster-icon');
      const petIconWrapper = document.getElementById('fighter-icon-wrapper');
      const monsterFx = document.getElementById('monster-attack-fx');

      monsterIcon.classList.remove('tackle-left');
      void monsterIcon.offsetWidth;
      monsterIcon.classList.add('tackle-left');
      soundTackle();

      setTimeout(function () {
        monsterFx.classList.remove('slash-left');
        void monsterFx.offsetWidth;
        monsterFx.classList.add('slash-left');
      }, 100);

      setTimeout(function () {
        petIconWrapper.classList.remove('hurt-flash');
        void petIconWrapper.offsetWidth;
        petIconWrapper.classList.add('hurt-flash');
        soundHitSlash();

        let incoming = boss.atk;
        const rel = getTypeRelation(boss.element, pet.element);
        if (rel === 1) incoming += 1;
        else if (rel === -1) incoming = Math.max(1, incoming - 1);
        // no single hit may take more than 40% of the buddy's max HP (a fair fight, not a one-shot)
        incoming = Math.max(1, Math.min(incoming, Math.ceil(getPetMaxHp(id) * 0.4)));
        showPopup(rel === 1 ? \`SUPER EFFECTIVE ON BUDDY! -\${incoming} HP 💔\` : \`OUCH! BUDDY HIT -\${incoming} HP 💔\`);

        setPetHp(id, getPetHp(id) - incoming);
        state.streak = 0;
        ultimateCharge = 0;

        if (getPetHp(id) > 0) {
          updateStatsUI();
          scheduleNextProblem(1100, 'Give this one your best shot!');
          return;
        }

        // Buddy fainted
        soundBuddyFaint();
        toast('💤 ' + pet.name + ' is sleepy and needs a rest');
        if (state.faintedPets.indexOf(id) === -1) state.faintedPets.push(id);

        const alive = getOwnedIds().filter(function (pid) { return state.faintedPets.indexOf(pid) === -1; });
        if (alive.length === 0) {
          state.faintedPets = [];
          partyHp = {};
          monsterCurrentHp = getBossMaxHp();
          showPopup('💀 ALL BUDDIES FAINTED! PARTY REVIVED!');
          document.getElementById('feedback-msg').innerText = 'All buddies fell in battle! Full team revived!';
          updateStatsUI();
          scheduleNextProblem(1500, 'Try again — you can do it!');
        } else {
          alive.sort(function (a, b) { return getBuddyLevel(b) - getBuddyLevel(a); });
          state.activePet = alive[0];
          const next = getActivePetDisplay();
          showPopup(\`💔 \${pet.name} FAINTED! \${next.name} enters!\`);
          document.getElementById('feedback-msg').innerText = \`\${pet.name} needs rest! \${next.name} enters!\`;
          updateStatsUI();
          scheduleNextProblem(1400, 'Ready for the next one!');
        }
        saveState();
      }, 200);
    }

    function scheduleNextProblem(delay, msg) {
      setTimeout(function () {
        generateProblem();
        document.getElementById('feedback-msg').innerText = currentProblem.easy ? 'Warm-up round — you can do this! 🌱' : msg;
      }, delay);
    }

    function checkAnswer() {
      if (inputLocked) return;
      if (userInput === '' || userInput === '-' || userInput === '.' || userInput === '-.') return;
      const numVal = parseFloat(userInput);
      if (isNaN(numVal)) return;

      inputLocked = true;
      const answerBox = document.getElementById('answer-box');
      const feedback = document.getElementById('feedback-msg');
      const streakBanner = document.getElementById('streak-msg');
      const solveTime = (Date.now() - questionStartTime) / 1000;

      sessionStats.attempts += 1;

      if (Math.abs(numVal - currentProblem.answer) < 0.0001) {
        soundCorrect();
        if (answerBox) answerBox.className = 'answer-box correct';

        sessionStats.solved += 1;
        const opId = currentProblem.modeTag;
        sessionStats.byOp[opId] = (sessionStats.byOp[opId] || 0) + 1;
        questEvent('solve', opId);
        missStreak[opId] = 0;
        calDayEvent();
        recordStat(opId, true, solveTime, opId === getWeakOp());
        checkParentGoal();
        if (sessionStats.fastestTime === null || solveTime < sessionStats.fastestTime) sessionStats.fastestTime = solveTime;

        state.streak += 1;
        questEvent('streak', state.streak);
        if (ultimateCharge < 3) ultimateCharge += 1;

        let speedLimit = (4 + state.grade * 2.5) * (HARD_OPS.indexOf(opId) !== -1 ? 1.6 : 1);
        if (pad.used) speedLimit *= 1.75;
        const isFast = !hintUsed && solveTime <= speedLimit;
        let speedBonusGems = 0;
        if (isFast) {
          speedBonusGems = 1;
          questEvent('fast');
          showPopup('⚡ SPEED STRIKE! +1 💎');
        } else {
          showPopup('HIT! 💥');
        }

        const cloverOn = state.cloverLeft > 0;
        let xpEarned = 8 + Math.min(state.streak, 10) + (isFast ? 4 : 0);
        if (cloverOn) xpEarned = Math.round(xpEarned * 1.5);
        awardBuddyXp(xpEarned);

        triggerMonsterDamage(0, opId === getWeakOp());

        let gemsEarned = 1 + speedBonusGems + (state.streak % 3 === 0 ? 2 : 0);
        if (state.cloverLeft > 0) {
          gemsEarned *= 2;
          state.cloverLeft -= 1;
        }
        state.gems += gemsEarned;

        const praises = ['Incredible!', 'Super Sharp!', 'Crushing It!', 'Unstoppable!', 'Bullseye!', 'Math Wizard!'];
        feedback.innerText = \`\${pick(praises)} +\${xpEarned} XP\`;
        if (state.streak >= 3) streakBanner.innerText = \`🔥 \${state.streak} IN A ROW! COMBO ACTIVE!\`;
        if (MILESTONES[state.streak]) streakMilestone(state.streak);
        else if (state.streak % 5 === 0) launchConfetti();

        if (sessionStats.solved >= sessionStats.goal && !sessionStats.goalClaimed) {
          sessionStats.goalClaimed = true;
          const reached = sessionStats.goal;
          const goalReward = Math.round(reached / 2) + 12;
          state.gems += goalReward;
          setTimeout(function () {
            enqueueModal(function () {
              soundSecretFound();
              launchConfetti();
              document.getElementById('goal-done-num').innerText = reached;
              document.getElementById('goal-reward-num').innerText = goalReward;
              document.getElementById('goal-modal').style.display = 'flex';
            });
          }, 800);
        }

        updateStatsUI();
        saveState();
        scheduleNextProblem(650, 'Ready for the next one!');

      } else {
        soundWrong();
        bossMistakes += 1;
        const missOp = currentProblem.modeTag;
        recordStat(missOp, false, solveTime, false);
        missStreak[missOp] = (missStreak[missOp] || 0) + 1;
        if (missStreak[missOp] >= 2) { easyQueue[missOp] = true; missStreak[missOp] = 0; }
        if (answerBox) answerBox.className = 'answer-box wrong';

        if (state.shields > 0) {
          state.shields -= 1;
          soundShieldBreak();
          showPopup('🛡️ STREAK SHIELD SAVED YOU!');
          feedback.innerText = \`Shield absorbed it! The answer was \${fmtAns(currentProblem.answer)}\`;
          updateStatsUI();
          saveState();
          scheduleNextProblem(1300, 'Shield used up — stay sharp!');
        } else {
          feedback.innerText = \`Almost! The answer was \${fmtAns(currentProblem.answer)}\`;
          streakBanner.innerText = 'COMBO BROKEN!';
          triggerBuddyDamage();
          saveState();
        }
      }
    }

    // =====================================================================
    //  LOOT DROPS
    // =====================================================================
    function checkForSecretLootDrop(hadCasualties) {
      if (hadCasualties) return;
      const qualifiesForDrop = (state.streak >= 5) || (state.monstersDefeated % 5 === 0);
      if (!qualifiesForDrop) return;

      const isMilestonePity = (state.monstersDefeated % 10 === 0);
      const roll = Math.random();

      const giveLoot = function (drop, category) {
        grantBuddy(drop.id);
        state.unlockedSecrets.push(drop.id);
        saveState();
        enqueueModal(function () { showLootModal(drop, category); });
      };

      // 1. Janie (0.5%)
      if (state.unlockedSecrets.indexOf('secret_janie') === -1 && roll < 0.005) {
        giveLoot(janiePet, 'janie');
        return;
      }
      // 2. Mythic (4%)
      const unownedMythics = mythicCompanions.filter(function (mc) { return state.unlockedSecrets.indexOf(mc.id) === -1; });
      if (unownedMythics.length > 0 && roll < 0.04) {
        giveLoot(pick(unownedMythics), 'mythic');
        return;
      }
      // 3. Secret (12% / pity)
      const unownedSecrets = secretCompanions.filter(function (sc) { return state.unlockedSecrets.indexOf(sc.id) === -1; });
      if (unownedSecrets.length > 0 && (isMilestonePity || roll < 0.12)) {
        giveLoot(pick(unownedSecrets), 'secret');
      }
    }

    function showLootModal(pet, lootCategory) {
      pendingLootPet = pet;
      soundSecretFound();
      launchConfetti();

      const border = document.getElementById('loot-modal-border');
      const tag = document.getElementById('loot-modal-tag');
      const title = document.getElementById('loot-modal-title');
      const subtitle = document.getElementById('loot-modal-subtitle');
      const startLv = getBuddyLevel(pet.id);

      if (lootCategory === 'janie') {
        border.style.borderColor = '#10b981';
        tag.style.background = '#064e3b';
        tag.style.color = '#a7f3d0';
        tag.innerText = '🛸 ULTRA RARE COSMIC ANOMALY!';
        title.innerText = 'Janie Discovered!';
        subtitle.innerText = \`👽 The Rarest Buddy in the Universe! Joins at Lv \${startLv} • Ult: \${pet.superMove}\`;
      } else if (lootCategory === 'mythic') {
        border.style.borderColor = '#d946ef';
        tag.style.background = '#701a75';
        tag.style.color = '#fdf4ff';
        tag.innerText = '⚡ ULTRA RARE MYTHIC LEGEND!';
        title.innerText = 'Storybook Hero Rescued!';
        subtitle.innerText = \`👑 Joins at Lv \${startLv} • Signature Ult: \${pet.superMove}\`;
      } else {
        border.style.borderColor = '#818cf8';
        tag.style.background = '#312e81';
        tag.style.color = '#c7d2fe';
        tag.innerText = '🌟 Rare Encounter!';
        title.innerText = 'New Companion Rescued!';
        subtitle.innerText = \`✨ Joins at Lv \${startLv} • Special Ult: \${pet.superMove}\`;
      }

      document.getElementById('loot-modal-icon').innerHTML = pet.icon;
      document.getElementById('loot-modal-name').innerText = pet.name;
      document.getElementById('loot-modal').style.display = 'flex';
    }

    function closeLootModal(equipNow) {
      soundClick();
      if (equipNow && pendingLootPet) {
        state.activePet = pendingLootPet.id;
        saveState();
      }
      document.getElementById('loot-modal').style.display = 'none';
      pendingLootPet = null;
      updateStatsUI();
      modalDone();
    }

    // =====================================================================
    //  ITEMS
    // =====================================================================
    // ~ the gems it would take to earn that level by solving; never below 20
    function getCandyCost() {
      const lvl = getBuddyLevel(state.activePet);
      if (lvl >= MAX_LEVEL) return 0;
      return Math.max(20, Math.round((xpForLevel(lvl + 1) - getBuddyXp(state.activePet)) / 6));
    }

    function buyItem(type, cost) {
      if (type === 'candy') cost = getCandyCost();
      if (state.gems < cost) {
        soundWrong();
        toast(\`You need \${cost - state.gems} more 💎 Gems!\`);
        return;
      }
      if (type === 'candy') {
        const lvl = getBuddyLevel(state.activePet);
        if (lvl >= MAX_LEVEL) { toast('Your buddy is already max level!'); return; }
        state.gems -= cost;
        soundLevelUp();
        awardBuddyXp(xpForLevel(lvl + 1) - getBuddyXp(state.activePet));
        showPopup('🍬 RARE CANDY! LEVEL UP!');
      } else {
        state.gems -= cost;
        soundLevelUp();
        if (type === 'shield') {
          state.shields += 1;
          showPopup('+1 STREAK SHIELD! 🛡️');
        } else if (type === 'ult') {
          ultimateCharge = 3;
          showPopup('ULTIMATE CHARGED! ⚡');
        } else if (type === 'clover') {
          state.cloverLeft = (state.cloverLeft || 0) + 8;
          showPopup('LUCKY CLOVER (8 SOLVES)! 🍀');
        }
      }
      saveState();
      updateStatsUI();
    }

    // =====================================================================
    //  GOLDEN VAULT
    // =====================================================================
    let vaultTimerInterval = null;
    let vaultTimeRemaining = 20;
    let vaultGemsEarned = 0;
    let vaultCurrentAnswer = 0;

    function startGoldenVault() {
      soundSecretFound();
      launchConfetti();
      vaultTimeRemaining = 20;
      vaultGemsEarned = 0;
      document.getElementById('vault-gem-tally').innerText = '0';
      document.getElementById('vault-timer').innerText = '20s';
      document.getElementById('vault-modal').style.display = 'flex';
      nextVaultQuestion();

      clearInterval(vaultTimerInterval);
      vaultTimerInterval = setInterval(function () {
        vaultTimeRemaining -= 1;
        document.getElementById('vault-timer').innerText = \`\${vaultTimeRemaining}s\`;
        if (vaultTimeRemaining <= 0) {
          clearInterval(vaultTimerInterval);
          state.gems += vaultGemsEarned;
          saveState();
          updateStatsUI();
          setTimeout(function () {
            document.getElementById('vault-modal').style.display = 'none';
            showPopup(\`VAULT COMPLETE! +\${vaultGemsEarned} 💎\`);
            modalDone();
          }, 400);
        }
      }, 1000);
    }

    function nextVaultQuestion() {
      const basics = getActiveOps().filter(function (id) { return ['add', 'sub', 'mul', 'div'].indexOf(id) !== -1; });
      const activeOp = basics.length ? pick(basics) : 'add';
      let op = '+', n1 = 2, n2 = 2, ans = 4;
      if (activeOp === 'add') { op = '+'; n1 = rnd(2, 9); n2 = rnd(2, 9); ans = n1 + n2; }
      else if (activeOp === 'sub') { op = '−'; n1 = rnd(6, 15); n2 = rnd(2, n1 - 1); ans = n1 - n2; }
      else if (activeOp === 'mul') { op = '×'; n1 = rnd(2, 8); n2 = rnd(2, 6); ans = n1 * n2; }
      else { op = '÷'; n2 = rnd(2, 6); ans = rnd(2, 8); n1 = n2 * ans; }

      vaultCurrentAnswer = ans;
      document.getElementById('vault-eq').innerText = \`\${n1} \${op} \${n2}\`;

      const options = [ans];
      while (options.length < 3) {
        const wrongAns = ans + rnd(-4, 4);
        if (wrongAns >= 0 && options.indexOf(wrongAns) === -1) options.push(wrongAns);
      }
      options.sort(function () { return Math.random() - 0.5; });

      const btnsContainer = document.getElementById('vault-options');
      btnsContainer.innerHTML = '';
      options.forEach(function (val) {
        const b = document.createElement('button');
        b.className = 'vault-btn';
        b.innerText = val;
        b.onclick = function () { handleVaultGuess(val); };
        btnsContainer.appendChild(b);
      });
    }

    function handleVaultGuess(chosenVal) {
      if (vaultTimeRemaining <= 0) return;
      if (chosenVal === vaultCurrentAnswer) {
        soundCoinChirp();
        vaultGemsEarned += 2;
      } else {
        soundWrong();
        if (vaultGemsEarned > 0) vaultGemsEarned -= 1;
      }
      document.getElementById('vault-gem-tally').innerText = vaultGemsEarned;
      nextVaultQuestion();
    }

    function vaultPick(index) {
      const btns = document.querySelectorAll('.vault-btn');
      if (btns && btns[index]) btns[index].click();
    }

    // =====================================================================
    //  REPORT / GOAL / RESET MODALS
    // =====================================================================
    function openReportModal() {
      soundClick();
      pauseClock();
      document.getElementById('rep-solved').innerText = sessionStats.solved;
      const acc = sessionStats.attempts > 0 ? Math.round((sessionStats.solved / sessionStats.attempts) * 100) : 100;
      document.getElementById('rep-accuracy').innerText = \`\${acc}%\`;
      document.getElementById('rep-fastest').innerText = sessionStats.fastestTime ? \`\${sessionStats.fastestTime.toFixed(1)}s\` : '--';
      const ids = Object.keys(sessionStats.byOp);
      document.getElementById('rep-ops').innerHTML = ids.length
        ? ids.map(function (id) { return \`<tr><td>\${OP_BY_ID[id].icon} \${OP_BY_ID[id].label}</td><td>\${sessionStats.byOp[id]}</td></tr>\`; }).join('')
        : '<tr><td>Solved by type</td><td>--</td></tr>';
      document.getElementById('rep-secrets').innerText = state.unlockedSecrets.length;
      document.getElementById('rep-bosses').innerText = state.monstersDefeated;
      document.getElementById('rep-best').innerText = getBestLevel();
      document.getElementById('report-modal').style.display = 'flex';
    }
    function closeReportModal() {
      soundClick();
      resumeClock();
      document.getElementById('report-modal').style.display = 'none';
    }

    function closeGoalModal() {
      soundClick();
      document.getElementById('goal-modal').style.display = 'none';
      // next session goal
      sessionStats.goal += 25;
      sessionStats.goalClaimed = false;
      updateBattleUI();
      saveState();
      modalDone();
    }

    function openResetModal() {
      soundClick();
      document.getElementById('reset-cloud-note').style.display = (acct && acct.token) ? 'block' : 'none';
      document.getElementById('reset-modal').style.display = 'flex';
    }
    function closeResetModal() {
      soundClick();
      document.getElementById('reset-modal').style.display = 'none';
    }
    function closeResetOnOverlay(e) {
      if (e.target.id === 'reset-modal') closeResetModal();
    }
    function confirmReset() {
      soundWrong();
      state = freshState();
      localStorage.removeItem('math_quest_save');
      partyHp = {};
      ultimateCharge = 0;
      currentMonsterIndex = -1;
      pickNextBoss();
      sessionStats.solved = 0;
      sessionStats.attempts = 0;
      sessionStats.goal = 25;
      sessionStats.goalClaimed = false;
      sessionStats.fastestTime = null;
      sessionStats.byOp = {};
      document.getElementById('reset-modal').style.display = 'none';
      document.getElementById('settings-modal').style.display = 'none';
      setBossTaunt();
      updateStatsUI();
      generateProblem();
      saveState();
      document.getElementById('streak-msg').innerText = 'READY TO SOLVE?';
      document.getElementById('feedback-msg').innerText = 'Progress has been reset! Ready to start anew!';
    }

    // =====================================================================
    //  SETTINGS (grade level + math types)
    // =====================================================================
    function openSettings() {
      soundClick();
      pauseClock();
      renderAccount();
      checkAcctEnabled();
      renderSettings();
      document.getElementById('settings-modal').style.display = 'flex';
    }
    function closeSettings() {
      soundClick();
      resumeClock();
      document.getElementById('settings-modal').style.display = 'none';
      updateStatsUI();
    }
    function closeSettingsOnOverlay(e) {
      if (e.target.id === 'settings-modal') closeSettings();
    }

    function renderSettings() {
      const gg = document.getElementById('grade-grid');
      gg.innerHTML = '';
      GRADES.forEach(function (g) {
        const b = document.createElement('button');
        b.className = 'grade-btn' + (state.grade === g.id ? ' active' : '');
        b.innerText = g.label;
        b.onclick = function () { setGrade(g.id); };
        gg.appendChild(b);
      });

      const og = document.getElementById('ops-grid');
      og.innerHTML = '';
      MATH_OPS.filter(function (o) { return o.minGrade <= state.grade; }).forEach(function (o) {
        const on = state.enabledOps.indexOf(o.id) !== -1;
        const b = document.createElement('button');
        b.className = 'op-toggle' + (on ? ' on' : '');
        b.innerHTML = \`<span class="op-ic">\${o.icon}</span><span class="op-lb">\${o.label}</span><span class="op-sw">\${on ? 'ON' : 'OFF'}</span>\`;
        b.onclick = function () { toggleOp(o.id); };
        og.appendChild(b);
      });
    }

    function setGrade(g) {
      soundClick();
      state.grade = g;
      state.enabledOps = GRADE_DEFAULT_OPS[g].slice();
      saveState();
      renderSettings();
      updatePracticeRow();
      generateProblem();
    }

    function toggleOp(id) {
      const idx = state.enabledOps.indexOf(id);
      if (idx !== -1) {
        if (getActiveOps().length <= 1 && getActiveOps()[0] === id) {
          soundWrong();
          toast('Keep at least one math type on!');
          return;
        }
        state.enabledOps.splice(idx, 1);
      } else {
        state.enabledOps.push(id);
      }
      soundClick();
      saveState();
      renderSettings();
      updatePracticeRow();
      generateProblem();
    }


    // =====================================================================
    //  DRAWING PAD  (docks above the keypad; strokes clear on a new problem)
    // =====================================================================
    const PAD_COLORS = ['#f8fafc', '#fde047', '#38bdf8', '#f472b6', '#4ade80', '#fb923c'];
    const PAD_SIZES = [{ w: 2, t: 'S' }, { w: 4, t: 'M' }, { w: 8, t: 'L' }];
    const pad = { open: false, strokes: [], cur: null, color: PAD_COLORS[0], sizeIdx: 1, eraser: false, used: false };

    function padCanvas() { return document.getElementById('pad-canvas'); }

    function padBuildTools() {
      const box = document.getElementById('pad-colors');
      box.innerHTML = '';
      PAD_COLORS.forEach(function (c) {
        const b = document.createElement('button');
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


    // =====================================================================
    //  DAILY QUESTS
    // =====================================================================
    function dayKey() {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    const QUEST_MAKERS = {
      solve:    function () { const n = pick([15, 20, 30]); return { type: 'solve', text: 'Solve ' + n + ' problems', target: n, reward: 10 + n }; },
      op:       function () {
        const id = pick(getActiveOps()); const n = pick([5, 6, 8]);
        return { type: 'op', op: id, text: 'Solve ' + n + ' ' + OP_BY_ID[id].icon + ' ' + OP_BY_ID[id].label + ' problems', target: n, reward: 15 + n * 2 };
      },
      streak:   function () { const n = pick([5, 8]); return { type: 'streak', text: 'Reach a streak of ' + n, target: n, reward: n === 5 ? 22 : 32 }; },
      boss:     function () { const n = pick([2, 3]); return { type: 'boss', text: 'Defeat ' + n + ' bosses', target: n, reward: n === 2 ? 22 : 32 }; },
      flawless: function () { return { type: 'flawless', text: 'Beat a boss without a single mistake', target: 1, reward: 30 }; },
      fast:     function () { const n = pick([5, 8]); return { type: 'fast', text: 'Get ' + n + ' ⚡ Speed Strikes', target: n, reward: n === 5 ? 22 : 32 }; },
      ult:      function () { const n = pick([2, 3]); return { type: 'ult', text: 'Use your Ultimate ' + n + ' times', target: n, reward: n === 2 ? 20 : 28 }; }
    };
    const QUEST_CHEST_GEMS = 35;

    function makeQuests() {
      const pool = ['op', 'streak', 'boss', 'flawless', 'fast', 'ult'];
      pool.sort(function () { return Math.random() - 0.5; });
      const list = [QUEST_MAKERS.solve(), QUEST_MAKERS[pool[0]](), QUEST_MAKERS[pool[1]]()];
      list.forEach(function (q, i) { q.id = 'q' + i; q.progress = 0; q.done = false; q.claimed = false; });
      return list;
    }
    function ensureQuests() {
      const today = dayKey();
      if (!state.quests || state.quests.day !== today || !Array.isArray(state.quests.list)) {
        state.quests = { day: today, list: makeQuests(), chestClaimed: false };
        saveState();
      }
      return state.quests;
    }

    function questEvent(kind, val) {
      const qs = ensureQuests();
      let changed = false;
      qs.list.forEach(function (q) {
        if (q.done) return;
        let p = q.progress;
        if (kind === 'solve') {
          if (q.type === 'solve') p += 1;
          else if (q.type === 'op' && q.op === val) p += 1;
        } else if (kind === 'streak') {
          if (q.type === 'streak') p = Math.max(p, val);
        } else if (q.type === kind) {
          p += 1;
        }
        if (p !== q.progress) {
          q.progress = Math.min(q.target, p);
          changed = true;
          if (q.progress >= q.target) {
            q.done = true;
            toast('📜 Quest complete: ' + q.text);
          }
        }
      });
      if (changed) { saveState(); updateQuestBadge(); }
    }

    function questClaimable() {
      const qs = ensureQuests();
      let n = qs.list.filter(function (q) { return q.done && !q.claimed; }).length;
      if (qs.list.every(function (q) { return q.claimed; }) && !qs.chestClaimed) n += 1;
      return n;
    }
    function updateQuestBadge() {
      const el = document.getElementById('quest-badge');
      if (!el) return;
      const n = questClaimable();
      el.innerText = n;
      el.style.display = n > 0 ? 'inline' : 'none';
    }

    function claimQuest(i) {
      const qs = ensureQuests();
      const q = qs.list[i];
      if (!q || !q.done || q.claimed) return;
      q.claimed = true;
      state.gems += q.reward;
      soundCoinChirp();
      toast('+' + q.reward + ' 💎 quest reward!');
      saveState();
      renderQuests();
      updateStatsUI();
    }
    function claimQuestChest() {
      const qs = ensureQuests();
      if (qs.chestClaimed || !qs.list.every(function (q) { return q.claimed; })) return;
      qs.chestClaimed = true;
      state.gems += QUEST_CHEST_GEMS;
      soundSecretFound();
      launchConfetti();
      toast('🎁 Daily chest! +' + QUEST_CHEST_GEMS + ' 💎');
      saveState();
      renderQuests();
      updateStatsUI();
    }

    function renderQuests() {
      const qs = ensureQuests();
      const activeOps = getActiveOps();
      const list = document.getElementById('quest-list');
      list.innerHTML = '';
      qs.list.forEach(function (q, i) {
        const pct = Math.round((q.progress / q.target) * 100);
        const blocked = q.type === 'op' && activeOps.indexOf(q.op) === -1 && !q.done;
        let btn;
        if (q.claimed) btn = '<span style="color:#6ee7b7;">✅ Claimed</span>';
        else if (q.done) btn = '<button class="claim-btn" onclick="claimQuest(' + i + ')">Claim +' + q.reward + ' 💎</button>';
        else btn = '<span style="color:#fde047;">Reward: +' + q.reward + ' 💎</span>';
        const card = document.createElement('div');
        card.className = 'quest-card' + (q.done ? ' done' : '') + (q.claimed ? ' claimed' : '');
        card.innerHTML =
          '<div class="quest-title">' + q.text + '</div>' +
          '<div class="quest-bar"><div class="quest-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="quest-row"><span>' + q.progress + ' / ' + q.target + (blocked ? ' • turn this type on in Settings' : '') + '</span>' + btn + '</div>';
        list.appendChild(card);
      });

      const allClaimed = qs.list.every(function (q) { return q.claimed; });
      const chest = document.getElementById('quest-chest');
      if (qs.chestClaimed) {
        chest.innerHTML = '<div class="chest-card" style="text-align:center;">🎁 Daily chest opened! Come back tomorrow for new quests.</div>';
      } else {
        chest.innerHTML = '<div class="chest-card"><div class="quest-row" style="color:#fde68a;"><span>🎁 Finish &amp; claim all 3 quests for a bonus chest: +' + QUEST_CHEST_GEMS + ' 💎</span>' +
          '<button class="claim-btn" ' + (allClaimed ? '' : 'disabled') + ' onclick="claimQuestChest()">Open</button></div></div>';
      }

      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const hrs = Math.max(1, Math.ceil((midnight - now) / 3600000));
      document.getElementById('quest-reset-note').innerText = 'New quests in about ' + hrs + ' hour' + (hrs === 1 ? '' : 's') + '.';
    }
    function openQuests() {
      soundClick();
      pauseClock();
      renderQuests();
      document.getElementById('quest-modal').style.display = 'flex';
    }
    function closeQuests() {
      soundClick();
      resumeClock();
      document.getElementById('quest-modal').style.display = 'none';
      updateStatsUI();
    }
    function closeQuestsOnOverlay(e) { if (e.target.id === 'quest-modal') closeQuests(); }

    // =====================================================================
    //  DAILY STREAK CALENDAR  (a missed day pauses the streak, never wipes it)
    // =====================================================================
    const CAL_LEN = 14;
    const CAL_CHESTS = { 3: 40, 7: 90, 14: 200 };

    function dayKeyOf(d) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function yesterdayKey() {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return dayKeyOf(d);
    }

    // Called on every correct answer; only the first one each day counts.
    function calDayEvent() {
      const sc = state.streakCal;
      const today = dayKey();
      if (sc.last === today) return;
      if (sc.count >= CAL_LEN) {
        // finished a full cycle: pay out any unopened chests and start a new one
        let owed = 0;
        Object.keys(CAL_CHESTS).forEach(function (d) {
          if (sc.claimed.indexOf(Number(d)) === -1) owed += CAL_CHESTS[d];
        });
        if (owed) state.gems += owed;
        sc.count = 0;
        sc.claimed = [];
      }
      sc.count += 1;
      sc.total += 1;
      sc.last = today;
      toast('🔥 Streak day ' + sc.count + '!' + (CAL_CHESTS[sc.count] ? ' A chest is ready!' : ''));
      saveState();
      updateCalBadge();
    }

    function calClaimable() {
      const sc = state.streakCal;
      return Object.keys(CAL_CHESTS).filter(function (d) {
        return Number(d) <= sc.count && sc.claimed.indexOf(Number(d)) === -1;
      }).length;
    }
    function updateCalBadge() {
      const el = document.getElementById('cal-badge');
      if (!el) return;
      const n = calClaimable();
      el.innerText = n;
      el.style.display = n > 0 ? 'inline' : 'none';
    }

    function claimCalChest(day) {
      const sc = state.streakCal;
      if (!CAL_CHESTS[day] || day > sc.count || sc.claimed.indexOf(day) !== -1) return;
      sc.claimed.push(day);
      state.gems += CAL_CHESTS[day];
      soundSecretFound();
      launchConfetti();
      toast('🎁 Day ' + day + ' chest! +' + CAL_CHESTS[day] + ' 💎');
      saveState();
      renderCal();
      updateStatsUI();
    }

    function renderCal() {
      const sc = state.streakCal;
      const today = dayKey();
      const playedToday = sc.last === today;
      const status = document.getElementById('cal-status');
      if (playedToday) status.innerText = '✅ Today counted! You are on day ' + sc.count + '. Come back tomorrow for day ' + Math.min(sc.count + 1, CAL_LEN) + '.';
      else if (sc.count > 0 && sc.last !== yesterdayKey()) status.innerText = '⏸ Your streak is paused at day ' + sc.count + '. Solve one problem today to keep going — nothing is lost!';
      else status.innerText = 'Solve one problem today to reach day ' + (sc.count + 1) + '.';

      const grid = document.getElementById('cal-grid');
      grid.innerHTML = '';
      for (let day = 1; day <= CAL_LEN; day++) {
        const cell = document.createElement('div');
        const filled = day <= sc.count;
        let cls = 'cal-cell' + (filled ? ' filled' : '') + (filled && day === sc.count && playedToday ? ' today' : '');
        if (CAL_CHESTS[day]) {
          const opened = sc.claimed.indexOf(day) !== -1;
          cls += ' chest' + (opened ? ' opened' : (filled ? ' ready' : ''));
          cell.innerHTML = (opened ? '✅' : '🎁') + '<small>+' + CAL_CHESTS[day] + '💎</small>';
          if (filled && !opened) cell.onclick = (function (d) { return function () { claimCalChest(d); }; })(day);
        } else {
          cell.innerHTML = filled ? '🔥' : String(day);
        }
        cell.className = cls;
        grid.appendChild(cell);
      }
      document.getElementById('cal-foot').innerText = 'Chests on days 3, 7 and 14. ' + sc.total + ' day' + (sc.total === 1 ? '' : 's') + ' played in total.';
    }
    function openCal() {
      soundClick();
      pauseClock();
      renderCal();
      document.getElementById('cal-modal').style.display = 'flex';
    }
    function closeCal() {
      soundClick();
      resumeClock();
      document.getElementById('cal-modal').style.display = 'none';
      updateStatsUI();
    }
    function closeCalOnOverlay(e) { if (e.target.id === 'cal-modal') closeCal(); }

    // =====================================================================
    //  HINTS  (1 gem shows the first step; no speed bonus on that problem)
    // =====================================================================
    let hintUsed = false;
    const HINT_COST = 1;
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

    function hintFor(p) {
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
      const digits = String(Math.abs(p.answer)).replace('.', '').length;
      const clue = 'The answer ' + (p.answer < 0 ? 'is negative, ' : '') + 'has ' + digits + ' digit' + (digits === 1 ? '' : 's') + ' and starts with ' + String(Math.abs(p.answer)).charAt(0) + '.';
      return (HINT_TIPS[id] || 'Take it one small step at a time.') + ' ' + clue;
    }

    function renderHintUI() {
      const btn = document.getElementById('hint-btn');
      const box = document.getElementById('hint-box');
      if (!btn || !box) return;
      if (!hintUsed) box.innerText = '';
      btn.disabled = hintUsed || state.gems < HINT_COST;
    }
    function useHint() {
      if (hintUsed || inputLocked) return;
      if (state.gems < HINT_COST) { toast('You need 1 💎 for a hint'); return; }
      state.gems -= HINT_COST;
      hintUsed = true;
      statDay().h += 1;
      soundClick();
      document.getElementById('hint-box').innerText = '💡 ' + hintFor(currentProblem);
      saveState();
      updateStatsUI();
      renderHintUI();
    }


    // =====================================================================
    //  PLAY STATS  (feeds the parent report)
    // =====================================================================
    function escHtml(t) {
      return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    function statDay() {
      const days = state.stats.days;
      const k = dayKey();
      if (!days[k]) {
        days[k] = { s: 0, a: 0, ms: 0, h: 0, w: 0, ops: {} };
        const keys = Object.keys(days).sort();
        while (keys.length > 35) delete days[keys.shift()];
      }
      return days[k];
    }
    function recordStat(op, correct, secs, weakHit) {
      const d = statDay();
      d.a += 1;
      if (correct) d.s += 1;
      if (weakHit) d.w += 1;
      d.ms += Math.round(Math.min(Math.max(secs || 0, 0), 60) * 1000);
      const o = d.ops[op] || (d.ops[op] = [0, 0]);
      o[0] += 1;
      if (correct) o[1] += 1;
    }
    function minutesToday() {
      const d = state.stats.days[dayKey()];
      return d ? d.ms / 60000 : 0;
    }
    function checkParentGoal() {
      const g = state.parentGoal;
      const today = dayKey();
      if (g.notified === today || minutesToday() < g.minutes) return;
      g.notified = today;
      launchConfetti();
      soundSecretFound();
      toast('🏆 Daily math goal reached!' + (g.reward ? ' Reward: ' + g.reward : ' Tell a grown-up!'));
    }

    // =====================================================================
    //  PARENT REPORT
    // =====================================================================
    function weekKeys() {
      const out = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        out.push(dayKeyOf(d));
      }
      return out;
    }
    function sumDays(keys) {
      const t = { solved: 0, attempts: 0, ms: 0, hints: 0, played: 0, weak: 0, byOp: {} };
      keys.forEach(function (k) {
        const d = state.stats.days[k];
        if (!d) return;
        t.played += d.a > 0 ? 1 : 0;
        t.solved += d.s; t.attempts += d.a; t.ms += d.ms; t.hints += d.h; t.weak += d.w || 0;
        Object.keys(d.ops).forEach(function (op) {
          const o = t.byOp[op] || (t.byOp[op] = [0, 0]);
          o[0] += d.ops[op][0]; o[1] += d.ops[op][1];
        });
      });
      t.acc = t.attempts ? Math.round((t.solved / t.attempts) * 100) : 0;
      return t;
    }
    function prevWeekKeys() {
      const out = [];
      for (let i = 13; i >= 7; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        out.push(dayKeyOf(d));
      }
      return out;
    }
    function deltaText(now, before, unit) {
      const d = now - before;
      return (d > 0 ? '▲ +' : (d < 0 ? '▼ ' : '＝ ')) + (d === 0 ? 'same' : d + unit);
    }
    let parentUnlocked = false;
    function parentLocked() { return !!state.parentPin && !parentUnlocked; }
    function parentUnlock() {
      const v = document.getElementById('par-pin-in').value;
      if (v === state.parentPin) { parentUnlocked = true; document.getElementById('par-pin-in').value = ''; renderParent(); }
      else { document.getElementById('par-lock-msg').innerText = 'That PIN is not right.'; document.getElementById('par-pin-in').value = ''; soundWrong(); }
    }
    function parentSetPin() {
      const v = document.getElementById('par-pin-new').value;
      if (!/^[0-9]{4}$/.test(v)) { toast('PIN must be 4 digits'); return; }
      state.parentPin = v;
      parentUnlocked = true;
      document.getElementById('par-pin-new').value = '';
      saveState();
      toast('🔒 PIN set');
      renderParent();
    }
    function parentClearPin() {
      state.parentPin = '';
      saveState();
      toast('PIN removed');
      renderParent();
    }
    function parentSummary() {
      const w = sumDays(weekKeys());
      let t = 'Math Quest weekly summary: solved ' + w.solved + ' problems at ' + w.acc + '% accuracy in ' + Math.round(w.ms / 60000) + ' minutes over ' + w.played + ' day(s).';
      const weak = Object.keys(w.byOp).filter(function (id) { return OP_BY_ID[id] && w.byOp[id][0] >= 5 && w.byOp[id][1] / w.byOp[id][0] < 0.7; });
      t += weak.length ? ' Needs practice: ' + weak.map(function (id) { return OP_BY_ID[id].label; }).join(', ') + '.' : ' No weak spots this week!';
      return t;
    }
    function parentShare() {
      const text = parentSummary();
      if (navigator.share) navigator.share({ title: 'Math Quest summary', text: text }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('📋 Summary copied'); }, function () { toast(text); });
      else toast(text);
    }

    function renderParent() {
      const locked = parentLocked();
      document.getElementById('par-lock').style.display = locked ? 'block' : 'none';
      document.getElementById('par-content').style.display = locked ? 'none' : 'block';
      if (locked) { document.getElementById('par-lock-msg').innerText = ''; return; }
      document.getElementById('par-pin-note').innerText = state.parentPin ? 'PIN is on. You will be asked each time the app is reopened.' : 'Optional: stop little fingers from changing goals.';
      document.getElementById('par-pin-clear').style.display = state.parentPin ? 'inline-block' : 'none';
      const keys = weekKeys();
      const days = state.stats.days;
      const wk = sumDays(keys), pv = sumDays(prevWeekKeys());
      const solved = wk.solved, attempts = wk.attempts, ms = wk.ms, hints = wk.hints, played = wk.played, acc = wk.acc, byOp = wk.byOp;
      const tile = function (v, l) { return '<div class="par-tile"><b>' + v + '</b><span>' + l + '</span></div>'; };
      document.getElementById('par-tiles').innerHTML =
        tile(solved, 'Solved') + tile(attempts ? acc + '%' : '--', 'Accuracy') + tile(Math.round(ms / 60000) + 'm', 'Time played') +
        tile(played + '/7', 'Days played') + tile(hints, 'Hints used') + tile(state.streakCal.count, 'Streak day') +
        tile(wk.weak, 'Weak-point hits') + tile(state.raidsCleared, 'Raids cleared') + tile(state.tour.trophies, 'Trophies');
      document.getElementById('par-compare').innerText = pv.attempts
        ? 'vs last week: solved ' + deltaText(solved, pv.solved, '') + ' · accuracy ' + deltaText(acc, pv.acc, '%')
        : '';

      const maxMs = Math.max(60000, Math.max.apply(null, keys.map(function (k) { return days[k] ? days[k].ms : 0; })));
      const names = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
      document.getElementById('par-days').innerHTML = keys.map(function (k) {
        const m = days[k] ? days[k].ms : 0;
        const dt = new Date(k + 'T12:00:00');
        return '<div class="par-day">' + (m ? Math.round(m / 60000) : '') + '<i style="height:' + Math.round((m / maxMs) * 52) + 'px"></i>' + names[dt.getDay()] + '</div>';
      }).join('');

      const ids = Object.keys(byOp).filter(function (id) { return OP_BY_ID[id]; }).sort(function (a, b) { return byOp[b][0] - byOp[a][0]; });
      document.getElementById('par-types').innerHTML = ids.length ? ids.map(function (id) {
        const a = byOp[id][0], c = byOp[id][1];
        const pct = Math.round((c / a) * 100);
        const col = pct >= 85 ? '#10b981' : (pct >= 65 ? '#f59e0b' : '#ef4444');
        return '<div class="par-row"><span class="lbl">' + OP_BY_ID[id].icon + ' ' + OP_BY_ID[id].label + '</span><span class="bar"><i style="width:' + pct + '%; background:' + col + '"></i></span><span class="pct">' + pct + '% (' + a + ')</span></div>';
      }).join('') : '<div style="font-size:0.78rem; color:var(--text-muted);">No practice recorded yet this week.</div>';

      const weak = ids.filter(function (id) { return byOp[id][0] >= 5 && byOp[id][1] / byOp[id][0] < 0.7; });
      document.getElementById('par-weak').innerHTML = weak.length
        ? weak.map(function (id) { return '⚠️ ' + OP_BY_ID[id].icon + ' ' + OP_BY_ID[id].label + ' — worth some extra practice'; }).join('<br>')
        : (ids.length ? '✅ No weak spots this week. Great work!' : '<span style="color:var(--text-muted);">Needs at least 5 tries of a type to show.</span>');

      const g = state.parentGoal;
      const sel = document.getElementById('par-minutes');
      if (!sel.options.length) [10, 15, 20, 30, 45, 60].forEach(function (m) { sel.add(new Option(m + ' minutes', m)); });
      sel.value = String(g.minutes);
      if (sel.value !== String(g.minutes)) { sel.add(new Option(g.minutes + ' minutes', g.minutes)); sel.value = String(g.minutes); }
      document.getElementById('par-reward').value = g.reward;
      const mins = minutesToday();
      document.getElementById('par-goal-fill').style.width = Math.min(100, Math.round((mins / g.minutes) * 100)) + '%';
      document.getElementById('par-goal-text').innerText = mins >= g.minutes
        ? '🎉 Goal reached today!' + (g.reward ? ' Time for: ' + g.reward : '')
        : Math.floor(mins) + ' of ' + g.minutes + ' minutes today' + (g.reward ? ' — reward: ' + g.reward : '');
    }
    function setParentGoal() {
      const g = state.parentGoal;
      g.minutes = clamp(parseInt(document.getElementById('par-minutes').value, 10) || 20, 5, 240);
      g.reward = document.getElementById('par-reward').value.slice(0, 60);
      g.notified = minutesToday() >= g.minutes ? dayKey() : '';
      saveState();
      renderParent();
    }
    function openParent() {
      soundClick();
      pauseClock();
      parentUnlocked = false;
      renderParent();
      document.getElementById('parent-modal').style.display = 'flex';
    }
    function closeParent() {
      soundClick();
      resumeClock();
      document.getElementById('parent-modal').style.display = 'none';
    }
    function closeParentOnOverlay(e) { if (e.target.id === 'parent-modal') closeParent(); }

    // =====================================================================
    //  BOSS RAIDS  (every 10 bosses: 3 phases, a new weak point each phase)
    // =====================================================================
    const RAID_STORY = [
      { title: 'The Gate Breaks', panels: [
          { icon: '🏰', text: 'The Number Kingdom was peaceful and bright...' },
          { icon: '💥', text: 'BOOM! A dark portal tears open above the castle!' },
          { icon: '👑', text: 'A giant Raid Boss storms the gates! Only you and your buddies can stop it!' }],
        outro: 'The gates hold! But the portal is still glowing...' },
      { title: 'The Missing Numbers', panels: [
          { icon: '🔢', text: 'Oh no! The royal numbers have vanished from the library!' },
          { icon: '🕵️', text: 'Clues lead to a huge shadow guarding the stolen digits.' },
          { icon: '⚔️', text: 'Defeat it and the numbers come home!' }],
        outro: 'The numbers are back on their shelves. The king cheers!' },
      { title: 'The Frozen Bridge', panels: [
          { icon: '🌉', text: 'The Great Bridge to the Equation Hills is frozen solid.' },
          { icon: '🥶', text: 'A towering beast blocks the way and laughs at your math!' },
          { icon: '🔥', text: 'Time to heat things up, hero!' }],
        outro: 'The ice melts and the bridge reopens. On to the hills!' },
      { title: 'The Clockwork Tower', panels: [
          { icon: '🕰️', text: 'The kingdom clock has stopped ticking!' },
          { icon: '🤖', text: 'A mighty machine has taken over the clock tower.' },
          { icon: '🔧', text: 'Solve fast and set time moving again!' }],
        outro: 'Tick-tock! The clock runs again. Almost there...' },
      { title: 'The Shadow King', panels: [
          { icon: '🌑', text: 'The darkness behind the portal finally shows itself.' },
          { icon: '👁️', text: 'The Shadow King rises. Every number you know is his weakness!' },
          { icon: '🌟', text: 'This is the final stand for the Number Kingdom!' }],
        outro: 'The Shadow King fades. The Number Kingdom is saved... for now!' }
    ];

    function startRaid() {
      const ops = getActiveOps().slice();
      ops.sort(function () { return Math.random() - 0.5; });
      const weaks = [];
      for (let i = 0; i < 3; i++) weaks.push(ops[i % ops.length]);
      state.lastRaidAt = state.monstersDefeated;
      state.raid = { phase: 0, total: 3, weaks: weaks, chapter: state.raidsCleared % RAID_STORY.length, introSeen: false };
    }
    function showRaidStory(mode, chapter) {
      const st = RAID_STORY[chapter % RAID_STORY.length];
      const intro = mode === 'intro';
      if (intro && state.raid) { state.raid.introSeen = true; saveState(); }
      document.getElementById('raid-chapter').innerText = 'Chapter ' + (chapter + 1) + (intro ? ' · Raid!' : ' · Cleared!');
      document.getElementById('raid-title').innerText = intro ? st.title : '🎉 Raid Cleared!';
      const panels = intro ? st.panels : [{ icon: '🏆', text: st.outro }, { icon: '💎', text: 'Raid bonus: +40 gems!' }];
      document.getElementById('raid-panels').innerHTML = panels.map(function (pn) {
        return '<div class="comic-panel"><span class="comic-icon">' + pn.icon + '</span><span class="comic-text">' + escHtml(pn.text) + '</span></div>';
      }).join('');
      document.getElementById('raid-note').innerText = intro ? 'Raid bosses have 3 phases — and a new weak point each phase!' : 'Raids cleared: ' + state.raidsCleared;
      document.getElementById('raid-btn').innerText = intro ? '⚔️ To battle!' : 'Hooray!';
      soundFanfare(!intro ? true : false);
      document.getElementById('raid-modal').style.display = 'flex';
    }
    function closeRaidModal() {
      soundClick();
      document.getElementById('raid-modal').style.display = 'none';
      modalDone();
    }


    // =====================================================================
    //  BUDDY HUB: CARE, TRADING CARDS, TOURNAMENT
    // =====================================================================
    const SNACKS = [
      { icon: '🥩', name: 'juicy steak' }, { icon: '🍓', name: 'sweet berries' }, { icon: '🥕', name: 'crunchy carrots' },
      { icon: '🐟', name: 'fresh fish' }, { icon: '🍯', name: 'golden honey' }, { icon: '🧀', name: 'stinky cheese' },
      { icon: '🍉', name: 'watermelon' }, { icon: '🌰', name: 'toasty nuts' }
    ];
    const TREAT_COST = 2, FAV_COST = 8, MAX_BOND = 5, MAX_PETS_PER_DAY = 3;
    const ELEM_COLORS = { fire: '#ef4444', water: '#38bdf8', nature: '#22c55e', electric: '#facc15', dark: '#8b5cf6', magic: '#ec4899', shadow: '#a855f7' };

    function favSnack(id) {
      let h = 0;
      for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973;
      return SNACKS[h % SNACKS.length];
    }
    function getCare(id) {
      const today = dayKey();
      let c = state.care[id];
      if (!c) c = state.care[id] = { day: today, pets: 0, treat: false, fav: false, bond: 0, last: '' };
      if (c.day !== today) { c.day = today; c.pets = 0; c.treat = false; c.fav = false; }
      return c;
    }
    function getBond(id) {
      const c = state.care && state.care[id];
      return c ? clamp(parseInt(c.bond, 10) || 0, 0, MAX_BOND) : 0;
    }
    function addXpTo(id, amt) {
      state.buddyXp[id] = Math.min(xpForLevel(MAX_LEVEL), getBuddyXp(id) + amt);
    }
    function isSleepy(id) { return state.faintedPets.indexOf(id) !== -1; }
    function moodOf(id) {
      if (isSleepy(id)) return { icon: '😴', text: 'Sleepy — wakes up after your next boss win' };
      const c = getCare(id);
      if (c.treat || c.fav) return { icon: '😄', text: 'Happy and full!' };
      const gap = c.last ? Math.round((new Date(dayKey() + 'T12:00:00') - new Date(c.last + 'T12:00:00')) / 86400000) : 9;
      if (gap >= 2) return { icon: '🥺', text: 'Feeling a bit hungry...' };
      return { icon: '🙂', text: 'Doing fine' };
    }

    // arena reactions
    function buddyReact(kind) {
      const w = document.getElementById('fighter-icon-wrapper');
      const b = document.getElementById('mood-bubble');
      if (!w || !b) return;
      if (kind === 'win') {
        w.classList.remove('happy-bounce');
        void w.offsetWidth;
        w.classList.add('happy-bounce');
        setTimeout(function () { w.classList.remove('happy-bounce'); }, 1000);
        b.innerText = pick(['🥳', '❤️', '✨']);
        b.classList.remove('show');
        void b.offsetWidth;
        b.classList.add('show');
      }
    }

    // ----- hub shell -----
    let hubPet = 'dog';
    let hubTab = 'care';
    function openHub() {
      soundClick();
      pauseClock();
      hubPet = getOwnedIds().indexOf(state.activePet) !== -1 ? state.activePet : 'dog';
      renderHub();
      document.getElementById('hub-modal').style.display = 'flex';
    }
    function closeHub() {
      soundClick();
      resumeClock();
      document.getElementById('hub-modal').style.display = 'none';
      saveState();
      updateStatsUI();
    }
    function closeHubOnOverlay(e) { if (e.target.id === 'hub-modal') closeHub(); }
    function hubStep(dir) {
      const ids = getOwnedIds();
      const i = ids.indexOf(hubPet);
      hubPet = ids[(i + dir + ids.length) % ids.length];
      soundClick();
      renderHub();
    }
    function setHubTab(t) { soundClick(); hubTab = t; renderHub(); }
    function renderHub() {
      const d = getPetById(hubPet);
      const sleepy = isSleepy(hubPet);
      const ic = document.getElementById('hub-icon');
      ic.className = 'hub-icon' + (sleepy ? ' sleepy' : '');
      ic.innerHTML = d.icon + (sleepy ? '<span style="font-size:1.2rem;">💤</span>' : '');
      document.getElementById('hub-name').innerText = d.name;
      document.getElementById('hub-sub').innerText = 'Lv ' + d.level + ' · ' + d.element + ' · ' + moodOf(hubPet).icon + ' ' + moodOf(hubPet).text;
      const tabs = [['care', '💖 Care'], ['card', '🃏 Card'], ['tour', '🏆 Cup'], ['duel', '⚔️ Duel']];
      const tb = document.getElementById('hub-tabs');
      tb.innerHTML = '';
      tabs.forEach(function (t) {
        const b = document.createElement('button');
        b.className = 'grade-btn' + (hubTab === t[0] ? ' active' : '');
        b.innerText = t[1];
        b.onclick = function () { setHubTab(t[0]); };
        tb.appendChild(b);
      });
      if (hubTab === 'care') renderCare();
      else if (hubTab === 'card') renderCardTab();
      else if (hubTab === 'duel') renderDuelTab();
      else renderTourTab();
    }

    // ----- care -----
    function heartsHtml(n) {
      let h = '';
      for (let i = 0; i < MAX_BOND; i++) h += i < n ? '❤️' : '🤍';
      return h;
    }
    function renderCare() {
      const id = hubPet;
      const c = getCare(id);
      const sleepy = isSleepy(id);
      const fav = favSnack(id);
      const bond = getBond(id);
      const row = function (title, desc, btn) {
        return '<div class="care-row"><div><div class="t">' + title + '</div><div class="d">' + desc + '</div></div>' + btn + '</div>';
      };
      const btn = function (label, fn, off) {
        return '<button class="claim-btn" ' + (off ? 'disabled' : '') + ' onclick="' + fn + '">' + label + '</button>';
      };
      let h = '<div class="hearts" title="Bond">' + heartsHtml(bond) + '</div>' +
        '<div style="font-size:0.68rem; color:var(--text-muted);">Bond ' + bond + '/' + MAX_BOND + (bond ? ' · +' + (bond * 4) + '% XP for this buddy' : ' · feed the favorite snack to grow it') + '</div>';
      if (sleepy) h += '<div class="care-row" style="justify-content:center;">😴 Shhh... resting. Beat a boss to wake everyone up!</div>';
      h += row('🤚 Pet', 'Cuddles today: ' + c.pets + '/' + MAX_PETS_PER_DAY + ' · +3 XP each', btn('Pet', 'careAct(&quot;pet&quot;)', sleepy || c.pets >= MAX_PETS_PER_DAY));
      h += row('🍪 Biscuit', 'A tasty treat · +10 XP · once a day', btn(c.treat ? 'Eaten' : TREAT_COST + ' 💎', 'careAct(&quot;treat&quot;)', sleepy || c.treat));
      h += row(fav.icon + ' Favorite: ' + fav.name, 'Their very favorite! +1 bond · +25 XP · once a day', btn(c.fav ? 'Eaten' : FAV_COST + ' 💎', 'careAct(&quot;fav&quot;)', sleepy || c.fav));
      h += '<div style="font-size:0.7rem; color:var(--text-muted); margin-top:4px;">You have 💎 ' + state.gems + '</div>';
      document.getElementById('hub-body').innerHTML = h;
    }
    function hubBounce(emoji) {
      const ic = document.getElementById('hub-icon');
      ic.classList.remove('bounce');
      void ic.offsetWidth;
      ic.classList.add('bounce');
      if (emoji) toast(emoji);
    }
    function careAct(kind) {
      const id = hubPet;
      if (isSleepy(id)) return;
      const c = getCare(id);
      const name = getPetById(id).baseName;
      if (kind === 'pet') {
        if (c.pets >= MAX_PETS_PER_DAY) return;
        c.pets += 1;
        addXpTo(id, 3);
        soundClick();
        hubBounce('💕 ' + name + ' loves it!');
      } else if (kind === 'treat') {
        if (c.treat || state.gems < TREAT_COST) { if (!c.treat) toast('Not enough 💎'); return; }
        state.gems -= TREAT_COST;
        c.treat = true;
        addXpTo(id, 10);
        soundCoinChirp();
        hubBounce('🍪 Yum! ' + name + ' is happy!');
      } else if (kind === 'fav') {
        if (c.fav || state.gems < FAV_COST) { if (!c.fav) toast('Not enough 💎'); return; }
        state.gems -= FAV_COST;
        c.fav = true;
        addXpTo(id, 25);
        const before = c.bond;
        c.bond = Math.min(MAX_BOND, c.bond + 1);
        soundSecretFound();
        if (c.bond > before) launchConfetti();
        hubBounce(favSnack(id).icon + ' ' + name + ' LOVES ' + favSnack(id).name + '!' + (c.bond > before ? ' Bond up! ❤️' : ''));
      }
      c.last = dayKey();
      saveState();
      updateStatsUI();
      renderHub();
    }

    // ----- trading card -----
    function rarityOf(id) {
      const sp = getSpecies(id) || {};
      if (sp.isJanie) return { name: 'COSMIC', col: '#e879f9' };
      if (sp.mythic) return { name: 'MYTHIC', col: '#f43f5e' };
      if (sp.secret) return { name: 'LEGENDARY', col: '#fbbf24' };
      if ((sp.cost || 0) >= 400) return { name: 'EPIC', col: '#a78bfa' };
      if ((sp.cost || 0) >= 150) return { name: 'RARE', col: '#38bdf8' };
      return { name: 'COMMON', col: '#94a3b8' };
    }
    function rrect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    function drawCard(cv, id) {
      const W = 600, H = 840;
      cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d');
      const d = getPetById(id);
      const rar = rarityOf(id);
      const ec = ELEM_COLORS[d.element] || '#6366f1';
      const sleepy = isSleepy(id);
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, ec);
      g.addColorStop(0.55, '#1e1b4b');
      g.addColorStop(1, '#0f172a');
      ctx.fillStyle = g;
      rrect(ctx, 0, 0, W, H, 36); ctx.fill();
      ctx.lineWidth = 12; ctx.strokeStyle = rar.col;
      rrect(ctx, 8, 8, W - 16, H - 16, 30); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      rrect(ctx, 26, 26, W - 52, H - 52, 20); ctx.stroke();
      ctx.textBaseline = 'middle';
      // name + level
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
      ctx.font = '900 42px system-ui, sans-serif';
      ctx.fillText(d.name.length > 16 ? d.name.slice(0, 15) + '…' : d.name, 48, 66);
      ctx.textAlign = 'right'; ctx.fillStyle = '#fde047';
      ctx.font = '900 34px system-ui, sans-serif';
      ctx.fillText('Lv ' + d.level, W - 48, 66);
      // art box
      const art = ctx.createRadialGradient(W / 2, 330, 20, W / 2, 330, 260);
      art.addColorStop(0, 'rgba(255,255,255,0.35)');
      art.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = art;
      rrect(ctx, 48, 110, W - 96, 440, 24); ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.stroke();
      ctx.textAlign = 'center';
      let fs = 250;
      ctx.font = fs + 'px ' + EMOJI_FONT;
      while (ctx.measureText(d.icon).width > 400 && fs > 90) { fs -= 20; ctx.font = fs + 'px ' + EMOJI_FONT; }
      ctx.globalAlpha = sleepy ? 0.55 : 1;
      ctx.fillText(d.icon, W / 2, 335);
      ctx.globalAlpha = 1;
      if (sleepy) { ctx.font = '70px ' + EMOJI_FONT; ctx.fillText('💤', W - 120, 170); }
      // gear
      const acc = accessoriesList.find(function (a) { return a.id === state.activeAccessory; });
      const arm = getArmor(state.activeArmor);
      ctx.font = '56px ' + EMOJI_FONT;
      if (id === state.activePet) {
        if (acc && acc.renderIcon) ctx.fillText(acc.renderIcon, 110, 180);
        if (arm.renderIcon) ctx.fillText(arm.renderIcon, 110, 500);
      }
      // type pill + stars
      ctx.fillStyle = ec;
      rrect(ctx, 48, 575, 190, 46, 23); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '900 24px system-ui, sans-serif';
      ctx.fillText(d.element.toUpperCase(), 143, 599);
      ctx.textAlign = 'right'; ctx.fillStyle = '#fde047'; ctx.font = '36px ' + EMOJI_FONT;
      ctx.fillText(d.stage === 0 ? '⭐' : (d.stage === 1 ? '⭐⭐' : '⭐⭐⭐'), W - 48, 599);
      // stats
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      rrect(ctx, 48, 640, W - 96, 84, 18); ctx.fill();
      ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '900 30px system-ui, sans-serif';
      ctx.fillText('❤️ ' + getPetMaxHp(id), 150, 668);
      ctx.fillText('⚔️ ' + getPetAttack(id), 300, 668);
      ctx.fillText('🏆 ' + state.tour.trophies, 450, 668);
      ctx.font = '700 22px system-ui, sans-serif'; ctx.fillStyle = '#c7d2fe';
      ctx.fillText('HP', 150, 703); ctx.fillText('Attack', 300, 703); ctx.fillText('Trophies', 450, 703);
      // super move + bond
      ctx.font = '800 26px system-ui, sans-serif'; ctx.fillStyle = '#fde68a';
      ctx.fillText('⚡ ' + d.superMove, W / 2, 755);
      ctx.font = '28px ' + EMOJI_FONT;
      ctx.fillText(heartsHtml(getBond(id)), W / 2, 793);
      // rarity ribbon
      ctx.fillStyle = rar.col;
      rrect(ctx, W / 2 - 110, 812 - 6, 220, 0.1, 1);
      ctx.font = '900 20px system-ui, sans-serif';
      ctx.textAlign = 'left'; ctx.fillStyle = rar.col;
      ctx.fillText('◆ ' + rar.name, 48, 812);
      ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText('MATH QUEST', W - 48, 812);
    }
    function renderCardTab() {
      const rar = rarityOf(hubPet);
      document.getElementById('hub-body').innerHTML =
        '<canvas class="card-canvas" id="card-canvas"></canvas>' +
        '<div style="font-size:0.72rem; font-weight:800; color:' + rar.col + ';">◆ ' + rar.name + ' card</div>' +
        '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:6px;">' +
        '<button class="grade-btn" onclick="cardSave()">💾 Save image</button>' +
        '<button class="grade-btn" onclick="cardShare()">📤 Share</button></div>';
      drawCard(document.getElementById('card-canvas'), hubPet);
    }
    function cardBlob(cb) { document.getElementById('card-canvas').toBlob(cb, 'image/png'); }
    function cardSave() {
      cardBlob(function (blob) {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'math-quest-' + hubPet + '.png';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
        toast('🃏 Card saved!');
      });
    }
    function cardShare() {
      cardBlob(function (blob) {
        if (!blob) return;
        const file = new File([blob], 'math-quest-' + hubPet + '.png', { type: 'image/png' });
        const d = getPetById(hubPet);
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: d.name + ' — Math Quest', text: 'Check out my ' + d.name + '! Lv ' + d.level }).catch(function () {});
        } else {
          cardSave();
        }
      });
    }

    // ----- tournament: team picker -----
    function getTeam() {
      const owned = getOwnedIds();
      let t = state.team.filter(function (id, i) { return owned.indexOf(id) !== -1 && state.team.indexOf(id) === i; }).slice(0, 3);
      if (!t.length) {
        t = owned.slice().sort(function (a, b) { return getBuddyLevel(b) - getBuddyLevel(a); }).slice(0, 3);
      }
      return t;
    }
    function toggleTeam(id) {
      let t = getTeam();
      const i = t.indexOf(id);
      if (i !== -1) { if (t.length > 1) t.splice(i, 1); }
      else if (t.length < 3) t.push(id);
      else t = [t[1], t[2], id];
      state.team = t;
      soundClick();
      saveState();
      renderHub();
    }
    function tourRunsLeft() {
      const t = state.tour;
      return t.day === dayKey() ? Math.max(0, 2 - t.runs) : 2;
    }
    function renderTourTab() {
      const team = getTeam();
      let h = '<div style="font-size:0.78rem; font-weight:800; margin-bottom:2px;">Pick up to 3 buddies for your team</div>' +
        '<div class="team-grid">' + getOwnedIds().map(function (id) {
          const d = getPetById(id);
          return '<div class="team-chip' + (team.indexOf(id) !== -1 ? ' on' : '') + '" onclick="toggleTeam(&quot;' + id + '&quot;)"><b>' + d.icon + '</b>Lv ' + d.level + '</div>';
        }).join('') + '</div>';
      h += '<div style="font-size:0.72rem; color:var(--text-muted);">3 rounds vs computer trainers. Answer to attack, miss and they hit back! Type matchups count.</div>' +
        '<div style="font-size:0.72rem; margin:4px 0; color:#fde047; font-weight:800;">🏆 Trophies: ' + state.tour.trophies + ' · Rewarded runs left today: ' + tourRunsLeft() + '</div>' +
        '<button class="key-btn submit-btn" style="width:100%; height:44px; font-size:1rem;" onclick="tourStart()">🏆 Enter Tournament</button>';
      document.getElementById('hub-body').innerHTML = h;
    }


    // ----- same-room duel: one screen, two players, same questions -----
    const DUEL_REWARD_XP = 8, DUEL_REWARDED_PER_DAY = 10;
    let duelSetup = { b: [null, null], n: 10, flip: false };
    let duel = null;
    function duelDefaults() {
      const ids = getOwnedIds();
      if (!duelSetup.b[0] || ids.indexOf(duelSetup.b[0]) === -1) duelSetup.b[0] = hubPet;
      if (!duelSetup.b[1] || ids.indexOf(duelSetup.b[1]) === -1) duelSetup.b[1] = ids.filter(function (i) { return i !== duelSetup.b[0]; })[0] || duelSetup.b[0];
    }
    function renderDuelTab() {
      duelDefaults();
      const ids = getOwnedIds();
      const row = function (pi, label, col) {
        return '<div style="font-size:0.78rem; font-weight:800; color:' + col + '; text-align:left;">' + label + '</div><div class="team-grid">' + ids.map(function (id) {
          const d = getPetById(id);
          return '<div class="team-chip' + (duelSetup.b[pi] === id ? ' on' : '') + '" onclick="duelPick(' + pi + ',&quot;' + id + '&quot;)"><b>' + d.icon + '</b>Lv ' + d.level + '</div>';
        }).join('') + '</div>';
      };
      const left = Math.max(0, DUEL_REWARDED_PER_DAY - (state.duelStat.day === dayKey() ? state.duelStat.count : 0));
      document.getElementById('hub-body').innerHTML =
        '<div style="font-size:0.74rem; color:var(--text-muted); margin-bottom:4px;">Same room, one screen! Both players answer the same questions at the same time. Most right wins; a tie goes to the faster player. Pure skill: no stat edge for anyone.</div>' +
        row(0, '🔵 Player 1 (bottom)', '#7dd3fc') + row(1, '🩷 Player 2 (top)', '#f9a8d4') +
        '<div style="display:flex; gap:8px; justify-content:center; align-items:center; margin:6px 0; font-size:0.78rem; font-weight:700;">Questions: ' +
        [5, 10, 15].map(function (n) { return '<button class="grade-btn' + (duelSetup.n === n ? ' active' : '') + '" style="padding:4px 10px;" onclick="duelSetN(' + n + ')">' + n + '</button>'; }).join('') + '</div>' +
        '<label style="font-size:0.74rem; display:block; margin-bottom:6px;"><input type="checkbox" ' + (duelSetup.flip ? 'checked' : '') + ' onchange="duelSetup.flip = this.checked"> Sitting face to face (flip the top player)</label>' +
        '<div style="font-size:0.68rem; color:#fde047; margin-bottom:6px;">Each duel gives both buddies +' + DUEL_REWARD_XP + ' XP (' + left + ' rewarded duels left today).</div>' +
        '<button class="key-btn submit-btn" style="width:100%; height:44px; font-size:1rem;" onclick="duelStart(true)">⚔️ Start Duel</button>';
    }
    function duelPick(pi, id) { soundClick(); duelSetup.b[pi] = id; renderDuelTab(); }
    function duelSetN(n) { soundClick(); duelSetup.n = n; renderDuelTab(); }

    function duelStart(fresh) {
      duelDefaults();
      const qs = [];
      for (let i = 0; i < duelSetup.n; i++) qs.push(makeMcq());
      const series = fresh || !duel ? [0, 0] : duel.series;
      duel = { qs: qs, b: duelSetup.b.slice(), series: series, flip: duelSetup.flip, started: false, ended: false,
        p: [0, 1].map(function () { return { i: 0, score: 0, done: false, t: 0, lock: false }; }) };
      document.getElementById('hub-modal').style.display = 'none';
      document.getElementById('duel-modal').style.display = 'flex';
      document.getElementById('duel-mid').style.display = 'none';
      duelRender();
      duelCountdown(3);
    }
    function duelCover(html) {
      const c = document.getElementById('duel-cover');
      c.innerHTML = html;
      c.classList.add('show');
    }
    function duelCountdown(n) {
      if (!duel) return;
      const sc = duel.series;
      duelCover('<div style="font-size:0.9rem; font-weight:800;">' + getPetById(duel.b[0]).icon + ' Player 1 ' + sc[0] + ' – ' + sc[1] + ' Player 2 ' + getPetById(duel.b[1]).icon + '</div><div class="duel-count">' + (n > 0 ? n : 'GO!') + '</div>');
      if (n > 0) { soundClick(); setTimeout(function () { duelCountdown(n - 1); }, 700); }
      else {
        soundSecretFound();
        setTimeout(function () {
          if (!duel) return;
          document.getElementById('duel-cover').classList.remove('show');
          document.getElementById('duel-mid').style.display = 'block';
          duel.started = true;
          duel.t0 = Date.now();
        }, 450);
      }
    }
    function duelRender() {
      [0, 1].forEach(function (pi) {
        const pl = duel.p[pi];
        const half = document.getElementById('duel-p' + (pi + 1));
        half.className = 'duel-half p' + (pi + 1) + (pi === 1 && duel.flip ? ' flip' : '');
        const d = getPetById(duel.b[pi]);
        const head = '<div class="duel-head"><span>' + d.icon + ' ' + escHtml(d.name) + '</span><span>⭐ ' + pl.score + '</span></div>' +
          '<div class="duel-bar"><i style="width:' + Math.round((pl.i / duel.qs.length) * 100) + '%"></i></div>';
        if (pl.done) {
          half.innerHTML = head + '<div class="duel-eq" style="font-size:1.2rem;">✅ Finished! Waiting for the other player...</div><div></div>';
          return;
        }
        const q = duel.qs[pl.i];
        half.innerHTML = head + '<div class="duel-eq">' + q.html + '</div><div class="tour-opts"></div>';
        fillOptButtons(half.querySelector('.tour-opts'), q.opts, function (v) { duelAnswer(pi, v); });
      });
    }
    function duelAnswer(pi, v) {
      if (!duel || !duel.started || duel.ended) return;
      const pl = duel.p[pi];
      if (pl.done || pl.lock) return;
      const q = duel.qs[pl.i];
      if (Math.abs(v - q.ans) < 0.0001) {
        soundCorrect();
        pl.score += 1;
        pl.i += 1;
        if (pl.i >= duel.qs.length) { pl.done = true; pl.t = Date.now() - duel.t0; }
        duelRender();
        if (duel.p[0].done && duel.p[1].done) setTimeout(duelEnd, 500);
      } else {
        soundWrong();
        pl.lock = true;
        pl.i += 1;
        const half = document.getElementById('duel-p' + (pi + 1));
        half.classList.add('wrong');
        half.querySelectorAll('.vault-btn').forEach(function (b) { b.disabled = true; });
        setTimeout(function () {
          if (!duel) return;
          pl.lock = false;
          if (pl.i >= duel.qs.length) { pl.done = true; pl.t = Date.now() - duel.t0; }
          duelRender();
          if (duel.p[0].done && duel.p[1].done) setTimeout(duelEnd, 500);
        }, 900);
      }
    }
    function duelEnd() {
      if (!duel || duel.ended) return;
      duel.ended = true;
      const a = duel.p[0], b = duel.p[1];
      let win = a.score > b.score ? 0 : (b.score > a.score ? 1 : (a.t < b.t ? 0 : (b.t < a.t ? 1 : -1)));
      if (win >= 0) duel.series[win] += 1;
      const ds = state.duelStat;
      if (ds.day !== dayKey()) { ds.day = dayKey(); ds.count = 0; }
      let xpNote = '';
      if (ds.count < DUEL_REWARDED_PER_DAY) {
        ds.count += 1;
        duel.b.forEach(function (id, i) { if (i === 0 || id !== duel.b[0]) addXpTo(id, DUEL_REWARD_XP); });
        xpNote = 'Both buddies +' + DUEL_REWARD_XP + ' XP';
      }
      saveState();
      updateStatsUI();
      launchConfetti();
      soundMonsterDefeated();
      const names = ['Player 1', 'Player 2'];
      const sec = function (p) { return (p.t / 1000).toFixed(1) + 's'; };
      const title = win < 0 ? '🤝 It is a tie!' : getPetById(duel.b[win]).icon + ' ' + names[win] + ' wins!';
      duelCover('<div style="font-size:1.6rem; font-weight:900; color:#fde047;">' + title + '</div>' +
        '<div style="font-size:0.95rem; font-weight:800;">🔵 ' + a.score + '/' + duel.qs.length + ' (' + sec(a) + ') &nbsp;vs&nbsp; 🩷 ' + b.score + '/' + duel.qs.length + ' (' + sec(b) + ')</div>' +
        '<div style="font-size:1.1rem; font-weight:900;">Series: ' + duel.series[0] + ' – ' + duel.series[1] + '</div>' +
        '<div style="font-size:0.72rem; color:var(--text-muted);">' + xpNote + '</div>' +
        '<button class="key-btn submit-btn" style="width:80%; height:56px; font-size:1.3rem;" onclick="duelStart(false)">🔁 Rematch</button>' +
        '<div style="display:flex; gap:8px; width:80%;"><button class="grade-btn" style="flex:1;" onclick="duelSwap()">🔀 Swap seats</button><button class="grade-btn" style="flex:1;" onclick="duelQuit()">Done</button></div>');
    }
    function duelSwap() {
      soundClick();
      duelSetup.b = [duelSetup.b[1], duelSetup.b[0]];
      duel.series = [duel.series[1], duel.series[0]];
      duelStart(false);
    }
    function duelQuit() {
      soundClick();
      duel = null;
      document.getElementById('duel-cover').classList.remove('show');
      document.getElementById('duel-modal').style.display = 'none';
      updateStatsUI();
      document.getElementById('hub-modal').style.display = 'flex';
      renderHub();
    }

    // ----- tournament battle -----
    const TRAINERS = [
      { name: 'Trainer Maple', icon: '🧑‍🌾', say: 'My team grew up on the farm!' },
      { name: 'Captain Bolt', icon: '🧑‍✈️', say: 'Ready for takeoff... and defeat!' },
      { name: 'Professor Pi', icon: '🧑‍🏫', say: 'Let me calculate your loss!' },
      { name: 'Ninja Nia', icon: '🥷', say: 'You will not see me coming.' },
      { name: 'Chef Basil', icon: '🧑‍🍳', say: 'Cooked up a winning team!' },
      { name: 'Wizard Wren', icon: '🧙', say: 'Abracadabra, I win!' }
    ];
    let tour = null;

    function mkFighter(id, level) {
      const sp = getSpecies(id);
      const stage = getFormIndex(sp, level);
      const f = sp.forms[stage];
      return { id: id, name: f.name, icon: f.icon, element: sp.element, level: level, stage: stage,
        atk: 1 + Math.floor(level / 12) + stage, maxHp: 3 + Math.floor(level / 8) + stage, hp: 0 };
    }
    function tourMakeRound(n, avg) {
      const tr = TRAINERS[(rnd(0, TRAINERS.length - 1) + n) % TRAINERS.length];
      const pool = storePets.slice().sort(function () { return Math.random() - 0.5; }).slice(0, 3);
      const foes = pool.map(function (sp) {
        const f = mkFighter(sp.id, clamp(avg + (n - 1) * 2 + rnd(-1, 1), 1, MAX_LEVEL));
        f.hp = f.maxHp;
        return f;
      });
      return { trainer: tr, foes: foes };
    }
    function tourStart() {
      const team = getTeam();
      if (!team.length) return;
      const t = state.tour;
      if (t.day !== dayKey()) { t.day = dayKey(); t.runs = 0; }
      t.runs += 1;
      const rewarded = t.runs <= 2;
      const mine = team.map(function (id) {
        const d = getPetById(id);
        return { id: id, name: d.name, icon: d.icon, element: d.element, level: d.level, stage: d.stage,
          atk: getPetAttack(id), maxHp: getPetMaxHp(id), hp: getPetMaxHp(id) };
      });
      const avg = Math.round(mine.reduce(function (a, f) { return a + f.level; }, 0) / mine.length);
      tour = { mine: mine, avg: avg, round: 1, rewarded: rewarded, round1: tourMakeRound(1, avg), me: 0, foe: 0, answer: null, busy: false, over: false };
      saveState();
      document.getElementById('hub-modal').style.display = 'none';
      document.getElementById('tour-close').innerText = 'Give up';
      document.getElementById('tour-play').style.display = 'block';
      document.getElementById('tour-modal').style.display = 'flex';
      document.getElementById('tour-log').innerText = tour.round1.trainer.icon + ' "' + tour.round1.trainer.say + '"' + (rewarded ? '' : ' (practice run: no rewards today)');
      tourRender();
      tourQuestion();
    }
    function tourCur() { return tour.round1; }
    function tourSideHtml(f, foe) {
      const pct = Math.max(0, Math.round((f.hp / f.maxHp) * 100));
      return '<div class="ic">' + f.icon + '</div>' + escHtml(f.name) + '<br><span style="color:var(--text-muted);">Lv ' + f.level + ' · ' + f.element + '</span>' +
        '<div class="tour-hp' + (foe ? ' foe' : '') + '"><i style="width:' + pct + '%"></i></div>' + Math.max(0, f.hp) + '/' + f.maxHp + ' HP';
    }
    function tourRender() {
      const r = tourCur();
      document.getElementById('tour-title').innerText = '🏆 Tournament · Round ' + tour.round + '/3';
      document.getElementById('tour-trainer').innerText = r.trainer.icon + ' ' + r.trainer.name + ' · foes left ' + r.foes.filter(function (f) { return f.hp > 0; }).length + ' · your team ' + tour.mine.filter(function (f) { return f.hp > 0; }).length;
      document.getElementById('tour-me').innerHTML = tourSideHtml(tour.mine[tour.me], false);
      document.getElementById('tour-foe').innerHTML = tourSideHtml(r.foes[tour.foe], true);
    }
    function tourDamage(att, def) {
      let dmg = att.atk;
      const rel = getTypeRelation(att.element, def.element);
      if (att.element === 'shadow') dmg = Math.ceil(dmg * 1.25);
      else if (rel === 1) dmg = Math.ceil(dmg * 1.5);
      else if (rel === -1) dmg = Math.max(1, Math.floor(dmg * 0.5));
      return Math.max(1, dmg);
    }
    function makeMcq() {
      const op = pick(getActiveOps());
      const p = OP_BY_ID[op].gen(state.grade);
      const ans = Math.round(p.answer * 100) / 100;
      const expr = p.layout === 'vertical' ? p.num1 + ' ' + p.operator + ' ' + p.num2 : p.expr;
      const mag = Math.abs(ans);
      const step = Number.isInteger(ans) ? (mag >= 100 ? Math.pow(10, Math.floor(Math.log10(mag)) - 1) : 1) : 0.1;
      const opts = [ans];
      let guard = 0;
      while (opts.length < 4 && guard++ < 60) {
        const k = rnd(1, 5) * (Math.random() < 0.5 ? -1 : 1);
        const v = Math.round((ans + k * step) * 100) / 100;
        if (opts.indexOf(v) === -1) opts.push(v);
      }
      opts.sort(function () { return Math.random() - 0.5; });
      return { op: op, ans: ans, opts: opts, html: expr + ' <span style="color:var(--text-muted);">' + (p.lead || '=') + ' ?</span>' };
    }
    function fillOptButtons(box, opts, onPick) {
      box.innerHTML = '';
      opts.forEach(function (v) {
        const b = document.createElement('button');
        b.className = 'vault-btn';
        b.innerText = fmtAns(v);
        b.onclick = function () { onPick(v, b); };
        box.appendChild(b);
      });
    }
    function tourQuestion() {
      if (!tour || tour.over) return;
      const q = makeMcq();
      tour.answer = q.ans;
      tour.op = q.op;
      tour.t0 = Date.now();
      document.getElementById('tour-eq').innerHTML = q.html;
      fillOptButtons(document.getElementById('tour-opts'), q.opts, function (v) { tourAnswer(v); });
      tour.busy = false;
    }
    function tourFlash(id) {
      const el = document.getElementById(id);
      el.classList.remove('hit');
      void el.offsetWidth;
      el.classList.add('hit');
    }
    function tourAnswer(v) {
      if (!tour || tour.busy || tour.over) return;
      tour.busy = true;
      const r = tourCur();
      const me = tour.mine[tour.me], foe = r.foes[tour.foe];
      const ok = Math.abs(v - tour.answer) < 0.0001;
      const secs = (Date.now() - tour.t0) / 1000;
      recordStat(tour.op, ok, secs, false);
      calDayEvent();
      let msg;
      let next = 700;
      if (ok) {
        questEvent('solve', tour.op);
        soundCorrect();
        const dmg = tourDamage(me, foe);
        foe.hp -= dmg;
        tourFlash('tour-foe');
        msg = '✅ ' + me.name + ' hits for ' + dmg + '!';
        if (foe.hp <= 0) {
          msg += ' ' + foe.name + ' is out!';
          next = 1100;
          const alive = r.foes.map(function (f, i) { return f.hp > 0 ? i : -1; }).filter(function (i) { return i >= 0; });
          if (alive.length) tour.foe = alive[0];
          else { tourRender(); document.getElementById('tour-log').innerText = msg; setTimeout(tourRoundWon, 900); return; }
        }
      } else {
        soundWrong();
        const dmg = tourDamage(foe, me);
        me.hp -= dmg;
        tourFlash('tour-me');
        msg = '❌ Answer was ' + fmtAns(tour.answer) + '. ' + foe.name + ' hits for ' + dmg + '!';
        if (me.hp <= 0) {
          msg += ' ' + me.name + ' is out!';
          next = 1400;
          const alive = tour.mine.map(function (f, i) { return f.hp > 0 ? i : -1; }).filter(function (i) { return i >= 0; });
          if (alive.length) tour.me = alive[0];
          else { tourRender(); document.getElementById('tour-log').innerText = msg; setTimeout(tourLost, 1000); return; }
        }
      }
      tourRender();
      document.getElementById('tour-log').innerText = msg;
      setTimeout(tourQuestion, next + (ok ? 0 : 500));
    }
    function tourRoundWon() {
      if (!tour) return;
      const n = tour.round;
      const gems = tour.rewarded ? 10 * n : 0;
      const xp = tour.rewarded ? 15 * n : 0;
      if (gems) state.gems += gems;
      tour.mine.forEach(function (f) { if (xp) addXpTo(f.id, xp); });
      launchConfetti();
      soundMonsterDefeated();
      if (n >= 3) { tourChampion(gems); return; }
      tour.round = n + 1;
      tour.round1 = tourMakeRound(tour.round, tour.avg);
      tour.foe = 0;
      tour.mine.forEach(function (f) { if (f.hp > 0) f.hp = Math.min(f.maxHp, f.hp + 1); });
      const alive = tour.mine.map(function (f, i) { return f.hp > 0 ? i : -1; }).filter(function (i) { return i >= 0; });
      tour.me = alive.length ? alive[0] : 0;
      saveState();
      updateStatsUI();
      tourRender();
      document.getElementById('tour-log').innerText = '🎉 Round ' + n + ' won!' + (gems ? ' +' + gems + ' 💎, buddies +' + xp + ' XP.' : '') + ' Next: ' + tour.round1.trainer.name + ' — "' + tour.round1.trainer.say + '"';
      tour.busy = true;
      setTimeout(tourQuestion, 2200);
    }
    function tourChampion(gems) {
      tour.over = true;
      const bonus = tour.rewarded ? 60 : 0;
      if (bonus) { state.gems += bonus; state.tour.trophies += 1; }
      state.tour.wins += 1;
      saveState();
      updateStatsUI();
      soundSecretFound();
      launchConfetti();
      document.getElementById('tour-play').style.display = 'none';
      document.getElementById('tour-log').innerText = '🏆 CHAMPION! You won the tournament!' + (bonus ? ' +' + gems + ' 💎 and a +' + bonus + ' 💎 champion bonus, plus a trophy for your cards!' : ' (Practice run — come back tomorrow for rewards.)');
      document.getElementById('tour-close').innerText = 'Back to Game';
    }
    function tourLost() {
      if (!tour) return;
      tour.over = true;
      saveState();
      updateStatsUI();
      document.getElementById('tour-play').style.display = 'none';
      document.getElementById('tour-log').innerText = '💔 Your team was beaten in round ' + tour.round + '. You kept everything you earned so far — train up and try again!';
      document.getElementById('tour-close').innerText = 'Back to Game';
    }
    function tourQuit() {
      soundClick();
      document.getElementById('tour-modal').style.display = 'none';
      tour = null;
      saveState();
      updateStatsUI();
      document.getElementById('hub-modal').style.display = 'flex';
      renderHub();
    }

    // =====================================================================
    //  COLLECTION BOOK
    // =====================================================================
    function markBossSeen(i) {
      if (i === undefined || i < 0 || !state.bossBook) return;
      if (!state.bossBook[i]) state.bossBook[i] = { wins: 0, form: -1 };
    }
    function markBossWin(i, form) {
      if (i === undefined || i < 0) return;
      markBossSeen(i);
      const b = state.bossBook[i];
      b.wins += 1;
      b.form = Math.max(b.form, form || 0);
    }

    const BOOK_MILESTONES = [
      { at: 10, gems: 20 }, { at: 25, gems: 40 }, { at: 50, gems: 75 }, { at: 100, gems: 150 },
      { at: 150, gems: 250 }, { at: 200, gems: 400 }, { at: 250, gems: 600 }
    ];
    let bookTab = 'buddy';
    let bookMissingOnly = false;
    function toggleBookFilter() { soundClick(); bookMissingOnly = !bookMissingOnly; renderBook(); }
    function bookOpenBuddy(id) { closeBook(); openHub(); hubPet = id; renderHub(); }

    function bookCounts() {
      const buddyTotal = storePets.length + mythicCompanions.length + 1 + secretCompanions.length;
      const buddyFound = getOwnedIds().length;
      const bossFound = Object.keys(state.bossBook).filter(function (k) { return monstersList[k]; }).length;
      const gearTotal = (accessoriesList.length - 1) + (armorList.length - 1);
      const gearFound = (state.unlockedAccessories.length - 1) + (state.unlockedArmor.length - 1);
      return {
        buddy: { found: buddyFound, total: buddyTotal },
        boss: { found: bossFound, total: monstersList.length },
        gear: { found: Math.max(0, gearFound), total: gearTotal },
        all: { found: buddyFound + bossFound + Math.max(0, gearFound), total: buddyTotal + monstersList.length + gearTotal }
      };
    }

    function claimBookReward(i) {
      const m = BOOK_MILESTONES[i];
      const c = bookCounts();
      if (!m || c.all.found < m.at || state.bookClaims.indexOf(m.at) !== -1) return;
      state.bookClaims.push(m.at);
      state.gems += m.gems;
      soundSecretFound();
      launchConfetti();
      toast('📖 Collection reward! +' + m.gems + ' 💎');
      saveState();
      renderBook();
      updateStatsUI();
    }

    function setBookTab(t) { soundClick(); bookTab = t; renderBook(); }

    function bookCard(o) {
      return '<div class="pet-card' + (o.locked ? ' locked' : '') + '"' + (o.style ? ' style="' + o.style + '"' : '') + (o.click ? ' onclick="' + o.click + '"' : '') + '>' +
        (o.rarity ? '<div class="rar-badge" style="color:' + o.rarity.col + '; border-color:' + o.rarity.col + ';">' + o.rarity.name + '</div>' : '') +
        '<div class="' + (o.locked ? 'silhouette' : '') + '" style="font-size: 1.9rem; min-height: 36px; display: flex; align-items: center; justify-content: center;">' + o.icon + '</div>' +
        '<div class="card-name">' + o.name + '</div>' +
        (o.elem ? '<div style="margin: 1px 0;"><span class="element-pill elem-' + o.elem + '">' + o.elem + '</span></div>' : '') +
        (o.extra || '') +
        '<div style="font-size: 0.64rem; color: ' + (o.hintColor || '#a5b4fc') + '; font-weight: 700;">' + o.hint + '</div>' +
        '</div>';
    }

    function bookBuddy(sp, lockedHint) {
      const owned = getOwnedIds().indexOf(sp.id) !== -1;
      const rar = rarityOf(sp.id);
      if (!owned) return bookCard({ locked: true, icon: sp.icon, name: '???', hint: lockedHint, hintColor: '#94a3b8', rarity: rar });
      const d = getPetById(sp.id);
      const bond = getBond(sp.id);
      const extra = '<div class="forms-row">' + sp.forms.map(function (f, i) { return '<span class="' + (i <= d.stage ? '' : 'silhouette') + '">' + f.icon + '</span>'; }).join('') + '</div>' +
        '<div style="font-size:0.6rem;">' + heartsHtml(bond) + '</div>' +
        '<div style="font-size:0.6rem; color:#fcd34d;">Likes ' + favSnack(sp.id).icon + '</div>';
      return bookCard({ icon: d.icon, name: d.name, elem: d.element, extra: extra, rarity: rar, click: 'bookOpenBuddy(&quot;' + sp.id + '&quot;)', hint: 'Lv ' + d.level + (d.stage >= 2 ? ' • Final form ⭐' : '') + (isSleepy(sp.id) ? ' 😴' : '') });
    }

    function renderBook() {
      const c = bookCounts();
      document.getElementById('book-progress').innerText = c.all.found + ' / ' + c.all.total + ' discovered';

      const ms = document.getElementById('book-milestones');
      ms.innerHTML = '';
      BOOK_MILESTONES.forEach(function (m, i) {
        const claimed = state.bookClaims.indexOf(m.at) !== -1;
        const ready = !claimed && c.all.found >= m.at;
        const b = document.createElement('button');
        b.className = 'ms' + (ready ? ' ready' : '') + (claimed ? ' claimed' : '');
        b.innerHTML = (claimed ? '✅' : (ready ? '🎁' : '🔒')) + ' ' + m.at + '<br>+' + m.gems + ' 💎';
        if (ready) b.onclick = function () { claimBookReward(i); };
        ms.appendChild(b);
      });

      const tabs = [['buddy', '🐾 Buddies'], ['boss', '👾 Bosses'], ['gear', '🎩 Gear']];
      const tb = document.getElementById('book-tabs');
      tb.innerHTML = '';
      tabs.forEach(function (t) {
        const b = document.createElement('button');
        b.className = 'grade-btn' + (bookTab === t[0] ? ' active' : '');
        b.innerHTML = t[1] + '<br><span style="font-size:0.66rem; font-weight:700;">' + c[t[0]].found + '/' + c[t[0]].total + '</span>';
        b.onclick = function () { setBookTab(t[0]); };
        tb.appendChild(b);
      });

      const body = document.getElementById('book-body');
      let h = '<button class="grade-btn' + (bookMissingOnly ? ' active' : '') + '" style="width:100%; margin-bottom:6px; padding:5px;" onclick="toggleBookFilter()">' + (bookMissingOnly ? '👀 Showing only what is missing — tap for all' : '👀 Show only what I am missing') + '</button>';
      if (bookTab === 'buddy') {
        const sec = function (title, arr, hint, icoCount) {
          const found = arr.filter(function (sp) { return getOwnedIds().indexOf(sp.id) !== -1; }).length;
          const shown = bookMissingOnly ? arr.filter(function (sp) { return getOwnedIds().indexOf(sp.id) === -1; }) : arr;
          if (!shown.length) return '';
          return '<div class="mystery-section-title">' + title + ' (' + found + ' / ' + arr.length + ')</div><div class="pet-grid">' +
            shown.map(function (sp) { return bookBuddy(sp, typeof hint === 'function' ? hint(sp) : hint); }).join('') + '</div>';
        };
        h += sec('Store Buddies', storePets, function (sp) { return '💎 ' + sp.cost + ' in the Sanctuary'; });
        h += sec('Mythic Legends', mythicCompanions, 'Ultra rare boss rescue');
        h += sec('Cosmic Anomaly', [janiePet], 'Rarest of all...');
        h += sec('Secret Creatures', secretCompanions, 'Rescued from bosses');
      } else if (bookTab === 'boss') {
        h += '<div class="book-sub">Meet a boss to add it to your book. Beat bigger forms to earn titles! 👑 Raids cleared: ' + state.raidsCleared + '</div><div class="pet-grid">';
        monstersList.forEach(function (m, i) {
          const e = state.bossBook[i];
          if (bookMissingOnly && e) return;
          if (!e) { h += bookCard({ locked: true, icon: m.icon, name: '???', hint: 'Not met yet', hintColor: '#94a3b8' }); return; }
          const best = e.form >= 2 ? 'Alpha' : (e.form === 1 ? 'Elder' : (e.form === 0 ? 'Normal' : null));
          const wk = weakOpForBoss(i);
          h += bookCard({
            icon: m.icon, name: m.name, elem: m.element,
            extra: wk ? '<div style="font-size:0.62rem; color:#fca5a5; font-weight:800;">🎯 Weak: ' + OP_BY_ID[wk].icon + ' ' + OP_BY_ID[wk].label + '</div>' : '',
            hint: e.wins > 0 ? ('Beaten x' + e.wins + ' • ' + best) : 'Met • not beaten yet',
            hintColor: e.wins > 0 ? '#6ee7b7' : '#fbbf24'
          });
        });
        h += '</div>';
      } else {
        h += '<div class="mystery-section-title">Body Armor (' + (state.unlockedArmor.length - 1) + ' / ' + (armorList.length - 1) + ')</div><div class="pet-grid">';
        armorList.filter(function (a) { return a.id !== 'none'; }).forEach(function (a) {
          const own = state.unlockedArmor.indexOf(a.id) !== -1;
          if (bookMissingOnly && own) return;
          h += own ? bookCard({ icon: a.icon, name: a.name, hint: '+' + a.hp + ' HP', hintColor: '#7dd3fc' })
                   : bookCard({ locked: true, icon: a.icon, name: '???', hint: '💎 ' + a.cost, hintColor: '#f59e0b' });
        });
        h += '</div><div class="mystery-section-title">Accessories (' + (state.unlockedAccessories.length - 1) + ' / ' + (accessoriesList.length - 1) + ')</div><div class="pet-grid">';
        accessoriesList.filter(function (a) { return a.id !== 'none'; }).forEach(function (a) {
          const own = state.unlockedAccessories.indexOf(a.id) !== -1;
          if (bookMissingOnly && own) return;
          h += own ? bookCard({ icon: a.icon, name: a.name, hint: 'Collected', hintColor: '#10b981' })
                   : bookCard({ locked: true, icon: a.icon, name: '???', hint: '💎 ' + a.cost, hintColor: '#f59e0b' });
        });
        h += '</div>';
      }
      body.innerHTML = h;
    }
    function openBook() {
      soundClick();
      pauseClock();
      renderBook();
      document.getElementById('book-modal').style.display = 'flex';
    }
    function closeBook() {
      soundClick();
      resumeClock();
      document.getElementById('book-modal').style.display = 'none';
      updateStatsUI();
    }
    function closeBookOnOverlay(e) { if (e.target.id === 'book-modal') closeBook(); }


    // =====================================================================
    //  OPTIONAL ACCOUNT  (progress is saved online so you can play on another device)
    // =====================================================================
    const ACCT_KEY = 'math_quest_account';
    let acct = null;              // { name, token, version, dirty, lastSync }
    let acctEnabled = null;       // null = unknown, true/false after /api/status
    let acctMsg = { text: '', kind: '' };
    let syncTimer = null;
    let syncing = false;
    let dirtySeq = 0;
    let syncProblem = '';         // '', 'offline', 'error'
    let pendingConflict = null;

    (function loadAcct() {
      try {
        const a = JSON.parse(localStorage.getItem(ACCT_KEY));
        if (a && a.token && a.name) acct = a;
      } catch (e) {}
    })();
    function persistAcct() {
      try {
        if (acct) localStorage.setItem(ACCT_KEY, JSON.stringify(acct));
        else localStorage.removeItem(ACCT_KEY);
      } catch (e) {}
    }

    async function api(path, method, body, keepalive) {
      const headers = { 'content-type': 'application/json' };
      if (acct && acct.token) headers.authorization = 'Bearer ' + acct.token;
      const payload = body ? JSON.stringify(body) : undefined;
      const res = await fetch(path, {
        method: method || 'GET',
        headers: headers,
        body: payload,
        keepalive: !!(keepalive && payload && payload.length < 60000)
      });
      let data = {};
      try { data = await res.json(); } catch (e) {}
      return { status: res.status, data: data };
    }

    function hasProgress(s) {
      if (!s) return false;
      return (s.monstersDefeated || 0) > 0 || (s.gems || 0) > 0 || (s.unlockedPets || []).length > 1 ||
        (s.unlockedSecrets || []).length > 0 ||
        Object.keys(s.buddyXp || {}).some(function (k) { return s.buddyXp[k] > 0; });
    }
    function summarizeSave(s) {
      if (!s) return 'Empty';
      let best = 1;
      Object.keys(s.buddyXp || {}).forEach(function (k) { best = Math.max(best, levelFromXp(s.buddyXp[k] || 0)); });
      const buddies = (s.unlockedPets || []).length + (s.unlockedSecrets || []).length;
      return 'Best buddy Lv ' + best + ' • ' + buddies + ' buddies • ' + (s.monstersDefeated || 0) + ' bosses • ' + (s.gems || 0) + ' 💎';
    }

    function setAcctMsg(text, kind) {
      acctMsg = { text: text || '', kind: kind || '' };
      const el = document.getElementById('acct-msg');
      if (el) { el.innerText = acctMsg.text; el.className = 'acct-msg ' + acctMsg.kind; }
    }
    function timeAgo(ts) {
      if (!ts) return '';
      const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
      if (s < 10) return 'just now';
      if (s < 60) return s + 's ago';
      if (s < 3600) return Math.round(s / 60) + ' min ago';
      return Math.round(s / 3600) + ' h ago';
    }
    function acctStatusText() {
      if (!acct) return '';
      if (syncing) return '⏳ Saving online…';
      if (syncProblem === 'offline') return '📴 Offline — will save when you are back online';
      if (syncProblem === 'error') return '⚠️ Could not save online — will retry';
      if (acct.dirty) return '⏳ Changes waiting to save';
      return '✅ Saved online ' + timeAgo(acct.lastSync);
    }
    function updateAcctStatus() {
      const el = document.getElementById('acct-sync');
      if (el) el.innerText = acctStatusText();
    }

    async function checkAcctEnabled() {
      if (acctEnabled !== null) return;
      try {
        const r = await api('/api/status');
        acctEnabled = !!(r.data && r.data.enabled);
      } catch (e) { acctEnabled = null; }
      renderAccount();
    }

    function renderAccount() {
      const box = document.getElementById('acct-box');
      if (!box) return;
      if (acct) {
        box.innerHTML =
          '<div class="acct-signed">✅ Signed in as ' + acct.name + '</div>' +
          '<div class="settings-hint" id="acct-sync">' + acctStatusText() + '</div>' +
          '<div class="acct-btns"><button class="grade-btn" onclick="acctSyncNow()">🔄 Save now</button>' +
          '<button class="grade-btn" onclick="acctLogout()">Sign out</button></div>' +
          '<div id="acct-delete-area"><button class="danger-btn" style="margin-top:8px;" onclick="acctShowDelete()">Delete account</button></div>' +
          '<div class="acct-msg ' + acctMsg.kind + '" id="acct-msg">' + acctMsg.text + '</div>';
        return;
      }
      if (acctEnabled === false) {
        box.innerHTML = '<div class="settings-hint">Online accounts are not turned on for this game yet. Everything still works and saves on this device.</div>';
        return;
      }
      box.innerHTML =
        '<div class="settings-hint" style="margin-top:0;">Save your progress online and keep playing on another phone or computer. You do not need an account to play — everything works without one.</div>' +
        '<input class="acct-input" id="acct-name" placeholder="Player name" maxlength="20" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false">' +
        '<input class="acct-input" id="acct-pass" type="password" placeholder="Password (6+ characters)" maxlength="100" autocomplete="current-password">' +
        '<div class="acct-btns"><button class="grade-btn" onclick="acctRegister()">Create account</button><button class="grade-btn" onclick="acctLogin()">Sign in</button></div>' +
        '<div class="acct-msg ' + acctMsg.kind + '" id="acct-msg">' + (acctEnabled === null ? 'Checking…' : acctMsg.text) + '</div>' +
        '<div class="settings-hint">Create account saves your current progress. Passwords cannot be recovered, so write yours down!</div>';
    }

    function readCreds() {
      const n = document.getElementById('acct-name');
      const p = document.getElementById('acct-pass');
      return { name: n ? n.value.trim().toLowerCase() : '', password: p ? p.value : '' };
    }
    function startSession(name, token, version) {
      acct = { name: name, token: token, version: version || 0, dirty: false, lastSync: Date.now() };
      persistAcct();
    }

    async function acctRegister() {
      const c = readCreds();
      if (!/^[a-z0-9_-]{3,20}$/.test(c.name)) return setAcctMsg('Player names are 3-20 letters, numbers, - or _.', 'err');
      if (c.password.length < 6) return setAcctMsg('Passwords need at least 6 characters.', 'err');
      setAcctMsg('Creating account…', '');
      try {
        const r = await api('/api/register', 'POST', { name: c.name, password: c.password, state: state });
        if (r.status !== 200) return setAcctMsg((r.data && r.data.error) || 'Could not create the account.', 'err');
        startSession(r.data.name, r.data.token, r.data.version);
        syncProblem = '';
        setAcctMsg('Account created! Your progress is saved online.', 'ok');
        renderAccount();
      } catch (e) { setAcctMsg('Could not reach the server. Check your internet and try again.', 'err'); }
    }

    async function acctLogin() {
      const c = readCreds();
      if (!c.name || !c.password) return setAcctMsg('Enter your player name and password.', 'err');
      setAcctMsg('Signing in…', '');
      try {
        const r = await api('/api/login', 'POST', { name: c.name, password: c.password });
        if (r.status !== 200) return setAcctMsg((r.data && r.data.error) || 'Could not sign in.', 'err');
        const save = r.data.save;
        startSession(r.data.name, r.data.token, save ? save.version : 0);
        syncProblem = '';
        if (!save) {
          acct.dirty = true; persistAcct();
          await syncNow(false);
          setAcctMsg('Signed in! Your progress is now saved online.', 'ok');
        } else if (!hasProgress(state)) {
          applyCloud(save);
          setAcctMsg('Signed in! Your online progress was loaded.', 'ok');
        } else {
          pendingConflict = { cloud: save };
          openConflict();
          setAcctMsg('Signed in!', 'ok');
        }
        renderAccount();
      } catch (e) { setAcctMsg('Could not reach the server. Check your internet and try again.', 'err'); }
    }

    function acctLogout() {
      const t = acct && acct.token;
      if (t) { try { api('/api/logout', 'POST', {}); } catch (e) {} }
      acct = null;
      persistAcct();
      clearTimeout(syncTimer);
      setAcctMsg('Signed out. Your progress is still saved on this device.', 'ok');
      renderAccount();
    }

    function acctShowDelete() {
      document.getElementById('acct-delete-area').innerHTML =
        '<div class="settings-hint">This deletes your online account and saved progress. Your progress on this device stays.</div>' +
        '<input class="acct-input" id="acct-del-pass" type="password" placeholder="Enter your password to confirm" autocomplete="current-password">' +
        '<div class="acct-btns"><button class="grade-btn" onclick="renderAccount()">Cancel</button><button class="danger-btn" style="margin-top:0;" onclick="acctDelete()">Delete</button></div>';
    }
    async function acctDelete() {
      const p = document.getElementById('acct-del-pass');
      if (!p || !p.value) return setAcctMsg('Enter your password to confirm.', 'err');
      try {
        const r = await api('/api/delete', 'POST', { password: p.value });
        if (r.status !== 200) return setAcctMsg((r.data && r.data.error) || 'Could not delete the account.', 'err');
        acct = null; persistAcct();
        setAcctMsg('Account deleted. Your progress is still on this device.', 'ok');
        renderAccount();
      } catch (e) { setAcctMsg('Could not reach the server.', 'err'); }
    }

    // ---- syncing -------------------------------------------------------
    function acctMarkDirty() {
      if (!acct || !acct.token) return;
      dirtySeq += 1;
      acct.dirty = true;
      persistAcct();
      scheduleSync(5000);
    }
    function scheduleSync(ms) {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(function () { syncNow(false); }, ms);
    }
    function acctSyncNow() { soundClick(); acct && (acct.dirty = true); syncNow(false); }

    function acctExpired() {
      acct = null; persistAcct();
      setAcctMsg('Your sign-in expired. Please sign in again to keep saving online.', 'err');
      renderAccount();
    }

    async function syncNow(force) {
      if (!acct || syncing || pendingConflict) return;
      syncing = true;
      updateAcctStatus();
      const seq = dirtySeq;
      try {
        const r = await api('/api/save', 'PUT', { state: state, baseVersion: acct.version, force: !!force }, true);
        if (r.status === 200) {
          acct.version = r.data.version;
          if (seq === dirtySeq) acct.dirty = false;
          acct.lastSync = Date.now();
          syncProblem = '';
          persistAcct();
        } else if (r.status === 409) {
          pendingConflict = { cloud: r.data.save };
          openConflict();
        } else if (r.status === 401) {
          acctExpired();
        } else {
          syncProblem = 'error';
          scheduleSync(30000);
        }
      } catch (e) {
        syncProblem = 'offline';
      }
      syncing = false;
      updateAcctStatus();
      if (acct && acct.dirty && !syncProblem && !pendingConflict) scheduleSync(5000);
    }

    function applyCloud(save) {
      try { localStorage.setItem('math_quest_save', JSON.stringify(save.state)); } catch (e) {}
      loadState();
      ultimateCharge = 0;
      setBossTaunt();
      updateStatsUI();
      generateProblem();
      if (acct) {
        acct.version = save.version;
        acct.dirty = false;
        acct.lastSync = Date.now();
        persistAcct();
      }
    }

    function openConflict() {
      pauseClock();
      const cloud = pendingConflict && pendingConflict.cloud;
      document.getElementById('conflict-cloud').innerText = summarizeSave(cloud && cloud.state);
      document.getElementById('conflict-local').innerText = summarizeSave(state);
      document.getElementById('conflict-modal').style.display = 'flex';
    }
    function resolveConflict(choice) {
      soundClick();
      const cloud = pendingConflict && pendingConflict.cloud;
      pendingConflict = null;
      document.getElementById('conflict-modal').style.display = 'none';
      resumeClock();
      if (choice === 'cloud' && cloud) {
        applyCloud(cloud);
      } else {
        if (acct) { acct.version = cloud ? cloud.version : 0; acct.dirty = true; persistAcct(); }
        syncNow(true);
      }
      renderAccount();
    }

    async function acctStartup() {
      if (!acct) return;
      try {
        const r = await api('/api/save');
        if (r.status === 401) return acctExpired();
        if (r.status !== 200) return;
        const save = r.data.save;
        if (!save) { acct.dirty = true; return syncNow(false); }
        if (save.version > acct.version) {
          if (!acct.dirty) { applyCloud(save); toast('☁️ Loaded your latest online progress'); }
          else { pendingConflict = { cloud: save }; openConflict(); }
        } else if (acct.dirty) {
          syncNow(false);
        }
      } catch (e) { syncProblem = 'offline'; }
    }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && acct && acct.dirty) { clearTimeout(syncTimer); syncNow(false); }
    });
    window.addEventListener('online', function () { if (acct && acct.dirty) syncNow(false); });

    // =====================================================================
    //  KEYBOARD
    // =====================================================================
    window.addEventListener('keydown', function (e) {
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

    // =====================================================================
    //  SANCTUARY (shop)
    // =====================================================================
    function hasUnlockedAllOtherStorePets() {
      return storePets.filter(function (p) { return !p.requiresAllStorePets; })
        .every(function (p) { return state.unlockedPets.indexOf(p.id) !== -1; });
    }
    function getUnownedStorePetsCount() {
      const others = storePets.filter(function (p) { return !p.requiresAllStorePets; });
      return { owned: others.filter(function (p) { return state.unlockedPets.indexOf(p.id) !== -1; }).length, total: others.length };
    }

    function fillBuddyTotals() {
      document.getElementById('store-total-count').innerText = storePets.length;
      document.getElementById('store-owned-count').innerText = storePets.filter(function (p) { return state.unlockedPets.indexOf(p.id) !== -1; }).length;
      document.getElementById('mythic-total-count').innerText = mythicCompanions.length;
      document.getElementById('secret-total-count').innerText = secretCompanions.length;
    }
    function rerenderShop() {
      fillBuddyTotals();
      renderShopPets();
      renderArmor();
      renderAccessories();
      renderSecretPets();
      updateStatsUI();
    }
    function openShop() {
      soundClick();
      pauseClock();
      rerenderShop();
      document.getElementById('shop-modal').style.display = 'flex';
    }
    function closeShop() {
      soundClick();
      resumeClock();
      document.getElementById('shop-modal').style.display = 'none';
      updateStatsUI();
    }
    function closeShopOnOverlay(e) {
      if (e.target.id === 'shop-modal') closeShop();
    }

    function renderArmor() {
      const container = document.getElementById('armor-grid');
      container.innerHTML = '';
      armorList.forEach(function (ar) {
        const isUnlocked = state.unlockedArmor.indexOf(ar.id) !== -1;
        const isEquipped = state.activeArmor === ar.id;
        const card = document.createElement('div');
        card.className = 'pet-card' + (isEquipped ? ' selected' : '') + (!isUnlocked ? ' locked' : '');
        card.onclick = function () { selectOrBuyArmor(ar); };
        card.innerHTML = \`
          <div style="font-size: 1.9rem; min-height: 36px; display: flex; align-items: center; justify-content: center;">\${ar.icon}</div>
          <div class="card-name">\${ar.name}</div>
          <div class="armor-hp">\${ar.hp > 0 ? '+' + ar.hp + ' HP' : 'No bonus'}</div>
          <div style="font-size: 0.7rem; color: \${isUnlocked ? '#10b981' : '#f59e0b'}; font-weight: 700;">
            \${isEquipped ? 'Worn' : isUnlocked ? 'Equip' : '💎 ' + ar.cost}
          </div>\`;
        container.appendChild(card);
      });
    }

    function selectOrBuyArmor(ar) {
      const owned = state.unlockedArmor.indexOf(ar.id) !== -1;
      if (!owned) {
        if (state.gems < ar.cost) {
          soundWrong();
          toast(\`You need \${ar.cost - state.gems} more 💎 Gems for \${ar.name}!\`);
          return;
        }
        state.gems -= ar.cost;
        state.unlockedArmor.push(ar.id);
        soundLevelUp();
        launchConfetti();
      } else {
        soundClick();
      }
      const oldBonus = getArmorHp();
      state.activeArmor = ar.id;
      const diff = getArmorHp() - oldBonus;
      // keep current-fight HP in step with the new max (a downed buddy stays down)
      Object.keys(partyHp).forEach(function (pid) {
        if (partyHp[pid] > 0) partyHp[pid] = Math.max(1, Math.min(getPetMaxHp(pid), partyHp[pid] + diff));
      });
      saveState();
      rerenderShop();
    }

    function renderAccessories() {
      const container = document.getElementById('accessories-grid');
      container.innerHTML = '';
      accessoriesList.forEach(function (acc) {
        const isUnlocked = state.unlockedAccessories.indexOf(acc.id) !== -1;
        const isEquipped = state.activeAccessory === acc.id;
        const card = document.createElement('div');
        card.className = \`pet-card \${isEquipped ? 'selected' : ''} \${!isUnlocked ? 'locked' : ''}\`;
        card.onclick = function () { selectOrBuyAccessory(acc); };
        card.innerHTML = \`
          <div style="font-size: 1.9rem; min-height: 36px; display: flex; align-items: center; justify-content: center;">\${acc.icon}</div>
          <div style="font-weight: 700; font-size: 0.78rem;">\${acc.name}</div>
          <div style="font-size: 0.7rem; color: \${isUnlocked ? '#10b981' : '#f59e0b'}; font-weight: 700;">
            \${isEquipped ? 'Worn' : isUnlocked ? 'Equip' : '💎 ' + acc.cost}
          </div>\`;
        container.appendChild(card);
      });
    }

    function selectOrBuyAccessory(acc) {
      if (state.unlockedAccessories.indexOf(acc.id) !== -1) {
        state.activeAccessory = acc.id;
        soundClick();
      } else if (state.gems >= acc.cost) {
        state.gems -= acc.cost;
        state.unlockedAccessories.push(acc.id);
        state.activeAccessory = acc.id;
        soundLevelUp();
        launchConfetti();
      } else {
        soundWrong();
        toast(\`You need \${acc.cost - state.gems} more 💎 Gems to unlock \${acc.name}!\`);
      }
      saveState();
      renderAccessories();
      updateStatsUI();
    }

    function nextEvoText(sp, level) {
      const next = sp.forms.find(function (f) { return f.minLevel > level; });
      return next ? \`Evolves Lv \${next.minLevel}\` : 'Final form ⭐';
    }

    function makePetCard(sp, o) {
      const owned = !!o.owned;
      const d = owned ? getPetById(sp.id) : { name: sp.name, icon: sp.icon, element: sp.element, level: 0, stage: 0 };
      const selected = owned && state.activePet === sp.id;
      const fainted = owned && state.faintedPets.indexOf(sp.id) !== -1;

      const card = document.createElement('div');
      card.className = 'pet-card' + (selected ? ' selected' : '') + (!owned ? ' locked' : '') + (fainted ? ' fainted' : '');
      if (o.accent) card.style.borderColor = selected ? o.accent : (fainted ? '#ef4444' : o.dim);
      card.onclick = o.onclick;

      let statusText = o.statusText, statusColor = o.statusColor;
      if (owned) {
        if (fainted) { statusText = '💔 Resting'; statusColor = '#ef4444'; }
        else if (selected) { statusText = 'Active'; statusColor = '#10b981'; }
        else { statusText = 'Equip'; statusColor = o.equipColor || '#10b981'; }
      }
      const stats = owned ? \`Lv \${d.level} ❤️\${getPetMaxHp(sp.id)} ⚔️\${getPetAttack(sp.id)}\` : 'Not owned yet';
      const evo = owned ? nextEvoText(sp, d.level) : \`Evolves Lv \${sp.forms[1].minLevel}\`;
      const nameColor = o.nameColor ? \`color:\${o.nameColor};\` : '';

      card.innerHTML = \`
        <div class="icon-wrap stage-\${d.stage}" style="font-size: 1.9rem; min-height: 36px; display: flex; align-items: center; justify-content: center;">\${d.icon}</div>
        <div class="card-name" style="\${nameColor}">\${d.name}</div>
        <div style="margin: 1px 0;"><span class="element-pill elem-\${d.element}">\${d.element}</span></div>
        <div style="font-size: 0.62rem; color: #cbd5e1;">\${stats}</div>
        <div style="font-size: 0.62rem; color: #a5b4fc;">\${evo}</div>
        <div style="font-size: 0.68rem; color: \${statusColor}; font-weight: 800;">\${statusText}</div>\`;
      return card;
    }

    function equipPet(id) {
      if (state.faintedPets.indexOf(id) !== -1) {
        soundWrong();
        toast(\`\${getPetById(id).name} is resting! Defeat this boss to revive your team.\`);
        return;
      }
      state.activePet = id;
      soundClick();
      saveState();
      rerenderShop();
    }

    function renderShopPets() {
      const container = document.getElementById('pet-grid');
      container.innerHTML = '';
      const otherStats = getUnownedStorePetsCount();
      const allOthersOwned = hasUnlockedAllOtherStorePets();

      storePets.forEach(function (pet) {
        const owned = state.unlockedPets.indexOf(pet.id) !== -1;
        const lockedBandit = pet.requiresAllStorePets && !allOthersOwned && !owned;
        container.appendChild(makePetCard(pet, {
          owned: owned,
          statusText: lockedBandit ? \`🔒 Needs All \${otherStats.total} (\${otherStats.owned}/\${otherStats.total})\` : \`💎 \${pet.cost}\`,
          statusColor: lockedBandit ? '#94a3b8' : '#f59e0b',
          onclick: function () { selectOrBuyPet(pet); }
        }));
      });
    }

    function selectOrBuyPet(pet) {
      if (state.unlockedPets.indexOf(pet.id) !== -1) { equipPet(pet.id); return; }

      if (pet.requiresAllStorePets && !hasUnlockedAllOtherStorePets()) {
        const s = getUnownedStorePetsCount();
        soundWrong();
        toast(\`Adopt all \${s.total} other Store Buddies first! (\${s.owned}/\${s.total})\`);
        return;
      }
      if (state.gems < pet.cost) {
        soundWrong();
        toast(\`You need \${pet.cost - state.gems} more 💎 Gems to adopt \${pet.name}!\`);
        return;
      }
      state.gems -= pet.cost;
      grantBuddy(pet.id);
      state.unlockedPets.push(pet.id);
      state.activePet = pet.id;
      soundLevelUp();
      launchConfetti();
      toast(\`\${pet.name} joined your team at Lv \${getBuddyLevel(pet.id)}!\`);
      saveState();
      rerenderShop();
    }

    function renderSecretPets() {
      // Mythic
      const mythicContainer = document.getElementById('mythic-pet-grid');
      mythicContainer.innerHTML = '';
      const mythicFound = mythicCompanions.filter(function (m) { return state.unlockedSecrets.indexOf(m.id) !== -1; });
      document.getElementById('mythic-found-count').innerText = mythicFound.length;
      if (mythicFound.length === 0) {
        mythicContainer.innerHTML = '<div class="empty-note">Defeat bosses flawlessly with high combos to rescue mythic storybook heroes!</div>';
      } else {
        mythicFound.forEach(function (sp) {
          mythicContainer.appendChild(makePetCard(sp, { owned: true, accent: '#d946ef', dim: '#701a75', equipColor: '#d946ef', nameColor: '#fdf4ff', onclick: function () { equipPet(sp.id); } }));
        });
      }

      // Janie
      const janieContainer = document.getElementById('janie-pet-grid');
      janieContainer.innerHTML = '';
      const janieFound = state.unlockedSecrets.indexOf('secret_janie') !== -1;
      document.getElementById('janie-found-count').innerText = janieFound ? 1 : 0;
      if (!janieFound) {
        janieContainer.innerHTML = '<div class="empty-note">Janie has not been detected yet. Keep exploring flawless boss runs!</div>';
      } else {
        janieContainer.appendChild(makePetCard(janiePet, { owned: true, accent: '#10b981', dim: '#064e3b', nameColor: '#a7f3d0', onclick: function () { equipPet('secret_janie'); } }));
      }

      // Regular secrets
      const container = document.getElementById('secret-pet-grid');
      container.innerHTML = '';
      const regular = state.unlockedSecrets.filter(function (id) { return id.indexOf('mythic_') !== 0 && id.indexOf('secret_janie') !== 0; });
      document.getElementById('secret-found-count').innerText = regular.length;
      if (regular.length === 0) {
        container.innerHTML = '<div class="empty-note">Defeat bosses in battle to discover rare secret creatures!</div>';
        return;
      }
      regular.forEach(function (id) {
        const sp = getSpecies(id);
        if (!sp) return;
        container.appendChild(makePetCard(sp, { owned: true, accent: '#818cf8', dim: '#334155', equipColor: '#38bdf8', onclick: function () { equipPet(sp.id); } }));
      });
    }

    const canvas = document.getElementById('confetti-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function launchConfetti() {
      const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#38bdf8'];
      for (let i = 0; i < 45; i++) {
        particles.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 0.7) * 12,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          decay: Math.random() * 0.02 + 0.015
        });
      }
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
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      requestAnimationFrame(updateConfetti);
    }
    requestAnimationFrame(updateConfetti);

    loadState();
    setBossTaunt();
    updateStatsUI();
    generateProblem();
    if (state.raid && !state.raid.introSeen) { const ch = state.raid.chapter; enqueueModal(function () { showRaidStory('intro', ch); }); }
    acctStartup();
  </script>
</body>
</html>`;

// =====================================================================
//  OPTIONAL ACCOUNTS  (needs a KV namespace bound as MATH_KV; without it the
//  game works exactly as before and the Account section explains it is off)
// =====================================================================
const PBKDF2_ITERS = 100000;          // Workers' maximum; stored per account so it can be changed later
const SESSION_TTL = 60 * 60 * 24 * 30; // stay signed in for 30 days
const MAX_SAVE_BYTES = 400000;
const NAME_RE = /^[a-z0-9_-]{3,20}$/;

function rand(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
function toB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function fromB64(s) {
  const bin = atob(s);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}
async function hashPassword(pw, salt, iters) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: iters }, key, 256);
  return toB64(bits);
}
async function sha256Hex(str) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(d)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}
function safeEq(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json;charset=UTF-8', 'cache-control': 'no-store' }
  });
}
function validState(s) {
  return !!s && typeof s === 'object' && !Array.isArray(s) && Array.isArray(s.unlockedPets) && typeof s.gems === 'number';
}
async function newSession(kv, name) {
  const token = toB64(rand(32)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await kv.put('sess:' + await sha256Hex(token), JSON.stringify({ name: name, at: Date.now() }), { expirationTtl: SESSION_TTL });
  return token;
}
async function authenticate(request, kv) {
  const h = request.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const rec = await kv.get('sess:' + await sha256Hex(m[1]), 'json');
  return rec && rec.name ? { name: rec.name, tokenHash: await sha256Hex(m[1]) } : null;
}
async function checkPassword(kv, name, password) {
  const acct = await kv.get('acct:' + name, 'json');
  if (!acct) return false;
  const h = await hashPassword(password, fromB64(acct.salt), acct.iters || PBKDF2_ITERS);
  return safeEq(h, acct.hash);
}

async function handleApi(request, env, url) {
  const path = url.pathname;
  if (path === '/api/status') return json({ enabled: !!env.MATH_KV });
  const kv = env.MATH_KV;
  if (!kv) return json({ error: 'Online accounts are not set up on this server yet.' }, 501);
  if (request.method !== 'GET' && request.method !== 'POST' && request.method !== 'PUT') return json({ error: 'Method not allowed' }, 405);

  let body = {};
  if (request.method !== 'GET') {
    try {
      const txt = await request.text();
      if (txt.length > MAX_SAVE_BYTES + 5000) return json({ error: 'Too large' }, 413);
      body = txt ? JSON.parse(txt) : {};
    } catch (e) { return json({ error: 'Bad request' }, 400); }
  }

  if (path === '/api/register' && request.method === 'POST') {
    const name = String(body.name || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!NAME_RE.test(name)) return json({ error: 'Player names are 3-20 letters, numbers, - or _.' }, 400);
    if (password.length < 6 || password.length > 100) return json({ error: 'Passwords need at least 6 characters.' }, 400);
    if (await kv.get('acct:' + name)) return json({ error: 'That player name is taken. Try another!' }, 409);
    const salt = rand(16);
    const hash = await hashPassword(password, salt, PBKDF2_ITERS);
    await kv.put('acct:' + name, JSON.stringify({ salt: toB64(salt), hash: hash, iters: PBKDF2_ITERS, created: Date.now() }));
    let version = 0;
    if (validState(body.state) && JSON.stringify(body.state).length <= MAX_SAVE_BYTES) {
      version = 1;
      await kv.put('save:' + name, JSON.stringify({ state: body.state, version: 1, updatedAt: Date.now() }));
    }
    return json({ ok: true, name: name, token: await newSession(kv, name), version: version });
  }

  if (path === '/api/login' && request.method === 'POST') {
    const name = String(body.name || '').trim().toLowerCase();
    const password = String(body.password || '');
    const failKey = 'fail:' + name;
    const fails = parseInt((await kv.get(failKey)) || '0', 10);
    if (fails >= 8) return json({ error: 'Too many tries. Please wait 15 minutes and try again.' }, 429);
    if (!NAME_RE.test(name) || !password || !(await checkPassword(kv, name, password))) {
      if (NAME_RE.test(name)) await kv.put(failKey, String(fails + 1), { expirationTtl: 900 });
      return json({ error: 'Wrong player name or password.' }, 401);
    }
    await kv.delete(failKey);
    const save = await kv.get('save:' + name, 'json');
    return json({ ok: true, name: name, token: await newSession(kv, name), save: save || null });
  }

  const who = await authenticate(request, kv);
  if (!who) return json({ error: 'Please sign in again.' }, 401);

  if (path === '/api/save' && request.method === 'GET') {
    return json({ save: (await kv.get('save:' + who.name, 'json')) || null });
  }

  if (path === '/api/save' && request.method === 'PUT') {
    if (!validState(body.state)) return json({ error: 'Invalid save' }, 400);
    if (JSON.stringify(body.state).length > MAX_SAVE_BYTES) return json({ error: 'Save too large' }, 413);
    const cur = await kv.get('save:' + who.name, 'json');
    const curVersion = cur ? cur.version : 0;
    if (!body.force && Number(body.baseVersion) !== curVersion) return json({ conflict: true, save: cur || null }, 409);
    const next = { state: body.state, version: curVersion + 1, updatedAt: Date.now() };
    await kv.put('save:' + who.name, JSON.stringify(next));
    return json({ ok: true, version: next.version, updatedAt: next.updatedAt });
  }

  if (path === '/api/logout' && request.method === 'POST') {
    await kv.delete('sess:' + who.tokenHash);
    return json({ ok: true });
  }

  if (path === '/api/delete' && request.method === 'POST') {
    if (!(await checkPassword(kv, who.name, String(body.password || '')))) return json({ error: 'Wrong password.' }, 401);
    await kv.delete('acct:' + who.name);
    await kv.delete('save:' + who.name);
    await kv.delete('sess:' + who.tokenHash);
    return json({ ok: true });
  }

  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (e) {
        return json({ error: 'Something went wrong. Please try again.' }, 500);
      }
    }

    if (url.pathname === "/manifest.json") {
      return new Response(JSON.stringify(MANIFEST), {
        headers: {
          "content-type": "application/manifest+json;charset=UTF-8",
          "cache-control": "public, max-age=86400"
        }
      });
    }

    if (url.pathname === "/sw.js") {
      return new Response(SW, {
        headers: {
          "content-type": "application/javascript;charset=UTF-8",
          "cache-control": "public, max-age=0"
        }
      });
    }

    return new Response(HTML, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
        "cache-control": "no-cache"
      }
    });
  }
};
