'use client'

import React from 'react'
import { WinResult } from '@/core/games/types'
import { PlayerSummary } from '../state/BingoMatchCoordinator'
import { Trophy, Award, Frown, ArrowLeft, Hash, RotateCcw, Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RematchState } from '../state/BingoMatchCoordinator'

export interface BingoGameOverModalProps {
  winResult: WinResult
  localPlayer: PlayerSummary
  remotePlayer: PlayerSummary
  localCompletedLines: number
  remoteCompletedLines: number
  totalCalledCount: number
  rematchState?: RematchState
  onRequestRematch?: () => void
  onAcceptRematch?: () => void
  onDeclineRematch?: () => void
  onExit: () => void
  className?: string
}

export const BingoGameOverModal: React.FC<BingoGameOverModalProps> = ({
  winResult,
  localPlayer,
  remotePlayer,
  localCompletedLines,
  remoteCompletedLines,
  totalCalledCount,
  rematchState = 'none',
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  onExit,
  className,
}) => {
  const isWinner = winResult.winnerId === localPlayer.id
  const isLoser = winResult.winnerId === remotePlayer.id
  const isDraw = winResult.isDraw
  const isForfeit = winResult.reason === 'forfeit'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300 motion-reduce:animate-none">
      <div
        className={cn(
          'max-w-md w-full rounded-3xl p-6 md:p-8 border text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b',
          isWinner
            ? 'from-amber-950/50 via-slate-900 to-slate-950 border-amber-500/40 shadow-amber-500/10'
            : isDraw
            ? 'from-indigo-950/50 via-slate-900 to-slate-950 border-indigo-500/40'
            : 'from-slate-900 to-slate-950 border-slate-800',
          className
        )}
      >
        {/* Glow effect */}
        {isWinner && (
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        )}

        {/* Big Icon */}
        <div className="mx-auto flex items-center justify-center">
          {isWinner ? (
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/20 scale-105">
              <Trophy className="w-10 h-10" />
            </div>
          ) : isDraw ? (
            <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30">
              <Award className="w-10 h-10" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
              <Frown className="w-10 h-10" />
            </div>
          )}
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-1.5">
          <h2 className="text-3xl font-black tracking-tight text-white">
            {isWinner
              ? isForfeit
                ? 'VICTORY BY FORFEIT'
                : 'VICTORY (WINNER)'
              : isDraw
              ? "IT'S A DRAW!"
              : 'DEFEAT (LOSER)'}
          </h2>
          <p className="text-sm text-slate-400">
            {isWinner
              ? isForfeit
                ? `${remotePlayer.name} disconnected and did not return within 30 seconds.`
                : 'Congratulations! You scored B-I-N-G-O first!'
              : isDraw
              ? 'Both players completed 5 lines on the same turn!'
              : `${remotePlayer.name} completed 5 lines first.`}
          </p>
        </div>

        {/* Match Statistics Card */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 text-left">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800">
            Final Match Summary
          </div>

          <div className="grid grid-cols-2 gap-3 text-center pt-1">
            <div
              className={cn(
                'p-2.5 rounded-xl border flex flex-col justify-between',
                isWinner
                  ? 'bg-amber-950/30 border-amber-500/40'
                  : 'bg-slate-950/60 border-slate-800/80'
              )}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-semibold truncate">
                  {localPlayer.name} (You)
                </span>
                {isWinner && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    WINNER
                  </span>
                )}
                {isLoser && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                    LOSER
                  </span>
                )}
              </div>
              <div>
                <span className="text-2xl font-black text-white">{localCompletedLines}</span>
                <span className="text-[10px] text-slate-400 block">lines completed</span>
              </div>
            </div>

            <div
              className={cn(
                'p-2.5 rounded-xl border flex flex-col justify-between',
                isLoser
                  ? 'bg-amber-950/30 border-amber-500/40'
                  : 'bg-slate-950/60 border-slate-800/80'
              )}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold truncate">
                  {remotePlayer.name}
                </span>
                {isLoser && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    WINNER
                  </span>
                )}
                {isWinner && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                    LOSER
                  </span>
                )}
              </div>
              <div>
                <span className="text-2xl font-black text-white">{remoteCompletedLines}</span>
                <span className="text-[10px] text-slate-400 block">lines completed</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80">
            <span className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-slate-500" />
              Total Numbers Called:
            </span>
            <span className="font-bold text-slate-200">{totalCalledCount} / 25</span>
          </div>
        </div>

        {/* Rematch Controls & Exit */}
        <div className="space-y-2.5 pt-2">
          {rematchState === 'none' && onRequestRematch && (
            <button
              type="button"
              onClick={onRequestRematch}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-95 border border-emerald-500/50"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Request Rematch</span>
            </button>
          )}

          {rematchState === 'requested' && (
            <div className="w-full py-3 px-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 font-medium text-sm flex items-center justify-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400 motion-reduce:animate-none" />
              <span>Rematch requested... Waiting for opponent</span>
            </div>
          )}

          {rematchState === 'received' && (
            <div className="p-3 rounded-2xl bg-indigo-950/50 border border-indigo-500/40 space-y-2.5 text-center">
              <p className="text-xs font-semibold text-indigo-300">
                {remotePlayer.name} has requested a rematch!
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onAcceptRematch}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/30 transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Accept Rematch</span>
                </button>
                <button
                  type="button"
                  onClick={onDeclineRematch}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-slate-700"
                >
                  <X className="w-4 h-4" />
                  <span>Decline</span>
                </button>
              </div>
            </div>
          )}

          {rematchState === 'accepted' && (
            <div className="w-full py-3 px-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              <span>Rematch accepted! Setting up match...</span>
            </div>
          )}

          {rematchState === 'declined' && (
            <div className="w-full py-2.5 px-4 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs font-medium">
              Rematch declined.
            </div>
          )}

          <button
            type="button"
            onClick={onExit}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit to Games Hub</span>
          </button>
        </div>
      </div>
    </div>
  )
}
