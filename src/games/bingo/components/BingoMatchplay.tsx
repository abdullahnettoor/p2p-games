'use client'

import React, { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { BingoMatchCoordinator, PlayerSummary } from '../state/BingoMatchCoordinator'
import { useBingoMatch } from '../state/useBingoMatch'
import { useBingoAudio } from '../hooks/useBingoAudio'
import { useBingoTurnAttention } from '../hooks/useBingoTurnAttention'
import { useBingoMatchAnnouncements } from '../hooks/useBingoMatchAnnouncements'
import { getCalls } from '../engine'
import { BingoPlayerInk, getBingoInkPresentation } from '../bingoInk'
import { BingoBoardView } from './BingoBoardView'
import { BingoLetterTracker } from './BingoLetterTracker'
import { BingoTurnTimer } from './BingoTurnTimer'
import { BingoSoundToggle } from './BingoSoundToggle'
import { BingoReactionBar } from './BingoReactionBar'
import { BingoReactionOverlay } from './BingoReactionOverlay'
import { BingoMatchNotes } from './BingoMatchNotes'
import { BingoGameOverModal } from './BingoGameOverModal'
import { BingoReconnectionBanner } from './BingoReconnectionBanner'
import { cn } from '@/lib/utils'
import styles from './BingoMatchplay.module.css'

interface PlayerLedgerEntryProps {
  player: PlayerSummary
  relationship: string
  completedLines: number
}

const PlayerLedgerEntry: React.FC<PlayerLedgerEntryProps> = ({
  player,
  relationship,
  completedLines,
}) => {
  const ink = getBingoInkPresentation(player.role)

  return (
    <div className={cn(styles.playerEntry, styles.playerInk)} data-ink={player.role}>
      <div className={styles.playerIdentity}>
        <span
          role="img"
          data-mark-shape={ink.markShape}
          className={styles.inkDot}
          aria-label={`${ink.label}, ${ink.markShape} mark`}
        />
        <span className={styles.playerName}>{player.name}</span>
      </div>
      <div className={styles.playerMeta}>
        <span>{relationship}</span>
        <span>{completedLines}/5 lines</span>
      </div>
    </div>
  )
}

export interface BingoMatchplayProps {
  coordinator: BingoMatchCoordinator
  onExit: () => void
  className?: string
}


export const BingoMatchplay: React.FC<BingoMatchplayProps> = ({
  coordinator,
  onExit,
  className,
}) => {
  const { state, isMyTurn, submitMove, passTurn } = useBingoMatch(coordinator)
  const { isMuted, toggleMute } = useBingoAudio(state)
  const announcement = useBingoMatchAnnouncements(state)
  const [isPassConfirming, setIsPassConfirming] = useState(false)

  const localPlayer = state.localPlayer
  const remotePlayer = state.remotePlayer
  const myBoard = state.gameState.boards[localPlayer.id] || []
  const myLines = state.gameState.completedLines[localPlayer.id] || 0
  const myLineDetails = state.gameState.lineDetails[localPlayer.id]
  const remoteLines = state.gameState.completedLines[remotePlayer.id] || 0
  const calls = getCalls(state.gameState.history)
  const latestCall = calls.length > 0 ? calls[calls.length - 1] : null
  const isGameOver = state.winResult.isGameOver
  const playersById: Record<string, BingoPlayerInk> = {
    [localPlayer.id]: { name: localPlayer.name, role: localPlayer.role },
    [remotePlayer.id]: { name: remotePlayer.name, role: remotePlayer.role },
  }
  const activePlayerName = isMyTurn ? localPlayer.name : remotePlayer.name
  const latestCaller = latestCall
    ? latestCall.playerId === localPlayer.id
      ? localPlayer
      : remotePlayer
    : null

  useBingoTurnAttention({
    activePlayerId: state.gameState.activePlayerId,
    localPlayerId: localPlayer.id,
    secondsRemaining: state.turnSecondsRemaining,
  })

  useEffect(() => {
    if (!isMyTurn || isGameOver || state.isReconnecting) setIsPassConfirming(false)
  }, [isGameOver, isMyTurn, state.isReconnecting])

  const confirmPass = () => {
    passTurn()
    setIsPassConfirming(false)
  }

  return (
    <div className={cn('bingoTokenScope', styles.matchSurface, className)}>
      <BingoReactionOverlay coordinator={coordinator} />

      <div className={styles.utilityBar}>
        <button type="button" onClick={onExit} className={styles.utilityButton}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Exit Match</span>
        </button>
        <BingoSoundToggle
          isMuted={isMuted}
          onToggle={toggleMute}
          showLabel
        />
      </div>

      <BingoReconnectionBanner
        isReconnecting={state.isReconnecting}
        secondsRemaining={state.reconnectSecondsRemaining}
        remotePlayerName={remotePlayer.name}
        className={styles.reconnection}
      />

      <main className={styles.scoreSheet} aria-label="Bingo scorecard">
        <header className={styles.sheetHeader}>
          <h1 className={styles.masthead}>BINGO</h1>
          <span className={styles.issueLabel}>Two-player match scorecard</span>
        </header>

        <div className={styles.playerLedger} aria-label="Players and line scores">
          <PlayerLedgerEntry
            player={localPlayer}
            relationship="Your ink"
            completedLines={myLines}
          />
          <PlayerLedgerEntry
            player={remotePlayer}
            relationship="Opponent"
            completedLines={remoteLines}
          />
        </div>

        <section className={styles.turnStrip} aria-label="Current turn">
          <div className={styles.turnCopy}>
            <span className={styles.turnLabel}>
              {isMyTurn ? 'Your turn' : `${activePlayerName}'s turn`}
            </span>
            <span className={styles.turnInstruction}>
              {isMyTurn ? 'Tap one unmarked number to call it.' : 'Their Call will appear on your scorecard.'}
            </span>
          </div>

          <div className={styles.turnActions}>
            {isMyTurn ? (
              <div className={styles.passGroup}>
                {!isPassConfirming ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsPassConfirming(true)}
                      disabled={isGameOver || state.isReconnecting}
                      className={styles.passButton}
                    >
                      Pass turn
                    </button>
                    <span className={styles.passHint}>Ends your turn</span>
                  </>
                ) : (
                  <div className={styles.passConfirmation} role="group" aria-label="Confirm passing your turn">
                    <p>Passing ends your turn. {remotePlayer.name} is next.</p>
                    <div className={styles.passConfirmationActions}>
                      <button type="button" onClick={confirmPass} className={styles.passConfirmButton}>
                        Pass and end turn
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPassConfirming(false)}
                        className={styles.passCancelButton}
                      >
                        Keep turn
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            <BingoTurnTimer
              secondsRemaining={state.turnSecondsRemaining}
              isMyTurn={isMyTurn}
            />
          </div>
        </section>

        {announcement ? (
          <p className="bingoSrOnly" role="status" aria-live="polite" aria-atomic="true">
            {announcement}
          </p>
        ) : null}

        <div className={styles.callSlipSlot}>
          {latestCall && latestCaller ? (
            <aside
              key={latestCall.sequence}
              role="status"
              aria-label="Latest Call"
              className={cn(styles.callSlip, styles.playerInk)}
              data-ink={latestCaller.role}
            >
              <span className={styles.callSlipLabel}>{latestCaller.name} called</span>
              <strong className={styles.callSlipNumber}>{latestCall.number}</strong>
            </aside>
          ) : null}
        </div>

        <div className={styles.progressRow}>
          <span className={styles.progressLabel}>Your line stamps</span>
          <BingoLetterTracker
            completedLines={myLines}
            ownerRole={localPlayer.role}
          />
        </div>

        <BingoBoardView
          board={myBoard}
          calls={calls}
          playersById={playersById}
          boardOwnerRole={localPlayer.role}
          lineDetails={myLineDetails}
          ariaLabel={`${localPlayer.name}'s Bingo board`}
          isMyTurn={isMyTurn}
          onPickNumber={submitMove}
          disabled={!isMyTurn || isGameOver || state.isReconnecting}
        />

        <section className={styles.history} aria-label="Recent Calls">
          <div className={styles.historyHeader}>
            <span>Recent Calls</span>
            <span>{calls.length}/25 called</span>
          </div>
          <div className={styles.historyList}>
            {calls.length === 0 ? (
              <span className={styles.turnInstruction}>No Calls yet.</span>
            ) : (
              calls.slice(-4).map((call, index, recentCalls) => {
                const caller = playersById[call.playerId]
                const ink = getBingoInkPresentation(caller.role)
                return (
                  <span
                    key={call.sequence}
                    data-ink={caller.role}
                    data-latest={index === recentCalls.length - 1 ? 'true' : 'false'}
                    className={cn(styles.historyItem, styles.playerInk)}
                    aria-label={`${call.number}, called by ${caller.name}`}
                  >
                    <span className={styles.historyMark} aria-hidden="true">{ink.markGlyph}</span>
                    {call.number}
                  </span>
                )
              })
            )}
          </div>
        </section>

        <BingoMatchNotes history={state.gameState.history} playersById={playersById} />
      </main>

      <div className={styles.reactionDock}>
        <BingoReactionBar
          onSendReaction={(emoji) => coordinator.sendReaction(emoji)}
          disabled={isGameOver || state.isReconnecting}
        />
      </div>

      {isGameOver ? (
        <BingoGameOverModal
          winResult={state.winResult}
          localPlayer={localPlayer}
          remotePlayer={remotePlayer}
          localCompletedLines={myLines}
          remoteCompletedLines={remoteLines}
          totalCalledCount={calls.length}
          localBoard={myBoard}
          remoteBoard={state.gameState.boards[remotePlayer.id] || []}
          calls={calls}
          playersById={playersById}
          localLineDetails={myLineDetails}
          remoteLineDetails={state.gameState.lineDetails[remotePlayer.id]}
          history={state.gameState.history}
          rematchState={state.rematchState}
          onRequestRematch={() => coordinator.requestRematch()}
          onAcceptRematch={() => coordinator.acceptRematch()}
          onDeclineRematch={() => coordinator.declineRematch()}
          onExit={onExit}
        />
      ) : null}
    </div>
  )
}
