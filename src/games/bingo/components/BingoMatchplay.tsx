'use client'

import React, { useEffect, useState } from 'react'
import { ArrowLeft, CircleHelp, FileText, X } from 'lucide-react'
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
import { BingoComparisonScreen, BingoResultScreen } from './BingoResultScreen'
import { BingoReconnectionBanner } from './BingoReconnectionBanner'
import { cn } from '@/lib/utils'
import styles from './BingoMatchplay.module.css'

interface PlayerStatusProps {
  player: PlayerSummary
  relationship: string
  completedLines: number
}

const PlayerStatus: React.FC<PlayerStatusProps> = ({ player, relationship, completedLines }) => {
  const ink = getBingoInkPresentation(player.role)

  return (
    <div className={cn(styles.playerStatus, styles.playerInk)} data-ink={player.role}>
      <div className={styles.playerStatusIdentity}>
        <span
          role="img"
          data-mark-shape={ink.markShape}
          className={styles.inkDot}
          aria-label={`${ink.label}, ${ink.markShape} mark`}
        />
        <div className={styles.playerStatusName}>
          <span className={styles.playerRelationship}>{relationship}</span>
          <strong>{player.name}</strong>
        </div>
      </div>
      <BingoLetterTracker completedLines={completedLines} ownerRole={player.role} className={styles.statusTracker} />
      <span className={styles.lineCount}>{completedLines}/5 lines</span>
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
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [isRulesOpen, setIsRulesOpen] = useState(false)
  const [isExitConfirming, setIsExitConfirming] = useState(false)
  const [resultView, setResultView] = useState<'result' | 'comparison'>('result')

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
    ? latestCall.playerId === localPlayer.id ? localPlayer : remotePlayer
    : null

  useBingoTurnAttention({
    activePlayerId: state.gameState.activePlayerId,
    localPlayerId: localPlayer.id,
    secondsRemaining: state.turnSecondsRemaining,
  })

  useEffect(() => {
    if (!isMyTurn || isGameOver || state.isReconnecting) setIsPassConfirming(false)
  }, [isGameOver, isMyTurn, state.isReconnecting])

  useEffect(() => {
    if (isGameOver || typeof window === 'undefined') return

    const guardEntry = { bingoMatchExitGuard: true }
    window.history.pushState(guardEntry, '', window.location.href)
    const handlePopState = () => {
      window.history.pushState(guardEntry, '', window.location.href)
      setIsExitConfirming(true)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isGameOver])

  const confirmPass = () => {
    passTurn()
    setIsPassConfirming(false)
  }

  const requestExit = () => {
    if (isGameOver) {
      onExit()
    } else {
      setIsExitConfirming(true)
    }
  }

  const confirmExit = async () => {
    await coordinator.forfeit()
    setIsExitConfirming(false)
    onExit()
  }

  if (isGameOver) {
    const resultProps = {
      winResult: state.winResult,
      localPlayer,
      remotePlayer,
      localCompletedLines: myLines,
      remoteCompletedLines: remoteLines,
      totalCalledCount: calls.length,
      localBoard: myBoard,
      remoteBoard: state.gameState.boards[remotePlayer.id] || [],
      calls,
      playersById,
      localLineDetails: myLineDetails,
      remoteLineDetails: state.gameState.lineDetails[remotePlayer.id],
      history: state.gameState.history,
      rematchState: state.rematchState,
      onRequestRematch: () => coordinator.requestRematch(),
      onAcceptRematch: () => coordinator.acceptRematch(),
      onDeclineRematch: () => coordinator.declineRematch(),
      onExit,
      isMuted,
      onToggleMute: toggleMute,
    }

    return resultView === 'comparison' ? (
      <BingoComparisonScreen {...resultProps} onBack={() => setResultView('result')} />
    ) : (
      <BingoResultScreen {...resultProps} onCompareBoards={() => setResultView('comparison')} />
    )
  }

  return (
    <div className={cn('bingoTokenScope', styles.matchSurface, className)}>
      <BingoReactionOverlay coordinator={coordinator} />

      <header className={styles.shellBar}>
        <button type="button" onClick={requestExit} aria-label="Exit Match" className={styles.utilityButton}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Exit</span>
        </button>
        <h1 className={styles.masthead}>BINGO</h1>
        <div className={styles.shellActions}>
          <BingoSoundToggle isMuted={isMuted} onToggle={toggleMute} />
          <button
            type="button"
            onClick={() => setIsRulesOpen(true)}
            aria-label="Bingo rules"
            aria-expanded={isRulesOpen}
            className={styles.rulesButton}
          >
            <CircleHelp className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Rules</span>
          </button>
        </div>
      </header>

      <BingoReconnectionBanner
        isReconnecting={state.isReconnecting}
        secondsRemaining={state.reconnectSecondsRemaining}
        remotePlayerName={remotePlayer.name}
        className={styles.reconnection}
      />

      <main className={styles.matchContent} aria-label="Bingo scorecard">
        <section className={styles.statusStrip} aria-label="Match status">
          <div className={styles.playerStatuses} aria-label="Players, lines, and stamps">
            <PlayerStatus player={localPlayer} relationship="Your ink" completedLines={myLines} />
            <PlayerStatus player={remotePlayer} relationship="Opponent" completedLines={remoteLines} />
          </div>
          <div className={cn(styles.turnStatus, latestCall && styles.turnStatusWithCall)} aria-label="Current turn">
            <div className={styles.turnCopy}>
              <strong>{isMyTurn ? 'Your turn' : `${activePlayerName}'s turn`}</strong>
              <span>{isMyTurn ? 'Call one unmarked number.' : 'Their Call will appear on your Board.'}</span>
            </div>
            <BingoTurnTimer secondsRemaining={state.turnSecondsRemaining} isMyTurn={isMyTurn} />
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
        </section>

        {announcement ? (
          <p className="bingoSrOnly" role="status" aria-live="polite" aria-atomic="true">
            {announcement}
          </p>
        ) : null}

        <div className={styles.matchBody}>
          <div className={styles.boardColumn}>
            <div className={styles.boardStage}>
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
                sizeMode="height"
                className={styles.matchBoard}
              />
            </div>
          </div>

          <aside className={styles.supportColumn} aria-label="Match record">
            <section className={styles.history} aria-label="Recent Calls">
            <div className={styles.historyHeader}>
              <span>Recent Calls</span>
              <span>{calls.length}/25 called</span>
            </div>
            <div className={styles.historyList}>
              {calls.length === 0 ? (
                <span className={styles.emptyHistory}>No Calls yet.</span>
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
            <BingoMatchNotes history={state.gameState.history} playersById={playersById} open summaryLabel="Complete Match history" desktopOnly className={styles.desktopNotes} />
          </aside>
        </div>
      </main>

      <footer className={styles.actionRow} aria-label="Match actions">
        <div className={styles.passGroup}>
          {!isPassConfirming ? (
            <button
              type="button"
              onClick={() => setIsPassConfirming(true)}
              disabled={!isMyTurn || isGameOver || state.isReconnecting}
              aria-label="Pass turn"
              className={styles.actionButton}
            >
              Pass
            </button>
          ) : (
            <div className={styles.passConfirmation} role="group" aria-label="Confirm passing your turn">
              <p>Passing ends your turn. {remotePlayer.name} is next.</p>
              <div className={styles.passConfirmationActions}>
                <button type="button" onClick={confirmPass} className={styles.confirmButton}>Pass and end turn</button>
                <button type="button" onClick={() => setIsPassConfirming(false)} className={styles.cancelButton}>Keep turn</button>
              </div>
            </div>
          )}
        </div>
        <BingoReactionBar
          onSendReaction={(emoji) => coordinator.sendReaction(emoji)}
          disabled={isGameOver || state.isReconnecting}
          className={styles.doodleAction}
        />
        <button type="button" onClick={() => setIsNotesOpen(true)} aria-label="Match notes" className={styles.actionButton}>
          <FileText className="h-4 w-4" aria-hidden="true" />
          <span>Match notes</span>
        </button>
      </footer>

      {isRulesOpen ? (
        <div className={styles.sheetBackdrop} role="presentation" onClick={() => setIsRulesOpen(false)}>
          <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="match-rules-title" onClick={(event) => event.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <div>
                <p className={styles.sheetKicker}>BINGO Sunday Puzzle</p>
                <h2 id="match-rules-title">Two-player online Bingo</h2>
              </div>
              <button type="button" onClick={() => setIsRulesOpen(false)} aria-label="Close Bingo rules" className={styles.sheetClose}><X className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <ul>
              <li>Players take turns calling one unmarked number.</li>
              <li>Calls mark both Boards in the caller&apos;s ink.</li>
              <li>Complete five lines to score B-I-N-G-O. The first Player wins.</li>
              <li>Pass ends the current turn without calling a number.</li>
            </ul>
          </section>
        </div>
      ) : null}

      {isNotesOpen ? (
        <div className={styles.sheetBackdrop} role="presentation" onClick={() => setIsNotesOpen(false)}>
          <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="match-notes-title" onClick={(event) => event.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <div>
                <p className={styles.sheetKicker}>Complete record</p>
                <h2 id="match-notes-title">Match notes</h2>
              </div>
              <button type="button" onClick={() => setIsNotesOpen(false)} aria-label="Close Match notes" className={styles.sheetClose}><X className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <BingoMatchNotes history={state.gameState.history} playersById={playersById} open />
          </section>
        </div>
      ) : null}

      {isExitConfirming ? (
        <div className={styles.sheetBackdrop} role="presentation">
          <section className={styles.sheet} role="alertdialog" aria-modal="true" aria-labelledby="exit-match-title" aria-describedby="exit-match-description">
            <div className={styles.sheetHeader}>
              <div>
                <p className={styles.sheetKicker}>Leave active Match?</p>
                <h2 id="exit-match-title">Forfeit the Match</h2>
              </div>
              <button type="button" onClick={() => setIsExitConfirming(false)} aria-label="Keep playing" className={styles.sheetClose}><X className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <p id="exit-match-description" className={styles.exitCopy}>Leaving now forfeits this Match. {remotePlayer.name} will win.</p>
            <div className={styles.exitActions}>
              <button type="button" onClick={confirmExit} className={styles.confirmButton}>Forfeit and exit</button>
              <button type="button" onClick={() => setIsExitConfirming(false)} className={styles.cancelButton}>Keep playing</button>
            </div>
          </section>
        </div>
      ) : null}


    </div>
  )
}
