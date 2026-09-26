'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { LobbyCoordinator } from '@/core/lobby/LobbyCoordinator'
import { MatchStartEvent } from '@/core/lobby/types'
import { createResumeTransport, isResumable } from '@/core/lobby/resume'
import { PeerJSTransport } from '@/core/transport/PeerJSTransport'
import { ITransport } from '@/core/transport/types'
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
import { TicTacToeMatchplay } from './TicTacToeMatchplay'
import { TicTacToeMatchCoordinator } from '../state/TicTacToeMatchCoordinator'
import { ticTacToeRules } from '../rules'
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
  const [matchCoordinator, setMatchCoordinator] = useState<TicTacToeMatchCoordinator | null>(null)
  const activeRef = useRef(true)
  const lobbyCoordinatorRef = useRef<LobbyCoordinator<null> | null>(null)

  useEffect(() => {
    activeRef.current = true
    return () => {
      activeRef.current = false
    }
  }, [])

  // After a reload, a recent friend Match in the cache is resumed instead of
  // showing the entry screens (ADR 0005).
  const [resumeCache] = useState(() => {
    const cached = TicTacToeMatchCoordinator.peekCachedMatch()
    return isResumable(cached) ? cached : null
  })
  const resumeTransportRef = useRef<ITransport | null>(null)

  useEffect(() => {
    if (!resumeCache) return
    const transport = createResumeTransport(resumeCache)
    resumeTransportRef.current = transport
    const match = new TicTacToeMatchCoordinator(
      TicTacToeMatchCoordinator.resumeOptions(resumeCache, transport)
    )
    setMatchCoordinator(match)
    // If this fails, the reconnect grace runs out and the Match ends.
    transport.connect().catch((err) => console.warn('[TicTacToe] resume connect failed:', err))
    return () => {
      match.destroy()
      transport.disconnect()
      resumeTransportRef.current = null
    }
  }, [resumeCache])

  // Turn a lobby's match_start into a live Match. The Series length and the
  // first starter come from the Host's match_start, so both peers agree.
  const startMatch = useCallback((transport: ITransport, event: MatchStartEvent<null>) => {
    if (!activeRef.current) return
    const lobby = lobbyCoordinatorRef.current
    const local = lobby?.state.localPlayer
    const remote = lobby?.state.remotePlayer
    if (!local || !remote) return

    setMatchCoordinator(
      new TicTacToeMatchCoordinator({
        transport,
        localPlayer: { id: local.id, name: local.name, role: local.role },
        remotePlayer: { id: remote.id, name: remote.name, role: remote.role },
        bestOf: event.seriesLength ?? 3,
        startingPlayerId: event.startingPlayerId,
        turnDurationSeconds: 15,
        onRematch: () => {
          TicTacToeMatchCoordinator.clearCachedMatch()
        },
      })
    )
  }, [])

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
        onMatchStart: (event) => startMatch(transport, event),
        inviteUrlGenerator: (id) => {
          const origin = typeof window !== 'undefined' ? window.location.origin : ''
          return createGameInviteUrl(origin, 'tictactoe', id)
        },
      })

      lobbyCoordinatorRef.current = lobby
      return lobby
    },
    [initialPlayerName, startMatch]
  )

  const defaultCreateStrangerLobby = useCallback(
    (result: StrangerMatchResult) => {
      const lobby = new LobbyCoordinator<null>({
        transport: result.transport,
        playerName: result.strangerName,
        validateSetup: () => true,
        initialSeriesLength: 3, // Strangers always play Best of 3
        onMatchStart: (event) => startMatch(result.transport, event),
      })

      lobbyCoordinatorRef.current = lobby
      return lobby
    },
    [startMatch]
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
    // Explicit nulls stop the entry flow reading ?room=/?match= while resuming.
    initialAction: resumeCache ? null : initialAction,
    initialRoomCode: resumeCache ? null : initialRoomCode,
    initialMatchId: resumeCache ? null : initialMatchId,
  })

  const handleExitFlow = () => {
    if (onExit) {
      onExit()
    } else if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  }

  // Active Match
  if (matchCoordinator) {
    return (
      <TicTacToeMatchplay
        coordinator={matchCoordinator}
        onExit={() => {
          TicTacToeMatchCoordinator.clearCachedMatch()
          matchCoordinator.destroy()
          resumeTransportRef.current?.disconnect()
          setMatchCoordinator(null)
          // Leaving a Match returns to the Catalog; unmounting tears down the lobby.
          handleExitFlow()
        }}
      />
    )
  }

  // Resuming after a reload: the coordinator is created in an effect
  if (resumeCache) {
    return (
      <div className="tttTokenScope" role="status" data-testid="ttt-resuming">
        Reconnecting to your match…
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
