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

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  {
    urls: [
      'turn:eu-0.turn.peerjs.com:3478',
      'turn:us-0.turn.peerjs.com:3478',
    ],
    username: 'peerjs',
    credential: 'peerjsp',
  },
]

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

    if (this.status === 'connected') return this.localPlayerId

    this.setStatus('connecting')

    const { Peer } = await import('peerjs')

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
          if (this.role === 'host') {
            if (this.connection && this.connection !== conn) {
              try {
                this.connection.close()
              } catch {
                // ignore
              }
            }
            this.setupConnection(conn)
          }
        })

        peer.on('error', (err: any) => {
          cleanupSignalingTimeout()
          this.stopConnectionTimeout()

          let errorMsg = err instanceof Error ? err.message : String(err)
          if (err?.type === 'peer-unavailable' || errorMsg.includes('Could not connect to peer')) {
            errorMsg = 'Match not found or the host has disconnected. Please verify you have the latest invite link from the host.'
          }

          const error = new Error(errorMsg)
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
      conn.on('open', handleOpen)
    }

    conn.on('data', (data: any) => {
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
      this.stopConnectionTimeout()
      let errorMsg = err instanceof Error ? err.message : String(err)
      if (err?.type === 'peer-unavailable' || errorMsg.includes('Could not connect to peer')) {
        errorMsg = 'Match not found or the host has disconnected. Please verify you have the latest invite link from the host.'
      }
      const error = new Error(errorMsg)
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

  public disconnect(): void {
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
        const error = new Error(
          'Connecting to host timed out. Please verify that the host is online and the invite link is correct.'
        )
        this.notifyError(error)
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
