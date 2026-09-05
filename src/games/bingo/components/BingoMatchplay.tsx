'use client'

import React from 'react'
import { BingoMatchCoordinator } from '../state/BingoMatchCoordinator'
import { useBingoMatch } from '../state/useBingoMatch'
import { useBingoAudio } from '../hooks/useBingoAudio'
import { BingoBoardView } from './BingoBoardView'
import { BingoLetterTracker } from './BingoLetterTracker'
import { BingoTurnTimer } from './BingoTurnTimer'
import { BingoSoundToggle } from './BingoSoundToggle'
import { BingoReactionBar } from './BingoReactionBar'
import { BingoReactionOverlay } from './BingoReactionOverlay'
import { BingoGameOverModal } from './BingoGameOverModal'
import { ArrowLeft, User, Sparkles, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BingoMatchplayProps {
  coordinator: BingoMatchCoordinator
  onExit: () => void
  className?: string
}

export const BingoMatchplay: React.FC<BingoMatchplayProps> = ({
  coordinator,
  onExit,
  className,
}) => {
  const { state, isMyTurn, submitMove } = useBingoMatch(coordinator)
  const { isMuted, toggleMute } = useBingoAudio(state)

  const localPlayer = state.localPlayer
  const remotePlayer = state.remotePlayer
  const myBoard = state.gameState.boards[localPlayer.id] || []
  const myLines = state.gameState.completedLines[localPlayer.id] || 0
  const myLineDetails = state.gameState.lineDetails[localPlayer.id]
  const remoteLines = state.gameState.completedLines[remotePlayer.id] || 0
  const calledNumbers = state.gameState.calledNumbers
  const isGameOver = state.winResult.isGameOver

  const activePlayerName = isMyTurn ? localPlayer.name : remotePlayer.name
  const lastCalledNumber = calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1] : null

  return (
    <div className={cn('space-y-6 max-w-4xl mx-auto w-full py-2 relative', className)}>
      {/* Ephemeral Reaction Overlay */}
      <BingoReactionOverlay coordinator={coordinator} />

      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Match</span>
        </button>

        <div className="flex items-center gap-2.5">
          <BingoSoundToggle isMuted={isMuted} onToggle={toggleMute} />
          <BingoTurnTimer
            secondsRemaining={state.turnSecondsRemaining}
            isMyTurn={isMyTurn}
          />
        </div>
      </div>

      {/* Turn Indicator & Score Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        {/* Local Player Progress */}
        <div
          className={cn(
            'p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between',
            isMyTurn
              ? 'bg-gradient-to-r from-emerald-950/40 to-slate-900 border-emerald-500/50 shadow-emerald-900/20 shadow-md ring-1 ring-emerald-500/30'
              : 'bg-slate-900/80 border-slate-800'
          )}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border',
                isMyTurn
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/80'
              )}
            >
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                {localPlayer.name} (You)
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {myLines} / 5 Lines Formed
              </span>
            </div>
          </div>

          {isMyTurn && (
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 animate-pulse">
              Your Turn
            </span>
          )}
        </div>

        {/* Remote Opponent Progress */}
        <div
          className={cn(
            'p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between',
            !isMyTurn
              ? 'bg-gradient-to-r from-indigo-950/40 to-slate-900 border-indigo-500/50 shadow-indigo-900/20 shadow-md ring-1 ring-indigo-500/30'
              : 'bg-slate-900/80 border-slate-800'
          )}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border',
                !isMyTurn
                  ? 'bg-indigo-600 text-white border-indigo-400'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              )}
            >
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {remotePlayer.name} (Opponent)
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {remoteLines} / 5 Lines Formed
              </span>
            </div>
          </div>

          {!isMyTurn && (
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
              {remotePlayer.name}&apos;s Turn
            </span>
          )}
        </div>
      </div>

      {/* Active Turn Banner */}
      <div
        className={cn(
          'p-4 rounded-2xl border text-center transition-all duration-300 flex items-center justify-center gap-2',
          isMyTurn
            ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300 shadow-md'
            : 'bg-slate-900/40 border-slate-800 text-slate-400'
        )}
      >
        <Sparkles className={cn('w-4 h-4', isMyTurn ? 'text-amber-400 animate-spin' : 'text-slate-500')} />
        <span className="text-sm font-bold">
          {isMyTurn
            ? 'Your Turn! Click any uncalled number on your board to call it.'
            : `Waiting for ${remotePlayer.name} to pick a number...`}
        </span>
      </div>

      {/* B-I-N-G-O Letters Tracker */}
      <div className="space-y-2 text-center py-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Your B-I-N-G-O Progress
        </div>
        <BingoLetterTracker completedLines={myLines} />
      </div>

      {/* Main 5x5 Board View */}
      <div className="max-w-md mx-auto w-full">
        <BingoBoardView
          board={myBoard}
          calledNumbers={calledNumbers}
          lineDetails={myLineDetails}
          isMyTurn={isMyTurn}
          onPickNumber={(num) => submitMove(num)}
          disabled={!isMyTurn || isGameOver}
        />
      </div>

      {/* Floating Emoji Reaction Bar */}
      <div className="flex justify-center">
        <BingoReactionBar
          onSendReaction={(emoji) => coordinator.sendReaction(emoji)}
          disabled={isGameOver}
        />
      </div>

      {/* Last Called & History Chips */}
      {calledNumbers.length > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 max-w-md mx-auto w-full space-y-2 text-center">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 font-semibold">
              <Hash className="w-3.5 h-3.5 text-slate-500" />
              Recent Numbers
            </span>
            <span>
              Last Call:{' '}
              <strong className="text-amber-400 font-bold text-sm">#{lastCalledNumber}</strong>
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 pt-1">
            {calledNumbers
              .slice(-10)
              .reverse()
              .map((num, idx) => (
                <span
                  key={num}
                  className={cn(
                    'px-2 py-0.5 rounded-lg text-xs font-bold border transition-all',
                    idx === 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700/60'
                  )}
                >
                  #{num}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {isGameOver && (
        <BingoGameOverModal
          winResult={state.winResult}
          localPlayer={localPlayer}
          remotePlayer={remotePlayer}
          localCompletedLines={myLines}
          remoteCompletedLines={remoteLines}
          totalCalledCount={calledNumbers.length}
          onExit={onExit}
        />
      )}
    </div>
  )
}
