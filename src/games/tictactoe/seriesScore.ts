import { SeriesState } from '@/core/series/types'

export interface FormatSeriesScoreOptions {
  scores: Record<string, number>
  draws: number
  playerNames?: Record<string, string>
  localPlayerId?: string
  players: [string, string]
}

/**
 * Formats series score string for Tic-Tac-Toe matchplay and results.
 *
 * Example outputs:
 * - "You 1 – 0 Swift Otter · 1 draw"
 * - "Swift Otter 2 – 1 You"
 * - "You 0 – 0 Swift Otter · 3 draws"
 */
export function formatSeriesScore(
  optionsOrState: FormatSeriesScoreOptions | SeriesState,
  localPlayerId?: string,
  remotePlayerName?: string
): string {
  let scores: Record<string, number>
  let draws: number
  let players: [string, string]
  let playerNames: Record<string, string> = {}
  let localId = localPlayerId

  if ('currentRoundNumber' in optionsOrState) {
    // Called as (seriesState, localPlayerId, remotePlayerName)
    scores = optionsOrState.scores
    draws = optionsOrState.draws
    players = optionsOrState.players
    if (localId && remotePlayerName) {
      const remoteId = players.find((id) => id !== localId) ?? 'remote'
      playerNames[remoteId] = remotePlayerName
      playerNames[localId] = 'You'
    }
  } else {
    // Called as options object
    scores = optionsOrState.scores
    draws = optionsOrState.draws
    players = optionsOrState.players
    playerNames = optionsOrState.playerNames ?? {}
    localId = optionsOrState.localPlayerId
  }

  const [p1, p2] = players
  const p1Score = scores[p1] ?? 0
  const p2Score = scores[p2] ?? 0

  let scoreText: string
  if (localId === p1) {
    const remoteName = playerNames[p2] || 'Opponent'
    scoreText = `You ${p1Score} – ${p2Score} ${remoteName}`
  } else if (localId === p2) {
    const remoteName = playerNames[p1] || 'Opponent'
    scoreText = `You ${p2Score} – ${p1Score} ${remoteName}`
  } else {
    const p1Name = playerNames[p1] || 'Player 1'
    const p2Name = playerNames[p2] || 'Player 2'
    scoreText = `${p1Name} ${p1Score} – ${p2Score} ${p2Name}`
  }

  if (draws > 0) {
    const drawLabel = draws === 1 ? '1 draw' : `${draws} draws`
    return `${scoreText} · ${drawLabel}`
  }

  return scoreText
}
