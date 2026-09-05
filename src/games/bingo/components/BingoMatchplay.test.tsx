import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { BingoMatchplay } from './BingoMatchplay'
import { BingoMatchCoordinator } from '../state/BingoMatchCoordinator'
import { createLoopbackTransportPair } from '@/core/transport/LoopbackTransport'
import { MatchStartEvent } from '@/core/lobby/types'
import { BingoBoard } from '../types'

describe('BingoMatchplay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function createTestCoordinators() {
    const [hostTransport, guestTransport] = createLoopbackTransportPair()
    hostTransport.connect()
    guestTransport.connect()

    const board = Array.from({ length: 25 }, (_, i) => i + 1)

    const matchStartEvent: MatchStartEvent<BingoBoard> = {
      hostId: hostTransport.localPlayerId,
      guestId: guestTransport.localPlayerId,
      startingPlayerId: hostTransport.localPlayerId, // Host starts
      hostSetup: board,
      guestSetup: board,
    }

    const hostCoordinator = new BingoMatchCoordinator({
      transport: hostTransport,
      localPlayer: { id: hostTransport.localPlayerId, name: 'Alice', role: 'host' },
      remotePlayer: { id: guestTransport.localPlayerId, name: 'Bob', role: 'guest' },
      matchStartEvent,
      turnDurationSeconds: 30,
    })

    const guestCoordinator = new BingoMatchCoordinator({
      transport: guestTransport,
      localPlayer: { id: guestTransport.localPlayerId, name: 'Bob', role: 'guest' },
      remotePlayer: { id: hostTransport.localPlayerId, name: 'Alice', role: 'host' },
      matchStartEvent,
      turnDurationSeconds: 30,
    })

    return { hostCoordinator, guestCoordinator, board }
  }

  it('renders active match screen with turn indicator and timer', () => {
    const { hostCoordinator } = createTestCoordinators()

    render(<BingoMatchplay coordinator={hostCoordinator} onExit={vi.fn()} />)

    expect(screen.getAllByText(/Your Turn/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/30s/i)).toBeInTheDocument()
    expect(screen.getByText(/Alice/i)).toBeInTheDocument()
    expect(screen.getByText(/Bob/i)).toBeInTheDocument()
  })

  it('allows picking a number during my turn and updates board', () => {
    const { hostCoordinator, guestCoordinator } = createTestCoordinators()

    render(<BingoMatchplay coordinator={hostCoordinator} onExit={vi.fn()} />)

    // Click number '7'
    const button7 = screen.getByRole('button', { name: '7' })
    act(() => {
      fireEvent.click(button7)
    })

    expect(hostCoordinator.state.gameState.calledNumbers).toContain(7)
    expect(guestCoordinator.state.gameState.calledNumbers).toContain(7)

    // Turn should now be opponent's
    expect(screen.getByText(/Bob's Turn/i)).toBeInTheDocument()
  })

  it('displays game-over modal when match concludes', () => {
    const { hostCoordinator, guestCoordinator } = createTestCoordinators()

    render(<BingoMatchplay coordinator={hostCoordinator} onExit={vi.fn()} />)

    // Complete rows 1-5 to trigger win
    act(() => {
      for (let num = 1; num <= 25; num++) {
        if (hostCoordinator.state.gameState.status === 'completed') break
        if (hostCoordinator.isMyTurn) {
          hostCoordinator.submitMove(num)
        } else {
          guestCoordinator.submitMove(num)
        }
      }
    })

    expect(hostCoordinator.state.gameState.status).toBe('completed')
    expect(screen.getByText(/(VICTORY!|IT'S A DRAW!)/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /exit to games hub/i })).toBeInTheDocument()
  })
})
