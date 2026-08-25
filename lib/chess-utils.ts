import { Chess } from 'chess.js'
import type { PieceColor, ResolvedMove } from './types'

/**
 * Replays a SAN move list from the starting position once to resolve
 * each move's from/to/promotion squares, so live play can validate user
 * moves by square rather than by re-parsing SAN.
 */
export function resolveMoves(sanMoves: string[]): ResolvedMove[] {
  const chess = new Chess()
  const resolved: ResolvedMove[] = []

  for (const san of sanMoves) {
    const color: PieceColor = chess.turn() === 'w' ? 'white' : 'black'
    const move = chess.move(san)
    if (!move) {
      throw new Error(`Invalid SAN move "${san}" while resolving chapter`)
    }
    resolved.push({
      san: move.san,
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      color,
    })
  }

  return resolved
}
