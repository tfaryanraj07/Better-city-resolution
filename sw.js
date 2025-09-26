// sw.js - improved navigation handling to avoid serving wrong HTML on hard refresh.
// Strategy:
//  - navigation requests (HTML pages) -> network-first (so hard refresh gets latest HTML)
//  - static assets -> cache-first for offline speed

const CACHE_NAME = 'scs-cache-v1';
const STATIC_ASSETS = [
  '/', 
  '/index.html', 
  '/home.html', 
  '/complaints.html', 
  '/register.html', 
  '/admin.html', 
  '/profile.html', 
  '/style.css', 
  '/app.js',
  '/Picsart_25-09-22_14-53-44-841.jpg', // updated background image
  '/admin-stats.html', 
  '/admin-stats.js'
];
// (Removed duplicate CACHE_NAME and STATIC_ASSETS declarations and duplicate event listeners)

  
// Removed duplicate CACHE_NAME and STATIC_ASSETS declarations

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e=>e.waitUntil(self.clients.claim()));

function isNavigationRequest(req){
  return req.mode==='navigate'||(req.method==='GET'&&req.headers.get('accept')?.includes('text/html'));
}

self.addEventListener('fetch', e=>{
  const req=e.request;
  if(isNavigationRequest(req)){
    e.respondWith(fetch(req).then(res=>{
      const resClone=res.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(req,resClone));
      return res;
    }).catch(()=>caches.match(req).then(c=>c||caches.match('/index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(cached=>{
    if(cached) return cached;
    return fetch(req).then(netRes=>{
      if(req.url.startsWith(self.location.origin)) caches.open(CACHE_NAME).then(cache=>cache.put(req,netRes.clone()));
      return netRes;
    }).catch(()=>new Response('',{status:504,statusText:'Gateway Timeout'}));
  }));
});



self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

function isNavigationRequest(req){
  return req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').includes('text/html'));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // Network-first for navigation (HTML) requests
  if(isNavigationRequest(req)){
    e.respondWith(
      fetch(req).then(networkResp => {
        // update cache with the newest HTML
        const respClone = networkResp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, respClone));
        return networkResp;
      }).catch(() => {
        // fallback to cache if offline or network fails
        return caches.match(req).then(cacheResp => {
          // finally fall back to index.html if nothing matches (SPA-safe)
          return cacheResp || caches.match('/index.html');
        });
      })
    );
    return;
  }

  // For other requests (CSS, JS, images) use cache-first
  e.respondWith(
    caches.match(req).then(cached => {
      if(cached) return cached;
      return fetch(req).then(networkResp => {
        // don't cache opaque cross-origin requests (like CDNs) blindly — but cache same-origin static assets
        if(req.url.startsWith(self.location.origin)){
          caches.open(CACHE_NAME).then(cache => cache.put(req, networkResp.clone()));
        }
        return networkResp;
      }).catch(() => {
        // no cache, no network -> fail gracefully
        return new Response('', { status: 504, statusText: 'Gateway Timeout' });
      });
    })
  );
});
