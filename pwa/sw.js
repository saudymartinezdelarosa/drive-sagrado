// Service worker de Drive Sagrado.
// Guarda los archivos esenciales del contenedor para que la app abra aunque la
// conexión sea inestable, y cumple el requisito del navegador para ofrecer
// «Instalar». El portal y los documentos (Apps Script / Google) nunca se guardan
// en caché: siempre se piden en línea, para respetar los permisos y la auditoría.
const CACHE = 'drive-sagrado-v5';
const ESENCIALES = [
  './',
  './index.html',
  './config.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESENCIALES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Solo archivos propios del contenedor; lo demás pasa directo a la red.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Red primero (siempre la versión más reciente); caché como respaldo sin conexión.
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copia));
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
