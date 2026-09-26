import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within, act } from '@testing-library/react'
import { createLoopbackTransportPair } from '@/core/transport/LoopbackTransport'
import { TicTacToeMatchCoordinator } from '../state/TicTacToeMatchCoordinator'
import { TicTacToeTurnTimer } from './TicTacToeTurnTimer'
import { TicTacToeReactionBar } from './TicTacToeReactionBar'
import { TicTacToeBetweenRoundsOverlay } from './TicTacToeBetweenRoundsOverlay'
import { TicTacToeResultScreen } from './TicTacToeResultScreen'
import { TicTacToeMatchplay } from './TicTacToeMatchplay'
import { createSeries } from '@/core/series/series'

describe('TicTacToe Matchplay Components', () => {
  describe('TicTacToeTurnTimer', () => {
    it('renders normal timer badge when > 5s', () => {
      render(<TicTacToeTurnTimer secondsRemaining={12} isMyTurn={true} />)
      const timer = screen.getByTestId('ttt-turn-timer')
      expect(timer).toBeInTheDocument()
      expect(timer).toHaveTextContent('12s')
      expect(timer.className).not.toContain('timerUrgent')
    })

    it('renders urgent styling when <= 5s', () => {
      render(<TicTacToeTurnTimer secondsRemaining={4} isMyTurn={true} />)
      const timer = screen.getByTestId('ttt-turn-timer')
      expect(timer.className).toContain('timerUrgent')
      expect(timer).toHaveTextContent('4s')
    })
  })

  describe('TicTacToeReactionBar', () => {
    it('calls onSendReaction when emoji clicked', () => {
      const onSendReaction = vi.fn()
      render(<TicTacToeReactionBar onSendReaction={onSendReaction} />)
      const btn = screen.getByRole('button', { name: /Send reaction ✏️/i })
      fireEvent.click(btn)
      expect(onSendReaction).toHaveBeenCalledWith('✏️')
    })
  })

  describe('TicTacToeBetweenRoundsOverlay', () => {
    const series = createSeries({
      bestOf: 3,
      players: ['host-1', 'guest-1'],
      round1StarterId: 'host-1',
    })

    it('renders round outcome and score, and handles next click', () => {
      const onNext = vi.fn()
      render(
        <TicTacToeBetweenRoundsOverlay
          seriesState={series}
          roundRecords={[
            {
              roundNumber: 1,
              startingPlayerId: 'host-1',
              winnerId: 'host-1',
              isDraw: false,
              winningLine: [0, 1, 2],
            },
          ]}
          localPlayer={{ id: 'host-1', name: 'Alice', role: 'host' }}
          remotePlayer={{ id: 'guest-1', name: 'Bob', role: 'guest' }}
          secondsRemaining={3}
          localReady={false}
          remoteReady={false}
          isHostWaitingInGrace={false}
          onNext={onNext}
        />
      )

      expect(screen.getByText('You won Round 1!')).toBeInTheDocument()
      const nextBtn = screen.getByTestId('ttt-next-round-btn')
      expect(nextBtn).toHaveTextContent('Next (starts in 3s)')
      fireEvent.click(nextBtn)
      expect(onNext).toHaveBeenCalled()
    })

    it('shows waiting host message when isHostWaitingInGrace is true', () => {
      render(
        <TicTacToeBetweenRoundsOverlay
          seriesState={series}
          roundRecords={[
            {
              roundNumber: 1,
              startingPlayerId: 'host-1',
              winnerId: 'guest-1',
              isDraw: false,
            },
          ]}
          localPlayer={{ id: 'guest-1', name: 'Bob', role: 'guest' }}
          remotePlayer={{ id: 'host-1', name: 'Alice', role: 'host' }}
          secondsRemaining={3}
          localReady={false}
          remoteReady={false}
          isHostWaitingInGrace={true}
          onNext={vi.fn()}
        />
      )

      expect(screen.getByTestId('ttt-waiting-host')).toBeInTheDocument()
      expect(screen.getByText(/Waiting for Host to reconnect/i)).toBeInTheDocument()
    })
  })

  describe('TicTacToeResultScreen', () => {
    const series = createSeries({
      bestOf: 3,
      players: ['host-1', 'guest-1'],
      round1StarterId: 'host-1',
    })

    it('renders winner headline, final score, round list, and triggers rematch', () => {
      const onRequestRematch = vi.fn()
      const onExit = vi.fn()

      render(
        <TicTacToeResultScreen
          winResult={{ isGameOver: true, winnerId: 'host-1', isDraw: false }}
          seriesState={series}
          roundRecords={[
            {
              roundNumber: 1,
              startingPlayerId: 'host-1',
              winnerId: 'host-1',
              isDraw: false,
            },
          ]}
          localPlayer={{ id: 'host-1', name: 'Alice', role: 'host' }}
          remotePlayer={{ id: 'guest-1', name: 'Bob', role: 'guest' }}
          rematchState="none"
          onRequestRematch={onRequestRematch}
          onAcceptRematch={vi.fn()}
          onDeclineRematch={vi.fn()}
          onExit={onExit}
        />
      )

      expect(screen.getByText('You Won the Match!')).toBeInTheDocument()
      expect(screen.getByTestId('ttt-rematch-btn')).toBeInTheDocument()
      fireEvent.click(screen.getByTestId('ttt-rematch-btn'))
      expect(onRequestRematch).toHaveBeenCalled()

      fireEvent.click(screen.getByTestId('ttt-exit-catalog-btn'))
      expect(onExit).toHaveBeenCalled()
    })
  })

  describe('TicTacToeMatchplay full integration', () => {
    it('renders matchplay container and allows submitting moves', async () => {
      const [t1, t2] = createLoopbackTransportPair()
      await t1.connect()
      await t2.connect()

      const host = new TicTacToeMatchCoordinator({
        transport: t1,
        localPlayer: { id: 'p1', name: 'Alice', role: 'host' },
        remotePlayer: { id: 'p2', name: 'Bob', role: 'guest' },
        bestOf: 3,
        startingPlayerId: 'p1',
      })

      const onExit = vi.fn()
      render(<TicTacToeMatchplay coordinator={host} onExit={onExit} />)

      expect(screen.getByTestId('ttt-matchplay-surface')).toBeInTheDocument()
      expect(screen.getByTestId('ttt-turn-indicator')).toHaveTextContent('Your turn')

      // Click cell 0
      const cell0 = screen.getByTestId('ttt-cell-0')
      fireEvent.click(cell0)

      expect(host.snapshot.currentRoundState.board[0]).toBe('X')

      // The mark must actually render and the turn must move on screen
      expect(screen.getByTestId('ttt-cell-0')).toHaveAttribute('aria-label', 'Row 1 Column 1, marked with X')
      expect(within(screen.getByTestId('ttt-cell-0')).getByTestId('ttt-mark-x')).toBeInTheDocument()
      expect(screen.getByTestId('ttt-turn-indicator')).not.toHaveTextContent('Your turn')

      host.destroy()
    })
  })
})
