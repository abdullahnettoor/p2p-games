import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createLoopbackTransportPair } from '@/core/transport/LoopbackTransport'
import { BingoMatchCoordinator } from './BingoMatchCoordinator'
import { MatchStartEvent } from '@/core/lobby/types'
import { BingoBoard } from '../types'
import { generateRandomBingoBoard } from '../engine'

describe('BingoMatchCoordinator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function setupCoordinators() {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()
    hostTransport.connect()
    guestTransport.connect()

    const hostBoard = generateRandomBingoBoard()
    const guestBoard = generateRandomBingoBoard()

    const matchStartEvent: MatchStartEvent<BingoBoard> = {
      hostId: hostTransport.localPlayerId,
      guestId: guestTransport.localPlayerId,
      startingPlayerId: hostTransport.localPlayerId, // Host goes first
      hostSetup: hostBoard,
      guestSetup: guestBoard,
    }

    const hostCoordinator = new BingoMatchCoordinator({
      transport: hostTransport,
      localPlayer: { id: hostTransport.localPlayerId, name: 'HostAlice', role: 'host' },
      remotePlayer: { id: guestTransport.localPlayerId, name: 'GuestBob', role: 'guest' },
      matchStartEvent,
      turnDurationSeconds: 30,
    })

    const guestCoordinator = new BingoMatchCoordinator({
      transport: guestTransport,
      localPlayer: { id: guestTransport.localPlayerId, name: 'GuestBob', role: 'guest' },
      remotePlayer: { id: hostTransport.localPlayerId, name: 'HostAlice', role: 'host' },
      matchStartEvent,
      turnDurationSeconds: 30,
    })

    return { hostCoordinator, guestCoordinator, hostTransport, guestTransport, hostBoard, guestBoard }
  }

  it('initializes match state correctly with starting player', () => {
    const { hostCoordinator, guestCoordinator } = setupCoordinators()

    expect(hostCoordinator.isMyTurn).toBe(true)
    expect(guestCoordinator.isMyTurn).toBe(false)
    expect(hostCoordinator.state.turnSecondsRemaining).toBe(30)
    expect(guestCoordinator.state.turnSecondsRemaining).toBe(30)
    expect(hostCoordinator.state.gameState.status).toBe('active')
    expect(hostCoordinator.state.gameState.calledNumbers).toEqual([])
  })

  it('submits a valid move and synchronizes boards symmetrically', () => {
    const { hostCoordinator, guestCoordinator, hostBoard } = setupCoordinators()

    const pickedNumber = hostBoard[0]
    const success = hostCoordinator.submitMove(pickedNumber)

    expect(success).toBe(true)
    expect(hostCoordinator.state.gameState.calledNumbers).toEqual([pickedNumber])
    expect(guestCoordinator.state.gameState.calledNumbers).toEqual([pickedNumber])

    // Turn should switch to Guest
    expect(hostCoordinator.isMyTurn).toBe(false)
    expect(guestCoordinator.isMyTurn).toBe(true)
    expect(hostCoordinator.state.turnSecondsRemaining).toBe(30)
    expect(guestCoordinator.state.turnSecondsRemaining).toBe(30)
  })

  it('rejects moves submitted out of turn or invalid numbers', () => {
    const { hostCoordinator, guestCoordinator } = setupCoordinators()

    // Guest tries to move on Host's turn
    expect(guestCoordinator.submitMove(10)).toBe(false)
    expect(guestCoordinator.state.gameState.calledNumbers).toEqual([])

    // Host picks an invalid number (< 1 or > 25)
    expect(hostCoordinator.submitMove(99)).toBe(false)
  })

  it('automatically auto-selects a random valid number when turn timer expires', () => {
    const { hostCoordinator, guestCoordinator } = setupCoordinators()

    expect(hostCoordinator.isMyTurn).toBe(true)
    expect(hostCoordinator.state.turnSecondsRemaining).toBe(30)

    // Advance 10 seconds
    vi.advanceTimersByTime(10000)
    expect(hostCoordinator.state.turnSecondsRemaining).toBe(20)

    // Advance remaining 20 seconds
    vi.advanceTimersByTime(20000)

    // Host should have automatically picked a number and passed turn to Guest
    expect(hostCoordinator.state.gameState.calledNumbers.length).toBe(1)
    expect(guestCoordinator.state.gameState.calledNumbers.length).toBe(1)
    expect(hostCoordinator.isMyTurn).toBe(false)
    expect(guestCoordinator.isMyTurn).toBe(true)
  })

  it('symmetrically declares win when 5 lines are formed', () => {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()
    hostTransport.connect()
    guestTransport.connect()

    // Deterministic board: 1..25 sequentially
    const sequentialBoard = Array.from({ length: 25 }, (_, i) => i + 1)

    const matchStartEvent: MatchStartEvent<BingoBoard> = {
      hostId: hostTransport.localPlayerId,
      guestId: guestTransport.localPlayerId,
      startingPlayerId: hostTransport.localPlayerId,
      hostSetup: sequentialBoard,
      guestSetup: sequentialBoard,
    }

    const hostCoordinator = new BingoMatchCoordinator({
      transport: hostTransport,
      localPlayer: { id: hostTransport.localPlayerId, name: 'HostAlice', role: 'host' },
      remotePlayer: { id: guestTransport.localPlayerId, name: 'GuestBob', role: 'guest' },
      matchStartEvent,
      turnDurationSeconds: 30,
    })

    const guestCoordinator = new BingoMatchCoordinator({
      transport: guestTransport,
      localPlayer: { id: guestTransport.localPlayerId, name: 'GuestBob', role: 'guest' },
      remotePlayer: { id: hostTransport.localPlayerId, name: 'HostAlice', role: 'host' },
      matchStartEvent,
      turnDurationSeconds: 30,
    })

    // Calling rows 0, 1, 2, 3, 4 forms 5 horizontal lines
    // Numbers 1 to 25 in order
    for (let num = 1; num <= 25; num++) {
      if (hostCoordinator.state.gameState.status === 'completed') break

      if (hostCoordinator.isMyTurn) {
        hostCoordinator.submitMove(num)
      } else {
        guestCoordinator.submitMove(num)
      }
    }

    expect(hostCoordinator.state.gameState.status).toBe('completed')
    expect(guestCoordinator.state.gameState.status).toBe('completed')
    expect(hostCoordinator.winResult.isGameOver).toBe(true)
    expect(guestCoordinator.winResult.isGameOver).toBe(true)
  })
})
