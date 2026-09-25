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
import '../bingoTokens.css'

export interface BingoOnlineGameProps {
  role: PlayerRole
  matchId?: string
  initialPlayerName?: string
  onExit: () => void
}

/**
 * Stranger search runs in the background while the friend lobby stays up, so
 * a friend can still join by code or link. The lobby only switches over once a
 * stranger is actually paired.
 */
export type StrangerSearchState =
  | { status: 'idle' }
  | { status: 'searching'; elapsedSeconds: number }
  | { status: 'timeout' }

export const BingoOnlineGame: React.FC<BingoOnlineGameProps> = ({
  role,
  matchId,
  initialPlayerName,
  onExit,
}) => {
  const [strangerSearch, setStrangerSearch] = useState<StrangerSearchState>({ status: 'idle' })
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

  const clearSearchTimer = () => {
    if (searchIntervalRef.current) {
      clearInterval(searchIntervalRef.current)
      searchIntervalRef.current = null
    }
  }

  /** Stops a background stranger search. The friend lobby is left untouched. */
  const cancelStrangerSearch = useCallback(() => {
    clearSearchTimer()
    const matchmaker = strangerMatchmakerRef.current
    strangerMatchmakerRef.current = null
    matchmaker?.cancel()
    setStrangerSearch({ status: 'idle' })
  }, [])

  const startStrangerSearch = useCallback(async () => {
    if (strangerMatchmakerRef.current) return
    clearSearchTimer()

    setStrangerSearch({ status: 'searching', elapsedSeconds: 0 })
    searchIntervalRef.current = setInterval(() => {
      setStrangerSearch((prev) =>
        prev.status === 'searching' ? { status: 'searching', elapsedSeconds: prev.elapsedSeconds + 1 } : prev
      )
    }, 1000)

    const matchmaker = new StrangerMatchmaker({ gameId: 'bingo' })
    strangerMatchmakerRef.current = matchmaker

    try {
      const matchResult = await matchmaker.findMatch()
      if (strangerMatchmakerRef.current !== matchmaker || !activeRef.current) {
        matchResult.transport.disconnect()
        return
      }
      strangerMatchmakerRef.current = null
      clearSearchTimer()

      // Paired: the friend lobby (and its room code) is no longer needed.
      setIsStrangerMatch(true)
      setStrangerSearch({ status: 'idle' })
      setLobbyCoordinator(createStrangerLobby(matchResult))
    } catch {
      // Cancelled searches have already been cleared from the ref.
      if (strangerMatchmakerRef.current !== matchmaker) return
      strangerMatchmakerRef.current = null
      clearSearchTimer()
      if (!activeRef.current) return
      setStrangerSearch(matchmaker.status === 'timeout' ? { status: 'timeout' } : { status: 'idle' })
    }
  }, [createStrangerLobby])

  /** Leave the current room and join another one by its room code. */
  const joinRoomByCode = useCallback(
    (code: string) => {
      cancelStrangerSearch()
      setIsStrangerMatch(false)
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `/bingo?room=${encodeURIComponent(code)}`)
      }
      setLobbyCoordinator(createFriendLobby('guest', code))
    },
    [cancelStrangerSearch, createFriendLobby]
  )

  // A friend joining while we search for a stranger wins: stop searching.
  useEffect(() => {
    return lobbyCoordinator.subscribe(() => {
      if (lobbyCoordinator.state.remotePlayer?.connected && strangerMatchmakerRef.current) {
        cancelStrangerSearch()
      }
    })
  }, [lobbyCoordinator, cancelStrangerSearch])

  // Start lobby coordinator on mount / when coordinator changes
  useEffect(() => {
    activeRef.current = true
    lobbyRef.current = lobbyCoordinator
    lobbyCoordinator.start().catch(() => {})

    return () => {
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

  // Tear down any background search when leaving the page or unmounting.
  useEffect(() => {
    activeRef.current = true
    const handleBeforeUnload = () => {
      strangerMatchmakerRef.current?.cancel()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      activeRef.current = false
      window.removeEventListener('beforeunload', handleBeforeUnload)
      clearSearchTimer()
      strangerMatchmakerRef.current?.cancel()
      strangerMatchmakerRef.current = null
    }
  }, [])

  const handleExit = () => {
    if (matchCoordinatorRef.current) {
      matchCoordinatorRef.current.destroy()
      matchCoordinatorRef.current = null
    }
    onExit()
  }

  if (matchCoordinator) {
    return <BingoMatchplay coordinator={matchCoordinator} onExit={handleExit} />
  }

  return (
    <BingoMatchLobby
      session={lobbyCoordinator}
      onPlayStranger={startStrangerSearch}
      onCancelStranger={cancelStrangerSearch}
      strangerSearch={strangerSearch}
      onJoinRoomCode={joinRoomByCode}
      isStrangerMatch={isStrangerMatch}
      onExit={handleExit}
    />
  )
}
