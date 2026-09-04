'use client'

import React, { useState } from 'react'
import { LobbySession } from '@/core/lobby/LobbySession'
import { useLobby } from '@/core/lobby/useLobby'
import { BingoBoard } from '../types'
import { BingoBoardSetup } from './BingoBoardSetup'
import { BingoBoardView } from './BingoBoardView'
import {
  Copy,
  Check,
  Users,
  User,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BingoMatchLobbyProps {
  session: LobbySession<BingoBoard>
  onExit?: () => void
  className?: string
}

export const BingoMatchLobby: React.FC<BingoMatchLobbyProps> = ({
  session,
  onExit,
  className,
}) => {
  const { state, updatePlayerName, updateBoardSetup, setReady, canReady } = useLobby(session)
  const [copied, setCopied] = useState(false)
  const [nameEditing, setNameEditing] = useState(false)
  const [localNameInput, setLocalNameInput] = useState(state.localPlayer.name)

  const handleCopyLink = async () => {
    if (state.inviteUrl) {
      try {
        await navigator.clipboard.writeText(state.inviteUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // fallback
      }
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalNameInput(e.target.value)
    updatePlayerName(e.target.value)
  }

  const isLocalReady = state.localPlayer.isReady
  const isRemoteConnected = Boolean(state.remotePlayer && state.remotePlayer.connected)
  const isRemoteReady = Boolean(state.remotePlayer?.isReady)
  const isStarting = state.status === 'starting'

  return (
    <div className={cn('space-y-6 max-w-4xl mx-auto w-full py-2', className)}>
      {/* Lobby Navigation / Exit */}
      <div className="flex items-center justify-between">
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Leave Lobby</span>
          </button>
        ) : (
          <div />
        )}

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>Match Lobby</span>
        </div>
      </div>

      {/* Error Alert */}
      {state.error && (
        <div className="p-4 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <div className="text-sm">
            <span className="font-bold">Connection Error: </span>
            {state.error}
          </div>
        </div>
      )}

      {/* Host Invite Link Banner */}
      {state.localPlayer.role === 'host' && state.inviteUrl && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-800/40 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Invite Your Opponent
              </h3>
              <p className="text-xs text-slate-400">
                Send this direct link to a friend. They can join immediately without signing up.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={state.inviteUrl}
              className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono select-all focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex-shrink-0',
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              )}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Players Coordination Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Local Player Card */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center font-bold text-xs">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">
                  You ({state.localPlayer.role.toUpperCase()})
                </span>
                <span className="text-sm font-extrabold text-white">
                  {state.localPlayer.name}
                </span>
              </div>
            </div>

            <span
              className={cn(
                'text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1',
                isLocalReady
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              )}
            >
              {isLocalReady ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Ready</span>
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Not Ready</span>
                </>
              )}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            <label
              htmlFor="display-name"
              className="block text-[11px] font-semibold text-slate-400 mb-1"
            >
              Your Display Name
            </label>
            <input
              id="display-name"
              type="text"
              maxLength={20}
              value={localNameInput}
              onChange={handleNameChange}
              placeholder="Enter your name..."
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Remote Opponent Card */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border',
                  isRemoteConnected
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-700/50'
                    : 'bg-amber-950/40 text-amber-400 border-amber-700/50'
                )}
              >
                {isRemoteConnected ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Opponent (
                  {state.localPlayer.role === 'host' ? 'GUEST' : 'HOST'})
                </span>
                <span className="text-sm font-extrabold text-white">
                  {state.remotePlayer?.name || (isRemoteConnected ? 'Opponent' : 'Waiting...')}
                </span>
              </div>
            </div>

            {isRemoteConnected ? (
              <span
                className={cn(
                  'text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1',
                  isRemoteReady
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                )}
              >
                {isRemoteReady ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Ready</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Setting Up...</span>
                  </>
                )}
              </span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 animate-pulse">
                <Clock className="w-3 h-3" />
                <span>Waiting for opponent</span>
              </span>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Connection:</span>
            <span
              className={cn(
                'font-semibold flex items-center gap-1.5',
                isRemoteConnected ? 'text-emerald-400' : 'text-amber-400'
              )}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  isRemoteConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'
                )}
              />
              {isRemoteConnected ? 'Connected via P2P' : 'Awaiting peer connection...'}
            </span>
          </div>
        </div>
      </div>

      {/* Board Setup & Ready Action */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6">
        {isLocalReady ? (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Your Board Is Locked & Ready!</h3>
              <p className="text-xs text-slate-400">
                {isRemoteReady
                  ? 'Both players are ready! Match is launching...'
                  : 'Waiting for opponent to finish board setup and ready up...'}
              </p>
            </div>

            {/* Read-only Preview of Local Board */}
            {state.localPlayer.setupConfig && (
              <div className="max-w-xs mx-auto pt-2">
                <BingoBoardView
                  board={state.localPlayer.setupConfig}
                  calledNumbers={[]}
                  onPickNumber={() => {}}
                  isMyTurn={false}
                  disabled={true}
                />
              </div>
            )}

            {!isStarting && (
              <button
                type="button"
                onClick={() => setReady(false)}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline pt-2"
              >
                Change Board (Cancel Ready)
              </button>
            )}
          </div>
        ) : (
          <BingoBoardSetup
            initialBoard={state.localPlayer.setupConfig}
            onBoardComplete={(board) => {
              updateBoardSetup(board)
            }}
            playerName={state.localPlayer.name}
          />
        )}

        {/* Ready Action Bar */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            {isStarting ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Both players ready! Launching BINGO match...
              </span>
            ) : !isRemoteConnected ? (
              <span>Opponent has not connected yet. You can still arrange your board!</span>
            ) : !canReady() ? (
              <span className="text-amber-400 font-medium">
                Fill all 25 numbers on your board and click "Confirm Board" to ready up.
              </span>
            ) : !isLocalReady && isRemoteReady ? (
              <span className="text-emerald-400 font-bold">
                Opponent is Ready! Click below to start the match!
              </span>
            ) : !isLocalReady ? (
              <span>Your board is confirmed. Click Ready when you're prepared.</span>
            ) : (
              <span>Waiting for opponent to ready up...</span>
            )}
          </div>

          {!isLocalReady ? (
            <button
              type="button"
              disabled={!canReady() || isStarting}
              onClick={() => setReady(true)}
              className={cn(
                'w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all',
                canReady() && !isStarting
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 cursor-pointer active:scale-95'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{canReady() ? "I'm Ready!" : 'Set Up Board First'}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isStarting}
              onClick={() => setReady(false)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all"
            >
              <span>Cancel Ready</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
