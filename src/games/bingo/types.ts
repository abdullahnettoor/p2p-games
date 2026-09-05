export type BingoBoard = number[]

export interface BingoSetupConfig {
  board: BingoBoard
}

export interface BingoInitConfig {
  players: [string, string]
  setupConfigs: Record<string, BingoSetupConfig>
  startingPlayerId?: string
}

export interface LineDetails {
  count: number
  rows: number[]
  cols: number[]
  diags: number[]
}

export type BingoCall = {
  type: 'call'
  number: number
  playerId: string
  sequence: number
}

export type BingoPass = {
  type: 'pass'
  playerId: string
  sequence: number
  reason: 'voluntary' | 'timeout'
}

export type BingoTurnEvent = BingoCall | BingoPass

export interface BingoState {
  players: [string, string]
  boards: Record<string, BingoBoard>
  history: BingoTurnEvent[]
  activePlayerId: string
  completedLines: Record<string, number>
  lineDetails: Record<string, LineDetails>
  status: 'active' | 'completed'
  winnerId: string | null
  isDraw?: boolean
}

export type BingoMove =
  | {
      type: 'CALL_NUMBER'
      number: number
      playerId: string
    }
  | {
      type: 'PASS'
      playerId: string
      reason: 'voluntary' | 'timeout'
    }
