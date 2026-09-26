'use client'

import React, { useEffect, useState } from 'react'
import styles from './TicTacToePageTurn.module.css'
import '../ticTacToeTokens.css'

export interface TicTacToePageTurnProps {
  roundKey?: string | number
  isTurning?: boolean
  onTurnComplete?: () => void
  children: React.ReactNode
  className?: string
}

/**
 * TicTacToePageTurn wraps round content to provide the tactile page-turn transition:
 * - Executes within 360ms (≤ 400ms constraint)
 * - Simulates physical notebook page turn between rounds
 * - Collapses to a calm crossfade under prefers-reduced-motion
 */
export const TicTacToePageTurn: React.FC<TicTacToePageTurnProps> = ({
  roundKey,
  isTurning: controlledTurning,
  onTurnComplete,
  children,
  className = '',
}) => {
  const [internalTurning, setInternalTurning] = useState(false)

  // Trigger page turn automatically when roundKey changes
  useEffect(() => {
    if (roundKey !== undefined) {
      setInternalTurning(true)
      const timer = setTimeout(() => {
        setInternalTurning(false)
        onTurnComplete?.()
      }, 360)
      return () => clearTimeout(timer)
    }
  }, [roundKey, onTurnComplete])

  const turning = controlledTurning ?? internalTurning

  return (
    <div
      className={`${styles.turnContainer} ${turning ? styles.turning : ''} ${className}`}
      data-testid="ttt-page-turn"
      data-turning={turning}
    >
      {children}
    </div>
  )
}
