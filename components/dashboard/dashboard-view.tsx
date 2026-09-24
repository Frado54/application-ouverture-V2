'use client'

import { Flame, Play, Trophy } from 'lucide-react'
import type { DueChapter, PriorityBlockSummary } from '@/lib/types'

interface DashboardViewProps {
  session: DueChapter[]
  summary: PriorityBlockSummary[]
  onStart: () => void
  forcedStats?: { fait: number; total: number }
}

export function DashboardView({ session, summary, onStart, forcedStats }: DashboardViewProps) {
  const totalInitialDuJour = forcedStats ? forcedStats.total : session.length
  const totalRestantDuJour = session.length
  const totalFaitDuJour = forcedStats ? forcedStats.fait : 0

  const pourcentageReel = totalInitialDuJour > 0 ? Math.round((totalFaitDuJour / totalInitialDuJour) * 100) : 0

  const totalSeconds = typeof window !== 'undefined' ? Number(localStorage.getItem('app_total_time') || 0) : 0
  const totalMinutesGlobal = Math.round(totalSeconds / 60)
  const displayHours = Math.floor(totalMinutesGlobal / 60)
  const displayMinutes = totalMinutesGlobal % 60
  
      // 🛠️ RECALIBRAGE DU STREAK : Lecture directe de la clé universelle partagée
  const storedStreak = typeof window !== 'undefined' 
    ? Number(localStorage.getItem('streak') || localStorage.getItem('chess-trainer:streak') || 0) 
    : 0

  // RÈGLE DE REPRISE IMMÉDIATE : Si tu as validé au moins un chapitre aujourd'hui (totalFaitDuJour > 0),
  // la série a officiellement repris ! On force l'accueil à afficher au moins 1j pour s'aligner sur les Stats.
  const currentStreak = totalFaitDuJour > 0 ? Math.max(1, storedStreak) : storedStreak


  return (
    <div className="max-w-md mx-auto p-4 space-y-6 text-foreground animate-fade-in">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Tableau de bord</p>
          <h1 className="font-serif text-2xl font-semibold text-zinc-100">Aujourd&apos;hui</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-full shadow-sm">
          <Flame className="size-4 text-orange-500 fill-orange-500 animate-pulse" />
          <span className="font-mono text-sm font-bold text-zinc-200">{currentStreak}j</span>
        </div>
      </header>

      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-[#121214] p-6 shadow-md flex items-center justify-between gap-4">
        <div className="space-y-2 z-10">
          <h2 className="text-base font-semibold text-zinc-200">Avancement du jour</h2>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-bold tracking-tight text-zinc-100">
              {totalFaitDuJour} / {totalInitialDuJour}
            </span>
            <span className="text-xs text-zinc-500 font-medium">chapitres</span>
          </div>
          <p className="text-xs text-zinc-500 font-medium">
            {totalRestantDuJour > 0 
              ? `Il vous reste ${totalRestantDuJour} variantes à valider.` 
              : "Félicitations ! Votre répertoire est parfaitement à jour."}
          </p>
        </div>

        <div className="relative size-20 shrink-0 flex items-center justify-center">
          <svg className="size-full -rotate-90">
            <circle cx="40" cy="40" r="34" className="stroke-zinc-800 fill-none" strokeWidth="6" />
            <circle
              cx="40"
              cy="40"
              r="34"
              className="stroke-[#E0532C] fill-none transition-all duration-500 ease-out"
              strokeWidth="6"
              strokeDasharray={2 * Math.PI * 34}
              strokeDashoffset={2 * Math.PI * 34 * (1 - pourcentageReel / 100)}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute font-mono text-sm font-bold text-zinc-200">{pourcentageReel}%</span>
        </div>
      </div>

      {totalRestantDuJour > 0 && (
        <button
          type="button"
          onClick={onStart}
          className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-lg text-base"
        >
          <Play className="size-5 fill-white" />
          <span>Démarrer l&apos;entraînement ({totalRestantDuJour})</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4 shadow-sm">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Temps d&apos;étude</p>
          <p className="font-mono text-lg font-bold mt-1 text-zinc-200">
            {displayHours > 0 ? `${displayHours}h ` : ''}{displayMinutes} <span className="text-xs font-normal text-zinc-500">min</span>
          </p>
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Statut</p>
          <p className="text-sm font-bold mt-1 text-emerald-500 flex items-center gap-1">
            <Trophy className="size-4 shrink-0" />
            <span>{totalRestantDuJour === 0 ? "Complété" : "En cours"}</span>
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-[#141416] p-5 space-y-3 shadow-sm">
        <h3 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider">Progression par blocs</h3>
        
        <div className="divide-y divide-zinc-800/60">
          {summary?.map((block) => {
            const totalDuBloc = block.initialDueCount && block.initialDueCount > 0 ? block.initialDueCount : (block.dueCount || 0)
            const faitDansCeBloc = Math.max(0, totalDuBloc - (block.dueCount || 0))

            return (
              <div key={block.priority} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                <span className="text-sm font-medium text-zinc-300 capitalize">
                  {block.priority.toLowerCase().replace('priorité', '').trim()}
                </span>
                <span className="text-sm font-mono font-bold text-zinc-400">
                  {totalDuBloc > 0 ? (
                    <>
                      <span className={faitDansCeBloc === totalDuBloc ? "text-emerald-500" : "text-zinc-200"}>
                        {faitDansCeBloc}
                      </span>
                      <span className="text-zinc-600 font-normal"> / {totalDuBloc}</span>
                    </>
                  ) : (
                    <span className="text-zinc-600 font-normal">0 / 0</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
