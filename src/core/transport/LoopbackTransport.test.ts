import { describe, it, expect, vi } from 'vitest'
import { LoopbackTransport, createLoopbackTransportPair } from './LoopbackTransport'
import { TransportMessage } from './types'

describe('LoopbackTransport', () => {
  it('connects a host and guest pair and updates statuses', async () => {
    const [host, guest] = createLoopbackTransportPair()

    expect(host.status).toBe('disconnected')
    expect(guest.status).toBe('disconnected')

    const hostStatusChanges: string[] = []
    const guestStatusChanges: string[] = []

    host.onStatusChange((s) => hostStatusChanges.push(s))
    guest.onStatusChange((s) => guestStatusChanges.push(s))

    const hostPlayerJoined = vi.fn()
    const guestPlayerJoined = vi.fn()

    host.onPlayerJoin(hostPlayerJoined)
    guest.onPlayerJoin(guestPlayerJoined)

    const hostId = await host.connect()
    expect(hostId).toBeTruthy()
    expect(host.status).toBe('connecting') // Host is waiting for guest to connect

    const guestId = await guest.connect()
    expect(guestId).toBeTruthy()

    expect(host.status).toBe('connected')
    expect(guest.status).toBe('connected')
    expect(host.remotePlayerId).toBe(guest.localPlayerId)
    expect(guest.remotePlayerId).toBe(host.localPlayerId)

    expect(hostPlayerJoined).toHaveBeenCalledWith(guest.localPlayerId)
    expect(guestPlayerJoined).toHaveBeenCalledWith(host.localPlayerId)
  })

  it('delivers messages between host and guest bidirectionally', async () => {
    const [host, guest] = createLoopbackTransportPair()
    await host.connect()
    await guest.connect()

    const hostReceived: TransportMessage[] = []
    const guestReceived: TransportMessage[] = []

    host.onMessage((msg) => hostReceived.push(msg))
    guest.onMessage((msg) => guestReceived.push(msg))

    const readyMsg: TransportMessage = {
      type: 'ready',
      payload: { isReady: true, playerName: 'Player 2' },
    }
    guest.send(readyMsg)

    expect(hostReceived).toEqual([readyMsg])
    expect(guestReceived).toHaveLength(0)

    const moveMsg: TransportMessage = {
      type: 'move',
      payload: { move: { number: 7 }, playerId: host.localPlayerId },
    }
    host.send(moveMsg)

    expect(guestReceived).toEqual([moveMsg])
  })

  it('handles peer disconnection cleanly', async () => {
    const [host, guest] = createLoopbackTransportPair()
    await host.connect()
    await guest.connect()

    const hostPlayerLeave = vi.fn()
    const guestStatusChanges: string[] = []

    host.onPlayerLeave(hostPlayerLeave)
    guest.onStatusChange((s) => guestStatusChanges.push(s))

    guest.disconnect()

    expect(guest.status).toBe('closed')
    expect(host.remotePlayerId).toBeNull()
    expect(hostPlayerLeave).toHaveBeenCalledWith(guest.localPlayerId)
  })

  it('throws or fails gracefully when sending without connection', () => {
    const transport = new LoopbackTransport({
      role: 'host',
      localPlayerId: 'host-1',
    })

    expect(() => {
      transport.send({
        type: 'heartbeat',
        payload: { timestamp: Date.now() },
      })
    }).toThrow('Cannot send message: transport is disconnected')
  })
})
