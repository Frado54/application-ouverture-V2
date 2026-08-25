export type FeedbackLevel = 'très difficile' | 'difficile' | 'moyen' | 'facile' | 'très facile'

export type PieceColor = 'white' | 'black'

export interface StudyBlock {
  /** Name of the study, e.g. "Défense Française (blanc)" */
  name: string
  /** Chapter identifiers belonging to this study, e.g. ["1.1", "1.1.1"] */
  chapters: string[]
}

export interface RevisionPriorityBlock {
  /** Priority label as it appears in revision.txt, e.g. "PRIORITÉ ABSOLUE" */
  priority: string
  studies: StudyBlock[]
}

export interface FeedbackEntry {
  study: string
  chapter: string
  level: FeedbackLevel
  /** ISO date string (yyyy-MM-dd) */
  date: string
  errors: number
}

export interface PgnChapter {
  study: string
  chapter: string
  chapterName: string
  /** SAN move list, ply by ply, starting at move 1 */
  moves: string[]
}

export interface DueChapter {
  study: string
  chapter: string
  priority: string
  color: PieceColor
}

export interface ResolvedMove {
  san: string
  from: string
  to: string
  promotion?: string
  color: PieceColor
}
