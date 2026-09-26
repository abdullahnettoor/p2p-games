import { PlayerRole } from '@/core/games/types'
import { BestOfSeriesLength, RoundStartMessagePayload } from '@/core/series/types'

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
  /** Set when the Host passes a timed-out Guest turn on the Guest's behalf. */
  forcedTimeout?: boolean
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
  seriesLength?: BestOfSeriesLength
}

export interface SeriesLengthMessagePayload {
  seriesLength: BestOfSeriesLength
}

export interface SyncMessagePayload {
  state: unknown
  timestamp: number
  /** Guest asks the Host to send its state (after reconnecting). */
  request?: boolean
}

export type TransportMessage =
  | { type: 'ready'; payload: ReadyMessagePayload }
  | { type: 'move'; payload: MoveMessagePayload }
  | { type: 'reaction'; payload: ReactionMessagePayload }
  | { type: 'rematch'; payload: RematchMessagePayload }
  | { type: 'heartbeat'; payload: HeartbeatMessagePayload }
  | { type: 'profile'; payload: ProfileMessagePayload }
  | { type: 'match_start'; payload: MatchStartMessagePayload }
  | { type: 'round_start'; payload: RoundStartMessagePayload }
  | { type: 'series_length'; payload: SeriesLengthMessagePayload }
  | { type: 'sync'; payload: SyncMessagePayload }
  | { type: 'forfeit'; payload: { playerId: string } }
  | { type: 'forfeit_ack'; payload: { playerId: string } }
  | { type: 'reject'; payload: { reason: string } }

export type TransportEventHandler<T = TransportMessage> = (message: T) => void
export type StatusChangeHandler = (status: TransportStatus) => void
export type PlayerEventHandler = (playerId: string) => void
export type ErrorEventHandler = (error: Error) => void
export type SignalingChangeHandler = (isReconnecting: boolean) => void

export const HOST_REJECTED_MESSAGE = 'Connection rejected: host is full'

export class HostRejectedError extends Error {
  constructor(message: string = HOST_REJECTED_MESSAGE) {
    super(message)
    this.name = 'HostRejectedError'
  }
}

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
  onSignalingChange?: (handler: SignalingChangeHandler) => () => void
  releaseSignaling?: () => void
  /** Guest only: redial the Host after a drop while a Match is live. */
  setAutoRedial?: (enabled: boolean) => void
  disconnect(): void
}
