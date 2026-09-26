import React from 'react'
import { Sparkles, KeyRound, Users } from 'lucide-react'
import styles from './entry.module.css'
import { EntryHeader } from './EntryHeader'
import { ChoiceScreenProps } from './types'
import { cn } from '@/lib/utils'

export const ChoiceScreen: React.FC<ChoiceScreenProps> = ({
  gameTitle,
  className,
  heading = 'Choose how to play',
  subheading = 'Two-player Sunday puzzle with direct peer-to-peer connection.',
  onCreateRoom,
  onJoinWithCode,
  onPlayStranger,
  onExit,
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
          onBack={onExit}
          backAriaLabel="Exit to game catalog"
          backText="Exit"
          renderUtilityRight={renderUtilityRight}
          rules={rules}
          rulesTitle={rulesTitle}
          rulesSubtitle={rulesSubtitle}
          rulesContent={rulesContent}
        />

        <section className={styles.choiceSection} aria-label="Game mode selection">
          <div className={styles.choiceHeader}>
            <h2 id="choice-heading" className={styles.choiceHeading}>
              {heading}
            </h2>
            <p className={styles.choiceSubheading}>{subheading}</p>
          </div>

          <div className={styles.choiceList} role="group" aria-label="Play options">
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
    </div>
  )
}
