'use client'

import React, { useState, useEffect } from 'react'
import { ArrowLeft, CircleHelp, KeyRound, Sparkles, Users, X } from 'lucide-react'
import { BingoSoundToggle } from './BingoSoundToggle'
import { useBingoAudio } from '../hooks/useBingoAudio'
import { cn } from '@/lib/utils'
import styles from './BingoMatchLobby.module.css'
import '../bingoTokens.css'

export interface BingoChoiceScreenProps {
  onCreateRoom: () => void
  onJoinWithCode: () => void
  onPlayStranger: () => void
  onExit: () => void
  className?: string
}

export const BingoChoiceScreen: React.FC<BingoChoiceScreenProps> = ({
  onCreateRoom,
  onJoinWithCode,
  onPlayStranger,
  onExit,
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
            onClick={onExit}
            className={styles.utilityButton}
            aria-label="Exit to game catalog"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Exit</span>
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

        <section className={styles.choiceSection} aria-label="Game mode selection">
          <div className={styles.choiceHeader}>
            <h2 className={styles.choiceHeading}>Choose how to play</h2>
            <p className={styles.choiceSubheading}>
              Two-player Sunday puzzle with direct peer-to-peer connection.
            </p>
          </div>

          <div className={styles.choiceList}>
            <button
              type="button"
              onClick={onCreateRoom}
              className={styles.choiceCard}
              data-variant="create"
            >
              <div className={styles.choiceIconWrapper}>
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className={styles.choiceText}>
                <span className={styles.choiceTitle}>Create a room</span>
                <span className={styles.choiceDesc}>
                  Host a game and invite a friend with a link, code, or QR.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={onJoinWithCode}
              className={styles.choiceCard}
              data-variant="join"
            >
              <div className={styles.choiceIconWrapper}>
                <KeyRound className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className={styles.choiceText}>
                <span className={styles.choiceTitle}>Join with a code</span>
                <span className={styles.choiceDesc}>
                  Enter a 6-character room code from your friend.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={onPlayStranger}
              className={styles.choiceCard}
              data-variant="stranger"
            >
              <div className={styles.choiceIconWrapper}>
                <Users className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className={styles.choiceText}>
                <span className={styles.choiceTitle}>Play with a stranger</span>
                <span className={styles.choiceDesc}>
                  Match with a random player looking for a game online.
                </span>
              </div>
            </button>
          </div>
        </section>
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
