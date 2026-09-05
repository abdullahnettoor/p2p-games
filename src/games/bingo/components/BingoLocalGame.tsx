'use client'

import React, { useState } from 'react'
import { BingoBoard, BingoState } from '../types'
import { bingoGameDefinition, getCalledNumbers } from '../engine'
import { BingoBoardSetup } from './BingoBoardSetup'
import { BingoBoardView } from './BingoBoardView'
import { BingoLetterTracker } from './BingoLetterTracker'
import { BingoSoundToggle } from './BingoSoundToggle'
import { defaultSoundSynthesizer } from '@/core/audio/SoundSynthesizer'
import { Trophy, RefreshCw, UserCheck, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export const BingoLocalGame: React.FC = () => {
  const [stage, setStage] = useState<'setup-p1' | 'setup-p2' | 'active' | 'completed'>('setup-p1')
  const [p1Board, setP1Board] = useState<BingoBoard | null>(null)
  const [p2Board, setP2Board] = useState<BingoBoard | null>(null)
  const [gameState, setGameState] = useState<BingoState | null>(null)
  const [showOpponentBoard, setShowOpponentBoard] = useState<boolean>(false)
  const [isMuted, setIsMuted] = useState<boolean>(() => defaultSoundSynthesizer.isMuted)

  const handleP1Complete = (board: BingoBoard) => {
    setP1Board(board)
    setStage('setup-p2')
  }

  const handleP2Complete = (board: BingoBoard) => {
    setP2Board(board)
    if (p1Board) {
      const state = bingoGameDefinition.init({
        players: ['p1', 'p2'],
        setupConfigs: {
          p1: { board: p1Board },
          p2: { board },
        },
      })
      setGameState(state)
      setStage('active')
    }
  }

  const handlePickNumber = (num: number) => {
    if (!gameState || gameState.status !== 'active') return

    const validation = bingoGameDefinition.validateMove(
      gameState,
      {
        type: 'CALL_NUMBER',
        number: num,
        playerId: gameState.activePlayerId,
      },
      gameState.activePlayerId
    )

    if (!validation.valid) return

    const nextState = bingoGameDefinition.applyMove(gameState, {
      type: 'CALL_NUMBER',
      number: num,
      playerId: gameState.activePlayerId,
    })

    setGameState(nextState)

    if (nextState.status === 'completed') {
      defaultSoundSynthesizer.playVictory()
      setStage('completed')
    } else {
      const prevTotalLines = (gameState.completedLines.p1 || 0) + (gameState.completedLines.p2 || 0)
      const nextTotalLines = (nextState.completedLines.p1 || 0) + (nextState.completedLines.p2 || 0)
      if (nextTotalLines > prevTotalLines) {
        defaultSoundSynthesizer.playLineComplete()
      } else {
        defaultSoundSynthesizer.playNumberSelect()
      }
    }
  }

  const handleReset = () => {
    setP1Board(null)
    setP2Board(null)
    setGameState(null)
    setStage('setup-p1')
  }

  if (stage === 'setup-p1') {
    return (
      <div className="py-6">
        <BingoBoardSetup
          playerName="Player 1"
          onBoardComplete={handleP1Complete}
        />
      </div>
    )
  }

  if (stage === 'setup-p2') {
    return (
      <div className="py-6">
        <BingoBoardSetup
          playerName="Player 2"
          onBoardComplete={handleP2Complete}
        />
      </div>
    )
  }

  if (!gameState) return null

  const isP1Turn = gameState.activePlayerId === 'p1'
  const activePlayerName = isP1Turn ? 'Player 1' : 'Player 2'
  const activeBoard = isP1Turn ? gameState.boards.p1 : gameState.boards.p2
  const activeDetails = isP1Turn ? gameState.lineDetails.p1 : gameState.lineDetails.p2
  const calledNumbers = getCalledNumbers(gameState.history)

  return (
    <div className="flex flex-col items-center gap-6 py-4 max-w-4xl mx-auto w-full">
      {/* Top Banner & Status */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg',
              isP1Turn ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white'
            )}
          >
            {isP1Turn ? 'P1' : 'P2'}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Current Turn
            </div>
            <div className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span>{activePlayerName}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
            </div>
          </div>
        </div>

        {/* Global Letter Trackers */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-xs font-bold text-indigo-400 mb-1">Player 1</div>
            <BingoLetterTracker completedLines={gameState.completedLines.p1} />
          </div>
          <div className="text-slate-600 font-bold">VS</div>
          <div className="text-center">
            <div className="text-xs font-bold text-rose-400 mb-1">Player 2</div>
            <BingoLetterTracker completedLines={gameState.completedLines.p2} />
          </div>
          <BingoSoundToggle
            isMuted={isMuted}
            onToggle={() => setIsMuted(defaultSoundSynthesizer.toggleMute())}
          />
        </div>
      </div>

      {/* Game Over Banner */}
      {stage === 'completed' && (
        <div className="w-full p-6 bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-amber-500/20 rounded-2xl border border-amber-500/40 text-center space-y-4 animate-in fade-in zoom-in duration-300">
          <div className="flex justify-center">
            <Trophy className="w-16 h-16 text-amber-400 animate-bounce" />
          </div>
          <h2 className="text-3xl font-black text-white">
            {gameState.isDraw
              ? 'It’s a Draw!'
              : `${gameState.winnerId === 'p1' ? 'Player 1' : 'Player 2'} Wins B-I-N-G-O!`}
          </h2>
          <p className="text-slate-300 text-sm">
            5 lines completed and verified deterministically.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/25 transition-all active:scale-95"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Play Again</span>
          </button>
        </div>
      )}

      {/* Main Boards View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full items-start">
        {/* Active Player Board */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-between w-full max-w-md px-2">
            <div className="font-bold text-slate-200 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>{activePlayerName}’s Board (Active)</span>
            </div>
            <div className="text-xs font-semibold text-slate-400">
              {gameState.completedLines[gameState.activePlayerId]}/5 lines
            </div>
          </div>
          <BingoBoardView
            board={activeBoard}
            calledNumbers={calledNumbers}
            lineDetails={activeDetails}
            isMyTurn={stage === 'active'}
            onPickNumber={handlePickNumber}
          />
        </div>

        {/* Secondary / Inactive Board (with hide/reveal toggle for hotseat) */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-between w-full max-w-md px-2">
            <div className="font-bold text-slate-400 flex items-center gap-2">
              <span>{isP1Turn ? 'Player 2' : 'Player 1'}’s Board</span>
            </div>
            <button
              type="button"
              onClick={() => setShowOpponentBoard((prev) => !prev)}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold"
            >
              {showOpponentBoard ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showOpponentBoard ? 'Hide' : 'Peek'}</span>
            </button>
          </div>

          {showOpponentBoard ? (
            <BingoBoardView
              board={isP1Turn ? gameState.boards.p2 : gameState.boards.p1}
              calledNumbers={calledNumbers}
              lineDetails={isP1Turn ? gameState.lineDetails.p2 : gameState.lineDetails.p1}
              isMyTurn={false}
              onPickNumber={() => {}}
              disabled={true}
            />
          ) : (
            <div className="aspect-square max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/40 flex flex-col items-center justify-center p-8 text-center gap-3">
              <EyeOff className="w-10 h-10 text-slate-600" />
              <div className="text-slate-400 font-semibold text-sm">Opponent Board Hidden</div>
              <p className="text-xs text-slate-500">
                Click &quot;Peek&quot; above if you want to inspect both boards side-by-side.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Called Numbers History */}
      <div className="w-full max-w-4xl p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 space-y-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Called Numbers ({calledNumbers.length}/25)</span>
          <span className="text-[11px] text-slate-500 font-normal">Most recent at right</span>
        </div>
        <div className="flex flex-wrap gap-1.5 min-h-[32px] items-center">
          {calledNumbers.length === 0 ? (
            <span className="text-xs text-slate-500 italic">No numbers called yet</span>
          ) : (
            calledNumbers.map((num, i) => (
              <span
                key={i}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold border',
                  i === calledNumbers.length - 1
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 animate-pulse'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                )}
              >
                {num}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
