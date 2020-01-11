const staticCacheName = 'site-static-v19';
const dynamicCacheName = 'site-dynamic-v19'
const assets = [
    '/',
    '/index.html',
    '/app.js',
    '/hammer.min.js',
    '/style.css',
    '/chart.js',
    '/2048.js',
    '/404.html',
    '/game.html',
];

// cache size limit function
const limitCacheSize = (name, size) => {
    caches.open(name).then(cache => {
        cache.keys().then(keys => {
            if (keys.length > size){
                cache.delete(keys[0]).then(limitCacheSize(name, size))
            }
        })
    })
}

// install service worker
self.addEventListener('install', evt => {
    //console.log('service worker has been installed')
    evt.waitUntil(
        caches.open(staticCacheName).then(cache => {
            console.log('catching shell assets')
            cache.addAll(assets)
        })
    )
});

// activate service worker
self.addEventListener('activate', evt => {
    //console.log('service workers has been activated')
    evt.waitUntil(
        caches.keys().then(keys => {
            //console.log(keys);
            return Promise.all(keys
                .filter(key => key !== staticCacheName && key !== dynamicCacheName)
                .map(key => caches.delete(key))
            )
        })
    )
});

// fetch event
self.addEventListener('fetch', evt => {

    if (evt.request.url.indexOf('firestore.google.apis.com') === -1){
    // console.log('fetch event', evt)
        evt.respondWith(
            caches.match(evt.request).then(cacheRes => {
                // catching from request if not from request
                return cacheRes || fetch(evt.request).then(fetchRes => {
                    return caches.open(dynamicCacheName).then(cache => {
                        cache.put(evt.request.url, fetchRes.clone());
                        // no more than 15 dynamic items
                        limitCacheSize(dynamicCacheName, 15)
                        return fetchRes;
                    })
                });
            }).catch(() => {
                // cuando la pagina no esta cacheada
                if(evt.request.url.indexOf('.html') > -1) {
                    return caches.match('/404.html')
                }
            })
        )
    }
});
