'use client'

import React from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './TicTacToeTurnTimer.module.css'

export interface TicTacToeTurnTimerProps {
  secondsRemaining: number
  isMyTurn: boolean
  className?: string
}

export const TicTacToeTurnTimer: React.FC<TicTacToeTurnTimerProps> = ({
  secondsRemaining,
  isMyTurn,
  className,
}) => {
  const isUrgent = secondsRemaining <= 5

  return (
    <div
      className={cn(
        styles.timerBadge,
        isUrgent && styles.timerUrgent,
        className
      )}
      role="timer"
      aria-label={`${secondsRemaining} seconds remaining for ${isMyTurn ? 'your' : "opponent's"} turn`}
      data-testid="ttt-turn-timer"
    >
      <Clock className={styles.clockIcon} aria-hidden="true" />
      <span>{secondsRemaining}s</span>
    </div>
  )
}
