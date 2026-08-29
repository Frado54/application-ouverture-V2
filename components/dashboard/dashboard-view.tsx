'use client'

import { Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DueChapter } from '@/lib/types'

// Structure attendue pour le récapitulatif des blocs
interface PriorityBlockSummary {
  priority: string
  dueCount: number
  totalCount: number
  isActive: boolean
}

interface DashboardViewProps {
  session: DueChapter[]
  onStart: () => void
}

export function DashboardView({ session, onStart }: DashboardViewProps) {
  const isClient = typeof window !== 'undefined'

  // 1. Récupération dynamique des compteurs réels depuis le localStorage
  const completedCount = isClient ? Number(localStorage.getItem('completedCount') || 0) : 0
  const totalSessionLength = isClient ? Number(localStorage.getItem('totalSessionLength') || 0) : 0

  // Longueur effective pour la jauge du jour
  const sessionLength = totalSessionLength > 0 ? totalSessionLength : session.length

  // Pourcentage global
  const globalPercentage = sessionLength > 0 
    ? Math.min(100, Math.round((completedCount / sessionLength) * 100)) 
    : 0

  // 2. Reconstruction dynamique du résumé des blocs (summary) directement sur l'accueil
  const summary: PriorityBlockSummary[] = useMemo(() => {
    const map = new Map<string, { due: number; total: number }>()
    
    // On regroupe les éléments de la session en cours par priorité
    session.forEach((item) => {
      const current = map.get(item.priority) || { due: 0, total: 0 }
      map.set(item.priority, {
        due: current.due + 1,
        total: current.total + 1, // Approximation basée sur les cartes actives
      })
    })

    // S'il n'y a plus rien, on affiche une liste par défaut propre
    const priorities = ['PRIORITÉ ABSOLUE', 'ÉLEVÉE', 'MOYENNE', 'FAIBLE', 'TRÈS FAIBLE']
    return priorities.map((p) => {
      const counts = map.get(p) || { due: 0, total: 0 }
      return {
        priority: p,
        dueCount: counts.due,
        totalCount: counts.total || 0,
        isActive: counts.due > 0,
      }
    })
  }, [session])

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 text-foreground animate-fade-in">
      {/* HEADER PRINCIPAL */}
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-[#E0532C]">Entraîneur de Répertoire</p>
        <h1 className="font-serif text-3xl font-semibold text-zinc-100">Aujourd'hui</h1>
        <p className="text-sm text-muted-foreground">Prêt pour tes révisions quotidiennes ?</p>
      </header>

      {/* BOUTON JOUER PRINCIPAL */}
      <div className="bg-[#131315] border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 shadow-xl">
        <div className="space-y-1">
          <p className="text-4xl font-extrabold font-mono text-zinc-100">{session.length}</p>
          <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">Chapitres restants à valider</p>
        </div>

        <Button
          onClick={onStart}
          disabled={session.length === 0}
          className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-base transition-all transform active:scale-95 shadow-lg shadow-indigo-600/10 disabled:opacity-40"
        >
          <Play className="size-5 fill-current" />
          <span>Démarrer l'entraînement</span>
        </Button>
      </div>

      {/* JAUGE DE LA SESSION EN COURS */}
      <div className="rounded-xl border border-zinc-800 bg-[#151517] p-5 space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-zinc-300">Avancement de la session</h3>
            <p className="text-2xl font-mono font-bold text-indigo-400 mt-1">
              {completedCount} <span className="text-zinc-500 text-base">/ {sessionLength}</span>
            </p>
          </div>
          
          <div className="relative size-16 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#27272A" strokeWidth="3.5" />
              <circle
                className="text-indigo-500 transition-all duration-500"
                strokeDasharray={`${globalPercentage}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                cx="18" cy="18" r="15.915"
              />
            </svg>
            <span className="absolute font-mono text-xs font-bold text-zinc-200">{globalPercentage}%</span>
          </div>
        </div>
      </div>

      {/* LISTE DES BLOCS DE PRIORITÉ */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 px-1">Progression par blocs</h2>
        <div className="space-y-2.5">
          {summary.map((block) => {
            const colorClass = block.priority.includes('ABSOLUE') ? 'bg-red-500' 
                             : block.priority.includes('ÉLEVÉE') ? 'bg-orange-500'
                             : block.priority.includes('MOYENNE') ? 'bg-yellow-500'
                             : 'bg-green-500'

            return (
              <div 
                key={block.priority} 
                className={`p-3.5 rounded-xl border transition-all ${
                  block.isActive 
                    ? 'bg-[#18181B] border-zinc-800/80 opacity-100' 
                    : 'bg-zinc-900/20 border-zinc-900/30 opacity-40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${colorClass}`} />
                    <span className="font-mono text-[11px] font-bold tracking-wide text-zinc-300 uppercase">
                      {block.priority}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-zinc-400">
                    {block.dueCount} en attente
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Petit import pour le hook useMemo
import { useMemo } from 'react'
