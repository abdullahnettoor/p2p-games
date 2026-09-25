'use client'

import React, { useState, useEffect } from 'react'
import { ArrowLeft, CircleHelp, Loader2, Sparkles, Users, X } from 'lucide-react'
import { BingoSoundToggle } from './BingoSoundToggle'
import { useBingoAudio } from '../hooks/useBingoAudio'
import { cn } from '@/lib/utils'
import styles from './BingoMatchLobby.module.css'
import '../bingoTokens.css'

export interface BingoStrangerSearchScreenProps {
  status: 'searching' | 'timeout'
  elapsedSeconds: number
  onCancel: () => void
  onSearchAgain: () => void
  onCreateRoomInstead: () => void
  className?: string
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export const BingoStrangerSearchScreen: React.FC<BingoStrangerSearchScreenProps> = ({
  status,
  elapsedSeconds,
  onCancel,
  onSearchAgain,
  onCreateRoomInstead,
  className,
}) => {
  const { isMuted, toggleMute } = useBingoAudio(null)
  const [showRules, setShowRules] = useState(false)

  useEffect(() => {
    if (!showRules) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowRules(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showRules])

  return (
    <div className={cn('bingoTokenScope', styles.lobbySurface, className)}>
      <div className={styles.lobbyInner}>
        <header className={styles.utilityBar}>
          <button
            type="button"
            onClick={onCancel}
            className={styles.utilityButton}
            aria-label={status === 'searching' ? 'Cancel matchmaking search' : 'Back to mode selection'}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{status === 'searching' ? 'Cancel' : 'Back'}</span>
          </button>
          <h1 className={styles.shellTitle}>BINGO</h1>
          <div className={styles.utilityGroup}>
            <BingoSoundToggle isMuted={isMuted} onToggle={toggleMute} />
            <button
              type="button"
              onClick={() => setShowRules(true)}
              aria-label="Bingo rules"
              aria-expanded={showRules}
              className={styles.rulesButton}
            >
              <CircleHelp className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Rules</span>
            </button>
          </div>
        </header>

        {status === 'searching' ? (
          <section className={styles.strangerSearchCard} aria-labelledby="stranger-search-title">
            <div className={styles.strangerSearchPulse}>
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
        ) : (
          <section className={styles.strangerSearchCard} aria-labelledby="stranger-timeout-title">
            <div className={styles.strangerSearchPulse} style={{ background: 'rgba(39, 49, 58, 0.08)', color: 'var(--bingo-graphite-muted)' }}>
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

      {showRules ? (
        <div className={styles.rulesSheet} role="presentation" onClick={() => setShowRules(false)}>
          <section
            className={styles.rulesPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bingo-rules-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.rulesHeader}>
              <div>
                <h2 id="bingo-rules-title" className={styles.rulesHeading}>BINGO Sunday Puzzle</h2>
                <p className={styles.inviteReason}>Two-player online variant</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                aria-label="Close Bingo rules"
                className={styles.rulesClose}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <ul>
              <li>Arrange numbers 1–25 on your Board, then choose Ready with this Board.</li>
              <li>Players take turns calling one number. Marks and completed lines appear in the caller&apos;s ink.</li>
              <li>The first Player to complete five lines wins. A turn may be passed when needed.</li>
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  )
}
