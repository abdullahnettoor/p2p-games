'use client'

import React from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

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
        'p-2 rounded-xl border transition-all active:scale-95 flex items-center justify-center text-slate-300',
        isMuted
          ? 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-400 hover:border-slate-700'
          : 'bg-slate-900/90 border-slate-700 hover:border-slate-600 text-indigo-300 hover:text-indigo-200 shadow-sm',
        className
      )}
    >
      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      <span className={showLabel ? 'hidden sm:inline text-xs font-semibold' : 'sr-only'}>
        {isMuted ? 'Sound off' : 'Sound on'}
      </span>
    </button>
  )
}
