// OMAD Sniper v5 — Service Worker
// Versi cache — update angka ini setiap deploy baru
var CACHE_NAME = 'omad-sniper-v5-1';
var CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600&display=swap'
];

// Install: cache semua asset
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS.map(function(url) {
        return new Request(url, {cache: 'reload'});
      })).catch(function(err) {
        console.log('Cache partial fail:', err);
        return cache.addAll(['./index.html', './manifest.json']);
      });
    })
  );
  self.skipWaiting();
});

// Activate: hapus cache lama
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first untuk API, cache-first untuk assets
self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  
  // API calls — selalu network, tidak di-cache
  if (url.includes('bybit.com') || 
      url.includes('coinmarketcap.com') || 
      url.includes('alternative.me') ||
      url.includes('coingecko.com')) {
    e.respondWith(fetch(e.request).catch(function() {
      return new Response('{"error":"offline"}', {headers:{'Content-Type':'application/json'}});
    }));
    return;
  }
  
  // Font & CDN — cache first
  if (url.includes('fonts.google') || url.includes('fonts.gstatic') || url.includes('cdnjs')) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(res) {
          var clone = res.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
          return res;
        });
      })
    );
    return;
  }
  
  // App files — network first, fallback cache
  e.respondWith(
    fetch(e.request).then(function(res) {
      var clone = res.clone();
      caches.open(CACHE_NAME).then(function(c) { c.put(e.request, clone); });
      return res;
    }).catch(function() {
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});

// Push notification handler
self.addEventListener('push', function(e) {
  var data = e.data ? e.data.json() : {title:'OMAD Sniper', body:'Signal baru!'};
  e.waitUntil(
    self.registration.showNotification(data.title || 'OMAD Sniper', {
      body: data.body || 'Ada sinyal baru!',
      icon: './icons/icon-192x192.png',
      badge: './icons/icon-72x72.png',
      vibrate: [300, 100, 300],
      requireInteraction: true,
      tag: 'omad-signal',
      renotify: true,
      data: {url: './index.html'}
    })
  );
});

// Notification click — buka app
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window'}).then(function(cls) {
      for (var i = 0; i < cls.length; i++) {
        if (cls[i].url.includes('index.html') && 'focus' in cls[i]) {
          return cls[i].focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('./index.html');
    })
  );
});
