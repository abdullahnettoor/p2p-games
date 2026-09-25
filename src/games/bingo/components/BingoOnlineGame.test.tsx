import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { BingoOnlineGame } from './BingoOnlineGame'
import { StrangerMatchmaker } from '@/core/matchmaking/strangerMatch'
import { LobbyCoordinator } from '@/core/lobby/LobbyCoordinator'

const mockTransports: any[] = []

// Mock PeerJSTransport so it doesn't open real WebRTC/PeerJS
vi.mock('@/core/transport/PeerJSTransport', () => {
  return {
    PeerJSTransport: class {
      public status = 'disconnected'
      public localPlayerId = 'mock-peer-id'
      public remotePlayerId = null
      public role: string
      public errorHandlers: ((err: any) => void)[] = []

      constructor(options: { role: string }) {
        this.role = options.role
        mockTransports.push(this)
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
      onError(h: any) {
        this.errorHandlers.push(h)
        return () => {}
      }
      triggerError(err: any) {
        for (const h of this.errorHandlers) h(err)
      }
      onSignalingChange() { return () => {} }
      disconnect() { this.status = 'closed' }
    },
  }
})

describe('BingoOnlineGame entry flow and state machine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockTransports.length = 0
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

  it('Create a room starts host lobby exactly once, and Back destroys lobby and returns to choice screen', async () => {
    const startSpy = vi.spyOn(LobbyCoordinator.prototype, 'start')
    const destroySpy = vi.spyOn(LobbyCoordinator.prototype, 'destroy')
    render(<BingoOnlineGame onExit={vi.fn()} />)

    // Click Create a room
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Create a room/i }))
      vi.runOnlyPendingTimers()
    })

    // Exactly one start call - no double lobby instantiation
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

  it('Try another code transitions from guest error back to join code screen without remounting to choice', async () => {
    render(<BingoOnlineGame initialRoomCode="K7M4QX" onExit={vi.fn()} />)
    await act(async () => {
      vi.runOnlyPendingTimers()
    })

    expect(screen.getByRole('grid', { name: 'BINGO Board setup' })).toBeInTheDocument()

    // Trigger an error on the guest transport
    const guestTransport = mockTransports[mockTransports.length - 1]
    expect(guestTransport).toBeDefined()

    act(() => {
      guestTransport.triggerError(new Error('Host is unavailable'))
    })

    const tryAnotherBtn = screen.getByRole('button', { name: 'Try another code' })
    expect(tryAnotherBtn).toBeInTheDocument()

    // Clicking "Try another code" should open the join-code screen, NOT the choice screen
    act(() => {
      fireEvent.click(tryAnotherBtn)
    })

    expect(screen.getByRole('heading', { name: 'Join with a code' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('CODE')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Choose how to play' })).not.toBeInTheDocument()
  })

  it('Play with a stranger searches, counts elapsed time, and single cancel button returns to choice screen', async () => {
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
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
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

  it('Play with a stranger error shows connection failed and Retry button', async () => {
    vi.spyOn(StrangerMatchmaker.prototype, 'findMatch').mockImplementation(async function (this: any) {
      this.status = 'error'
      throw new Error('Signaling server unreachable')
    })
    render(<BingoOnlineGame onExit={vi.fn()} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Play with a stranger/i }))
      vi.runOnlyPendingTimers()
    })

    expect(screen.getByRole('heading', { name: /Connection failed/i })).toBeInTheDocument()
    expect(screen.getByText('Signaling server unreachable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
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
