import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BingoMatchState } from '../state/BingoMatchCoordinator'
import { useBingoMatchAnnouncements } from './useBingoMatchAnnouncements'

function createState(overrides?: Partial<BingoMatchState>): BingoMatchState {
  return {
    gameState: {
      players: ['p1', 'p2'],
      boards: { p1: [], p2: [] },
      history: [],
      activePlayerId: 'p1',
      completedLines: { p1: 0, p2: 0 },
      lineDetails: {
        p1: { count: 0, rows: [], cols: [], diags: [] },
        p2: { count: 0, rows: [], cols: [], diags: [] },
      },
      status: 'active',
      winnerId: null,
      isDraw: false,
    },
    turnSecondsRemaining: 30,
    localPlayer: { id: 'p1', name: 'Alice', role: 'host' },
    remotePlayer: { id: 'p2', name: 'Bob', role: 'guest' },
    winResult: { isGameOver: false, winnerId: null },
    isReconnecting: false,
    reconnectSecondsRemaining: 30,
    rematchState: 'none',
    ...overrides,
  }
}

describe('useBingoMatchAnnouncements', () => {
  const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden')

  afterEach(() => {
    if (originalHidden) Object.defineProperty(document, 'hidden', originalHidden)
  })

  it('announces voluntary and timeout passes distinctly', () => {
    let state = createState()
    const { result, rerender } = renderHook(({ value }) => useBingoMatchAnnouncements(value), {
      initialProps: { value: state },
    })

    state = {
      ...state,
      gameState: {
        ...state.gameState,
        activePlayerId: 'p2',
        history: [{ type: 'pass', playerId: 'p1', reason: 'voluntary', sequence: 1 }],
      },
    }
    rerender({ value: state })
    expect(result.current).toBe('Alice passed. It is Bob\'s turn.')

    state = {
      ...state,
      gameState: {
        ...state.gameState,
        activePlayerId: 'p1',
        history: [
          ...state.gameState.history,
          { type: 'pass', playerId: 'p2', reason: 'timeout', sequence: 2 },
        ],
      },
    }
    rerender({ value: state })
    expect(result.current).toBe("Bob's time ran out, so the turn passed to Alice.")
  })

  it('keeps a Call announcement when that Call also completes a line', () => {
    let state = createState()
    const { result, rerender } = renderHook(({ value }) => useBingoMatchAnnouncements(value), {
      initialProps: { value: state },
    })

    state = {
      ...state,
      gameState: {
        ...state.gameState,
        activePlayerId: 'p2',
        history: [{ type: 'call', number: 7, playerId: 'p1', sequence: 1 }],
        completedLines: { p1: 1, p2: 0 },
      },
    }
    rerender({ value: state })

    expect(result.current).toBe('Alice called 7. It is Bob\'s turn. You completed 1 line.')
  })

  it('announces connection loss separately and explains whose turn remains on return', () => {
    let state = createState({ isReconnecting: true, reconnectSecondsRemaining: 30 })
    const { result, rerender } = renderHook(({ value }) => useBingoMatchAnnouncements(value), {
      initialProps: { value: createState() },
    })

    rerender({ value: state })
    expect(result.current).toMatch(/Bob disconnected.*Reconnection grace is active/)

    state = { ...state, isReconnecting: false }
    rerender({ value: state })
    expect(result.current).toBe("Bob returned. It is Alice's turn.")
  })

  it('announces the active turn when returning from a backgrounded tab', () => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    const state = createState({ turnSecondsRemaining: 12 })
    const { result } = renderHook(() => useBingoMatchAnnouncements(state))

    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    act(() => document.dispatchEvent(new Event('visibilitychange')))

    expect(result.current).toBe('Welcome back. It is your turn; 12 seconds remain.')
  })
})
