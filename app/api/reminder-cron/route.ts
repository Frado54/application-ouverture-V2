import { NextResponse } from 'next/server'
import webpush from 'web-push'

// 🎯 CONFIGURATION DES CLÉS D'ANTENNES DE NOTIFICATIONS
const publicKey = 'BEt5CGBR1H0duh-EIMqdlV_5G8TyNFzC41HXNDyEb2X8iE33h0km9cvpcDB_k8Xe7pbCfrU0RKbMF_OlSjjarqY'
const privateKey = 'mhi4rBToxPPffKBYp2yYETsSFJDvRvvXuWy5Zrwy744'

webpush.setVapidDetails(
  'mailto:mezianenael@hotmail.com',
  publicKey,
  privateKey
)

// 📡 ADRESSE POSTALE UNIQUE DE TON TÉLÉPHONE PORTABLE (Extraite de ta capture !)
const mobileSubscription = {
  endpoint: "https://googleapis.com",
  expirationTime: null,
  keys: {
    p256dh: "BNiNd_tqTzcYv5XThuznx1DSQWx1my2stc9cREhxUXWLONqFazgv9ayt5ias4lwCBq_AK14pJKuM3Z7WVg94R30",
    auth: "GBM9eViVKUhuwLmEVfE9Vw"
  }
}

export async function GET(request: Request) {
  // Sécurité stricte du jeton Vercel réactivée
  const authHeader = request.headers.get('authorization')
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  try {
    // 🚀 EXPÉDITION DU SIGNAL DIRECTEMENT DANS TA POCHE
    await webpush.sendNotification(
      mobileSubscription, 
      JSON.stringify({
        title: "♟️ Entraînement disponible",
        body: "Vos chapitres d'ouvertures d'échecs vous attendent pour vos révisions du jour !",
      })
    )

    return NextResponse.json({ 
      success: true, 
      message: "Rappel quotidien envoyé avec succès sur le smartphone de Naël !" 
    })
  } catch (error) {
    console.error("Erreur lors de l'envoi push mobile :", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
