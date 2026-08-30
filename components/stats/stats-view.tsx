'use client'

import { useMemo } from 'react'
import { Brain } from 'lucide-react'
import type { FeedbackEntry, FeedbackLevel } from '@/lib/types'

interface StatsViewProps {
  totalChapters: number
  totalErrors: number
  totalTimeInSeconds: number
  feedback: FeedbackEntry[]
}

export function StatsView({ totalChapters, totalErrors, totalTimeInSeconds, feedback }: StatsViewProps) {
  const stats = useMemo(() => {
    // 1. Conversion exacte du temps de jeu de l'application (Heures / Minutes) à partir de maintenant
    const hours = Math.floor(totalTimeInSeconds / 3600)
    const mins = Math.floor((totalTimeInSeconds % 3600) / 60)
    const tempsTotalStr = `${hours}h ${mins.toString().padStart(2, '0')}m`

    // 2. Répartition des difficultés (Conserve l'historique complet pour l'anneau)
    const dictionnaireDifficultes: Record<FeedbackLevel, number> = {
      'très difficile': 0,
      'difficile': 0,
      'moyen': 0,
      'facile': 0,
      'très facile': 0
    }
    
    feedback.forEach(f => {
      if (dictionnaireDifficultes[f.level] !== undefined) {
        dictionnaireDifficultes[f.level]++
      }
    })

    // 3. Calcul de la précision moyenne sur l'application (sur une échelle de 10 clics max par chapitre)
    const precisionMoyenne = totalChapters > 0 
      ? Math.max(50, Math.round(((totalChapters * 10 - totalErrors) / (totalChapters * 10)) * 100))
      : 100

    // 4. Calcul de la série actuelle (Streak de jours consécutifs - Ton algorithme initial sécurisé)
    let serieActuelle = 0
    if (feedback.length > 0) {
      const datesUniques = Array.from(new Set(feedback.map(f => f.date))).sort().reverse()
      const formatDate = (d: Date) => d.toISOString().split('T')[0]
      
      let cible = new Date()
      let check = true
      
      // Si pas de révision aujourd'hui ni hier, la série est à 0
      if (!datesUniques.includes(formatDate(cible))) {
        cible.setDate(cible.getDate() - 1)
        if (!datesUniques.includes(formatDate(cible))) check = false
      }

      while (check) {
        const strCible = formatDate(cible)
        if (datesUniques.includes(strCible)) {
          serieActuelle++
          cible.setDate(cible.getDate() - 1)
        } else {
          check = false
        }
      }
    }

    return {
      tempsTotalStr,
      precisionMoyenne,
      serieActuelle,
      repartition: dictionnaireDifficultes
    }
  }, [totalChapters, totalErrors, totalTimeInSeconds, feedback])

  // Couleurs pour l'anneau de répartition
  const couleursDifficultes = {
    'très difficile': '#EF4444',
    'difficile': '#F97316',
    'moyen': '#EAB308',
    'facile': '#22C55E',
    'très facile': '#06B6D4'
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 text-foreground bg-[#0B0B0C] min-h-screen">
      {/* HEADER */}
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">Stats</h1>
        <p className="text-sm text-zinc-400">Analyse de ta progression</p>
      </header>

      {/* GRILLE DES 4 CARTES SUPÉRIEURES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* CARTE 1 : CHAPITRES (Chronométrés à partir de maintenant) */}
        <div className="bg-[#131315] border border-zinc-800/80 rounded-xl p-5 space-y-2">
          <p className="text-xs text-zinc-400 font-medium">Chapitres révisés</p>
          <p className="text-3xl font-bold font-mono text-zinc-100">{totalChapters}</p>
          <p className="text-[10px] text-zinc-500">Sur cette application</p>
        </div>

        {/* CARTE 2 : ERREURS (Chronométrées à partir de maintenant) */}
        <div className="bg-[#131315] border border-zinc-800/80 rounded-xl p-5 space-y-2">
          <p className="text-xs text-zinc-400 font-medium">Erreurs totales</p>
          <p className="text-3xl font-bold font-mono text-zinc-100">{totalErrors}</p>
          <p className="text-[10px] text-zinc-500">Sur cet échiquier</p>
        </div>

        {/* CARTE 3 : STREAK (Historique préservé) */}
        <div className="bg-[#131315] border border-zinc-800/80 rounded-xl p-5 space-y-2">
          <p className="text-xs text-zinc-400 font-medium">Série actuelle</p>
          <p className="text-3xl font-bold font-mono text-indigo-400">
            {stats.serieActuelle} <span className="text-sm font-normal text-zinc-500">Jours</span>
          </p>
          <p className="text-[10px] text-zinc-500">Régularité d'entraînement</p>
        </div>

        {/* CARTE 4 : TEMPS TOTAL (Calculé à la seconde près) */}
        <div className="bg-[#131315] border border-zinc-800/80 rounded-xl p-5 space-y-2">
          <p className="text-xs text-zinc-400 font-medium">Temps de jeu</p>
          <p className="text-3xl font-bold font-mono text-indigo-400">{stats.tempsTotalStr}</p>
          <p className="text-[10px] text-zinc-500">Durée réelle sur l'application</p>
        </div>
      </div>

      {/* SECTION DU MILIEU : GRAPHIQUES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* BLOC ACCORDÉON : RÉPARTITION DES DIFFICULTÉS */}
        <div className="bg-[#131315] border border-zinc-800/80 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-300">Répartition des difficultés</h3>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 justify-around py-2">
            {/* ANNEAU SIMULÉ EN SVG */}
            <div className="relative size-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#27272A" strokeWidth="4" />
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#6366F1" strokeWidth="4" strokeDasharray="70 100" strokeLinecap="round" />
              </svg>
              <div className="absolute text-center">
                <Brain className="size-5 text-zinc-500 mx-auto" />
              </div>
            </div>

            {/* LÉGENDE TEXTUELLE AVEC LES COMPTEURS RÉELS */}
            <div className="space-y-1.5 w-full sm:w-auto">
              {(Object.keys(stats.repartition) as FeedbackLevel[]).map(level => {
                const count = stats.repartition[level]
                const PCT = feedback.length > 0 ? Math.round((count / feedback.length) * 100) : 0
                return (
                  <div key={level} className="flex items-center justify-between gap-8 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ backgroundColor: couleursDifficultes[level] }} />
                      <span className="capitalize text-zinc-400">{level}</span>
                    </div>
                    <span className="font-mono font-semibold text-zinc-200">{PCT}% ({count})</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* BLOC PRÉCISION MOYENNE */}
        <div className="bg-[#131315] border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-300">Précision tactique</h3>
            <p className="text-4xl font-bold font-mono text-emerald-400 mt-2">{stats.precisionMoyenne}%</p>
            <p className="text-xs text-zinc-500">Taux de réussite calculé uniquement sur tes sessions d'échiquier Next.js</p>
          </div>

          {/* PETITE LIGNE DE GRAPHIC SIMULÉE EN SVG STYLE EMERGENT */}
          <div className="w-full h-16 mt-4 opacity-70">
            <svg className="w-full h-full text-emerald-500" viewBox="0 0 100 20" preserveAspectRatio="none">
              <path 
                d="M0,15 Q15,5 30,12 T60,8 T90,14 L100,10" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

      </div>
    </div>
  )
}
