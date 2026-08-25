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
  // `buildSession` compares chapter due-dates against `new Date()`, and the
  // repertoire itself may come from `localStorage`. Both are client-only, so
  // rendering them during the initial (server) render would produce a
  // hydration mismatch. We defer everything until after mount and show a
  // neutral placeholder for the very first render.
  const [mounted, setMounted] = useState(false)

  const [revisionBlocks, setRevisionBlocks] = useState<RevisionPriorityBlock[]>(mockRevisionBlocks)
  const [feedback, setFeedback] = useState<FeedbackEntry[]>(mockFeedback)
  const [pgnChapters, setPgnChapters] = useState<Record<string, PgnChapter>>(mockPgnChapters)
  const [importText, setImportText] = useState({ revision: '', feedback: '', pgn: '' })

  const [view, setView] = useState<'dashboard' | 'training'>('dashboard')
  const [activeTab, setActiveTab] = useState<AppTab>('aujourdhui')
  const [activeSession, setActiveSession] = useState<DueChapter[]>([])

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
    setView('training')
  }

  function handleAddFeedback(entry: FeedbackEntry) {
    setFeedback((prev) => {
      const next = [...prev, entry]
      saveFeedback(next)
      return next
    })
  }

  function handleExit() {
    setView('dashboard')
    setActiveSession([])
    setActiveTab('aujourdhui')
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
      {activeTab === 'stats' && <StatsView sessionLength={session.length} summary={summary} />}
      {activeTab === 'reglages' && <ImportPanel initialText={importText} onImport={handleImport} />}
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  )
}
