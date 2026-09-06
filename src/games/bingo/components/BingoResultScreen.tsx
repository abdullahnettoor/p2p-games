'use client'

import React, { useEffect, useRef } from 'react'
import { ArrowLeft, Award, Check, Frown, Hash, Loader2, RotateCcw, Trophy, X } from 'lucide-react'
import { WinResult } from '@/core/games/types'
import { BingoBoard, BingoCall, BingoTurnEvent, LineDetails } from '../types'
import { BingoPlayerInk, getBingoInkPresentation } from '../bingoInk'
import { PlayerSummary, RematchState } from '../state/BingoMatchCoordinator'
import { BingoBoardView } from './BingoBoardView'
import { BingoMatchNotes } from './BingoMatchNotes'
import { BingoSoundToggle } from './BingoSoundToggle'
import styles from './BingoResultScreen.module.css'

export interface BingoResultScreenProps {
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
  onCompareBoards?: () => void
  onExit: () => void
  isMuted: boolean
  onToggleMute: () => void
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

function ResultShellBar({
  isMuted,
  onToggleMute,
}: Pick<BingoResultScreenProps, 'isMuted' | 'onToggleMute'>) {
  return (
    <header className={styles.shellBar}>
      <h1 className={styles.masthead}>BINGO</h1>
      <BingoSoundToggle isMuted={isMuted} onToggle={onToggleMute} />
    </header>
  )
}

function RematchPanel({
  remotePlayer,
  rematchState,
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
}: Pick<BingoResultScreenProps, 'remotePlayer' | 'rematchState' | 'onRequestRematch' | 'onAcceptRematch' | 'onDeclineRematch'>) {
  if (rematchState === 'requested') {
    return (
      <div className={styles.resultNotice} role="status">
        <Loader2 aria-hidden="true" />
        <span>Rematch requested... Waiting for opponent</span>
      </div>
    )
  }

  if (rematchState === 'received') {
    return (
      <div className={styles.rematchRequest} role="status">
        <p>{remotePlayer.name} has requested a rematch!</p>
        <div className={styles.rematchRequestActions}>
          <button type="button" onClick={onAcceptRematch} data-result-focus="true" className={styles.resultSecondaryButton}>
            <Check aria-hidden="true" />
            <span>Accept Rematch</span>
          </button>
          <button type="button" onClick={onDeclineRematch} className={styles.resultSecondaryButton}>
            <X aria-hidden="true" />
            <span>Decline</span>
          </button>
        </div>
      </div>
    )
  }

  if (rematchState === 'accepted') {
    return (
      <div className={styles.resultNotice} role="status">
        <Check aria-hidden="true" />
        <span>Rematch accepted. Setting up Match.</span>
      </div>
    )
  }

  if (rematchState === 'declined') return <div className={styles.resultNotice} role="status">Rematch declined.</div>
  if (!onRequestRematch) return null

  return (
    <button type="button" onClick={onRequestRematch} data-result-focus="true" className={styles.resultPrimaryButton}>
      <RotateCcw aria-hidden="true" />
      <span>Request Rematch</span>
    </button>
  )
}

function useResultScreenFocus(screenRef: React.RefObject<HTMLElement | null>, onExit: () => void) {
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit

  useEffect(() => {
    const screen = screenRef.current
    if (!screen) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const focusable = () => Array.from(screen.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    ))

    const placeInitialFocus = () => {
      const initial = screen.querySelector<HTMLElement>('[data-result-focus]') ?? focusable()[0]
      initial?.focus()
    }
    placeInitialFocus()
    const focusTimer = window.setTimeout(placeInitialFocus, 0)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onExitRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const elements = focusable()
      if (elements.length === 0) return
      const first = elements[0]
      const last = elements[elements.length - 1]
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
      window.clearTimeout(focusTimer)
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [screenRef])
}

export const BingoResultScreen: React.FC<BingoResultScreenProps> = (props) => {
  const {
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
    onCompareBoards,
    onExit,
    isMuted,
    onToggleMute,
    className,
  } = props
  const screenRef = useRef<HTMLDivElement>(null)
  useResultScreenFocus(screenRef, onExit)

  const isWinner = winResult.winnerId === localPlayer.id
  const isDraw = Boolean(winResult.isDraw)
  const canCompare = Boolean(
    localBoard && remoteBoard && calls && playersById && localLineDetails && remoteLineDetails
  )
  const localInk = getBingoInkPresentation(localPlayer.role)
  const remoteInk = getBingoInkPresentation(remotePlayer.role)

  return (
    <div ref={screenRef} className={`bingoTokenScope ${styles.resultSurface} ${className ?? ''}`.trim()}>
      <ResultShellBar isMuted={isMuted} onToggleMute={onToggleMute} />
      <main className={styles.resultContent} aria-labelledby="bingo-result-title" aria-describedby="bingo-result-description">
        <header className={styles.resultHeader}>
          <p className={styles.resultKicker}>Final Match result</p>
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
            {[{ player: localPlayer, lines: localCompletedLines, ink: localInk, relationship: 'You' }, { player: remotePlayer, lines: remoteCompletedLines, ink: remoteInk, relationship: 'Opponent' }].map(({ player, lines, ink, relationship }) => (
              <div key={player.id} className={styles.resultPlayerCard} data-state={playerResultLabel(player.id, winResult.winnerId, isDraw, winResult.reason)}>
                <div className={styles.resultPlayerName}>
                  <span className={styles.resultPlayerMark} data-ink={player.role} aria-hidden="true">{ink.markGlyph}</span>
                  <span>{player.name} ({relationship})</span>
                </div>
                <strong>{lines}</strong>
                <span>lines completed</span>
                <span className={styles.resultStatus}>{playerResultLabel(player.id, winResult.winnerId, isDraw, winResult.reason)}</span>
              </div>
            ))}
          </div>
          <div className={styles.resultTotal}>
            <span><Hash aria-hidden="true" /> Total numbers called</span>
            <strong>{totalCalledCount} / 25</strong>
          </div>
        </section>

        <section className={styles.resultActions} aria-label="Result actions">
          <RematchPanel
            remotePlayer={remotePlayer}
            rematchState={rematchState}
            onRequestRematch={onRequestRematch}
            onAcceptRematch={onAcceptRematch}
            onDeclineRematch={onDeclineRematch}
          />
          {canCompare && onCompareBoards ? (
            <button type="button" onClick={onCompareBoards} className={styles.resultSecondaryButton}>
              Compare Boards
            </button>
          ) : null}
          {history && playersById ? <BingoMatchNotes history={history} playersById={playersById} /> : null}
          <button type="button" onClick={onExit} className={styles.resultSecondaryButton}>
            <ArrowLeft aria-hidden="true" />
            <span>Exit to games</span>
          </button>
        </section>
      </main>
    </div>
  )
}

export interface BingoComparisonScreenProps extends BingoResultScreenProps {
  onBack: () => void
}

export const BingoComparisonScreen: React.FC<BingoComparisonScreenProps> = (props) => {
  const {
    localPlayer,
    remotePlayer,
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
    onBack,
    onExit,
    isMuted,
    onToggleMute,
    className,
  } = props
  const screenRef = useRef<HTMLDivElement>(null)
  useResultScreenFocus(screenRef, onBack)

  if (!localBoard || !remoteBoard || !calls || !playersById) return null

  return (
    <div ref={screenRef} className={`bingoTokenScope ${styles.resultSurface} ${className ?? ''}`.trim()}>
      <ResultShellBar isMuted={isMuted} onToggleMute={onToggleMute} />
      <main className={styles.comparisonContent} aria-labelledby="bingo-comparison-title">
        <div className={styles.comparisonHeader}>
          <button type="button" onClick={onBack} data-result-focus="true" className={styles.resultSecondaryButton}>
            <ArrowLeft aria-hidden="true" />
            <span>Back to result</span>
          </button>
          <div>
            <p className={styles.resultKicker}>Completed Match</p>
            <h2 id="bingo-comparison-title" aria-live="assertive">Compare Boards</h2>
          </div>
        </div>

        {rematchState === 'received' ? (
          <div className={styles.comparisonRematch}>
            <RematchPanel
              remotePlayer={remotePlayer}
              rematchState={rematchState}
              onRequestRematch={onRequestRematch}
              onAcceptRematch={onAcceptRematch}
              onDeclineRematch={onDeclineRematch}
            />
          </div>
        ) : null}

        <div className={styles.comparisonLayout}>
          <section className={styles.comparisonBoards} aria-label="Board comparison">
            <div className={styles.comparisonBoard}>
              <h3><span className={styles.resultPlayerMark} data-ink={localPlayer.role} aria-hidden="true">{getBingoInkPresentation(localPlayer.role).markGlyph}</span>{localPlayer.name}&apos;s board</h3>
              <BingoBoardView
                board={localBoard}
                calls={calls}
                playersById={playersById}
                boardOwnerRole={localPlayer.role}
                lineDetails={localLineDetails}
                ariaLabel={`${localPlayer.name}'s annotated Bingo board`}
                className={styles.compareBoard}
              />
            </div>
            <div className={styles.comparisonBoard}>
              <h3><span className={styles.resultPlayerMark} data-ink={remotePlayer.role} aria-hidden="true">{getBingoInkPresentation(remotePlayer.role).markGlyph}</span>{remotePlayer.name}&apos;s board</h3>
              <BingoBoardView
                board={remoteBoard}
                calls={calls}
                playersById={playersById}
                boardOwnerRole={remotePlayer.role}
                lineDetails={remoteLineDetails}
                ariaLabel={`${remotePlayer.name}'s annotated Bingo board`}
                className={styles.compareBoard}
              />
            </div>
          </section>
          <aside className={styles.comparisonNotes} aria-label="Match notes">
            {history ? <BingoMatchNotes history={history} playersById={playersById} open /> : null}
            {rematchState !== 'received' ? (
              <RematchPanel
                remotePlayer={remotePlayer}
                rematchState={rematchState}
                onRequestRematch={onRequestRematch}
                onAcceptRematch={onAcceptRematch}
                onDeclineRematch={onDeclineRematch}
              />
            ) : null}
            <button type="button" onClick={onExit} className={styles.resultSecondaryButton}>
              <ArrowLeft aria-hidden="true" />
              <span>Exit to games</span>
            </button>
          </aside>
        </div>
      </main>
    </div>
  )
}

export { resultTitle, resultDescription }
