'use client'

import React, { useEffect, useState } from 'react'
import { TicTacToeMatchCoordinator } from '../state/TicTacToeMatchCoordinator'
import { TicTacToeReaction } from '../state/types'
import { cn } from '@/lib/utils'
import styles from './TicTacToeReaction.module.css'

interface DisplayReaction extends TicTacToeReaction {
  xPercent: number
}

export interface TicTacToeReactionOverlayProps {
  coordinator: TicTacToeMatchCoordinator
  className?: string
}

export const TicTacToeReactionOverlay: React.FC<TicTacToeReactionOverlayProps> = ({
  coordinator,
  className,
}) => {
  const [reactions, setReactions] = useState<DisplayReaction[]>([])

  useEffect(() => {
    const unsub = coordinator.onReaction((reaction) => {
      const isLeftMargin = Math.random() < 0.5
      const xPercent = isLeftMargin
        ? 8 + Math.random() * 14
        : 78 + Math.random() * 14

      setReactions((prev) => [...prev, { ...reaction, xPercent }])

      setTimeout(() => {
        setReactions((prev) => prev.filter((item) => item.id !== reaction.id))
      }, 2000)
    })

    return unsub
  }, [coordinator])

  if (reactions.length === 0) return null

  return (
    <div
      className={cn(styles.doodleOverlay, className)}
      aria-live="polite"
      aria-atomic="false"
      aria-label="Reactions"
    >
      {reactions.map((rx) => (
        <div
          key={rx.id}
          className={styles.floatingReaction}
          style={{ left: `${rx.xPercent}%` }}
        >
          <span className={styles.floatingEmoji} role="img" aria-label={rx.emoji}>
            {rx.emoji}
          </span>
        </div>
      ))}
    </div>
  )
}
