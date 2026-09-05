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

export interface BingoMatchCoordinatorOptions {
  transport: ITransport
  localPlayer: PlayerSummary
  remotePlayer: PlayerSummary
  matchStartEvent: MatchStartEvent<BingoBoard>
  turnDurationSeconds?: number
  onGameOver?: (result: WinResult) => void
  enableAutoTurnTimer?: boolean
}

export interface BingoMatchState {
  gameState: BingoState
  turnSecondsRemaining: number
  localPlayer: PlayerSummary
  remotePlayer: PlayerSummary
  winResult: WinResult
}

export class BingoMatchCoordinator {
  public state: BingoMatchState
  private transport: ITransport
  private turnDurationSeconds: number
  private enableAutoTurnTimer: boolean
  private onGameOver?: (result: WinResult) => void

  private timerInterval: ReturnType<typeof setInterval> | null = null
  private listeners = new Set<() => void>()
  private reactionListeners = new Set<(reaction: BingoReaction) => void>()
  private unsubscribers: Array<() => void> = []

  constructor(options: BingoMatchCoordinatorOptions) {
    this.transport = options.transport
    this.turnDurationSeconds = options.turnDurationSeconds ?? 30
    this.enableAutoTurnTimer = options.enableAutoTurnTimer ?? true
    this.onGameOver = options.onGameOver

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
    }

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
      }
    })

    this.unsubscribers.push(unsubMsg)
  }

  public submitMove(number: number): boolean {
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
      this.notify()
      this.onGameOver?.(winResult)
      return
    }

    this.resetTurnTimer()
    this.notify()
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
    this.unsubscribers.forEach((unsub) => unsub())
    this.unsubscribers = []
    this.listeners.clear()
    this.reactionListeners.clear()
  }
}
