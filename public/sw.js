// public/sw.js

// Écouteur standard d'installation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ÉCOUTEUR MATÉRIEL D'ARRIÈRE-PLAN DE SECOURS
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-chess-reminder') {
    event.waitUntil(triggerReminder());
  }
});

// Réception de messages depuis les onglets ou les boutons de tests
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'check-schedule') {
    triggerReminder();
  }
});

async function triggerReminder() {
  await self.registration.showNotification("♟️ Entraînement disponible", {
    body: "Vos chapitres d'ouvertures d'échecs vous attendent pour vos révisions du jour !",
    icon: '/chess-icon.png',
    badge: '/chess-icon.png',
    tag: 'chess-daily-reminder',
    requireInteraction: true
  });
}

// Gestion du clic pour ouvrir ou maximiser l'application
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
