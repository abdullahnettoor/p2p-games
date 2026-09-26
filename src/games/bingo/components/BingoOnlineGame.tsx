'use client'

import React, { useState, useRef, useCallback } from 'react'
import { LobbyCoordinator } from '@/core/lobby/LobbyCoordinator'
import { PeerJSTransport } from '@/core/transport/PeerJSTransport'
import {
  generateRoomCode,
  formatHostPeerId,
  resolveTargetPeerId,
  createGameInviteUrl,
} from '@/core/lobby/roomCode'
import { StrangerMatchResult } from '@/core/matchmaking/strangerMatch'
import { BingoBoard } from '../types'
import { validateBingoBoard } from '../engine'
import { BingoChoiceScreen } from './BingoChoiceScreen'
import { BingoJoinCodeScreen } from './BingoJoinCodeScreen'
import { BingoStrangerSearchScreen } from './BingoStrangerSearchScreen'
import { BingoMatchLobby } from './BingoMatchLobby'
import { BingoMatchplay } from './BingoMatchplay'
import { BingoMatchCoordinator } from '../state/BingoMatchCoordinator'
import { PlayerRole } from '@/core/games/types'
import { useOnlineEntryFlow } from '@/components/entry'
import '../bingoTokens.css'

export type BingoScreen =
  | 'choice'
  | 'create-room'
  | 'join-code'
  | 'guest-lobby'
  | 'stranger-search'
  | 'stranger-lobby'

export interface BingoOnlineGameProps {
  initialAction?: 'create' | null
  initialRoomCode?: string | null
  initialMatchId?: string | null
  initialPlayerName?: string
  onExit: () => void
}

export const BingoOnlineGame: React.FC<BingoOnlineGameProps> = ({
  initialAction = null,
  initialRoomCode = null,
  initialMatchId = null,
  initialPlayerName,
  onExit,
}) => {
  const [matchCoordinator, setMatchCoordinator] = useState<BingoMatchCoordinator | null>(null)
  const activeRef = useRef(true)
  const lobbyCoordinatorRef = useRef<LobbyCoordinator<BingoBoard> | null>(null)

  const handleBackToChoiceRef = useRef<() => void>(() => {})
  const startStrangerSearchRef = useRef<() => void>(() => {})

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

      const lobby: LobbyCoordinator<BingoBoard> = new LobbyCoordinator<BingoBoard>({
        transport,
        playerName: initialPlayerName,
        roomCode: initialCode,
        validateSetup: (board) => validateBingoBoard(board).valid,
        onMatchStart: (event) => {
          if (!activeRef.current) return
          const currentLobby = lobbyCoordinatorRef.current
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
              setMatchCoordinator(null)
              createFriendLobby('host')
            },
          })
          setMatchCoordinator(match)
        },
        inviteUrlGenerator: (id) => {
          const origin = typeof window !== 'undefined' ? window.location.origin : ''
          return createGameInviteUrl(origin, 'bingo', id)
        },
      })

      lobbyCoordinatorRef.current = lobby
      return lobby
    },
    [initialPlayerName]
  )

  const createStrangerLobby = useCallback(
    (result: StrangerMatchResult) => {
      const lobby: LobbyCoordinator<BingoBoard> = new LobbyCoordinator<BingoBoard>({
        transport: result.transport,
        playerName: result.strangerName,
        validateSetup: (board) => validateBingoBoard(board).valid,
        onMatchStart: (event) => {
          if (!activeRef.current) return
          const currentLobby = lobbyCoordinatorRef.current
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
              setMatchCoordinator(null)
              startStrangerSearchRef.current()
            },
          })
          setMatchCoordinator(match)
        },
      })
      lobbyCoordinatorRef.current = lobby
      return lobby
    },
    []
  )

  const {
    screen,
    lobbyCoordinator,
    strangerStatus,
    strangerError,
    strangerElapsed,
    joinCodeError,
    handleCreateRoom,
    handleOpenJoinCode,
    handleJoinCodeSubmit,
    handleTryAnotherCode,
    startStrangerSearch,
    handleCancelStrangerSearch,
    handleBackToChoice,
  } = useOnlineEntryFlow<LobbyCoordinator<BingoBoard>>({
    gameId: 'bingo',
    initialAction,
    initialRoomCode,
    initialMatchId,
    createFriendLobby,
    createStrangerLobby,
    onExit,
  })

  handleBackToChoiceRef.current = handleBackToChoice
  startStrangerSearchRef.current = startStrangerSearch
  lobbyCoordinatorRef.current = lobbyCoordinator

  // 1. Active match screen
  if (matchCoordinator) {
    return (
      <BingoMatchplay
        coordinator={matchCoordinator}
        onExit={() => {
          BingoMatchCoordinator.clearCachedMatch()
          matchCoordinator.destroy()
          setMatchCoordinator(null)
          handleBackToChoice()
        }}
      />
    )
  }

  // 2. Choice screen
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

  // 3. Join with code input screen
  if (screen === 'join-code') {
    return (
      <BingoJoinCodeScreen
        onJoin={handleJoinCodeSubmit}
        onBack={handleBackToChoice}
        initialError={joinCodeError}
      />
    )
  }

  // 4. Stranger matchmaking searching screen
  if (screen === 'stranger-search') {
    return (
      <BingoStrangerSearchScreen
        status={strangerStatus}
        errorMessage={strangerError}
        elapsedSeconds={strangerElapsed}
        onCancel={handleCancelStrangerSearch}
        onSearchAgain={startStrangerSearch}
        onCreateRoomInstead={handleCreateRoom}
      />
    )
  }

  // 5. Lobby screen (Host room, Guest room, or Stranger lobby)
  if (lobbyCoordinator) {
    return (
      <BingoMatchLobby
        session={lobbyCoordinator}
        onExit={handleBackToChoice}
        onTryAnotherCode={screen === 'guest-lobby' ? handleTryAnotherCode : undefined}
      />
    )
  }

  return (
    <BingoChoiceScreen
      onCreateRoom={handleCreateRoom}
      onJoinWithCode={handleOpenJoinCode}
      onPlayStranger={startStrangerSearch}
      onExit={onExit}
    />
  )
}
