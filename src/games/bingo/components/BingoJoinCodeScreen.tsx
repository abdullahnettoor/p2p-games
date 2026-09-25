'use client'

import React, { useState, useEffect } from 'react'
import { ArrowLeft, CircleHelp, KeyRound, X } from 'lucide-react'
import { BingoSoundToggle } from './BingoSoundToggle'
import { useBingoAudio } from '../hooks/useBingoAudio'
import { extractRoomCode } from '@/core/lobby/roomCode'
import { cn } from '@/lib/utils'
import styles from './BingoMatchLobby.module.css'
import '../bingoTokens.css'

export interface BingoJoinCodeScreenProps {
  onJoin: (code: string) => void
  onBack: () => void
  initialError?: string | null
  className?: string
}

export const BingoJoinCodeScreen: React.FC<BingoJoinCodeScreenProps> = ({
  onJoin,
  onBack,
  initialError = null,
  className,
}) => {
  const { isMuted, toggleMute } = useBingoAudio(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(initialError)
  const [showRules, setShowRules] = useState(false)

  useEffect(() => {
    if (!showRules) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowRules(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showRules])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = extractRoomCode(code)
    if (!cleanCode) {
      setError('Enter a valid 6-character room code.')
      return
    }
    setError(null)
    onJoin(cleanCode)
  }

  return (
    <div className={cn('bingoTokenScope', styles.lobbySurface, className)}>
      <div className={styles.lobbyInner}>
        <header className={styles.utilityBar}>
          <button
            type="button"
            onClick={onBack}
            className={styles.utilityButton}
            aria-label="Back to menu"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back</span>
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

        <section className={styles.joinCodeCard} aria-labelledby="join-code-title">
          <div className={styles.choiceIconWrapper} style={{ background: 'rgba(166, 61, 87, 0.1)', color: 'var(--bingo-guest-ink)' }}>
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 id="join-code-title" className={styles.joinCodeHeading}>Join with a code</h2>
            <p className={styles.joinCodeSubheading}>
              Enter the 6-character room code shared by your friend.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.joinCodeForm}>
            <label htmlFor="bingo-join-code-input" className="sr-only">
              Room code
            </label>
            <input
              id="bingo-join-code-input"
              type="text"
              placeholder="CODE"
              maxLength={6}
              value={code}
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase())
                if (error) setError(null)
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'join-code-error' : undefined}
              className={styles.joinCodeInputLarge}
            />

            {error ? (
              <p id="join-code-error" className={styles.joinCodeError} role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={code.trim().length === 0}
              className={styles.joinCodeSubmit}
            >
              Join Room
            </button>
          </form>
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
