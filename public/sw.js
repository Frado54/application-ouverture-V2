// public/sw.js

// Écoute l'événement de notification push ou locale
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // Au clic sur la notification, on ouvre l'application d'échecs
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow('/')
    })
  )
})
