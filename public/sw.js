// public/sw.js
const ALARME_HEURE = 10; // 🎯 Heure fixe du rappel : 10h00 du matin

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Envoi immédiat lors du clic sur le bouton de test
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'check-schedule') {
    event.waitUntil(declencherNotification());
  }
});

// 🕰️ BOUCLE DE SURVEILLANCE MATÉRIELLE (Se réveille toutes les 15 minutes)
// Même si l'application est fermée, le navigateur exécute ce micro-calcul
setInterval(() => {
  const maintenant = new Date();
  
  // Convertit l'heure brute par rapport au fuseau horaire de ton téléphone (ex: France)
  const heureLocale = maintenant.getHours();
  const minutesLocales = maintenant.getMinutes();

  // Si il est entre 10h00 et 10h15, on envoie la notification du jour
  if (heureLocale === ALARME_HEURE && minutesLocales >= 0 && minutesLocales <= 15) {
    declencherNotification();
  }
}, 900000); // 900 000 ms = 15 minutes

async function declencherNotification() {
  // Sécurité anti-doublon : on n'envoie pas l'alerte si elle a déjà sonné il y a moins d'une heure
  const reg = await self.registration;
  const notificationsActives = await reg.getNotifications({ tag: 'chess-daily-reminder' });
  
  if (notificationsActives.length === 0) {
    await reg.showNotification("♟️ Entraînement disponible", {
      body: "Vos chapitres d'ouvertures d'échecs vous attendent pour vos révisions du jour !",
      icon: '/chess-icon.png',
      badge: '/chess-icon.png',
      tag: 'chess-daily-reminder',
      requireInteraction: true,
    });
  }
}

// Gestion du clic sur la bannière pour ouvrir l'application
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
