import { GameDefinition, ValidationResult, WinResult } from '@/core/games/types'
import { RoundStartMessagePayload } from '@/core/series/types'
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
  move: TicTacToeMove,
  playerId?: string
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
  if (playerId !== undefined && move.playerId !== playerId) {
    return { valid: false, reason: 'Move player mismatch' }
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

/**
 * Deterministically resets the board for a new Round from the Host's message payload.
 * Both peers running this against the same Host payload obtain identical state.
 */
export function resetRoundFromHostMessage(
  payload: RoundStartMessagePayload,
  players: [string, string]
): TicTacToeState {
  const [hostId, guestId] = players
  return initState({
    hostId,
    guestId,
    startingPlayerId: payload.startingPlayerId,
  })
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

  init(config: {
    players: [string, string]
    setupConfigs: Record<string, null>
    startingPlayerId?: string
  }): TicTacToeState {
    const [hostId, guestId] = config.players
    return initState({
      hostId,
      guestId,
      startingPlayerId: config.startingPlayerId,
    })
  },

  validateSetup(_config: null): ValidationResult {
    return { valid: true }
  },

  validateMove(state: TicTacToeState, move: TicTacToeMove, playerId: string): ValidationResult {
    return validateMove(state, move, playerId)
  },

  applyMove(state: TicTacToeState, move: TicTacToeMove): TicTacToeState {
    return applyMove(state, move)
  },

  checkWin(state: TicTacToeState): WinResult {
    return checkWin(state)
  },
}
