import { useSyncExternalStore, useCallback } from 'react'
import { BingoMatchCoordinator, BingoMatchState } from './BingoMatchCoordinator'

export function useBingoMatch(coordinator: BingoMatchCoordinator): {
  state: BingoMatchState
  isMyTurn: boolean
  submitMove: (number: number) => boolean
} {
  const state = useSyncExternalStore(
    useCallback((notify) => coordinator.subscribe(notify), [coordinator]),
    useCallback(() => coordinator.state, [coordinator]),
    useCallback(() => coordinator.state, [coordinator])
  )

  const submitMove = useCallback(
    (number: number) => coordinator.submitMove(number),
    [coordinator]
  )

  return {
    state,
    isMyTurn: coordinator.isMyTurn,
    submitMove,
  }
}
