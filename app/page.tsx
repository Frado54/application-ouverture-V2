'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { BottomNav, type AppTab } from '@/components/nav/bottom-nav'
import { ImportPanel } from '@/components/settings/import-panel'
import { SettingsView } from '@/components/settings/settings-view'
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

  // ÉTATS CLASSIQUES
  const [revisionBlocks, setRevisionBlocks] = useState<RevisionPriorityBlock[]>(() => {
    if (isClient) { const stored = loadStoredRepertoire(); if (stored) return stored.revisionBlocks }
    return mockRevisionBlocks
  })
  const [feedback, setFeedback] = useState<FeedbackEntry[]>(() => {
    if (isClient) { const stored = loadStoredRepertoire(); if (stored) return stored.feedback }
    return mockFeedback
  })
  const [pgnChapters, setPgnChapters] = useState<Record<string, PgnChapter>>( () => {
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

  // JAUGE DU JOUR
  const [totalSessionLength, setTotalSessionLength] = useState<number>(() => {
    if (isClient) { const saved = localStorage.getItem('totalSessionLength'); if (saved !== null) return Number(saved) }
    return 0
  })
  const [completedCount, setCompletedCount] = useState<number>(() => {
    if (isClient) { const saved = localStorage.getItem('completedCount'); if (saved !== null) return Number(saved) }
    return 0
  })

  // 👇 NOUVEAUX COMPTEURS EXCLUSIFS À L'APPLICATION
  const [appChapters, setAppChapters] = useState<number>(() => {
    if (isClient) return Number(localStorage.getItem('app_total_chapters') || 0)
    return 0
  })
  const [appErrors, setAppErrors] = useState<number>(() => {
    if (isClient) return Number(localStorage.getItem('app_total_errors') || 0)
    return 0
  })
  const [appTime, setAppTime] = useState<number>(() => {
    if (isClient) return Number(localStorage.getItem('app_total_time') || 0)
    return 0
  })

  // TOP DÉPART POUR CHRONOMÉTRER LE CHAPITRE EN COURS
  const [chapterStartTime, setChapterStartTime] = useState<number>(Date.now())

  useEffect(() => { setMounted(true) }, [])

  const { session } = useMemo(() => buildSession(revisionBlocks, feedback), [revisionBlocks, feedback])

  // PERSISTANCE DES COMPTEURS D'APPLICATION
  useEffect(() => { if (mounted) localStorage.setItem('app_total_chapters', appChapters.toString()) }, [appChapters, mounted])
  useEffect(() => { if (mounted) localStorage.setItem('app_total_errors', appErrors.toString()) }, [appErrors, mounted])
  useEffect(() => { if (mounted) localStorage.setItem('app_total_time', appTime.toString()) }, [appTime, mounted])

  // PERSISTANCE JAUGE DU JOUR
  useEffect(() => { if (mounted) localStorage.setItem('totalSessionLength', totalSessionLength.toString()) }, [totalSessionLength, mounted])
  useEffect(() => { if (mounted) localStorage.setItem('completedCount', completedCount.toString()) }, [completedCount, mounted])
  useEffect(() => { if (mounted) localStorage.setItem('trainingView', view) }, [view, mounted])
  useEffect(() => { if (mounted) localStorage.setItem('activeSession', JSON.stringify(activeSession)) }, [activeSession, mounted])

  function handleStart() {
    setActiveSession(session)
    setTotalSessionLength(session.length) 
    setCompletedCount(0)                  
    setChapterStartTime(Date.now()) // Démarre le chrono du tout premier chapitre
    setView('training')
  }

  function handleAddFeedback(entry: FeedbackEntry) {
    // 1. Calcul du temps passé sur ce chapitre précis
    const endTime = Date.now()
    const secondsElapsed = Math.round((endTime - chapterStartTime) / 1000)
    
    // Sécurité AFK : On plafonne à 3 minutes (180s) max par chapitre
    const safeSeconds = Math.min(secondsElapsed, 180)

    // 2. Mise à jour des statistiques cumulées de l'application
    setAppChapters((prev) => prev + 1)
    setAppErrors((prev) => prev + (entry.errors || 0))
    setAppTime((prev) => prev + safeSeconds)

    // 3. Suite de la logique SRS standard
    setFeedback((prev) => { const next = [...prev, entry]; saveFeedback(next); return next })
    setCompletedCount((prev) => prev + 1)
    
    // Le chapitre suivant commence MAINTENANT
    setChapterStartTime(Date.now())
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
    
    // Note : On ne réinitialise PAS les compteurs globaux de l'application lors d'un import de fichier
  }

  if (!mounted) return <div className="min-h-svh bg-background flex items-center justify-center"><div className="size-8 animate-spin rounded-full border-2 border-t-primary" /></div>

  if (view === 'training') {
    return <TrainingView session={activeSession} pgnChapters={pgnChapters} onAddFeedback={handleAddFeedback} onExit={handleExit} />
  }

  return (
    <div className="min-h-svh bg-background pb-24">
      {activeTab === 'aujourdhui' && <DashboardView session={session} onStart={handleStart} />}
      
      {activeTab === 'gerer' && (
        <div className="p-4 max-w-2xl mx-auto space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1 text-foreground">Gestion du Répertoire</h1>
            <p className="text-sm text-muted-foreground mb-6">Visualisez, modifiez ou exportez les données brutes.</p>
          </div>
          <ImportPanel initialText={importText} onImport={handleImport} />
        </div>
      )}

      {/* 👇 ON PASSE LES NOUVELLES INFOS CUMULÉES À L'ONGLET STATS */}
      {activeTab === 'stats' && (
        <StatsView 
          totalChapters={appChapters} 
          totalErrors={appErrors} 
          totalTimeInSeconds={appTime} 
          feedback={feedback}
        />
      )}

      {activeTab === 'reglages' && <SettingsView sessionCount={session.length} />} 
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
    </div>
  )
}
