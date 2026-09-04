import React from 'react'
import { BINGO_LETTERS } from '../engine'
import { cn } from '@/lib/utils'

interface BingoLetterTrackerProps {
  completedLines: number
  className?: string
}

export const BingoLetterTracker: React.FC<BingoLetterTrackerProps> = ({
  completedLines,
  className,
}) => {
  return (
    <div className={cn('flex items-center justify-center gap-2 md:gap-3', className)}>
      {BINGO_LETTERS.map((letter, index) => {
        const isActive = index < completedLines
        return (
          <div
            key={letter}
            data-active={isActive ? 'true' : 'false'}
            className={cn(
              'w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black text-lg md:text-xl transition-all duration-300 shadow-sm border',
              isActive
                ? 'bg-amber-500 border-amber-400 text-slate-950 scale-110 shadow-amber-500/30 shadow-lg animate-pulse'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            )}
          >
            {letter}
          </div>
        )
      })}
    </div>
  )
}
