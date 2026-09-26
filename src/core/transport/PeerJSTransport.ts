import {
  ITransport,
  PlayerEventHandler,
  StatusChangeHandler,
  TransportEventHandler,
  ErrorEventHandler,
  SignalingChangeHandler,
  TransportMessage,
  TransportStatus,
  HostRejectedError,
  HOST_REJECTED_MESSAGE,
} from './types'
import { PlayerRole } from '../games/types'

export interface PeerJSTransportOptions {
  role: PlayerRole
  localPlayerId?: string
  targetPeerId?: string
  iceServers?: RTCIceServer[]
  heartbeatIntervalMs?: number
  heartbeatTimeoutMs?: number
  onIdCollision?: () => string
  rejectExtraConnections?: boolean
  isStrangerMatch?: boolean
  /**
   * Keep the given localPlayerId when the broker still holds it (e.g. right
   * after a page reload) by retrying instead of failing or picking a new id.
   */
  reclaimLocalId?: boolean
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
]

const DEFAULT_HEARTBEAT_INTERVAL_MS = 5000
const DEFAULT_HEARTBEAT_TIMEOUT_MS = 15000
const CONNECTION_TIMEOUT_MS = 20000
const SIGNALING_TIMEOUT_MS = 15000
const RECLAIM_ID_RETRY_MS = 1500
const RECLAIM_ID_MAX_RETRIES = 10
const REDIAL_INTERVAL_MS = 3000
const REDIAL_WINDOW_MS = 40000

export const PEER_UNAVAILABLE_MESSAGE =
  'The match invite is no longer available. Please ask your friend to create a new match and share the invite.'

export const ICE_FAILURE_MESSAGE =
  'Could not connect directly to the other player. This usually happens when one player is behind a strict router or firewall.'

export const SIGNALING_LOST_MESSAGE =
  'Lost connection to the matchmaking server and could not reconnect. Your invite link no longer works; create a new one.'

// Delays between retries when signaling drops. Capped at 2 retries so an idle
// tab reports within ~4s. Visibility change immediately retries without waiting.
const SIGNALING_RETRY_DELAYS_MS = [1000, 3000]

// Transient PeerJS broker errors that represent temporary signaling hiccups.
// A live match uses direct WebRTC DataChannels and must not tear down on these.
const TRANSIENT_SIGNALING_ERRORS = new Set([
  'network',
  'socket-error',
  'socket-closed',
  'server-error',
  'unavailable-id',
])

export function isPeerUnavailable(err: any, message: string): boolean {
  return (
    err?.type === 'peer-unavailable' ||
    message.includes('Could not connect to peer') ||
    message.includes('peer-unavailable') ||
    message.includes('The match invite is no longer available')
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
  private onIdCollision?: () => string
  private rejectExtraConnections: boolean
  private isStrangerMatch: boolean
  private reclaimLocalId: boolean
  private isSignalingReleased = false
  private autoRedial = false
  private redialDeadline = 0
  private redialTimer: ReturnType<typeof setTimeout> | null = null

  private peerInstance: any = null
  private connection: any = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private connectionTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private signalingRetryTimer: ReturnType<typeof setTimeout> | null = null
  private pendingRejectTimers = new Set<ReturnType<typeof setTimeout>>()
  private signalingRetryAttempt = 0
  private lastMessageTimestamp = 0
  private isDestroyed = false

  private messageHandlers = new Set<TransportEventHandler>()
  private statusHandlers = new Set<StatusChangeHandler>()
  private playerJoinHandlers = new Set<PlayerEventHandler>()
  private playerLeaveHandlers = new Set<PlayerEventHandler>()
  private errorHandlers = new Set<ErrorEventHandler>()
  private signalingChangeHandlers = new Set<SignalingChangeHandler>()

  constructor(options: PeerJSTransportOptions) {
    this.role = options.role
    this.localPlayerId = options.localPlayerId ?? ''
    this.targetPeerId = options.targetPeerId
    this.iceServers = options.iceServers ?? DEFAULT_ICE_SERVERS
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? DEFAULT_HEARTBEAT_TIMEOUT_MS
    this.onIdCollision = options.onIdCollision
    this.rejectExtraConnections = options.rejectExtraConnections ?? false
    this.isStrangerMatch = options.isStrangerMatch ?? false
    this.reclaimLocalId = options.reclaimLocalId ?? false
  }

  /**
   * Guest only: while enabled, a dropped connection to the Host is redialled
   * for up to REDIAL_WINDOW_MS, so a Match survives the Host reloading its
   * page. Match coordinators enable this for the length of a Match.
   */
  public setAutoRedial(enabled: boolean): void {
    this.autoRedial = enabled && this.role === 'guest'
    if (!this.autoRedial) {
      this.stopRedial()
    } else if (this.status !== 'connected') {
      this.redialDeadline = Date.now() + REDIAL_WINDOW_MS
      this.scheduleRedial()
    }
  }

  private scheduleRedial(): void {
    if (!this.autoRedial || this.isDestroyed || !this.targetPeerId) return
    if (this.redialTimer) return
    if (Date.now() > this.redialDeadline) return

    this.redialTimer = setTimeout(() => {
      this.redialTimer = null
      if (!this.autoRedial || this.isDestroyed || this.status === 'connected') return
      const peer = this.peerInstance
      if (!peer || peer.destroyed || !this.targetPeerId) {
        this.scheduleRedial()
        return
      }
      try {
        this.setupConnection(peer.connect(this.targetPeerId, { reliable: true }))
      } catch {
        // Retried below
      }
      this.scheduleRedial()
    }, REDIAL_INTERVAL_MS)
  }

  private stopRedial(): void {
    if (this.redialTimer) {
      clearTimeout(this.redialTimer)
      this.redialTimer = null
    }
  }

  private startRedialWindow(): void {
    if (!this.autoRedial || this.isDestroyed) return
    this.redialDeadline = Date.now() + REDIAL_WINDOW_MS
    this.scheduleRedial()
  }

  public async connect(): Promise<string> {
    if (this.status === 'connected') return this.localPlayerId

    this.setStatus('connecting')

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange)
      document.addEventListener('visibilitychange', this.handleVisibilityChange)
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
      window.addEventListener('online', this.handleOnline)
    }

    const { Peer } = await import('peerjs')

    if (this.isDestroyed) {
      throw new Error('Cannot connect: transport has already been disconnected')
    }

    return new Promise<string>((resolve, reject) => {
      let isResolved = false
      let collisionRetries = 0
      let signalingTimedOut = false

      const initPeer = () => {
        let signalingTimeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
          signalingTimedOut = true
          if (!isResolved) {
            isResolved = true
            const timeoutError = new Error('Signaling server timed out while establishing connection.')
            this.notifyError(timeoutError)
            reject(timeoutError)
          }
        }, SIGNALING_TIMEOUT_MS)

        const cleanupSignalingTimeout = () => {
          if (signalingTimeout) {
            clearTimeout(signalingTimeout)
            signalingTimeout = null
          }
        }

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
            const isReconnect = hasOpened
            this.signalingRetryAttempt = 0
            this.notifySignalingChange(false)

            if (this.isDestroyed) {
              try {
                peer.destroy()
              } catch {
                // ignore
              }
              this.peerInstance = null
              if (!isResolved) {
                isResolved = true
                reject(new Error('Cannot connect: transport was disconnected'))
              }
              return
            }

            hasOpened = true
            this.localPlayerId = assignedId

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

              try {
                const conn = peer.connect(this.targetPeerId, {
                  reliable: true,
                })
                this.setupConnection(conn)
              } catch (connectErr) {
                const error = connectErr instanceof Error ? connectErr : new Error(String(connectErr))
                this.notifyError(error)
                if (!isResolved) {
                  isResolved = true
                  reject(error)
                }
                return
              }
            }

            if (!isResolved) {
              isResolved = true
              resolve(this.localPlayerId)
            }
          })

          peer.on('connection', (conn: any) => {
            if (this.peerInstance !== peer) return
            if (this.role === 'host') {
              if (
                // Only an open connection makes the host full. A half-open one
                // may belong to a joiner who already gave up, so a newer joiner
                // replaces it (setupConnection closes the old one).
                this.rejectExtraConnections &&
                this.status === 'connected'
              ) {
                const sendReject = () => {
                  try {
                    conn.send({ type: 'reject', payload: { reason: 'full' } })
                  } catch {
                    // Safe ignore
                  }
                  try {
                    conn.close()
                  } catch {
                    // Safe ignore
                  }
                }
                if (conn.open) {
                  sendReject()
                } else {
                  let rejectTimer: ReturnType<typeof setTimeout> | null = null
                  const onConnOpen = () => {
                    if (rejectTimer) {
                      clearTimeout(rejectTimer)
                      this.pendingRejectTimers.delete(rejectTimer)
                      rejectTimer = null
                    }
                    sendReject()
                  }
                  conn.on('open', onConnOpen)
                  rejectTimer = setTimeout(() => {
                    if (rejectTimer) {
                      this.pendingRejectTimers.delete(rejectTimer)
                      rejectTimer = null
                    }
                    try {
                      conn.close()
                    } catch {
                      // Safe ignore
                    }
                  }, 1000)
                  this.pendingRejectTimers.add(rejectTimer)
                }
                return
              }
              this.setupConnection(conn)
            }
          })

          peer.on('error', (err: any) => {
            if (this.isDestroyed || this.peerInstance !== peer) return

            // Recoverable signaling drop: the 'disconnected' handler retries and
            // reports only if every retry fails. Live DataChannels are unaffected.
            if (hasOpened && TRANSIENT_SIGNALING_ERRORS.has(err?.type)) return

            // Reclaim: the broker still holds our id from before a reload; wait and retry it.
            if (!hasOpened && err?.type === 'unavailable-id' && this.reclaimLocalId) {
              cleanupSignalingTimeout()
              try {
                peer.destroy()
              } catch {
                // ignore
              }
              if (this.isDestroyed || isResolved || signalingTimedOut) return
              if (collisionRetries >= RECLAIM_ID_MAX_RETRIES) {
                const limitError = new Error('Could not reclaim the previous connection id')
                this.notifyError(limitError)
                isResolved = true
                reject(limitError)
                return
              }
              collisionRetries++
              setTimeout(() => {
                if (!this.isDestroyed) initPeer()
              }, RECLAIM_ID_RETRY_MS)
              return
            }

            // Host collision on initial open: regenerate ID if collision handler is provided
            if (
              !hasOpened &&
              err?.type === 'unavailable-id' &&
              this.role === 'host' &&
              this.onIdCollision
            ) {
              cleanupSignalingTimeout()
              this.stopConnectionTimeout()

              try {
                peer.destroy()
              } catch {
                // ignore
              }

              if (this.isDestroyed || isResolved || signalingTimedOut) {
                return
              }

              if (collisionRetries >= 3) {
                cleanupSignalingTimeout()
                this.stopConnectionTimeout()
                const limitError = new Error(
                  'Failed to acquire unique host ID: maximum collision retries exceeded'
                )
                this.notifyError(limitError)
                if (!isResolved) {
                  isResolved = true
                  reject(limitError)
                }
                return
              }

              collisionRetries++
              this.localPlayerId = this.onIdCollision()
              initPeer()
              return
            }

            const rawMessageEarly = err instanceof Error ? err.message : String(err)
            if (hasOpened && this.autoRedial && isPeerUnavailable(err, rawMessageEarly)) {
              // The Host hasn't re-registered yet (e.g. it's reloading).
              this.stopConnectionTimeout()
              this.scheduleRedial()
              return
            }

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

          peer.on('disconnected', () => {
            if (this.isDestroyed || this.peerInstance !== peer || peer.destroyed) return
            if (this.isSignalingReleased) return
            if (!hasOpened) return

            this.notifySignalingChange(true)
            this.scheduleSignalingRetry(peer)
          })

          peer.on('close', () => {
            if (this.peerInstance !== peer) return
            this.peerInstance = null
          })
        } catch (peerCreateErr) {
          cleanupSignalingTimeout()
          const error = peerCreateErr instanceof Error ? peerCreateErr : new Error(String(peerCreateErr))
          this.notifyError(error)
          if (!isResolved) {
            isResolved = true
            reject(error)
          }
        }
      }

      initPeer()
    })
  }

  private scheduleSignalingRetry(peer: any): void {
    this.stopSignalingRetry()

    if (this.signalingRetryAttempt >= SIGNALING_RETRY_DELAYS_MS.length) {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }
      if (this.status !== 'connected' || !this.connection) {
        this.notifyError(new Error(SIGNALING_LOST_MESSAGE))
      }
      return
    }

    const delay = SIGNALING_RETRY_DELAYS_MS[this.signalingRetryAttempt]
    this.signalingRetryAttempt++

    this.signalingRetryTimer = setTimeout(() => {
      this.signalingRetryTimer = null
      if (this.isDestroyed || this.peerInstance !== peer || peer.destroyed) return
      if (!peer.disconnected) return
      try {
        peer.reconnect()
      } catch {
        // Safe ignore
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
    if (this.isSignalingReleased) return
    if (document.visibilityState === 'visible') {
      const peer = this.peerInstance
      if (peer && peer.disconnected && !peer.destroyed && !this.isDestroyed) {
        this.signalingRetryAttempt = 0
        this.stopSignalingRetry()
        this.notifySignalingChange(true)
        try {
          peer.reconnect()
        } catch {
          // Ignore
        }
      }
    }
  }

  private handleOnline = (): void => {
    if (this.isSignalingReleased) return
    const peer = this.peerInstance
    if (peer && peer.disconnected && !peer.destroyed && !this.isDestroyed) {
      this.signalingRetryAttempt = 0
      this.stopSignalingRetry()
      this.notifySignalingChange(true)
      try {
        peer.reconnect()
      } catch {
        // Ignore
      }
    }
  }

  private setupConnection(
    conn: any,
    onOpenCallback?: () => void,
    onErrorCallback?: (err: Error) => void
  ): void {
    if (this.connection) {
      try {
        this.connection.close()
      } catch {
        // Safe ignore
      }
    }
    this.connection = conn
    let isRejected = false

    const handleOpen = () => {
      if (this.connection !== conn) return
      this.stopConnectionTimeout()
      this.stopRedial()
      this.remotePlayerId = conn.peer
      this.setStatus('connected')
      this.startHeartbeat()
      this.notifyPlayerJoin(conn.peer)
      onOpenCallback?.()
    }

    if (conn.open) {
      handleOpen()
    } else {
      this.startConnectionTimeout()
      conn.on('open', handleOpen)
    }

    conn.on('data', (data: any) => {
      if (this.connection !== conn) return
      this.lastMessageTimestamp = Date.now()

      if (data?.type === 'reject') {
        isRejected = true
        const reason = data.payload?.reason || HOST_REJECTED_MESSAGE
        this.stopConnectionTimeout()
        if (this.autoRedial) {
          // A Host that hasn't noticed our old connection dropping rejects us; try again shortly.
          this.startRedialWindow()
        } else {
          this.notifyError(new HostRejectedError(reason))
        }
        try {
          conn.close()
        } catch {
          // Safe ignore
        }
        return
      }

      if (data?.type === 'heartbeat') return

      this.notifyMessage(data as TransportMessage)
    })

    conn.on('close', () => {
      if (this.connection !== conn) return
      if (this.autoRedial && !isRejected) this.startRedialWindow()
      if (this.status !== 'connected') {
        this.stopConnectionTimeout()
        this.connection = null
        if (this.isStrangerMatch && this.role === 'guest' && !isRejected) {
          this.notifyError(new HostRejectedError('Connection closed before opening'))
        } else if (!this.isStrangerMatch) {
          this.handleConnectionDrop()
        }
        return
      }
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
      this.notifyError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.lastMessageTimestamp = Date.now()

    this.heartbeatTimer = setInterval(() => {
      if (this.status === 'connected' && this.connection) {
        try {
          this.connection.send({ type: 'heartbeat', payload: {} })
        } catch {
          // Handled by connection error
        }

        const elapsed = Date.now() - this.lastMessageTimestamp
        if (elapsed > this.heartbeatTimeoutMs) {
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

  private startConnectionTimeout(): void {
    this.stopConnectionTimeout()
    this.connectionTimeoutTimer = setTimeout(() => {
      this.connectionTimeoutTimer = null
      if (this.status === 'connected') return

      // A stranger host keeps waiting on its slot: drop the stalled joiner
      // instead of reporting an error that would make it give the slot up.
      if (this.isStrangerMatch && this.role === 'host') {
        const stalled = this.connection
        this.connection = null
        try {
          stalled?.close()
        } catch {
          // Safe ignore
        }
        return
      }

      if (this.autoRedial) {
        this.startRedialWindow()
        return
      }
      this.notifyError(new Error(ICE_FAILURE_MESSAGE))
    }, CONNECTION_TIMEOUT_MS)
  }

  private stopConnectionTimeout(): void {
    if (this.connectionTimeoutTimer) {
      clearTimeout(this.connectionTimeoutTimer)
      this.connectionTimeoutTimer = null
    }
  }

  public releaseSignaling(): void {
    this.isSignalingReleased = true
    this.stopSignalingRetry()
    if (this.peerInstance && !this.peerInstance.disconnected) {
      try {
        this.peerInstance.disconnect()
      } catch {
        // Safe ignore
      }
    }
  }

  public async retryConnect(): Promise<string> {
    this.stopHeartbeat()
    this.stopConnectionTimeout()
    this.stopSignalingRetry()
    this.signalingRetryAttempt = 0
    this.isSignalingReleased = false
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
    }

    for (const timer of this.pendingRejectTimers) {
      clearTimeout(timer)
    }
    this.pendingRejectTimers.clear()

    const previousPeer = this.peerInstance
    const previousConnection = this.connection
    this.peerInstance = null
    this.connection = null
    this.isDestroyed = false

    if (previousConnection) {
      try {
        previousConnection.close()
      } catch {
        // Safe ignore
      }
    }

    if (previousPeer) {
      try {
        previousPeer.destroy()
      } catch {
        // Safe ignore
      }
    }

    return this.connect()
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

  public onSignalingChange(handler: SignalingChangeHandler): () => void {
    this.signalingChangeHandlers.add(handler)
    return () => this.signalingChangeHandlers.delete(handler)
  }

  public disconnect(): void {
    if (this.status === 'closed') return

    this.isDestroyed = true
    this.isSignalingReleased = false
    this.autoRedial = false
    this.stopRedial()
    this.stopHeartbeat()
    this.stopConnectionTimeout()
    this.stopSignalingRetry()

    for (const timer of this.pendingRejectTimers) {
      clearTimeout(timer)
    }
    this.pendingRejectTimers.clear()

    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
    }

    const prevRemote = this.remotePlayerId
    this.setStatus('closed')
    this.remotePlayerId = null

    if (this.connection) {
      try {
        this.connection.close()
      } catch {
        // Ignore
      }
      this.connection = null
    }

    if (this.peerInstance) {
      const peer = this.peerInstance
      this.peerInstance = null
      try {
        peer.destroy()
      } catch {
        // Ignore
      }
    }

    if (prevRemote) {
      this.notifyPlayerLeave(prevRemote)
    }
  }

  private setStatus(newStatus: TransportStatus): void {
    if (this.status === newStatus) return
    this.status = newStatus
    this.statusHandlers.forEach((handler) => handler(newStatus))
  }

  private notifyPlayerJoin(playerId: string): void {
    this.playerJoinHandlers.forEach((handler) => handler(playerId))
  }

  private notifyPlayerLeave(playerId: string): void {
    this.playerLeaveHandlers.forEach((handler) => handler(playerId))
  }

  private notifyMessage(message: TransportMessage): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message)
      } catch (err) {
        this.notifyError(err instanceof Error ? err : new Error(String(err)))
      }
    })
  }

  private notifyError(error: Error): void {
    this.errorHandlers.forEach((handler) => handler(error))
  }

  private notifySignalingChange(isReconnecting: boolean): void {
    this.signalingChangeHandlers.forEach((handler) => handler(isReconnecting))
  }
}
