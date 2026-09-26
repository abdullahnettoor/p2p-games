import React, { useState } from 'react'
import { KeyRound } from 'lucide-react'
import styles from './entry.module.css'
import { EntryHeader } from './EntryHeader'
import { JoinCodeScreenProps } from './types'
import { extractRoomCode } from '@/core/lobby/roomCode'
import { cn } from '@/lib/utils'

export const JoinCodeScreen: React.FC<JoinCodeScreenProps> = ({
  gameId,
  gameTitle,
  className,
  inputId,
  heading = 'Join with a code',
  subheading = 'Enter the 6-character room code shared by your friend.',
  submitLabel = 'Join Room',
  initialError = null,
  onJoin,
  onBack,
  renderUtilityRight,
  rules,
  rulesTitle,
  rulesSubtitle,
  rulesContent,
}) => {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(initialError)

  const effectiveInputId = inputId || `${gameId.toLowerCase()}-join-code-input`

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.toUpperCase())
    if (error) setError(null)
  }

  return (
    <div className={cn(styles.entrySurface, className)}>
      <div className={styles.entryInner}>
        <EntryHeader
          gameTitle={gameTitle}
          onBack={onBack}
          backAriaLabel="Back to menu"
          backText="Back"
          renderUtilityRight={renderUtilityRight}
          rules={rules}
          rulesTitle={rulesTitle}
          rulesSubtitle={rulesSubtitle}
          rulesContent={rulesContent}
        />

        <section className={styles.joinCodeCard} aria-labelledby="join-code-title">
          <div className={styles.choiceIconWrapper} data-variant="join">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 id="join-code-title" className={styles.joinCodeHeading}>
              {heading}
            </h2>
            <p className={styles.joinCodeSubheading}>{subheading}</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.joinCodeForm}>
            <label htmlFor={effectiveInputId} className="sr-only">
              Room code
            </label>
            <input
              id={effectiveInputId}
              type="text"
              placeholder="CODE"
              maxLength={6}
              value={code}
              autoFocus
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              onChange={handleChange}
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
              {submitLabel}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
