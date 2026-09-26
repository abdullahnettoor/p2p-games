import { ValidationResult } from '@/core/games/types'
import {
  BestOfSeriesLength,
  RoundRecord,
  RoundStartMessagePayload,
  SeriesOutcome,
  SeriesState,
} from './types'

export const DEFAULT_SERIES_LENGTH: BestOfSeriesLength = 3
export const VALID_SERIES_LENGTHS = [1, 3, 5] as const

export function isValidSeriesLength(val: unknown): val is BestOfSeriesLength {
  return typeof val === 'number' && (val === 1 || val === 3 || val === 5)
}

/**
 * Derives the starting player for a given round number (1-indexed).
 * Round 1: round1StarterId
 * Round 2: opponentId
 * Round 3: round1StarterId
 * ...
 */
export function getRoundStarter(
  round1StarterId: string,
  opponentId: string,
  roundNumber: number
): string {
  if (roundNumber < 1) {
    throw new Error(`Round number must be >= 1, received ${roundNumber}`)
  }
  return roundNumber % 2 === 1 ? round1StarterId : opponentId
}

/**
 * Pure evaluation of the series outcome based on completed rounds.
 *
 * Rules:
 * - Best of N is exactly N rounds max.
 * - Draws count toward N but score for nobody.
 * - More round wins takes the Match.
 * - Match ends early once the result can't change (w1 > w2 + remaining OR w2 > w1 + remaining).
 * - Level score after N rounds is a drawn Match.
 */
export function evaluateSeries(
  bestOf: BestOfSeriesLength,
  players: [string, string],
  rounds: RoundRecord[]
): SeriesOutcome {
  const [p1, p2] = players
  const p1Wins = rounds.filter((r) => r.winnerId === p1).length
  const p2Wins = rounds.filter((r) => r.winnerId === p2).length
  const roundsPlayed = rounds.length
  const remaining = bestOf - roundsPlayed

  // Early clinching: if one player's lead cannot be caught even if opponent wins all remaining rounds
  if (p1Wins > p2Wins + remaining) {
    return {
      isCompleted: true,
      winnerId: p1,
      isDraw: false,
      reason: 'clinched_early',
    }
  }

  if (p2Wins > p1Wins + remaining) {
    return {
      isCompleted: true,
      winnerId: p2,
      isDraw: false,
      reason: 'clinched_early',
    }
  }

  // All N rounds have been played
  if (remaining <= 0) {
    if (p1Wins > p2Wins) {
      return {
        isCompleted: true,
        winnerId: p1,
        isDraw: false,
        reason: 'rounds_exhausted',
      }
    }
    if (p2Wins > p1Wins) {
      return {
        isCompleted: true,
        winnerId: p2,
        isDraw: false,
        reason: 'rounds_exhausted',
      }
    }
    return {
      isCompleted: true,
      winnerId: null,
      isDraw: true,
      reason: 'rounds_exhausted',
    }
  }

  // Match is still active
  return {
    isCompleted: false,
    winnerId: null,
    isDraw: false,
  }
}

/**
 * Initializes a new Series state.
 * ADR 0003: The Host explicitly selects round1StarterId; no Math.random() fallback.
 */
export function createSeries(config: {
  bestOf?: BestOfSeriesLength
  players: [string, string]
  round1StarterId: string
}): SeriesState {
  const bestOf = config.bestOf ?? DEFAULT_SERIES_LENGTH
  const [p1, p2] = config.players
  const round1StarterId = config.round1StarterId

  if (!config.players.includes(round1StarterId)) {
    throw new Error(`Invalid round1StarterId: ${round1StarterId} is not in players`)
  }

  return {
    bestOf,
    players: [p1, p2],
    round1StarterId,
    currentRoundNumber: 1,
    currentRoundStarterId: round1StarterId,
    scores: { [p1]: 0, [p2]: 0 },
    draws: 0,
    rounds: [],
    status: 'active',
    winnerId: null,
    isDraw: false,
  }
}

/**
 * Pure state transition: records the result of the current round and advances the series.
 * Strictly validates that winnerId matches one of the two players or is null when drawn.
 */
export function recordRoundResult(
  state: SeriesState,
  result: {
    winnerId: string | null
    isDraw: boolean
  }
): SeriesState {
  if (state.status === 'completed') {
    return state
  }

  if (result.isDraw) {
    if (result.winnerId !== null) {
      throw new Error('Invalid round result: a drawn round must have winnerId: null')
    }
  } else {
    if (!result.winnerId) {
      throw new Error('Invalid round result: a non-drawn round must have a winnerId')
    }
    if (!state.players.includes(result.winnerId)) {
      throw new Error(`Invalid round result: winnerId ${result.winnerId} is not in players`)
    }
  }

  const roundNumber = state.rounds.length + 1
  const roundRecord: RoundRecord = {
    roundNumber,
    startingPlayerId: state.currentRoundStarterId,
    winnerId: result.winnerId,
    isDraw: result.isDraw,
  }

  const nextRounds = [...state.rounds, roundRecord]
  const nextScores = { ...state.scores }
  if (result.winnerId && nextScores[result.winnerId] !== undefined) {
    nextScores[result.winnerId] += 1
  }

  const nextDraws = result.isDraw ? state.draws + 1 : state.draws
  const outcome = evaluateSeries(state.bestOf, state.players, nextRounds)

  if (outcome.isCompleted) {
    return {
      ...state,
      rounds: nextRounds,
      scores: nextScores,
      draws: nextDraws,
      status: 'completed',
      winnerId: outcome.winnerId,
      isDraw: outcome.isDraw,
    }
  }

  const nextRoundNumber = roundNumber + 1
  const opponentId =
    state.players.find((id) => id !== state.round1StarterId) ?? state.players[1]
  const nextRoundStarterId = getRoundStarter(
    state.round1StarterId,
    opponentId,
    nextRoundNumber
  )

  return {
    ...state,
    rounds: nextRounds,
    scores: nextScores,
    draws: nextDraws,
    currentRoundNumber: nextRoundNumber,
    currentRoundStarterId: nextRoundStarterId,
    status: 'active',
    winnerId: null,
    isDraw: false,
  }
}

/**
 * Creates the payload for the host to broadcast when initiating a round.
 * ADR 0003: Timestamp is required from the Host; no Date.now() fallback.
 */
export function createRoundStartPayload(
  state: SeriesState,
  timestamp: number
): RoundStartMessagePayload {
  if (state.status === 'completed') {
    throw new Error('Cannot start a new round in a completed series')
  }
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    throw new Error('Valid numeric timestamp required')
  }

  return {
    roundNumber: state.currentRoundNumber,
    startingPlayerId: state.currentRoundStarterId,
    timestamp,
  }
}

/**
 * Validates the round start message received from the host.
 */
export function validateRoundStartMessage(
  state: SeriesState,
  payload: RoundStartMessagePayload
): ValidationResult {
  if (state.status === 'completed') {
    return { valid: false, reason: 'Series is already completed' }
  }

  if (payload.roundNumber !== state.currentRoundNumber) {
    return {
      valid: false,
      reason: `Unexpected round number: expected ${state.currentRoundNumber}, got ${payload.roundNumber}`,
    }
  }

  if (payload.startingPlayerId !== state.currentRoundStarterId) {
    return {
      valid: false,
      reason: `Unexpected starting player: expected ${state.currentRoundStarterId}, got ${payload.startingPlayerId}`,
    }
  }

  return { valid: true }
}
