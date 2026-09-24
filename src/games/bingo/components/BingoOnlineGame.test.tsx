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
      public role = 'host'
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

  it('renders standard lobby and transitions to searching when Play with a stranger is clicked', async () => {
    const onExit = vi.fn()
    render(<BingoOnlineGame role="host" onExit={onExit} />)

    // Flush mount effects
    await act(async () => {
      vi.runOnlyPendingTimers()
    })

    // Initially in friend lobby
    const strangerBtn = screen.getByRole('button', { name: /Play with a stranger/i })
    expect(strangerBtn).toBeInTheDocument()

    // Click Play with a stranger
    await act(async () => {
      fireEvent.click(strangerBtn)
    })

    // Searching screen is displayed
    expect(screen.getByText(/Looking for a stranger…/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cancel search/i })).toBeInTheDocument()
    expect(screen.getByText(/Time elapsed:/i)).toHaveTextContent('00:00')

    // Advance timer by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByText(/Time elapsed:/i)).toHaveTextContent('00:05')

    // Clicking cancel search returns to friend lobby
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Cancel search/i }))
    })
    expect(screen.queryByText(/Looking for a stranger…/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Play with a stranger/i })).toBeInTheDocument()
  })

  it("cancelling search creates exactly one friend lobby and calls start once", async () => {
    const startSpy = vi.spyOn(LobbyCoordinator.prototype, "start")
    const onExit = vi.fn()

    // Mock findMatch to stay pending until cancel
    vi.spyOn(StrangerMatchmaker.prototype, "findMatch").mockImplementation(function (this: any) {
      return new Promise((_, reject) => {
        const originalCancel = this.cancel.bind(this)
        this.cancel = () => {
          originalCancel()
          reject(new Error("Matchmaking cancelled by player"))
        }
      })
    })

    render(<BingoOnlineGame role="host" onExit={onExit} />)

    await act(async () => {
      vi.runOnlyPendingTimers()
    })

    // Mount started the initial lobby exactly once
    expect(startSpy).toHaveBeenCalledTimes(1)

    // Start stranger search
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Play with a stranger/i }))
    })

    // Click cancel search
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Cancel search/i }))
      vi.runOnlyPendingTimers()
    })

    // Returned to friend lobby, start should be called exactly once more (total 2)
    expect(startSpy).toHaveBeenCalledTimes(2)
    expect(screen.getByRole("button", { name: /Play with a stranger/i })).toBeInTheDocument()
  })

  it('shows timeout screen when matchmaking times out after 60s', async () => {
    const onExit = vi.fn()

    // Mock StrangerMatchmaker.prototype.findMatch to reject with timeout
    vi.spyOn(StrangerMatchmaker.prototype, 'findMatch').mockImplementation(async function (this: any) {
      this.status = 'timeout'
      throw new Error('Matchmaking timeout: no opponent found')
    })

    render(<BingoOnlineGame role="host" onExit={onExit} />)

    await act(async () => {
      vi.runOnlyPendingTimers()
    })

    // Start search
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Play with a stranger/i }))
    })

    // Timeout screen is shown
    expect(screen.getByText(/No opponents found yet/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Keep waiting/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Invite a friend instead/i })).toBeInTheDocument()

    // Choosing invite a friend instead returns to friend lobby
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Invite a friend instead/i }))
    })
    expect(screen.getByRole('button', { name: /Play with a stranger/i })).toBeInTheDocument()
  })
})
