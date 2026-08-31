'use client'

import { useEffect, useState } from 'react'
import { Download, FileText, Loader2, Upload, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { parseFeedbackFile, parsePgnRepertoire, parseRevisionFile, pgnChaptersToRecord } from '@/lib/parsers'
import { exportLocalStorageBackup, loadStoredRepertoire } from '@/lib/storage'
import type { FeedbackEntry, PgnChapter, RevisionPriorityBlock } from '@/lib/types'

interface ImportPanelProps {
  initialText: { revision: string; feedback: string; pgn: string }
  onImport: (data: {
    revisionBlocks: RevisionPriorityBlock[]
    feedback: FeedbackEntry[]
    pgnChapters: Record<string, PgnChapter>
    rawText: { revision: string; feedback: string; pgn: string }
  }) => void
}

export function ImportPanel({ initialText, onImport }: ImportPanelProps) {
  const [revisionText, setRevisionText] = useState(initialText.revision)
  const [feedbackText, setFeedbackText] = useState(initialText.feedback)
  const [pgnText, setPgnText] = useState(initialText.pgn)
  const [isLoadingPgn, setIsLoadingPgn] = useState(false)

  useEffect(() => {
    setRevisionText(initialText.revision)
    setFeedbackText(initialText.feedback)
    setPgnText(initialText.pgn)
  }, [initialText])

  async function handleLoadLocalPgn() {
    setIsLoadingPgn(true)
    toast.info("Lecture du gros fichier PGN en cours depuis le PC...")
    try {
      const response = await fetch('/toutes_les_ouvertures.txt')
      if (!response.ok) {
        throw new Error("Fichier introuvable dans le dossier public")
      }
      const text = await response.text()
      setPgnText(text)
      toast.success("Fichier PGN de 400 Mo chargé avec succès !")
      return text
    } catch (error) {
      console.error(error)
      toast.error("Impossible de lire toutes_les_ouvertures.txt.")
      return null
    } finally {
      setIsLoadingPgn(false)
    }
  }

  async function handleSave() {
    if (!revisionText.trim() || !feedbackText.trim()) {
      toast.error('Veuillez remplir au moins les zones Révision et Feedback.')
      return
    }

    let activePgnText = pgnText
    setIsLoadingPgn(true)
    toast.info("Synchronisation et calcul du répertoire en cours...")

    try {
      if (!activePgnText.trim()) {
        const fetchedText = await handleLoadLocalPgn()
        if (fetchedText) {
          activePgnText = fetchedText
        } else {
          setIsLoadingPgn(false)
          return
        }
      }

      const revisionResult = parseRevisionFile(revisionText)
      const feedbackResult = parseFeedbackFile(feedbackText)
      const pgnResult = parsePgnRepertoire(activePgnText)

      if (revisionResult.data.length === 0) {
        toast.error('Aucun bloc de priorité reconnu dans "Fichier Révision".')
        setIsLoadingPgn(false)
        return
      }
      if (pgnResult.data.length === 0) {
        toast.error('Aucun chapitre PGN reconnu. Vérifiez l\'encodage.')
        setIsLoadingPgn(false)
        return
      }

      const pgnChapters = pgnChaptersToRecord(pgnResult.data)
      const storedRepertoire = loadStoredRepertoire()
      let finalFeedback = feedbackResult.data

      if (storedRepertoire && storedRepertoire.feedback.length > 0) {
        const existingKeys = new Set(finalFeedback.map(f => `${f.study}__${f.chapter}__${f.date}`))
        for (const oldEntry of storedRepertoire.feedback) {
          const key = `${oldEntry.study}__${oldEntry.chapter}__${oldEntry.date}`
          if (!existingKeys.has(key)) {
            finalFeedback.push(oldEntry)
          }
        }
      }

      onImport({
        revisionBlocks: revisionResult.data,
        feedback: finalFeedback,
        pgnChapters,
        rawText: { revision: revisionText, feedback: feedbackText, pgn: "" },
      })

      toast.success('Répertoire initialisé et sauvegardé avec succès !')
    } catch (err) {
      console.error(err)
      toast.error("Le traitement a échoué lors de l'analyse.")
    } finally {
      setIsLoadingPgn(false)
    }
  }

  function handleExport() {
    const backup = exportLocalStorageBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const stamp = new Date().toISOString().slice(0, 10)
    anchor.href = url
    anchor.download = `repertoire-${stamp}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    toast.success('Répertoire exporté')
  }

  function handleImportJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const backup = JSON.parse(event.target?.result as string)
        if (!backup.localStorage) {
          toast.error("Ce fichier JSON ne contient pas une sauvegarde valide.")
          return
        }

        const localData = backup.localStorage
        setRevisionText(localData['chess-trainer:raw-revision-text'] || '')
        setFeedbackText(localData['chess-trainer:raw-feedback-text'] || '')
        setPgnText(localData['chess-trainer:raw-pgn-text'] || '')

        Object.keys(localData).forEach((key) => {
          localStorage.setItem(key, localData[key])
        })

        toast.success("Capsule JSON décodée et synchronisée ! Cliquez sur Sauvegarder.")
      } catch (err) {
        toast.error("Erreur lors de la lecture du fichier JSON.")
      }
    }
    reader.readAsText(file)
  }

  const handleClearRevision = () => {
    setRevisionText('')
    toast.success('Zone Révision vidée')
  }

  const handleClearFeedback = () => {
    setFeedbackText('')
    toast.success('Zone Feedback vidée')
  }

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {/* ZONE 1 : RÉVISION */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-200">Fichier Révision</span>
            {revisionText && (
              <button
                type="button"
                onClick={handleClearRevision}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition-colors p-1 rounded"
              >
                <Trash2 className="size-3.5" />
                <span>Effacer</span>
              </button>
            )}
          </div>
          <span className="text-xs text-zinc-500">
            Contenu de <code className="font-mono text-xs">revision.txt</code>.
          </span>
          <textarea
            id="revision-text"
            value={revisionText}
            onChange={(e) => setRevisionText(e.target.value)}
            placeholder={'PRIORITÉ ABSOLUE\n...'}
            className="min-h-32 bg-[#1E1E20] border border-zinc-800 rounded-lg p-3 font-mono text-xs w-full text-zinc-300 focus:outline-none focus:border-zinc-700"
          />
        </div>

        {/* ZONE 2 : FEEDBACK */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-200">Historique Feedback</span>
            {feedbackText && (
              <button
                type="button"
                onClick={handleClearFeedback}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition-colors p-1 rounded"
              >
                <Trash2 className="size-3.5" />
                <span>Effacer</span>
              </button>
            )}
          </div>
          <span className="text-xs text-zinc-500">
            Contenu de <code className="font-mono text-xs">feedback.txt</code>.
          </span>
          <textarea
            id="feedback-text"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder={'Étude;chapitre;niveau;date;erreurs'}
            className="min-h-32 bg-[#1E1E20] border border-zinc-800 rounded-lg p-3 font-mono text-xs w-full text-zinc-300 focus:outline-none focus:border-zinc-700"
          />
        </div>

        {/* ZONE 3 : CHARGEMENT PGN ET ACTIONS */}
        <div className="flex flex-col gap-1.5 mt-2">
          <span className="text-sm font-medium text-zinc-200">Répertoire PGN (Gros Fichier local)</span>
          <span className="text-xs text-zinc-500">
            Injectez le fichier <code className="font-mono text-xs">toutes_les_ouvertures.txt</code> du dossier public.
          </span>
          
          <div className="mt-4 flex flex-col items-center gap-4 w-full">
            <Button
              type="button"
              onClick={handleLoadLocalPgn}
              disabled={isLoadingPgn}
              className="w-full h-auto min-h-12 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs sm:text-sm md:text-base text-center transition-colors whitespace-normal break-words shadow-md"
            >
              {isLoadingPgn ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Traitement des 400 Mo...
                </span>
              ) : (
                "Charger toutes_les_ouvertures.txt depuis le dossier public"
              )}
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              disabled={isLoadingPgn}
              className="w-full h-auto min-h-12 py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs sm:text-sm md:text-base text-center transition-colors whitespace-normal shadow-md"
            >
              Sauvegarder et Initialiser mon Répertoire
            </Button>

