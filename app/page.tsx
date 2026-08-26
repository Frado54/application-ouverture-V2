'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { ManageView } from '@/components/manage/manage-view'
import { BottomNav, type AppTab } from '@/components/nav/bottom-nav'
import { ImportPanel } from '@/components/settings/import-panel'
import { StatsView } from '@/components/stats/stats-view'
import { TrainingView } from '@/components/training/training-view'
import {
  feedbackHistory as mockFeedback,
  pgnChapters as mockPgnChapters,
  revisionBlocks as mockRevisionBlocks,
} from '@/lib/mock-data'
import { buildSession } from '@/lib/srs'
import { loadRawImportText, loadStoredRepertoire, saveFeedback, saveRawImportText, saveRepertoire } from '@/lib/storage'
import type { DueChapter, FeedbackEntry, PgnChapter, RevisionPriorityBlock } from '@/lib/types'

export default function Page() {
  const [mounted, setMounted] = useState(false)

  const [revisionBlocks, setRevisionBlocks] = useState<RevisionPriorityBlock[]>(mockRevisionBlocks)
  const [feedback, setFeedback] = useState<FeedbackEntry[]>(mockFeedback)
  const [pgnChapters, setPgnChapters] = useState<Record<string, PgnChapter>>(mockPgnChapters)
  const [importText, setImportText] = useState({ revision: '', feedback: '', pgn: '' })

  const [view, setView] = useState<'dashboard' | 'training'>('dashboard')
  const [activeTab, setActiveTab] = useState<AppTab>('aujourdhui')
  const [activeSession, setActiveSession] = useState<DueChapter[]>([])

  // NOUVEAUX ÉTATS POUR LES STATS : Conserve la mémoire de l'avancement réel de la session
  const [totalSessionLength, setTotalSessionLength] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)

  useEffect(() => {
    const stored = loadStoredRepertoire()
    if (stored) {
      setRevisionBlocks(stored.revisionBlocks)
      setFeedback(stored.feedback)
      setPgnChapters(stored.pgnChapters)
    }
    setImportText(loadRawImportText())
    setMounted(true)
  }, [])

  const { session, summary } = useMemo(() => buildSession(revisionBlocks, feedback), [revisionBlocks, feedback])

  function handleStart() {
    setActiveSession(session)
    setTotalSessionLength(session.length) // Enregistre le nombre de départ (ex: 30)
    setCompletedCount(0)                  // Remet le compteur de réussites à 0
    setView('training')
  }

  function handleAddFeedback(entry: FeedbackEntry) {
    setFeedback((prev) => {
      const next = [...prev, entry]
      saveFeedback(next)
      return next
    })
    // Dès qu'on donne un avis (Facile, Difficile), on ajoute +1 au compteur de progression
    setCompletedCount((prev) => prev + 1)
  }

  function handleExit() {
    setView('dashboard')
    setActiveSession([])
    // CHANGEMENT ICI : Au lieu de forcer le retour à l'accueil, on ouvre directement l'onglet Stats !
    setActiveTab('stats')
  }

  function handleImport(data: {
    revisionBlocks: RevisionPriorityBlock[]
    feedback: FeedbackEntry[]
    pgnChapters: Record<string, PgnChapter>
    rawText: { revision: string; feedback: string; pgn: string }
  }) {
    setRevisionBlocks(data.revisionBlocks)
    setFeedback(data.feedback)
    setPgnChapters(data.pgnChapters)
    setImportText(data.rawText)
    saveRepertoire({ revisionBlocks: data.revisionBlocks, feedback: data.feedback, pgnChapters: data.pgnChapters })
    saveRawImportText(data.rawText)
    // Réinitialise les compteurs lors d'une nouvelle importation
    setTotalSessionLength(0)
    setCompletedCount(0)
  }

  if (!mounted) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      </div>
    )
  }

  if (view === 'training') {
    return (
      <TrainingView session={activeSession} pgnChapters={pgnChapters} onAddFeedback={handleAddFeedback} onExit={handleExit} />
    )
  }

  return (
    <div className="min-h-svh bg-background pb-24">
      {activeTab === 'aujourdhui' && <DashboardView session={session} onStart={handleStart} />}
      {activeTab === 'gerer' && <ManageView revisionBlocks={revisionBlocks} />}
      {/* 
        MODIFICATION ICI : 
        Si on n'est pas en session, on montre les données calculées par v0.
        Si on vient de faire une session, on force l'affichage dynamique (ex: completedCount / totalSessionLength).
      */}
      {activeTab === 'stats' && (
        <StatsView 
          sessionLength={totalSessionLength > 0 ? totalSessionLength : session.length} 
          completedCount={completedCount}
          summary={summary} 
        />
      )}
      {activeTab === 'reglages' && <ImportPanel initialText={importText} onImport={handleImport} />}
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  )
}
