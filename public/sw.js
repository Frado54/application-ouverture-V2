// public/sw.js

const NOTIFICATION_HOUR = 10; // 10h du matin fixe

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * 🕰️ LE CHRONOMÈTRE D'ARRIÈRE-PLAN MATÉRIEL
 * Déclenché par le système de ton smartphone (Android/iOS) de façon périodique.
 */
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-chess-reminder') {
    event.waitUntil(checkTimeAndNotify());
  }
});

// Écouteur de secours pour les tests et la communication d'onglet
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'check-schedule') {
    checkTimeAndNotify();
  }
});

async function checkTimeAndNotify() {
  const hours = new Date().getHours();
  
  // 🎯 SÉCURITÉ ET FIABILITÉ : À 10h pile, le téléphone envoie l'alerte directement
  if (hours === NOTIFICATION_HOUR) {
    await self.registration.showNotification("♟️ Entraînement disponible", {
      body: "Vos chapitres d'ouvertures d'échecs vous attendent pour vos révisions du jour !",
      icon: '/chess-icon.png',
      badge: '/chess-icon.png',
      tag: 'chess-daily-reminder', // Évite d'accumuler les bannières en doublon
      requireInteraction: true
    });
  }
}

/**
 * 🖱️ GESTION DU CLIC
 * Au clic sur la notification, on ferme la bannière et on réveille ton application
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si le site est déjà ouvert quelque part, on met le focus sur l'onglet
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      // Sinon, on ouvre une nouvelle fenêtre de ton application
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
