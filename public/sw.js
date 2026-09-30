self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  event.waitUntil(showPushNotification(event))
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'check-schedule') {
    event.waitUntil(
      showNotification({
        title: event.data.title || '♟️ Entraînement disponible',
        body: event.data.body || "Vos chapitres d'ouvertures d'échecs vous attendent !",
      }),
    )
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(openApp())
})

async function showPushNotification(event) {
  let payload = {
    title: '♟️ Entraînement disponible',
    body: "Vos chapitres d'ouvertures d'échecs vous attendent pour vos révisions du jour !",
  }

  try {
    if (event.data) {
      const parsed = event.data.json()
      if (parsed && typeof parsed === 'object') {
        payload = {
          title: parsed.title || payload.title,
          body: parsed.body || payload.body,
        }
      }
    }
  } catch {
    try {
      const text = event.data && event.data.text()
      if (text) payload.body = text
    } catch {
      // garde le texte par défaut
    }
  }

  await showNotification(payload)
}

async function showNotification({ title, body }) {
  await self.registration.showNotification(title, {
    body,
    icon: '/apple-icon.png',
    badge: '/apple-icon.png',
    tag: 'chess-daily-reminder',
    renotify: true,
    requireInteraction: true,
    data: { url: '/' },
  })
}

async function openApp() {
  const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const client of clientList) {
    if ('focus' in client) {
      await client.focus()
      if ('navigate' in client) await client.navigate('/')
      return
    }
  }
  if (clients.openWindow) await clients.openWindow('/')
}
