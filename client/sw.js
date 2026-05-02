// ════════════════════════════════════════════
//  SERVICE WORKER — Corre en segundo plano
//  Mantiene el GPS activo aunque se cierre la app
// ════════════════════════════════════════════

const CACHE_NAME = 'tracker-v1';

// Al instalar el SW cacheamos los archivos principales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(['/tracker', '/socket.io/socket.io.js']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Escucha mensajes desde la página principal
self.addEventListener('message', (event) => {
  if (event.data.tipo === 'INICIAR_GPS') {
    // Guardamos los datos del trabajador
    self.trabajadorId = event.data.trabajadorId;
    self.nombre       = event.data.nombre;
    self.serverUrl    = event.data.serverUrl;

    // Iniciamos el intervalo de ubicación
    if (self.intervalId) clearInterval(self.intervalId);

    self.intervalId = setInterval(() => {
      // Le pedimos a la página que envíe la ubicación
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ tipo: 'PEDIR_UBICACION' });
        });
      });
    }, 10000); // cada 10 segundos
  }

  if (event.data.tipo === 'DETENER_GPS') {
    if (self.intervalId) {
      clearInterval(self.intervalId);
      self.intervalId = null;
    }
  }
});