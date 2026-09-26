'use client'

import React, { useMemo } from 'react'
import { BestOfSeriesLength } from '@/core/series'
import styles from './TicTacToeMarginTally.module.css'
import '../ticTacToeTokens.css'

export interface TicTacToeMarginTallyProps {
  hostScore: number
  guestScore: number
  bestOf?: BestOfSeriesLength
  className?: string
}

/**
 * Renders an authentic 5-bar gate tally cluster (up to 5 strokes per cluster).
 */
const TallyCluster: React.FC<{
  count: number // 1 to 5
  inkColor: string
  clusterIndex: number
  playerPrefix: string
}> = ({ count, inkColor, clusterIndex, playerPrefix }) => {
  // Pre-calculated organic variations for strokes 1 to 5
  return (
    <svg
      viewBox="0 0 28 32"
      width={28}
      height={32}
      className={styles.tallySvg}
      aria-hidden="true"
      data-testid={`tally-cluster-${playerPrefix}-${clusterIndex}`}
    >
      {/* Vertical stroke 1 */}
      {count >= 1 && (
        <path
          d="M 5 5 C 4.8 12, 5.2 20, 5 27"
          stroke={inkColor}
          className={styles.tallyStroke}
          data-testid={`${playerPrefix}-tally-stroke-1`}
        />
      )}
      {/* Vertical stroke 2 */}
      {count >= 2 && (
        <path
          d="M 10 4 C 10.2 11, 9.8 19, 10 27"
          stroke={inkColor}
          className={styles.tallyStroke}
          data-testid={`${playerPrefix}-tally-stroke-2`}
        />
      )}
      {/* Vertical stroke 3 */}
      {count >= 3 && (
        <path
          d="M 15 5 C 14.9 13, 15.2 21, 15 28"
          stroke={inkColor}
          className={styles.tallyStroke}
          data-testid={`${playerPrefix}-tally-stroke-3`}
        />
      )}
      {/* Vertical stroke 4 */}
      {count >= 4 && (
        <path
          d="M 20 4 C 20.1 12, 19.8 20, 20 27"
          stroke={inkColor}
          className={styles.tallyStroke}
          data-testid={`${playerPrefix}-tally-stroke-4`}
        />
      )}
      {/* Diagonal cross stroke 5 for completed gate */}
      {count >= 5 && (
        <path
          d="M 2 25 C 10 18, 16 12, 24 7"
          stroke={inkColor}
          className={styles.tallyStroke}
          data-testid={`${playerPrefix}-tally-stroke-5`}
        />
      )}
    </svg>
  )
}

/**
 * TicTacToeMarginTally renders series score tallies in the left margin:
 * - One column per player: Host (blue ink) and Guest (red ink)
 * - 5-bar gate tally clusters (4 vertical + 1 diagonal cross stroke)
 * - Target marker indicating Match series winning threshold
 * - Screen reader accessible score summary
 */
export const TicTacToeMarginTally: React.FC<TicTacToeMarginTallyProps> = ({
  hostScore,
  guestScore,
  bestOf = 3,
  className = '',
}) => {
  const targetWins = Math.ceil(bestOf / 2)

  const renderTallyClusters = (score: number, inkColor: string, prefix: string) => {
    if (score === 0) {
      return (
        <span className={styles.emptyTally} data-testid={`${prefix}-tally-empty`}>
          0
        </span>
      )
    }

    const clusters: React.ReactNode[] = []
    const fullGates = Math.floor(score / 5)
    const remainder = score % 5

    for (let i = 0; i < fullGates; i++) {
      clusters.push(
        <TallyCluster
          key={`full-${i}`}
          count={5}
          inkColor={inkColor}
          clusterIndex={i}
          playerPrefix={prefix}
        />
      )
    }

    if (remainder > 0) {
      clusters.push(
        <TallyCluster
          key={`rem-${fullGates}`}
          count={remainder}
          inkColor={inkColor}
          clusterIndex={fullGates}
          playerPrefix={prefix}
        />
      )
    }

    return clusters
  }

  const ariaSummary = useMemo(() => {
    return `Series score: Host ${hostScore}, Guest ${guestScore}. Target is ${targetWins} win${
      targetWins === 1 ? '' : 's'
    } (Best of ${bestOf}).`
  }, [hostScore, guestScore, targetWins, bestOf])

  return (
    <div
      className={`${styles.tallyWrapper} ${className}`}
      data-testid="ttt-margin-tally"
      role="region"
      aria-label={ariaSummary}
    >
      <header className={styles.tallyHeader}>
        <span className={styles.tallyHeading}>Series</span>
        <div
          className={styles.targetBadge}
          data-testid="ttt-tally-target-marker"
          title={`First to ${targetWins} wins takes the Match`}
        >
          <span>Goal:</span>
          <strong>{targetWins}</strong>
        </div>
      </header>

      <div className={styles.columnsContainer}>
        {/* Host Column */}
        <div
          className={styles.playerColumn}
          data-testid="host-tally-column"
          aria-label={`Host score: ${hostScore}`}
        >
          <span className={`${styles.playerLabel} ${styles.hostLabel}`}>
            H <span aria-hidden="true">(X)</span>
          </span>
          <div className={styles.marksList}>
            {renderTallyClusters(hostScore, 'var(--ttt-host-ink)', 'host')}
          </div>
        </div>

        {/* Guest Column */}
        <div
          className={styles.playerColumn}
          data-testid="guest-tally-column"
          aria-label={`Guest score: ${guestScore}`}
        >
          <span className={`${styles.playerLabel} ${styles.guestLabel}`}>
            G <span aria-hidden="true">(O)</span>
          </span>
          <div className={styles.marksList}>
            {renderTallyClusters(guestScore, 'var(--ttt-guest-ink)', 'guest')}
          </div>
        </div>
      </div>
    </div>
  )
}
