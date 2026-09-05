import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { BingoMatchLobby } from './BingoMatchLobby'
import { LobbySession } from '@/core/lobby/LobbySession'
import { createLoopbackTransportPair } from '@/core/transport/LoopbackTransport'
import { validateBingoBoard } from '../engine'
import { BingoBoard } from '../types'

vi.mock('qrcode', () => ({
  toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,test-qr'),
}))

describe('BingoMatchLobby', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(navigator, {
      share: vi.fn().mockResolvedValue(undefined),
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
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

  it('keeps connection and both Player identities visible during setup', async () => {
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
    render(<BingoMatchLobby session={hostSession} />)

    expect(screen.getByText('HostPlayer')).toBeInTheDocument()
    expect(screen.getByText('GuestPlayer')).toBeInTheDocument()
    expect(screen.getByText(/Connected via P2P/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Host ink')).toBeInTheDocument()
    expect(screen.getByLabelText('Guest ink')).toBeInTheDocument()
  })

  it('shares the invite through the native share sheet', async () => {
    const session = await createHostSession()
    render(<BingoMatchLobby session={session} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share invite' }))
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
      fireEvent.click(screen.getByRole('button', { name: 'Share invite' }))
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(session.state.inviteUrl)
    expect(screen.getByText('Invite link copied')).toBeInTheDocument()
  })

  it('falls back to copying when native sharing fails', async () => {
    Object.assign(navigator, {
      share: vi.fn().mockRejectedValue(new Error('share unavailable')),
    })
    const session = await createHostSession()
    render(<BingoMatchLobby session={session} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share invite' }))
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(session.state.inviteUrl)
    expect(screen.getByText('Invite link copied')).toBeInTheDocument()
  })

  it('shows an actionable error when the invite cannot be copied', async () => {
    Object.assign(navigator, {
      share: undefined,
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    const session = await createHostSession()
    render(<BingoMatchLobby session={session} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share invite' }))
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Select the link and copy it manually')
  })

  it('shows an optional QR code without blocking board setup', async () => {
    const session = await createHostSession()
    render(<BingoMatchLobby session={session} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Show QR code' }))
    })

    expect(await screen.findByRole('img', { name: 'QR code for the Match invite' })).toHaveAttribute(
      'src',
      'data:image/png;base64,test-qr'
    )
    expect(screen.getByText('Place 1')).toBeInTheDocument()
  })

  it('allows customizing the Player display name', async () => {
    const session = await createHostSession()
    render(<BingoMatchLobby session={session} />)

    const nameInput = screen.getByLabelText(/your display name/i)
    fireEvent.change(nameInput, { target: { value: 'CaptainBingo' } })

    expect(session.state.localPlayer.name).toBe('CaptainBingo')
  })

  it('combines board completion and readiness in one action', async () => {
    const session = await createHostSession()
    render(<BingoMatchLobby session={session} />)

    fireEvent.click(screen.getByRole('button', { name: 'Shuffle board' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ready with this board' }))

    expect(session.state.localPlayer.setupConfig).toHaveLength(25)
    expect(session.state.localPlayer.isReady).toBe(true)
    expect(screen.getByText(/Your Board Is Locked/i)).toBeInTheDocument()
  })

  it('cancels readiness before reopening a board for editing', async () => {
    const session = await createHostSession()
    render(<BingoMatchLobby session={session} />)

    fireEvent.click(screen.getByRole('button', { name: 'Shuffle board' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ready with this board' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit board' }))

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

    await waitFor(() => {
      expect(onMatchStart).toHaveBeenCalled()
    })
  })
})
