'use client'

import { useState, useEffect } from 'react'

interface SettingsViewProps {
  sessionCount: number
}

export function SettingsView({ sessionCount }: SettingsViewProps) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isScheduled, setIsScheduled] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Synchronisation des notifications
      if ('Notification' in window) {
        setPermission(Notification.permission)
      }
      setIsScheduled(localStorage.getItem('notifications_active') === 'true')
      
      // Synchronisation du réglage audio (actif par défaut si non configuré)
      const savedSound = localStorage.getItem('chess-trainer:sound-enabled')
      if (savedSound !== null) {
        setSoundEnabled(savedSound === 'true')
      }
    }
  }, [])

  // Demande l'autorisation de notification au système d'exploitation
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert("Ce navigateur ne prend pas en charge les notifications de bureau.")
      return
    }
    
    const res = await Notification.requestPermission()
    setPermission(res)
    
    if (res === 'granted') {
      triggerLocalNotification("Notifications activées !", "Vous recevrez des rappels pour vos ouvertures d'échecs.")
      toggleScheduling(true)
    }
  }

  const triggerLocalNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/chess-icon.png'
      })
    }
  }

  const toggleScheduling = (active: boolean) => {
    setIsScheduled(active)
    localStorage.setItem('notifications_active', active ? 'true' : 'false')
    
    if (active) {
      const intervalId = setInterval(() => {
        const hours = new Date().getHours()
        if (hours === 10 && sessionCount > 0) {
          triggerLocalNotification(
            "♟️ Entraînement disponible", 
            `Vous avez ${sessionCount} chapitres d'ouvertures à réviser aujourd'hui !`
          )
        }
      }, 3600000)
      
      return () => clearInterval(intervalId)
    }
  }

  // Gère le basculement de l'état audio
  const toggleSound = () => {
    const nextState = !soundEnabled
    setSoundEnabled(nextState)
    localStorage.setItem('chess-trainer:sound-enabled', nextState.toString())
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6 text-foreground">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Réglages de l'application</h1>
        <p className="text-sm text-muted-foreground">Configurez vos préférences d'entraînement au quotidien.</p>
      </div>

      {/* BLOC 1 : EFFETS SONORES DE L'ÉCHIQUIER */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base">Effets sonores</h3>
            <p className="text-xs text-muted-foreground max-w-[250px]">
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

      {/* BLOC 2 : RAPPELS QUOTIDIENS */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base">Rappels quotidiens</h3>
            <p className="text-xs text-muted-foreground max-w-[250px]">
              Recevoir une alerte chaque jour si des variantes d'échecs sont dues pour révision.
            </p>
          </div>
          
          {permission !== 'granted' ? (
            <button
              onClick={requestPermission}
              className="px-3 py-1.5 bg-primary text-primary-foreground font-medium rounded-lg text-sm hover:bg-primary/90 transition-colors"
            >
              Autoriser
            </button>
          ) : (
            <button
              onClick={() => toggleScheduling(!isScheduled)}
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
          <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg">
            Les notifications sont bloquées par votre navigateur. Réactivez-les dans les paramètres de votre site pour recevoir vos alerte.
          </p>
        )}

        {isScheduled && permission === 'granted' && (
          <p className="text-xs text-emerald-500 bg-emerald-500/10 p-2.5 rounded-lg">
            ✓ Rappel actif. L'application vous préviendra quotidiennement si vous avez des lignes en attente.
          </p>
        )}
      </div>
    </div>
  )
}
