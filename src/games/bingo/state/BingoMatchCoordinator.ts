import { ITransport, TransportMessage } from '@/core/transport/types'
import { MatchStartEvent } from '@/core/lobby/types'
import { WinResult } from '@/core/games/types'
import { BingoBoard, BingoMove, BingoState } from '../types'
import { bingoGameDefinition, getAvailableNumbers, TOTAL_NUMBERS } from '../engine'

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
  calledNumbers: number[]
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
        const move = movePayload.move as BingoMove

        const validation = bingoGameDefinition.validateMove(
          this.state.gameState,
          move,
          move.playerId
        )
        if (!validation.valid) {
          console.warn('Received invalid move from opponent:', validation.reason)
          return
        }

        this.processMove(move, false)
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
          this.reconcileState(message.payload.calledNumbers, message.payload.activePlayerId)
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
            calledNumbers: this.state.gameState.calledNumbers,
            activePlayerId: this.state.gameState.activePlayerId,
            timestamp: Date.now(),
          },
        })
      }
    }

    private reconcileState(remoteCalledNumbers: number[], activePlayerId: string): void {
      const currentCalled = new Set(this.state.gameState.calledNumbers)
      let updatedGameState = this.state.gameState

      for (const num of remoteCalledNumbers) {
        if (!currentCalled.has(num)) {
          const move: BingoMove = {
            type: 'PICK_NUMBER',
            number: num,
            playerId: updatedGameState.activePlayerId,
          }
          updatedGameState = bingoGameDefinition.applyMove(updatedGameState, move)
        }
      }

      const winResult = bingoGameDefinition.checkWin(updatedGameState)

      this.state = {
        ...this.state,
        gameState: {
          ...updatedGameState,
          activePlayerId,
        },
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
        calledNumbers: this.state.gameState.calledNumbers,
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

    const move: BingoMove = {
      type: 'PICK_NUMBER',
      number,
      playerId: this.state.localPlayer.id,
    }

    const validation = bingoGameDefinition.validateMove(
      this.state.gameState,
      move,
      this.state.localPlayer.id
    )

    if (!validation.valid) {
      return false
    }

    // Broadcast move to remote player
    this.transport.send({
      type: 'move',
      payload: {
        move,
        playerId: this.state.localPlayer.id,
        timestamp: Date.now(),
      },
    })

    this.processMove(move, true)
    return true
  }

  private processMove(move: BingoMove, _isLocal: boolean): void {
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
    // Only the active Player auto-selects and dispatches the Move
    if (this.isMyTurn && this.state.gameState.status === 'active') {
      const availableNumbers = getAvailableNumbers(this.state.gameState.calledNumbers)

      if (availableNumbers.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableNumbers.length)
        const autoNumber = availableNumbers[randomIndex]
        this.submitMove(autoNumber)
      }
    } else {
      // Non-active player resets local countdown while waiting for the active player's timeout move
      this.state = {
        ...this.state,
        turnSecondsRemaining: 0,
      }
      this.notify()
    }
  }

  public destroy(): void {
    this.stopTurnTimer()
    this.stopReconnectionCountdown()
    this.unsubscribers.forEach((unsub) => unsub())
    this.unsubscribers = []
    this.listeners.clear()
    this.reactionListeners.clear()
  }
}
