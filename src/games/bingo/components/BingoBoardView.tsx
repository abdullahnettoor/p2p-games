import React, { useMemo } from 'react'
import { BingoBoard, LineDetails } from '../types'
import { BINGO_SIZE } from '../engine'
import { cn } from '@/lib/utils'

interface BingoBoardViewProps {
  board: BingoBoard
  calledNumbers: number[]
  lineDetails: LineDetails
  isMyTurn: boolean
  onPickNumber: (num: number) => void
  disabled?: boolean
  className?: string
}

export const BingoBoardView: React.FC<BingoBoardViewProps> = ({
  board,
  calledNumbers,
  lineDetails,
  isMyTurn,
  onPickNumber,
  disabled = false,
  className,
}) => {
  const calledSet = useMemo(() => new Set(calledNumbers), [calledNumbers])

  // Compute set of cell indices that belong to completed lines
  const completedCellIndices = useMemo(() => {
    const indices = new Set<number>()

    // Rows
    for (const r of lineDetails.rows) {
      for (let c = 0; c < BINGO_SIZE; c++) {
        indices.add(r * BINGO_SIZE + c)
      }
    }

    // Columns
    for (const c of lineDetails.cols) {
      for (let r = 0; r < BINGO_SIZE; r++) {
        indices.add(r * BINGO_SIZE + c)
      }
    }

    // Main diagonal
    if (lineDetails.diags.includes(0)) {
      for (let i = 0; i < BINGO_SIZE; i++) {
        indices.add(i * BINGO_SIZE + i)
      }
    }

    // Anti diagonal
    if (lineDetails.diags.includes(1)) {
      for (let i = 0; i < BINGO_SIZE; i++) {
        indices.add(i * BINGO_SIZE + (BINGO_SIZE - 1 - i))
      }
    }

    return indices
  }, [lineDetails])

  const latestCalledNumber = calledNumbers.length > 0 ? calledNumbers[calledNumbers.length - 1] : null

  return (
    <div className={cn('grid grid-cols-5 gap-2 md:gap-3 p-3 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full mx-auto', className)}>
      {board.map((num, idx) => {
        const isCalled = calledSet.has(num)
        const isCompletedLine = completedCellIndices.has(idx)
        const isLatest = num === latestCalledNumber
        const canClick = isMyTurn && !isCalled && !disabled

        return (
          <button
            key={idx}
            type="button"
            disabled={!canClick}
            onClick={() => {
              if (canClick) {
                onPickNumber(num)
              }
            }}
            className={cn(
              'aspect-square flex flex-col items-center justify-center rounded-xl font-bold text-lg md:text-2xl transition-all duration-200 select-none relative',
              isCalled
                ? isCompletedLine
                  ? 'bg-amber-500/20 text-amber-300 border-2 border-amber-400 font-extrabold shadow-inner'
                  : 'bg-indigo-950/70 text-indigo-300 border border-indigo-700/50 line-through opacity-90'
                : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-100 border border-slate-700',
              canClick && 'hover:scale-105 hover:border-indigo-400 hover:shadow-indigo-500/25 hover:shadow-lg cursor-pointer active:scale-95',
              !canClick && !isCalled && 'cursor-default opacity-80',
              isLatest && 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 animate-pulse'
            )}
          >
            <span>{num}</span>
            {isCalled && (
              <span className="text-[10px] uppercase font-semibold tracking-wider text-indigo-400/80">
                {isCompletedLine ? '⭐' : '✓'}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
