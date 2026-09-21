// public/sw.js
const NOTIFICATION_HOUR = 10; // Alerte fixe à 10h00

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Écouteur de messages et vérification d'horloge native
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'check-schedule') {
    triggerReminder();
  }
});

// Boucle de vérification d'arrière-plan autonome (S'exécute toutes les 30 minutes)
setInterval(() => {
  const currentHour = new Date().getHours();
  if (currentHour === NOTIFICATION_HOUR) {
    triggerReminder();
  }
}, 1800000);

async function triggerReminder() {
  await self.registration.showNotification("♟️ Entraînement disponible", {
    body: "Vos chapitres d'ouvertures d'échecs vous attendent pour vos révisions du jour !",
    icon: '/chess-icon.png',
    badge: '/chess-icon.png',
    tag: 'chess-daily-reminder',
    requireInteraction: true
  });
}

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
