'use client'

import { PriorityBlockSummary } from '@/lib/srs'

interface StatsViewProps {
  sessionLength: number
  completedCount: number
  summary: PriorityBlockSummary[]
}

export function StatsView({ sessionLength, completedCount, summary }: StatsViewProps) {
  // Calcul du pourcentage global de la session en cours
  const globalPercentage = sessionLength > 0 
    ? Math.min(100, Math.round((completedCount / sessionLength) * 100)) 
    : 0

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 text-foreground animate-fade-in">
      {/* HEADER */}
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-[#E0532C]">Statistiques</p>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Ta Progression</h1>
        <p className="text-sm text-muted-foreground">
          Vue d'ensemble de ton avancement et de l'état de ton répertoire.
        </p>
      </header>

      {/* 1. CARTE DE PROGRESSION GLOBALE (DYNAMIQUE) */}
      <div className="rounded-xl border border-zinc-800 bg-[#151517] p-5 space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-zinc-200">Session du jour</h3>
            <p className="text-2xl font-mono font-bold text-primary mt-1">
              {completedCount} <span className="text-zinc-500 text-lg">/ {sessionLength}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">chapitres révisés aujourd'hui</p>
          </div>
          
          {/* CERCLE DE PROGRESSION STYLE TABLEAU DE BORD */}
          <div className="relative size-20 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-zinc-800"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-indigo-500 transition-all duration-500 ease-out"
                strokeDasharray={`${globalPercentage}, 100`}
                strokeWidth="3"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute font-mono text-base font-bold text-zinc-100">{globalPercentage}%</span>
          </div>
        </div>

        {/* BARRE DE PROGRESSION HORIZONTALE EN RAPPEL */}
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-primary transition-all duration-500 ease-out"
            style={{ width: `${globalPercentage}%` }}
          />
        </div>
      </div>

      {/* 2. ÉTAT DES BLOCS DE PRIORITÉ (DYNAMIQUE VIA LE SUMMARY) */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400 px-1">Progression par blocs</h2>
        
        <div className="space-y-3">
          {summary.map((block) => {
            // Calcul du nombre de chapitres déjà appris ou travaillés dans ce bloc
            const enCoursOuTermines = block.totalCount - block.dueCount
            const blockPercentage = block.totalCount > 0 
              ? Math.round((enCoursOuTermines / block.totalCount) * 100) 
              : 100

            // Gestion dynamique de la couleur des puces selon la priorité
            const colorClass = block.priority.includes('ABSOLUE') ? 'bg-red-500' 
                             : block.priority.includes('ÉLEVÉE') ? 'bg-orange-500'
                             : block.priority.includes('MOYENNE') ? 'bg-yellow-500'
                             : 'bg-green-500'

            return (
              <div 
                key={block.priority} 
                className={`p-4 rounded-xl border transition-all ${
                  block.isActive 
                    ? 'bg-[#18181B] border-zinc-800 opacity-100' 
                    : 'bg-zinc-900/30 border-zinc-900/50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`size-2.5 rounded-full ${colorClass}`} />
                    <span className="font-mono text-xs font-bold tracking-wide text-zinc-200 uppercase">
                      {block.priority}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-semibold text-zinc-400">
                      {block.dueCount} dus <span className="text-zinc-600">/ {block.totalCount} totaux</span>
                    </span>
                  </div>
                </div>

                {/* Barre d'avancement du bloc spécifique */}
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      block.dueCount === 0 ? 'bg-emerald-500' : 'bg-zinc-500'
                    }`}
                    style={{ width: `${blockPercentage}%` }}
                  />
                </div>
                
                {block.dueCount === 0 && block.totalCount > 0 && (
                  <p className="text-[10px] text-emerald-500 font-medium mt-1.5 flex items-center gap-1 animate-pulse">
                    🎉 Ce bloc est entièrement nettoyé pour aujourd'hui !
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
