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

  constructor(id?: string) {
    super()
    this.id = id || `peer-${Math.random().toString(36).substring(2, 7)}`
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
