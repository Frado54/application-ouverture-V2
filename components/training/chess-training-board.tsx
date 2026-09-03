'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { PieceHandlerArgs, PieceDropHandlerArgs, SquareHandlerArgs } from 'react-chessboard'
import { Eye, X } from 'lucide-react'
import { resolveMoves } from '@/lib/chess-utils'
import type { DueChapter, PgnChapter } from '@/lib/types'
import { cn } from '@/lib/utils'

const SELECTED_STYLE = { backgroundColor: 'oklch(0.75 0.15 95 / 45%)' }
const LAST_MOVE_STYLE = { backgroundColor: 'oklch(0.65 0.14 142 / 35%)' }

interface ChessTrainingBoardProps {
  chapter: DueChapter
  pgn: PgnChapter
  onComplete: (errors: number) => void
  onMovePlayed?: () => void
}

export function ChessTrainingBoard({ chapter, pgn, onComplete, onMovePlayed }: ChessTrainingBoardProps) {
  const chessRef = useRef(new Chess())
  const resolvedMoves = useMemo(() => resolveMoves(pgn.moves), [pgn])
  const userColor = chapter.color

  const [fen, setFen] = useState(chessRef.current.fen())
  const [ply, setPly] = useState(0)
  const [errors, setErrors] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [message, setMessage] = useState<{ type: 'error' | 'hint'; text: string } | null>(null)
  const [completed, setCompleted] = useState(false)
  const completedRef = useRef(false)

  const expected = resolvedMoves[ply]
  const isOpponentTurn = !completed && !!expected && expected.color !== userColor

  // 🔊 MOTEUR AUDIO INTERNE ULTRA-PRÉCIS
  function playMoveSound(fromSquare: string, toSquare: string) {
    const soundEnabled = localStorage.getItem('chess-trainer:sound-enabled') !== 'false'
    if (!soundEnabled) return

    try {
      // On teste le coup de manière virtuelle pour savoir s'il s'agit d'une capture selon les règles
      const simulationChess = new Chess(chessRef.current.fen())
      const testMove = simulationChess.move({ from: fromSquare, to: toSquare })
      
      // Si le coup génère une pièce capturée, on joue capture.mp3, sinon coup.mp3
      const estUneCapture = testMove && testMove.captured !== undefined
      const audioUrl = estUneCapture ? '/capture.mp3' : '/coup.mp3'
      
      const audio = new Audio(audioUrl)
      audio.volume = 0.5
      audio.play()
    } catch (error) {
      // Sécurité en cas d'erreur de simulation : on joue le son par défaut
      const audio = new Audio('/coup.mp3')
      audio.volume = 0.5
      audio.play()
    }
  }

  // Opponent auto-plays its moves.
  useEffect(() => {
    if (completed) return
    const move = resolvedMoves[ply]
    if (!move || move.color === userColor) return

    const timer = setTimeout(() => {
      // 1. Déclencher le son de l'adversaire avant d'appliquer le coup en RAM
      playMoveSound(move.from, move.to)

      // 2. Appliquer le coup
      const result = chessRef.current.move({ from: move.from, to: move.to, promotion: move.promotion })
      if (!result) return
      setFen(chessRef.current.fen())
      setLastMove({ from: move.from, to: move.to })
      setMessage(null)
      
      if (onMovePlayed) onMovePlayed()

      const next = ply + 1
      setPly(next)
      if (next >= resolvedMoves.length && !completedRef.current) {
        completedRef.current = true
        setCompleted(true)
      }
    }, 550)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ply, completed])

  function attemptMove(from: string, to: string): boolean {
    if (completed || isOpponentTurn) return false
    const move = resolvedMoves[ply]
    if (!move) return false

    // Filtre des coups illégaux
    try {
      const movesLegaux = chessRef.current.moves({ square: from as any, verbose: true })
      const estLegal = movesLegaux.some((m) => m.to === to)
      
      if (!estLegal) {
        setSelected(null)
        return false
      }
    } catch (err) {
      setSelected(null)
      return false
    }

    // Le coup est légal et correct par rapport au répertoire
    if (move.from === from && move.to === to) {
      // 1. Déclencher ton son avant d'appliquer le coup en RAM
      playMoveSound(from, to)

      // 2. Appliquer le coup
      const result = chessRef.current.move({ from, to, promotion: move.promotion })
      if (!result) return false
      setFen(chessRef.current.fen())
      setLastMove({ from, to })
      setMessage(null)
      setSelected(null)

      if (onMovePlayed) onMovePlayed()

      const next = ply + 1
      setPly(next)
      if (next >= resolvedMoves.length) {
        completedRef.current = true
        setCompleted(true)
      }
      return true
    }

    // Le coup est légal mais faux théoriquement
    setErrors((e) => e + 1)
    setMessage({ type: 'error', text: 'Incorrect — essayez encore' })
    setSelected(null)
    return false
  }

  function handleSquareClick({ square, piece }: SquareHandlerArgs) {
    if (completed || isOpponentTurn) return
    if (!selected) {
      if (piece) setSelected(square)
      return
    }
    if (square === selected) {
      setSelected(null)
      return
    }
    const ok = attemptMove(selected, square)
    if (!ok) {
      setSelected(piece ? square : null)
    }
  }

  // Glisser-déposer de la pièce
  function handlePieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!targetSquare) return false
    if (sourceSquare === targetSquare) return false
    return attemptMove(sourceSquare, targetSquare)
  }

  function handleCanDrag({ piece }: PieceHandlerArgs): boolean {
    if (completed || isOpponentTurn) return false
    const pieceColor = piece.pieceType.startsWith('w') ? 'white' : 'black'
    return pieceColor === userColor
  }

  function revealMove() {
    if (!expected || completed) return
    setMessage({ type: 'hint', text: `Coup attendu : ${expected.san}` })
  }

  // Déclenchement de la fin du chapitre
  useEffect(() => {
    if (completed) onComplete(errors)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed])

  const squareStyles: Record<string, React.CSSProperties> = {}
  if (selected) squareStyles[selected] = SELECTED_STYLE
  if (lastMove) {
    squareStyles[lastMove.from] = { ...(squareStyles[lastMove.from] ?? {}), ...LAST_MOVE_STYLE }
    squareStyles[lastMove.to] = { ...(squareStyles[lastMove.to] ?? {}), ...LAST_MOVE_STYLE }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full max-w-[520px]">
        <Chessboard
          options={{
            position: fen,
            boardOrientation: userColor,
            onSquareClick: handleSquareClick,
            onPieceDrop: handlePieceDrop,
            canDragPiece: handleCanDrag,
            squareStyles,
            showNotation: true,
            animationDurationInMs: 200,
            darkSquareStyle: { backgroundColor: '#7a5c3e' },
            lightSquareStyle: { backgroundColor: '#e8d5ae' },
            darkSquareNotationStyle: { color: '#e8d5ae' },
            lightSquareNotationStyle: { color: '#7a5c3e' },
          }}
        />
      </div>

      <div className="flex min-h-10 w-full max-w-[520px] items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isOpponentTurn && !completed ? (
            <span className="font-mono text-sm text-muted-foreground">L&apos;adversaire joue…</span>
          ) : message ? (
            <span
              className={cn(
                'flex items-center gap-1.5 font-mono text-sm',
                message.type === 'error' ? 'text-destructive' : 'text-accent-foreground',
              )}
            >
              {message.type === 'error' && <X className="size-4" aria-hidden="true" />}
              {message.text}
            </span>
          ) : (
            !completed && <span className="font-mono text-sm text-muted-foreground">À vous de jouer</span>
          )}
        </div>
        {!completed && (
          <button
            type="button"
            onClick={revealMove}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <Eye className="size-4" aria-hidden="true" />
            Révéler le coup
          </button>
        )}
      </div>
    </div>
  )
}
