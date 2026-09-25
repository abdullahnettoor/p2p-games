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

describe('BingoOnlineGame stranger matchmaking UI', () => {
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

  async function renderGame() {
    render(<BingoOnlineGame role="host" onExit={vi.fn()} />)
    await act(async () => {
      vi.runOnlyPendingTimers()
    })
  }

  it('searches inside the lobby, counts elapsed time, and cancels without rebuilding the lobby', async () => {
    const startSpy = vi.spyOn(LobbyCoordinator.prototype, 'start')
    const destroySpy = vi.spyOn(LobbyCoordinator.prototype, 'destroy')
    pendingFindMatch()
    await renderGame()
    expect(startSpy).toHaveBeenCalledTimes(1)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Play with a stranger/i }))
    })
    expect(screen.getByText(/Searching for a stranger… 0:00/)).toBeInTheDocument()
    expect(screen.getByLabelText('Match invite')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByText(/Searching for a stranger… 0:05/)).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    })
    expect(screen.getByRole('button', { name: /Play with a stranger/i })).toBeInTheDocument()
    // Same lobby throughout: no teardown, no second start.
    expect(startSpy).toHaveBeenCalledTimes(1)
    expect(destroySpy).not.toHaveBeenCalled()
  })

  it('offers to search again after a timeout, keeping the friend lobby', async () => {
    vi.spyOn(StrangerMatchmaker.prototype, 'findMatch').mockImplementation(async function (this: any) {
      this.status = 'timeout'
      throw new Error('Matchmaking timeout: no opponent found')
    })
    await renderGame()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Play with a stranger/i }))
    })

    expect(screen.getByRole('button', { name: /No one found · Search again/i })).toBeInTheDocument()
    expect(screen.getByLabelText('Match invite')).toBeInTheDocument()
  })

  it('switches to a guest lobby when a host enters a room code', async () => {
    const destroySpy = vi.spyOn(LobbyCoordinator.prototype, 'destroy')
    await renderGame()

    fireEvent.click(screen.getByRole('button', { name: /Have a code\? Join a friend/i }))
    fireEvent.change(screen.getByPlaceholderText('CODE'), { target: { value: 'k7m4qx' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Join' }))
      vi.runOnlyPendingTimers()
    })

    expect(destroySpy).toHaveBeenCalledTimes(1)
    expect(window.location.search).toBe('?room=K7M4QX')
    expect(screen.queryByLabelText('Match invite')).not.toBeInTheDocument()
  })
})
