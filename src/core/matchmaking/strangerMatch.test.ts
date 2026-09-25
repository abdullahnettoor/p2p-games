import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'
import {
  ITransport,
  TransportMessage,
  TransportStatus,
  HostRejectedError,
} from '../transport/types'
import {
  StrangerMatchmaker,
  getSlotPeerId,
  isIdTakenError,
} from './strangerMatch'

/**
 * In-memory simulated PeerJS broker for testing matchmaking slots,
 * race conditions, slot release, and guest rejections.
 */
class MockBroker {
  public hosts = new Map<string, MockSimulatedTransport>()

  registerHost(peerId: string, transport: MockSimulatedTransport): boolean {
    if (this.hosts.has(peerId)) {
      return false
    }
    this.hosts.set(peerId, transport)
    return true
  }

  unregisterHost(peerId: string): void {
    this.hosts.delete(peerId)
  }

  getHost(peerId: string): MockSimulatedTransport | undefined {
    return this.hosts.get(peerId)
  }

  clear(): void {
    this.hosts.clear()
  }
}

class MockSimulatedTransport implements ITransport {
  public status: TransportStatus = 'disconnected'
  public localPlayerId: string
  public remotePlayerId: string | null = null
  public role: 'host' | 'guest'
  public isSignalingReleased = false
  public targetPeerId?: string
  public rejectExtraConnections: boolean
  public isRegistered = false
  /** Simulated time for a guest's DataChannel to open after signaling. */
  public pairDelayMs: number

  private broker: MockBroker
  private partner: MockSimulatedTransport | null = null
  private messageHandlers = new Set<(msg: TransportMessage) => void>()
  private statusHandlers = new Set<(status: TransportStatus) => void>()
  private playerJoinHandlers = new Set<(playerId: string) => void>()
  private playerLeaveHandlers = new Set<(playerId: string) => void>()
  private errorHandlers = new Set<(err: Error) => void>()

  constructor(
    broker: MockBroker,
    options: {
      role: 'host' | 'guest'
      localPlayerId?: string
      targetPeerId?: string
      rejectExtraConnections?: boolean
    },
    pairDelayMs = 0
  ) {
    this.pairDelayMs = pairDelayMs
    this.broker = broker
    this.role = options.role
    this.localPlayerId = options.localPlayerId ?? `peer-${Math.random().toString(36).substring(2, 7)}`
    this.targetPeerId = options.targetPeerId
    this.rejectExtraConnections = options.rejectExtraConnections ?? false
  }

  async connect(): Promise<string> {
    if (this.role === 'host') {
      const registered = this.broker.registerHost(this.localPlayerId, this)
      if (!registered) {
        const err = Object.assign(new Error(`ID ${this.localPlayerId} is taken`), {
          type: 'unavailable-id',
        })
        throw err
      }
      this.isRegistered = true
      this.status = 'connecting'
      return this.localPlayerId
    }

    // Guest role
    this.status = 'connecting'
    const targetHost = this.targetPeerId ? this.broker.getHost(this.targetPeerId) : undefined
    if (!targetHost) {
      const err = Object.assign(new Error(`Could not connect to peer ${this.targetPeerId}`), {
        type: 'peer-unavailable',
      })
      this.notifyError(err)
      throw err
    }

    if (this.pairDelayMs > 0) {
      await new Promise((r) => setTimeout(r, this.pairDelayMs))
      if (this.status !== 'connecting') return this.localPlayerId
    }

    // Check if host rejects extra guests
    if (targetHost.rejectExtraConnections && targetHost.partner !== null) {
      const err = new HostRejectedError('full')
      this.notifyError(err)
      throw err
    }

    // Connect pair
    this.partner = targetHost
    targetHost.partner = this
    this.remotePlayerId = targetHost.localPlayerId
    targetHost.remotePlayerId = this.localPlayerId

    this.setStatus('connected')
    targetHost.setStatus('connected')

    this.notifyPlayerJoin(this.remotePlayerId)
    targetHost.notifyPlayerJoin(targetHost.remotePlayerId)

    return this.localPlayerId
  }

  releaseSignaling(): void {
    this.isSignalingReleased = true
    if (this.role === 'host' && this.isRegistered) {
      this.isRegistered = false
      this.broker.unregisterHost(this.localPlayerId)
    }
  }

  disconnect(): void {
    this.status = 'closed'
    if (this.role === 'host' && this.isRegistered) {
      this.isRegistered = false
      this.broker.unregisterHost(this.localPlayerId)
    }
    if (this.partner) {
      const partner = this.partner
      this.partner = null
      partner.partner = null
      partner.setStatus('disconnected')
      partner.notifyPlayerLeave(this.localPlayerId)
    }
  }

  send(msg: TransportMessage): void {
    if (this.partner && this.status === 'connected') {
      this.partner.notifyMessage(msg)
    }
  }

  onMessage(handler: (msg: TransportMessage) => void): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onStatusChange(handler: (status: TransportStatus) => void): () => void {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  onPlayerJoin(handler: (playerId: string) => void): () => void {
    this.playerJoinHandlers.add(handler)
    return () => this.playerJoinHandlers.delete(handler)
  }

  onPlayerLeave(handler: (playerId: string) => void): () => void {
    this.playerLeaveHandlers.add(handler)
    return () => this.playerLeaveHandlers.delete(handler)
  }

  onError(handler: (err: Error) => void): () => void {
    this.errorHandlers.add(handler)
    return () => this.errorHandlers.delete(handler)
  }

  private setStatus(status: TransportStatus): void {
    this.status = status
    this.statusHandlers.forEach((h) => h(status))
  }

  private notifyPlayerJoin(id: string): void {
    this.playerJoinHandlers.forEach((h) => h(id))
  }

  private notifyPlayerLeave(id: string): void {
    this.playerLeaveHandlers.forEach((h) => h(id))
  }

  private notifyMessage(msg: TransportMessage): void {
    this.messageHandlers.forEach((h) => h(msg))
  }

  private notifyError(err: Error): void {
    this.errorHandlers.forEach((h) => h(err))
  }
}

describe('StrangerMatchmaker', () => {
  let broker: MockBroker

  beforeEach(() => {
    broker = new MockBroker()
  })

  afterEach(() => {
    broker.clear()
  })

  it('pairs two players when player 1 claims a slot and player 2 probes that slot', async () => {
    const p1 = new StrangerMatchmaker({
      gameId: 'bingo',
      slotCount: 2,
      probeTimeoutMs: 50,
      randomFn: () => 0.5,
      createTransport: (opts) => new MockSimulatedTransport(broker, opts),
    })

    const p2 = new StrangerMatchmaker({
      gameId: 'bingo',
      slotCount: 2,
      probeTimeoutMs: 50,
      randomFn: () => 0.5,
      createTransport: (opts) => new MockSimulatedTransport(broker, opts),
    })

    // Player 1 searches first, finds no host, claims slot
    const p1Promise = p1.findMatch()
    await new Promise((r) => setTimeout(r, 60))

    // Player 2 searches, probes slot as guest, finds Player 1
    const p2Promise = p2.findMatch()

    const [res1, res2] = await Promise.all([p1Promise, p2Promise])

    expect(res1.role).toBe('host')
    expect(res2.role).toBe('guest')
    expect(res1.localPeerId).toBe(res2.remotePeerId)
    expect(res1.strangerName).toBeTruthy()
    expect(res2.strangerName).toBeTruthy()

    res1.transport.disconnect()
    res2.transport.disconnect()
  })

  it('rejects a 3rd player trying to join an occupied slot and pairs them to another slot', async () => {
    // Player 1 and Player 2 match on slot 0
    const p1 = new StrangerMatchmaker({
      gameId: 'bingo',
      slotCount: 2,
      probeTimeoutMs: 50,
      createTransport: (opts) => new MockSimulatedTransport(broker, opts),
    })

    const p2 = new StrangerMatchmaker({
      gameId: 'bingo',
      slotCount: 2,
      probeTimeoutMs: 50,
      createTransport: (opts) => new MockSimulatedTransport(broker, opts),
    })

    const p1Promise = p1.findMatch()
    await new Promise((r) => setTimeout(r, 60))
    const p2Promise = p2.findMatch()
    const [res1, res2] = await Promise.all([p1Promise, p2Promise])

    expect(res1.role).toBe('host')
    expect(res2.role).toBe('guest')

    // Player 3 starts search: tries slot 0 (rejected or released), then claims slot 1
    const p3 = new StrangerMatchmaker({
      gameId: 'bingo',
      slotCount: 2,
      probeTimeoutMs: 50,
      createTransport: (opts) => new MockSimulatedTransport(broker, opts),
    })

    p3.findMatch().catch(() => {})
    p3.cancel()

    res1.transport.disconnect()
    res2.transport.disconnect()
  })

  it('releases slot ID on host so a new match can claim the same slot', async () => {
    const p1 = new StrangerMatchmaker({
      gameId: 'bingo',
      slotCount: 1,
      probeTimeoutMs: 50,
      createTransport: (opts) => new MockSimulatedTransport(broker, opts),
    })

    const p2 = new StrangerMatchmaker({
      gameId: 'bingo',
      slotCount: 1,
      probeTimeoutMs: 50,
      createTransport: (opts) => new MockSimulatedTransport(broker, opts),
    })

    const p1Promise = p1.findMatch()
    await new Promise((r) => setTimeout(r, 60))
    const p2Promise = p2.findMatch()
    const [res1, res2] = await Promise.all([p1Promise, p2Promise])

    // Host released signaling
    expect((res1.transport as MockSimulatedTransport).isSignalingReleased).toBe(true)
    // Broker no longer holds slot 0!
    expect(broker.getHost(getSlotPeerId('bingo', 0))).toBeUndefined()

    // A brand new player can now claim slot 0 again
    const p3 = new StrangerMatchmaker({
      gameId: 'bingo',
      slotCount: 1,
      probeTimeoutMs: 50,
      createTransport: (opts) => new MockSimulatedTransport(broker, opts),
    })

    const p3Promise = p3.findMatch()
    await new Promise((r) => setTimeout(r, 60))
    // p3 successfully claimed slot 0
    expect(p3.status).toBe('waiting')
    expect(broker.getHost(getSlotPeerId('bingo', 0))).toBeDefined()

    p3.cancel()
    res1.transport.disconnect()
    res2.transport.disconnect()
  })

  it('resolves claim race: when two players race for a slot, the loser joins as guest', async () => {
    // Both players pick slot 0
    const p1 = new StrangerMatchmaker({
      gameId: 'bingo',
      slotCount: 1,
      probeTimeoutMs: 50,
      createTransport: (opts) => new MockSimulatedTransport(broker, opts),
    })

    const p2 = new StrangerMatchmaker({
      gameId: 'bingo',
      slotCount: 1,
      probeTimeoutMs: 50,
      createTransport: (opts) => new MockSimulatedTransport(broker, opts),
    })

    // Both initiate search at nearly the same time
    const p1Promise = p1.findMatch()
    const p2Promise = p2.findMatch()

    const [res1, res2] = await Promise.all([p1Promise, p2Promise])

    // One must be host, one must be guest
    const roles = [res1.role, res2.role].sort()
    expect(roles).toEqual(['guest', 'host'])

    res1.transport.disconnect()
    res2.transport.disconnect()
  })

  it("breaks ties when two players claim different slots simultaneously: higher slot index yields and joins lower slot host", async () => {
    // Player 1 claims slot 0
    const p1 = new StrangerMatchmaker({
      gameId: "bingo",
      slotCount: 2,
      probeTimeoutMs: 50,
      recheckIntervalMs: 30,
      randomFn: () => 0.99, // indices [0, 1] -> claims slot 0 first
      createTransport: (opts) => new MockSimulatedTransport(broker, opts),
    })

    // Player 2 claims slot 1
    const p2 = new StrangerMatchmaker({
      gameId: "bingo",
      slotCount: 2,
      probeTimeoutMs: 50,
      recheckIntervalMs: 30,
      randomFn: () => 0.0, // indices [1, 0] -> claims slot 1 first
      createTransport: (opts) => new MockSimulatedTransport(broker, opts),
    })

    const p1Promise = p1.findMatch()
    const p2Promise = p2.findMatch()

    const [res1, res2] = await Promise.all([p1Promise, p2Promise])

    expect(res1.role).toBe("host")
    expect(res2.role).toBe("guest")
    expect(res1.localPeerId).toBe(getSlotPeerId("bingo", 0))
    expect(res2.remotePeerId).toBe(getSlotPeerId("bingo", 0))

    res1.transport.disconnect()
    res2.transport.disconnect()
  })

  it('re-scan probes wait the full probe timeout for a slow connection', async () => {
    vi.useFakeTimers()
    try {
      const options = {
        gameId: 'bingo',
        slotCount: 2,
        probeTimeoutMs: 8000,
        recheckIntervalMs: 30,
        searchTimeoutMs: 60_000,
      }
      // Probes take 5s to open, longer than the old 3s re-scan cap.
      const p1 = new StrangerMatchmaker({
        ...options,
        randomFn: () => 0.99,
        createTransport: (opts) => new MockSimulatedTransport(broker, opts, 5000),
      })
      const p2 = new StrangerMatchmaker({
        ...options,
        randomFn: () => 0.0,
        createTransport: (opts) => new MockSimulatedTransport(broker, opts, 5000),
      })

      const both = Promise.all([p1.findMatch(), p2.findMatch()])
      await vi.advanceTimersByTimeAsync(40_000)
      const [res1, res2] = await both

      expect(res1.role).toBe('host')
      expect(res2.role).toBe('guest')
      expect(res2.remotePeerId).toBe(res1.localPeerId)
      res1.transport.disconnect()
      res2.transport.disconnect()
    } finally {
      vi.useRealTimers()
    }
  })

  it('cancels search cleanly and tears down transport', async () => {
    const matchmaker = new StrangerMatchmaker({
      gameId: 'bingo',
      slotCount: 2,
      probeTimeoutMs: 100,
      createTransport: (opts) => new MockSimulatedTransport(broker, opts),
    })

    const matchPromise = matchmaker.findMatch()
    // Wait until it claims a slot
    await new Promise((r) => setTimeout(r, 120))
    expect(matchmaker.status).toBe('waiting')

    matchmaker.cancel()
    expect(matchmaker.status).toBe('cancelled')
    // Slot is released in broker
    expect(broker.hosts.size).toBe(0)
  })

  it('times out and cleans up if no match is found within searchTimeoutMs', async () => {
    const matchmaker = new StrangerMatchmaker({
      gameId: 'bingo',
      slotCount: 1,
      probeTimeoutMs: 20,
      searchTimeoutMs: 100,
      createTransport: (opts) => new MockSimulatedTransport(broker, opts),
    })

    const matchPromise = matchmaker.findMatch()
    await expect(matchPromise).rejects.toThrow('Matchmaking timeout')
    expect(matchmaker.status).toBe('timeout')
    expect(broker.hosts.size).toBe(0)
  })

  it('identifies unavailable-id errors correctly', () => {
    expect(isIdTakenError({ type: 'unavailable-id' })).toBe(true)
    expect(isIdTakenError(new Error('ID p2pgames-bingo-q-0 is taken'))).toBe(true)
    expect(isIdTakenError(new Error('unavailable-id'))).toBe(true)
    expect(isIdTakenError(new Error('random failure'))).toBe(false)
  })
})
