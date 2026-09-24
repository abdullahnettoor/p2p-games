'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { PeerJSTransport } from '@/core/transport/PeerJSTransport'
import { TransportStatus } from '@/core/transport/types'
import { PlayerRole } from '@/core/games/types'
import {
  generateRoomCode,
  formatHostPeerId,
  resolveTargetPeerId,
  createGameInviteUrl,
} from '@/core/lobby/roomCode'
import { TicTacToeState } from '../types'
import { initState, applyMove, validateMove } from '../engine'
import { Wifi, WifiOff, Copy, Check, QrCode } from 'lucide-react'

export interface TicTacToeP2PProps {
  role: PlayerRole
  matchId?: string
}

export const TicTacToeP2P: React.FC<TicTacToeP2PProps> = ({ role, matchId }) => {
  const [status, setStatus] = useState<TransportStatus>('disconnected')
  const [localPeerId, setLocalPeerId] = useState<string>('')
  const [remotePeerId, setRemotePeerId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [game, setGame] = useState<TicTacToeState | null>(null)

  const transportRef = useRef<PeerJSTransport | null>(null)
  const gameRef = useRef<TicTacToeState | null>(null)
  gameRef.current = game

  const pingSentAtRef = useRef<number>(0)
  const startedAtRef = useRef<number>(0)

  const append = useCallback((msg: string) => {
    const elapsed = ((Date.now() - startedAtRef.current) / 1000).toFixed(1)
    setLogs((prev) => [...prev.slice(-30), `[+${elapsed}s] ${msg}`])
  }, [])

  const beginGame = useCallback(
    (local: string, remote: string, localRole: PlayerRole) => {
      const hostId = localRole === 'host' ? local : remote
      const guestId = localRole === 'host' ? remote : local
      setGame(initState({ hostId, guestId, startingPlayerId: hostId }))
    },
    []
  )

  useEffect(() => {
    startedAtRef.current = Date.now()
    let cancelled = false

    const isHost = role === 'host'
    const initialCode = isHost ? generateRoomCode() : undefined
    const hostPeerId = isHost && initialCode ? formatHostPeerId('tictactoe', initialCode) : undefined
    const resolvedTargetId = !isHost ? resolveTargetPeerId('tictactoe', matchId) : undefined

    const transport = new PeerJSTransport({
      role,
      localPlayerId: hostPeerId,
      targetPeerId: resolvedTargetId,
      onIdCollision: () => {
        const newCode = generateRoomCode()
        return formatHostPeerId('tictactoe', newCode)
      },
    })
    transportRef.current = transport

    const unsubs = [
      transport.onStatusChange((next) => {
        if (cancelled) return
        setStatus(next)
        append(`status -> ${next}`)
      }),
      transport.onPlayerJoin((peerId) => {
        if (cancelled) return
        setRemotePeerId(peerId)
        append(`peer joined: ${peerId}`)
        beginGame(transport.localPlayerId, peerId, role)
      }),
      transport.onPlayerLeave((peerId) => {
        if (cancelled) return
        append(`peer left: ${peerId}`)
        setRemotePeerId('')
      }),
      transport.onError((err) => {
        if (cancelled) return
        setError(err.message)
        append(`error: ${err.message}`)
      }),
      transport.onMessage((message) => {
        if (cancelled) return
        if (message.type === 'move') {
          const move = message.payload.move as { cellIndex: number }
          append(`recv move: cell ${move.cellIndex} from ${message.payload.playerId}`)
          setGame((prev: TicTacToeState | null) =>
            prev
              ? applyMove(prev, {
                  cellIndex: move.cellIndex,
                  playerId: message.payload.playerId,
                })
              : prev
          )
          return
        }
        if (message.type === 'reaction') {
          if (message.payload.emoji === 'ping') {
            append('recv ping -> replying pong')
            transport.send({
              type: 'reaction',
              payload: {
                emoji: 'pong',
                playerId: transport.localPlayerId,
                timestamp: Date.now(),
              },
            })
          } else if (message.payload.emoji === 'pong') {
            setLatencyMs(Date.now() - pingSentAtRef.current)
            append('recv pong')
          }
          return
        }
        append(`recv ${message.type}`)
      }),
    ]

    append(`connecting as ${role}${matchId ? ` -> host ${matchId}` : ''}`)

    transport
      .connect()
      .then((assignedId) => {
        if (cancelled) return
        setLocalPeerId(assignedId)
        append(`signaling open, local peer id: ${assignedId}`)
        if (transport.remotePlayerId) {
          setRemotePeerId(transport.remotePlayerId)
          beginGame(assignedId, transport.remotePlayerId, role)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
      })

    return () => {
      cancelled = true
      unsubs.forEach((unsub) => unsub())
      transport.disconnect()
      transportRef.current = null
    }
  }, [role, matchId, append, beginGame])

  const inviteUrl = useMemo(() => {
    if (role !== 'host' || !localPeerId) return ''
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return createGameInviteUrl(origin, 'tictactoe', localPeerId)
  }, [role, localPeerId])

  const handleCellClick = (cellIndex: number) => {
    const transport = transportRef.current
    const current = gameRef.current
    if (!transport || !current) return

    const move = { cellIndex, playerId: localPeerId }
    if (!validateMove(current, move).valid) return

    setGame(applyMove(current, move))
    transport.send({
      type: 'move',
      payload: { move, playerId: localPeerId, timestamp: Date.now() },
    })
    append(`sent move: cell ${cellIndex}`)
  }

  const handlePing = () => {
    const transport = transportRef.current
    if (!transport || status !== 'connected') return
    pingSentAtRef.current = Date.now()
    transport.send({
      type: 'reaction',
      payload: { emoji: 'ping', playerId: localPeerId, timestamp: Date.now() },
    })
    append('sent ping')
  }

  const handleCopy = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      append('failed to copy to clipboard')
    }
  }

  const isMyTurn = Boolean(
    game && game.status === 'active' && game.activePlayerId === localPeerId
  )

  const mySymbol = game ? game.marks[localPeerId] ?? null : null
  const winnerMark = game?.winnerId ? game.marks[game.winnerId] ?? null : null

  return (
    <div className="space-y-4 max-w-xl mx-auto p-4 bg-slate-900 text-slate-100 rounded-xl shadow-lg border border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          {status === 'connected' ? (
            <Wifi className="w-5 h-5 text-emerald-400" />
          ) : (
            <WifiOff className="w-5 h-5 text-amber-400 animate-pulse" />
          )}
          <span className="font-semibold capitalize text-sm">{role} Mode</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
              status === 'connected'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-amber-950 text-amber-300 border border-amber-800'
            }`}
          >
            {status}
          </span>
        </div>
        {latencyMs !== null && status === 'connected' && (
          <span className="text-xs font-mono text-slate-400">{latencyMs}ms RTT</span>
        )}
      </div>

      {error && (
        <div className="bg-rose-950/80 border border-rose-800 text-rose-200 p-3 rounded-lg text-sm flex flex-col gap-1">
          <span className="font-semibold">Connection Error</span>
          <span>{error}</span>
        </div>
      )}

      {role === 'host' && (
        <div className="bg-slate-800/60 p-3 rounded-lg space-y-2 border border-slate-700/60 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-300">Invite Guest to Match</span>
            {localPeerId && (
              <span className="text-slate-400 font-mono">
                Peer: <span className="text-slate-200">{localPeerId}</span>
              </span>
            )}
          </div>
          {inviteUrl ? (
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 font-mono select-all focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded font-medium transition-colors"
                title="Copy invite URL"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          ) : (
            <span className="text-slate-500 italic">Waiting for signaling server...</span>
          )}
        </div>
      )}

      {role === 'guest' && (
        <div className="bg-slate-800/60 p-2.5 rounded-lg text-xs flex justify-between items-center text-slate-400 border border-slate-700/60">
          <span>Connecting to host:</span>
          <span className="font-mono text-slate-200">{matchId ?? 'none specified'}</span>
        </div>
      )}

      <div className="my-4 flex flex-col items-center">
        {game && status === 'connected' ? (
          <div className="space-y-3 flex flex-col items-center">
            <div className="text-sm font-medium flex items-center gap-2">
              <span>You are</span>
              <span className="font-bold text-indigo-400 text-base">{mySymbol}</span>
              <span>-</span>
              {game.status === 'completed' ? (
                <span className="text-emerald-400 font-bold">
                  {game.isDraw ? "It's a Draw!" : `${winnerMark} Won!`}
                </span>
              ) : isMyTurn ? (
                <span className="text-emerald-400 font-semibold animate-pulse">Your Turn!</span>
              ) : (
                <span className="text-slate-400">Waiting for opponent...</span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 w-48 h-48 bg-slate-800 p-2 rounded-xl border border-slate-700">
              {game.board.map((cell, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  disabled={!isMyTurn || cell !== null || game.status === 'completed'}
                  className={`flex items-center justify-center text-2xl font-bold rounded-lg transition-all ${
                    cell === null && isMyTurn && game.status === 'active'
                      ? 'bg-slate-700 hover:bg-indigo-600/30 cursor-pointer active:scale-95'
                      : 'bg-slate-900/60'
                  } ${
                    cell === 'X'
                      ? 'text-indigo-400'
                      : cell === 'O'
                      ? 'text-emerald-400'
                      : 'text-transparent'
                  }`}
                >
                  {cell ?? '-'}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500 gap-2 text-sm">
            <QrCode className="w-8 h-8 opacity-40 animate-pulse" />
            <span>Waiting for both players to connect...</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handlePing}
          disabled={status !== 'connected'}
          className="flex-1 text-xs py-1.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 rounded border border-slate-700 transition-colors"
        >
          Send Test Ping
        </button>
      </div>

      <div className="border-t border-slate-800/80 pt-2">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Live Peer Log</span>
        <div className="mt-1 bg-slate-950 font-mono text-[11px] text-slate-400 p-2 rounded h-24 overflow-y-auto space-y-0.5 border border-slate-800">
          {logs.map((line, i) => (
            <div key={i} className="leading-tight">{line}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
