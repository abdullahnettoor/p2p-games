import type { ReactNode } from 'react'

export type EntryScreen =
  | 'choice'
  | 'create-room'
  | 'join-code'
  | 'guest-lobby'
  | 'stranger-search'
  | 'stranger-lobby'

export interface EntryRulesConfig {
  title: string
  subtitle?: string
  content: ReactNode
  ariaLabel?: string
  closeAriaLabel?: string
}

export interface ChoiceScreenProps {
  gameId: string
  gameTitle: string
  className?: string
  heading?: string
  subheading?: string
  onCreateRoom: () => void
  onJoinWithCode: () => void
  onPlayStranger: () => void
  onExit: () => void
  renderUtilityRight?: ReactNode
  rules?: EntryRulesConfig
  rulesTitle?: string
  rulesSubtitle?: string
  rulesContent?: ReactNode
}

export interface JoinCodeScreenProps {
  gameId: string
  gameTitle: string
  className?: string
  inputId?: string
  heading?: string
  subheading?: string
  submitLabel?: string
  initialError?: string | null
  onJoin: (code: string) => void
  onBack: () => void
  renderUtilityRight?: ReactNode
  rules?: EntryRulesConfig
  rulesTitle?: string
  rulesSubtitle?: string
  rulesContent?: ReactNode
}

export interface StrangerSearchScreenProps {
  gameId: string
  gameTitle: string
  className?: string
  status: 'searching' | 'timeout' | 'error'
  elapsedSeconds?: number
  errorMessage?: string | null
  onCancel: () => void
  onSearchAgain: () => void
  onCreateRoomInstead: () => void
  renderUtilityRight?: ReactNode
  rules?: EntryRulesConfig
  rulesTitle?: string
  rulesSubtitle?: string
  rulesContent?: ReactNode
}
