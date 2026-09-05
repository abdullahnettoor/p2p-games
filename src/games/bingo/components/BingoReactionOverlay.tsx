'use client'

import React, { useEffect, useState } from 'react'
import { BingoMatchCoordinator, BingoReaction } from '../state/BingoMatchCoordinator'
import { SoundSynthesizer, defaultSoundSynthesizer } from '@/core/audio/SoundSynthesizer'
import { cn } from '@/lib/utils'
import styles from './BingoReaction.module.css'

interface DisplayReaction extends BingoReaction {
  xPercent: number
}

const DOODLE_MARK_PATHS: Record<string, string> = {
  '👋': 'M12 52 C22 29 34 19 47 24 C58 28 68 42 84 49 M18 63 C36 55 57 55 78 68',
  '😂': 'M13 47 C25 18 70 15 87 45 C73 76 29 79 13 47 M29 47 C40 56 58 56 70 46',
  '😱': 'M16 23 L32 15 L48 23 L65 14 L86 28 L77 46 L86 64 L66 78 L49 70 L31 81 L14 66 L22 47 Z',
  '🔥': 'M48 11 C30 31 61 32 35 57 C20 72 39 87 55 79 C73 70 67 50 58 42 C61 61 43 62 48 11 Z',
  '👏': 'M12 55 C25 35 35 28 48 33 C60 38 69 47 87 53 M18 70 C35 61 54 63 79 76',
}

const DEFAULT_DOODLE_MARK_PATH = 'M12 49 C27 18 72 17 88 49 C72 81 28 81 12 49 Z'

export interface BingoReactionOverlayProps {
  coordinator: BingoMatchCoordinator
  soundSynthesizer?: SoundSynthesizer
  className?: string
}

export const BingoReactionOverlay: React.FC<BingoReactionOverlayProps> = ({
  coordinator,
  soundSynthesizer = defaultSoundSynthesizer,
  className,
}) => {
  const [reactions, setReactions] = useState<DisplayReaction[]>([])

  useEffect(() => {
    const unsub = coordinator.onReaction((reaction) => {
      const isLeftMargin = Math.random() < 0.5
      const xPercent = isLeftMargin
        ? 4 + Math.random() * 11
        : 85 + Math.random() * 11
      setReactions((prev) => [...prev, { ...reaction, xPercent }])
      soundSynthesizer.playReaction()

      setTimeout(() => {
        setReactions((prev) => prev.filter((item) => item.id !== reaction.id))
      }, 2300)
    })

    return unsub
  }, [coordinator, soundSynthesizer])

  if (reactions.length === 0) return null

  return (
    <div
      className={cn(styles.doodleOverlay, className)}
      aria-live="polite"
      aria-atomic="false"
      aria-label="Doodle reactions"
    >
      {reactions.map((reaction) => {
        const sender = reaction.isLocal ? 'You' : reaction.senderName
        return (
          <div
            key={reaction.id}
            role="status"
            className={styles.doodleMark}
            style={{ left: `${reaction.xPercent}%` }}
            aria-label={`${sender} sent a doodle ${reaction.emoji}`}
          >
            <svg className={styles.doodleInk} viewBox="0 0 100 100" aria-hidden="true">
              <path d={DOODLE_MARK_PATHS[reaction.emoji] ?? DEFAULT_DOODLE_MARK_PATH} />
            </svg>
            <span className={styles.doodleGlyph} aria-hidden="true">{reaction.emoji}</span>
            <span className={styles.doodleSender}>{sender}</span>
            <span className="bingoSrOnly">{sender} sent a doodle {reaction.emoji}</span>
          </div>
        )
      })}
    </div>
  )
}
