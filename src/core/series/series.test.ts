import { describe, it, expect } from 'vitest'
import {
  createSeries,
  evaluateSeries,
  getRoundStarter,
  recordRoundResult,
  createRoundStartPayload,
  validateRoundStartMessage,
  formatSeriesScore,
  DEFAULT_SERIES_LENGTH,
  isValidSeriesLength,
} from './series'
import { resetRoundFromHostMessage } from '@/games/tictactoe/engine'

const HOST = 'player-host'
const GUEST = 'player-guest'
const PLAYERS: [string, string] = [HOST, GUEST]

describe('Series logic', () => {
  describe('validation and defaults', () => {
    it('validates allowed series lengths', () => {
      expect(isValidSeriesLength(1)).toBe(true)
      expect(isValidSeriesLength(3)).toBe(true)
      expect(isValidSeriesLength(5)).toBe(true)
      expect(isValidSeriesLength(7)).toBe(false)
      expect(isValidSeriesLength(0)).toBe(false)
      expect(isValidSeriesLength(-1)).toBe(false)
      expect(isValidSeriesLength('3')).toBe(false)
    })

    it('creates a series with default length of Best of 3', () => {
      const series = createSeries({ players: PLAYERS, round1StarterId: HOST })
      expect(series.bestOf).toBe(DEFAULT_SERIES_LENGTH)
      expect(series.bestOf).toBe(3)
      expect(series.currentRoundNumber).toBe(1)
      expect(series.currentRoundStarterId).toBe(HOST)
      expect(series.scores[HOST]).toBe(0)
      expect(series.scores[GUEST]).toBe(0)
      expect(series.draws).toBe(0)
      expect(series.status).toBe('active')
      expect(series.winnerId).toBeNull()
      expect(series.isDraw).toBe(false)
    })
  })

  describe('alternating starter', () => {
    it('alternates starter starting with Host for odd/even rounds', () => {
      expect(getRoundStarter(HOST, GUEST, 1)).toBe(HOST)
      expect(getRoundStarter(HOST, GUEST, 2)).toBe(GUEST)
      expect(getRoundStarter(HOST, GUEST, 3)).toBe(HOST)
      expect(getRoundStarter(HOST, GUEST, 4)).toBe(GUEST)
      expect(getRoundStarter(HOST, GUEST, 5)).toBe(HOST)
    })

    it('alternates starter starting with Guest for odd/even rounds', () => {
      expect(getRoundStarter(GUEST, HOST, 1)).toBe(GUEST)
      expect(getRoundStarter(GUEST, HOST, 2)).toBe(HOST)
      expect(getRoundStarter(GUEST, HOST, 3)).toBe(GUEST)
      expect(getRoundStarter(GUEST, HOST, 4)).toBe(HOST)
      expect(getRoundStarter(GUEST, HOST, 5)).toBe(GUEST)
    })

    it('updates currentRoundStarterId on each round transition', () => {
      let series = createSeries({ bestOf: 3, players: PLAYERS, round1StarterId: HOST })
      expect(series.currentRoundStarterId).toBe(HOST)

      series = recordRoundResult(series, { winnerId: HOST, isDraw: false })
      expect(series.currentRoundNumber).toBe(2)
      expect(series.currentRoundStarterId).toBe(GUEST)
    })
  })

  describe('draws counting toward N but not scoring', () => {
    it('increments rounds played and draws count, but scores remain 0', () => {
      let series = createSeries({ bestOf: 3, players: PLAYERS, round1StarterId: HOST })

      series = recordRoundResult(series, { winnerId: null, isDraw: true })

      expect(series.rounds.length).toBe(1)
      expect(series.draws).toBe(1)
      expect(series.scores[HOST]).toBe(0)
      expect(series.scores[GUEST]).toBe(0)
      expect(series.status).toBe('active')
      expect(series.currentRoundNumber).toBe(2)
      expect(series.currentRoundStarterId).toBe(GUEST)
    })

    it('allows a player to win the series with 1 win and multiple draws in Best of 3', () => {
      let series = createSeries({ bestOf: 3, players: PLAYERS, round1StarterId: HOST })

      // Round 1: Draw
      series = recordRoundResult(series, { winnerId: null, isDraw: true })
      expect(series.status).toBe('active')

      // Round 2: Host win
      series = recordRoundResult(series, { winnerId: HOST, isDraw: false })
      expect(series.status).toBe('active') // 1-0, 1 round remaining; guest could still tie

      // Round 3: Draw
      series = recordRoundResult(series, { winnerId: null, isDraw: true })

      expect(series.status).toBe('completed')
      expect(series.winnerId).toBe(HOST)
      expect(series.isDraw).toBe(false)
      expect(series.scores[HOST]).toBe(1)
      expect(series.scores[GUEST]).toBe(0)
      expect(series.draws).toBe(2)
      expect(series.rounds.length).toBe(3)
    })
  })

  describe('early end when result cannot change', () => {
    it('ends early in Best of 3 when a player wins the first 2 rounds (2-0)', () => {
      let series = createSeries({ bestOf: 3, players: PLAYERS, round1StarterId: HOST })

      series = recordRoundResult(series, { winnerId: HOST, isDraw: false })
      expect(series.status).toBe('active')

      series = recordRoundResult(series, { winnerId: HOST, isDraw: false })
      expect(series.status).toBe('completed')
      expect(series.winnerId).toBe(HOST)
      expect(series.isDraw).toBe(false)
      expect(series.rounds.length).toBe(2)
    })

    it('ends early in Best of 3 when Guest wins the first 2 rounds (0-2)', () => {
      let series = createSeries({ bestOf: 3, players: PLAYERS, round1StarterId: HOST })

      series = recordRoundResult(series, { winnerId: GUEST, isDraw: false })
      expect(series.status).toBe('active')

      series = recordRoundResult(series, { winnerId: GUEST, isDraw: false })
      expect(series.status).toBe('completed')
      expect(series.winnerId).toBe(GUEST)
      expect(series.isDraw).toBe(false)
      expect(series.rounds.length).toBe(2)
    })

    it('ends early in Best of 5 after 3 wins (3-0 sweep)', () => {
      let series = createSeries({ bestOf: 5, players: PLAYERS, round1StarterId: HOST })

      series = recordRoundResult(series, { winnerId: HOST, isDraw: false })
      series = recordRoundResult(series, { winnerId: HOST, isDraw: false })
      expect(series.status).toBe('active')

      series = recordRoundResult(series, { winnerId: HOST, isDraw: false })
      expect(series.status).toBe('completed')
      expect(series.winnerId).toBe(HOST)
      expect(series.rounds.length).toBe(3)
    })

    it('ends early in Best of 5 after 4 rounds when score is 3-1', () => {
      let series = createSeries({ bestOf: 5, players: PLAYERS, round1StarterId: HOST })

      series = recordRoundResult(series, { winnerId: HOST, isDraw: false }) // 1-0
      series = recordRoundResult(series, { winnerId: GUEST, isDraw: false }) // 1-1
      series = recordRoundResult(series, { winnerId: HOST, isDraw: false }) // 2-1
      expect(series.status).toBe('active') // 2 remaining, guest can still reach 3

      series = recordRoundResult(series, { winnerId: HOST, isDraw: false }) // 3-1
      expect(series.status).toBe('completed') // 1 remaining, guest max is 2
      expect(series.winnerId).toBe(HOST)
      expect(series.rounds.length).toBe(4)
    })

    it('ends early in Best of 5 after 4 rounds when score is 2-0 with 2 draws', () => {
      let series = createSeries({ bestOf: 5, players: PLAYERS, round1StarterId: HOST })

      series = recordRoundResult(series, { winnerId: HOST, isDraw: false }) // 1-0
      series = recordRoundResult(series, { winnerId: null, isDraw: true }) // 1-0, 1 draw
      series = recordRoundResult(series, { winnerId: HOST, isDraw: false }) // 2-0, 1 draw
      expect(series.status).toBe('active') // 2 remaining, guest can reach 2

      series = recordRoundResult(series, { winnerId: null, isDraw: true }) // 2-0, 2 draws
      // 1 round remaining: guest can reach at most 1 win, so host wins early!
      expect(series.status).toBe('completed')
      expect(series.winnerId).toBe(HOST)
      expect(series.rounds.length).toBe(4)
    })

    it('does not end early when a tie or reversal is still possible', () => {
      let series = createSeries({ bestOf: 3, players: PLAYERS, round1StarterId: HOST })

      series = recordRoundResult(series, { winnerId: HOST, isDraw: false }) // 1-0
      series = recordRoundResult(series, { winnerId: GUEST, isDraw: false }) // 1-1

      // 1 remaining, either could win or tie
      expect(series.status).toBe('active')
      expect(series.currentRoundNumber).toBe(3)
    })
  })

  describe('drawn Match outcomes (level score after N rounds)', () => {
    it('results in a drawn Match on Best of 1 if round 1 is a draw', () => {
      let series = createSeries({ bestOf: 1, players: PLAYERS, round1StarterId: HOST })

      series = recordRoundResult(series, { winnerId: null, isDraw: true })

      expect(series.status).toBe('completed')
      expect(series.isDraw).toBe(true)
      expect(series.winnerId).toBeNull()
      expect(series.scores[HOST]).toBe(0)
      expect(series.scores[GUEST]).toBe(0)
      expect(series.draws).toBe(1)
    })

    it('results in a drawn Match on Best of 3 when score is 1-1 with 1 draw', () => {
      let series = createSeries({ bestOf: 3, players: PLAYERS, round1StarterId: HOST })

      series = recordRoundResult(series, { winnerId: HOST, isDraw: false })
      series = recordRoundResult(series, { winnerId: GUEST, isDraw: false })
      series = recordRoundResult(series, { winnerId: null, isDraw: true })

      expect(series.status).toBe('completed')
      expect(series.isDraw).toBe(true)
      expect(series.winnerId).toBeNull()
      expect(series.scores[HOST]).toBe(1)
      expect(series.scores[GUEST]).toBe(1)
      expect(series.draws).toBe(1)
    })

    it('results in a drawn Match on Best of 3 when all 3 rounds are draws', () => {
      let series = createSeries({ bestOf: 3, players: PLAYERS, round1StarterId: HOST })

      series = recordRoundResult(series, { winnerId: null, isDraw: true })
      series = recordRoundResult(series, { winnerId: null, isDraw: true })
      series = recordRoundResult(series, { winnerId: null, isDraw: true })

      expect(series.status).toBe('completed')
      expect(series.isDraw).toBe(true)
      expect(series.winnerId).toBeNull()
      expect(series.draws).toBe(3)
    })

    it('results in a drawn Match on Best of 5 when score is 2-2 with 1 draw', () => {
      let series = createSeries({ bestOf: 5, players: PLAYERS, round1StarterId: HOST })

      series = recordRoundResult(series, { winnerId: HOST, isDraw: false })
      series = recordRoundResult(series, { winnerId: GUEST, isDraw: false })
      series = recordRoundResult(series, { winnerId: null, isDraw: true })
      series = recordRoundResult(series, { winnerId: HOST, isDraw: false })
      series = recordRoundResult(series, { winnerId: GUEST, isDraw: false })

      expect(series.status).toBe('completed')
      expect(series.isDraw).toBe(true)
      expect(series.winnerId).toBeNull()
      expect(series.scores[HOST]).toBe(2)
      expect(series.scores[GUEST]).toBe(2)
      expect(series.draws).toBe(1)
    })
  })

  describe('Best of 1 series length', () => {
    it('resolves in 1 round when Host wins', () => {
      let series = createSeries({ bestOf: 1, players: PLAYERS, round1StarterId: HOST })
      series = recordRoundResult(series, { winnerId: HOST, isDraw: false })

      expect(series.status).toBe('completed')
      expect(series.winnerId).toBe(HOST)
      expect(series.isDraw).toBe(false)
      expect(series.rounds.length).toBe(1)
    })

    it('resolves in 1 round when Guest wins', () => {
      let series = createSeries({ bestOf: 1, players: PLAYERS, round1StarterId: GUEST })
      series = recordRoundResult(series, { winnerId: GUEST, isDraw: false })

      expect(series.status).toBe('completed')
      expect(series.winnerId).toBe(GUEST)
      expect(series.isDraw).toBe(false)
      expect(series.rounds.length).toBe(1)
    })
  })

  describe('deterministic reset of a new Round from the Host message', () => {
    it('creates matching round-start payload and resets board state identically on both peers', () => {
      let series = createSeries({ bestOf: 3, players: PLAYERS, round1StarterId: HOST })

      // Round 1 ends with Host win
      series = recordRoundResult(series, { winnerId: HOST, isDraw: false })
      expect(series.currentRoundNumber).toBe(2)
      expect(series.currentRoundStarterId).toBe(GUEST)

      // Host generates the message payload
      const fixedTimestamp = 1711456000000
      const hostPayload = createRoundStartPayload(series, fixedTimestamp)
      expect(hostPayload).toEqual({
        roundNumber: 2,
        startingPlayerId: GUEST,
        timestamp: fixedTimestamp,
      })

      // Both peers validate the host payload
      expect(validateRoundStartMessage(series, hostPayload).valid).toBe(true)

      // Host and Guest independently reset their Tic-Tac-Toe round from hostPayload
      const hostRoundState = resetRoundFromHostMessage(hostPayload, PLAYERS)
      const guestRoundState = resetRoundFromHostMessage(hostPayload, PLAYERS)

      // Deterministic identical state
      expect(hostRoundState).toEqual(guestRoundState)
      expect(hostRoundState.board).toEqual(Array(9).fill(null))
      expect(hostRoundState.marks[HOST]).toBe('X')
      expect(hostRoundState.marks[GUEST]).toBe('O')
      expect(hostRoundState.activePlayerId).toBe(GUEST)
      expect(hostRoundState.status).toBe('active')
      expect(hostRoundState.winnerId).toBeNull()
      expect(hostRoundState.isDraw).toBe(false)
      expect(hostRoundState.winningLine).toBeNull()
    })

    it('rejects round-start payloads with invalid round numbers or wrong starters', () => {
      const series = createSeries({ bestOf: 3, players: PLAYERS, round1StarterId: HOST })

      const invalidRoundNumber = validateRoundStartMessage(series, {
        roundNumber: 3,
        startingPlayerId: HOST,
        timestamp: Date.now(),
      })
      expect(invalidRoundNumber.valid).toBe(false)
      expect(invalidRoundNumber.reason).toContain('Unexpected round number')

      const invalidStarter = validateRoundStartMessage(series, {
        roundNumber: 1,
        startingPlayerId: GUEST,
        timestamp: Date.now(),
      })
      expect(invalidStarter.valid).toBe(false)
      expect(invalidStarter.reason).toContain('Unexpected starting player')
    })

    it('rejects round-start payloads when the series is already completed', () => {
      let series = createSeries({ bestOf: 1, players: PLAYERS, round1StarterId: HOST })
      series = recordRoundResult(series, { winnerId: HOST, isDraw: false })
      expect(series.status).toBe('completed')

      expect(() => createRoundStartPayload(series)).toThrow('Cannot start a new round')

      const validation = validateRoundStartMessage(series, {
        roundNumber: 2,
        startingPlayerId: GUEST,
        timestamp: Date.now(),
      })
      expect(validation.valid).toBe(false)
      expect(validation.reason).toContain('already completed')
    })
  })

  describe('score formatting', () => {
    it('formats score with "You" for local player and draws notation', () => {
      const formatted = formatSeriesScore({
        scores: { [HOST]: 1, [GUEST]: 0 },
        draws: 1,
        players: PLAYERS,
        playerNames: { [HOST]: 'Swift Hare', [GUEST]: 'Swift Otter' },
        localPlayerId: HOST,
      })
      expect(formatted).toBe('You 1 – 0 Swift Otter · 1 draw')
    })

    it('formats score without draw suffix when draws is 0', () => {
      const formatted = formatSeriesScore({
        scores: { [HOST]: 1, [GUEST]: 2 },
        draws: 0,
        players: PLAYERS,
        playerNames: { [HOST]: 'Swift Hare', [GUEST]: 'Swift Otter' },
        localPlayerId: HOST,
      })
      expect(formatted).toBe('You 1 – 2 Swift Otter')
    })

    it('formats score correctly from Guest perspective', () => {
      const formatted = formatSeriesScore({
        scores: { [HOST]: 2, [GUEST]: 1 },
        draws: 1,
        players: PLAYERS,
        playerNames: { [HOST]: 'Swift Hare', [GUEST]: 'Swift Otter' },
        localPlayerId: GUEST,
      })
      expect(formatted).toBe('You 1 – 2 Swift Hare · 1 draw')
    })

    it('pluralizes draws when multiple draws occur', () => {
      const formatted = formatSeriesScore({
        scores: { [HOST]: 0, [GUEST]: 0 },
        draws: 3,
        players: PLAYERS,
        playerNames: { [HOST]: 'Swift Hare', [GUEST]: 'Swift Otter' },
        localPlayerId: HOST,
      })
      expect(formatted).toBe('You 0 – 0 Swift Otter · 3 draws')
    })
  })
})
