'use client'

import React, { useState } from 'react'
import { TicTacToeBoard, TicTacToeMark as MarkType } from '../types'
import { NotebookSurface } from './NotebookSurface'
import { TicTacToeBoardGrid } from './TicTacToeBoardGrid'
import { TicTacToeMarginTally } from './TicTacToeMarginTally'
import { TicTacToePageTurn } from './TicTacToePageTurn'
import styles from './TicTacToePrimitivesShowcase.module.css'
import '../ticTacToeTokens.css'

/**
 * TicTacToePrimitivesShowcase presents all static visual primitives in isolation:
 * - Notebook paper surface with squared graph lines and pale pink margin line
 * - 4 hand-drawn pencil strokes drawing in at start of round
 * - Authentic hand-drawn marks (Host X, Guest O) with jitter
 * - Winning line strike-through overshooting ~6%
 * - Series margin tallies (5-bar gates) with target marker
 * - Page-turn transition (≤ 400ms) with reduced-motion fallback
 */
export const TicTacToePrimitivesShowcase: React.FC = () => {
  const [board, setBoard] = useState<TicTacToeBoard>([
    'X', 'O', 'X',
    null, 'X', null,
    'O', null, 'O',
  ])
  const [currentTurn, setCurrentTurn] = useState<MarkType>('X')
  const [hostScore, setHostScore] = useState(2)
  const [guestScore, setGuestScore] = useState(1)
  const [roundNumber, setRoundNumber] = useState(4)
  const [winningLine, setWinningLine] = useState<number[] | null>([0, 4, 8])
  const [winnerInk, setWinnerInk] = useState<'host' | 'guest'>('host')
  const [isTurning, setIsTurning] = useState(false)

  const handleCellClick = (index: number) => {
    if (board[index] !== null) return
    const nextBoard = [...board]
    nextBoard[index] = currentTurn
    setBoard(nextBoard)
    setCurrentTurn(currentTurn === 'X' ? 'O' : 'X')
  }

  const handleTriggerPageTurn = () => {
    setIsTurning(true)
    setTimeout(() => {
      setRoundNumber((r) => r + 1)
      setBoard([null, null, null, null, null, null, null, null, null])
      setWinningLine(null)
      setIsTurning(false)
    }, 360)
  }

  const handleToggleStrike = () => {
    if (winningLine) {
      setWinningLine(null)
    } else {
      setWinningLine([0, 4, 8])
      setWinnerInk('host')
    }
  }

  return (
    <div className={styles.showcaseWrapper} data-testid="ttt-primitives-showcase">
      <NotebookSurface
        marginContent={
          <TicTacToeMarginTally
            hostScore={hostScore}
            guestScore={guestScore}
            bestOf={5}
          />
        }
      >
        <TicTacToePageTurn isTurning={isTurning}>
          <div className={styles.headerRow}>
            <h2 className={styles.title}>Notebook Margin</h2>
            <span className={styles.roundBadge}>Round {roundNumber}</span>
          </div>

          <div className={styles.statusText}>
            {winningLine ? (
              <span>Host won with strike-through!</span>
            ) : (
              <span>
                Turn: {currentTurn === 'X' ? 'Host (X)' : 'Guest (O)'}
              </span>
            )}
          </div>

          <TicTacToeBoardGrid
            board={board}
            winningLine={winningLine}
            winnerInk={winnerInk}
            onCellClick={handleCellClick}
          />

          <div className={styles.controlsBar}>
            <button
              type="button"
              className={`${styles.button} ${styles.primaryButton}`}
              onClick={handleTriggerPageTurn}
              data-testid="showcase-turn-page-btn"
            >
              Turn Page (New Round)
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={handleToggleStrike}
              data-testid="showcase-toggle-strike-btn"
            >
              {winningLine ? 'Clear Strike' : 'Demo Strike-Through'}
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => setHostScore((s) => s + 1)}
              data-testid="showcase-inc-host-btn"
            >
              +1 Host Tally
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => setGuestScore((s) => s + 1)}
              data-testid="showcase-inc-guest-btn"
            >
              +1 Guest Tally
            </button>
          </div>
        </TicTacToePageTurn>
      </NotebookSurface>
    </div>
  )
}
