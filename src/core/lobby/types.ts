import { PlayerRole } from '@/core/games/types'
import { BestOfSeriesLength } from '@/core/series/types'

export type LobbyStatus =
  | 'idle'
  | 'connecting'
  | 'waiting'
  | 'connected'
  | 'ready_to_start'
  | 'starting'
  | 'error'

export interface LobbyPlayer<TSetupConfig = unknown> {
  id: string
  name: string
  role: PlayerRole
  isReady: boolean
  connected: boolean
  setupConfig?: TSetupConfig
}

export interface LobbyState<TSetupConfig = unknown> {
  status: LobbyStatus
  localPlayer: LobbyPlayer<TSetupConfig>
  remotePlayer: LobbyPlayer<TSetupConfig> | null
  inviteUrl: string | null
  roomCode?: string | null
  isReconnecting?: boolean
  error: string | null
  seriesLength?: BestOfSeriesLength
}

export interface MatchStartEvent<TSetupConfig = unknown> {
  hostId: string
  guestId: string
  startingPlayerId: string
  hostSetup: TSetupConfig
  guestSetup: TSetupConfig
  seriesLength?: BestOfSeriesLength
}
