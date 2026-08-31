import type { DueChapter, FeedbackEntry, FeedbackLevel, RevisionPriorityBlock } from './types'
import { getPieceColor } from './mock-data'

export const LEVELS: FeedbackLevel[] = ['très difficile', 'difficile', 'moyen', 'facile', 'très facile']

// Intervalles de départ en jours si c'est la toute première fois qu'on voit la carte
export const FIRST_REVISION_DAYS = [1, 2, 4, 7, 14]

export function levelIndex(level: FeedbackLevel): number {
  return LEVELS.indexOf(level)
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * ALGORITHME ANKI AMORTI : Calcule l'allongement de l'intervalle sans reset brutal
 */
export function computeDueDate(entries: FeedbackEntry[], today: Date): Date {
  if (entries.length === 0) return startOfDay(today)

  // 1. Tri chronologique de l'historique
  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const latestIndex = sortedEntries.length - 1
  const latest = sortedEntries[latestIndex]

  // 2. Si c'est la toute première révision, on prend l'intervalle de base fixe
  if (sortedEntries.length === 1) {
    const idx = levelIndex(latest.level)
    const initialDays = FIRST_REVISION_DAYS[idx !== -1 ? idx : 2]
    return addDays(parseDate(latest.date), initialDays)
  }

  // 3. SI HISTORIQUE EXISTANT : On calcule l'écart réel appliqué lors de l'avant-dernière révision
  const previous = sortedEntries[latestIndex - 1]
  const diffTime = Math.abs(parseDate(latest.date).getTime() - parseDate(previous.date).getTime())
  const lastAppliedInterval = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

  // 4. On détermine le multiplicateur d'amorti basé UNIQUEMENT sur ton bouton de feedback
  let intervalFactor = 1.2 // Valeur par défaut pour 'moyen'
  
  switch (latest.level) {
    case 'très facile':
      intervalFactor = 2.5 // Grand saut
      break
    case 'facile':
      intervalFactor = 1.8 // Saut normal
      break
    case 'moyen':
      intervalFactor = 1.1 // On ne redescend pas, on stabilise et augmente très légèrement
      break
    case 'difficile':
      intervalFactor = 0.5 // On réduit l'écart de moitié pour réviser plus tôt
      break
    case 'très difficile':
      intervalFactor = 0.1 // Oubli total, retour proche de zéro
      break
  }

  // 5. Calcul du nouvel intervalle basé sur le précédent
  let nextInterval = Math.round(lastAppliedInterval * intervalFactor)

  // Sécurité pour éviter les blocages (minimum 1 jour)
  if (nextInterval < 1) nextInterval = 1

  // Plafond maximum Anki (6 mois) pour ne pas perdre définitivement une ligne de vue
  const finalInterval = Math.min(nextInterval, 180)

  return addDays(parseDate(latest.date), finalInterval)
}

export function isChapterDue(
  allFeedback: FeedbackEntry[],
  study: string,
  chapter: string,
  today: Date = new Date(),
): boolean {
  // 🛠️ LE TRADUCTEUR SUPRÊME : Il récupère l'historique, peu importe le nom utilisé
  const entries = allFeedback.filter((f) => {
    // Égalité du chapitre
    const memeChapitre = f.chapter === chapter;
    if (!memeChapitre) return false;

    // Correspondance intelligente et étanche (évite les inversions Blanc/Noir)
    const nomPgn = study.toLowerCase().trim();         // ex: "sicilienne najdorf (blanc)"
    const nomFeedback = f.study.toLowerCase().trim();   // ex: "najdorf (blanc)"

    const estMemeEtude = (
      nomPgn === nomFeedback ||
      (nomPgn === "sicilienne najdorf (blanc)" && nomFeedback === "najdorf (blanc)") ||
      (nomPgn === "sicilienne najdorf (noir)" && nomFeedback === "najdorf (noir)") ||
      (nomPgn === "sicilienne fermée (noir)" && nomFeedback === "sicilienne fermée") ||
      (nomPgn === "sicilienne dragon hyper-accéléré (blanc)" && nomFeedback === "dragon hyper-accéléré (blanc)")
    );

    return estMemeEtude;
  });

  if (entries.length === 0) return true

  const dueDate = computeDueDate(entries, today)
  return dueDate.getTime() <= startOfDay(today).getTime()
}


export interface PriorityBlockSummary {
  priority: string
  dueCount: number
  totalCount: number
  isActive: boolean
}

export function buildSession(
  blocks: RevisionPriorityBlock[],
  feedback: FeedbackEntry[],
  today: Date = new Date(),
): { session: DueChapter[]; summary: PriorityBlockSummary[] } {
  const summary: PriorityBlockSummary[] = []
  let allDueSessions: DueChapter[] = []

  for (const block of blocks) {
    const dueInBlock: DueChapter[] = []
    let totalCount = 0

    for (const study of block.studies) {
      for (const chapter of study.chapters) {
        totalCount++
        if (isChapterDue(feedback, study.name, chapter, today)) {
          dueInBlock.push({
            study: study.name,
            chapter,
            priority: block.priority,
            color: getPieceColor(study.name),
          })
        }
      }
    }

    const isActive = dueInBlock.length > 0
    summary.push({ priority: block.priority, dueCount: dueInBlock.length, totalCount, isActive })

    if (dueInBlock.length > 0) {
      allDueSessions = [...allDueSessions, ...dueInBlock]
    }
  }

  // TRIPLE TRI DE STABILITÉ : PRIORITÉ, OUVERTURE, NUMÉRO
  const sortedSession = [...allDueSessions].sort((a, b) => {
    const poidsPriorite: Record<string, number> = {
      'PRIORITÉ ABSOLUE': 5,
      'ÉLEVÉE': 4,
      'MOYENNE': 3,
      'FAIBLE': 2,
      'TRÈS FAIBLE': 1
    }

    const poidsA = poidsPriorite[a.priority] ?? 0
    const poidsB = poidsPriorite[b.priority] ?? 0

    if (poidsA !== poidsB) return poidsB - poidsA
    if (a.study !== b.study) return a.study.localeCompare(b.study)

    const chapA = typeof a.chapter === 'string' ? a.chapter : (a.chapter as any).id || ''
    const chapB = typeof b.chapter === 'string' ? b.chapter : (b.chapter as any).id || ''
    
    return chapA.localeCompare(chapB, undefined, { numeric: true, sensitivity: 'base' })
  })

  return { session: sortedSession, summary }
}
