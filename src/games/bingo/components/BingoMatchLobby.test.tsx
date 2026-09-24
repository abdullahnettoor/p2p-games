import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { BingoMatchLobby } from './BingoMatchLobby'
import { LobbySession } from '@/core/lobby/LobbySession'
import { createLoopbackTransportPair } from '@/core/transport/LoopbackTransport'
import { validateBingoBoard } from '../engine'
import { BingoBoard } from '../types'

function makeSessionState(overrides: Partial<LobbySession<BingoBoard>['state']> = {}) {
  return {
    status: 'error' as const,
    localPlayer: {
      id: 'host', name: 'HostPlayer', role: 'host' as const, isReady: false, connected: true,
    },
    remotePlayer: null,
    inviteUrl: null,
    error: 'Signaling connection timed out. Try again.',
    ...overrides,
  }
}

describe('BingoMatchLobby', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(navigator, {
      share: vi.fn().mockResolvedValue(undefined),
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  async function createHostSession() {
    const [hostTransport] = createLoopbackTransportPair()
    const session = new LobbySession<BingoBoard>({
      transport: hostTransport,
      playerName: 'HostPlayer',
      inviteUrlGenerator: (id) => `https://game.test/bingo?match=${id}`,
      validateSetup: (board) => validateBingoBoard(board).valid,
    })
    await session.start()
    return session
  }

  async function createConnectedSessions() {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()
    const hostSession = new LobbySession<BingoBoard>({
      transport: hostTransport,
      playerName: 'HostPlayer',
      inviteUrlGenerator: (id) => `https://game.test/bingo?match=${id}`,
      validateSetup: (board) => validateBingoBoard(board).valid,
    })
    const guestSession = new LobbySession<BingoBoard>({
      transport: guestTransport,
      playerName: 'GuestPlayer',
      validateSetup: (board) => validateBingoBoard(board).valid,
    })
    await hostSession.start()
    await guestSession.start()
    return { hostSession, guestSession }
  }

  it('uses one connection line instead of Player cards and keeps setup visible', async () => {
    const { hostSession } = await createConnectedSessions()
    render(<BingoMatchLobby session={hostSession} />)

    expect(screen.getByLabelText('Your name')).toHaveValue('HostPlayer')
    expect(screen.getByText(/Connected ·/i)).toBeInTheDocument()
    expect(screen.getByText(/Connected ·/i)).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: 'BINGO Board setup' })).toBeInTheDocument()
    expect(screen.queryByText('Opponent')).not.toBeInTheDocument()
  })

  it('keeps the preparing invite quiet while the Board is already interactive', () => {
    const [hostTransport] = createLoopbackTransportPair()
    const session = new LobbySession<BingoBoard>({
      transport: hostTransport,
      playerName: 'HostPlayer',
      inviteUrlGenerator: (id) => `https://game.test/bingo?match=${id}`,
      validateSetup: (board) => validateBingoBoard(board).valid,
    })
    render(<BingoMatchLobby session={session} />)

    expect(screen.getByText('Preparing invite')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Preparing invite/ })).toBeDisabled()
    expect(screen.getByRole('grid', { name: 'BINGO Board setup' })).toBeInTheDocument()
  })

  it('shares the invite through the native share sheet from the invite actions', async () => {
    const session = await createHostSession()
    render(<BingoMatchLobby session={session} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share invite link' }))
    })

    expect(navigator.share).toHaveBeenCalledWith({
      title: 'Join my BINGO Match',
      text: 'Join me for a BINGO Match.',
      url: session.state.inviteUrl,
    })
    expect(screen.getByText('Invite shared')).toBeInTheDocument()
  })

  it('copies the invite when native sharing is unavailable', async () => {
    Object.assign(navigator, { share: undefined })
    const session = await createHostSession()
    render(<BingoMatchLobby session={session} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share invite link' }))
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(session.state.inviteUrl)
    expect(screen.getByText('Invite link copied')).toBeInTheDocument()
  })

  it('falls back to copying when native sharing fails', async () => {
    Object.assign(navigator, { share: vi.fn().mockRejectedValue(new Error('share unavailable')) })
    const session = await createHostSession()
    render(<BingoMatchLobby session={session} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share invite link' }))
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(session.state.inviteUrl)
    expect(screen.getByText('Invite link copied')).toBeInTheDocument()
  })

  it('shows an actionable fallback link when sharing and copying both fail', async () => {
    Object.assign(navigator, {
      share: undefined,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    const session = await createHostSession()
    render(<BingoMatchLobby session={session} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share invite link' }))
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Could not share automatically')
    expect(screen.getByRole('link')).toHaveAttribute('href', session.state.inviteUrl)
  })

  it('opens an in-app QR sheet without invoking the share sheet', async () => {
    const session = await createHostSession()
    render(<BingoMatchLobby session={session} />)

    fireEvent.click(screen.getByRole('button', { name: 'Show invite QR code' }))

    expect(screen.getByRole('dialog', { name: 'Invite QR code' })).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: 'QR code for the Bingo Match invite' })).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close invite QR code' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Invite QR code' })).not.toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Show invite QR code' }))
    expect(navigator.share).not.toHaveBeenCalled()
  })

  it('shows an actionable failure reason and retries without removing the board', async () => {
    const retry = vi.fn().mockResolvedValue(undefined)
    const session = {
      state: makeSessionState(),
      subscribe: () => () => {},
      updatePlayerName: vi.fn(),
      updateBoardSetup: vi.fn(),
      setReady: vi.fn(),
      retry,
    } as unknown as LobbySession<BingoBoard>
    render(<BingoMatchLobby session={session} />)

    expect(screen.getByText(/Signaling connection timed out/i)).toBeInTheDocument()
    expect(screen.getByRole('grid', { name: 'BINGO Board setup' })).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry invite connection' }))
    })
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('shows the Guest layout without an invite pill', async () => {
    const { guestSession } = await createConnectedSessions()
    render(<BingoMatchLobby session={guestSession} />)

    expect(screen.queryByRole('region', { name: 'Match invite' })).not.toBeInTheDocument()
    expect(screen.getByRole('grid', { name: 'BINGO Board setup' })).toBeInTheDocument()
    expect(screen.getByText(/Connected ·/i)).toBeInTheDocument()
  })

  it('opens the variant-specific rules sheet', async () => {
    const session = await createHostSession()
    render(<BingoMatchLobby session={session} />)

    fireEvent.click(screen.getByRole('button', { name: 'Bingo rules' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('BINGO Sunday Puzzle')
    expect(screen.getByText('Two-player online variant')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close Bingo rules' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('combines board completion and readiness in one action', async () => {
    const session = await createHostSession()
    render(<BingoMatchLobby session={session} />)

    fireEvent.click(screen.getByRole('button', { name: 'Shuffle board' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ready with this board' }))

    expect(session.state.localPlayer.setupConfig).toHaveLength(25)
    expect(session.state.localPlayer.isReady).toBe(true)
    expect(screen.getByText(/Board ready/i)).toBeInTheDocument()
  })

  it('cancels readiness before reopening a board for editing', async () => {
    const session = await createHostSession()
    render(<BingoMatchLobby session={session} />)

    fireEvent.click(screen.getByRole('button', { name: 'Shuffle board' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ready with this board' }))
    fireEvent.click(screen.getByRole('button', { name: /Edit Board/i }))

    expect(session.state.localPlayer.isReady).toBe(false)
    expect(screen.getByText('All 25 placed')).toBeInTheDocument()
  })

  it('starts the Match when both Players are ready with valid boards', async () => {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()
    const onMatchStart = vi.fn()
    const hostSession = new LobbySession<BingoBoard>({
      transport: hostTransport,
      playerName: 'Host',
      validateSetup: (board) => validateBingoBoard(board).valid,
      onMatchStart,
    })
    const guestSession = new LobbySession<BingoBoard>({
      transport: guestTransport,
      playerName: 'Guest',
      validateSetup: (board) => validateBingoBoard(board).valid,
    })

    await act(async () => {
      await hostSession.start()
      await guestSession.start()
    })

    const board = Array.from({ length: 25 }, (_, index) => index + 1)
    act(() => {
      hostSession.updateBoardSetup(board)
      guestSession.updateBoardSetup(board)
      guestSession.setReady(true)
    })

    render(<BingoMatchLobby session={hostSession} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ready with this board' }))

    await waitFor(() => expect(onMatchStart).toHaveBeenCalled())
  })

  it('displays the room code when available in the lobby state', async () => {
    const session = await createHostSession()
    session.state.roomCode = 'K7M4QX'

    render(<BingoMatchLobby session={session} />)
    expect(screen.getByText('Room code:')).toBeInTheDocument()
    expect(screen.getByText('K7M4QX')).toBeInTheDocument()
  })

  it('displays reconnecting status in the invite pill when signaling drops', async () => {
    const session = await createHostSession()
    session.state.isReconnecting = true

    render(<BingoMatchLobby session={session} />)
    expect(screen.getByText(/Reconnecting…/i)).toBeInTheDocument()
    expect(screen.getByText(/Reconnecting to matchmaking…/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show invite QR code' })).not.toBeInTheDocument()
  })

  it('hides room code entry input for hosts', async () => {
    const session = await createHostSession()
    render(<BingoMatchLobby session={session} />)
    expect(screen.queryByRole('button', { name: /Join another room with a code/i })).not.toBeInTheDocument()
  })

  it('shows room code entry input for guests and navigates on submit', async () => {
    const [, guestTransport] = createLoopbackTransportPair()
    const guestSession = new LobbySession<BingoBoard>({
      transport: guestTransport,
      playerName: 'GuestPlayer',
      validateSetup: (board) => validateBingoBoard(board).valid,
    })
    const onJoinRoomCode = vi.fn()

    render(<BingoMatchLobby session={guestSession} onJoinRoomCode={onJoinRoomCode} />)
    const toggleButton = screen.getByRole('button', { name: /Join another room with a code/i })
    fireEvent.click(toggleButton)

    const input = screen.getByPlaceholderText('CODE')
    fireEvent.change(input, { target: { value: 'k7m4qx' } })
    fireEvent.click(screen.getByRole('button', { name: 'Join' }))

    expect(onJoinRoomCode).toHaveBeenCalledWith('K7M4QX')
  })

  it('closes QR modal when signaling drops into reconnecting or error', async () => {
    const session = await createHostSession()
    render(<BingoMatchLobby session={session} />)

    // Open QR modal
    const qrButton = screen.getByRole('button', { name: 'Show invite QR code' })
    fireEvent.click(qrButton)
    expect(screen.getByRole('dialog', { name: 'Invite QR code' })).toBeInTheDocument()

    // Signaling drops into reconnecting
    act(() => {
      ;(session as any).state = { ...(session as any).state, isReconnecting: true }
      ;(session as any).notify()
    })

    expect(screen.queryByRole('dialog', { name: 'Invite QR code' })).not.toBeInTheDocument()
  })
})
