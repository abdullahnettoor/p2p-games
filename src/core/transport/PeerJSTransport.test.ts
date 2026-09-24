import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'

class MockDataConnection extends EventEmitter {
  public peer: string
  public open = false
  constructor(peer: string, open = false) {
    super()
    this.peer = peer
    this.open = open
  }
  send = vi.fn()
  close = vi.fn(() => {
    this.emit('close')
  })
}

class MockPeer extends EventEmitter {
  public id: string
  public disconnected = false
  public destroyed = false

  constructor(id?: string) {
    super()
    this.id = id || `peer-${Math.random().toString(36).substring(2, 7)}`
    if (this.id === 'colliding-id') {
      setTimeout(() => {
        this.emit('error', Object.assign(new Error('ID taken'), { type: 'unavailable-id' }))
      }, 5)
    } else {
      setTimeout(() => {
        this.emit('open', this.id)
      }, 5)
    }
  }

  connect(targetId: string) {
    const conn = new MockDataConnection(targetId)
    // Simulate async WebRTC handshake opening after 20ms unless simulating unreachable
    if (targetId !== 'unreachable-host') {
      setTimeout(() => {
        conn.open = true
        conn.emit('open')
      }, 20)
    }
    return conn
  }

  destroy() {
    this.destroyed = true
    this.emit('close')
  }

  disconnect() {
    this.disconnected = true
    this.emit('disconnected', this.id)
  }

  /** Set before reconnect() to make the server answer with that PeerJS error. */
  public nextReconnectError: string | null = null

  reconnect = vi.fn(() => {
    this.disconnected = false
    const errorType = this.nextReconnectError
    setTimeout(() => {
      if (errorType) {
        // Mirrors PeerJS: emit the error, then drop back to disconnected.
        this.emit('error', Object.assign(new Error(errorType), { type: errorType }))
        this.disconnect()
      } else {
        this.emit('open', this.id)
      }
    }, 5)
  })

  /** Mirrors PeerJS losing its socket: a 'network' error, then 'disconnected'. */
  dropSignaling() {
    this.emit('error', Object.assign(new Error('Lost connection to server.'), { type: 'network' }))
    this.disconnect()
  }
}

vi.mock('peerjs', () => {
  return {
    Peer: MockPeer,
  }
})

import { PeerJSTransport } from './PeerJSTransport'

describe('PeerJSTransport Connection Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows Host to connect and register with signaling', async () => {
    const host = new PeerJSTransport({ role: 'host' })
    const hostId = await host.connect()

    expect(hostId).toBeTruthy()
    expect(host.localPlayerId).toBe(hostId)
    expect(host.status).toBe('connecting')
  })

  it('allows Guest to connect immediately upon signaling registration without hanging', async () => {
    const guest = new PeerJSTransport({
      role: 'guest',
      targetPeerId: 'host-xyz',
    })

    const guestId = await guest.connect()
    expect(guestId).toBeTruthy()
    expect(guest.localPlayerId).toBe(guestId)

    // Initially connecting until DataChannel opens
    expect(guest.status).toBe('connecting')

    // Wait for the simulated async WebRTC open event
    await new Promise((r) => setTimeout(r, 30))

    expect(guest.status).toBe('connected')
    expect(guest.remotePlayerId).toBe('host-xyz')
  })

  it('handles already-open connections without hanging on event listener', async () => {
    const host = new PeerJSTransport({ role: 'host' })
    await host.connect()

    const alreadyOpenConn = new MockDataConnection('guest-abc', true) // open: true
    // Simulate incoming connection event
    ;(host as any).peerInstance.emit('connection', alreadyOpenConn)

    expect(host.status).toBe('connected')
    expect(host.remotePlayerId).toBe('guest-abc')
  })

  it('allows Host to accept replacement connection on page refresh / reconnect', async () => {
    const host = new PeerJSTransport({ role: 'host' })
    await host.connect()

    const conn1 = new MockDataConnection('guest-1', true)
    ;(host as any).peerInstance.emit('connection', conn1)
    expect(host.remotePlayerId).toBe('guest-1')

    // Guest reconnects / refreshes with a new connection
    const conn2 = new MockDataConnection('guest-2', true)
    ;(host as any).peerInstance.emit('connection', conn2)

    expect(conn1.close).toHaveBeenCalled()
    expect(host.remotePlayerId).toBe('guest-2')
  })

  it('notifies error if guest connection to host times out', async () => {
    vi.useFakeTimers()
    const guest = new PeerJSTransport({
      role: 'guest',
      targetPeerId: 'unreachable-host',
    })

    const errorHandler = vi.fn()
    guest.onError(errorHandler)

    const connectPromise = guest.connect()
    await vi.advanceTimersByTimeAsync(10)
    await connectPromise

    expect(guest.status).toBe('connecting')

    // Advance past connection timeout (20s)
    await vi.advanceTimersByTimeAsync(20000)

    expect(errorHandler).toHaveBeenCalled()
    expect(errorHandler.mock.calls[0][0].message).toContain('VPN')
    guest.disconnect()
    vi.useRealTimers()
  })

  it('translates peer-unavailable error to user-friendly message and stops connection timeout', async () => {
    vi.useFakeTimers()
    const guest = new PeerJSTransport({
      role: 'guest',
      targetPeerId: 'missing-host',
    })

    const errorHandler = vi.fn()
    guest.onError(errorHandler)

    const connectPromise = guest.connect()
    await vi.advanceTimersByTimeAsync(10)
    await connectPromise

    // Simulate signaling server peer-unavailable error
    const unavailableErr = new Error('Could not connect to peer missing-host')
    ;(unavailableErr as any).type = 'peer-unavailable'
    ;(guest as any).peerInstance.emit('error', unavailableErr)

    expect(errorHandler).toHaveBeenCalled()
    expect(errorHandler.mock.calls[0][0].message).toContain('Match not found or the host has disconnected')

    // Advance timers past 20s and verify no secondary timeout error fired
    await vi.advanceTimersByTimeAsync(25000)
    expect(errorHandler).toHaveBeenCalledTimes(1)

    guest.disconnect()
    vi.useRealTimers()
  })
})

describe('PeerJSTransport teardown during signaling', () => {
  it('rejects connect() when disconnected before signaling opens', async () => {
    const host = new PeerJSTransport({ role: 'host' })
    const connecting = host.connect()
    await new Promise((r) => setTimeout(r, 1))
    host.disconnect()

    await expect(connecting).rejects.toThrow(/already been disconnected/)
  })
})

describe('PeerJSTransport signaling reconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function openHost() {
    vi.useFakeTimers()
    const host = new PeerJSTransport({ role: 'host' })
    const connecting = host.connect()
    await vi.advanceTimersByTimeAsync(5)
    const hostId = await connecting
    const peer = (host as any).peerInstance as MockPeer
    const errors: Error[] = []
    host.onError((err) => errors.push(err))
    return { host, hostId, peer, errors }
  }

  it('re-registers the same peer ID when signaling drops in the lobby', async () => {
    const { host, hostId, peer, errors } = await openHost()
    expect(host.status).toBe('connecting')

    peer.dropSignaling()
    await vi.advanceTimersByTimeAsync(1000 + 5)

    expect(peer.reconnect).toHaveBeenCalledTimes(1)
    expect(peer.disconnected).toBe(false)
    expect(host.localPlayerId).toBe(hostId)
    expect(host.status).toBe('connecting')
    expect(errors).toEqual([])

    host.disconnect()
  })

  it('keeps a live match connected when signaling drops', async () => {
    const { host, peer, errors } = await openHost()
    peer.emit('connection', new MockDataConnection('guest-xyz', true))
    expect(host.status).toBe('connected')

    const statuses: string[] = []
    host.onStatusChange((s) => statuses.push(s))

    peer.dropSignaling()
    await vi.advanceTimersByTimeAsync(1000 + 5)

    expect(peer.reconnect).toHaveBeenCalledTimes(1)
    expect(host.status).toBe('connected')
    expect(statuses).toEqual([])
    expect(errors).toEqual([])

    host.disconnect()
  })

  it('does not report an error to the lobby when signaling retries exhaust during an active match', async () => {
    const { host, peer, errors } = await openHost()
    peer.emit('connection', new MockDataConnection('guest-xyz', true))
    expect(host.status).toBe('connected')

    peer.nextReconnectError = 'unavailable-id'
    peer.dropSignaling()

    // Run past all retry attempts (1000ms + 3000ms + margin)
    await vi.advanceTimersByTimeAsync(10_000)

    expect(peer.reconnect).toHaveBeenCalledTimes(2)
    // Direct DataChannel connection is still live and connected!
    expect(host.status).toBe('connected')
    // No error was reported to the lobby coordinator!
    expect(errors).toEqual([])

    host.disconnect()
  })

  it('does not report error when signaling drops while tab is hidden, and reconnects on visibilitychange', async () => {
    const { host, peer, errors } = await openHost()
    expect(host.status).toBe('connecting')

    // Simulate tab being hidden (phone locked or backgrounded)
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
      writable: true,
    })

    peer.dropSignaling()

    // Timers advance while tab is hidden
    await vi.advanceTimersByTimeAsync(10_000)

    // Should NOT report invite as dead while hidden
    expect(errors).toEqual([])

    // User returns to tab
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
      writable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))

    // Reconnection triggered immediately upon visibility change
    expect(peer.reconnect).toHaveBeenCalled()

    host.disconnect()
  })

  it('does not reconnect after disconnect()', async () => {
    const { host, peer } = await openHost()

    peer.dropSignaling()
    host.disconnect()
    await vi.advanceTimersByTimeAsync(10_000)

    expect(peer.reconnect).not.toHaveBeenCalled()
  })

  it('retries unavailable-id with backoff, then reports the invite as lost', async () => {
    const { host, peer, errors } = await openHost()
    peer.nextReconnectError = 'unavailable-id'

    peer.dropSignaling()
    await vi.advanceTimersByTimeAsync(1000 + 5)
    expect(peer.reconnect).toHaveBeenCalledTimes(1)
    expect(errors).toEqual([])

    await vi.advanceTimersByTimeAsync(3000 + 5)
    expect(peer.reconnect).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(10_000)
    expect(peer.reconnect).toHaveBeenCalledTimes(2)
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatch(/invite link no longer works/)

    host.disconnect()
  })

  it('recovers when a later retry succeeds after unavailable-id', async () => {
    const { host, hostId, peer, errors } = await openHost()
    peer.nextReconnectError = 'unavailable-id'

    peer.dropSignaling()
    await vi.advanceTimersByTimeAsync(1000 + 5)
    peer.nextReconnectError = null
    await vi.advanceTimersByTimeAsync(3000 + 5)

    expect(peer.reconnect).toHaveBeenCalledTimes(2)
    expect(peer.disconnected).toBe(false)
    expect(host.localPlayerId).toBe(hostId)
    expect(errors).toEqual([])

    host.disconnect()
  })

  it('regenerates host peer ID on initial collision when onIdCollision is provided', async () => {
    vi.useFakeTimers()
    const collisionSpy = vi.fn(() => 'fresh-id')
    const host = new PeerJSTransport({
      role: 'host',
      localPlayerId: 'colliding-id',
      onIdCollision: collisionSpy,
    })

    const connectPromise = host.connect()
    await vi.advanceTimersByTimeAsync(20)
    const assignedId = await connectPromise

    expect(collisionSpy).toHaveBeenCalledTimes(1)
    expect(assignedId).toBe('fresh-id')
    expect(host.localPlayerId).toBe('fresh-id')

    host.disconnect()
    vi.useRealTimers()
  })

  it('preserves the same localPlayerId across retryConnect() calls', async () => {
    vi.useFakeTimers()
    const host = new PeerJSTransport({
      role: 'host',
      localPlayerId: 'p2pgames-bingo-K7M4QX',
    })

    const connectPromise = host.connect()
    await vi.advanceTimersByTimeAsync(10)
    const initialId = await connectPromise
    expect(initialId).toBe('p2pgames-bingo-K7M4QX')

    const retryPromise = host.retryConnect()
    await vi.advanceTimersByTimeAsync(10)
    const retriedId = await retryPromise

    expect(retriedId).toBe('p2pgames-bingo-K7M4QX')
    expect(host.localPlayerId).toBe('p2pgames-bingo-K7M4QX')

    host.disconnect()
    vi.useRealTimers()
  })

  it('emits onSignalingChange when signaling drops and reconnects', async () => {
    const { host, peer } = await openHost()
    const signalingStates: boolean[] = []
    host.onSignalingChange((isReconnecting) => signalingStates.push(isReconnecting))

    peer.dropSignaling()
    expect(signalingStates).toEqual([true])

    await vi.advanceTimersByTimeAsync(1000 + 5)
    expect(signalingStates).toEqual([true, false])

    host.disconnect()
  })

  it('reconnects when window online event fires', async () => {
    const { host, peer } = await openHost()
    peer.dropSignaling()
    expect(peer.disconnected).toBe(true)

    window.dispatchEvent(new Event('online'))
    expect(peer.reconnect).toHaveBeenCalled()

    host.disconnect()
  })
})

describe('PeerJSTransport connection ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not register an orphaned peer when disconnected mid-connect', async () => {
    const transport = new PeerJSTransport({ role: 'guest', targetPeerId: 'host-xyz' })

    const connectPromise = transport.connect()
    transport.disconnect()

    await expect(connectPromise).rejects.toThrow(/already been disconnected/)

    await new Promise((r) => setTimeout(r, 30))
    expect((transport as any).peerInstance).toBeNull()
    expect(transport.status).toBe('closed')
  })

  it('ignores a late close event from a superseded connection', async () => {
    const host = new PeerJSTransport({ role: 'host' })
    await host.connect()

    const conn1 = new MockDataConnection('guest-1', true)
    ;(host as any).peerInstance.emit('connection', conn1)

    const conn2 = new MockDataConnection('guest-2', true)
    ;(host as any).peerInstance.emit('connection', conn2)

    expect(host.remotePlayerId).toBe('guest-2')

    conn1.emit('close')

    expect(host.status).toBe('connected')
    expect(host.remotePlayerId).toBe('guest-2')
    expect((host as any).connection).toBe(conn2)

    host.disconnect()
  })

  it('does not report a player leave when swapping in a replacement connection', async () => {
    const host = new PeerJSTransport({ role: 'host' })
    await host.connect()

    const leaveHandler = vi.fn()
    host.onPlayerLeave(leaveHandler)

    const conn1 = new MockDataConnection('guest-1', true)
    ;(host as any).peerInstance.emit('connection', conn1)

    const conn2 = new MockDataConnection('guest-2', true)
    ;(host as any).peerInstance.emit('connection', conn2)

    expect(conn1.close).toHaveBeenCalled()
    expect(leaveHandler).not.toHaveBeenCalled()
    expect(host.status).toBe('connected')

    host.disconnect()
  })

  it('ignores data arriving on a superseded connection', async () => {
    const host = new PeerJSTransport({ role: 'host' })
    await host.connect()

    const messageHandler = vi.fn()
    host.onMessage(messageHandler)

    const conn1 = new MockDataConnection('guest-1', true)
    ;(host as any).peerInstance.emit('connection', conn1)
    const conn2 = new MockDataConnection('guest-2', true)
    ;(host as any).peerInstance.emit('connection', conn2)

    conn1.emit('data', { type: 'profile', payload: { playerName: 'Ghost' } })
    expect(messageHandler).not.toHaveBeenCalled()

    conn2.emit('data', { type: 'profile', payload: { playerName: 'Real' } })
    expect(messageHandler).toHaveBeenCalledTimes(1)

    host.disconnect()
  })
})
