import { useSyncExternalStore, useCallback } from 'react'
import { LobbyCoordinator } from './LobbyCoordinator'
import { LobbyState } from './types'
import { BestOfSeriesLength } from '@/core/series'

export function useLobby<TSetupConfig = unknown>(coordinator: LobbyCoordinator<TSetupConfig>): {
  state: LobbyState<TSetupConfig>
  seriesLength: BestOfSeriesLength
  setSeriesLength: (length: BestOfSeriesLength) => void
  updatePlayerName: (name: string) => void
  updateBoardSetup: (setup: TSetupConfig) => void
  setReady: (isReady: boolean) => void
  canReady: () => boolean
} {
  const state = useSyncExternalStore(
    useCallback((notify) => coordinator.subscribe(notify), [coordinator]),
    useCallback(() => coordinator.state, [coordinator]),
    useCallback(() => coordinator.state, [coordinator])
  )

  const updatePlayerName = useCallback(
    (name: string) => coordinator.updatePlayerName(name),
    [coordinator]
  )

  const updateBoardSetup = useCallback(
    (setup: TSetupConfig) => coordinator.updateBoardSetup(setup),
    [coordinator]
  )

  const setReady = useCallback(
    (isReady: boolean) => coordinator.setReady(isReady),
    [coordinator]
  )

  const canReady = useCallback(
    () => coordinator.canReady(),
    [coordinator]
  )

  const setSeriesLength = useCallback(
    (length: BestOfSeriesLength) => coordinator.setSeriesLength(length),
    [coordinator]
  )

  return {
    state,
    seriesLength: state.seriesLength ?? coordinator.seriesLength,
    setSeriesLength,
    updatePlayerName,
    updateBoardSetup,
    setReady,
    canReady,
  }
}
