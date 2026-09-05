export type TicTacToeMark = 'X' | 'O'

export type TicTacToeCell = TicTacToeMark | null

/** Row-major 3x3 grid, always length 9. */
export type TicTacToeBoard = TicTacToeCell[]

export interface TicTacToeMove {
  cellIndex: number
  playerId: string
}

export interface TicTacToeState {
  board: TicTacToeBoard
  /** Player id -> the mark that player stamps on the board. */
  marks: Record<string, TicTacToeMark>
  activePlayerId: string
  status: 'active' | 'completed'
  winnerId: string | null
  isDraw: boolean
  winningLine: number[] | null
}
