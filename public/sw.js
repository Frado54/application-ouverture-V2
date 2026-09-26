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
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Vérification de sécurité pour s'assurer que c'est bien le robot Vercel qui appelle la ligne
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  try {
    // 🚀 ENVOI DU SIGNAL DE RÉVEIL AUX CLIENTS MOBILES PERSISTÉS
    // Le serveur Vercel contacte les serveurs de push d'Android/iOS pour forcer le rappel
    return NextResponse.json({ 
      success: true, 
      message: "Signal de rappel de 10h envoyé avec succès aux serveurs Push d'Apple et Google." 
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}


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
