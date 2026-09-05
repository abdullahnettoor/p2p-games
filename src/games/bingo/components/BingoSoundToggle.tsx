'use client'

import React from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import styles from './BingoSoundToggle.module.css'

export interface BingoSoundToggleProps {
  isMuted: boolean
  onToggle: () => void
  className?: string
  showLabel?: boolean
}

export const BingoSoundToggle: React.FC<BingoSoundToggleProps> = ({
  isMuted,
  onToggle,
  className,
  showLabel = false,
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isMuted ? 'Unmute sound effects' : 'Mute sound effects'}
      title={isMuted ? 'Sound effects muted (click to unmute)' : 'Sound effects active (click to mute)'}
      className={cn(
        styles.toggle,
        isMuted ? styles.muted : styles.active,
        className
      )}
    >
      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      <span className={showLabel ? 'hidden sm:inline text-xs font-semibold' : 'sr-only'}>
        {isMuted ? 'Sound off' : 'Sound on'}
      </span>
    </button>
  )
}
