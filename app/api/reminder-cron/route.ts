import { NextResponse } from 'next/server'
import webpush from 'web-push'

// 🎯 CONFIGURATION DES CLÉS D'ANTENNES
const publicKey = 'BEt5CGBR1H0duh-EIMqdlV_5G8TyNFzC41HXNDyEb2X8iE33h0km9cvpcDB_k8Xe7pbCfrU0RKbMF_OlSjjarqY'
const privateKey = 'mhi4rBToxPPffKBYp2yYETsSFJDvRvvXuWy5Zrwy744'

webpush.setVapidDetails(
  'mailto:mezianenael@hotmail.com',
  publicKey,
  privateKey
)

// 📡 ADRESSE POSTALE UNIQUE DE TON PC (Copiée mot pour mot depuis ta console !)
const pcSubscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/cdYWGRgh8og:APA91bEdy7K8LDQQg43fNa-XdDYnHYmDKOgB9PeKKmpAZId8r7ztPF9hvQJ2FefSRO3An6oF--SQvKKPJujC6Lefz9vAjbRa2Y8vyFC0PV8TupuKDIkcJUxVtO6errIFaAma4fJxuAuG",
  expirationTime: null,
  keys: {
    p256dh: "BGkmEjXiSWT5vVTDad5DgwooEJYJm1ZLCWh9dSouElCAOyC6lMBBFfCI5HPUibQ_Vu2f_k7pw8_Kg0A8J0ioCLc",
    auth: "BGQ6Azgt2BKsbKQub_hu7g"
  }
}

export async function GET(request: Request) {
  // On désactive temporairement la barrière du mot de passe secret pour le test en direct sur ton navigateur
  try {
    // 🚀 ENVOI PHYSIQUE DE LA NOTIFICATION VIA INTERNET
    await webpush.sendNotification(
      pcSubscription, 
      JSON.stringify({
        title: "♟️ Entraînement disponible",
        body: "Vos chapitres d'ouvertures d'échecs vous attendent pour vos révisions du jour !",
      })
    )

    return NextResponse.json({ 
      success: true, 
      message: "Pulsion Push expédiée avec succès vers ton ordinateur !" 
    })
  } catch (error) {
    console.error("Erreur lors de l'envoi push :", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
