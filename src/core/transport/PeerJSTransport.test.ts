import { describe, it, expect, vi, beforeEach } from 'vitest'
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
  public options: any

  constructor(idOrOptions?: string | any, options?: any) {
    super()
    if (typeof idOrOptions === 'string') {
      this.id = idOrOptions
      this.options = options
    } else {
      this.id = `peer-${Math.random().toString(36).substring(2, 7)}`
      this.options = idOrOptions
    }
    setTimeout(() => {
      this.emit('open', this.id)
    }, 5)
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

  reconnect = vi.fn(() => {
    this.disconnected = false
    setTimeout(() => {
      this.emit('open', this.id)
    }, 5)
  })
}

vi.mock('peerjs', () => {
  return {
    Peer: MockPeer,
  }
})

import { PeerJSTransport, configuredSignalingServer } from './PeerJSTransport'

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

describe('PeerJSTransport signaling auto-reconnect & configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('automatically reconnects when signaling disconnects while waiting in lobby', async () => {
    const host = new PeerJSTransport({ role: 'host' })
    const hostId = await host.connect()

    const peer = (host as any).peerInstance as MockPeer
    expect(peer).toBeTruthy()

    // Host is in lobby ('connecting')
    expect(host.status).toBe('connecting')

    // Simulate signaling server dropping the socket
    peer.disconnect()

    // PeerJSTransport should immediately invoke reconnect
    expect(peer.reconnect).toHaveBeenCalled()
    expect(host.localPlayerId).toBe(hostId)

    host.disconnect()
  })

  it('preserves connected match status when signaling drops during active game', async () => {
    const host = new PeerJSTransport({ role: 'host' })
    await host.connect()

    const conn = new MockDataConnection('guest-xyz', true)
    ;(host as any).peerInstance.emit('connection', conn)
    expect(host.status).toBe('connected')

    const peer = (host as any).peerInstance as MockPeer
    // Simulate signaling socket drop
    peer.disconnect()

    // P2P game status remains 'connected' while peer signaling reconnects
    expect(host.status).toBe('connected')
    expect(peer.reconnect).toHaveBeenCalled()

    host.disconnect()
  })

  it('passes custom signalingServer options to Peer constructor', async () => {
    const customConfig = {
      host: 'signaling.mygame.com',
      port: 9000,
      path: '/peerjs',
      secure: true,
      pingInterval: 10000,
    }
    const transport = new PeerJSTransport({
      role: 'host',
      signalingServer: customConfig,
    })

    await transport.connect()
    const peer = (transport as any).peerInstance as MockPeer

    expect(peer.options).toMatchObject({
      host: 'signaling.mygame.com',
      port: 9000,
      path: '/peerjs',
      secure: true,
      pingInterval: 10000,
    })

    transport.disconnect()
  })

  it('reads signaling configuration from NEXT_PUBLIC_PEER_* environment variables', () => {
    const originalEnv = { ...process.env }
    try {
      process.env.NEXT_PUBLIC_PEER_HOST = 'custom-peer.internal'
      process.env.NEXT_PUBLIC_PEER_PORT = '8443'
      process.env.NEXT_PUBLIC_PEER_PATH = '/custom-path'
      process.env.NEXT_PUBLIC_PEER_SECURE = 'false'
      process.env.NEXT_PUBLIC_PEER_PING_INTERVAL_MS = '7000'

      const config = configuredSignalingServer()
      expect(config).toEqual({
        host: 'custom-peer.internal',
        port: 8443,
        path: '/custom-path',
        secure: false,
        pingInterval: 7000,
        key: undefined,
      })
    } finally {
      process.env = originalEnv
    }
  })
})

describe('PeerJSTransport connection ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not register an orphaned peer when disconnected mid-connect', async () => {
    // React StrictMode (and any fast unmount/remount) tears the transport down
    // while connect() is still awaiting the peerjs dynamic import. Previously
    // the Peer was created afterwards and stayed registered on the signaling
    // server, then dialled the host and hijacked the real connection.
    const transport = new PeerJSTransport({ role: 'guest', targetPeerId: 'host-xyz' })

    const connectPromise = transport.connect()
    transport.disconnect()

    await expect(connectPromise).rejects.toThrow(/already been disconnected/)

    // Let any pending peer creation settle, then assert none happened.
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

    // The retired connection closes after the replacement is already live.
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
