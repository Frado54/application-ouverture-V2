import type { FeedbackEntry, FeedbackLevel, PgnChapter, RevisionPriorityBlock, StudyBlock } from './types'

const LEVEL_ALIASES: Record<string, FeedbackLevel> = {
  'tres difficile': 'très difficile',
  'très difficile': 'très difficile',
  difficile: 'difficile',
  moyen: 'moyen',
  facile: 'facile',
  'tres facile': 'très facile',
  'très facile': 'très facile',
}

function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function stripAccentsForKey(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Matches a leading numeric chapter identifier like "1", "1.1", "1.1.1.1". */
const CHAPTER_ID_PATTERN = /^(\d+(?:\.\d+)*)/

export interface ParseIssue {
  line: number
  raw: string
  reason: string
}

export interface ParseResult<T> {
  data: T
  issues: ParseIssue[]
}

/**
 * Parses the raw content of `revision.txt`.
 *
 * Expected shape (whitespace-tolerant):
 *   PRIORITÉ ABSOLUE
 *   Défense Française (blanc)
 *   1.1 ok
 *   1.1.1 bof
 *   1.1.1.1
 *   1.2
 *   Gambit Dame Refusé (blanc)
 *   2.1
 *   2.2
 *
 *   PRIORITÉ HAUTE
 *   ...
 *
 * A line becomes:
 *  - a new priority block if it contains "PRIORIT" (accent-insensitive),
 *  - a chapter entry if it starts with a numeric id (e.g. "1.1.1"); any
 *    trailing note like "ok" / "bof" / "à revoir" is discarded — only the
 *    numeric identifier is kept,
 *  - a new study name otherwise.
 */
export function parseRevisionFile(text: string): ParseResult<RevisionPriorityBlock[]> {
  const issues: ParseIssue[] = []
  const blocks: RevisionPriorityBlock[] = []
  let currentBlock: RevisionPriorityBlock | null = null
  let currentStudy: StudyBlock | null = null

  const lines = text.split(/\r?\n/)

  lines.forEach((rawLine, i) => {
    const line = rawLine.trim()
    if (!line) return

    if (normalize(line).includes('priorit')) {
      currentBlock = { priority: line.toUpperCase(), studies: [] }
      blocks.push(currentBlock)
      currentStudy = null
      return
    }

    const chapterMatch = line.match(CHAPTER_ID_PATTERN)
    if (chapterMatch) {
      if (!currentBlock) {
        issues.push({ line: i + 1, raw: rawLine, reason: 'Chapitre trouvé avant toute ligne de priorité — ignoré.' })
        return
      }
      if (!currentStudy) {
        issues.push({ line: i + 1, raw: rawLine, reason: 'Chapitre trouvé avant tout nom d’étude — ignoré.' })
        return
      }
      currentStudy.chapters.push(chapterMatch[1])
      return
    }

    // Otherwise: a new study name.
    if (!currentBlock) {
      issues.push({ line: i + 1, raw: rawLine, reason: 'Étude trouvée avant toute ligne de priorité — ignorée.' })
      return
    }
    currentStudy = { name: line, chapters: [] }
    currentBlock.studies.push(currentStudy)
  })

  return { data: blocks, issues }
}

/**
 * Parses the raw content of `feedback.txt`.
 * One entry per line, fields separated by semicolons:
 *   étude;chapitre;niveau;date;nombre_erreurs
 * Dates are accepted as ISO (yyyy-MM-dd) or French (dd/MM/yyyy).
 */
export function parseFeedbackFile(text: string): ParseResult<FeedbackEntry[]> {
  const issues: ParseIssue[] = []
  const entries: FeedbackEntry[] = []

  const lines = text.split(/\r?\n/)

  lines.forEach((rawLine, i) => {
    const line = rawLine.trim()
    if (!line) return

    const parts = line.split(';').map((p) => p.trim())
    if (parts.length < 5) {
      issues.push({ line: i + 1, raw: rawLine, reason: 'Attendu 5 champs séparés par ";" (étude;chapitre;niveau;date;erreurs).' })
      return
    }

    const [study, chapter, levelRaw, dateRaw, errorsRaw] = parts

    if (!study || !chapter) {
      issues.push({ line: i + 1, raw: rawLine, reason: 'Étude ou chapitre manquant.' })
      return
    }

    const level = LEVEL_ALIASES[stripAccentsForKey(levelRaw)]
    if (!level) {
      issues.push({ line: i + 1, raw: rawLine, reason: `Niveau inconnu : "${levelRaw}".` })
      return
    }

    let date = dateRaw
    const frMatch = dateRaw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (frMatch) {
      const [, d, m, y] = frMatch
      date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
      issues.push({ line: i + 1, raw: rawLine, reason: `Date invalide : "${dateRaw}" (attendu aaaa-mm-jj ou jj/mm/aaaa).` })
      return
    }

    const errors = Number.parseInt(errorsRaw, 10)
    if (Number.isNaN(errors) || errors < 0) {
      issues.push({ line: i + 1, raw: rawLine, reason: `Nombre d’erreurs invalide : "${errorsRaw}".` })
      return
    }

    entries.push({ study, chapter, level, date, errors })
  })

  return { data: entries, issues }
}

function removeBalancedParens(input: string): string {
  let result = ''
  let depth = 0
  for (const ch of input) {
    if (ch === '(') {
      depth++
      continue
    }
    if (ch === ')') {
      if (depth > 0) depth--
      continue
    }
    if (depth === 0) result += ch
  }
  return result
}

const RESULT_TOKENS = new Set(['1-0', '0-1', '1/2-1/2', '*'])

function extractSanMoves(moveText: string): string[] {
  let cleaned = moveText.replace(/\{[^}]*\}/g, ' ')
  cleaned = removeBalancedParens(cleaned)
  cleaned = cleaned.replace(/\$\d+/g, ' ')
  cleaned = cleaned.replace(/\d+\.(\.\.)?/g, ' ')

  return cleaned
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !RESULT_TOKENS.has(t))
}

function getTag(tagBlock: string, name: string): string | null {
  const re = new RegExp(`\\[${name}\\s+"([^"]*)"\\]`, 'i')
  const match = tagBlock.match(re)
  return match ? match[1] : null
}

/**
 * Parses a Lichess-style PGN export containing multiple chapters.
 * Each chapter is expected to carry `[StudyName "..."]` and
 * `[ChapterName "..."]` tags (falling back to Lichess's native
 * `[Event "Study Name: Chapter Name"]` tag when those are absent).
 * The chapter's numeric identifier is read from a leading token in the
 * chapter name (e.g. "1.1.1 Steinitz" -> id "1.1.1", name "Steinitz"); if
 * the chapter name has no leading numeric id, the whole string is used as
 * the identifier so the chapter can still be linked manually later.
 */
export function parsePgnRepertoire(text: string): ParseResult<PgnChapter[]> {
  const issues: ParseIssue[] = []
  const chapters: PgnChapter[] = []

  // Découpage ultra-robuste par le mot-clé [Event (indépendant des retours à la ligne \r ou \n de Windows)
  const rawChunks = text.split(/\[Event\s+/i)

  rawChunks.forEach((rawChunk, i) => {
    let chunk = rawChunk.trim()
    if (!chunk) return

    // On remet la balise [Event qui a été sautée par le split
    chunk = '[Event ' + chunk

    const tagBlockEnd = chunk.search(/\r?\n(?!\[)/)
    const tagBlock = tagBlockEnd === -1 ? chunk : chunk.slice(0, tagBlockEnd)
    const moveText = tagBlockEnd === -1 ? '' : chunk.slice(tagBlockEnd)

    let study = getTag(tagBlock, 'StudyName')
    let chapterLabel = getTag(tagBlock, 'ChapterName')

    if (!study || !chapterLabel) {
      const event = getTag(tagBlock, 'Event')
      const colonIdx = event?.indexOf(':') ?? -1
      if (event && colonIdx !== -1) {
        study = study ?? event.slice(0, colonIdx).trim()
        chapterLabel = chapterLabel ?? event.slice(colonIdx + 1).trim()
      }
    }

    if (!study || !chapterLabel) {
      issues.push({
        line: i + 1,
        raw: chunk.slice(0, 80),
        reason: 'Impossible de déterminer l’étude et le nom du chapitre (balises [StudyName]/[ChapterName] ou [Event] manquantes).',
      })
      return
    }

    const idMatch = chapterLabel.match(CHAPTER_ID_PATTERN)
    const chapter = idMatch ? idMatch[1] : chapterLabel.trim()
    const chapterName = idMatch ? chapterLabel.slice(idMatch[0].length).replace(/^[\s\-.:]+/, '').trim() || chapterLabel : chapterLabel

    const moves = extractSanMoves(moveText)
    if (moves.length === 0) {
      issues.push({ line: i + 1, raw: chunk.slice(0, 80), reason: `Aucun coup trouvé pour le chapitre "${chapterLabel}".` })
      return
    }

    // On conserve strictement la structure originale attendue par le reste de ton app
    chapters.push({ study, chapter, chapterName, moves })
  })

  return { data: chapters, issues }
}

export function pgnChaptersToRecord(chapters: PgnChapter[]): Record<string, PgnChapter> {
  const record: Record<string, PgnChapter> = {}
  for (const chapter of chapters) {
    // Conservation stricte du double underscore indispensable pour ton application
    record[`${chapter.study}__${chapter.chapter}`] = chapter
  }
  return record
}


/** Parses several PGN documents and merges chapters (later files overwrite the same study+chapter). */
export function parseAndMergePgnFiles(texts: string[]): ParseResult<PgnChapter[]> {
  const data: PgnChapter[] = []
  const issues: ParseIssue[] = []
  texts.forEach((text, fileIndex) => {
    const result = parsePgnRepertoire(text)
    data.push(...result.data)
    for (const issue of result.issues) {
      issues.push({ ...issue, reason: `[fichier ${fileIndex + 1}] ${issue.reason}` })
    }
  })
  return { data, issues }
}
