'use client'

import React, { useMemo } from 'react'
import styles from './TicTacToeStrikeThrough.module.css'
import '../ticTacToeTokens.css'

export type WinningLine = [number, number, number] | number[]

export interface TicTacToeStrikeThroughProps {
  line: WinningLine
  winnerInk?: 'host' | 'guest' | string
  animated?: boolean
  className?: string
}

/**
 * TicTacToeStrikeThrough draws a decisive pen strike-through across the winning 3-in-a-row.
 * Features:
 * - Rendered in winner's ink (--ttt-host-ink or --ttt-guest-ink)
 * - Overshoots the board boundary by approximately 6% at each end
 * - Organic, hand-drawn path curvature with round line caps
 * - One-shot draw-in animation (~220ms) with static reduced-motion fallback
 */
export const TicTacToeStrikeThrough: React.FC<TicTacToeStrikeThroughProps> = ({
  line,
  winnerInk = 'host',
  animated = true,
  className = '',
}) => {
  const inkColor = useMemo(() => {
    if (winnerInk === 'host') return 'var(--ttt-host-ink)'
    if (winnerInk === 'guest') return 'var(--ttt-guest-ink)'
    return winnerInk
  }, [winnerInk])

  // Normalise line sorted indices
  const sortedLine = useMemo(() => [...line].sort((a, b) => a - b), [line])

  // Determine line coordinates in 300x300 viewBox with 6% overshoot (18px)
  const pathD = useMemo(() => {
    const key = sortedLine.join('-')
    switch (key) {
      // Horizontal Rows (Row 0, 1, 2)
      case '0-1-2':
        return 'M -18 49 Q 150 53 318 49'
      case '3-4-5':
        return 'M -18 149 Q 150 153 318 150'
      case '6-7-8':
        return 'M -18 249 Q 150 253 318 251'

      // Vertical Columns (Col 0, 1, 2)
      case '0-3-6':
        return 'M 49 -18 Q 53 150 50 318'
      case '1-4-7':
        return 'M 149 -18 Q 153 150 151 318'
      case '2-5-8':
        return 'M 249 -18 Q 253 150 250 318'

      // Main Diagonal
      case '0-4-8':
        return 'M -18 -18 Q 148 152 318 318'

      // Anti Diagonal
      case '2-4-6':
        return 'M 318 -18 Q 152 148 -18 318'

      default:
        return 'M -18 49 Q 150 53 318 49'
    }
  }, [sortedLine])

  return (
    <div
      className={`${styles.strikeOverlay} ${className}`}
      data-testid="ttt-strike-through"
      data-winner-ink={winnerInk}
      data-line={sortedLine.join(',')}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 300 300"
        className={styles.strikeSvg}
        focusable="false"
      >
        <path
          d={pathD}
          className={animated ? styles.strikePath : undefined}
          style={{
            stroke: inkColor,
            strokeWidth: 6,
            strokeLinecap: 'round',
            fill: 'none',
          }}
          data-testid="ttt-strike-path"
        />
      </svg>
    </div>
  )
}
