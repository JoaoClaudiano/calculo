const CACHE_NAME = 'calculusvision-v2.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/themes.css',
  '/css/components.css',
  '/js/app.js',
  '/js/utils.js',
  '/js/calculator.js',
  '/js/graph.js',
  '/js/ui.js',
  '/js/storage.js',
  '/js/export.js',
  '/js/exercises.js',
  '/js/pwa.js',
  'https://cdn.plot.ly/plotly-2.24.1.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.8.0/math.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});