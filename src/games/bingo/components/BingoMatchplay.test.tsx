import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { BingoMatchplay } from './BingoMatchplay'
import { BingoMatchCoordinator } from '../state/BingoMatchCoordinator'
import { createLoopbackTransportPair } from '@/core/transport/LoopbackTransport'
import { MatchStartEvent } from '@/core/lobby/types'
import { BingoBoard } from '../types'
import { getCalledNumbers } from '../engine'

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

    expect(screen.getByText('Your turn')).toBeInTheDocument()
    expect(screen.getByText(/30s/i)).toBeInTheDocument()
    expect(screen.getByText(/Alice/i)).toBeInTheDocument()
    expect(screen.getByText(/Bob/i)).toBeInTheDocument()
  })

  it('keeps Recent Calls and Match history as a sibling below the status/Board layout', () => {
    const { hostCoordinator } = createTestCoordinators()
    render(<BingoMatchplay coordinator={hostCoordinator} onExit={vi.fn()} />)

    const main = screen.getByRole('main', { name: 'Bingo scorecard' })
    const matchBody = main.querySelector('[class*="matchBody"]')
    const matchRecord = screen.getByRole('complementary', { name: 'Match record' })

    expect(matchBody).not.toContainElement(matchRecord)
    expect(main).toContainElement(matchRecord)
  })

  it('consolidates players, stamps, turn, and timer into the status strip', () => {
    const { hostCoordinator } = createTestCoordinators()
    render(<BingoMatchplay coordinator={hostCoordinator} onExit={vi.fn()} />)

    const status = screen.getByRole('region', { name: 'Match status' })
    expect(within(status).getByText('Alice')).toBeInTheDocument()
    expect(within(status).getByText('Bob')).toBeInTheDocument()
    expect(within(status).getAllByLabelText(/5 Bingo lines complete/)).toHaveLength(2)
    expect(within(status).getByRole('timer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pass turn' })).toBeInTheDocument()
    expect(screen.getByRole('toolbar', { name: 'Quick reactions' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send doodle 🔥' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Match notes' })).toBeInTheDocument()
  })

  it('allows picking a number during my turn and updates board', () => {
    const { hostCoordinator, guestCoordinator } = createTestCoordinators()

    render(<BingoMatchplay coordinator={hostCoordinator} onExit={vi.fn()} />)

    // Click number '7'
    const button7 = screen.getByRole('button', { name: '7' })
    act(() => {
      fireEvent.click(button7)
    })

    expect(getCalledNumbers(hostCoordinator.state.gameState.history)).toContain(7)
    expect(getCalledNumbers(guestCoordinator.state.gameState.history)).toContain(7)

    // Turn should now be opponent's
    expect(screen.getByText("Bob's turn")).toBeInTheDocument()
  })

  it('shows the latest Call slip and caller ink on both clients', () => {
    const { hostCoordinator, guestCoordinator } = createTestCoordinators()

    const { container: hostView } = render(
      <BingoMatchplay coordinator={hostCoordinator} onExit={vi.fn()} />
    )
    const { container: guestView } = render(
      <BingoMatchplay coordinator={guestCoordinator} onExit={vi.fn()} />
    )

    act(() => {
      fireEvent.click(screen.getAllByRole('button', { name: '7' })[0])
    })

    expect(screen.getAllByLabelText('Latest Call')).toHaveLength(2)
    expect(screen.getAllByText('Alice called')).toHaveLength(2)
    expect(hostView.querySelector('[data-call-number="7"][data-ink="host"]')).toBeInTheDocument()
    expect(guestView.querySelector('[data-call-number="7"][data-ink="host"]')).toBeInTheDocument()
  })

  it('keeps the Call slip in the status strip so it cannot cover Board cells', () => {
    const { hostCoordinator } = createTestCoordinators()
    const { container } = render(<BingoMatchplay coordinator={hostCoordinator} onExit={vi.fn()} />)

    expect(container.querySelector('[aria-label="Latest Call"]')).not.toBeInTheDocument()
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: '7' }))
    })

    const callSlip = screen.getByLabelText('Latest Call')
    expect(callSlip).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Match status' })).getByLabelText('Latest Call')).toBe(callSlip)
    expect(container.querySelector('.boardStage [aria-label="Latest Call"]')).not.toBeInTheDocument()
  })

  it('opens rules and Match notes as sheets without adding persistent rows', () => {
    const { hostCoordinator } = createTestCoordinators()
    render(<BingoMatchplay coordinator={hostCoordinator} onExit={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Bingo rules' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Two-player online Bingo')
    fireEvent.click(screen.getByRole('button', { name: 'Close Bingo rules' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Match notes' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Match notes')
    fireEvent.click(screen.getByRole('button', { name: 'Close Match notes' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('guards explicit and hardware-back exit with a forfeit confirmation', async () => {
    const { hostCoordinator, guestCoordinator } = createTestCoordinators()
    const onExit = vi.fn()
    render(<BingoMatchplay coordinator={hostCoordinator} onExit={onExit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Exit Match' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Bob will win')
    fireEvent.click(screen.getByText('Keep playing', { selector: 'button' }))
    expect(onExit).not.toHaveBeenCalled()

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Forfeit and exit' }))
    })

    expect(onExit).toHaveBeenCalledTimes(1)
    expect(hostCoordinator.state.winResult).toEqual({ isGameOver: true, winnerId: guestCoordinator.state.localPlayer.id, reason: 'forfeit' })
    expect(guestCoordinator.state.winResult.winnerId).toBe(guestCoordinator.state.localPlayer.id)
  })

  it('lets the active Player pass the turn', () => {
    const { hostCoordinator, guestCoordinator } = createTestCoordinators()

    render(<BingoMatchplay coordinator={hostCoordinator} onExit={vi.fn()} />)

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Pass turn' }))
    })

    expect(screen.getByText(/Passing ends your turn/)).toBeInTheDocument()
    expect(screen.getByText(/Bob is next/)).toBeInTheDocument()

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Pass and end turn' }))
    })

    expect(hostCoordinator.state.gameState.history).toEqual([
      {
        type: 'pass',
        playerId: hostCoordinator.state.localPlayer.id,
        reason: 'voluntary',
        sequence: 1,
      },
    ])
    expect(guestCoordinator.state.gameState.history).toEqual(hostCoordinator.state.gameState.history)
    expect(screen.getByText("Bob's turn")).toBeInTheDocument()
  })

  it('displays a full result Shell screen when Match concludes', () => {
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
    expect(screen.getByText(/(VICTORY|DEFEAT|IT'S A DRAW!)/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /exit to games/i })).toBeInTheDocument()
  })

  it('renders sound toggle button and toggles mute state', () => {
    const { hostCoordinator } = createTestCoordinators()
    render(<BingoMatchplay coordinator={hostCoordinator} onExit={vi.fn()} />)

    const soundBtn = screen.getByRole('button', { name: /mute sound effects/i })
    expect(soundBtn).toBeInTheDocument()

    fireEvent.click(soundBtn)
    expect(screen.getByRole('button', { name: /unmute sound effects/i })).toBeInTheDocument()
  })

  it('renders direct quick reactions and dispatches a floating reaction on click', () => {
    const { hostCoordinator, guestCoordinator } = createTestCoordinators()
    render(<BingoMatchplay coordinator={hostCoordinator} onExit={vi.fn()} />)

    const doodleBtn = screen.getByRole('button', { name: 'Send doodle 🔥' })
    expect(doodleBtn).toBeInTheDocument()

    fireEvent.click(doodleBtn)

    // Both local screen and remote coordinator receive reaction
    expect(screen.getAllByText('🔥').length).toBe(2)
    expect(screen.getByText('You')).toBeInTheDocument()

    // Remote coordinator sends reaction back
    act(() => {
      guestCoordinator.sendReaction('👋')
    })

    expect(screen.getAllByText('👋').length).toBe(2)
    expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(2)
  })

  it('keeps only the previous four Calls in the compact trail and all events in Match notes', () => {
    const { hostCoordinator, guestCoordinator } = createTestCoordinators()
    render(<BingoMatchplay coordinator={hostCoordinator} onExit={vi.fn()} />)

    act(() => {
      for (let number = 1; number <= 5; number += 1) {
        if (hostCoordinator.isMyTurn) hostCoordinator.submitMove(number)
        else guestCoordinator.submitMove(number)
      }
    })

    const recentCalls = screen.getByRole('region', { name: 'Recent Calls' })
    const matchNotes = screen.getByText('Match notes')
    act(() => {
      fireEvent.click(matchNotes)
    })

    expect(recentCalls).toBeInTheDocument()
    expect(within(recentCalls).getAllByLabelText(/called by/)).toHaveLength(4)
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
  })
})
