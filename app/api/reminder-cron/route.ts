import { NextResponse } from 'next/server'
import webpush, { type PushSubscription } from 'web-push'
import { REMINDER_PAYLOAD, VAPID_MAILTO, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY } from '@/lib/push-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const TARGET_PUSH_SUBSCRIPTION: PushSubscription = {
  endpoint:
    'https://fcm.googleapis.com/fcm/send/fu4plzSLpkg:APA91bEvUkMcL-c_NfDZINWa3L5KhRaowa1lYsyp2EDgejB5GQUZPZYOHgrBz-MnxB2j0Oby2eJ6lzA9j486MTwhYFZQzB-Sh1y1RTtpLniZf3bjQaDboL6MrjDcSZ65324WlNs7fFX',
  keys: {
    p256dh: 'BGtQxEJPAGOTRVOr9oLyL_YlhRof31JIROK6PTn5i8Rbg1bwCztTP1uPUcBRcIf10dTPdgFDU-a3AydCRuNeolAg',
    auth: 'EiBfCJv1cFVXhPP0KIOsWg',
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

  try {
    await webpush.sendNotification(TARGET_PUSH_SUBSCRIPTION, JSON.stringify(REMINDER_PAYLOAD))
    return NextResponse.json({ success: true, message: 'Rappel push envoyé.' })
  } catch (error) {
    console.error("Erreur d'envoi push :", error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
