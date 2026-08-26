'use client'

import { SESSION_MAX_CHAPTERS } from '@/lib/srs'
import type { PriorityBlockSummary } from '@/lib/srs'

interface StatsViewProps {
  sessionLength: number
  completedCount?: number // On accueille notre compteur de réussites
  summary: PriorityBlockSummary[]
}

export function StatsView({ sessionLength, completedCount = 0, summary }: StatsViewProps) {
  const cap = Math.min(sessionLength, SESSION_MAX_CHAPTERS)
  
  // CORRECTION ICI : On utilise completedCount bridé au maximum de la session pour ne pas dépasser la barre
  const completed = Math.min(completedCount, cap)
  
  const percent = cap === 0 ? 0 : Math.round((completed / cap) * 100)
  const activeBlock = summary.find((b) => b.isActive)

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-[#E0532C]">Progression</p>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Stats</h1>
        <p className="text-sm text-muted-foreground">Avancement de la session du jour</p>
      </header>

      <section className="rounded-xl border border-white/6 bg-card p-5">
        <p className="text-sm text-muted-foreground">Progression de la session</p>
        <p className="mt-2 font-serif text-4xl font-semibold text-foreground">
          {completed} <span className="text-lg font-normal text-muted-foreground">/ {cap}</span>
        </p>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-[#E0532C] transition-all duration-300" style={{ width: `${percent}%` }} />
        </div>
        {activeBlock && (
          <p className="mt-3 text-xs text-muted-foreground">
            Bloc actif : <span className="font-medium text-foreground">{activeBlock.priority}</span>
          </p>
        )}
      </section>
    </div>
  )
}
