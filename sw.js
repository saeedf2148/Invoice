const CACHE_NAME = 'invoice-pwa-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/invoice.css',
  '/invoice.js',
  '/manifest.json',
  '/libs/html2canvas.min.js',
  '/libs/jspdf.umd.min.js',
  '/libs/jspdf.plugin.autotable.min.js',
  '/fonts/Vazirmatn-Regular.woff2',
  '/fonts/Vazirmatn-Bold.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => {
        // در صورت درخواست صفحه اصلی و آفلاین کامل، می‌توانید صفحه آفلاین اختصاصی نشان دهید
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('محتوای مورد نظر آفلاین است', { status: 404 });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
