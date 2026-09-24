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

  // STATS CUMULÉES DE L'APPLICATION (Lecture directe et sécurisée du disque dur)
  const [appChapters, setAppChapters] = useState<number>(() => {
    if (typeof window !== 'undefined') return Number(localStorage.getItem('app_total_chapters') || 0)
    return 0
  })
  const [appErrors, setAppErrors] = useState<number>(() => {
    if (typeof window !== 'undefined') return Number(localStorage.getItem('app_total_errors') || 0)
    return 0
  })
  const [appTime, setAppTime] = useState<number>(() => {
    if (typeof window !== 'undefined') return Number(localStorage.getItem('app_total_time') || 0)
    return 0
  })
  const [chapterStartTime, setChapterStartTime] = useState<number>(Date.now())

  // 🛠️ NETTOYAGE MATINAL COMPLET ET ÉTANCHE DE TOUS LES BLOCS
  useEffect(() => {
    if (isClient) {
      setMounted(true)

      const tzOffset = new Date().getTimezoneOffset() * 60000
      const localISODate = new Date(Date.now() - tzOffset).toISOString().slice(0, 10)
      const dateDernierNettoyage = localStorage.getItem('chess-trainer:last-clear-date')

      if (dateDernierNettoyage !== localISODate) {
        // 1. Reset de la jauge quotidienne
        localStorage.setItem('completedCount', '0')
        setCompletedCount(0)

        // 2. PURGE ABSOLUE : On efface les verrous initials d'hier pour forcer le recalcul à blanc
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

  // EXTRACTION SRS DYNAMIQUE
  const { session, summary } = useMemo(() => {
    return buildSession(revisionBlocks, feedback)
  }, [revisionBlocks, feedback])

  // 🎯 SAUVEGARDE STRICTE DES COMPTEURS HISTORIQUES (Brident l'écriture des zéros !)
  useEffect(() => { 
    if (mounted && appChapters > 0) {
      localStorage.setItem('app_total_chapters', appChapters.toString()) 
    }
  }, [appChapters, mounted])

  useEffect(() => { 
    if (mounted && appErrors > 0) {
      localStorage.setItem('app_total_errors', appErrors.toString()) 
    }
  }, [appErrors, mounted])

  useEffect(() => { 
    if (mounted && appTime > 0) {
      localStorage.setItem('app_total_time', appTime.toString()) 
    }
  }, [appTime, mounted])

  useEffect(() => { 
    if (mounted) {
      const tzOffset = new Date().getTimezoneOffset() * 60000
      const localISODate = new Date(Date.now() - tzOffset).toISOString().slice(0, 10)
      const lastClear = localStorage.getItem('chess-trainer:last-clear-date')
      
      if (lastClear === localISODate) {
        localStorage.setItem('completedCount', completedCount.toString())
      }
    }
  }, [completedCount, mounted])

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
    
    setCompletedCount((prev) => {
      const nextCount = prev + 1
      localStorage.setItem('completedCount', nextCount.toString())
      return nextCount
    })
    
    setChapterStartTime(Date.now())

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

    // 🛠️ COMPATIBILITÉ UNIVERSELLE DE L'IMPORTATION JSON (app/page.tsx)
    function handleImport(rawData: any) {
      if (typeof window === 'undefined') return
      const storageSource = rawData?.localStorage ? rawData.localStorage : rawData
  
      let parsedBlocks: RevisionPriorityBlock[] = []
      const repValue = storageSource["chess-trainer:repertoire"] || storageSource["revisionBlocks"]
      if (repValue) {
        if (typeof repValue === 'string') {
          try { parsedBlocks = JSON.parse(repValue) } catch (e) { console.error(e) }
        } else { parsedBlocks = repValue }
      }
  
      let parsedFeedback: FeedbackEntry[] = []
      const feedValue = storageSource["chess-trainer:feedback"] || storageSource["feedback"]
      if (feedValue) {
        if (typeof feedValue === 'string') {
          try { parsedFeedback = JSON.parse(feedValue) } catch (e) { console.error(e) }
        } else { parsedFeedback = feedValue }
      }
  
      let parsedPgn: Record<string, PgnChapter> = {}
      const pgnValue = storageSource["chess-trainer:pgn-chapters"] || storageSource["pgnChapters"]
      if (pgnValue) {
        if (typeof pgnValue === 'string') {
          try { parsedPgn = JSON.parse(pgnValue) } catch (e) { console.error(e) }
        } else { parsedPgn = pgnValue }
      }
  
      const rawTextValue = storageSource["chess-trainer:raw-revision-text"] || ""
      const rawFeedbackTextValue = storageSource["chess-trainer:raw-feedback-text"] || ""
      const rawPgnTextValue = storageSource["chess-trainer:raw-pgn-text"] || ""
  
      const importedChapters = Number(storageSource["app_total_chapters"] || parsedFeedback.length || 0)
      const importedErrors = Number(storageSource["app_total_errors"] || 0)
      const importedTime = Number(storageSource["app_total_time"] || storageSource["totalTimeInSeconds"] || 0)
      const importedStreak = Number(rawData["streak"] || storageSource["streak"] || 0)
      const savedCompleted = Number(storageSource["completedCount"] || 0)
  
      setRevisionBlocks(parsedBlocks.length > 0 ? parsedBlocks : mockRevisionBlocks)
      setFeedback(parsedFeedback)
      setPgnChapters(parsedPgn)
      setImportText({
        revision: rawTextValue,
        feedback: rawFeedbackTextValue,
        pgn: rawPgnTextValue
      })
      
      setCompletedCount(savedCompleted)
      setAppChapters(importedChapters)
      setAppErrors(importedErrors)
      setAppTime(importedTime)
  
      localStorage.setItem('chess-trainer:repertoire', JSON.stringify(parsedBlocks))
      localStorage.setItem('chess-trainer:feedback', JSON.stringify(parsedFeedback))
      localStorage.setItem('chess-trainer:pgn-chapters', JSON.stringify(parsedPgn))
      localStorage.setItem('chess-trainer:raw-revision-text', rawTextValue)
      localStorage.setItem('chess-trainer:raw-feedback-text', rawFeedbackTextValue)
      localStorage.setItem('chess-trainer:raw-pgn-text', rawPgnTextValue)
      
      localStorage.setItem('app_total_chapters', importedChapters.toString())
      localStorage.setItem('app_total_errors', importedErrors.toString())
      localStorage.setItem('app_total_time', importedTime.toString())
      localStorage.setItem('streak', importedStreak.toString())
      localStorage.setItem('completedCount', savedCompleted.toString())
  
      localStorage.removeItem('chess-trainer:initial-due-PRIORITÉ ABSOLUE')
      localStorage.removeItem('chess-trainer:initial-due-ÉLEVÉE')
      localStorage.removeItem('chess-trainer:initial-due-MOYENNE')
      localStorage.removeItem('chess-trainer:initial-due-FAIBLE')
      localStorage.removeItem('chess-trainer:initial-due-TRÈS FAIBLE')
  
      toast.success('🎉 Repertoire et 1051 feedbacks restaurés avec succès !')
    }
  
    if (!mounted) return <div className="min-h-svh bg-background flex items-center justify-center"><div className="size-8 animate-spin rounded-full border-2 border-t-primary" /></div>
  
    if (view === 'training') {
      return <TrainingView session={activeSession} pgnChapters={pgnChapters} onAddFeedback={handleAddFeedback} onExit={handleExit} />
    }
  
    const summaryList = summary || []
    const totalRestantDuJour = session.length
    const totalFaitDuJour = completedCount
    const totalInitialDuJour = totalFaitDuJour + totalRestantDuJour
  
    const cleanedSummary = summaryList.map((block) => {
      const storageKey = `chess-trainer:initial-due-${block.priority}`
      const savedInitial = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
      const totalInitialDuBloc = savedInitial !== null ? Math.max(block.dueCount, Number(savedInitial)) : block.dueCount
      const faitDansCeBloc = Math.max(0, totalInitialDuBloc - block.dueCount)
  
      return {
        ...block,
        initialDueCount: totalInitialDuBloc,
        dueCount: block.dueCount,
        forcedFait: faitDansCeBloc 
      }
    })
  
    return (
      <div className="min-h-svh bg-background pb-24">
        {activeTab === 'aujourdhui' && (
          <DashboardView 
            session={session} 
            summary={cleanedSummary}
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
  