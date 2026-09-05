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
    expect(hostSession.state.localPlayer.isReady).toBe(false)
  })

  it('synchronizes ready state and triggers match start when both players are ready', async () => {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()

    let hostMatchStart: MatchStartEvent | null = null
    let guestMatchStart: MatchStartEvent | null = null

    const dummyBoard = Array.from({ length: 25 }, (_, i) => i + 1)

    const hostSession = new LobbySession({
      transport: hostTransport,
      playerName: 'Host',
      validateSetup: (setup: number[]) => setup.length === 25,
      onMatchStart: (event) => {
        hostMatchStart = event
      },
    })

    const guestSession = new LobbySession({
      transport: guestTransport,
      playerName: 'Guest',
      validateSetup: (setup: number[]) => setup.length === 25,
      onMatchStart: (event) => {
        guestMatchStart = event
      },
    })

    await hostSession.start()
    await guestSession.start()

    hostSession.updateBoardSetup(dummyBoard)
    guestSession.updateBoardSetup([...dummyBoard].reverse())

    expect(hostSession.canReady()).toBe(true)
    expect(guestSession.canReady()).toBe(true)

    // Guest readies up first
    guestSession.setReady(true)
    expect(guestSession.state.localPlayer.isReady).toBe(true)
    expect(hostSession.state.remotePlayer?.isReady).toBe(true)
    expect(hostMatchStart).toBeNull()

    // Host readies up -> triggers match start
    hostSession.setReady(true)
    expect(hostSession.state.localPlayer.isReady).toBe(true)

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
})
