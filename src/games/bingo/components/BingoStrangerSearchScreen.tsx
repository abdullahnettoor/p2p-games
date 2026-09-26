'use client'

import React from 'react'
import { BingoSoundToggle } from './BingoSoundToggle'
import { useBingoAudio } from '../hooks/useBingoAudio'
import { StrangerSearchScreen } from '@/components/entry'
import { BINGO_RULES_CONFIG } from './BingoChoiceScreen'
import { cn } from '@/lib/utils'
import '../bingoTokens.css'

export interface BingoStrangerSearchScreenProps {
  status: 'searching' | 'timeout' | 'error'
  errorMessage?: string | null
  elapsedSeconds: number
  onCancel: () => void
  onSearchAgain: () => void
  onCreateRoomInstead: () => void
  className?: string
}

export const BingoStrangerSearchScreen: React.FC<BingoStrangerSearchScreenProps> = ({
  status,
  errorMessage,
  elapsedSeconds,
  onCancel,
  onSearchAgain,
  onCreateRoomInstead,
  className,
}) => {
  const { isMuted, toggleMute } = useBingoAudio(null)

  return (
    <StrangerSearchScreen
      gameId="bingo"
      gameTitle="BINGO"
      className={cn('bingoTokenScope', className)}
      status={status}
      errorMessage={errorMessage}
      elapsedSeconds={elapsedSeconds}
      onCancel={onCancel}
      onSearchAgain={onSearchAgain}
      onCreateRoomInstead={onCreateRoomInstead}
      renderUtilityRight={<BingoSoundToggle isMuted={isMuted} onToggle={toggleMute} />}
      rules={BINGO_RULES_CONFIG}
    />
  )
}
