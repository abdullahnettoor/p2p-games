import React, { useEffect, useRef, useState } from 'react'
import { BINGO_LETTERS } from '../engine'
import { cn } from '@/lib/utils'
import { BingoInkRole } from '../bingoInk'
import styles from './BingoScorecard.module.css'

interface BingoLetterTrackerProps {
  completedLines: number
  ownerRole?: BingoInkRole
  className?: string
}

const STAMP_ROTATIONS = ['-2deg', '1deg', '-1deg', '2deg', '-1.5deg'] as const

export const BingoLetterTracker: React.FC<BingoLetterTrackerProps> = ({
  completedLines,
  ownerRole = 'host',
  className,
}) => {
  const previousCompletedLinesRef = useRef(completedLines)
  const [newStampStart, setNewStampStart] = useState(completedLines)

  useEffect(() => {
    const previousCompletedLines = previousCompletedLinesRef.current
    setNewStampStart(
      completedLines > previousCompletedLines ? previousCompletedLines : completedLines
    )
    previousCompletedLinesRef.current = completedLines
  }, [completedLines])

  return (
    <div
      className={cn(
        styles.tokenScope,
        styles.letterTracker,
        styles.playerInk,
        className
      )}
      data-ink={ownerRole}
      aria-label={`${Math.min(completedLines, 5)} of 5 Bingo lines complete`}
    >
      {BINGO_LETTERS.map((letter, index) => {
        const isActive = index < completedLines
        const isNew = isActive && index >= newStampStart
        return (
          <span
            key={letter}
            data-active={isActive ? 'true' : 'false'}
            data-new-stamp={isNew ? 'true' : 'false'}
            data-ink={ownerRole}
            className={styles.letterStamp}
            style={{
              '--stamp-rotation': STAMP_ROTATIONS[index],
              animationDelay: isNew ? `${(index - newStampStart) * 110}ms` : undefined,
            } as React.CSSProperties}
          >
            {letter}
          </span>
        )
      })}
    </div>
  )
}
