import React from 'react'
import { Users, AlertCircle, Loader2, Sparkles } from 'lucide-react'
import styles from './entry.module.css'
import { EntryHeader } from './EntryHeader'
import { StrangerSearchScreenProps } from './types'
import { cn } from '@/lib/utils'

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export const StrangerSearchScreen: React.FC<StrangerSearchScreenProps> = ({
  gameTitle,
  className,
  status,
  elapsedSeconds = 0,
  errorMessage,
  onCancel,
  onSearchAgain,
  onCreateRoomInstead,
  renderUtilityRight,
  rules,
  rulesTitle,
  rulesSubtitle,
  rulesContent,
}) => {
  return (
    <div className={cn(styles.entrySurface, className)}>
      <div className={styles.entryInner}>
        <EntryHeader
          gameTitle={gameTitle}
          renderUtilityRight={renderUtilityRight}
          rules={rules}
          rulesTitle={rulesTitle}
          rulesSubtitle={rulesSubtitle}
          rulesContent={rulesContent}
        />

        {status === 'searching' ? (
          <section className={styles.strangerSearchCard} aria-labelledby="stranger-search-title">
            <div className={styles.strangerSearchPulse} data-status="searching">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
            </div>

            <div>
              <h2 id="stranger-search-title" className={styles.joinCodeHeading}>
                Searching for a stranger…
              </h2>
              <p className={styles.joinCodeSubheading}>
                Looking for another player online to start a match.
              </p>
            </div>

            <div className={styles.strangerTimer} role="timer" aria-live="off">
              {formatElapsed(elapsedSeconds)}
            </div>

            <button
              type="button"
              onClick={onCancel}
              className={styles.strangerCancelBtn}
            >
              Cancel
            </button>
          </section>
        ) : status === 'error' ? (
          <section className={styles.strangerSearchCard} aria-labelledby="stranger-error-title">
            <div className={styles.strangerSearchPulse} data-status="error">
              <AlertCircle className="h-8 w-8" aria-hidden="true" />
            </div>

            <div>
              <h2 id="stranger-error-title" className={styles.joinCodeHeading}>
                Connection failed
              </h2>
              <p className={styles.joinCodeSubheading}>
                {errorMessage || 'Unable to connect to matchmaking. Check your internet connection and try again.'}
              </p>
            </div>

            <div className={styles.strangerTimeoutActions}>
              <button
                type="button"
                onClick={onSearchAgain}
                className={styles.strangerPrimaryBtn}
              >
                Retry
              </button>
              <button
                type="button"
                onClick={onCreateRoomInstead}
                className={styles.strangerSecondaryBtn}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>Create a room instead</span>
              </button>
              <button
                type="button"
                onClick={onCancel}
                className={styles.strangerTertiaryBtn}
              >
                Back to menu
              </button>
            </div>
          </section>
        ) : (
          <section className={styles.strangerSearchCard} aria-labelledby="stranger-timeout-title">
            <div className={styles.strangerSearchPulse} data-status="timeout">
              <Users className="h-8 w-8" aria-hidden="true" />
            </div>

            <div>
              <h2 id="stranger-timeout-title" className={styles.joinCodeHeading}>
                No one found right now
              </h2>
              <p className={styles.joinCodeSubheading}>
                No other player is searching right now. You can try searching again, or create a room to invite a friend.
              </p>
            </div>

            <div className={styles.strangerTimeoutActions}>
              <button
                type="button"
                onClick={onSearchAgain}
                className={styles.strangerPrimaryBtn}
              >
                Search again
              </button>
              <button
                type="button"
                onClick={onCreateRoomInstead}
                className={styles.strangerSecondaryBtn}
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>Create a room instead</span>
              </button>
              <button
                type="button"
                onClick={onCancel}
                className={styles.strangerTertiaryBtn}
              >
                Back to menu
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
