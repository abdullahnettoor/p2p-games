'use client'

import React, { useState } from 'react'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './BingoReaction.module.css'

export const BINGO_REACTION_EMOJIS = ['👋', '😂', '😱', '🔥', '👏'] as const
export type BingoReactionEmoji = (typeof BINGO_REACTION_EMOJIS)[number]

export interface BingoReactionBarProps {
  onSendReaction: (emoji: BingoReactionEmoji) => void
  disabled?: boolean
  className?: string
}

export const BingoReactionBar: React.FC<BingoReactionBarProps> = ({
  onSendReaction,
  disabled = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeEmoji, setActiveEmoji] = useState<BingoReactionEmoji | null>(null)

  const handleClick = (emoji: BingoReactionEmoji) => {
    if (disabled) return
    setActiveEmoji(emoji)
    setIsOpen(false)
    onSendReaction(emoji)
    setTimeout(() => setActiveEmoji(null), 300)
  }

  return (
    <div
      className={cn(
        styles.paperReactionBar,
        className
      )}
      role="toolbar"
      aria-label="Doodle reactions"
    >
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="bingo-doodle-choices"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          styles.doodleButton,
          disabled && styles.doodleButtonDisabled
        )}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        <span>Doodle</span>
        {activeEmoji ? <span aria-hidden="true">{activeEmoji}</span> : null}
      </button>

      {isOpen ? (
        <div
          id="bingo-doodle-choices"
          role="menu"
          aria-label="Doodle choices"
          className={styles.doodleMenu}
        >
          {BINGO_REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="menuitem"
              aria-label={`Send doodle ${emoji}`}
              onClick={() => handleClick(emoji)}
              className={styles.doodleChoice}
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
