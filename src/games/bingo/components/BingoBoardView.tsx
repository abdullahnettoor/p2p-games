import React, { useEffect, useMemo, useRef, useState } from 'react'
import { BingoBoard, BingoCall, LineDetails } from '../types'
import { BingoInkRole, BingoPlayerInk, getBingoInkPresentation } from '../bingoInk'
import { cn } from '@/lib/utils'
import styles from './BingoScorecard.module.css'

interface BingoBoardViewProps {
  board: BingoBoard
  calls: BingoCall[]
  playersById: Record<string, BingoPlayerInk>
  boardOwnerRole?: BingoInkRole
  lineDetails?: LineDetails
  ariaLabel?: string
  isMyTurn?: boolean
  onPickNumber?: (num: number) => void
  disabled?: boolean
  className?: string
}

const DEFAULT_LINE_DETAILS: LineDetails = { count: 0, rows: [], cols: [], diags: [] }

const HOST_SCRIBBLE_PATHS = [
  ['M18 19 C35 36 59 61 83 81', 'M79 17 C62 39 40 58 19 84'],
  ['M16 24 C39 40 54 63 85 77', 'M82 20 C61 38 43 69 17 80'],
  ['M21 17 C35 42 62 57 80 84', 'M84 24 C59 37 41 65 16 77'],
] as const

const GUEST_SCRIBBLE_PATHS = [
  ['M51 13 C80 13 91 35 84 62 C77 88 42 93 20 75 C-1 57 15 21 43 15 C70 8 91 28 85 55', 'M25 69 C43 58 60 42 77 25'],
  ['M46 14 C75 8 91 29 87 56 C82 84 51 94 26 82 C0 69 8 34 30 20 C50 7 80 15 87 41', 'M23 31 C39 47 58 61 79 74'],
  ['M53 12 C79 15 91 40 81 66 C70 91 37 91 18 70 C1 50 18 20 43 14 C67 8 90 29 84 55', 'M22 72 C44 59 59 42 78 27'],
] as const

function completedLinePaths(lineDetails: LineDetails): Array<{ id: string; path: string }> {
  const paths: Array<{ id: string; path: string }> = []

  lineDetails.rows.forEach((row, index) => {
    const y = row * 100 + 50
    paths.push({
      id: `row-${row}`,
      path: `M 8 ${y - 2 + index} C 145 ${y + 3} 354 ${y - 4} 492 ${y + 2 - index}`,
    })
  })

  lineDetails.cols.forEach((col, index) => {
    const x = col * 100 + 50
    paths.push({
      id: `col-${col}`,
      path: `M ${x + 2 - index} 8 C ${x - 3} 146 ${x + 4} 354 ${x - 2 + index} 492`,
    })
  })

  if (lineDetails.diags.includes(0)) {
    paths.push({ id: 'diag-0', path: 'M 11 8 C 151 143 347 357 489 492' })
  }
  if (lineDetails.diags.includes(1)) {
    paths.push({ id: 'diag-1', path: 'M 489 9 C 351 151 148 346 10 491' })
  }

  return paths
}

export const BingoBoardView: React.FC<BingoBoardViewProps> = ({
  board,
  calls,
  playersById,
  boardOwnerRole = 'host',
  lineDetails = DEFAULT_LINE_DETAILS,
  ariaLabel = 'Bingo board',
  isMyTurn = false,
  onPickNumber = () => {},
  disabled = false,
  className,
}) => {
  const callByNumber = useMemo(
    () => new Map(calls.map((call) => [call.number, call])),
    [calls]
  )
  const calledSet = useMemo(() => new Set(calls.map((call) => call.number)), [calls])
  const linePaths = useMemo(() => completedLinePaths(lineDetails), [lineDetails])
  const latestSequence = calls.length > 0 ? calls[calls.length - 1].sequence : null
  const lineKey = linePaths.map((line) => line.id).join('|')
  const previousLatestSequenceRef = useRef(latestSequence)
  const previousLineIdsRef = useRef(new Set(linePaths.map((line) => line.id)))
  const [animatedSequence, setAnimatedSequence] = useState<number | null>(null)
  const [animatedLineIds, setAnimatedLineIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (latestSequence !== null && latestSequence !== previousLatestSequenceRef.current) {
      setAnimatedSequence(latestSequence)
    }
    previousLatestSequenceRef.current = latestSequence
  }, [latestSequence])

  useEffect(() => {
    const nextLineIds = new Set(linePaths.map((line) => line.id))
    setAnimatedLineIds(
      new Set(linePaths.map((line) => line.id).filter((id) => !previousLineIdsRef.current.has(id)))
    )
    previousLineIdsRef.current = nextLineIds
  }, [lineKey])

  return (
    <div
      className={cn(styles.tokenScope, styles.boardFrame, className)}
      aria-label={ariaLabel}
      data-testid="bingo-board"
    >
      {board.map((num) => {
        const call = callByNumber.get(num)
        const caller = call ? playersById[call.playerId] : undefined
        const isCalled = calledSet.has(num)
        const canClick = isMyTurn && !isCalled && !disabled
        const callerInk = caller?.role ?? 'neutral'
        const markShape = caller ? getBingoInkPresentation(caller.role).markShape : 'cross'
        const scribblePaths = markShape === 'loop'
          ? GUEST_SCRIBBLE_PATHS[num % GUEST_SCRIBBLE_PATHS.length]
          : HOST_SCRIBBLE_PATHS[num % HOST_SCRIBBLE_PATHS.length]

        return (
          <button
            key={num}
            type="button"
            aria-label={isCalled ? `${num}, called by ${caller?.name ?? 'unknown Player'}` : String(num)}
            aria-pressed={isCalled}
            disabled={!canClick}
            data-enabled={canClick ? 'true' : 'false'}
            onClick={() => {
              if (canClick) onPickNumber(num)
            }}
            className={styles.boardCell}
          >
            <span className={styles.cellNumber}>{num}</span>
            {call ? (
              <svg
                viewBox="0 0 100 100"
                aria-hidden="true"
                className={styles.callScribble}
                data-call-number={num}
                data-ink={callerInk}
                data-mark-shape={markShape}
                data-animated={call.sequence === animatedSequence ? 'true' : 'false'}
              >
                <path pathLength="1" d={scribblePaths[0]} />
                <path pathLength="1" d={scribblePaths[1]} />
              </svg>
            ) : null}
          </button>
        )
      })}

      {linePaths.length > 0 ? (
        <svg
          viewBox="0 0 500 500"
          preserveAspectRatio="none"
          aria-hidden="true"
          className={cn(styles.lineOverlay, styles.playerInk)}
          data-ink={boardOwnerRole}
        >
          {linePaths.map((line, index) => (
            <path
              key={line.id}
              pathLength="1"
              d={line.path}
              className={styles.lineStroke}
              data-completed-line={line.id}
              data-ink={boardOwnerRole}
              data-animated={animatedLineIds.has(line.id) ? 'true' : 'false'}
              style={{ animationDelay: `${index * 70}ms` }}
            />
          ))}
        </svg>
      ) : null}
    </div>
  )
}
