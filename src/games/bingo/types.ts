export type BingoBoard = number[]

export interface BingoSetupConfig {
  board: BingoBoard
}

export interface LineDetails {
  count: number
  rows: number[]
  cols: number[]
  diags: number[]
}

export interface BingoState {
  players: [string, string]
  boards: Record<string, BingoBoard>
  calledNumbers: number[]
  activePlayerId: string
  completedLines: Record<string, number>
  lineDetails: Record<string, LineDetails>
  status: 'active' | 'completed'
  winnerId: string | null
  isDraw?: boolean
}

export type BingoMove = {
  type: 'PICK_NUMBER'
  number: number
  playerId: string
}
