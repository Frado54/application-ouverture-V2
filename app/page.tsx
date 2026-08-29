'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { ManageView } from '@/components/manage/manage-view'
import { BottomNav, type AppTab } from '@/components/nav/bottom-nav'
import { ImportPanel } from '@/components/settings/import-panel'
import { SettingsView } from '@/components/settings/settings-view' // 👈 Nouveau composant Réglages
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
  const isClient = typeof window !== 'undefined'
  const [mounted, setMounted] = useState(false)

  const [revisionBlocks, setRevisionBlocks] = useState<RevisionPriorityBlock[]>(() => {
    if (isClient) { const stored = loadStoredRepertoire(); if (stored) return stored.revisionBlocks }
    return mockRevisionBlocks
  })
  const [feedback, setFeedback] = useState<FeedbackEntry[]>(() => {
    if (isClient) { const stored = loadStoredRepertoire(); if (stored) return stored.feedback }
    return mockFeedback
  })
  const [pgnChapters, setPgnChapters] = useState<Record<string, PgnChapter>>(() => {
    if (isClient) { const stored = loadStoredRepertoire(); if (stored) return stored.pgnChapters }
    return mockPgnChapters
  })
  const [importText, setImportText] = useState(() => {
    if (isClient) return loadRawImportText()
    return { revision: '', feedback: '', pgn: '' }
  })

  const [view, setView] = useState<'dashboard' | 'training'>(() => {
    if (isClient) return (localStorage.getItem('trainingView') as 'dashboard' | 'training') || 'dashboard'
    return 'dashboard'
  })
  const [activeTab, setActiveTab] = useState<AppTab>('aujourdhui')
  const [activeSession, setActiveSession] = useState<DueChapter[]>(() => {
    if (isClient) {
      const saved = localStorage.getItem('activeSession')
      if (saved) { try { return JSON.parse(saved) } catch { return [] } }
    }
    return []
  })

  const [totalSessionLength, setTotalSessionLength] = useState<number>(() => {
    if (isClient) { const saved = localStorage.getItem('totalSessionLength'); if (saved !== null) return Number(saved) }
    return 0
  })
  const [completedCount, setCompletedCount] = useState<number>(() => {
    if (isClient) { const saved = localStorage.getItem('completedCount'); if (saved !== null) return Number(saved) }
    return 0
  })

  useEffect(() => { setMounted(true) }, [])

  const { session, summary } = useMemo(() => buildSession(revisionBlocks, feedback), [revisionBlocks, feedback])

  useEffect(() => { if (mounted) localStorage.setItem('totalSessionLength', totalSessionLength.toString()) }, [totalSessionLength, mounted])
  useEffect(() => { if (mounted) localStorage.setItem('completedCount', completedCount.toString()) }, [completedCount, mounted])
  useEffect(() => { if (mounted) localStorage.setItem('trainingView', view) }, [view, mounted])
  useEffect(() => { if (mounted) localStorage.setItem('activeSession', JSON.stringify(activeSession)) }, [activeSession, mounted])

  function handleStart() {
    setActiveSession(session)
    setTotalSessionLength(session.length) 
    setCompletedCount(0)                  
    setView('training')
  }

  function handleAddFeedback(entry: FeedbackEntry) {
    setFeedback((prev) => { const next = [...prev, entry]; saveFeedback(next); return next })
    setCompletedCount((prev) => prev + 1)
    setActiveSession((prev) => prev.slice(1))
  }

  function handleExit() {
    setView('dashboard')
    setActiveSession([])
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
    setTotalSessionLength(0)
    setCompletedCount(0)
  }

  if (!mounted) return <div className="min-h-svh bg-background flex items-center justify-center"><div className="size-8 animate-spin rounded-full border-2 border-t-primary" /></div>

  if (view === 'training') {
    return <TrainingView session={activeSession} pgnChapters={pgnChapters} onAddFeedback={handleAddFeedback} onExit={handleExit} />
  }

  return (
    <div className="min-h-svh bg-background pb-24">
      {/* 1. Onglet Aujourd'hui */}
      {activeTab === 'aujourdhui' && <DashboardView session={session} onStart={handleStart} />}
      
      {/* 2. Onglet Gérer (Fusionné avec l'ImportPanel) */}
      {activeTab === 'gerer' && (
        <div className="space-y-8 p-4 max-w-2xl mx-auto">
          <ManageView revisionBlocks={revisionBlocks} />
          <div className="border-t border-border pt-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Sauvegardes & Imports</h2>
            <ImportPanel initialText={importText} onImport={handleImport} />
          </div>
        </div>
      )}
      
      {/* 3. Onglet Statistiques */}
      {activeTab === 'stats' && (
        <StatsView 
          sessionLength={totalSessionLength > 0 ? totalSessionLength : session.length} 
          completedCount={completedCount} 
          summary={summary} 
        />
      )}
      
      {/* 4. Onglet Réglages (Notifications) */}
      {activeTab === 'reglages' && <SettingsView sessionCount={session.length} />}
      
      {/* TEXTE TÉMOIN */}
      <p className="text-center text-red-500 font-bold mt-4">TEST CONFIGURATION OK</p>
      
      {/* Barre de navigation mobile basse */}
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  )
}
