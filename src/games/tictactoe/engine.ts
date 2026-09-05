import { ValidationResult, WinResult } from '@/core/games/types'
import { TicTacToeBoard, TicTacToeMove, TicTacToeState } from './types'

export const WINNING_LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export function createEmptyBoard(): TicTacToeBoard {
  return Array<null>(9).fill(null)
}

/**
 * Builds the opening state. The host always plays X, the guest always plays O,
 * so both peers derive identical marks without exchanging them.
 */
export function initState(config: {
  hostId: string
  guestId: string
  startingPlayerId?: string
}): TicTacToeState {
  return {
    board: createEmptyBoard(),
    marks: { [config.hostId]: 'X', [config.guestId]: 'O' },
    activePlayerId: config.startingPlayerId ?? config.hostId,
    status: 'active',
    winnerId: null,
    isDraw: false,
    winningLine: null,
  }
}

export function validateMove(
  state: TicTacToeState,
  move: TicTacToeMove
): ValidationResult {
  if (state.status === 'completed') {
    return { valid: false, reason: 'Match is already over' }
  }
  if (!Number.isInteger(move.cellIndex) || move.cellIndex < 0 || move.cellIndex > 8) {
    return { valid: false, reason: 'Cell index out of range' }
  }
  if (state.marks[move.playerId] === undefined) {
    return { valid: false, reason: 'Unknown player' }
  }
  if (move.playerId !== state.activePlayerId) {
    return { valid: false, reason: 'Not your turn' }
  }
  if (state.board[move.cellIndex] !== null) {
    return { valid: false, reason: 'Cell already taken' }
  }
  return { valid: true }
}

export function checkWin(state: TicTacToeState): WinResult & { winningLine: number[] | null } {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line
    const mark = state.board[a]
    if (mark !== null && mark === state.board[b] && mark === state.board[c]) {
      const winnerId =
        Object.keys(state.marks).find((id) => state.marks[id] === mark) ?? null
      return { isGameOver: true, winnerId, isDraw: false, winningLine: [...line] }
    }
  }

  if (state.board.every((cell) => cell !== null)) {
    return { isGameOver: true, winnerId: null, isDraw: true, winningLine: null }
  }

  return { isGameOver: false, winnerId: null, isDraw: false, winningLine: null }
}

/**
 * Applies a validated move and resolves the outcome. Pure and deterministic, so
 * both peers running it against the same move land on identical state.
 */
export function applyMove(state: TicTacToeState, move: TicTacToeMove): TicTacToeState {
  const validation = validateMove(state, move)
  if (!validation.valid) return state

  const board = [...state.board]
  board[move.cellIndex] = state.marks[move.playerId]

  const opponentId =
    Object.keys(state.marks).find((id) => id !== move.playerId) ?? move.playerId

  const next: TicTacToeState = {
    ...state,
    board,
    activePlayerId: opponentId,
  }

  const outcome = checkWin(next)
  if (!outcome.isGameOver) return next

  return {
    ...next,
    status: 'completed',
    winnerId: outcome.winnerId,
    isDraw: Boolean(outcome.isDraw),
    winningLine: outcome.winningLine,
  }
}

/** Compact board signature (e.g. `X..O.....`) used for cross-peer sync assertions. */
export function serializeBoard(board: TicTacToeBoard): string {
  return board.map((cell) => cell ?? '.').join('')
}
