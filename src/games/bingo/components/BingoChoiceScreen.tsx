'use client'

import React from 'react'
import { ChoiceScreen, EntryRulesConfig } from '@/components/entry'
import { BingoSoundToggle } from './BingoSoundToggle'
import { useBingoAudio } from '../hooks/useBingoAudio'
import { cn } from '@/lib/utils'
import '../bingoTokens.css'

export const BINGO_RULES_CONFIG: EntryRulesConfig = {
  title: 'BINGO Sunday Puzzle',
  subtitle: 'Two-player online variant',
  ariaLabel: 'Bingo rules',
  closeAriaLabel: 'Close Bingo rules',
  content: (
    <ul>
      <li>Arrange numbers 1–25 on your Board, then choose Ready with this Board.</li>
      <li>Players take turns calling one number. Marks and completed lines appear in the caller&apos;s ink.</li>
      <li>The first Player to complete five lines wins. A turn may be passed when needed.</li>
    </ul>
  ),
}

export interface BingoChoiceScreenProps {
  onCreateRoom: () => void
  onJoinWithCode: () => void
  onPlayStranger: () => void
  onExit: () => void
  className?: string
}

export const BingoChoiceScreen: React.FC<BingoChoiceScreenProps> = ({
  onCreateRoom,
  onJoinWithCode,
  onPlayStranger,
  onExit,
  className,
}) => {
  const { isMuted, toggleMute } = useBingoAudio(null)

  return (
    <ChoiceScreen
      gameId="bingo"
      gameTitle="BINGO"
      className={cn('bingoTokenScope', className)}
      renderUtilityRight={<BingoSoundToggle isMuted={isMuted} onToggle={toggleMute} />}
      rules={BINGO_RULES_CONFIG}
      onCreateRoom={onCreateRoom}
      onJoinWithCode={onJoinWithCode}
      onPlayStranger={onPlayStranger}
      onExit={onExit}
    />
  )
}
