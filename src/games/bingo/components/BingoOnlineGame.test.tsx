import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { BingoOnlineGame } from './BingoOnlineGame'
import { StrangerMatchmaker } from '@/core/matchmaking/strangerMatch'

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
