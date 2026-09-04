'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { PeerJSTransport } from '@/core/transport/PeerJSTransport'
import { LobbySession } from '@/core/lobby/LobbySession'
import { MatchStartEvent } from '@/core/lobby/types'
import { BingoBoard } from '../types'
import { validateBingoBoard } from '../engine'
import { BingoMatchLobby } from './BingoMatchLobby'
import { Loader2, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react'

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
  const [session, setSession] = useState<LobbySession<BingoBoard> | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [matchStartData, setMatchStartData] = useState<MatchStartEvent<BingoBoard> | null>(null)

  useEffect(() => {
    let active = true

    const transport = new PeerJSTransport({
      role,
      targetPeerId: matchId,
    })

    const lobby = new LobbySession<BingoBoard>({
      transport,
      validateSetup: (board) => validateBingoBoard(board).valid,
      onMatchStart: (event) => {
        if (active) {
          setMatchStartData(event)
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
          setSession(lobby)
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
          onClick={onExit}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
        >
          Return to Hub
        </button>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto p-12 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">
            {role === 'host' ? 'Generating Match Lobby...' : 'Connecting to Host Match...'}
          </h3>
          <p className="text-xs text-slate-400">
            Establishing secure WebRTC peer signaling...
          </p>
        </div>
      </div>
    )
  }

  // If match started, show start banner (Issue 03 will plug live gameplay reducer here)
  if (matchStartData) {
    const isLocalStarting = matchStartData.startingPlayerId === session.state.localPlayer.id
    return (
      <div className="max-w-md mx-auto p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center mx-auto text-white shadow-lg">
          <Sparkles className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Lobby Synchronized!
          </span>
          <h2 className="text-2xl font-black text-white">Match Ready To Begin!</h2>
          <p className="text-xs text-slate-400">
            {isLocalStarting
              ? "🎲 You won the coin toss! You take the first turn."
              : "🎲 Opponent won the coin toss! They take the first turn."}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left text-xs space-y-2">
          <div className="flex justify-between text-slate-400">
            <span>Host:</span>
            <span className="font-bold text-white">{session.state.localPlayer.role === 'host' ? session.state.localPlayer.name : session.state.remotePlayer?.name}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Guest:</span>
            <span className="font-bold text-white">{session.state.localPlayer.role === 'guest' ? session.state.localPlayer.name : session.state.remotePlayer?.name}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>First Turn:</span>
            <span className="font-bold text-amber-400">
              {isLocalStarting ? session.state.localPlayer.name : session.state.remotePlayer?.name}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onExit}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
        >
          Exit Match
        </button>
      </div>
    )
  }

  return <BingoMatchLobby session={session} onExit={onExit} />
}
