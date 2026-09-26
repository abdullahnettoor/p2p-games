'use client'

import React from 'react'
import { BingoSoundToggle } from './BingoSoundToggle'
import { useBingoAudio } from '../hooks/useBingoAudio'
import { JoinCodeScreen } from '@/components/entry'
import { BINGO_RULES_CONFIG } from './BingoChoiceScreen'
import { cn } from '@/lib/utils'
import '../bingoTokens.css'

export interface BingoJoinCodeScreenProps {
  onJoin: (code: string) => void
  onBack: () => void
  initialError?: string | null
  className?: string
}

export const BingoJoinCodeScreen: React.FC<BingoJoinCodeScreenProps> = ({
  onJoin,
  onBack,
  initialError = null,
  className,
}) => {
  const { isMuted, toggleMute } = useBingoAudio(null)

  return (
    <JoinCodeScreen
      gameId="bingo"
      gameTitle="BINGO"
      inputId="bingo-join-code-input"
      className={cn('bingoTokenScope', className)}
      initialError={initialError}
      onJoin={onJoin}
      onBack={onBack}
      renderUtilityRight={<BingoSoundToggle isMuted={isMuted} onToggle={toggleMute} />}
      rules={BINGO_RULES_CONFIG}
    />
  )
}
