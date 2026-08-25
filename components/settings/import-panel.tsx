'use client'

import { useEffect, useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { parseFeedbackFile, parsePgnRepertoire, parseRevisionFile, pgnChaptersToRecord } from '@/lib/parsers'
import { exportLocalStorageBackup } from '@/lib/storage'
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

  // Fonction magique pour charger directement le fichier de 400 Mo depuis le dossier public
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
      toast.success("Fichier PGN de 400 Mo chargé avec succès dans l'application !")
    } catch (error) {
      console.error(error)
      toast.error("Impossible de lire toutes_les_ouvertures.txt. Vérifiez qu'il est bien dans le dossier public.")
    } finally {
      setIsLoadingPgn(false)
    }
  }

  function handleSave() {
    if (!revisionText.trim() || !feedbackText.trim() || !pgnText.trim()) {
      toast.error('Veuillez remplir les trois zones avant de sauvegarder.');
      return;
    }

    toast.info("Initialisation de votre répertoire (calcul en cours)...");

    setTimeout(() => {
      try {
        const revisionResult = parseRevisionFile(revisionText);
        const feedbackResult = parseFeedbackFile(feedbackText);
        const pgnResult = parsePgnRepertoire(pgnText);

        if (revisionResult.data.length === 0) {
          toast.error('Aucun bloc de priorité reconnu dans "Fichier Révision".');
          return;
        }

        const pgnChapters = pgnChaptersToRecord(pgnResult.data);

        // MODIFICATION ICI : On n'envoie pas le texte brut du PGN géant dans le stockage pour éviter le crash de 5 Mo
        onImport({
          revisionBlocks: revisionResult.data,
          feedback: feedbackResult.data,
          pgnChapters,
          rawText: { revision: revisionText, feedback: feedbackText, pgn: "" }, // PGN vidé pour alléger la mémoire
        });

        toast.success('Répertoire initialisé avec succès !');
      } catch (err) {
        console.error(err);
        toast.error("Le traitement a échoué lors de l'analyse du PGN.");
      }
    }, 100);
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
        
        // Vérification que le fichier contient bien nos données
        if (!backup.localStorage) {
          toast.error("Ce fichier JSON ne contient pas une sauvegarde valide.")
          return
        }

        // On extrait et on injecte directement dans les états de la page
        const localData = backup.localStorage
        setRevisionText(localData['chess-trainer:raw-revision-text'] || '')
        setFeedbackText(localData['chess-trainer:raw-feedback-text'] || '')
        setPgnText(localData['chess-trainer:raw-pgn-text'] || '')

        toast.success("Capsule JSON décodée ! Vos 3 zones de texte ont été remplies. Cliquez maintenant sur Sauvegarder pour finaliser.")
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
        <p className="text-sm text-muted-foreground">
          Configurez votre répertoire d'ouvertures local.
        </p>
      </header>

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="revision-text">Fichier Révision</FieldLabel>
          <FieldDescription>
            Contenu de <code className="font-mono text-xs">revision.txt</code>.
          </FieldDescription>
          <Textarea
            id="revision-text"
            value={revisionText}
            onChange={(e) => setRevisionText(e.target.value)}
            placeholder={'PRIORITÉ ABSOLUE\n...'}
            className="min-h-32 bg-[#1E1E20] font-mono text-xs"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="feedback-text">Historique Feedback</FieldLabel>
          <FieldDescription>
            Contenu de <code className="font-mono text-xs">feedback.txt</code>.
          </FieldDescription>
          <Textarea
            id="feedback-text"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder={'Étude;chapitre;niveau;date;erreurs'}
            className="min-h-32 bg-[#1E1E20] font-mono text-xs"
          />
        </Field>

        <Field>
          <FieldLabel>Répertoire PGN (Gros Fichier local)</FieldLabel>
          <FieldDescription>
            Cliquez sur le bouton ci-dessous pour injecter directement le fichier <code className="font-mono text-xs">toutes_les_ouvertures.txt</code> placé dans votre dossier public.
          </FieldDescription>
          
          <Button 
            type="button"
            onClick={handleLoadLocalPgn} 
            disabled={isLoadingPgn}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
          >
            {isLoadingPgn ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Chargement des 400 Mo...
              </>
            ) : (
              <>
                <FileText className="size-4" />
                {pgnText ? "✓ PGN Chargé (Prêt)" : "Charger toutes_les_ouvertures.txt depuis le PC"}
              </>
            )}
          </Button>
          
          {pgnText && (
            <p className="text-xs text-green-500 mt-1">
              Fichier détecté en mémoire ({Math.round(pgnText.length / 1024 / 1024)} Mo). Prêt pour l'initialisation.
            </p>
          )}
        </Field>
      </FieldGroup>

      <div className="flex flex-col gap-3">
        <Button onClick={handleSave} className="h-11 w-full bg-[#E0532C] text-white hover:bg-[#E0532C]/90">
          Sauvegarder et Initialiser mon Répertoire
        </Button>
        
        <Button
          variant="outline"
          onClick={handleExport}
          className="h-11 w-full border-white/10 bg-transparent text-foreground hover:bg-white/5"
        >
          <Download className="size-4" />
          Exporter mon répertoire (.json)
        </Button>

        <label className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-transparent text-sm font-medium text-foreground hover:bg-white/5 transition-colors">
          <FileText className="size-4" />
          Importer une sauvegarde (.json)
          <input 
            type="file" 
            accept=".json" 
            onChange={handleImportJson} 
            className="hidden" 
          />
        </label>
      </div>
    </div>
  )
}

