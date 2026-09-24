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

const SIGNALING_LOST_MESSAGE =
  'Lost connection to the matchmaking server and could not reconnect. Your invite link no longer ' +
  'works; create a new one.'

/**
 * Delays between attempts to re-register with the signaling server after the
 * socket drops. Once these are used up the transport reports
 * SIGNALING_LOST_MESSAGE so the lobby can offer a fresh invite.
 */
const SIGNALING_RETRY_DELAYS_MS = [1000, 3000]

/**
 * PeerJS error types raised by a signaling drop or a failed reconnect attempt
 * (including `unavailable-id` when the server still holds our old ID). They are
 * transient while retries remain, so they are not surfaced to the UI.
 */
const TRANSIENT_SIGNALING_ERRORS = new Set([
  'network',
  'socket-error',
  'socket-closed',
  'server-error',
  'unavailable-id',
])

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
  private signalingRetryTimer: ReturnType<typeof setTimeout> | null = null
  private signalingRetryAttempt = 0
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

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange)
      document.addEventListener('visibilitychange', this.handleVisibilityChange)
    }

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

      // True once this Peer has registered with signaling at least once, so
      // later signaling errors are drops to recover from, not setup failures.
      let hasOpened = false

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
          this.stopSignalingRetry()
          this.signalingRetryAttempt = 0

          // Torn down while the signaling handshake was in flight.
          if (this.isDestroyed) {
            try {
              peer.destroy()
            } catch {
              // ignore
            }
            this.peerInstance = null
            if (!isResolved) {
              isResolved = true
              reject(new Error('Cannot connect: transport has already been disconnected'))
            }
            return
          }

          const isReconnect = hasOpened
          hasOpened = true
          this.localPlayerId = assignedId

          // A signaling reconnect must not redial a host the guest already has.
          if (this.role === 'guest' && !isReconnect) {
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

          // Recoverable signaling drop: the 'disconnected' handler retries and
          // reports only if every retry fails. Live DataChannels are unaffected.
          if (hasOpened && TRANSIENT_SIGNALING_ERRORS.has(err?.type)) return

          cleanupSignalingTimeout()
          this.stopConnectionTimeout()

          const rawMessage = err instanceof Error ? err.message : String(err)
          const error = new Error(
            isPeerUnavailable(err, rawMessage) ? PEER_UNAVAILABLE_MESSAGE : rawMessage
          )

          // During an active match, P2P communication is direct over the WebRTC
          // DataChannel; transient broker errors must never disrupt the match.
          if (
            this.status === 'connected' &&
            this.connection &&
            !isPeerUnavailable(err, rawMessage)
          ) {
            return
          }

          this.notifyError(error)
          if (!isResolved && this.status === 'connecting') {
            isResolved = true
            reject(error)
          }
        })

        // Fires on any signaling drop, including a failed reconnect attempt.
        // Status is left alone: a live match runs over the direct DataChannel,
        // and in the lobby we keep the same peer ID so the invite stays valid.
        peer.on('disconnected', () => {
          if (this.isDestroyed || this.peerInstance !== peer || peer.destroyed) return
          if (!hasOpened) return
          this.scheduleSignalingRetry(peer)
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

  private scheduleSignalingRetry(peer: any): void {
    this.stopSignalingRetry()

    if (this.signalingRetryAttempt >= SIGNALING_RETRY_DELAYS_MS.length) {
      // Don't declare the invite dead while the tab is hidden in the background;
      // visibilitychange will retry when the user returns.
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }
      if (this.status !== 'connected' || !this.connection) {
        this.notifyError(new Error(SIGNALING_LOST_MESSAGE))
      }
      return
    }

    const delay = SIGNALING_RETRY_DELAYS_MS[this.signalingRetryAttempt]
    this.signalingRetryAttempt += 1

    this.signalingRetryTimer = setTimeout(() => {
      this.signalingRetryTimer = null
      if (this.isDestroyed || this.peerInstance !== peer || peer.destroyed) return
      if (!peer.disconnected) return
      try {
        peer.reconnect()
      } catch {
        // Only throws for a destroyed peer, whose 'close' tears us down.
      }
    }, delay)
  }

  private stopSignalingRetry(): void {
    if (this.signalingRetryTimer) {
      clearTimeout(this.signalingRetryTimer)
      this.signalingRetryTimer = null
    }
  }

  private handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') return
    if (document.visibilityState === 'visible') {
      const peer = this.peerInstance
      if (peer && peer.disconnected && !peer.destroyed && !this.isDestroyed) {
        this.signalingRetryAttempt = 0
        this.stopSignalingRetry()
        try {
          peer.reconnect()
        } catch {
          // Ignore
        }
      }
    }
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

      if (data?.type === 'heartbeat') return

      this.notifyMessage(data as TransportMessage)
    })

    conn.on('close', () => {
      if (this.connection !== conn) return
      this.handleConnectionDrop()
    })

    conn.on('error', (err: any) => {
      if (this.connection !== conn) return
      const error = err instanceof Error ? err : new Error(String(err))
      this.stopHeartbeat()
      this.stopConnectionTimeout()
      onErrorCallback?.(error)
      this.notifyError(error)
    })
  }

  private handleConnectionDrop(): void {
    this.stopHeartbeat()
    this.stopConnectionTimeout()
    const droppedPlayer = this.remotePlayerId
    this.connection = null
    this.remotePlayerId = null
    this.setStatus('disconnected')

    if (droppedPlayer) {
      this.notifyPlayerLeave(droppedPlayer)
    }
  }

  public send(message: TransportMessage): void {
    if (this.status !== 'connected' || !this.connection) {
      throw new Error(`Cannot send message: transport status is ${this.status}`)
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
    this.stopSignalingRetry()
    this.signalingRetryAttempt = 0
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    }
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
    this.stopSignalingRetry()
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    }

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
