import type { DueChapter, FeedbackEntry, FeedbackLevel, RevisionPriorityBlock, PriorityBlockSummary } from './types'
import { getPieceColor } from './mock-data'

export const LEVELS: FeedbackLevel[] = ['très difficile', 'difficile', 'moyen', 'facile', 'très facile']

/** Intervalles de départ en jours pour la toute première révision */
export const FIRST_REVISION_DAYS = [1, 2, 4, 7, 14]

export const SESSION_MAX_CHAPTERS = 30

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

  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const latestIndex = sortedEntries.length - 1
  const latest = sortedEntries[latestIndex]

  if (sortedEntries.length === 1) {
    const idx = levelIndex(latest.level)
    const initialDays = FIRST_REVISION_DAYS[idx !== -1 ? idx : 2]
    return addDays(parseDate(latest.date), initialDays)
  }

  const previous = sortedEntries[latestIndex - 1]
  const diffTime = Math.abs(parseDate(latest.date).getTime() - parseDate(previous.date).getTime())
  const lastAppliedInterval = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

  let intervalFactor = 1.2
  
  switch (latest.level) {
    case 'très facile':
      intervalFactor = 2.5
      break
    case 'facile':
      intervalFactor = 1.8
      break
    case 'moyen':
      intervalFactor = 1.1
      break
    case 'difficile':
      intervalFactor = 0.5
      break
    case 'très difficile':
      intervalFactor = 0.1
      break
  }

  let nextInterval = Math.round(lastAppliedInterval * intervalFactor)

  if (nextInterval < 1 || lastAppliedInterval <= 1) {
    if (latest.level === 'très facile') nextInterval = 4
    else if (latest.level === 'facile') nextInterval = 2
    else if (latest.level === 'moyen') nextInterval = 1
    else nextInterval = 1
  }

  const finalInterval = Math.min(nextInterval, 180)
  return addDays(parseDate(latest.date), finalInterval)
}

export function isChapterDue(
  allFeedback: FeedbackEntry[],
  study: string,
  chapter: string,
  today: Date = new Date(),
): boolean {
  const entries = allFeedback.filter((f) => {
    const memeChapitre = f.chapter === chapter
    if (!memeChapitre) return false

    const nomPgn = study.toLowerCase().trim()
    const nomFeedback = f.study.toLowerCase().trim()

    return (
      nomPgn === nomFeedback ||
      (nomPgn === "sicilienne najdorf (blanc)" && nomFeedback === "najdorf (blanc)") ||
      (nomPgn === "sicilienne najdorf (noir)" && nomFeedback === "najdorf (noir)") ||
      (nomPgn === "sicilienne fermée (noir)" && nomFeedback === "sicilienne fermée") ||
      (nomPgn === "sicilienne dragon hyper-accéléré (blanc)" && nomFeedback === "dragon hyper-accéléré (blanc)")
    )
  })

  if (entries.length === 0) return true

  const dueDate = computeDueDate(entries, today)
  return startOfDay(dueDate).getTime() <= startOfDay(today).getTime()
}

export function simulateNextIntervalStr(entries: FeedbackEntry[], level: FeedbackLevel): string {
  if (entries.length === 0) {
    const idx = LEVELS.indexOf(level)
    const days = FIRST_REVISION_DAYS[idx !== -1 ? idx : 2]
    return `+${days}j`
  }

  const sortedEntries = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const latestIndex = sortedEntries.length - 1
  const latest = sortedEntries[latestIndex]
  let lastAppliedInterval = 1

  if (sortedEntries.length > 1) {
    const previous = sortedEntries[latestIndex - 1]
    const diffTime = Math.abs(parseDate(latest.date).getTime() - parseDate(previous.date).getTime())
    lastAppliedInterval = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  } else {
    const idx = LEVELS.indexOf(latest.level)
    lastAppliedInterval = FIRST_REVISION_DAYS[idx !== -1 ? idx : 2]
  }

  let intervalFactor = 1.2
  switch (level) {
    case 'très facile': intervalFactor = 2.5; break
    case 'facile':      intervalFactor = 1.8; break
    case 'moyen':       intervalFactor = 1.1; break
    case 'difficile':   intervalFactor = 0.5; break
    case 'très difficile': intervalFactor = 0.1; break
  }

  let nextInterval = Math.round(lastAppliedInterval * intervalFactor)
  
  if (nextInterval < 1 || lastAppliedInterval <= 1) {
    if (level === 'très facile') nextInterval = 4
    else if (level === 'facile') nextInterval = 2
    else nextInterval = 1
  }

  const finalInterval = Math.min(nextInterval, 180)

  if (finalInterval >= 30) {
    const mois = Math.round((finalInterval / 30) * 10) / 10
    return `+${mois} mois`
  }
  return `+${finalInterval}j`
}

// 🎯 TEST À BLANC : On triche en disant à la machine qu'on est demain (+1 jour)
export function buildSession(
  blocks: RevisionPriorityBlock[],
  feedback: FeedbackEntry[],
  today: Date = new Date(Date.now() + 24 * 60 * 60 * 1000), 
) { session: DueChapter[]; summary: PriorityBlockSummary[] } {
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

    // 🛠️ VERROUILLAGE UNIQUE DU SCORE DE DÉBUT DE JOURNÉE
    let initialDue = dueInBlock.length
    if (typeof window !== 'undefined') {
      const storageKey = `chess-trainer:initial-due-${block.priority}`
      const savedInitial = localStorage.getItem(storageKey)
      
      if (savedInitial !== null) {
        const numSaved = Number(savedInitial)
        initialDue = Math.max(dueInBlock.length, numSaved)
        if (dueInBlock.length > numSaved) {
          localStorage.setItem(storageKey, dueInBlock.length.toString())
        }
      } else if (dueInBlock.length > 0) {
        localStorage.setItem(storageKey, dueInBlock.length.toString())
      }
    }

    const isActive = dueInBlock.length > 0
    summary.push({ 
      priority: block.priority, 
      dueCount: dueInBlock.length, 
      totalCount, 
      initialDueCount: initialDue, 
      isActive 
    })

    if (dueInBlock.length > 0) {
      allDueSessions = [...allDueSessions, ...dueInBlock]
    }
  }

        // 🛠️ ALIGNEMENT TUNNEL ÉTANCHE ET GROUPEMENT ALPHABÉTIQUE INTERNE (lib/srs.ts)
  const sortedSession = [...allDueSessions].sort((a, b) => {
    const getPoids = (priorityString: string): number => {
      const p = priorityString
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")

      if (p.includes('ABSOLUE')) return 5
      if (p.includes('ELEVEE')) return 4
      if (p.includes('MOYENNE')) return 3
      if (p.includes('TRES FAIBLE')) return 1
      if (p.includes('FAIBLE')) return 2
      return 0
    }

    const poidsA = getPoids(a.priority)
    const poidsB = getPoids(b.priority)

    // 🎯 RÈGLE N°1 ABSOLUE : Si les poids sont différents, on respecte le tunnel des priorités.
    // Un poids de 2 passera TOUJOURS avant un poids de 1, peu importe le nom de l'ouverture.
    if (poidsA !== poidsB) {
      return poidsB - poidsA
    }

    // 🎯 RÈGLE N°2 (UNIQUEMENT SI MÊME POIDS) : Groupement alphabétique par Ouverture
    // Toutes tes lignes d'une même étude se suivent (ex: toutes tes Najdorf d'affilée)
    if (a.study !== b.study) {
      return a.study.localeCompare(b.study)
    }

    // 🎯 RÈGLE N°3 (SI MÊME POIDS ET MÊME OUVERTURE) : Ordre numérique des chapitres (ex: 1.1, 1.2)
    const chapA = typeof a.chapter === 'string' ? a.chapter : (a.chapter as any).id || ''
    const chapB = typeof b.chapter === 'string' ? b.chapter : (b.chapter as any).id || ''
    
    return chapA.localeCompare(chapB, undefined, { numeric: true, sensitivity: 'base' })
  })

  // 4. Récupération de la limite max de la session
  let maxChapters = 30
  if (typeof window !== 'undefined') {
    const savedMax = localStorage.getItem('chess-trainer:session-max')
    if (savedMax !== null) {
      maxChapters = Number(savedMax)
    }
  }

  // 5. Découpage final envoyé à l'échiquier
  const finalSession = maxChapters > 0 
    ? sortedSession.slice(0, maxChapters) 
    : sortedSession

  return { session: finalSession, summary }
}

