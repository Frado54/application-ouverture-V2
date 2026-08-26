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
}

export function ChessTrainingBoard({ chapter, pgn, onComplete }: ChessTrainingBoardProps) {
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

  // Opponent auto-plays its moves.
  useEffect(() => {
    if (completed) return
    const move = resolvedMoves[ply]
    if (!move || move.color === userColor) return

    const timer = setTimeout(() => {
      const result = chessRef.current.move({ from: move.from, to: move.to, promotion: move.promotion })
      if (!result) return
      setFen(chessRef.current.fen())
      setLastMove({ from: move.from, to: move.to })
      setMessage(null)
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

    if (move.from === from && move.to === to) {
      const result = chessRef.current.move({ from, to, promotion: move.promotion })
      if (!result) return false
      setFen(chessRef.current.fen())
      setLastMove({ from, to })
      setMessage(null)
      setSelected(null)
      const next = ply + 1
      setPly(next)
      if (next >= resolvedMoves.length) {
        completedRef.current = true
        setCompleted(true)
      }
      return true
    }

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

  function handlePieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (!targetSquare) return false
    // SÉCURITÉ : Si on lâche la pièce sur sa case de départ, on annule sans compter d'erreur
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

  // Call onComplete once the chapter has finished, outside of render.
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
