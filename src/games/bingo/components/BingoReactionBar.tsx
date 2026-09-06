'use client'

import React, { useState } from 'react'
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
  const [activeEmoji, setActiveEmoji] = useState<BingoReactionEmoji | null>(null)

  const handleClick = (emoji: BingoReactionEmoji) => {
    if (disabled) return
    setActiveEmoji(emoji)
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
      aria-label="Quick reactions"
    >
      {BINGO_REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          disabled={disabled}
          aria-label={`Send doodle ${emoji}`}
          onClick={() => handleClick(emoji)}
          className={cn(
            styles.doodleChoice,
            activeEmoji === emoji && styles.doodleChoiceActive,
            disabled && styles.reactionDisabled
          )}
        >
          <span aria-hidden="true">{emoji}</span>
        </button>
      ))}
    </div>
  )
}
