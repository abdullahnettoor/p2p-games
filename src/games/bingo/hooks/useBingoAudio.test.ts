import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBingoAudio } from './useBingoAudio'
import { SoundSynthesizer } from '@/core/audio/SoundSynthesizer'
import { BingoMatchState } from '../state/BingoMatchCoordinator'
import { BingoState } from '../types'

describe('useBingoAudio', () => {
  let mockSynth: SoundSynthesizer

  beforeEach(() => {
    localStorage.clear()
    mockSynth = new SoundSynthesizer()
    vi.spyOn(mockSynth, 'playNumberSelect').mockImplementation(() => {})
    vi.spyOn(mockSynth, 'playTurnChange').mockImplementation(() => {})
    vi.spyOn(mockSynth, 'playLineComplete').mockImplementation(() => {})
    vi.spyOn(mockSynth, 'playPencilScratch').mockImplementation(() => {})
    vi.spyOn(mockSynth, 'playPaperFlick').mockImplementation(() => {})
    vi.spyOn(mockSynth, 'playLineStamp').mockImplementation(() => {})
    vi.spyOn(mockSynth, 'playBingo').mockImplementation(() => {})
    vi.spyOn(mockSynth, 'playDraw').mockImplementation(() => {})
    vi.spyOn(mockSynth, 'playFinalThreeSecondTick').mockImplementation(() => {})
    vi.spyOn(mockSynth, 'playVictory').mockImplementation(() => {})
    vi.spyOn(mockSynth, 'playDefeat').mockImplementation(() => {})
  })

  function createMockMatchState(overrides?: Partial<BingoMatchState>): BingoMatchState {
    const defaultGameState: BingoState = {
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
    }

    return {
      gameState: defaultGameState,
      turnSecondsRemaining: 30,
      localPlayer: { id: 'p1', name: 'Player1', role: 'host' },
      remotePlayer: { id: 'p2', name: 'Player2', role: 'guest' },
      winResult: { isGameOver: false, winnerId: null },
      isReconnecting: false,
      reconnectSecondsRemaining: 30,
      rematchState: 'none',
      ...overrides,
    }
  }

  it('triggers a pencil scratch when a new number is called locally', () => {
    let state = createMockMatchState({
      gameState: {
        ...createMockMatchState().gameState,
        history: [{ type: 'call', number: 5, playerId: 'p1', sequence: 1 }],
      },
    })

    const { rerender } = renderHook(({ s }) => useBingoAudio(s, mockSynth), {
      initialProps: { s: state },
    })

    // Initial render should not play catchup sounds
    expect(mockSynth.playPencilScratch).not.toHaveBeenCalled()

    // Add another number
    state = {
      ...state,
      gameState: {
        ...state.gameState,
        history: [
          ...state.gameState.history,
          { type: 'call', number: 12, playerId: 'p1', sequence: 2 },
        ],
      },
    }
    rerender({ s: state })

    expect(mockSynth.playPencilScratch).toHaveBeenCalledTimes(1)
  })

  it('triggers a paper flick for a Call from the other Player', () => {
    let state = createMockMatchState()
    const { rerender } = renderHook(({ s }) => useBingoAudio(s, mockSynth), {
      initialProps: { s: state },
    })

    state = {
      ...state,
      gameState: {
        ...state.gameState,
        history: [{ type: 'call', number: 12, playerId: 'p2', sequence: 1 }],
      },
    }
    rerender({ s: state })

    expect(mockSynth.playPaperFlick).toHaveBeenCalledTimes(1)
    expect(mockSynth.playPencilScratch).not.toHaveBeenCalled()
  })

  it('plays one final-three-second tick when the local timer crosses the threshold', () => {
    let state = createMockMatchState({ turnSecondsRemaining: 4 })
    const { rerender } = renderHook(({ s }) => useBingoAudio(s, mockSynth), {
      initialProps: { s: state },
    })

    state = { ...state, turnSecondsRemaining: 3 }
    rerender({ s: state })
    state = { ...state, turnSecondsRemaining: 2 }
    rerender({ s: state })

    expect(mockSynth.playFinalThreeSecondTick).toHaveBeenCalledTimes(2)
  })

  it('triggers playTurnChange when activePlayerId switches', () => {
    let state = createMockMatchState()

    const { rerender } = renderHook(({ s }) => useBingoAudio(s, mockSynth), {
      initialProps: { s: state },
    })

    expect(mockSynth.playTurnChange).not.toHaveBeenCalled()

    // Switch turn to p2
    state = {
      ...state,
      gameState: { ...state.gameState, activePlayerId: 'p2' },
    }
    rerender({ s: state })

    expect(mockSynth.playTurnChange).toHaveBeenCalledTimes(1)
  })

  it('triggers playLineStamp when local completed lines increase', () => {
    let state = createMockMatchState()

    const { rerender } = renderHook(({ s }) => useBingoAudio(s, mockSynth), {
      initialProps: { s: state },
    })

    state = {
      ...state,
      gameState: { ...state.gameState, completedLines: { p1: 1, p2: 0 } },
    }
    rerender({ s: state })

    expect(mockSynth.playLineStamp).toHaveBeenCalledTimes(1)
  })

  it('triggers playLineStamp when remote player completes a line', () => {
    let state = createMockMatchState()

    const { rerender } = renderHook(({ s }) => useBingoAudio(s, mockSynth), {
      initialProps: { s: state },
    })

    state = {
      ...state,
      gameState: { ...state.gameState, completedLines: { p1: 0, p2: 1 } },
    }
    rerender({ s: state })

    expect(mockSynth.playLineStamp).toHaveBeenCalledTimes(1)
  })

  it('triggers playBingo when local player wins', () => {
    let state = createMockMatchState()

    const { rerender } = renderHook(({ s }) => useBingoAudio(s, mockSynth), {
      initialProps: { s: state },
    })

    state = {
      ...state,
      winResult: { isGameOver: true, winnerId: 'p1' },
      gameState: { ...state.gameState, status: 'completed', winnerId: 'p1' },
    }
    rerender({ s: state })

    expect(mockSynth.playBingo).toHaveBeenCalledTimes(1)
    expect(mockSynth.playVictory).not.toHaveBeenCalled()
    expect(mockSynth.playDefeat).not.toHaveBeenCalled()
  })

  it('triggers playDefeat when opponent wins', () => {
    let state = createMockMatchState()

    const { rerender } = renderHook(({ s }) => useBingoAudio(s, mockSynth), {
      initialProps: { s: state },
    })

    state = {
      ...state,
      winResult: { isGameOver: true, winnerId: 'p2' },
      gameState: { ...state.gameState, status: 'completed', winnerId: 'p2' },
    }
    rerender({ s: state })

    expect(mockSynth.playDefeat).toHaveBeenCalledTimes(1)
    expect(mockSynth.playBingo).not.toHaveBeenCalled()
  })

  it('triggers playDraw instead of a win sound on a draw', () => {
    let state = createMockMatchState()

    const { rerender } = renderHook(({ s }) => useBingoAudio(s, mockSynth), {
      initialProps: { s: state },
    })

    state = {
      ...state,
      winResult: { isGameOver: true, winnerId: null, isDraw: true },
      gameState: { ...state.gameState, status: 'completed', winnerId: null, isDraw: true },
    }
    rerender({ s: state })

    expect(mockSynth.playDraw).toHaveBeenCalledTimes(1)
    expect(mockSynth.playBingo).not.toHaveBeenCalled()
    expect(mockSynth.playDefeat).not.toHaveBeenCalled()
  })

  it('provides mute toggle controls', () => {
    const state = createMockMatchState()
    const { result } = renderHook(() => useBingoAudio(state, mockSynth))

    expect(result.current.isMuted).toBe(false)

    act(() => {
      result.current.toggleMute()
    })

    expect(result.current.isMuted).toBe(true)
    expect(mockSynth.isMuted).toBe(true)
  })
})
