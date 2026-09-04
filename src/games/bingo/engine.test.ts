import { describe, it, expect } from 'vitest'
import {
  generateRandomBingoBoard,
  validateBingoBoard,
  calculateCompletedLines,
  bingoGameDefinition,
} from './engine'
import type { BingoSetupConfig, BingoMove } from './types'

describe('BINGO Game Engine', () => {
  describe('Board Generation and Validation', () => {
    it('generates a valid 5x5 board containing unique numbers from 1 to 25', () => {
      const board = generateRandomBingoBoard()
      expect(board).toHaveLength(25)
      expect(new Set(board).size).toBe(25)
      for (let i = 1; i <= 25; i++) {
        expect(board).toContain(i)
      }
    })

    it('validates correct boards and rejects invalid ones', () => {
      const validBoard = Array.from({ length: 25 }, (_, i) => i + 1)
      expect(validateBingoBoard(validBoard).valid).toBe(true)

      // Less than 25 numbers
      expect(validateBingoBoard([1, 2, 3]).valid).toBe(false)

      // Duplicate numbers
      const duplicateBoard = [...validBoard]
      duplicateBoard[24] = 1
      expect(validateBingoBoard(duplicateBoard).valid).toBe(false)

      // Numbers out of range
      const outOfRangeBoard = [...validBoard]
      outOfRangeBoard[24] = 26
      expect(validateBingoBoard(outOfRangeBoard).valid).toBe(false)
    })
  })

  describe('Line Calculations', () => {
    const standardBoard = Array.from({ length: 25 }, (_, i) => i + 1)
    // Board layout:
    // [ 1,  2,  3,  4,  5]
    // [ 6,  7,  8,  9, 10]
    // [11, 12, 13, 14, 15]
    // [16, 17, 18, 19, 20]
    // [21, 22, 23, 24, 25]

    it('detects completed rows', () => {
      const called = [1, 2, 3, 4, 5] // Row 0
      const result = calculateCompletedLines(standardBoard, called)
      expect(result.count).toBe(1)
      expect(result.rows).toEqual([0])
    })

    it('detects completed columns', () => {
      const called = [1, 6, 11, 16, 21] // Col 0
      const result = calculateCompletedLines(standardBoard, called)
      expect(result.count).toBe(1)
      expect(result.cols).toEqual([0])
    })

    it('detects completed main and anti diagonals', () => {
      const mainDiag = [1, 7, 13, 19, 25] // Main diagonal
      const res1 = calculateCompletedLines(standardBoard, mainDiag)
      expect(res1.count).toBe(1)
      expect(res1.diags).toEqual([0])

      const antiDiag = [5, 9, 13, 17, 21] // Anti diagonal
      const res2 = calculateCompletedLines(standardBoard, antiDiag)
      expect(res2.count).toBe(1)
      expect(res2.diags).toEqual([1])
    })

    it('detects multiple intersecting lines correctly', () => {
      const called = [1, 2, 3, 4, 5, 6, 11, 16, 21, 7, 13, 19, 25]
      // Row 0, Col 0, Main Diag -> 3 lines
      const result = calculateCompletedLines(standardBoard, called)
      expect(result.count).toBe(3)
      expect(result.rows).toContain(0)
      expect(result.cols).toContain(0)
      expect(result.diags).toContain(0)
    })
  })

  describe('GameDefinition Lifecycle and Move Reducer', () => {
    const hostId = 'player-host'
    const guestId = 'player-guest'
    const hostBoard = Array.from({ length: 25 }, (_, i) => i + 1)
    const guestBoard = Array.from({ length: 25 }, (_, i) => 25 - i)

    const setupConfigs: Record<string, BingoSetupConfig> = {
      [hostId]: { board: hostBoard },
      [guestId]: { board: guestBoard },
    }

    it('initializes game state with both boards and sets active player', () => {
      const state = bingoGameDefinition.init({
        players: [hostId, guestId],
        setupConfigs,
      })

      expect(state.status).toBe('active')
      expect(state.players).toEqual([hostId, guestId])
      expect(state.activePlayerId).toBe(hostId)
      expect(state.calledNumbers).toEqual([])
      expect(state.winnerId).toBeNull()
      expect(state.completedLines[hostId]).toBe(0)
      expect(state.completedLines[guestId]).toBe(0)
    })

    it('validates legal and illegal moves', () => {
      const state = bingoGameDefinition.init({
        players: [hostId, guestId],
        setupConfigs,
      })

      // Valid move by active player
      const validMove: BingoMove = { type: 'PICK_NUMBER', number: 7, playerId: hostId }
      expect(bingoGameDefinition.validateMove(state, validMove, hostId).valid).toBe(true)

      // Invalid: Move by non-active player
      const outOfTurnMove: BingoMove = { type: 'PICK_NUMBER', number: 7, playerId: guestId }
      expect(bingoGameDefinition.validateMove(state, outOfTurnMove, guestId).valid).toBe(false)

      // Invalid: Out of range number
      const outOfRangeMove: BingoMove = { type: 'PICK_NUMBER', number: 30, playerId: hostId }
      expect(bingoGameDefinition.validateMove(state, outOfRangeMove, hostId).valid).toBe(false)

      // Apply move and try calling same number again
      const nextState = bingoGameDefinition.applyMove(state, validMove)
      const repeatMove: BingoMove = { type: 'PICK_NUMBER', number: 7, playerId: guestId }
      expect(bingoGameDefinition.validateMove(nextState, repeatMove, guestId).valid).toBe(false)
    })

    it('applies move, switches active player, and updates lines', () => {
      const state = bingoGameDefinition.init({
        players: [hostId, guestId],
        setupConfigs,
      })

      const move1: BingoMove = { type: 'PICK_NUMBER', number: 1, playerId: hostId }
      const state1 = bingoGameDefinition.applyMove(state, move1)

      expect(state1.calledNumbers).toEqual([1])
      expect(state1.activePlayerId).toBe(guestId)

      const move2: BingoMove = { type: 'PICK_NUMBER', number: 2, playerId: guestId }
      const state2 = bingoGameDefinition.applyMove(state1, move2)

      expect(state2.calledNumbers).toEqual([1, 2])
      expect(state2.activePlayerId).toBe(hostId)
    })

    it('triggers win condition when a player reaches 5 completed lines (B-I-N-G-O)', () => {
      let state = bingoGameDefinition.init({
        players: [hostId, guestId],
        setupConfigs,
      })

      // Complete 5 lines for host:
      // Rows 0, 1, 2, 3, 4 -> numbers 1..25
      // Let's call numbers to complete 5 rows
      const numbersToCall = [
        1, 2, 3, 4, 5,       // Row 0 (1 line)
        6, 7, 8, 9, 10,     // Row 1 (2 lines)
        11, 12, 13, 14, 15, // Row 2 (3 lines)
        16, 17, 18, 19, 20, // Row 3 (4 lines)
        21, 22, 23, 24, 25  // Row 4 (5+ lines)
      ]

      for (const num of numbersToCall) {
        const move: BingoMove = {
          type: 'PICK_NUMBER',
          number: num,
          playerId: state.activePlayerId,
        }
        state = bingoGameDefinition.applyMove(state, move)
      }

      const winResult = bingoGameDefinition.checkWin(state)
      expect(winResult.isGameOver).toBe(true)
      expect(state.status).toBe('completed')
      expect(state.completedLines[hostId]).toBeGreaterThanOrEqual(5)
    })
  })
})
