const CACHE_NAME = 'neko-core-v53'; // Измените версию здесь для принудительного обновления у всех
const DYNAMIC_CACHE = 'neko-dynamic-v53';

const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './manifest.json',
    './icon.png'
];

// Установка Service Worker и кэширование статики
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Принудительно активировать новый SW
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Активация и удаление старого кэша
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
        }).then(() => self.clients.claim()) // Немедленно захватить контроль над страницей
    );
});

// Стратегия Network First (Сначала сеть, потом кэш)
// Это гарантирует, что пользователь всегда получит свежую версию, если есть интернет
self.addEventListener('fetch', (event) => {
    // Игнорируем запросы к другим доменам или API
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                return caches.open(DYNAMIC_CACHE).then((cache) => {
                    // Кэшируем новую версию файла
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            })
            .catch(() => {
                // Если нет сети, берем из кэша
                return caches.match(event.request);
            })
    );
});

// Обработка Push-уведомлений
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