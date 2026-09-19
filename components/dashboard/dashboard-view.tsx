'use client'

import { Flame, Play, Trophy } from 'lucide-react'
import type { DueChapter, PriorityBlockSummary } from '@/lib/types'

interface DashboardViewProps {
  session: DueChapter[]
  summary: PriorityBlockSummary[]
  onStart: () => void
  forcedStats?: { fait: number; total: number } // 👈 Sécurité d'alignement racine
}

export function DashboardView({ session, summary, onStart, forcedStats }: DashboardViewProps) {
  // Extraction dynamique et protection contre les restes de la veille
  const totalInitialDuJour = forcedStats ? forcedStats.total : (summary?.reduce((acc, curr) => acc + (curr.initialDueCount || 0), 0) || 0)
  const totalRestantDuJour = session.length
  const totalFaitDuJour = forcedStats ? forcedStats.fait : Math.max(0, totalInitialDuJour - totalRestantDuJour)

  // Calcule le pourcentage réel du cercle. Si rien n'est révisé, la jauge est strictement vide (0%)
  const pourcentageReel = totalInitialDuJour > 0 ? Math.round((totalFaitDuJour / totalInitialDuJour) * 100) : 0

  const gameTimeMinutes = typeof window !== 'undefined' ? Math.round(Number(localStorage.getItem('app_total_time') || 0) / 60) : 0
  const currentStreak = typeof window !== 'undefined' ? Number(localStorage.getItem('chess-trainer:streak') || 0) : 0

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 text-foreground animate-fade-in">
      {/* EN-TÊTE PROFILE */}
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

      {/* BLOC AVANCEMENT GLOBAL DE LA JOURNÉE (Format : fait / dû) */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-[#121214] p-6 shadow-md flex items-center justify-between gap-4">
        <div className="space-y-2 z-10">
          <h2 className="text-base font-semibold text-zinc-200">Avancement du jour</h2>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-bold tracking-tight text-zinc-100">
              {totalRestantDuJour === 0 && totalInitialDuJour > 0 
                ? `${totalInitialDuJour} / ${totalInitialDuJour}` 
                : `${totalFaitDuJour} / ${totalInitialDuJour}`}
            </span>
            <span className="text-xs text-zinc-500 font-medium">chapitres</span>
          </div>
          <p className="text-xs text-zinc-500 font-medium">
            {totalRestantDuJour > 0 
              ? `Il vous reste ${totalRestantDuJour} variantes à valider.` 
              : "Félicitations ! Votre répertoire est parfaitement à jour."}
          </p>
        </div>

        {/* CERCLE DE PROGRESSION DYNAMIQUE */}
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

      {/* BOUTON DÉMARRER AVEC VARIANTES RESTANTES VIVANTES */}
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

      {/* STATS RAPIDES */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4 shadow-sm">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Temps d&apos;étude</p>
          <p className="font-mono text-xl font-bold mt-1 text-zinc-200">{gameTimeMinutes} <span className="text-xs font-normal text-zinc-500">min</span></p>
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Statut</p>
          <p className="text-sm font-bold mt-1 text-emerald-500 flex items-center gap-1">
            <Trophy className="size-4 shrink-0" />
            <span>{totalRestantDuJour === 0 ? "Complété" : "En cours"}</span>
          </p>
        </div>
      </div>

      {/* 📊 PROGRES PAR BLOCS RECONSTRUIT (Affiche TOUT sans masquer au format fait / dû) */}
      <div className="rounded-xl border border-zinc-800 bg-[#141416] p-5 space-y-3 shadow-sm">
        <h3 className="font-semibold text-sm text-zinc-400 uppercase tracking-wider">Progression par blocs</h3>
        
        <div className="divide-y divide-zinc-800/60">
          {summary?.map((block) => {
            const initialForBlock = block.initialDueCount || block.dueCount || 0
            const faitDansCeBloc = Math.max(0, initialForBlock - block.dueCount)
            
            return (
              <div key={block.priority} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
                <span className="text-sm font-medium text-zinc-300 capitalize">
                  {block.priority.toLowerCase().replace('priorité', '').trim()}
                </span>
                
                <span className="text-sm font-mono font-bold text-zinc-400">
                  {initialForBlock > 0 ? (
                    <>
                      <span className={faitDansCeBloc === initialForBlock ? "text-emerald-500" : "text-zinc-200"}>
                        {faitDansCeBloc}
                      </span>
                      <span className="text-zinc-600 font-normal"> / {initialForBlock}</span>
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
