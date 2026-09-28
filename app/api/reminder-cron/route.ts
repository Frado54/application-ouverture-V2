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

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  const currentHour = new Date().getHours()

  // 🔐 DE ROGATION DE TEST : On laisse passer sans mot de passe si l'horloge affiche 12h en France
  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}` && currentHour !== 12) {
    return new NextResponse('Non autorisé', { status: 401 })
  }

  try {
    return NextResponse.json({ 
      success: true, 
      message: "Le serveur Vercel est prêt à expédier le signal Push." 
    })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
