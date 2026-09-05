'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'

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
    setTimeout(() => {
      setActiveEmoji(null)
    }, 300)
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md shadow-lg',
        className
      )}
      role="toolbar"
      aria-label="Emoji Reactions"
    >
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 select-none hidden sm:inline">
        React
      </span>

      {BINGO_REACTION_EMOJIS.map((emoji) => {
        const isActive = activeEmoji === emoji
        return (
          <button
            key={emoji}
            type="button"
            disabled={disabled}
            onClick={() => handleClick(emoji)}
            aria-label={`Reaction ${emoji}`}
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all duration-150',
              'hover:scale-125 hover:bg-slate-800/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              isActive && 'scale-125 bg-slate-800 ring-2 ring-indigo-400',
              disabled && 'opacity-40 pointer-events-none'
            )}
          >
            <span className="select-none leading-none">{emoji}</span>
          </button>
        )
      })}
    </div>
  )
}
