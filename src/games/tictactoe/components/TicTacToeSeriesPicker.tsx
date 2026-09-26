import React from 'react'
import { BestOfSeriesLength, VALID_SERIES_LENGTHS } from '@/core/series'
import { cn } from '@/lib/utils'
import styles from './TicTacToeSeriesPicker.module.css'

export interface TicTacToeSeriesPickerProps {
  length: BestOfSeriesLength
  isHost: boolean
  isStranger?: boolean
  onSelectLength?: (length: BestOfSeriesLength) => void
  disabled?: boolean
  className?: string
}

const SERIES_LABELS: Record<BestOfSeriesLength, { title: string; sub: string }> = {
  1: { title: 'Best of 1', sub: 'Single game' },
  3: { title: 'Best of 3', sub: 'First to 2' },
  5: { title: 'Best of 5', sub: 'First to 3' },
}

export const TicTacToeSeriesPicker: React.FC<TicTacToeSeriesPickerProps> = ({
  length,
  isHost,
  isStranger = false,
  onSelectLength,
  disabled = false,
  className,
}) => {
  // Stranger matches are always Best of 3 with no picker
  if (isStranger) {
    return null
  }

  // Guests see the format read-only
  if (!isHost) {
    const formatInfo = SERIES_LABELS[length] ?? SERIES_LABELS[3]
    return (
      <div
        className={cn(styles.container, className)}
        data-testid="series-picker-guest"
      >
        <div className={styles.headerRow}>
          <span className={styles.label}>Match Format</span>
          <span className={styles.guestBadge} data-testid="guest-series-length">
            {formatInfo.title}
          </span>
        </div>
        <p className={styles.helperText}>
          {formatInfo.sub} • Picked by Host
        </p>
      </div>
    )
  }

  // Host can choose Best of 1 / 3 / 5
  return (
    <div
      className={cn(styles.container, className)}
      data-testid="series-picker-host"
    >
      <div className={styles.headerRow}>
        <span className={styles.label}>Match Format</span>
      </div>

      <div
        className={styles.buttonGroup}
        role="radiogroup"
        aria-label="Match Format"
      >
        {VALID_SERIES_LENGTHS.map((len) => {
          const isSelected = length === len
          const info = SERIES_LABELS[len]

          return (
            <button
              key={len}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              className={cn(
                styles.optionButton,
                isSelected && styles.optionButtonSelected
              )}
              onClick={() => onSelectLength?.(len)}
              data-testid={`series-option-${len}`}
            >
              <span>{info.title}</span>
              <span className={styles.optionSubtext}>{info.sub}</span>
            </button>
          )
        })}
      </div>

      <p className={styles.helperText}>
        Changing format un-readies both players.
      </p>
    </div>
  )
}
