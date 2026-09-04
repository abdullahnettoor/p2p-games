import { describe, it, expect } from 'vitest'
import { createLoopbackTransportPair } from '@/core/transport/LoopbackTransport'
import { LobbySession } from './LobbySession'
import { MatchStartEvent } from './types'
import { BingoBoard } from '@/games/bingo/types'
import { validateBingoBoard, generateRandomBingoBoard } from '@/games/bingo/engine'

describe('Multiplayer Lobby Integration Test', () => {
  it('executes a complete synchronized dual-client lobby journey', async () => {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()

    let hostMatchStartEvent: MatchStartEvent<BingoBoard> | null = null
    let guestMatchStartEvent: MatchStartEvent<BingoBoard> | null = null

    // 1. Host creates lobby
    const hostSession = new LobbySession<BingoBoard>({
      transport: hostTransport,
      playerName: 'HostAlice',
      validateSetup: (board) => validateBingoBoard(board).valid,
      onMatchStart: (e) => {
        hostMatchStartEvent = e
      },
      inviteUrlGenerator: (id) => `https://p2p.game/bingo?match=${id}`,
    })

    await hostSession.start()

    // Verify host is waiting for guest
    expect(hostSession.state.status).toBe('waiting')
    expect(hostSession.state.localPlayer.name).toBe('HostAlice')
    expect(hostSession.state.inviteUrl).toContain('https://p2p.game/bingo?match=')
    expect(hostSession.state.remotePlayer).toBeNull()

    // 2. Guest joins via invite
    const guestSession = new LobbySession<BingoBoard>({
      transport: guestTransport,
      playerName: 'GuestBob',
      validateSetup: (board) => validateBingoBoard(board).valid,
      onMatchStart: (e) => {
        guestMatchStartEvent = e
      },
    })

    await guestSession.start()

    // Verify both are connected and aware of each other
    expect(hostSession.state.status).toBe('connected')
    expect(guestSession.state.status).toBe('connected')

    expect(hostSession.state.remotePlayer?.name).toBe('GuestBob')
    expect(guestSession.state.remotePlayer?.name).toBe('HostAlice')
    expect(hostSession.state.remotePlayer?.connected).toBe(true)
    expect(guestSession.state.remotePlayer?.connected).toBe(true)

    // 3. Player customizes name
    guestSession.updatePlayerName('SuperBob')
    expect(hostSession.state.remotePlayer?.name).toBe('SuperBob')

    hostSession.updatePlayerName('QueenAlice')
    expect(guestSession.state.remotePlayer?.name).toBe('QueenAlice')

    // 4. Board setup validation
    const invalidBoard = [1, 2, 3] as any
    hostSession.updateBoardSetup(invalidBoard)
    expect(hostSession.canReady()).toBe(false)
    expect(() => hostSession.setReady(true)).toThrow('Invalid board setup')

    const hostBoard = generateRandomBingoBoard()
    const guestBoard = generateRandomBingoBoard()

    hostSession.updateBoardSetup(hostBoard)
    guestSession.updateBoardSetup(guestBoard)

    expect(hostSession.canReady()).toBe(true)
    expect(guestSession.canReady()).toBe(true)

    // 5. Dual-sided ready toggle
    // Host readies up
    hostSession.setReady(true)
    expect(hostSession.state.localPlayer.isReady).toBe(true)
    expect(guestSession.state.remotePlayer?.isReady).toBe(true)
    expect(hostMatchStartEvent).toBeNull()
    expect(guestMatchStartEvent).toBeNull()

    // Host unreadies (e.g., changes mind or board)
    hostSession.setReady(false)
    expect(hostSession.state.localPlayer.isReady).toBe(false)
    expect(guestSession.state.remotePlayer?.isReady).toBe(false)

    // Guest readies up
    guestSession.setReady(true)
    expect(guestSession.state.localPlayer.isReady).toBe(true)
    expect(hostSession.state.remotePlayer?.isReady).toBe(true)
    expect(hostMatchStartEvent).toBeNull()

    // Host readies up -> both are ready!
    hostSession.setReady(true)

    // 6. Synchronized transition to Match
    expect(hostSession.state.status).toBe('starting')
    expect(guestSession.state.status).toBe('starting')

    expect(hostMatchStartEvent).not.toBeNull()
    expect(guestMatchStartEvent).not.toBeNull()

    // Verify determinism across both players
    expect(hostMatchStartEvent!.startingPlayerId).toBe(guestMatchStartEvent!.startingPlayerId)
    expect(hostMatchStartEvent!.hostId).toBe(hostSession.state.localPlayer.id)
    expect(guestMatchStartEvent!.hostId).toBe(hostSession.state.localPlayer.id)
    expect(hostMatchStartEvent!.guestId).toBe(guestSession.state.localPlayer.id)
    expect(guestMatchStartEvent!.guestId).toBe(guestSession.state.localPlayer.id)

    expect(hostMatchStartEvent!.hostSetup).toEqual(hostBoard)
    expect(hostMatchStartEvent!.guestSetup).toEqual(guestBoard)
    expect(guestMatchStartEvent!.hostSetup).toEqual(hostBoard)
    expect(guestMatchStartEvent!.guestSetup).toEqual(guestBoard)
  })
})
