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
 * - Hand-drawn SVG marks (Host blue X, Guest red O) with jitter
 * - Winning line strike-through overshooting ~6%
 */
export const TicTacToeBoardGrid: React.FC<TicTacToeBoardGridProps> = ({
  board,
  winningLine = null,
  winnerInk = 'host',
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
      {/* Hand-drawn pencil grid strokes */}
      <svg
        viewBox="0 0 300 300"
        className={styles.pencilGridSvg}
        aria-hidden="true"
        focusable="false"
        data-testid="ttt-pencil-grid-svg"
      >
        <g data-testid="ttt-pencil-strokes">
          {/* Vertical stroke 1 (between col 0 and 1) */}
          <path
            d="M 101 12 C 98 85, 103 210, 99 288"
            className={animatedStrokes ? styles.pencilStroke : undefined}
            data-testid="ttt-pencil-v1"
          />
          {/* Vertical stroke 2 (between col 1 and 2) */}
          <path
            d="M 199 14 C 202 90, 197 205, 201 286"
            className={animatedStrokes ? styles.pencilStroke : undefined}
            data-testid="ttt-pencil-v2"
          />
          {/* Horizontal stroke 1 (between row 0 and 1) */}
          <path
            d="M 14 99 C 90 102, 210 97, 286 101"
            className={animatedStrokes ? styles.pencilStroke : undefined}
            data-testid="ttt-pencil-h1"
          />
          {/* Horizontal stroke 2 (between row 1 and 2) */}
          <path
            d="M 12 201 C 92 198, 206 203, 288 199"
            className={animatedStrokes ? styles.pencilStroke : undefined}
            data-testid="ttt-pencil-h2"
          />
        </g>
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
                  seed={idx}
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
