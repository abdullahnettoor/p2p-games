import { GameDefinition, ValidationResult, WinResult } from '@/core/games/types'
import {
  TicTacToeBoard,
  TicTacToeMark,
  TicTacToeMove,
  TicTacToeState,
} from './types'

export const WINNING_LINES: readonly [number, number, number][] = [
  // Rows
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Columns
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonals
  [0, 4, 8],
  [2, 4, 6],
] as const

export function createEmptyBoard(): TicTacToeBoard {
  return Array(9).fill(null)
}

export function initState({
  hostId,
  guestId,
  startingPlayerId,
}: {
  hostId: string
  guestId: string
  startingPlayerId?: string
}): TicTacToeState {
  const marks: Record<string, TicTacToeMark> = {
    [hostId]: 'X',
    [guestId]: 'O',
  }
  return {
    board: createEmptyBoard(),
    marks,
    activePlayerId: startingPlayerId ?? hostId,
    status: 'active',
    winnerId: null,
    isDraw: false,
    winningLine: null,
  }
}

export function validateMove(
  state: TicTacToeState,
  move: TicTacToeMove,
  playerId?: string
): ValidationResult {
  if (state.status === 'completed') {
    return { valid: false, reason: 'Round is already over' }
  }
  if (state.marks[move.playerId] === undefined) {
    return { valid: false, reason: 'Unknown player' }
  }
  if (playerId !== undefined && move.playerId !== playerId) {
    return { valid: false, reason: 'Move player mismatch' }
  }
  if (move.playerId !== state.activePlayerId) {
    return { valid: false, reason: 'Not your turn' }
  }

  // Handle pass move (e.g. Turn timer expiry)
  if (move.type === 'pass') {
    return { valid: true }
  }

  // Handle standard placement move
  if (!Number.isInteger(move.cellIndex) || move.cellIndex < 0 || move.cellIndex > 8) {
    return { valid: false, reason: 'Cell index out of range' }
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

  const opponentId =
    Object.keys(state.marks).find((id) => id !== move.playerId) ?? move.playerId

  if (move.type === 'pass') {
    return {
      ...state,
      activePlayerId: opponentId,
    }
  }

  const board = [...state.board]
  board[move.cellIndex] = state.marks[move.playerId]

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

/**
 * Tic-Tac-Toe GameDefinition implementation wrapping the deterministic engine.
 * Setup config is `null`: there is no initial board to arrange.
 */
export const ticTacToeDefinition: GameDefinition<TicTacToeState, TicTacToeMove, null> = {
  id: 'tictactoe',
  name: 'Tic-Tac-Toe',
  minPlayers: 2,
  maxPlayers: 2,

  init({ players, startingPlayerId }): TicTacToeState {
    const [hostId, guestId] = players
    return initState({
      hostId,
      guestId,
      startingPlayerId: startingPlayerId ?? hostId,
    })
  },

  validateSetup(): ValidationResult {
    // Tic-Tac-Toe requires no player-specific setup config
    return { valid: true }
  },

  validateMove(state, move, playerId): ValidationResult {
    return validateMove(state, move, playerId)
  },

  applyMove(state, move): TicTacToeState {
    return applyMove(state, move)
  },

  checkWin(state): WinResult {
    const win = checkWin(state)
    return {
      isGameOver: win.isGameOver,
      winnerId: win.winnerId,
      isDraw: win.isDraw,
    }
  },
}
