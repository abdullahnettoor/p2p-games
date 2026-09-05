'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'

export interface BingoTurnTimerProps {
  secondsRemaining: number
  totalSeconds?: number
  isMyTurn: boolean
  className?: string
}

export const BingoTurnTimer: React.FC<BingoTurnTimerProps> = ({
  secondsRemaining,
  totalSeconds = 30,
  isMyTurn,
  className,
}) => {
  const percentage = Math.max(0, Math.min(100, (secondsRemaining / totalSeconds) * 100))
  const isUrgent = secondsRemaining <= 5
  const isWarning = secondsRemaining > 5 && secondsRemaining <= 15

  const strokeColor = isUrgent
    ? 'stroke-red-500'
    : isWarning
    ? 'stroke-amber-400'
    : 'stroke-emerald-400'

  const textColor = isUrgent
    ? 'text-red-400'
    : isWarning
    ? 'text-amber-300'
    : 'text-emerald-300'

  const radius = 24
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3.5 py-1.5 rounded-2xl border transition-all duration-300 backdrop-blur-sm',
        isUrgent
          ? 'bg-red-950/40 border-red-800/80 shadow-red-900/30 shadow-lg animate-pulse'
          : isWarning
          ? 'bg-amber-950/30 border-amber-800/50'
          : 'bg-slate-900/80 border-slate-800',
        className
      )}
    >
      {/* Mini Circular Progress */}
      <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 56 56">
          <circle
            cx="28"
            cy="28"
            r={radius}
            className="stroke-slate-800 fill-none"
            strokeWidth="5"
          />
          <circle
            cx="28"
            cy="28"
            r={radius}
            className={cn('fill-none transition-all duration-500 ease-linear', strokeColor)}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <Clock className={cn('w-3.5 h-3.5 absolute inset-0 m-auto opacity-70', textColor)} />
      </div>

      <div className="flex flex-col">
        <div className="flex items-baseline gap-1">
          <span className={cn('font-mono font-black text-sm tabular-nums', textColor)}>
            {secondsRemaining}s
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            timer
          </span>
        </div>
        <span className="text-[9px] text-slate-400 leading-none">
          {isMyTurn ? (isUrgent ? 'Hurry up!' : 'Your turn') : 'Waiting...'}
        </span>
      </div>
    </div>
  )
}
