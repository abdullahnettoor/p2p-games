'use client'

import React, { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { LobbyCoordinator } from '@/core/lobby/LobbyCoordinator'
import { useLobby } from '@/core/lobby/useLobby'
import { TicTacToeSeriesPicker } from './TicTacToeSeriesPicker'
import { EntryRulesModal } from '@/components/entry'
import { ticTacToeRules } from '../rules'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleHelp,
  Copy,
  Pencil,
  QrCode,
  Share2,
  X,
} from 'lucide-react'
import styles from './TicTacToeMatchLobby.module.css'
import '../ticTacToeTokens.css'

export interface TicTacToeMatchLobbyProps {
  session: LobbyCoordinator<null>
  onExit?: () => void
  onTryAnotherCode?: () => void
  isStrangerMatch?: boolean
  className?: string
}

type InviteFeedback = 'idle' | 'shared' | 'copied' | 'error'

export const TicTacToeMatchLobby: React.FC<TicTacToeMatchLobbyProps> = ({
  session,
  onExit,
  onTryAnotherCode,
  isStrangerMatch = false,
  className,
}) => {
  const {
    state,
    seriesLength,
    setSeriesLength,
    updatePlayerName,
    setReady,
    canReady,
  } = useLobby(session)

  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(state.localPlayer.name)
  const [inviteFeedback, setInviteFeedback] = useState<InviteFeedback>('idle')
  const [showRules, setShowRules] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const initialReadyRef = useRef(false)

  const isHost = state.localPlayer.role === 'host'
  const isLocalReady = state.localPlayer.isReady
  const isRemoteConnected = Boolean(state.remotePlayer?.connected)
  const isRemoteReady = Boolean(state.remotePlayer?.isReady)
  const isStarting = state.status === 'starting'

  // Ready once named: on initial lobby entry, if player has a name, ready up
  useEffect(() => {
    if (!initialReadyRef.current && canReady()) {
      initialReadyRef.current = true
      try {
        setReady(true)
      } catch {
        // safe ignore
      }
    }
  }, [canReady, setReady])

  useEffect(() => {
    setNameInput(state.localPlayer.name)
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
          title: 'Join my TIC-TAC-TOE Match',
          text: 'Join me for a TIC-TAC-TOE Match.',
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

  const handleSaveName = () => {
    const trimmed = nameInput.trim()
    if (trimmed) {
      updatePlayerName(trimmed)
      setIsEditingName(false)
      if (!isLocalReady && canReady()) {
        setReady(true)
      }
    }
  }

  const handleOpenQr = async () => {
    if (!state.inviteUrl) return
    try {
      const dataUrl = await QRCode.toDataURL(state.inviteUrl, {
        margin: 1,
        width: 192,
        color: { dark: '#155a96', light: '#ffffff' },
      })
      setQrDataUrl(dataUrl)
      setShowQr(true)
    } catch {
      // safe ignore
    }
  }

  const getStatusText = () => {
    if (isStarting) {
      return 'Both players ready! Starting Match...'
    }
    if (!isRemoteConnected) {
      return isStrangerMatch
        ? 'Searching for an opponent...'
        : 'Waiting for a friend to join with your room code...'
    }
    if (isLocalReady && isRemoteReady) {
      return 'Both players ready! Launching...'
    }
    if (!isLocalReady && !isRemoteReady) {
      return 'Format changed. Both players must ready up.'
    }
    if (!isLocalReady) {
      return 'Opponent is ready! Tap "Ready to Play" to start.'
    }
    return 'Waiting for opponent to ready up...'
  }

  return (
    <main className={cn(styles.lobbySurface, 'tttTokenScope', className)}>
      <div className={styles.lobbyInner}>
        {/* Utility bar */}
        <header className={styles.utilityBar}>
          <button
            type="button"
            className={styles.utilityButton}
            onClick={onExit}
            aria-label="Exit to menu"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Menu</span>
          </button>

          <h1 className={styles.titleText}>TIC-TAC-TOE</h1>

          <button
            type="button"
            className={styles.rulesButton}
            onClick={() => setShowRules(true)}
            aria-label="How to play"
          >
            <CircleHelp className="w-4 h-4" />
            <span>Rules</span>
          </button>
        </header>

        {/* Room Code & Invite Pill (Host only, not in stranger match) */}
        {isHost && !isStrangerMatch && state.roomCode && (
          <section className={styles.inviteArea} aria-label="Room invite">
            <div className={styles.invitePill}>
              <div className={styles.roomCodeDisplay}>
                <span className={styles.roomCodeLabel}>Room</span>
                <span className={styles.roomCodeValue} data-testid="room-code">
                  {state.roomCode}
                </span>
              </div>

              <div className={styles.inviteActions}>
                {inviteFeedback !== 'idle' && (
                  <span className={styles.feedbackBadge}>
                    {inviteFeedback === 'copied' ? 'Copied!' : inviteFeedback === 'shared' ? 'Shared!' : 'Failed'}
                  </span>
                )}

                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={() => state.inviteUrl && copyInvite(state.inviteUrl)}
                  aria-label="Copy invite link"
                  title="Copy invite link"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>

                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={handleShareInvite}
                  aria-label="Share invite link"
                  title="Share invite link"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>

                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={handleOpenQr}
                  aria-label="Show QR Code"
                  title="Show QR Code"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Status banner */}
        <section
          className={cn(styles.statusCard, isStarting && styles.statusStarting)}
          data-testid="lobby-status-banner"
          aria-live="polite"
        >
          <span>{getStatusText()}</span>
        </section>

        {/* Series Picker (Host interactive, Guest read-only, hidden for strangers) */}
        <TicTacToeSeriesPicker
          length={seriesLength}
          isHost={isHost}
          isStranger={isStrangerMatch}
          onSelectLength={(len) => setSeriesLength(len)}
          disabled={isStarting}
        />

        {/* Players Section */}
        <section className={styles.playersSection} aria-label="Lobby Players">
          {/* Local Player Card */}
          <div
            className={cn(
              styles.playerCard,
              isHost ? styles.playerCardHost : styles.playerCardGuest
            )}
            data-testid="local-player-card"
          >
            <div className={styles.playerInfo}>
              <div
                className={cn(
                  styles.playerMark,
                  isHost ? styles.playerMarkHost : styles.playerMarkGuest
                )}
                aria-label={`Your mark: ${isHost ? 'X' : 'O'}`}
              >
                {isHost ? 'X' : 'O'}
              </div>

              <div className={styles.playerDetails}>
                {isEditingName ? (
                  <div className={styles.nameEditRow}>
                    <input
                      type="text"
                      className={styles.nameInput}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      maxLength={18}
                      aria-label="Your name"
                      autoFocus
                    />
                    <button
                      type="button"
                      className={styles.nameSaveButton}
                      onClick={handleSaveName}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className={styles.playerName} data-testid="local-player-name">
                      {state.localPlayer.name} (You)
                    </span>
                    {!isStrangerMatch && (
                      <button
                        type="button"
                        onClick={() => setIsEditingName(true)}
                        aria-label="Edit your name"
                        className="text-[var(--ttt-ink-muted)] hover:text-[var(--ttt-ink)] p-0.5"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
                <span className={styles.playerRole}>
                  {isHost ? 'Host' : 'Guest'}
                </span>
              </div>
            </div>

            <div className={styles.playerActions}>
              <span
                className={cn(
                  styles.readyBadge,
                  isLocalReady ? styles.readyBadgeYes : styles.readyBadgeNo
                )}
                data-testid="local-ready-badge"
              >
                {isLocalReady ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Ready</span>
                  </>
                ) : (
                  <span>Not ready</span>
                )}
              </span>
            </div>
          </div>

          {/* Remote Player Card */}
          <div
            className={cn(
              styles.playerCard,
              !isHost ? styles.playerCardHost : styles.playerCardGuest
            )}
            data-testid="remote-player-card"
          >
            <div className={styles.playerInfo}>
              <div
                className={cn(
                  styles.playerMark,
                  !isHost ? styles.playerMarkHost : styles.playerMarkGuest
                )}
                aria-label={`Opponent mark: ${!isHost ? 'X' : 'O'}`}
              >
                {!isHost ? 'X' : 'O'}
              </div>

              <div className={styles.playerDetails}>
                <span className={styles.playerName} data-testid="remote-player-name">
                  {state.remotePlayer
                    ? state.remotePlayer.name
                    : isStrangerMatch
                      ? 'Looking for opponent...'
                      : 'Waiting for friend...'}
                </span>
                <span className={styles.playerRole}>
                  {!isHost ? 'Host' : 'Guest'}
                </span>
              </div>
            </div>

            <div className={styles.playerActions}>
              {state.remotePlayer ? (
                <span
                  className={cn(
                    styles.readyBadge,
                    isRemoteReady ? styles.readyBadgeYes : styles.readyBadgeNo
                  )}
                  data-testid="remote-ready-badge"
                >
                  {isRemoteReady ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Ready</span>
                    </>
                  ) : (
                    <span>Not ready</span>
                  )}
                </span>
              ) : (
                <span className={cn(styles.readyBadge, styles.readyBadgeNo)}>
                  Connecting...
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Ready action button when unready */}
        {!isLocalReady && (
          <button
            type="button"
            className={styles.readyButton}
            onClick={() => setReady(true)}
            data-testid="ready-button"
            disabled={!canReady() || isStarting}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Ready to Play</span>
          </button>
        )}

        {/* When connected as guest with invalid code or wanting to change */}
        {!isHost && !isStrangerMatch && onTryAnotherCode && (
          <div className="text-center pt-2">
            <button
              type="button"
              className="text-xs text-[var(--ttt-ink-muted)] hover:underline"
              onClick={onTryAnotherCode}
            >
              Try another room code
            </button>
          </div>
        )}
      </div>

      {/* Rules Modal */}
      <EntryRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        rules={ticTacToeRules}
      />

      {/* QR Code Modal */}
      {showQr && qrDataUrl && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setShowQr(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Room invite QR code"
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={styles.modalTitle}>Scan to Join</h2>
            <p className="text-xs text-[var(--ttt-ink-muted)] text-center">
              Point a camera at this code to join Room {state.roomCode}
            </p>
            <div className={styles.qrContainer}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt={`QR Code for room ${state.roomCode}`} width={192} height={192} />
            </div>
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setShowQr(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
