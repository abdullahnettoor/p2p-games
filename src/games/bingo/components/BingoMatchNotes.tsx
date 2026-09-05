import React from 'react'
import { BingoTurnEvent } from '../types'
import { BingoPlayerInk, getBingoInkPresentation } from '../bingoInk'
import styles from './BingoMatchNotes.module.css'

export interface BingoMatchNotesProps {
  history: BingoTurnEvent[]
  playersById: Record<string, BingoPlayerInk>
  className?: string
}

function eventLabel(event: BingoTurnEvent, player: BingoPlayerInk): string {
  if (event.type === 'call') return `${player.name} called ${event.number}`
  return `${player.name} ${event.reason === 'timeout' ? 'timed out' : 'passed'}`
}

export const BingoMatchNotes: React.FC<BingoMatchNotesProps> = ({
  history,
  playersById,
  className,
}) => {
  return (
    <details className={`${styles.matchNotes} ${className ?? ''}`.trim()}>
      <summary className={styles.matchNotesSummary}>Match notes</summary>
      <ol className={styles.matchNotesList} aria-label="Complete Match history">
        {history.length === 0 ? (
          <li className={styles.matchNoteEmpty}>No Calls or Passes yet.</li>
        ) : (
          history.map((event) => {
            const player = playersById[event.playerId]
            const label = eventLabel(event, player)
            const mark = event.type === 'call' ? getBingoInkPresentation(player.role).markGlyph : '·'
            return (
              <li
                key={event.sequence}
                className={styles.matchNote}
                data-ink={event.type === 'call' ? player.role : undefined}
              >
                <span className={styles.matchNoteSequence}>{event.sequence}</span>
                <span className={styles.matchNoteMark} aria-hidden="true">{mark}</span>
                <span>{label}</span>
              </li>
            )
          })
        )}
      </ol>
    </details>
  )
}
