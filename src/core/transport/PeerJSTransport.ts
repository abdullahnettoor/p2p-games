import { PlayerRole } from '@/core/games/types'
import {
  ITransport,
  TransportMessage,
  TransportStatus,
  TransportEventHandler,
  StatusChangeHandler,
  PlayerEventHandler,
  ErrorEventHandler,
} from './types'

export interface PeerJSTransportOptions {
  role: PlayerRole
  localPlayerId?: string
  targetPeerId?: string
  iceServers?: RTCIceServer[]
  heartbeatIntervalMs?: number
  heartbeatTimeoutMs?: number
}

const DEFAULT_STUN_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: 'stun:global.stun.twilio.com:3478' },
]

/**
 * TURN relays are opt-in via env because there is no free public relay we can
 * rely on. Without one, players behind symmetric NAT or a VPN cannot connect at
 * all. Set NEXT_PUBLIC_TURN_URLS (comma separated) plus credentials to enable.
 */
function configuredTurnServers(): RTCIceServer[] {
  const urls = process.env.NEXT_PUBLIC_TURN_URLS
  if (!urls) return []

  const parsed = urls
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
  if (parsed.length === 0) return []

  return [
    {
      urls: parsed,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    },
  ]
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [...DEFAULT_STUN_SERVERS, ...configuredTurnServers()]

/**
 * Reached when signaling succeeded (both peers found each other) but the ICE
 * connectivity checks never completed. Naming the usual culprit saves players
 * from chasing a bad invite link that is in fact perfectly valid.
 */
const ICE_FAILURE_MESSAGE =
  'Could not open a direct peer-to-peer connection. The invite link is valid and both players ' +
  'were found, but the direct connection was blocked \u2014 usually by a VPN (e.g. Cloudflare WARP), ' +
  'a corporate firewall, or a restrictive network. Try disabling your VPN, then reconnect.'

const PEER_UNAVAILABLE_MESSAGE =
  'Match not found or the host has disconnected. Please verify you have the latest invite link from the host.'

function isPeerUnavailable(err: unknown, message: string): boolean {
  return (
    (err as { type?: string } | null)?.type === 'peer-unavailable' ||
    message.includes('Could not connect to peer')
  )
}

export class PeerJSTransport implements ITransport {
  public status: TransportStatus = 'disconnected'
  public localPlayerId: string
  public remotePlayerId: string | null = null
  public readonly role: PlayerRole

  private targetPeerId?: string
  private iceServers: RTCIceServer[]
  private heartbeatIntervalMs: number
  private heartbeatTimeoutMs: number

  private peerInstance: any = null
  private connection: any = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private connectionTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private lastMessageTimestamp = 0
  /**
   * Set by disconnect(). connect() awaits a dynamic import before the Peer
   * exists, so without this flag a disconnect during that window leaves an
   * orphaned Peer registered on the signaling server.
   */
  private isDestroyed = false

  private messageHandlers = new Set<TransportEventHandler>()
  private statusHandlers = new Set<StatusChangeHandler>()
  private playerJoinHandlers = new Set<PlayerEventHandler>()
  private playerLeaveHandlers = new Set<PlayerEventHandler>()
  private errorHandlers = new Set<ErrorEventHandler>()

  constructor(options: PeerJSTransportOptions) {
    this.role = options.role
    this.localPlayerId = options.localPlayerId ?? ''
    this.targetPeerId = options.targetPeerId
    this.iceServers = options.iceServers ?? DEFAULT_ICE_SERVERS
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 5000
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 15000
  }

  public async connect(): Promise<string> {
    if (typeof window === 'undefined') {
      throw new Error('PeerJSTransport can only be initialized in browser environments')
    }

    if (this.isDestroyed) {
      throw new Error('Cannot connect: transport has already been disconnected')
    }

    if (this.status === 'connected') return this.localPlayerId

    this.setStatus('connecting')

    const { Peer } = await import('peerjs')

    // disconnect() may have been called while the import was in flight.
    if (this.isDestroyed) {
      throw new Error('Cannot connect: transport has already been disconnected')
    }

    return new Promise<string>((resolve, reject) => {
      let isResolved = false

      const signalingTimeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true
          const err = new Error('Signaling connection timed out. Please check your network connection.')
          this.notifyError(err)
          reject(err)
        }
      }, 15000)

      const cleanupSignalingTimeout = () => {
        clearTimeout(signalingTimeout)
      }

      try {
        const peer = this.localPlayerId
          ? new Peer(this.localPlayerId, {
              config: { iceServers: this.iceServers },
            })
          : new Peer({
              config: { iceServers: this.iceServers },
            })

        this.peerInstance = peer

        peer.on('open', (assignedId: string) => {
          cleanupSignalingTimeout()

          // Torn down while the signaling handshake was in flight.
          if (this.isDestroyed) {
            try {
              peer.destroy()
            } catch {
              // safe ignore
            }
            if (!isResolved) {
              isResolved = true
              reject(new Error('Cannot connect: transport has already been disconnected'))
            }
            return
          }

          this.localPlayerId = assignedId

          if (this.role === 'guest') {
            if (!this.targetPeerId) {
              const err = new Error('Guest transport requires a targetPeerId')
              this.notifyError(err)
              if (!isResolved) {
                isResolved = true
                reject(err)
              }
              return
            }
            this.startConnectionTimeout()
            const conn = peer.connect(this.targetPeerId)
            this.setupConnection(conn)
          }

          if (!isResolved) {
            isResolved = true
            resolve(assignedId)
          }
        })

        peer.on('connection', (conn: any) => {
          if (this.role !== 'host' || this.isDestroyed) return

          // Adopt the newcomer first, then retire the old connection. Closing
          // first would fire the old connection's `close` handler while it is
          // still the current one, tearing down state we are about to reuse.
          const previous = this.connection
          this.setupConnection(conn)

          if (previous && previous !== conn) {
            try {
              previous.close()
            } catch {
              // ignore
            }
          }
        })

        peer.on('error', (err: any) => {
          if (this.peerInstance !== peer) return
          cleanupSignalingTimeout()
          this.stopConnectionTimeout()

          const rawMessage = err instanceof Error ? err.message : String(err)
          const error = new Error(
            isPeerUnavailable(err, rawMessage) ? PEER_UNAVAILABLE_MESSAGE : rawMessage
          )

          this.notifyError(error)
          if (!isResolved && this.status === 'connecting') {
            isResolved = true
            reject(error)
          }
        })

        peer.on('disconnected', () => {
          if (this.status === 'connected') {
            this.setStatus('reconnecting')
            try {
              peer.reconnect()
            } catch {
              // reconnect attempt
            }
          }
        })

        peer.on('close', () => {
          if (this.peerInstance !== peer) return
          cleanupSignalingTimeout()
          this.disconnect()
        })
      } catch (err) {
        cleanupSignalingTimeout()
        const error = err instanceof Error ? err : new Error(String(err))
        this.notifyError(error)
        reject(error)
      }
    })
  }

  private setupConnection(
    conn: any,
    onOpenCallback?: () => void,
    onErrorCallback?: (err: Error) => void
  ): void {
    this.connection = conn

    const handleOpen = () => {
      if (this.connection !== conn) return
      this.stopConnectionTimeout()
      this.remotePlayerId = conn.peer
      this.setStatus('connected')
      this.notifyPlayerJoin(conn.peer)
      this.startHeartbeat()
      onOpenCallback?.()
    }

    if (conn.open) {
      handleOpen()
    } else {
      // Covers the host too: an incoming connection whose ICE never completes
      // would otherwise leave the lobby waiting forever with no explanation.
      this.startConnectionTimeout()
      conn.on('open', handleOpen)
    }

    conn.on('data', (data: any) => {
      if (this.connection !== conn) return
      this.lastMessageTimestamp = Date.now()
      try {
        const message: TransportMessage = typeof data === 'string' ? JSON.parse(data) : data
        if (message.type === 'heartbeat') {
          return
        }
        this.notifyMessage(message)
      } catch (err) {
        this.notifyError(err instanceof Error ? err : new Error(String(err)))
      }
    })

    conn.on('close', () => {
      // A superseded connection closing must not clear the live one.
      if (this.connection !== conn) return

      this.stopConnectionTimeout()
      const prevRemote = this.remotePlayerId
      this.remotePlayerId = null
      this.connection = null
      this.stopHeartbeat()
      if (this.status !== 'closed') {
        this.setStatus('disconnected')
        if (prevRemote) {
          this.notifyPlayerLeave(prevRemote)
        }
      }
    })

    conn.on('error', (err: any) => {
      if (this.connection !== conn) return

      this.stopConnectionTimeout()
      const rawMessage = err instanceof Error ? err.message : String(err)
      const error = new Error(
        isPeerUnavailable(err, rawMessage) ? PEER_UNAVAILABLE_MESSAGE : rawMessage
      )
      this.notifyError(error)
      onErrorCallback?.(error)
    })
  }

  public send(message: TransportMessage): void {
    if (this.status !== 'connected' || !this.connection) {
      throw new Error(`Cannot send message: transport is ${this.status}`)
    }

    try {
      this.connection.send(message)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.notifyError(error)
      throw error
    }
  }

  public onMessage(handler: TransportEventHandler): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  public onStatusChange(handler: StatusChangeHandler): () => void {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  public onPlayerJoin(handler: PlayerEventHandler): () => void {
    this.playerJoinHandlers.add(handler)
    return () => this.playerJoinHandlers.delete(handler)
  }

  public onPlayerLeave(handler: PlayerEventHandler): () => void {
    this.playerLeaveHandlers.add(handler)
    return () => this.playerLeaveHandlers.delete(handler)
  }

  public onError(handler: ErrorEventHandler): () => void {
    this.errorHandlers.add(handler)
    return () => this.errorHandlers.delete(handler)
  }

  public async retryConnect(): Promise<string> {
    this.stopHeartbeat()
    this.stopConnectionTimeout()
    const previousPeer = this.peerInstance
    const previousConnection = this.connection
    this.peerInstance = null
    this.connection = null
    this.remotePlayerId = null
    this.status = 'disconnected'
    this.isDestroyed = false

    try {
      previousConnection?.close()
    } catch {
      // Ignore the old connection while replacing it.
    }
    try {
      previousPeer?.destroy()
    } catch {
      // Ignore the old Peer while replacing it.
    }

    return this.connect()
  }

  public disconnect(): void {
    this.isDestroyed = true
    this.stopHeartbeat()
    this.stopConnectionTimeout()

    const prevRemote = this.remotePlayerId
    this.setStatus('closed')
    this.remotePlayerId = null

    if (this.connection) {
      try {
        this.connection.close()
      } catch {
        // safe ignore
      }
      this.connection = null
    }

    if (this.peerInstance) {
      try {
        this.peerInstance.destroy()
      } catch {
        // safe ignore
      }
      this.peerInstance = null
    }

    if (prevRemote) {
      this.notifyPlayerLeave(prevRemote)
    }
  }

  private startConnectionTimeout(): void {
    this.stopConnectionTimeout()
    this.connectionTimeoutTimer = setTimeout(() => {
      if (this.status !== 'connected') {
        this.notifyError(new Error(ICE_FAILURE_MESSAGE))
      }
    }, 20000)
  }

  private stopConnectionTimeout(): void {
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer)
      this.connectionTimeoutTimer = null
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.lastMessageTimestamp = Date.now()

    this.heartbeatTimer = setInterval(() => {
      if (this.status === 'connected' && this.connection) {
        try {
          this.connection.send({
            type: 'heartbeat',
            payload: { timestamp: Date.now() },
          })
        } catch {
          // handled by conn
        }

        if (Date.now() - this.lastMessageTimestamp > this.heartbeatTimeoutMs) {
          this.setStatus('reconnecting')
        }
      }
    }, this.heartbeatIntervalMs)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private setStatus(newStatus: TransportStatus): void {
    if (this.status === newStatus) return
    this.status = newStatus
    this.statusHandlers.forEach((h) => h(newStatus))
  }

  private notifyMessage(message: TransportMessage): void {
    this.messageHandlers.forEach((h) => h(message))
  }

  private notifyPlayerJoin(playerId: string): void {
    this.playerJoinHandlers.forEach((h) => h(playerId))
  }

  private notifyPlayerLeave(playerId: string): void {
    this.playerLeaveHandlers.forEach((h) => h(playerId))
  }

  private notifyError(error: Error): void {
    this.errorHandlers.forEach((h) => h(error))
  }
}
