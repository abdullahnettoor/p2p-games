import { GameDefinition, ValidationResult, WinResult } from '@/core/games/types'
import {
  BingoBoard,
  BingoCall,
  BingoInitConfig,
  BingoMove,
  BingoSetupConfig,
  BingoState,
  BingoTurnEvent,
  LineDetails,
} from './types'

export const BINGO_SIZE = 5
export const TOTAL_NUMBERS = 25
export const TARGET_LINES_TO_WIN = 5
export const BINGO_LETTERS = ['B', 'I', 'N', 'G', 'O'] as const

/**
 * Generates a random permutation of numbers 1 to 25.
 */
export function generateRandomBingoBoard(): BingoBoard {
  const numbers = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1)
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[numbers[i], numbers[j]] = [numbers[j], numbers[i]]
  }
  return numbers
}

/**
 * Validates that a board contains exactly 25 unique numbers between 1 and 25.
 */
export function validateBingoBoard(board: BingoBoard): ValidationResult {
  if (!Array.isArray(board) || board.length !== TOTAL_NUMBERS) {
    return { valid: false, reason: 'Board must contain exactly 25 numbers' }
  }
  const set = new Set(board)
  if (set.size !== TOTAL_NUMBERS) {
    return { valid: false, reason: 'Board contains duplicate numbers' }
  }
  for (const num of board) {
    if (typeof num !== 'number' || num < 1 || num > TOTAL_NUMBERS) {
      return { valid: false, reason: `Number ${num} is out of valid range (1-25)` }
    }
  }
  return { valid: true }
}

/**
 * Returns the uncalled numbers available for play.
 */
export function getCalls(history: BingoTurnEvent[]): BingoCall[] {
  return history.filter((event): event is BingoCall => event.type === 'call')
}

export function getCalledNumbers(history: BingoTurnEvent[]): number[] {
  return getCalls(history).map((call) => call.number)
}

/**
 * Returns the uncalled numbers available for play.
 */
export function getAvailableNumbers(calledNumbers: number[] | Set<number>): number[] {
  const calledSet = calledNumbers instanceof Set ? calledNumbers : new Set(calledNumbers)
  const available: number[] = []
  for (let i = 1; i <= TOTAL_NUMBERS; i++) {
    if (!calledSet.has(i)) {
      available.push(i)
    }
  }
  return available
}

/**
 * Calculates completed rows, columns, and diagonals for a board given called numbers.
 */
export function calculateCompletedLines(
  board: BingoBoard,
  calledNumbers: number[] | Set<number>
): LineDetails {
  const calledSet = calledNumbers instanceof Set ? calledNumbers : new Set(calledNumbers)
  const rows: number[] = []
  const cols: number[] = []
  const diags: number[] = []

  // Check rows
  for (let r = 0; r < BINGO_SIZE; r++) {
    let rowComplete = true
    for (let c = 0; c < BINGO_SIZE; c++) {
      const idx = r * BINGO_SIZE + c
      if (!calledSet.has(board[idx])) {
        rowComplete = false
        break
      }
    }
    if (rowComplete) rows.push(r)
  }

  // Check columns
  for (let c = 0; c < BINGO_SIZE; c++) {
    let colComplete = true
    for (let r = 0; r < BINGO_SIZE; r++) {
      const idx = r * BINGO_SIZE + c
      if (!calledSet.has(board[idx])) {
        colComplete = false
        break
      }
    }
    if (colComplete) cols.push(c)
  }

  // Main diagonal (top-left to bottom-right: 0, 6, 12, 18, 24)
  let mainDiagComplete = true
  for (let i = 0; i < BINGO_SIZE; i++) {
    const idx = i * BINGO_SIZE + i
    if (!calledSet.has(board[idx])) {
      mainDiagComplete = false
      break
    }
  }
  if (mainDiagComplete) diags.push(0)

  // Anti diagonal (top-right to bottom-left: 4, 8, 12, 16, 20)
  let antiDiagComplete = true
  for (let i = 0; i < BINGO_SIZE; i++) {
    const idx = i * BINGO_SIZE + (BINGO_SIZE - 1 - i)
    if (!calledSet.has(board[idx])) {
      antiDiagComplete = false
      break
    }
  }
  if (antiDiagComplete) diags.push(1)

  const count = rows.length + cols.length + diags.length
  return { count, rows, cols, diags }
}

export function parseBingoMove(value: unknown): BingoMove | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Record<string, unknown>
  if (typeof candidate.playerId !== 'string') return null

  if (
    candidate.type === 'CALL_NUMBER' &&
    typeof candidate.number === 'number' &&
    Number.isInteger(candidate.number)
  ) {
    return {
      type: 'CALL_NUMBER',
      number: candidate.number,
      playerId: candidate.playerId,
    }
  }

  if (
    candidate.type === 'PASS' &&
    (candidate.reason === 'voluntary' || candidate.reason === 'timeout')
  ) {
    return {
      type: 'PASS',
      playerId: candidate.playerId,
      reason: candidate.reason,
    }
  }

  return null
}

function parseTurnEventMove(value: unknown, expectedSequence: number): BingoMove | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Record<string, unknown>
  if (candidate.sequence !== expectedSequence) return null

  const move =
    candidate.type === 'call'
      ? parseBingoMove({
          type: 'CALL_NUMBER',
          number: candidate.number,
          playerId: candidate.playerId,
        })
      : candidate.type === 'pass'
        ? parseBingoMove({
            type: 'PASS',
            playerId: candidate.playerId,
            reason: candidate.reason,
          })
        : null
  return move
}

export function replayBingoHistory(config: BingoInitConfig, value: unknown): BingoState | null {
  if (!Array.isArray(value)) return null

  let state = bingoGameDefinition.init(config)
  for (let index = 0; index < value.length; index++) {
    const move = parseTurnEventMove(value[index], index + 1)
    if (!move) return null

    const validation = bingoGameDefinition.validateMove(state, move, move.playerId)
    if (!validation.valid) return null
    state = bingoGameDefinition.applyMove(state, move)
  }

  return state
}

export const bingoGameDefinition: GameDefinition<BingoState, BingoMove, BingoSetupConfig> = {
  id: 'bingo',
  name: 'BINGO',
  minPlayers: 2,
  maxPlayers: 2,

  validateSetup(config: BingoSetupConfig): ValidationResult {
    return validateBingoBoard(config.board)
  },

  init(config: BingoInitConfig): BingoState {
    const [p1, p2] = config.players
    const startingPlayerId = config.startingPlayerId || p1

    const lineDetails: Record<string, LineDetails> = {
      [p1]: { count: 0, rows: [], cols: [], diags: [] },
      [p2]: { count: 0, rows: [], cols: [], diags: [] },
    }

    const completedLines: Record<string, number> = {
      [p1]: 0,
      [p2]: 0,
    }

    return {
      players: [p1, p2],
      boards: {
        [p1]: config.setupConfigs[p1].board,
        [p2]: config.setupConfigs[p2].board,
      },
      history: [],
      activePlayerId: startingPlayerId,
      completedLines,
      lineDetails,
      status: 'active',
      winnerId: null,
    }
  },

  validateMove(state: BingoState, move: BingoMove, playerId: string): ValidationResult {
    if (state.status !== 'active') {
      return { valid: false, reason: 'Match is already completed' }
    }
    if (state.activePlayerId !== playerId) {
      return { valid: false, reason: 'Not your turn' }
    }
    if (move.playerId !== playerId) {
      return { valid: false, reason: 'Move player mismatch' }
    }
    if (move.type === 'CALL_NUMBER') {
      if (!Number.isInteger(move.number) || move.number < 1 || move.number > TOTAL_NUMBERS) {
        return { valid: false, reason: `Number ${move.number} is out of range` }
      }
      if (getCalledNumbers(state.history).includes(move.number)) {
        return { valid: false, reason: `Number ${move.number} has already been called` }
      }
    }
    return { valid: true }
  },

  applyMove(state: BingoState, move: BingoMove): BingoState {
    const sequence = state.history.length + 1
    const event: BingoTurnEvent =
      move.type === 'CALL_NUMBER'
        ? { type: 'call', number: move.number, playerId: move.playerId, sequence }
        : { type: 'pass', playerId: move.playerId, reason: move.reason, sequence }
    const nextHistory = [...state.history, event]
    const [p1, p2] = state.players
    const nextActivePlayerId = state.players.find((playerId) => playerId !== state.activePlayerId) || p1

    if (event.type === 'pass') {
      return {
        ...state,
        history: nextHistory,
        activePlayerId: nextActivePlayerId,
      }
    }

    const calledSet = new Set(getCalledNumbers(nextHistory))
    const p1Details = calculateCompletedLines(state.boards[p1], calledSet)
    const p2Details = calculateCompletedLines(state.boards[p2], calledSet)

    const nextCompletedLines = {
      [p1]: p1Details.count,
      [p2]: p2Details.count,
    }
    const nextLineDetails = {
      [p1]: p1Details,
      [p2]: p2Details,
    }

    const p1Won = p1Details.count >= TARGET_LINES_TO_WIN
    const p2Won = p2Details.count >= TARGET_LINES_TO_WIN

    let status: 'active' | 'completed' = 'active'
    let winnerId: string | null = null
    let isDraw = false

    if (p1Won && p2Won) {
      status = 'completed'
      isDraw = true
    } else if (p1Won) {
      status = 'completed'
      winnerId = p1
    } else if (p2Won) {
      status = 'completed'
      winnerId = p2
    }

    return {
      ...state,
      history: nextHistory,
      activePlayerId: nextActivePlayerId,
      completedLines: nextCompletedLines,
      lineDetails: nextLineDetails,
      status,
      winnerId,
      isDraw,
    }
  },

  checkWin(state: BingoState): WinResult {
    if (state.status === 'completed') {
      return {
        isGameOver: true,
        winnerId: state.winnerId,
        isDraw: state.isDraw,
      }
    }
    return {
      isGameOver: false,
      winnerId: null,
    }
  },
}
