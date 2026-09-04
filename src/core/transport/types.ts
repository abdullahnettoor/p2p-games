import { PlayerRole } from '@/core/games/types'

export type TransportStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'closed'

export interface ReadyMessagePayload {
  isReady: boolean
  playerName: string
  setupConfig?: unknown
}

export interface MoveMessagePayload<TMove = unknown> {
  move: TMove
  playerId: string
  timestamp?: number
}

export interface ReactionMessagePayload {
  emoji: string
  playerId: string
  timestamp: number
}

export interface RematchMessagePayload {
  rematchIntent: 'request' | 'accept' | 'decline'
  playerId: string
}

export interface HeartbeatMessagePayload {
  timestamp: number
}

export interface ProfileMessagePayload {
  playerName: string
}

export interface MatchStartMessagePayload {
  startingPlayerId: string
  timestamp: number
  setupConfigs?: Record<string, unknown>
}

export type TransportMessage =
  | { type: 'ready'; payload: ReadyMessagePayload }
  | { type: 'move'; payload: MoveMessagePayload }
  | { type: 'reaction'; payload: ReactionMessagePayload }
  | { type: 'rematch'; payload: RematchMessagePayload }
  | { type: 'heartbeat'; payload: HeartbeatMessagePayload }
  | { type: 'profile'; payload: ProfileMessagePayload }
  | { type: 'match_start'; payload: MatchStartMessagePayload }

export type TransportEventHandler<T = TransportMessage> = (message: T) => void
export type StatusChangeHandler = (status: TransportStatus) => void
export type PlayerEventHandler = (playerId: string) => void
export type ErrorEventHandler = (error: Error) => void

export interface ITransport<TMessage = TransportMessage> {
  readonly status: TransportStatus
  readonly localPlayerId: string
  readonly remotePlayerId: string | null
  readonly role: PlayerRole

  connect(): Promise<string>
  send(message: TMessage): void
  onMessage(handler: TransportEventHandler<TMessage>): () => void
  onStatusChange(handler: StatusChangeHandler): () => void
  onPlayerJoin(handler: PlayerEventHandler): () => void
  onPlayerLeave(handler: PlayerEventHandler): () => void
  onError(handler: ErrorEventHandler): () => void
  disconnect(): void
}
