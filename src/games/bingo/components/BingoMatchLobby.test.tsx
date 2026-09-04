import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { BingoMatchLobby } from './BingoMatchLobby'
import { LobbySession } from '@/core/lobby/LobbySession'
import { createLoopbackTransportPair } from '@/core/transport/LoopbackTransport'
import { validateBingoBoard } from '../engine'
import { BingoBoard } from '../types'

describe('BingoMatchLobby', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders Host lobby and shows waiting status and invite link', async () => {
    const [hostTransport] = createLoopbackTransportPair()
    const session = new LobbySession<BingoBoard>({
      transport: hostTransport,
      playerName: 'HostPlayer',
      inviteUrlGenerator: (id) => `https://game.test/bingo?match=${id}`,
      validateSetup: (board) => validateBingoBoard(board).valid,
    })

    await act(async () => {
      await session.start()
    })

    render(<BingoMatchLobby session={session} />)

    expect(screen.getByText('HostPlayer')).toBeInTheDocument()
    expect(screen.getByText(/Waiting for opponent/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/https:\/\/game\.test\/bingo\?match=/i)).toBeInTheDocument()

    // Test clipboard copy
    const copyButton = screen.getByRole('button', { name: /copy/i })
    await act(async () => {
      fireEvent.click(copyButton)
    })
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(session.state.inviteUrl)
  })

  it('allows customizing player display name', async () => {
    const [hostTransport] = createLoopbackTransportPair()
    const session = new LobbySession<BingoBoard>({
      transport: hostTransport,
      playerName: 'HostPlayer',
    })
    await session.start()

    render(<BingoMatchLobby session={session} />)

    const nameInput = screen.getByLabelText(/your display name/i)
    fireEvent.change(nameInput, { target: { value: 'CaptainBingo' } })

    expect(session.state.localPlayer.name).toBe('CaptainBingo')
  })

  it('disables Ready button until board is completed', async () => {
    const [hostTransport] = createLoopbackTransportPair()
    const session = new LobbySession<BingoBoard>({
      transport: hostTransport,
      validateSetup: (board) => validateBingoBoard(board).valid,
    })
    await session.start()

    render(<BingoMatchLobby session={session} />)

    const readyBtn = screen.getByRole('button', { name: /set up board first/i })
    expect(readyBtn).toBeDisabled()
  })

  it('enables Ready button when board is completed via Randomize and toggles Ready', async () => {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()
    const hostSession = new LobbySession<BingoBoard>({
      transport: hostTransport,
      playerName: 'Host',
      validateSetup: (board) => validateBingoBoard(board).valid,
    })
    const guestSession = new LobbySession<BingoBoard>({
      transport: guestTransport,
      playerName: 'Guest',
      validateSetup: (board) => validateBingoBoard(board).valid,
    })

    await hostSession.start()
    await guestSession.start()

    render(<BingoMatchLobby session={hostSession} />)

    // Click Randomize Board
    const randomizeBtn = screen.getByRole('button', { name: /randomize/i })
    fireEvent.click(randomizeBtn)

    // Confirm Board in setup
    const confirmBtn = screen.getByRole('button', { name: /confirm board/i })
    fireEvent.click(confirmBtn)

    // Ready button should now be enabled
    const readyBtn = screen.getByRole('button', { name: /i'm ready/i })
    expect(readyBtn).not.toBeDisabled()

    fireEvent.click(readyBtn)
    expect(hostSession.state.localPlayer.isReady).toBe(true)
  })

  it('triggers onMatchStart when both players are ready with valid boards', async () => {
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

    // Host fills and confirms board
    const dummyBoard = Array.from({ length: 25 }, (_, i) => i + 1)
    act(() => {
      hostSession.updateBoardSetup(dummyBoard)
      guestSession.updateBoardSetup(dummyBoard)
    })

    render(<BingoMatchLobby session={hostSession} />)

    // Guest readies up
    act(() => {
      guestSession.setReady(true)
    })

    // Host readies up
    const readyBtn = screen.getByRole('button', { name: /i'm ready/i })
    act(() => {
      fireEvent.click(readyBtn)
    })

    await waitFor(() => {
      expect(onMatchStart).toHaveBeenCalled()
    })
  })
})
