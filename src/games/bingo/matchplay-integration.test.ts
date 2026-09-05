import { describe, it, expect } from 'vitest'
import { createLoopbackTransportPair } from '@/core/transport/LoopbackTransport'
import { LobbyCoordinator } from '@/core/lobby/LobbyCoordinator'
import { BingoMatchCoordinator } from './state/BingoMatchCoordinator'
import { MatchStartEvent } from '@/core/lobby/types'
import { BingoBoard } from './types'
import { validateBingoBoard } from './engine'

describe('BINGO Dual-Player Full Matchplay Integration Test', () => {
  it('executes a complete match from lobby setup to deterministic victory', async () => {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()

    let hostMatchStartEvent: MatchStartEvent<BingoBoard> | null = null
    let guestMatchStartEvent: MatchStartEvent<BingoBoard> | null = null

    // 1. Lobby Phase
    const hostLobby = new LobbyCoordinator<BingoBoard>({
      transport: hostTransport,
      playerName: 'HostAlice',
      validateSetup: (board) => validateBingoBoard(board).valid,
      onMatchStart: (e) => {
        hostMatchStartEvent = e
      },
    })

    const guestLobby = new LobbyCoordinator<BingoBoard>({
      transport: guestTransport,
      playerName: 'GuestBob',
      validateSetup: (board) => validateBingoBoard(board).valid,
      onMatchStart: (e) => {
        guestMatchStartEvent = e
      },
    })

    await hostLobby.start()
    await guestLobby.start()

    // Setup boards:
    // Host board designed to win quickly with 5 lines:
    // Row 0: 1, 2, 3, 4, 5
    // Row 1: 6, 7, 8, 9, 10
    // Row 2: 11, 12, 13, 14, 15
    // Col 0: 1, 6, 11, 16, 21
    // Col 1: 2, 7, 12, 17, 22
    // Rest numbers filled sequentially
    const hostBoard: BingoBoard = [
      1, 2, 3, 4, 5,
      6, 7, 8, 9, 10,
      11, 12, 13, 14, 15,
      16, 17, 18, 19, 20,
      21, 22, 23, 24, 25,
    ]

    // Guest board arranged so uncalled numbers (18, 19, 20, 23, 24, 25) prevent premature lines
    const guestBoard: BingoBoard = [
      1, 6, 11, 16, 25,
      2, 7, 12, 17, 24,
      3, 8, 13, 21, 23,
      4, 9, 14, 22, 20,
      5, 10, 15, 18, 19,
    ]

    hostLobby.updateBoardSetup(hostBoard)
    guestLobby.updateBoardSetup(guestBoard)

    guestLobby.setReady(true)
    hostLobby.setReady(true)

    expect(hostMatchStartEvent).not.toBeNull()
    expect(guestMatchStartEvent).not.toBeNull()

    // 2. Transition into Matchplay
    const hostMatch = new BingoMatchCoordinator({
      transport: hostTransport,
      localPlayer: { id: hostTransport.localPlayerId, name: 'HostAlice', role: 'host' },
      remotePlayer: { id: guestTransport.localPlayerId, name: 'GuestBob', role: 'guest' },
      matchStartEvent: hostMatchStartEvent!,
      turnDurationSeconds: 30,
    })

    const guestMatch = new BingoMatchCoordinator({
      transport: guestTransport,
      localPlayer: { id: guestTransport.localPlayerId, name: 'GuestBob', role: 'guest' },
      remotePlayer: { id: hostTransport.localPlayerId, name: 'HostAlice', role: 'host' },
      matchStartEvent: guestMatchStartEvent!,
      turnDurationSeconds: 30,
    })

    expect(hostMatch.state.gameState.status).toBe('active')
    expect(guestMatch.state.gameState.status).toBe('active')

    // Verify transient emoji reactions exchange over Transport
    const receivedByGuest: string[] = []
    guestMatch.onReaction((rx) => {
      receivedByGuest.push(rx.emoji)
    })
    hostMatch.sendReaction('🎉')
    expect(receivedByGuest).toContain('🎉')

    // Host calls numbers to form 5 lines:
    // Rows 0, 1, 2 = numbers 1 to 15
    // Plus 16, 21 (completes Col 0)
    // Plus 17, 22 (completes Col 1)
    const winningNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 21, 17, 22]

    for (const num of winningNumbers) {
      if (hostMatch.state.gameState.status === 'completed') break

      if (hostMatch.isMyTurn) {
        hostMatch.submitMove(num)
      } else {
        guestMatch.submitMove(num)
      }
    }

    // 3. Verify Deterministic Win
    expect(hostMatch.state.gameState.status).toBe('completed')
    expect(guestMatch.state.gameState.status).toBe('completed')

    expect(hostMatch.winResult.isGameOver).toBe(true)
    expect(guestMatch.winResult.isGameOver).toBe(true)

    // Symmetrical winner ID
    expect(hostMatch.winResult.winnerId).toBe(hostTransport.localPlayerId)
    expect(guestMatch.winResult.winnerId).toBe(hostTransport.localPlayerId)

    // Lines formed check
    expect(hostMatch.state.gameState.completedLines[hostTransport.localPlayerId]).toBeGreaterThanOrEqual(5)
    expect(guestMatch.state.gameState.completedLines[hostTransport.localPlayerId]).toBeGreaterThanOrEqual(5)

    hostMatch.destroy()
    guestMatch.destroy()
  })
})
