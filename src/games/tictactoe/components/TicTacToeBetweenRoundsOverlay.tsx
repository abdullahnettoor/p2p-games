'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { formatSeriesScore } from '../seriesScore'
import { SeriesState } from '@/core/series/types'
import { PlayerSummary, TicTacToeRoundRecord } from '../state/types'
import { cn } from '@/lib/utils'
import styles from './TicTacToeBetweenRoundsOverlay.module.css'

export interface TicTacToeBetweenRoundsOverlayProps {
  seriesState: SeriesState
  roundRecords: TicTacToeRoundRecord[]
  localPlayer: PlayerSummary
  remotePlayer: PlayerSummary
  secondsRemaining: number
  localReady: boolean
  remoteReady: boolean
  isHostWaitingInGrace: boolean
  onNext: () => void
  className?: string
}

export const TicTacToeBetweenRoundsOverlay: React.FC<TicTacToeBetweenRoundsOverlayProps> = ({
  seriesState,
  roundRecords,
  localPlayer,
  remotePlayer,
  secondsRemaining,
  localReady,
  remoteReady,
  isHostWaitingInGrace,
  onNext,
  className,
}) => {
  const lastRound = roundRecords[roundRecords.length - 1]
  const lastRoundNum = lastRound?.roundNumber ?? seriesState.currentRoundNumber - 1

  let resultTitle = `Round ${lastRoundNum} is a Draw!`
  let resultClass = ''

  if (lastRound && !lastRound.isDraw && lastRound.winnerId) {
    if (lastRound.winnerId === localPlayer.id) {
      resultTitle = `You won Round ${lastRoundNum}!`
      resultClass = styles.resultTitleWon
    } else {
      resultTitle = `${remotePlayer.name} won Round ${lastRoundNum}!`
      resultClass = styles.resultTitleLost
    }
  }

  const scoreText = formatSeriesScore(seriesState, localPlayer.id, remotePlayer.name)

  return (
    <div
      className={cn(styles.overlayBackdrop, className)}
      role="dialog"
      aria-label="Round Result and Series Score"
      aria-modal="true"
      data-testid="ttt-between-rounds-overlay"
    >
      <div className={styles.modalCard}>
        <span className={styles.roundBadge}>Round Complete</span>
        <h2 className={cn(styles.resultTitle, resultClass)}>{resultTitle}</h2>

        <div className={styles.scoreBanner} data-testid="ttt-series-score-banner">
          {scoreText}
        </div>

        {isHostWaitingInGrace ? (
          <div className={styles.waitingHostText} data-testid="ttt-waiting-host">
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            <span>Waiting for Host to reconnect...</span>
          </div>
        ) : (
          <button
            type="button"
            className={styles.nextButton}
            onClick={onNext}
            disabled={localReady}
            data-testid="ttt-next-round-btn"
          >
            {localReady
              ? remoteReady
                ? 'Starting next round...'
                : 'Waiting for opponent...'
              : `Next (starts in ${secondsRemaining}s)`}
          </button>
        )}
      </div>
    </div>
  )
}
