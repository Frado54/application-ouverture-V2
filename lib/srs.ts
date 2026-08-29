import type { DueChapter, FeedbackEntry, FeedbackLevel, RevisionPriorityBlock } from './types'
import { getPieceColor } from './mock-data'

export const LEVELS: FeedbackLevel[] = ['très difficile', 'difficile', 'moyen', 'facile', 'très facile']

/** Delay in days before a chapter becomes due again, indexed like LEVELS. */
export const LEVEL_INTERVALS_DAYS = [1, 2, 4, 7, 14]

export const SESSION_MAX_CHAPTERS = 30

export function levelIndex(level: FeedbackLevel): number {
  return LEVELS.indexOf(level)
}

/**
 * Applies the error malus to a level index:
 * - >= 6 errors: demote by 2 levels
 * - >= 3 errors (and < 6): demote by 1 level
 * - clamped so it never goes below "très difficile"
 */
export function effectiveLevelIndex(level: FeedbackLevel, errors: number): number {
  let idx = levelIndex(level)
  if (errors >= 6) idx -= 2
  else if (errors >= 3) idx -= 1
  return Math.max(0, idx)
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

/** Returns the most recent feedback entry for a given study/chapter, or null. */
export function getLatestFeedback(
  feedback: FeedbackEntry[],
  study: string,
  chapter: string,
): FeedbackEntry | null {
  const entries = feedback.filter((f) => f.study === study && f.chapter === chapter)
  if (entries.length === 0) return null
  return entries.reduce((latest, current) => (parseDate(current.date) > parseDate(latest.date) ? current : latest))
}

/** Computes the next due date for a chapter given its most recent feedback (or today if none). */
export function computeDueDate(latest: FeedbackEntry | null, today: Date): Date {
  if (!latest) return startOfDay(today)
  const effIdx = effectiveLevelIndex(latest.level, latest.errors)
  const interval = LEVEL_INTERVALS_DAYS[effIdx]
  return addDays(parseDate(latest.date), interval)
}

export function isChapterDue(
  feedback: FeedbackEntry[],
  study: string,
  chapter: string,
  today: Date = new Date(),
): boolean {
  const latest = getLatestFeedback(feedback, study, chapter)
  const dueDate = computeDueDate(latest, today)
  return dueDate.getTime() <= startOfDay(today).getTime()
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export interface PriorityBlockSummary {
  priority: string
  dueCount: number
  totalCount: number
  isActive: boolean
}

/**
 * Builds the training session: only chapters from the highest-priority
 * block that still has due chapters are proposed, shuffled, capped at
 * SESSION_MAX_CHAPTERS. Also returns a per-block summary for the dashboard.
 */
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

    // On parcourt les études dans leur ordre naturel
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

    // On cumule tous les chapitres dus
    if (dueInBlock.length > 0) {
      allDueSessions = [...allDueSessions, ...dueInBlock]
    }
  }

  // 👇 LE TRIPLE TRI PARFAIT : PRIORITÉ STRICTE, PUIS OUVERTURE, PUIS CHAPITRE
  const sortedSession = [...allDueSessions].sort((a, b) => {
    // 1. Dictionnaire des poids pour gérer la casse en MAJUSCULES de ton fichier
    const poidsPriorite: Record<string, number> = {
      'PRIORITÉ ABSOLUE': 5,
      'PRIORITÉ ÉLEVÉE': 4,
      'PRIORITÉ MOYENNE': 3,
      'PRIORITÉ FAIBLE': 2,
      'PRIORITÉTRÈS FAIBLE': 1
    }

    const poidsA = poidsPriorite[a.priority] ?? 0
    const poidsB = poidsPriorite[b.priority] ?? 0

    // Si les priorités diffèrent, la plus haute passe devant
    if (poidsA !== poidsB) {
      return poidsB - poidsA
    }

    // 2. Si même priorité, on regroupe par nom d'ouverture (ex: Espagnole)
    if (a.study !== b.study) {
      return a.study.localeCompare(b.study)
    }

    // 3. Si même ouverture, tri numérique stable des sous-chapitres (1.1, 1.2, 1.10)
    const chapA = typeof a.chapter === 'string' ? a.chapter : (a.chapter as any).id || ''
    const chapB = typeof b.chapter === 'string' ? b.chapter : (b.chapter as any).id || ''
    
    return chapA.localeCompare(chapB, undefined, { numeric: true, sensitivity: 'base' })
  })

  return { session: sortedSession, summary }
}
