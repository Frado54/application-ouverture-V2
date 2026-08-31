'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { ChessTrainingBoard } from './chess-training-board'
import type { DueChapter, FeedbackEntry, FeedbackLevel, PgnChapter } from '@/lib/types'
import { cn } from '@/lib/utils'

const FEEDBACK_BUTTONS: { level: FeedbackLevel; className: string }[] = [
  { level: 'très difficile', className: 'bg-red-500/90 hover:bg-red-500 text-white' },
  { level: 'difficile', className: 'bg-orange-500/90 hover:bg-orange-500 text-white' },
  { level: 'moyen', className: 'bg-amber-500/90 hover:bg-amber-500 text-white' },
  { level: 'facile', className: 'bg-lime-600/90 hover:bg-lime-600 text-white' },
  { level: 'très facile', className: 'bg-emerald-600/90 hover:bg-emerald-600 text-white' },
]

interface TrainingViewProps {
  session: DueChapter[]
  pgnChapters: Record<string, PgnChapter>
  onAddFeedback: (entry: FeedbackEntry) => void
  onExit: () => void
}

export function TrainingView({ session, pgnChapters, onAddFeedback, onExit }: TrainingViewProps) {
  const isClient = typeof window !== 'undefined'
  
  const [index, setIndex] = useState(0)
  const [chapterErrors, setChapterErrors] = useState(0)
  const [awaitingFeedback, setAwaitingFeedback] = useState(false)

  // Récupération dynamique des compteurs persistés
  const completedCount = isClient ? Number(localStorage.getItem('completedCount') || 0) : 0
  const totalSessionLength = isClient ? Number(localStorage.getItem('totalSessionLength') || 0) : 0

  const chapter = session[index]
  const finished = index >= session.length

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-6 py-24 text-center">
        <CheckCircle2 className="size-14 text-primary" aria-hidden="true" />
        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-semibold text-foreground">Session terminée</h2>
          <p className="text-muted-foreground">
            Vous avez révisé tous les chapitres dus. Bon travail !
          </p>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Retour au tableau de bord
        </button>
      </div>
    )
  }

  const pgn = pgnChapters[`${chapter.study}__${chapter.chapter}`]
  
  // 👇 LE CORRECTIF MAJEUR : Le maximum s'adapte à la longueur réelle cumulée de la session
  const totalLength = totalSessionLength > 0 ? totalSessionLength : (session.length + completedCount)
  const currentProgressCount = completedCount + index + 1

  if (!pgn) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
        <p className="text-muted-foreground">
          Aucun PGN trouvé pour {chapter.study} — chapitre {chapter.chapter}. Vérifiez votre import dans la Gestion du Répertoire.
        </p>
        <button
          type="button"
          onClick={onExit}
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Retour au tableau de bord
        </button>
      </div>
    )
  }

  function handleChapterComplete(errors: number) {
    setChapterErrors(errors)
    setAwaitingFeedback(true)
  }

  function handleFeedback(level: FeedbackLevel) {
    onAddFeedback({
      study: chapter.study,
      chapter: chapter.chapter,
      level,
      date: new Date().toISOString().slice(0, 10),
      errors: chapterErrors,
    })
    setAwaitingFeedback(false)
    setChapterErrors(0)
    setIndex((i) => i + 1)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Quitter la session
        </button>
        {/* 🔢 AFFICHAGE DYNAMIQUE DU COMPTEUR DE VARIANTES */}
        <span className="font-mono text-sm text-muted-foreground">
          {Math.min(currentProgressCount, totalLength)} / {totalLength}
        </span>
      </div>

      {/* 📊 BARRE DE PROGRESSION ORANGE DYNAMIQUE */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-[#E0532C] transition-all duration-300"
          style={{ width: `${(Math.min(completedCount + index + (awaitingFeedback ? 1 : 0), totalLength) / totalLength) * 100}%` }}
        />
      </div>

      <div className="space-y-1 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-accent-foreground">{chapter.priority}</p>
        <h2 className="font-serif text-xl font-semibold text-foreground">{chapter.study}</h2>
        <p className="font-mono text-sm text-muted-foreground">
          Chapitre {chapter.chapter} — {pgn.chapterName}
        </p>
      </div>

      <ChessTrainingBoard key={`${chapter.study}__${chapter.chapter}`} chapter={chapter} pgn={pgn} onComplete={handleChapterComplete} />

      {awaitingFeedback && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Comment évaluez-vous ce chapitre&nbsp;
            {chapterErrors > 0 && (
              <span className="text-destructive">
                ({chapterErrors} erreur{chapterErrors > 1 ? 's' : ''})
              </span>
            )}
            &nbsp;?
          </p>
          <div className="flex w-full flex-wrap justify-center gap-2">
            {FEEDBACK_BUTTONS.map(({ level, className }) => (
              <button
                key={level}
                type="button"
                onClick={() => handleFeedback(level)}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors',
                  className,
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
