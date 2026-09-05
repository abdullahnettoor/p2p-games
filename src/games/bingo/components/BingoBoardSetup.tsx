import React, { useState } from 'react'
import { BingoBoard } from '../types'
import { generateRandomBingoBoard, validateBingoBoard, TOTAL_NUMBERS } from '../engine'
import { cn } from '@/lib/utils'
import { CheckCircle2, RotateCcw, Shuffle, Trash2 } from 'lucide-react'
import { BingoGrid } from './grid/BingoGrid'
import gridStyles from './grid/BingoGrid.module.css'

interface BingoBoardSetupProps {
  initialBoard?: BingoBoard
  onBoardComplete: (board: BingoBoard) => void
  playerName?: string
  submitLabel?: string
  className?: string
}

function createEmptyBoard(): Array<number | null> {
  return Array(TOTAL_NUMBERS).fill(null)
}

export const BingoBoardSetup: React.FC<BingoBoardSetupProps> = ({
  initialBoard,
  onBoardComplete,
  playerName = 'Player',
  submitLabel = 'Confirm Board',
  className,
}) => {
  const [board, setBoard] = useState<Array<number | null>>(() => {
    if (initialBoard && initialBoard.length === TOTAL_NUMBERS) {
      return [...initialBoard]
    }
    return createEmptyBoard()
  })
  const [boardHistory, setBoardHistory] = useState<Array<Array<number | null>>>([])
  const [selectedSwapIndex, setSelectedSwapIndex] = useState<number | null>(null)

  const placedCount = board.reduce<number>((count, number) => count + (number === null ? 0 : 1), 0)
  const nextNumber = placedCount < TOTAL_NUMBERS ? placedCount + 1 : null
  const isComplete = placedCount === TOTAL_NUMBERS
  const validation = isComplete ? validateBingoBoard(board as BingoBoard) : { valid: false }

  const commitBoard = (nextBoard: Array<number | null>) => {
    setBoardHistory((history) => [...history, board])
    setBoard(nextBoard)
    setSelectedSwapIndex(null)
  }

  const handleRandomize = () => {
    commitBoard(generateRandomBingoBoard())
  }

  const handleClear = () => {
    if (placedCount === 0) return
    commitBoard(createEmptyBoard())
  }

  const handleUndo = () => {
    if (boardHistory.length === 0) return
    setBoard(boardHistory[boardHistory.length - 1])
    setBoardHistory((history) => history.slice(0, -1))
    setSelectedSwapIndex(null)
  }

  const handleCellClick = (index: number) => {
    const number = board[index]

    if (number === null) {
      if (nextNumber === null) return
      const nextBoard = [...board]
      nextBoard[index] = nextNumber
      commitBoard(nextBoard)
      return
    }

    if (selectedSwapIndex === null) {
      setSelectedSwapIndex(index)
      return
    }

    if (selectedSwapIndex === index) {
      setSelectedSwapIndex(null)
      return
    }

    const nextBoard = [...board]
    ;[nextBoard[selectedSwapIndex], nextBoard[index]] = [nextBoard[index], nextBoard[selectedSwapIndex]]
    commitBoard(nextBoard)
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
          {playerName}, tap any empty cell to place each number in order.
        </p>
      </div>

      <div className="flex items-center gap-3 w-full justify-between max-w-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRandomize}
            aria-label="Shuffle board"
            className="min-h-11 flex items-center gap-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
          >
            <Shuffle className="w-4 h-4" />
            <span>Shuffle</span>
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={boardHistory.length === 0}
            aria-label="Undo last change"
            className="min-h-11 min-w-11 flex items-center justify-center gap-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Undo</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={placedCount === 0}
            aria-label="Clear board"
            className="min-h-11 min-w-11 flex items-center justify-center gap-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>

        <div className="text-right text-xs font-medium text-slate-400" aria-live="polite">
          <strong className={cn('block text-sm', isComplete ? 'text-emerald-400' : 'text-amber-400')}>
            {nextNumber === null ? 'All 25 placed' : `Place ${nextNumber}`}
          </strong>
          <span>{placedCount}/{TOTAL_NUMBERS}</span>
        </div>
      </div>

      <BingoGrid
        ariaLabel="BINGO Board setup"
        renderCell={({ index }) => {
          const number = board[index]
          const row = Math.floor(index / 5) + 1
          const column = (index % 5) + 1
          const isSelected = selectedSwapIndex === index
          const selectedNumber = selectedSwapIndex === null ? null : board[selectedSwapIndex]
          const action =
            number === null
              ? `Empty cell, row ${row}, column ${column}. Place ${nextNumber}`
              : isSelected
                ? `Number ${number}, row ${row}, column ${column}. Selected for swap`
                : selectedNumber !== null
                  ? `Number ${number}, row ${row}, column ${column}. Swap with number ${selectedNumber}`
                  : `Number ${number}, row ${row}, column ${column}. Select to swap`

          return (
            <button
              type="button"
              aria-label={action}
              aria-pressed={number === null ? undefined : isSelected}
              onClick={() => handleCellClick(index)}
              className={cn(
                gridStyles.gridButton,
                'rounded-xl border font-bold text-lg transition-all duration-150',
                number !== null
                  ? isSelected
                    ? 'bg-amber-950/70 text-amber-200 border-amber-500 ring-2 ring-amber-400/30'
                    : 'bg-indigo-950/60 text-indigo-200 border-indigo-700/60 hover:border-amber-400/70 shadow-sm'
                  : 'bg-slate-800/40 border-slate-700/60 hover:border-indigo-400 text-slate-500'
              )}
            >
              {number ?? <span className="text-xs text-slate-600 font-normal">{index + 1}</span>}
            </button>
          )
        }}
      />

      {selectedSwapIndex !== null ? (
        <p className="text-sm text-amber-300" role="status">
          Number {board[selectedSwapIndex]} selected. Choose another filled cell to swap.
        </p>
      ) : (
        <p className="text-xs text-slate-500">Tap two filled cells to swap them.</p>
      )}

      <button
        type="button"
        disabled={!isComplete || !validation.valid}
        onClick={handleConfirm}
        className={cn(
          'min-h-11 w-full max-w-md px-6 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
          isComplete && validation.valid
            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 cursor-pointer active:scale-95'
            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
        )}
      >
        <CheckCircle2 className="w-5 h-5" />
        <span>{submitLabel}</span>
      </button>
    </div>
  )
}
