'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { SoundSynthesizer, defaultSoundSynthesizer } from '@/core/audio/SoundSynthesizer'
import { BingoMatchState } from '../state/BingoMatchCoordinator'
import { getCalledNumbers } from '../engine'

export interface UseBingoAudioResult {
  isMuted: boolean
  toggleMute: () => void
  setMuted: (muted: boolean) => void
}

/**
 * Hook to manage game audio feedback across BINGO matchplay state transitions.
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

  // Track previous state references to trigger sounds only on transitions
  const prevCalledLengthRef = useRef<number | null>(null)
  const prevActivePlayerIdRef = useRef<string | null>(null)
  const prevMyLinesRef = useRef<number | null>(null)
  const prevRemoteLinesRef = useRef<number | null>(null)
  const prevGameOverRef = useRef<boolean | null>(null)

  useEffect(() => {
    if (!state) return

    const currentCalledLength = getCalledNumbers(state.gameState.history).length
    const currentActivePlayerId = state.gameState.activePlayerId
    const localId = state.localPlayer.id
    const remoteId = state.remotePlayer.id
    const currentMyLines = state.gameState.completedLines[localId] || 0
    const currentRemoteLines = state.gameState.completedLines[remoteId] || 0
    const isGameOver = state.winResult.isGameOver

    // If first render, initialize refs and don't play transition sounds
    if (prevCalledLengthRef.current === null) {
      prevCalledLengthRef.current = currentCalledLength
      prevActivePlayerIdRef.current = currentActivePlayerId
      prevMyLinesRef.current = currentMyLines
      prevRemoteLinesRef.current = currentRemoteLines
      prevGameOverRef.current = isGameOver
      return
    }

    const hasNewNumber = currentCalledLength > prevCalledLengthRef.current
    const hasNewLine =
      currentMyLines > (prevMyLinesRef.current ?? 0) ||
      currentRemoteLines > (prevRemoteLinesRef.current ?? 0)
    const hasTurnChanged =
      prevActivePlayerIdRef.current !== null &&
      currentActivePlayerId !== prevActivePlayerIdRef.current
    const hasGameOver = isGameOver && !prevGameOverRef.current

    // Priority-based audio dispatch to avoid simultaneous colliding frequencies:
    // 1. Game Over (highest priority)
    if (hasGameOver) {
      if (state.winResult.winnerId === localId) {
        synth.playVictory()
      } else if (state.winResult.winnerId === remoteId) {
        synth.playDefeat()
      }
    } else if (hasNewLine) {
      // 2. Line completion (chords take precedence over basic click)
      synth.playLineComplete()
    } else if (hasNewNumber) {
      // 3. Tactile number click
      synth.playNumberSelect()
    } else if (hasTurnChanged) {
      // 4. Turn change without number select (e.g. timeout turn pass)
      synth.playTurnChange()
    }

    prevCalledLengthRef.current = currentCalledLength
    prevMyLinesRef.current = currentMyLines
    prevRemoteLinesRef.current = currentRemoteLines
    prevActivePlayerIdRef.current = currentActivePlayerId
    prevGameOverRef.current = isGameOver
  }, [state, synth])

  return {
    isMuted,
    toggleMute,
    setMuted,
  }
}
