'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ITransport } from '@/core/transport/types'
import { PeerJSTransport } from '@/core/transport/PeerJSTransport'
import { LobbyCoordinator } from '@/core/lobby/LobbyCoordinator'
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
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './BingoMatchLobby.module.css'
import '../bingoTokens.css'

export interface BingoOnlineGameProps {
  role: 'host' | 'guest'
  matchId?: string
  onExit: () => void
}

type OnlineScreenState =
  | { mode: 'lobby' }
  | { mode: 'searching'; elapsedSeconds: number }
  | { mode: 'timeout' }

function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export const BingoOnlineGame: React.FC<BingoOnlineGameProps> = ({ role, matchId, onExit }) => {
  const activeRef = useRef(true)
  const lobbyRef = useRef<LobbyCoordinator<BingoBoard> | null>(null)
  const matchCoordinatorRef = useRef<BingoMatchCoordinator | null>(null)
  const strangerMatchmakerRef = useRef<StrangerMatchmaker | null>(null)
  const searchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [screenState, setScreenState] = useState<OnlineScreenState>({ mode: 'lobby' })
  const [isStrangerMatch, setIsStrangerMatch] = useState(false)
  const [matchCoordinator, setMatchCoordinator] = useState<BingoMatchCoordinator | null>(null)

  const createFriendLobby = useCallback((targetRole: 'host' | 'guest', targetMatchId?: string) => {
    const isHost = targetRole === 'host'
    const initialCode = isHost ? generateRoomCode() : undefined
    const hostPeerId = isHost && initialCode ? formatHostPeerId('bingo', initialCode) : undefined
    const resolvedTargetId = !isHost ? resolveTargetPeerId('bingo', targetMatchId) : undefined

    const transport = new PeerJSTransport({
      role: targetRole,
      localPlayerId: hostPeerId,
      targetPeerId: resolvedTargetId,
      onIdCollision: () => {
        const newCode = generateRoomCode()
        return formatHostPeerId('bingo', newCode)
      },
    })

    const lobby = new LobbyCoordinator<BingoBoard>({
      transport,
      roomCode: initialCode,
      validateSetup: (board) => validateBingoBoard(board).valid,
      onMatchStart: (event) => {
        if (!activeRef.current) return

        const currentLobby = lobbyRef.current
        const local = currentLobby?.state.localPlayer
        const remote = currentLobby?.state.remotePlayer
        if (!currentLobby || !local || !remote) return

        const match: BingoMatchCoordinator = new BingoMatchCoordinator({
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
  }, [])

  const createStrangerLobby = useCallback((matchResult: StrangerMatchResult) => {
    const transport = matchResult.transport

    const lobby = new LobbyCoordinator<BingoBoard>({
      transport,
      playerName: matchResult.strangerName,
      validateSetup: (board) => validateBingoBoard(board).valid,
      onMatchStart: (event) => {
        if (!activeRef.current) return

        const currentLobby = lobbyRef.current
        const local = currentLobby?.state.localPlayer
        const remote = currentLobby?.state.remotePlayer
        if (!currentLobby || !local || !remote) return

        const match: BingoMatchCoordinator = new BingoMatchCoordinator({
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
      strangerMatchmakerRef.current.cancel()
      strangerMatchmakerRef.current = null
    }
    setIsStrangerMatch(false)
    setScreenState({ mode: 'lobby' })
    const friendLobby = createFriendLobby(role, matchId)
    setLobbyCoordinator(friendLobby)
    friendLobby.start().catch(() => {})
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
        return { mode: 'searching', elapsedSeconds: prev.elapsedSeconds + 1 }
      })
    }, 1000)

    const matchmaker = new StrangerMatchmaker({
      gameId: 'bingo',
    })
    strangerMatchmakerRef.current = matchmaker

    try {
      const matchResult = await matchmaker.findMatch()
      clearSearchTimer()
      strangerMatchmakerRef.current = null

      if (!activeRef.current) {
        matchResult.transport.disconnect()
        return
      }

      const strangerLobby = createStrangerLobby(matchResult)
      setLobbyCoordinator(strangerLobby)
      setScreenState({ mode: 'lobby' })
      await strangerLobby.start()
    } catch (err) {
      clearSearchTimer()
      const status = strangerMatchmakerRef.current?.status
      strangerMatchmakerRef.current = null

      if (!activeRef.current) return

      if (status === 'timeout') {
        setScreenState({ mode: 'timeout' })
      } else if (status !== 'cancelled') {
        returnToFriendLobby()
      }
    }
  }, [createStrangerLobby, returnToFriendLobby])

  // Start initial friend lobby on mount
  useEffect(() => {
    activeRef.current = true
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
      lobbyRef.current = null
    }
  }, [lobbyCoordinator])

  const handleExit = () => {
    clearSearchTimer()
    if (strangerMatchmakerRef.current) {
      strangerMatchmakerRef.current.cancel()
      strangerMatchmakerRef.current = null
    }
    if (matchCoordinatorRef.current) {
      matchCoordinatorRef.current.destroy()
      matchCoordinatorRef.current = null
    }
    onExit()
  }

  // Render matchplay if active
  if (matchCoordinator) {
    return <BingoMatchplay coordinator={matchCoordinator} onExit={handleExit} />
  }

  // Render searching screen
  if (screenState.mode === 'searching') {
    return (
      <div className={cn('bingoTokenScope', styles.lobbySurface)}>
        <div className={styles.lobbyInner}>
          <header className={styles.utilityBar}>
            <button
              type="button"
              onClick={returnToFriendLobby}
              className={styles.utilityButton}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Cancel</span>
            </button>
            <h1 className={styles.shellTitle}>BINGO</h1>
            <span aria-hidden="true" />
          </header>

          <div className={styles.searchingCard}>
            <div className={styles.searchingRadar}>
              <Loader2 className={cn('h-10 w-10 animate-spin', styles.searchingIcon)} aria-hidden="true" />
            </div>
            <h2 className={styles.searchingTitle}>Looking for a stranger…</h2>
            <p className={styles.searchingSubtitle}>
              Matching you with another player looking for a game of Bingo.
            </p>
            <div className={styles.elapsedPill} role="timer" aria-label="Search time elapsed">
              Time elapsed: <strong>{formatElapsed(screenState.elapsedSeconds)}</strong>
            </div>
            <button
              type="button"
              onClick={returnToFriendLobby}
              className={styles.cancelSearchButton}
            >
              Cancel search
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render timeout screen
  if (screenState.mode === 'timeout') {
    return (
      <div className={cn('bingoTokenScope', styles.lobbySurface)}>
        <div className={styles.lobbyInner}>
          <header className={styles.utilityBar}>
            <button
              type="button"
              onClick={returnToFriendLobby}
              className={styles.utilityButton}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Back</span>
            </button>
            <h1 className={styles.shellTitle}>BINGO</h1>
            <span aria-hidden="true" />
          </header>

          <div className={styles.searchingCard}>
            <h2 className={styles.searchingTitle}>No opponents found yet</h2>
            <p className={styles.searchingSubtitle}>
              Nobody joined the matchmaking queue in the last minute. You can keep waiting or invite a friend.
            </p>
            <div className={styles.timeoutActions}>
              <button
                type="button"
                onClick={startStrangerSearch}
                className={styles.keepWaitingButton}
              >
                Keep waiting
              </button>
              <button
                type="button"
                onClick={returnToFriendLobby}
                className={styles.inviteFriendButton}
              >
                Invite a friend instead
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render standard lobby (or stranger lobby once matched)
  return (
    <BingoMatchLobby
      session={lobbyCoordinator}
      isStrangerMatch={isStrangerMatch}
      onPlayStranger={startStrangerSearch}
      onExit={handleExit}
    />
  )
}
