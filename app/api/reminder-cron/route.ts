import { NextResponse } from 'next/server'
import webpush from 'web-push'

const publicKey = 'BEt5CGBR1H0duh-EIMqdlV_5G8TyNFzC41HXNDyEb2X8iE33h0km9cvpcDB_k8Xe7pbCfrU0RKbMF_OlSjjarqY'
const privateKey = 'mhi4rBToxPPffKBYp2yYETsSFJDvRvvXuWy5Zrwy744'

webpush.setVapidDetails(
  'mailto:mezianenael@hotmail.com',
  publicKey,
  privateKey
)

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  // Sécurité Vercel pour empêcher les intrus de spammer
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  // 📡 Récupération de l'adresse propre enregistrée dans le tableau de bord Vercel
  const savedSubscriptionText = process.env.NEXT_PUBLIC_TARGET_SUBSCRIPTION

  if (!savedSubscriptionText) {
    return NextResponse.json({ 
      success: false, 
      error: "Aucune adresse de destination trouvée dans les variables d'environnement Vercel." 
    }, { status: 404 })
  }

  try {
    const targetSubscription = JSON.parse(savedSubscriptionText)

    // 🚀 EXPÉDITION DU SIGNAL SUR L'ANTENNE SANS FAUTE DE FRAPPE
    await webpush.sendNotification(
      targetSubscription,
      JSON.stringify({
        title: "♟️ Entraînement disponible",
        body: "Vos chapitres d'ouvertures d'échecs vous attendent pour vos révisions du jour !",
      })
    )

    return NextResponse.json({
      success: true,
      message: "Signal de rappel expédié avec succès !"
    })
  } catch (error) {
    console.error("Erreur d'envoi push :", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
