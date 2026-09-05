'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Award, Check, Frown, Hash, Loader2, RotateCcw, Trophy, X } from 'lucide-react'
import { WinResult } from '@/core/games/types'
import { cn } from '@/lib/utils'
import { BingoBoard, BingoCall, BingoTurnEvent, LineDetails } from '../types'
import { BingoPlayerInk, getBingoInkPresentation } from '../bingoInk'
import { PlayerSummary, RematchState } from '../state/BingoMatchCoordinator'
import { BingoBoardView } from './BingoBoardView'
import { BingoMatchNotes } from './BingoMatchNotes'
import styles from './BingoGameOverModal.module.css'

export interface BingoGameOverModalProps {
  winResult: WinResult
  localPlayer: PlayerSummary
  remotePlayer: PlayerSummary
  localCompletedLines: number
  remoteCompletedLines: number
  totalCalledCount: number
  localBoard?: BingoBoard
  remoteBoard?: BingoBoard
  calls?: BingoCall[]
  playersById?: Record<string, BingoPlayerInk>
  localLineDetails?: LineDetails
  remoteLineDetails?: LineDetails
  history?: BingoTurnEvent[]
  rematchState?: RematchState
  onRequestRematch?: () => void
  onAcceptRematch?: () => void
  onDeclineRematch?: () => void
  onExit: () => void
  className?: string
}

function resultTitle(winResult: WinResult, isWinner: boolean, isDraw: boolean): string {
  if (isDraw) return "IT'S A DRAW!"
  if (winResult.reason === 'forfeit') return isWinner ? 'VICTORY BY FORFEIT' : 'DEFEAT BY FORFEIT'
  return isWinner ? 'VICTORY' : 'DEFEAT'
}

function resultDescription(
  winResult: WinResult,
  isWinner: boolean,
  isDraw: boolean,
  remotePlayerName: string
): string {
  if (isDraw) return 'Both players completed 5 lines on the same turn.'
  if (winResult.reason === 'forfeit') {
    return isWinner
      ? `${remotePlayerName} disconnected and did not return within 30 seconds.`
      : 'You forfeited the match when your connection did not return within 30 seconds.'
  }
  return isWinner ? 'You scored B-I-N-G-O first.' : `${remotePlayerName} scored B-I-N-G-O first.`
}

function playerResultLabel(
  playerId: string,
  winnerId: string | null,
  isDraw: boolean,
  reason?: string
): string {
  if (isDraw) return 'DRAW'
  if (playerId === winnerId) return 'WINNER'
  return reason === 'forfeit' ? 'FORFEIT' : 'LOSS'
}

export const BingoGameOverModal: React.FC<BingoGameOverModalProps> = ({
  winResult,
  localPlayer,
  remotePlayer,
  localCompletedLines,
  remoteCompletedLines,
  totalCalledCount,
  localBoard,
  remoteBoard,
  calls,
  playersById,
  localLineDetails,
  remoteLineDetails,
  history,
  rematchState = 'none',
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  onExit,
  className,
}) => {
  const [showComparison, setShowComparison] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit

  const isWinner = winResult.winnerId === localPlayer.id
  const isDraw = Boolean(winResult.isDraw)
  const canCompare = Boolean(
    localBoard &&
      remoteBoard &&
      calls &&
      playersById &&
      localLineDetails &&
      remoteLineDetails
  )
  const localInk = getBingoInkPresentation(localPlayer.role)
  const remoteInk = getBingoInkPresentation(remotePlayer.role)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    const getFocusableElements = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )

    const focusableElements = getFocusableElements()
    focusableElements[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onExitRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const currentFocusableElements = getFocusableElements()
      if (currentFocusableElements.length === 0) return
      const first = currentFocusableElements[0]
      const last = currentFocusableElements[currentFocusableElements.length - 1]
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
        return
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [])

  return (
    <div className={styles.resultBackdrop}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bingo-result-title"
        aria-describedby="bingo-result-description"
        className={cn(styles.resultDialog, className)}
      >
        <header className={styles.resultHeader}>
          <p className={styles.resultKicker}>Final match result</p>
          <h1 className={styles.resultMasthead}>BINGO</h1>
          <div className={styles.resultBadge} data-result={isDraw ? 'draw' : isWinner ? 'win' : 'loss'}>
            {isWinner ? <Trophy aria-hidden="true" /> : isDraw ? <Award aria-hidden="true" /> : <Frown aria-hidden="true" />}
          </div>
          <h2 id="bingo-result-title" className={styles.resultTitle} aria-live="assertive">
            {resultTitle(winResult, isWinner, isDraw)}
          </h2>
          <p id="bingo-result-description" className={styles.resultDescription}>
            {resultDescription(winResult, isWinner, isDraw, remotePlayer.name)}
          </p>
        </header>

        <section className={styles.resultSummary} aria-label="Final Match Summary">
          <div className={styles.resultSummaryLabel}>Final Match Summary</div>
          <div className={styles.resultScoreGrid}>
            <div className={styles.resultPlayerCard} data-state={playerResultLabel(localPlayer.id, winResult.winnerId, isDraw, winResult.reason)}>
              <div className={styles.resultPlayerName}>
                <span className={styles.resultPlayerMark} data-ink={localPlayer.role} aria-hidden="true">{localInk.markGlyph}</span>
                <span>{localPlayer.name} (You)</span>
              </div>
              <strong>{localCompletedLines}</strong>
              <span>lines completed</span>
              <span className={styles.resultStatus}>{playerResultLabel(localPlayer.id, winResult.winnerId, isDraw, winResult.reason)}</span>
            </div>
            <div className={styles.resultPlayerCard} data-state={playerResultLabel(remotePlayer.id, winResult.winnerId, isDraw, winResult.reason)}>
              <div className={styles.resultPlayerName}>
                <span className={styles.resultPlayerMark} data-ink={remotePlayer.role} aria-hidden="true">{remoteInk.markGlyph}</span>
                <span>{remotePlayer.name}</span>
              </div>
              <strong>{remoteCompletedLines}</strong>
              <span>lines completed</span>
              <span className={styles.resultStatus}>{playerResultLabel(remotePlayer.id, winResult.winnerId, isDraw, winResult.reason)}</span>
            </div>
          </div>
          <div className={styles.resultTotal}>
            <span><Hash aria-hidden="true" /> Total numbers called</span>
            <strong>{totalCalledCount} / 25</strong>
          </div>
        </section>

        <section className={styles.resultActions} aria-label="Result actions">
          {rematchState === 'none' && onRequestRematch ? (
            <button type="button" onClick={onRequestRematch} className={styles.resultPrimaryButton}>
              <RotateCcw aria-hidden="true" />
              <span>Request Rematch</span>
            </button>
          ) : null}

          {rematchState === 'requested' ? (
            <div className={styles.resultNotice} role="status">
              <Loader2 aria-hidden="true" />
              <span>Rematch requested... Waiting for opponent</span>
            </div>
          ) : null}

          {rematchState === 'received' ? (
            <div className={styles.rematchRequest} role="status">
              <p>{remotePlayer.name} has requested a rematch!</p>
              <div className={styles.rematchRequestActions}>
                <button type="button" onClick={onAcceptRematch} className={styles.resultSecondaryButton}>
                  <Check aria-hidden="true" />
                  <span>Accept Rematch</span>
                </button>
                <button type="button" onClick={onDeclineRematch} className={styles.resultSecondaryButton}>
                  <X aria-hidden="true" />
                  <span>Decline</span>
                </button>
              </div>
            </div>
          ) : null}

          {rematchState === 'accepted' ? (
            <div className={styles.resultNotice} role="status">
              <Check aria-hidden="true" />
              <span>Rematch accepted. Setting up match.</span>
            </div>
          ) : null}

          {rematchState === 'declined' ? <div className={styles.resultNotice}>Rematch declined.</div> : null}

          {canCompare ? (
            <button
              type="button"
              aria-expanded={showComparison}
              onClick={() => setShowComparison((visible) => !visible)}
              className={styles.resultSecondaryButton}
            >
              <span>{showComparison ? 'Hide Board Comparison' : 'Compare Boards'}</span>
            </button>
          ) : null}

          {history && playersById ? <BingoMatchNotes history={history} playersById={playersById} /> : null}

          <button type="button" onClick={onExit} className={styles.resultSecondaryButton}>
            <ArrowLeft aria-hidden="true" />
            <span>Exit to games</span>
          </button>
        </section>

        {showComparison && canCompare ? (
          <section className={styles.boardComparison} aria-label="Board comparison">
            <h3>Board comparison</h3>
            <div className={styles.comparisonGrid}>
              <div>
                <h4>{localPlayer.name}'s board</h4>
                <BingoBoardView
                  board={localBoard!}
                  calls={calls!}
                  playersById={playersById!}
                  boardOwnerRole={localPlayer.role}
                  lineDetails={localLineDetails}
                  ariaLabel={`${localPlayer.name}'s annotated Bingo board`}
                  className={styles.compareBoard}
                />
              </div>
              <div>
                <h4>{remotePlayer.name}'s board</h4>
                <BingoBoardView
                  board={remoteBoard!}
                  calls={calls!}
                  playersById={playersById!}
                  boardOwnerRole={remotePlayer.role}
                  lineDetails={remoteLineDetails}
                  ariaLabel={`${remotePlayer.name}'s annotated Bingo board`}
                  className={styles.compareBoard}
                />
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}
