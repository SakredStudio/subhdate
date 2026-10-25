/* ShubhDate service worker: offline shell. Precaches the entry, then caches every same-origin asset on first
   use (hashed Vite assets are immutable). Network-first for navigation so updates land on the next visit. */
const VERSION = 'shubhdate-v9';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/mark-84.png', './hero.webp', './privacy.html'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL).catch(() => null)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com');
  if (!sameOrigin && !isFont) return;
  if (req.mode === 'navigate') {
    // cache: 'no-cache' revalidates with GitHub Pages every time, so a new deploy is never hidden behind the 10-minute HTTP cache.
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res; })
      .catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && (res.status === 200 || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => hit)));
});

/* Web Push (reminders). Payload from the Worker: { title, body, url?, tag?, icon? }. url is a hash route like '#/festivals'. */
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data ? e.data.text() : '' }; }
  const title = data.title || 'ShubhDate';
  const opts = { body: data.body || '', icon: data.icon || './icons/icon-192.png', badge: './icons/mark-84.png', tag: data.tag || 'shubhdate', data: { url: data.url || '#/today' }, lang: data.lang || 'en' };
  e.waitUntil(self.registration.showNotification(title, opts));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const route = (e.notification.data && e.notification.data.url) || '#/today';
  const target = new URL('./' + route, self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if (c.url.startsWith(self.registration.scope) && 'focus' in c) { c.navigate ? c.navigate(target).catch(() => null) : null; return c.focus(); } }
    return self.clients.openWindow(target);
  }));
});
