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

  // ÉTATS DES STATS : Initialisés proprement à 0
  const [totalSessionLength, setTotalSessionLength] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)

  // 1. CHARGEMENT AU DÉMARRAGE (Hydratation Client)
  useEffect(() => {
    const stored = loadStoredRepertoire()
    if (stored) {
      setRevisionBlocks(stored.revisionBlocks)
      setFeedback(stored.feedback)
      setPgnChapters(stored.pgnChapters)
    }
    setImportText(loadRawImportText())

    // Récupération des statistiques persistées
    const savedTotal = localStorage.getItem('totalSessionLength')
    const savedCompleted = localStorage.getItem('completedCount')
    const savedView = localStorage.getItem('trainingView')
    const savedActiveSession = localStorage.getItem('activeSession')

    if (savedTotal) setTotalSessionLength(Number(savedTotal))
    if (savedCompleted) setCompletedCount(Number(savedCompleted))
    if (savedView === 'training') setView('training')
    if (savedActiveSession) {
      try {
        setActiveSession(JSON.parse(savedActiveSession))
      } catch (e) {
        console.error("Erreur de parsing de l'activeSession", e)
      }
    }

    setMounted(true)
  }, [])

  // 2. PERSISTANCE AUTOMATIQUE DES STATS ET DE L'ÉCRAN
  useEffect(() => {
    if (!mounted) return
    localStorage.setItem('totalSessionLength', totalSessionLength.toString())
  }, [totalSessionLength, mounted])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem('completedCount', completedCount.toString())
  }, [completedCount, mounted])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem('trainingView', view)
  }, [view, mounted])

  useEffect(() => {
    if (!mounted) return
    localStorage.setItem('activeSession', JSON.stringify(activeSession))
  }, [activeSession, mounted])


  const { session, summary } = useMemo(() => buildSession(revisionBlocks, feedback), [revisionBlocks, feedback])

  function handleStart() {
    setActiveSession(session)
    setTotalSessionLength(session.length) // Ex: 30
    setCompletedCount(0)                  // Reset à 0 pour une NOUVELLE session
    setView('training')
  }

  function handleAddFeedback(entry: FeedbackEntry) {
    setFeedback((prev) => {
      const next = [...prev, entry]
      saveFeedback(next)
      return next
    })
    
    // On avance dans les compteurs
    setCompletedCount((prev) => prev + 1)
    // On retire le chapitre qui vient d'être fait de la session active en mémoire
    setActiveSession((prev) => prev.slice(1))
  }

  function handleExit() {
    setView('dashboard')
    setActiveSession([])
    // Les stats restent dans le localStorage pour être lues par l'onglet Stats !
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

