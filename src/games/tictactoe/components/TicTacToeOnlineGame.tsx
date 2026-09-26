'use client'

import React, { useState, useRef, useCallback } from 'react'
import { LobbyCoordinator } from '@/core/lobby/LobbyCoordinator'
import { MatchStartEvent } from '@/core/lobby/types'
import { PeerJSTransport } from '@/core/transport/PeerJSTransport'
import {
  generateRoomCode,
  formatHostPeerId,
  resolveTargetPeerId,
  createGameInviteUrl,
} from '@/core/lobby/roomCode'
import { StrangerMatchResult } from '@/core/matchmaking/strangerMatch'
import { PlayerRole } from '@/core/games/types'
import {
  useOnlineEntryFlow,
  ChoiceScreen,
  JoinCodeScreen,
  StrangerSearchScreen,
} from '@/components/entry'
import { TicTacToeMatchLobby } from './TicTacToeMatchLobby'
import { ticTacToeRules } from '../rules'
import { ArrowLeft } from 'lucide-react'
import '../ticTacToeTokens.css'

export interface TicTacToeOnlineGameProps {
  initialAction?: 'create' | null
  initialRoomCode?: string | null
  initialMatchId?: string | null
  initialPlayerName?: string
  onExit?: () => void
  createFriendLobbyOverride?: (role: PlayerRole, targetMatchId?: string) => LobbyCoordinator<null>
  createStrangerLobbyOverride?: (result: StrangerMatchResult) => LobbyCoordinator<null>
}

export const TicTacToeOnlineGame: React.FC<TicTacToeOnlineGameProps> = ({
  initialAction,
  initialRoomCode,
  initialMatchId,
  initialPlayerName,
  onExit,
  createFriendLobbyOverride,
  createStrangerLobbyOverride,
}) => {
  const [activeMatchEvent, setActiveMatchEvent] = useState<MatchStartEvent<null> | null>(null)
  const activeRef = useRef(true)
  const lobbyCoordinatorRef = useRef<LobbyCoordinator<null> | null>(null)

  const defaultCreateFriendLobby = useCallback(
    (lobbyRole: PlayerRole, targetMatchId?: string) => {
      const isHost = lobbyRole === 'host'
      const initialCode = isHost ? generateRoomCode() : undefined
      const hostPeerId = isHost && initialCode ? formatHostPeerId('tictactoe', initialCode) : undefined
      const resolvedTargetId = !isHost ? resolveTargetPeerId('tictactoe', targetMatchId) : undefined

      const transport = new PeerJSTransport({
        role: lobbyRole,
        localPlayerId: hostPeerId,
        targetPeerId: resolvedTargetId,
        onIdCollision: () => {
          const newCode = generateRoomCode()
          return formatHostPeerId('tictactoe', newCode)
        },
      })

      const lobby = new LobbyCoordinator<null>({
        transport,
        playerName: initialPlayerName,
        roomCode: initialCode,
        validateSetup: () => true,
        onMatchStart: (event) => {
          if (!activeRef.current) return
          setActiveMatchEvent(event)
        },
        inviteUrlGenerator: (id) => {
          const origin = typeof window !== 'undefined' ? window.location.origin : ''
          return createGameInviteUrl(origin, 'tictactoe', id)
        },
      })

      lobbyCoordinatorRef.current = lobby
      return lobby
    },
    [initialPlayerName]
  )

  const defaultCreateStrangerLobby = useCallback(
    (result: StrangerMatchResult) => {
      const lobby = new LobbyCoordinator<null>({
        transport: result.transport,
        playerName: result.strangerName,
        validateSetup: () => true,
        initialSeriesLength: 3, // Strangers always play Best of 3
        onMatchStart: (event) => {
          if (!activeRef.current) return
          setActiveMatchEvent(event)
        },
      })

      lobbyCoordinatorRef.current = lobby
      return lobby
    },
    []
  )

  const createFriendLobby = createFriendLobbyOverride ?? defaultCreateFriendLobby
  const createStrangerLobby = createStrangerLobbyOverride ?? defaultCreateStrangerLobby

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
  } = useOnlineEntryFlow<LobbyCoordinator<null>>({
    gameId: 'tictactoe',
    createFriendLobby,
    createStrangerLobby,
    initialAction,
    initialRoomCode,
    initialMatchId,
  })

  const handleExitFlow = () => {
    if (onExit) {
      onExit()
    } else if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  // Active match play (Series match started)
  if (activeMatchEvent) {
    return (
      <div
        className="tttTokenScope flex flex-col items-center justify-center min-h-[100dvh] p-4 text-center"
        data-testid="tictactoe-match-started"
      >
        <div className="max-w-md w-full p-6 bg-[var(--ttt-paper-raised)] border border-[var(--ttt-rule-soft)] rounded-xl shadow-lg space-y-4">
          <h2 className="text-2xl font-black text-[var(--ttt-pencil)]">Match Started!</h2>
          <p className="text-sm text-[var(--ttt-ink-muted)]">
            Series format: <strong className="text-[var(--ttt-host-ink)]">Best of {activeMatchEvent.seriesLength ?? 3}</strong>
          </p>
          <p className="text-xs text-[var(--ttt-ink-muted)]">
            Host: {activeMatchEvent.hostId} • Guest: {activeMatchEvent.guestId}
          </p>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-sm font-semibold rounded-lg bg-[var(--ttt-host-ink)] text-white hover:opacity-90 transition-opacity"
            onClick={() => {
              setActiveMatchEvent(null)
              handleBackToChoice()
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Lobby</span>
          </button>
        </div>
      </div>
    )
  }

  // Connected to lobby
  if (lobbyCoordinator && (screen === 'create-room' || screen === 'guest-lobby' || screen === 'stranger-lobby')) {
    return (
      <TicTacToeMatchLobby
        session={lobbyCoordinator}
        isStrangerMatch={screen === 'stranger-lobby'}
        onExit={handleBackToChoice}
        onTryAnotherCode={screen === 'guest-lobby' ? handleTryAnotherCode : undefined}
      />
    )
  }

  // Join code screen
  if (screen === 'join-code') {
    return (
      <JoinCodeScreen
        className="tttTokenScope"
        gameId="tictactoe"
        gameTitle="TIC-TAC-TOE"
        onJoin={handleJoinCodeSubmit}
        onBack={handleBackToChoice}
        initialError={joinCodeError}
        rules={ticTacToeRules}
      />
    )
  }

  // Stranger matchmaking search screen
  if (screen === 'stranger-search') {
    return (
      <StrangerSearchScreen
        className="tttTokenScope"
        gameId="tictactoe"
        gameTitle="TIC-TAC-TOE"
        status={strangerStatus}
        errorMessage={strangerError}
        elapsedSeconds={strangerElapsed}
        onCancel={handleCancelStrangerSearch}
        onSearchAgain={startStrangerSearch}
        onCreateRoomInstead={handleCreateRoom}
        rules={ticTacToeRules}
      />
    )
  }

  // Choice screen (default)
  return (
    <ChoiceScreen
      className="tttTokenScope"
      gameId="tictactoe"
      gameTitle="TIC-TAC-TOE"
      heading="Play Tic-Tac-Toe"
      subheading="Two-player classic notebook game with peer-to-peer connection."
      onCreateRoom={handleCreateRoom}
      onJoinWithCode={handleOpenJoinCode}
      onPlayStranger={startStrangerSearch}
      onExit={handleExitFlow}
      rules={ticTacToeRules}
    />
  )
}
