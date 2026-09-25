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
import { BingoChoiceScreen } from './BingoChoiceScreen'
import { BingoJoinCodeScreen } from './BingoJoinCodeScreen'
import { BingoStrangerSearchScreen } from './BingoStrangerSearchScreen'
import { BingoMatchLobby } from './BingoMatchLobby'
import { BingoMatchplay } from './BingoMatchplay'
import { BingoMatchCoordinator } from '../state/BingoMatchCoordinator'
import { PlayerRole } from '@/core/games/types'
import '../bingoTokens.css'

export type BingoScreen =
  | 'choice'
  | 'create-room'
  | 'join-code'
  | 'guest-lobby'
  | 'stranger-search'
  | 'stranger-lobby'

export interface BingoOnlineGameProps {
  initialAction?: 'create' | 'join' | 'stranger' | null
  initialRoomCode?: string | null
  initialPlayerName?: string
  role?: PlayerRole
  matchId?: string
  onExit: () => void
}

function updateBrowserUrl(url: string) {
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', url)
  }
}

export const BingoOnlineGame: React.FC<BingoOnlineGameProps> = ({
  initialAction = null,
  initialRoomCode = null,
  initialPlayerName,
  role,
  matchId,
  onExit,
}) => {
  const initialTargetRoom = initialRoomCode || matchId || null

  const getInitialScreen = (): BingoScreen => {
    if (initialTargetRoom) return 'guest-lobby'
    if (initialAction === 'create' || (role === 'host' && !initialAction)) return 'create-room'
    if (initialAction === 'join') return 'join-code'
    if (initialAction === 'stranger') return 'stranger-search'
    return 'choice'
  }

  const [screen, setScreen] = useState<BingoScreen>(getInitialScreen)
  const [isStrangerMatch, setIsStrangerMatch] = useState(false)
  const [matchCoordinator, setMatchCoordinator] = useState<BingoMatchCoordinator | null>(null)
  const [strangerStatus, setStrangerStatus] = useState<'searching' | 'timeout'>('searching')
  const [strangerElapsed, setStrangerElapsed] = useState(0)
  const [joinCodeError, setJoinCodeError] = useState<string | null>(null)

  const activeRef = useRef(true)
  const lobbyRef = useRef<LobbyCoordinator<BingoBoard> | null>(null)
  const matchCoordinatorRef = useRef<BingoMatchCoordinator | null>(null)
  const strangerMatchmakerRef = useRef<StrangerMatchmaker | null>(null)
  const searchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearSearchTimer = () => {
    if (searchIntervalRef.current) {
      clearInterval(searchIntervalRef.current)
      searchIntervalRef.current = null
    }
  }

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

  const [lobbyCoordinator, setLobbyCoordinator] = useState<LobbyCoordinator<BingoBoard> | null>(() => {
    if (initialTargetRoom) {
      return createFriendLobby('guest', initialTargetRoom)
    }
    if (initialAction === 'create' || (role === 'host' && !initialAction)) {
      return createFriendLobby('host')
    }
    return null
  })

  matchCoordinatorRef.current = matchCoordinator

  // Lifecycle of lobbyCoordinator
  useEffect(() => {
    if (!lobbyCoordinator) return
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

  // Tear down on unmount or beforeunload
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

  const handleCreateRoom = useCallback(() => {
    clearSearchTimer()
    strangerMatchmakerRef.current?.cancel()
    strangerMatchmakerRef.current = null
    setIsStrangerMatch(false)
    setMatchCoordinator(null)
    updateBrowserUrl('/bingo?action=create')
    const lobby = createFriendLobby('host')
    setLobbyCoordinator(lobby)
    setScreen('create-room')
  }, [createFriendLobby])

  const handleOpenJoinCode = useCallback(() => {
    setLobbyCoordinator(null)
    setJoinCodeError(null)
    setScreen('join-code')
    updateBrowserUrl('/bingo')
  }, [])

  const handleJoinCodeSubmit = useCallback(
    (cleanCode: string) => {
      setIsStrangerMatch(false)
      setMatchCoordinator(null)
      updateBrowserUrl(`/bingo?room=${encodeURIComponent(cleanCode)}`)
      const lobby = createFriendLobby('guest', cleanCode)
      setLobbyCoordinator(lobby)
      setScreen('guest-lobby')
    },
    [createFriendLobby]
  )

  const handleTryAnotherCode = useCallback(() => {
    setLobbyCoordinator(null)
    setJoinCodeError(null)
    setScreen('join-code')
    updateBrowserUrl('/bingo')
  }, [])

  const cancelStrangerSearch = useCallback(() => {
    clearSearchTimer()
    const matchmaker = strangerMatchmakerRef.current
    strangerMatchmakerRef.current = null
    matchmaker?.cancel()
  }, [])

  const startStrangerSearch = useCallback(async () => {
    setLobbyCoordinator(null)
    clearSearchTimer()
    strangerMatchmakerRef.current?.cancel()
    strangerMatchmakerRef.current = null

    setStrangerStatus('searching')
    setStrangerElapsed(0)
    setScreen('stranger-search')
    updateBrowserUrl('/bingo')

    searchIntervalRef.current = setInterval(() => {
      setStrangerElapsed((prev) => prev + 1)
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
      setIsStrangerMatch(true)
      setLobbyCoordinator(createStrangerLobby(matchResult))
      setScreen('stranger-lobby')
    } catch {
      if (strangerMatchmakerRef.current !== matchmaker) return
      strangerMatchmakerRef.current = null
      clearSearchTimer()
      if (!activeRef.current) return
      setStrangerStatus('timeout')
    }
  }, [createStrangerLobby])

  const handleCancelStrangerSearch = useCallback(() => {
    cancelStrangerSearch()
    setScreen('choice')
    updateBrowserUrl('/bingo')
  }, [cancelStrangerSearch])

  const handleBackToChoice = useCallback(() => {
    if (matchCoordinatorRef.current) {
      matchCoordinatorRef.current.destroy()
      matchCoordinatorRef.current = null
      setMatchCoordinator(null)
    }
    setLobbyCoordinator(null)
    cancelStrangerSearch()
    setIsStrangerMatch(false)
    setScreen('choice')
    updateBrowserUrl('/bingo')
  }, [cancelStrangerSearch])

  // If initial action is "stranger", start search on mount
  useEffect(() => {
    if (initialAction === 'stranger') {
      startStrangerSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Matchplay screen
  if (matchCoordinator) {
    return <BingoMatchplay coordinator={matchCoordinator} onExit={handleBackToChoice} />
  }

  // 1. Choice screen
  if (screen === 'choice') {
    return (
      <BingoChoiceScreen
        onCreateRoom={handleCreateRoom}
        onJoinWithCode={handleOpenJoinCode}
        onPlayStranger={startStrangerSearch}
        onExit={onExit}
      />
    )
  }

  // 2. Join with code input screen
  if (screen === 'join-code') {
    return (
      <BingoJoinCodeScreen
        onJoin={handleJoinCodeSubmit}
        onBack={handleBackToChoice}
        initialError={joinCodeError}
      />
    )
  }

  // 3. Stranger search screen
  if (screen === 'stranger-search') {
    return (
      <BingoStrangerSearchScreen
        status={strangerStatus}
        elapsedSeconds={strangerElapsed}
        onCancel={handleCancelStrangerSearch}
        onSearchAgain={startStrangerSearch}
        onCreateRoomInstead={handleCreateRoom}
      />
    )
  }

  // 4. Lobby (host, guest, or stranger)
  if (lobbyCoordinator) {
    return (
      <BingoMatchLobby
        session={lobbyCoordinator}
        onExit={handleBackToChoice}
        onTryAnotherCode={screen === 'guest-lobby' ? handleTryAnotherCode : undefined}
        isStrangerMatch={isStrangerMatch}
      />
    )
  }

  return null
}
