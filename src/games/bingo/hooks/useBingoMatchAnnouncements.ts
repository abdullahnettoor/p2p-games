import { useEffect, useRef, useState } from 'react'

import { BingoMatchState } from '../state/BingoMatchCoordinator'
import { BingoTurnEvent } from '../types'

function playerName(state: BingoMatchState, playerId: string): string {
  if (playerId === state.localPlayer.id) return state.localPlayer.name
  if (playerId === state.remotePlayer.id) return state.remotePlayer.name
  return 'A Player'
}

function activePlayerName(state: BingoMatchState): string {
  return playerName(state, state.gameState.activePlayerId)
}

function resultAnnouncement(state: BingoMatchState): string {
  const { winResult } = state
  if (winResult.isDraw) return 'The match ended in a draw.'
  if (winResult.reason === 'forfeit') {
    return winResult.winnerId === state.localPlayer.id
      ? 'You won by forfeit after your opponent failed to reconnect.'
      : 'You lost by forfeit because your connection did not return in time.'
  }
  return winResult.winnerId === state.localPlayer.id
    ? 'You won the match.'
    : 'You lost the match.'
}

function turnEventAnnouncement(state: BingoMatchState, event: BingoTurnEvent): string {
  const actor = playerName(state, event.playerId)
  const nextPlayer = activePlayerName(state)

  if (event.type === 'call') {
    return state.winResult.isGameOver
      ? `${actor} called ${event.number}.`
      : `${actor} called ${event.number}. It is ${nextPlayer}'s turn.`
  }

  if (event.reason === 'timeout') {
    return `${actor}'s time ran out, so the turn passed to ${nextPlayer}.`
  }

  return `${actor} passed. It is ${nextPlayer}'s turn.`
}

function lineAnnouncement(state: BingoMatchState, previousLocal: number, previousRemote: number): string | null {
  const localLines = state.gameState.completedLines[state.localPlayer.id] ?? 0
  const remoteLines = state.gameState.completedLines[state.remotePlayer.id] ?? 0
  if (localLines > previousLocal) {
    const count = localLines - previousLocal
    return `You completed ${count} ${count === 1 ? 'line' : 'lines'}.`
  }
  if (remoteLines > previousRemote) {
    const count = remoteLines - previousRemote
    return `${state.remotePlayer.name} completed ${count} ${count === 1 ? 'line' : 'lines'}.`
  }
  return null
}

export function useBingoMatchAnnouncements(state: BingoMatchState): string {
  const [announcement, setAnnouncement] = useState('')
  const previousHistoryLengthRef = useRef(state.gameState.history.length)
  const previousLocalLinesRef = useRef(state.gameState.completedLines[state.localPlayer.id] ?? 0)
  const previousRemoteLinesRef = useRef(state.gameState.completedLines[state.remotePlayer.id] ?? 0)
  const previousGameOverRef = useRef(state.winResult.isGameOver)
  const previousReconnectingRef = useRef(state.isReconnecting)
  const latestStateRef = useRef(state)
  const wasHiddenRef = useRef(typeof document !== 'undefined' && document.hidden)

  useEffect(() => {
    latestStateRef.current = state
    const previousHistoryLength = previousHistoryLengthRef.current
    const previousLocalLines = previousLocalLinesRef.current
    const previousRemoteLines = previousRemoteLinesRef.current
    const previousGameOver = previousGameOverRef.current
    const previousReconnecting = previousReconnectingRef.current
    const latestEvent = state.gameState.history[state.gameState.history.length - 1]
    const historyChanged = state.gameState.history.length > previousHistoryLength
    const linesChanged =
      (state.gameState.completedLines[state.localPlayer.id] ?? 0) > previousLocalLines ||
      (state.gameState.completedLines[state.remotePlayer.id] ?? 0) > previousRemoteLines

    const eventMessage = historyChanged && latestEvent
      ? turnEventAnnouncement(state, latestEvent)
      : ''
    const linesMessage = linesChanged
      ? lineAnnouncement(state, previousLocalLines, previousRemoteLines)
      : null

    if (state.winResult.isGameOver && !previousGameOver) {
      setAnnouncement([eventMessage, linesMessage, resultAnnouncement(state)].filter(Boolean).join(' '))
    } else if (eventMessage && linesMessage) {
      setAnnouncement(`${eventMessage} ${linesMessage}`)
    } else if (linesMessage) {
      setAnnouncement(linesMessage)
    } else if (eventMessage) {
      setAnnouncement(eventMessage)
    } else if (state.isReconnecting && !previousReconnecting) {
      setAnnouncement(
        `${state.remotePlayer.name} disconnected. Reconnection grace is active for ${state.reconnectSecondsRemaining} seconds.`
      )
    } else if (!state.isReconnecting && previousReconnecting) {
      setAnnouncement(`${state.remotePlayer.name} returned. It is ${activePlayerName(state)}'s turn.`)
    }

    previousHistoryLengthRef.current = state.gameState.history.length
    previousLocalLinesRef.current = state.gameState.completedLines[state.localPlayer.id] ?? 0
    previousRemoteLinesRef.current = state.gameState.completedLines[state.remotePlayer.id] ?? 0
    previousGameOverRef.current = state.winResult.isGameOver
    previousReconnectingRef.current = state.isReconnecting
  }, [state])

  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      const wasHidden = wasHiddenRef.current
      wasHiddenRef.current = document.hidden
      if (!wasHidden || document.hidden) return

      const latest = latestStateRef.current
      if (latest.winResult.isGameOver) {
        setAnnouncement(resultAnnouncement(latest))
        return
      }

      const whoseTurn = latest.gameState.activePlayerId === latest.localPlayer.id
        ? 'your turn'
        : `${latest.remotePlayer.name}'s turn`
      setAnnouncement(`Welcome back. It is ${whoseTurn}; ${latest.turnSecondsRemaining} seconds remain.`)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return announcement
}
