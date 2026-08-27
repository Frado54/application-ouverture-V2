'use client'

import { useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { parseFeedbackFile, parseRevisionFile } from '@/lib/parsers'
import { exportLocalStorageBackup, loadStoredRepertoire } from '@/lib/storage'
import type { FeedbackEntry, RevisionPriorityBlock } from '@/lib/types'

interface ImportPanelProps {
  initialText: { revision: string; feedback: string; pgn: string }
  onImport: (data: {
    revisionBlocks: RevisionPriorityBlock[]
    feedback: FeedbackEntry[]
    pgnChapters: Record<string, any>
    rawText: { revision: string; feedback: string; pgn: string }
  }) => void
}

export function ImportPanel({ initialText, onImport }: ImportPanelProps) {
  const [revisionText, setRevisionText] = useState(initialText.revision)
  const [feedbackText, setFeedbackText] = useState(initialText.feedback)

  useEffect(() => {
    setRevisionText(initialText.revision)
    setFeedbackText(initialText.feedback)
  }, [initialText])

  function handleSave() {
    if (!revisionText.trim() || !feedbackText.trim()) {
      toast.error('Veuillez remplir les zones Révision et Feedback.')
      return
    }

    try {
      const revisionResult = parseRevisionFile(revisionText)
      const feedbackResult = parseFeedbackFile(feedbackText)

      if (revisionResult.data.length === 0) {
        toast.error('Aucun bloc de priorité reconnu dans "Fichier Révision".')
        return
      }

      // FUSION DE L'HISTORIQUE PRESERVÉ
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

      // ON VALIDE DIRECTEMENT : On dit à l'application que les textes sont parfaits.
      // Le gros fichier PGN sera lu à la volée pendant le jeu sans passer par ici.
      onImport({
        revisionBlocks: revisionResult.data,
        feedback: finalFeedback,
        pgnChapters: {}, // Volontairement vide pour contourner le bug des téléphones
        rawText: { revision: revisionText, feedback: feedbackText, pgn: "" },
      })

      toast.success('Répertoire synchronisé avec succès !')
    } catch (err) {
      console.error(err)
      toast.error("Erreur lors de la sauvegarde.")
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

        toast.success("Sauvegarde JSON lue ! Cliquez sur le bouton orange pour valider.")
      } catch (err) {
        toast.error("Erreur lors de la lecture du fichier JSON.")
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-8 pb-24">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-[#E0532C]">Données</p>
        <h1 className="font-serif text-2xl font-semibold text-foreground">Réglages</h1>
        <p className="text-sm text-muted-foreground">Configurez votre répertoire d'ouvertures.</p>
      </header>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="revision-text">Fichier Révision</FieldLabel>
          <Textarea
            id="revision-text"
            value={revisionText}
            onChange={(e) => setRevisionText(e.target.value)}
            className="min-h-32 bg-[#1E1E20] font-mono text-xs"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="feedback-text">Historique Feedback</FieldLabel>
          <Textarea
            id="feedback-text"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="min-h-32 bg-[#1E1E20] font-mono text-xs"
          />
        </Field>
      </FieldGroup>

      <div className="flex flex-col gap-3">
        <Button onClick={handleSave} className="h-11 w-full bg-[#E0532C] text-white hover:bg-[#E0532C]/90">
          Sauvegarder et Initialiser mon Répertoire
        </Button>
        
        <Button variant="outline" onClick={handleExport} className="h-11 w-full border-white/10 bg-transparent text-foreground hover:bg-white/5">
          <Download className="size-4" /> Exporter mon répertoire (.json)
        </Button>

        <label className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-transparent text-sm font-medium text-foreground hover:bg-white/5 transition-colors">
          <FileText className="size-4" /> Importer une sauvegarde (.json)
          <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
        </label>
      </div>
    </div>
  )
}
