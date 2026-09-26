import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLoopbackTransportPair } from '@/core/transport/LoopbackTransport'
import {
  DEFAULT_BETWEEN_ROUNDS_SECONDS,
  DEFAULT_RECONNECT_GRACE_SECONDS,
  DEFAULT_TURN_DURATION_SECONDS,
  TicTacToeMatchCoordinator,
} from './TicTacToeMatchCoordinator'
import { TICTACTOE_ACTIVE_MATCH_STORAGE_KEY } from './types'

describe('TicTacToeMatchCoordinator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    localStorage.clear()
  })

  function setupCoordinators(
    bestOf: 1 | 3 | 5 = 3,
    pickStarter: (players: [string, string]) => string = (players) => players[0]
  ) {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()
    hostTransport.connect()
    guestTransport.connect()

    const hostCoordinator = new TicTacToeMatchCoordinator({
      transport: hostTransport,
      localPlayer: { id: hostTransport.localPlayerId, name: 'Swift Hare', role: 'host' },
      remotePlayer: { id: guestTransport.localPlayerId, name: 'Swift Otter', role: 'guest' },
      bestOf,
      startingPlayerId: hostTransport.localPlayerId,
      pickStarter,
    })

    const guestCoordinator = new TicTacToeMatchCoordinator({
      transport: guestTransport,
      localPlayer: { id: guestTransport.localPlayerId, name: 'Swift Otter', role: 'guest' },
      remotePlayer: { id: hostTransport.localPlayerId, name: 'Swift Hare', role: 'host' },
      bestOf,
      startingPlayerId: hostTransport.localPlayerId,
    })

    return {
      hostCoordinator,
      guestCoordinator,
      hostTransport,
      guestTransport,
      hostId: hostTransport.localPlayerId,
      guestId: guestTransport.localPlayerId,
    }
  }

  describe('initialization and caching', () => {
    it('initializes round and series state symmetrically', () => {
      const { hostCoordinator, guestCoordinator, hostId, guestId } = setupCoordinators()

      expect(hostCoordinator.isMyTurn).toBe(true)
      expect(guestCoordinator.isMyTurn).toBe(false)
      expect(hostCoordinator.snapshot.turnSecondsRemaining).toBe(15)
      expect(guestCoordinator.snapshot.turnSecondsRemaining).toBe(15)
      expect(hostCoordinator.snapshot.seriesState.bestOf).toBe(3)
      expect(hostCoordinator.snapshot.seriesState.currentRoundNumber).toBe(1)
      expect(hostCoordinator.snapshot.seriesState.currentRoundStarterId).toBe(hostId)

      // Active match cached in localStorage
      const cached = JSON.parse(
        localStorage.getItem(TICTACTOE_ACTIVE_MATCH_STORAGE_KEY) || '{}'
      )
      expect(cached.status).toBe('active')
      expect(cached.bestOf).toBe(3)
    })
  })

  describe('turn play and validation', () => {
    it('applies moves symmetrically and alternates turns', () => {
      const { hostCoordinator, guestCoordinator } = setupCoordinators()

      // Host plays cell 0
      const moved = hostCoordinator.submitMove(0)
      expect(moved).toBe(true)

      expect(hostCoordinator.snapshot.currentRoundState.board[0]).toBe('X')
      expect(guestCoordinator.snapshot.currentRoundState.board[0]).toBe('X')
      expect(hostCoordinator.isMyTurn).toBe(false)
      expect(guestCoordinator.isMyTurn).toBe(true)

      // Guest plays cell 4
      const guestMoved = guestCoordinator.submitMove(4)
      expect(guestMoved).toBe(true)

      expect(hostCoordinator.snapshot.currentRoundState.board[4]).toBe('O')
      expect(guestCoordinator.snapshot.currentRoundState.board[4]).toBe('O')
      expect(hostCoordinator.isMyTurn).toBe(true)
      expect(guestCoordinator.isMyTurn).toBe(false)
    })

    it('rejects moves out of turn or on already taken cells', () => {
      const { hostCoordinator, guestCoordinator } = setupCoordinators()

      // Guest cannot move on Host's turn
      expect(guestCoordinator.submitMove(0)).toBe(false)

      // Host moves to 0
      expect(hostCoordinator.submitMove(0)).toBe(true)

      // Guest cannot move to 0 (already taken)
      expect(guestCoordinator.submitMove(0)).toBe(false)
    })
  })

  describe('15-second turn timer', () => {
    it('counts down and passes turn on timer expiry', () => {
      const { hostCoordinator, guestCoordinator } = setupCoordinators()

      expect(hostCoordinator.snapshot.turnSecondsRemaining).toBe(15)
      expect(hostCoordinator.isMyTurn).toBe(true)

      // Advance 5 seconds
      vi.advanceTimersByTime(5000)
      expect(hostCoordinator.snapshot.turnSecondsRemaining).toBe(10)

      // Advance remaining 10 seconds to hit 0
      vi.advanceTimersByTime(10000)

      // Turn passes to Guest! Board remains empty!
      expect(hostCoordinator.isMyTurn).toBe(false)
      expect(guestCoordinator.isMyTurn).toBe(true)
      expect(hostCoordinator.snapshot.currentRoundState.board).toEqual(Array(9).fill(null))
      expect(hostCoordinator.snapshot.turnSecondsRemaining).toBe(15)
      expect(guestCoordinator.snapshot.turnSecondsRemaining).toBe(15)
    })
  })

  describe('Host enforces turn expiry', () => {
    it('passes a stalled Guest turn once it is overdue on the Host clock', () => {
      const { hostCoordinator, guestCoordinator, guestTransport } = setupCoordinators(3)
      hostCoordinator.submitMove(0)
      expect(guestCoordinator.isMyTurn).toBe(true)

      // Simulate a stalled Guest client: its own timer never passes the turn
      guestCoordinator.destroy()
      vi.advanceTimersByTime((DEFAULT_TURN_DURATION_SECONDS + 3) * 1000)

      expect(hostCoordinator.isMyTurn).toBe(true)
      expect(hostCoordinator.snapshot.currentRoundMoves.at(-1)).toMatchObject({ type: 'pass' })
      expect(guestTransport.status).toBe('connected')
    })
  })

  describe('between-rounds flow and round start', () => {
    it('detects round win, enters between-rounds, and advances via 3s timer', () => {
      const { hostCoordinator, guestCoordinator, hostId } = setupCoordinators(3)

      // Host: 0, 1, 2 (wins round 1)
      hostCoordinator.submitMove(0)
      guestCoordinator.submitMove(3)
      hostCoordinator.submitMove(1)
      guestCoordinator.submitMove(4)
      hostCoordinator.submitMove(2)

      // Round 1 completed!
      expect(hostCoordinator.snapshot.isBetweenRounds).toBe(true)
      expect(guestCoordinator.snapshot.isBetweenRounds).toBe(true)
      expect(hostCoordinator.snapshot.seriesState.scores[hostId]).toBe(1)
      expect(hostCoordinator.snapshot.roundRecords.length).toBe(1)
      expect(hostCoordinator.snapshot.roundRecords[0].winningLine).toEqual([0, 1, 2])

      // 3-second countdown
      expect(hostCoordinator.snapshot.betweenRoundsSecondsRemaining).toBe(3)
      vi.advanceTimersByTime(3000)

      // Round 2 automatically starts! Guest starts round 2!
      expect(hostCoordinator.snapshot.isBetweenRounds).toBe(false)
      expect(guestCoordinator.snapshot.isBetweenRounds).toBe(false)
      expect(hostCoordinator.snapshot.seriesState.currentRoundNumber).toBe(2)
      expect(guestCoordinator.snapshot.currentRoundState.board).toEqual(Array(9).fill(null))
      expect(guestCoordinator.isMyTurn).toBe(true)
      expect(hostCoordinator.isMyTurn).toBe(false)
    })

    it('advances sooner if both players tap "Next"', () => {
      const { hostCoordinator, guestCoordinator } = setupCoordinators(3)

      // Host wins round 1 quickly
      hostCoordinator.submitMove(0)
      guestCoordinator.submitMove(3)
      hostCoordinator.submitMove(1)
      guestCoordinator.submitMove(4)
      hostCoordinator.submitMove(2)

      expect(hostCoordinator.snapshot.isBetweenRounds).toBe(true)

      // Only 500ms elapsed
      vi.advanceTimersByTime(500)
      expect(hostCoordinator.snapshot.isBetweenRounds).toBe(true)

      // Both tap Next
      hostCoordinator.readyForNextRound()
      expect(hostCoordinator.snapshot.isBetweenRounds).toBe(true) // Waiting for guest
      guestCoordinator.readyForNextRound()

      // Immediately advances without waiting full 3s!
      expect(hostCoordinator.snapshot.isBetweenRounds).toBe(false)
      expect(guestCoordinator.snapshot.isBetweenRounds).toBe(false)
      expect(hostCoordinator.snapshot.seriesState.currentRoundNumber).toBe(2)
    })

    it('waits to start next round if Host is in reconnect grace during between-rounds', () => {
      const { hostCoordinator, guestCoordinator, hostTransport } = setupCoordinators(3)

      // Host wins round 1
      hostCoordinator.submitMove(0)
      guestCoordinator.submitMove(3)
      hostCoordinator.submitMove(1)
      guestCoordinator.submitMove(4)
      hostCoordinator.submitMove(2)

      expect(guestCoordinator.snapshot.isBetweenRounds).toBe(true)

      // Host drops connection during between-rounds
      hostTransport.disconnect()

      // 3 seconds elapse
      vi.advanceTimersByTime(3000)

      // Next round does NOT start because Host is disconnected!
      expect(guestCoordinator.snapshot.isBetweenRounds).toBe(true)
      expect(guestCoordinator.snapshot.isHostWaitingInGrace).toBe(true)

      // Host reconnects
      hostTransport.connect()

      // Series syncs and resumes
      expect(guestCoordinator.snapshot.isBetweenRounds).toBe(true)
    })
  })

  describe('match completion, results and rematch', () => {
    it('concludes match when a player clinches the series in Best of 3', () => {
      const { hostCoordinator, guestCoordinator, hostId } = setupCoordinators(3)

      // Round 1: Host wins
      hostCoordinator.submitMove(0)
      guestCoordinator.submitMove(3)
      hostCoordinator.submitMove(1)
      guestCoordinator.submitMove(4)
      hostCoordinator.submitMove(2)

      // Advance to Round 2
      vi.advanceTimersByTime(3000)

      // Round 2: Guest starts. Host wins again (2-0 sweep)
      guestCoordinator.submitMove(3)
      hostCoordinator.submitMove(0)
      guestCoordinator.submitMove(4)
      hostCoordinator.submitMove(1)
      guestCoordinator.submitMove(6)
      hostCoordinator.submitMove(2)

      // Match should be completed!
      expect(hostCoordinator.snapshot.status).toBe('completed')
      expect(guestCoordinator.snapshot.status).toBe('completed')
      expect(hostCoordinator.snapshot.winResult.winnerId).toBe(hostId)
      expect(hostCoordinator.snapshot.winResult.isGameOver).toBe(true)

      // Active match cleared from localStorage
      expect(localStorage.getItem(TICTACTOE_ACTIVE_MATCH_STORAGE_KEY)).toBeNull()
    })

    it('supports rematch starting a new match of the same series length', () => {
      const { hostCoordinator, guestCoordinator, hostId } = setupCoordinators(3)

      // Quick 1-round series won
      hostCoordinator.submitMove(0)
      guestCoordinator.submitMove(3)
      hostCoordinator.submitMove(1)
      guestCoordinator.submitMove(4)
      hostCoordinator.submitMove(2)

      vi.advanceTimersByTime(3000)

      // Round 2 win -> 2-0
      guestCoordinator.submitMove(3)
      hostCoordinator.submitMove(0)
      guestCoordinator.submitMove(4)
      hostCoordinator.submitMove(1)
      guestCoordinator.submitMove(6)
      hostCoordinator.submitMove(2)

      expect(hostCoordinator.snapshot.status).toBe('completed')

      // Host requests rematch
      hostCoordinator.requestRematch()
      expect(hostCoordinator.snapshot.rematchState).toBe('requested')
      expect(guestCoordinator.snapshot.rematchState).toBe('received')

      // Guest accepts rematch
      guestCoordinator.acceptRematch()
      expect(hostCoordinator.snapshot.rematchState).toBe('none')
      expect(guestCoordinator.snapshot.rematchState).toBe('none')

      // New Match started! Same length (Best of 3), scores reset, round 1 active
      expect(hostCoordinator.snapshot.status).toBe('active')
      expect(guestCoordinator.snapshot.status).toBe('active')
      expect(hostCoordinator.snapshot.seriesState.bestOf).toBe(3)
      expect(hostCoordinator.snapshot.seriesState.currentRoundNumber).toBe(1)
      expect(hostCoordinator.snapshot.seriesState.scores[hostId]).toBe(0)
      expect(hostCoordinator.isMyTurn).toBe(true)
    })

    it('rematch uses the starter the Host picked, on both peers', () => {
      const { hostCoordinator, guestCoordinator, guestId } = setupCoordinators(1, (players) => players[1])

      hostCoordinator.submitMove(0)
      guestCoordinator.submitMove(3)
      hostCoordinator.submitMove(1)
      guestCoordinator.submitMove(4)
      hostCoordinator.submitMove(2)
      expect(guestCoordinator.snapshot.status).toBe('completed')

      guestCoordinator.requestRematch()
      hostCoordinator.acceptRematch()

      expect(hostCoordinator.snapshot.status).toBe('active')
      expect(guestCoordinator.snapshot.status).toBe('active')
      expect(hostCoordinator.snapshot.seriesState.round1StarterId).toBe(guestId)
      expect(guestCoordinator.snapshot.seriesState.round1StarterId).toBe(guestId)
      expect(guestCoordinator.isMyTurn).toBe(true)
    })
  })

  describe('forfeit and disconnection grace', () => {
    it('forfeit ends the entire match immediately', () => {
      const { hostCoordinator, guestCoordinator, guestId } = setupCoordinators(3)

      // Host forfeits
      hostCoordinator.forfeit()

      expect(hostCoordinator.snapshot.status).toBe('completed')
      expect(guestCoordinator.snapshot.status).toBe('completed')
      expect(hostCoordinator.snapshot.winResult.winnerId).toBe(guestId)
      expect(hostCoordinator.snapshot.winResult.reason).toBe('forfeit')
      expect(guestCoordinator.snapshot.winResult.winnerId).toBe(guestId)
      expect(guestCoordinator.snapshot.winResult.reason).toBe('forfeit')
    })

    it('ends with no winner when a dropped link is not restored within 30s grace', () => {
      const { hostCoordinator, guestTransport } = setupCoordinators(3)

      // Guest drops
      guestTransport.disconnect()

      expect(hostCoordinator.snapshot.isReconnecting).toBe(true)
      expect(hostCoordinator.snapshot.reconnectSecondsRemaining).toBe(30)

      // Advance 30 seconds
      vi.advanceTimersByTime(30000)

      // Neither side can prove who left, so nobody is awarded the win
      expect(hostCoordinator.snapshot.status).toBe('completed')
      expect(hostCoordinator.snapshot.winResult.winnerId).toBeNull()
      expect(hostCoordinator.snapshot.winResult.reason).toBe('disconnect')
    })

    it('does not let either peer award itself the win when its own link drops', () => {
      const { hostCoordinator, guestCoordinator, guestTransport } = setupCoordinators(3)
      guestTransport.disconnect()
      vi.advanceTimersByTime(30000)
      expect(hostCoordinator.snapshot.winResult.winnerId).toBeNull()
      expect(guestCoordinator.snapshot.winResult.winnerId).toBeNull()
    })
  })

  describe('message authority (ADR 0003)', () => {
    it('Host ignores round_start and sync sent by the Guest', () => {
      const { hostCoordinator, guestTransport, guestId } = setupCoordinators(3)
      const before = JSON.stringify(hostCoordinator.snapshot.seriesState)

      guestTransport.send({
        type: 'round_start',
        payload: { roundNumber: 2, startingPlayerId: guestId, timestamp: 1 },
      })
      guestTransport.send({
        type: 'sync',
        payload: {
          state: {
            ...hostCoordinator.snapshot,
            seriesState: { ...hostCoordinator.snapshot.seriesState, scores: { [guestId]: 9 } },
          },
          timestamp: 1,
        },
      })

      expect(JSON.stringify(hostCoordinator.snapshot.seriesState)).toBe(before)
      expect(hostCoordinator.snapshot.currentRoundMoves).toHaveLength(0)
    })

    it('Guest rejects a sync that belongs to another Match or rewinds this one', () => {
      const { hostCoordinator, guestCoordinator, hostTransport } = setupCoordinators(3)
      hostCoordinator.submitMove(0)
      const snapshot = hostCoordinator.snapshot

      hostTransport.send({
        type: 'sync',
        payload: {
          state: {
            ...snapshot,
            seriesState: { ...snapshot.seriesState, players: ['someone', 'else'] },
          },
          timestamp: 1,
        },
      })
      hostTransport.send({
        type: 'sync',
        payload: { state: { ...snapshot, seriesState: { ...snapshot.seriesState, bestOf: 5 } }, timestamp: 1 },
      })

      expect(guestCoordinator.snapshot.seriesState.bestOf).toBe(3)
      expect(guestCoordinator.snapshot.currentRoundState.board[0]).toBe('X')
    })

    it('ignores forfeit, rematch and reactions that name the wrong player', () => {
      const { hostCoordinator, guestTransport, hostId } = setupCoordinators(3)
      const reactions: string[] = []
      hostCoordinator.onReaction((r) => reactions.push(r.emoji))

      guestTransport.send({ type: 'forfeit', payload: { playerId: hostId } })
      guestTransport.send({ type: 'reaction', payload: { emoji: '👍', playerId: hostId, timestamp: 1 } })

      expect(hostCoordinator.snapshot.status).toBe('active')
      expect(reactions).toHaveLength(0)
    })
  })

  describe('reconnect sync', () => {
    it('Guest asks the Host for its state after reconnecting', () => {
      const { hostTransport, guestTransport } = setupCoordinators(3)
      const hostSeen: string[] = []
      hostTransport.onMessage((m) => hostSeen.push(m.type))

      guestTransport.disconnect()
      guestTransport.connect()

      expect(hostSeen).toContain('sync')
    })

    it('keys the cached Match by its players', () => {
      const { hostCoordinator, hostId, guestId } = setupCoordinators(3)
      expect(hostCoordinator.matchId).toBe(`${hostId}:${guestId}`)
      expect(TicTacToeMatchCoordinator.getCachedMatch(`${hostId}:${guestId}`)).not.toBeNull()
      expect(TicTacToeMatchCoordinator.getCachedMatch('other:match')).toBeNull()
    })
  })

  describe('reactions', () => {
    it('broadcasts emoji reactions to peer listeners', () => {
      const { hostCoordinator, guestCoordinator } = setupCoordinators()

      const receivedReactions: string[] = []
      guestCoordinator.onReaction((rx) => {
        receivedReactions.push(rx.emoji)
      })

      hostCoordinator.sendReaction('🎉')

      expect(receivedReactions).toEqual(['🎉'])
    })
  })
})
