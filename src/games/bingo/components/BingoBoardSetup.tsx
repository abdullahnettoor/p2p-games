import React, { useState } from 'react'
import { BingoBoard } from '../types'
import { generateRandomBingoBoard, validateBingoBoard, TOTAL_NUMBERS } from '../engine'
import { cn } from '@/lib/utils'
import { Shuffle, RotateCcw, CheckCircle2 } from 'lucide-react'

interface BingoBoardSetupProps {
  initialBoard?: BingoBoard
  onBoardComplete: (board: BingoBoard) => void
  playerName?: string
  className?: string
}

export const BingoBoardSetup: React.FC<BingoBoardSetupProps> = ({
  initialBoard,
  onBoardComplete,
  playerName = 'Player',
  className,
}) => {
  const [board, setBoard] = useState<(number | null)[]>(() => {
    if (initialBoard && initialBoard.length === TOTAL_NUMBERS) {
      return initialBoard
    }
    return Array(TOTAL_NUMBERS).fill(null)
  })

  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null)

  const placedNumbersSet = new Set(board.filter((n): n is number => n !== null))
  const isComplete = placedNumbersSet.size === TOTAL_NUMBERS
  const validation = isComplete ? validateBingoBoard(board as BingoBoard) : { valid: false }

  const handleRandomize = () => {
    const randomBoard = generateRandomBingoBoard()
    setBoard(randomBoard)
    setSelectedSlotIndex(null)
  }

  const handleClear = () => {
    setBoard(Array(TOTAL_NUMBERS).fill(null))
    setSelectedSlotIndex(null)
  }

  const handleSlotClick = (index: number) => {
    if (board[index] !== null) {
      // Remove number from slot
      const nextBoard = [...board]
      nextBoard[index] = null
      setBoard(nextBoard)
      setSelectedSlotIndex(index)
    } else {
      setSelectedSlotIndex(index)
    }
  }

  const handleNumberPaletteClick = (num: number) => {
    if (placedNumbersSet.has(num)) return

    // Place into selected slot or first available empty slot
    let targetIndex = selectedSlotIndex
    if (targetIndex === null || board[targetIndex] !== null) {
      targetIndex = board.findIndex((n) => n === null)
    }

    if (targetIndex !== -1) {
      const nextBoard = [...board]
      nextBoard[targetIndex] = num
      setBoard(nextBoard)

      // Auto-advance selectedSlotIndex to next empty slot
      const nextEmpty = nextBoard.findIndex((n, idx) => idx > targetIndex! && n === null)
      setSelectedSlotIndex(nextEmpty !== -1 ? nextEmpty : null)
    }
  }

  const handleConfirm = () => {
    if (isComplete && validation.valid) {
      onBoardComplete(board as BingoBoard)
    }
  }

  return (
    <div className={cn('flex flex-col items-center gap-6 max-w-xl w-full mx-auto', className)}>
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">Set Up Your Board</h2>
        <p className="text-sm text-slate-400">
          {playerName}, arrange numbers 1 to 25 manually or click Randomize.
        </p>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center gap-3 w-full justify-between max-w-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRandomize}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Randomize</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>

        <div className="text-xs font-medium text-slate-400">
          <span className={cn('font-bold', isComplete ? 'text-emerald-400' : 'text-amber-400')}>
            {placedNumbersSet.size}
          </span>
          /{TOTAL_NUMBERS} placed
        </div>
      </div>

      {/* 5x5 Board Grid */}
      <div className="grid grid-cols-5 gap-2 md:gap-3 p-3 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl max-w-md w-full">
        {board.map((num, idx) => {
          const isSelected = selectedSlotIndex === idx
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSlotClick(idx)}
              className={cn(
                'aspect-square flex items-center justify-center rounded-xl font-bold text-lg md:text-xl transition-all duration-150 border',
                num !== null
                  ? 'bg-indigo-950/60 text-indigo-200 border-indigo-700/60 hover:border-red-400/50 shadow-sm'
                  : isSelected
                  ? 'bg-slate-800 border-indigo-400 ring-2 ring-indigo-400/40 text-slate-500'
                  : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600 text-slate-600'
              )}
            >
              {num ?? (
                <span className="text-[10px] text-slate-600 font-normal">#{idx + 1}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Number Palette for manual placement */}
      {!isComplete && (
        <div className="space-y-2 w-full max-w-md">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">
            Click number to place
          </div>
          <div className="flex flex-wrap justify-center gap-1.5 p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
            {Array.from({ length: TOTAL_NUMBERS }, (_, i) => i + 1).map((n) => {
              const isPlaced = placedNumbersSet.has(n)
              return (
                <button
                  key={n}
                  type="button"
                  disabled={isPlaced}
                  onClick={() => handleNumberPaletteClick(n)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-xs font-bold transition-all',
                    isPlaced
                      ? 'bg-slate-900 text-slate-700 opacity-40 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700 active:scale-95'
                  )}
                >
                  {n}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Confirm Button */}
      <button
        type="button"
        disabled={!isComplete || !validation.valid}
        onClick={handleConfirm}
        className={cn(
          'w-full max-w-md py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all duration-200',
          isComplete && validation.valid
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 cursor-pointer active:scale-98'
            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
        )}
      >
        <CheckCircle2 className="w-5 h-5" />
        <span>Confirm Board</span>
      </button>
    </div>
  )
}
