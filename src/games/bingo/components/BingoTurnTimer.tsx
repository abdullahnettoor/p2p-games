'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import styles from './BingoScorecard.module.css'

export interface BingoTurnTimerProps {
  secondsRemaining: number

  isMyTurn: boolean
  className?: string
}

export const BingoTurnTimer: React.FC<BingoTurnTimerProps> = ({
  secondsRemaining,
  isMyTurn,
  className,
}) => {
  const urgency = secondsRemaining <= 3 ? 'urgent' : secondsRemaining <= 10 ? 'warning' : 'normal'

  return (
    <div
      role="timer"
      aria-label={`${secondsRemaining} seconds remaining${isMyTurn ? ' in your turn' : ''}`}
      data-urgency={urgency}
      className={cn(styles.tokenScope, styles.timer, className)}
    >
      <span className={styles.timerValue}>{secondsRemaining}s</span>
      <span className={styles.timerLabel}>seconds left</span>
    </div>
  )
}
