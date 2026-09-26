'use client'

import React from 'react'
import { TicTacToeBoard, TicTacToeMark as MarkType } from '../types'
import { TicTacToeMark } from './TicTacToeMark'
import { TicTacToeStrikeThrough } from './TicTacToeStrikeThrough'
import styles from './TicTacToeBoardGrid.module.css'
import '../ticTacToeTokens.css'

export interface TicTacToeBoardGridProps {
  board: TicTacToeBoard
  winningLine?: number[] | null
  winnerInk?: 'host' | 'guest'
  roundNumber?: number
  onCellClick?: (cellIndex: number) => void
  disabled?: boolean
  interactiveCellIndices?: number[]
  animatedStrokes?: boolean
  className?: string
}

/**
 * TicTacToeBoardGrid renders the 3x3 notebook pencil board:
 * - Four hand-drawn graphite pencil strokes (--ttt-pencil)
 * - Animated draw-in (~240ms) at the start of each round
 * - Accessible 44x44px touch cells
 * - Hand-drawn SVG marks (Host blue X, Guest red O) with deterministic jitter
 * - Deterministic mark jitter seeded from roundNumber * 10 + cellIndex
 * - Winning line strike-through overshooting ~6%
 */
export const TicTacToeBoardGrid: React.FC<TicTacToeBoardGridProps> = ({
  board,
  winningLine = null,
  winnerInk = 'host',
  roundNumber = 1,
  onCellClick,
  disabled = false,
  interactiveCellIndices,
  animatedStrokes = true,
  className = '',
}) => {
  return (
    <div
      className={`${styles.boardContainer} ${className}`}
      data-testid="ttt-board-grid"
      role="grid"
      aria-label="Tic-Tac-Toe Board"
    >
      {/* 4 hand-drawn graphite pencil strokes forming the 3x3 grid */}
      <svg
        viewBox="0 0 300 300"
        className={styles.pencilGridSvg}
        aria-hidden="true"
        focusable="false"
      >
        {/* Vertical line 1 (x ~ 100) */}
        <path
          d="M 100 8 C 99 90, 101 210, 99.5 292"
          className={`${styles.pencilLine} ${animatedStrokes ? styles.pencilStroke : ''}`}
          data-testid="ttt-pencil-v1"
        />
        {/* Vertical line 2 (x ~ 200) */}
        <path
          d="M 200 6 C 201 100, 199 200, 200.5 294"
          className={`${styles.pencilLine} ${animatedStrokes ? styles.pencilStroke : ''}`}
          style={animatedStrokes ? { animationDelay: '30ms' } : undefined}
          data-testid="ttt-pencil-v2"
        />
        {/* Horizontal line 1 (y ~ 100) */}
        <path
          d="M 8 100 C 95 99, 205 101, 292 99.5"
          className={`${styles.pencilLine} ${animatedStrokes ? styles.pencilStroke : ''}`}
          style={animatedStrokes ? { animationDelay: '60ms' } : undefined}
          data-testid="ttt-pencil-h1"
        />
        {/* Horizontal line 2 (y ~ 200) */}
        <path
          d="M 6 200 C 100 201, 200 199, 294 200.5"
          className={`${styles.pencilLine} ${animatedStrokes ? styles.pencilStroke : ''}`}
          style={animatedStrokes ? { animationDelay: '90ms' } : undefined}
          data-testid="ttt-pencil-h2"
        />
      </svg>

      {/* 3x3 interactive board cells */}
      <div className={styles.cellsGrid}>
        {board.map((cellValue, idx) => {
          const row = Math.floor(idx / 3) + 1
          const col = (idx % 3) + 1
          const isInteractive =
            !disabled &&
            cellValue === null &&
            (!interactiveCellIndices || interactiveCellIndices.includes(idx))

          const cellLabel = cellValue
            ? `Row ${row} Column ${col}, marked with ${cellValue}`
            : `Row ${row} Column ${col}, empty`

          const markSeed = roundNumber * 10 + idx

          return (
            <button
              key={idx}
              type="button"
              data-testid={`ttt-cell-${idx}`}
              className={styles.cellButton}
              onClick={() => onCellClick?.(idx)}
              disabled={!isInteractive}
              aria-label={cellLabel}
              role="gridcell"
            >
              {cellValue && (
                <TicTacToeMark
                  mark={cellValue as MarkType}
                  seed={markSeed}
                  animated={animatedStrokes}
                  size="75%"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Winning line strike-through if round is won */}
      {winningLine && winningLine.length >= 3 && (
        <TicTacToeStrikeThrough
          line={winningLine}
          winnerInk={winnerInk}
          animated={animatedStrokes}
        />
      )}
    </div>
  )
}
