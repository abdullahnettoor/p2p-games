import { ITransport, TransportMessage } from '@/core/transport/types'
import { LobbyPlayer, LobbyState, LobbyStatus, MatchStartEvent } from './types'
import { extractRoomCode } from './roomCode'
import {
  BestOfSeriesLength,
  DEFAULT_SERIES_LENGTH,
  isValidSeriesLength,
} from '@/core/series'

export const PLAYER_NAME_STORAGE_KEY = 'games:player:name'

function getPersistedPlayerName(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  try {
    return localStorage.getItem(PLAYER_NAME_STORAGE_KEY)
  } catch {
    return null
  }
}

function persistPlayerName(name: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    localStorage.setItem(PLAYER_NAME_STORAGE_KEY, name)
  } catch {
    // safe ignore
  }
}

export interface LobbyCoordinatorOptions<TSetupConfig = unknown> {
  transport: ITransport
  playerName?: string
  roomCode?: string
  inviteUrlGenerator?: (matchId: string) => string
  validateSetup?: (config: TSetupConfig) => boolean
  onMatchStart?: (event: MatchStartEvent<TSetupConfig>) => void
  initialSeriesLength?: BestOfSeriesLength
}

export class LobbyCoordinator<TSetupConfig = unknown> {
  public state: LobbyState<TSetupConfig>
  public seriesLength: BestOfSeriesLength
  private transport: ITransport
  private validateSetup?: (config: TSetupConfig) => boolean
  private onMatchStart?: (event: MatchStartEvent<TSetupConfig>) => void
  private inviteUrlGenerator?: (matchId: string) => string
  private listeners = new Set<() => void>()
  private unsubscribers: Array<() => void> = []

  constructor(options: LobbyCoordinatorOptions<TSetupConfig>) {
    this.transport = options.transport
    this.validateSetup = options.validateSetup
    this.onMatchStart = options.onMatchStart
    this.inviteUrlGenerator = options.inviteUrlGenerator
    this.seriesLength = options.initialSeriesLength ?? DEFAULT_SERIES_LENGTH

    const defaultName =
      options.playerName ||
      getPersistedPlayerName() ||
      (this.transport.role === 'host' ? 'Host' : 'Guest')

    this.state = {
      status: 'idle',
      localPlayer: {
        id: this.transport.localPlayerId,
        name: defaultName,
        role: this.transport.role,
        isReady: false,
        connected: true,
      },
      remotePlayer: null,
      inviteUrl: null,
      roomCode: options.roomCode ?? extractRoomCode(this.transport.localPlayerId),
      isReconnecting: false,
      error: null,
      seriesLength: this.seriesLength,
    }

    this.bindTransportEvents()
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }

  private bindTransportEvents(): void {
    const unsubMsg = this.transport.onMessage((msg) => this.handleTransportMessage(msg))
    const unsubPlayerJoin = this.transport.onPlayerJoin((playerId) => this.handlePlayerJoin(playerId))
    const unsubPlayerLeave = this.transport.onPlayerLeave((playerId) => this.handlePlayerLeave(playerId))
    const unsubStatus = this.transport.onStatusChange((status) => this.handleStatusChange(status))
    const unsubError = this.transport.onError((err) => {
      this.state = {
        ...this.state,
        status: 'error',
        isReconnecting: false,
        error: err.message,
      }
      this.notify()
    })

    const unsubSignaling = this.transport.onSignalingChange?.((isReconnecting: boolean) => {
      if (this.state.status !== 'error') {
        this.state = {
          ...this.state,
          isReconnecting,
        }
        this.notify()
      }
    })

    this.unsubscribers.push(unsubMsg, unsubPlayerJoin, unsubPlayerLeave, unsubStatus, unsubError)
    if (unsubSignaling) {
      this.unsubscribers.push(unsubSignaling)
    }
  }

  private applyConnectedState(peerId: string): void {
    const derivedRoomCode = extractRoomCode(peerId)

    const inviteUrl =
      this.transport.role === 'host'
        ? this.inviteUrlGenerator
          ? this.inviteUrlGenerator(peerId)
          : typeof window !== 'undefined'
            ? `${window.location.origin}${window.location.pathname}?match=${peerId}`
            : `?match=${peerId}`
        : null

    const newStatus: LobbyStatus =
      this.transport.status === 'connected'
        ? 'connected'
        : this.transport.role === 'host'
          ? 'waiting'
          : 'connecting'

    this.state = {
      ...this.state,
      status: newStatus,
      inviteUrl,
      roomCode: derivedRoomCode ?? this.state.roomCode,
      isReconnecting: false,
      error: null,
      seriesLength: this.seriesLength,
      localPlayer: {
        ...this.state.localPlayer,
        id: peerId,
      },
    }

    // If already connected to remote player, initialize remote player
    if (this.transport.remotePlayerId) {
      this.handlePlayerJoin(this.transport.remotePlayerId)
    }

    this.notify()
  }

  public async start(): Promise<void> {
    try {
      this.state = { ...this.state, status: 'connecting', isReconnecting: false }
      this.notify()

      const peerId = await this.transport.connect()
      this.applyConnectedState(peerId)
    } catch (err) {
      this.state = {
        ...this.state,
        status: 'error',
        isReconnecting: false,
        error: err instanceof Error ? err.message : String(err),
      }
      this.notify()
      throw err
    }
  }

  public async retry(): Promise<void> {
    this.state = {
      ...this.state,
      status: 'connecting',
      isReconnecting: false,
      error: null,
    }
    this.notify()

    try {
      const reconnect = (this.transport as ITransport & {
        retryConnect?: () => Promise<string>
      }).retryConnect

      const peerId = reconnect
        ? await reconnect.call(this.transport)
        : await this.transport.connect()

      this.applyConnectedState(peerId)
    } catch (err) {
      this.state = {
        ...this.state,
        status: 'error',
        isReconnecting: false,
        error: err instanceof Error ? err.message : String(err),
      }
      this.notify()
    }
  }

  public setSeriesLength(length: BestOfSeriesLength): void {
    if (!isValidSeriesLength(length)) {
      throw new Error(`Invalid series length: ${length}`)
    }
    if (this.seriesLength === length) return

    this.seriesLength = length

    // Changing series length un-readies both players
    this.state = {
      ...this.state,
      seriesLength: length,
      localPlayer: {
        ...this.state.localPlayer,
        isReady: false,
      },
      remotePlayer: this.state.remotePlayer
        ? {
            ...this.state.remotePlayer,
            isReady: false,
          }
        : null,
    }
    this.notify()

    if (this.transport.status === 'connected') {
      this.transport.send({
        type: 'series_length',
        payload: { seriesLength: length },
      })
      this.sendReadyMessage(false, this.state.localPlayer.setupConfig)
    }
  }

  public updatePlayerName(name: string): void {
    const trimmed = name.trim()
    if (!trimmed) return

    persistPlayerName(trimmed)

    this.state = {
      ...this.state,
      localPlayer: {
        ...this.state.localPlayer,
        name: trimmed,
      },
    }
    this.notify()

    if (this.transport.status === 'connected') {
      this.transport.send({
        type: 'profile',
        payload: { playerName: trimmed },
      })
    }
  }

  public setPlayerName = (name: string): void => {
    this.updatePlayerName(name)
  }

  public updateBoardSetup(setupConfig: TSetupConfig): void {
    this.state = {
      ...this.state,
      localPlayer: {
        ...this.state.localPlayer,
        setupConfig,
        isReady: false,
      },
    }
    this.notify()

    this.sendReadyMessage(false, setupConfig)
  }

  public canReady(): boolean {
    if (!this.state.localPlayer.name || !this.state.localPlayer.name.trim()) {
      return false
    }
    if (this.validateSetup) {
      return Boolean(this.validateSetup(this.state.localPlayer.setupConfig as TSetupConfig))
    }
    if (this.state.localPlayer.setupConfig === undefined) return false
    return true
  }

  public setReady(isReady: boolean): void {
    if (isReady && !this.canReady()) {
      throw new Error('Invalid board setup')
    }

    this.state = {
      ...this.state,
      localPlayer: {
        ...this.state.localPlayer,
        isReady,
      },
    }
    this.notify()

    this.sendReadyMessage(isReady, this.state.localPlayer.setupConfig)
    this.checkBothReady()
  }

  public resetForRematch(): void {
    this.state = {
      ...this.state,
      status: this.transport.status === 'connected' ? 'connected' : 'waiting',
      seriesLength: this.seriesLength,
      localPlayer: {
        ...this.state.localPlayer,
        isReady: false,
        setupConfig: undefined,
      },
      remotePlayer: this.state.remotePlayer
        ? {
            ...this.state.remotePlayer,
            isReady: false,
            setupConfig: undefined,
          }
        : null,
    }
    this.notify()
  }

  private sendReadyMessage(isReady: boolean, setupConfig?: TSetupConfig): void {
    if (this.transport.status === 'connected') {
      this.transport.send({
        type: 'ready',
        payload: {
          isReady,
          playerName: this.state.localPlayer.name,
          setupConfig,
        },
      })
    }
  }

  private checkBothReady(): void {
    const { localPlayer, remotePlayer } = this.state
    if (localPlayer.isReady && remotePlayer?.isReady) {
      // Validate both local and remote board configurations before launching
      const isRemoteSetupValid =
        !this.validateSetup ||
        Boolean(this.validateSetup(remotePlayer.setupConfig as TSetupConfig))

      if (!isRemoteSetupValid) {
        return
      }

      if (this.transport.role === 'host') {
        const startingPlayerId =
          Math.random() < 0.5 ? localPlayer.id : remotePlayer.id

        const startPayload: MatchStartEvent<TSetupConfig> = {
          hostId: localPlayer.id,
          guestId: remotePlayer.id,
          startingPlayerId,
          hostSetup: localPlayer.setupConfig as TSetupConfig,
          guestSetup: remotePlayer.setupConfig as TSetupConfig,
          seriesLength: this.seriesLength,
        }

        this.transport.send({
          type: 'match_start',
          payload: {
            startingPlayerId,
            timestamp: Date.now(),
            seriesLength: this.seriesLength,
            setupConfigs: {
              [localPlayer.id]: localPlayer.setupConfig,
              [remotePlayer.id]: remotePlayer.setupConfig,
            },
          },
        })

        this.transitionToMatchStart(startPayload)
      }
    }
  }

  private transitionToMatchStart(event: MatchStartEvent<TSetupConfig>): void {
    this.state = {
      ...this.state,
      status: 'starting',
    }
    this.notify()
    this.onMatchStart?.(event)
  }

  private handleTransportMessage(message: TransportMessage): void {
    switch (message.type) {
      case 'profile': {
        if (this.state.remotePlayer) {
          this.state = {
            ...this.state,
            remotePlayer: {
              ...this.state.remotePlayer,
              name: message.payload.playerName,
            },
          }
          this.notify()
        }
        break
      }
      case 'series_length': {
        const length = message.payload.seriesLength
        if (isValidSeriesLength(length)) {
          this.seriesLength = length
          // Changing series length un-readies both players
          this.state = {
            ...this.state,
            seriesLength: length,
            localPlayer: {
              ...this.state.localPlayer,
              isReady: false,
            },
            remotePlayer: this.state.remotePlayer
              ? {
                  ...this.state.remotePlayer,
                  isReady: false,
                }
              : null,
          }
          this.notify()
          if (this.transport.status === 'connected') {
            this.sendReadyMessage(false, this.state.localPlayer.setupConfig)
          }
        }
        break
      }
      case 'ready': {
        const payload = message.payload
        const remoteRole = this.state.localPlayer.role === 'host' ? 'guest' : 'host'
        const existingRemote = this.state.remotePlayer

        this.state = {
          ...this.state,
          remotePlayer: {
            id: this.transport.remotePlayerId || existingRemote?.id || 'remote-player',
            name: payload.playerName || existingRemote?.name || (remoteRole === 'host' ? 'Host' : 'Guest'),
            role: remoteRole,
            isReady: payload.isReady,
            connected: true,
            setupConfig: (payload.setupConfig ?? existingRemote?.setupConfig) as TSetupConfig,
          },
        }
        this.notify()
        this.checkBothReady()
        break
      }
      case 'match_start': {
        const payload = message.payload
        const { localPlayer, remotePlayer } = this.state
        if (remotePlayer) {
          const isLocalHost = localPlayer.role === 'host'
          const hostId = isLocalHost ? localPlayer.id : remotePlayer.id
          const guestId = isLocalHost ? remotePlayer.id : localPlayer.id

          const hostSetup = (isLocalHost
            ? localPlayer.setupConfig
            : payload.setupConfigs?.[hostId] ?? remotePlayer.setupConfig) as TSetupConfig

          const guestSetup = (!isLocalHost
            ? localPlayer.setupConfig
            : payload.setupConfigs?.[guestId] ?? remotePlayer.setupConfig) as TSetupConfig

          const receivedSeriesLength = payload.seriesLength ?? this.seriesLength
          if (isValidSeriesLength(receivedSeriesLength)) {
            this.seriesLength = receivedSeriesLength
          }

          this.transitionToMatchStart({
            hostId,
            guestId,
            startingPlayerId: payload.startingPlayerId,
            hostSetup,
            guestSetup,
            seriesLength: this.seriesLength,
          })
        }
        break
      }
    }
  }

  private handlePlayerJoin(playerId: string): void {
    const remoteRole = this.state.localPlayer.role === 'host' ? 'guest' : 'host'
    this.state = {
      ...this.state,
      status: 'connected',
      remotePlayer: {
        id: playerId,
        name: this.state.remotePlayer?.name || (remoteRole === 'host' ? 'Host' : 'Guest'),
        role: remoteRole,
        isReady: this.state.remotePlayer?.isReady ?? false,
        connected: true,
        setupConfig: this.state.remotePlayer?.setupConfig,
      },
    }
    this.notify()

    // Announce local player profile & ready state to newly joined player
    this.transport.send({
      type: 'profile',
      payload: { playerName: this.state.localPlayer.name },
    })

    if (this.transport.role === 'host') {
      this.transport.send({
        type: 'series_length',
        payload: { seriesLength: this.seriesLength },
      })
    }

    if (this.state.localPlayer.setupConfig !== undefined) {
      this.sendReadyMessage(this.state.localPlayer.isReady, this.state.localPlayer.setupConfig)
    }
  }

  private handlePlayerLeave(_playerId: string): void {
    if (this.state.remotePlayer) {
      this.state = {
        ...this.state,
        status: this.state.localPlayer.role === 'host' ? 'waiting' : 'connecting',
        remotePlayer: {
          ...this.state.remotePlayer,
          connected: false,
        },
      }
      this.notify()
    }
  }

  private handleStatusChange(status: string): void {
    if (status === 'closed' || status === 'disconnected') {
      if (this.state.status !== 'error') {
        this.state = {
          ...this.state,
          status: this.state.localPlayer.role === 'host' ? 'waiting' : 'idle',
        }
        this.notify()
      }
    }
  }

  public destroy(): void {
    this.unsubscribers.forEach((unsub) => unsub())
    this.unsubscribers = []
    this.listeners.clear()
    this.transport.disconnect()
  }
}

// Retain LobbySession as an alias for backwards compatibility
export const LobbySession = LobbyCoordinator
export type LobbySession<T> = LobbyCoordinator<T>
export type LobbySessionOptions<T> = LobbyCoordinatorOptions<T>
