'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import styles from './TicTacToeReaction.module.css'

export const TICTACTOE_REACTION_EMOJIS = ['✏️', '🔥', '👏', '😮', '🤔', '😂'] as const
export type TicTacToeReactionEmoji = (typeof TICTACTOE_REACTION_EMOJIS)[number]

export interface TicTacToeReactionBarProps {
  onSendReaction: (emoji: TicTacToeReactionEmoji) => void
  disabled?: boolean
  className?: string
}

export const TicTacToeReactionBar: React.FC<TicTacToeReactionBarProps> = ({
  onSendReaction,
  disabled = false,
  className,
}) => {
  const [activeEmoji, setActiveEmoji] = useState<TicTacToeReactionEmoji | null>(null)

  const handleClick = (emoji: TicTacToeReactionEmoji) => {
    if (disabled) return
    setActiveEmoji(emoji)
    onSendReaction(emoji)
    setTimeout(() => setActiveEmoji(null), 300)
  }

  return (
    <div
      className={cn(styles.paperReactionBar, className)}
      role="toolbar"
      aria-label="Quick reactions"
    >
      {TICTACTOE_REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          disabled={disabled}
          aria-label={`Send reaction ${emoji}`}
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
