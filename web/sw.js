// 오프라인에서도 앱이 열리도록 파일을 저장해 두는 서비스 워커
const VERSION = 'kc-v1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './app/',
  './app/index.html',
  './app/config.js',
  './app/vendor/jspdf.umd.min.js',
  './app/vendor/html2canvas.min.js',
  './app/vendor/jszip.min.js',
  './app/vendor/pdf.min.js',
  './app/vendor/pdf.worker.min.js',
  './app/vendor/opensheetmusicdisplay.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 구글 폰트: 받아 둔 것을 먼저 쓰고 뒤에서 갱신
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(VERSION + '-fonts').then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;

  // 페이지와 설정: 네트워크 우선(최신 버전), 실패하면 저장본
  if (req.mode === 'navigate' || url.pathname.endsWith('config.js')) {
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return r;
    }).catch(() => caches.match(req).then(r => r || caches.match('./app/index.html'))));
    return;
  }
  // 나머지(라이브러리, 아이콘): 저장본 우선
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
  })));
});
