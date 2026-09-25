// Service Worker Sederhana
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  // Mengizinkan lalu lintas jaringan normal
});