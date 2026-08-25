import type { FeedbackEntry, PgnChapter, RevisionPriorityBlock } from './types'

/**
 * Simulates the parsed content of `revision.txt`.
 * Priority blocks are strictly ordered — the app must never propose a
 * chapter from a lower priority block while a due chapter exists above it.
 */
export const revisionBlocks: RevisionPriorityBlock[] = [
  {
    priority: 'PRIORITÉ ABSOLUE',
    studies: [
      {
        name: 'Défense Française (blanc)',
        chapters: ['1.1', '1.1.1', '1.1.1.1', '1.2'],
      },
      {
        name: 'Gambit Dame Refusé (blanc)',
        chapters: ['2.1', '2.2'],
      },
    ],
  },
  {
    priority: 'PRIORITÉ HAUTE',
    studies: [
      {
        name: 'Défense Sicilienne (noir)',
        chapters: ['1.1', '1.1.1'],
      },
      {
        name: 'Défense Est-Indienne (noir)',
        chapters: ['1.1', '1.2'],
      },
    ],
  },
  {
    priority: 'PRIORITÉ MOYENNE',
    studies: [
      {
        name: 'Anglaise (blanc)',
        chapters: ['1.1'],
      },
      {
        name: 'Caro-Kann (noir)',
        chapters: ['1.1', '1.2'],
      },
    ],
  },
  {
    priority: 'PRIORITÉ FAIBLE',
    studies: [
      {
        name: 'Ruy Lopez (blanc)',
        chapters: ['1.1'],
      },
    ],
  },
]

/**
 * Simulates the parsed content of `feedback.txt`.
 * Format: étude;chapitre;niveau;date;nombre_erreurs
 * Dates are generated relative to "today" so the app always has a
 * believable mix of due / not-due chapters, regardless of when it's opened.
 */
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export const feedbackHistory: FeedbackEntry[] = [
  // Défense Française (blanc) — mixed history, some overdue, some fresh
  { study: 'Défense Française (blanc)', chapter: '1.1', level: 'facile', date: daysAgo(20), errors: 0 },
  { study: 'Défense Française (blanc)', chapter: '1.1.1', level: 'moyen', date: daysAgo(3), errors: 1 },
  { study: 'Défense Française (blanc)', chapter: '1.1.1.1', level: 'très difficile', date: daysAgo(1), errors: 4 },
  // 1.2 has no feedback yet — due today by default

  // Gambit Dame Refusé (blanc)
  { study: 'Gambit Dame Refusé (blanc)', chapter: '2.1', level: 'très facile', date: daysAgo(2), errors: 0 },
  { study: 'Gambit Dame Refusé (blanc)', chapter: '2.2', level: 'difficile', date: daysAgo(10), errors: 7 },

  // Défense Sicilienne (noir)
  { study: 'Défense Sicilienne (noir)', chapter: '1.1', level: 'facile', date: daysAgo(9), errors: 2 },
  { study: 'Défense Sicilienne (noir)', chapter: '1.1.1', level: 'très facile', date: daysAgo(1), errors: 0 },

  // Défense Est-Indienne (noir)
  { study: 'Défense Est-Indienne (noir)', chapter: '1.1', level: 'moyen', date: daysAgo(30), errors: 0 },
  // 1.2 has no feedback yet — due today by default

  // Anglaise (blanc)
  { study: 'Anglaise (blanc)', chapter: '1.1', level: 'très facile', date: daysAgo(3), errors: 0 },

  // Caro-Kann (noir)
  { study: 'Caro-Kann (noir)', chapter: '1.1', level: 'facile', date: daysAgo(2), errors: 1 },
  { study: 'Caro-Kann (noir)', chapter: '1.2', level: 'très facile', date: daysAgo(1), errors: 0 },

  // Ruy Lopez (blanc)
  { study: 'Ruy Lopez (blanc)', chapter: '1.1', level: 'très facile', date: daysAgo(1), errors: 0 },
]

/**
 * Simulates independent Lichess study PGN files — one per chapter/branch.
 * Keyed by `${study}__${chapter}`.
 */
export const pgnChapters: Record<string, PgnChapter> = {
  'Défense Française (blanc)__1.1': {
    study: 'Défense Française (blanc)',
    chapter: '1.1',
    chapterName: 'Avance principale 3.Nc3',
    moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'e5', 'Nfd7'],
  },
  'Défense Française (blanc)__1.1.1': {
    study: 'Défense Française (blanc)',
    chapter: '1.1.1',
    chapterName: 'Variante Steinitz',
    moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e5', 'Nfd7'],
  },
  'Défense Française (blanc)__1.1.1.1': {
    study: 'Défense Française (blanc)',
    chapter: '1.1.1.1',
    chapterName: 'Steinitz, 7.Bxe7',
    moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6', 'Bg5', 'Be7', 'e5', 'Nfd7', 'Bxe7', 'Qxe7'],
  },
  'Défense Française (blanc)__1.2': {
    study: 'Défense Française (blanc)',
    chapter: '1.2',
    chapterName: 'Variante Tarrasch',
    moves: ['e4', 'e6', 'd4', 'd5', 'Nd2', 'Nf6', 'e5', 'Nfd7', 'Bd3', 'c5'],
  },
  'Gambit Dame Refusé (blanc)__2.1': {
    study: 'Gambit Dame Refusé (blanc)',
    chapter: '2.1',
    chapterName: 'Ligne principale 4.Nc3',
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7'],
  },
  'Gambit Dame Refusé (blanc)__2.2': {
    study: 'Gambit Dame Refusé (blanc)',
    chapter: '2.2',
    chapterName: 'Attaque échangée',
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'cxd5', 'exd5'],
  },
  'Défense Sicilienne (noir)__1.1': {
    study: 'Défense Sicilienne (noir)',
    chapter: '1.1',
    chapterName: 'Ouverte, Najdorf',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
  },
  'Défense Sicilienne (noir)__1.1.1': {
    study: 'Défense Sicilienne (noir)',
    chapter: '1.1.1',
    chapterName: 'Najdorf, 6.Be2',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be2', 'e5'],
  },
  'Défense Est-Indienne (noir)__1.1': {
    study: 'Défense Est-Indienne (noir)',
    chapter: '1.1',
    chapterName: 'Système classique',
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'],
  },
  'Défense Est-Indienne (noir)__1.2': {
    study: 'Défense Est-Indienne (noir)',
    chapter: '1.2',
    chapterName: 'Attaque des quatre pions',
    moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'f4', 'O-O'],
  },
  'Anglaise (blanc)__1.1': {
    study: 'Anglaise (blanc)',
    chapter: '1.1',
    chapterName: 'Système symétrique',
    moves: ['c4', 'c5', 'Nf3', 'Nf6', 'g3', 'b6'],
  },
  'Caro-Kann (noir)__1.1': {
    study: 'Caro-Kann (noir)',
    chapter: '1.1',
    chapterName: 'Variante d’avance',
    moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6'],
  },
  'Caro-Kann (noir)__1.2': {
    study: 'Caro-Kann (noir)',
    chapter: '1.2',
    chapterName: 'Variante classique',
    moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'],
  },
  'Ruy Lopez (blanc)__1.1': {
    study: 'Ruy Lopez (blanc)',
    chapter: '1.1',
    chapterName: 'Variante fermée',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6'],
  },
}

export function getPieceColor(studyName: string): 'white' | 'black' {
  return studyName.includes('(noir)') ? 'black' : 'white'
}
