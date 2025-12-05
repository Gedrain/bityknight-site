const CACHE_NAME = 'neko-core-v70'; // ВЕРСИЯ ОБНОВЛЕНА
const DYNAMIC_CACHE = 'neko-dynamic-v70';

const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './css/style2.css',
    './functions/voice.js',
    './manifest.json',
    './icon.png'
];

// Установка: кэшируем статику и сразу активируем SW
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Заставляет новый SW активироваться немедленно, не дожидаясь закрытия вкладок
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Активация: удаляем старые кэши (v65 и ниже)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Заставляет SW сразу взять контроль над открытыми страницами
    );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Если сеть доступна — обновляем динамический кэш
                return caches.open(DYNAMIC_CACHE).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            })
            .catch(() => {
                // Если оффлайн — берем из кэша
                return caches.match(event.request);
            })
    );
});

// Push-уведомления
self.addEventListener('push', function(event) {
    if (!(self.Notification && self.Notification.permission === 'granted')) {
        return;
    }

    const data = event.data ? event.data.json() : {};
    const title = data.title || "NekoCore";
    const options = {
        body: data.body || "New notification",
        icon: 'icon.png',
        badge: 'icon.png',
        tag: 'neko-chat',
        vibrate: [200, 100, 200]
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({type: 'window'}).then(function(windowClients) {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url === '/' && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});