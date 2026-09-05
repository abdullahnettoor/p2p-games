import { ITransport, TransportMessage } from '@/core/transport/types'
import { MatchStartEvent } from '@/core/lobby/types'
import { WinResult } from '@/core/games/types'
import { BingoBoard, BingoMove, BingoState, BingoTurnEvent } from '../types'
import { bingoGameDefinition, parseBingoMove, replayBingoHistory } from '../engine'

export interface PlayerSummary {
  id: string
  name: string
  role: 'host' | 'guest'
}

export interface BingoReaction {
  id: string
  emoji: string
  senderId: string
  senderName: string
  isLocal: boolean
  timestamp: number
}

export type RematchState = 'none' | 'requested' | 'received' | 'accepted' | 'declined'

export interface BingoMatchCoordinatorOptions {
  transport: ITransport
  localPlayer: PlayerSummary
  remotePlayer: PlayerSummary
  matchStartEvent: MatchStartEvent<BingoBoard>
  turnDurationSeconds?: number
  onGameOver?: (result: WinResult) => void
  onRematch?: () => void
  enableAutoTurnTimer?: boolean
}

interface BingoSyncState {
  history: BingoTurnEvent[]
  turnSecondsRemaining: number
}

export interface BingoMatchState {
  gameState: BingoState
  turnSecondsRemaining: number
  localPlayer: PlayerSummary
  remotePlayer: PlayerSummary
  winResult: WinResult
  isReconnecting: boolean
  reconnectSecondsRemaining: number
  rematchState: RematchState
}

export const BINGO_ACTIVE_MATCH_STORAGE_KEY = 'games:bingo:active-match'

export interface CachedBingoMatch {
  localPlayer: PlayerSummary
  remotePlayer: PlayerSummary
  status: BingoState['status']
  history: BingoTurnEvent[]
  turnSecondsRemaining: number
  matchStartEvent: MatchStartEvent<BingoBoard>
  updatedAt: number
}

export class BingoMatchCoordinator {
  public state: BingoMatchState
  private transport: ITransport
  private turnDurationSeconds: number
  private enableAutoTurnTimer: boolean
  private onGameOver?: (result: WinResult) => void
  private onRematch?: () => void
  private matchStartEvent: MatchStartEvent<BingoBoard>

  private timerInterval: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setInterval> | null = null
  private listeners = new Set<() => void>()
  private reactionListeners = new Set<(reaction: BingoReaction) => void>()
  private unsubscribers: Array<() => void> = []
  private pendingForfeitResolve: (() => void) | null = null

  public static getCachedMatch(): CachedBingoMatch | null {
    if (typeof window === 'undefined' || !window.localStorage) return null
    try {
      const raw = localStorage.getItem(BINGO_ACTIVE_MATCH_STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  public static clearCachedMatch(): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      localStorage.removeItem(BINGO_ACTIVE_MATCH_STORAGE_KEY)
    } catch {
      // safe ignore
    }
  }

  constructor(options: BingoMatchCoordinatorOptions) {
    this.transport = options.transport
    this.turnDurationSeconds = options.turnDurationSeconds ?? 30
    this.enableAutoTurnTimer = options.enableAutoTurnTimer ?? true
    this.onGameOver = options.onGameOver
    this.onRematch = options.onRematch
    this.matchStartEvent = options.matchStartEvent

    const { matchStartEvent, localPlayer, remotePlayer } = options

    const initialState = bingoGameDefinition.init({
      players: [matchStartEvent.hostId, matchStartEvent.guestId],
      setupConfigs: {
        [matchStartEvent.hostId]: { board: matchStartEvent.hostSetup },
        [matchStartEvent.guestId]: { board: matchStartEvent.guestSetup },
      },
      startingPlayerId: matchStartEvent.startingPlayerId,
    })

    this.state = {
      gameState: initialState,
      turnSecondsRemaining: this.turnDurationSeconds,
      localPlayer,
      remotePlayer,
      winResult: { isGameOver: false, winnerId: null },
      isReconnecting: false,
      reconnectSecondsRemaining: 30,
      rematchState: 'none',
    }

    this.persistActiveMatch()
    this.bindTransport()
    this.startTurnTimer()
  }

  public get isMyTurn(): boolean {
    return this.state.gameState.activePlayerId === this.state.localPlayer.id
  }

  public get winResult(): WinResult {
    return this.state.winResult
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  public onReaction(listener: (reaction: BingoReaction) => void): () => void {
    this.reactionListeners.add(listener)
    return () => this.reactionListeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }

  private notifyReaction(reaction: BingoReaction): void {
    this.reactionListeners.forEach((listener) => listener(reaction))
  }

  private generateReactionId(timestamp: number): string {
    return `rx_${timestamp}_${Math.random().toString(36).substring(2, 7)}`
  }

  public sendReaction(emoji: string): void {
    const timestamp = Date.now()
    const reaction: BingoReaction = {
      id: this.generateReactionId(timestamp),
      emoji,
      senderId: this.state.localPlayer.id,
      senderName: this.state.localPlayer.name,
      isLocal: true,
      timestamp,
    }

    // Broadcast reaction across Transport
    this.transport.send({
      type: 'reaction',
      payload: {
        emoji,
        playerId: this.state.localPlayer.id,
        timestamp,
      },
    })

    // Emit local reaction event
    this.notifyReaction(reaction)
  }

  private bindTransport(): void {
    const unsubMsg = this.transport.onMessage((message) => {
      if (message.type === 'move') {
        const movePayload = message.payload
        const move = parseBingoMove(movePayload.move)
        if (
          !move ||
          movePayload.playerId !== move.playerId ||
          move.playerId !== this.state.remotePlayer.id
        ) {
          console.warn('Received malformed move from opponent')
          return
        }

        const validation = bingoGameDefinition.validateMove(
          this.state.gameState,
          move,
          move.playerId
        )
        if (!validation.valid) {
          console.warn('Received invalid move from opponent:', validation.reason)
          return
        }

        this.processMove(move)
      } else if (message.type === 'reaction') {
        const payload = message.payload
        const reaction: BingoReaction = {
          id: this.generateReactionId(payload.timestamp),
          emoji: payload.emoji,
          senderId: payload.playerId,
          senderName: this.state.remotePlayer.name,
          isLocal: false,
          timestamp: payload.timestamp,
        }
        this.notifyReaction(reaction)
        } else if (message.type === 'rematch') {
          const { rematchIntent } = message.payload
          if (rematchIntent === 'request') {
            this.state = {
              ...this.state,
              rematchState: 'received',
            }
            this.notify()
          } else if (rematchIntent === 'accept') {
            this.state = {
              ...this.state,
              rematchState: 'accepted',
            }
            this.notify()
            this.onRematch?.()
          } else if (rematchIntent === 'decline') {
            this.state = {
              ...this.state,
              rematchState: 'declined',
            }
            this.notify()
          }
        } else if (message.type === 'sync') {
          this.reconcileState(message.payload.state)
        } else if (message.type === 'forfeit') {
          if (message.payload.playerId === this.state.remotePlayer.id) {
            this.applyForfeit(message.payload.playerId)
            if (this.transport.status === 'connected') {
              this.transport.send({
                type: 'forfeit_ack',
                payload: { playerId: message.payload.playerId },
              })
            }
          }
        } else if (message.type === 'forfeit_ack') {
          if (message.payload.playerId === this.state.localPlayer.id) {
            this.pendingForfeitResolve?.()
            this.pendingForfeitResolve = null
          }
        }
      })

      const unsubLeave = this.transport.onPlayerLeave((playerId) => {
        if (playerId === this.state.remotePlayer.id) {
          this.startReconnectionCountdown()
        }
      })

      const unsubJoin = this.transport.onPlayerJoin((playerId) => {
        if (playerId === this.state.remotePlayer.id) {
          this.stopReconnectionCountdown()
          this.sendStateSync()
        }
      })

      const unsubStatus = this.transport.onStatusChange((status) => {
        if (status === 'disconnected' || status === 'reconnecting') {
          this.startReconnectionCountdown()
        } else if (status === 'connected') {
          this.stopReconnectionCountdown()
        }
      })

      this.unsubscribers.push(unsubMsg, unsubLeave, unsubJoin, unsubStatus)
    }

    private sendStateSync(): void {
      if (this.transport.status === 'connected') {
        this.transport.send({
          type: 'sync',
          payload: {
            state: {
              history: this.state.gameState.history,
              turnSecondsRemaining: this.state.turnSecondsRemaining,
            } satisfies BingoSyncState,
            timestamp: Date.now(),
          },
        })
      }
    }

    private reconcileState(value: unknown): void {
      if (!value || typeof value !== 'object') return

      const syncState = value as Record<string, unknown>
      const updatedGameState = replayBingoHistory(
        {
          players: [this.matchStartEvent.hostId, this.matchStartEvent.guestId],
          setupConfigs: {
            [this.matchStartEvent.hostId]: { board: this.matchStartEvent.hostSetup },
            [this.matchStartEvent.guestId]: { board: this.matchStartEvent.guestSetup },
          },
          startingPlayerId: this.matchStartEvent.startingPlayerId,
        },
        syncState.history
      )
      if (!updatedGameState) {
        console.warn('Ignored invalid BINGO sync history')
        return
      }

      const localHistory = this.state.gameState.history
      const history = updatedGameState.history
      const historiesAgree = localHistory.every((event, index) => {
        const remoteEvent = history[index]
        return (
          remoteEvent !== undefined &&
          event.type === remoteEvent.type &&
          event.playerId === remoteEvent.playerId &&
          event.sequence === remoteEvent.sequence &&
          (event.type === 'call'
            ? remoteEvent.type === 'call' && event.number === remoteEvent.number
            : remoteEvent.type === 'pass' && event.reason === remoteEvent.reason)
        )
      })
      if (!historiesAgree || history.length < localHistory.length) {
        console.warn('Ignored incompatible BINGO sync history')
        return
      }

      const winResult = bingoGameDefinition.checkWin(updatedGameState)
      const remoteTurnSecondsRemaining = syncState.turnSecondsRemaining
      const syncedSeconds =
        typeof remoteTurnSecondsRemaining === 'number' && Number.isFinite(remoteTurnSecondsRemaining)
          ? Math.max(0, Math.min(this.turnDurationSeconds, Math.floor(remoteTurnSecondsRemaining)))
          : this.state.turnSecondsRemaining

      this.state = {
        ...this.state,
        gameState: updatedGameState,
        turnSecondsRemaining:
          history.length === localHistory.length
            ? Math.min(this.state.turnSecondsRemaining, syncedSeconds)
            : syncedSeconds,
        winResult,
      }

      if (winResult.isGameOver) {
        this.stopTurnTimer()
        BingoMatchCoordinator.clearCachedMatch()
        this.notify()
        this.onGameOver?.(winResult)
        return
      }

      this.persistActiveMatch()
      this.startTurnTimer()
      this.notify()
    }


    private setAndSendRematch(rematchState: RematchState, intent: 'request' | 'accept' | 'decline'): void {
      this.state = {
        ...this.state,
        rematchState,
      }
      this.transport.send({
        type: 'rematch',
        payload: {
          rematchIntent: intent,
          playerId: this.state.localPlayer.id,
        },
      })
      this.notify()
    }

    public requestRematch(): void {
      if (this.state.rematchState === 'requested' || this.state.rematchState === 'accepted') return
      this.setAndSendRematch('requested', 'request')
    }

    public acceptRematch(): void {
      this.setAndSendRematch('accepted', 'accept')
      this.onRematch?.()
    }

    public declineRematch(): void {
      this.setAndSendRematch('declined', 'decline')
    }

  private persistActiveMatch(): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    if (this.state.gameState.status !== 'active') {
      BingoMatchCoordinator.clearCachedMatch()
      return
    }
    try {
      const cached: CachedBingoMatch = {
        localPlayer: this.state.localPlayer,
        remotePlayer: this.state.remotePlayer,
        status: this.state.gameState.status,
        history: this.state.gameState.history,
        turnSecondsRemaining: this.state.turnSecondsRemaining,
        matchStartEvent: this.matchStartEvent,
        updatedAt: Date.now(),
      }
      localStorage.setItem(BINGO_ACTIVE_MATCH_STORAGE_KEY, JSON.stringify(cached))
    } catch {
      // safe ignore
    }
  }

  public submitMove(number: number): boolean {
    if (this.state.isReconnecting) return false
    if (!this.isMyTurn) return false
    if (this.state.gameState.status !== 'active') return false

    return this.submitBingoMove({
      type: 'CALL_NUMBER',
      number,
      playerId: this.state.localPlayer.id,
    })
  }

  public passTurn(): boolean {
    return this.submitPass('voluntary')
  }

  public async forfeit(): Promise<void> {
    if (this.state.gameState.status !== 'active') return

    if (this.transport.status !== 'connected') {
      this.applyForfeit(this.state.localPlayer.id)
      return
    }

    let acknowledgedSynchronously = false
    const acknowledgement = new Promise<void>((resolve) => {
      this.pendingForfeitResolve = () => {
        acknowledgedSynchronously = true
        resolve()
      }
    })

    try {
      this.transport.send({
        type: 'forfeit',
        payload: { playerId: this.state.localPlayer.id },
      })
    } catch {
      this.pendingForfeitResolve = null
    }

    if (!acknowledgedSynchronously) {
      await Promise.race([
        acknowledgement,
        new Promise<void>((resolve) => setTimeout(resolve, 500)),
      ])
    }
    this.pendingForfeitResolve = null
    this.applyForfeit(this.state.localPlayer.id)
  }

  private submitPass(reason: 'voluntary' | 'timeout'): boolean {
    return this.submitBingoMove({
      type: 'PASS',
      playerId: this.state.localPlayer.id,
      reason,
    })
  }

  private submitBingoMove(move: BingoMove): boolean {
    if (this.state.isReconnecting) return false
    if (!this.isMyTurn) return false
    if (this.state.gameState.status !== 'active') return false

    const validation = bingoGameDefinition.validateMove(
      this.state.gameState,
      move,
      this.state.localPlayer.id
    )
    if (!validation.valid) return false

    this.transport.send({
      type: 'move',
      payload: {
        move,
        playerId: this.state.localPlayer.id,
        timestamp: Date.now(),
      },
    })

    this.processMove(move)
    return true
  }

  private processMove(move: BingoMove): void {
    const nextState = bingoGameDefinition.applyMove(this.state.gameState, move)
    const winResult = bingoGameDefinition.checkWin(nextState)

    this.state = {
      ...this.state,
      gameState: nextState,
      turnSecondsRemaining: this.turnDurationSeconds,
      winResult,
    }

    if (winResult.isGameOver) {
      this.stopTurnTimer()
      BingoMatchCoordinator.clearCachedMatch()
      this.notify()
      this.onGameOver?.(winResult)
      return
    }

    this.persistActiveMatch()
    this.resetTurnTimer()
    this.notify()
  }

  private startReconnectionCountdown(): void {
    if (this.reconnectTimer) return
    if (this.state.gameState.status !== 'active') return

    this.stopTurnTimer()

    this.state = {
      ...this.state,
      isReconnecting: true,
      reconnectSecondsRemaining: 30,
    }
    this.notify()

    this.reconnectTimer = setInterval(() => {
      if (this.state.reconnectSecondsRemaining > 1) {
        this.state = {
          ...this.state,
          reconnectSecondsRemaining: this.state.reconnectSecondsRemaining - 1,
        }
        this.notify()
      } else {
        this.handleReconnectionTimeout()
      }
    }, 1000)
  }

  private stopReconnectionCountdown(): void {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.state.isReconnecting) {
      this.state = {
        ...this.state,
        isReconnecting: false,
        reconnectSecondsRemaining: 30,
      }
      if (this.state.gameState.status === 'active') {
        this.startTurnTimer()
      }
      this.notify()
    }
  }

  private applyForfeit(forfeitingPlayerId: string): void {
    if (this.state.gameState.status !== 'active') return
    const winnerId = forfeitingPlayerId === this.state.localPlayer.id
      ? this.state.remotePlayer.id
      : this.state.localPlayer.id
    const forfeitResult: WinResult = {
      isGameOver: true,
      winnerId,
      reason: 'forfeit',
    }

    this.stopTurnTimer()
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.state = {
      ...this.state,
      isReconnecting: false,
      reconnectSecondsRemaining: 0,
      gameState: {
        ...this.state.gameState,
        status: 'completed',
        winnerId,
      },
      winResult: forfeitResult,
    }
    BingoMatchCoordinator.clearCachedMatch()
    this.notify()
    this.onGameOver?.(forfeitResult)
  }

  private handleReconnectionTimeout(): void {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer)
      this.reconnectTimer = null
    }

    const isLocalClosed = this.transport.status === 'closed'
    const winnerId = isLocalClosed ? this.state.remotePlayer.id : this.state.localPlayer.id

    const forfeitResult: WinResult = {
      isGameOver: true,
      winnerId,
      reason: 'forfeit',
    }

    this.stopTurnTimer()
    this.state = {
      ...this.state,
      isReconnecting: false,
      reconnectSecondsRemaining: 0,
      gameState: {
        ...this.state.gameState,
        status: 'completed',
        winnerId,
      },
      winResult: forfeitResult,
    }

    BingoMatchCoordinator.clearCachedMatch()
    this.notify()
    this.onGameOver?.(forfeitResult)
  }

  private startTurnTimer(): void {
    if (!this.enableAutoTurnTimer) return
    this.stopTurnTimer()

    this.timerInterval = setInterval(() => {
      if (this.state.gameState.status !== 'active') {
        this.stopTurnTimer()
        return
      }

      if (this.state.turnSecondsRemaining > 1) {
        this.state = {
          ...this.state,
          turnSecondsRemaining: this.state.turnSecondsRemaining - 1,
        }
        this.notify()
      } else {
        // Timer expired
        this.handleTurnTimeout()
      }
    }, 1000)
  }

  private resetTurnTimer(): void {
    this.stopTurnTimer()
    this.state = {
      ...this.state,
      turnSecondsRemaining: this.turnDurationSeconds,
    }
    this.startTurnTimer()
  }

  private stopTurnTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }

  private handleTurnTimeout(): void {
    if (this.isMyTurn && this.state.gameState.status === 'active') {
      this.submitPass('timeout')
      return
    }

    this.state = {
      ...this.state,
      turnSecondsRemaining: 0,
    }
    this.notify()
  }

  public destroy(): void {
    this.pendingForfeitResolve?.()
    this.pendingForfeitResolve = null
    this.stopTurnTimer()
    this.stopReconnectionCountdown()
    this.unsubscribers.forEach((unsub) => unsub())
    this.unsubscribers = []
    this.listeners.clear()
    this.reactionListeners.clear()
  }
}
