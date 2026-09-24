'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { LobbyCoordinator } from '@/core/lobby/LobbyCoordinator'
import { PeerJSTransport } from '@/core/transport/PeerJSTransport'
import {
  generateRoomCode,
  formatHostPeerId,
  resolveTargetPeerId,
  createGameInviteUrl,
} from '@/core/lobby/roomCode'
import { StrangerMatchmaker, StrangerMatchResult } from '@/core/matchmaking/strangerMatch'
import { BingoBoard } from '../types'
import { validateBingoBoard } from '../engine'
import { BingoMatchLobby } from './BingoMatchLobby'
import { BingoMatchplay } from './BingoMatchplay'
import { BingoMatchCoordinator } from '../state/BingoMatchCoordinator'
import { PlayerRole } from '@/core/games/types'
import lobbyStyles from './BingoMatchLobby.module.css'
import '../bingoTokens.css'

export interface BingoOnlineGameProps {
  role: PlayerRole
  matchId?: string
  initialPlayerName?: string
  onExit: () => void
}

type ScreenMode = 'lobby' | 'searching' | 'timeout'

interface ScreenState {
  mode: ScreenMode
  elapsedSeconds?: number
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const BingoOnlineGame: React.FC<BingoOnlineGameProps> = ({
  role,
  matchId,
  initialPlayerName,
  onExit,
}) => {
  const [screenState, setScreenState] = useState<ScreenState>({ mode: 'lobby' })
  const [isStrangerMatch, setIsStrangerMatch] = useState(false)
  const [matchCoordinator, setMatchCoordinator] = useState<BingoMatchCoordinator | null>(null)

  const activeRef = useRef(true)
  const lobbyRef = useRef<LobbyCoordinator<BingoBoard> | null>(null)
  const matchCoordinatorRef = useRef<BingoMatchCoordinator | null>(null)
  const strangerMatchmakerRef = useRef<StrangerMatchmaker | null>(null)
  const searchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const createFriendLobby = useCallback(
    (lobbyRole: PlayerRole, targetMatchId?: string) => {
      const isHost = lobbyRole === 'host'
      const initialCode = isHost ? generateRoomCode() : undefined
      const hostPeerId = isHost && initialCode ? formatHostPeerId('bingo', initialCode) : undefined
      const resolvedTargetId = !isHost ? resolveTargetPeerId('bingo', targetMatchId) : undefined

      const transport = new PeerJSTransport({
        role: lobbyRole,
        localPlayerId: hostPeerId,
        targetPeerId: resolvedTargetId,
        onIdCollision: () => {
          const newCode = generateRoomCode()
          return formatHostPeerId('bingo', newCode)
        },
      })

      const lobby = new LobbyCoordinator<BingoBoard>({
        transport,
        playerName: initialPlayerName,
        roomCode: initialCode,
        validateSetup: (board) => validateBingoBoard(board).valid,
        onMatchStart: (event) => {
          if (!activeRef.current) return
          const currentLobby = lobbyRef.current
          const local = currentLobby?.state.localPlayer
          const remote = currentLobby?.state.remotePlayer
          if (!currentLobby || !local || !remote) return

          const match = new BingoMatchCoordinator({
            transport,
            localPlayer: { id: local.id, name: local.name, role: local.role },
            remotePlayer: { id: remote.id, name: remote.name, role: remote.role },
            matchStartEvent: event,
            turnDurationSeconds: 30,
            onRematch: () => {
              BingoMatchCoordinator.clearCachedMatch()
              match.destroy()
              currentLobby.resetForRematch()
              setMatchCoordinator(null)
            },
          })
          setMatchCoordinator(match)
        },
        inviteUrlGenerator: (id) => {
          const origin = typeof window !== 'undefined' ? window.location.origin : ''
          return createGameInviteUrl(origin, 'bingo', id)
        },
      })

      lobbyRef.current = lobby
      return lobby
    },
    [initialPlayerName]
  )

  const createStrangerLobby = useCallback((result: StrangerMatchResult) => {
    const lobby = new LobbyCoordinator<BingoBoard>({
      transport: result.transport,
      playerName: result.strangerName,
      validateSetup: (board) => validateBingoBoard(board).valid,
      onMatchStart: (event) => {
        if (!activeRef.current) return
        const currentLobby = lobbyRef.current
        const local = currentLobby?.state.localPlayer
        const remote = currentLobby?.state.remotePlayer
        if (!currentLobby || !local || !remote) return

        const match = new BingoMatchCoordinator({
          transport: result.transport,
          localPlayer: { id: local.id, name: local.name, role: local.role },
          remotePlayer: { id: remote.id, name: remote.name, role: remote.role },
          matchStartEvent: event,
          turnDurationSeconds: 30,
          onRematch: () => {
            BingoMatchCoordinator.clearCachedMatch()
            match.destroy()
            currentLobby.resetForRematch()
            setMatchCoordinator(null)
          },
        })
        setMatchCoordinator(match)
      },
    })

    lobbyRef.current = lobby
    return lobby
  }, [])

  const [lobbyCoordinator, setLobbyCoordinator] = useState<LobbyCoordinator<BingoBoard>>(() => {
    return createFriendLobby(role, matchId)
  })

  matchCoordinatorRef.current = matchCoordinator

  // Cleanup helper
  const clearSearchTimer = () => {
    if (searchIntervalRef.current) {
      clearInterval(searchIntervalRef.current)
      searchIntervalRef.current = null
    }
  }

  // Cancel stranger search and return to normal friend lobby
  const returnToFriendLobby = useCallback(() => {
    clearSearchTimer()
    if (strangerMatchmakerRef.current) {
      const matchmaker = strangerMatchmakerRef.current
      strangerMatchmakerRef.current = null
      matchmaker.cancel()
    }
    if (lobbyRef.current) {
      lobbyRef.current.destroy()
      lobbyRef.current = null
    }
    setIsStrangerMatch(false)
    setScreenState({ mode: 'lobby' })
    const friendLobby = createFriendLobby(role, matchId)
    setLobbyCoordinator(friendLobby)
  }, [createFriendLobby, matchId, role])

  // Start stranger search flow
  const startStrangerSearch = useCallback(async () => {
    clearSearchTimer()

    // Destroy active friend lobby
    if (lobbyRef.current) {
      lobbyRef.current.destroy()
      lobbyRef.current = null
    }

    setScreenState({ mode: 'searching', elapsedSeconds: 0 })
    setIsStrangerMatch(true)

    // Start elapsed seconds counter
    searchIntervalRef.current = setInterval(() => {
      setScreenState((prev) => {
        if (prev.mode !== 'searching') return prev
        return { mode: 'searching', elapsedSeconds: (prev.elapsedSeconds ?? 0) + 1 }
      })
    }, 1000)

    const matchmaker = new StrangerMatchmaker({
      gameId: 'bingo',
    })
    strangerMatchmakerRef.current = matchmaker

    try {
      const matchResult = await matchmaker.findMatch()
      clearSearchTimer()
      if (strangerMatchmakerRef.current === matchmaker) {
        strangerMatchmakerRef.current = null
      }

      if (!activeRef.current) {
        matchResult.transport.disconnect()
        return
      }

      const strangerLobby = createStrangerLobby(matchResult)
      setLobbyCoordinator(strangerLobby)
      setScreenState({ mode: 'lobby' })
    } catch (err) {
      clearSearchTimer()
      const status = matchmaker.status
      if (strangerMatchmakerRef.current === matchmaker) {
        strangerMatchmakerRef.current = null
      }

      if (!activeRef.current) return

      if (status === 'timeout') {
        setScreenState({ mode: 'timeout' })
      } else if (status !== 'cancelled') {
        returnToFriendLobby()
      }
    }
  }, [createStrangerLobby, returnToFriendLobby])

  // Start lobby coordinator on mount / when coordinator changes
  useEffect(() => {
    activeRef.current = true
    lobbyRef.current = lobbyCoordinator
    lobbyCoordinator.start().catch(() => {})

    const handleBeforeUnload = () => {
      strangerMatchmakerRef.current?.cancel()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      activeRef.current = false
      window.removeEventListener('beforeunload', handleBeforeUnload)
      clearSearchTimer()
      if (strangerMatchmakerRef.current) {
        strangerMatchmakerRef.current.cancel()
        strangerMatchmakerRef.current = null
      }
      if (matchCoordinatorRef.current) {
        matchCoordinatorRef.current.destroy()
        matchCoordinatorRef.current = null
      }
      lobbyCoordinator.destroy()
      if (lobbyRef.current === lobbyCoordinator) {
        lobbyRef.current = null
      }
    }
  }, [lobbyCoordinator])

  const handleExit = () => {
    if (matchCoordinatorRef.current) {
      matchCoordinatorRef.current.destroy()
      matchCoordinatorRef.current = null
    }
    onExit()
  }

  if (screenState.mode === 'searching') {
    return (
      <div className={lobbyStyles.lobbyContainer}>
        <div className={lobbyStyles.searchingCard}>
          <div className={lobbyStyles.searchingRadar}>
            <div className={lobbyStyles.searchingIcon}>🎲</div>
          </div>
          <h2 className={lobbyStyles.searchingTitle}>Looking for a stranger…</h2>
          <p className={lobbyStyles.searchingSubtitle}>
            Scanning active slots for an open Bingo match.
          </p>
          <div className={lobbyStyles.elapsedPill}>
            Time elapsed: {formatElapsed(screenState.elapsedSeconds ?? 0)}
          </div>
          <button
            type="button"
            className={lobbyStyles.cancelSearchButton}
            onClick={returnToFriendLobby}
          >
            Cancel search
          </button>
        </div>
      </div>
    )
  }

  if (screenState.mode === 'timeout') {
    return (
      <div className={lobbyStyles.lobbyContainer}>
        <div className={lobbyStyles.searchingCard}>
          <div className={lobbyStyles.searchingIcon}>⏳</div>
          <h2 className={lobbyStyles.searchingTitle}>No opponents found yet</h2>
          <p className={lobbyStyles.searchingSubtitle}>
            We couldn’t find another player searching right now. Would you like to keep waiting or invite a friend?
          </p>
          <div className={lobbyStyles.timeoutActions}>
            <button
              type="button"
              className={lobbyStyles.keepWaitingButton}
              onClick={startStrangerSearch}
            >
              Keep waiting
            </button>
            <button
              type="button"
              className={lobbyStyles.inviteFriendButton}
              onClick={returnToFriendLobby}
            >
              Invite a friend instead
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (matchCoordinator) {
    return <BingoMatchplay coordinator={matchCoordinator} onExit={handleExit} />
  }

  return (
    <BingoMatchLobby
      session={lobbyCoordinator}
      onPlayStranger={startStrangerSearch}
      isStrangerMatch={isStrangerMatch}
      onExit={handleExit}
    />
  )
}
