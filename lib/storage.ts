import { parseFeedbackFile, parsePgnRepertoire, parseRevisionFile, pgnChaptersToRecord } from './parsers'
import type { FeedbackEntry, PgnChapter, RevisionPriorityBlock } from './types'

const KEYS = {
  revisionBlocks: 'chess-trainer:revision-blocks',
  feedback: 'chess-trainer:feedback',
  pgnChapters: 'chess-trainer:pgn-chapters',
  // Raw source text, kept so the settings panel can be reopened pre-filled
  // with exactly what the user pasted last time.
  rawRevisionText: 'chess-trainer:raw-revision-text',
  rawFeedbackText: 'chess-trainer:raw-feedback-text',
  rawPgnText: 'chess-trainer:raw-pgn-text',
} as const

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded (often the concatenated PGN). Parsed data is stored separately.
  }
}

export function loadStoredRepertoire(): {
  revisionBlocks: RevisionPriorityBlock[]
  feedback: FeedbackEntry[]
  pgnChapters: Record<string, PgnChapter>
} | null {
  const revisionBlocks = readJson<RevisionPriorityBlock[]>(KEYS.revisionBlocks)
  const feedback = readJson<FeedbackEntry[]>(KEYS.feedback)
  const pgnChapters = readJson<Record<string, PgnChapter>>(KEYS.pgnChapters)

  if (!revisionBlocks || !feedback || !pgnChapters) return null
  return { revisionBlocks, feedback, pgnChapters }
}

export function saveRepertoire(data: {
  revisionBlocks: RevisionPriorityBlock[]
  feedback: FeedbackEntry[]
  pgnChapters: Record<string, PgnChapter>
}): void {
  writeJson(KEYS.revisionBlocks, data.revisionBlocks)
  writeJson(KEYS.feedback, data.feedback)
  writeJson(KEYS.pgnChapters, data.pgnChapters)
}

export function saveFeedback(feedback: FeedbackEntry[]): void {
  writeJson(KEYS.feedback, feedback)
}

export function loadRawImportText(): { revision: string; feedback: string; pgn: string } {
  return {
    revision: readJson<string>(KEYS.rawRevisionText) ?? '',
    feedback: readJson<string>(KEYS.rawFeedbackText) ?? '',
    pgn: readJson<string>(KEYS.rawPgnText) ?? '',
  }
}

export function saveRawImportText(data: { revision: string; feedback: string; pgn: string }): void {
  writeJson(KEYS.rawRevisionText, data.revision)
  writeJson(KEYS.rawFeedbackText, data.feedback)
  writeJson(KEYS.rawPgnText, data.pgn)
}

export type RepertoireBackup = {
  exportedAt: string
  revision: string
  feedback: string
  pgn: string
  repertoire: {
    revisionBlocks: RevisionPriorityBlock[]
    feedback: FeedbackEntry[]
    pgnChapters: Record<string, PgnChapter>
  } | null
  localStorage: Record<string, string | null>
}

export type RestoredRepertoire = {
  revisionBlocks: RevisionPriorityBlock[]
  feedback: FeedbackEntry[]
  pgnChapters: Record<string, PgnChapter>
  rawText: { revision: string; feedback: string; pgn: string }
}

/** Snapshot of revision / feedback / PGN stored in localStorage, for JSON export. */
export function exportLocalStorageBackup(): RepertoireBackup {
  const raw = loadRawImportText()
  const dump: Record<string, string | null> = {}
  if (typeof window !== 'undefined') {
    for (const key of Object.values(KEYS)) {
      dump[key] = window.localStorage.getItem(key)
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    revision: raw.revision,
    feedback: raw.feedback,
    pgn: raw.pgn,
    repertoire: loadStoredRepertoire(),
    localStorage: dump,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function restoreDump(dump: Record<string, string | null>): void {
  if (typeof window === 'undefined') return
  for (const [key, value] of Object.entries(dump)) {
    if (!key.startsWith('chess-trainer:')) continue
    if (value == null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  }
}

/**
 * Reloads a JSON backup produced by `exportLocalStorageBackup`.
 * Accepts the dump of localStorage keys, a parsed `repertoire` object,
 * or the raw revision / feedback / pgn strings.
 */
export function restoreBackupPayload(payload: unknown): RestoredRepertoire {
  if (!isRecord(payload)) {
    throw new Error('Fichier JSON invalide.')
  }

  if (isRecord(payload.localStorage)) {
    restoreDump(payload.localStorage as Record<string, string | null>)
    const stored = loadStoredRepertoire()
    if (stored) {
      return { ...stored, rawText: loadRawImportText() }
    }
  }

  const repertoire = payload.repertoire
  if (isRecord(repertoire) && Array.isArray(repertoire.revisionBlocks) && Array.isArray(repertoire.feedback) && isRecord(repertoire.pgnChapters)) {
    const rawText = {
      revision: typeof payload.revision === 'string' ? payload.revision : '',
      feedback: typeof payload.feedback === 'string' ? payload.feedback : '',
      pgn: typeof payload.pgn === 'string' ? payload.pgn : '',
    }
    return {
      revisionBlocks: repertoire.revisionBlocks as RevisionPriorityBlock[],
      feedback: repertoire.feedback as FeedbackEntry[],
      pgnChapters: repertoire.pgnChapters as Record<string, PgnChapter>,
      rawText,
    }
  }

  const revision = typeof payload.revision === 'string' ? payload.revision : ''
  const feedback = typeof payload.feedback === 'string' ? payload.feedback : ''
  const pgn = typeof payload.pgn === 'string' ? payload.pgn : ''

  if (!revision.trim() && !pgn.trim()) {
    throw new Error('Aucune donnée de répertoire dans ce fichier.')
  }

  const revisionResult = parseRevisionFile(revision)
  const feedbackResult = parseFeedbackFile(feedback)
  const pgnResult = parsePgnRepertoire(pgn)

  return {
    revisionBlocks: revisionResult.data,
    feedback: feedbackResult.data,
    pgnChapters: pgnChaptersToRecord(pgnResult.data),
    rawText: { revision, feedback, pgn },
  }
}
