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

  // ÉTATS DE LA BASE DE DONNÉES
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

  // ÉTATS DE NAVIGATION ET SESSIONS
  const [view, setView] = useState<'dashboard' | 'training'>('dashboard')
  const [activeTab, setActiveTab] = useState<AppTab>('aujourdhui')
  const [activeSession, setActiveSession] = useState<DueChapter[]>([])

  // JAUGE DU JOUR (COMPTEURS DE SESSIONS EN DIRECT)
  const [completedCount, setCompletedCount] = useState<number>(0)

  // STATS CUMULÉES DE L'APPLICATION
  const [appChapters, setAppChapters] = useState<number>(0)
  const [appErrors, setAppErrors] = useState<number>(0)
  const [appTime, setAppTime] = useState<number>(0)
  const [chapterStartTime, setChapterStartTime] = useState<number>(Date.now())

    // 🛠️ NETTOYAGE MATINAL COMPLET ET ÉTANCHE DE TOUS LES BLOCS
    useEffect(() => {
      if (isClient) {
        setMounted(true)
  
        const tzOffset = new Date().getTimezoneOffset() * 60000
        const localISODate = new Date(Date.now() - tzOffset).toISOString().slice(0, 10)
        const dateDernierNettoyage = localStorage.getItem('chess-trainer:last-clear-date')
  
        setAppChapters(Number(localStorage.getItem('app_total_chapters') || 0))
        setAppErrors(Number(localStorage.getItem('app_total_errors') || 0))
        setAppTime(Number(localStorage.getItem('app_total_time') || 0))
  
        if (dateDernierNettoyage !== localISODate) {
          // 1. Reset de la jauge
          localStorage.setItem('completedCount', '0')
          setCompletedCount(0)
  
          // 2. PURGE ABSOLUE : On efface TOUTES les clés de blocs (avec et sans accents)
          localStorage.removeItem('chess-trainer:initial-due-PRIORITÉ ABSOLUE')
          localStorage.removeItem('chess-trainer:initial-due-PRIORITE ABSOLUE')
          localStorage.removeItem('chess-trainer:initial-due-PRIORITÉ ÉLEVÉE')
          localStorage.removeItem('chess-trainer:initial-due-PRIORITE ELEVEE')
          localStorage.removeItem('chess-trainer:initial-due-PRIORITÉ MOYENNE')
          localStorage.removeItem('chess-trainer:initial-due-PRIORITE MOYENNE')
          localStorage.removeItem('chess-trainer:initial-due-PRIORITÉ FAIBLE')
          localStorage.removeItem('chess-trainer:initial-due-PRIORITE FAIBLE')
          localStorage.removeItem('chess-trainer:initial-due-PRIORITÉ TRÈS FAIBLE')
          localStorage.removeItem('chess-trainer:initial-due-PRIORITE TRES FAIBLE')
          
          localStorage.setItem('chess-trainer:last-clear-date', localISODate)
        } else {
          setCompletedCount(Number(localStorage.getItem('completedCount') || 0))
        }
      }
    }, [isClient])
  

  // EXTRATION SRS DYNAMIQUE
  const { session, summary } = useMemo(() => {
    return buildSession(revisionBlocks, feedback)
  }, [revisionBlocks, feedback])

  // ENREGISTREMENT DES MISES À JOUR STRICTES (Uniquement si monté)
  useEffect(() => { if (mounted) localStorage.setItem('app_total_chapters', appChapters.toString()) }, [appChapters, mounted])
  useEffect(() => { if (mounted) localStorage.setItem('app_total_errors', appErrors.toString()) }, [appErrors, mounted])
  useEffect(() => { if (mounted) localStorage.setItem('app_total_time', appTime.toString()) }, [appTime, mounted])
  useEffect(() => { if (mounted) localStorage.setItem('completedCount', completedCount.toString()) }, [completedCount, mounted])

  function handleStart() {
    setActiveSession(session)
    setChapterStartTime(Date.now())
    setView('training')
  }

  function handleAddFeedback(entry: FeedbackEntry) {
    const endTime = Date.now()
    const secondsElapsed = Math.round((endTime - chapterStartTime) / 1000)
    const safeSeconds = Math.min(secondsElapsed, 180)

    setAppChapters((prev) => prev + 1)
    setAppErrors((prev) => prev + (entry.errors || 0))
    setAppTime((prev) => prev + safeSeconds)

    setFeedback((prev) => { const next = [...prev, entry]; saveFeedback(next); return next })
    
    // Fait progresser la jauge locale et disque dur
    setCompletedCount((prev) => {
      const nextCount = prev + 1
      localStorage.setItem('completedCount', nextCount.toString())
      return nextCount
    })
    
    setChapterStartTime(Date.now())

    // Défilement physique de la pile active
    const nextSessionStack = activeSession.slice(1)
    setActiveSession(nextSessionStack)

    if (nextSessionStack.length === 0) {
      setView('dashboard')
    }
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
    
    setCompletedCount(0)
    localStorage.setItem('completedCount', '0')

    if (isClient) {
      localStorage.removeItem('chess-trainer:initial-due-PRIORITÉ ABSOLUE')
      localStorage.removeItem('chess-trainer:initial-due-ÉLEVÉE')
      localStorage.removeItem('chess-trainer:initial-due-MOYENNE')
      localStorage.removeItem('chess-trainer:initial-due-FAIBLE')
      localStorage.removeItem('chess-trainer:initial-due-TRÈS FAIBLE')
    }
  }

  if (!mounted) return <div className="min-h-svh bg-background flex items-center justify-center"><div className="size-8 animate-spin rounded-full border-2 border-t-primary" /></div>

  if (view === 'training') {
    return <TrainingView session={activeSession} pgnChapters={pgnChapters} onAddFeedback={handleAddFeedback} onExit={handleExit} />
  }

    // 🛠️ ALIGNEMENT CHIRURGICAL ET IMMUABLE DES COMPTEURS
    const summaryList = summary || []
    const totalRestantDuJour = session.length
    const totalFaitDuJour = completedCount
    const totalInitialDuJour = totalFaitDuJour + totalRestantDuJour
  
    // 🎯 SÉCURITÉ CHOC : Si tu n'as pas encore fait de chapitre aujourd'hui (totalFaitDuJour === 0),
    // on force toutes les lignes du résumé du Dashboard à afficher "0 faits" pour briser le cache d'hier !
    const cleanedSummary = summaryList.map((block) => {
      if (totalFaitDuJour === 0) {
        return {
          ...block,
          initialDueCount: block.dueCount, // Fige le total sur ce qu'il reste à faire à blanc
        }
      }
      return block
    })
  

  return (
    <div className="min-h-svh bg-background pb-24">
            {activeTab === 'aujourdhui' && (
        <DashboardView 
          session={session} 
          summary={cleanedSummary} // 👈 ON PASSE LA LISTE NETTOYÉE ICI
          onStart={handleStart}
          forcedStats={{
            fait: totalFaitDuJour,
            total: totalInitialDuJour
          }}
        />
      )}

      
      {activeTab === 'gerer' && (
        <div className="p-4 max-w-2xl mx-auto space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1 text-foreground">Gestion du Répertoire</h1>
            <p className="text-sm text-muted-foreground mb-6">Visualisez, modifiez ou exportez les données brutes.</p>
          </div>
          <ImportPanel initialText={importText} onImport={handleImport} />
        </div>
      )}

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
