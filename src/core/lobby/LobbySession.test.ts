import { describe, it, expect, vi } from 'vitest'
import { createLoopbackTransportPair } from '@/core/transport/LoopbackTransport'
import { LobbySession } from './LobbySession'
import { MatchStartEvent } from './types'

describe('LobbySession', () => {
  it('initializes host and guest in waiting/connecting states, then connects', async () => {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()

    const hostSession = new LobbySession({
      transport: hostTransport,
      playerName: 'Alice (Host)',
    })

    const guestSession = new LobbySession({
      transport: guestTransport,
      playerName: 'Bob (Guest)',
    })

    expect(hostSession.state.localPlayer.name).toBe('Alice (Host)')
    expect(hostSession.state.localPlayer.role).toBe('host')
    expect(hostSession.state.remotePlayer).toBeNull()

    await hostSession.start()
    expect(hostSession.state.status).toBe('waiting')

    await guestSession.start()
    expect(guestSession.state.status).toBe('connected')
    expect(hostSession.state.status).toBe('connected')

    expect(hostSession.state.remotePlayer?.name).toBe('Bob (Guest)')
    expect(guestSession.state.remotePlayer?.name).toBe('Alice (Host)')
  })

  it('synchronizes player name changes across transport', async () => {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()
    const hostSession = new LobbySession({ transport: hostTransport, playerName: 'Host' })
    const guestSession = new LobbySession({ transport: guestTransport, playerName: 'Guest' })

    await hostSession.start()
    await guestSession.start()

    guestSession.updatePlayerName('SuperBob')
    expect(hostSession.state.remotePlayer?.name).toBe('SuperBob')

    hostSession.updatePlayerName('AliceTheGreat')
    expect(guestSession.state.remotePlayer?.name).toBe('AliceTheGreat')
  })

  it('prevents setting ready if board setup validation fails', async () => {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()
    const hostSession = new LobbySession({
      transport: hostTransport,
      validateSetup: (setup: number[]) => Array.isArray(setup) && setup.length === 25,
    })
    await hostSession.start()

    hostSession.updateBoardSetup([1, 2, 3]) // Only 3 numbers instead of 25
    expect(hostSession.canReady()).toBe(false)
    expect(() => hostSession.setReady(true)).toThrow('Invalid board setup')
  })

  it('coordinates ready states and starts match with setupConfigs when both are ready', async () => {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()
    let hostMatchStart: MatchStartEvent<number[]> | null = null
    let guestMatchStart: MatchStartEvent<number[]> | null = null

    const hostSession = new LobbySession<number[]>({
      transport: hostTransport,
      onMatchStart: (event) => {
        hostMatchStart = event
      },
    })
    const guestSession = new LobbySession<number[]>({
      transport: guestTransport,
      onMatchStart: (event) => {
        guestMatchStart = event
      },
    })

    await hostSession.start()
    await guestSession.start()

    const validBoardHost = Array.from({ length: 25 }, (_, i) => i + 1)
    const validBoardGuest = Array.from({ length: 25 }, (_, i) => i + 10)

    hostSession.updateBoardSetup(validBoardHost)
    guestSession.updateBoardSetup(validBoardGuest)

    guestSession.setReady(true)
    expect(hostSession.state.remotePlayer?.isReady).toBe(true)
    expect(hostSession.state.status).toBe('connected')

    hostSession.setReady(true)
    expect(hostSession.state.status).toBe('starting')
    expect(guestSession.state.status).toBe('starting')

    expect(hostMatchStart).not.toBeNull()
    expect(guestMatchStart).not.toBeNull()

    expect(hostMatchStart!.startingPlayerId).toBe(guestMatchStart!.startingPlayerId)
    expect([hostTransport.localPlayerId, guestTransport.localPlayerId]).toContain(
      hostMatchStart!.startingPlayerId
    )
  })

  it('handles remote player disconnection and updates status', async () => {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()
    const hostSession = new LobbySession({ transport: hostTransport })
    const guestSession = new LobbySession({ transport: guestTransport })

    await hostSession.start()
    await guestSession.start()

    expect(hostSession.state.status).toBe('connected')
    guestTransport.disconnect()

    expect(hostSession.state.remotePlayer?.connected).toBe(false)
    expect(hostSession.state.status).toBe('waiting')
  })

  it('does not start match if remote player has invalid board setup', async () => {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()
    const onMatchStart = vi.fn()

    const hostSession = new LobbySession({
      transport: hostTransport,
      validateSetup: (setup: number[]) => Array.isArray(setup) && setup.length === 25,
      onMatchStart,
    })
    const guestSession = new LobbySession({
      transport: guestTransport,
      onMatchStart,
    })

    await hostSession.start()
    await guestSession.start()

    const validBoard = Array.from({ length: 25 }, (_, i) => i + 1)
    hostSession.updateBoardSetup(validBoard)
    guestSession.updateBoardSetup([1, 2, 3]) // Invalid board on guest

    // Guest sends ready with invalid board
    guestSession.setReady(true)
    // Host tries to ready up
    hostSession.setReady(true)

    expect(onMatchStart).not.toHaveBeenCalled()
    expect(hostSession.state.status).not.toBe('starting')
  })

  it('resets ready state for both players on resetForRematch', async () => {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()
    const hostSession = new LobbySession({ transport: hostTransport })
    const guestSession = new LobbySession({ transport: guestTransport })

    await hostSession.start()
    await guestSession.start()

    const validBoard = Array.from({ length: 25 }, (_, i) => i + 1)
    hostSession.updateBoardSetup(validBoard)
    guestSession.updateBoardSetup(validBoard)

    guestSession.setReady(true)
    expect(hostSession.state.remotePlayer?.isReady).toBe(true)

    hostSession.resetForRematch()
    expect(hostSession.state.localPlayer.isReady).toBe(false)
    expect(hostSession.state.remotePlayer?.isReady).toBe(false)
  })

  it('host retry calls retryConnect/connect once and keeps the same room code and invite URL', async () => {
    const [hostTransport] = createLoopbackTransportPair()
    let connectCalls = 0
    let retryCalls = 0
    const originalConnect = hostTransport.connect.bind(hostTransport)
    hostTransport.connect = vi.fn(async () => {
      connectCalls++
      return originalConnect()
    })
    ;(hostTransport as any).retryConnect = vi.fn(async () => {
      retryCalls++
      return hostTransport.localPlayerId
    })

    const hostSession = new LobbySession({
      transport: hostTransport,
      roomCode: 'K7M4QX',
      inviteUrlGenerator: () => `https://example.com/bingo?room=K7M4QX`,
    })

    await hostSession.start()
    expect(connectCalls).toBe(1)
    expect(retryCalls).toBe(0)
    expect(hostSession.state.roomCode).toBe('K7M4QX')
    const initialInviteUrl = hostSession.state.inviteUrl

    // Host retries
    await hostSession.retry()

    // Must call retryConnect once and NOT connect again
    expect(retryCalls).toBe(1)
    expect(connectCalls).toBe(1)
    expect(hostSession.state.roomCode).toBe('K7M4QX')
    expect(hostSession.state.inviteUrl).toBe(initialInviteUrl)
    expect(hostSession.state.status).toBe('waiting')
  })

  describe('Series length synchronization', () => {
    it('defaults series length to 3 and allows host to change length', async () => {
      const [hostTransport, guestTransport] = createLoopbackTransportPair()
      const hostSession = new LobbySession({ transport: hostTransport })
      const guestSession = new LobbySession({ transport: guestTransport })

      expect(hostSession.seriesLength).toBe(3)
      expect(guestSession.seriesLength).toBe(3)

      await hostSession.start()
      await guestSession.start()

      // Host updates series length to 5
      hostSession.setSeriesLength(5)
      expect(hostSession.seriesLength).toBe(5)
      expect(hostSession.state.seriesLength).toBe(5)
      expect(guestSession.seriesLength).toBe(5)
      expect(guestSession.state.seriesLength).toBe(5)
    })

    it('un-readies both players when series length changes', async () => {
      const [hostTransport, guestTransport] = createLoopbackTransportPair()
      const hostSession = new LobbySession<null>({
        transport: hostTransport,
        validateSetup: () => true,
      })
      const guestSession = new LobbySession<null>({
        transport: guestTransport,
        validateSetup: () => true,
      })

      await hostSession.start()
      await guestSession.start()

      // Both players ready up
      guestSession.setReady(true)
      expect(hostSession.state.remotePlayer?.isReady).toBe(true)

      // Host changes series length
      hostSession.setSeriesLength(1)

      expect(hostSession.state.localPlayer.isReady).toBe(false)
      expect(hostSession.state.remotePlayer?.isReady).toBe(false)
      expect(guestSession.state.localPlayer.isReady).toBe(false)
      expect(guestSession.state.remotePlayer?.isReady).toBe(false)
    })

    it('passes chosen series length in match_start to both players', async () => {
      const [hostTransport, guestTransport] = createLoopbackTransportPair()
      let hostMatchStart: MatchStartEvent<null> | null = null
      let guestMatchStart: MatchStartEvent<null> | null = null

      const hostSession = new LobbySession<null>({
        transport: hostTransport,
        validateSetup: () => true,
        onMatchStart: (event) => {
          hostMatchStart = event
        },
      })
      const guestSession = new LobbySession<null>({
        transport: guestTransport,
        validateSetup: () => true,
        onMatchStart: (event) => {
          guestMatchStart = event
        },
      })

      await hostSession.start()
      await guestSession.start()

      hostSession.setSeriesLength(5)

      guestSession.setReady(true)
      hostSession.setReady(true)

      expect(hostMatchStart).not.toBeNull()
      expect(guestMatchStart).not.toBeNull()
      expect(hostMatchStart!.seriesLength).toBe(5)
      expect(guestMatchStart!.seriesLength).toBe(5)
    })
  })
})
