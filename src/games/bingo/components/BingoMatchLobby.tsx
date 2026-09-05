'use client'

import React, { useState } from 'react'
import { LobbySession } from '@/core/lobby/LobbySession'
import { useLobby } from '@/core/lobby/useLobby'
import { BingoBoard } from '../types'
import { BingoBoardSetup } from './BingoBoardSetup'
import { BingoBoardView } from './BingoBoardView'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Pencil,
  QrCode,
  Share2,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BingoMatchLobbyProps {
  session: LobbySession<BingoBoard>
  onExit?: () => void
  className?: string
}

type InviteFeedback = 'idle' | 'shared' | 'copied' | 'error'

function inkClasses(role: 'host' | 'guest'): string {
  return role === 'host' ? 'bg-blue-500 ring-blue-300/40' : 'bg-rose-500 ring-rose-300/40'
}

export const BingoMatchLobby: React.FC<BingoMatchLobbyProps> = ({
  session,
  onExit,
  className,
}) => {
  const { state, updatePlayerName, updateBoardSetup, setReady } = useLobby(session)
  const [localNameInput, setLocalNameInput] = useState(state.localPlayer.name)
  const [inviteFeedback, setInviteFeedback] = useState<InviteFeedback>('idle')
  const [showQrCode, setShowQrCode] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [qrCodeError, setQrCodeError] = useState(false)

  const copyInvite = async (inviteUrl: string) => {
    if (!navigator.clipboard?.writeText) {
      throw new Error('Clipboard is unavailable')
    }
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

  const handleCopyInvite = async () => {
    if (!state.inviteUrl) return
    setInviteFeedback('idle')
    try {
      await copyInvite(state.inviteUrl)
    } catch {
      setInviteFeedback('error')
    }
  }

  const handleToggleQrCode = async () => {
    if (showQrCode) {
      setShowQrCode(false)
      return
    }

    setShowQrCode(true)
    if (!state.inviteUrl || qrCodeDataUrl) return

    setQrCodeError(false)
    try {
      const { toDataURL } = await import('qrcode')
      const dataUrl = await toDataURL(state.inviteUrl, {
        width: 192,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
      setQrCodeDataUrl(dataUrl)
    } catch {
      setQrCodeError(true)
    }
  }

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalNameInput(event.target.value)
    updatePlayerName(event.target.value)
  }

  const handleBoardReady = (board: BingoBoard) => {
    updateBoardSetup(board)
    setReady(true)
  }

  const isLocalReady = state.localPlayer.isReady
  const isRemoteConnected = Boolean(state.remotePlayer?.connected)
  const isRemoteReady = Boolean(state.remotePlayer?.isReady)
  const isStarting = state.status === 'starting'
  const remoteRole = state.localPlayer.role === 'host' ? 'guest' : 'host'

  return (
    <div className={cn('space-y-6 max-w-4xl mx-auto w-full py-2', className)}>
      <div className="flex items-center justify-between">
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            className="min-h-11 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Leave Lobby</span>
          </button>
        ) : (
          <div />
        )}

        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>Match Lobby</span>
        </div>
      </div>

      {state.error ? (
        <div role="alert" className="p-4 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
          <div className="text-sm">
            <span className="font-bold">Connection error. </span>
            {state.error}
          </div>
        </div>
      ) : null}

      {state.localPlayer.role === 'host' && state.inviteUrl ? (
        <section className="p-5 rounded-3xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-800/40 space-y-4 shadow-lg" aria-labelledby="invite-heading">
          <div className="space-y-1">
            <h2 id="invite-heading" className="text-base font-bold text-white">Invite your friend</h2>
            <p className="text-sm text-slate-400">Share the link now. You can arrange your board while they connect.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleShareInvite}
              className="min-h-11 flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md transition-colors hover:bg-indigo-500"
            >
              <Share2 className="w-4 h-4" />
              Share invite
            </button>
            <button
              type="button"
              onClick={handleCopyInvite}
              className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
            >
              Copy link
            </button>
            <button
              type="button"
              onClick={handleToggleQrCode}
              aria-expanded={showQrCode}
              className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700"
            >
              <QrCode className="w-4 h-4" />
              {showQrCode ? 'Hide QR code' : 'Show QR code'}
            </button>
          </div>

          <input
            type="text"
            readOnly
            aria-label="Match invite link"
            value={state.inviteUrl}
            className="w-full min-h-11 bg-slate-950/80 border border-slate-800 rounded-xl px-3 text-xs text-slate-300 font-mono select-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {inviteFeedback === 'shared' ? <p role="status" className="text-sm text-emerald-300">Invite shared</p> : null}
          {inviteFeedback === 'copied' ? <p role="status" className="text-sm text-emerald-300">Invite link copied</p> : null}
          {inviteFeedback === 'error' ? (
            <p role="alert" className="text-sm text-red-300">Could not share the invite. Select the link and copy it manually.</p>
          ) : null}

          {showQrCode ? (
            <div className="rounded-2xl bg-white p-3 w-fit mx-auto" aria-live="polite">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="QR code for the Match invite" width={192} height={192} />
              ) : qrCodeError ? (
                <p className="max-w-48 text-center text-sm text-red-700">Could not create the QR code. Use the invite link instead.</p>
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-700">
                  <Loader2 className="w-6 h-6 animate-spin" aria-label="Creating QR code" />
                </div>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <section className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-md" aria-label="Your Player status">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2.5">
              <span aria-label={`${state.localPlayer.role === 'host' ? 'Host' : 'Guest'} ink`} className={cn('w-3 h-3 flex-none rounded-full ring-4', inkClasses(state.localPlayer.role))} />
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">You ({state.localPlayer.role.toUpperCase()})</span>
                <span className="text-sm font-extrabold text-white truncate block">{state.localPlayer.name}</span>
              </div>
            </div>
            <span
              className={
                isLocalReady
                  ? 'text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 bg-slate-800 text-slate-400 border-slate-700'
              }
            >
              {isLocalReady ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
              <span>{isLocalReady ? 'Ready' : 'Not ready'}</span>
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            <label htmlFor="display-name" className="block text-xs font-semibold text-slate-400 mb-1">Your display name</label>
            <input
              id="display-name"
              type="text"
              maxLength={20}
              value={localNameInput}
              disabled={isLocalReady}
              onChange={handleNameChange}
              placeholder="Enter your name"
              className="w-full min-h-11 bg-slate-950/60 border border-slate-800 rounded-xl px-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            />
          </div>
        </section>

        <section className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-md" aria-label="Opponent status">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2.5">
              <span aria-label={`${remoteRole === 'host' ? 'Host' : 'Guest'} ink`} className={cn('w-3 h-3 flex-none rounded-full ring-4', inkClasses(remoteRole))} />
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Opponent ({remoteRole.toUpperCase()})</span>
                <span className="text-sm font-extrabold text-white truncate block">{state.remotePlayer?.name || (isRemoteConnected ? 'Opponent' : 'Waiting...')}</span>
              </div>
            </div>
            <span
              className={
                isRemoteConnected && isRemoteReady
                  ? 'text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'text-xs font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 bg-slate-800 text-slate-400 border-slate-700'
              }
            >
              {isRemoteConnected ? <CheckCircle2 className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin" />}
              <span>{isRemoteConnected ? (isRemoteReady ? 'Ready' : 'Setting up') : 'Waiting'}</span>
            </span>
          </div>
          <div className="pt-2 border-t border-slate-800/80 text-sm text-slate-400 flex items-center justify-between gap-3">
            <span>Connection</span>
            <span className={cn('font-semibold', isRemoteConnected ? 'text-emerald-400' : 'text-amber-400')}>
              {isRemoteConnected ? 'Connected via P2P' : 'Awaiting connection'}
            </span>
          </div>
        </section>
      </div>

      <section className="p-4 sm:p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-6" aria-label="Board setup">
        {isLocalReady ? (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Your Board Is Locked</h2>
              <p className="text-sm text-slate-400">
                {isRemoteReady ? 'Both Players are ready. Starting the Match.' : 'Waiting for your opponent to finish.'}
              </p>
            </div>

            {state.localPlayer.setupConfig ? (
              <div className="max-w-xs mx-auto pt-2">
                <BingoBoardView board={state.localPlayer.setupConfig} calls={[]} playersById={{}} disabled />
              </div>
            ) : null}

            {!isStarting ? (
              <button
                type="button"
                onClick={() => setReady(false)}
                className="min-h-11 inline-flex items-center gap-2 px-4 rounded-xl border border-amber-800 text-sm text-amber-300 hover:bg-amber-950/50 font-semibold"
              >
                <Pencil className="w-4 h-4" />
                Edit board
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

        <div className="pt-4 border-t border-slate-800 text-center text-sm text-slate-400" aria-live="polite">
          {isStarting
            ? 'Both Players are ready. Starting BINGO.'
            : !isRemoteConnected
              ? 'Your friend can join while you arrange your board.'
              : isLocalReady
                ? 'Your board is ready. Waiting for your opponent.'
                : isRemoteReady
                  ? 'Your opponent is ready. Finish your board when you are set.'
                  : 'Arrange your board, then mark yourself ready.'}
        </div>
      </section>
    </div>
  )
}
