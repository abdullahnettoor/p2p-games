import { PlayerRole } from '@/core/games/types'
import {
  ITransport,
  TransportMessage,
  TransportStatus,
  TransportEventHandler,
  StatusChangeHandler,
  PlayerEventHandler,
  ErrorEventHandler,
  SignalingChangeHandler,
} from './types'

export interface LoopbackTransportOptions {
  role: PlayerRole
  localPlayerId?: string
  targetTransport?: LoopbackTransport
}

export class LoopbackTransport implements ITransport {
  public status: TransportStatus = 'disconnected'
  public readonly localPlayerId: string
  public remotePlayerId: string | null = null
  public readonly role: PlayerRole
  public isSignalingReleased = false

  private targetTransport: LoopbackTransport | null = null
  private messageHandlers = new Set<TransportEventHandler>()
  private statusHandlers = new Set<StatusChangeHandler>()
  private playerJoinHandlers = new Set<PlayerEventHandler>()
  private playerLeaveHandlers = new Set<PlayerEventHandler>()
  private errorHandlers = new Set<ErrorEventHandler>()
  private signalingChangeHandlers = new Set<SignalingChangeHandler>()

  constructor(options: LoopbackTransportOptions) {
    this.role = options.role
    this.localPlayerId = options.localPlayerId ?? `${this.role}-${Math.random().toString(36).substring(2, 9)}`
    if (options.targetTransport) {
      this.setTargetTransport(options.targetTransport)
    }
  }

  public setTargetTransport(target: LoopbackTransport): void {
    this.targetTransport = target
  }

  public async connect(): Promise<string> {
    if (this.status === 'connected') return this.localPlayerId

    if (this.role === 'host') {
      if (this.targetTransport && (this.targetTransport.status === 'connecting' || this.status === 'reconnecting')) {
        this.performHandshake(this.targetTransport)
      } else {
        this.setStatus('connecting')
      }
      return this.localPlayerId
    }

    // Guest role
    if (!this.targetTransport) {
      throw new Error('Guest transport requires a target host transport to connect')
    }

    this.setStatus('connecting')
    if (this.targetTransport.status === 'connecting' || this.targetTransport.status === 'connected' || this.targetTransport.status === 'reconnecting') {
      this.performHandshake(this.targetTransport)
    }

    return this.localPlayerId
  }

  private performHandshake(target: LoopbackTransport): void {
    this.remotePlayerId = target.localPlayerId
    this.setStatus('connected')
    this.notifyPlayerJoin(this.remotePlayerId)

    target.remotePlayerId = this.localPlayerId
    target.setStatus('connected')
    target.notifyPlayerJoin(this.localPlayerId)
  }

  public send(message: TransportMessage): void {
    if (this.status !== 'connected' || !this.targetTransport) {
      throw new Error(`Cannot send message: transport is ${this.status}`)
    }

    // Deep clone message to avoid shared mutation between simulated players
    const serialized = JSON.parse(JSON.stringify(message))
    this.targetTransport.receiveMessage(serialized)
  }

  public receiveMessage(message: TransportMessage): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message)
      } catch (err) {
        this.notifyError(err instanceof Error ? err : new Error(String(err)))
      }
    })
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

  public releaseSignaling(): void {
    this.isSignalingReleased = true
  }

  public disconnect(): void {
    if (this.status === 'closed') return

    const previousRemote = this.remotePlayerId
    this.setStatus('closed')
    this.remotePlayerId = null

    if (this.targetTransport && this.targetTransport.status === 'connected') {
      const target = this.targetTransport
      target.remotePlayerId = null
      target.setStatus('reconnecting')
      if (previousRemote) {
        target.notifyPlayerLeave(this.localPlayerId)
      }
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

  private notifyError(error: Error): void {
    this.errorHandlers.forEach((handler) => handler(error))
  }
}

export function createLoopbackTransportPair(): [LoopbackTransport, LoopbackTransport] {
  const host = new LoopbackTransport({
    role: 'host',
    localPlayerId: `host-${Math.random().toString(36).substring(2, 7)}`,
  })

  const guest = new LoopbackTransport({
    role: 'guest',
    localPlayerId: `guest-${Math.random().toString(36).substring(2, 7)}`,
    targetTransport: host,
  })

  host.setTargetTransport(guest)

  return [host, guest]
}
