import { NextResponse } from 'next/server'
import webpush from 'web-push'

const publicKey = 'BEt5CGBR1H0duh-EIMqdlV_5G8TyNFzC41HXNDyEb2X8iE33h0km9cvpcDB_k8Xe7pbCfrU0RKbMF_OlSjjarqY'
const privateKey = 'mhi4rBToxPPffKBYp2yYETsSFJDvRvvXuWy5Zrwy744'

webpush.setVapidDetails('mailto:mezianenael@hotmail.com', publicKey, privateKey)

// Variable stockée en mémoire vive globale sur le serveur
let globalSubscription: any = null

// 📥 1. RECEPTION DU BADGE PARFAIT ENVOYÉ PAR TON TÉLÉPHONE
export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (body.subscription) {
      globalSubscription = body.subscription
      return NextResponse.json({ success: true, message: "Badge mobile enregistré sur le serveur !" })
    }
    return NextResponse.json({ success: false, error: "Pas de badge reçu" }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

// 📤 2. DECLENCHEMENT (Bouton RUN ou Alarme de 10h)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const currentHour = new Date().getHours()

  // Dérogation de sécurité pour tes tests de l'après-midi
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}` && currentHour !== 12) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  // Si le serveur a redémarré et attend que tu ouvres l'application
  if (!globalSubscription) {
    return NextResponse.json({ 
      success: false, 
      error: "Aucun appareil enregistré. Ouvrez l'application sur votre téléphone d'abord pour envoyer le badge." 
    }, { status: 404 })
  }

  try {
    // 🚀 ENVOI SUR LA CLÉ SANS FAUTE DE FRAPPE DU TÉLÉPHONE
    await webpush.sendNotification(
      globalSubscription, 
      JSON.stringify({
        title: "♟️ Entraînement disponible",
        body: "Vos chapitres d'ouvertures d'échecs vous attendent pour vos révisions du jour !",
      })
    )
    return NextResponse.json({ success: true, message: "Pulsion Push expédiée sans faute !" })
  } catch (error) {
    console.error("Erreur lors de l'envoi push :", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
