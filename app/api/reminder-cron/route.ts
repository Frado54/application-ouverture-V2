import { NextResponse } from 'next/server'
import webpush from 'web-push'

const publicKey = 'BEt5CGBR1H0duh-EIMqdlV_5G8TyNFzC41HXNDyEb2X8iE33h0km9cvpcDB_k8Xe7pbCfrU0RKbMF_OlSjjarqY'
const privateKey = 'mhi4rBToxPPffKBYp2yYETsSFJDvRvvXuWy5Zrwy744'

webpush.setVapidDetails('mailto:mezianenael@hotmail.com', publicKey, privateKey)

// 💾 VARIABLE GLOBALE EN MÉMOIRE SUR LE SERVEUR
let registeredSubscription: any = null

// 📥 1. ENREGISTREMENT AUTOMATIQUE DU TÉLÉPHONE (Quand tu ouvres l'appli)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (body.subscription) {
      registeredSubscription = body.subscription
      return NextResponse.json({ success: true, message: "Adresse du smartphone mémorisée avec succès !" })
    }
    return NextResponse.json({ success: false, error: "Données manquantes" }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

// 📤 2. DÉCLENCHEMENT DU RAPPEL (Bouton RUN ou 10h00)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  // Si le serveur vient de redémarrer et n'a pas encore reçu l'adresse du téléphone
  if (!registeredSubscription) {
    return NextResponse.json({ 
      success: false, 
      error: "Le serveur est prêt, mais aucun téléphone n'a ouvert l'application pour s'enregistrer." 
    }, { status: 404 })
  }

  try {
    // 🚀 EXPÉDITION DE LA NOTIFICATION SUR L'ADRESSE PARFAITE DU SMARTPHONE
    await webpush.sendNotification(
      registeredSubscription,
      JSON.stringify({
        title: "♟️ Entraînement disponible",
        body: "Vos chapitres d'ouvertures d'échecs vous attendent pour vos révisions du jour !",
      })
    )

    return NextResponse.json({ success: true, message: "Rappel envoyé !" })
  } catch (error) {
    console.error("Erreur d'envoi push :", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
