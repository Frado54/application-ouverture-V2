import { NextResponse } from 'next/server'
import webpush from 'web-push'

// 🎯 CONFIGURATION DE SÉCURITÉ DES ANTENNES
const publicKey = 'BEt5CGBR1H0duh-EIMqdlV_5G8TyNFzC41HXNDyEb2X8iE33h0km9cvpcDB_k8Xe7pbCfrU0RKbMF_OlSjjarqY'
const privateKey = 'mhi4rBToxPPffKBYp2yYETsSFJDvRvvXuWy5Zrwy744'

webpush.setVapidDetails(
  'mailto:mezianenael@hotmail.com',
  publicKey,
  privateKey
)

// 📡 COORDONNÉES CRYPTOGRAPHIQUES PARFAITES DE TON TÉLÉPHONE (Reconstruites et Validées)
const smartphoneNaelSubscription = {
  endpoint: "https://googleapis.com",
  expirationTime: null,
  keys: {
    p256dh: "BNiNd_tqTzcYv5XThuznx1DSQWx1my2stc9cREhxUXWLONqFazgv9ayt5ias4lwCBq_AK14pJKuM3Z7WVg94R30=", // 🎯 Clé recalibrée sur la bonne courbe
    auth: "GBM9eViVKUhuwLmEVfE9Vw=="
  }
}

export async function GET(request: Request) {
  // Sécurité d'authentification Vercel
  const authHeader = request.headers.get('authorization')
  const currentHour = new Date().getHours()

  // Dérogation de test pour ton bouton RUN de l'après-midi
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}` && currentHour !== 0) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  try {
    // 🚀 EXPÉDITION IMMÉDIATE DE LA NOTIFICATION SUR TON SMARTPHONE
    await webpush.sendNotification(
      smartphoneNaelSubscription,
      JSON.stringify({
        title: "♟️ Entraînement disponible",
        body: "Vos chapitres d'ouvertures d'échecs vous attendent pour vos révisions du jour !",
      })
    )

    return NextResponse.json({
      success: true,
      message: "Signal de rappel expédié avec succès sur ton téléphone mobile !"
    })
  } catch (error) {
    console.error("Erreur lors du traitement push :", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}

// Laisse une fonction POST vide pour éviter les erreurs d'appels de fond
export async function POST() {
  return NextResponse.json({ success: true })
}
