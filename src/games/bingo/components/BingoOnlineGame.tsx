'use client'

import React, { useEffect, useState, useRef } from 'react'
import { PeerJSTransport } from '@/core/transport/PeerJSTransport'
import { LobbyCoordinator } from '@/core/lobby/LobbyCoordinator'
import { MatchStartEvent } from '@/core/lobby/types'
import { BingoBoard } from '../types'
import { validateBingoBoard } from '../engine'
import { BingoMatchLobby } from './BingoMatchLobby'
import { BingoMatchplay } from './BingoMatchplay'
import { BingoMatchCoordinator } from '../state/BingoMatchCoordinator'
import { Loader2, AlertCircle } from 'lucide-react'

export interface BingoOnlineGameProps {
  role: 'host' | 'guest'
  matchId?: string
  onExit: () => void
}

export const BingoOnlineGame: React.FC<BingoOnlineGameProps> = ({
  role,
  matchId,
  onExit,
}) => {
  const [lobbyCoordinator, setLobbyCoordinator] = useState<LobbyCoordinator<BingoBoard> | null>(null)
  const [matchCoordinator, setMatchCoordinator] = useState<BingoMatchCoordinator | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const transportRef = useRef<PeerJSTransport | null>(null)
  const matchCoordinatorRef = useRef<BingoMatchCoordinator | null>(null)
  matchCoordinatorRef.current = matchCoordinator

  useEffect(() => {
    return () => {
      if (matchCoordinatorRef.current) {
        matchCoordinatorRef.current.destroy()
        matchCoordinatorRef.current = null
      }
    }
  }, [])

  const handleExit = () => {
    if (matchCoordinatorRef.current) {
      matchCoordinatorRef.current.destroy()
      matchCoordinatorRef.current = null
    }
    onExit()
  }

  useEffect(() => {
    let active = true

    const transport = new PeerJSTransport({
      role,
      targetPeerId: matchId,
    })
    transportRef.current = transport

    const lobby = new LobbyCoordinator<BingoBoard>({
      transport,
      validateSetup: (board) => validateBingoBoard(board).valid,
      onMatchStart: (event) => {
        if (!active) return

        const local = lobby.state.localPlayer
        const remote = lobby.state.remotePlayer
        if (remote) {
          const match = new BingoMatchCoordinator({
            transport,
            localPlayer: { id: local.id, name: local.name, role: local.role },
            remotePlayer: { id: remote.id, name: remote.name, role: remote.role },
            matchStartEvent: event,
            turnDurationSeconds: 30,
          })
          setMatchCoordinator(match)
        }
      },
      inviteUrlGenerator: (id) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : ''
        return `${origin}/bingo?match=${id}`
      },
    })

    lobby
      .start()
      .then(() => {
        if (active) {
          setLobbyCoordinator(lobby)
        }
      })
      .catch((err) => {
        if (active) {
          setInitError(err instanceof Error ? err.message : 'Failed to connect to signaling service')
        }
      })

    return () => {
      active = false
      lobby.destroy()
      if (transportRef.current) {
        transportRef.current.disconnect()
        transportRef.current = null
      }
    }
  }, [role, matchId])

  if (initError) {
    return (
      <div className="max-w-md mx-auto p-6 rounded-3xl bg-red-950/40 border border-red-800/60 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Connection Failed</h3>
          <p className="text-xs text-red-300 leading-relaxed">{initError}</p>
        </div>
        <button
          type="button"
          onClick={handleExit}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
        >
          Return to Hub
        </button>
      </div>
    )
  }

  if (matchCoordinator) {
    return <BingoMatchplay coordinator={matchCoordinator} onExit={handleExit} />
  }

  if (!lobbyCoordinator) {
    return (
      <div className="max-w-md mx-auto p-12 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">
            {role === 'host' ? 'Generating Match Lobby...' : 'Connecting to Host Match...'}
          </h3>
          <p className="text-xs text-slate-400">
            Establishing secure WebRTC signaling...
          </p>
        </div>
      </div>
    )
  }

  return <BingoMatchLobby session={lobbyCoordinator} onExit={handleExit} />
}
