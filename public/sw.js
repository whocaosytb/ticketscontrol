const CACHE_NAME = 'tickets-manager-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pré-salvando recursos críticos');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Limpando cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar chamadas de API ou do Supabase para que os dados reais fiquem sempre atualizados
  if (url.pathname.startsWith('/api') || url.host.includes('supabase.co')) {
    return; // Passa direto para rede nativa
  }

  // Apenas manipular requisições GET padrão
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Disparar uma busca em background para atualizar o cache (Stale-While-Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {
            // Falha na rede silenciosa (rodando em background)
          });
        return cachedResponse;
      }

      // Se não estiver no cache, vai para a rede e salva opcionalmente no cache se for um recurso estático
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const isStaticAsset = (
          url.pathname.endsWith('.js') ||
          url.pathname.endsWith('.css') ||
          url.pathname.endsWith('.png') ||
          url.pathname.endsWith('.svg') ||
          url.pathname.endsWith('.html') ||
          url.origin === self.location.origin
        );

        if (isStaticAsset) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return networkResponse;
      }).catch((error) => {
        // Se a navegação principal falhar e estiver em modo offline, retorna a página inicial
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        throw error;
      });
    })
  );
});
