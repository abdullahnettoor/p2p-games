'use client'

import React from 'react'
import { WinResult } from '@/core/games/types'
import { SeriesState } from '@/core/series/types'
import { formatSeriesScore } from '../seriesScore'
import { PlayerSummary, RematchState, TicTacToeRoundRecord } from '../state/types'
import { cn } from '@/lib/utils'
import styles from './TicTacToeResultScreen.module.css'

export interface TicTacToeResultScreenProps {
  winResult: WinResult
  seriesState: SeriesState
  roundRecords: TicTacToeRoundRecord[]
  localPlayer: PlayerSummary
  remotePlayer: PlayerSummary
  rematchState: RematchState
  onRequestRematch: () => void
  onAcceptRematch: () => void
  onDeclineRematch: () => void
  onExit: () => void
  className?: string
}

export const TicTacToeResultScreen: React.FC<TicTacToeResultScreenProps> = ({
  winResult,
  seriesState,
  roundRecords,
  localPlayer,
  remotePlayer,
  rematchState,
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  onExit,
  className,
}) => {
  const isWinner = winResult.winnerId === localPlayer.id
  const isLoser = winResult.winnerId === remotePlayer.id
  const isDraw = winResult.isDraw || (!isWinner && !isLoser && !winResult.winnerId)
  const isForfeit = winResult.reason === 'forfeit'
  const isAbandoned = winResult.reason === 'disconnect'

  let headline = isAbandoned ? 'Match ended: connection lost' : 'Drawn match'
  let headlineClass = ''

  if (isWinner) {
    headline = 'You Won the Match!'
    headlineClass = styles.matchTitleWon
  } else if (isLoser) {
    headline = `${remotePlayer.name} Won the Match`
    headlineClass = styles.matchTitleLost
  }

  const scoreText = formatSeriesScore(seriesState, localPlayer.id, remotePlayer.name)

  return (
    <div
      className={cn(styles.resultContainer, className)}
      role="dialog"
      aria-label="Match Results"
      data-testid="ttt-result-screen"
    >
      <div className={styles.resultCard}>
        <h1 className={cn(styles.matchTitle, headlineClass)}>{headline}</h1>

        {isForfeit && (
          <span className={styles.forfeitSubtitle} data-testid="ttt-forfeit-label">
            Ended by forfeit
          </span>
        )}

        <div className={styles.scoreBanner} data-testid="ttt-final-score">
          {scoreText}
        </div>

        {/* Round by Round list */}
        {roundRecords.length > 0 && (
          <div className={styles.roundsList} role="list" aria-label="Rounds breakdown">
            {roundRecords.map((round) => {
              let outcomeLabel = 'Draw'
              if (!round.isDraw && round.winnerId) {
                outcomeLabel = round.winnerId === localPlayer.id ? 'You won' : `${remotePlayer.name} won`
              }
              const starterLabel =
                round.startingPlayerId === localPlayer.id ? 'You started' : `${remotePlayer.name} started`

              return (
                <div key={round.roundNumber} className={styles.roundRow} role="listitem">
                  <span className={styles.roundNum}>Round {round.roundNumber}</span>
                  <span className={styles.roundResult}>{outcomeLabel}</span>
                  <span className="text-[10px] text-slate-400">{starterLabel}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Rematch & Exit Actions */}
        <div className={styles.actionsContainer}>
          {rematchState === 'none' && (
            <button
              type="button"
              className={styles.rematchBtn}
              onClick={onRequestRematch}
              data-testid="ttt-rematch-btn"
            >
              Rematch
            </button>
          )}

          {rematchState === 'requested' && (
            <button
              type="button"
              className={styles.rematchBtn}
              disabled
              data-testid="ttt-rematch-waiting"
            >
              Rematch requested...
            </button>
          )}

          {rematchState === 'received' && (
            <div className={styles.rematchChoiceGroup}>
              <button
                type="button"
                className={styles.acceptBtn}
                onClick={onAcceptRematch}
                data-testid="ttt-accept-rematch-btn"
              >
                Accept Rematch
              </button>
              <button
                type="button"
                className={styles.declineBtn}
                onClick={onDeclineRematch}
                data-testid="ttt-decline-rematch-btn"
              >
                Decline
              </button>
            </div>
          )}

          {rematchState === 'declined' && (
            <button
              type="button"
              className={styles.rematchBtn}
              disabled
              data-testid="ttt-rematch-declined"
            >
              Rematch declined
            </button>
          )}

          <button
            type="button"
            className={styles.exitBtn}
            onClick={onExit}
            data-testid="ttt-exit-catalog-btn"
          >
            Exit to Catalog
          </button>
        </div>
      </div>
    </div>
  )
}
