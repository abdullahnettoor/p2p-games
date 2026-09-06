'use client'

import React, { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { LobbySession } from '@/core/lobby/LobbySession'
import { useLobby } from '@/core/lobby/useLobby'
import { BingoBoard } from '../types'
import { BingoBoardSetup } from './BingoBoardSetup'
import { BingoBoardView } from './BingoBoardView'
import { BingoSoundToggle } from './BingoSoundToggle'
import { useBingoAudio } from '../hooks/useBingoAudio'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleHelp,
  Copy,
  QrCode,

  Loader2,
  Pencil,
  RotateCcw,
  Share2,
  X,
} from 'lucide-react'
import styles from './BingoMatchLobby.module.css'

export interface BingoMatchLobbyProps {
  session: LobbySession<BingoBoard>
  onExit?: () => void
  className?: string
}

type InviteFeedback = 'idle' | 'shared' | 'copied' | 'error'

export const BingoMatchLobby: React.FC<BingoMatchLobbyProps> = ({
  session,
  onExit,
  className,
}) => {
  const { state, updatePlayerName, updateBoardSetup, setReady } = useLobby(session)
  const { isMuted, toggleMute } = useBingoAudio(null)
  const [localNameInput, setLocalNameInput] = useState(state.localPlayer.name)
  const [inviteFeedback, setInviteFeedback] = useState<InviteFeedback>('idle')
  const [showRules, setShowRules] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [qrError, setQrError] = useState(false)
  const qrTriggerRef = useRef<HTMLButtonElement>(null)
  const qrCloseButtonRef = useRef<HTMLButtonElement>(null)

  const isHost = state.localPlayer.role === 'host'
  const isLocalReady = state.localPlayer.isReady
  const isRemoteConnected = Boolean(state.remotePlayer?.connected)
  const isRemoteReady = Boolean(state.remotePlayer?.isReady)
  const isStarting = state.status === 'starting'

  const copyInvite = async (inviteUrl: string) => {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard is unavailable')
    await navigator.clipboard.writeText(inviteUrl)
    setInviteFeedback('copied')
  }

  const handleShareInvite = async () => {
    if (!state.inviteUrl) return
    setInviteFeedback('idle')

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: 'Join my BINGO Match',
          text: 'Join me for a BINGO Match.',
          url: state.inviteUrl,
        })
        setInviteFeedback('shared')
        return
      }
      await copyInvite(state.inviteUrl)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      try {
        await copyInvite(state.inviteUrl)
      } catch {
        setInviteFeedback('error')
      }
    }
  }

  useEffect(() => {
    if (!showQr || !state.inviteUrl) return

    let cancelled = false
    setQrDataUrl(null)
    setQrError(false)
    QRCode.toString(state.inviteUrl, { type: 'svg', width: 280, margin: 2 })
      .then((svg) => {
        if (!cancelled) setQrDataUrl(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
      })
      .catch(() => {
        if (!cancelled) setQrError(true)
      })

    return () => {
      cancelled = true
    }
  }, [showQr, state.inviteUrl])

  useEffect(() => {
    if (!showQr) return

    qrCloseButtonRef.current?.focus()
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowQr(false)
    }
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      qrTriggerRef.current?.focus()
    }
  }, [showQr])

  const handleBoardReady = (board: BingoBoard) => {
    updateBoardSetup(board)
    setReady(true)
  }

  const handleRetry = async () => {
    setInviteFeedback('idle')
    await session.retry()
  }

  const connectionCopy = state.error && !isHost
    ? `Connection failed · ${state.error}`
    : !isRemoteConnected
      ? state.localPlayer.role === 'host' ? 'Waiting for a friend to join' : 'Connecting to the Host'
      : isRemoteReady
        ? 'Connected · both Players are arranging'
        : 'Connected · your friend is arranging'

  return (
    <div className={cn('bingoTokenScope', styles.lobbySurface, className)}>
      <div className={styles.lobbyInner}>
        <header className={styles.utilityBar}>
          {onExit ? (
            <button type="button" onClick={onExit} className={styles.utilityButton}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Exit</span>
            </button>
          ) : <span aria-hidden="true" />}
          <h1 className={styles.shellTitle}>BINGO</h1>
          <div className={styles.utilityGroup}>
            <BingoSoundToggle isMuted={isMuted} onToggle={toggleMute} />
            <button
              type="button"
              onClick={() => setShowRules(true)}
              aria-label="Bingo rules"
              aria-expanded={showRules}
              className={styles.rulesButton}
            >
              <CircleHelp className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Rules</span>
            </button>
          </div>
        </header>

        {isHost ? (
          <section className={styles.inviteArea} aria-label="Match invite">
            <div
              data-ready={state.inviteUrl ? 'true' : 'false'}
              data-error={state.error ? 'true' : 'false'}
              className={styles.invitePill}
            >
              <span className={styles.inviteCopy}>
                <span className={styles.inviteLabel}>
                  {state.error ? 'Invite needs attention' : state.inviteUrl ? 'Invite a friend' : 'Preparing invite'}
                </span>
                <span className={styles.inviteReason}>
                  {state.error
                    ? state.error
                    : state.inviteUrl
                      ? 'Share the link or show a QR code.'
                      : 'You can arrange your Board while the Match opens.'}
                </span>
              </span>
              {state.error ? (
                <button type="button" onClick={handleRetry} aria-label="Retry invite connection" className={styles.inviteActionButton}>
                  <RotateCcw className="mr-1 inline h-4 w-4" aria-hidden="true" />Try again
                </button>
              ) : state.inviteUrl ? (
                <span className={styles.inviteActions} aria-label="Invite actions">
                  <button type="button" onClick={handleShareInvite} aria-label="Share invite link" className={styles.inviteIconButton}>
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button ref={qrTriggerRef} type="button" onClick={() => setShowQr(true)} aria-label="Show invite QR code" className={styles.inviteIconButton}>
                    <QrCode className="h-4 w-4" aria-hidden="true" />
                  </button>
                </span>
              ) : (
                <button type="button" disabled aria-label="Preparing invite" className={styles.inviteStateButton}>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                </button>
              )}
            </div>

            {inviteFeedback === 'shared' ? <p className={styles.inviteFeedback} role="status"><Check className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />Invite shared</p> : null}
            {inviteFeedback === 'copied' ? <p className={styles.inviteFeedback} role="status"><Copy className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />Invite link copied</p> : null}
            {inviteFeedback === 'error' ? (
              <p className={styles.inviteFeedback} data-error="true" role="alert">
                Could not share automatically. Copy this invite link: <a className={styles.inviteLink} href={state.inviteUrl ?? undefined}>{state.inviteUrl}</a>
              </p>
            ) : null}
          </section>
        ) : null}

        <p className={styles.connectionLine} data-connected={isRemoteConnected ? 'true' : 'false'} role="status" aria-live="polite">
          <strong>{connectionCopy}</strong>
          {isRemoteConnected && !state.error ? ` · ${state.remotePlayer?.name ?? 'Opponent'}` : null}
          {state.error && !isHost ? (
            <button type="button" onClick={handleRetry} className={styles.connectionRetry}>Try again</button>
          ) : null}
        </p>

        <section className={styles.boardSheet} aria-label="Bingo Lobby and Board setup">
          <div className={styles.identityRow}>
            <div>
              <label htmlFor="display-name" className={styles.identityLabel}>Your name</label>
              <input
                id="display-name"
                type="text"
                maxLength={20}
                value={localNameInput}
                disabled={isLocalReady}
                onChange={(event) => {
                  setLocalNameInput(event.target.value)
                  updatePlayerName(event.target.value)
                }}
                className={styles.nameInput}
              />
            </div>
            {isLocalReady ? <span className={styles.readyMark}><CheckCircle2 className="mr-1 inline h-4 w-4" aria-hidden="true" />Ready</span> : null}
          </div>

          {isLocalReady ? (
            <div className={styles.lockedBoard}>
              <h2 className={styles.lockedHeading}><CheckCircle2 className="h-5 w-5" aria-hidden="true" /> Board ready</h2>
              <p className={styles.lockedCopy}>{isRemoteReady ? 'Both Players are ready. Starting the Match.' : 'Waiting for your friend to finish.'}</p>
              {state.localPlayer.setupConfig ? (
                <BingoBoardView board={state.localPlayer.setupConfig} calls={[]} playersById={{}} disabled />
              ) : null}
              {!isStarting ? (
                <button type="button" onClick={() => setReady(false)} className={styles.editButton}>
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Edit Board
                </button>
              ) : null}
            </div>
          ) : (
            <BingoBoardSetup
              initialBoard={state.localPlayer.setupConfig}
              onBoardComplete={handleBoardReady}
              playerName={state.localPlayer.name}
              submitLabel="Ready with this board"
            />
          )}

        </section>
      </div>

      {showQr && state.inviteUrl ? (
        <div className={styles.rulesSheet} role="presentation" onClick={() => setShowQr(false)}>
          <section className={styles.rulesPanel} role="dialog" aria-modal="true" aria-labelledby="invite-qr-title" onClick={(event) => event.stopPropagation()}>
            <div className={styles.rulesHeader}>
              <div>
                <h2 id="invite-qr-title" className={styles.rulesHeading}>Invite QR code</h2>
                <p className={styles.inviteReason}>Scan to join this BINGO Match.</p>
              </div>
              <button ref={qrCloseButtonRef} type="button" onClick={() => setShowQr(false)} aria-label="Close invite QR code" className={styles.rulesClose}><X className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <div className={styles.qrFrame}>
              {qrDataUrl ? <img src={qrDataUrl} alt="QR code for the Bingo Match invite" className={styles.qrImage} /> : qrError ? <p role="alert">Could not create the QR code. Copy the invite link below.</p> : <p role="status">Preparing QR code…</p>}
            </div>
            <a className={styles.inviteLink} href={state.inviteUrl}>{state.inviteUrl}</a>
          </section>
        </div>
      ) : null}

      {showRules ? (
        <div className={styles.rulesSheet} role="presentation" onClick={() => setShowRules(false)}>
          <section className={styles.rulesPanel} role="dialog" aria-modal="true" aria-labelledby="bingo-rules-title" onClick={(event) => event.stopPropagation()}>
            <div className={styles.rulesHeader}>
              <div>
                <h2 id="bingo-rules-title" className={styles.rulesHeading}>BINGO Sunday Puzzle</h2>
                <p className={styles.inviteReason}>Two-player online variant</p>
              </div>
              <button type="button" onClick={() => setShowRules(false)} aria-label="Close Bingo rules" className={styles.rulesClose}><X className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            <ul>
              <li>Arrange numbers 1–25 on your Board, then choose Ready with this Board.</li>
              <li>Players take turns calling one number. Marks and completed lines appear in the caller&apos;s ink.</li>
              <li>The first Player to complete five lines wins. A turn may be passed when needed.</li>
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  )
}
