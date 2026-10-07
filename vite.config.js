import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';

// Emits sw.js listing every built file, so the app opens instantly and works offline after the first visit.
// HTML navigations are network-first (updates arrive), hashed assets are cache-first.
function offlineCache() {
  const EXTRA = [
    'wasm/swisseph.data', 'wasm/swisseph.js', 'wasm/swisseph.wasm',
    'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  ];
  return {
    name: 'offline-cache',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.wasm')); // dedupe: the loader fetches wasm/swisseph.wasm
      const precache = ['./', ...files, ...EXTRA];
      const version = createHash('sha1').update(precache.join('|') + files.map((f) => bundle[f].fileName).join('')).digest('hex').slice(0, 10);
      const source = `const CACHE = 'transit-chart-${version}';
const PRECACHE = ${JSON.stringify(precache)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE.map((p) => new URL(p, self.registration.scope).href))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k.startsWith('transit-chart-')).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(new URL('./', self.registration.scope).href, copy)); return r; })
      .catch(() => caches.match(new URL('./', self.registration.scope).href)));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return r; })));
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: './',
  // swisseph-wasm locates its .wasm/.data via import.meta.url, so keep it out of dep pre-bundling.
  optimizeDeps: { exclude: ['swisseph-wasm'] },
  build: { target: 'es2022' },
  plugins: [offlineCache()],
});
