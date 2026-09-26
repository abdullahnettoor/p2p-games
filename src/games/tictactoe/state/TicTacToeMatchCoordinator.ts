import { ITransport, RematchMessagePayload, TransportMessage } from '@/core/transport/types'
import { WinResult } from '@/core/games/types'
import {
  BestOfSeriesLength,
  RoundStartMessagePayload,
  SeriesState,
} from '@/core/series/types'
import {
  createRoundStartPayload,
  createSeries,
  recordRoundResult,
  validateRoundStartMessage,
} from '@/core/series/series'
import {
  applyMove,
  initState,
  resetRoundFromHostMessage,
  ticTacToeDefinition,
  validateMove,
} from '../engine'
import { TicTacToeMove, TicTacToeState } from '../types'
import {
  CachedTicTacToeMatch,
  PlayerSummary,
  RematchState,
  TICTACTOE_ACTIVE_MATCH_STORAGE_KEY,
  TicTacToeCoordinatorState,
  TicTacToeMatchCoordinatorOptions,
  TicTacToeReaction,
  TicTacToeRoundRecord,
  TicTacToeSyncState,
} from './types'

export const DEFAULT_TURN_DURATION_SECONDS = 15
export const DEFAULT_BETWEEN_ROUNDS_SECONDS = 3
export const DEFAULT_RECONNECT_GRACE_SECONDS = 30

export class TicTacToeMatchCoordinator {
  private transport: ITransport
  private turnDurationSeconds: number
  private enableAutoTurnTimer: boolean
  private onGameOver?: (result: WinResult) => void
  private onRematch?: () => void

  private state: TicTacToeCoordinatorState

  private listeners: Set<() => void> = new Set()
  private reactionListeners: Set<(reaction: TicTacToeReaction) => void> = new Set()

  private turnTimer: NodeJS.Timeout | null = null
  private betweenRoundsTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null

  private unsubscribers: Array<() => void> = []

  public static getCachedMatch(): CachedTicTacToeMatch | null {
    if (typeof window === 'undefined' || !window.localStorage) return null
    try {
      const raw = localStorage.getItem(TICTACTOE_ACTIVE_MATCH_STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  public static clearCachedMatch(): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    try {
      localStorage.removeItem(TICTACTOE_ACTIVE_MATCH_STORAGE_KEY)
    } catch {
      // safe ignore
    }
  }

  constructor(options: TicTacToeMatchCoordinatorOptions) {
    this.transport = options.transport
    this.turnDurationSeconds = options.turnDurationSeconds ?? DEFAULT_TURN_DURATION_SECONDS
    this.enableAutoTurnTimer = options.enableAutoTurnTimer ?? true
    this.onGameOver = options.onGameOver
    this.onRematch = options.onRematch

    const { localPlayer, remotePlayer, bestOf = 3, startingPlayerId } = options
    const hostId = localPlayer.role === 'host' ? localPlayer.id : remotePlayer.id
    const guestId = localPlayer.role === 'guest' ? localPlayer.id : remotePlayer.id
    const players: [string, string] = [hostId, guestId]

    const round1Starter = startingPlayerId ?? hostId

    const seriesState = createSeries({
      bestOf,
      players,
      round1StarterId: round1Starter,
    })

    const roundState = initState({
      hostId,
      guestId,
      startingPlayerId: round1Starter,
    })

    this.state = {
      seriesState,
      currentRoundState: roundState,
      currentRoundMoves: [],
      roundRecords: [],
      turnSecondsRemaining: this.turnDurationSeconds,
      localPlayer,
      remotePlayer,
      isBetweenRounds: false,
      betweenRoundsSecondsRemaining: DEFAULT_BETWEEN_ROUNDS_SECONDS,
      localReadyNextRound: false,
      remoteReadyNextRound: false,
      isHostWaitingInGrace: false,
      isReconnecting: false,
      reconnectSecondsRemaining: DEFAULT_RECONNECT_GRACE_SECONDS,
      rematchState: 'none',
      winResult: { isGameOver: false, winnerId: null },
      status: 'active',
    }

    if (options.initialSyncState) {
      this.applySyncState(options.initialSyncState)
    }

    this.bindTransport()
    this.persistActiveMatch()

    if (!this.state.isBetweenRounds && this.state.status === 'active') {
      this.startTurnTimer()
    }
  }

  public get snapshot(): Readonly<TicTacToeCoordinatorState> {
    return this.state
  }

  public get isMyTurn(): boolean {
    return (
      !this.state.isBetweenRounds &&
      this.state.status === 'active' &&
      this.state.currentRoundState.activePlayerId === this.state.localPlayer.id
    )
  }

  public get isHost(): boolean {
    return this.state.localPlayer.role === 'host'
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  public onReaction(listener: (reaction: TicTacToeReaction) => void): () => void {
    this.reactionListeners.add(listener)
    return () => this.reactionListeners.delete(listener)
  }

  private notify(): void {
    this.listeners.forEach((l) => l())
  }

  private notifyReaction(reaction: TicTacToeReaction): void {
    this.reactionListeners.forEach((l) => l(reaction))
  }

  private persistActiveMatch(): void {
    if (typeof window === 'undefined' || !window.localStorage) return
    if (this.state.status !== 'active') {
      TicTacToeMatchCoordinator.clearCachedMatch()
      return
    }

    try {
      const cached: CachedTicTacToeMatch = {
        matchId: (this.transport as { getMatchId?: () => string }).getMatchId?.() ?? 'tictactoe-active-match',
        localPlayer: this.state.localPlayer,
        remotePlayer: this.state.remotePlayer,
        bestOf: this.state.seriesState.bestOf,
        seriesState: this.state.seriesState,
        currentRoundState: this.state.currentRoundState,
        currentRoundMoves: this.state.currentRoundMoves,
        roundRecords: this.state.roundRecords,
        turnSecondsRemaining: this.state.turnSecondsRemaining,
        isBetweenRounds: this.state.isBetweenRounds,
        status: this.state.status,
        updatedAt: Date.now(),
      }
      localStorage.setItem(TICTACTOE_ACTIVE_MATCH_STORAGE_KEY, JSON.stringify(cached))
    } catch {
      // safe ignore
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Transport Message Handlers & Binding                                       */
  /* -------------------------------------------------------------------------- */

  private bindTransport(): void {
    const unsubMessage = this.transport.onMessage((msg: TransportMessage) => {
      this.handleTransportMessage(msg)
    })
    this.unsubscribers.push(unsubMessage)

    if (this.transport.onPlayerLeave) {
      const unsubLeave = this.transport.onPlayerLeave((playerId: string) => {
        if (playerId === this.state.remotePlayer.id) {
          this.handleRemoteDisconnect()
        }
      })
      this.unsubscribers.push(unsubLeave)
    }

    if (this.transport.onPlayerJoin) {
      const unsubJoin = this.transport.onPlayerJoin((playerId: string) => {
        if (playerId === this.state.remotePlayer.id) {
          this.handleRemoteReconnect()
        }
      })
      this.unsubscribers.push(unsubJoin)
    }

    if (this.transport.onStatusChange) {
      const unsubStatus = this.transport.onStatusChange((status) => {
        if (status === 'disconnected' || status === 'reconnecting' || status === 'closed') {
          this.handleRemoteDisconnect()
        } else if (status === 'connected') {
          this.handleRemoteReconnect()
        }
      })
      this.unsubscribers.push(unsubStatus)
    }
  }

  private handleTransportMessage(msg: TransportMessage): void {
    switch (msg.type) {
      case 'move': {
        const payload = msg.payload as {
          move: TicTacToeMove
          playerId: string
          timestamp: number
        }
        if (payload?.move && payload.playerId === this.state.remotePlayer.id) {
          this.applyIncomingMove(payload.move)
        }
        break
      }

      case 'round_start': {
        const payload = msg.payload as RoundStartMessagePayload
        if (payload) {
          this.handleIncomingRoundStart(payload)
        }
        break
      }

      case 'ready': {
        this.handleRemoteReady()
        break
      }

      case 'reaction': {
        const payload = msg.payload as {
          emoji: string
          playerId: string
          timestamp: number
        }
        if (payload?.emoji) {
          const reaction: TicTacToeReaction = {
            id: `rx_${payload.timestamp}_${Math.random().toString(36).substring(2, 6)}`,
            emoji: payload.emoji,
            playerId: payload.playerId,
            timestamp: payload.timestamp,
          }
          this.notifyReaction(reaction)
        }
        break
      }

      case 'forfeit': {
        this.handleRemoteForfeit()
        break
      }

      case 'forfeit_ack': {
        // Ack received for local forfeit
        break
      }

      case 'sync': {
        const payload = msg.payload as { state: TicTacToeSyncState; timestamp: number }
        if (payload?.state) {
          this.applySyncState(payload.state)
        }
        break
      }

      case 'rematch': {
        const payload = msg.payload as RematchMessagePayload
        if (payload) {
          this.handleRematchMessage(payload)
        }
        break
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Move Logic (ADR 0003: Both peers validate every move)                     */
  /* -------------------------------------------------------------------------- */

  public submitMove(cellIndex: number): boolean {
    if (this.state.status !== 'active') return false
    if (this.state.isBetweenRounds) return false
    if (this.state.isReconnecting) return false
    if (!this.isMyTurn) return false

    const move: TicTacToeMove = {
      type: 'place',
      cellIndex,
      playerId: this.state.localPlayer.id,
    }

    const validation = validateMove(this.state.currentRoundState, move)
    if (!validation.valid) {
      return false
    }

    this.applyLocalMove(move)
    return true
  }

  public submitPass(): boolean {
    if (this.state.status !== 'active') return false
    if (this.state.isBetweenRounds) return false
    if (!this.isMyTurn) return false

    const move: TicTacToeMove = {
      type: 'pass',
      playerId: this.state.localPlayer.id,
    }

    this.applyLocalMove(move)
    return true
  }

  private applyLocalMove(move: TicTacToeMove): void {
    const newState = applyMove(this.state.currentRoundState, move)
    this.state.currentRoundState = newState
    this.state.currentRoundMoves.push(move)

    // Broadcast move to remote peer over transport
    this.transport.send({
      type: 'move',
      payload: {
        move,
        playerId: this.state.localPlayer.id,
        timestamp: Date.now(),
      },
    })

    this.onMoveApplied()
  }

  private applyIncomingMove(move: TicTacToeMove): void {
    if (this.state.status !== 'active') return
    if (this.state.isBetweenRounds) return

    // Validate incoming move locally (ADR 0003: both peers validate every move)
    const validation = validateMove(this.state.currentRoundState, move)
    if (!validation.valid) {
      console.warn('Rejected invalid incoming move from remote peer:', validation.reason)
      return
    }

    const newState = applyMove(this.state.currentRoundState, move)
    this.state.currentRoundState = newState
    this.state.currentRoundMoves.push(move)

    this.onMoveApplied()
  }

  private onMoveApplied(): void {
    this.resetTurnTimer()
    this.persistActiveMatch()
    this.notify()

    const roundOver = this.state.currentRoundState.status === 'completed'
    if (roundOver) {
      this.handleRoundEnd()
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Turn Timer (15-second expiry passes turn)                                  */
  /* -------------------------------------------------------------------------- */

  private startTurnTimer(): void {
    this.stopTurnTimer()
    if (!this.enableAutoTurnTimer) return

    this.turnTimer = setInterval(() => {
      // Pause turn timer during reconnect grace or while transport not connected
      if (this.state.isReconnecting || this.transport.status !== 'connected') {
        return
      }

      if (this.state.turnSecondsRemaining > 1) {
        this.state.turnSecondsRemaining -= 1
        this.notify()
      } else {
        // Expiry passes the turn
        this.state.turnSecondsRemaining = 0
        this.notify()
        if (this.isMyTurn) {
          this.submitPass()
        }
      }
    }, 1000)
  }

  private resetTurnTimer(): void {
    this.state.turnSecondsRemaining = this.turnDurationSeconds
    this.startTurnTimer()
  }

  private stopTurnTimer(): void {
    if (this.turnTimer) {
      clearInterval(this.turnTimer)
      this.turnTimer = null
    }
  }

  /* -------------------------------------------------------------------------- */
  /* Round Completion & Series Flow                                            */
  /* -------------------------------------------------------------------------- */

  private handleRoundEnd(): void {
    this.stopTurnTimer()

    const round = this.state.currentRoundState
    const winnerId = round.winnerId
    const isDraw = round.isDraw
    const currentRoundNum = this.state.seriesState.currentRoundNumber
    const startingPlayerId = this.state.seriesState.currentRoundStarterId

    const updatedSeries = recordRoundResult(this.state.seriesState, {
      winnerId: isDraw ? null : winnerId,
      isDraw,
    })

    const roundRecord: TicTacToeRoundRecord = {
      roundNumber: currentRoundNum,
      startingPlayerId,
      winnerId: isDraw ? null : winnerId,
      isDraw,
      winningLine: round.winningLine ?? null,
    }

    this.state.seriesState = updatedSeries
    this.state.roundRecords.push(roundRecord)
    this.state.isBetweenRounds = true
    this.state.localReadyNextRound = false
    this.state.remoteReadyNextRound = false
    this.state.betweenRoundsSecondsRemaining = DEFAULT_BETWEEN_ROUNDS_SECONDS

    // Check if entire match is decided
    if (updatedSeries.status === 'completed') {
      this.finishMatch({
        isGameOver: true,
        winnerId: updatedSeries.winnerId,
        isDraw: updatedSeries.isDraw,
      })
      return
    }

    this.persistActiveMatch()
    this.notify()
    this.startBetweenRoundsCountdown()
  }

  private startBetweenRoundsCountdown(): void {
    this.stopBetweenRoundsTimer()

    this.betweenRoundsTimer = setInterval(() => {
      // If Host is disconnected / waiting in grace, pause countdown
      if (this.state.isHostWaitingInGrace || this.state.isReconnecting || this.transport.status !== 'connected') {
        return
      }

      if (this.state.betweenRoundsSecondsRemaining > 1) {
        this.state.betweenRoundsSecondsRemaining -= 1
        this.notify()
      } else {
        this.state.betweenRoundsSecondsRemaining = 0
        this.notify()
        this.stopBetweenRoundsTimer()
        this.attemptStartNextRound()
      }
    }, 1000)
  }

  private stopBetweenRoundsTimer(): void {
    if (this.betweenRoundsTimer) {
      clearInterval(this.betweenRoundsTimer)
      this.betweenRoundsTimer = null
    }
  }

  public readyForNextRound(): void {
    if (!this.state.isBetweenRounds || this.state.localReadyNextRound) return

    this.state.localReadyNextRound = true
    this.notify()

    this.transport.send({
      type: 'ready',
      payload: {
        isReady: true,
        playerName: this.state.localPlayer.name,
      },
    })

    this.checkBothReadyNextRound()
  }

  private handleRemoteReady(): void {
    if (!this.state.isBetweenRounds) return

    this.state.remoteReadyNextRound = true
    this.notify()

    this.checkBothReadyNextRound()
  }

  private checkBothReadyNextRound(): void {
    // If both players explicitly tapped "Next", advance immediately without waiting 3s
    if (this.state.localReadyNextRound && this.state.remoteReadyNextRound) {
      this.stopBetweenRoundsTimer()
      this.attemptStartNextRound()
    }
  }

  private attemptStartNextRound(): void {
    if (!this.state.isBetweenRounds) return

    // Host authoritatively starts the next round (ADR 0003)
    if (this.isHost) {
      if (this.state.isReconnecting || this.transport.status !== 'connected') {
        return
      }
      this.hostStartNextRound()
    } else {
      // Guest waits for Host's round_start message
      // If host is disconnected / in grace, isHostWaitingInGrace is shown
      if (this.state.isReconnecting || this.transport.status !== 'connected') {
        this.state.isHostWaitingInGrace = true
        this.notify()
      }
    }
  }

  private hostStartNextRound(): void {
    const timestamp = Date.now()
    const payload = createRoundStartPayload(this.state.seriesState, timestamp)

    this.transport.send({
      type: 'round_start',
      payload,
    })

    this.initNextRound(payload.roundNumber, payload.startingPlayerId)
  }

  private handleIncomingRoundStart(payload: RoundStartMessagePayload): void {
    const validation = validateRoundStartMessage(
      this.state.seriesState,
      payload
    )

    if (!validation.valid) {
      console.warn('Rejected invalid round_start from host:', validation.reason)
      return
    }

    this.state.isHostWaitingInGrace = false
    this.initNextRound(payload.roundNumber, payload.startingPlayerId)
  }

  private initNextRound(roundNumber: number, startingPlayerId: string): void {
    this.stopBetweenRoundsTimer()

    const hostId = this.isHost ? this.state.localPlayer.id : this.state.remotePlayer.id
    const guestId = this.isHost ? this.state.remotePlayer.id : this.state.localPlayer.id

    const newRoundState = initState({
      hostId,
      guestId,
      startingPlayerId,
    })

    this.state.currentRoundState = newRoundState
    this.state.currentRoundMoves = []
    this.state.isBetweenRounds = false
    this.state.localReadyNextRound = false
    this.state.remoteReadyNextRound = false
    this.state.isHostWaitingInGrace = false

    this.resetTurnTimer()
    this.persistActiveMatch()
    this.notify()
  }

  /* -------------------------------------------------------------------------- */
  /* Forfeit Handling                                                           */
  /* -------------------------------------------------------------------------- */

  public forfeit(): void {
    if (this.state.status === 'completed') return

    // Notify peer
    this.transport.send({
      type: 'forfeit',
      payload: { playerId: this.state.localPlayer.id },
    })

    // Local player forfeited -> remote player wins entire match
    this.finishMatch({
      isGameOver: true,
      winnerId: this.state.remotePlayer.id,
      isDraw: false,
      reason: 'forfeit',
    })
  }

  private handleRemoteForfeit(): void {
    if (this.state.status === 'completed') return

    // Ack
    this.transport.send({
      type: 'forfeit_ack',
      payload: { playerId: this.state.localPlayer.id },
    })

    // Remote forfeited -> local player wins entire match
    this.finishMatch({
      isGameOver: true,
      winnerId: this.state.localPlayer.id,
      isDraw: false,
      reason: 'forfeit',
    })
  }

  private finishMatch(result: WinResult): void {
    this.stopTurnTimer()
    this.stopBetweenRoundsTimer()
    this.stopReconnectGraceTimer()

    this.state.winResult = result
    this.state.status = 'completed'
    this.state.isBetweenRounds = false
    this.state.isReconnecting = false

    TicTacToeMatchCoordinator.clearCachedMatch()
    this.notify()
    this.onGameOver?.(result)
  }

  /* -------------------------------------------------------------------------- */
  /* Reconnect Grace & Sync (ADR 0005)                                          */
  /* -------------------------------------------------------------------------- */

  private handleRemoteDisconnect(): void {
    if (this.state.status === 'completed') return
    if (this.state.isReconnecting) return

    this.state.isReconnecting = true
    this.state.reconnectSecondsRemaining = DEFAULT_RECONNECT_GRACE_SECONDS

    // If we are between rounds and remote is host, mark host waiting
    if (this.state.isBetweenRounds && !this.isHost) {
      this.state.isHostWaitingInGrace = true
    }

    this.notify()
    this.startReconnectGraceTimer()
  }

  private startReconnectGraceTimer(): void {
    this.stopReconnectGraceTimer()

    this.reconnectTimer = setInterval(() => {
      if (this.state.reconnectSecondsRemaining > 1) {
        this.state.reconnectSecondsRemaining -= 1
        this.notify()
      } else {
        // Grace period expired: disconnected player forfeits match
        this.state.reconnectSecondsRemaining = 0
        this.stopReconnectGraceTimer()

        this.finishMatch({
          isGameOver: true,
          winnerId: this.state.localPlayer.id,
          isDraw: false,
          reason: 'forfeit',
        })
      }
    }, 1000)
  }

  private stopReconnectGraceTimer(): void {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  private handleRemoteReconnect(): void {
    if (!this.state.isReconnecting) return

    this.stopReconnectGraceTimer()
    this.state.isReconnecting = false
    this.state.isHostWaitingInGrace = false
    this.notify()

    // Host sends authoritative sync state to reconnected peer
    if (this.isHost) {
      this.sendSyncState()
      if (this.state.isBetweenRounds) {
        this.attemptStartNextRound()
      }
    }
  }

  public sendSyncState(): void {
    if (this.transport.status !== 'connected') return

    const sync: TicTacToeSyncState = {
      seriesState: this.state.seriesState,
      currentRoundState: this.state.currentRoundState,
      currentRoundMoves: this.state.currentRoundMoves,
      roundRecords: this.state.roundRecords,
      turnSecondsRemaining: this.state.turnSecondsRemaining,
      isBetweenRounds: this.state.isBetweenRounds,
      localReadyNextRound: this.state.localReadyNextRound,
      remoteReadyNextRound: this.state.remoteReadyNextRound,
    }

    this.transport.send({
      type: 'sync',
      payload: {
        state: sync,
        timestamp: Date.now(),
      },
    })
  }

  public applySyncState(sync: TicTacToeSyncState): void {
    this.state.seriesState = sync.seriesState
    this.state.currentRoundState = sync.currentRoundState
    this.state.currentRoundMoves = sync.currentRoundMoves
    this.state.roundRecords = sync.roundRecords
    this.state.turnSecondsRemaining = sync.turnSecondsRemaining
    this.state.isBetweenRounds = sync.isBetweenRounds
    this.state.localReadyNextRound = sync.remoteReadyNextRound ?? false
    this.state.remoteReadyNextRound = sync.localReadyNextRound ?? false
    this.state.isHostWaitingInGrace = false

    if (this.state.seriesState.status === 'completed') {
      this.finishMatch({
        isGameOver: true,
        winnerId: this.state.seriesState.winnerId,
        isDraw: this.state.seriesState.isDraw,
      })
      return
    }

    if (!this.state.isBetweenRounds && this.state.status === 'active') {
      this.startTurnTimer()
    } else if (this.state.isBetweenRounds) {
      this.startBetweenRoundsCountdown()
    }

    this.persistActiveMatch()
    this.notify()
  }

  /* -------------------------------------------------------------------------- */
  /* Emoji Reactions                                                            */
  /* -------------------------------------------------------------------------- */

  public sendReaction(emoji: string): void {
    const reaction: TicTacToeReaction = {
      id: `rx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      emoji,
      playerId: this.state.localPlayer.id,
      timestamp: Date.now(),
    }

    this.transport.send({
      type: 'reaction',
      payload: {
        emoji,
        playerId: this.state.localPlayer.id,
        timestamp: reaction.timestamp,
      },
    })

    this.notifyReaction(reaction)
  }

  /* -------------------------------------------------------------------------- */
  /* Rematch Handling                                                           */
  /* -------------------------------------------------------------------------- */

  public requestRematch(): void {
    if (this.state.status !== 'completed') return

    this.state.rematchState = 'requested'
    this.notify()

    this.transport.send({
      type: 'rematch',
      payload: {
        rematchIntent: 'request',
        playerId: this.state.localPlayer.id,
      },
    })
  }

  public acceptRematch(): void {
    if (this.state.rematchState !== 'received') return

    this.state.rematchState = 'accepted'
    this.notify()

    this.transport.send({
      type: 'rematch',
      payload: {
        rematchIntent: 'accept',
        playerId: this.state.localPlayer.id,
      },
    })

    this.startNewMatch()
  }

  public declineRematch(): void {
    if (this.state.rematchState !== 'received') return

    this.state.rematchState = 'declined'
    this.notify()

    this.transport.send({
      type: 'rematch',
      payload: {
        rematchIntent: 'decline',
        playerId: this.state.localPlayer.id,
      },
    })
  }

  private handleRematchMessage(payload: RematchMessagePayload): void {
    switch (payload.rematchIntent) {
      case 'request': {
        this.state.rematchState = 'received'
        this.notify()
        break
      }
      case 'accept': {
        this.state.rematchState = 'accepted'
        this.notify()
        this.startNewMatch()
        break
      }
      case 'decline': {
        this.state.rematchState = 'declined'
        this.notify()
        break
      }
    }
  }

  private startNewMatch(): void {
    this.stopTurnTimer()
    this.stopBetweenRoundsTimer()
    this.stopReconnectGraceTimer()

    const hostId = this.isHost ? this.state.localPlayer.id : this.state.remotePlayer.id
    const guestId = this.isHost ? this.state.remotePlayer.id : this.state.localPlayer.id
    const players: [string, string] = [hostId, guestId]

    const newSeries = createSeries({
      bestOf: this.state.seriesState.bestOf,
      players,
      round1StarterId: hostId,
    })

    const initialRoundState = initState({
      hostId,
      guestId,
      startingPlayerId: hostId,
    })

    this.state = {
      seriesState: newSeries,
      currentRoundState: initialRoundState,
      currentRoundMoves: [],
      roundRecords: [],
      turnSecondsRemaining: this.turnDurationSeconds,
      localPlayer: this.state.localPlayer,
      remotePlayer: this.state.remotePlayer,
      isBetweenRounds: false,
      betweenRoundsSecondsRemaining: DEFAULT_BETWEEN_ROUNDS_SECONDS,
      localReadyNextRound: false,
      remoteReadyNextRound: false,
      isHostWaitingInGrace: false,
      isReconnecting: false,
      reconnectSecondsRemaining: DEFAULT_RECONNECT_GRACE_SECONDS,
      rematchState: 'none',
      winResult: { isGameOver: false, winnerId: null },
      status: 'active',
    }

    this.persistActiveMatch()
    this.resetTurnTimer()
    this.notify()
    this.onRematch?.()
  }

  /* -------------------------------------------------------------------------- */
  /* Lifecycle Cleanup                                                          */
  /* -------------------------------------------------------------------------- */

  public destroy(): void {
    this.stopTurnTimer()
    this.stopBetweenRoundsTimer()
    this.stopReconnectGraceTimer()

    this.unsubscribers.forEach((unsub) => unsub())
    this.unsubscribers = []
    this.listeners.clear()
    this.reactionListeners.clear()
  }
}
