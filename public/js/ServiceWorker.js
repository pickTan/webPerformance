var CACHE_NAME = 'my-site-cache-v1';
var urlsToCache = [
  '/',
  '/css/base.css',
  '/css/iosselect.css',
  '/js/zepto.js',
  '/js/qrcode.min.js',
  '/js/mobilecall.js',
  '/js/fastclick.js',
  '/js/launchKugou.js',
  '/js/base.js'
];

self.addEventListener('install', function(event) {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});
