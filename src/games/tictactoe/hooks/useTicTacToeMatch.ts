'use client'

import { useEffect, useState, useCallback } from 'react'
import { TicTacToeMatchCoordinator } from '../state/TicTacToeMatchCoordinator'
import { TicTacToeCoordinatorState } from '../state/types'

export interface UseTicTacToeMatchReturn {
  state: TicTacToeCoordinatorState
  isMyTurn: boolean
  isHost: boolean
  submitMove: (cellIndex: number) => boolean
  readyForNextRound: () => void
  forfeit: () => void
  sendReaction: (emoji: string) => void
  requestRematch: () => void
  acceptRematch: () => void
  declineRematch: () => void
}

export function useTicTacToeMatch(
  coordinator: TicTacToeMatchCoordinator
): UseTicTacToeMatchReturn {
  const [state, setState] = useState<TicTacToeCoordinatorState>(() => coordinator.snapshot)

  useEffect(() => {
    setState(coordinator.snapshot)
    const unsubscribe = coordinator.subscribe(() => {
      setState(coordinator.snapshot)
    })
    return unsubscribe
  }, [coordinator])

  const submitMove = useCallback(
    (cellIndex: number) => coordinator.submitMove(cellIndex),
    [coordinator]
  )

  const readyForNextRound = useCallback(
    () => coordinator.readyForNextRound(),
    [coordinator]
  )

  const forfeit = useCallback(() => coordinator.forfeit(), [coordinator])

  const sendReaction = useCallback(
    (emoji: string) => coordinator.sendReaction(emoji),
    [coordinator]
  )

  const requestRematch = useCallback(
    () => coordinator.requestRematch(),
    [coordinator]
  )

  const acceptRematch = useCallback(
    () => coordinator.acceptRematch(),
    [coordinator]
  )

  const declineRematch = useCallback(
    () => coordinator.declineRematch(),
    [coordinator]
  )

  return {
    state,
    isMyTurn: coordinator.isMyTurn,
    isHost: coordinator.isHost,
    submitMove,
    readyForNextRound,
    forfeit,
    sendReaction,
    requestRematch,
    acceptRematch,
    declineRematch,
  }
}
