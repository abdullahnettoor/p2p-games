import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import styles from './entry.module.css'
import { EntryRulesConfig } from './types'

export interface EntryRulesModalProps {
  isOpen: boolean
  onClose: () => void
  gameTitle?: string
  rules?: EntryRulesConfig
  title?: string
  subtitle?: string
  content?: React.ReactNode
  closeAriaLabel?: string
}

export const EntryRulesModal: React.FC<EntryRulesModalProps> = ({
  isOpen,
  rules,
  title = rules?.title,
  subtitle = rules?.subtitle,
  content = rules?.content,
  gameTitle = 'rules',
  onClose,
  closeAriaLabel,
}) => {
  const titleId = `${(gameTitle || 'rules').toLowerCase().replace(/\s+/g, '-')}-rules-title`

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!isOpen || !title || !content) return null

  const resolvedCloseAriaLabel =
    closeAriaLabel || rules?.closeAriaLabel || `Close ${title}`

  return (
    <div
      className={styles.rulesOverlay}
      role="presentation"
      onClick={onClose}
    >
      <section
        className={styles.rulesPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.rulesHeader}>
          <div>
            <h2 id={titleId} className={styles.rulesHeading}>
              {title}
            </h2>
            {subtitle ? (
              <p className={styles.rulesSubtitle}>{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={resolvedCloseAriaLabel}
            className={styles.rulesClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className={styles.rulesBody}>{content}</div>
      </section>
    </div>
  )
}
