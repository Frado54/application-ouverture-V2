import { NextResponse } from 'next/server'
import webpush from 'web-push'

const publicKey = 'BEt5CGBR1H0duh-EIMqdlV_5G8TyNFzC41HXNDyEb2X8iE33h0km9cvpcDB_k8Xe7pbCfrU0RKbMF_OlSjjarqY'
const privateKey = 'mhi4rBToxPPffKBYp2yYETsSFJDvRvvXuWy5Zrwy744'

webpush.setVapidDetails('mailto:mezianenael@hotmail.com', publicKey, privateKey)

// 📡 ADRESSE POSTALE UNIQUE ET PARFAITE DE TON SMARTPHONE (Générée à 14h42)
const TARGET_PUSH_SUBSCRIPTION = {"endpoint":"https://fcm.googleapis.com/fcm/send/eKx7vf7waLg:APA91bGv9EKgQSyV_zofSOFDFj4Ct9VfS86k_TqDwcrISemzc8soQBz7ozoAbuMGyL3DnHo_pZOExGKtWpn6fxDGAPUCCf_9o90t7yVlE39TWahjy9KCGWqPk9H5FvUYKststrW64y_O","expirationTime":null,"keys":{"p256dh":"BNJdg_9CmryeVS2DHJ9PKkcUq4UP8QqqjZ-pZzr13lbeKru9DD-FL36IuH8SSxIFgXEnYF5IHl_S9RfGFlLK63Y","auth":"m2vPW1FpOjGBEv4pAjw_qQ"}}

// 📤 DÉCLENCHEMENT DU RAPPEL (Bouton RUN ou Alarme automatique)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  try {
    // 🚀 EXPÉDITION DE LA NOTIFICATION SUR TON ADRESSE SANS RESTRICTION DE BATTERIE
    await webpush.sendNotification(
      TARGET_PUSH_SUBSCRIPTION,
      JSON.stringify({
        title: "♟️ Entraînement disponible",
        body: "Vos chapitres d'ouvertures d'échecs vous attendent pour vos révisions du jour !",
      })
    )

    return NextResponse.json({ success: true, message: "Rappel quotidien envoyé avec succès !" })
  } catch (error) {
    console.error("Erreur d'envoi push :", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
