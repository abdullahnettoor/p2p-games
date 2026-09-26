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
  Pencil,
  RotateCcw,
  Share2,
  X,
} from 'lucide-react'
import styles from './BingoMatchLobby.module.css'
import '../bingoTokens.css'

export interface BingoMatchLobbyProps {
  session: LobbySession<BingoBoard>
  onExit?: () => void
  onTryAnotherCode?: () => void
  isStrangerMatch?: boolean
  className?: string
}

type InviteFeedback = 'idle' | 'shared' | 'copied' | 'error'

export const BingoMatchLobby: React.FC<BingoMatchLobbyProps> = ({
  session,
  onExit,
  onTryAnotherCode,
  isStrangerMatch = false,
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

  useEffect(() => {
    setLocalNameInput(state.localPlayer.name)
  }, [state.localPlayer.name])

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
    if (state.isReconnecting || state.error) {
      setShowQr(false)
    }
  }, [state.isReconnecting, state.error])

  useEffect(() => {
    if (!showQr || !state.inviteUrl) return
    let active = true
    setQrError(false)

    QRCode.toDataURL(state.inviteUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#27313A',
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl)
      })
      .catch(() => {
        if (active) setQrError(true)
      })

    return () => {
      active = false
    }
  }, [showQr, state.inviteUrl])

  useEffect(() => {
    if (!showQr && !showRules) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowQr(false)
        setShowRules(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showQr, showRules])

  useEffect(() => {
    if (showQr) {
      qrCloseButtonRef.current?.focus()
    } else {
      qrTriggerRef.current?.focus()
    }
  }, [showQr])

  const handleRetry = async () => {
    setInviteFeedback('idle')
    await session.retry()
  }

  const handleBoardReady = (board: BingoBoard) => {
    updateBoardSetup(board)
    setReady(true)
  }

  const inviteActionCopy = inviteFeedback === 'copied'
    ? 'Invite link copied'
    : inviteFeedback === 'shared'
      ? 'Invite shared'
      : inviteFeedback === 'error'
        ? 'Copy failed'
        : 'Share invite link'

  const connectionCopy = state.error && !isHost
    ? `Connection failed · ${state.error}`
    : isRemoteConnected
      ? isStrangerMatch
        ? 'Connected with a stranger · both players are arranging'
        : 'Friend connected · both players are arranging'
      : isStrangerMatch
        ? 'Searching for stranger…'
        : 'Waiting for a friend to join'

  return (
    <div className={cn('bingoTokenScope', styles.lobbySurface, className)}>
      <div className={styles.lobbyInner}>
        <header className={styles.utilityBar}>
          <button
            type="button"
            onClick={onExit}
            className={styles.utilityButton}
            aria-label="Back to menu"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back</span>
          </button>
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

        {isHost && !isStrangerMatch ? (
          <div className={styles.inviteArea}>
            <section
              className={styles.invitePill}
              aria-label="Match invite"
              data-ready={Boolean(state.inviteUrl)}
              data-error={Boolean(state.error)}
              data-reconnecting={Boolean(state.isReconnecting)}
            >
              <div className={styles.inviteCopy}>
                <span className={styles.inviteLabel}>Match invite</span>
                <span className={styles.inviteReason}>
                  {state.error
                    ? state.error
                    : state.isReconnecting
                      ? 'Reconnecting signaling server…'
                      : state.inviteUrl
                        ? 'Invite ready for your friend'
                        : 'Preparing invite'}
                </span>
                {state.roomCode ? (
                  <div className={styles.roomCodeSnippet}>
                    <span>Room:</span>
                    <strong className={styles.roomCodeValue}>{state.roomCode}</strong>
                  </div>
                ) : null}
              </div>

              {state.error ? (
                <button
                  type="button"
                  onClick={handleRetry}
                  className={styles.inviteActionButton}
                  aria-label="Retry invite connection"
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  Retry
                </button>
              ) : state.isReconnecting ? (
                <button
                  type="button"
                  disabled
                  className={styles.inviteStateButton}
                  aria-label="Reconnecting signaling server"
                >
                  Reconnecting…
                </button>
              ) : state.inviteUrl ? (
                <div className={styles.inviteActions}>
                  <button
                    type="button"
                    onClick={handleShareInvite}
                    className={styles.inviteActionButton}
                    aria-label={inviteActionCopy}
                  >
                    {inviteFeedback === 'copied' || inviteFeedback === 'shared' ? (
                      <Check className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Share2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {inviteActionCopy}
                  </button>
                  <button
                    ref={qrTriggerRef}
                    type="button"
                    onClick={() => setShowQr(true)}
                    className={styles.inviteIconButton}
                    aria-label="Show invite QR code"
                    aria-haspopup="dialog"
                    aria-expanded={showQr}
                  >
                    <QrCode className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled
                  className={styles.inviteStateButton}
                  aria-label="Preparing invite link"
                >
                  Preparing…
                </button>
              )}
            </section>

            {inviteFeedback === 'error' && state.inviteUrl ? (
              <p className={styles.inviteFeedback} data-error="true" role="alert">
                Could not share automatically. Share this link directly:{' '}
                <a href={state.inviteUrl} className={styles.inviteLink}>
                  {state.inviteUrl}
                </a>
              </p>
            ) : null}

            {inviteFeedback !== 'idle' && inviteFeedback !== 'error' ? (
              <p className={styles.inviteFeedback} role="status">
                {inviteFeedback === 'copied' ? 'Invite link copied' : 'Invite shared'}
              </p>
            ) : null}

            {state.inviteUrl ? (
              <input
                type="text"
                readOnly
                value={state.inviteUrl}
                tabIndex={-1}
                aria-hidden="true"
                className="sr-only"
              />
            ) : null}
          </div>
        ) : null}

        {state.error && !isHost ? (
          <div className={styles.guestErrorSection}>
            <p className={styles.inviteFeedback} data-error="true" role="alert">
              {state.error}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              {onTryAnotherCode ? (
                <button
                  type="button"
                  onClick={onTryAnotherCode}
                  className={styles.tryAnotherCodeButton}
                >
                  Try another code
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleRetry}
                className={styles.connectionRetry}
                style={{ margin: 0 }}
              >
                Try again
              </button>
            </div>
          </div>
        ) : null}

        <p className={styles.connectionLine} data-connected={isRemoteConnected ? 'true' : 'false'} role="status" aria-live="polite">
          <strong>{connectionCopy}</strong>
          {isRemoteConnected && !state.error ? ` · ${state.remotePlayer?.name ?? 'Opponent'}` : null}
          {isRemoteConnected ? <span className="sr-only">Connected via P2P</span> : null}
        </p>

        <section className={styles.boardSheet} aria-label="Bingo Lobby and Board setup">
          <div className={styles.identityRow}>
            <div>
              <label htmlFor="display-name" className={styles.identityLabel}>
                Your name {isStrangerMatch ? '(stranger match)' : ''}
              </label>
              <input
                id="display-name"
                type="text"
                maxLength={20}
                value={localNameInput}
                disabled={isLocalReady || isStrangerMatch}
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
              <p className={styles.lockedCopy}>{isRemoteReady ? 'Both Players are ready. Starting the Match.' : isStrangerMatch ? 'Waiting for opponent to finish.' : 'Waiting for your friend to finish.'}</p>
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
