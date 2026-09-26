'use client'

import React, { useMemo } from 'react'
import { TicTacToeMark as MarkType } from '../types'
import styles from './TicTacToeMark.module.css'
import '../ticTacToeTokens.css'

export interface TicTacToeMarkProps {
  mark: MarkType
  seed?: number
  animated?: boolean
  className?: string
  size?: number | string
  ariaLabel?: string
}

/**
 * TicTacToeMark renders hand-drawn SVG player marks:
 * - Host X: two strokes in Host fountain blue ink (#155A96), ~180ms draw-in
 * - Guest O: one continuous looped stroke in Guest berry red ink (#A8324E), ~180ms draw-in
 * - Deterministic per-mark jitter (rotation, slight scale, path curvature)
 * - Zero font glyphs
 */
export const TicTacToeMark: React.FC<TicTacToeMarkProps> = ({
  mark,
  seed = 0,
  animated = true,
  className = '',
  size = '100%',
  ariaLabel,
}) => {
  const jitter = useMemo(() => {
    const angle = ((seed * 37) % 7) - 3 // -3deg to +3deg
    const scale = 0.97 + ((seed * 19) % 7) * 0.01 // 0.97 to 1.03
    const dx = ((seed * 23) % 5) - 2 // -2px to +2px
    const dy = ((seed * 29) % 5) - 2 // -2px to +2px
    return { angle, scale, dx, dy }
  }, [seed])

  const label = ariaLabel ?? (mark === 'X' ? 'Mark X (Host)' : 'Mark O (Guest)')

  return (
    <div
      className={`${styles.markContainer} ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
      data-testid={`ttt-mark-${mark.toLowerCase()}`}
      data-mark={mark}
      data-seed={seed}
    >
      <svg
        viewBox="0 0 100 100"
        className={styles.markSvg}
        style={{
          transform: `translate(${jitter.dx}px, ${jitter.dy}px) rotate(${jitter.angle}deg) scale(${jitter.scale})`,
        }}
        aria-hidden="true"
        focusable="false"
      >
        {mark === 'X' ? (
          <g data-testid="ttt-mark-x-strokes">
            {/* Host Mark Stroke 1: top-left to bottom-right */}
            <path
              d="M 22 20 C 32 36, 62 64, 78 80"
              className={animated ? styles.hostMarkPath : undefined}
              style={{
                stroke: 'var(--ttt-host-ink)',
                strokeWidth: 8,
                strokeLinecap: 'round',
                fill: 'none',
              }}
            />
            {/* Host Mark Stroke 2: top-right to bottom-left */}
            <path
              d="M 78 22 C 64 38, 34 64, 20 78"
              className={animated ? styles.hostMarkPath : undefined}
              style={{
                stroke: 'var(--ttt-host-ink)',
                strokeWidth: 8,
                strokeLinecap: 'round',
                fill: 'none',
                animationDelay: animated ? '40ms' : undefined,
              }}
            />
          </g>
        ) : (
          <g data-testid="ttt-mark-o-loop">
            {/* Guest Mark: single continuous looped stroke with ~8% overlap tail */}
            <path
              d="M 72 28 C 48 16, 24 28, 22 52 C 20 74, 38 84, 52 84 C 72 84, 82 68, 80 44 C 78 28, 66 22, 58 22"
              className={animated ? styles.guestMarkPath : undefined}
              style={{
                stroke: 'var(--ttt-guest-ink)',
                strokeWidth: 8,
                strokeLinecap: 'round',
                fill: 'none',
              }}
            />
          </g>
        )}
      </svg>
    </div>
  )
}
