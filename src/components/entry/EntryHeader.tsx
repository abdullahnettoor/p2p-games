import React, { useState } from 'react'
import { ArrowLeft, CircleHelp } from 'lucide-react'
import styles from './entry.module.css'
import { EntryRulesModal } from './EntryRulesModal'
import { EntryRulesConfig } from './types'

export interface EntryHeaderProps {
  gameTitle: string
  onBack?: () => void
  backAriaLabel?: string
  backText?: string
  renderUtilityRight?: React.ReactNode
  rules?: EntryRulesConfig
  rulesTitle?: string
  rulesSubtitle?: string
  rulesContent?: React.ReactNode
}

export const EntryHeader: React.FC<EntryHeaderProps> = ({
  gameTitle,
  onBack,
  backAriaLabel = 'Exit to game catalog',
  backText = 'Exit',
  renderUtilityRight,
  rules,
  rulesTitle,
  rulesSubtitle,
  rulesContent,
}) => {
  const [showRules, setShowRules] = useState(false)

  const effectiveRulesTitle = rules?.title || rulesTitle
  const effectiveRulesSubtitle = rules?.subtitle || rulesSubtitle
  const effectiveRulesContent = rules?.content || rulesContent
  const effectiveRulesAriaLabel = rules?.ariaLabel || `${gameTitle} rules`
  const effectiveRulesCloseAriaLabel = rules?.closeAriaLabel || `Close ${gameTitle} rules`

  const hasRules = Boolean(effectiveRulesTitle && effectiveRulesContent)

  return (
    <>
      <header className={styles.utilityBar}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className={styles.utilityButton}
            aria-label={backAriaLabel}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{backText}</span>
          </button>
        ) : (
          <span aria-hidden="true" />
        )}

        <h1 className={styles.shellTitle}>{gameTitle}</h1>

        <div className={styles.utilityGroup}>
          {renderUtilityRight}
          {hasRules && (
            <button
              type="button"
              onClick={() => setShowRules(true)}
              className={styles.rulesButton}
              aria-label={effectiveRulesAriaLabel}
              aria-expanded={showRules}
            >
              <CircleHelp className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Rules</span>
            </button>
          )}
        </div>
      </header>

      {showRules && effectiveRulesTitle && effectiveRulesContent && (
        <EntryRulesModal
          isOpen={showRules}
          gameTitle={gameTitle}
          title={effectiveRulesTitle}
          subtitle={effectiveRulesSubtitle}
          content={effectiveRulesContent}
          onClose={() => setShowRules(false)}
          closeAriaLabel={effectiveRulesCloseAriaLabel}
        />
      )}
    </>
  )
}
