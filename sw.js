// simple service worker: caches core files and responds with cache-first strategy
const CACHE_NAME = 'lapse-cache-v1';
const CORE_ASSETS = [
'/', // if served at root
'/index.html',
'/cache.html',
'/sw.js'
// add other assets like CSS/images/fonts if present
];


self.addEventListener('install', event => {
self.skipWaiting();
event.waitUntil(
caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
);
});


self.addEventListener('activate', event => {
event.waitUntil(self.clients.claim());
});


self.addEventListener('message', async (event) => {
const data = event.data || {};
if (data.type === 'DOWNLOAD_OFFLINE'){
const clientsList = await self.clients.matchAll({includeUncontrolled:true});
// gather resources to cache (here we re-use CORE_ASSETS)
const resources = CORE_ASSETS.slice();
const cache = await caches.open(CACHE_NAME);
for (let i=0;i<resources.length;i++){
try{
await cache.add(resources[i]);
// notify progress
const pct = Math.round((i+1)/resources.length*100);
for (const client of clientsList){
client.postMessage({type:'CACHE_PROGRESS',percent:pct,message:`${pct}%`});
}
} catch(err){
// ignore individual failures but notify
for (const client of clientsList){
client.postMessage({type:'CACHE_PROGRESS',percent:0,message:`Failed: ${resources[i]}`});
}
}
}
for (const client of clientsList){
client.postMessage({type:'CACHE_COMPLETE',message:'Offline cached'});
}
}
});


self.addEventListener('fetch', event => {
const req = event.request;
// network-first for HTML pages, cache-first for other assets
if (req.mode === 'navi
