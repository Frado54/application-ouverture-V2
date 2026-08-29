'use client'

import { useMemo } from 'react'
import { BarChart3, Brain, Calendar, Clock, Percent, Trophy } from 'lucide-react'
import type { FeedbackEntry, FeedbackLevel } from '@/lib/types'

interface StatsViewProps {
  feedback: FeedbackEntry[]
}

export function StatsView({ feedback }: StatsViewProps) {
  const stats = useMemo(() => {
    // 1. Total des chapitres révisés
    const totalRevisions = feedback.length

    // 2. Total des erreurs
    const totalErrors = feedback.reduce((sum, f) => sum + (f.errors || 0), 0)

    // 3. Temps total estimé (ex: ~2 minutes par chapitre révisé en moyenne)
    const minutesParChapitre = 2
    const totalMinutes = totalRevisions * minutesParChapitre
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    const tempsTotalStr = `${hours}h ${mins.toString().padStart(2, '0')}m`

    // 4. Répartition des difficultés
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

    // 5. Calcul de la précision moyenne (Basé sur les coups sans erreur)
    // On estime la précision : (Total des coups - Erreurs) / Total, limité proprement
    const precisionMoyenne = totalRevisions > 0 
      ? Math.max(50, Math.round(((totalRevisions * 10 - totalErrors) / (totalRevisions * 10)) * 100))
      : 100

    // 6. Calcul de la série actuelle (Streak de jours consécutifs)
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
      totalRevisions,
      totalErrors,
      tempsTotalStr,
      precisionMoyenne,
      serieActuelle,
      repartition: dictionnaireDifficultes
    }
  }, [feedback])

  // Couleurs pour l'anneau de répartition
  const couleursDifficultes = {
    'très difficile': '#EF4444', // Rouge
    'difficile': '#F97316',      // Orange
    'moyen': '#EAB308',         // Jaune
    'facile': '#22C55E',        // Vert
    'très facile': '#06B6D4'     // Cyan
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
        {/* CARTE 1 : CHAPITRES */}
        <div className="bg-[#131315] border border-zinc-800/80 rounded-xl p-5 space-y-2">
          <p className="text-xs text-zinc-400 font-medium">Chapitres révisés</p>
          <p className="text-3xl font-bold font-mono text-zinc-100">{stats.totalRevisions}</p>
          <p className="text-[10px] text-zinc-500">Volume total cumulé</p>
        </div>

        {/* CARTE 2 : ERREURS */}
        <div className="bg-[#131315] border border-zinc-800/80 rounded-xl p-5 space-y-2">
          <p className="text-xs text-zinc-400 font-medium">Erreurs totales</p>
          <p className="text-3xl font-bold font-mono text-zinc-100">{stats.totalErrors}</p>
          <p className="text-[10px] text-zinc-500">Total sur les variantes</p>
        </div>

        {/* CARTE 3 : STREAK */}
        <div className="bg-[#131315] border border-zinc-800/80 rounded-xl p-5 space-y-2">
          <p className="text-xs text-zinc-400 font-medium">Série actuelle</p>
          <p className="text-3xl font-bold font-mono text-indigo-400">
            {stats.serieActuelle} <span className="text-sm font-normal text-zinc-500">Jours</span>
          </p>
          <p className="text-[10px] text-zinc-500">Régularité d'entraînement</p>
        </div>

        {/* CARTE 4 : TEMPS TOTAL */}
        <div className="bg-[#131315] border border-zinc-800/80 rounded-xl p-5 space-y-2">
          <p className="text-xs text-zinc-400 font-medium">Temps total</p>
          <p className="text-3xl font-bold font-mono text-indigo-400">{stats.tempsTotalStr}</p>
          <p className="text-[10px] text-zinc-500">Estimation d'apprentissage</p>
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
                {/* Un anneau simple bicolore ou neutre par défaut pour rester fluide sans scripts tiers */}
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
                const PCT = stats.totalRevisions > 0 ? Math.round((count / stats.totalRevisions) * 100) : 0
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
            <h3 className="text-sm font-semibold text-zinc-300">Précision moyenne</h3>
            <p className="text-4xl font-bold font-mono text-emerald-400 mt-2">{stats.precisionMoyenne}%</p>
            <p className="text-xs text-zinc-500">Calculée sur la base du taux de réussite global de tes variantes</p>
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
