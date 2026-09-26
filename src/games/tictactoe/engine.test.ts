import { describe, it, expect } from 'vitest'
import {
  applyMove,
  checkWin,
  createEmptyBoard,
  initState,
  resetRoundFromHostMessage,
  serializeBoard,
  ticTacToeDefinition,
  validateMove,
} from './engine'
import { TicTacToeState } from './types'

const HOST = 'host-1'
const GUEST = 'guest-1'

function freshState(): TicTacToeState {
  return initState({ hostId: HOST, guestId: GUEST })
}

function play(state: TicTacToeState, ...cells: number[]): TicTacToeState {
  return cells.reduce(
    (acc, cellIndex) => applyMove(acc, { cellIndex, playerId: acc.activePlayerId }),
    state
  )
}

describe('tic-tac-toe engine', () => {
  it('starts with an empty board, host as X, host to move', () => {
    const state = freshState()
    expect(state.board).toEqual(createEmptyBoard())
    expect(state.marks[HOST]).toBe('X')
    expect(state.marks[GUEST]).toBe('O')
    expect(state.activePlayerId).toBe(HOST)
    expect(state.status).toBe('active')
  })

  it('rejects moves out of turn, out of range, and onto taken cells', () => {
    const state = freshState()

    expect(validateMove(state, { cellIndex: 0, playerId: GUEST }).valid).toBe(false)
    expect(validateMove(state, { cellIndex: 9, playerId: HOST }).valid).toBe(false)
    expect(validateMove(state, { cellIndex: -1, playerId: HOST }).valid).toBe(false)
    expect(validateMove(state, { cellIndex: 0, playerId: 'stranger' }).valid).toBe(false)

    const afterFirst = applyMove(state, { cellIndex: 0, playerId: HOST })
    expect(validateMove(afterFirst, { cellIndex: 0, playerId: GUEST }).valid).toBe(false)
  })

  it('leaves state untouched when an invalid move is applied', () => {
    const state = freshState()
    expect(applyMove(state, { cellIndex: 0, playerId: GUEST })).toBe(state)
  })

  it('alternates turns and records marks', () => {
    const state = play(freshState(), 0, 4)
    expect(serializeBoard(state.board)).toBe('X...O....')
    expect(state.activePlayerId).toBe(HOST)
  })

  it('detects a win and freezes the match', () => {
    // X: 0,1,2  O: 3,4
    const state = play(freshState(), 0, 3, 1, 4, 2)

    expect(state.status).toBe('completed')
    expect(state.winnerId).toBe(HOST)
    expect(state.isDraw).toBe(false)
    expect(state.winningLine).toEqual([0, 1, 2])

    const afterGameOver = applyMove(state, { cellIndex: 5, playerId: GUEST })
    expect(afterGameOver).toBe(state)
  })

  it('detects a diagonal win for the guest', () => {
    // X: 1,3,5  O: 0,4,8
    const state = play(freshState(), 1, 0, 3, 4, 5, 8)
    expect(state.winnerId).toBe(GUEST)
    expect(state.winningLine).toEqual([0, 4, 8])
  })

  it('detects a draw when the board fills with no line', () => {
    // X O X / X O O / O X X
    const state = play(freshState(), 0, 1, 2, 4, 3, 5, 7, 6, 8)
    expect(state.status).toBe('completed')
    expect(state.isDraw).toBe(true)
    expect(state.winnerId).toBeNull()
  })

  it('is deterministic: replaying the same moves yields identical state on both peers', () => {
    const moves = [4, 0, 8, 2, 1, 7, 6]
    const peerA = play(freshState(), ...moves)
    const peerB = play(freshState(), ...moves)
    expect(peerA).toEqual(peerB)
  })

  it('reports no winner on an in-progress board', () => {
    const outcome = checkWin(play(freshState(), 0, 4))
    expect(outcome.isGameOver).toBe(false)
  })
})

describe('ticTacToeDefinition (GameDefinition implementation)', () => {
  it('exposes definition metadata', () => {
    expect(ticTacToeDefinition.id).toBe('tictactoe')
    expect(ticTacToeDefinition.name).toBe('Tic-Tac-Toe')
    expect(ticTacToeDefinition.minPlayers).toBe(2)
    expect(ticTacToeDefinition.maxPlayers).toBe(2)
  })

  it('always validates null setup config as valid', () => {
    expect(ticTacToeDefinition.validateSetup(null)).toEqual({ valid: true })
  })

  it('initializes round state with players and starting player', () => {
    const state = ticTacToeDefinition.init({
      players: [HOST, GUEST],
      setupConfigs: { [HOST]: null, [GUEST]: null },
      startingPlayerId: GUEST,
    })

    expect(state.board).toEqual(Array(9).fill(null))
    expect(state.marks[HOST]).toBe('X')
    expect(state.marks[GUEST]).toBe('O')
    expect(state.activePlayerId).toBe(GUEST)
    expect(state.status).toBe('active')
  })

  it('validates moves via validateMove', () => {
    const state = ticTacToeDefinition.init({
      players: [HOST, GUEST],
      setupConfigs: { [HOST]: null, [GUEST]: null },
      startingPlayerId: HOST,
    })

    expect(
      ticTacToeDefinition.validateMove(state, { cellIndex: 0, playerId: HOST }, HOST).valid
    ).toBe(true)
    expect(
      ticTacToeDefinition.validateMove(state, { cellIndex: 0, playerId: GUEST }, GUEST).valid
    ).toBe(false)
    expect(
      ticTacToeDefinition.validateMove(state, { cellIndex: 0, playerId: HOST }, GUEST).valid
    ).toBe(false)
  })

  it('applies moves and checks win conditions via GameDefinition methods', () => {
    let state = ticTacToeDefinition.init({
      players: [HOST, GUEST],
      setupConfigs: { [HOST]: null, [GUEST]: null },
      startingPlayerId: HOST,
    })

    state = ticTacToeDefinition.applyMove(state, { cellIndex: 0, playerId: HOST })
    state = ticTacToeDefinition.applyMove(state, { cellIndex: 3, playerId: GUEST })
    state = ticTacToeDefinition.applyMove(state, { cellIndex: 1, playerId: HOST })
    state = ticTacToeDefinition.applyMove(state, { cellIndex: 4, playerId: GUEST })
    state = ticTacToeDefinition.applyMove(state, { cellIndex: 2, playerId: HOST })

    const outcome = ticTacToeDefinition.checkWin(state)
    expect(outcome.isGameOver).toBe(true)
    expect(outcome.winnerId).toBe(HOST)
  })

  it('resets new round deterministically from host payload', () => {
    const payload = {
      roundNumber: 2,
      startingPlayerId: GUEST,
      timestamp: 123456789,
    }
    const state = resetRoundFromHostMessage(payload, [HOST, GUEST])
    expect(state.activePlayerId).toBe(GUEST)
    expect(state.board).toEqual(Array(9).fill(null))
    expect(state.marks[HOST]).toBe('X')
    expect(state.marks[GUEST]).toBe('O')
    expect(state.status).toBe('active')
  })
})
