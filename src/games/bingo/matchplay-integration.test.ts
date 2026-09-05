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

  it('seamlessly negotiates rematch and transitions back to lobby setup for match 2', async () => {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()

    let matchCount = 0
    let currentHostMatch: BingoMatchCoordinator | null = null
    let currentGuestMatch: BingoMatchCoordinator | null = null

    const hostLobby: LobbyCoordinator<BingoBoard> = new LobbyCoordinator<BingoBoard>({
      transport: hostTransport,
      playerName: 'Alice',
      validateSetup: (board) => validateBingoBoard(board).valid,
      onMatchStart: (event) => {
        matchCount++
        currentHostMatch = new BingoMatchCoordinator({
          transport: hostTransport,
          localPlayer: { id: hostTransport.localPlayerId, name: 'Alice', role: 'host' },
          remotePlayer: { id: guestTransport.localPlayerId, name: 'Bob', role: 'guest' },
          matchStartEvent: event,
          onRematch: () => {
            currentHostMatch?.destroy()
            hostLobby.resetForRematch()
            currentHostMatch = null
          },
        })
      },
    })

    const guestLobby: LobbyCoordinator<BingoBoard> = new LobbyCoordinator<BingoBoard>({
      transport: guestTransport,
      playerName: 'Bob',
      validateSetup: (board) => validateBingoBoard(board).valid,
      onMatchStart: (event) => {
        currentGuestMatch = new BingoMatchCoordinator({
          transport: guestTransport,
          localPlayer: { id: guestTransport.localPlayerId, name: 'Bob', role: 'guest' },
          remotePlayer: { id: hostTransport.localPlayerId, name: 'Alice', role: 'host' },
          matchStartEvent: event,
          onRematch: () => {
            currentGuestMatch?.destroy()
            guestLobby.resetForRematch()
            currentGuestMatch = null
          },
        })
      },
    })

    await hostLobby.start()
    await guestLobby.start()

    const board1 = Array.from({ length: 25 }, (_, i) => i + 1)
    hostLobby.updateBoardSetup(board1)
    guestLobby.updateBoardSetup(board1)
    hostLobby.setReady(true)
    guestLobby.setReady(true)

    expect(matchCount).toBe(1)
    expect(currentHostMatch).not.toBeNull()
    expect(currentGuestMatch).not.toBeNull()

    // Complete Match 1 by forfeit or moves
    currentHostMatch!.requestRematch()
    expect(currentGuestMatch!.state.rematchState).toBe('received')

    currentGuestMatch!.acceptRematch()

    // Both coordinators should have triggered onRematch and reset their lobbies
    expect(currentHostMatch).toBeNull()
    expect(currentGuestMatch).toBeNull()
    expect(hostLobby.state.status).toBe('connected')
    expect(guestLobby.state.status).toBe('connected')
    expect(hostLobby.state.localPlayer.isReady).toBe(false)
    expect(guestLobby.state.localPlayer.isReady).toBe(false)

    // Now start Match 2 over same transport without new URLs
    const board2 = Array.from({ length: 25 }, (_, i) => 25 - i)
    hostLobby.updateBoardSetup(board2)
    guestLobby.updateBoardSetup(board2)
    hostLobby.setReady(true)
    guestLobby.setReady(true)

    expect(matchCount).toBe(2)
    expect(currentHostMatch).not.toBeNull()
    expect(currentGuestMatch).not.toBeNull()

    currentHostMatch!.destroy()
    currentGuestMatch!.destroy()
  })

  it('triggers 30s grace period and resolves victory by forfeit on disconnect', async () => {
    const { vi } = await import('vitest')
    vi.useFakeTimers()

    const [hostTransport, guestTransport] = createLoopbackTransportPair()

    let hostMatchStartEvent: MatchStartEvent<BingoBoard> | null = null

    const hostLobby = new LobbyCoordinator<BingoBoard>({
      transport: hostTransport,
      playerName: 'Alice',
      validateSetup: (board) => validateBingoBoard(board).valid,
      onMatchStart: (e) => {
        hostMatchStartEvent = e
      },
    })

    const guestLobby = new LobbyCoordinator<BingoBoard>({
      transport: guestTransport,
      playerName: 'Bob',
      validateSetup: (board) => validateBingoBoard(board).valid,
    })

    await hostLobby.start()
    await guestLobby.start()

    const board = Array.from({ length: 25 }, (_, i) => i + 1)
    hostLobby.updateBoardSetup(board)
    guestLobby.updateBoardSetup(board)
    guestLobby.setReady(true)
    hostLobby.setReady(true)

    const hostMatch = new BingoMatchCoordinator({
      transport: hostTransport,
      localPlayer: { id: hostTransport.localPlayerId, name: 'Alice', role: 'host' },
      remotePlayer: { id: guestTransport.localPlayerId, name: 'Bob', role: 'guest' },
      matchStartEvent: hostMatchStartEvent!,
    })

    expect(hostMatch.state.isReconnecting).toBe(false)

    // Guest disconnects abruptly
    guestTransport.disconnect()

    expect(hostMatch.state.isReconnecting).toBe(true)
    expect(hostMatch.state.reconnectSecondsRemaining).toBe(30)

    // Advance 30 seconds
    vi.advanceTimersByTime(30000)

    expect(hostMatch.state.isReconnecting).toBe(false)
    expect(hostMatch.state.gameState.status).toBe('completed')
    expect(hostMatch.winResult.isGameOver).toBe(true)
    expect(hostMatch.winResult.winnerId).toBe(hostTransport.localPlayerId)
    expect(hostMatch.winResult.reason).toBe('forfeit')

    hostMatch.destroy()
    vi.useRealTimers()
  })
})
