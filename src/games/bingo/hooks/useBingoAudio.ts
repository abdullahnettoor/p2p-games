import { useEffect, useRef, useState, useCallback } from 'react'
import { SoundSynthesizer, defaultSoundSynthesizer } from '@/core/audio/SoundSynthesizer'
import { BingoMatchState } from '../state/BingoMatchCoordinator'
import { getCalls } from '../engine'

export interface UseBingoAudioResult {
  isMuted: boolean
  toggleMute: () => void
  setMuted: (muted: boolean) => void
}

function provideLightHaptic(duration: number): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  try {
    navigator.vibrate(duration)
  } catch {
    // Haptics are optional and may be blocked by the browser.
  }
}

/**
 * Maps deterministic Match state transitions to restrained audio and optional haptics.
 */
export function useBingoAudio(
  state: BingoMatchState | null,
  synth: SoundSynthesizer = defaultSoundSynthesizer
): UseBingoAudioResult {
  const [isMuted, setIsMutedState] = useState<boolean>(() => synth.isMuted)

  const toggleMute = useCallback(() => {
    const next = synth.toggleMute()
    setIsMutedState(next)
  }, [synth])

  const setMuted = useCallback(
    (muted: boolean) => {
      synth.setMuted(muted)
      setIsMutedState(muted)
    },
    [synth]
  )

  const previousCallCountRef = useRef<number | null>(null)
  const previousActivePlayerIdRef = useRef<string | null>(null)
  const previousMyLinesRef = useRef<number | null>(null)
  const previousRemoteLinesRef = useRef<number | null>(null)
  const previousGameOverRef = useRef<boolean | null>(null)
  const previousSecondsRef = useRef<number | null>(null)

  useEffect(() => {
    if (!state) return

    const calls = getCalls(state.gameState.history)
    const currentCallCount = calls.length
    const currentActivePlayerId = state.gameState.activePlayerId
    const localId = state.localPlayer.id
    const remoteId = state.remotePlayer.id
    const currentMyLines = state.gameState.completedLines[localId] || 0
    const currentRemoteLines = state.gameState.completedLines[remoteId] || 0
    const isGameOver = state.winResult.isGameOver

    if (previousCallCountRef.current === null) {
      previousCallCountRef.current = currentCallCount
      previousActivePlayerIdRef.current = currentActivePlayerId
      previousMyLinesRef.current = currentMyLines
      previousRemoteLinesRef.current = currentRemoteLines
      previousGameOverRef.current = isGameOver
      previousSecondsRef.current = state.turnSecondsRemaining
      return
    }

    const hasNewCall = currentCallCount > previousCallCountRef.current
    const hasNewLine =
      currentMyLines > (previousMyLinesRef.current ?? 0) ||
      currentRemoteLines > (previousRemoteLinesRef.current ?? 0)
    const hasTurnChanged =
      previousActivePlayerIdRef.current !== null &&
      currentActivePlayerId !== previousActivePlayerIdRef.current
    const hasGameOver = isGameOver && !previousGameOverRef.current
    const hasFinalThreeSecondTick =
      currentActivePlayerId === localId &&
      state.turnSecondsRemaining > 0 &&
      previousSecondsRef.current !== null &&
      state.turnSecondsRemaining < previousSecondsRef.current &&
      state.turnSecondsRemaining <= 3

    if (hasGameOver) {
      if (state.winResult.isDraw) {
        synth.playDraw()
      } else if (state.winResult.winnerId === localId) {
        synth.playBingo()
      } else if (state.winResult.winnerId === remoteId) {
        synth.playDefeat()
      }
    } else if (hasNewLine) {
      synth.playLineStamp()
      provideLightHaptic(14)
    } else if (hasNewCall) {
      const latestCall = calls[calls.length - 1]
      if (latestCall.playerId === localId) {
        synth.playPencilScratch()
      } else {
        synth.playPaperFlick()
      }
      provideLightHaptic(8)
    } else if (hasFinalThreeSecondTick) {
      synth.playFinalThreeSecondTick()
      provideLightHaptic(6)
    } else if (hasTurnChanged) {
      synth.playTurnChange()
      provideLightHaptic(10)
    }

    previousCallCountRef.current = currentCallCount
    previousMyLinesRef.current = currentMyLines
    previousRemoteLinesRef.current = currentRemoteLines
    previousActivePlayerIdRef.current = currentActivePlayerId
    previousGameOverRef.current = isGameOver
    previousSecondsRef.current = state.turnSecondsRemaining
  }, [state, synth])

  return {
    isMuted,
    toggleMute,
    setMuted,
  }
}
