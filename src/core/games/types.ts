export type PlayerRole = 'host' | 'guest'

export interface Player {
  id: string
  name: string
  role: PlayerRole
  isReady: boolean
  connected: boolean
}

export type MatchStatus = 'waiting' | 'active' | 'completed'

export interface ValidationResult {
  valid: boolean
  reason?: string
}

export interface WinResult {
  isGameOver: boolean
  winnerId: string | null
  isDraw?: boolean
  reason?: string
}

export interface GameDefinition<TState, TMove, TSetupConfig> {
  id: string
  name: string
  minPlayers: number
  maxPlayers: number
  init(config: {
    players: [string, string]
    setupConfigs: Record<string, TSetupConfig>
    startingPlayerId?: string
  }): TState
  validateSetup(config: TSetupConfig): ValidationResult
  validateMove(state: TState, move: TMove, playerId: string): ValidationResult
  applyMove(state: TState, move: TMove): TState
  checkWin(state: TState): WinResult
}
