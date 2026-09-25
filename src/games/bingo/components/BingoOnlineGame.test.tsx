import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { BingoOnlineGame } from './BingoOnlineGame'
import { StrangerMatchmaker } from '@/core/matchmaking/strangerMatch'
import { LobbyCoordinator } from '@/core/lobby/LobbyCoordinator'

// Mock PeerJSTransport so it doesn't open real WebRTC/PeerJS
vi.mock('@/core/transport/PeerJSTransport', () => {
  return {
    PeerJSTransport: class {
      public status = 'disconnected'
      public localPlayerId = 'mock-peer-id'
      public remotePlayerId = null
      public role: string
      constructor(options: { role: string }) {
        this.role = options.role
      }
      async connect() {
        this.status = 'connected'
        return this.localPlayerId
      }
      send() {}
      onMessage() { return () => {} }
      onStatusChange(h: any) { setTimeout(() => h('connected'), 0); return () => {} }
      onPlayerJoin() { return () => {} }
      onPlayerLeave() { return () => {} }
      onError() { return () => {} }
      onSignalingChange() { return () => {} }
      disconnect() { this.status = 'closed' }
    },
  }
})

describe('BingoOnlineGame entry flow and state machine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  function pendingFindMatch() {
    return vi.spyOn(StrangerMatchmaker.prototype, 'findMatch').mockImplementation(function (this: any) {
      return new Promise((_, reject) => {
        const originalCancel = this.cancel.bind(this)
        this.cancel = () => {
          originalCancel()
          reject(new Error('Matchmaking cancelled by player'))
        }
      })
    })
  }

  it('renders choice screen on /bingo and does not start a lobby until chosen', async () => {
    const startSpy = vi.spyOn(LobbyCoordinator.prototype, 'start')
    render(<BingoOnlineGame onExit={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Choose how to play' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create a room/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Join with a code/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Play with a stranger/i })).toBeInTheDocument()
    expect(startSpy).not.toHaveBeenCalled()
  })

  it('Create a room starts host lobby, and Back destroys lobby and returns to choice screen', async () => {
    const startSpy = vi.spyOn(LobbyCoordinator.prototype, 'start')
    const destroySpy = vi.spyOn(LobbyCoordinator.prototype, 'destroy')
    render(<BingoOnlineGame onExit={vi.fn()} />)

    // Click Create a room
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create a room/i }))
      vi.runOnlyPendingTimers()
    })

    expect(startSpy).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Match invite')).toBeInTheDocument()

    // Click Back
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Back to menu' }))
    })

    expect(destroySpy).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('heading', { name: 'Choose how to play' })).toBeInTheDocument()
  })

  it('Join with a code navigates to code input, joins guest lobby on valid code, and supports Try another code', async () => {
    render(<BingoOnlineGame onExit={vi.fn()} />)

    // Open Join with code screen
    fireEvent.click(screen.getByRole('button', { name: /Join with a code/i }))
    expect(screen.getByRole('heading', { name: 'Join with a code' })).toBeInTheDocument()

    const input = screen.getByPlaceholderText('CODE')
    const submitBtn = screen.getByRole('button', { name: 'Join Room' })

    // Invalid code
    fireEvent.change(input, { target: { value: 'XYZ' } })
    fireEvent.click(submitBtn)
    expect(screen.getByRole('alert')).toHaveTextContent(/Enter a valid 6-character room code/i)

    // Valid code
    await act(async () => {
      fireEvent.change(input, { target: { value: 'K7M4QX' } })
      fireEvent.click(submitBtn)
      vi.runOnlyPendingTimers()
    })

    // Now in guest lobby
    expect(screen.getByRole('grid', { name: 'BINGO Board setup' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Match invite')).not.toBeInTheDocument()
  })

  it('Play with a stranger searches, counts elapsed time, and cancel returns to choice screen', async () => {
    pendingFindMatch()
    render(<BingoOnlineGame onExit={vi.fn()} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Play with a stranger/i }))
    })

    expect(screen.getByRole('heading', { name: /Searching for a stranger…/i })).toBeInTheDocument()
    expect(screen.getByText('0:00')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByText('0:05')).toBeInTheDocument()

    // Cancel returns to choice screen
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel matchmaking search' }))
    })
    expect(screen.getByRole('heading', { name: 'Choose how to play' })).toBeInTheDocument()
  })

  it('Play with a stranger timeout shows options to search again or create room instead', async () => {
    vi.spyOn(StrangerMatchmaker.prototype, 'findMatch').mockImplementation(async function (this: any) {
      this.status = 'timeout'
      throw new Error('Matchmaking timeout')
    })
    render(<BingoOnlineGame onExit={vi.fn()} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Play with a stranger/i }))
      vi.runOnlyPendingTimers()
    })

    expect(screen.getByRole('heading', { name: /No one found right now/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Search again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create a room instead/i })).toBeInTheDocument()

    // Clicking Create a room instead goes to host lobby
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create a room instead/i }))
      vi.runOnlyPendingTimers()
    })
    expect(screen.getByLabelText('Match invite')).toBeInTheDocument()
  })

  it('initialRoomCode directly opens guest lobby', async () => {
    render(<BingoOnlineGame initialRoomCode="K7M4QX" onExit={vi.fn()} />)
    await act(async () => {
      vi.runOnlyPendingTimers()
    })

    expect(screen.getByRole('grid', { name: 'BINGO Board setup' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Match invite')).not.toBeInTheDocument()
  })

  it('initialAction=create directly opens host lobby', async () => {
    render(<BingoOnlineGame initialAction="create" onExit={vi.fn()} />)
    await act(async () => {
      vi.runOnlyPendingTimers()
    })

    expect(screen.getByLabelText('Match invite')).toBeInTheDocument()
  })
})
