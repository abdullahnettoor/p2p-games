import React, { useState } from 'react'
import { BingoBoard } from '../types'
import { generateRandomBingoBoard, validateBingoBoard, TOTAL_NUMBERS } from '../engine'
import { cn } from '@/lib/utils'
import { CheckCircle2, RotateCcw, Shuffle, Trash2 } from 'lucide-react'
import { BingoGrid } from './grid/BingoGrid'
import gridStyles from './grid/BingoGrid.module.css'
import styles from './BingoBoardSetup.module.css'

interface BingoBoardSetupProps {
  initialBoard?: BingoBoard
  onBoardComplete: (board: BingoBoard) => void
  playerName?: string
  submitLabel?: string
  className?: string
}

function createEmptyBoard(): Array<number | null> {
  return Array(TOTAL_NUMBERS).fill(null)
}

export const BingoBoardSetup: React.FC<BingoBoardSetupProps> = ({
  initialBoard,
  onBoardComplete,
  playerName = 'Player',
  submitLabel = 'Confirm Board',
  className,
}) => {
  const [board, setBoard] = useState<Array<number | null>>(() => {
    if (initialBoard && initialBoard.length === TOTAL_NUMBERS) return [...initialBoard]
    return createEmptyBoard()
  })
  const [boardHistory, setBoardHistory] = useState<Array<Array<number | null>>>([])
  const [selectedSwapIndex, setSelectedSwapIndex] = useState<number | null>(null)

  const placedCount = board.reduce<number>((count, number) => count + (number === null ? 0 : 1), 0)
  const nextNumber = placedCount < TOTAL_NUMBERS ? placedCount + 1 : null
  const isComplete = placedCount === TOTAL_NUMBERS
  const validation = isComplete ? validateBingoBoard(board as BingoBoard) : { valid: false }

  const commitBoard = (nextBoard: Array<number | null>) => {
    setBoardHistory((history) => [...history, board])
    setBoard(nextBoard)
    setSelectedSwapIndex(null)
  }

  const handleRandomize = () => commitBoard(generateRandomBingoBoard())

  const handleClear = () => {
    if (placedCount === 0) return
    commitBoard(createEmptyBoard())
  }

  const handleUndo = () => {
    if (boardHistory.length === 0) return
    setBoard(boardHistory[boardHistory.length - 1])
    setBoardHistory((history) => history.slice(0, -1))
    setSelectedSwapIndex(null)
  }

  const handleCellClick = (index: number) => {
    const number = board[index]

    if (number === null) {
      if (nextNumber === null) return
      const nextBoard = [...board]
      nextBoard[index] = nextNumber
      commitBoard(nextBoard)
      return
    }

    if (selectedSwapIndex === null) {
      setSelectedSwapIndex(index)
      return
    }

    if (selectedSwapIndex === index) {
      setSelectedSwapIndex(null)
      return
    }

    const nextBoard = [...board]
    ;[nextBoard[selectedSwapIndex], nextBoard[index]] = [nextBoard[index], nextBoard[selectedSwapIndex]]
    commitBoard(nextBoard)
  }

  const handleConfirm = () => {
    if (isComplete && validation.valid) onBoardComplete(board as BingoBoard)
  }

  return (
    <div className={cn(styles.setup, className)}>
      <div>
        <h2 className={styles.heading}>Set up your Board</h2>
        <p className={styles.instructions}>
          {playerName}, tap any empty cell to place each number in order.
        </p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolGroup}>
          <button type="button" onClick={handleRandomize} aria-label="Shuffle board" className={styles.toolButton}>
            <Shuffle className="h-4 w-4" aria-hidden="true" />
            <span>Shuffle</span>
          </button>
          <button type="button" onClick={handleUndo} disabled={boardHistory.length === 0} aria-label="Undo last change" className={styles.toolButton}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Undo</span>
          </button>
          <button type="button" onClick={handleClear} disabled={placedCount === 0} aria-label="Clear board" className={styles.toolButton}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>Clear</span>
          </button>
        </div>

        <div className={styles.progress} data-complete={isComplete ? 'true' : 'false'} aria-live="polite">
          <strong>{nextNumber === null ? 'All 25 placed' : `Place ${nextNumber}`}</strong>
          <span>{placedCount}/{TOTAL_NUMBERS}</span>
        </div>
      </div>

      <BingoGrid
        ariaLabel="BINGO Board setup"
        className={styles.boardGrid}
        renderCell={({ index }) => {
          const number = board[index]
          const row = Math.floor(index / 5) + 1
          const column = (index % 5) + 1
          const isSelected = selectedSwapIndex === index
          const selectedNumber = selectedSwapIndex === null ? null : board[selectedSwapIndex]
          const action = number === null
            ? `Empty cell, row ${row}, column ${column}. Place ${nextNumber}`
            : isSelected
              ? `Number ${number}, row ${row}, column ${column}. Selected for swap`
              : selectedNumber !== null
                ? `Number ${number}, row ${row}, column ${column}. Swap with number ${selectedNumber}`
                : `Number ${number}, row ${row}, column ${column}. Select to swap`

          return (
            <button
              type="button"
              aria-label={action}
              aria-pressed={number === null ? undefined : isSelected}
              onClick={() => handleCellClick(index)}
              className={cn(
                gridStyles.gridButton,
                number !== null
                  ? isSelected
                    ? 'bg-amber-100 text-amber-900 ring-2 ring-amber-500'
                    : 'bg-white text-slate-800 hover:bg-emerald-50'
                  : 'bg-white/60 text-slate-400 hover:bg-emerald-50',
              )}
            >
              {number ?? <span className="text-xs text-slate-400 font-normal">{index + 1}</span>}
            </button>
          )
        }}
      />

      <p className={styles.swapHint} data-selected={selectedSwapIndex !== null ? 'true' : 'false'} role={selectedSwapIndex !== null ? 'status' : undefined}>
        {selectedSwapIndex !== null
          ? `Number ${board[selectedSwapIndex]} selected. Choose another filled cell to swap.`
          : 'Tap two filled cells to swap them.'}
      </p>

      <button
        type="button"
        disabled={!isComplete || !validation.valid}
        onClick={handleConfirm}
        className={styles.submitButton}
      >
        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        <span>{submitLabel}</span>
      </button>
    </div>
  )
}
