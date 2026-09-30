import { NextResponse } from 'next/server'
import webpush, { type PushSubscription } from 'web-push'
import { REMINDER_PAYLOAD, VAPID_MAILTO, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY } from '@/lib/push-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

/**
 * Abonnement Web Push complet (endpoint + clés p256dh/auth).
 * Remplacez cet objet par celui affiché dans Réglages après « Autoriser ».
 */
const TARGET_PUSH_SUBSCRIPTION: PushSubscription = {
  endpoint:
    'https://fcm.googleapis.com/fcm/send/cK3dG8hQ1mI:APA91bH0chess-trainer-replace-with-your-real-endpoint',
  keys: {
    p256dh: 'BNcRdreALRFGBmAOMFfn5eYeJNnKs9e2vOYIhGqhVYkEdM_QQcztLbgI3sQv-7-4KMhN6XUoHRjU_aJ_T0bl_UtC',
    auth: 'tBHItJI5svbpez7KI4h0Xg',
  },
}

function isAuthorizedCron(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim()
  const authHeader = request.headers.get('authorization')

  if (process.env.NODE_ENV !== 'production') {
    if (!cronSecret) return true
    return authHeader === `Bearer ${cronSecret}`
  }

  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ success: false, error: 'Non autorisé (CRON_SECRET)' }, { status: 401 })
  }

  if (TARGET_PUSH_SUBSCRIPTION.endpoint.includes('chess-trainer-replace-with-your-real-endpoint')) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Collez votre vrai objet PushSubscription dans TARGET_PUSH_SUBSCRIPTION (Réglages → copier l'abonnement), puis redéployez.",
      },
      { status: 422 },
    )
  }

  try {
    await webpush.sendNotification(TARGET_PUSH_SUBSCRIPTION, JSON.stringify(REMINDER_PAYLOAD))
    return NextResponse.json({ success: true, message: 'Rappel push envoyé.' })
  } catch (error) {
    console.error("Erreur d'envoi push :", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
