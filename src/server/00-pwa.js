// The Buddymon icon: a fox buddy on a violet tile. The face sits inside the middle 80%, so the same file works as a maskable icon.
const ICON_SVG = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect width='512' height='512' fill='#6366f1'/><circle cx='256' cy='280' r='170' fill='#4f46e5' opacity='.45'/>" +
  "<path d='M120 120 L205 190 L150 275 Z' fill='#1e293b'/><path d='M392 120 L307 190 L362 275 Z' fill='#1e293b'/><path d='M138 150 L190 195 L158 245 Z' fill='#f97316'/><path d='M374 150 L322 195 L354 245 Z' fill='#f97316'/>" +
  "<path d='M256 170 C170 170 120 230 125 300 C130 370 190 400 256 400 C322 400 382 370 387 300 C392 230 342 170 256 170 Z' fill='#f97316' stroke='#1e293b' stroke-width='14'/>" +
  "<path d='M256 300 C200 290 150 310 150 345 C170 385 215 400 256 400 C297 400 342 385 362 345 C362 310 312 290 256 300 Z' fill='#fff7ed'/>" +
  "<circle cx='205' cy='275' r='20' fill='#1e293b'/><circle cx='307' cy='275' r='20' fill='#1e293b'/><circle cx='212' cy='268' r='7' fill='#fff'/><circle cx='314' cy='268' r='7' fill='#fff'/>" +
  "<ellipse cx='256' cy='318' rx='20' ry='14' fill='#1e293b'/></svg>";
const MANIFEST = {
  name: "Buddymon",
  short_name: "Buddymon",
  start_url: "/",
  display: "standalone",
  background_color: "#0f172a",
  theme_color: "#6366f1",
  orientation: "portrait",
  icons: [
    { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
  ]
};

const SW = `
const CACHE_NAME = 'buddymon-__BUILD__';
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
