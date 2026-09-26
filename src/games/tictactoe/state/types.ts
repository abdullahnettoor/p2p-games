import { BestOfSeriesLength, RoundStartMessagePayload, SeriesOutcome, SeriesState } from '@/core/series/types'
import { WinResult } from '@/core/games/types'
import { TicTacToeBoard, TicTacToeMark, TicTacToeMove, TicTacToeState } from '../types'

export const TICTACTOE_ACTIVE_MATCH_STORAGE_KEY = 'games:tictactoe:active-match'

export interface PlayerSummary {
  id: string
  name: string
  role: 'host' | 'guest'
}

export type RematchState = 'none' | 'requested' | 'received' | 'accepted' | 'declined'

export interface TicTacToeReaction {
  id: string
  emoji: string
  playerId: string
  timestamp: number
}

export interface TicTacToeRoundRecord {
  roundNumber: number
  startingPlayerId: string
  winnerId: string | null
  isDraw: boolean
  winningLine?: number[] | null
}

export interface TicTacToeSyncState {
  seriesState: SeriesState
  currentRoundState: TicTacToeState
  currentRoundMoves: TicTacToeMove[]
  roundRecords: TicTacToeRoundRecord[]
  turnSecondsRemaining: number
  isBetweenRounds: boolean
  localReadyNextRound?: boolean
  remoteReadyNextRound?: boolean
}

export interface CachedTicTacToeMatch {
  matchId: string
  localPlayer: PlayerSummary
  remotePlayer: PlayerSummary
  bestOf: BestOfSeriesLength
  seriesState: SeriesState
  currentRoundState: TicTacToeState
  currentRoundMoves: TicTacToeMove[]
  roundRecords: TicTacToeRoundRecord[]
  turnSecondsRemaining: number
  isBetweenRounds: boolean
  status: 'active' | 'completed'
  updatedAt: number
}

export interface TicTacToeCoordinatorState {
  seriesState: SeriesState
  currentRoundState: TicTacToeState
  currentRoundMoves: TicTacToeMove[]
  roundRecords: TicTacToeRoundRecord[]
  turnSecondsRemaining: number
  localPlayer: PlayerSummary
  remotePlayer: PlayerSummary
  isBetweenRounds: boolean
  betweenRoundsSecondsRemaining: number
  localReadyNextRound: boolean
  remoteReadyNextRound: boolean
  isHostWaitingInGrace: boolean
  isReconnecting: boolean
  reconnectSecondsRemaining: number
  rematchState: RematchState
  winResult: WinResult
  status: 'active' | 'completed'
}

export interface TicTacToeMatchCoordinatorOptions {
  transport: import('@/core/transport/types').ITransport
  localPlayer: PlayerSummary
  remotePlayer: PlayerSummary
  bestOf?: BestOfSeriesLength
  startingPlayerId?: string
  turnDurationSeconds?: number
  enableAutoTurnTimer?: boolean
  onGameOver?: (result: WinResult) => void
  onRematch?: () => void
  initialSyncState?: TicTacToeSyncState
}
