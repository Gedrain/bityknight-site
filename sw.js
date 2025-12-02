const CACHE_NAME = 'nekocore-v35';
const urlsToCache = [
  './',
  './index.html',
  './css/style.css',
  './functions/main.js',
  './functions/auth.js',
  './functions/utils.js',
  './functions/ui.js',
  './functions/chat.js',
  './functions/channels.js',
  './functions/profile.js',
  './functions/search.js',
  './functions/admin.js',
  './functions/config.js',
  './functions/state.js'
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
        if (response) return response;
        return fetch(event.request);
      })
  );
});