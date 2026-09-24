'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PeerJSTransport } from '@/core/transport/PeerJSTransport'
import { TransportStatus } from '@/core/transport/types'
import { PlayerRole } from '@/core/games/types'
import {
  generateRoomCode,
  formatHostPeerId,
  resolveTargetPeerId,
  createGameInviteUrl,
  extractRoomCode,
} from '@/core/lobby/roomCode'
import { applyMove, initState, serializeBoard, validateMove } from '../engine'
import { TicTacToeState } from '../types'

export interface TicTacToeP2PProps {
  role: PlayerRole
  matchId?: string
}

interface LogEntry {
  atMs: number
  label: string
}

const STATUS_STYLES: Record<TransportStatus, string> = {
  disconnected: 'bg-slate-800 text-slate-300 border-slate-700',
  connecting: 'bg-amber-950 text-amber-300 border-amber-800',
  connected: 'bg-emerald-950 text-emerald-300 border-emerald-800',
  reconnecting: 'bg-amber-950 text-amber-300 border-amber-800',
  closed: 'bg-red-950 text-red-300 border-red-800',
}

/**
 * Connectivity proof-of-concept. Talks to PeerJSTransport directly with no
 * lobby/coordinator layer in between, so a failure here isolates to the SDK and
 * signaling path rather than to game wiring.
 */
export const TicTacToeP2P: React.FC<TicTacToeP2PProps> = ({ role, matchId }) => {
  const [status, setStatus] = useState<TransportStatus>('disconnected')
  const [localPeerId, setLocalPeerId] = useState<string>('')
  const [remotePeerId, setRemotePeerId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [game, setGame] = useState<TicTacToeState | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)

  const transportRef = useRef<PeerJSTransport | null>(null)
  const gameRef = useRef<TicTacToeState | null>(null)
  const startedAtRef = useRef<number>(0)
  const pingSentAtRef = useRef<number>(0)
  gameRef.current = game

  const append = useCallback((label: string) => {
    setLog((prev) => [...prev, { atMs: Date.now() - startedAtRef.current, label }])
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

    const initialHostId = role === 'host' ? formatHostPeerId('tictactoe', generateRoomCode()) : undefined
    const resolvedTargetId =
      role === 'guest' && matchId ? resolveTargetPeerId('tictactoe', matchId) : undefined

    const transport = new PeerJSTransport({
      role,
      localPlayerId: initialHostId,
      targetPeerId: resolvedTargetId,
      onIdCollision:
        role === 'host'
          ? () => formatHostPeerId('tictactoe', generateRoomCode())
          : undefined,
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
          setGame((prev) =>
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
    return createGameInviteUrl(origin, '/tictactoe', localPeerId)
  }, [role, localPeerId])

  const roomCode = useMemo(() => {
    return extractRoomCode(localPeerId)
  }, [localPeerId])

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
    if (!transport || transport.status !== 'connected') return
    pingSentAtRef.current = Date.now()
    setLatencyMs(null)
    transport.send({
      type: 'reaction',
      payload: { emoji: 'ping', playerId: localPeerId, timestamp: Date.now() },
    })
    append('sent ping')
  }

  const isMyTurn = Boolean(game && game.status === 'active' && game.activePlayerId === localPeerId)
  const myMark = game?.marks[localPeerId] ?? (role === 'host' ? 'X' : 'O')

  const result = !game
    ? ''
    : game.status !== 'completed'
      ? ''
      : game.isDraw
        ? 'draw'
        : game.winnerId === localPeerId
          ? 'you-win'
          : 'you-lose'

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-black text-white">Tic-Tac-Toe · Connectivity POC</h1>
        <p className="text-xs text-slate-400">
          Drives <code className="text-slate-300">PeerJSTransport</code> directly. If this connects,
          the PeerJS SDK and signaling path are healthy.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Transport status</span>
            <span
              data-testid="poc-status"
              className={`px-2 py-0.5 rounded-full border font-bold ${STATUS_STYLES[status]}`}
            >
              {status}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400 shrink-0">Role</span>
            <span data-testid="poc-role" className="font-bold text-slate-200">
              {role} ({myMark})
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400 shrink-0">Local peer</span>
            <span
              data-testid="poc-local-id"
              className="font-mono text-[10px] text-slate-300 truncate"
            >
              {localPeerId || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400 shrink-0">Remote peer</span>
            <span
              data-testid="poc-remote-id"
              className="font-mono text-[10px] text-slate-300 truncate"
            >
              {remotePeerId || '—'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-400 shrink-0">Round trip</span>
            <span data-testid="poc-latency" className="font-bold text-slate-200">
              {latencyMs === null ? '—' : `${latencyMs} ms`}
            </span>
          </div>
          <button
            type="button"
            onClick={handlePing}
            disabled={status !== 'connected'}
            className="w-full mt-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold transition-all"
          >
            Ping peer
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <span className="text-slate-400">Event log</span>
          <ol
            data-testid="poc-log"
            className="font-mono text-[10px] text-slate-400 space-y-0.5 max-h-44 overflow-auto"
          >
            {log.map((entry, index) => (
              <li key={`${entry.atMs}-${index}`} className="truncate">
                <span className="text-slate-600">+{entry.atMs}ms </span>
                {entry.label}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {error && (
        <p
          data-testid="poc-error"
          className="p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-xs text-red-300"
        >
          {error}
        </p>
      )}

      {role === 'host' && (
        <div className="space-y-3">
          {roomCode && (
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Room Code</span>
              <span className="font-mono text-sm font-bold tracking-widest text-indigo-400">
                {roomCode}
              </span>
            </div>
          )}
          <label className="block space-y-1">
            <span className="text-xs font-bold text-slate-400">Invite link</span>
            <input
              data-testid="poc-invite-url"
              readOnly
              value={inviteUrl}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300"
            />
          </label>
        </div>
      )}

      <section className="space-y-3">
        <p data-testid="poc-turn" className="text-xs font-bold text-slate-300">
          {!game
            ? 'waiting-for-peer'
            : game.status === 'completed'
              ? `game-over:${result}`
              : isMyTurn
                ? 'your-turn'
                : 'opponent-turn'}
        </p>

        <div className="grid grid-cols-3 gap-2 w-60">
          {(game?.board ?? Array<null>(9).fill(null)).map((cell, index) => (
            <button
              key={index}
              type="button"
              data-testid={`cell-${index}`}
              onClick={() => handleCellClick(index)}
              disabled={!isMyTurn || cell !== null}
              className="aspect-square rounded-xl bg-slate-900 border border-slate-800 enabled:hover:border-indigo-600 disabled:opacity-60 text-2xl font-black text-white transition-all"
            >
              {cell ?? ''}
            </button>
          ))}
        </div>

        <p data-testid="poc-board" className="font-mono text-xs text-slate-500">
          {serializeBoard(game?.board ?? Array<null>(9).fill(null))}
        </p>
      </section>
    </div>
  )
}
