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
  // Calcul du nouvel intervalle basé sur le précédent
  let nextInterval = Math.round(lastAppliedInterval * intervalFactor)

  // 🛠️ LA SÉCURITÉ ANTI-RETOUR :
  // Si on vient de réviser la carte aujourd'hui (lastAppliedInterval === 0 ou 1) :
  // On force des planchers stricts selon ton bouton pour chasser la carte au moins à demain ou plus tard !
  if (nextInterval < 1) {
    if (latest.level === 'très facile') nextInterval = 4; // Éloigné à 4 jours minimum
    else if (latest.level === 'facile') nextInterval = 2; // Éloigné à 2 jours minimum
    else if (latest.level === 'moyen') nextInterval = 1;  // À demain minimum
    else nextInterval = 1; // Difficile / Très difficile revient à demain
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
      'PRIORITÉ ÉLEVÉE': 4,
      'PRIORITÉ MOYENNE': 3,
      'PRIORITÉ FAIBLE': 2,
      'PRIORITÉ TRÈS FAIBLE': 1
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
/**
 * Simule le prochain intervalle et renvoie le nombre de jours ou de mois
 * pour un bouton de feedback spécifique avant qu'il ne soit cliqué.
 */
export function simulateNextIntervalStr(entries: FeedbackEntry[], level: FeedbackLevel): string {
  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const latestIndex = sortedEntries.length - 1

  // Cas 1 : Si la carte est toute neuve (première révision)
  if (sortedEntries.length === 0) {
    const idx = LEVELS.indexOf(level)
    const days = FIRST_REVISION_DAYS[idx !== -1 ? idx : 2]
    return `+${days}j`
  }

  // Cas 2 : Plusieurs révisions (On récupère l'ancien écart exact)
  const latest = sortedEntries[latestIndex]
  let lastAppliedInterval = 1

  if (sortedEntries.length > 1) {
    const previous = sortedEntries[latestIndex - 1]
    const diffTime = Math.abs(parseDate(latest.date).getTime() - parseDate(previous.date).getTime())
    lastAppliedInterval = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  } else {
    // Si une seule révision, l'intervalle précédent était l'intervalle initial
    const idx = LEVELS.indexOf(latest.level)
    lastAppliedInterval = FIRST_REVISION_DAYS[idx !== -1 ? idx : 2]
  }

  // Application du multiplicateur théorique du bouton simulé
  let intervalFactor = 1.2
  switch (level) {
    case 'très facile': intervalFactor = 2.5; break
    case 'facile':      intervalFactor = 1.8; break
    case 'moyen':       intervalFactor = 1.1; break
    case 'difficile':   intervalFactor = 0.5; break
    case 'très difficile': intervalFactor = 0.1; break
  }

  let nextInterval = Math.round(lastAppliedInterval * intervalFactor)
  if (nextInterval < 1) nextInterval = 1
  const finalInterval = Math.min(nextInterval, 180) // Plafonné à 6 mois

  // Formatage lisible du texte de prédiction
  if (finalInterval >= 30) {
    const mois = Math.round((finalInterval / 30) * 10) / 10
    return `+${mois} mois`
  }
  return `+${finalInterval}j`
}

