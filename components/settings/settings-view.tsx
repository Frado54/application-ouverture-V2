'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { ensurePushSubscription } from '@/lib/push-client'

interface SettingsViewProps {
  sessionCount: number
}

const SESSION_OPTIONS = [
  { value: '20', label: '20 chapitres' },
  { value: '30', label: '30 chapitres' },
  { value: '40', label: '40 chapitres' },
  { value: '50', label: '50 chapitres' },
  { value: '75', label: '75 chapitres' },
  { value: '100', label: '100 chapitres' },
  { value: '0', label: 'Aucune limite (Tout faire)' },
]

export function SettingsView({ sessionCount }: SettingsViewProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isScheduled, setIsScheduled] = useState(false)
  const [pushJson, setPushJson] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [sessionMax, setSessionMax] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedMax = localStorage.getItem('chess-trainer:session-max')
      return savedMax !== null ? savedMax : '30'
    }
    return '30'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    if ('Notification' in window) setPermission(Notification.permission)
    setIsScheduled(localStorage.getItem('notifications_active') === 'true')
    setPushJson(localStorage.getItem('chess-trainer:push-subscription') || '')

    const savedSound = localStorage.getItem('chess-trainer:sound-enabled')
    if (savedSound !== null) setSoundEnabled(savedSound === 'true')

    const savedMax = localStorage.getItem('chess-trainer:session-max')
    if (savedMax !== null) setSessionMax(savedMax)
  }, [])

  const triggerLocalNotification = async (title: string, body: string) => {
    if (Notification.permission !== 'granted') return

    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        if (registration) {
          await registration.showNotification(title, {
            body,
            icon: '/apple-icon.png',
            badge: '/apple-icon.png',
            tag: 'chess-daily-reminder',
          })
          return
        }
      } catch (error) {
        console.warn('Service Worker pas prêt, secours classique :', error)
      }
    }

    if ('Notification' in window) {
      new Notification(title, { body, icon: '/apple-icon.png' })
    }
  }

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('Ce navigateur ne prend pas en charge les notifications.')
      return
    }

    const res = await Notification.requestPermission()
    setPermission(res)

    if (res === 'granted') {
      try {
        const subscription = await ensurePushSubscription()
        if (subscription) setPushJson(JSON.stringify(subscription, null, 2))
      } catch (error) {
        console.error(error)
        toast.error("Impossible de créer l'abonnement Push.")
      }

      await triggerLocalNotification('Notifications activées !', 'Rappels prévus à 7h30 et 22h30.')
      setIsScheduled(true)
      localStorage.setItem('notifications_active', 'true')
    }
  }

  const handleToggleSchedule = async () => {
    const nextState = !isScheduled
    setIsScheduled(nextState)
    localStorage.setItem('notifications_active', nextState ? 'true' : 'false')

    if (nextState && permission === 'granted') {
      try {
        const subscription = await ensurePushSubscription()
        if (subscription) setPushJson(JSON.stringify(subscription, null, 2))
        toast.success('⏰ Rappels programmés à 7h30 et 22h30.')
      } catch (error) {
        console.error("Erreur d'activation des notifications :", error)
      }
    }
  }

  const toggleSound = () => {
    const nextState = !soundEnabled
    setSoundEnabled(nextState)
    localStorage.setItem('chess-trainer:sound-enabled', nextState.toString())
  }

  const handleSessionMaxChange = (value: string) => {
    setSessionMax(value)
    localStorage.setItem('chess-trainer:session-max', value)
    toast.success(`Limite configurée : ${value === '0' ? 'Aucune limite' : value + ' chapitres'}`)
  }

  const handleTestNotification = (e: React.MouseEvent) => {
    e.preventDefault()
    if (permission !== 'granted') {
      toast.error("Autorisez d'abord les notifications.")
      return
    }
    triggerLocalNotification(
      '♟️ Test réussi !',
      sessionCount > 0
        ? `Ton téléphone fonctionne. Tu as ${sessionCount} variantes à réviser.`
        : 'Ton téléphone fonctionne. Aucun chapitre dû pour l’instant !',
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6 p-6 text-foreground">
      <div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Réglages de l&apos;application</h1>
        <p className="text-sm text-muted-foreground">Configurez vos préférences d&apos;entraînement au quotidien.</p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h3 className="text-base font-semibold">Structure de l&apos;entraînement</h3>
          <p className="text-xs text-muted-foreground">
            Nombre maximal de chapitres chargés dans une même session de révision.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          {SESSION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSessionMaxChange(opt.value)}
              className={`rounded-lg border px-3 py-2 text-center text-xs font-medium transition-all ${
                sessionMax === opt.value
                  ? 'border-primary bg-primary font-semibold text-primary-foreground shadow-sm'
                  : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Effets sonores</h3>
            <p className="max-w-[250px] text-xs text-muted-foreground">
              Activer le bruit de déplacement des pièces en bois pendant vos sessions de jeu.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleSound}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              soundEnabled ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                soundEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Rappels quotidiens</h3>
            <p className="max-w-[250px] text-xs text-muted-foreground">
              Alerte à 7h30 et 22h30 (heure de Paris) via le Cron Vercel, même si l&apos;app est fermée.
            </p>
          </div>

          {permission !== 'granted' ? (
            <button
              type="button"
              onClick={requestPermission}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Autoriser
            </button>
          ) : (
            <button
              type="button"
              onClick={handleToggleSchedule}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isScheduled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                  isScheduled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          )}
        </div>

        {permission === 'denied' && (
          <p className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive">
            Les notifications sont bloquées par votre navigateur. Réactivez-les dans les paramètres du site.
          </p>
        )}

        {isScheduled && permission === 'granted' && (
          <div className="space-y-3 pt-2">
            <p className="rounded-lg bg-emerald-500/10 p-2.5 text-xs text-emerald-500">
              ✓ Rappels actifs à 7h30 et 22h30. Copiez l&apos;abonnement et collez-le dans{' '}
              <code className="font-mono">app/api/reminder-cron/route.ts</code> puis redéployez.
            </p>
            {pushJson ? (
              <div className="space-y-2">
                <textarea
                  readOnly
                  value={pushJson}
                  className="h-28 w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 p-2 font-mono text-[10px] text-zinc-400"
                />
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(pushJson)
                    toast.success('Abonnement Push copié.')
                  }}
                  className="min-h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs font-bold text-zinc-300"
                >
                  Copier l&apos;abonnement Push
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={handleTestNotification}
              className="block min-h-12 w-full select-none rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-center text-xs font-bold text-zinc-300 shadow-sm transition-all hover:bg-zinc-900 active:scale-[0.98]"
            >
              Tester l&apos;envoi de la notification
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
