'use client'

import React, { useEffect, useState } from 'react'
import { BingoMatchCoordinator, BingoReaction } from '../state/BingoMatchCoordinator'
import { SoundSynthesizer, defaultSoundSynthesizer } from '@/core/audio/SoundSynthesizer'
import { cn } from '@/lib/utils'

interface DisplayReaction extends BingoReaction {
  xPercent: number
}

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
      // Slight random horizontal variation across the screen (between 25% and 75%)
      const xPercent = 25 + Math.random() * 50
      const displayReaction: DisplayReaction = {
        ...reaction,
        xPercent,
      }

      setReactions((prev) => [...prev, displayReaction])
      soundSynthesizer.playReaction()

      // Auto-cleanup reaction after animation completes
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id))
      }, 2300)
    })

    return () => {
      unsub()
    }
  }, [coordinator])

  if (reactions.length === 0) return null

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-40 overflow-hidden select-none',
        className
      )}
      aria-live="polite"
      aria-atomic="false"
    >
      {reactions.map((rx) => (
        <div
          key={rx.id}
          className="absolute bottom-24 -translate-x-1/2 flex flex-col items-center animate-float-up motion-reduce:animate-none"
          style={{ left: `${rx.xPercent}%` }}
        >
          <div className="text-5xl filter drop-shadow-lg scale-110">
            {rx.emoji}
          </div>
          <span
            className={cn(
              'mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-md backdrop-blur-md border',
              rx.isLocal
                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
            )}
          >
            {rx.isLocal ? 'You' : rx.senderName}
          </span>
        </div>
      ))}
    </div>
  )
}
