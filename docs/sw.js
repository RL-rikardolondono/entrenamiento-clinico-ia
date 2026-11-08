// Entrenamiento Clínico-IA: guarda la página para abrirla rápido y sin señal. Los datos siempre vienen de la base.
const V = 'eci-452716', ARCHIVOS = ['./', './index.html', './manifest.webmanifest', './icono-192.png', './icono-512.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(V).then(c => c.addAll(ARCHIVOS).catch(() => {}))); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const clave = u.pathname.endsWith('/') ? './' : '.' + u.pathname.slice(u.pathname.lastIndexOf('/'));
  if (!ARCHIVOS.includes(clave) && clave !== './config.js') return;   // solo los archivos de la app; nunca enlaces con datos (?token=…)
  e.respondWith(fetch(e.request).then(r => { if (r.ok && !u.search.includes('token')) { const c = r.clone(); caches.open(V).then(x => x.put(clave, c)); } return r; })
    .catch(() => caches.match(clave).then(r => r || caches.match('./index.html'))));
});
