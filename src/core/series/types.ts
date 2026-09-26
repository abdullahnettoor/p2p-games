export type BestOfSeriesLength = 1 | 3 | 5

export interface RoundRecord {
  roundNumber: number
  startingPlayerId: string
  winnerId: string | null
  isDraw: boolean
}

export type SeriesStatus = 'active' | 'completed'

export interface SeriesOutcome {
  isCompleted: boolean
  winnerId: string | null
  isDraw: boolean
  reason?: 'rounds_exhausted' | 'clinched_early'
}

export interface SeriesState {
  bestOf: BestOfSeriesLength
  players: [string, string]
  round1StarterId: string
  currentRoundNumber: number
  currentRoundStarterId: string
  scores: Record<string, number>
  draws: number
  rounds: RoundRecord[]
  status: SeriesStatus
  winnerId: string | null
  isDraw: boolean
}

export interface RoundStartMessagePayload {
  roundNumber: number
  startingPlayerId: string
  timestamp: number
}
