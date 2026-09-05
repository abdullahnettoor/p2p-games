'use client'

import React, { useEffect, useRef, useState } from 'react'
import { PeerJSTransport } from '@/core/transport/PeerJSTransport'
import { LobbyCoordinator } from '@/core/lobby/LobbyCoordinator'
import { BingoBoard } from '../types'
import { validateBingoBoard } from '../engine'
import { BingoMatchLobby } from './BingoMatchLobby'
import { BingoMatchplay } from './BingoMatchplay'
import { BingoMatchCoordinator } from '../state/BingoMatchCoordinator'
import '../bingoTokens.css'

export interface BingoOnlineGameProps {
  role: 'host' | 'guest'
  matchId?: string
  onExit: () => void
}

export const BingoOnlineGame: React.FC<BingoOnlineGameProps> = ({ role, matchId, onExit }) => {
  const transportRef = useRef<PeerJSTransport | null>(null)
  const lobbyRef = useRef<LobbyCoordinator<BingoBoard> | null>(null)
  const matchCoordinatorRef = useRef<BingoMatchCoordinator | null>(null)
  const activeRef = useRef(true)
  const [matchCoordinator, setMatchCoordinator] = useState<BingoMatchCoordinator | null>(null)
  const [lobbyCoordinator] = useState<LobbyCoordinator<BingoBoard>>(() => {
    const transport = new PeerJSTransport({ role, targetPeerId: matchId })
    transportRef.current = transport

    const lobby = new LobbyCoordinator<BingoBoard>({
      transport,
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
        return `${origin}/bingo?match=${id}`
      },
    })

    lobbyRef.current = lobby
    return lobby
  })
  matchCoordinatorRef.current = matchCoordinator

  useEffect(() => {
    activeRef.current = true
    lobbyCoordinator.start().catch(() => {
      // LobbyCoordinator exposes the failure through state.error and its retry pill.
    })

    return () => {
      activeRef.current = false
      if (matchCoordinatorRef.current) {
        matchCoordinatorRef.current.destroy()
        matchCoordinatorRef.current = null
      }
      lobbyCoordinator.destroy()
      lobbyRef.current = null
      transportRef.current = null
    }
  }, [lobbyCoordinator])

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

  return <BingoMatchLobby session={lobbyCoordinator} onExit={handleExit} />
}
