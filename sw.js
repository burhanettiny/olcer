// Ölçer — çevrimdışı çalışma için önbellek. Dosya değişince SURUM'ü artırın.
const SURUM = 'olcer-v1';
const DOSYALAR = ['./', 'index.html', 'css/stil.css', 'js/app.js', 'js/birimler.js', 'js/fizik.js', 'js/hesaplar.js', 'js/araclar.js',
  'manifest.webmanifest', 'ikon/ikon.svg', 'ikon/ikon-192.png', 'ikon/ikon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SURUM).then(c => c.addAll(DOSYALAR)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== SURUM).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
// Önce ağ, olmazsa önbellek: güncellemeler hemen gelir, çevrimdışıyken de açılır.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(y => {
    const kopya = y.clone();
    caches.open(SURUM).then(c => c.put(e.request, kopya));
    return y;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
