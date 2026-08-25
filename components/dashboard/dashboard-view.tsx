'use client'

import { Play, Zap } from 'lucide-react'
import type { DueChapter } from '@/lib/types'
import { cn } from '@/lib/utils'

interface DashboardViewProps {
  session: DueChapter[]
  onStart: () => void
}

export function DashboardView({ session, onStart }: DashboardViewProps) {
  const sessionLength = session.length

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-[#E0532C]">Session du jour</p>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Aujourd&apos;hui</h1>
        <p className="text-sm text-muted-foreground">Chapitres dus et entraînement du jour</p>
      </header>

      <section className="rounded-xl border border-white/6 bg-card p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="size-4 text-[#E0532C]" aria-hidden="true" />
          Chapitres à réviser
        </div>
        <p className="mt-2 font-serif text-4xl font-semibold text-foreground">{sessionLength}</p>
      </section>

      <section className="space-y-2">
        {sessionLength === 0 ? (
          <div className="rounded-xl border border-white/6 bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            Aucun chapitre dû aujourd&apos;hui.
          </div>
        ) : (
          session.map((chapter) => (
            <div
              key={`${chapter.study}__${chapter.chapter}`}
              className="rounded-xl border border-white/6 bg-card px-4 py-3"
            >
              <p className="text-sm font-medium text-foreground">{chapter.study}</p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {chapter.chapter}
                <span className="mx-1.5 text-white/20">·</span>
                {chapter.priority}
              </p>
            </div>
          ))
        )}
      </section>

      <button
        type="button"
        onClick={onStart}
        disabled={sessionLength === 0}
        className={cn(
          'flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-colors',
          sessionLength === 0
            ? 'cursor-not-allowed bg-secondary text-muted-foreground'
            : 'bg-[#E0532C] text-white hover:bg-[#E0532C]/90',
        )}
      >
        <Play className="size-4" aria-hidden="true" />
        {sessionLength === 0 ? 'Aucun chapitre dû aujourd’hui' : "Commencer l'entraînement"}
      </button>
    </div>
  )
}
