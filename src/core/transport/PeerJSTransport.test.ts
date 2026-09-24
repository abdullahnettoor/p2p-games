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

  constructor(idOrOptions?: string | object) {
    super()
    this.id =
      typeof idOrOptions === 'string' && idOrOptions
        ? idOrOptions
        : `peer-${Math.random().toString(36).substring(2, 7)}`

    if (this.id === 'colliding-id' || this.id.startsWith('always-collide')) {
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

  disconnect = vi.fn(() => {
    this.disconnected = true
    this.emit('disconnected', this.id)
  })

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

import { PeerJSTransport, ICE_FAILURE_MESSAGE } from './PeerJSTransport'
import { HostRejectedError } from './types'

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

    const conn1 = new MockDataConnection('guest-xyz', true)
    ;(host as any).peerInstance.emit('connection', conn1)
    expect(host.remotePlayerId).toBe('guest-xyz')

    const conn2 = new MockDataConnection('guest-xyz', true)
    ;(host as any).peerInstance.emit('connection', conn2)

    expect(host.status).toBe('connected')
    expect(host.remotePlayerId).toBe('guest-xyz')
    expect(conn1.close).toHaveBeenCalled()
  })

  it('drops connection after heartbeat timeout with no incoming traffic', async () => {
    const host = new PeerJSTransport({
      role: 'host',
      heartbeatIntervalMs: 50,
      heartbeatTimeoutMs: 150,
    })
    await host.connect()

    const guestConn = new MockDataConnection('guest-xyz', true)
    ;(host as any).peerInstance.emit('connection', guestConn)
    expect(host.status).toBe('connected')

    // Wait past heartbeat timeout
    await new Promise((r) => setTimeout(r, 220))

    expect(host.status).toBe('reconnecting')
    host.disconnect()
  })

  it('emits player leave when remote closes connection', async () => {
    const host = new PeerJSTransport({ role: 'host' })
    await host.connect()

    let leftPlayer: string | null = null
    host.onPlayerLeave((playerId) => {
      leftPlayer = playerId
    })

    const guestConn = new MockDataConnection('guest-xyz', true)
    ;(host as any).peerInstance.emit('connection', guestConn)
    expect(host.remotePlayerId).toBe('guest-xyz')

    guestConn.emit('close')

    expect(host.status).toBe('disconnected')
    expect(host.remotePlayerId).toBeNull()
    expect(leftPlayer).toBe('guest-xyz')
  })

  it('stops connection timeout when connection establishes successfully', async () => {
    const guest = new PeerJSTransport({
      role: 'guest',
      targetPeerId: 'host-xyz',
    })

    await guest.connect()
    await new Promise((r) => setTimeout(r, 30))

    expect((guest as any).connectionTimeoutTimer).toBeNull()
    guest.disconnect()
  })

  it('fails fast on missing targetPeerId for guest', async () => {
    const guest = new PeerJSTransport({
      role: 'guest',
    })

    await expect(guest.connect()).rejects.toThrow('Guest transport requires a targetPeerId')
  })

  it('maps peer-unavailable error to user-friendly message', async () => {
    const guest = new PeerJSTransport({
      role: 'guest',
      targetPeerId: 'host-xyz',
    })

    const errors: Error[] = []
    guest.onError((err) => errors.push(err))

    const connectPromise = guest.connect()

    // Wait until peerInstance is initialized
    await new Promise((r) => setTimeout(r, 1))

    ;(guest as any).peerInstance.emit('error', {
      type: 'peer-unavailable',
      message: 'Could not connect to peer host-xyz',
    })

    await expect(connectPromise).rejects.toThrow(/match invite is no longer available/)
    expect(errors.length).toBe(1)
    expect(errors[0].message).toMatch(/match invite is no longer available/)
  })
})

describe('PeerJSTransport Signaling Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function openHost(): Promise<{
    host: PeerJSTransport
    hostId: string
    peer: MockPeer
    errors: Error[]
  }> {
    const host = new PeerJSTransport({ role: 'host' })
    const errors: Error[] = []
    host.onError((e) => errors.push(e))

    const connectPromise = host.connect()
    await vi.advanceTimersByTimeAsync(10)
    const hostId = await connectPromise
    const peer = (host as any).peerInstance as MockPeer
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
    expect(errors[0].message).toMatch(/Lost connection to the matchmaking server/)

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
  })

  it('stops after 3 collision attempts and rejects', async () => {
    let attempts = 0
    const collisionSpy = vi.fn(() => `always-collide-${++attempts}`)
    const host = new PeerJSTransport({
      role: 'host',
      localPlayerId: 'colliding-id',
      onIdCollision: collisionSpy,
    })

    const connectPromise = host.connect()
    const failureHandler = expect(connectPromise).rejects.toThrow('maximum collision retries exceeded')
    await vi.advanceTimersByTimeAsync(50)

    await failureHandler
    expect(collisionSpy).toHaveBeenCalledTimes(3)

    host.disconnect()
  })

  it('collision after disconnect() creates no new Peer', async () => {
    const collisionSpy = vi.fn(() => 'fresh-id')
    const host = new PeerJSTransport({
      role: 'host',
      localPlayerId: 'colliding-id',
      onIdCollision: collisionSpy,
    })

    const connectPromise = host.connect()
    const failureHandler = expect(connectPromise).rejects.toThrow(/already been disconnected/)
    host.disconnect()
    await vi.advanceTimersByTimeAsync(50)

    await failureHandler
    expect(collisionSpy).not.toHaveBeenCalled()
  })

  it('preserves the same localPlayerId across retryConnect() calls', async () => {
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

  it('preserves status and error handlers across disconnect() and retryConnect()', async () => {
    const host = new PeerJSTransport({ role: 'host' })
    const statuses: string[] = []
    const errors: Error[] = []

    host.onStatusChange((s) => statuses.push(s))
    host.onError((e) => errors.push(e))

    const connectPromise = host.connect()
    await vi.advanceTimersByTimeAsync(10)
    await connectPromise

    host.disconnect()
    expect(statuses).toContain('closed')

    const retryPromise = host.retryConnect()
    await vi.advanceTimersByTimeAsync(10)
    const retriedId = await retryPromise
    expect(retriedId).toBeTruthy()
    expect(statuses).toContain('connecting')

    const testErr = new Error('simulated error')
    ;(host as any).notifyError(testErr)
    expect(errors).toContain(testErr)

    host.disconnect()
  })

  it('reports ICE_FAILURE_MESSAGE when host receives a connection that never opens after 20s', async () => {
    const host = new PeerJSTransport({ role: 'host' })
    const connectPromise = host.connect()
    await vi.advanceTimersByTimeAsync(10)
    await connectPromise

    const errors: Error[] = []
    host.onError((err) => errors.push(err))

    const unopenedConn = new MockDataConnection('guest-stalled', false)
    ;(host as any).peerInstance.emit('connection', unopenedConn)

    expect(host.status).toBe('connecting')
    expect(errors).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(20_000)

    expect(errors).toHaveLength(1)
    expect(errors[0].message).toBe(ICE_FAILURE_MESSAGE)

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
  })

  it('ignores incoming connections arriving on a replaced Peer', async () => {
    const host = new PeerJSTransport({ role: 'host' })
    await host.connect()

    const initialPeer = (host as any).peerInstance
    expect(initialPeer).toBeTruthy()

    await host.retryConnect()

    const newPeer = (host as any).peerInstance
    expect(newPeer).not.toBe(initialPeer)

    const staleConn = new MockDataConnection('stale-guest', true)
    initialPeer.emit('connection', staleConn)

    expect(host.remotePlayerId).toBeNull()
    host.disconnect()
  })

  it("clears pending reject timers when host is disconnected", async () => {
    const host = new PeerJSTransport({
      role: "host",
      rejectExtraConnections: true,
    })
    await host.connect()

    const conn1 = new MockDataConnection("guest-1", true)
    ;(host as any).peerInstance.emit("connection", conn1)

    // Second connection not yet open
    const conn2 = new MockDataConnection("guest-2", false)
    ;(host as any).peerInstance.emit("connection", conn2)

    expect((host as any).pendingRejectTimers.size).toBe(1)

    host.disconnect()

    expect((host as any).pendingRejectTimers.size).toBe(0)
  })

  it("does not emit HostRejectedError when incoming connection closes before opening on host", async () => {
    const host = new PeerJSTransport({
      role: "host",
      rejectExtraConnections: true,
      isStrangerMatch: true,
    })
    const errors: Error[] = []
    host.onError((err) => errors.push(err))

    await host.connect()
    const peer = (host as any).peerInstance

    const uncompletedConn = new MockDataConnection("dropping-joiner", false)
    peer.emit("connection", uncompletedConn)

    uncompletedConn.emit("close")

    expect(errors).toHaveLength(0)
    expect((host as any).connection).toBeNull()

    host.disconnect()
  })

  it("does not emit HostRejectedError on friend guest connection drop before open", async () => {
    const guest = new PeerJSTransport({
      role: "guest",
      targetPeerId: "host-friend-id",
      isStrangerMatch: false,
    })
    const errors: Error[] = []
    guest.onError((err) => errors.push(err))

    await guest.connect()
    const conn = (guest as any).connection
    expect(conn).toBeTruthy()
    conn.emit("close")

    expect(errors.filter((e) => e instanceof HostRejectedError)).toHaveLength(0)
    guest.disconnect()
  })
})


describe("PeerJSTransport stranger matchmaking support", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects extra guest connections when rejectExtraConnections is true", async () => {
    const host = new PeerJSTransport({
      role: "host",
      rejectExtraConnections: true,
    })
    await host.connect()

    const conn1 = new MockDataConnection("guest-first", true)
    ;(host as any).peerInstance.emit("connection", conn1)

    expect(host.status).toBe("connected")
    expect(host.remotePlayerId).toBe("guest-first")

    const conn2 = new MockDataConnection("guest-second", true)
    ;(host as any).peerInstance.emit("connection", conn2)

    expect(conn2.send).toHaveBeenCalledWith({ type: "reject", payload: { reason: "full" } })
    expect(conn2.close).toHaveBeenCalled()

    expect(host.remotePlayerId).toBe("guest-first")
    expect(host.status).toBe("connected")

    host.disconnect()
  })

  it("guest receives host reject signal and notifies HostRejectedError", async () => {
    const guest = new PeerJSTransport({
      role: "guest",
      targetPeerId: "host-slot-0",
    })

    const errors: Error[] = []
    guest.onError((err) => errors.push(err))

    await guest.connect()

    const guestConn = (guest as any).connection
    guestConn.emit("data", { type: "reject", payload: { reason: "full" } })

    expect(errors.length).toBe(1)
    expect(errors[0]).toBeInstanceOf(HostRejectedError)
    expect(errors[0].message).toBe("full")

    guest.disconnect()
  })

  it("releaseSignaling disconnects from server and prevents reconnect attempts", async () => {
    const host = new PeerJSTransport({ role: "host" })
    await host.connect()
    const peer = (host as any).peerInstance

    host.releaseSignaling()

    expect(peer.disconnect).toHaveBeenCalled()

    window.dispatchEvent(new Event("online"))
    expect(peer.reconnect).not.toHaveBeenCalled()

    host.disconnect()
  })
})
